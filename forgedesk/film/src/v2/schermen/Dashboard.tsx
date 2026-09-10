import { Cloud, CloudSun, CloudRain, Sun, SlidersHorizontal, Wrench, CheckSquare, CalendarDays, Mail, Plus, MailPlus, Archive, FileText, Receipt, ArrowRight, X, ChevronLeft, ChevronRight, Send, Eye, CheckCircle2, type LucideIcon } from 'lucide-react'
import { getAvatarStyle } from '@/utils/medewerkerAvatar'
import { AppVenster } from '../DesktopChrome'
import { contact, mail } from '../../mockData'
import { euro } from '../../kern/Typ'
import { vlak, veer } from '../../tijd'

// Het dashboard (FORGEdeskDashboard) nagebouwd met dezelfde klassen: hero,
// KPI-strip, briefing, Vandaag | Opvolgen en de rail rechts. De echte blokken
// hangen aan DashboardDataContext, vandaar demo-data hier.
export type DashboardStand = { mailOp: number }

const MEDEWERKERS = [
  { id: 'mw-0', naam: 'Antony Bootsma' },
  { id: 'mw-1', naam: 'Kees Jansen' },
  { id: 'mw-2', naam: 'Sanne de Vries' },
]
const initialen = (naam: string) => naam.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0] ?? '').join('').toUpperCase()

const Avatar: React.FC<{ id: string; size?: number }> = ({ id, size = 22 }) => {
  const mw = MEDEWERKERS.find(m => m.id === id)!
  const s = getAvatarStyle(mw.id)
  return (
    <span className="inline-flex items-center justify-center rounded-full font-semibold flex-shrink-0" style={{ width: size, height: size, fontSize: Math.round(size * 0.42), backgroundColor: s.backgroundColor, color: s.color }}>{initialen(mw.naam)}</span>
  )
}

// TYPE_STYLES uit VandaagBlok, plus 'mail' in petrol voor de binnenkomende aanvraag.
const TYPE_STIJL: Record<'montage' | 'taak' | 'event' | 'mail', { icon: LucideIcon; kleur: string; bg: string }> = {
  montage: { icon: Wrench, kleur: '#D24620', bg: 'linear-gradient(135deg, #FDE8E4 0%, #FBD7CC 100%)' },
  taak: { icon: CheckSquare, kleur: '#1A535C', bg: 'linear-gradient(135deg, rgba(26,83,92,0.07) 0%, rgba(26,83,92,0.14) 100%)' },
  event: { icon: CalendarDays, kleur: '#8A7A4A', bg: 'linear-gradient(135deg, #F5F2E8 0%, #EDE6CE 100%)' },
  mail: { icon: Mail, kleur: '#1A535C', bg: 'linear-gradient(135deg, rgba(26,83,92,0.07) 0%, rgba(26,83,92,0.14) 100%)' },
}

const VANDAAG = [
  { type: 'montage' as const, tijd: '08:00', titel: 'Montage raambelettering', context: 'Bakkerij Hendriks · Stationsstraat 12, Ermelo', wie: 'mw-1' },
  { type: 'taak' as const, tijd: '10:30', titel: 'Proef lichtreclame showroom mailen', context: 'Autobedrijf Smit', wie: 'mw-0' },
  { type: 'event' as const, tijd: '13:00', titel: 'Opname bewegwijzering sporthal', context: 'Gemeente Ermelo · Sporthal Calluna', wie: 'mw-0' },
  { type: 'taak' as const, tijd: '15:30', titel: 'Frontlit doek bestellen, 500 x 230', context: 'Probo · levertijd 3 werkdagen', wie: 'mw-2' },
]

const OPVOLGEN = [
  { klant: 'Gemeente Ermelo', nummer: 'OFF-2026-0031', bedrag: 5840, dagen: 18 },
  { klant: 'Autobedrijf Smit', nummer: 'OFF-2026-0036', bedrag: 3960, dagen: 9 },
  { klant: 'Bakkerij Hendriks', nummer: 'OFF-2026-0039', bedrag: 1480, dagen: 4 },
  { klant: 'Sportschool Fit20 Harderwijk', nummer: 'OFF-2026-0040', bedrag: 1200, dagen: 2 },
]
const PIJPLIJN = OPVOLGEN.reduce((s, o) => s + o.bedrag, 0)

