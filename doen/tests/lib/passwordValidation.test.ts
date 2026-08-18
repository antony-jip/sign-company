import { describe, it, expect } from 'vitest'
import {
  buildPasswordCheck,
  firstBlockingError,
  PASSWORD_MIN_ZXCVBN_SCORE,
} from '../../src/lib/passwordValidation'

// Een wachtwoord dat aan alle vier de eisen voldoet, zodat alleen de
// zxcvbn-score nog het verschil maakt.
const STERK = 'Kraanwagen7!'

describe('buildPasswordCheck', () => {
  it('accepteert een wachtwoord dat aan de eisen en de score voldoet', () => {
    const check = buildPasswordCheck(STERK, 4, '', [], false)
    expect(check.allRequirementsMet).toBe(true)
    expect(check.isAcceptable).toBe(true)
  })

  it('weigert een te lage score zolang de meting werkt', () => {
    const check = buildPasswordCheck(STERK, 1, 'te voorspelbaar', [], false)
    expect(check.isAcceptable).toBe(false)
    expect(firstBlockingError(check)).toContain('te zwak')
  })

  it('weigert zolang de meting nog loopt', () => {
    expect(buildPasswordCheck(STERK, null, '', [], true).isAcceptable).toBe(false)
  })

  // De kern: zonder deze vangnet-tak blijft de score op 0 staan als de chunk
  // niet laadt, en komt niemand meer door registratie of uitnodiging heen.
  it('laat registratie door op de vier eisen als de meting niet geladen kon worden', () => {
    const check = buildPasswordCheck(STERK, null, '', [], false, true)
    expect(check.strength.unavailable).toBe(true)
    expect(check.isAcceptable).toBe(true)
    expect(firstBlockingError(check)).toBeNull()
  })

  it('blijft de vier eisen afdwingen als de meting niet beschikbaar is', () => {
    const check = buildPasswordCheck('kort', null, '', [], false, true)
    expect(check.isAcceptable).toBe(false)
    expect(firstBlockingError(check)).toContain('minimaal 10 tekens')
  })

  it('meldt per ontbrekende eis wat er mist', () => {
    expect(firstBlockingError(buildPasswordCheck('alleenkleineletters', 4, '', [], false)))
      .toContain('hoofdletter')
  })

  it('houdt de drempel op sterk', () => {
    expect(PASSWORD_MIN_ZXCVBN_SCORE).toBe(3)
    expect(buildPasswordCheck(STERK, 2, '', [], false).isAcceptable).toBe(false)
    expect(buildPasswordCheck(STERK, 3, '', [], false).isAcceptable).toBe(true)
  })
})
