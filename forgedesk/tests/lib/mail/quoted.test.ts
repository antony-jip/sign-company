import { describe, expect, it } from 'vitest'
import { splitsCitaat } from '@/lib/mail/quoted'

describe('splitsCitaat', () => {
  it('Gmail: knipt bij div.gmail_quote', () => {
    const html = '<div dir="ltr">Prima, doen we.<br></div><br><div class="gmail_quote"><div dir="ltr" class="gmail_attr">Op di 2 sep 2026 om 10:12 schreef Jan Jansen &lt;<a href="mailto:jan@x.nl">jan@x.nl</a>&gt;:<br></div><blockquote class="gmail_quote">Kunnen jullie morgen komen?</blockquote></div>'
    const uit = splitsCitaat(html)
    expect(uit.eigen).toBe('<div dir="ltr">Prima, doen we.<br></div><br>')
    expect(uit.geciteerd).toMatch(/^<div class="gmail_quote">/)
    expect(uit.geciteerd).toContain('Kunnen jullie morgen komen?')
  })

  it('Outlook NL: Van/Verzonden-blok', () => {
    const html = '<div class="WordSection1"><p class="MsoNormal">Hoi Piet, akkoord.</p><p class="MsoNormal">Groet, Antony</p><div style="border:none;border-top:solid #E1E1E1 1.0pt;padding:3.0pt 0cm 0cm 0cm"><p class="MsoNormal"><b>Van:</b> Piet &lt;piet@y.nl&gt;<br><b>Verzonden:</b> dinsdag 2 september 2026 09:00<br><b>Aan:</b> Antony<br><b>Onderwerp:</b> Gevelbord</p></div><p class="MsoNormal">Wat kost een gevelbord?</p></div>'
    const uit = splitsCitaat(html)
    expect(uit.eigen).toContain('Hoi Piet, akkoord.')
    expect(uit.eigen).toContain('Groet, Antony')
    expect(uit.eigen).not.toContain('Verzonden:')
    expect(uit.geciteerd).toMatch(/^<div style="border:none/)
    expect(uit.geciteerd).toContain('Wat kost een gevelbord?')
  })

  it('Outlook EN: From/Sent-blok', () => {
    const html = '<p>Thanks, will do.</p><p><b>From:</b> Sam &lt;sam@z.com&gt;<br><b>Sent:</b> Tuesday, September 2, 2026 9:00 AM<br><b>To:</b> Antony<br><b>Subject:</b> Signage</p><p>Can you quote this?</p>'
    const uit = splitsCitaat(html)
    expect(uit.eigen).toBe('<p>Thanks, will do.</p>')
    expect(uit.geciteerd).toContain('Can you quote this?')
  })

  it('Outlook web: divRplyFwdMsg', () => {
    const html = '<div>Ja hoor.</div><div id="divRplyFwdMsg" dir="ltr"><font face="Calibri"><b>Van:</b> X</font></div><div>Oud bericht</div>'
    const uit = splitsCitaat(html)
    expect(uit.eigen).toBe('<div>Ja hoor.</div>')
    expect(uit.geciteerd).toMatch(/^<div id="divRplyFwdMsg"/)
  })

  it('Original Message-scheiding, NL en EN', () => {
    const nl = splitsCitaat('<p>Top.</p><p>-----Oorspronkelijk bericht-----<br>Van: A</p><p>Oud</p>')
    expect(nl.eigen).toBe('<p>Top.</p>')
    expect(nl.geciteerd).toContain('Oorspronkelijk bericht')
    const en = splitsCitaat('<p>Great.</p><div>----- Original Message -----<br>From: B</div><p>Old</p>')
    expect(en.eigen).toBe('<p>Great.</p>')
    expect(en.geciteerd).toContain('Original Message')
  })

  it('Apple Mail NL: "Op ... heeft ... geschreven:" met blockquote type=cite', () => {
    const html = '<div dir="auto">Graag.</div><div><br></div><div>Op 2 sep. 2026 om 10:12 heeft Jan Jansen &lt;jan@x.nl&gt; het volgende geschreven:</div><br><blockquote type="cite"><div>Kom je langs?</div></blockquote>'
    const uit = splitsCitaat(html)
    expect(uit.eigen).toBe('<div dir="auto">Graag.</div><div><br></div>')
    expect(uit.geciteerd).toMatch(/^<div>Op 2 sep/)
  })

  it('Apple Mail EN: "On ... wrote:"', () => {
    const html = '<div>Sure.</div><div>On 2 Sep 2026, at 10:12, Sam &lt;sam@z.com&gt; wrote:</div><blockquote type="cite">Can you?</blockquote>'
    const uit = splitsCitaat(html)
    expect(uit.eigen).toBe('<div>Sure.</div>')
    expect(uit.geciteerd).toContain('wrote:')
  })

  it('alleen een blockquote als vangnet', () => {
    const uit = splitsCitaat('<p>Antwoord</p><blockquote>Vraag</blockquote>')
    expect(uit.eigen).toBe('<p>Antwoord</p>')
    expect(uit.geciteerd).toBe('<blockquote>Vraag</blockquote>')
  })

  it('geen citaat: alles is eigen', () => {
    const html = '<p>Hallo,</p><p>Op de bouwplaats is alles klaar.</p>'
    expect(splitsCitaat(html)).toEqual({ eigen: html, geciteerd: null })
    expect(splitsCitaat('')).toEqual({ eigen: '', geciteerd: null })
  })

  it('een mail die alleen uit citaat bestaat blijft heel', () => {
    const html = '<div class="gmail_quote">Doorgestuurd zonder tekst</div>'
    expect(splitsCitaat(html)).toEqual({ eigen: html, geciteerd: null })
  })
})
