import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { createDecipheriv, createHash } from 'crypto'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const ENCRYPTION_KEY = process.env.INKOOPFACTUUR_ENCRYPTION_KEY || ''
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''

function decrypt(encrypted: string): string {
  const buf = Buffer.from(encrypted, 'base64')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const ciphertext = buf.subarray(28)
  const key = createHash('sha256').update(ENCRYPTION_KEY).digest()
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(ciphertext) + decipher.final('utf8')
}

async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

const EXTRACT_PROMPT = `Je bent een Nederlandse inkoopfactuur extractor. Analyseer de PDF en geef UITSLUITEND valide JSON terug, geen markdown codeblokken, geen uitleg. Schema:
{
  "leverancier_naam": "string",
  "factuur_nummer": "string | null",
  "factuur_datum": "YYYY-MM-DD | null",
  "vervaldatum": "YYYY-MM-DD | null",
  "subtotaal": number,
  "btw_bedrag": number,
  "totaal": number,
  "valuta": "EUR",
  "regels": [{"omschrijving": "string", "aantal": number, "eenheidsprijs": number, "btw_tarief": number, "regel_totaal": number}],
  "vertrouwen": "hoog" | "midden" | "laag",
  "opmerkingen": ""
}
Als totaal niet matcht met subtotaal + btw: zet vertrouwen op "laag" en beschrijf in opmerkingen.
Als geen factuurnummer vindbaar: null.
Bedragen altijd als number, niet string met comma.`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)

    if (!ENCRYPTION_KEY) {
      return res.status(500).json({ error: 'INKOOPFACTUUR_ENCRYPTION_KEY niet geconfigureerd' })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organisatie_id')
      .eq('id', userId)
      .maybeSingle()

    if (!profile?.organisatie_id) {
      return res.status(403).json({ error: 'Geen organisatie gevonden' })
    }

    const orgId = profile.organisatie_id

    const { data: config } = await supabase
      .from('inkoopfactuur_inbox_config')
      .select('*')
      .eq('organisatie_id', orgId)
      .eq('actief', true)
      .maybeSingle()

    if (!config) {
      return res.status(200).json({ success: false, error: 'Geen actieve inbox configuratie', verwerkt: 0 })
    }

    const password = decrypt(config.imap_password_encrypted)

    const client = new ImapFlow({
      host: config.imap_host,
      port: config.imap_port,
      secure: config.imap_port === 993,
      auth: { user: config.imap_user, pass: password },
      logger: false,
      emitLogs: false,
      greetingTimeout: 10000,
      socketTimeout: 30000,
    })

    let verwerkt = 0
    let hoogsteUid = config.laatste_uid

    try {
      await client.connect()
      await client.mailboxOpen(config.gmail_label, { readOnly: true })

      const searchCriteria: Record<string, unknown> = config.laatste_uid > 0
        ? { uid: `${config.laatste_uid + 1}:*` }
        : { all: true }

      for await (const msg of client.fetch(searchCriteria, {
        uid: true,
        envelope: true,
        source: true,
      })) {
        if (msg.uid <= config.laatste_uid) continue
        if (!msg.source) continue

        const parsed = await simpleParser(msg.source as Buffer)
        const pdfAttachments = (parsed.attachments || []).filter(
          (a: { contentType: string }) => a.contentType === 'application/pdf'
        )

        if (pdfAttachments.length === 0) {
          if (msg.uid > hoogsteUid) hoogsteUid = msg.uid
          continue
        }

        const messageId = (parsed as any).messageId || msg.envelope?.messageId || null

        if (messageId) {
          const { data: existing } = await supabase
            .from('inkoopfacturen')
            .select('id')
            .eq('organisatie_id', orgId)
            .eq('email_message_id', messageId)
            .limit(1)
          if (existing && existing.length > 0) {
            if (msg.uid > hoogsteUid) hoogsteUid = msg.uid
            continue
          }
        }

        for (const pdf of pdfAttachments) {
          const fileId = crypto.randomUUID()
          const storagePath = `${orgId}/${fileId}.pdf`

          const { error: uploadError } = await supabase.storage
            .from('inkoopfacturen')
            .upload(storagePath, pdf.content, { contentType: 'application/pdf', upsert: false })

          if (uploadError) continue

          const { data: factuur, error: insertError } = await supabase
            .from('inkoopfacturen')
            .insert({
              organisatie_id: orgId,
              pdf_storage_path: storagePath,
              email_subject: (parsed as any).subject || null,
              email_van: (parsed as any).from?.text || null,
              email_message_id: messageId,
              email_ontvangen_op: (parsed as any).date?.toISOString() || new Date().toISOString(),
              status: 'nieuw',
            })
            .select('id')
            .single()

          if (insertError) continue

          // Extract PDF inline
          if (ANTHROPIC_API_KEY) {
            try {
              const { data: fileData } = await supabase.storage.from('inkoopfacturen').download(storagePath)
              if (fileData) {
                const arrayBuffer = await fileData.arrayBuffer()
                const base64Data = Buffer.from(arrayBuffer).toString('base64')

                const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
                  method: 'POST',
                  headers: {
                    'x-api-key': ANTHROPIC_API_KEY,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json',
                  },
                  body: JSON.stringify({
                    model: 'claude-sonnet-4-6-20250514',
                    max_tokens: 4096,
                    system: EXTRACT_PROMPT,
                    messages: [{
                      role: 'user',
                      content: [
                        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64Data } },
                        { type: 'text', text: 'Extraheer alle factuurgegevens uit deze PDF.' },
                      ],
                    }],
                  }),
                })

                if (apiRes.ok) {
                  const apiData = await apiRes.json()
                  const text = apiData.content?.find((c: { type: string }) => c.type === 'text')?.text || ''
                  let cleaned = text.trim()
                  if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')

                  try {
                    const data = JSON.parse(cleaned)
                    const regels = Array.isArray(data.regels) ? data.regels : []

                    await supabase.from('inkoopfacturen').update({
                      leverancier_naam: data.leverancier_naam || '',
                      factuur_nummer: data.factuur_nummer || null,
                      factuur_datum: data.factuur_datum || null,
                      vervaldatum: data.vervaldatum || null,
                      subtotaal: data.subtotaal || 0,
                      btw_bedrag: data.btw_bedrag || 0,
                      totaal: data.totaal || 0,
                      valuta: data.valuta || 'EUR',
                      status: 'verwerkt',
                      extractie_vertrouwen: data.vertrouwen || 'laag',
                      extractie_opmerkingen: data.opmerkingen || null,
                      raw_extractie_json: data,
                      updated_at: new Date().toISOString(),
                    }).eq('id', factuur.id)

                    if (regels.length > 0) {
                      await supabase.from('inkoopfactuur_regels').insert(
                        regels.map((r: Record<string, unknown>, i: number) => ({
                          inkoopfactuur_id: factuur.id,
                          volgorde: i,
                          omschrijving: (r.omschrijving as string) || '',
                          aantal: (r.aantal as number) || 1,
                          eenheidsprijs: (r.eenheidsprijs as number) || 0,
                          btw_tarief: (r.btw_tarief as number) || 21,
                          regel_totaal: (r.regel_totaal as number) || 0,
                        }))
                      )
                    }
                  } catch { /* JSON parse failed, stays as 'nieuw' */ }
                }
              }
            } catch { /* extraction failed, stays as 'nieuw' */ }
          }

          verwerkt++
        }

        if (msg.uid > hoogsteUid) hoogsteUid = msg.uid
      }
    } finally {
      try { await client.logout() } catch { /* best-effort */ }
    }

    if (hoogsteUid > config.laatste_uid) {
      await supabase.from('inkoopfactuur_inbox_config').update({
        laatste_uid: hoogsteUid,
        laatst_gecheckt_op: new Date().toISOString(),
        laatste_error: null,
        updated_at: new Date().toISOString(),
      }).eq('id', config.id)
    } else {
      await supabase.from('inkoopfactuur_inbox_config').update({
        laatst_gecheckt_op: new Date().toISOString(),
        laatste_error: null,
        updated_at: new Date().toISOString(),
      }).eq('id', config.id)
    }

    return res.status(200).json({ success: true, verwerkt })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }
    return res.status(500).json({ error: message })
  }
}
