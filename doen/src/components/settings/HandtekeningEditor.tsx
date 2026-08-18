import { useEffect, useRef, useState } from 'react'
import {
  Bold, Italic, Underline,  List, Image as ImageIcon,
  Palette, Type, Undo2, Eraser,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { LinkInvoegKnop } from '@/components/shared/LinkInvoegKnop'
import { handtekeningNaarHtml, bevatOpmaak } from '@/utils/handtekening'

interface Props {
  waarde: string
  onChange: (html: string) => void
}

const KLEUREN = [
  { naam: 'Zwart', hex: '#1A1A1A' },
  { naam: 'Grijs', hex: '#6B6B66' },
  { naam: 'Petrol', hex: '#1A535C' },
  { naam: 'Flame', hex: '#F15025' },
  { naam: 'Blauw', hex: '#3A5A9A' },
  { naam: 'Groen', hex: '#3A7D52' },
]

const GROOTTES = [
  { label: 'Klein', waarde: '2' },
  { label: 'Normaal', waarde: '3' },
  { label: 'Groot', waarde: '5' },
]

function Knop({
  actief, titel, onClick, children,
}: {
  actief?: boolean
  titel: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={titel}
      aria-label={titel}
      // onMouseDown i.p.v. onClick: anders verliest de editor zijn selectie
      // voordat het commando wordt uitgevoerd.
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className={cn(
        'h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors',
        actief
          ? 'bg-petrol/10 text-petrol'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  )
}

/**
 * Handtekening-editor met opmaak, in de geest van Outlook: je typt wat de
 * ontvanger straks ziet. De waarde is HTML; oude platte-tekst handtekeningen
 * worden bij het openen omgezet zodat niemand zijn handtekening kwijtraakt.
 */
export function HandtekeningEditor({ waarde, onChange }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [kleurOpen, setKleurOpen] = useState(false)
  const [grootteOpen, setGrootteOpen] = useState(false)
  const [actief, setActief] = useState<Record<string, boolean>>({})
  const geinitialiseerdRef = useRef(false)

  // Alleen bij de eerste vulling schrijven: daarna is de DOM de bron van
  // waarheid, anders springt de cursor bij elke toetsaanslag naar het einde.
  useEffect(() => {
    if (geinitialiseerdRef.current || !editorRef.current) return
    if (waarde === undefined || waarde === null) return
    editorRef.current.innerHTML = bevatOpmaak(waarde)
      ? waarde
      : handtekeningNaarHtml(waarde)
    geinitialiseerdRef.current = true
  }, [waarde])

  const meld = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML)
  }

  const voerUit = (commando: string, arg?: string) => {
    editorRef.current?.focus()
    document.execCommand(commando, false, arg)
    meld()
    ververActief()
  }

  const ververActief = () => {
    try {
      setActief({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
      })
    } catch { /* queryCommandState kan in sommige browsers gooien */ }
  }

  const voegAfbeeldingToe = () => {
    const invoer = document.createElement('input')
    invoer.type = 'file'
    invoer.accept = 'image/*'
    invoer.onchange = () => {
      const bestand = invoer.files?.[0]
      if (!bestand) return
      if (bestand.size > 500 * 1024) {
        window.alert('Kies een afbeelding kleiner dan 500 kB, anders wordt je mail zwaar.')
        return
      }
      const lezer = new FileReader()
      lezer.onload = () => {
        const dataUrl = lezer.result
        if (typeof dataUrl !== 'string') return
        editorRef.current?.focus()
        document.execCommand(
          'insertHTML', false,
          `<img src="${dataUrl}" alt="" style="max-width: 220px; max-height: 90px;" />`,
        )
        meld()
      }
      lezer.readAsDataURL(bestand)
    }
    invoer.click()
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <div className="flex items-center gap-0.5 flex-wrap px-2 py-1.5 border-b border-border bg-background/60">
          <Knop titel="Vet" actief={actief.bold} onClick={() => voerUit('bold')}>
            <Bold className="h-4 w-4" />
          </Knop>
          <Knop titel="Cursief" actief={actief.italic} onClick={() => voerUit('italic')}>
            <Italic className="h-4 w-4" />
          </Knop>
          <Knop titel="Onderstrepen" actief={actief.underline} onClick={() => voerUit('underline')}>
            <Underline className="h-4 w-4" />
          </Knop>

          <span className="w-px h-5 bg-border mx-1" />

          <div className="relative">
            <Knop titel="Tekstgrootte" onClick={() => { setGrootteOpen(v => !v); setKleurOpen(false) }}>
              <Type className="h-4 w-4" />
            </Knop>
            {grootteOpen && (
              <div className="absolute z-20 mt-1 left-0 rounded-lg border border-border bg-popover shadow-lg py-1 w-32">
                {GROOTTES.map(g => (
                  <button
                    key={g.waarde}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); voerUit('fontSize', g.waarde); setGrootteOpen(false) }}
                    className="w-full text-left px-3 py-1.5 text-[13px] hover:bg-muted"
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <Knop titel="Tekstkleur" onClick={() => { setKleurOpen(v => !v); setGrootteOpen(false) }}>
              <Palette className="h-4 w-4" />
            </Knop>
            {kleurOpen && (
              <div className="absolute z-20 mt-1 left-0 rounded-lg border border-border bg-popover shadow-lg p-2 grid grid-cols-3 gap-1.5">
                {KLEUREN.map(k => (
                  <button
                    key={k.hex}
                    type="button"
                    title={k.naam}
                    onMouseDown={(e) => { e.preventDefault(); voerUit('foreColor', k.hex); setKleurOpen(false) }}
                    className="w-6 h-6 rounded-md border border-border"
                    style={{ backgroundColor: k.hex }}
                  />
                ))}
              </div>
            )}
          </div>

          <span className="w-px h-5 bg-border mx-1" />

          <Knop titel="Opsomming" onClick={() => voerUit('insertUnorderedList')}>
            <List className="h-4 w-4" />
          </Knop>
          <LinkInvoegKnop
            editorRef={editorRef}
            richting="onder"
            onIngevoegd={meld}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
          />
          <Knop titel="Afbeelding invoegen" onClick={voegAfbeeldingToe}>
            <ImageIcon className="h-4 w-4" />
          </Knop>

          <span className="flex-1" />

          <Knop titel="Opmaak wissen" onClick={() => voerUit('removeFormat')}>
            <Eraser className="h-4 w-4" />
          </Knop>
          <Knop titel="Ongedaan maken" onClick={() => voerUit('undo')}>
            <Undo2 className="h-4 w-4" />
          </Knop>
        </div>

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={meld}
          onBlur={meld}
          onKeyUp={ververActief}
          onMouseUp={ververActief}
          // Plakken zonder meegesleepte opmaak van de bron.
          onPaste={(e) => {
            e.preventDefault()
            const tekst = e.clipboardData.getData('text/plain')
            document.execCommand('insertText', false, tekst)
            meld()
          }}
          data-placeholder="Met vriendelijke groet, Jan de Vries · Sign Company"
          className="min-h-[150px] max-h-[320px] overflow-y-auto px-4 py-3 text-[14px] leading-[1.55] text-foreground focus:outline-none [&_a]:text-petrol [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_img]:inline-block"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Wat je hier ziet, ziet je klant ook. Plakken neemt geen opmaak van de bron mee.
      </p>
    </div>
  )
}
