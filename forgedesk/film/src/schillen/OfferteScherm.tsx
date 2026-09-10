import { Save, Send, ChevronUp, Globe, Mail } from 'lucide-react'
import { MobielTop } from '../kern/AppChrome'
import { SplitFlap } from '../kern/SplitFlap'
import { Tik } from '../kern/TikRing'
import { offerteItems, offerte, klant } from '../mockData'
import { typ, tel, euro } from '../kern/Typ'
import { veer, vlak } from '../tijd'

// Mobiele offerte-editor: kop zoals QuoteHeader, regels zoals QuoteItemsTable
// in de compacte mobiele stand, onderbalk letterlijk uit QuoteCreation:3049.
type Props = {
  t: number
  regelsOp: number
  verstuurTikOp: number
  keuzeOp: number
  keuzeTikOp: number
  flapOp: number
}

export const OfferteScherm: React.FC<Props> = ({ t, regelsOp, verstuurTikOp, keuzeOp, keuzeTikOp, flapOp }) => {
  const perRegel = 800
  const zichtbareRegels = offerteItems.map((r, i) => {
    const van = regelsOp + i * perRegel
    return { r, van, tekst: typ(r.beschrijving, t, van, 22), bedrag: tel(r.totaal, t, van + 350, 450), zicht: vlak(t, van, van + 120) }
  })
  const subtotaal = zichtbareRegels.reduce((s, z) => s + z.bedrag, 0)
  const keuzeP = veer(t, keuzeOp, { demping: 16, duurMs: 500 })
  const keuzeZicht = t >= keuzeOp && t < flapOp ? vlak(t, keuzeOp, keuzeOp + 150) : 0
  const verstuurd = t >= flapOp
  return (
    <div className="absolute inset-0 bg-background flex flex-col">
      <MobielTop titel="Nieuwe offerte" terug />
      <div className="flex-1 px-4 pt-2 overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-heading text-[20px] font-bold leading-tight tracking-[-0.015em] text-foreground">{offerte.titel}</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5 truncate">{offerte.nummer} · {klant.bedrijfsnaam}</p>
          </div>
          <div className="flex-shrink-0 pt-0.5">
            <SplitFlap t={t} op={flapOp} van="concept" naar="verstuurd" kleurVan="#5A5A55" kleurNaar="#3A5A9A" hoogte={28} fontSize={15} achtergrond="hsl(var(--background))" />
          </div>
        </div>

        <div className="mt-4 rounded-xl doen-panel overflow-hidden">
          <div className="px-4 py-2 border-b border-border flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Regels</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Totaal</span>
          </div>
          {zichtbareRegels.map(({ r, tekst, bedrag, zicht }, i) => (
            <div key={r.id} className="px-4 py-3 flex items-start justify-between gap-3 border-b border-border last:border-b-0" style={{ opacity: zicht }}>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium text-foreground leading-snug">{tekst}<span className="text-flame" style={{ opacity: tekst.length < r.beschrijving.length ? 1 : 0 }}>|</span></p>
                <p className="text-[12px] text-muted-foreground mt-0.5">{r.aantal} × {euro(r.eenheidsprijs)} · {r.btw_percentage}% btw</p>
              </div>
              <span className="font-mono text-[14px] tabular-nums font-semibold text-foreground flex-shrink-0" style={{ opacity: bedrag > 0 ? 1 : 0 }}>{euro(bedrag)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Keuzemenu na Verstuur: Via portaal / Via email, uit QuoteHeader */}
      <div className="absolute inset-x-4 z-40" style={{ bottom: 92, opacity: keuzeZicht, transform: `translateY(${(1 - keuzeP) * 20}px)` }}>
        <div className="rounded-xl bg-card shadow-elevation-lg border border-border overflow-hidden">
          <Tik t={t} op={keuzeTikOp} dx={-90} className="px-4 py-3 flex items-start gap-3 bg-petrol/5">
            <Globe className="h-4 w-4 text-petrol mt-0.5" />
            <div>
              <p className="text-[14px] font-semibold text-foreground">Via portaal</p>
              <p className="text-[12px] text-muted-foreground">Klant bekijkt online + email-notificatie</p>
            </div>
          </Tik>
          <div className="px-4 py-3 flex items-start gap-3 border-t border-border">
            <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-[14px] font-semibold text-foreground">Via email</p>
              <p className="text-[12px] text-muted-foreground">PDF-bijlage + gepersonaliseerde email</p>
            </div>
          </div>
        </div>
      </div>

      {/* Onderbalk, QuoteCreation.tsx:3049 */}
      <div className="absolute inset-x-0 z-30" style={{ bottom: 0, paddingBottom: 22, backgroundColor: 'hsl(var(--card))' }}>
        <div className="flex items-center gap-2 border-t border-border bg-card/95 px-4 py-3" style={{ boxShadow: '0 -4px 16px rgba(0,0,0,0.04)' }}>
          <span className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg py-1 text-left">
            <span className="min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Totaal ex btw</span>
              <span className="block truncate font-mono text-[16px] font-bold tabular-nums text-foreground">{euro(subtotaal)}</span>
            </span>
            <ChevronUp className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          </span>
          <span className="h-11 px-3 inline-flex items-center gap-1.5 text-[14px] font-semibold rounded-lg bg-petrol text-white flex-shrink-0">
            <Save className="h-4 w-4" />Opslaan
          </span>
          <Tik t={t} op={verstuurTikOp} className="flex-shrink-0">
            <span className="h-11 px-3 inline-flex items-center gap-1.5 text-[14px] font-semibold rounded-lg bg-flame text-white" style={{ transform: t >= verstuurTikOp && t < verstuurTikOp + 200 ? 'scale(0.96)' : undefined, opacity: verstuurd ? 0.6 : 1 }}>
              <Send className="h-4 w-4" />{verstuurd ? 'Verstuurd' : 'Verstuur'}
            </span>
          </Tik>
        </div>
      </div>
    </div>
  )
}
