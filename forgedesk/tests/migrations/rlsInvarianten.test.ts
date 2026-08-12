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
