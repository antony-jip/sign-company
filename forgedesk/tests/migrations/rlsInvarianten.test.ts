import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Statische controle op de migratiemap.
 *
 * Aanleiding: migratie 048 wilde de legacy user_id-policies opruimen en deed dat
 * met `DROP POLICY IF EXISTS "Users manage own klanten" ON klanten`. Die naam
 * wordt in geen enkele migratie aangemaakt · de echte heette "Users see own
 * data". DROP POLICY IF EXISTS op een niet-bestaande naam slaagt stil, dus de
 * legacy-policy bleef staan en OR'de daarna met de org-policy. Gevolg: de
 * abonnementsvergrendeling uit migratie 111 werkte niet, op 23 tabellen, ruim
 * een jaar lang, zonder één foutmelding.
 *
 * Deze test kan dat niet in de database controleren (er is geen testdatabase en
 * geen schema_migrations). Wat hij wél kan: de map lezen en zien of een DROP een
 * naam noemt die nergens als CREATE voorkomt. Dat is precies het signaal dat
 * ontbrak.
 *
 * Werkwijze: de 71 bestaande overtredingen zijn bevroren per bestand. De test
 * faalt dus niet op de historie, maar wel zodra er een nieuwe bijkomt.
 */

const MIGRATIES = fileURLToPath(new URL('../../supabase/migrations', import.meta.url))

function zonderCommentaar(sql: string): string {
  // Zonder dit tellen voorbeelden in kop-comments mee. 194 documenteert de bug
  // met een letterlijk DROP-statement in een comment en werd zo zelf gevlagd.
  const zonderBlok = sql.replace(/\/\*[\s\S]*?\*\//g, ' ')
  return zonderBlok
    .split('\n')
    .map((r) => r.replace(/--.*$/, ''))
    .join('\n')
}

interface Policy {
  naam: string
  tabel: string
  bestand: string
}

function leesMigraties() {
  const drops: Policy[] = []
  const creates = new Set<string>()
  const rlsAan = new Map<string, string>()
  const tabellenMetPolicy = new Set<string>()

  for (const bestand of readdirSync(MIGRATIES).filter((f) => f.endsWith('.sql')).sort()) {
    const sql = zonderCommentaar(readFileSync(`${MIGRATIES}/${bestand}`, 'utf8'))

    const dropRe = /DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?"([^"]+)"\s+ON\s+(?:public\.)?(\w+)/gi
    for (const m of sql.matchAll(dropRe)) {
      drops.push({ naam: m[1], tabel: m[2].toLowerCase(), bestand })
    }

    const createRe = /CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+(?:public\.)?(\w+)/gi
    for (const m of sql.matchAll(createRe)) {
      creates.add(`${m[1]}|${m[2].toLowerCase()}`)
      tabellenMetPolicy.add(m[2].toLowerCase())
    }

    const rlsRe = /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:public\.)?(\w+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi
    for (const m of sql.matchAll(rlsRe)) {
      const tabel = m[1].toLowerCase()
      if (!rlsAan.has(tabel)) rlsAan.set(tabel, bestand)
    }
  }

  return { drops, creates, rlsAan, tabellenMetPolicy }
}

// Bevroren historie. Deze bestanden droppen namen die nergens aangemaakt worden.
// Niet repareren door de aantallen te verhogen: dat is het probleem verplaatsen.
// De echte oplossing draaide in migratie 195, die pg_policies leest in plaats
// van namen te geloven.
const BEVROREN_FANTOOM_DROPS: Record<string, number> = {
  '045_fix_storage_security.sql': 5,
  '048_rls_organisatie_policies.sql': 48,
  '072_rls_batch2_referentie.sql': 13,
  '073_rls_batch3_bucket_onduidelijk.sql': 4,
  '084_storage_policy_cleanup.sql': 1,
}

