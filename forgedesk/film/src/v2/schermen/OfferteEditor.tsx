import { ArrowLeft, Save, Send, ChevronDown, ChevronUp, Globe, Mail, Plus, GripVertical, Calculator, Clock, Wrench, Download, ToggleLeft, Copy, Trash2, X, Minus } from 'lucide-react'
import { AppVenster } from '../DesktopChrome'
import { offerte, offerteItems, klant, contact, project } from '../../mockData'
import { typ, tel, euro } from '../../kern/Typ'
import { SplitFlap } from '../../kern/SplitFlap'
import { veer, vlak } from '../../tijd'

// Offerte-editor op desktop, nagebouwd uit QuoteCreation: kop uit QuoteHeader,
// itemkaarten uit QuoteItemsTable (naam, beschrijving-regels, prijsberekening
// met de Calculator achter de stuksprijs), zijbalk uit QuoteSidebar en de
// calculatie als CalculatieModal-overlay. De echte editor hangt aan twintig
// hooks; dit zijn dezelfde klassen zonder state.
export type EditorStand = { regelsOp: number; calculatieOp?: number; calculatieDichtOp?: number; verstuurTikOp: number; keuzeOp: number; keuzeTikOp: number; flapOp: number }

type CalcRegel = { product: string; aantal: number; eenheid: string; inkoop: number; verkoop: number; urenveld?: string }

// Calculatie van item 1 (LED-gevelletters). Verkooptotaal is exact de stuksprijs.
const CALCULATIE: CalcRegel[] = [
  { product: 'LED-doosletter RVS 60 cm, wit 6500K', aantal: 8, eenheid: 'stuk', inkoop: 85, verkoop: 200 },
  { product: 'Translucent folie 3M 3630, wit', aantal: 2, eenheid: 'm²', inkoop: 22, verkoop: 45 },
  { product: 'LED-voeding 12V 100W', aantal: 1, eenheid: 'stuk', inkoop: 56, verkoop: 110 },
  { product: 'Productie werkplaats', aantal: 6, eenheid: 'uur', inkoop: 35, verkoop: 75, urenveld: 'Productie' },
  { product: 'Montage en aansluiten', aantal: 2, eenheid: 'uur', inkoop: 40, verkoop: 100, urenveld: 'Montage' },
]

// Per offerte-item: inkoop uit de (verborgen) calculatie, uren per urenveld,
// en de beschrijving-regels van item 1.
const ITEMS = [
  { inkoop: CALCULATIE.reduce((s, r) => s + r.inkoop * r.aantal, 0), uren: { Productie: 6, Montage: 2 }, regels: CALCULATIE.length },
  { inkoop: 560, uren: { Productie: 4, Montage: 2 }, regels: 4 },
  { inkoop: 340, uren: { Productie: 0, Montage: 4 }, regels: 2 },
]
const DETAILS: [string, string][] = [
  ['Aantal', '8 letters'],
  ['Materiaal', 'RVS doosletters, LED wit 6500K'],
  ['Formaat', '60 cm hoog, 8 cm diep'],
  ['Montage', 'Op afstandhouders aan de gevel'],
]
const UREN_VELDEN = ['Productie', 'Montage'] as const

// getMargeColorSidebar uit QuoteCreation: markup t.o.v. inkoop.
const margeKleur = (pct: number) =>
  pct >= 90 ? { text: 'text-[#2D6B48]', bar: 'bg-[#2D6B48]' }
  : pct >= 60 ? { text: 'text-amber-600', bar: 'bg-amber-500' }
  : { text: 'text-[#C03A18]', bar: 'bg-[#C03A18]' }
const markup = (inkoop: number, verkoop: number) => (inkoop > 0 ? ((verkoop - inkoop) / inkoop) * 100 : 0)

const Label: React.FC<{ children: React.ReactNode; rechts?: boolean }> = ({ children, rechts }) => (
  <label className={`text-xs font-medium text-muted-foreground block ${rechts ? 'text-right' : ''}`}>{children}</label>
)
const Veld: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`h-9 rounded-md border border-border bg-background text-sm flex items-center px-3 font-mono tabular-nums ${className ?? ''}`}>{children}</div>
)

