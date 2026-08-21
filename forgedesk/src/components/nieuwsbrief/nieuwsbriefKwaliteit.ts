export type Ernst = 'fout' | 'let_op' | 'ok'

export interface Bevinding {
  ernst: Ernst
  titel: string
  uitleg: string
}

export interface LinkInfo { url: string; tekst: string; probleem: string | null }

const SPAMWOORDEN = ['gratis!!!', '100% gratis', 'klik hier!!!', 'win nu', 'geld verdienen', 'gegarandeerd', 'laatste kans!!!', 'act now', 'urgent', '€€€', '$$$']

function parse(html: string): Document | null {
  if (typeof DOMParser === 'undefined') return null
  return new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
}

export function verzamelLinks(html: string): LinkInfo[] {
  const doc = parse(html)
  if (!doc) return []
  return Array.from(doc.querySelectorAll('a')).map(a => {
    const url = (a.getAttribute('href') || '').trim()
    const tekst = (a.textContent || '').trim() || (a.querySelector('img') ? '[afbeelding]' : '')
    let probleem: string | null = null
    if (!url || url === '#') probleem = 'Lege link'
    else if (url.startsWith('{{{')) probleem = null
    else if (!/^(https?:\/\/|mailto:|tel:)/i.test(url)) probleem = 'Mist https://'
    else if (/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(url)) probleem = 'Wijst naar localhost'
    else if (/^https?:\/\/[^/]*(voorbeeld|example)\./i.test(url)) probleem = 'Voorbeeld-URL'
    return { url, tekst, probleem }
  })
}

