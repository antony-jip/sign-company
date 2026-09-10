import { ArrowLeft, CalendarDays, Pencil, Receipt, Send, CheckCircle2, Check } from 'lucide-react'
import { AppVenster } from '../DesktopChrome'
import { project, klant, offerte, factuur } from '../../mockData'
import { euro } from '../../kern/Typ'
import { vlak, veer } from '../../tijd'

// De projectcockpit met de tab Financieel open: kop zoals Cockpit.tsx,
// daaronder de totalen en facturenlijst zoals ProjectDetail (tab financieel).
export type FinancieelStand = {
  factuurOp: number     // ms waarop de factuur in de lijst staat
  verstuurdOp: number   // ms waarop hij verstuurd is
  betaaldOp: number     // ms waarop hij betaald is
}

const Tegel: React.FC<{ label: string; waarde: string; accent: string; sub?: string }> = ({ label, waarde, accent, sub = 'ex btw' }) => (
  <div className="bg-card rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
    <div className="h-1" style={{ backgroundColor: accent }} />
    <div className="p-4">
      <p className="text-[10px] font-mono uppercase tracking-widest mb-1" style={{ color: accent + 'AA' }}>{label}</p>
      <p className="text-xl font-bold font-mono text-foreground">{waarde}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  </div>
)

export const FinancieelTab: React.FC<{ t: number; stand: FinancieelStand }> = ({ t, stand }) => {
  const heeftFactuur = t >= stand.factuurOp
  const verstuurd = t >= stand.verstuurdOp
  const betaald = t >= stand.betaaldOp
  const status = betaald ? 'Betaald' : verstuurd ? 'Verzonden' : 'Concept'
  const badge = betaald ? 'badge-groen' : verstuurd ? 'badge-flame' : 'badge-grijs'
  const accent = betaald ? '#2D6B48' : verstuurd ? '#3A5A9A' : '#8A7A4A'
  const rijPop = veer(t, stand.factuurOp, { demping: 18, duurMs: 700 })
  const rijZicht = vlak(t, stand.factuurOp, stand.factuurOp + 220)
  const betaaldZicht = vlak(t, stand.betaaldOp, stand.betaaldOp + 300)
  const tab = 'Financieel'
  return (
    <AppVenster actief="Projecten" moduleTitel="Projecten" tabs={[{ label: 'Email' }, { label: 'Projecten' }, { label: klant.bedrijfsnaam, actief: true }]}>
      <div className="absolute inset-0 overflow-hidden">
        {/* Kop, gelijk aan Cockpit.tsx */}
        <div className="px-8 pt-6 relative">
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 text-petrol font-medium"><ArrowLeft className="h-3.5 w-3.5 text-flame" /> Projecten</span>
            <span className="text-muted-foreground/70">·</span>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-muted text-foreground/80">{project.project_nummer}</span>
          </div>
          <h1 className="font-heading text-[40px] font-bold leading-tight tracking-[-0.025em] text-foreground mt-2">{project.naam}<span className="text-flame">.</span></h1>
          <div className="flex items-center gap-2 mt-1 text-[13px]">
            <span className="font-semibold text-foreground/80">{klant.bedrijfsnaam}</span>
            <span className="text-muted-foreground">· {klant.stad.toUpperCase()}</span>
            <span className="text-muted-foreground/70">·</span>
            <span className="text-[12px] text-muted-foreground">aangemaakt 14 september 2026 door Antony Bootsma</span>
            <span className="text-muted-foreground/70">·</span>
            <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" strokeWidth={1.75} /><span className="font-medium text-foreground/80">deadline 24 sep</span></span>
          </div>
          <div className="absolute top-4 right-8 z-20 flex items-center gap-2">
            {heeftFactuur ? (
              <>
                <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-petrol/30 bg-card text-petrol text-[13px] font-medium"><Pencil className="h-3.5 w-3.5" />Offerte bewerken</span>
                <span className="btn-primary-flame text-[13px] !py-[9px] !px-4 inline-flex items-center gap-1.5"><Receipt className="h-3.5 w-3.5" />Factuur bewerken</span>
              </>
            ) : (
              <span data-doel="factuur-maken" className="btn-primary-flame text-[13px] !py-[9px] !px-4 inline-flex items-center gap-1.5"><Receipt className="h-3.5 w-3.5" />Factuur maken</span>
            )}
          </div>
          <div className="flex items-center gap-1 border-b border-border mt-4">
            {(['Overzicht', 'Werkbon', 'Financieel', 'E-mail', 'Notities'] as const).map((naam) => (
              <span key={naam} className={`relative inline-flex items-center gap-2 px-3 py-2.5 text-[14px] ${tab === naam ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                {naam}
                {tab === naam && <span className="absolute bottom-0 left-2.5 right-2.5 h-[2.5px] rounded-t-full bg-flame" />}
              </span>
            ))}
          </div>
        </div>

        {/* Tab Financieel, ProjectDetail.tsx:2370 */}
        <div className="px-8 py-6 space-y-8">
          <div className="grid grid-cols-4 gap-4">
            <Tegel label="Offerte" waarde={euro(offerte.subtotaal)} accent="#1A535C" />
            <Tegel label="Gefactureerd" waarde={euro(heeftFactuur ? factuur.subtotaal : 0)} accent="#3A5A9A" />
            <Tegel label="Betaald" waarde={euro(betaald ? factuur.subtotaal : 0)} accent="#2D6B48" />
            <Tegel label="Marge" waarde="40%" accent="#8A7A4A" sub={`${euro(offerte.subtotaal * 0.4)} op ${euro(offerte.subtotaal)}`} />
          </div>

          <div>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">Facturen</h3>
            {heeftFactuur ? (
              <div className="space-y-3" style={{ opacity: rijZicht, transform: `translateY(${(1 - rijPop) * 18}px)` }}>
                <div className="bg-card rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
                  <div className="h-1" style={{ backgroundColor: accent }} />
                  <div className="p-4 flex items-center justify-between gap-6">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5">
                        <p className="text-sm font-mono font-medium text-foreground">{factuur.nummer}</p>
                        <span className={badge}>{status}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{factuur.titel} <span className="font-mono">· 25-9-2026</span></p>
                    </div>
                    <div className="flex items-center gap-5 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-lg font-mono font-semibold text-foreground">{euro(factuur.totaal)}</p>
                        <p className="text-[10px] text-muted-foreground -mt-0.5">incl btw</p>
                      </div>
                      {verstuurd ? (
                        <span className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[#E8F2EC] text-[13px] font-semibold" style={{ color: '#3A7D52' }}><Check className="h-3.5 w-3.5" strokeWidth={2.5} />Verstuurd</span>
                      ) : (
                        <span data-doel="factuur-verstuur" className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-flame text-white text-[13px] font-semibold shadow-[0_2px_8px_rgba(210,70,32,0.25)]"><Send className="h-3.5 w-3.5" />Verstuur</span>
                      )}
                    </div>
                  </div>
                  {/* Statusregel zoals FactuurEditor.tsx:3344 */}
                  {betaald && (
                    <div className="px-4 pb-3.5 -mt-1 flex items-center gap-3 text-sm" style={{ opacity: betaaldZicht }}>
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#3A7D52]" />
                      <span className="text-foreground">Betaald op <span className="font-mono">25 sep 2026</span><span className="text-flame">.</span></span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border px-5 py-6 text-center">
                <p className="text-sm font-medium text-foreground">Nog geen factuur</p>
                <p className="text-[12px] text-muted-foreground mt-1">Maak een factuur uit de goedgekeurde offerte {offerte.nummer}.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppVenster>
  )
}
