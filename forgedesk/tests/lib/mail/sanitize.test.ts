import { describe, expect, it, vi } from 'vitest'

// Er is geen DOM in de testomgeving (geen jsdom in de repo), dus DOMPurify
// laat hier alles door. De stappen erna zijn pure stringfuncties en dat is
// precies wat deze tests meten; de allowlist van DOMPurify zelf is
// bibliotheekgedrag.
vi.mock('dompurify', () => ({
  default: { sanitize: (html: string) => html, addHook: () => {}, isSupported: false },
}))

import { saniteerVoorIframe, saniteerCss, herschrijfExterneAfbeeldingen, forceerLinksNieuwTab } from '@/lib/sanitize'

describe('herschrijfExterneAfbeeldingen', () => {
  it('externe img src wordt data-src, cid en data blijven', () => {
    const html = '<img src="https://t.example.com/pixel.gif" width="1"><img src="cid:logo@x"><img src="data:image/png;base64,AAAA"><img src=//cdn.x/y.png>'
    const uit = herschrijfExterneAfbeeldingen(html, { afbeeldingenLaden: false })
    expect(uit).toContain('data-src="https://t.example.com/pixel.gif"')
    expect(uit).not.toContain(' src="https://')
    expect(uit).toContain('<img src="cid:logo@x">')
    expect(uit).toContain('<img src="data:image/png;base64,AAAA">')
    expect(uit).toContain('data-src=//cdn.x/y.png')
  })

  it('met afbeeldingen aan blijft alles staan', () => {
    const html = '<img src="https://t.example.com/a.png">'
    expect(herschrijfExterneAfbeeldingen(html, { afbeeldingenLaden: true })).toBe(html)
  })

  it('background-attribuut naar data-background', () => {
    const uit = herschrijfExterneAfbeeldingen('<td background="https://x/bg.jpg">', { afbeeldingenLaden: false })
    expect(uit).toBe('<td data-background="https://x/bg.jpg">')
  })
})

describe('saniteerCss', () => {
  it('@import gaat eruit, externe url() wordt none, cid blijft', () => {
    const css = '@import url("https://fonts.example.com/x.css"); .a { background: url(https://x/bg.png); } .b { background-image: url("cid:achtergrond"); } .c { behavior: url(x.htc); }'
    const uit = saniteerCss(css, { afbeeldingenLaden: false })
    expect(uit).not.toContain('@import')
    expect(uit).toContain('background: none')
    expect(uit).toContain('url("cid:achtergrond")')
    expect(uit).not.toContain('behavior')
  })

  it('met afbeeldingen aan blijft een externe url() staan', () => {
    const uit = saniteerCss('.a { background: url(https://x/bg.png); }', { afbeeldingenLaden: true })
    expect(uit).toContain('url(https://x/bg.png)')
  })

  it('expression() wordt onschadelijk', () => {
    expect(saniteerCss('.a { width: expression(alert(1)); }', { afbeeldingenLaden: true })).not.toContain('expression(')
  })
})

describe('forceerLinksNieuwTab', () => {
  it('elke link krijgt target _blank en rel noopener, bestaande target wordt vervangen', () => {
    const uit = forceerLinksNieuwTab('<a href="https://x" target="_self">x</a><a href="mailto:a@b.nl">m</a>')
    expect(uit).toBe('<a href="https://x" target="_blank" rel="noopener noreferrer">x</a><a href="mailto:a@b.nl" target="_blank" rel="noopener noreferrer">m</a>')
  })
})

describe('saniteerVoorIframe', () => {
  it('geeft een volledig document met basis-stylesheet, gesaneerde style en hoogte-script', () => {
    const html = '<style>@import url(https://evil/x.css); p { color: red; background: url(https://x/a.png) }</style><p style="background-image:url(https://x/b.png)">Hoi <a href="https://doen.team">doen.</a></p><img src="https://x/pixel.gif">'
    const doc = saniteerVoorIframe(html, { afbeeldingenLaden: false })
    expect(doc.startsWith('<!doctype html>')).toBe(true)
    expect(doc).toContain('color-scheme: light dark')
    expect(doc).toContain('pre { white-space: pre-wrap; }')
    expect(doc).not.toContain('@import')
    expect(doc).toContain('p { color: red; background: none }')
    expect(doc).toContain('style="background-image:none"')
    expect(doc).toContain('data-src="https://x/pixel.gif"')
    expect(doc).toContain('target="_blank" rel="noopener noreferrer"')
    expect(doc).toContain("postMessage({ type: 'doen-mail-hoogte'")
    expect(doc).not.toContain('class="donker"')
  })

  it('donker zet de klasse op html', () => {
    expect(saniteerVoorIframe('<p>x</p>', { afbeeldingenLaden: true, donker: true })).toContain('<html class="donker">')
  })
})
