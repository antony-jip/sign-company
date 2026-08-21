import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { X, Code2, Sparkles, ArrowRight, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NIEUWSBRIEF_TEMPLATES, type NieuwsbriefTemplate } from './nieuwsbriefTemplates'
import { renderDocument } from './nieuwsbriefBlokken'
import { buildPreviewHtml } from './nieuwsbriefShell'
import { NIEUWSBRIEF_BASIS_TEMPLATE } from './nieuwsbriefTemplate'

export type TemplateKeuze =
  | { soort: 'template'; template: NieuwsbriefTemplate }
  | { soort: 'html' }
  | { soort: 'daan' }

interface Props {
  open: boolean
  bezig: boolean
  onKies: (keuze: TemplateKeuze) => void
  onSluit: () => void
}

const MINI_BREEDTE = 620

function Miniatuur({ html, achtergrond }: { html: string; achtergrond: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [schaal, setSchaal] = useState(0.3)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const meet = () => setSchaal(el.clientWidth / MINI_BREEDTE)
    meet()
    const ro = new ResizeObserver(meet)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={ref} className="relative aspect-[4/5] w-full overflow-hidden rounded-t-2xl" style={{ background: achtergrond }}>
      <iframe
        title="Voorbeeld"
        srcDoc={html}
        tabIndex={-1}
        sandbox=""
        scrolling="no"
        className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
        style={{ width: MINI_BREEDTE, height: 2400, transform: `scale(${schaal})` }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/10 to-transparent" />
    </div>
  )
}

export function TemplateKiezer({ open, bezig, onKies, onSluit }: Props) {
  const [gekozen, setGekozen] = useState<string>('nieuwsupdate')

  const miniaturen = useMemo(() => {
    const map = new Map<string, { html: string; achtergrond: string }>()
    for (const t of NIEUWSBRIEF_TEMPLATES) {
      const doc = t.maak()
      map.set(t.key, { html: buildPreviewHtml(renderDocument(doc), doc.stijl), achtergrond: doc.stijl.achtergrond })
    }
    map.set('__html', { html: buildPreviewHtml(NIEUWSBRIEF_BASIS_TEMPLATE), achtergrond: '#F5F4F1' })
    return map
  }, [])

  if (!open) return null

  const actieveTemplate = NIEUWSBRIEF_TEMPLATES.find(t => t.key === gekozen)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={bezig ? undefined : onSluit} />
      <div className="relative flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4 md:px-7">
          <div>
            <h2 className="text-[22px] font-extrabold tracking-[-0.5px] text-foreground">Kies een startpunt<span className="text-flame">.</span></h2>
            <p className="text-[13px] text-muted-foreground">Elke template pas je daarna blok voor blok aan. Daan kan ’m ook voor je schrijven.</p>
          </div>
          <button type="button" onClick={onSluit} disabled={bezig} className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Sluiten">
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-7">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            <button
              type="button"
              onClick={() => onKies({ soort: 'daan' })}
              disabled={bezig}
              className="group flex flex-col overflow-hidden rounded-2xl border-2 border-petrol/30 bg-petrol/[0.04] text-left transition-all hover:-translate-y-[1px] hover:border-petrol hover:shadow-lg dark:border-white/20 dark:bg-white/[0.04]"
            >
              <div className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-3 px-5 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-petrol text-white shadow-lg"><Sparkles className="h-7 w-7" /></span>
                <span className="text-[15px] font-bold text-foreground">Laat Daan schrijven</span>
                <span className="text-[12px] leading-relaxed text-muted-foreground">Geef een korte briefing en foto's. Daan bouwt de hele nieuwsbrief in blokken.</span>
              </div>
              <div className="flex items-center gap-1 border-t border-petrol/20 px-4 py-3 text-[13px] font-semibold text-petrol dark:border-white/15 dark:text-foreground">
                Start met Daan <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>

            {NIEUWSBRIEF_TEMPLATES.map(t => {
              const m = miniaturen.get(t.key)!
              const actief = gekozen === t.key
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setGekozen(t.key)}
                  onDoubleClick={() => onKies({ soort: 'template', template: t })}
                  disabled={bezig}
                  className={cn(
                    'group flex flex-col overflow-hidden rounded-2xl border-2 bg-card text-left transition-all hover:-translate-y-[1px] hover:shadow-lg',
                    actief ? 'border-flame shadow-[0_0_0_3px_rgba(241,80,37,0.15)]' : 'border-border hover:border-petrol/40',
                  )}
                >
                  <Miniatuur html={m.html} achtergrond={m.achtergrond} />
                  <div className="px-4 py-3">
                    <div className="text-[14px] font-bold text-foreground">{t.naam}</div>
                    <div className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">{t.omschrijving}</div>
                  </div>
                </button>
              )
            })}

            <button
              type="button"
              onClick={() => onKies({ soort: 'html' })}
              disabled={bezig}
              className="group flex flex-col overflow-hidden rounded-2xl border-2 border-border bg-card text-left transition-all hover:-translate-y-[1px] hover:border-petrol/40 hover:shadow-lg"
            >
              <Miniatuur html={miniaturen.get('__html')!.html} achtergrond="#F5F4F1" />
              <div className="px-4 py-3">
                <div className="flex items-center gap-1.5 text-[14px] font-bold text-foreground"><Code2 className="h-4 w-4 text-petrol" /> Eigen HTML</div>
                <div className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">Voor wie zelf codeert. Codevenster met live preview.</div>
              </div>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-border px-5 py-4 md:px-7">
          <div className="min-w-0 text-[13px] text-muted-foreground">
            {actieveTemplate ? <><span className="font-semibold text-foreground">{actieveTemplate.naam}</span> · {actieveTemplate.omschrijving}</> : 'Kies een template'}
          </div>
          <button
            type="button"
            disabled={!actieveTemplate || bezig}
            onClick={() => actieveTemplate && onKies({ soort: 'template', template: actieveTemplate })}
            className="ml-auto inline-flex flex-shrink-0 items-center gap-2 rounded-xl bg-flame px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(241,80,37,0.25)] transition-all hover:-translate-y-[1px] hover:bg-[#E04520] disabled:opacity-60"
          >
            {bezig ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Gebruik deze template
          </button>
        </div>
      </div>
    </div>
  )
}
