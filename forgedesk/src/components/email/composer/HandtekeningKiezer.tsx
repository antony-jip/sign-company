import { useEffect, useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getHandtekeningen, kiesHandtekening, type Handtekening } from '@/services/handtekeningService'
import { bouwHandtekeningHtml } from '@/utils/handtekening'
import { MiniSchakelaar } from './Onderdelen'

/**
 * Aan- en uitzetten van de handtekening, en kiezen wélke.
 *
 * Met één handtekening (of zonder migratie 248) is dit precies de schakelaar
 * die er altijd stond: geen kiezer, geen extra klik. Pas wie er meer heeft
 * krijgt het pijltje erbij.
 */
export function HandtekeningKiezer({
  aan,
  onChange,
  accountId,
  gekozenId,
  onKies,
}: {
  aan: boolean
  onChange: (v: boolean) => void
  /** Postvak waaruit verstuurd wordt; bepaalt welke handtekening wordt voorgesteld. */
  accountId?: string | null
  gekozenId?: string | null
  onKies: (h: Handtekening | null) => void
}) {
  const [lijst, setLijst] = useState<Handtekening[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let actueel = true
    getHandtekeningen()
      .then((h) => { if (actueel) setLijst(h) })
      .catch(() => {})
    return () => { actueel = false }
  }, [])

  // Het postvak stuurt de keuze zolang de gebruiker zelf niets gekozen heeft.
  // Wisselt hij van postvak, dan wisselt de handtekening mee; heeft hij er
  // bewust één aangeklikt, dan blijft die staan.
  const [zelfGekozen, setZelfGekozen] = useState(false)
  useEffect(() => {
    if (zelfGekozen || lijst.length === 0) return
    onKies(kiesHandtekening(lijst, accountId))
    // onKies is een callback van de ouder; alleen op postvak en lijst reageren.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, lijst, zelfGekozen])

  if (lijst.length < 2) {
    return <MiniSchakelaar aan={aan} onChange={onChange} label="Handtekening" titel="Handtekening onder het bericht" />
  }

  const huidig = lijst.find((h) => h.id === gekozenId) ?? kiesHandtekening(lijst, accountId)

  return (
    <div className="flex items-center gap-1">
      <MiniSchakelaar aan={aan} onChange={onChange} label="Handtekening" titel="Handtekening onder het bericht" />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1 rounded px-1.5 py-1 text-[12px] text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            title="Kies welke handtekening eronder komt"
          >
            <span className="max-w-[90px] truncate">{huidig?.naam || 'Kies'}</span>
            <ChevronDown className="h-3 w-3 shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 p-1">
          {lijst.map((h) => {
            const voorbeeld = bouwHandtekeningHtml({
              tekst: h.inhoud,
              afbeeldingUrl: h.afbeeldingUrl,
              afbeeldingLink: h.afbeeldingLink,
              afbeeldingBreedte: h.afbeeldingBreedte,
            })
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => { setZelfGekozen(true); onKies(h); onChange(true); setOpen(false) }}
                className="flex w-full items-start gap-2 rounded px-2 py-1.5 text-left hover:bg-muted/60"
              >
                <Check className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${huidig?.id === h.id ? 'text-petrol' : 'invisible'}`} />
                <span className="min-w-0">
                  <span className="block truncate text-[13px]">{h.naam}</span>
                  <span
                    className="mt-0.5 block max-h-8 overflow-hidden text-[11px] leading-[1.3] text-muted-foreground [&_img]:hidden"
                    dangerouslySetInnerHTML={{ __html: voorbeeld }}
                  />
                </span>
              </button>
            )
          })}
        </PopoverContent>
      </Popover>
    </div>
  )
}
