import { useEffect, useMemo, useState } from 'react'
import { Save, CheckCircle2, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import type { AppSettings } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

// Standaard mobiele set — geldt zolang de user niets kiest (mobile_nav_items = null).
export const DEFAULT_MOBIELE_NAV = ['Projecten', 'Email', 'Maatjes']

interface MobielMenuOptie {
  label: string
  section: string
  color: string
}

// Alle modules die in het mobiele menu gezet kunnen worden. Instellingen staat
// hier bewust niet tussen: die is altijd zichtbaar (anti-lockout).
export const MOBIELE_MENU_OPTIES: MobielMenuOptie[] = [
  { label: 'Projecten', section: 'Werk', color: '#1A535C' },
  { label: 'Offertes', section: 'Werk', color: '#F15025' },
  { label: 'Klanten', section: 'Werk', color: '#3A6B8C' },
  { label: 'Werkbonnen', section: 'Werk', color: '#C44830' },
  { label: 'Maatjes', section: 'Werk', color: '#F15025' },
  { label: 'Facturen', section: 'Financieel', color: '#2D6B48' },
  { label: 'Inkoopfacturen', section: 'Financieel', color: '#C44830' },
  { label: 'Financieel', section: 'Financieel', color: '#2D6B48' },
  { label: 'Planning', section: 'Planning', color: '#9A5A48' },
  { label: 'Taken', section: 'Planning', color: '#5A5A55' },
  { label: 'Email', section: 'Communicatie', color: '#6A5A8A' },
  { label: 'Aanvragen', section: 'Communicatie', color: '#6A5A8A' },
]

const GELDIGE_LABELS = MOBIELE_MENU_OPTIES.map((o) => o.label)

// Bepaalt de actieve mobiele set: de user-keuze (gefilterd op geldige labels,
// menu-volgorde aangehouden) of de standaard-set als er niks gekozen is.
export function resolveMobieleNav(settings: AppSettings | undefined): string[] {
  const gekozen = settings?.mobile_nav_items
  if (Array.isArray(gekozen)) {
    return GELDIGE_LABELS.filter((l) => gekozen.includes(l))
  }
  return DEFAULT_MOBIELE_NAV
}

const SECTIES = ['Werk', 'Financieel', 'Planning', 'Communicatie']

interface MobielMenuSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MobielMenuSheet({ open, onOpenChange }: MobielMenuSheetProps) {
  const { settings, updateSettings } = useAppSettings()
  const opgeslagen = useMemo(() => resolveMobieleNav(settings), [settings])
  const [selectie, setSelectie] = useState<string[]>(opgeslagen)
  const [isSaving, setIsSaving] = useState(false)

  // Sync bij openen zodat de sheet steeds de laatst opgeslagen stand toont.
  useEffect(() => {
    if (open) setSelectie(opgeslagen)
  }, [open, opgeslagen])

  const toggle = (label: string) => {
    setSelectie((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    )
  }

  const heeftWijzigingen = useMemo(() => {
    if (selectie.length !== opgeslagen.length) return true
    const a = [...selectie].sort()
    const b = [...opgeslagen].sort()
    return a.some((l, i) => l !== b[i])
  }, [selectie, opgeslagen])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Bewaar in menu-volgorde zodat het menu een voorspelbare volgorde houdt.
      const geordend = GELDIGE_LABELS.filter((l) => selectie.includes(l))
      await updateSettings({ mobile_nav_items: geordend })
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  const isStandaard =
    selectie.length === DEFAULT_MOBIELE_NAV.length &&
    DEFAULT_MOBIELE_NAV.every((l) => selectie.includes(l))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-sm:pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-[#F15025]" />
            Mobiel menu
          </DialogTitle>
          <DialogDescription>
            Kies welke modules in je mobiele menu staan. Geldt alleen op je
            telefoon, niet op desktop.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-baseline justify-between pb-2 border-b border-[rgba(26,83,92,0.1)]">
            <span className="text-[13px] text-foreground/70">
              <span className="font-mono font-bold text-[#1A535C] tabular-nums">{selectie.length}</span>
              <span className="text-muted-foreground/70"> / </span>
              <span className="font-mono tabular-nums text-muted-foreground">{MOBIELE_MENU_OPTIES.length}</span>
              <span className="ml-1.5">in menu</span>
            </span>
            {!isStandaard && (
              <button
                type="button"
                onClick={() => setSelectie(DEFAULT_MOBIELE_NAV)}
                className="text-[12px] font-medium text-[#1A535C] hover:text-[#0F3D44] hover:underline"
              >
                Standaard
              </button>
            )}
          </div>

          {SECTIES.map((section) => {
            const items = MOBIELE_MENU_OPTIES.filter((o) => o.section === section)
            if (items.length === 0) return null
            return (
              <div key={section}>
                <h4 className="text-[11px] font-semibold uppercase tracking-widest text-foreground/70 mb-2.5">
                  {section}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((item) => {
                    const isOn = selectie.includes(item.label)
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => toggle(item.label)}
                        aria-pressed={isOn}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 border',
                          isOn
                            ? 'bg-card text-foreground border-[rgba(26,83,92,0.18)] shadow-[0_1px_2px_rgba(20,62,71,0.06)]'
                            : 'bg-transparent text-muted-foreground border-[rgba(26,83,92,0.12)] border-dashed hover:text-foreground/70 hover:bg-card/50',
                        )}
                      >
                        <span
                          aria-hidden
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: isOn ? item.color : 'transparent', boxShadow: isOn ? 'none' : 'inset 0 0 0 1px rgba(90,90,85,0.4)' }}
                        />
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          <div className="flex items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium bg-[rgba(26,83,92,0.05)] text-foreground/70 border border-[rgba(26,83,92,0.08)]">
              <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-muted-foreground flex-shrink-0" />
              Instellingen
            </span>
            <span
              className="text-[12px] text-muted-foreground"
              style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
            >
              · altijd zichtbaar
            </span>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[rgba(26,83,92,0.08)]">
            <span className="text-[12px] text-muted-foreground">
              {heeftWijzigingen
                ? <span className="text-[#F15025] font-semibold">Niet opgeslagen</span>
                : 'Opgeslagen'}
            </span>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !heeftWijzigingen}
              className="inline-flex items-center gap-2 bg-[#F15025] text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-[0_2px_8px_rgba(241,80,37,0.25),0_0_0_1px_rgba(241,80,37,0.1)] hover:bg-[#E04520] active:bg-[#D03A18] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#9B9B95] disabled:shadow-none"
            >
              {isSaving
                ? 'Opslaan...'
                : heeftWijzigingen
                  ? <><Save className="h-4 w-4" />Opslaan</>
                  : <><CheckCircle2 className="h-4 w-4" />Opgeslagen</>}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
