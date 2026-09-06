import { forwardRef, useEffect, useState } from 'react'
import { Bold, Italic, Underline, List, ListOrdered, Paperclip, TextQuote } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LinkInvoegKnop, type LinkInvoegHandle } from '@/components/shared/LinkInvoegKnop'

interface WerkbalkProps {
  editorRef: React.RefObject<HTMLDivElement>
  onGewijzigd: () => void
  onBijlage: () => void
  className?: string
}

const knopCls = 'h-10 w-10 md:h-8 md:w-8 flex-shrink-0 flex items-center justify-center rounded-[9px] transition-colors duration-150'
const rustCls = 'text-muted-foreground hover:text-foreground hover:bg-petrol/[0.06]'
const actiefCls = 'text-petrol bg-petrol/10'

interface OpmaakStand { bold: boolean; italic: boolean; underline: boolean; ul: boolean; ol: boolean; citaat: boolean }
const LEEG: OpmaakStand = { bold: false, italic: false, underline: false, ul: false, ol: false, citaat: false }

function leesStand(): OpmaakStand {
  try {
    return {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      ul: document.queryCommandState('insertUnorderedList'),
      ol: document.queryCommandState('insertOrderedList'),
      citaat: String(document.queryCommandValue('formatBlock')).toLowerCase() === 'blockquote',
    }
  } catch {
    return LEEG
  }
}

/**
 * Opmaakbalk voor de editor. mousedown-preventDefault op elke knop: anders
 * verliest WebKit de tekstselectie zodra de knop focus pakt en doet het
 * commando niets. Op mobiel schuiven de knoppen zijwaarts weg in plaats van
 * naar een tweede regel, die viel achter het toetsenbord.
 */
export const Werkbalk = forwardRef<LinkInvoegHandle, WerkbalkProps>(function Werkbalk(
  { editorRef, onGewijzigd, onBijlage, className },
  linkRef,
) {
  const [stand, setStand] = useState<OpmaakStand>(LEEG)

  useEffect(() => {
    const bijwerken = () => {
      const sel = window.getSelection()
      if (!sel || !sel.anchorNode || !editorRef.current?.contains(sel.anchorNode)) return
      setStand(leesStand())
    }
    document.addEventListener('selectionchange', bijwerken)
    return () => document.removeEventListener('selectionchange', bijwerken)
  }, [editorRef])

  const voerUit = (commando: string, waarde?: string) => {
    editorRef.current?.focus()
    document.execCommand(commando, false, waarde)
    setStand(leesStand())
    onGewijzigd()
  }

  const knoppen: { titel: string; actief: boolean; icoon: React.ReactNode; klik: () => void }[] = [
    { titel: 'Vet', actief: stand.bold, icoon: <Bold className="h-4 w-4" />, klik: () => voerUit('bold') },
    { titel: 'Cursief', actief: stand.italic, icoon: <Italic className="h-4 w-4" />, klik: () => voerUit('italic') },
    { titel: 'Onderstrepen', actief: stand.underline, icoon: <Underline className="h-4 w-4" />, klik: () => voerUit('underline') },
  ]
  const lijsten: typeof knoppen = [
    { titel: 'Lijst', actief: stand.ul, icoon: <List className="h-4 w-4" />, klik: () => voerUit('insertUnorderedList') },
    { titel: 'Genummerde lijst', actief: stand.ol, icoon: <ListOrdered className="h-4 w-4" />, klik: () => voerUit('insertOrderedList') },
    { titel: 'Citaat', actief: stand.citaat, icoon: <TextQuote className="h-4 w-4" />, klik: () => voerUit('formatBlock', stand.citaat ? 'div' : 'blockquote') },
  ]

  const render = (k: typeof knoppen[number]) => (
    <button
      key={k.titel}
      type="button"
      title={k.titel}
      className={cn(knopCls, k.actief ? actiefCls : rustCls)}
      onMouseDown={(e) => e.preventDefault()}
      onClick={k.klik}
    >
      {k.icoon}
    </button>
  )

  return (
    <div className={cn('flex items-center gap-0.5 min-w-0 overflow-x-auto scrollbar-hide md:overflow-visible', className)}>
      {knoppen.map(render)}
      <div className="w-px h-4 bg-border mx-1 flex-shrink-0" />
      {lijsten.map(render)}
      <div className="w-px h-4 bg-border mx-1 flex-shrink-0" />
      <LinkInvoegKnop ref={linkRef} editorRef={editorRef} className={cn(knopCls, rustCls)} onIngevoegd={onGewijzigd} />
      <button
        type="button"
        title="Bijlage"
        className={cn(knopCls, rustCls)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onBijlage}
      >
        <Paperclip className="h-4 w-4" />
      </button>
    </div>
  )
})
