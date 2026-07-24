import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Link invoegen in een contentEditable zonder window.prompt. De native dialog
 * steelt de focus waardoor WebKit de tekstselectie laat vallen en createLink
 * daarna niets doet; deze popover bewaart de Range en herstelt die vóór het
 * uitvoeren van het commando. Staat de cursor al in een link, dan bewerk of
 * verwijder je die.
 */

export function normaliseerUrl(invoer: string): string {
  const url = invoer.trim()
  if (!url) return ''
  if (/^(https?:|mailto:|tel:)/i.test(url)) return url
  return `https://${url}`
}

function escapeHtml(tekst: string): string {
  return tekst.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

interface PaneelProps {
  url: string
  onUrlChange: (url: string) => void
  onToepassen: () => void
  onSluiten: () => void
  onVerwijderen?: () => void
  bestaandeLink?: boolean
  richting?: 'boven' | 'onder'
  inputRef?: React.RefObject<HTMLInputElement>
}

/** Het kale paneel, los bruikbaar voor niet-contentEditable hosts (textarea). */
export function LinkPopoverPaneel({ url, onUrlChange, onToepassen, onSluiten, onVerwijderen, bestaandeLink = false, richting = 'boven', inputRef }: PaneelProps) {
  return (
    <div
      className={cn(
        'absolute left-0 z-50 w-[280px] rounded-xl border border-border bg-white dark:bg-card p-3',
        'shadow-[0_8px_28px_rgba(13,52,60,0.16)]',
        richting === 'boven' ? 'bottom-full mb-2' : 'top-full mt-2',
      )}
    >
      <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Link naar
      </label>
      <input
        ref={inputRef}
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); onToepassen() }
          if (e.key === 'Escape') { e.preventDefault(); onSluiten() }
        }}
        placeholder="https://voorbeeld.nl"
        className="mt-1.5 w-full px-2.5 py-1.5 rounded-lg bg-muted/50 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-petrol/30"
      />
      <div className="mt-2.5 flex items-center justify-between gap-2">
        {bestaandeLink && onVerwijderen ? (
          <button
            type="button"
            onClick={onVerwijderen}
            className="text-[12px] text-muted-foreground hover:text-destructive transition-colors duration-150"
          >
            Verwijder link
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onToepassen}
          disabled={!url.trim()}
          className="px-3 py-1.5 rounded-lg bg-flame text-white text-[12px] font-semibold hover:bg-[#D9421C] transition-colors duration-150 disabled:opacity-40"
        >
          {bestaandeLink ? 'Opslaan' : 'Invoegen'}
        </button>
      </div>
    </div>
  )
}

export interface LinkInvoegHandle {
  open: () => void
}

interface LinkInvoegKnopProps {
  editorRef: React.RefObject<HTMLElement | null>
  /** Knopstijl van de host-toolbar, zodat de knop visueel tussen de rest past. */
  className?: string
  iconClassName?: string
  richting?: 'boven' | 'onder'
  /** Na invoegen/verwijderen, voor hosts die hun onChange moeten melden. */
  onIngevoegd?: () => void
}

export const LinkInvoegKnop = forwardRef<LinkInvoegHandle, LinkInvoegKnopProps>(function LinkInvoegKnop(
  { editorRef, className, iconClassName = 'h-4 w-4', richting = 'boven', onIngevoegd },
  ref,
) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [bestaandeLink, setBestaandeLink] = useState(false)
  const rangeRef = useRef<Range | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const openPopover = useCallback(() => {
    const editor = editorRef.current
    const sel = window.getSelection()
    let range: Range | null = null
    if (editor && sel && sel.rangeCount > 0 && editor.contains(sel.anchorNode)) {
      range = sel.getRangeAt(0).cloneRange()
    }
    let href = ''
    if (range && editor) {
      const startEl = range.startContainer instanceof Element
        ? range.startContainer
        : range.startContainer.parentElement
      const anchor = startEl?.closest('a')
      if (anchor && editor.contains(anchor)) {
        href = anchor.getAttribute('href') || ''
        const linkRange = document.createRange()
        linkRange.selectNodeContents(anchor)
        range = linkRange
      }
    }
    rangeRef.current = range
    setBestaandeLink(!!href)
    setUrl(href)
    setOpen(true)
  }, [editorRef])

  useImperativeHandle(ref, () => ({ open: openPopover }), [openPopover])

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => inputRef.current?.focus(), 0)
    const sluitBuiten = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', sluitBuiten)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', sluitBuiten)
    }
  }, [open])

  const herstelSelectie = useCallback(() => {
    editorRef.current?.focus()
    const sel = window.getSelection()
    if (sel && rangeRef.current) {
      sel.removeAllRanges()
      sel.addRange(rangeRef.current)
    }
  }, [editorRef])

  const pasToe = useCallback(() => {
    const schoon = normaliseerUrl(url)
    if (!schoon) return
    setOpen(false)
    herstelSelectie()
    if (!rangeRef.current || rangeRef.current.collapsed) {
      document.execCommand('insertHTML', false, `<a href="${escapeHtml(schoon)}">${escapeHtml(schoon)}</a>`)
    } else {
      document.execCommand('createLink', false, schoon)
    }
    onIngevoegd?.()
  }, [url, herstelSelectie, onIngevoegd])

  const verwijderLink = useCallback(() => {
    setOpen(false)
    herstelSelectie()
    document.execCommand('unlink')
    onIngevoegd?.()
  }, [herstelSelectie, onIngevoegd])

  return (
    <div ref={wrapperRef} className="relative inline-flex">
      <button
        type="button"
        title="Link"
        className={className}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => (open ? setOpen(false) : openPopover())}
      >
        <Link2 className={iconClassName} />
      </button>
      {open && (
        <LinkPopoverPaneel
          url={url}
          onUrlChange={setUrl}
          onToepassen={pasToe}
          onSluiten={() => setOpen(false)}
          onVerwijderen={verwijderLink}
          bestaandeLink={bestaandeLink}
          richting={richting}
          inputRef={inputRef}
        />
      )}
    </div>
  )
})
