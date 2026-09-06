/**
 * Herinnert wie vandaag nog geen uren schreef.
 *
 * Draait elk uur op :05. Per organisatie met de schakelaar uren_herinnering
 * aan (app_settings.functies, migratie 234) kijkt hij of het ingestelde uur
 * (uren_herinnering_uur, standaard 16) in Europe/Amsterdam is bereikt. Wie
 * vandaag al een herinnering kreeg, krijgt er geen tweede: de rem is
 * medewerkers.uren_herinnerd_op (migratie 240), gezet vóór het melden.
 * Weekend, bedrijfssluitingsdagen, verlof en hele-dag-afwezigheid slaan we over.
 *
 * "Uren geschreven" is: een tijdregistratie van vandaag, een lopende
 * tijd_sessie, of een werkbon die vandaag is getekend of afgerond.
 *
 * BEVEILIGD: vereist Authorization: Bearer ${CRON_SECRET}.
 * Handmatig: curl -H "Authorization: Bearer $CRON_SECRET" https://app.doen.team/api/cron-uren-herinnering
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export const config = { maxDuration: 60 }

const TIJDZONE = 'Europe/Amsterdam'
const STANDAARD_UUR = 16

interface AmsterdamNu {
  datum: string
  mmdd: string
  uur: number
  weekend: boolean
  dagStartUtc: string
}

function amsterdamNu(nu = new Date()): AmsterdamNu {
  const delen = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIJDZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false, weekday: 'short',
  }).formatToParts(nu)
  const deel = (t: string) => delen.find((d) => d.type === t)?.value ?? ''
  const datum = `${deel('year')}-${deel('month')}-${deel('day')}`
  const weekdag = deel('weekday')
  const middernachtAlsUtc = new Date(`${datum}T00:00:00Z`)
  const offsetMin = tzOffsetMinuten(middernachtAlsUtc)
  return {
    datum,
    mmdd: datum.slice(5),
    uur: Number(deel('hour')) % 24,
    weekend: weekdag === 'Sat' || weekdag === 'Sun',
    dagStartUtc: new Date(middernachtAlsUtc.getTime() - offsetMin * 60_000).toISOString(),
  }
}

/** Minuten die Amsterdam op dat moment vóór loopt op UTC (60 of 120). */
function tzOffsetMinuten(moment: Date): number {
  const delen = new Intl.DateTimeFormat('en-US', {
    timeZone: TIJDZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(moment)
  const n = (t: string) => Number(delen.find((d) => d.type === t)?.value ?? '0')
  const lokaalAlsUtc = Date.UTC(n('year'), n('month') - 1, n('day'), n('hour') % 24, n('minute'), n('second'))
  return Math.round((lokaalAlsUtc - moment.getTime()) / 60_000)
}

function appUrl(): string {
  return process.env.VITE_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://app.doen.team')
}

async function stuurPush(userId: string, titel: string, tekst: string, url: string): Promise<void> {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return
  try {
    await fetch(`${appUrl()}/api/push-verstuur`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cronSecret}` },
      body: JSON.stringify({ service_user_id: userId, titel, tekst, url, tag: 'doen-uren-herinnering', categorie: 'planning' }),
      signal: AbortSignal.timeout(8_000),
    })
  } catch (err) {
    console.warn('[cron-uren-herinnering] push mislukt:', err)
  }
}

interface OrgUitkomst {
  organisatie_id: string
  overgeslagen?: string
  herinnerd?: number
}

async function verwerkOrganisatie(orgId: string, nu: AmsterdamNu): Promise<OrgUitkomst> {
  const { data: sluitingsdagen } = await supabaseAdmin
    .from('bedrijfssluitingsdagen')
    .select('datum, jaarlijks_herhalend')
    .eq('organisatie_id', orgId)
  const gesloten = (sluitingsdagen ?? []).some((s) => {
    const datum = String(s.datum ?? '')
    return datum === nu.datum || (s.jaarlijks_herhalend === true && datum.slice(5) === nu.mmdd)
  })
  if (gesloten) return { organisatie_id: orgId, overgeslagen: 'sluitingsdag' }

  const { data: medewerkers } = await supabaseAdmin
    .from('medewerkers')
    .select('id, user_id, uren_herinnerd_op')
    .eq('organisatie_id', orgId)
    .eq('status', 'actief')
    .not('user_id', 'is', null)
  const doelen = ((medewerkers ?? []) as { id: string; user_id: string; uren_herinnerd_op: string | null }[])
    .filter((m) => m.uren_herinnerd_op !== nu.datum)
  if (doelen.length === 0) return { organisatie_id: orgId, herinnerd: 0 }

  const [verlof, afwezigheid, registraties, sessies, werkbonnen] = await Promise.all([
    supabaseAdmin
      .from('verlof')
      .select('medewerker_id')
      .eq('organisatie_id', orgId)
      .neq('status', 'afgewezen')
      .lte('start_datum', nu.datum)
      .gte('eind_datum', nu.datum),
    // medewerker_id is TEXT (migratie 127): een medewerkers-id of 'profile-<user_id>'.
    // Alleen hele dagen (start_tijd NULL); wie een middag weg is schrijft wel uren.
    supabaseAdmin
      .from('planning_afwezigheid')
      .select('medewerker_id')
      .eq('organisatie_id', orgId)
      .is('start_tijd', null)
      .lte('start_datum', nu.datum)
      .gte('eind_datum', nu.datum),
    supabaseAdmin
      .from('tijdregistraties')
      .select('medewerker_id, user_id')
      .eq('organisatie_id', orgId)
      .eq('datum', nu.datum),
    supabaseAdmin
      .from('tijd_sessies')
      .select('medewerker_id, user_id')
      .eq('organisatie_id', orgId),
    supabaseAdmin
      .from('werkbonnen')
      .select('user_id')
      .eq('organisatie_id', orgId)
      .or(`getekend_op.gte.${nu.dagStartUtc},and(status.eq.afgerond,updated_at.gte.${nu.dagStartUtc})`),
  ])

  const afwezig = new Set<string>([
    ...(verlof.data ?? []).map((v) => `m:${v.medewerker_id}`),
    ...(afwezigheid.data ?? []).map((a) => {
      const id = String(a.medewerker_id ?? '')
      return id.startsWith('profile-') ? `u:${id.slice('profile-'.length)}` : `m:${id}`
    }),
  ])
  const actief = new Set<string>()
  for (const rij of [...(registraties.data ?? []), ...(sessies.data ?? [])] as { medewerker_id?: string | null; user_id?: string | null }[]) {
    if (rij.medewerker_id) actief.add(`m:${rij.medewerker_id}`)
    if (rij.user_id) actief.add(`u:${rij.user_id}`)
  }
  for (const rij of (werkbonnen.data ?? []) as { user_id?: string | null }[]) {
    if (rij.user_id) actief.add(`u:${rij.user_id}`)
  }

  const zonderUren = doelen.filter((m) =>
    !afwezig.has(`m:${m.id}`) && !afwezig.has(`u:${m.user_id}`)
    && !actief.has(`m:${m.id}`) && !actief.has(`u:${m.user_id}`))
  if (zonderUren.length === 0) return { organisatie_id: orgId, herinnerd: 0 }

  // Rem eerst zetten: mislukt het melden daarna, dan liever één gemiste
  // herinnering dan elk uur een nieuwe.
  const { error: remError } = await supabaseAdmin
    .from('medewerkers')
    .update({ uren_herinnerd_op: nu.datum })
    .in('id', zonderUren.map((m) => m.id))
  if (remError) {
    console.error('[cron-uren-herinnering] rem zetten mislukt:', orgId, remError.message)
    return { organisatie_id: orgId, overgeslagen: 'rem-fout' }
  }

  const titel = 'Je hebt vandaag nog geen uren geschreven'
  const bericht = 'Schrijf je uren van vandaag voordat je afsluit.'
  const link = '/tijdregistratie'
  const { error } = await supabaseAdmin.from('notificaties').insert(
    zonderUren.map((m) => ({ user_id: m.user_id, organisatie_id: orgId, type: 'uren_herinnering', titel, bericht, link, gelezen: false }))
  )
  if (error) {
    console.error('[cron-uren-herinnering] notificaties mislukt:', orgId, error.message)
    return { organisatie_id: orgId, overgeslagen: 'notificatie-fout' }
  }
  await Promise.all(zonderUren.map((m) => stuurPush(m.user_id, titel, bericht, link)))
  return { organisatie_id: orgId, herinnerd: zonderUren.length }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const nu = amsterdamNu()
    if (nu.weekend) return res.status(200).json({ overgeslagen: 'weekend', datum: nu.datum })

    const { data: instellingen, error } = await supabaseAdmin
      .from('app_settings')
      .select('organisatie_id, functies')
      .not('organisatie_id', 'is', null)
    if (error) throw error

    const uitkomsten: OrgUitkomst[] = []
    for (const rij of instellingen ?? []) {
      const functies = (rij.functies ?? {}) as Record<string, unknown>
      if (functies.uren_herinnering !== true) continue
      const uur = typeof functies.uren_herinnering_uur === 'number' && Number.isFinite(functies.uren_herinnering_uur)
        ? functies.uren_herinnering_uur
        : STANDAARD_UUR
      if (nu.uur < uur) continue
      try {
        uitkomsten.push(await verwerkOrganisatie(rij.organisatie_id as string, nu))
      } catch (err) {
        console.error('[cron-uren-herinnering] organisatie mislukt:', rij.organisatie_id, err)
        uitkomsten.push({ organisatie_id: rij.organisatie_id as string, overgeslagen: 'fout' })
      }
    }

    const herinnerd = uitkomsten.reduce((n, u) => n + (u.herinnerd ?? 0), 0)
    console.log(`[cron-uren-herinnering] ${nu.datum} ${nu.uur}u: ${herinnerd} herinnering(en) in ${uitkomsten.length} organisatie(s)`)
    return res.status(200).json({ datum: nu.datum, uur: nu.uur, herinnerd, organisaties: uitkomsten })
  } catch (err) {
    console.error('[cron-uren-herinnering] Fatale fout:', err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Cron mislukt' })
  }
}
