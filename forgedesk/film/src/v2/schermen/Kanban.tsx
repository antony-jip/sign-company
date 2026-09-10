import { GripVertical, MoreHorizontal, Mail, Search, ChevronDown, Plus, LayoutGrid, List } from 'lucide-react'
import { AppVenster } from '../DesktopChrome'
import { klant, project } from '../../mockData'
import { euro } from '../../kern/Typ'
import { ease, vlak } from '../../tijd'

// Het projectenbord (ProjectKanban) op desktop. De echte component hangt aan
// drag-and-drop en dropdowns; dit is de nabouw met dezelfde klassen en vaste
// maten, zodat de verhuizing van onze kaart uit t te berekenen is.
export type KanbanStand = {
  kolom: 'gepland' | 'in-review' | 'akkoord-klant' | 'ingepland' | 'te-factureren'
  wisselOp?: number
}

type Kolom = { id: string; label: string; kleur: string; kaarten: Kaart[] }
type Kaart = { naam: string; klant: string; bedrag?: number; deadline?: string }

// Kleuren via kolomKleur → getFase, zelfde volgorde als KOLOM_STATUSSEN.
const KOLOMMEN: Kolom[] = [
  { id: 'te-plannen', label: 'Te plannen', kleur: '#3A6B8C', kaarten: [
    { naam: 'Verlichting in zuil nakijken', klant: 'Keukenstudio Wester' },
    { naam: 'Gevelbord', klant: 'Taxi Centrale Veluwe', bedrag: 795 },
    { naam: 'Nieuwe signing De Klimop', klant: 'Kinderopvang De Klimop', bedrag: 1635 },
    { naam: 'Bewegwijzering sporthal', klant: 'Gemeente Ermelo' },
  ] },
  { id: 'gepland', label: 'Gepland', kleur: '#D24620', kaarten: [
    { naam: 'Raambelettering bakkerij', klant: 'Bakkerij Hendriks' },
    { naam: 'Spandoek open dag', klant: 'Autobedrijf Smit', bedrag: 210 },
    { naam: 'Deursticker', klant: 'Fysio Harderwijk', bedrag: 145 },
    { naam: 'Vlaggen kantoorpand', klant: 'Bouwbedrijf Ter Horst', bedrag: 675 },
    { naam: 'Bestelbus beletteren', klant: 'Installatiebedrijf Vos', bedrag: 1280 },
  ] },
  { id: 'in-review', label: 'In review', kleur: '#3A6B8C', kaarten: [
    { naam: 'Logo op bedrijfsbus', klant: 'Hoveniersbedrijf Groen', bedrag: 350 },
    { naam: 'Beplakken glazen wanden', klant: 'Notariskantoor Bos', bedrag: 1555 },
    { naam: 'Lichtbak tankstation', klant: 'Tankstation De Brug', bedrag: 3650 },
  ] },
  { id: 'akkoord-klant', label: 'Akkoord klant', kleur: '#D4453A', kaarten: [
    { naam: 'Logo wapen gemeentehuis', klant: 'Gemeente Putten', bedrag: 2227.5 },
    { naam: 'Beursitems', klant: 'Metaalbewerking Leba', bedrag: 4455 },
    { naam: 'Zonwerende folie', klant: 'Accountants Van Dijk', bedrag: 3475 },
  ] },
  { id: 'ingepland', label: 'Ingepland', kleur: '#3A6B8C', kaarten: [
    { naam: 'Meerwerk showroom', klant: 'Keukenstudio Wester', bedrag: 900 },
    { naam: 'Popfest 2026', klant: 'Stichting Popfest', bedrag: 3455 },
    { naam: 'Zuil of bord locatie', klant: 'Zorggroep De Beek', bedrag: 615 },
    { naam: 'Lichtreclame', klant: 'Mechanisatie Nap', deadline: '30 sep' },
  ] },
  { id: 'actief', label: 'Actief', kleur: '#6A5A8A', kaarten: [
    { naam: 'Gevelletters kantoor', klant: 'Heilbron Advocaten', bedrag: 2890 },
    { naam: 'Autobelettering 3 wagens', klant: 'Dakdekkers Damen', bedrag: 1740 },
    { naam: 'Logo trappenhuis', klant: 'OBS De Piramide', bedrag: 420 },
  ] },
  { id: 'te-factureren', label: 'Te factureren', kleur: '#2D6B48', kaarten: [
    { naam: 'Bewegwijzering parkeergarage', klant: 'Parkeerbeheer Zuid', bedrag: 5120 },
    { naam: 'Vlaggenmast met vlag', klant: 'Sedum Daktuinen', bedrag: 880 },
    { naam: 'Uithangbord', klant: 'Café De Wester', bedrag: 640 },
  ] },
]

