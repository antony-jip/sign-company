import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Inplannen loopt via de cron: bij inplannen gaat er niets weg, op het moment zelf
// drukt api/cron-nieuwsbrief op verzenden. Het gevaar is dubbel, te vroeg of stil
// niet mailen naar 2600 mensen. Deze test bewaakt de vangrails die dat voorkomen.

const WORTEL = fileURLToPath(new URL('../..', import.meta.url))
const lees = (pad: string) => readFileSync(`${WORTEL}/${pad}`, 'utf8')
const VERZEND = lees('api/nieuwsbrief-verzend.ts')
const CRON = lees('api/cron-nieuwsbrief.ts')
const SERVICE = lees('src/services/nieuwsbriefService.ts')

function tussen(tekst: string, van: string, tot: string): string {
  const a = tekst.indexOf(van)
  const b = tekst.indexOf(tot, a + van.length)
  if (a === -1 || b === -1) throw new Error(`stuk niet gevonden: ${van}`)
  return tekst.slice(a, b)
}

const INGEPLAND = tussen(VERZEND, 'async function verstuurIngepland(', 'export default async function handler(')
const BATCHES = tussen(VERZEND, 'async function verstuurInBatches(', 'const supabase = createClient(')
const START = tussen(CRON, 'async function startIngeplande(', 'export default async function handler(')

