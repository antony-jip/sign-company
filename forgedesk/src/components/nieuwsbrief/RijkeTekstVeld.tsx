import { useEffect, useRef, useCallback } from 'react'
import { Bold, Italic, Underline, Link2, List, ListOrdered, RemoveFormatting, UserRound } from 'lucide-react'
import DOMPurify from 'dompurify'
import { cn } from '@/lib/utils'

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  rows?: number
  className?: string
}

const TOEGESTAAN = { ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'ul', 'ol', 'li', 'span', 'div'], ALLOWED_ATTR: ['href', 'target'] }

export function schoonRichText(html: string): string {
  return DOMPurify.sanitize(html, TOEGESTAAN)
    .replace(/<div>/g, '<p>').replace(/<\/div>/g, '</p>')
    .replace(/<p>\s*<br\s*\/?>\s*<\/p>/g, '')
    .replace(/<span>/g, '').replace(/<\/span>/g, '')
}

const KNOP = 'flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'

// Kleine opmaak-editor voor alinea's in de bouwer. Bewust beperkt: vet, cursief,
// onderstreept, link, lijsten en de voornaam-tag. Meer opmaak hoort in de
// blokinstellingen, niet in de tekst zelf.
export function RijkeTekstVeld({ value, onChange, placeholder, rows = 4, className }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const laatsteWaarde = useRef(value)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (value !== laatsteWaarde.current && el.innerHTML !== value) {
      el.innerHTML = value
      laatsteWaarde.current = value
    }
  }, [value])

  useEffect(() => {
    const el = ref.current
    if (el && !el.innerHTML && value) el.innerHTML = value
  }, [])

  const emit = useCallback(() => {
    const el = ref.current
    if (!el) return
    const html = schoonRichText(el.innerHTML)
    laatsteWaarde.current = html
    onChange(html)
  }, [onChange])

  const cmd = useCallback((naam: string, arg?: string) => {
    ref.current?.focus()
    document.execCommand(naam, false, arg)
    emit()
  }, [emit])

  const voegLinkIn = useCallback(() => {
    const sel = window.getSelection()
    const huidig = sel?.anchorNode?.parentElement?.closest('a')?.getAttribute('href') ?? ''
    const url = window.prompt('Link (https://...)', huidig || 'https://')
    if (url === null) return
    if (!url.trim() || url.trim() === 'https://') { cmd('unlink'); return }
    const schoon = /^(https?:|mailto:|tel:)/i.test(url.trim()) ? url.trim() : `https://${url.trim()}`
    cmd('createLink', schoon)
    ref.current?.querySelectorAll('a').forEach(a => a.setAttribute('target', '_blank'))
    emit()
  }, [cmd, emit])

  const voegTagIn = useCallback(() => {
    ref.current?.focus()
    document.execCommand('insertText', false, '{{{contact.first_name|daar}}}')
    emit()
  }, [emit])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const html = e.clipboardData.getData('text/html')
    const tekst = e.clipboardData.getData('text/plain')
    if (html) document.execCommand('insertHTML', false, schoonRichText(html))
    else document.execCommand('insertText', false, tekst)
    emit()
  }, [emit])

  return (
    <div className={cn('overflow-hidden rounded-lg border border-border bg-background focus-within:border-petrol focus-within:ring-2 focus-within:ring-petrol/10 dark:focus-within:border-white/25 dark:focus-within:ring-white/10', className)}>
      <div className="flex items-center gap-0.5 border-b border-border/60 bg-muted/40 px-1.5 py-1">
        <button type="button" title="Vet" className={KNOP} onMouseDown={e => e.preventDefault()} onClick={() => cmd('bold')}><Bold className="h-3.5 w-3.5" /></button>
        <button type="button" title="Cursief" className={KNOP} onMouseDown={e => e.preventDefault()} onClick={() => cmd('italic')}><Italic className="h-3.5 w-3.5" /></button>
        <button type="button" title="Onderstreept" className={KNOP} onMouseDown={e => e.preventDefault()} onClick={() => cmd('underline')}><Underline className="h-3.5 w-3.5" /></button>
        <span className="mx-1 h-4 w-px bg-border" />
        <button type="button" title="Link" className={KNOP} onMouseDown={e => e.preventDefault()} onClick={voegLinkIn}><Link2 className="h-3.5 w-3.5" /></button>
        <button type="button" title="Opsomming" className={KNOP} onMouseDown={e => e.preventDefault()} onClick={() => cmd('insertUnorderedList')}><List className="h-3.5 w-3.5" /></button>
        <button type="button" title="Genummerd" className={KNOP} onMouseDown={e => e.preventDefault()} onClick={() => cmd('insertOrderedList')}><ListOrdered className="h-3.5 w-3.5" /></button>
        <span className="mx-1 h-4 w-px bg-border" />
        <button type="button" title="Voornaam van de ontvanger invoegen" className={cn(KNOP, 'w-auto gap-1 px-1.5 text-[11px] font-semibold text-petrol dark:text-foreground')} onMouseDown={e => e.preventDefault()} onClick={voegTagIn}>
          <UserRound className="h-3.5 w-3.5" /> Voornaam
        </button>
        <button type="button" title="Opmaak wissen" className={cn(KNOP, 'ml-auto')} onMouseDown={e => e.preventDefault()} onClick={() => cmd('removeFormat')}><RemoveFormatting className="h-3.5 w-3.5" /></button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
        onPaste={handlePaste}
        className="nb-richtext px-3 py-2 text-[13px] leading-relaxed text-foreground outline-none [&_a]:text-petrol [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 dark:[&_a]:text-foreground"
        style={{ minHeight: `${rows * 1.6}em` }}
      />
    </div>
  )
}