const KOL_B = 240
const KOL_GAP = 10
const KOL_KOP_H = 34
const KAART_H = 62
const ONS_H = 80
const KAART_GAP = 6
const ONS_INDEX = 1
const PAD_X = 24
const PAD_Y = 16
const ZICHT_B = 1376 - 2 * PAD_X
const BORD_B = KOLOMMEN.length * KOL_B + (KOLOMMEN.length - 1) * KOL_GAP
const WISSEL_MS = 700

const onsKaart: Kaart = { naam: project.naam, klant: klant.bedrijfsnaam, bedrag: 4250 }

const kolomX = (i: number) => i * (KOL_B + KOL_GAP)
const slotY = (index: number) => KOL_KOP_H + index * (KAART_H + KAART_GAP)

const KaartInhoud: React.FC<{ kaart: Kaart; ons?: boolean }> = ({ kaart, ons }) => (
  <div className="flex items-start gap-1.5">
    <GripVertical className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${ons ? 'text-muted-foreground/60' : 'text-muted-foreground/0'}`} strokeWidth={1.75} />
    <div className="min-w-0 flex-1">
      <div className="text-[13px] font-semibold text-foreground leading-[1.3] line-clamp-2">{kaart.naam}</div>
      <div className="flex items-center justify-between gap-2 mt-0.5">
        <span className="text-[11.5px] text-muted-foreground truncate">{kaart.klant}</span>
        <span className="inline-flex items-center gap-1 flex-shrink-0">
          {kaart.bedrag && <span className="font-mono text-[11.5px] text-foreground/80 tabular-nums whitespace-nowrap">{euro(kaart.bedrag)}</span>}
          {ons && (
            <span data-doel="kanban-mail" className="h-6 w-6 rounded flex items-center justify-center text-petrol bg-petrol/10">
              <Mail className="h-3.5 w-3.5" strokeWidth={1.75} />
            </span>
          )}
        </span>
      </div>
      {kaart.deadline && (
        <div className="mt-1 inline-flex items-center gap-1 text-[10.5px] font-mono text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#C03A18' }} />{kaart.deadline}</div>
      )}
    </div>
    <span className={`flex-shrink-0 h-7 w-7 -mr-0.5 -mt-0.5 rounded flex items-center justify-center text-muted-foreground ${ons ? '' : 'opacity-0'}`}><MoreHorizontal className="h-4 w-4" /></span>
  </div>
)

export const Kanban: React.FC<{ t: number; stand: KanbanStand }> = ({ t, stand }) => {
  const naarIdx = KOLOMMEN.findIndex((k) => k.id === stand.kolom)
  const wisselt = stand.wisselOp !== undefined && t >= stand.wisselOp
  const vanIdx = wisselt ? naarIdx - 1 : naarIdx
  const p = wisselt ? vlak(t, stand.wisselOp!, stand.wisselOp! + WISSEL_MS, ease.inUit) : 1
  const lift = wisselt ? Math.sin(Math.PI * p) : 0

  // Het bord schuift naar rechts zodra onze kaart in de laatste kolommen staat.
  const pan = naarIdx >= 5 ? -(BORD_B - ZICHT_B) : 0

  const x = kolomX(vanIdx) + (kolomX(naarIdx) - kolomX(vanIdx)) * p
  const y = slotY(ONS_INDEX)

  return (
    <AppVenster actief="Projecten" moduleTitel="Projecten" tabs={[{ label: 'Email' }, { label: klant.bedrijfsnaam }, { label: 'Projecten', actief: true }]}>
      <div className="absolute inset-0 overflow-hidden flex flex-col">
        <div className="flex items-center gap-3 px-6 border-b border-border/60 flex-shrink-0" style={{ height: 48 }}>
          <span className="flex items-center gap-1 text-[14px] font-semibold text-petrol">Alle projecten <ChevronDown className="h-4 w-4 opacity-50" /></span>
          <span className="h-4 w-px bg-[rgba(26,83,92,0.12)]" />
          <span className="flex items-center gap-2 h-8 px-3 rounded-lg bg-muted text-[13px] text-muted-foreground" style={{ width: 220 }}><Search className="h-3.5 w-3.5" />Zoek project...</span>
          <span className="flex-1" />
          <span className="flex rounded-lg bg-[hsl(38,20%,95.5%)] p-0.5 text-[12px]">
            <span className="px-2.5 py-1 rounded-md font-medium text-muted-foreground inline-flex items-center gap-1.5"><List className="h-3.5 w-3.5" />Lijst</span>
            <span className="px-2.5 py-1 rounded-md font-medium bg-white text-petrol shadow-sm inline-flex items-center gap-1.5"><LayoutGrid className="h-3.5 w-3.5" />Kolommen</span>
          </span>
          <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold text-white bg-flame shadow-[0_1px_3px_rgba(210,70,32,0.25)]"><Plus className="h-3.5 w-3.5" strokeWidth={2.5} />Nieuw project</span>
        </div>

        <div className="relative flex-1 min-h-0" style={{ padding: `${PAD_Y}px ${PAD_X}px` }}>
          <div className="relative flex" style={{ gap: KOL_GAP, width: BORD_B, transform: `translateX(${pan}px)` }}>
            {KOLOMMEN.map((kolom, i) => {
              const isVan = i === vanIdx
              const isNaar = i === naarIdx
              const slotH = isNaar && isVan ? ONS_H : isNaar ? ONS_H * p : isVan ? ONS_H * (1 - p) : 0
              const telt = isNaar ? 1 : 0
              const som = kolom.kaarten.reduce((s, k) => s + (k.bedrag ?? 0), 0) + (isNaar ? onsKaart.bedrag! : 0)
              return (
                <section key={kolom.id} className="flex-shrink-0 flex flex-col rounded-lg bg-muted/40 border border-border/50" style={{ width: KOL_B, borderTop: `2px solid ${kolom.kleur}` }}>
                  <header className="flex items-center justify-between gap-2 px-2.5" style={{ height: KOL_KOP_H - 2 }}>
                    <span className="inline-flex items-baseline gap-1.5 min-w-0">
                      <span className="font-heading text-[12.5px] font-bold text-foreground truncate">{kolom.label}</span>
                      <span className="font-mono text-[10.5px] text-muted-foreground tabular-nums">{kolom.kaarten.length + telt}</span>
                    </span>
                    <span className="font-mono text-[11.5px] text-muted-foreground tabular-nums whitespace-nowrap">{som > 0 ? euro(som) : ''}</span>
                  </header>
                  <div className="flex flex-col px-1.5 pb-1.5" style={{ gap: KAART_GAP }}>
                    {kolom.kaarten.map((kaart, idx) => (
                      <div key={kaart.naam} className="contents">
                        {idx === ONS_INDEX && (isVan || isNaar) && (
                          <div style={{ height: slotH, marginBottom: -KAART_GAP * (1 - slotH / ONS_H) }} />
                        )}
                        <article className="relative rounded-md bg-card border border-border/70 pl-2.5 pr-1.5 py-2 select-none overflow-hidden" style={{ height: kaart.deadline ? KAART_H + 18 : KAART_H }}>
                          <KaartInhoud kaart={kaart} />
                        </article>
                      </div>
                    ))}
                  </div>
                </section>
              )
            })}

            {/* Onze kaart, los van de kolommen zodat hij kan verhuizen. */}
            <article
              className="absolute rounded-md bg-card border border-petrol/40 pl-2.5 pr-1.5 py-2 select-none"
              style={{
                left: x + 7, top: y, width: KOL_B - 14, height: ONS_H,
                transform: `scale(${1 + 0.03 * lift}) rotate(${1.5 * lift}deg)`,
                boxShadow: `0 ${1 + 10 * lift}px ${3 + 20 * lift}px rgba(13,52,60,${0.08 + 0.14 * lift})`,
                zIndex: 20,
              }}
            >
              <KaartInhoud kaart={onsKaart} ons />
            </article>
          </div>
        </div>
      </div>
    </AppVenster>
  )
}
