/**
 * Haalt nieuwe mail op zonder dat er iemand in de app zit.
 *
 * Zonder deze cron landde mail pas in de database op het moment dat een
 * client erom vroeg. Wie de app op zijn telefoon opende, wachtte dus op een
 * volledige IMAP-ronde voordat er iets te zien was. Nu staat de mail er al en
 * is openen een database-read.
 *
 * Roept /api/fetch-emails per gebruiker aan in plaats van de IMAP-logica te
 * kopiëren: api/*-bestanden mogen niets delen (zie CLAUDE.md), en een tweede
 * exemplaar van 500 regels sync-code loopt gegarandeerd uit de pas.
 *
 * BEVEILIGD: vereist Authorization: Bearer ${CRON_SECRET}. Datzelfde secret
 * gebruikt fetch-emails om de service-modus te herkennen.
 *
 * Handmatig testen (na deploy):
 * curl -H "Authorization: Bearer $CRON_SECRET" \
 *   https://app.doen.team/api/cron-email-sync
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// Slapende accounts (afgelopen trial, opgezegd) hoeven geen IMAP-verbindingen
// te kosten. Wie inlogt is de eerstvolgende ronde weer mee.
const ACTIEF_BINNEN_DAGEN = 7
// Per ronde, zodat één ronde binnen maxDuration past. De rest komt de
// volgende ronde: de sortering zet de langst-niet-gesyncte vooraan.
const MAX_PER_RONDE = 8
// Ruim onder maxDuration, zodat de samenvatting nog terugkomt.
const DEADLINE_MS = 50_000

function basisUrl(): string {
  if (process.env.CRON_SELF_URL) return process.env.CRON_SELF_URL.replace(/\/$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'https://app.doen.team'
}

async function actieveUserIds(): Promise<Set<string>> {
  const grens = Date.now() - ACTIEF_BINNEN_DAGEN * 24 * 60 * 60 * 1000
  const actief = new Set<string>()
  // listUsers pagineert; een paar pagina's dekt het ledenbestand ruim.
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 })
    if (error || !data?.users?.length) break
    for (const u of data.users) {
      const laatst = u.last_sign_in_at ? Date.parse(u.last_sign_in_at) : 0
      if (laatst >= grens) actief.add(u.id)
    }
    if (data.users.length < 200) break
  }
  return actief
}

export const config = { maxDuration: 60 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const gestartOp = Date.now()

  try {
    const { data: accounts, error } = await supabaseAdmin
      .from('user_email_settings')
      .select('user_id')
      .not('gmail_address', 'is', null)
      .not('encrypted_app_password', 'is', null)
    if (error) throw error
    if (!accounts?.length) return res.status(200).json({ gesynct: 0, overgeslagen: 0 })

    const actief = await actieveUserIds()
    const kandidaten = accounts.map((a) => a.user_id as string).filter((id) => actief.has(id))

    // Langst niet gesynct eerst. Wie nog geen sync-state heeft (nieuw account)
    // komt vooraan, want die heeft de ronde het hardst nodig.
    const { data: states } = await supabaseAdmin
      .from('email_sync_state')
      .select('user_id, updated_at')
      .eq('folder', 'inbox')
      .in('user_id', kandidaten)
    const laatstGesynct = new Map<string, number>()
    for (const s of states || []) {
      laatstGesynct.set(s.user_id as string, Date.parse(s.updated_at as string) || 0)
    }
    kandidaten.sort((a, b) => (laatstGesynct.get(a) ?? 0) - (laatstGesynct.get(b) ?? 0))

    const ronde = kandidaten.slice(0, MAX_PER_RONDE)
    const url = `${basisUrl()}/api/fetch-emails`

    // Parallel: elke gebruiker opent zijn eigen IMAP-verbinding naar zijn
    // eigen server, dus ze staan elkaar niet in de weg. Sequentieel zou bij
    // acht mailboxen gegarandeerd de deadline halen.
    const uitkomsten = await Promise.all(ronde.map(async (userId) => {
      const resterend = DEADLINE_MS - (Date.now() - gestartOp)
      if (resterend <= 5_000) return { userId, ok: false, reden: 'deadline' }
      const afbreken = AbortSignal.timeout(resterend)
      try {
        const respons = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cronSecret}`,
          },
          // snel blijft uit: de sales- en lead-sweeps die de client op mobiel
          // overslaat horen juist hier thuis, waar niemand op ze wacht.
          body: JSON.stringify({ folder: 'INBOX', limit: 200, service_user_id: userId }),
          signal: afbreken,
        })
        if (!respons.ok) {
          const tekst = await respons.text().catch(() => '')
          console.warn('[cron-email-sync] sync mislukt', { userId, status: respons.status, tekst: tekst.slice(0, 200) })
          return { userId, ok: false, reden: `http_${respons.status}` }
        }
        const uitkomst = await respons.json().catch(() => ({}))
        return { userId, ok: true, synced: uitkomst?.synced ?? 0 }
      } catch (err) {
        console.warn('[cron-email-sync] sync gooide', { userId, err: err instanceof Error ? err.message : err })
        return { userId, ok: false, reden: 'exception' }
      }
    }))

    const gelukt = uitkomsten.filter((u) => u.ok)
    return res.status(200).json({
      kandidaten: kandidaten.length,
      geprobeerd: ronde.length,
      gesynct: gelukt.length,
      nieuweMail: gelukt.reduce((som, u) => som + (Number(u.synced) || 0), 0),
      mislukt: uitkomsten.filter((u) => !u.ok).map((u) => ({ userId: u.userId, reden: u.reden })),
      duurMs: Date.now() - gestartOp,
    })
  } catch (err) {
    console.error('[cron-email-sync] Fatal:', err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Sync mislukt' })
  }
}
