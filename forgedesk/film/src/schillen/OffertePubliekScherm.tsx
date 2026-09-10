import { CheckCircle2 } from 'lucide-react'
import { HandtekeningVeld } from '@/components/shared/HandtekeningVeld'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBalk } from '../kern/TelefoonFrame'
import { Tik } from '../kern/TikRing'
import { offerte, portaalBedrijf, contact } from '../mockData'
import { typ, euro } from '../kern/Typ'
import { veer, vlak, ease } from '../tijd'

// Publieke offertepagina (quotes/OffertePubliekPagina.tsx, regels 1085-1150):
// het akkoordblok met naam, echt tekenveld, vinkje en Bevestigen. De
// handtekening tekent zichzelf als SVG-pad over het echte canvas heen.
type Props = { t: number; naamOp: number; tekenOp: number; vinkOp: number; tikOp: number; klaarOp: number }

// Handschrift "P. v.d. Berg", in een 320x120 vak.
const HANDTEKENING = 'M34 94 C 38 70, 42 40, 48 22 C 54 12, 66 16, 62 32 C 58 46, 42 56, 32 56 M 30 98 C 44 74, 62 46, 74 44 C 82 44, 78 60, 72 70 C 68 78, 74 84, 84 76 M 92 80 c 3 -8 6 -12 8 -6 c 0 6 -2 12 2 10 c 4 -2 8 -8 12 -12 M 116 84 c 2 -12 6 -30 10 -36 c 2 10 -2 24 0 32 c 2 6 8 4 12 -2 c 6 -10 10 -14 6 -18 c -6 2 -8 12 -2 18 c 6 4 14 -2 20 -10 M 168 76 c 2 -8 6 -12 8 -6 c 0 6 -4 12 0 12 c 4 0 8 -6 12 -10 M 192 86 c 10 -34 18 -56 32 -62 c 10 -4 4 14 -8 28 c -10 12 -20 20 -30 32 M 236 72 c 6 -8 14 -10 18 -4 c 4 6 -4 12 -10 8 c -4 -4 2 -10 10 -8 M 262 66 c 6 6 8 18 4 30 c -4 10 -12 12 -16 6 c 8 -14 16 -30 20 -44 M 40 108 C 110 100, 190 104, 262 94'
const PAD_LENGTE = 1200

export const OffertePubliekScherm: React.FC<Props> = ({ t, naamOp, tekenOp, vinkOp, tikOp, klaarOp }) => {
  const naam = typ(contact.naam, t, naamOp, 45)
  const tekenP = vlak(t, tekenOp, tekenOp + 1800, ease.glad)
  const gevinkt = t >= vinkOp
  const klaar = t >= klaarOp
  const klaarP = veer(t, klaarOp, { demping: 15, duurMs: 700 })
  const kanBevestigen = naam.length >= 2 && tekenP > 0.6 && gevinkt
  return (
    <div className="absolute inset-0 flex flex-col" style={{ backgroundColor: '#F8F7F5' }}>
      <div style={{ backgroundColor: '#1A535C' }}><StatusBalk donker /></div>
      <div className="px-5 py-4 text-white" style={{ backgroundColor: '#1A535C' }}>
        <p className="text-[11px] uppercase tracking-widest opacity-70">{portaalBedrijf.naam}</p>
        <div className="text-[20px] font-bold leading-tight mt-1" style={{ fontFamily: '"Instrument Sans", sans-serif', color: "#fff" }}>Offerte {offerte.nummer}</div>
        <div className="flex items-baseline justify-between mt-2">
          <span className="text-[13px] opacity-80">{offerte.titel}</span>
          <span className="font-mono text-[18px] font-bold">{euro(offerte.subtotaal)}</span>
        </div>
      </div>

      <div className="flex-1 px-4 pt-4">
        <div className="bg-[#FFFFFF] rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5 space-y-4">
          <p className="text-sm text-[#6B6B66]">Door uw naam in te vullen en op Bevestigen te klikken, gaat u akkoord met deze offerte van {portaalBedrijf.naam}.</p>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#1A1A1A]">Uw volledige naam *</label>
            <div className="h-12 rounded-md border border-input bg-background px-3 flex items-center text-[15px] text-foreground">
              {naam || <span className="text-muted-foreground">Vul uw volledige naam in</span>}
              {naam.length > 0 && naam.length < contact.naam.length && <span className="text-flame ml-px">|</span>}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#1A1A1A]">Uw handtekening *</label>
            <div className="relative">
              <HandtekeningVeld onChange={() => {}} />
              <div className="absolute inset-x-0 top-0 rounded-xl overflow-hidden" style={{ height: 118, opacity: tekenP > 0 ? 1 : 0 }}>
                {tekenP > 0 && <div className="absolute inset-0 bg-white rounded-xl" />}
                <svg viewBox="0 0 320 120" className="absolute inset-0 w-full h-full" style={{ padding: '4px 10px' }}>
                  <path d={HANDTEKENING} fill="none" stroke="#1A1A1A" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"
                    strokeDasharray={PAD_LENGTE} strokeDashoffset={PAD_LENGTE * (1 - tekenP)} />
                </svg>
              </div>
            </div>
          </div>
          <label className="flex items-start gap-3">
            <Checkbox checked={gevinkt} className="mt-0.5" />
            <span className="text-sm text-[#6B6B66]">Ik ga akkoord met deze offerte</span>
          </label>
          <Tik t={t} op={tikOp}>
          <span
            className="w-full h-12 text-base font-semibold text-white rounded-xl inline-flex items-center justify-center gap-2"
            style={{ backgroundColor: '#D24620', opacity: kanBevestigen ? 1 : 0.4, transform: t >= tikOp && t < tikOp + 200 ? 'scale(0.97)' : undefined }}
          >
            <CheckCircle2 className="h-5 w-5" />Bevestigen
          </span>
          </Tik>
        </div>
      </div>

      {klaar && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 px-4" style={{ backdropFilter: 'blur(4px)', opacity: vlak(t, klaarOp, klaarOp + 250) }}>
          <div className="bg-[#FFFFFF] rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.12)] p-8 w-full text-center space-y-4" style={{ transform: `translateY(${(1 - klaarP) * 40}px) scale(${0.94 + klaarP * 0.06})` }}>
            <div className="mx-auto w-20 h-20 rounded-full bg-[#E8F2EC] flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-[#3A7D52]" />
            </div>
            <h3 className="text-xl font-bold text-[#1A1A1A]" style={{ letterSpacing: '-0.3px' }}>Offerte geaccepteerd<span className="text-[#D24620]">.</span></h3>
            <p className="text-sm text-[#6B6B66]">Bedankt voor uw vertrouwen. We nemen snel contact met u op.</p>
          </div>
        </div>
      )}
    </div>
  )
}