export const OfferteEditor: React.FC<{ t: number; stand: EditorStand }> = ({ t, stand }) => {
  const perRegel = 900
  const regels = offerteItems.map((r, i) => {
    const van = stand.regelsOp + i * perRegel
    return { r, tekst: typ(r.beschrijving, t, van, 20), bedrag: tel(r.totaal, t, van + 400, 500), zicht: vlak(t, van, van + 120), inkoop: tel(ITEMS[i].inkoop, t, van + 400, 500), uren: ITEMS[i].uren, calcRegels: ITEMS[i].regels }
  })
  const subtotaal = regels.reduce((s, z) => s + z.bedrag, 0)
  const btw = subtotaal * 0.21
  const inkoop = regels.reduce((s, z) => s + z.inkoop, 0)
  const winst = subtotaal - inkoop
  const marge = markup(inkoop, subtotaal)
  const mk = margeKleur(marge)
  const urenPerVeld = Object.fromEntries(UREN_VELDEN.map((v) => [v, regels.reduce((s, z) => s + (z.zicht > 0 ? z.uren[v] : 0), 0)])) as Record<(typeof UREN_VELDEN)[number], number>
  const totaalUren = UREN_VELDEN.reduce((s, v) => s + urenPerVeld[v], 0)

  const keuzeP = veer(t, stand.keuzeOp, { demping: 16, duurMs: 500 })
  const keuzeZicht = t >= stand.keuzeOp && t < stand.flapOp ? vlak(t, stand.keuzeOp, stand.keuzeOp + 150) : 0
  const verstuurd = t >= stand.flapOp
  const tik = (op: number) => t >= op && t < op + 200

  // Calculatie: veer-pop bij openen, korte fade bij sluiten.
  const calcOpen = stand.calculatieOp !== undefined && t >= stand.calculatieOp && (stand.calculatieDichtOp === undefined || t < stand.calculatieDichtOp + 220)
  const calcP = stand.calculatieOp !== undefined ? veer(t, stand.calculatieOp, { demping: 15, duurMs: 520 }) : 0
  const calcDicht = stand.calculatieDichtOp !== undefined ? vlak(t, stand.calculatieDichtOp, stand.calculatieDichtOp + 220) : 0
  const calcZicht = Math.min(vlak(t, stand.calculatieOp ?? 0, (stand.calculatieOp ?? 0) + 160), 1 - calcDicht)
  const calcVerkoop = CALCULATIE.reduce((s, r) => s + r.verkoop * r.aantal, 0)
  const calcInkoop = CALCULATIE.reduce((s, r) => s + r.inkoop * r.aantal, 0)
  const calcMarge = markup(calcInkoop, calcVerkoop)

  const eerste = regels[0]
  const eersteMarge = markup(ITEMS[0].inkoop, offerteItems[0].totaal)
  const eersteKleur = margeKleur(eersteMarge)

  return (
    <AppVenster actief="Offertes" moduleTitel="Offertes" tabs={[{ label: 'Email' }, { label: klant.bedrijfsnaam }, { label: 'Nieuwe offerte', actief: true }]}>
      <div className="absolute inset-0 overflow-hidden">
        {/* QuoteHeader */}
        <div className="bg-background border-b border-[rgba(26,83,92,0.08)] px-8 py-4 mb-5">
          <div className="flex items-center gap-1.5 text-[12px] mb-2">
            <span className="inline-flex items-center gap-1 text-muted-foreground"><ArrowLeft className="h-3 w-3" />Project</span>
            <span className="text-muted-foreground/70">·</span>
            <span className="font-mono text-[11px] font-medium text-foreground/70 bg-[rgba(26,83,92,0.05)] border border-[rgba(26,83,92,0.08)] rounded-md px-1.5 py-0.5">{offerte.nummer}</span>
          </div>
          <div className="flex items-baseline justify-between gap-6">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-3">
                <h1 className="text-[32px] font-extrabold text-foreground tracking-[-0.5px] leading-none">Nieuwe offerte<span className="text-flame">.</span></h1>
                <div style={{ transform: 'translateY(2px)' }}>
                  <SplitFlap t={t} op={stand.flapOp} van="concept" naar="verstuurd" kleurVan="#5A5A55" kleurNaar="#3A5A9A" hoogte={26} fontSize={15} achtergrond="hsl(var(--background))" />
                </div>
              </div>
              <p className="text-[13px] text-muted-foreground mt-2">{klant.bedrijfsnaam} · project {project.project_nummer} · geldig tot 14 okt</p>
            </div>
            <div className="flex items-center gap-2 relative">
              <span className="inline-flex items-center gap-1.5 h-9 px-3.5 text-[13px] font-medium rounded-xl border border-[rgba(26,83,92,0.12)] bg-white text-foreground/70"><Download className="h-3.5 w-3.5" />PDF</span>
              <span className="inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-semibold rounded-xl bg-petrol text-white"><Save className="h-3.5 w-3.5" />Opslaan</span>
              <div className="relative flex items-center">
                <span data-doel="verstuur" className="inline-flex items-center justify-center gap-2 h-9 px-5 text-sm font-semibold rounded-l-xl bg-flame text-white shadow-[0_2px_8px_rgba(210,70,32,0.25)]" style={{ opacity: verstuurd ? 0.6 : 1, transform: tik(stand.verstuurTikOp) ? 'scale(0.96)' : undefined }}><Send className="h-4 w-4" strokeWidth={1.75} />{verstuurd ? 'Verstuurd' : 'Verstuur'}</span>
                <span className="inline-flex items-center h-9 px-2 text-sm rounded-r-xl bg-[#E04520] text-white border-l border-white/25 shadow-[0_2px_8px_rgba(210,70,32,0.25)]"><ChevronDown className="h-3.5 w-3.5" /></span>
                {/* Keuzemenu Via portaal / Via email, QuoteHeader */}
                <div className="absolute right-0 top-full mt-2 z-50 w-72 doen-slate-surface rounded-[16px] shadow-[0_12px_40px_rgba(0,0,0,0.10),0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden" style={{ opacity: keuzeZicht, transform: `translateY(${(1 - keuzeP) * -8}px)` }}>
                  <div data-doel="via-portaal" className="w-full text-left px-4 py-3 border-b border-[rgba(26,83,92,0.08)]" style={{ backgroundColor: tik(stand.keuzeTikOp) ? 'hsl(38,20%,95.5%)' : undefined }}>
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-lg bg-petrol flex items-center justify-center flex-shrink-0 shadow-[0_2px_6px_rgba(20,62,71,0.2)]"><Globe className="h-4 w-4" strokeWidth={1.75} color="#FFFFFF" /></div>
                      <div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-foreground">Via portaal</p><p className="text-[11px] text-muted-foreground leading-snug mt-0.5">Klant bekijkt online + email-notificatie</p></div>
                    </div>
                  </div>
                  <div className="w-full text-left px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-lg bg-flame flex items-center justify-center flex-shrink-0 shadow-[0_2px_6px_rgba(210,70,32,0.25)]"><Mail className="h-4 w-4" strokeWidth={1.75} color="#FFFFFF" /></div>
                      <div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-foreground">Via email</p><p className="text-[11px] text-muted-foreground leading-snug mt-0.5">PDF-bijlage + gepersonaliseerde email</p></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 grid gap-4" style={{ gridTemplateColumns: '1fr 320px' }}>
          {/* Links: Offerte-items (QuoteItemsTable) */}
          <div className="min-w-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading text-[15px] font-bold text-foreground flex items-center">
                <span>Offerte-items<span className="text-flame">.</span></span>
                <span className="ml-2 font-mono text-[10px] font-semibold bg-[rgba(210,70,32,0.1)] text-flame rounded-full px-1.5 py-0.5 min-w-[18px] text-center tabular-nums">{regels.filter((z) => z.zicht > 0).length}</span>
              </h3>
            </div>
            <div className="space-y-4">
              {regels.map(({ r, tekst, bedrag, zicht, calcRegels }, i) => {
                const open = i === 0
                const cursor = tekst.length < r.beschrijving.length
                return (
                  <div key={r.id} className="rounded-xl border border-border bg-card overflow-hidden shadow-sm" style={{ opacity: zicht, transform: `translateY(${(1 - zicht) * 10}px)` }}>
                    {/* Kop: nummer, naam, totaal, acties */}
                    <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-background/80">
                      <div className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-accent to-primary"><span className="text-xs font-bold text-white">{i + 1}</span></div>
                      <p className="h-9 flex items-center text-sm font-semibold flex-1 min-w-0 px-3">{tekst || <span className="font-normal text-muted-foreground/50">Item naam...</span>}<span className="text-flame" style={{ opacity: cursor ? 1 : 0 }}>|</span></p>
                      <span className="text-base font-bold font-mono min-w-[90px] text-right tabular-nums text-foreground" style={{ opacity: bedrag > 0 ? 1 : 0 }}>{euro(bedrag)}</span>
                      <ToggleLeft className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                      {open ? <ChevronUp className="h-4 w-4 text-muted-foreground/60 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground/60 flex-shrink-0" />}
                      <Copy className="h-4 w-4 text-muted-foreground/60 flex-shrink-0" />
                      <Trash2 className="h-4 w-4 text-muted-foreground/60 flex-shrink-0" />
                    </div>
                    {open && (
                      <>
                        {/* Beschrijving-regels */}
                        <div className="px-4 py-3 border-b border-border">
                          <div className="divide-y divide-[rgba(26,83,92,0.08)]">
                            {DETAILS.map(([label, waarde], j) => {
                              const w = typ(waarde, t, stand.regelsOp + 700 + j * 260, 14)
                              return (
                                <div key={label} className="flex items-center gap-2 h-8">
                                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 flex-shrink-0" />
                                  <span className="w-32 flex-shrink-0 text-[12px] font-semibold text-petrol px-2">{label}</span>
                                  <span className="flex-1 text-sm text-foreground px-2">{w || <span className="text-muted-foreground/40">Vul in</span>}</span>
                                </div>
                              )
                            })}
                          </div>
                          <p className="text-xs font-medium text-flame pt-2 pl-2">+ Beschrijving toevoegen</p>
                        </div>
                        {/* Prijsberekening: Aantal x Prijs [Calculator] | BTW | Korting | = Totaal */}
                        <div className="px-4 py-2 bg-background/50">
                          <div className="flex items-end gap-3">
                            <div className="space-y-1 w-20"><Label>Aantal</Label><Veld>{r.aantal}</Veld></div>
                            <span className="text-muted-foreground pb-2 text-sm">&times;</span>
                            <div className="space-y-1 flex-1 min-w-[140px] max-w-[200px]">
                              <Label>Prijs per stuk</Label>
                              <div className="relative">
                                <Veld className="pl-7 pr-10"><span className="absolute left-3 text-muted-foreground font-sans">&euro;</span>{bedrag > 0 ? r.eenheidsprijs.toFixed(2).replace('.', ',') : ''}</Veld>
                                <span data-doel="calculatie" className={`absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md flex items-center justify-center ${bedrag > 0 ? 'bg-[rgba(26,83,92,0.10)] text-petrol' : 'bg-muted text-muted-foreground'}`} style={{ transform: `translateY(-50%) scale(${stand.calculatieOp !== undefined && tik(stand.calculatieOp) ? 0.9 : 1})` }}><Calculator className="h-4 w-4" /></span>
                              </div>
                            </div>
                            <div className="space-y-1 w-24"><Label>BTW</Label><Veld className="justify-between font-sans">{r.btw_percentage}%<ChevronDown className="h-3.5 w-3.5 opacity-50" /></Veld></div>
                            <div className="space-y-1 w-24"><Label>Korting</Label><Veld className="justify-end"><span className="text-muted-foreground font-sans">%</span></Veld></div>
                            <div className="space-y-1 ml-auto">
                              <Label rechts>Totaal</Label>
                              <div className="h-9 flex items-center justify-end"><span className="text-base font-bold font-mono text-foreground tabular-nums" style={{ opacity: bedrag > 0 ? 1 : 0 }}>{euro(bedrag)}</span></div>
                            </div>
                          </div>
                          {/* Calculatie-indicator met marge per item */}
                          <div className="mt-2 pt-2 border-t border-border" style={{ opacity: bedrag >= r.totaal ? 1 : 0 }}>
                            <p className="text-xs font-medium text-petrol flex items-center gap-1"><Calculator className="h-3 w-3" />Calculatie: {calcRegels} regels · Inkoop {euro(ITEMS[0].inkoop)} · Verkoop {euro(r.totaal)}</p>
                            <div className="mt-1.5 flex items-center gap-2">
                              <span className={`text-xs font-semibold ${eersteKleur.text}`}>Marge: {eersteMarge.toFixed(1)}%</span>
                              <span className="text-xs text-muted-foreground">({euro(r.totaal - ITEMS[0].inkoop)})</span>
                              <div className="flex-1 h-1.5 rounded-full bg-secondary max-w-[120px]"><div className={`h-full rounded-full ${eersteKleur.bar}`} style={{ width: `${Math.min(100, eersteMarge)}%` }} /></div>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-border"><p className="flex items-center gap-1.5 text-xs font-medium text-flame"><Copy className="h-3 w-3" />Prijsvariant toevoegen</p></div>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
              <div className="flex-1 py-3 rounded-xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground flex items-center justify-center gap-2" style={{ opacity: regels[2].zicht }}><Plus className="h-4 w-4" />Item toevoegen</div>
            </div>
          </div>

          {/* Rechts: QuoteSidebar (klant + samenvatting) */}
          <div className="space-y-4">
            <div className="doen-slate-surface rounded-2xl overflow-hidden">
              <div className="w-full flex items-center gap-2.5 px-4 py-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-[0_2px_6px_rgba(58,107,140,0.2)]" style={{ background: 'linear-gradient(135deg, #3A6B8C 0%, #2A5580 50%, #D24620 200%)' }}><span className="text-white font-extrabold text-[12px]">{klant.bedrijfsnaam[0]}</span></div>
                <div className="flex-1 text-left min-w-0"><p className="text-[13px] font-bold truncate text-foreground">{klant.bedrijfsnaam}</p><p className="text-[11px] truncate text-muted-foreground">t.a.v. {contact.naam}</p></div>
                <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
              </div>
            </div>

            <div className="doen-slate-surface rounded-2xl overflow-hidden">
              <div className="p-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1A535C 0%, #0F3D44 100%)' }}>
                <div aria-hidden className="absolute -top-8 -right-8 w-32 h-32 rounded-full" style={{ background: 'radial-gradient(circle, rgba(210,70,32,0.18) 0%, transparent 70%)' }} />
                <p className="relative text-[10px] uppercase tracking-widest text-white/75 font-semibold">Totaal ex BTW<span className="text-flame">.</span></p>
                <p className="relative text-[24px] font-extrabold font-mono tabular-nums text-white mt-0.5">{euro(subtotaal)}</p>
                <p className="relative text-[11px] text-white/65 mt-1">incl. btw <span className="font-mono tabular-nums">{euro(subtotaal + btw)}</span></p>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-card border border-[rgba(26,83,92,0.08)] p-2.5"><p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Subtotaal</p><p className="text-[13px] font-bold font-mono text-foreground mt-0.5 tabular-nums">{euro(subtotaal)}</p></div>
                  <div className="rounded-lg bg-card border border-[rgba(26,83,92,0.08)] p-2.5"><p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">BTW</p><p className="text-[13px] font-bold font-mono text-foreground mt-0.5 tabular-nums">{euro(btw)}</p></div>
                </div>
                <div className="h-px bg-[rgba(26,83,92,0.08)]" />
                <div className="space-y-2.5">
                  <h4 className="text-[10px] font-semibold uppercase tracking-widest text-foreground/70">Inkoop &amp; verkoop<span className="text-flame">.</span></h4>
                  <div className="space-y-1.5 text-[13px]">
                    <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" /><span className="text-foreground/70">Inkoop</span></div><span className="font-mono tabular-nums font-semibold text-foreground/80">{inkoop > 0 ? euro(inkoop) : '—'}</span></div>
                    <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-petrol" /><span className="text-foreground/70">Verkoop</span></div><span className="font-mono tabular-nums font-semibold text-foreground">{euro(subtotaal)}</span></div>
                    <div className="flex items-center justify-between pt-1.5 border-t border-[rgba(26,83,92,0.08)]"><div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#2D6B48]" /><span className="text-foreground font-semibold">Winst</span></div><span className="font-mono tabular-nums font-bold text-[#2D6B48]">{inkoop > 0 ? euro(winst) : '—'}</span></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-[10px] font-semibold uppercase tracking-widest text-foreground/70">Marge<span className="text-flame">.</span></h4>
                  <div className="doen-slate-surface rounded-xl p-3 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2"><span className="text-[11px] font-semibold text-foreground/70 uppercase tracking-widest">%</span><span className={`text-[18px] font-extrabold font-mono tabular-nums ${mk.text}`}>{inkoop > 0 ? `${marge.toFixed(1)}%` : '—'}</span></div>
                    <div className="h-2 rounded-full bg-[rgba(26,83,92,0.08)] overflow-hidden" style={{ opacity: inkoop > 0 ? 1 : 0 }}><div className={`h-full rounded-full ${mk.bar}`} style={{ width: `${Math.min(100, Math.max(0, marge))}%`, boxShadow: '0 0 8px rgba(45,107,72,0.45)' }} /></div>
                  </div>
                </div>
                <div className="h-px bg-[rgba(26,83,92,0.08)]" />
                <div className="space-y-2" style={{ opacity: totaalUren > 0 ? 1 : 0.35 }}>
                  <h4 className="text-[10px] font-semibold uppercase tracking-widest text-foreground/70">Uren<span className="text-flame">.</span></h4>
                  <div className="space-y-1.5 text-[13px]">
                    {UREN_VELDEN.map((veld) => (
                      <div key={veld} className="flex items-center justify-between">
                        <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-petrol" /><span className="text-foreground/70">{veld}</span></div>
                        <div className="flex items-center gap-1">
                          <span className="h-6 w-6 rounded-md flex items-center justify-center bg-card border border-[rgba(26,83,92,0.12)] text-petrol"><Minus className="h-3 w-3" /></span>
                          <span className="font-mono font-semibold tabular-nums min-w-[3.25rem] text-right text-foreground">{urenPerVeld[veld]} uur</span>
                          <span className="h-6 w-6 rounded-md flex items-center justify-center bg-card border border-[rgba(26,83,92,0.12)] text-petrol"><Plus className="h-3 w-3" /></span>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-1.5 border-t border-[rgba(26,83,92,0.08)]"><div className="flex items-center gap-2"><Wrench className="h-3.5 w-3.5 text-flame" /><span className="font-semibold text-foreground">Totaal uren</span></div><span className="font-mono tabular-nums font-bold text-flame">{totaalUren} uur</span></div>
                  </div>
                </div>
                <div className="pt-3 border-t border-[rgba(26,83,92,0.08)] grid grid-cols-3 gap-2">
                  <span className="inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-flame text-white text-[12px] font-semibold shadow-[0_2px_8px_rgba(210,70,32,0.25)]"><Send className="h-3.5 w-3.5" />Verstuur</span>
                  <span className="inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-card border border-[rgba(26,83,92,0.12)] text-foreground/70 text-[12px] font-semibold"><Download className="h-3.5 w-3.5" />PDF</span>
                  <span className="inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-petrol text-white text-[12px] font-semibold"><Save className="h-3.5 w-3.5" />Opslaan</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CalculatieModal als overlay in het venster */}
        {calcOpen && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center" style={{ backgroundColor: `rgba(0,0,0,${0.3 * calcZicht})`, backdropFilter: `blur(${4 * calcZicht}px)` }}>
            <div className="relative w-full max-w-5xl border border-border bg-card text-card-foreground p-6 shadow-elevation-lg rounded-modal flex flex-col gap-4" style={{ opacity: calcZicht, transform: `scale(${0.95 + 0.05 * calcP})` }}>
              <span className="absolute right-3 top-3 h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground"><X className="h-3.5 w-3.5" /></span>
              <div className="flex flex-col space-y-1.5 pb-1">
                <h2 className="flex items-center gap-2.5 text-2xl font-bold text-foreground"><Calculator className="h-6 w-6 text-petrol" />Calculatie maken</h2>
                <p className="text-foreground/70 text-sm">Bouw hier de prijs op uit losse onderdelen. Vul inkoop- en verkoopprijzen in, de marge wordt automatisch berekend.</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Omschrijving offerte-regel</p>
                <div className="h-10 text-sm font-medium bg-white border border-[rgba(26,83,92,0.12)] rounded-lg flex items-center px-3">{eerste.r.beschrijving}</div>
              </div>
              <div>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-background">
                      <th className="text-left px-3 py-2.5 text-[12px] font-medium text-muted-foreground min-w-[200px]">Product</th>
                      <th className="text-right px-2 py-2.5 text-[12px] font-medium text-muted-foreground w-20">Aantal</th>
                      <th className="text-left px-2 py-2.5 text-[12px] font-medium text-muted-foreground w-20">Eenheid</th>
                      <th className="text-right px-2 py-2.5 text-[12px] font-medium text-muted-foreground w-32">Inkoop</th>
                      <th className="text-right px-2 pl-4 py-2.5 text-[12px] font-medium text-muted-foreground w-32 border-l border-petrol/10">Verkoop</th>
                      <th className="text-right px-2 py-2.5 text-[12px] font-medium text-muted-foreground w-20">Marge</th>
                      <th className="text-right px-3 py-2.5 text-[12px] font-medium text-muted-foreground w-32">Totaal</th>
                      <th className="w-16" />
                    </tr>
                  </thead>
                  <tbody>
                    {CALCULATIE.map((regel, i) => {
                      const rijZicht = vlak(t, (stand.calculatieOp ?? 0) + 120 + i * 80, (stand.calculatieOp ?? 0) + 300 + i * 80)
                      const pct = markup(regel.inkoop, regel.verkoop)
                      return (
                        <tr key={regel.product} className="border-b border-border/40 bg-card" style={{ opacity: rijZicht }}>
                          <td className="px-2 py-1.5"><div className="flex items-center gap-1.5 h-8 px-2"><span className="text-sm text-foreground">{regel.product}</span>{regel.urenveld && <span className="shrink-0 rounded-full bg-[rgba(26,83,92,0.08)] px-2 py-0.5 text-[10.5px] font-medium text-petrol">{regel.urenveld}</span>}</div></td>
                          <td className="px-2 py-1.5 text-right font-mono tabular-nums text-sm">{regel.aantal}</td>
                          <td className="px-1 py-1.5 text-xs px-3">{regel.eenheid}</td>
                          <td className="px-2 py-1.5 text-right font-mono tabular-nums text-sm">{euro(regel.inkoop)}</td>
                          <td className="px-2 pl-4 py-1.5 text-right font-mono tabular-nums text-sm border-l border-petrol/10">{euro(regel.verkoop)}</td>
                          <td className="px-2 py-1.5 text-right font-mono tabular-nums text-sm text-[#2D6B48]">{Math.round(pct)}%</td>
                          <td className="px-3 py-1.5 text-right"><span className="font-semibold font-mono tabular-nums text-sm text-foreground">{euro(regel.verkoop * regel.aantal)}</span></td>
                          <td className="px-1 py-1.5" />
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <div className="w-full mt-2 h-8 rounded-md border border-dashed border-border-subtle text-muted-foreground text-xs font-medium flex items-center justify-center gap-1.5"><Plus className="h-3.5 w-3.5" />Regel toevoegen</div>
              </div>
              <div className="overflow-hidden rounded-xl border border-border">
                <div className="flex items-center justify-between gap-6 px-4 py-3">
                  <div className="flex items-center gap-6">
                    <div className="flex items-baseline gap-2"><span className="text-sm text-muted-foreground">Inkoop</span><span className="font-mono tabular-nums text-base text-foreground/70">{euro(calcInkoop)}</span></div>
                    <div className="flex items-baseline gap-2"><span className="text-sm text-muted-foreground">Verkoop</span><span className="font-mono tabular-nums text-base text-foreground">{euro(calcVerkoop)}</span></div>
                    <div className="flex items-baseline gap-2"><span className="text-sm text-muted-foreground">Marge</span><span className="font-mono tabular-nums text-base font-medium text-[#2D6B48]">{euro(calcVerkoop - calcInkoop)}</span><span className="text-sm text-muted-foreground/70">({Math.round(calcMarge)}%)</span></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right leading-tight">
                      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Verkooptotaal<span className="text-flame">.</span></div>
                      <div className="font-mono tabular-nums text-2xl font-bold text-petrol">{euro(calcVerkoop)}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border p-0.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-md text-petrol"><Minus className="h-4 w-4" /></span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-md text-petrol"><Plus className="h-4 w-4" /></span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <span className="inline-flex items-center justify-center h-10 px-4 rounded-lg border border-border-subtle bg-card text-sm font-medium text-foreground shadow-elevation-xs">Annuleren</span>
                <span data-doel="calculatie-sluiten" className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg text-sm font-medium text-white" style={{ background: 'linear-gradient(135deg,#D24620 0%,#D4453A 100%)', boxShadow: '0 2px 8px rgba(210,70,32,0.3)', transform: stand.calculatieDichtOp !== undefined && tik(stand.calculatieDichtOp) ? 'scale(0.96)' : undefined }}><Save className="h-4 w-4" />Calculatie overnemen</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppVenster>
  )
}
