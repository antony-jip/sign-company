import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Download,
  FileText,
  Loader2,
  Mail,
  Phone,
  X,
} from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { logger } from '@/utils/logger'
import { HandtekeningVeld } from '@/components/shared/HandtekeningVeld'
import { PortaalLightbox } from '@/components/portaal/PortaalLightbox'
import { getMeetellendeVarianten, nettoStuksprijs } from '@/utils/offerteTotalen'
import { bijlageSoort, klantSpecs, veiligeTerugUrl, voornaam, type KlantSpec } from '@/utils/offerteKlantpagina'

// ============ TYPES ============

interface PubliekOfferte {
  id: string
  nummer: string
  titel: string
  status: string
  subtotaal: number
  btw_bedrag: number
  totaal: number
  geldig_tot: string
  notities?: string
  voorwaarden?: string
  intro_tekst?: string
  outro_tekst?: string
  klant_naam?: string
  klant_id?: string
  versie?: number
  created_at: string
  updated_at?: string
  geaccepteerd_door?: string
  geaccepteerd_op?: string
  wijziging_opmerking?: string
  wijziging_ingediend_op?: string
  afrondingskorting_excl_btw?: number
  aangepast_totaal?: number
  gekozen_items?: string[]
  gekozen_varianten?: Record<string, string>
}

interface PubliekItemPrijsVariant {
  id: string
  label: string
  aantal: number
  eenheidsprijs: number
  btw_percentage: number
  korting_percentage: number
  telt_mee?: boolean
}

interface PubliekItem {
  id: string
  beschrijving: string
  aantal: number
  eenheidsprijs: number
  btw_percentage: number
  korting_percentage: number
  totaal: number
  volgorde: number
  soort?: 'prijs' | 'tekst'
  is_optioneel?: boolean
  foto_url?: string | null
  foto_op_offerte?: boolean
  bijlage_url?: string | null
  bijlage_type?: string | null
  bijlage_naam?: string | null
  breedte_mm?: number | null
  hoogte_mm?: number | null
  oppervlakte_m2?: number | null
  extra_velden?: Record<string, string>
  detail_regels?: { id?: string; label: string; waarde: string }[]
  prijs_varianten?: PubliekItemPrijsVariant[]
  actieve_variant_id?: string
}

interface Bedrijf {
  bedrijfsnaam?: string
  bedrijfs_adres?: string
  bedrijfs_telefoon?: string
  bedrijfs_email?: string
  bedrijfs_website?: string
  kvk_nummer?: string
  btw_nummer?: string
  iban?: string
  logo_url?: string
}

interface Klant {
  bedrijfsnaam?: string
  contactpersoon?: string
  email?: string
  adres?: string
  postcode?: string
  stad?: string
}

interface Contactpersoon {
  naam: string
  functie?: string | null
  foto_url?: string | null
}

type VerzoekModus = 'wijziging' | 'nieuw'

// ============ HELPERS ============

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(round2(amount))
}

function formatDate(dateString: string): string {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateTime(dateString: string): string {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function dagenTotVerlopen(geldigTot: string): number {
  if (!geldigTot) return Infinity
  const vandaag = new Date()
  vandaag.setHours(0, 0, 0, 0)
  const eind = new Date(geldigTot)
  eind.setHours(0, 0, 0, 0)
  return Math.ceil((eind.getTime() - vandaag.getTime()) / (1000 * 60 * 60 * 24))
}

/** De eerste regel van een omschrijving is de kop, de rest is toelichting. */
function splitsBeschrijving(tekst: string): { titel: string; rest: string } {
  const [eerste = '', ...rest] = (tekst || '').split('\n')
  return { titel: eerste.trim(), rest: rest.join('\n').trim() }
}

// Get effective item values based on selected variant
function getEffectiveItemValues(item: PubliekItem, selectedVariantId?: string): { aantal: number; eenheidsprijs: number; btw_percentage: number; korting_percentage: number } {
  if (selectedVariantId && item.prijs_varianten?.length) {
    const variant = item.prijs_varianten.find(v => v.id === selectedVariantId)
    if (variant) {
      return {
        aantal: variant.aantal,
        eenheidsprijs: variant.eenheidsprijs,
        btw_percentage: variant.btw_percentage,
        korting_percentage: variant.korting_percentage,
      }
    }
  }
  return {
    aantal: item.aantal,
    eenheidsprijs: item.eenheidsprijs,
    btw_percentage: item.btw_percentage,
    korting_percentage: item.korting_percentage || 0,
  }
}

/**
 * De prijsregels van een item zoals ze nu meetellen. Heeft de verkoper meerdere
 * prijsopties laten meetellen, dan staan die allemaal vast op de offerte en valt
 * er voor de klant niets te kiezen; anders blijft het één regel, eventueel de
 * optie die de klant zelf koos.
 */
function effectievePrijsRegels(
  item: PubliekItem,
  selectedVariantId?: string
): { aantal: number; eenheidsprijs: number; btw_percentage: number; korting_percentage: number }[] {
  const meetellend = meetellendeVariantenVan(item)
  if (meetellend.length > 1) {
    return meetellend.map((v) => ({
      aantal: v.aantal,
      eenheidsprijs: v.eenheidsprijs,
      btw_percentage: v.btw_percentage,
      korting_percentage: v.korting_percentage || 0,
    }))
  }
  return [getEffectiveItemValues(item, selectedVariantId)]
}

function meetellendeVariantenVan(item: PubliekItem): PubliekItemPrijsVariant[] {
  return getMeetellendeVarianten(item.prijs_varianten, item.actieve_variant_id)
}

function getEffectiveItemTotal(item: PubliekItem, selectedVariantId?: string): number {
  return round2(
    effectievePrijsRegels(item, selectedVariantId).reduce(
      (sum, v) => sum + round2(v.aantal * v.eenheidsprijs * (1 - v.korting_percentage / 100)),
      0
    )
  )
}

// BTW groepering with selection awareness
function groepeerBtwMetSelectie(
  items: PubliekItem[],
  selectedItems: Set<string>,
  selectedVariants: Record<string, string>,
  hasOptionalItems: boolean
): { percentage: number; basis: number; btw: number }[] {
  const map = new Map<number, { basis: number; btw: number }>()
  for (const item of items) {
    if (item.soort === 'tekst') continue
    // Skip unselected items (only filter if there are optional items)
    if (hasOptionalItems && !selectedItems.has(item.id)) continue
    for (const v of effectievePrijsRegels(item, selectedVariants[item.id])) {
      const korting = v.korting_percentage || 0
      const regelExcl = round2(v.aantal * v.eenheidsprijs * (1 - korting / 100))
      const regelBtw = round2(regelExcl * v.btw_percentage / 100)
      const existing = map.get(v.btw_percentage) || { basis: 0, btw: 0 }
      existing.basis += regelExcl
      existing.btw += regelBtw
      map.set(v.btw_percentage, existing)
    }
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([percentage, vals]) => ({ percentage, basis: round2(vals.basis), btw: round2(vals.btw) }))
}

// ============ ONDERDELEN ============

function Gezicht({ naam, fotoUrl, grootte }: { naam: string; fotoUrl?: string | null; grootte: number }) {
  const [fotoKapot, setFotoKapot] = useState(false)
  const delen = naam.trim().split(/\s+/).filter(Boolean)
  const initialen = `${delen[0]?.[0] ?? ''}${delen.length > 1 ? delen[delen.length - 1][0] : ''}`.toUpperCase()

  if (fotoUrl && !fotoKapot) {
    return (
      <img
        src={fotoUrl}
        alt={naam}
        onError={() => setFotoKapot(true)}
        className="shrink-0 rounded-full object-cover"
        style={{ width: grootte, height: grootte }}
      />
    )
  }
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#1A535C] font-semibold text-white"
      style={{ width: grootte, height: grootte, fontSize: Math.round(grootte * 0.36) }}
    >
      {initialen}
    </span>
  )
}

function StatusKop({ kleur, children }: { kleur: string; children: React.ReactNode }) {
  return (
    <p className="text-base font-bold tracking-[-0.3px]" style={{ color: kleur }}>
      {children}<span className="text-[#D24620]">.</span>
    </p>
  )
}

function Paneel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl bg-[#FFFFFF] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] md:p-8 ${className}`}>
      {children}
    </section>
  )
}