describe('inplannen via de cron', () => {
  it('inplannen verstuurt niets: het blok keert terug voor er iets naar Resend gaat', () => {
    const plan = tussen(VERZEND, 'if (scheduledAt) {\n      // Inplannen verstuurt nog niets', '// Claim de rij vóór het verzenden')
    expect(plan).toMatch(/verzend_via_cron: true/)
    expect(plan).toMatch(/\.eq\('status', 'concept'\)/)
    expect(plan).not.toMatch(/resend\.|batch\.send|broadcasts\.|verstuurInBatches/)
  })

  it('de cron-route is alleen bereikbaar met het cron-geheim', () => {
    expect(VERZEND).toMatch(/return !!geheim && req\.headers\.authorization === `Bearer \$\{geheim\}`/)
    const cronTak = tussen(VERZEND, 'if (isCronVerzoek(req)) {', 'if (!(await verifyOwner(req)))')
    expect(cronTak).toMatch(/return await verstuurIngepland\(/)
  })

  it('het afvangblok van de handler zet een cron-verzending niet half terug', () => {
    expect(VERZEND).toMatch(/if \(id && !isCronVerzoek\(req\)\) await supabase\.from\('nieuwsbrieven'\)\.update\(\{ status: 'concept'/)
  })

  it('de cron claimt de brief eerst, en alleen als hij echt aan de beurt is', () => {
    const claim = tussen(INGEPLAND, ".from('nieuwsbrieven')", '.select(')
    for (const voorwaarde of [
      ".eq('status', 'gepland')",
      ".eq('verzend_via_cron', true)",
      ".lte('gepland_op', start.toISOString())",
      ".is('cron_gestart_op', null)",
      ".eq('user_id', OWNER_USER_ID)",
    ]) expect(claim).toContain(voorwaarde)
    expect(INGEPLAND.indexOf(".is('cron_gestart_op', null)")).toBeLessThan(INGEPLAND.indexOf('verstuurInBatches('))
    expect(INGEPLAND).toMatch(/if \(!geclaimd \|\| geclaimd\.length === 0\) return res\.status\(409\)/)
  })

  it('een fout laat de inplanning staan, tenzij het de laatste poging is of doorgaan gevaarlijk is', () => {
    const geefTerug = tussen(INGEPLAND, 'const geefTerug = async', 'try {')
    const basis = tussen(geefTerug, 'const basis = {', '}')
    expect(basis).not.toMatch(/status/)
    expect(geefTerug).toMatch(/const opgeven = opties\.stoppen === true \|\| pogingen >= MAX_CRON_POGINGEN/)
    expect(geefTerug).toMatch(/opgeven \? \{ \.\.\.basis, status: 'concept'/)
    expect(INGEPLAND).toMatch(/uitslag\.vastleggenMislukt[\s\S]*?stoppen: true/)
    expect(INGEPLAND).toMatch(/\{ code: 500, aantal: alVerstuurd \}/)
  })

  it('elke batch krijgt een idempotency-sleutel uit zijn inhoud', () => {
    expect(BATCHES).toMatch(/const idempotencyKey = `nieuwsbrief-\$\{createHash\('sha256'\)\.update\(`\$\{nieuwsbriefId\}:\$\{JSON\.stringify\(mails\)\}`\)/)
    expect(BATCHES).toMatch(/client\.batch\.send\(mails, \{ idempotencyKey \}\)/)
  })

  it('mislukt het vastleggen van wie hem kreeg, dan stopt het versturen', () => {
    expect(BATCHES).toMatch(/if \(vastFout\) \(\{ error: vastFout \} = await vastleggen\(\)\)/)
    expect(BATCHES).toMatch(/if \(vastFout\) \{[\s\S]*?return \{[^}]*vastleggenMislukt: true \}/)
    expect(VERZEND).toMatch(/if \(uitslag\.vastleggenMislukt\) \{\n\s+return geefVrij\(/)
  })

  it('wie de brief al kreeg wordt gepagineerd opgehaald en overgeslagen', () => {
    const functie = tussen(VERZEND, 'async function alVerstuurdAan(', 'type MailOpties')
    expect(functie).toMatch(/\.range\(van, van \+ 999\)/)
    expect(VERZEND.match(/await alVerstuurdAan\(nieuwsbriefId\)/g)?.length).toBe(2)
    expect(VERZEND).not.toMatch(/select\('email'\)\.eq\('nieuwsbrief_id', nieuwsbriefId\)\.eq\('type', 'sent'\)\n/)
  })

  it('geen .or() op nieuwsbrieven: die faalt bij een UPDATE', () => {
    expect(VERZEND).not.toMatch(/\.or\(/)
    expect(CRON).not.toMatch(/\.or\(/)
  })

  it('de cron geeft gestorven claims vrij, pakt één brief en drukt op verzenden met het geheim', () => {
    expect(START).toMatch(/\.lt\('cron_gestart_op', new Date\(nu - 10 \* 60_000\)/)
    expect(START).toMatch(/\.limit\(1\)/)
    expect(START).toMatch(/\/api\/nieuwsbrief-verzend/)
    expect(START).toMatch(/Authorization: `Bearer \$\{geheim\}`/)
    expect(START).toMatch(/signal: AbortSignal\.timeout\(/)
    expect(CRON).toMatch(/const ingepland = await startIngeplande\(\)/)
  })

  it('bereikt de cron de verzendroute niet, dan komt dat zichtbaar vast te staan', () => {
    const vastleggen = tussen(START, 'if (!aangekomen) {', 'return { melding')
    expect(START).toMatch(/if \(status === 409\) return \{ melding: `[^`]*`, gestart: false \}/)
    expect(START).toMatch(/const aangekomen = netwerkFout === '' && \(body\.ok === true \|\| body\.pogingen !== undefined\)/)
    expect(vastleggen).toMatch(/cron_fout: fout/)
    // Een verzending die net na de time-out van de cron klaar was, veranderde de rij:
    // dan geen valse fout of poging noteren.
    expect(vastleggen).toMatch(/\.eq\('updated_at', rij\.updated_at \?\? ''\)/)
    expect(vastleggen).toMatch(/\.eq\('status', 'gepland'\)/)
    expect(vastleggen).toMatch(/\.is\('cron_gestart_op', null\)/)
    expect(vastleggen).toMatch(/Sentry\.captureMessage\(/)
  })

  it('cron en verzendroute geven na hetzelfde aantal pogingen op', () => {
    expect(CRON.match(/const MAX_CRON_POGINGEN = (\d+)/)?.[1]).toBe(VERZEND.match(/const MAX_CRON_POGINGEN = (\d+)/)?.[1])
  })

  it('de cron mag lang genoeg draaien om op een verzending te wachten', () => {
    expect(CRON).toMatch(/export const config = \{ maxDuration: 300 \}/)
    const vercel = JSON.parse(lees('vercel.json')) as { functions: Record<string, { maxDuration?: number }> }
    expect(vercel.functions['api/cron-nieuwsbrief.ts']?.maxDuration).toBeGreaterThanOrEqual(300)
  })

  it('de schakelaar voor de Resend-lijst staat in api en editor gelijk', () => {
    const api = VERZEND.match(/const VIA_RESEND_LIJST = (true|false)/)?.[1]
    const editor = SERVICE.match(/export const VERZEND_VIA_RESEND_LIJST = (true|false)/)?.[1]
    expect(api).toBeDefined()
    expect(editor).toBe(api)
  })

  it('automatisch opslaan raakt alleen concepten', () => {
    const functie = tussen(SERVICE, 'export async function updateConcept(', 'export async function herstelVastgelopenConcept(')
    expect(functie).toContain(".eq('status', 'concept')")
    expect(functie).not.toMatch(/\.single\(\)/)
  })

  it('annuleren kan alleen zolang er nog niemand iets ontving', () => {
    const functie = tussen(SERVICE, 'export async function annuleerInplanning(', 'export async function verwijderNieuwsbrief(')
    expect(functie).toContain(".is('cron_gestart_op', null)")
    expect(functie).toContain(".is('aantal_ontvangers', null)")
    expect(functie).toContain(".eq('status', 'gepland')")
  })
})
