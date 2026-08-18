// ============================================================
// EMAIL-CONCEPTEN
//
// De compose-body leeft als innerHTML in een contentEditable en de rest in
// React-state. Bij unmount is alles weg: een mail aanklikken tijdens het
// schrijven kostte je het hele bericht. Deze module bewaart een concept
// buiten React, zodat hij ook aanroepbaar is uit een closure nadat de
// component al verdwenen is (het mislukte-verzending-pad).
//
// Bewust géén React-hook: puur, injecteerbare store, testbaar in de
// node-omgeving van vitest.
// ============================================================

const CONCEPT_PREFIX = 'doen_email_concept_'

// Plafond per concept. Een geplakte schermafdruk wordt als base64 data-URI
// ingevoegd en loopt zo in de megabytes. Bewust NIET via safeSetItem: die
// ruimt bij een volle quota andermans sleutels op (doen_files, doen_ai_chats,
// activiteiten), en een mail typen mag nooit iemands AI-geschiedenis wissen.
const MAX_CONCEPT_BYTES = 512 * 1024

export interface EmailConceptBijlage {
  naam: string
  grootte: number
}

export interface EmailConcept {
  versie: 1
  draftId: string
  to: string
  cc: string
  bcc: string
  showCcBcc: boolean
  subject: string
  /** De body als HTML, exact zoals hij in de editor stond. */
  html: string
  wachtOpReactie: boolean
  /** Alleen namen en groottes: File-bytes passen niet in localStorage. */
  bijlagenNamen: EmailConceptBijlage[]
  /** emails.id zodra het concept ook als rij in de Concepten-map staat. */
  conceptEmailId?: string
  bijgewerkt: number
}

interface StoreOpties {
  store?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>
}

function geefStore(opts?: StoreOpties) {
  if (opts?.store) return opts.store
  if (typeof localStorage === 'undefined') return null
  return localStorage
}

export function conceptSleutel(draftId: string): string {
  return `${CONCEPT_PREFIX}${draftId}`
}

export function leesConcept(draftId: string, opts?: StoreOpties): EmailConcept | null {
  const store = geefStore(opts)
  if (!store || !draftId) return null
  try {
    const ruw = store.getItem(conceptSleutel(draftId))
    if (!ruw) return null
    const concept = JSON.parse(ruw) as EmailConcept
    if (concept?.versie !== 1) return null
    return concept
  } catch {
    return null
  }
}

/**
 * Schrijft het concept weg. No-op als er byte-identiek al hetzelfde staat —
 * dat maakt StrictMode's dubbele mount onschadelijk en scheelt schrijfacties
 * bij elke toetsaanslag-debounce.
 */
export function schrijfConcept(concept: EmailConcept, opts?: StoreOpties): boolean {
  const store = geefStore(opts)
  if (!store || !concept?.draftId) return false
  try {
    const sleutel = conceptSleutel(concept.draftId)
    const nieuw = JSON.stringify(concept)
    const bestaand = store.getItem(sleutel)
    if (bestaand) {
      // bijgewerkt verschilt altijd; vergelijk de inhoud zonder dat veld.
      const a = JSON.stringify({ ...JSON.parse(bestaand), bijgewerkt: 0 })
      const b = JSON.stringify({ ...concept, bijgewerkt: 0 })
      if (a === b) return true
    }
    // Te groot: liever geen concept dan de rest van de opslag opofferen.
    // De tekst blijft gewoon in de editor staan; alleen het vangnet vervalt.
    if (nieuw.length > MAX_CONCEPT_BYTES) return false
    store.setItem(sleutel, nieuw)
    return true
  } catch {
    // Quota vol of storage geblokkeerd: stil falen, niets van een ander wissen.
    return false
  }
}

export function wisConcept(draftId: string, opts?: StoreOpties): void {
  const store = geefStore(opts)
  if (!store || !draftId) return
  try {
    store.removeItem(conceptSleutel(draftId))
  } catch {
    /* no-op */
  }
}

export function alleConcepten(opts?: StoreOpties): EmailConcept[] {
  const store = geefStore(opts)
  if (!store) return []
  const uit: EmailConcept[] = []
  try {
    for (let i = 0; i < store.length; i++) {
      const sleutel = store.key(i)
      if (!sleutel || !sleutel.startsWith(CONCEPT_PREFIX)) continue
      const concept = leesConcept(sleutel.slice(CONCEPT_PREFIX.length), opts)
      if (concept) uit.push(concept)
    }
  } catch {
    return uit
  }
  return uit.sort((a, b) => b.bijgewerkt - a.bijgewerkt)
}

/** Beeld en bijlage-achtige inhoud tellen als inhoud, ook zonder tekst. */
function heeftBeeld(html: string): boolean {
  return /<img\b|<video\b|<table\b/i.test(html)
}

/** Haalt tags weg zodat "alleen een handtekening" als leeg telt. */
function alleenTekst(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Leeg = niets van betekenis ingevuld. De handtekening telt niet mee, want
 * die staat er standaard al in; zonder deze check zou elk geopend
 * compose-venster een concept achterlaten.
 */
export function isLeegConcept(
  concept: Pick<EmailConcept, 'to' | 'cc' | 'bcc' | 'subject' | 'html' | 'bijlagenNamen'>,
  handtekeningHtml = '',
): boolean {
  if (concept.to.trim() || concept.cc.trim() || concept.bcc.trim()) return false
  if (concept.subject.trim()) return false
  if (concept.bijlagenNamen.length > 0) return false

  // Een geplakte schermafdruk zonder tekst is wél een concept; zonder deze
  // check werd die actief gewist omdat alle tags eruit gestript worden.
  if (heeftBeeld(concept.html)) return false

  const body = alleenTekst(concept.html)
  if (!body) return true
  const handtekening = alleenTekst(handtekeningHtml)
  if (handtekening && body === handtekening) return true
  return false
}

/** Ruimt concepten op die ouder zijn dan `maxLeeftijdDagen`. */
export function opschonen(maxLeeftijdDagen = 30, opts?: StoreOpties): number {
  const grens = Date.now() - maxLeeftijdDagen * 24 * 60 * 60 * 1000
  let verwijderd = 0
  for (const concept of alleConcepten(opts)) {
    if (concept.bijgewerkt < grens) {
      wisConcept(concept.draftId, opts)
      verwijderd++
    }
  }
  return verwijderd
}
