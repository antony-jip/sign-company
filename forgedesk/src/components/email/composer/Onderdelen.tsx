import { useEffect, useMemo, useState } from 'react'
import { Paperclip, X, Forward, AlertCircle, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { sanitizeEmailHTML } from '@/lib/sanitize'
import { splitsBijlagen } from '@/utils/groteBijlagen'
import type { ComposerBijlage } from '@/lib/mail/types'
import { bestandSleutel } from './document'

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function bestandExt(naam: string): string {
  return (naam.split('.').pop() || 'FILE').toUpperCase().substring(0, 4)
}

function extKleur(naam: string): string {
  switch (naam.split('.').pop()?.toLowerCase()) {
    case 'pdf': return 'bg-[#C0451A]'
    case 'doc': case 'docx': return 'bg-[#3A6B8C]'
    case 'xls': case 'xlsx': return 'bg-[#2D6B48]'
    case 'png': case 'jpg': case 'jpeg': case 'gif': case 'svg': case 'webp': return 'bg-petrol'
    default: return 'bg-[#9B9B95]'
  }
}

/** Portret-vorm met gevouwen hoek: leest direct als "bestand". */
function BestandGlyph({ naam }: { naam: string }) {
  return (
    <div className={cn('relative w-6 h-8 rounded-[4px] flex items-end justify-center pb-0.5 flex-shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.14)]', extKleur(naam))}>
      <span className="absolute top-0 right-0 w-2 h-2 bg-white/25" style={{ clipPath: 'polygon(0 0, 100% 100%, 100% 0)' }} />
      <span className="text-[6px] font-bold text-white tracking-[0.04em] leading-none">{bestandExt(naam)}</span>
    </div>
  )
}

interface BijlagenLijstProps {
  bijlagen: ComposerBijlage[]
  bestanden: Map<string, File>
  onVerwijder: (index: number) => void
}

export function BijlagenLijst({ bijlagen, bestanden, onVerwijder }: BijlagenLijstProps) {
  const files = useMemo(
    () => bijlagen.map((b) => (b.bron === 'upload' ? bestanden.get(bestandSleutel(b.naam, b.grootte)) : undefined)),
    [bijlagen, bestanden],
  )
  const viaLink = useMemo(() => new Set(splitsBijlagen(files.filter((f): f is File => !!f)).viaLink), [files])
  const previews = useMemo(() => {
    const map = new Map<File, string>()
    for (const f of files) if (f && f.type.startsWith('image/')) map.set(f, URL.createObjectURL(f))
    return map
  }, [files])
  useEffect(() => () => { previews.forEach((url) => URL.revokeObjectURL(url)) }, [previews])

  if (bijlagen.length === 0) return null
  const totaal = bijlagen.reduce((s, b) => s + b.grootte, 0)

  return (
    <div className="mt-3">
      <div className="flex items-center gap-1.5 mb-2 text-muted-foreground">
        <Paperclip className="h-3.5 w-3.5" />
        <span className="text-[12px] font-medium">
          {bijlagen.length} {bijlagen.length === 1 ? 'bijlage' : 'bijlagen'}
          <span className="text-muted-foreground/60 font-mono"> · {formatBytes(totaal)}</span>
          {viaLink.size > 0 && <span className="text-petrol"> · {viaLink.size} via downloadlink</span>}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {bijlagen.map((b, i) => {
          const file = files[i]
          const ontbreekt = b.bron === 'upload' && !file
          const preview = file ? previews.get(file) : undefined
          return (
            <div
              key={`${b.naam}-${i}`}
              title={ontbreekt ? 'Bestand niet meer beschikbaar: voeg het opnieuw toe' : b.naam}
              className={cn(
                'group relative flex items-center gap-2 w-[212px] pl-2 pr-1.5 py-1.5 rounded-xl bg-card ring-1 transition-all duration-150',
                ontbreekt ? 'ring-[#C0451A]/30 bg-[#FDE8E4]/60' : b.bron === 'origineel' ? 'ring-petrol/20' : 'ring-black/[0.05] hover:ring-petrol/20',
              )}
            >
              {preview ? (
                <img src={preview} alt={b.naam} className="w-6 h-8 rounded-[4px] object-cover flex-shrink-0 ring-1 ring-black/5" />
              ) : ontbreekt ? (
                <AlertCircle className="h-5 w-5 text-[#C0451A] flex-shrink-0" />
              ) : (
                <BestandGlyph naam={b.naam} />
              )}
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-foreground text-[12.5px] font-medium leading-tight truncate">{b.naam}</span>
                <span className="text-muted-foreground text-[11px] leading-tight mt-0.5 font-mono tabular-nums flex items-center gap-1">
                  {formatBytes(b.grootte)}
                  {b.bron === 'origineel' && <Forward className="h-3 w-3 text-petrol" />}
                  {file && viaLink.has(file) && <span className="text-petrol font-sans">· via link</span>}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onVerwijder(i)}
                className="h-6 w-6 flex items-center justify-center rounded-lg text-muted-foreground/70 md:opacity-0 group-hover:opacity-100 hover:bg-flame/10 hover:text-flame transition-all duration-150 flex-shrink-0"
                title="Bijlage verwijderen"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface CitaatBlokProps {
  citaat: string
  onVerwijder: () => void
}

/**
 * De geciteerde bronmail: standaard ingeklapt achter een "..."-knop zoals
 * in Gmail, alleen-lezen. Hij gaat altijd mee in de verzonden mail.
 */
export function CitaatBlok({ citaat, onVerwijder }: CitaatBlokProps) {
  const [open, setOpen] = useState(false)
  const schoon = useMemo(() => (open ? sanitizeEmailHTML(citaat) : ''), [open, citaat])
  if (!citaat) return null
  return (
    <div className="mt-3">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Geciteerde tekst tonen"
          className="inline-flex items-center justify-center h-5 px-2.5 rounded-full bg-[#EBEBEB] dark:bg-white/10 text-foreground/60 hover:text-foreground hover:bg-[#E0E0E0] dark:hover:bg-white/15 transition-colors text-[13px] leading-none tracking-[0.15em] font-semibold"
        >
          ···
        </button>
      ) : (
        <div className="rounded-xl bg-muted/40 px-3.5 py-3">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className="h-3 w-3 rotate-180" />
              Citaat verbergen
            </button>
            <button
              type="button"
              onClick={onVerwijder}
              className="text-[11px] text-muted-foreground hover:text-[#C0451A] transition-colors"
            >
              Citaat verwijderen
            </button>
          </div>
          <div
            className="text-[13px] leading-[1.6] text-foreground/70 break-words min-w-0 max-w-full [&_*]:max-w-full [&_table]:!w-auto [&_img]:h-auto [&_a]:text-petrol [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: schoon }}
          />
        </div>
      )}
    </div>
  )
}
