import { Save, Send, ChevronDown, Globe, Mail, Plus, GripVertical, Calculator, Clock } from 'lucide-react'
import { AppVenster } from '../DesktopChrome'
import { offerte, offerteItems, klant, project } from '../../mockData'
import { typ, tel, euro } from '../../kern/Typ'
import { SplitFlap } from '../../kern/SplitFlap'
import { veer, vlak } from '../../tijd'

// Offerte-editor op desktop: kop uit QuoteHeader, regels uit QuoteItemsTable,
// zijbalk met marge en uren uit QuoteSidebar. De editor zelf hangt aan
// twintig hooks; dit is de nabouw met dezelfde klassen.
export type EditorStand = { regelsOp: number; verstuurTikOp: number; keuzeOp: number; keuzeTikOp: number; flapOp: number }

const KOSTPRIJS = [1480, 690, 380]
const UREN = [6, 3, 4]

export const OfferteEditor: React.FC<{ t: number; stand: EditorStand }> = ({ t, stand }) => {
  const perRegel = 900
  const regels = offerteItems.map((r, i) => {
    const van = stand.regelsOp + i * perRegel
    return { r, tekst: typ(r.beschrijving, t, van, 20), bedrag: tel(r.totaal, t, van + 400, 500), zicht: vlak(t, van, van + 120), kost: tel(KOSTPRIJS[i], t, van + 400, 500), uren: UREN[i] }
  })
  const subtotaal = regels.reduce((s, z) => s + z.bedrag, 0)
  const kost = regels.reduce((s, z) => s + z.kost, 0)
  const marge = subtotaal > 0 ? ((subtotaal - kost) / subtotaal) * 100 : 0
  const uren = regels.reduce((s, z) => s + (z.zicht > 0 ? z.uren : 0), 0)
  const keuzeP = veer(t, stand.keuzeOp, { demping: 16, duurMs: 500 })
  const keuzeZicht = t >= stand.keuzeOp && t < stand.flapOp ? vlak(t, stand.keuzeOp, stand.keuzeOp + 150) : 0
  const verstuurd = t >= stand.flapOp
  return (
    <AppVenster actief="Offertes" moduleTitel="Offertes" tabs={[{ label: 'Email' }, { label: klant.bedrijfsnaam }, { label: 'Nieuwe offerte', actief: true }]}>
      <div className="absolute inset-0 overflow-hidden px-8 pt-6">
        <div className="flex items-baseline justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-3">
              <h1 className="text-[32px] font-extrabold text-foreground tracking-[-0.5px] leading-none">Nieuwe offerte<span className="text-flame">.</span></h1>
              <div style={{ transform: 'translateY(2px)' }}>
                <SplitFlap t={t} op={stand.flapOp} van="concept" naar="verstuurd" kleurVan="#5A5A55" kleurNaar="#3A5A9A" hoogte={26} fontSize={15} achtergrond="hsl(var(--background))" />
              </div>
            </div>
            <p className="text-[13px] text-muted-foreground mt-2">{offerte.nummer} · {klant.bedrijfsnaam} · project {project.project_nummer}</p>
          </div>
          <div className="flex items-center gap-2 relative">
            <span className="inline-flex items-center gap-2 h-9 px-4 text-sm font-semibold rounded-xl bg-petrol text-white"><Save className="h-3.5 w-3.5" />Opslaan</span>
            <div className="relative flex items-center">
              <span data-doel="verstuur" className="inline-flex items-center justify-center gap-2 h-9 px-5 text-sm font-semibold rounded-l-xl bg-flame text-white" style={{ opacity: verstuurd ? 0.6 : 1, transform: t >= stand.verstuurTikOp && t < stand.verstuurTikOp + 200 ? 'scale(0.96)' : undefined }}><Send className="h-4 w-4" strokeWidth={1.75} />{verstuurd ? 'Verstuurd' : 'Verstuur'}</span>
              <span className="inline-flex items-center h-9 px-2 text-sm rounded-r-xl bg-[#E04520] text-white border-l border-white/25"><ChevronDown className="h-3.5 w-3.5" /></span>
              {/* Keuzemenu, QuoteHeader */}
              <div className="absolute right-0 top-full mt-2 z-50 w-72 doen-slate-surface rounded-[16px] shadow-[0_12px_40px_rgba(0,0,0,0.10),0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden" style={{ opacity: keuzeZicht, transform: `translateY(${(1 - keuzeP) * -8}px)` }}>
                <div data-doel="via-portaal" className="w-full text-left px-4 py-3 border-b border-[rgba(26,83,92,0.08)]">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-petrol flex items-center justify-center flex-shrink-0"><Globe className="h-4 w-4" strokeWidth={1.75} color="#fff" /></div>
                    <div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-foreground">Via portaal</p><p className="text-[11px] text-muted-foreground leading-snug mt-0.5">Klant bekijkt online + email-notificatie</p></div>
                  </div>
                </div>
                <div className="w-full text-left px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0"><Mail className="h-4 w-4 text-foreground" strokeWidth={1.75} /></div>
                    <div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-foreground">Via email</p><p className="text-[11px] text-muted-foreground leading-snug mt-0.5">PDF-bijlage + gepersonaliseerde email</p></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-6 mt-6">
          <div className="flex-1 min-w-0">
            <div className="rounded-2xl doen-panel overflow-hidden">
              <div className="grid px-4 py-2 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground font-semibold" style={{ gridTemplateColumns: '24px 1fr 90px 120px 70px 130px' }}>
                <span /><span>Omschrijving</span><span className="text-right">Aantal</span><span className="text-right">Prijs</span><span className="text-right">Btw</span><span className="text-right">Totaal</span>
              </div>
              {regels.map(({ r, tekst, bedrag, zicht }) => (
                <div key={r.id} className="grid items-center px-4 py-3.5 border-b border-border last:border-b-0" style={{ gridTemplateColumns: '24px 1fr 90px 120px 70px 130px', opacity: zicht }}>
                  <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                  <p className="text-[14px] font-medium text-foreground">{tekst}<span className="text-flame" style={{ opacity: tekst.length < r.beschrijving.length ? 1 : 0 }}>|</span></p>
                  <span className="text-right font-mono text-[13px] tabular-nums">{r.aantal}</span>
                  <span className="text-right font-mono text-[13px] tabular-nums">{euro(r.eenheidsprijs)}</span>
                  <span className="text-right font-mono text-[13px] tabular-nums text-muted-foreground">{r.btw_percentage}%</span>
                  <span className="text-right font-mono text-[14px] tabular-nums font-semibold" style={{ opacity: bedrag > 0 ? 1 : 0 }}>{euro(bedrag)}</span>
                </div>
              ))}
              <div className="px-4 py-3 flex items-center gap-4 text-[13px] text-petrol font-medium"><span className="inline-flex items-center gap-1"><Plus className="h-3.5 w-3.5" />Regel</span><span className="inline-flex items-center gap-1"><Calculator className="h-3.5 w-3.5" />Calculatie</span></div>
            </div>
          </div>
          <div className="w-[300px] flex-shrink-0 space-y-4">
            <div className="doen-slate-surface rounded-2xl p-5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Totaal ex btw</p>
              <p className="font-mono text-[26px] font-bold tabular-nums text-foreground mt-1">{euro(subtotaal)}</p>
              <div className="mt-3 space-y-1.5 text-[13px]">
                <div className="flex justify-between"><span className="text-muted-foreground">Btw 21%</span><span className="font-mono tabular-nums">{euro(subtotaal * 0.21)}</span></div>
                <div className="flex justify-between font-semibold border-t border-border pt-1.5"><span>Incl btw</span><span className="font-mono tabular-nums">{euro(subtotaal * 1.21)}</span></div>
              </div>
            </div>
            <div className="doen-slate-surface rounded-2xl p-5">
              <div className="flex items-baseline justify-between"><p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Marge</p><span className="font-mono text-[12px] text-muted-foreground">kostprijs {euro(kost)}</span></div>
              <div className="flex items-baseline gap-2 mt-1"><p className="font-mono text-[26px] font-bold tabular-nums" style={{ color: marge >= 35 ? '#2D6B48' : marge >= 20 ? '#8A7A4A' : '#C03A18' }}>{marge.toFixed(0)}%</p><span className="text-[13px] text-muted-foreground">{euro(subtotaal - kost)}</span></div>
              <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(100, marge * 1.6)}%`, backgroundColor: marge >= 35 ? '#2D6B48' : '#8A7A4A' }} /></div>
            </div>
            <div className="doen-slate-surface rounded-2xl p-5">
              <div className="flex items-center justify-between"><p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Uren</p><Clock className="h-3.5 w-3.5 text-muted-foreground" /></div>
              <p className="font-mono text-[22px] font-bold tabular-nums text-foreground mt-1">{uren} u</p>
              <p className="text-[12px] text-muted-foreground mt-1">productie 9 u · montage 4 u</p>
            </div>
          </div>
        </div>
      </div>
    </AppVenster>
  )
}