// RLS aan zonder policy betekent deny-all voor `authenticated`. Voor deze vijf
// is dat bewust: twee eenmalige backup-tabellen, en drie tabellen die alleen de
// service-role aanraakt (gecontroleerd: geen enkele read uit src/components).
const BEWUST_ZONDER_POLICY = new Set([
  'ai_sporen',
  'csp_violations',
  'rate_limits',
  'klanten_debiteurennummer_backup_20260722',
  'klanten_merge_backup_20260722',
])

describe('migratiemap · RLS-invarianten', () => {
  it('introduceert geen nieuwe DROP POLICY op een naam die nergens bestaat', () => {
    const { drops, creates } = leesMigraties()

    const fantoomPerBestand = new Map<string, string[]>()
    for (const d of drops) {
      if (creates.has(`${d.naam}|${d.tabel}`)) continue
      const lijst = fantoomPerBestand.get(d.bestand) ?? []
      lijst.push(`"${d.naam}" ON ${d.tabel}`)
      fantoomPerBestand.set(d.bestand, lijst)
    }

    const nieuw: string[] = []
    for (const [bestand, gevallen] of fantoomPerBestand) {
      const toegestaan = BEVROREN_FANTOOM_DROPS[bestand] ?? 0
      if (gevallen.length > toegestaan) {
        nieuw.push(
          `${bestand}: ${gevallen.length} fantoom-drops, bevroren op ${toegestaan}\n` +
            gevallen.map((g) => `    ${g}`).join('\n'),
        )
      }
    }

    expect(
      nieuw,
      'Een DROP POLICY op een naam die nergens wordt aangemaakt slaagt stil en ' +
        'ruimt dus niets op. Drop op de naam die de CREATE gebruikt, of lees ' +
        'pg_policies zoals migratie 195 doet.\n\n' + nieuw.join('\n\n'),
    ).toEqual([])
  })

  it('laat geen tabel achter met RLS aan en nul policies', () => {
    const { rlsAan, tabellenMetPolicy } = leesMigraties()

    const zonder = [...rlsAan.entries()]
      .filter(([tabel]) => !tabellenMetPolicy.has(tabel) && !BEWUST_ZONDER_POLICY.has(tabel))
      .map(([tabel, bestand]) => `${tabel} (RLS aangezet in ${bestand})`)

    expect(
      zonder,
      'RLS aan zonder policy betekent deny-all voor authenticated: de app kan ' +
        'er dan niet meer bij, zonder foutmelding · queries geven gewoon [] ' +
        'terug. Voeg een policy toe, of zet de tabel in BEWUST_ZONDER_POLICY ' +
        'met de reden erbij.\n\n' + zonder.join('\n'),
    ).toEqual([])
  })

  it('houdt de bevroren historie precies bij, zodat opgeloste gevallen opvallen', () => {
    const { drops, creates } = leesMigraties()

    const werkelijk: Record<string, number> = {}
    for (const d of drops) {
      if (creates.has(`${d.naam}|${d.tabel}`)) continue
      werkelijk[d.bestand] = (werkelijk[d.bestand] ?? 0) + 1
    }

    // Lager dan bevroren is goed nieuws: dan is er iets echt opgeruimd. De test
    // wijst het aan zodat de bevroren lijst meebeweegt in plaats van te rotten.
    for (const [bestand, bevroren] of Object.entries(BEVROREN_FANTOOM_DROPS)) {
      expect(
        werkelijk[bestand] ?? 0,
        `${bestand} staat bevroren op ${bevroren} fantoom-drops maar heeft er nu ` +
          `${werkelijk[bestand] ?? 0}. Is dat opgelost, verlaag dan het getal in ` +
          `BEVROREN_FANTOOM_DROPS.`,
      ).toBe(bevroren)
    }
  })
})

/**
 * De api-poort moet blijven bestaan.
 *
 * `api/*` viel buiten tsconfig.json én buiten de vite-build, en dat gat liet in
 * één nacht twee fouten door. Er is nu `tsconfig.api.json` plus het script
 * `typecheck:api`. Deze test bewaakt niet de fouten (die telt het script), maar
 * dat de poort zelf niet stilletjes verdwijnt of ondermijnd wordt.
 */
