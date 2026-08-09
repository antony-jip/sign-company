import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MailPlus, Archive } from 'lucide-react'
import { toast } from 'sonner'
import { useDashboardData } from '@/contexts/DashboardDataContext'
import { updateOfferte } from '@/services/supabaseService'
import { logger } from '@/utils/logger'
import { formatCurrency } from '@/lib/utils'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'

/** Vanaf hier is opvolgen niet meer de vraag; afsluiten is het. */
const KANSLOOS_NA_DAGEN = 60

interface OpvolgenItem {
  id: string
  klantNaam: string
  nummer: string
  bedrag: number
  dagen: number
}

function daysSince(dateStr: string): number {
  const sent = new Date(dateStr).getTime()
  if (Number.isNaN(sent)) return 0
  const diff = Date.now() - sent
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

export function OpvolgenBlok() {
  const navigate = useNavigate()
  const { offertes, refresh } = useDashboardData()
  const [afgeslotenIds, setAfgeslotenIds] = useState<Set<string>>(new Set())

  const items = useMemo<OpvolgenItem[]>(() => {
    const openStatussen = new Set(['verzonden', 'bekeken', 'wijziging_gevraagd'])
    return offertes
      .filter(o => openStatussen.has(o.status) && o.verstuurd_op)
      .map(o => ({
        id: o.id,
        klantNaam: o.klant_naam || 'Klant',
        nummer: o.nummer,
        bedrag: o.subtotaal || 0,
        dagen: daysSince(o.verstuurd_op as string),
      }))
      .filter(o => !afgeslotenIds.has(o.id))
      .sort((a, b) => b.dagen - a.dagen)
      .slice(0, 5)
  }, [offertes, afgeslotenIds])

  const totaalBedrag = useMemo(() => items.reduce((s, i) => s + i.bedrag, 0), [items])

  // Afsluiten gaat via de bestaande 'afgewezen'-status. Rij verdwijnt meteen,
  // undo binnen de toast zet de oude status terug.
  const handleAfsluiten = async (item: OpvolgenItem) => {
    const vorigeStatus = offertes.find(o => o.id === item.id)?.status
    if (!vorigeStatus) return
    setAfgeslotenIds(prev => new Set(prev).add(item.id))
    try {
      await updateOfferte(item.id, { status: 'afgewezen' })
      toast.success(`${item.nummer} afgesloten`, {
        action: {
          label: 'Ongedaan',
          onClick: () => {
            void (async () => {
              try {
                await updateOfferte(item.id, { status: vorigeStatus })
                setAfgeslotenIds(prev => {
                  const next = new Set(prev)
                  next.delete(item.id)
                  return next
                })
                refresh()
              } catch (err) {
                logger.error('Terugzetten offertestatus mislukt:', err)
                toast.error('Kon niet terugzetten')
              }
            })()
          },
        },
      })
      refresh()
    } catch (err) {
      logger.error('Offerte afsluiten mislukt:', err)
      setAfgeslotenIds(prev => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
      toast.error('Kon offerte niet afsluiten')
    }
  }

  return (
    <section className="doen-panel doen-wash rounded-xl p-6 sm:p-7 h-full flex flex-col">
      {/* Één bijzin naast de kop, niet twee: in deze kolombreedte werd de
          subtitel anders tot "w.." gekapt. Staat er geld in de pijplijn, dan
          is dat bedrag de informatievere bijzin. */}
      <header className="flex items-baseline justify-between gap-3 mb-5">
        <h2 className="font-heading text-[14px] font-bold text-foreground whitespace-nowrap">
          Opvolgen<span className="text-flame">.</span>
        </h2>
        {items.length > 0 ? (
          <span className="font-mono text-[12px] tabular-nums text-muted-foreground flex-shrink-0">
            {formatCurrency(totaalBedrag)} in de pijplijn
          </span>
        ) : (
          <span className="doen-subtitel truncate">
            wacht op antwoord<span className="text-flame">.</span>
          </span>
        )}
      </header>

      {items.length === 0 ? (
        offertes.length === 0 ? (
          <div className="py-2">
            <p className="doen-subtitel">
              Hier volg je offertes die op antwoord wachten<span className="text-flame">.</span>
            </p>
            <button
              type="button"
              onClick={() => navigate('/offertes/nieuw')}
              className="mt-1.5 text-sm text-flame hover:underline focus-visible:outline-none focus-visible:underline"
            >
              Maak je eerste offerte →
            </button>
          </div>
        ) : (
          <p
            className="doen-subtitel py-2"
          >
            Geen offertes wachten op reactie<span className="text-flame">.</span>
          </p>
        )
      ) : (
        <ul className="divide-y divide-border/60">
          {items.map(item => {
            const kansloos = item.dagen >= KANSLOOS_NA_DAGEN
            const urgent = item.dagen >= 15
            const ageClass = kansloos
              ? 'text-[#C03A18] font-medium'
              : urgent
                ? 'text-foreground font-medium'
                : 'text-muted-foreground'

            return (
              <li key={item.id} className="group relative flex items-center">
                {/* Naam en bedrag boven elkaar met nummer en ouderdom, zodat de
                    klantnaam de volle breedte krijgt in plaats van te vechten
                    met twee vaste getalkolommen. */}
                <button
                  type="button"
                  onClick={() => navigate(`/offertes/${item.id}`)}
                  className="flex-1 min-w-0 flex items-center py-2.5 pl-2 -ml-2 rounded-l-lg group-hover:bg-background transition-colors text-left focus-visible:outline-none focus-visible:bg-background"
                >
                  <span className="flex-1 min-w-0">
                    <span className="flex items-baseline gap-2">
                      <span className="flex-1 min-w-0 text-sm text-foreground font-medium truncate">
                        {item.klantNaam}
                      </span>
                      <span className="font-mono text-sm tabular-nums text-foreground flex-shrink-0">
                        {formatCurrency(item.bedrag)}
                      </span>
                    </span>
                    <span className="flex items-baseline gap-2 mt-0.5">
                      <span className="flex-1 min-w-0 text-[11px] font-mono text-muted-foreground truncate">
                        {item.nummer}
                      </span>
                      <span className={`text-[12px] tabular-nums flex-shrink-0 ${ageClass}`}>
                        {item.dagen} dagen
                        <span className={urgent ? 'text-flame font-bold' : ''}>.</span>
                      </span>
                    </span>
                  </span>
                </button>

                {/* Vaste actie-slot: verschijnt bij hover, maar houdt zijn
                    breedte zodat de rij niet verspringt. */}
                <span className="w-[58px] flex-shrink-0 flex items-center justify-end gap-0.5 py-2.5 pr-2 -mr-2 rounded-r-lg group-hover:bg-background transition-colors opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => navigate(`/offertes?herinner=${item.id}`)}
                          aria-label={`Herinnering sturen voor ${item.nummer}`}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-petrol hover:bg-petrol/[0.08] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-petrol/30"
                        >
                          <MailPlus className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Herinnering sturen</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => void handleAfsluiten(item)}
                          aria-label={`${item.nummer} afsluiten als afgewezen`}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-[#C03A18] hover:bg-[#C03A18]/[0.08] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C03A18]/30"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Afsluiten · geen kans meer</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </span>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-auto pt-5 text-right">
        <button
          type="button"
          onClick={() => navigate('/offertes')}
          className="text-sm text-petrol dark:text-petrol-light hover:underline focus-visible:outline-none focus-visible:underline"
        >
          Alle offertes →
        </button>
      </div>
    </section>
  )
}
