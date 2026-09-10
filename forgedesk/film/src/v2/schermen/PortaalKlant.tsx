import { CheckCircle2 } from 'lucide-react'
import { PortaalHeader } from '@/components/portaal/PortaalHeader'
import { PortaalSidebar } from '@/components/portaal/PortaalSidebar'
import { PortaalFeedItemOfferte } from '@/components/portaal/PortaalFeedItemOfferte'
import { PortaalFeedItemAfbeelding } from '@/components/portaal/PortaalFeedItemAfbeelding'
import { PortaalFeedItemFactuur } from '@/components/portaal/PortaalFeedItemFactuur'
import { HandtekeningVeld } from '@/components/shared/HandtekeningVeld'
import { Checkbox } from '@/components/ui/checkbox'
import { VENSTER_B, VENSTER_H } from '../DesktopChrome'
import { project, portaalBedrijf, portaalItemOfferte, portaalItemFactuur, portaalItemFoto, montage, klant, contact, offerte, offerteItems } from '../../mockData'
import { typ, euro } from '../../kern/Typ'
import { veer, vlak, ease } from '../../tijd'

// Het klantportaal zoals de klant het ziet, in de browser: echte componenten
// uit src/components/portaal in de desktoplayout (feed links, zijbalk rechts).
// Plus de publieke offertepagina met het echte tekenveld.
export type PortaalKlantStand = {
  pagina: 'portaal' | 'publiek'
  projectStatus: string
  kaarten: { soort: 'offerte' | 'foto' | 'factuur'; status?: string; op?: number }[]
  naamOp?: number; tekenOp?: number; vinkOp?: number; tikOp?: number; klaarOp?: number
}

const HANDTEKENING = 'M34 94 C 38 70, 42 40, 48 22 C 54 12, 66 16, 62 32 C 58 46, 42 56, 32 56 M 30 98 C 44 74, 62 46, 74 44 C 82 44, 78 60, 72 70 C 68 78, 74 84, 84 76 M 92 80 c 3 -8 6 -12 8 -6 c 0 6 -2 12 2 10 c 4 -2 8 -8 12 -12 M 116 84 c 2 -12 6 -30 10 -36 c 2 10 -2 24 0 32 c 2 6 8 4 12 -2 c 6 -10 10 -14 6 -18 c -6 2 -8 12 -2 18 c 6 4 14 -2 20 -10 M 168 76 c 2 -8 6 -12 8 -6 c 0 6 -4 12 0 12 c 4 0 8 -6 12 -10 M 192 86 c 10 -34 18 -56 32 -62 c 10 -4 4 14 -8 28 c -10 12 -20 20 -30 32 M 236 72 c 6 -8 14 -10 18 -4 c 4 6 -4 12 -10 8 c -4 -4 2 -10 10 -8 M 262 66 c 6 6 8 18 4 30 c -4 10 -12 12 -16 6 c 8 -14 16 -30 20 -44 M 40 108 C 110 100, 190 104, 262 94'

const Browser: React.FC<{ url: string; children: React.ReactNode }> = ({ url, children }) => (
  <div className="flex flex-col" style={{ width: VENSTER_B, height: VENSTER_H, backgroundColor: '#F8F7F5', fontFamily: 'Inter, sans-serif' }}>
    <div className="flex items-center gap-3 px-4 border-b border-border/60 flex-shrink-0" style={{ height: 48, backgroundColor: '#ECEAE6' }}>
      <span className="flex gap-1.5"><i className="w-3 h-3 rounded-full bg-[#E5E3DE] block" /><i className="w-3 h-3 rounded-full bg-[#E5E3DE] block" /><i className="w-3 h-3 rounded-full bg-[#E5E3DE] block" /></span>
      <span className="flex-1 h-8 rounded-lg bg-white/80 flex items-center px-3 font-mono text-[12px] text-muted-foreground">{url}</span>
    </div>
    <div className="flex-1 min-h-0 relative overflow-hidden">{children}</div>
  </div>
)