const BRIEFING = [
  { icon: FileText, titel: 'Gemeente Ermelo wacht al 18 dagen', toelichting: 'OFF-2026-0031 bewegwijzering sporthal is bekeken maar niet beantwoord. Bel Jan Vos even.' },
  { icon: Receipt, titel: 'Factuur FAC-2026-0102 vervalt morgen', toelichting: 'Autobedrijf Smit, € 2.140. De herinnering staat klaar.' },
]

const WEEK = [
  { dag: 'do', tijd: '08:00', titel: 'Montage raambelettering', sub: 'Bakkerij Hendriks', dot: '#D24620' },
  { dag: 'do', tijd: '13:00', titel: 'Opname bewegwijzering sporthal', sub: 'Gemeente Ermelo', dot: '#8A7A4A' },
  { dag: 'vr', tijd: '09:00', titel: 'Montage lichtreclame showroom', sub: 'Autobedrijf Smit', dot: '#D24620' },
]

const ACTIVITEIT = [
  { label: 'Offerte bekeken', klant: 'Gemeente Ermelo', tijd: '2u', icon: Eye, kleur: '#8A7A4A', bg: '#F5F2E8' },
  { label: 'Akkoord ontvangen', klant: 'Bakkerij Hendriks', tijd: '1d', icon: CheckCircle2, kleur: '#3A7D52', bg: '#E8F2EC' },
  { label: 'Factuur betaald', klant: 'Tuincentrum De Groot', tijd: '2d', icon: Receipt, kleur: '#3A7D52', bg: '#E8F2EC' },
  { label: 'Offerte verstuurd', klant: 'Sportschool Fit20 Harderwijk', tijd: '2d', icon: Send, kleur: '#1A535C', bg: 'rgba(26,83,92,0.08)' },
]

const GEDAAN = [
  { wie: 'mw-1', label: 'Werkbon afgerond', detail: 'WB-2026-0094', tijd: '3u' },
  { wie: 'mw-2', label: 'Factuur verstuurd', detail: 'FAC-2026-0105', tijd: '5u' },
  { wie: 'mw-0', label: 'Offerte verstuurd', detail: 'OFF-2026-0040', tijd: '2d' },
]

const Kop: React.FC<{ titel: string; sub?: string; rechts?: React.ReactNode; mb?: string }> = ({ titel, sub, rechts, mb = 'mb-4' }) => (
  <header className={`flex items-baseline justify-between gap-4 ${mb}`}>
    <div className="flex items-baseline gap-3 min-w-0">
      <h2 className="font-heading text-[14px] font-bold text-foreground whitespace-nowrap">{titel}<span className="text-flame">.</span></h2>
      {sub && <span className="doen-subtitel truncate">{sub}<span className="text-flame">.</span></span>}
    </div>
    {rechts}
  </header>
)

const KpiKaart: React.FC<{ label: string; bedrag: number; sub: string; icon: LucideIcon; accent: string; bg: string; trend: number[] }> = ({ label, bedrag, sub, icon: Icon, accent, bg, trend }) => {
  const [euros, cents] = euro(bedrag).replace(/^€\s*/, '').split(',')
  const max = Math.max(...trend, 1)
  return (
    <div className="doen-panel doen-wash rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0" style={{ backgroundColor: bg }}><Icon className="w-4 h-4" style={{ color: accent }} /></span>
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
      </div>
      <p className="font-heading font-bold text-[30px] leading-[1.1] text-foreground">
        <span className="text-[18px] text-muted-foreground mr-1">€</span>
        <span className="font-mono">{euros}</span>
        {cents !== undefined && <span className="font-mono text-[16px] font-medium text-muted-foreground">,{cents}</span>}
      </p>
      <div className="mt-auto flex items-end justify-between gap-3">
        <span className="text-[12px] text-muted-foreground">{sub}</span>
        <div className="flex items-end gap-[2px] h-3">
          {trend.map((v, i) => <span key={i} className="w-[3px] rounded-[1px]" style={{ height: `${3 + Math.round((v / max) * 9)}px`, backgroundColor: accent, opacity: 0.3 + (i / trend.length) * 0.7 }} />)}
        </div>
      </div>
    </div>
  )
}