function Sheet({ titel, onClose, children }: { titel: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-200 md:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titel}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-[#FFFFFF] shadow-[0_24px_48px_rgba(0,0,0,0.12)] animate-in slide-in-from-bottom duration-300 md:max-w-md md:rounded-2xl"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="space-y-5 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:p-8">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold tracking-[-0.3px] text-[#1A1A1A]">{titel}</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Sluiten"
              className="rounded-lg p-1 text-[#9B9B95] hover:bg-[#F8F7F5]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

interface OfferteRegelProps {
  item: PubliekItem
  isSelected: boolean
  gekozenVariantId?: string
  kanActie: boolean
  hasOptionalItems: boolean
  onToggle: (itemId: string, aan: boolean) => void
  onKiesVariant: (itemId: string, variantId: string) => void
  onOpenAfbeelding: (url: string, naam: string) => void
}

function OfferteRegel({
  item,
  isSelected,
  gekozenVariantId,
  kanActie,
  hasOptionalItems,
  onToggle,
  onKiesVariant,
  onOpenAfbeelding,
}: OfferteRegelProps) {
  if (item.soort === 'tekst') {
    return (
      <div className="py-5 first:pt-0 last:pb-0">
        <p className="whitespace-pre-line text-sm leading-relaxed text-[#6B6B66]">{item.beschrijving}</p>
      </div>
    )
  }

  const { titel, rest } = splitsBeschrijving(item.beschrijving)
  const meetellend = meetellendeVariantenVan(item)
  // Meerdere meetellende opties krijgen elk een eigen regel: één regel kan geen
  // twee stuksprijzen tonen zonder te liegen over het bedrag.
  const toonOptieRegels = meetellend.length > 1
  const waarden = getEffectiveItemValues(item, gekozenVariantId)
  const regelTotaal = getEffectiveItemTotal(item, gekozenVariantId)
  const isDeselected = hasOptionalItems && !isSelected

  const specs: KlantSpec[] = klantSpecs(item)
  // Staan er meerdere opties vast in het totaal, dan valt er niets te kiezen:
  // dan zijn het geen alternatieven maar vaste regels.
  const toonbareVarianten = item.prijs_varianten?.filter((v) => v.eenheidsprijs > 0) || []
  const toonKeuze = !toonOptieRegels && toonbareVarianten.length > 0 && kanActie && !isDeselected
  const gekozenLabel = !toonKeuze && gekozenVariantId
    ? item.prijs_varianten?.find((v) => v.id === gekozenVariantId)?.label
    : undefined
  if (gekozenLabel) specs.push({ label: 'Uitvoering', waarde: gekozenLabel })
  if (!toonOptieRegels && waarden.korting_percentage > 0) {
    const korting = round2(waarden.aantal * waarden.eenheidsprijs * (waarden.korting_percentage / 100))
    specs.push({ label: 'Korting', waarde: `${waarden.korting_percentage}% (-${formatCurrency(korting)})` })
  }

  // De prijs in een keuze is die ná korting, met het regeltotaal erachter. Met
  // de brutoprijs leken alle staffels even duur en zag de klant pas na het
  // kiezen dat er korting op zat.
  const keuzes = toonKeuze
    ? [
        ...(item.eenheidsprijs > 0
          ? [{ id: '', label: 'Basis', aantal: item.aantal, eenheidsprijs: item.eenheidsprijs, korting_percentage: item.korting_percentage || 0 }]
          : []),
        ...toonbareVarianten.map((v) => ({
          id: v.id,
          label: v.label,
          aantal: v.aantal,
          eenheidsprijs: v.eenheidsprijs,
          korting_percentage: v.korting_percentage || 0,
        })),
      ]
    : []

  const soort = bijlageSoort(item.bijlage_url, item.bijlage_type)
  const afbeeldingen = [
    ...(soort === 'afbeelding' && item.bijlage_url ? [{ url: item.bijlage_url, naam: item.bijlage_naam || titel }] : []),
    ...(item.foto_op_offerte && item.foto_url && bijlageSoort(item.foto_url) !== 'pdf' ? [{ url: item.foto_url, naam: titel }] : []),
  ]

  return (
    <div className="py-6 first:pt-0 last:pb-0">
      <div className={`transition-opacity ${isDeselected ? 'opacity-55' : ''}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {item.is_optioneel && (
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-[#9B9B95]">Optie</p>
            )}
            <h3 className="break-words text-[15px] font-semibold leading-snug text-[#1A1A1A]">{titel}</h3>
            {rest && (
              <p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-[#6B6B66]">{rest}</p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-[15px] font-semibold text-[#1A1A1A]">
              {item.is_optioneel ? '+ ' : ''}{formatCurrency(regelTotaal)}
            </p>
            {/* De stuksprijs staat hier ná korting, zodat aantal x prijs op het
                regeltotaal uitkomt. */}
            {!toonOptieRegels && waarden.aantal !== 1 && (
              <p className="mt-0.5 font-mono text-xs text-[#9B9B95]">
                {waarden.aantal} x {formatCurrency(nettoStuksprijs(waarden))}
              </p>
            )}
          </div>
        </div>

        {afbeeldingen.map((afbeelding) => (
          <button
            key={afbeelding.url}
            type="button"
            onClick={() => onOpenAfbeelding(afbeelding.url, afbeelding.naam)}
            aria-label={`${afbeelding.naam} groter bekijken`}
            className="mt-4 block w-full overflow-hidden rounded-lg bg-[#F8F7F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A535C]"
          >
            <img
              src={afbeelding.url}
              alt={afbeelding.naam}
              loading="lazy"
              onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none' }}
              className="mx-auto max-h-[380px] w-full object-contain"
            />
          </button>
        ))}

        {soort === 'pdf' && item.bijlage_url && (
          <a
            href={item.bijlage_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#1A535C] underline-offset-4 hover:underline"
          >
            <FileText className="h-4 w-4" />
            {item.bijlage_naam || 'Tekening bekijken'}
          </a>
        )}

        {specs.length > 0 && (
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
            {specs.map((spec, i) => (
              <React.Fragment key={`${spec.label}-${i}`}>
                <dt className="text-[#9B9B95]">{spec.label}</dt>
                <dd className="min-w-0 break-words text-[#1A1A1A]">{spec.waarde}</dd>
              </React.Fragment>
            ))}
          </dl>
        )}

        {toonOptieRegels && (
          <ul className="mt-4 space-y-1.5 text-sm">
            {meetellend.map((v) => (
              <li key={v.id} className="flex flex-wrap items-baseline justify-between gap-x-4">
                <span className="min-w-0 text-[#6B6B66]">
                  {v.label}
                  {(v.korting_percentage || 0) > 0 && <span className="ml-1 text-xs">(-{v.korting_percentage}% korting)</span>}
                </span>
                <span className="font-mono text-[#6B6B66]">
                  {v.aantal} x {formatCurrency(nettoStuksprijs(v))} = {formatCurrency(round2(v.aantal * v.eenheidsprijs * (1 - (v.korting_percentage || 0) / 100)))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {toonKeuze && (
        <div className="mt-5" role="radiogroup" aria-label={`Uitvoering voor ${titel}`}>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[#9B9B95]">Kies een uitvoering</p>
          <div className="space-y-2">
            {keuzes.map((keuze) => {
              const actief = (gekozenVariantId || '') === keuze.id
              const stuk = nettoStuksprijs(keuze)
              return (
                <button
                  key={keuze.id || 'basis'}
                  type="button"
                  role="radio"
                  aria-checked={actief}
                  onClick={() => onKiesVariant(item.id, keuze.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
                    actief ? 'bg-[#F1F6F6] ring-[1.5px] ring-inset ring-[#1A535C]' : 'bg-[#F8F7F5] hover:bg-[#F1F0EC]'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`h-4 w-4 shrink-0 rounded-full bg-white ${actief ? 'border-[5px] border-[#1A535C]' : 'border border-[#C9C8C3]'}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-[#1A1A1A]">{keuze.label}</span>
                    <span className="block font-mono text-xs text-[#6B6B66]">
                      {keuze.aantal} x {formatCurrency(stuk)}
                      {keuze.korting_percentage > 0 ? ` · ${keuze.korting_percentage}% korting` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-sm font-semibold text-[#1A1A1A]">
                    {formatCurrency(round2(keuze.aantal * stuk))}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {item.is_optioneel && kanActie && (
        <label
          className={`mt-4 flex cursor-pointer items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
            isSelected ? 'bg-[#F1F6F6] ring-[1.5px] ring-inset ring-[#1A535C]' : 'bg-[#F8F7F5] hover:bg-[#F1F0EC]'
          }`}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onToggle(item.id, checked === true)}
            className="border-[#1A535C] data-[state=checked]:bg-[#1A535C] data-[state=checked]:text-white"
          />
          <span className="flex-1 text-sm font-medium text-[#1A1A1A]">
            {isSelected ? 'Toegevoegd aan uw offerte' : 'Toevoegen aan uw offerte'}
          </span>
        </label>
      )}
      {item.is_optioneel && !kanActie && !isSelected && (
        <p className="mt-2 text-xs text-[#9B9B95]">Niet gekozen</p>
      )}
    </div>
  )
}

// ============ COMPONENT ============

export function OffertePubliekPagina() {
  const { token } = useParams<{ token: string }>()
  const [offerte, setOfferte] = useState<PubliekOfferte | null>(null)
  const [items, setItems] = useState<PubliekItem[]>([])
  const [bedrijf, setBedrijf] = useState<Bedrijf | null>(null)
  const [docStyle, setDocStyle] = useState<Record<string, unknown> | null>(null)
  const [klant, setKlant] = useState<Klant | null>(null)
  const [contactpersoon, setContactpersoon] = useState<Contactpersoon | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [fadeIn, setFadeIn] = useState(false)

  // Sheets
  const [showAcceptModal, setShowAcceptModal] = useState(false)
  const [verzoekModus, setVerzoekModus] = useState<VerzoekModus | null>(null)

  // Accept form
  const [acceptNaam, setAcceptNaam] = useState('')
  const [acceptHandtekening, setAcceptHandtekening] = useState<string | undefined>()
  const [acceptLoading, setAcceptLoading] = useState(false)
  const [netGeaccepteerd, setNetGeaccepteerd] = useState(false)

  // Wijziging form
  const [wijzigingNaam, setWijzigingNaam] = useState('')
  const [wijzigingOpmerking, setWijzigingOpmerking] = useState('')
  const [wijzigingLoading, setWijzigingLoading] = useState(false)

  // Option selection state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})

  const [lightbox, setLightbox] = useState<{ url: string; naam: string } | null>(null)
  const [pdfBezig, setPdfBezig] = useState(false)

  useEffect(() => {
    async function load() {
      if (!token) {
        setNotFound(true)
        setIsLoading(false)
        return
      }
      try {
        const resp = await fetch(`/api/offerte-publiek?token=${encodeURIComponent(token)}`)
        if (!resp.ok) {
          setNotFound(true)
          setIsLoading(false)
          return
        }
        const data = await resp.json()
        const loadedItems: PubliekItem[] = data.items || []
        const loadedOfferte: PubliekOfferte | null = data.offerte

        // Initialize selection state in same batch as data loading
        if (loadedOfferte?.gekozen_items) {
          setSelectedItems(new Set(loadedOfferte.gekozen_items))
          setSelectedVariants(loadedOfferte.gekozen_varianten || {})
        } else if (loadedItems.length > 0) {
          const initial = new Set<string>()
          const initialVariants: Record<string, string> = {}
          for (const item of loadedItems) {
            if (item.soort === 'tekst') continue
            if (!item.is_optioneel) initial.add(item.id)
            if (item.actieve_variant_id && item.prijs_varianten?.length) {
              initialVariants[item.id] = item.actieve_variant_id
            }
          }
          setSelectedItems(initial)
          setSelectedVariants(initialVariants)
        }

        setOfferte(loadedOfferte)
        setItems(loadedItems)
        setBedrijf(data.bedrijf)
        setDocStyle(data.docStyle || null)
        setKlant(data.klant)
        setContactpersoon(data.contactpersoon || null)
        // De contactpersoon van de klant tekent meestal zelf; vooraf invullen
        // scheelt typen, en het veld blijft aanpasbaar.
        setAcceptNaam(data.klant?.contactpersoon || '')
        setWijzigingNaam(data.klant?.contactpersoon || '')
      } catch (err) {
        logger.error('Fout bij laden offerte:', err)
        setNotFound(true)
      } finally {
        setIsLoading(false)
        requestAnimationFrame(() => setFadeIn(true))
      }
    }
    load()
  }, [token])

  const offerteNummer = offerte?.nummer
  const bedrijfsnaam = bedrijf?.bedrijfsnaam
  useEffect(() => {
    const delen = [offerteNummer ? `Offerte ${offerteNummer}` : '', bedrijfsnaam || ''].filter(Boolean)
    if (delen.length) document.title = delen.join(' · ')
  }, [offerteNummer, bedrijfsnaam])

  useEffect(() => {
    if (!showAcceptModal && !verzoekModus) return
    const sluitOpEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setShowAcceptModal(false)
      setVerzoekModus(null)
    }
    window.addEventListener('keydown', sluitOpEscape)
    return () => window.removeEventListener('keydown', sluitOpEscape)
  }, [showAcceptModal, verzoekModus])

  // Derived: check if offerte has optional items or variants
  const hasOptionalItems = useMemo(() => items.some(i => i.is_optioneel), [items])
  const hasVariants = useMemo(() => items.some(i => i.prijs_varianten && i.prijs_varianten.length > 0), [items])
  const hasSelections = hasOptionalItems || hasVariants

  const handleToggle = useCallback((itemId: string, aan: boolean) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (aan) next.add(itemId)
      else next.delete(itemId)
      return next
    })
  }, [])

  const handleKiesVariant = useCallback((itemId: string, variantId: string) => {
    setSelectedVariants(prev => {
      if (!variantId) {
        const next = { ...prev }
        delete next[itemId]
        return next
      }
      return { ...prev, [itemId]: variantId }
    })
  }, [])

  const handleOpenAfbeelding = useCallback((url: string, naam: string) => setLightbox({ url, naam }), [])

  const openVerzoek = useCallback((modus: VerzoekModus) => {
    if (modus === 'nieuw') {
      setWijzigingOpmerking(huidig => huidig.trim() ? huidig : 'Graag ontvang ik een nieuwe versie van deze offerte.')
    }
    setVerzoekModus(modus)
  }, [])

  // Accepteren
  const handleAccepteren = useCallback(async () => {
    if (!token || acceptNaam.trim().length < 2 || !acceptHandtekening) return
    setAcceptLoading(true)
    try {
      const resp = await fetch('/api/offerte-accepteren', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          naam: acceptNaam.trim(),
          handtekening: acceptHandtekening,
          gekozen_items: hasOptionalItems ? Array.from(selectedItems) : undefined,
          gekozen_varianten: Object.keys(selectedVariants).length > 0 ? selectedVariants : undefined,
        }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        toast.error(data.error || 'Er ging iets mis')
        return
      }
      setShowAcceptModal(false)
      setOfferte((prev: PubliekOfferte | null) => prev ? {
        ...prev,
        status: 'goedgekeurd',
        geaccepteerd_door: acceptNaam.trim(),
        geaccepteerd_op: new Date().toISOString(),
      } : prev)
      setNetGeaccepteerd(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      logger.error('Fout bij accepteren offerte:', err)
      toast.error('Er ging iets mis. Probeer het opnieuw.')
    } finally {
      setAcceptLoading(false)
    }
  }, [token, acceptNaam, acceptHandtekening, selectedItems, selectedVariants, hasOptionalItems])

  // Wijziging of nieuwe versie aanvragen
  const handleWijziging = useCallback(async () => {
    if (!token || wijzigingOpmerking.trim().length < 10) return
    setWijzigingLoading(true)
    try {
      const resp = await fetch('/api/offerte-wijziging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, naam: wijzigingNaam.trim() || undefined, opmerking: wijzigingOpmerking.trim() }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        toast.error(data.error || 'Er ging iets mis')
        return
      }
      setVerzoekModus(null)
      // Een verlopen offerte houdt server-side zijn status; hier dus ook.
      setOfferte((prev: PubliekOfferte | null) => prev ? {
        ...prev,
        status: verzoekModus === 'nieuw' ? prev.status : 'wijziging_gevraagd',
        wijziging_opmerking: wijzigingOpmerking.trim(),
        wijziging_ingediend_op: new Date().toISOString(),
      } : prev)
      toast.success('Verstuurd. We komen bij u terug.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      logger.error('Fout bij wijziging aanvragen:', err)
      toast.error('Er ging iets mis. Probeer het opnieuw.')
    } finally {
      setWijzigingLoading(false)
    }
  }, [token, wijzigingNaam, wijzigingOpmerking, verzoekModus])

  // PDF download (client-side with jsPDF)
  const handleDownloadPDF = useCallback(async () => {
    if (!offerte) return
    setPdfBezig(true)
    try {
      // Gebruik dezelfde generateOffertePDF als de hoofdapp zodat
      // briefpapier, huisstijl, brand kleuren en layout consistent zijn.
      const { generateOffertePDF } = await import('@/services/pdfService')

      const offerteData = {
        id: offerte.id || '',
        user_id: '',
        klant_id: offerte.klant_id || '',
        nummer: offerte.nummer,
        titel: offerte.titel || '',
        status: offerte.status as 'concept',
        subtotaal: offerte.subtotaal,
        btw_bedrag: offerte.btw_bedrag,
        totaal: offerte.aangepast_totaal ?? offerte.totaal,
        geldig_tot: offerte.geldig_tot || '',
        notities: offerte.notities || '',
        voorwaarden: offerte.voorwaarden || '',
        intro_tekst: offerte.intro_tekst || '',
        outro_tekst: offerte.outro_tekst || '',
        versie: offerte.versie || 1,
        created_at: offerte.created_at || new Date().toISOString(),
        updated_at: offerte.updated_at || new Date().toISOString(),
      }

      const pdfItems = items.map((item, index) => ({
        id: item.id || `item-${index}`,
        offerte_id: offerte.id || '',
        beschrijving: item.beschrijving,
        aantal: item.aantal,
        eenheidsprijs: item.eenheidsprijs,
        btw_percentage: item.btw_percentage,
        korting_percentage: item.korting_percentage || 0,
        totaal: item.totaal,
        volgorde: index + 1,
        soort: item.soort,
        extra_velden: item.extra_velden,
        detail_regels: item.detail_regels,
        prijs_varianten: item.prijs_varianten,
        actieve_variant_id: item.actieve_variant_id,
        is_optioneel: item.is_optioneel,
        breedte_mm: item.breedte_mm ?? undefined,
        hoogte_mm: item.hoogte_mm ?? undefined,
        oppervlakte_m2: item.oppervlakte_m2 ?? undefined,
        bijlage_url: item.bijlage_url ?? undefined,
        bijlage_type: item.bijlage_type ?? undefined,
        bijlage_naam: item.bijlage_naam ?? undefined,
        created_at: new Date().toISOString(),
      }))

      const bedrijfsProfiel = {
        bedrijfsnaam: bedrijf?.bedrijfsnaam || '',
        bedrijfs_adres: bedrijf?.bedrijfs_adres || '',
        bedrijfs_telefoon: bedrijf?.bedrijfs_telefoon || '',
        bedrijfs_email: bedrijf?.bedrijfs_email || '',
        bedrijfs_website: bedrijf?.bedrijfs_website || '',
        kvk_nummer: bedrijf?.kvk_nummer || '',
        btw_nummer: bedrijf?.btw_nummer || '',
        iban: bedrijf?.iban || '',
        logo_url: bedrijf?.logo_url || '',
        primaireKleur: (docStyle as Record<string, string> | null)?.primaire_kleur || '#1A535C',
      }

      const doc = await generateOffertePDF(
        offerteData as Parameters<typeof generateOffertePDF>[0],
        pdfItems as Parameters<typeof generateOffertePDF>[1],
        klant || {},
        bedrijfsProfiel as Parameters<typeof generateOffertePDF>[3],
        (docStyle as Parameters<typeof generateOffertePDF>[4]) || undefined,
      )

      doc.save(`Offerte-${offerte.nummer}.pdf`)
    } catch (err) {
      logger.error('Fout bij PDF downloaden:', err)
      toast.error('PDF downloaden mislukt')
    } finally {
      setPdfBezig(false)
    }
  }, [offerte, items, bedrijf, klant, docStyle])

  // ============ DERIVED STATE (must be before early returns to respect rules of hooks) ============
  const vandaag = new Date().toISOString().split('T')[0]
  const btwGroepen = useMemo(
    () => groepeerBtwMetSelectie(items, selectedItems, selectedVariants, hasOptionalItems),
    [items, selectedItems, selectedVariants, hasOptionalItems],
  )
  const berekendeSubtotaal = useMemo(() => {
    let sum = 0
    for (const item of items) {
      if (item.soort === 'tekst') continue
      if (hasOptionalItems && !selectedItems.has(item.id)) continue
      sum += getEffectiveItemTotal(item, selectedVariants[item.id])
    }
    return round2(sum)
  }, [items, selectedItems, selectedVariants, hasOptionalItems])
  const berekendeBtw = useMemo(() => {
    return round2(btwGroepen.reduce((sum, g) => sum + g.btw, 0))
  }, [btwGroepen])
  // Het subtotaal is al netto: zonder dit bedrag leest de klant nergens terug wat
  // er van de prijs af ging. Alleen berekend over wat meetelt in het subtotaal.
  const kortingBedrag = useMemo(() => {
    let sum = 0
    for (const item of items) {
      if (item.soort === 'tekst') continue
      if (hasOptionalItems && !selectedItems.has(item.id)) continue
      for (const r of effectievePrijsRegels(item, selectedVariants[item.id])) {
        const bruto = r.aantal * r.eenheidsprijs
        sum += bruto - round2(bruto * (1 - (r.korting_percentage || 0) / 100))
      }
    }
    return round2(sum)
  }, [items, selectedItems, selectedVariants, hasOptionalItems])

  // ============ LOADING STATE ============
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F7F5]">
        <Toaster position="top-center" richColors />
        <div className="mx-auto max-w-[760px] space-y-6 px-4 pt-10 md:px-8">
          <Skeleton className="h-12 w-36 rounded-lg" />
          <div className="space-y-3 pt-6">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="space-y-5 rounded-xl bg-[#FFFFFF] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex justify-between gap-6">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ============ NOT FOUND ============
  if (notFound || !offerte) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F7F5] p-4">
        <Toaster position="top-center" richColors />
        <div className="w-full max-w-md space-y-4 rounded-xl bg-[#FFFFFF] p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F8F7F5]">
            <AlertTriangle className="h-8 w-8 text-[#9B9B95]" />
          </div>
          <h2 className="text-xl font-bold tracking-[-0.3px] text-[#1A1A1A]">Deze link werkt niet meer</h2>
          <p className="text-sm text-[#6B6B66]">
            De link naar deze offerte is niet geldig of verlopen. Neem contact op met het bedrijf dat u de offerte stuurde, dan ontvangt u een nieuwe link.
          </p>
        </div>
      </div>
    )
  }

  // ============ DERIVED STATE ============
  const isVerlopen = !!offerte.geldig_tot && offerte.geldig_tot < vandaag
  const isGeaccepteerd = offerte.status === 'goedgekeurd'
  const isAfgewezen = offerte.status === 'afgewezen'
  const isGefactureerd = offerte.status === 'gefactureerd'
  const isWijzigingGevraagd = offerte.status === 'wijziging_gevraagd'
  const kanActie = !isVerlopen && !isGeaccepteerd && !isAfgewezen && !isGefactureerd
  // Een verlopen offerte houdt bij een aanvraag zijn status (zie
  // offerte-wijziging), dus de aanvraag lezen we af aan het tijdstip: ná het
  // einde van de laatste geldige dag. Een wijzigingsverzoek van die laatste dag
  // telt niet, en een datumvergelijking in UTC viel net na middernacht verkeerd.
  const nieuweVersieGevraagd = isVerlopen && !!offerte.wijziging_ingediend_op
    && new Date(offerte.wijziging_ingediend_op).getTime() > new Date(`${offerte.geldig_tot}T23:59:59`).getTime()
  const dagenOver = dagenTotVerlopen(offerte.geldig_tot)
  const bijnaVerlopen = !isVerlopen && dagenOver >= 0 && dagenOver <= 7

  // Use live-computed totals if there are selections to make, otherwise use server totals.
  // Bij live-berekening ook de afrondingskorting meenemen, anders wijkt het
  // totaal af van de kortingsregel die eronder wordt getoond.
  const subtotaalBedrag = hasSelections ? berekendeSubtotaal : offerte.subtotaal
  const btwBedrag = hasSelections ? berekendeBtw : offerte.btw_bedrag
  const totaalBedrag = hasSelections
    ? round2(berekendeSubtotaal + berekendeBtw + (offerte.afrondingskorting_excl_btw ?? 0))
    : (offerte.aangepast_totaal ?? offerte.totaal)
  // De klant ziet exclusief btw als hoofdbedrag; inclusief btw staat er klein bij.
  const totaalExclBedrag = round2(totaalBedrag - btwBedrag)
  const toonInclRegel = round2(btwBedrag) !== 0

  const terugUrl = veiligeTerugUrl(new URLSearchParams(window.location.search).get('terug'))
  const klantLabel = klant?.bedrijfsnaam || offerte.klant_naam
  const contactVoornaam = voornaam(contactpersoon?.naam)
  const telefoon = bedrijf?.bedrijfs_telefoon
  const email = bedrijf?.bedrijfs_email
  const wijWie = contactVoornaam ? `${contactVoornaam} komt` : 'We komen'

  const keuzeUitleg = hasOptionalItems && hasVariants
    ? 'Kies hieronder de uitvoering en de opties die u wilt. Het totaal rekent direct mee.'
    : hasOptionalItems
    ? 'Vink de opties aan die u erbij wilt. Het totaal rekent direct mee.'
    : 'Kies hieronder de uitvoering die u wilt. Het totaal rekent direct mee.'

  const uwKeuze = hasSelections
    ? items
        .filter(i => i.soort !== 'tekst' && (!hasOptionalItems || selectedItems.has(i.id)))
        .flatMap(i => {
          const variantLabel = selectedVariants[i.id]
            ? i.prijs_varianten?.find(v => v.id === selectedVariants[i.id])?.label
            : undefined
          if (!i.is_optioneel && !variantLabel) return []
          const { titel } = splitsBeschrijving(i.beschrijving)
          return [{
            id: i.id,
            tekst: variantLabel ? `${titel}: ${variantLabel}` : titel,
            bedrag: getEffectiveItemTotal(i, selectedVariants[i.id]),
          }]
        })
    : []

  const pdfKnop = (
    <button
      type="button"
      onClick={handleDownloadPDF}
      disabled={pdfBezig}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1A535C] underline-offset-4 hover:underline disabled:opacity-50"
    >
      {pdfBezig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      PDF downloaden
    </button>
  )

  const stappen = [
    `${bedrijf?.bedrijfsnaam || 'We'} ${bedrijf?.bedrijfsnaam ? 'heeft' : 'hebben'} uw akkoord ontvangen.`,
    `${contactVoornaam ? `${contactVoornaam} neemt` : 'We nemen'} contact met u op over de planning.`,
    'Daarna gaan we voor u aan de slag.',
  ]

  return (
    <div className={`min-h-screen bg-[#F8F7F5] transition-opacity duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
      <Toaster position="top-center" richColors />

      <div className={`mx-auto max-w-[760px] px-4 pt-6 md:px-8 md:pt-10 ${kanActie ? 'pb-32 md:pb-16' : 'pb-16'}`}>

        {terugUrl && (
          <a
            href={terugUrl}
            className="mb-6 inline-flex items-center gap-1 text-sm text-[#6B6B66] transition-colors hover:text-[#1A1A1A]"
          >
            <ChevronLeft className="h-4 w-4" />
            Terug naar portaal
          </a>
        )}

        {/* ── Kop: van wie, voor wie, wat ── */}
        <header>
          {bedrijf?.logo_url ? (
            <img
              src={bedrijf.logo_url}
              alt={bedrijf.bedrijfsnaam || 'Bedrijfslogo'}
              className="h-12 w-auto max-w-[220px] object-contain object-left md:h-14"
            />
          ) : bedrijf?.bedrijfsnaam ? (
            <p className="text-xl font-extrabold tracking-[-0.3px] text-[#1A1A1A]">{bedrijf.bedrijfsnaam}</p>
          ) : (
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#1A535C]">
              <FileText className="h-6 w-6 text-white" />
            </div>
          )}

          {klantLabel && <p className="mt-10 text-sm text-[#6B6B66]">Offerte voor {klantLabel}</p>}
          <h1 className={`${klantLabel ? 'mt-1' : 'mt-10'} break-words text-[28px] font-bold leading-[1.15] tracking-[-0.3px] text-[#1A1A1A] md:text-[34px]`}>
            {offerte.titel || `Offerte ${offerte.nummer}`}
          </h1>
          {/* Op een telefoon staat de geldigheid op een eigen regel, zonder
              scheidingsteken: een losse punt aan het begin of eind van een
              regel oogt als een fout. */}
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#6B6B66]">
            <span className="font-mono">{offerte.nummer}</span>
            <span className="whitespace-nowrap">
              <span aria-hidden className="mr-2 text-[#C9C8C3]">·</span>
              <span className="font-mono">{formatDate(offerte.created_at)}</span>
            </span>
            {offerte.geldig_tot && (
              <span className={`w-full whitespace-nowrap sm:w-auto ${bijnaVerlopen ? 'text-[#C0451A]' : ''}`}>
                <span aria-hidden className="mr-2 hidden text-[#C9C8C3] sm:inline">·</span>
                Geldig tot <span className="font-mono">{formatDate(offerte.geldig_tot)}</span>
                {bijnaVerlopen && (dagenOver === 0 ? ' (vandaag de laatste dag)' : ` (nog ${dagenOver} ${dagenOver === 1 ? 'dag' : 'dagen'})`)}
              </span>
            )}
          </p>

          {contactpersoon && (
            <div className="mt-6 flex items-center gap-3">
              <Gezicht naam={contactpersoon.naam} fotoUrl={contactpersoon.foto_url} grootte={40} />
              <div className="min-w-0 text-sm leading-tight">
                <p className="font-medium text-[#1A1A1A]">{contactpersoon.naam}</p>
                <p className="mt-0.5 text-[#6B6B66]">
                  {contactpersoon.functie || 'Uw contactpersoon'}{bedrijf?.bedrijfsnaam ? ` bij ${bedrijf.bedrijfsnaam}` : ''}
                </p>
              </div>
            </div>
          )}
        </header>

        {/* ── Stand van zaken ── */}
        {(isGeaccepteerd || isGefactureerd) && (
          <Paneel className="mt-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E8F2EC]">
                <CheckCircle2 className="h-6 w-6 text-[#3A7D52]" />
              </span>
              <div className="min-w-0">
                <StatusKop kleur="#3A7D52">Akkoord ontvangen</StatusKop>
                <p className="mt-1 text-sm text-[#6B6B66]">
                  {offerte.geaccepteerd_op ? `Op ${formatDateTime(offerte.geaccepteerd_op)}` : 'Deze offerte is geaccepteerd'}
                  {offerte.geaccepteerd_door ? ` door ${offerte.geaccepteerd_door}` : ''}. Bedankt voor uw vertrouwen.
                </p>
              </div>
            </div>

            {isGeaccepteerd && (
              <ol className="mt-6 space-y-3 border-t border-[#EBEBEB] pt-6">
                {stappen.map((stap, i) => (
                  <li key={stap} className="flex items-start gap-3 text-sm">
                    {i === 0 ? (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3A7D52] text-white">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F8F7F5] font-mono text-xs text-[#6B6B66]">
                        {i + 1}
                      </span>
                    )}
                    <span className={`pt-0.5 ${i === 0 ? 'text-[#1A1A1A]' : 'text-[#6B6B66]'}`}>{stap}</span>
                  </li>
                ))}
              </ol>
            )}

            {netGeaccepteerd && klant?.email && (
              <p className="mt-5 text-sm text-[#6B6B66]">
                Een bevestiging is onderweg naar <span className="text-[#1A1A1A]">{klant.email}</span>.
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
              {pdfKnop}
              {terugUrl && (
                <a href={terugUrl} className="text-sm font-medium text-[#1A535C] underline-offset-4 hover:underline">
                  Naar uw projectportaal
                </a>
              )}
            </div>
          </Paneel>
        )}

        {isWijzigingGevraagd && (
          <Paneel className="mt-8 animate-in fade-in duration-500">
            <StatusKop kleur="#8A7A4A">Verzoek verstuurd</StatusKop>
            <p className="mt-1 text-sm text-[#6B6B66]">
              {offerte.wijziging_ingediend_op ? `Op ${formatDateTime(offerte.wijziging_ingediend_op)}. ` : ''}
              {wijWie} bij u terug met een aangepaste offerte.
            </p>
            {offerte.wijziging_opmerking && (
              <p className="mt-4 whitespace-pre-line border-l-2 border-[#EBEBEB] pl-4 text-sm italic text-[#6B6B66]">
                {offerte.wijziging_opmerking}
              </p>
            )}
          </Paneel>
        )}

        {isVerlopen && !isGeaccepteerd && !isAfgewezen && !isGefactureerd && !isWijzigingGevraagd && (
          <Paneel className="mt-8">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FDE8E4]">
                <Clock className="h-5 w-5 text-[#C0451A]" />
              </span>
              <div className="min-w-0">
                <StatusKop kleur="#C0451A">Verlopen</StatusKop>
                {nieuweVersieGevraagd ? (
                  <p className="mt-1 text-sm text-[#6B6B66]">
                    Deze offerte was geldig tot <span className="font-mono">{formatDate(offerte.geldig_tot)}</span>. Uw aanvraag voor een nieuwe versie is verstuurd op {formatDateTime(offerte.wijziging_ingediend_op || '')}. {wijWie} bij u terug.
                  </p>
                ) : (
                  <>
                    <p className="mt-1 text-sm text-[#6B6B66]">
                      Deze offerte was geldig tot <span className="font-mono">{formatDate(offerte.geldig_tot)}</span>. Vraag een nieuwe versie aan, dan {wijWie === 'We komen' ? 'komen we' : `komt ${contactVoornaam}`} bij u terug.
                    </p>
                    <button
                      type="button"
                      onClick={() => openVerzoek('nieuw')}
                      className="mt-4 inline-flex h-11 items-center rounded-xl bg-[#1A535C] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#15464E]"
                    >
                      Nieuwe offerte aanvragen
                    </button>
                  </>
                )}
              </div>
            </div>
          </Paneel>
        )}

        {isAfgewezen && (
          <Paneel className="mt-8">
            <StatusKop kleur="#6B6B66">Afgesloten</StatusKop>
            <p className="mt-1 text-sm text-[#6B6B66]">
              Deze offerte is gesloten. Wilt u toch verder? Neem contact op, dan kijken we samen naar een nieuwe versie.
            </p>
          </Paneel>
        )}

        {/* ── Aanhef ── */}
        {offerte.intro_tekst && (
          <p className="mt-10 whitespace-pre-line text-[15px] leading-relaxed text-[#3A3A35]">{offerte.intro_tekst}</p>
        )}

        {/* ── De offerte ── */}
        <section className="mt-8 overflow-hidden rounded-xl bg-[#FFFFFF] shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          {items.length > 0 && (
            <div className="px-6 py-6 md:px-8 md:py-8">
              {hasSelections && kanActie && (
                <p className="mb-6 text-sm text-[#1A535C]">{keuzeUitleg}</p>
              )}
              <div className="divide-y divide-[#EBEBEB]">
                {items.map((item) => (
                  <OfferteRegel
                    key={item.id}
                    item={item}
                    isSelected={selectedItems.has(item.id)}
                    gekozenVariantId={selectedVariants[item.id]}
                    kanActie={kanActie}
                    hasOptionalItems={hasOptionalItems}
                    onToggle={handleToggle}
                    onKiesVariant={handleKiesVariant}
                    onOpenAfbeelding={handleOpenAfbeelding}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Totalen */}
          <div className="border-t border-[#EBEBEB] bg-[#FBFAF8] px-6 py-6 md:px-8">
            <div className="flex flex-col-reverse gap-6 md:flex-row md:items-end md:justify-between">
              <div>{pdfKnop}</div>
              <div className="w-full space-y-2 md:max-w-xs">
                {kortingBedrag > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-[#6B6B66]">
                      <span>Subtotaal excl. btw</span>
                      <span className="font-mono">{formatCurrency(round2(subtotaalBedrag + kortingBedrag))}</span>
                    </div>
                    <div className="flex justify-between text-sm text-[#6B6B66]">
                      <span>Korting</span>
                      <span className="font-mono">-{formatCurrency(kortingBedrag)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-sm text-[#6B6B66]">
                  <span>{kortingBedrag > 0 ? 'Subtotaal na korting' : 'Subtotaal excl. btw'}</span>
                  <span className="font-mono">{formatCurrency(subtotaalBedrag)}</span>
                </div>
                {btwGroepen.map((g) => (
                  <div key={g.percentage} className="flex justify-between gap-4 text-sm text-[#6B6B66]">
                    <span>Btw {g.percentage}% over {formatCurrency(g.basis)}</span>
                    <span className="font-mono">{formatCurrency(g.btw)}</span>
                  </div>
                ))}
                {offerte.afrondingskorting_excl_btw != null && offerte.afrondingskorting_excl_btw !== 0 && (
                  <div className="flex justify-between text-sm text-[#6B6B66]">
                    <span>Afrondingskorting</span>
                    <span className="font-mono">-{formatCurrency(Math.abs(offerte.afrondingskorting_excl_btw))}</span>
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-4 border-t border-[#EBEBEB] pt-3">
                  <span className="text-base font-bold tracking-[-0.3px] text-[#1A1A1A]">Totaal excl. btw</span>
                  <span className="font-mono text-2xl font-bold tracking-[-0.3px] text-[#1A1A1A] md:text-3xl">
                    {formatCurrency(totaalExclBedrag)}
                  </span>
                </div>
                {toonInclRegel && (
                  <div className="flex justify-between text-sm text-[#6B6B66]">
                    <span>Totaal incl. btw</span>
                    <span className="font-mono">{formatCurrency(totaalBedrag)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Afsluiting ── */}
        {offerte.outro_tekst && (
          <p className="mt-8 whitespace-pre-line text-[15px] leading-relaxed text-[#3A3A35]">{offerte.outro_tekst}</p>
        )}

        {/* ── Besluit ── */}
        {kanActie && (
          <section className="mt-10">
            <div className="hidden items-center justify-between gap-6 rounded-xl bg-[#FFFFFF] px-8 py-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] md:flex">
              <div>
                <p className="text-sm text-[#6B6B66]">{uwKeuze.length > 0 ? 'Totaal met uw keuze, excl. btw' : 'Totaal excl. btw'}</p>
                <p className="font-mono text-2xl font-bold tracking-[-0.3px] text-[#1A1A1A]">{formatCurrency(totaalExclBedrag)}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAcceptModal(true)}
                className="h-12 rounded-xl bg-[#D24620] px-8 text-base font-semibold text-white transition-colors hover:bg-[#BD3F1C]"
              >
                Akkoord geven
              </button>
            </div>
            <p className="mt-4 text-center text-sm text-[#6B6B66] md:text-right">
              Nog niet helemaal wat u zoekt?{' '}
              <button
                type="button"
                onClick={() => openVerzoek('wijziging')}
                className="font-medium text-[#1A535C] underline-offset-4 hover:underline"
              >
                Vraag een aanpassing aan
              </button>
            </p>
          </section>
        )}

        {/* ── Contact ── */}
        {(contactpersoon || telefoon || email) && (
          <Paneel className="mt-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {contactpersoon && <Gezicht naam={contactpersoon.naam} fotoUrl={contactpersoon.foto_url} grootte={48} />}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[#1A1A1A]">Vragen over deze offerte?</p>
                <p className="mt-0.5 text-sm text-[#6B6B66]">
                  {contactVoornaam ? `${contactVoornaam} helpt u graag verder.` : `${bedrijf?.bedrijfsnaam || 'We'} ${bedrijf?.bedrijfsnaam ? 'helpt' : 'helpen'} u graag verder.`}
                </p>
              </div>
              {(telefoon || email) && (
                <div className="flex flex-wrap gap-2">
                  {telefoon && (
                    <a
                      href={`tel:${telefoon.replace(/[^\d+]/g, '')}`}
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#F8F7F5] px-4 text-sm font-medium text-[#1A535C] transition-colors hover:bg-[#F1F0EC]"
                    >
                      <Phone className="h-4 w-4" />
                      Bellen
                    </a>
                  )}
                  {email && (
                    <a
                      href={`mailto:${email}?subject=${encodeURIComponent(`Offerte ${offerte.nummer}`)}`}
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#F8F7F5] px-4 text-sm font-medium text-[#1A535C] transition-colors hover:bg-[#F1F0EC]"
                    >
                      <Mail className="h-4 w-4" />
                      Mailen
                    </a>
                  )}
                </div>
              )}
            </div>
          </Paneel>
        )}

        {/* ── Voorwaarden ── */}
        {offerte.voorwaarden && (
          <section className="mt-10">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[#9B9B95]">Voorwaarden</p>
            <p className="whitespace-pre-line text-xs leading-relaxed text-[#9B9B95]">{offerte.voorwaarden}</p>
          </section>
        )}

        {/* ── Footer ── */}
        <footer className="mt-12 space-y-1 text-center text-xs text-[#9B9B95]">
          <p>{bedrijf?.bedrijfsnaam}{bedrijf?.kvk_nummer ? ` · KvK ${bedrijf.kvk_nummer}` : ''}</p>
          {bedrijf?.bedrijfs_adres && <p>{bedrijf.bedrijfs_adres}</p>}
          {bedrijf?.bedrijfs_telefoon && <p>{bedrijf.bedrijfs_telefoon}</p>}
        </footer>
      </div>

      {/* ── Vaste besluitbalk op mobiel ── */}
      {kanActie && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-4 border-t border-[#EBEBEB] bg-[#FFFFFF]/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur md:hidden">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-[#9B9B95]">Totaal excl. btw</p>
            <p className="truncate font-mono text-lg font-bold leading-tight text-[#1A1A1A]">{formatCurrency(totaalExclBedrag)}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAcceptModal(true)}
            className="ml-auto h-12 shrink-0 rounded-xl bg-[#D24620] px-6 text-base font-semibold text-white transition-colors active:bg-[#BD3F1C]"
          >
            Akkoord geven
          </button>
        </div>
      )}

      {/* ── Akkoord geven ── */}
      {showAcceptModal && (
        <Sheet titel="Akkoord geven" onClose={() => setShowAcceptModal(false)}>
          <div className="rounded-xl bg-[#F8F7F5] p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#1A1A1A]">{offerte.titel || `Offerte ${offerte.nummer}`}</p>
                <p className="font-mono text-xs text-[#9B9B95]">{offerte.nummer}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-xl font-bold text-[#1A1A1A]">{formatCurrency(totaalExclBedrag)}</p>
                <p className="text-xs text-[#9B9B95]">
                  excl. btw{toonInclRegel ? ` · ${formatCurrency(totaalBedrag)} incl.` : ''}
                </p>
              </div>
            </div>
            {uwKeuze.length > 0 && (
              <div className="mt-3 space-y-1 border-t border-[#EBEBEB] pt-3 text-xs text-[#6B6B66]">
                <p className="font-medium text-[#1A1A1A]">Uw keuze</p>
                {uwKeuze.map(k => (
                  <div key={k.id} className="flex justify-between gap-3">
                    <span className="truncate">{k.tekst}</span>
                    <span className="shrink-0 font-mono">{formatCurrency(k.bedrag)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="akkoord-naam" className="text-sm font-medium text-[#1A1A1A]">Uw naam</label>
            <Input
              id="akkoord-naam"
              value={acceptNaam}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAcceptNaam(e.target.value)}
              placeholder="Voor- en achternaam"
              autoComplete="name"
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-[#1A1A1A]">Uw handtekening</p>
            <HandtekeningVeld onChange={setAcceptHandtekening} />
          </div>

          <p className="text-xs leading-relaxed text-[#6B6B66]">
            Met uw naam en handtekening geeft u akkoord op deze offerte
            {bedrijf?.bedrijfsnaam ? ` van ${bedrijf.bedrijfsnaam}` : ''}
            {uwKeuze.length > 0 ? ', met uw keuze hierboven' : ''}.
          </p>

          <button
            type="button"
            onClick={handleAccepteren}
            disabled={acceptLoading || acceptNaam.trim().length < 2 || !acceptHandtekening}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-[#D24620] text-base font-semibold text-white transition-colors hover:bg-[#BD3F1C] disabled:opacity-40"
          >
            {acceptLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Akkoord en ondertekenen'}
          </button>

          {klant?.email && (
            <p className="text-center text-xs text-[#9B9B95]">U ontvangt direct een bevestiging per mail.</p>
          )}
        </Sheet>
      )}

      {/* ── Aanpassing of nieuwe versie aanvragen ── */}
      {verzoekModus && (
        <Sheet
          titel={verzoekModus === 'nieuw' ? 'Nieuwe offerte aanvragen' : 'Aanpassing aanvragen'}
          onClose={() => setVerzoekModus(null)}
        >
          <p className="text-sm text-[#6B6B66]">
            {verzoekModus === 'nieuw'
              ? `Deze offerte is verlopen. ${wijWie} bij u terug met een nieuwe versie.`
              : `Laat weten wat u anders wilt. ${wijWie} bij u terug met een aangepaste offerte.`}
          </p>

          <div className="space-y-2">
            <label htmlFor="verzoek-bericht" className="text-sm font-medium text-[#1A1A1A]">Uw bericht</label>
            <textarea
              id="verzoek-bericht"
              value={wijzigingOpmerking}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setWijzigingOpmerking(e.target.value)}
              placeholder="Bijvoorbeeld: kan de lichtbak 20 cm breder?"
              className="min-h-[120px] w-full resize-none rounded-xl border border-[#EBEBEB] px-4 py-3 text-sm focus:border-[#1A535C] focus:outline-none focus:ring-2 focus:ring-[#1A535C]/30"
              autoFocus
            />
            {wijzigingOpmerking.trim().length > 0 && wijzigingOpmerking.trim().length < 10 && (
              <p className="text-xs text-[#9B9B95]">Nog een paar woorden, dan kunnen we u goed helpen.</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="verzoek-naam" className="text-sm font-medium text-[#1A1A1A]">Uw naam</label>
            <Input
              id="verzoek-naam"
              value={wijzigingNaam}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWijzigingNaam(e.target.value)}
              placeholder="Voor- en achternaam"
              autoComplete="name"
              className="h-12"
            />
          </div>

          <button
            type="button"
            onClick={handleWijziging}
            disabled={wijzigingLoading || wijzigingOpmerking.trim().length < 10}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-[#1A535C] text-base font-semibold text-white transition-colors hover:bg-[#15464E] disabled:opacity-40"
          >
            {wijzigingLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Versturen'}
          </button>
        </Sheet>
      )}

      {lightbox && (
        <PortaalLightbox
          images={[{ url: lightbox.url, bestandsnaam: lightbox.naam }]}
          startIndex={0}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  )
}
