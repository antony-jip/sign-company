import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { haalSuggestie, meldGeaccepteerd } from '@/services/suggestieService'
import { useMediaQuery } from '@/hooks/useMediaQuery'

/**
 * Inline schrijfsuggestie: maakt de lopende zin af in grijze tekst achter de
 * cursor, Tab neemt hem over.
 *
 * De suggestie staat bewust NIET in de editor zelf maar in een laagje
 * erboven. Het opstelvenster leest op tien plekken `editorRef.innerHTML` —
 * voor het concept, voor de handtekening, voor het verzenden — en grijze
 * spooktekst in een van die uitlezingen betekent spooktekst in een verzonden
 * mail. Een laagje erboven kan dat per definitie niet.
 */

interface Props {
  editorRef: React.RefObject<HTMLDivElement>
  /** Uit zetten zodra het opstelvenster dicht is of de AI aan het schrijven is. */
  actief: boolean
  onderwerp?: string
  ontvanger?: string
  replyTekst?: string
  schrijfstijl?: string
}

interface Positie {
  left: number
  top: number
  regelhoogte: number
  maxBreedte: number
  fontFamily: string
  fontSize: string
  fontWeight: string
}

const DENKPAUZE_MS = 550
const MIN_TEKENS = 12
/** Elementen die een nieuwe regel beginnen; daarachter kijken we niet meer. */
const REGELEINDES = new Set(['BR', 'DIV', 'P', 'LI', 'UL', 'OL', 'TABLE', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'HR'])

/**
 * De tekst die ná de cursor nog op dezelfde regel staat.
 *
 * Bewust niet "alles na de cursor in de editor": de handtekening staat als
 * broer-element onder de tekst, dus dan zou er onder een mail met
 * handtekening — dat is elke mail — nooit een suggestie komen.
 */
function restVanRegel(editor: HTMLElement, container: Node, offset: number): string {
  let tekst = (container.textContent || '').slice(offset)
  let knoop: Node | null = container
  while (knoop && knoop !== editor) {
    const volgende: Node | null = knoop.nextSibling
    if (!volgende) { knoop = knoop.parentNode; continue }
    if (volgende.nodeType === Node.ELEMENT_NODE && REGELEINDES.has((volgende as Element).tagName)) {
      return tekst
    }
    tekst += volgende.textContent || ''
    knoop = volgende
  }
  return tekst
}

/**
 * De tekst tot aan de cursor, maar alleen als een suggestie hier ook hoort.
 * Geeft null terug bij een selectie, een cursor midden in een zin, of een
 * cursor in het citaat van de beantwoorde mail.
 */
function leesCursor(editor: HTMLDivElement): { voor: string; range: Range } | null {
  const sel = window.getSelection()
  if (!sel || !sel.isCollapsed || sel.rangeCount === 0) return null

  const range = sel.getRangeAt(0)
  if (!editor.contains(range.startContainer)) return null
  // Een cursor in een element in plaats van in tekst betekent een lege regel;
  // daar valt niets af te maken en de positie is er ook niet betrouwbaar.
  if (range.startContainer.nodeType !== Node.TEXT_NODE) return null

  // Niet in het citaat van de originele mail en niet in de handtekening
  // (vrijwel altijd een tabel) meeschrijven.
  let ouder: HTMLElement | null = range.startContainer.parentElement
  while (ouder && ouder !== editor) {
    if (ouder.tagName === 'BLOCKQUOTE' || ouder.tagName === 'TABLE') return null
    ouder = ouder.parentElement
  }

  const voorRange = document.createRange()
  voorRange.selectNodeContents(editor)
  voorRange.setEnd(range.startContainer, range.startOffset)
  const voor = voorRange.toString()

  // Alleen aan het einde van een regel suggereren. Anders komt het laagje
  // bovenop tekst die er al staat.
  if (restVanRegel(editor, range.startContainer, range.startOffset).trim() !== '') return null

  return { voor, range }
}

function leesPositie(editor: HTMLDivElement, range: Range): Positie | null {
  const rect = range.getBoundingClientRect()
  // Een samengevouwen range in een tekstknoop geeft breedte 0 maar wel een
  // hoogte. Is die er niet, dan weten we niet waar de cursor staat.
  if (!rect || rect.height === 0) return null

  const editorRect = editor.getBoundingClientRect()
  const stijl = window.getComputedStyle(editor)
  const maxBreedte = Math.max(60, editorRect.right - rect.left)

  return {
    left: rect.left,
    top: rect.top,
    regelhoogte: rect.height,
    maxBreedte,
    fontFamily: stijl.fontFamily,
    fontSize: stijl.fontSize,
    fontWeight: stijl.fontWeight,
  }
}