export function beoordeelNieuwsbrief(opties: { onderwerp: string; preheader: string; html: string; aantalOntvangers: number | null; testVerstuurd: boolean }): Bevinding[] {
  const { onderwerp, preheader, html, aantalOntvangers, testVerstuurd } = opties
  const uit: Bevinding[] = []
  const doc = parse(html)
  const tekst = (doc?.body.textContent || '').replace(/\s+/g, ' ').trim()

  if (!onderwerp.trim()) uit.push({ ernst: 'fout', titel: 'Geen onderwerp', uitleg: 'Zonder onderwerp wordt de mail niet geopend, en Resend weigert ’m.' })
  else if (onderwerp.trim().length > 60) uit.push({ ernst: 'let_op', titel: 'Onderwerp is lang', uitleg: `${onderwerp.trim().length} tekens. Boven de 60 knipt de inbox op mobiel af.` })
  else if (onderwerp.trim().length < 12) uit.push({ ernst: 'let_op', titel: 'Onderwerp is kort', uitleg: 'Een iets langere regel maakt vaak nieuwsgieriger.' })
  else uit.push({ ernst: 'ok', titel: 'Onderwerp', uitleg: `${onderwerp.trim().length} tekens, past netjes.` })

  if (/[A-Z]{5,}/.test(onderwerp) || /!{2,}/.test(onderwerp)) uit.push({ ernst: 'let_op', titel: 'Hoofdletters of uitroeptekens in onderwerp', uitleg: 'Dat trekt spamfilters aan.' })

  if (!preheader.trim()) uit.push({ ernst: 'let_op', titel: 'Geen preheader', uitleg: 'De inbox toont anders de eerste regel van je mail, vaak "Bekijk in browser" of je bedrijfsnaam.' })
  else if (preheader.trim().length > 110) uit.push({ ernst: 'let_op', titel: 'Preheader is lang', uitleg: `${preheader.trim().length} tekens, ongeveer 90 is het maximum dat zichtbaar blijft.` })
  else uit.push({ ernst: 'ok', titel: 'Preheader', uitleg: 'Staat klaar voor de inbox-regel.' })

  if (!html.trim() || tekst.length === 0) uit.push({ ernst: 'fout', titel: 'De nieuwsbrief is leeg', uitleg: 'Voeg minstens één blok met tekst toe.' })
  else if (tekst.length < 120) uit.push({ ernst: 'let_op', titel: 'Weinig tekst', uitleg: 'Mails die vooral uit beeld bestaan, komen vaker in de spambak.' })

  if (doc) {
    const imgs = Array.from(doc.querySelectorAll('img'))
    const zonderAlt = imgs.filter(i => !(i.getAttribute('alt') || '').trim())
    if (zonderAlt.length > 0) uit.push({ ernst: 'let_op', titel: `${zonderAlt.length} afbeelding${zonderAlt.length > 1 ? 'en' : ''} zonder alt-tekst`, uitleg: 'Veel mailclients tonen afbeeldingen pas na een klik; de alt-tekst vangt dat op.' })
    else if (imgs.length > 0) uit.push({ ernst: 'ok', titel: 'Alle afbeeldingen hebben alt-tekst', uitleg: `${imgs.length} afbeelding${imgs.length > 1 ? 'en' : ''}.` })
    const lege = imgs.filter(i => !(i.getAttribute('src') || '').trim()).length + (html.match(/Nog geen afbeelding gekozen/g)?.length ?? 0)
    if (lege > 0) uit.push({ ernst: 'fout', titel: `${lege} afbeeldingsblok${lege > 1 ? 'ken' : ''} zonder foto`, uitleg: 'Kies een foto of verwijder het blok; anders ziet de ontvanger een leeg grijs vlak.' })
    const http = imgs.filter(i => /^http:\/\//i.test(i.getAttribute('src') || ''))
    if (http.length > 0) uit.push({ ernst: 'let_op', titel: 'Afbeelding via http://', uitleg: 'Gebruik https, anders blokkeert Gmail de afbeelding.' })

    const links = verzamelLinks(html)
    const kapot = links.filter(l => l.probleem)
    if (kapot.length > 0) uit.push({ ernst: 'fout', titel: `${kapot.length} link${kapot.length > 1 ? 's' : ''} klopt niet`, uitleg: kapot.map(l => `${l.tekst || l.url}: ${l.probleem}`).slice(0, 3).join(' · ') })
    else if (links.length > 0) uit.push({ ernst: 'ok', titel: 'Links', uitleg: `${links.length} link${links.length > 1 ? 's' : ''}, allemaal compleet.` })
    if (links.length === 0 && tekst.length > 0) uit.push({ ernst: 'let_op', titel: 'Geen enkele link', uitleg: 'Een nieuwsbrief zonder knop of link levert zelden iets op.' })

    if (/\{\{\{contact\.first_name(?!\|)/.test(html)) uit.push({ ernst: 'let_op', titel: 'Voornaam zonder fallback', uitleg: 'Gebruik {{{contact.first_name|daar}}}; niet elk contact heeft een voornaam.' })

    if (/<script|onclick=|onload=/i.test(html)) uit.push({ ernst: 'fout', titel: 'Script in de HTML', uitleg: 'Mailclients strippen scripts en markeren de mail als verdacht.' })
  }

  const laag = `${onderwerp} ${tekst}`.toLowerCase()
  const spam = SPAMWOORDEN.filter(w => laag.includes(w))
  if (spam.length > 0) uit.push({ ernst: 'let_op', titel: 'Spamgevoelige woorden', uitleg: spam.join(', ') })

  if (aantalOntvangers === 0) uit.push({ ernst: 'fout', titel: 'Geen ontvangers', uitleg: 'Kies bij Ontvangers wie deze nieuwsbrief krijgt.' })
  else if (aantalOntvangers != null) uit.push({ ernst: 'ok', titel: 'Ontvangers', uitleg: `${aantalOntvangers} ${aantalOntvangers === 1 ? 'adres' : 'adressen'}, afmeldingen al uitgesloten.` })

  if (!testVerstuurd) uit.push({ ernst: 'let_op', titel: 'Nog geen testmail verstuurd', uitleg: 'Stuur ’m eerst naar jezelf en bekijk ’m op je telefoon.' })
  else uit.push({ ernst: 'ok', titel: 'Testmail verstuurd', uitleg: 'Je hebt de mail in je eigen inbox gezien.' })

  const volgorde: Record<Ernst, number> = { fout: 0, let_op: 1, ok: 2 }
  return uit.sort((a, b) => volgorde[a.ernst] - volgorde[b.ernst])
}

export function telFouten(bevindingen: Bevinding[]): number {
  return bevindingen.filter(b => b.ernst === 'fout').length
}