describe('api-typecheck blijft bestaan', () => {
  it('heeft een tsconfig voor api met strict aan', () => {
    const ruw = readFileSync(fileURLToPath(new URL('../../tsconfig.api.json', import.meta.url)), 'utf8')
    // JSON met comments: strip ze voor het parsen.
    const config = JSON.parse(ruw.replace(/^\s*\/\/.*$/gm, ''))
    expect(config.include).toContain('api')
    expect(config.compilerOptions.strict).toBe(true)
  })

  /**
   * Geen `paths` voor `@/*`. Een api-bestand dat uit src/ importeert hoort te
   * falen op de typecheck: Vercel bundelt die import niet mee en de functie
   * klapt pas in productie. Zie CLAUDE.md sectie 2.
   */
  it('laat api/ niet uit src/ importeren', () => {
    const ruw = readFileSync(fileURLToPath(new URL('../../tsconfig.api.json', import.meta.url)), 'utf8')
    const config = JSON.parse(ruw.replace(/^\s*\/\/.*$/gm, ''))
    expect(config.compilerOptions.paths).toBeUndefined()
  })

  it('is als script aanroepbaar', () => {
    const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('../../package.json', import.meta.url)), 'utf8'))
    expect(pkg.scripts['typecheck:api']).toContain('tsconfig.api.json')
  })
})

/**
 * De les van migratie 195, in een controle.
 *
 * 195 dropte legacy user_id-policies, met een guard die alleen keek OF de tabel
 * daarna nog een permissieve policy met `organisatie_id` overhield. Op `emails`
 * was dat "Team-leden zien mails via project-koppeling", en die geeft alleen
 * SELECT en alleen als `thread_id` via `email_project_koppelingen` aan een
 * project hangt. De guard controleerde dus BESTAAN, niet DEKKING.
 *
 * Gevolg op productie: van 13.982 inbox-rijen bleef alleen projectmail
 * zichtbaar, en omdat de gedropte policy `FOR ALL` was verdwenen ook UPDATE en
 * DELETE. Hersteld in migratie 203.
 *
 * De regel die deze test afdwingt: een policy waarvan de voorwaarde een `EXISTS`
 * bevat is een UITZONDERING, niet algemene toegang. Heeft een tabel alleen nog
 * zulke leespolicies, dan kan een gewone gebruiker zijn eigen rijen niet meer
 * zien tenzij de koppeling bestaat.
 *
 * WAT DEZE TEST NIET DOET, en dat is belangrijker dan wat hij wel doet.
 * Hij had het incident van 13 aug NIET voorkomen. 195 dropt via dynamische SQL
 * (`EXECUTE format(...)` in een lus over `pg_policies`), dus welke policies
 * verdwenen hangt af van wat er op dat moment in de database stond. Statisch is
 * dat niet te weten: de map zegt nog steeds dat `001` een algemene policy op
 * `emails` aanmaakt, terwijl die in de database weg was.
 *
 * Wat hij WEL vangt: een tabel die in de map nooit een algemene leespolicy
 * krijgt, alleen een koppeling-policy. Dat is een echte fout, maar een andere.
 *
 * De sluitende controle voor het 195-geval is `docs/rls-dekking.sql`, en die
 * MOET met de hand tegen de database gedraaid worden na elke migratie die
 * policies dropt. Zie CLAUDE.md sectie 3.
 */