export const PortaalKlant: React.FC<{ t: number; stand: PortaalKlantStand }> = ({ t, stand }) => {
  if (stand.pagina === 'publiek') {
    const naam = typ(contact.naam, t, stand.naamOp ?? 0, 45)
    const tekenP = vlak(t, stand.tekenOp ?? 0, (stand.tekenOp ?? 0) + 1700, ease.glad)
    const gevinkt = t >= (stand.vinkOp ?? Infinity)
    const klaar = t >= (stand.klaarOp ?? Infinity)
    const klaarP = veer(t, stand.klaarOp ?? 0, { demping: 15, duurMs: 700 })
    return (
      <Browser url={`app.doen.team/offerte-bekijken/8f2c…`}>
        <div className="absolute inset-0 flex" style={{ backgroundColor: '#F8F7F5' }}>
          <div className="flex-1 min-w-0 px-12 pt-10">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{portaalBedrijf.naam}</p>
            <h1 className="text-[30px] font-bold leading-tight mt-1 text-[#1A1A1A]" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>Offerte {offerte.nummer}<span className="text-flame">.</span></h1>
            <p className="text-[14px] text-[#6B6B66] mt-1">{offerte.titel} · {klant.bedrijfsnaam}</p>
            <div className="mt-8 bg-[#FFFFFF] rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] overflow-hidden">
              {offerteItems.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-6 py-4 border-b border-[#F0EEEA]">
                  <span className="text-[14px] text-[#1A1A1A]">{r.beschrijving}</span><span className="font-mono text-[14px] tabular-nums">{euro(r.totaal)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-6 py-4 bg-[#FAFAF8]"><span className="text-[14px] font-semibold">Totaal excl. btw</span><span className="font-mono text-[18px] font-bold tabular-nums">{euro(offerte.subtotaal)}</span></div>
            </div>
          </div>
          <div className="w-[440px] flex-shrink-0 px-8 pt-10">
            <div className="bg-[#FFFFFF] rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-6 space-y-4">
              <p className="text-sm text-[#6B6B66]">Door uw naam in te vullen en op Bevestigen te klikken, gaat u akkoord met deze offerte van {portaalBedrijf.naam}.</p>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#1A1A1A]">Uw volledige naam *</label>
                <div className="h-12 rounded-md border border-input bg-background px-3 flex items-center text-[15px] text-foreground">{naam || <span className="text-muted-foreground">Vul uw volledige naam in</span>}{naam.length > 0 && naam.length < contact.naam.length && <span className="text-flame ml-px">|</span>}</div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#1A1A1A]">Uw handtekening *</label>
                <div className="relative">
                  <HandtekeningVeld onChange={() => {}} />
                  <div className="absolute inset-x-0 top-0 rounded-xl overflow-hidden" style={{ height: 140, opacity: tekenP > 0 ? 1 : 0 }}>
                    <div className="absolute inset-0 bg-white rounded-xl" />
                    <svg viewBox="0 0 320 120" className="absolute inset-0 w-full h-full" style={{ padding: '6px 14px' }}><path d={HANDTEKENING} fill="none" stroke="#1A1A1A" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={1200} strokeDashoffset={1200 * (1 - tekenP)} /></svg>
                  </div>
                </div>
              </div>
              <label className="flex items-start gap-3"><Checkbox checked={gevinkt} className="mt-0.5" /><span className="text-sm text-[#6B6B66]">Ik ga akkoord met deze offerte</span></label>
              <span data-doel="bevestigen" className="w-full h-12 text-base font-semibold text-white rounded-xl inline-flex items-center justify-center gap-2" style={{ backgroundColor: '#D24620', opacity: naam.length > 2 && tekenP > 0.6 && gevinkt ? 1 : 0.4 }}><CheckCircle2 className="h-5 w-5" />Bevestigen</span>
            </div>
          </div>
          {klaar && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/10" style={{ backdropFilter: 'blur(3px)', opacity: vlak(t, stand.klaarOp!, stand.klaarOp! + 250) }}>
              <div className="bg-[#FFFFFF] rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.12)] p-8 max-w-sm w-full text-center space-y-4" style={{ transform: `translateY(${(1 - klaarP) * 40}px) scale(${0.94 + klaarP * 0.06})` }}>
                <div className="mx-auto w-20 h-20 rounded-full bg-[#E8F2EC] flex items-center justify-center"><CheckCircle2 className="h-10 w-10 text-[#3A7D52]" /></div>
                <h3 className="text-xl font-bold text-[#1A1A1A]" style={{ letterSpacing: '-0.3px' }}>Offerte geaccepteerd<span className="text-[#D24620]">.</span></h3>
                <p className="text-sm text-[#6B6B66]">Bedankt voor uw vertrouwen. We nemen snel contact met u op.</p>
              </div>
            </div>
          )}
        </div>
      </Browser>
    )
  }
  return (
    <Browser url="app.doen.team/portaal/3b9e…">
      <div className="absolute inset-0 flex flex-col" style={{ backgroundColor: '#F8F7F5' }}>
        <PortaalHeader bedrijfNaam={portaalBedrijf.naam} verlooptOp="2026-10-14" projectNaam={project.naam} headerKleur="#1A535C" />
        <div className="border-b" style={{ borderColor: '#E8E6E1', backgroundColor: 'hsl(var(--card))' }}><div className="max-w-5xl mx-auto px-6 py-3"><h1 className="text-base font-bold" style={{ color: 'hsl(var(--foreground))', fontFamily: '"Instrument Sans", sans-serif' }}>{project.naam}</h1></div></div>
        <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-6">
          <div className="flex gap-8">
            <div className="flex-1 min-w-0 space-y-4">
              {stand.kaarten.map((k, i) => {
                const op = k.op ?? -1000
                const p = veer(t, op, { demping: 16, duurMs: 650 })
                const stijl = { opacity: vlak(t, op, op + 150), transform: `translateY(${(1 - p) * 28}px)`, position: 'relative' as const }
                if (k.soort === 'offerte') return <div key={i} style={stijl}><PortaalFeedItemOfferte item={{ ...portaalItemOfferte, status: k.status ?? 'verstuurd' }} token="tok" klantNaam={contact.naam} kanGoedkeuren onReactie={() => {}} /><span data-doel="offerte-bekijken" style={{ position: 'absolute', left: 78, top: 122, width: 1, height: 1 }} /></div>
                if (k.soort === 'factuur') return <div key={i} style={stijl}><PortaalFeedItemFactuur item={{ ...portaalItemFactuur, status: k.status ?? 'verstuurd' }} token="tok" /></div>
                return <div key={i} style={stijl}><PortaalFeedItemAfbeelding item={portaalItemFoto} /></div>
              })}
            </div>
            <div className="w-[260px] flex-shrink-0">
              <PortaalSidebar project={{ naam: project.naam, status: stand.projectStatus, start_datum: project.start_datum, deadline: project.eind_datum }} bedrijf={portaalBedrijf} montage={{ datum: montage.datum, start_tijd: montage.start_tijd }} documenten={[]} toonContact />
            </div>
          </div>
        </main>
      </div>
    </Browser>
  )
}
