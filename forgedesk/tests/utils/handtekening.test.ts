import { describe, it, expect } from 'vitest'
import { bevatOpmaak, handtekeningNaarHtml } from '../../src/utils/handtekening'

// Let op: de vitest-omgeving is 'node', dus er is geen DOMParser. De
// allowlist-sanitizer draait daardoor niet in deze tests; wat hier wél wordt
// vastgelegd is dat de code in dat geval faalveilig escapet in plaats van
// ongecontroleerde HTML door te laten.

describe('bevatOpmaak', () => {
  it('herkent platte tekst', () => {
    expect(bevatOpmaak('Met vriendelijke groet,\nJan')).toBe(false)
    expect(bevatOpmaak('')).toBe(false)
    expect(bevatOpmaak('5 < 7 en 9 > 3')).toBe(false)
  })

  it('herkent opmaak', () => {
    expect(bevatOpmaak('<b>Jan</b>')).toBe(true)
    expect(bevatOpmaak('<div>Jan</div>')).toBe(true)
    expect(bevatOpmaak('Jan<br />Sign Company')).toBe(true)
  })
})

describe('handtekeningNaarHtml · platte tekst', () => {
  it('behoudt regeleinden', () => {
    expect(handtekeningNaarHtml('Groet,\nJan')).toBe('Groet,<br />Jan')
  })

  it('escapet tekens die HTML zouden kunnen worden', () => {
    expect(handtekeningNaarHtml('Jan & Co <sales>')).toBe('Jan &amp; Co &lt;sales&gt;')
  })

  it('geeft een lege string bij niets', () => {
    expect(handtekeningNaarHtml('')).toBe('')
    expect(handtekeningNaarHtml(null)).toBe('')
    expect(handtekeningNaarHtml(undefined)).toBe('')
    expect(handtekeningNaarHtml('   ')).toBe('')
  })
})

describe('handtekeningNaarHtml · zonder DOM', () => {
  it('laat nooit ruwe HTML door als er niet gesaneerd kan worden', () => {
    const resultaat = handtekeningNaarHtml('<script>alert(1)</script>')
    expect(resultaat).not.toContain('<script')
    expect(resultaat).toContain('&lt;script&gt;')
  })

  it('escapet ook een op het oog onschuldige tag', () => {
    expect(handtekeningNaarHtml('<b>Jan</b>')).toBe('&lt;b&gt;Jan&lt;/b&gt;')
  })
})
