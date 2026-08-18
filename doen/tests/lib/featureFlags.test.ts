import { describe, it, expect } from 'vitest'
import {
  bepaalStand,
  staatAan,
  staatUit,
  veiligeFlags,
  moduleUitgezet,
  zonderUitgezetteModules,
  MODULE_FLAGS,
} from '@/lib/featureFlags'
import { ALLE_MODULES, NAV_GROEPEN, MOBIELE_MENU_KANDIDATEN } from '@/lib/navigatie'

const ORG_A = '11111111-1111-1111-1111-111111111111'
const ORG_B = '22222222-2222-2222-2222-222222222222'

const globaal = (naam: string, aan: boolean): FeatureFlagRij => ({ naam, organisatie_id: null, aan })
const perOrg = (naam: string, organisatie_id: string, aan: boolean): FeatureFlagRij => ({ naam, organisatie_id, aan })

describe('bepaalStand', () => {
  it('een flag waar geen enkele rij over gaat is onbekend en staat dus uit', () => {
    expect(bepaalStand('bestaat_niet', [], ORG_A)).toBe('onbekend')
    expect(staatAan('bestaat_niet', [], ORG_A)).toBe(false)
    // En hij staat ook niet expliciet uit: er is niets gezegd, dus een
    // bestaande feature achter staatUit() blijft staan.
    expect(staatUit('bestaat_niet', [], ORG_A)).toBe(false)
  })

  it('rijen van een andere flag beïnvloeden deze flag niet', () => {
    const rijen = [globaal('andere_flag', true), perOrg('andere_flag', ORG_A, true)]
    expect(bepaalStand('mailsync_queue', rijen, ORG_A)).toBe('onbekend')
  })

  it('globaal aan geldt voor elke organisatie zonder eigen rij', () => {
    const rijen = [globaal('mailsync_queue', true)]
    expect(bepaalStand('mailsync_queue', rijen, ORG_A)).toBe('aan')
    expect(bepaalStand('mailsync_queue', rijen, ORG_B)).toBe('aan')
  })

  it('een org-rij gaat voor op de globale rij', () => {
    // Pilot-stand: globaal staat er niets, één organisatie doet mee.
    const pilot = [perOrg('mailsync_queue', ORG_A, true)]
    expect(bepaalStand('mailsync_queue', pilot, ORG_A)).toBe('aan')
    expect(bepaalStand('mailsync_queue', pilot, ORG_B)).toBe('onbekend')

    // Uitrol-stand: globaal aan, deze ene organisatie opt-out.
    const optOut = [globaal('mailsync_queue', true), perOrg('mailsync_queue', ORG_A, false)]
    expect(bepaalStand('mailsync_queue', optOut, ORG_A)).toBe('uit')
    expect(bepaalStand('mailsync_queue', optOut, ORG_B)).toBe('aan')
  })

  it('globaal uit is een harde stop die een org-rij NIET kan overrulen', () => {
    // Vastgelegde keuze: de globale rij op false wint altijd. Anders is de
    // noodstop geen noodstop — een org-rij die er al maanden stond zou een
    // rewrite tijdens een incident aan kunnen houden. Wil je toch één
    // organisatie doorlaten, dan verwijder je de globale rij (pilot-stand)
    // in plaats van hem op false te zetten.
    const rijen = [globaal('mailsync_queue', false), perOrg('mailsync_queue', ORG_A, true)]
    expect(bepaalStand('mailsync_queue', rijen, ORG_A)).toBe('uit')
    expect(staatAan('mailsync_queue', rijen, ORG_A)).toBe(false)
    expect(staatUit('mailsync_queue', rijen, ORG_A)).toBe(true)
  })

  it('zonder organisatie (nog niet ingelogd) telt alleen de globale rij', () => {
    const rijen = [globaal('mailsync_queue', true), perOrg('mailsync_queue', ORG_A, false)]
    expect(bepaalStand('mailsync_queue', rijen, null)).toBe('aan')
  })
})

