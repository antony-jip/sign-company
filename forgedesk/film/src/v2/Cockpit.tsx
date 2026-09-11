import { ArrowLeft, CalendarDays, Pencil, Receipt, Play, Square, ChevronDown, Link2, Eye, MonitorSmartphone, FileText, Bold, Italic, Underline, List, Link as LinkIcon, Paperclip, Send, Image as ImageIcon, CreditCard, ClipboardCheck } from 'lucide-react'
import type { Project, Offerte, MontageAfspraak } from '@/types'
import { ProjectFaseBar } from '@/components/projects/cockpit/ProjectFaseBar'
import { BriefingCard } from '@/components/projects/cockpit/BriefingCard'
import { TakenOfferteGrid } from '@/components/projects/cockpit/TakenOfferteGrid'
import { ActiviteitCard } from '@/components/projects/cockpit/ActiviteitCard'
import { KlantCard } from '@/components/projects/cockpit/KlantCard'
import { TeamCard } from '@/components/projects/cockpit/TeamCard'
import { ActiesCard } from '@/components/projects/cockpit/ActiesCard'
import type { ActivityEvent } from '@/components/projects/cockpit/ActiviteitFeed'
import { AppVenster } from './DesktopChrome'
import { project, klant, contact, offerte, offerteItems, montage, medewerkers, portaalItemOfferte, portaalItemFoto, portaalItemFactuur, werkbonNummer, taakBellen } from '../mockData'
import { typ } from '../kern/Typ'
import { euro } from '../kern/Typ'
import { vlak, veer, ease } from '../tijd'
import { MailComposer, PANEEL_B } from './schermen/MailComposer'

// De projectcockpit (ProjectDetail, tab Overzicht) opgebouwd uit de echte
// kaarten waar die los zijn. Tijd en Portaal zijn nagebouwd met dezelfde
// klassen: die hangen in de app aan hooks en Supabase.
export type CockpitStand = {
  status: Project['status']
  offerteStatus?: Offerte['status'] | null
  montage?: boolean
  ingekloktSinds?: number | null   // ms in scenetijd waarop geklokt werd
  portaal: ('offerte' | 'foto' | 'factuur')[]
  portaalReactie?: boolean
  activiteiten: ActivityEvent[]
  tab?: 'Overzicht' | 'Werkbon' | 'Financieel' | 'E-mail' | 'Notities'
  bestanden?: string[]
  meldingen?: number
  composer?: { op: number; dichtOp: number; typOp: number; bijlageOp: number; opvolgenOp: number; verzendOp: number; kiezerOp?: number; kiesOp?: number }
  werkbon?: { dialoogOp: number; klaarOp: number }
  taak?: { dialoogOp: number; typOp: number; kiesOp: number; klaarOp: number }
  // Blokken die nog niet zichtbaar zijn (openvouwen), ms waarop elk opkomt.
  blokOp?: Partial<Record<'kop' | 'fase' | 'briefing' | 'grid' | 'portaal' | 'tijd' | 'klant' | 'team' | 'acties', number>>
  // Ms waarop een knop ingedrukt wordt (klik-landing, dus klikX + 80). Wat hier
  // ontbreekt wordt uit werkbon/taak afgeleid; de rest doet zonder waarde niets.
  klikOp?: Partial<Record<'offerteMaken' | 'factuurMaken' | 'werkbonMaken' | 'taakToevoegen' | 'taakSanne' | 'inklokken', number>>
  // Pagina-inhoud omhoog geschoven (px), alsof de gebruiker scrolt. Kop en rail blijven staan.
  scrollY?: number
}

const noop = async () => {}