export function InlineSuggestie({ editorRef, actief, onderwerp, ontvanger, replyTekst, schrijfstijl }: Props) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [suggestie, setSuggestie] = useState('')
  const [positie, setPositie] = useState<Positie | null>(null)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  // De tekst waarop de zichtbare suggestie slaat. Klopt die niet meer met de
  // cursor, dan is de suggestie verlopen.
  const voorRef = useRef('')
  // Na Escape blijft het stil tot de gebruiker weer iets typt.
  const onderdruktRef = useRef(false)
  const contextRef = useRef({ onderwerp, ontvanger, replyTekst, schrijfstijl })
  useEffect(() => {
    contextRef.current = { onderwerp, ontvanger, replyTekst, schrijfstijl }
  })

  const wis = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    abortRef.current?.abort()
    abortRef.current = null
    voorRef.current = ''
    setSuggestie('')
    setPositie(null)
  }, [])

  const vraagAan = useCallback(async () => {
    const editor = editorRef.current
    if (!editor || onderdruktRef.current) return

    const cursor = leesCursor(editor)
    if (!cursor || cursor.voor.trim().length < MIN_TEKENS) return

    const pos = leesPositie(editor, cursor.range)
    if (!pos) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const ctx = contextRef.current
    const tekst = await haalSuggestie({
      voor: cursor.voor,
      onderwerp: ctx.onderwerp,
      ontvanger: ctx.ontvanger,
      replyTekst: ctx.replyTekst,
      schrijfstijl: ctx.schrijfstijl,
    }, controller.signal)

    if (controller.signal.aborted || !tekst) return

    // De gebruiker kan intussen doorgetypt zijn; dan slaat de suggestie
    // nergens meer op. Opnieuw uitlezen in plaats van de oude positie
    // hergebruiken, want ook de cursor kan verplaatst zijn.
    const nu = leesCursor(editor)
    if (!nu || nu.voor !== cursor.voor) return
    const nuPos = leesPositie(editor, nu.range)
    if (!nuPos) return

    voorRef.current = nu.voor
    setSuggestie(tekst)
    setPositie(nuPos)
  }, [editorRef])

  const plan = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { void vraagAan() }, DENKPAUZE_MS)
  }, [vraagAan])

  const accepteer = useCallback(() => {
    const editor = editorRef.current
    if (!editor || !suggestie) return

    const voor = voorRef.current
    // Zelfde controle als bij het tonen: tussen tonen en Tab kan er van alles
    // gebeurd zijn.
    const cursor = leesCursor(editor)
    if (!cursor || cursor.voor !== voor) { wis(); return }

    editor.focus()
    // execCommand is verouderd maar het enige dat in een contentEditable de
    // ongedaan-maken-geschiedenis heel laat en netjes een input-event vuurt
    // (waar het automatisch opslaan van het concept aan hangt).
    const gelukt = document.execCommand('insertText', false, suggestie)
    if (!gelukt) {
      const sel = window.getSelection()
      const range = sel?.getRangeAt(0)
      if (range) {
        const knoop = document.createTextNode(suggestie)
        range.insertNode(knoop)
        range.setStartAfter(knoop)
        range.collapse(true)
        sel?.removeAllRanges()
        sel?.addRange(range)
      }
      editor.dispatchEvent(new Event('input', { bubbles: true }))
    }

    meldGeaccepteerd(suggestie, { voor, onderwerp: contextRef.current.onderwerp })
    wis()
  }, [editorRef, suggestie, wis])

  // Toetsen en muis op de editor zelf.
  useEffect(() => {
    const editor = editorRef.current
    if (!editor || !actief || !isDesktop) return

    const opToets = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey && suggestie) {
        e.preventDefault()
        e.stopPropagation()
        accepteer()
        return
      }
      if (e.key === 'Escape' && suggestie) {
        e.preventDefault()
        e.stopPropagation()
        onderdruktRef.current = true
        wis()
        return
      }
      // Pijltjes, Enter, Backspace: de suggestie slaat nergens meer op zodra
      // de cursor beweegt. Het input-event plant zelf een nieuwe.
      if (suggestie) wis()
    }

    const opInvoer = () => {
      onderdruktRef.current = false
      wis()
      plan()
    }

    const opKlik = () => wis()
    const opVerlies = () => wis()

    // Capture: het opstelvenster heeft zelf ook een keydown-handler, en Tab
    // mag daar niet als gewone tab-navigatie langskomen.
    editor.addEventListener('keydown', opToets, true)
    editor.addEventListener('input', opInvoer)
    editor.addEventListener('mousedown', opKlik)
    editor.addEventListener('blur', opVerlies)

    return () => {
      editor.removeEventListener('keydown', opToets, true)
      editor.removeEventListener('input', opInvoer)
      editor.removeEventListener('mousedown', opKlik)
      editor.removeEventListener('blur', opVerlies)
    }
  }, [editorRef, actief, isDesktop, suggestie, accepteer, plan, wis])

  // Het laagje staat op vaste viewport-coördinaten, dus bij scrollen of
  // formaatwijziging klopt de plek niet meer.
  useEffect(() => {
    if (!suggestie) return
    const weg = () => wis()
    window.addEventListener('scroll', weg, true)
    window.addEventListener('resize', weg)
    return () => {
      window.removeEventListener('scroll', weg, true)
      window.removeEventListener('resize', weg)
    }
  }, [suggestie, wis])

  useEffect(() => {
    if (!actief) wis()
  }, [actief, wis])

  useEffect(() => wis, [wis])

  if (!suggestie || !positie || !actief || !isDesktop) return null

  // Via een portal naar body: de coördinaten komen uit
  // getBoundingClientRect en zijn dus viewport-coördinaten. Zou het laagje
  // binnen het opstelvenster hangen, dan verschuift één `transform` op een
  // ouder (een dialoog-animatie is genoeg) de hele suggestie.
  return createPortal(
    <span
      aria-hidden
      className="fixed z-[60] pointer-events-none select-none text-muted-foreground/45"
      style={{
        left: positie.left,
        top: positie.top,
        maxWidth: positie.maxBreedte,
        lineHeight: `${positie.regelhoogte}px`,
        fontFamily: positie.fontFamily,
        fontSize: positie.fontSize,
        fontWeight: positie.fontWeight,
        whiteSpace: 'pre-wrap',
      }}
    >
      {suggestie}
      <span className="ml-1.5 px-1 py-px rounded-[4px] border border-border text-[10px] align-middle text-muted-foreground/50">
        tab
      </span>
    </span>,
    document.body
  )
}
