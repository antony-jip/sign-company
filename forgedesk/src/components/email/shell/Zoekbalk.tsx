import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getKlantenGedeeld } from '../EmailActionsPopover'
import { getProjecten } from '@/services/projectService'
import type { Klant, Project } from '@/types'
import { CHIP_LABEL, DATUM_OPTIES, datumChip, type ChipSoort, type ZoekChip } from './zoekChips'

interface Props {
  tekst: string
  onTekst: (v: string) => void
  chips: ZoekChip[]
  onChip: (chip: ZoekChip) => void
  onChipWeg: (index: number) => void
  onWis: () => void
  bezig?: boolean
  compact?: boolean
}

const SOORTEN: ChipSoort[] = ['van', 'aan', 'bijlage', 'datum', 'klant', 'project']

/**
 * Zoekbalk met chips. Een chip kies je uit het menu; Van en Aan vragen om een
 * adres, Datum om een bereik, Klant en Project om een keuze uit de lijst.
 * "/" zet de cursor hier (zie useMailToetsen).
 */
export const Zoekbalk = forwardRef<HTMLInputElement, Props>(function Zoekbalk({ tekst, onTekst, chips, onChip, onChipWeg, onWis, bezig, compact }, ref) {
  const [menu, zetMenu] = useState<null | 'soorten' | ChipSoort>(null)
  const [invoer, zetInvoer] = useState('')
  const [klanten, zetKlanten] = useState<Klant[]>([])
  const [projecten, zetProjecten] = useState<Project[]>([])
  const wrapper = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (menu !== 'klant' && menu !== 'project') return
    if (menu === 'klant' && klanten.length === 0) getKlantenGedeeld().then(zetKlanten).catch(() => {})
    if (menu === 'project' && projecten.length === 0) getProjecten(2000).then(zetProjecten).catch(() => {})
  }, [menu, klanten.length, projecten.length])

  useEffect(() => {
    if (!menu) return
    const sluit = (e: MouseEvent) => { if (wrapper.current && !wrapper.current.contains(e.target as Node)) zetMenu(null) }
    document.addEventListener('mousedown', sluit)
    return () => document.removeEventListener('mousedown', sluit)
  }, [menu])

  const keuzes = useMemo(() => {
    const zoek = invoer.trim().toLowerCase()
    if (menu === 'klant') {
      return klanten
        .filter((k) => !zoek || (k.bedrijfsnaam || '').toLowerCase().includes(zoek) || (k.contactpersoon || '').toLowerCase().includes(zoek))
        .slice(0, 8)
        .map((k) => ({ id: k.id, label: k.bedrijfsnaam || k.contactpersoon || 'Klant' }))
    }
    if (menu === 'project') {
      return projecten
        .filter((p) => !zoek || (p.naam || '').toLowerCase().includes(zoek) || (p.project_nummer || '').toLowerCase().includes(zoek) || (p.klant_naam || '').toLowerCase().includes(zoek))
        .slice(0, 8)
        .map((p) => ({ id: p.id, label: [p.project_nummer, p.naam].filter(Boolean).join(' ') }))
    }
    return []
  }, [menu, invoer, klanten, projecten])

  const kiesSoort = (soort: ChipSoort) => {
    if (soort === 'bijlage') { onChip({ soort, waarde: 'ja', label: 'Met bijlage' }); zetMenu(null); return }
    zetInvoer('')
    zetMenu(soort)
  }

  const bevestigInvoer = () => {
    const w = invoer.trim()
    if (!w || (menu !== 'van' && menu !== 'aan')) return
    onChip({ soort: menu, waarde: w, label: w })
    zetMenu(null)
    zetInvoer('')
  }

  return (
    <div ref={wrapper} className={cn('relative', compact ? '' : 'px-4 pb-2.5')}>
      <div className={cn('flex items-center gap-2 min-h-10 px-3 py-1 bg-background rounded-[10px] focus-within:ring-2 focus-within:ring-petrol/20 transition-shadow flex-wrap')}>
        <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        {chips.map((chip, i) => (
          <span key={`${chip.soort}-${chip.waarde}-${i}`} className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded-[7px] bg-petrol/[0.10] text-petrol dark:bg-[#2A7A86]/[0.22] dark:text-[#7FB5BF] text-[12px] font-medium max-w-[200px]">
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] opacity-70">{CHIP_LABEL[chip.soort]}</span>
            <span className="truncate">{chip.label}</span>
            <button type="button" onClick={() => onChipWeg(i)} aria-label={`${CHIP_LABEL[chip.soort]} weghalen`} className="h-4 w-4 rounded flex items-center justify-center hover:bg-petrol/15">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={ref}
          type="text"
          value={tekst}
          onChange={(e) => onTekst(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { (e.target as HTMLInputElement).blur(); if (!tekst && chips.length === 0) return; onWis() }
            if (e.key === 'Backspace' && !tekst && chips.length > 0) onChipWeg(chips.length - 1)
          }}
          placeholder={chips.length ? 'Verfijn' : 'Zoek in mail'}
          className="flex-1 min-w-[80px] bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground h-8"
          data-zoekveld
        />
        {bezig && <span className="h-3 w-3 rounded-full border-2 border-petrol/30 border-t-petrol animate-spin" aria-hidden />}
        <button
          type="button"
          onClick={() => zetMenu(menu ? null : 'soorten')}
          className="inline-flex items-center gap-0.5 h-7 px-2 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-petrol hover:bg-petrol/[0.06] transition-colors"
          aria-haspopup="menu"
          aria-expanded={!!menu}
        >
          Filter <ChevronDown className="h-3 w-3" />
        </button>
        {(tekst || chips.length > 0) && (
          <button type="button" onClick={onWis} className="p-1 hover:bg-border rounded" aria-label="Zoekopdracht wissen">
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {menu && (
        <div className={cn('absolute z-40 mt-1 w-[280px] rounded-xl bg-card dark:border dark:border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.10)] py-1.5', compact ? 'left-0' : 'left-4')} role="menu">
          {menu === 'soorten' && SOORTEN.map((soort) => (
            <button key={soort} type="button" role="menuitem" onClick={() => kiesSoort(soort)} className="w-full text-left px-4 py-2 text-[13px] text-foreground/80 hover:bg-background hover:text-foreground transition-colors">
              {CHIP_LABEL[soort]}
            </button>
          ))}
          {(menu === 'van' || menu === 'aan') && (
            <div className="px-3 py-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-1.5">{CHIP_LABEL[menu]}</p>
              <input
                autoFocus
                value={invoer}
                onChange={(e) => zetInvoer(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') bevestigInvoer(); if (e.key === 'Escape') zetMenu(null) }}
                placeholder="naam of adres"
                className="w-full h-8 px-2.5 text-[13px] bg-background rounded-lg outline-none focus:ring-2 focus:ring-petrol/20"
              />
              <button type="button" onClick={bevestigInvoer} className="mt-2 text-[12px] text-petrol font-medium hover:underline">Toepassen</button>
            </div>
          )}
          {menu === 'datum' && (
            <div className="py-1">
              {DATUM_OPTIES.filter((o) => o.id !== 'eigen').map((o) => (
                <button key={o.id} type="button" role="menuitem" onClick={() => { onChip(datumChip(o.id)); zetMenu(null) }} className="w-full text-left px-4 py-2 text-[13px] text-foreground/80 hover:bg-background hover:text-foreground transition-colors">
                  {o.label}
                </button>
              ))}
              <EigenDatum onKies={(van, tot) => { onChip(datumChip('eigen', new Date(), { van, tot })); zetMenu(null) }} />
            </div>
          )}
          {(menu === 'klant' || menu === 'project') && (
            <div className="px-3 py-2">
              <input
                autoFocus
                value={invoer}
                onChange={(e) => zetInvoer(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') zetMenu(null) }}
                placeholder={menu === 'klant' ? 'Zoek klant' : 'Zoek project'}
                className="w-full h-8 px-2.5 text-[13px] bg-background rounded-lg outline-none focus:ring-2 focus:ring-petrol/20 mb-1.5"
              />
              <div className="max-h-[220px] overflow-y-auto -mx-1">
                {keuzes.length === 0 && <p className="px-3 py-2 text-[12px] text-muted-foreground">Geen treffers</p>}
                {keuzes.map((k) => (
                  <button key={k.id} type="button" onClick={() => { onChip({ soort: menu, waarde: k.id, label: k.label }); zetMenu(null) }} className="w-full text-left px-3 py-1.5 rounded-lg text-[13px] text-foreground/80 hover:bg-background hover:text-foreground truncate">
                    {k.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
})

function EigenDatum({ onKies }: { onKies: (van: string, tot?: string) => void }) {
  const [van, zetVan] = useState('')
  const [tot, zetTot] = useState('')
  return (
    <div className="px-4 pt-2 pb-1 border-t border-border/60 mt-1">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-1.5">Eigen bereik</p>
      <div className="flex items-center gap-2">
        <input type="date" value={van} onChange={(e) => zetVan(e.target.value)} className="flex-1 h-8 px-2 text-[12px] bg-background rounded-lg outline-none text-foreground" />
        <span className="text-[11px] text-muted-foreground">tot</span>
        <input type="date" value={tot} onChange={(e) => zetTot(e.target.value)} className="flex-1 h-8 px-2 text-[12px] bg-background rounded-lg outline-none text-foreground" />
      </div>
      <button type="button" disabled={!van} onClick={() => onKies(van, tot || undefined)} className="mt-2 text-[12px] text-petrol font-medium hover:underline disabled:opacity-40">Toepassen</button>
    </div>
  )
}