describe('veiligeFlags', () => {
  it('een mislukte query levert geen rijen op, dus staat de flag uit', async () => {
    let gemeld: unknown = null
    const rijen = await veiligeFlags(
      () => Promise.reject(new Error('netwerk weg')),
      (fout) => { gemeld = fout },
    )
    expect(rijen).toEqual([])
    expect(staatAan('mailsync_queue', rijen, ORG_A)).toBe(false)
    expect(gemeld).toBeInstanceOf(Error)
  })

  it('een fout dooft geen bestaande feature: staatUit blijft false', async () => {
    // De andere kant van fail closed. Zou een fout wél 'uit' betekenen, dan
    // verdwijnt Studio bij elke database-hapering.
    const rijen = await veiligeFlags(() => Promise.reject(new Error('504')))
    expect(staatUit('module_studio', rijen, ORG_A)).toBe(false)
    expect(moduleUitgezet('/visualizer', (f) => staatUit(f, rijen, ORG_A))).toBe(false)
  })

  it('lukt de query, dan komen de rijen ongewijzigd door', async () => {
    const bron = [globaal('module_studio', true)]
    await expect(veiligeFlags(() => Promise.resolve(bron))).resolves.toEqual(bron)
  })
})

describe('moduleUitgezet en zonderUitgezetteModules', () => {
  const modules = [
    { label: 'Projecten', path: '/projecten' },
    { label: 'Studio', path: '/visualizer' },
    { label: 'Klanten', path: '/klanten' },
  ]

  it('Studio hangt aan module_studio', () => {
    expect(MODULE_FLAGS['/visualizer']).toBe('module_studio')
  })

  it('laat alle modules staan zolang de flag niet expliciet uit staat', () => {
    const rijen = [globaal('module_studio', true)]
    const isUit = (f: string) => staatUit(f, rijen, ORG_A)
    expect(zonderUitgezetteModules(modules, isUit)).toHaveLength(3)
  })

  it('haalt alleen de gevlagde module eruit als de flag uit staat', () => {
    const rijen = [globaal('module_studio', false)]
    const isUit = (f: string) => staatUit(f, rijen, ORG_A)
    expect(zonderUitgezetteModules(modules, isUit).map((m) => m.label)).toEqual(['Projecten', 'Klanten'])
    expect(moduleUitgezet('/visualizer', isUit)).toBe(true)
    expect(moduleUitgezet('/projecten', isUit)).toBe(false)
  })

  it('een organisatie kan Studio los uitzetten zonder de rest te raken', () => {
    const rijen = [perOrg('module_studio', ORG_A, false)]
    const voorA = (f: string) => staatUit(f, rijen, ORG_A)
    const voorB = (f: string) => staatUit(f, rijen, ORG_B)
    expect(zonderUitgezetteModules(modules, voorA)).toHaveLength(2)
    expect(zonderUitgezetteModules(modules, voorB)).toHaveLength(3)
  })
})

/**
 * De eigenschap waar de hele veiligheid van dit mechanisme op rust: zolang de
 * tabel leeg is, en dat is de toestand tussen deze commit en het moment dat de
 * migratie gedraaid wordt, mag er in de menu's letterlijk niets veranderen.
 *
 * Dit is met opzet getest tegen de ECHTE navigatielijst en niet tegen een
 * verzonnen lijstje. Een test op drie neptegels zou blijven slagen terwijl een
 * nieuwe module met een verkeerd pad stil uit het menu valt.
 */
describe('nul rijen laat de echte navigatie ongemoeid', () => {
  const geenRijen: FeatureFlagRij[] = []
  const isUit = (flag: string) => staatUit(flag, geenRijen, ORG_A)

  it('houdt elke module in ALLE_MODULES', () => {
    expect(zonderUitgezetteModules(ALLE_MODULES, isUit)).toHaveLength(ALLE_MODULES.length)
  })

  it('houdt elke groep in NAV_GROEPEN op volle sterkte', () => {
    for (const groep of NAV_GROEPEN) {
      expect(zonderUitgezetteModules(groep.items, isUit), groep.section).toHaveLength(groep.items.length)
    }
  })

  it('houdt het mobiele menu intact', () => {
    expect(zonderUitgezetteModules(MOBIELE_MENU_KANDIDATEN, isUit))
      .toHaveLength(MOBIELE_MENU_KANDIDATEN.length)
  })

  /**
   * Elk pad in MODULE_FLAGS moet een bestaande module zijn. Een typefout hier
   * levert een flag op die nooit iets uitzet, en dat merk je pas op het moment
   * dat je hem nodig hebt.
   */
  it('verwijst elk pad in MODULE_FLAGS naar een bestaande module', () => {
    const paden = new Set(MOBIELE_MENU_KANDIDATEN.map((m) => m.path))
    for (const pad of Object.keys(MODULE_FLAGS)) {
      expect(paden.has(pad), `${pad} staat niet in de navigatie`).toBe(true)
    }
  })
})
