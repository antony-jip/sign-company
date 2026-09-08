import { describe, it, expect } from 'vitest'
import { daanTekstNaarHtml } from '../../src/components/email/emailHelpers'

describe('daanTekstNaarHtml', () => {
  it('geeft elke alinea een eigen p', () => {
    const html = daanTekstNaarHtml('Hi Mandy,\n\nDuidelijk, dan houden we de pootjes zilver.\n\nGroet')
    expect(html).toBe(
      '<p style="margin:0 0 1em 0">Hi Mandy,</p>' +
      '<p style="margin:0 0 1em 0">Duidelijk, dan houden we de pootjes zilver.</p>' +
      '<p style="margin:0 0 1em 0">Groet</p>'
    )
  })

  it('houdt losse regels binnen een alinea bij elkaar met een br', () => {
    expect(daanTekstNaarHtml('Nog nodig:\n- maat\n- kleur')).toBe(
      '<p style="margin:0 0 1em 0">Nog nodig:<br>- maat<br>- kleur</p>'
    )
  })

  it('slikt lege regels met spaties erin', () => {
    expect(daanTekstNaarHtml('Een\n   \nTwee')).toBe(
      '<p style="margin:0 0 1em 0">Een</p><p style="margin:0 0 1em 0">Twee</p>'
    )
  })

  it('ontsnapt html uit het model in plaats van het uit te voeren', () => {
    expect(daanTekstNaarHtml('<script>alert(1)</script> & meer')).toBe(
      '<p style="margin:0 0 1em 0">&lt;script&gt;alert(1)&lt;/script&gt; &amp; meer</p>'
    )
  })

  it('geeft niets terug bij lege tekst', () => {
    expect(daanTekstNaarHtml('')).toBe('')
    expect(daanTekstNaarHtml('   \n  ')).toBe('')
  })
})
