import { Send, CheckCircle2 } from 'lucide-react'
import { MobielTop } from '../kern/AppChrome'
import { Tik } from '../kern/TikRing'
import { factuur, klant, offerteItems } from '../mockData'
import { euro } from '../kern/Typ'
import { vlak } from '../tijd'

// Factuur op mobiel, met de statusregel van FactuurEditor.tsx:3344-3349.
type Props = { t: number; verstuurTikOp: number; verstuurdOp: number; betaaldOp: number }

export const FactuurScherm: React.FC<Props> = ({ t, verstuurTikOp, verstuurdOp, betaaldOp }) => {
  const status = t >= betaaldOp ? 'betaald' : t >= verstuurdOp ? 'verzonden' : 'concept'
  const wissel = status === 'betaald' ? betaaldOp : status === 'verzonden' ? verstuurdOp : 0
  const regelZicht = vlak(t, wissel, wissel + 250)
  return (
    <div className="absolute inset-0 bg-background flex flex-col">
      <MobielTop titel={factuur.nummer} terug />
      <div className="flex-1 px-4 pt-2">
        <h1 className="font-heading text-[20px] font-bold leading-tight tracking-[-0.015em] text-foreground">Factuur {factuur.nummer}</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">{klant.bedrijfsnaam} · {factuur.titel}</p>
        <p className="mt-2 text-[13px] font-medium" style={{ opacity: regelZicht, color: status === 'betaald' ? '#2D6B48' : status === 'verzonden' ? '#C03A18' : '#5A5A55' }}>
          {status === 'betaald' && <>Betaald op <span className="font-mono">25 sep 2026</span><span className="text-flame">.</span></>}
          {status === 'verzonden' && <>Verstuurd · wachtend op betaling<span className="text-flame">.</span></>}
          {status === 'concept' && <>Concept · nog niet verstuurd<span className="text-flame">.</span></>}
        </p>

        <div className="mt-4 rounded-xl doen-panel overflow-hidden">
          {offerteItems.map((r) => (
            <div key={r.id} className="px-4 py-3 flex items-start justify-between gap-3 border-b border-border">
              <p className="text-[14px] font-medium text-foreground leading-snug min-w-0">{r.beschrijving}</p>
              <span className="font-mono text-[14px] tabular-nums font-semibold text-foreground flex-shrink-0">{euro(r.totaal)}</span>
            </div>
          ))}
          <div className="px-4 py-3 space-y-1 text-[13px]">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotaal</span><span className="font-mono tabular-nums">{euro(factuur.subtotaal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Btw 21%</span><span className="font-mono tabular-nums">{euro(factuur.btw_bedrag)}</span></div>
            <div className="flex justify-between border-t border-border pt-1.5 font-semibold text-foreground"><span>Totaal incl btw</span><span className="font-mono tabular-nums">{euro(factuur.totaal)}</span></div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-[12px] text-muted-foreground">
          <span>Factuurdatum 25 sep 2026</span><span>Vervalt 9 okt 2026</span>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 px-4 pb-8 pt-3 bg-card border-t border-border">
        {status === 'betaald' ? (
          <div className="h-12 rounded-xl bg-[#E4F0EA] flex items-center justify-center gap-2 text-[15px] font-semibold" style={{ color: '#2D6B48' }}>
            <CheckCircle2 className="h-4 w-4" /> Betaald via Mollie
          </div>
        ) : (
          <Tik t={t} op={verstuurTikOp}>
            <div className="h-12 rounded-xl bg-flame text-white flex items-center justify-center gap-2 text-[15px] font-semibold" style={{ opacity: status === 'verzonden' ? 0.6 : 1, transform: t >= verstuurTikOp && t < verstuurTikOp + 200 ? 'scale(0.97)' : undefined }}>
              <Send className="h-4 w-4" /> {status === 'verzonden' ? 'Verstuurd' : 'Verstuur'}
            </div>
          </Tik>
        )}
      </div>
    </div>
  )
}
