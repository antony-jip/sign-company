import { describe, it, expect } from 'vitest'
import {
  MAX_POGINGEN, volgendeMutatieStatus, beoordeelWerkbonMutatie,
  beperkTotGewijzigd, telStand, bannerTekst,
} from '@/utils/offlineWachtrijRegels'

describe('volgendeMutatieStatus · het pad van een permanent falende mutatie', () => {
  it('blijft wachtend zolang het netwerk de oorzaak is en het maximum niet gehaald is', () => {
    expect(volgendeMutatieStatus(1, 'netwerk')).toBe('wachtend')
    expect(volgendeMutatieStatus(MAX_POGINGEN - 1, 'netwerk')).toBe('wachtend')
  })

  it('loopt vast bij het maximum aantal pogingen, maar alleen als de server antwoordde', () => {
    expect(volgendeMutatieStatus(MAX_POGINGEN, 'tijdelijk')).toBe('vast')
    expect(volgendeMutatieStatus(MAX_POGINGEN + 3, 'tijdelijk')).toBe('vast')
  })

  /**
   * De cap gaat over "de server antwoordde en het lukte niet", niet over "we
   * hebben het geprobeerd". De teller wordt opgehoogd per flush-trigger, en
   * triggers zijn gratis: elke keer dat de monteur van de camera terugswitcht
   * naar de app vuurt visibilitychange. Zonder deze uitzondering stond de eerste
   * foto na vijf keer wisselen op 'vast', terwijl er nooit een antwoord is
   * geweest en er dus geen enkele aanwijzing is dat het item niet deugt. Een
   * monteur moet een halve dag zonder bereik kunnen overbruggen.
   */
  it('laat een netwerkfout nooit vastlopen, hoe vaak ook geprobeerd', () => {
    expect(volgendeMutatieStatus(MAX_POGINGEN, 'netwerk')).toBe('wachtend')
    expect(volgendeMutatieStatus(MAX_POGINGEN * 20, 'netwerk')).toBe('wachtend')
  })

  it('loopt bij een weigering meteen vast · wachten verandert de oorzaak niet', () => {
    expect(volgendeMutatieStatus(1, 'rechten')).toBe('vast')
    expect(volgendeMutatieStatus(1, 'geweigerd')).toBe('vast')
    expect(volgendeMutatieStatus(1, 'weg')).toBe('vast')
    expect(volgendeMutatieStatus(1, 'conflict')).toBe('vast')
    expect(volgendeMutatieStatus(1, 'onbekend')).toBe('vast')
  })
})

describe('beoordeelWerkbonMutatie · de conflictregel', () => {
  it('laat feedback door zolang de werkbon open is', () => {
    expect(beoordeelWerkbonMutatie('werkbon_feedback', 'concept').toegestaan).toBe(true)
    expect(beoordeelWerkbonMutatie('werkbon_feedback', 'definitief').toegestaan).toBe(true)
  })

  it('laat de server winnen zodra de werkbon is afgerond', () => {
    const oordeel = beoordeelWerkbonMutatie('werkbon_feedback', 'afgerond')
    expect(oordeel.toegestaan).toBe(false)
    if (!oordeel.toegestaan) expect(oordeel.foutSoort).toBe('conflict')
  })

  it('laat een foto op een afgeronde werkbon juist wél toe', () => {
    // Een foto voegt toe en overschrijft niets, en de telefoon heeft de enige
    // kopie. Weigeren zou dataverlies zijn om een conflict te vermijden dat er
    // niet is.
    expect(beoordeelWerkbonMutatie('werkbon_foto', 'afgerond').toegestaan).toBe(true)
  })

  it('houdt beide soorten tegen zodra er gefactureerd is', () => {
    for (const soort of ['werkbon_foto', 'werkbon_feedback'] as const) {
      const oordeel = beoordeelWerkbonMutatie(soort, 'gefactureerd')
      expect(oordeel.toegestaan).toBe(false)
      if (!oordeel.toegestaan) expect(oordeel.foutSoort).toBe('conflict')
    }
  })

  it('noemt een verdwenen werkbon weg en niet conflict', () => {
    const oordeel = beoordeelWerkbonMutatie('werkbon_foto', null)
    expect(oordeel.toegestaan).toBe(false)
    if (!oordeel.toegestaan) expect(oordeel.foutSoort).toBe('weg')
  })

  it('geeft bij elke weigering een uitleg mee · niets verdwijnt stil', () => {
    for (const status of ['gefactureerd', null] as const) {
      const oordeel = beoordeelWerkbonMutatie('werkbon_feedback', status)
      expect(oordeel.toegestaan).toBe(false)
      if (!oordeel.toegestaan) expect(oordeel.uitleg.length).toBeGreaterThan(0)
    }
  })
})

describe('beperkTotGewijzigd · per veld laatste-schrijver-wint', () => {
  const payload = {
    uren_gewerkt: 6,
    monteur_opmerkingen: 'klaar',
    klant_handtekening: 'data:image/png;base64,x',
    klant_naam_getekend: 'Jansen',
    getekend_op: '2026-08-12T10:00:00Z',
  }

  it('stuurt alleen mee wat de monteur echt aanraakte', () => {
    expect(beperkTotGewijzigd(payload, ['uren_gewerkt'])).toEqual({ uren_gewerkt: 6 })
  })

  it('stuurt niets als er niets is aangeraakt', () => {
    expect(beperkTotGewijzigd(payload, [])).toEqual({})
  })

  it('negeert velden die niet in de payload zitten', () => {
    expect(beperkTotGewijzigd(payload, ['status'])).toEqual({})
  })
})

describe('zichtbaarheid', () => {
  it('telt wachtend en vast apart', () => {
    expect(telStand([
      { status: 'wachtend' }, { status: 'bezig' }, { status: 'vast' },
    ])).toEqual({ wachtend: 2, vast: 1 })
  })

  it('zwijgt als er niets wacht en er verbinding is', () => {
    expect(bannerTekst(true, { wachtend: 0, vast: 0 })).toBeNull()
  })

  it('belooft offline geen verlies meer, maar bewaren', () => {
    const tekst = bannerTekst(false, { wachtend: 0, vast: 0 })
    expect(tekst).toContain('bewaard')
    expect(tekst).not.toContain('niet opgeslagen')
  })

  it('toont een niet-leeglopende wachtrij ook als je online bent', () => {
    expect(bannerTekst(true, { wachtend: 3, vast: 0 })).toBe('3 items wachten op verzending.')
  })

  it('laat een vastgelopen item voorgaan op de telling', () => {
    expect(bannerTekst(true, { wachtend: 2, vast: 1 })).toContain('1 item kon niet verstuurd worden')
  })
})
