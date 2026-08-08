import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Smartphone, ChevronUp, ChevronDown, X, Plus, MoreHorizontal, MessageSquare, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { logger } from '@/utils/logger'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import {
  MOBIELE_NAV_LABELS, MOBIELE_NAV_MAX, MOBIELE_MENU_KANDIDATEN, mobieleMenuItems,
} from '@/lib/navigatie'

/**
 * Instelblok voor de mobiele bottom-nav. Bewust zonder opslaan-knop: dit
 * bedien je met je duim op het toestel waar het effect direct zichtbaar is,
 * en een tik die niet meteen telt voelt daar kapot.
 */
export function MobielMenuInstelling() {
  const { settings, updateSettings, forgieEnabled } = useAppSettings()
  const opgeslagen = settings.mobiel_menu_items
  const [labels, setLabels] = useState<string[]>(() => mobieleMenuItems(opgeslagen).map((i) => i.label))
  const [bezig, setBezig] = useState(false)

  useEffect(() => {
    setLabels(mobieleMenuItems(opgeslagen).map((i) => i.label))
  }, [opgeslagen])

  const gekozen = useMemo(() => mobieleMenuItems(labels), [labels])
  const beschikbaar = useMemo(
    () => MOBIELE_MENU_KANDIDATEN.filter((i) => !labels.includes(i.label)),
    [labels],
  )

  // Dezelfde verdeling als MobileTabBar: Daan en Meer nemen elk een vakje,
  // en Daan alleen als hij aanstaat.
  const inBalk = forgieEnabled ? MOBIELE_NAV_MAX : MOBIELE_NAV_MAX + 1

  const bewaar = async (next: string[]) => {
    const vorige = labels
    setLabels(next)
    setBezig(true)
    try {
      await updateSettings({ mobiel_menu_items: next })
    } catch (err) {
      logger.error(err)
      setLabels(vorige)
      toast.error('Kon mobiel menu niet opslaan')
    } finally {
      setBezig(false)
    }
  }

  const verplaats = (index: number, richting: -1 | 1) => {
    const doel = index + richting
    if (doel < 0 || doel >= labels.length) return
    const next = [...labels]
    ;[next[index], next[doel]] = [next[doel], next[index]]
    void bewaar(next)
  }

  return (
    <Card className="doen-slate-surface border-0 shadow-none rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          Mobiel menu
        </CardTitle>
        <CardDescription>
          De balk onderaan je telefoon. De eerste {inBalk} staan er los in, de rest komt
          onder Meer{forgieEnabled ? '; Daan heeft een vast vakje' : ''}. Los van je
          zijbalk-keuze.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Voorbeeld van de balk zoals hij op het toestel komt */}
        <div className="rounded-2xl border border-[rgba(26,83,92,0.12)] bg-card p-2 max-w-[340px]">
          <div className="flex items-stretch">
            {gekozen.slice(0, inBalk).map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 py-2 px-0.5">
                  <Icon className="w-[19px] h-[19px]" style={{ color: item.color }} />
                  <span className="text-[9px] font-semibold text-foreground/70 leading-none truncate max-w-full">
                    {item.label}
                  </span>
                </div>
              )
            })}
            {forgieEnabled && (
              <div className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 py-2 px-0.5">
                <span
                  className="w-[22px] h-[22px] rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #1A535C 0%, #2A6B75 100%)' }}
                >
                  <MessageSquare className="w-[13px] h-[13px] text-white" />
                </span>
                <span className="text-[9px] font-semibold text-foreground/70 leading-none">Daan</span>
              </div>
            )}
            <div className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 py-2 px-0.5">
              <MoreHorizontal className="w-[19px] h-[19px] text-muted-foreground" />
              <span className="text-[9px] font-semibold text-foreground/70 leading-none">Meer</span>
            </div>
          </div>
        </div>

        {/* Volgorde · bepaalt wat in de balk past en wat doorschuift */}
        <div className="space-y-1">
          {gekozen.map((item, index) => {
            const Icon = item.icon
            const valtOnderMeer = index >= inBalk
            return (
              <div
                key={item.label}
                className={cn(
                  'flex items-center gap-2 rounded-xl border border-[rgba(26,83,92,0.12)] bg-card px-2.5 py-2',
                  valtOnderMeer && 'opacity-60',
                )}
              >
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${item.color}18` }}
                >
                  <Icon className="w-4 h-4" style={{ color: item.color }} />
                </span>
                <span className="text-[13px] font-medium text-foreground flex-1 min-w-0 truncate">
                  {item.label}
                  {valtOnderMeer && (
                    <span className="ml-2 text-[11px] font-normal text-muted-foreground">onder Meer</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => verplaats(index, -1)}
                  disabled={index === 0 || bezig}
                  aria-label={`${item.label} omhoog`}
                  className="tap-press w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-30 transition-colors"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => verplaats(index, 1)}
                  disabled={index === gekozen.length - 1 || bezig}
                  aria-label={`${item.label} omlaag`}
                  className="tap-press w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-30 transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void bewaar(labels.filter((l) => l !== item.label))}
                  disabled={bezig}
                  aria-label={`${item.label} uit je menu halen`}
                  className="tap-press w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-flame hover:bg-flame/[0.07] disabled:opacity-30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>

        {beschikbaar.length > 0 && (
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-widest text-foreground/70 mb-2.5">
              Toevoegen
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {beschikbaar.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  disabled={bezig}
                  onClick={() => void bewaar([...labels, item.label])}
                  className="tap-press inline-flex items-center gap-1.5 pl-2.5 pr-3 py-2 rounded-lg text-[13px] font-medium bg-transparent text-muted-foreground border border-dashed border-[rgba(26,83,92,0.18)] hover:text-foreground hover:bg-card/60 disabled:opacity-40 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-[rgba(26,83,92,0.08)]">
          <span className="doen-subtitel">
            alles blijft bereikbaar via Meer<span className="text-flame">.</span>
          </span>
          <button
            type="button"
            disabled={bezig}
            onClick={() => void bewaar([...MOBIELE_NAV_LABELS])}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-petrol hover:text-[#0F3D44] hover:underline disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Standaard
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
