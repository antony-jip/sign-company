import { X, Loader2, UserPlus, ArrowRight } from 'lucide-react'
import { MobielTop, MobielTabBalk } from '../kern/AppChrome'
import { Tik } from '../kern/TikRing'
import { mail, klant, contact } from '../mockData'
import { veer, vlak } from '../tijd'

// Mobiele mailreader met de AanvraagKaart (email/AanvraagKaart.tsx, regels
// 281-357) nagebouwd met dezelfde klassen. De echte kaart laadt klanten in een
// effect en zet zijn knop pas daarna aan; dat is in een frame-render niet
// deterministisch, vandaar deze statische kopie.
type Props = { t: number; kaartOp: number; tikOp: number }

export const MailScherm: React.FC<Props> = ({ t, kaartOp, tikOp }) => {
  const kaartP = veer(t, kaartOp, { demping: 16, duurMs: 650 })
  const kaartZicht = vlak(t, kaartOp, kaartOp + 200)
  const bezig = t >= tikOp + 120 && t < tikOp + 650
  const klaar = t >= tikOp + 650
  return (
    <div className="absolute inset-0 bg-background flex flex-col">
      <MobielTop />
      <div className="px-2 pt-3 pb-1 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-[#888780] font-medium">Inbox · Aanvragen</span>
        <span className="text-[11px] text-[#888780]">vandaag · <span className="text-foreground font-medium">3</span> nieuwe</span>
      </div>
      <div className="flex-1 px-4 pt-3 overflow-hidden">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-full bg-petrol/10 text-petrol font-bold text-[15px] flex items-center justify-center flex-shrink-0">P</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[15px] font-semibold text-foreground truncate">{contact.naam}</span>
              <span className="text-[12px] text-muted-foreground flex-shrink-0">09:12</span>
            </div>
            <p className="text-[12px] text-muted-foreground truncate">{contact.email}</p>
          </div>
        </div>
        <h1 className="font-heading mt-4 text-[20px] font-bold leading-tight tracking-[-0.01em] text-foreground">{mail.onderwerp}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground/90">{mail.inhoud}</p>

        <div className="relative overflow-hidden rounded-xl doen-panel doen-wash" style={{ marginTop: 20, opacity: kaartZicht, transform: `translateY(${(1 - kaartP) * 30}px) scale(${0.96 + kaartP * 0.04})` }}>
          <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-flame to-flame/30" />
          <span className="absolute top-3.5 right-3.5 text-muted-hex"><X className="h-3.5 w-3.5" /></span>
          <div className="pl-6 pr-10 py-5">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="badge-flame">Aanvraag</span>
              <span className="text-[11px] text-muted-hex font-mono">{mail.aanvraag_zekerheid}% zeker</span>
            </div>
            <p className="text-[14px] leading-relaxed text-foreground mb-4">{mail.aanvraag_samenvatting}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
              {klaar ? (
                <span className="inline-flex items-center gap-1.5 text-[13px] text-foreground rounded-lg bg-[#E8F2EC] px-3 py-2 font-semibold" style={{ color: '#3A7D52' }}>
                  Project aangemaakt <ArrowRight className="h-3.5 w-3.5" />
                </span>
              ) : (
                <Tik t={t} op={tikOp} className="inline-flex">
                  <span className="inline-flex items-center h-10 px-5 rounded-lg bg-flame text-white font-semibold text-[14px]" style={{ transform: bezig ? 'scale(0.97)' : undefined }}>
                    {bezig && <Loader2 className="mr-2 h-4 w-4" />}
                    Project aanmaken
                  </span>
                </Tik>
              )}
              {!klaar && (
                <span className="inline-flex items-center gap-1.5 text-[13px] text-text-sec">
                  <UserPlus className="h-3.5 w-3.5 text-muted-hex shrink-0" />
                  Nieuwe klant:
                  <span className="font-semibold text-foreground">{klant.bedrijfsnaam}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      <MobielTabBalk actief="Email" />
    </div>
  )
}

// Inbox-lijst, split-inbox tab Aanvragen; de nieuwe mail schuift bovenaan in.
const INBOX = [
  { van: 'Bakkerij Hendriks', onderwerp: 'Raambelettering: proef akkoord', tijd: 'gisteren', letter: 'B' },
  { van: 'Gemeente Ermelo', onderwerp: 'Bewegwijzering sporthal, planning', tijd: 'gisteren', letter: 'G' },
  { van: 'Autobedrijf Smit', onderwerp: 'Re: lichtreclame showroom', tijd: 'ma', letter: 'A' },
]
export const InboxScherm: React.FC<{ t: number; nieuwOp: number }> = ({ t, nieuwOp }) => {
  const p = veer(t, nieuwOp + 500, { demping: 16, duurMs: 600 })
  const zicht = vlak(t, nieuwOp + 500, nieuwOp + 650)
  return (
    <div className="absolute inset-0 bg-background flex flex-col">
      <MobielTop />
      <div className="px-2 pt-3 pb-1 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-[#888780] font-medium">Inbox · Aanvragen</span>
        <span className="text-[11px] text-[#888780]">vandaag · <span className="text-foreground font-medium">{t >= nieuwOp + 500 ? 3 : 2}</span> nieuwe</span>
      </div>
      <div className="flex-1 px-2">
        <div className="flex items-start gap-3 px-2 py-3 rounded-xl bg-card" style={{ opacity: zicht, transform: `translateY(${(1 - p) * -30}px)`, height: 68 * zicht, overflow: 'hidden' }}>
          <span className="w-10 h-10 rounded-full bg-petrol text-white font-bold text-[15px] flex items-center justify-center flex-shrink-0">P</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[14px] font-bold text-foreground truncate">{contact.naam}</span>
              <span className="text-[11px] text-flame font-semibold flex-shrink-0">nu</span>
            </div>
            <p className="text-[13px] text-foreground truncate font-medium">{mail.onderwerp}</p>
            <p className="text-[12px] text-muted-foreground truncate">Hoi, we hebben net een nieuwe showroom aan de Industrieweg…</p>
          </div>
        </div>
        {INBOX.map((m) => (
          <div key={m.van} className="flex items-start gap-3 px-2 py-3 border-b border-border">
            <span className="w-10 h-10 rounded-full bg-muted text-foreground/70 font-bold text-[15px] flex items-center justify-center flex-shrink-0">{m.letter}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[14px] font-semibold text-foreground truncate">{m.van}</span>
                <span className="text-[11px] text-muted-foreground flex-shrink-0">{m.tijd}</span>
              </div>
              <p className="text-[13px] text-foreground/80 truncate">{m.onderwerp}</p>
            </div>
          </div>
        ))}
      </div>
      <MobielTabBalk actief="Email" />
    </div>
  )
}

// Lock-screen-melding van de mail, iOS-stijl, glijdt van boven in.
export const MailMelding: React.FC<{ t: number; op: number; titel: string; regel: string; app?: string }> = ({ t, op, titel, regel, app = 'Mail' }) => {
  const p = veer(t, op, { demping: 17, duurMs: 800 })
  const zicht = vlak(t, op, op + 200)
  return (
    <div className="absolute inset-x-3 z-[70]" style={{ top: 62, opacity: zicht, transform: `translateY(${(1 - p) * -80}px)` }}>
      <div className="flex items-start gap-3 rounded-[22px] px-4 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.86)', backdropFilter: 'blur(20px)', boxShadow: '0 12px 40px rgba(0,0,0,0.18)' }}>
        <span className="w-10 h-10 rounded-[10px] bg-petrol text-white font-bold text-[16px] flex items-center justify-center flex-shrink-0">d<span className="text-flame">.</span></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[13px] font-semibold text-foreground truncate">{titel}</span>
            <span className="text-[11px] text-muted-foreground flex-shrink-0">{app} · nu</span>
          </div>
          <p className="text-[13px] text-foreground/85 leading-snug line-clamp-2">{regel}</p>
        </div>
      </div>
    </div>
  )
}
