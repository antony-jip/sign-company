import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''

async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

const SYSTEM_PROMPT = `Je bent een Nederlandse inkoopfactuur extractor. Analyseer de PDF en geef UITSLUITEND valide JSON terug, geen markdown codeblokken, geen uitleg. Schema:
{
  "leverancier_naam": "string",
  "factuur_nummer": "string | null",
  "factuur_datum": "YYYY-MM-DD | null",
  "vervaldatum": "YYYY-MM-DD | null",
  "subtotaal": number,
  "btw_bedrag": number,
  "totaal": number,
  "valuta": "EUR",
  "regels": [
    {
      "omschrijving": "string",
      "aantal": number,
      "eenheidsprijs": number,
      "btw_tarief": number,
      "regel_totaal": number
    }
  ],
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

    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY niet geconfigureerd.' })
    }

    const { inkoopfactuur_id } = req.body as { inkoopfactuur_id: string }
    if (!inkoopfactuur_id) {
      return res.status(400).json({ error: 'inkoopfactuur_id is verplicht' })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organisatie_id')
      .eq('id', userId)
      .maybeSingle()

    if (!profile?.organisatie_id) {
      return res.status(403).json({ error: 'Geen organisatie gevonden' })
    }

    const { data: factuur, error: fetchError } = await supabase
      .from('inkoopfacturen')
      .select('id, pdf_storage_path, status')
      .eq('id', inkoopfactuur_id)
      .eq('organisatie_id', profile.organisatie_id)
      .single()

    if (fetchError || !factuur) {
      return res.status(404).json({ error: 'Inkoopfactuur niet gevonden' })
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('inkoopfacturen')
      .download(factuur.pdf_storage_path)

    if (downloadError || !fileData) {
      return res.status(500).json({ error: 'PDF niet gevonden in storage' })
    }

    const arrayBuffer = await fileData.arrayBuffer()
    const base64Data = Buffer.from(arrayBuffer).toString('base64')

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6-20250514',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64Data,
                },
              },
              { type: 'text', text: 'Extraheer alle factuurgegevens uit deze PDF.' },
            ],
          },
        ],
      }),
    })

    if (!anthropicResponse.ok) {
      const errBody = await anthropicResponse.text()
      throw new Error(`Anthropic API fout: ${anthropicResponse.status} ${errBody}`)
    }

    const anthropicData = await anthropicResponse.json()
    const textContent = anthropicData.content?.find((c: { type: string }) => c.type === 'text')?.text || ''

    let cleaned = textContent.trim()
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
    }

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      await supabase
        .from('inkoopfacturen')
        .update({
          extractie_opmerkingen: `JSON parse fout. Ruwe response: ${textContent.slice(0, 500)}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', inkoopfactuur_id)

      return res.status(200).json({ success: false, error: 'JSON parse fout', raw: textContent.slice(0, 500) })
    }

    const regels = Array.isArray(parsed.regels) ? parsed.regels : []

    await supabase
      .from('inkoopfacturen')
      .update({
        leverancier_naam: parsed.leverancier_naam || '',
        factuur_nummer: parsed.factuur_nummer || null,
        factuur_datum: parsed.factuur_datum || null,
        vervaldatum: parsed.vervaldatum || null,
        subtotaal: parsed.subtotaal || 0,
        btw_bedrag: parsed.btw_bedrag || 0,
        totaal: parsed.totaal || 0,
        valuta: parsed.valuta || 'EUR',
        status: 'verwerkt',
        extractie_vertrouwen: parsed.vertrouwen || 'laag',
        extractie_opmerkingen: parsed.opmerkingen || null,
        raw_extractie_json: parsed,
        updated_at: new Date().toISOString(),
      })
      .eq('id', inkoopfactuur_id)

    if (regels.length > 0) {
      await supabase.from('inkoopfactuur_regels').delete().eq('inkoopfactuur_id', inkoopfactuur_id)

      const regelRows = regels.map((r: Record<string, unknown>, i: number) => ({
        inkoopfactuur_id,
        volgorde: i,
        omschrijving: (r.omschrijving as string) || '',
        aantal: (r.aantal as number) || 1,
        eenheidsprijs: (r.eenheidsprijs as number) || 0,
        btw_tarief: (r.btw_tarief as number) || 21,
        regel_totaal: (r.regel_totaal as number) || 0,
      }))

      await supabase.from('inkoopfactuur_regels').insert(regelRows)
    }

    return res.status(200).json({ success: true, vertrouwen: parsed.vertrouwen })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }
    return res.status(500).json({ error: message })
  }
}
