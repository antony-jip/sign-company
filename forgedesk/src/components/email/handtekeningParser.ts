// Haalt contactgegevens uit de handtekening onder een e-mail: telefoon,
// functie, bedrijfsnaam, adres, postcode/plaats en website. Heuristisch en
// lokaal (geen AI-call), bedoeld als voorinvulling die de gebruiker nakijkt.

export interface HandtekeningGegevens {
  naam: string
  functie: string
  bedrijfsnaam: string
  telefoon: string
  mobiel: string
  adres: string
  postcode: string
  stad: string
  website: string
  kvk: string
  regels: string[]
}

const GENERIEKE_NAAM = /^(purchase|purchasing|inkoop|verkoop|sales|info|information|administratie|administration|office|support|service|servicedesk|helpdesk|noreply|no-reply|facturen|facturatie|invoices|finance|financien|receptie|reception|secretariaat|planning|orders?|bestellingen|klantenservice|customer\s*service|team|marketing|communicatie|hr|personeelszaken|directie|management|backoffice|frontoffice|webshop|shop|contact|mail|post|algemeen|general)(\s|$)/i
const GROET = /^(met\s+vriendelijke\s+groet(en)?|vriendelijke\s+groet(en)?|hartelijke\s+groet(en)?|groet(en|jes)?|mvg|met\s+vr\.?\s*gr\.?|kind\s+regards|best\s+regards|regards|warm\s+regards|cheers|thanks|bedankt|alvast\s+bedankt|hoogachtend|gr\.?)[\s,.!]*$/i
// Samenstellingen (vestigingsmanager, projectleider) tellen mee; korte woorden
// alleen als los woord, anders matcht "hr" in "Schrijver".
const FUNCTIEWOORDEN = /(?:[\w-]*(?:directeur|director|eigenaar|owner|oprichter|founder|manager|management|teamleider|leider|coördinator|coordinator|adviseur|consultant|specialist|medewerker|medewerkster|assistent|assistant|accountmanager|verkoper|verkoopster|inkoper|buyer|marketeer|planner|uitvoerder|monteur|ontwerper|designer|vormgever|architect|administrateur|boekhouder|controller|secretaresse|receptionist|voorzitter|penningmeester|secretaris|bestuurder|vennoot|franchisenemer|ondersteuning|support|engineer|technicus|calculator|werkvoorbereider)[\w-]*|\b(?:ceo|cfo|coo|cto|hoofd|head\s+of|sales|verkoop|inkoop|marketing|communicatie|partner|office\s+manager|hr|p&o|financieel|facilitair|projectmanager|projectleider)\b)/i
const BEDRIJFSVORM = /\b(b\.?v\.?|n\.?v\.?|v\.?o\.?f\.?|c\.?v\.?|holding|group|groep|bedrijven|bouw|installatie|techniek|service|services|solutions|advies|makelaars?|notaris|advocaten|accountants|architecten|stichting|vereniging|gemeente|b\.?v\.?\s*i\.?o\.?|gmbh|ltd|inc|llc|sa|ag)\b/i
const POSTCODE = /\b(\d{4})\s?([A-Z]{2})\b/
const STRAAT = /^([A-Za-zÀ-ÿ'’.\- ]{3,}?)\s+(\d{1,5}\s?[a-zA-Z]?(?:[-/]\d+[a-zA-Z]?)?)\s*$/
const TEL = /(?:\+31|0031|0)\s?[\s\-–—(.]*(?:\d[\s\-–—).]*){8,9}\d/g
const URL = /\b((?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:nl|com|eu|be|de|org|net|shop|online|io|co\.uk))(?:\/\S*)?\b/i
const KVK = /kvk[\s:.-]*(?:nr|nummer|no)?[\s:.]*(\d{8})/i
const LABEL = /^(t|tel|telefoon|phone|m|mob|mobiel|mobile|gsm|e|email|e-mail|mail|w|web|website|www|a|adres|address|f|fax|i|kvk|btw|vat|iban)\s*[:.|]?\s*/i

function htmlNaarTekst(html: string): string {
  if (typeof DOMParser === 'undefined') return html.replace(/<[^>]+>/g, '\n')
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('style, script, head, blockquote, .gmail_quote, [class*="quote"]').forEach(el => el.remove())
  // Regeleinden behouden waar HTML ze impliceert.
  doc.querySelectorAll('br').forEach(br => br.replaceWith('\n'))
  doc.querySelectorAll('p, div, tr, li, h1, h2, h3, h4, h5, h6, table').forEach(el => { el.append('\n') })
  doc.querySelectorAll('td').forEach(el => { el.append(' ') })
  return (doc.body?.textContent || '').replace(/ /g, ' ')
}

function normaliseerTel(raw: string): string {
  let t = raw.replace(/[^\d+]/g, '')
  if (/^(088|085|0800|0900)/.test(t)) return t.replace(/^(088|085|0800|0900)(\d+)$/, '$1-$2')
  if (t.startsWith('0031')) t = `+31${t.slice(4)}`
  if (t.startsWith('+31')) t = `0${t.slice(3)}`
  if (t.length === 10 && /^0[1-9]\d{8}$/.test(t)) {
    return t.startsWith('06') ? `${t.slice(0, 2)}-${t.slice(2)}` : t.replace(/^(0\d{2,3})(\d+)$/, (_m, a, b) => `${a}-${b}`)
  }
  return raw.trim()
}

function knipHandtekening(tekst: string): string[] {
  const regels = tekst.split(/\r?\n/).map(r => r.replace(/\s+/g, ' ').trim())
  // Antwoord-citaten eraf (alles vanaf "Op ... schreef" of "From:").
  let eind = regels.length
  for (let i = 0; i < regels.length; i++) {
    if (/^(op .{1,80} schreef|van:|from:|-+\s*original message|-+\s*oorspronkelijk bericht|verzonden vanaf mijn|sent from my)/i.test(regels[i])) { eind = i; break }
  }
  const deel = regels.slice(0, eind)
  let start = -1
  for (let i = deel.length - 1; i >= 0; i--) {
    if (GROET.test(deel[i]) || /^--\s*$|^_{3,}$|^-{3,}$/.test(deel[i])) { start = i + 1; break }
  }
  const blok = start >= 0 ? deel.slice(start) : deel.slice(Math.max(0, deel.length - 30))
  return blok.filter(Boolean).slice(0, 30)
}

function kapitaliseerNaam(s: string): string { return s.replace(/\b([a-zà-ÿ])/g, c => c.toUpperCase()) }

export function parseHandtekening(inhoud: string, hint: { naam?: string; email?: string } = {}): HandtekeningGegevens {
  const tekst = /<[a-z][\s\S]*>/i.test(inhoud) ? htmlNaarTekst(inhoud) : inhoud
  const regels = knipHandtekening(tekst)
  const uit: HandtekeningGegevens = { naam: '', functie: '', bedrijfsnaam: '', telefoon: '', mobiel: '', adres: '', postcode: '', stad: '', website: '', kvk: '', regels }

  const domein = (hint.email || '').split('@')[1]?.toLowerCase() || ''
  const domeinKern = domein.replace(/\.(nl|com|eu|be|de|org|net|co\.uk)$/i, '').replace(/[^a-z0-9]/gi, '')
  const gebruikt = new Set<number>()

  regels.forEach((regel, i) => {
    const kvk = regel.match(KVK)
    if (kvk && !uit.kvk) { uit.kvk = kvk[1]; gebruikt.add(i) }
    const tels = regel.match(TEL) || []
    for (const t of tels) {
      const n = normaliseerTel(t)
      if (n.startsWith('06') && !uit.mobiel) uit.mobiel = n
      else if (!n.startsWith('06') && !uit.telefoon) uit.telefoon = n
      gebruikt.add(i)
    }
    const url = regel.match(URL)
    if (url && !uit.website && !/@/.test(url[0])) {
      const host = url[1].replace(/^https?:\/\//i, '')
      if (!/^(linkedin|facebook|instagram|twitter|x|youtube|tiktok)\./i.test(host.replace(/^www\./, ''))) { uit.website = host.startsWith('www.') ? host : `www.${host}`; gebruikt.add(i) }
    }
    const pc = regel.match(POSTCODE)
    if (pc && !uit.postcode) {
      uit.postcode = `${pc[1]} ${pc[2]}`
      const rest = regel.replace(POSTCODE, '').replace(/^[\s,|•·-]+|[\s,|•·-]+$/g, '')
      const stadDeel = rest.split(/[,|•·]/).map(s => s.trim()).filter(Boolean)
      const stad = stadDeel.find(s => !STRAAT.test(s) && !/\d/.test(s)) || stadDeel[stadDeel.length - 1] || ''
      if (stad) uit.stad = kapitaliseerNaam(stad.toLowerCase()) === stad.toUpperCase() ? kapitaliseerNaam(stad.toLowerCase()) : stad
      const straatDeel = stadDeel.find(s => STRAAT.test(s))
      if (straatDeel && !uit.adres) uit.adres = straatDeel
      gebruikt.add(i)
    }
  })

  regels.forEach((regel, i) => {
    if (gebruikt.has(i) || uit.adres) return
    const schoon = regel.replace(LABEL, '').split(/[,|•·]/)[0].trim()
    if (STRAAT.test(schoon) && !/@/.test(schoon)) { uit.adres = schoon; gebruikt.add(i) }
  })

  // Naam: hint uit het From-veld wint; anders de eerste korte regel zonder cijfers.
  // Functionele postvakken ("Purchase", "Info", "Verkoop | Bedrijf") zeggen niets
  // over de persoon; dan wint de naam in de handtekening.
  const hintNaam = (hint.naam || '').replace(/\s*[|–—-]\s*.+$/, '').trim()
  const generiek = !hintNaam || /@/.test(hintNaam) || !/\s/.test(hintNaam) || GENERIEKE_NAAM.test(hintNaam)
  if (!generiek) uit.naam = hintNaam
  const naamIndex = regels.findIndex(r => uit.naam && r.toLowerCase().includes(uit.naam.toLowerCase()))
  if (!uit.naam) {
    const kandidaat = regels.findIndex((r, i) => !gebruikt.has(i) && /^[A-ZÀ-Ý][a-zà-ÿ'’.-]+(\s+(van|de|der|den|het|te|ten|'t|v\.)?\s*[A-ZÀ-Ý]?[a-zà-ÿ'’.-]+){1,3}$/.test(r) && !FUNCTIEWOORDEN.test(r))
    if (kandidaat >= 0) { uit.naam = regels[kandidaat]; gebruikt.add(kandidaat) }
  } else if (naamIndex >= 0) gebruikt.add(naamIndex)

  // Functie: regel met een functiewoord, bij voorkeur direct onder de naam.
  const functieIndex = regels.findIndex((r, i) => !gebruikt.has(i) && FUNCTIEWOORDEN.test(r) && r.length < 60 && !/@|\d{4}/.test(r))
  if (functieIndex >= 0) { uit.functie = regels[functieIndex].replace(/^[|•·-]\s*/, ''); gebruikt.add(functieIndex) }
  // "Naam | Functie | Bedrijf"-regels.
  if (!uit.functie && naamIndex >= 0 && /[|•·]/.test(regels[naamIndex])) {
    const delen = regels[naamIndex].split(/[|•·]/).map(s => s.trim()).filter(Boolean)
    const f = delen.find(d => FUNCTIEWOORDEN.test(d))
    if (f) uit.functie = f
    const b = delen.find(d => d !== f && !d.toLowerCase().includes(uit.naam.toLowerCase()))
    if (b) uit.bedrijfsnaam = b
  }

  // Bedrijfsnaam: regel die op het maildomein lijkt, anders een regel met een bedrijfsvorm.
  if (!uit.bedrijfsnaam) {
    const opDomein = regels.findIndex((r, i) => !gebruikt.has(i) && domeinKern.length >= 4 && r.replace(/[^a-z0-9]/gi, '').toLowerCase().includes(domeinKern) && !/@|www\./i.test(r) && r.length < 60)
    const opVorm = regels.findIndex((r, i) => !gebruikt.has(i) && BEDRIJFSVORM.test(r) && !/@|www\./i.test(r) && r.length < 60)
    const idx = opDomein >= 0 ? opDomein : opVorm
    if (idx >= 0) { uit.bedrijfsnaam = regels[idx].replace(/^[|•·-]\s*/, ''); gebruikt.add(idx) }
  }
  if (!uit.website && domein && !/^(gmail|hotmail|outlook|live|icloud|yahoo|ziggo|kpn|planet|hetnet|xs4all|quicknet|upcmail|casema|home|telfort|online|msn|me|mac|protonmail|proton)\./i.test(domein)) {
    uit.website = `www.${domein}`
  }
  if (!uit.telefoon && uit.mobiel) { /* mobiel blijft apart; telefoonveld van de klant krijgt het vaste nummer */ }
  return uit
}

export function heeftGegevens(g: HandtekeningGegevens): boolean {
  return !!(g.functie || g.bedrijfsnaam || g.telefoon || g.mobiel || g.adres || g.postcode || g.kvk)
}
