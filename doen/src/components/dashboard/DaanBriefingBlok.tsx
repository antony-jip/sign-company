import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Mail, Receipt, Folder, ArrowRight, X, type LucideIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { getDaanBriefingVanVandaag } from '@/services/supabaseService'
import type { DaanBriefing, DaanBriefingPunt } from '@/services/supabaseService'

// localStorage-keys volgen de doen-conventie: doen_<module>_<feature>.
const KEY_LAATST_GETOOND = 'doen_briefing_laatst_getoond'
const KEY_VOORKEUR = 'doen_briefing_voorkeur' // 'nooit' = popup nooit tonen
// Waarde = id van de weggeklikte briefing. Morgen ligt er een nieuwe briefing
// met een nieuw id, dus het blok komt vanzelf terug.
const KEY_BLOK_WEG = 'doen_briefing_blok_weggeklikt'

const SOORT_ICON: Record<DaanBriefingPunt['soort'], LucideIcon> = {
  offerte: FileText,
  mail: Mail,
  factuur: Receipt,
  project: Folder,
}

function vandaagSleutel(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Amsterdam' })
}

function begroeting(): string {
  const uur = new Date().getHours()
  if (uur < 12) return 'Goedemorgen'
  if (uur < 18) return 'Goedemiddag'
  return 'Goedenavond'
}

function PuntRij({ punt, onGa }: { punt: DaanBriefingPunt; onGa: (href: string) => void }) {
  const Icon = SOORT_ICON[punt.soort] ?? Folder
  return (
    <button
      onClick={() => onGa(punt.href)}
      className="w-full text-left group flex items-start gap-3 py-2.5 border-b border-border/40 last:border-b-0"
    >
      <Icon className="w-4 h-4 text-petrol mt-0.5 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{punt.titel}</span>
        <span className="block text-[13px] text-muted-foreground leading-snug mt-0.5">{punt.toelichting}</span>
      </span>
      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 mt-1 shrink-0 transition-transform group-hover:translate-x-0.5" />
    </button>
  )
}

/**
 * De dagelijkse briefing: signalen uit de live data, 's nachts gewogen met
 * wat Daan over de klanten weet. Als dashboard-blok, plus één keer per dag
 * als popup bij de eerste opening (uitzetbaar via "Niet meer tonen").
 */
export function DaanBriefingBlok() {
  const navigate = useNavigate()
  const [briefing, setBriefing] = useState<DaanBriefing | null>(null)
  const [popupOpen, setPopupOpen] = useState(false)
  const [blokWeg, setBlokWeg] = useState(false)

  useEffect(() => {
    let cancelled = false
    getDaanBriefingVanVandaag()
      .then((b) => {
        if (cancelled || !b?.inhoud?.punten?.length) return
        setBriefing(b)
        setBlokWeg(localStorage.getItem(KEY_BLOK_WEG) === b.id)
        const voorkeur = localStorage.getItem(KEY_VOORKEUR)
        const laatst = localStorage.getItem(KEY_LAATST_GETOOND)
        if (voorkeur !== 'nooit' && laatst !== vandaagSleutel()) {
          localStorage.setItem(KEY_LAATST_GETOOND, vandaagSleutel())
          setPopupOpen(true)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (!briefing?.inhoud?.punten?.length) return null
  const punten = briefing.inhoud.punten

  const ga = (href: string) => {
    setPopupOpen(false)
    navigate(href)
  }

  const verbergBlok = () => {
    localStorage.setItem(KEY_BLOK_WEG, briefing.id)
    setBlokWeg(true)
  }

  return (
    <>
      {!blokWeg && (
        <section className="doen-panel doen-wash rounded-xl p-6 sm:p-7">
          <header className="flex items-baseline justify-between gap-4 mb-4">
            <div className="flex items-baseline gap-3 min-w-0">
              <h2 className="font-heading text-[14px] font-bold text-foreground">
                Verdient vandaag aandacht<span className="text-flame">.</span>
              </h2>
              {briefing.inhoud.intro && (
                <span className="doen-subtitel truncate">{briefing.inhoud.intro}</span>
              )}
            </div>
            <div className="flex items-baseline gap-3 flex-shrink-0">
              <span className="font-mono text-[12px] text-muted-foreground">
                {punten.length} {punten.length === 1 ? 'punt' : 'punten'} · uit {briefing.signalen} signalen
              </span>
              <button
                onClick={verbergBlok}
                aria-label="Briefing tot morgen verbergen"
                title="Tot morgen verbergen"
                className="text-muted-foreground/60 hover:text-foreground transition-colors self-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </header>
          <div>
            {punten.map((p, i) => (
              <PuntRij key={`${i}-${p.titel}`} punt={p} onGa={ga} />
            ))}
          </div>
        </section>
      )}

      <Dialog open={popupOpen} onOpenChange={setPopupOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle className="font-heading text-lg">
            {begroeting()}<span className="text-flame">.</span>
          </DialogTitle>
          <DialogDescription>
            {briefing.inhoud.intro || 'Dit verdient vandaag je aandacht.'}
          </DialogDescription>
          <div className="mt-1">
            {punten.map((p, i) => (
              <PuntRij key={`${i}-${p.titel}`} punt={p} onGa={ga} />
            ))}
          </div>
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={() => {
                localStorage.setItem(KEY_VOORKEUR, 'nooit')
                setPopupOpen(false)
              }}
              className="text-xs text-muted-foreground hover:underline"
            >
              Niet meer tonen
            </button>
            <button
              onClick={() => setPopupOpen(false)}
              className="text-sm font-semibold text-white bg-flame hover:bg-[#E04520] px-4 py-2 rounded-md"
            >
              Aan de slag
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
