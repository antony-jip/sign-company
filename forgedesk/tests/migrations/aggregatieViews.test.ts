import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'fs'
import { resolve } from 'path'

// De aggregatie voor de rapportage-pagina's zit volledig in SQL, dus valt er
// geen rekenfunctie te unit-testen. Wat wél te controleren valt is de
// invariant die deze views veilig maakt: zonder security_invoker draait een
// view met de rechten van de eigenaar en telt een aggregaat over ALLE
// organisaties op. Die fout is stil — je ziet alleen een te hoog getal.

const MIGRATIE_MAP = resolve(__dirname, '../../supabase/migrations')
const AGGREGATIE_MIGRATIE = '199_rapportage_aggregatie_views.sql'

function lees(bestand: string): string {
  return readFileSync(resolve(MIGRATIE_MAP, bestand), 'utf8')
}

function viewDefinities(sql: string): Array<{ naam: string; kop: string }> {
  const regex = /CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+([a-z0-9_]+)([\s\S]{0,120})/gi
  const gevonden: Array<{ naam: string; kop: string }> = []
  for (const match of sql.matchAll(regex)) {
    gevonden.push({ naam: match[1], kop: match[2] })
  }
  return gevonden
}

// Alleen echte statements, niet de regels waar CREATE VIEW in een comment staat.
function zonderComments(sql: string): string {
  return sql
    .split('\n')
    .filter((regel) => !regel.trimStart().startsWith('--'))
    .join('\n')
}

describe('migraties met views', () => {
  const bestanden = readdirSync(MIGRATIE_MAP).filter((f) => f.endsWith('.sql'))

  it('vindt de aggregatie-migratie', () => {
    expect(bestanden).toContain(AGGREGATIE_MIGRATIE)
  })

  it('maakt elke view aan met security_invoker = on', () => {
    const overtreders: string[] = []
    for (const bestand of bestanden) {
      for (const view of viewDefinities(zonderComments(lees(bestand)))) {
        if (!/WITH\s*\(\s*security_invoker\s*=\s*on\s*\)/i.test(view.kop)) {
          overtreders.push(`${bestand}: ${view.naam}`)
        }
      }
    }
    expect(overtreders).toEqual([])
  })
})

describe('199_rapportage_aggregatie_views', () => {
  const sql = lees(AGGREGATIE_MIGRATIE)
  const schoon = zonderComments(sql)
  const views = viewDefinities(schoon).map((v) => v.naam)

  it('maakt de views idempotent aan', () => {
    expect(views.length).toBeGreaterThan(0)
    const zonderReplace = schoon.match(/CREATE\s+VIEW/gi) ?? []
    expect(zonderReplace).toEqual([])
  })

  it('aggregeert elke view per organisatie_id', () => {
    // Een GROUP BY zonder organisatie_id klapt rijen van meerdere organisaties
    // op elkaar zodra RLS ooit ruimer wordt dan één organisatie per gebruiker.
    const blokken = schoon.split(/CREATE\s+OR\s+REPLACE\s+VIEW\s+/i).slice(1)
    const zonderOrgGroep = blokken
      .filter((blok) => !/GROUP\s+BY[\s\S]*?organisatie_id/i.test(blok.split(';')[0]))
      .map((blok) => blok.split(/\s/)[0])
    expect(zonderOrgGroep).toEqual([])
  })

  it('geeft elke view leesrechten aan authenticated', () => {
    const ongegund = views.filter(
      (naam) => !new RegExp(`GRANT\\s+SELECT\\s+ON\\s+${naam}\\s`, 'i').test(schoon)
    )
    expect(ongegund).toEqual([])
  })

  it('sluit af met de doen_migraties-markering onder zijn eigen naam', () => {
    const statements = schoon.split(';').map((s) => s.trim()).filter(Boolean)
    const laatste = statements[statements.length - 1]
    expect(laatste).toMatch(/INSERT\s+INTO\s+doen_migraties/i)
    expect(laatste).toContain(AGGREGATIE_MIGRATIE)
    expect(laatste).toMatch(/ON\s+CONFLICT\s+DO\s+NOTHING/i)
  })
})