export const Dashboard: React.FC<{ t: number; stand: DashboardStand }> = ({ t, stand }) => {
  const mailBinnen = t >= stand.mailOp
  const mailP = veer(t, stand.mailOp, { demping: 13, duurMs: 650 })
  const mailHoogte = vlak(t, stand.mailOp, stand.mailOp + 320)
  const mailZicht = vlak(t, stand.mailOp + 60, stand.mailOp + 260)
  const stipP = veer(t, stand.mailOp + 200, { demping: 9, duurMs: 600 })
  const dagen = [11, 12, 13, 14, 15, 16, 17]
  return (
    <AppVenster actief="Dashboard" moduleTitel="Dashboard" mailOngelezen={mailBinnen ? 1 : 0} tabs={[{ label: 'Dashboard', actief: true }]}>
      <div className="absolute inset-0 overflow-hidden">
        <div className="w-full px-8 pt-6 pb-8">
          <div className="flex gap-6">
            {/* Hoofdkolom */}
            <main className="flex-1 min-w-0 space-y-5">
              <section className="doen-hero relative rounded-2xl overflow-hidden">
                <div className="px-9 pt-6 pb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-flame" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-white/70 font-mono">DONDERDAG 14 SEPTEMBER</span>
                    <span className="ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-white/60"><SlidersHorizontal className="w-3 h-3" />Weergave</span>
                  </div>
                  <h1 className="font-heading font-bold leading-[1.05] text-[40px] text-white" style={{ letterSpacing: '-1.5px' }}>Goedemorgen, Antony<span style={{ color: '#D24620' }}>.</span></h1>
                  <p className="mt-2.5 text-[15px] text-white/60 leading-snug">Grijs maar prima werkweer.</p>
                </div>
                <div className="flex items-center gap-6 px-9 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
                  <div className="flex items-baseline gap-3 flex-shrink-0">
                    <Cloud className="w-6 h-6 flex-shrink-0 self-center" strokeWidth={1.4} style={{ color: '#F5C460' }} />
                    <p className="font-heading font-bold text-white text-[26px] leading-none"><span className="font-mono">17</span><span className="text-white/60 text-[16px] font-normal">°</span></p>
                    <span className="text-[13px] text-white/55 whitespace-nowrap">Bewolkt</span>
                  </div>
                  <div className="ml-auto flex items-center gap-5">
                    {([['Morgen', CloudSun, 19], ['Overmorgen', CloudRain, 15], ['Zo 17', Sun, 20], ['Ma 18', CloudSun, 18]] as [string, LucideIcon, number][]).map(([label, Icon, temp]) => (
                      <div key={label} className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] uppercase tracking-wider text-white/55 font-mono whitespace-nowrap">{label}</span>
                        <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.6} style={{ color: Icon === CloudRain ? '#9DD3DA' : '#F5C460' }} />
                        <span className="text-[14px] text-white font-mono">{temp}<span className="text-white/55 text-[11px]">°</span></span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* KPI-strip: doen-fact + twee kaarten */}
              <div className="grid grid-cols-3 gap-4">
                <div className="doen-panel doen-wash relative rounded-xl p-5 flex flex-col overflow-hidden" style={{ minHeight: 156 }}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0" style={{ background: 'linear-gradient(135deg, #FDE8E4 0%, #FBD7CC 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)' }}><Wrench className="w-4 h-4" style={{ color: '#D24620' }} /></span>
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Planning</span>
                  </div>
                  <p className="flex-1 flex items-center text-[19px] font-medium leading-[1.25] tracking-[-0.45px] text-foreground py-3"><span>Montage afgerond? Werkbon met één klik · foto's en handtekening erbij<span className="text-flame">.</span></span></p>
                  <span className="absolute left-0 bottom-0 h-[2px]" style={{ width: '38%', background: 'linear-gradient(90deg, #D2462040 0%, #D24620 100%)' }} />
                </div>
                <KpiKaart label="In pijplijn" bedrag={PIJPLIJN} sub="4 offertes, ex btw" icon={FileText} accent="#1A535C" bg="rgba(26,83,92,0.08)" trend={[4200, 6100, 3800, 9400, 7200, 10800, 12480]} />
                <KpiKaart label="Deze week" bedrag={6905} sub="gefactureerd, ex btw" icon={CheckCircle2} accent="#3A7D52" bg="#E8F2EC" trend={[5100, 2900, 7400, 4600, 8200, 3900, 6905]} />
              </div>

              {/* Briefing */}
              <section className="doen-panel doen-wash rounded-xl px-7 py-4">
                <Kop titel="Verdient vandaag aandacht" sub="wat Daan vannacht zag" mb="mb-2" rechts={
                  <div className="flex items-baseline gap-3 flex-shrink-0">
                    <span className="font-mono text-[12px] text-muted-foreground">2 punten · uit 41 signalen</span>
                    <X className="w-3.5 h-3.5 text-muted-foreground/60 self-center" />
                  </div>
                } />
                {BRIEFING.map((p) => (
                  <div key={p.titel} className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-b-0">
                    <p.icon className="w-4 h-4 text-petrol mt-0.5 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">{p.titel}</span>
                      <span className="block text-[13px] text-muted-foreground leading-snug mt-0.5">{p.toelichting}</span>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 mt-1 shrink-0" />
                  </div>
                ))}
              </section>

              {/* Vandaag | Opvolgen */}
              <div className="grid grid-cols-12 gap-5">
                <section className="col-span-7 doen-panel doen-wash rounded-xl px-7 py-6 flex flex-col">
                  <Kop titel="Vandaag" sub="wat staat er klaar" mb="mb-3" rechts={<span className="font-mono text-[12px] text-muted-foreground flex-shrink-0">{mailBinnen ? '1 aanvraag · ' : ''}1 montage · 2 taken · 1 afspraak</span>} />
                  <div className="relative flex items-stretch mb-3 p-[2px] rounded-[10px] bg-petrol/[0.05]">
                    <div className="absolute top-[2px] bottom-[2px] rounded-[8px]" style={{ left: 'calc((100% - 4px) / 5 * 3 + 2px)', width: 'calc((100% - 4px) / 5)', background: 'linear-gradient(135deg, #246069 0%, #1A535C 55%, #143E45 100%)', boxShadow: '0 1px 2px rgba(20,62,71,0.28), 0 2px 5px rgba(20,62,71,0.06)' }} />
                    {['Ma', 'Di', 'Wo', 'Vandaag', 'Vr'].map((d, i) => (
                      <span key={d} className={`relative z-10 flex-1 min-w-0 px-1.5 py-1 rounded-[8px] text-[11px] font-semibold tracking-[-0.1px] text-center ${i === 3 ? 'text-white' : 'text-muted-foreground'}`}>{d}</span>
                    ))}
                  </div>
                  <ul className="-mx-2">
                    {/* De binnenkomende aanvraag: schuift de lijst open en veert in. */}
                    {mailBinnen && (
                      <li data-doel="dashboard-mail" className="relative" style={{ height: 46 * mailHoogte, opacity: mailZicht, transform: `translateY(${(1 - mailP) * -10}px) scale(${0.96 + 0.04 * mailP})`, transformOrigin: 'left center' }}>
                        <div className="relative w-full flex items-center gap-3.5 py-2 px-3 rounded-lg" style={{ background: `linear-gradient(90deg, rgba(26,83,92,${0.07 * mailZicht}) 0%, rgba(26,83,92,0) 100%)` }}>
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full" style={{ background: 'linear-gradient(180deg, #1A535C 0%, #1A535C99 100%)', opacity: mailZicht }} />
                          <span className="inline-flex items-center justify-center w-[30px] h-[30px] flex-shrink-0" style={{ background: TYPE_STIJL.mail.bg, borderRadius: 9, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)' }}><Mail className="h-[15px] w-[15px]" style={{ color: TYPE_STIJL.mail.kleur }} strokeWidth={2} /></span>
                          <span className="font-mono text-[12px] w-10 flex-shrink-0 tabular-nums text-foreground font-semibold">09:12</span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[13px] font-semibold text-foreground truncate leading-[1.25]">Nieuwe aanvraag · {contact.naam}</span>
                            <span className="block text-[11px] text-muted-foreground truncate leading-tight mt-[2px]">{mail.onderwerp}</span>
                          </span>
                          <span className="w-[24px] flex-shrink-0 flex justify-center"><span className="w-[9px] h-[9px] rounded-full bg-flame ring-2 ring-flame/20" style={{ transform: `scale(${stipP})` }} /></span>
                          <span className="w-14 flex-shrink-0" />
                        </div>
                      </li>
                    )}
                    {VANDAAG.map((item) => {
                      const s = TYPE_STIJL[item.type]
                      return (
                        <li key={item.titel} className="relative">
                          <div className="relative w-full flex items-center gap-3.5 py-2 px-3 rounded-lg">
                            <span className="inline-flex items-center justify-center w-[30px] h-[30px] flex-shrink-0" style={{ background: s.bg, borderRadius: 9, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)' }}><s.icon className="h-[15px] w-[15px]" style={{ color: s.kleur }} strokeWidth={2} /></span>
                            <span className="font-mono text-[12px] w-10 flex-shrink-0 tabular-nums text-foreground font-semibold">{item.tijd}</span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-[13px] font-medium text-foreground truncate leading-[1.25]">{item.titel}</span>
                              <span className="block text-[11px] text-muted-foreground truncate leading-tight mt-[2px]">{item.context}</span>
                            </span>
                            <span className="w-[24px] flex-shrink-0 flex justify-center"><Avatar id={item.wie} /></span>
                            <span className="w-14 flex-shrink-0" />
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                  <div className="mt-auto pt-3">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/60 bg-card/50">
                      <Plus className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="flex-1 text-[13px] text-muted-foreground/70">Nieuwe taak voor vandaag…</span>
                    </div>
                  </div>
                  <div className="mt-3 text-right"><span className="text-sm text-petrol">Volledige planning →</span></div>
                </section>

                <section className="col-span-5 doen-panel doen-wash rounded-xl px-7 py-6 flex flex-col">
                  <header className="flex items-baseline justify-between gap-3 mb-4">
                    <h2 className="font-heading text-[14px] font-bold text-foreground whitespace-nowrap">Opvolgen<span className="text-flame">.</span></h2>
                    <span className="font-mono text-[12px] tabular-nums text-muted-foreground flex-shrink-0">{euro(PIJPLIJN)} in de pijplijn</span>
                  </header>
                  <ul className="divide-y divide-border/60">
                    {OPVOLGEN.map((o) => {
                      const urgent = o.dagen >= 15
                      return (
                        <li key={o.nummer} className="relative flex items-center">
                          <span className="flex-1 min-w-0 flex items-center py-2.5 pl-2 -ml-2">
                            <span className="flex-1 min-w-0">
                              <span className="flex items-baseline gap-2">
                                <span className="flex-1 min-w-0 text-sm text-foreground font-medium truncate">{o.klant}</span>
                                <span className="font-mono text-sm tabular-nums text-foreground flex-shrink-0">{euro(o.bedrag)}</span>
                              </span>
                              <span className="flex items-baseline gap-2 mt-0.5">
                                <span className="flex-1 min-w-0 text-[11px] font-mono text-muted-foreground truncate">{o.nummer}</span>
                                <span className={`text-[12px] tabular-nums flex-shrink-0 ${urgent ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{o.dagen} dagen<span className={urgent ? 'text-flame font-bold' : ''}>.</span></span>
                              </span>
                            </span>
                          </span>
                          <span className="w-[58px] flex-shrink-0 flex items-center justify-end gap-0.5 py-2.5 pr-2 -mr-2 opacity-0"><MailPlus className="h-3.5 w-3.5" /><Archive className="h-3.5 w-3.5" /></span>
                        </li>
                      )
                    })}
                  </ul>
                  <div className="mt-auto pt-4 text-right"><span className="text-sm text-petrol">Alle offertes →</span></div>
                </section>
              </div>
            </main>

            {/* Rail rechts */}
            <aside className="space-y-5 w-[320px] flex-shrink-0">
              <section className="doen-panel doen-wash rounded-xl p-5">
                <header className="flex items-center justify-between gap-2 mb-3">
                  <h2 className="font-heading text-[14px] font-bold text-foreground whitespace-nowrap">Deze week<span className="text-flame">.</span></h2>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <ChevronLeft className="w-3.5 h-3.5 text-foreground/70 mx-1" />
                    <span className="text-[11px] font-mono uppercase tracking-wider px-1.5 whitespace-nowrap text-muted-foreground">wk 38</span>
                    <ChevronRight className="w-3.5 h-3.5 text-foreground/70 mx-1" />
                  </div>
                </header>
                <div className="flex items-center gap-1.5 flex-wrap mb-4">
                  <span className="h-7 px-2.5 rounded-full text-[11px] font-semibold bg-background text-foreground/70 inline-flex items-center">Iedereen</span>
                  {MEDEWERKERS.map((m) => {
                    const s = getAvatarStyle(m.id)
                    const actief = m.id === 'mw-0'
                    return <span key={m.id} className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-semibold ${actief ? 'ring-2 ring-petrol ring-offset-1 ring-offset-white' : 'opacity-75'}`} style={{ backgroundColor: s.backgroundColor, color: s.color }}>{initialen(m.naam)}</span>
                  })}
                </div>
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {['M', 'D', 'W', 'D', 'V', 'Z', 'Z'].map((d, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <span className="text-[10px] uppercase text-muted-foreground">{d}</span>
                      <span className={`text-[13px] font-mono rounded-md w-7 h-7 flex items-center justify-center ${i === 3 ? 'bg-petrol text-white font-semibold' : 'text-foreground'}`}>{dagen[i]}</span>
                      <span className="w-1 h-1 rounded-full" style={{ backgroundColor: i === 3 || i === 4 ? '#D24620' : 'transparent' }} />
                    </div>
                  ))}
                </div>
                <ul className="space-y-3">
                  {WEEK.map((w) => (
                    <li key={w.titel} className="flex items-start gap-3 -mx-2 px-2 py-1">
                      <span className="w-10 pt-0.5 flex-shrink-0 leading-tight">
                        <span className="block text-[10px] uppercase text-muted-foreground font-semibold">{w.dag}</span>
                        <span className="block font-mono text-[11px] text-foreground/70">{w.tijd}</span>
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] text-foreground truncate">{w.titel}</span>
                        <span className="block text-[11px] text-muted-foreground truncate">{w.sub}</span>
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2" style={{ backgroundColor: w.dot }} />
                    </li>
                  ))}
                </ul>
              </section>

              <section className="doen-panel doen-wash rounded-xl p-5">
                <Kop titel="Activiteit" sub="van verstuurd tot betaald" mb="mb-3" />
                <ul className="space-y-1">
                  {ACTIVITEIT.map((a) => (
                    <li key={a.label + a.klant} className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0" style={{ backgroundColor: a.bg }}><a.icon className="h-3.5 w-3.5" style={{ color: a.kleur }} /></span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-medium text-foreground truncate">{a.label}</span>
                        <span className="block text-[12px] text-foreground/70 truncate">{a.klant}</span>
                      </span>
                      <span className="text-[11px] font-mono tabular-nums text-muted-foreground flex-shrink-0">{a.tijd}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="doen-panel doen-wash rounded-xl p-5">
                <Kop titel="Gedaan" sub="wie wat deed" mb="mb-3" rechts={<span className="text-[11px] font-mono text-muted-foreground flex-shrink-0">3 actief</span>} />
                <ul className="space-y-3">
                  {GEDAAN.map((g) => (
                    <li key={g.detail} className="flex items-center gap-3 -mx-2 px-2 py-1">
                      <Avatar id={g.wie} size={26} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[12px] font-medium text-foreground truncate">{MEDEWERKERS.find(m => m.id === g.wie)!.naam.split(' ')[0]}</span>
                        <span className="block text-[11px] text-muted-foreground truncate">{g.label} · {g.detail}</span>
                      </span>
                      <span className="text-[10px] font-mono tabular-nums text-muted-foreground flex-shrink-0">{g.tijd}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </AppVenster>
  )
}