// Geist-cascade per blok (HIGHEND 6, 8): paneel 300 ms, kop 200 ms na 50,
// inhoud 200 ms na 100, knoppen 150 ms na 150. De kop/inhoud/knop-lagen gaan
// als css-variabelen mee naar de app-componenten in het blok (zie CASCADE_CSS);
// in eigen markup worden ze via `laag()` direct gezet. Alles uit t, geen transitions.
type Cascade = { paneel: React.CSSProperties; vars: React.CSSProperties; laag: (naam: 'kop' | 'inhoud' | 'knop') => React.CSSProperties }
const geenLaag: React.CSSProperties = {}
const cascade = (t: number, op?: number): Cascade => {
  if (op === undefined || t >= op + 300) return { paneel: geenLaag, vars: geenLaag, laag: () => geenLaag }
  const p = vlak(t, op, op + 300, ease.enter)
  const kop = vlak(t, op + 50, op + 250, ease.uiUit)
  const inhoud = vlak(t, op + 100, op + 300, ease.uiUit)
  const knop = vlak(t, op + 150, op + 300, ease.uiUit)
  const stijl = (q: number, y: number): React.CSSProperties => q >= 1 ? geenLaag : { opacity: q, transform: `translateY(${(1 - q) * y}px)` }
  const lagen = { kop: stijl(kop, 6), inhoud: stijl(inhoud, 6), knop: stijl(knop, 4) }
  const vars = {
    '--ck': kop, '--ckt': kop >= 1 ? 'none' : `translateY(${(1 - kop) * 6}px)`,
    '--ci': inhoud, '--cit': inhoud >= 1 ? 'none' : `translateY(${(1 - inhoud) * 6}px)`,
    '--cb': knop, '--cbt': knop >= 1 ? 'none' : `translateY(${(1 - knop) * 4}px)`,
  } as React.CSSProperties
  return {
    paneel: { opacity: p, transform: `translateY(${(1 - p) * 10}px) scale(${0.96 + p * 0.04})`, transformOrigin: '50% 0' },
    vars,
    laag: (naam) => lagen[naam],
  }
}
// Kop = eerste kind van een app-paneel (de titelrij), inhoud = de rest, knoppen = button.
// De variabelen staan alleen tijdens de cascade op het blok; daarna is er geen stijl.
const CASCADE_CSS = `
[data-cascade] .doen-slate-surface > :first-child { opacity: var(--ck, 1); transform: var(--ckt, none); }
[data-cascade] .doen-slate-surface > :not(:first-child) { opacity: var(--ci, 1); transform: var(--cit, none); }
[data-cascade] button { opacity: var(--cb, 1); transform: var(--cbt, none); }
`

const Blok: React.FC<{ t: number; op?: number; children: React.ReactNode; className?: string }> = ({ t, op, children, className }) => {
  const c = cascade(t, op)
  const bezig = op !== undefined && t < op + 300
  return <div className={className} data-cascade={bezig ? '' : undefined} style={{ ...c.paneel, ...c.vars }}>{children}</div>
}

// Drukfeedback op een klik (HIGHEND 13): scale 0,97 in 120 ms, terug in 170 ms.
const druk = (t: number, klikMs?: number, diepte = 0.03) => {
  if (klikMs === undefined || t < klikMs || t >= klikMs + 290) return 1
  const heen = vlak(t, klikMs, klikMs + 120, ease.uiUit)
  const terug = vlak(t, klikMs + 120, klikMs + 290, ease.uiUit)
  return 1 - diepte * heen * (1 - terug)
}
const drukStijl = (s: number): React.CSSProperties => s >= 1 ? geenLaag : { transform: `scale(${s})`, transformOrigin: 'center' }