describe('elke tabel houdt ALGEMENE leestoegang, niet alleen een uitzondering', () => {
  // Tabellen waar een koppeling de juiste afbakening IS. Alle drie zijn
  // kindtabellen zonder eigen organisatie_id: de ouder bepaalt wie mag lezen.
  const KOPPELING_IS_CORRECT = new Set([
    'inkoopfactuur_regels',   // via inkoopfacturen.organisatie_id
    'nieuwsbrief_events',     // via nieuwsbrieven.user_id
    'nieuwsbrief_afmeldingen',
    'offerte_opvolg_log',
    'offerte_opvolg_stappen',
    'portaal_activiteiten',
    'werkbon_afbeeldingen',   // via werkbon_items -> werkbonnen
    'uitnodigingen',          // via organisaties.eigenaar_id
  ])

  function leesPolicyBodies() {
    // Naam, tabel en de voorwaarde tot de afsluitende puntkomma. Een
    // policy-body bevat zelf geen puntkomma, ook niet met een subquery erin.
    const re = /CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+(?:public\.)?(\w+)([\s\S]*?);/gi
    const perTabel = new Map<string, { naam: string; body: string; bestand: string }[]>()

    for (const bestand of readdirSync(MIGRATIES).filter((f) => f.endsWith('.sql')).sort()) {
      const sql = readFileSync(`${MIGRATIES}/${bestand}`, 'utf8').replace(/--[^\n]*/g, '')
      for (const m of sql.matchAll(re)) {
        const tabel = m[2].toLowerCase()
        if (!perTabel.has(tabel)) perTabel.set(tabel, [])
        perTabel.get(tabel)!.push({ naam: m[1], body: m[3], bestand })
      }
    }
    return perTabel
  }

  const isLeesPolicy = (body: string) =>
    /FOR\s+SELECT/i.test(body) || /FOR\s+ALL/i.test(body) || !/FOR\s+(INSERT|UPDATE|DELETE)/i.test(body)

  const isAlgemeen = (body: string) => {
    // `TO service_role` met USING (true) is de nette vorm voor een tabel die
    // bewust dicht is voor de app. Die heeft geen auth.*-functie in de body, dus
    // zonder deze regel viel elke correct gehardende tabel hier ten onrechte uit.
    if (/\bTO\s+service_role\b/i.test(body)) return true
    if (/EXISTS/i.test(body)) return false
    // Beide schrijfrichtingen, en de kolomnaam varieert: user_id, gebruiker_id,
    // en bij `organisaties` heet hij simpelweg `id`. Dat waren precies de drie
    // blinde vlekken in mijn eerste diagnose-query.
    return /auth\.uid\(\)/.test(body)
      || /auth_organisatie_id\(\)/.test(body)
      || /auth\.role\(\)/.test(body)
      || /profiles\.organisatie_id/.test(body)
  }

  it('markeert geen tabel waarvan alleen nog een koppeling-policy overblijft', () => {
    const perTabel = leesPolicyBodies()
    const verdacht: string[] = []

    for (const [tabel, policies] of perTabel) {
      if (KOPPELING_IS_CORRECT.has(tabel)) continue
      const lees = policies.filter((p) => isLeesPolicy(p.body))
      if (lees.length === 0) continue
      if (lees.some((p) => isAlgemeen(p.body))) continue
      verdacht.push(
        `${tabel}: alleen ${lees.map((p) => `"${p.naam}" (${p.bestand})`).join(', ')}`,
      )
    }

    expect(
      verdacht,
      'Deze tabellen hebben in de migratiemap alleen nog een leespolicy met een\n' +
        'EXISTS erin. Dat is een uitzondering, geen algemene toegang: een gebruiker\n' +
        'ziet zijn eigen rijen dan alleen als de koppeling bestaat. Dit is precies\n' +
        'wat migratie 195 met `emails` deed, en dat kostte 13.982 rijen aan\n' +
        'zichtbaarheid zonder één foutmelding.\n\n' +
        'Voeg een algemene policy toe, of zet de tabel in KOPPELING_IS_CORRECT als\n' +
        'de koppeling daar de juiste afbakening IS (kindtabel zonder eigen\n' +
        'organisatie_id) met de reden erbij.\n\n' + verdacht.join('\n'),
    ).toEqual([])
  })
})
