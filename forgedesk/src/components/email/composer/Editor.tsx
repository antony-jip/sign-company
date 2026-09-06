import { forwardRef, useCallback, useImperativeHandle, useLayoutEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { afbeeldingenUitLijst, voegAfbeeldingenIn } from '@/utils/mailAfbeeldingen'

export interface EditorHandle {
  /** HTML op de cursorpositie invoegen (template-tekst, veld, afbeelding). */
  voegHtmlIn: (html: string) => void
  /** Platte tekst op de cursorpositie invoegen. */
  voegTekstIn: (tekst: string) => void
  /** De hele inhoud vervangen, met behoud van de undo-stapel. */
  vervangInhoud: (html: string) => void
  focus: () => void
  leesTekst: () => string
  leesHtml: () => string
}

interface EditorProps {
  /** Alleen bij de eerste mount in de DOM gezet; daarna is de DOM de bron. */
  initieelHtml: string
  onChange: (html: string) => void
  editorRef: React.RefObject<HTMLDivElement>
  placeholder?: string
  className?: string
  minHoogteClass?: string
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void
}

const EDITOR_CLS = 'text-[15px] leading-[1.7] text-foreground outline-none ring-0 break-words min-w-0 max-w-full ' +
  '[&_*]:max-w-full [&_table]:!w-auto [&_td]:whitespace-normal [&_img]:max-w-[320px] [&_img]:h-auto ' +
  '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-0.5 ' +
  '[&_blockquote]:border-l-2 [&_blockquote]:border-petrol/30 [&_blockquote]:pl-3 [&_blockquote]:text-foreground/70 [&_blockquote]:my-1 ' +
  '[&_a]:text-petrol dark:[&_a]:text-[#7FB5BF] [&_a]:underline [&_a]:underline-offset-2 [&_a]:break-words ' +
  'empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/80 empty:before:pointer-events-none'

/**
 * contentEditable met één bron van waarheid: de DOM. React krijgt de HTML
 * via het input-event; innerHTML wordt alleen bij de mount gezet. Alles wat
 * daarna van buiten in de tekst moet (template, veld, beeld) gaat via
 * execCommand, zodat het door dezelfde input-weg loopt en de undo-stapel
 * intact blijft. Zo kan een laat binnenkomende prop nooit getypte tekst
 * overschrijven.
 */
export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { initieelHtml, onChange, editorRef, placeholder = 'Schrijf je bericht...', className, minHoogteClass = 'min-h-[220px]', onKeyDown },
  ref,
) {
  const gezetRef = useRef(false)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useLayoutEffect(() => {
    const el = editorRef.current
    if (!el || gezetRef.current) return
    gezetRef.current = true
    el.innerHTML = initieelHtml
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const meld = useCallback(() => {
    const el = editorRef.current
    if (el) onChangeRef.current(el.innerHTML)
  }, [editorRef])

  /** Cursor in de editor zetten als die er niet al staat (menu's stelen focus). */
  const zorgVoorCursor = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && el.contains(sel.getRangeAt(0).startContainer)) {
      el.focus()
      return
    }
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(false)
    sel?.removeAllRanges()
    sel?.addRange(range)
  }, [editorRef])

  useImperativeHandle(ref, () => ({
    voegHtmlIn: (html) => {
      zorgVoorCursor()
      document.execCommand('insertHTML', false, html)
      meld()
    },
    voegTekstIn: (tekst) => {
      zorgVoorCursor()
      document.execCommand('insertText', false, tekst)
      meld()
    },
    vervangInhoud: (html) => {
      const el = editorRef.current
      if (!el) return
      el.focus()
      const range = document.createRange()
      range.selectNodeContents(el)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
      document.execCommand('insertHTML', false, html || '<br>')
      meld()
    },
    focus: () => zorgVoorCursor(),
    leesTekst: () => editorRef.current?.innerText || '',
    leesHtml: () => editorRef.current?.innerHTML || '',
  }), [editorRef, meld, zorgVoorCursor])

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    const beelden = afbeeldingenUitLijst(e.clipboardData?.items)
    if (beelden.length > 0) {
      e.preventDefault()
      void voegAfbeeldingenIn(editorRef.current, beelden).then(meld)
      return
    }
    // Een geplakte kale URL wordt een klikbare link; staat er tekst
    // geselecteerd, dan wordt die tekst de linktekst.
    const tekst = e.clipboardData?.getData('text/plain')?.trim()
    if (tekst && /^https?:\/\/\S+$/i.test(tekst)) {
      e.preventDefault()
      const url = tekst.replace(/"/g, '%22')
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed) {
        document.execCommand('createLink', false, url)
      } else {
        document.execCommand('insertHTML', false, `<a href="${url}">${url}</a>`)
      }
      meld()
    }
  }, [editorRef, meld])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    const beelden = afbeeldingenUitLijst(e.dataTransfer?.files)
    if (beelden.length === 0) return
    e.preventDefault()
    e.stopPropagation()
    void voegAfbeeldingenIn(editorRef.current, beelden).then(meld)
  }, [editorRef, meld])

  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      data-placeholder={placeholder}
      className={cn(EDITOR_CLS, minHoogteClass, className)}
      style={{ caretColor: '#1A535C', boxShadow: 'none', outline: 'none' }}
      onInput={meld}
      onPaste={handlePaste}
      onDrop={handleDrop}
      onDragOver={(e) => {
        if (afbeeldingenUitLijst(e.dataTransfer?.items).length > 0) e.preventDefault()
      }}
      onKeyDown={onKeyDown}
    />
  )
})