const formatKlok = (s: number) => `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

const PortaalMiniKaart: React.FC<{ soort: 'offerte' | 'foto' | 'factuur'; reactie?: boolean }> = ({ soort, reactie }) => {
  if (soort === 'offerte') return (
    <div className="rounded-xl bg-card ring-1 ring-border/50 overflow-hidden" style={{ boxShadow: 'inset 3px 0 0 #D24620, 0 1px 4px rgba(0,0,0,0.05)' }}>
      <div className="px-4 py-3">
        <p className="text-[11px] font-mono uppercase tracking-wide text-flame/80 flex items-center gap-1.5"><Receipt className="h-3.5 w-3.5" strokeWidth={2} />Offerte</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-[14px] font-semibold text-foreground">{portaalItemOfferte.titel}</p>
          <span className="font-mono text-[14px] font-semibold text-foreground">{euro(offerte.subtotaal)}</span>
        </div>
        <div className="flex gap-2 mt-3 pt-3 border-t border-border/40">
          <span className="flex-1 text-center text-[13px] font-medium py-2 bg-muted/40 border border-border/50 rounded-lg text-muted-foreground">Goedkeuren</span>
          <span className="flex-1 text-center text-[13px] font-medium py-2 bg-muted/40 border border-border/50 rounded-lg text-muted-foreground">Vragen stellen</span>
        </div>
      </div>
      {reactie && (
        <div className="px-4 py-2.5 border-t border-border/40 bg-[#E8F2EC] flex items-center gap-2 text-[12px]" style={{ color: '#3A7D52' }}>
          <ClipboardCheck className="h-3.5 w-3.5" /> <b>{contact.naam}</b> heeft goedgekeurd<span className="text-flame">.</span>
        </div>
      )}
    </div>
  )
  if (soort === 'factuur') return (
    <div className="rounded-xl bg-card ring-1 ring-border/50 overflow-hidden" style={{ boxShadow: 'inset 3px 0 0 #2D6B48, 0 1px 4px rgba(0,0,0,0.05)' }}>
      <div className="px-4 py-3">
        <p className="text-[11px] font-mono uppercase tracking-wide text-[#2D6B48]/80 flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" strokeWidth={2} />Factuur</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-[14px] font-semibold text-foreground">{portaalItemFactuur.titel}</p>
          <span className="font-mono text-[14px] font-semibold text-foreground">{euro(portaalItemFactuur.bedrag)}</span>
        </div>
      </div>
    </div>
  )
  return (
    <div className="rounded-xl bg-card ring-1 ring-border/50 overflow-hidden" style={{ boxShadow: 'inset 3px 0 0 #6A5A8A, 0 1px 4px rgba(0,0,0,0.05)' }}>
      <div className="px-4 py-3">
        <p className="text-[11px] font-mono uppercase tracking-wide text-[#6A5A8A]/80 flex items-center gap-1.5"><ImageIcon className="h-3.5 w-3.5" strokeWidth={2} />Foto</p>
        <p className="text-[14px] font-semibold text-foreground mt-1">{portaalItemFoto.titel}</p>
        <img src={portaalItemFoto.foto_url!} alt="" className="mt-2 rounded-lg w-full object-cover" style={{ height: 150 }} />
      </div>
    </div>
  )
}

export const Cockpit: React.FC<{ t: number; stand: CockpitStand }> = ({ t, stand }) => {
  const op = stand.blokOp ?? {}
  const offertes = stand.offerteStatus ? [{ ...offerte, status: stand.offerteStatus }] as Offerte[] : []
  const montages = stand.montage ? [montage] as MontageAfspraak[] : []
  const tab = stand.tab ?? 'Overzicht'
  const sec = stand.ingekloktSinds != null ? Math.max(0, Math.floor((t - stand.ingekloktSinds) / 1000)) : null
  const heeftOfferte = offertes.length > 0
  const factureerFase = ['afgerond', 'te-factureren', 'gefactureerd'].includes(stand.status)
  // Klik-landingen: werkbon/taak leveren klaarOp = klik + 200, kiesOp = klik.
  const klik = stand.klikOp ?? {}
  const drukWerkbon = druk(t, klik.werkbonMaken ?? (stand.werkbon ? stand.werkbon.klaarOp - 200 : undefined))
  const drukTaak = druk(t, klik.taakToevoegen ?? (stand.taak ? stand.taak.klaarOp - 200 : undefined))
  const drukSanne = druk(t, klik.taakSanne ?? stand.taak?.kiesOp)
  const drukKop = druk(t, factureerFase ? klik.factuurMaken : klik.offerteMaken)
  const drukInklokken = druk(t, klik.inklokken)
  const kopC = cascade(t, op.kop)
  const portaalC = cascade(t, op.portaal)
  const tijdC = cascade(t, op.tijd)
  return (
    <AppVenster actief="Projecten" moduleTitel="Projecten" meldingen={stand.meldingen ?? 4} tabs={[{ label: 'Email' }, { label: 'Projecten' }, { label: klant.bedrijfsnaam, actief: true }]}>
      <style>{CASCADE_CSS}</style>
      <div className="absolute inset-0 overflow-hidden">
        {/* Ankers: na het sluiten van een dialoog blijft de laatste knoppositie meetbaar voor de punt */}
        {stand.taak && t >= stand.taak.klaarOp + 300 && <span data-doel="taak-toevoegen" style={{ position: 'absolute', left: '62%', top: '55%', width: 1, height: 1 }} />}
        {stand.werkbon && t >= stand.werkbon.klaarOp + 300 && <span data-doel="werkbon-maken" style={{ position: 'absolute', left: '62%', top: '58%', width: 1, height: 1 }} />}
        {stand.composer && t >= stand.composer.op && t < stand.composer.dichtOp + 400 && (() => {
          const c = stand.composer
          const inP = veer(t, c.op, { demping: 20, duurMs: 700 })
          const uitP = vlak(t, c.dichtOp, c.dichtOp + 400, ease.in)
          const x = (1 - inP) * PANEEL_B + uitP * PANEEL_B
          return (
            <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: PANEEL_B, zIndex: 30, transform: `translateX(${x}px)`, boxShadow: '-24px 0 60px -20px rgba(26,83,92,0.25)' }}>
              <MailComposer t={t} stand={{ typOp: c.typOp, bijlageOp: c.bijlageOp, opvolgenOp: c.opvolgenOp, verzendOp: c.verzendOp, kiezerOp: c.kiezerOp, kiesOp: c.kiesOp }} />
            </div>
          )
        })()}
        {stand.taak && t >= stand.taak.dialoogOp && t < stand.taak.klaarOp + 300 && (() => {
          const k = stand.taak
          const inP = veer(t, k.dialoogOp, { demping: 16, duurMs: 600 })
          const zicht = t < k.klaarOp ? vlak(t, k.dialoogOp, k.dialoogOp + 200) : 1 - vlak(t, k.klaarOp, k.klaarOp + 250)
          const titel = typ(taakBellen.titel, t, k.typOp, 34)
          const gekozen = t >= k.kiesOp
          const kleuren = ['bg-[hsl(var(--status-green-bg))] text-[#3A7D52]', 'bg-[hsl(var(--status-blue-bg))] text-[#3A5A9A]']
          return (
            <div style={{ position: 'absolute', inset: 0, zIndex: 40, backgroundColor: 'rgba(0,0,0,0.30)', backdropFilter: 'blur(3px)', opacity: zicht, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="bg-card rounded-modal shadow-elevation-lg w-[560px] p-6" style={{ transform: `translateY(${(1 - inP) * 24}px) scale(${0.96 + inP * 0.04})` }}>
                <h2 className="font-heading text-[18px] font-bold text-foreground">Nieuwe taak</h2>
                <div className="mt-4 h-11 rounded-md border border-input bg-background px-3 flex items-center text-[15px] text-foreground">{titel || <span className="text-muted-foreground">Titel van de taak</span>}{titel.length > 0 && titel.length < taakBellen.titel.length && <span className="text-flame ml-px">|</span>}</div>
                <p className="mt-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Toewijzen aan</p>
                <div className="flex flex-wrap gap-1.5">
                  {medewerkers.map((mw, i) => {
                    const sel = gekozen && mw.naam === 'Sanne'
                    return <span key={mw.id} data-doel={mw.naam === 'Sanne' ? 'taak-sanne' : undefined} className={`inline-flex items-center h-8 px-3 rounded-full text-[13px] font-medium ${kleuren[i % 2]} ${sel ? 'ring-2 ring-petrol' : ''}`} style={mw.naam === 'Sanne' ? drukStijl(drukSanne) : undefined}>{mw.naam}</span>
                  })}
                </div>
                <div className="mt-5 flex items-center justify-end gap-2">
                  <span className="h-9 px-4 rounded-lg border border-border text-[13px] font-medium text-foreground inline-flex items-center">Annuleren</span>
                  <span data-doel="taak-toevoegen" className="h-9 px-4 rounded-lg bg-petrol text-white text-[13px] font-semibold inline-flex items-center" style={{ opacity: titel.length > 3 && gekozen ? 1 : 0.5, ...drukStijl(drukTaak) }}>Taak toevoegen</span>
                </div>
              </div>
            </div>
          )
        })()}
        {stand.werkbon && t >= stand.werkbon.dialoogOp && t < stand.werkbon.klaarOp + 2600 && (() => {
          const w = stand.werkbon
          const open = t < w.klaarOp
          const inP = veer(t, w.dialoogOp, { demping: 16, duurMs: 600 })
          const zicht = open ? vlak(t, w.dialoogOp, w.dialoogOp + 200) : 1 - vlak(t, w.klaarOp, w.klaarOp + 250)
          const toastP = veer(t, w.klaarOp + 200, { demping: 16, duurMs: 600 })
          return (
            <>
              {open || t < w.klaarOp + 250 ? (
                <div style={{ position: 'absolute', inset: 0, zIndex: 40, backgroundColor: 'rgba(0,0,0,0.30)', backdropFilter: 'blur(3px)', opacity: zicht, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="bg-card rounded-modal shadow-elevation-lg w-[560px] p-6" style={{ transform: `translateY(${(1 - inP) * 24}px) scale(${0.96 + inP * 0.04})` }}>
                    <h2 className="font-heading text-[18px] font-bold text-foreground">Werkbon maken</h2>
                    <p className="text-[13px] text-muted-foreground mt-1">Werkbon voor montage "{montage.titel}"</p>
                    <div className="mt-4 rounded-lg border border-border px-3 py-2 flex items-center justify-between text-[13px]"><span className="text-foreground">{offerte.nummer} · {offerte.titel}</span><ChevronDown className="h-4 w-4 text-muted-foreground" /></div>
                    <label className="mt-4 flex items-center gap-2.5 text-sm font-medium text-foreground"><span className="h-4 w-4 rounded border border-petrol bg-petrol flex items-center justify-center"><ClipboardCheck className="h-3 w-3 text-white" /></span>Alles selecteren (3 items)</label>
                    <div className="mt-2 divide-y divide-border rounded-lg border border-border">
                      {offerteItems.map((r) => <div key={r.id} className="px-3 py-2 flex items-center gap-2.5 text-[13px] text-foreground"><span className="h-4 w-4 rounded border border-petrol bg-petrol flex items-center justify-center"><ClipboardCheck className="h-3 w-3 text-white" /></span>{r.beschrijving}</div>)}
                    </div>
                    <div className="mt-5 flex items-center justify-end gap-2">
                      <span className="h-9 px-4 rounded-lg border border-border text-[13px] font-medium text-foreground inline-flex items-center">Terug</span>
                      <span data-doel="werkbon-maken" className="h-9 px-4 rounded-lg bg-flame text-white text-[13px] font-semibold inline-flex items-center gap-1.5" style={drukStijl(drukWerkbon)}><ClipboardCheck className="h-3.5 w-3.5" />Werkbon maken (3)</span>
                    </div>
                  </div>
                </div>
              ) : null}
              {t >= w.klaarOp + 200 && (
                <div className="absolute z-40 rounded-xl bg-card px-4 py-3 text-[13px] font-medium text-foreground shadow-[0_12px_32px_rgba(120,90,50,0.16)] flex items-center gap-2" style={{ left: '50%', bottom: 28, transform: `translateX(-50%) translateY(${(1 - toastP) * 20}px)`, opacity: vlak(t, w.klaarOp + 200, w.klaarOp + 400) * (1 - vlak(t, w.klaarOp + 2200, w.klaarOp + 2600)), border: '0.5px solid hsl(var(--border))' }}>
                  <ClipboardCheck className="h-4 w-4" style={{ color: '#3A7D52' }} />Werkbon {werkbonNummer} aangemaakt met 3 items
                </div>
              )}
            </>
          )
        })()}
        {/* Kop */}
        <div style={stand.scrollY ? { transform: `translateY(${-stand.scrollY}px)` } : undefined}>
        <Blok t={t} op={op.kop} className="px-8 pt-6 relative">
          <div style={kopC.laag('kop')}>
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 text-petrol font-medium"><ArrowLeft className="h-3.5 w-3.5 text-flame" /> Projecten</span>
              <span className="text-muted-foreground/70">·</span>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-muted text-foreground/80">{project.project_nummer}</span>
            </div>
            <h1 className="font-heading text-[40px] font-bold leading-tight tracking-[-0.025em] text-foreground mt-2">{project.naam}<span className="text-flame">.</span></h1>
          </div>
          <div className="flex items-center gap-2 mt-1 text-[13px]" style={kopC.laag('inhoud')}>
            <span className="font-semibold text-foreground/80">{klant.bedrijfsnaam}</span>
            <span className="text-muted-foreground">· {klant.stad.toUpperCase()}</span>
            <span className="text-muted-foreground/70">·</span>
            <span className="text-[12px] text-muted-foreground">aangemaakt 14 september 2026 door Antony Bootsma</span>
            <span className="text-muted-foreground/70">·</span>
            <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" strokeWidth={1.75} />{project.eind_datum ? <span className="font-medium text-foreground/80">deadline 24 sep</span> : <span className="text-muted-foreground/60">+ deadline</span>}</span>
          </div>
          <div className="absolute top-4 right-8 z-20 flex items-center gap-2" style={kopC.laag('knop')}>
            {heeftOfferte ? (
              <>
                <span className="btn-primary-flame text-[13px] !py-[9px] !px-4 inline-flex items-center gap-1.5"><Pencil className="h-3.5 w-3.5" />Offerte bewerken</span>
                <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-petrol/30 bg-card text-petrol text-[13px] font-medium"><Receipt className="h-3.5 w-3.5" />{factureerFase ? 'Maak factuur' : 'Maak factuur'}</span>
              </>
            ) : (
              <span data-doel={factureerFase ? 'factuur-maken' : 'offerte-maken'} className="btn-primary-flame text-[13px] !py-[9px] !px-4 inline-flex items-center gap-1.5" style={drukStijl(drukKop)}>{factureerFase ? <><Receipt className="h-3.5 w-3.5" />Factuur maken</> : <><Pencil className="h-3.5 w-3.5" />Offerte maken</>}</span>
            )}
          </div>
          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-border mt-4" style={kopC.laag('inhoud')}>
            {(['Overzicht', 'Werkbon', 'Financieel', 'E-mail', 'Notities'] as const).map((naam) => (
              <span key={naam} className={`relative inline-flex items-center gap-2 px-3 py-2.5 text-[14px] ${tab === naam ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                {naam}
                {tab === naam && <span className="absolute bottom-0 left-2.5 right-2.5 h-[2.5px] rounded-t-full bg-flame" />}
              </span>
            ))}
          </div>
        </Blok>

        </div>
        {/* Overzicht: twee kolommen */}
        <div className="flex gap-8 px-8 py-6" style={stand.scrollY ? { transform: `translateY(${-stand.scrollY}px)` } : undefined}>
          <div className="flex-1 min-w-0 space-y-6">
            <Blok t={t} op={op.fase}><div data-doel="blok-fase"><ProjectFaseBar status={stand.status} onStatusChange={() => {}} totaalBedrag={heeftOfferte ? offerte.subtotaal : undefined} deadline={project.eind_datum} /></div></Blok>
            <Blok t={t} op={op.briefing}><div data-doel="blok-briefing"><BriefingCard beschrijving={project.beschrijving} projectNaam={project.naam} klantNaam={klant.bedrijfsnaam} onSave={noop} /></div></Blok>
            <Blok t={t} op={op.grid}>
              <div data-doel="blok-grid"><TakenOfferteGrid taken={stand.taak && t >= stand.taak.klaarOp ? [taakBellen] : []} offertes={offertes} montageAfspraken={montages} medewerkers={medewerkers} projectId={project.id} onNewTaak={() => {}} onNewOfferte={() => {}} onNewMontage={() => {}} onTaakStatusChange={noop} /></div>
            </Blok>
            <Blok t={t} op={op.portaal}>
              <div data-doel="blok-portaal" className="rounded-2xl overflow-hidden ring-1 ring-border/60 bg-card">
                <div className="flex items-center justify-between px-5 py-3.5 text-white" style={{ background: 'linear-gradient(135deg, #1A535C, #143F46)', ...portaalC.laag('kop') }}>
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"><MonitorSmartphone className="h-4 w-4" /></span>
                    <div>
                      <p className="text-[14px] font-bold leading-tight flex items-center gap-1">Portaal <ChevronDown className="h-3.5 w-3.5 opacity-70" /></p>
                      <p className="text-[12px] opacity-85 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#8AD1B5]" />Actief<span className="text-flame">.</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[12px]">
                    <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/10"><Link2 className="h-3.5 w-3.5" />Kopieer link</span>
                    <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/10"><Eye className="h-3.5 w-3.5" />Bekijk als klant</span>
                  </div>
                </div>
                <div className="px-5 py-4" style={portaalC.laag('inhoud')}>
                  {stand.portaal.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-sm font-medium text-foreground">Nog niets gedeeld</p>
                      <p className="text-[12px] text-muted-foreground mt-1 max-w-[46ch] mx-auto">Deel offertes, tekeningen, foto's of facturen met je klant via het portaal. Je klant kan reageren en goedkeuren.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">{stand.portaal.map((s) => <PortaalMiniKaart key={s} soort={s} reactie={s === 'offerte' && stand.portaalReactie} />)}</div>
                  )}
                  <div className="mt-4 rounded-xl border border-border overflow-hidden">
                    <div className="flex items-center gap-3 px-3 py-2 border-b border-border text-muted-foreground"><Bold className="h-3.5 w-3.5" /><Italic className="h-3.5 w-3.5" /><Underline className="h-3.5 w-3.5" /><List className="h-3.5 w-3.5" /><LinkIcon className="h-3.5 w-3.5" /><span className="w-px h-4 bg-border" /><Paperclip className="h-3.5 w-3.5" /></div>
                    <p className="px-3 py-3 text-[13px] text-muted-foreground">Bericht...</p>
                  </div>
                  <div className="mt-3 flex items-center gap-2" style={portaalC.laag('knop')}>
                    {[['Tekening', FileText], ['Offerte', Receipt], ['OB', ClipboardCheck], ['Factuur', CreditCard], ['Foto', ImageIcon]].map(([naam, Icon]) => { const I = Icon as typeof FileText; return <span key={naam as string} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-[13px] text-foreground"><I className="h-3.5 w-3.5" />{naam as string}</span> })}
                    <span className="ml-auto w-9 h-9 rounded-full bg-petrol/15 text-petrol flex items-center justify-center"><Send className="h-4 w-4" /></span>
                  </div>
                  <div className="mt-3 flex items-center gap-3 rounded-xl bg-muted/60 px-4 py-2.5 text-[13px]" style={portaalC.laag('knop')}>
                    <span className="w-9 h-5 rounded-full bg-petrol relative"><span className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white" /></span>
                    <span className="font-medium text-foreground">Klant notificeren per email</span>
                    <span className="text-muted-foreground">Klant ontvangt een email bij verzending</span>
                  </div>
                </div>
              </div>
            </Blok>
            {stand.activiteiten.length > 0 && <Blok t={t}><ActiviteitCard events={stand.activiteiten} /></Blok>}
          </div>

          <div className="w-[380px] flex-shrink-0 space-y-6">
            <Blok t={t} op={op.tijd}>
              <div data-doel="blok-tijd" className="doen-slate-surface rounded-2xl p-5">
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="font-heading text-[15px] font-bold text-foreground">Tijd<span className="text-flame">.</span></h3>
                  <span className="doen-subtitel">hoelang wordt er gewerkt?</span>
                </div>
                {sec != null ? (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[22px] font-semibold leading-none tabular-nums text-foreground">{formatKlok(sec)}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">ingeklokt sinds 09:41</div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-flame text-white text-[13px] font-medium" style={tijdC.laag('knop')}><Square className="h-3.5 w-3.5" strokeWidth={2.25} />Uitklokken</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span data-doel="inklokken" className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-petrol text-white text-[13px] font-medium" style={{ ...tijdC.laag('knop'), ...drukStijl(drukInklokken) }}><Play className="h-3.5 w-3.5" strokeWidth={2.25} />Inklokken</span>
                    <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">Bewerking <ChevronDown className="h-3 w-3" /></span>
                  </div>
                )}
              </div>
            </Blok>
            <Blok t={t} op={op.klant}>
              <div data-doel="blok-klant"><KlantCard klant={klant} project={{ ...project, contactpersoon_id: contact.id }} contactpersonen={[contact]} onContactpersoonChange={noop} onContactpersoonAdd={noop} onMail={() => {}} /></div>
            </Blok>
            <Blok t={t} op={op.team}><div data-doel="blok-team"><TeamCard teamLeden={['mw-2']} medewerkers={medewerkers} onChange={noop} /></div></Blok>
            <Blok t={t} op={op.acties}>
              <div style={{ position: 'relative' }}>
                <ActiesCard onOfferte={() => {}} onWerkbon={() => {}} onMontage={() => {}} onFactuur={() => {}} onPakbon={() => {}} onBevestiging={() => {}} onTePlannen={() => {}} />
                <span data-doel="acties-werkbon" style={{ position: 'absolute', left: '74%', top: '38%', width: 1, height: 1 }} />
              </div>
            </Blok>
          </div>
        </div>
      </div>
    </AppVenster>
  )
}
