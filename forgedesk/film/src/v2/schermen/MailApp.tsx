import { Inbox, Send, FileEdit, Trash2, Archive, CheckCheck, Hourglass, Moon, CalendarClock, Target, Paperclip, Reply, Forward, Mail, Phone, Building2, UserPlus, Search, FolderPlus, Sparkles, X, Loader2, ArrowRight, Image as ImageIcon, Download } from 'lucide-react'
import { AppVenster } from '../DesktopChrome'
import { klant, contact, mail, project } from '../../mockData'
import { vlak } from '../../tijd'

// De mail-app op desktop: mappenrail, lijst met split-tabs, lezer met bijlage
// en aanvraagkaart, klantkaart rechts. Markup volgt EmailLayout en de
// shell-componenten; die hangen aan de mailstore, vandaar deze nabouw.
export type MailStand = {
  gekozen: boolean          // mail geopend in de lezer
  klantOp?: number          // ms waarop de klant is toegevoegd
  projectOp?: number        // ms waarop het project is aangemaakt
  bijlageOp?: number        // ms waarop de bijlage in het project zit
}

const MAPPEN = [
  ['Inbox', Inbox, 12], ['Opvolgen', Hourglass, 3], ['Beantwoord', CheckCheck, 0], ['Gesnoozed', Moon, 1], ['Concepten', FileEdit, 2],
  ['Ingepland', CalendarClock, 0], ['Verzonden', Send, 0], ['Archief', Archive, 0], ['Prullenbak', Trash2, 0], ['Leads', Target, 0],
] as const

const LIJST = [
  { van: contact.naam, onderwerp: mail.onderwerp, preview: 'Hoi, we hebben net een nieuwe showroom aan de Industrieweg…', tijd: 'nu', ongelezen: true, bijlage: true, letter: 'P', bg: '#E2F0F0', fg: '#1A535C' },
  { van: 'Bakkerij Hendriks', onderwerp: 'Raambelettering: proef akkoord', preview: 'Dank voor de proef, wat ons betreft…', tijd: '08:52', ongelezen: true, bijlage: false, letter: 'B', bg: '#FDE8E2', fg: '#C03A18' },
  { van: 'Gemeente Ermelo', onderwerp: 'Bewegwijzering sporthal, planning', preview: 'Kunnen jullie week 40 aanhouden…', tijd: 'gisteren', ongelezen: false, bijlage: true, letter: 'G', bg: '#E5ECF6', fg: '#2A5580' },
  { van: 'Autobedrijf Smit', onderwerp: 'Re: lichtreclame showroom', preview: 'Top, dan zien we jullie donderdag…', tijd: 'gisteren', ongelezen: false, bijlage: false, letter: 'A', bg: '#F2E8E5', fg: '#7A4538' },
  { van: 'Probo', onderwerp: 'Orderbevestiging 2026-88214', preview: 'Je bestelling is bevestigd…', tijd: 'ma', ongelezen: false, bijlage: true, letter: 'P', bg: '#EEEEED', fg: '#4A4A45' },
]

export const MailApp: React.FC<{ t: number; stand: MailStand }> = ({ t, stand }) => {
  const klantBekend = stand.klantOp !== undefined && t >= stand.klantOp
  const projectKlaar = stand.projectOp !== undefined && t >= stand.projectOp
  const bijlageKlaar = stand.bijlageOp !== undefined && t >= stand.bijlageOp
  const projectBezig = stand.projectOp !== undefined && t >= stand.projectOp - 450 && t < stand.projectOp
  return (
    <AppVenster actief="Email" moduleTitel="Email" tabs={[{ label: 'Email', actief: true }, { label: 'Projecten' }]}>
      <div className="absolute inset-0 flex" style={{ backgroundColor: '#F3F6F6' }}>
        {/* Mappenrail */}
        <div className="flex flex-col flex-shrink-0 border-r border-petrol/[0.08] pt-3" style={{ width: 200 }}>
          <div className="px-3 pb-3">
            <span className="w-full h-9 rounded-[10px] flex items-center justify-center gap-2 text-[13px] font-semibold text-white bg-flame"><FileEdit className="h-4 w-4" />Nieuw bericht</span>
          </div>
          <nav className="px-2 space-y-px">
            {MAPPEN.map(([label, Icoon, n]) => {
              const actief = label === 'Inbox'
              return (
                <div key={label} className={`relative w-full flex items-center rounded-[10px] h-[34px] gap-2.5 px-2.5 ${actief ? 'bg-petrol/[0.10] text-petrol font-semibold' : 'text-[#3A3A36]'}`}>
                  <Icoon className={`h-4 w-4 flex-shrink-0 ${actief ? 'text-petrol' : 'text-muted-foreground'}`} strokeWidth={actief ? 2.1 : 1.8} />
                  <span className="flex-1 text-left text-[13.5px] tracking-[-0.01em] truncate">{label}</span>
                  {n > 0 && <span className={`font-mono tabular-nums text-[11px] ${label === 'Inbox' ? 'font-semibold text-petrol' : 'text-muted-foreground'}`}>{n}</span>}
                </div>
              )
            })}
          </nav>
        </div>

        {/* Lijst */}
        <div className="flex flex-col flex-shrink-0 border-r border-petrol/[0.08] bg-card" style={{ width: 400 }}>
          <div className="bg-gradient-to-b from-[#F3F7F7] to-card">
            <div className="flex items-center justify-between px-4 h-[52px]">
              <div className="flex items-baseline gap-2"><h1 className="font-heading text-[20px] font-bold tracking-[-0.01em] text-foreground leading-none">Inbox<span className="text-flame">.</span></h1><span className="font-mono tabular-nums text-[11px] leading-none text-muted-foreground">12 ongelezen</span></div>
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-1 px-4 pb-1.5">
              {[['Aanvragen', 3], ['Klanten', 8], ['Leveranciers', 2], ['Overig', 5]].map(([l, n], i) => (
                <span key={l as string} className={`h-7 px-2.5 rounded-lg text-[12px] inline-flex items-center gap-1.5 ${i === 0 ? 'bg-petrol/[0.10] text-petrol font-semibold' : 'text-muted-foreground'}`}>{l as string}<span className="font-mono tabular-nums text-[10px] opacity-80">{n as number}</span></span>
              ))}
            </div>
          </div>
          <div className="flex-1">
            {LIJST.map((m, i) => {
              const actief = i === 0 && stand.gekozen
              return (
                <div key={m.van} data-doel={i === 0 ? 'mail-item' : undefined} className={`relative flex items-start gap-3 px-4 py-3 border-b border-border/60 ${actief ? 'bg-petrol/[0.06]' : ''}`}>
                  {(m.ongelezen || actief) && <div className={`absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full ${actief ? 'bg-petrol' : 'bg-petrol/45'}`} />}
                  <div className="w-9 h-9 rounded-[11px] flex items-center justify-center ring-1 ring-inset ring-black/[0.06] mt-0.5 flex-shrink-0" style={{ backgroundColor: m.bg }}><span className="font-bold text-[14px]" style={{ color: m.fg }}>{m.letter}</span></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-[3px]">
                      <span className={`truncate text-[13px] ${m.ongelezen ? 'font-bold text-foreground' : 'font-medium text-foreground/75'}`}>{m.van}</span>
                      {m.bijlage && <Paperclip className="h-3 w-3 text-petrol/45 flex-shrink-0" />}
                      <span className={`ml-auto font-mono text-[11.5px] tabular-nums ${m.ongelezen ? 'font-semibold text-petrol' : 'text-muted-foreground/80'}`}>{m.tijd}</span>
                    </div>
                    <p className={`truncate text-[13px] ${m.ongelezen ? 'font-bold text-foreground' : 'text-foreground/70'}`}>{m.onderwerp}</p>
                    <p className="truncate text-[12px] text-muted-foreground/80">{m.preview}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Lezer */}
        <div className="flex-1 min-w-0 bg-card flex flex-col">
          {stand.gekozen ? (
            <div className="flex-1 px-8 pt-6">
              <h2 className="font-heading text-[22px] font-bold tracking-[-0.015em] text-foreground">{mail.onderwerp}</h2>
              <div className="mt-4 flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-semibold" style={{ backgroundColor: '#E2F0F0', color: '#1A535C' }}>P</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2"><span className="text-[14px] font-semibold text-foreground">{contact.naam}</span><span className="text-[12px] text-muted-foreground">{contact.email}</span></div>
                  <div className="mt-0.5 text-[12px] text-muted-foreground">aan mij</div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground"><span className="font-mono text-[11px]">vandaag 09:12</span><Reply className="h-3.5 w-3.5" /><Forward className="h-3.5 w-3.5" /></div>
              </div>
              <p className="mt-5 text-[14.5px] leading-relaxed text-foreground/90 max-w-[62ch]">{mail.inhoud}</p>
              {/* Bijlagen */}
              <div className="mt-5">
                <div className="mb-2 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <span>1 bijlage</span><span className="flex-1" />
                  <span className="inline-flex items-center gap-1 normal-case tracking-normal text-petrol"><Download className="h-3 w-3" />Alles downloaden</span>
                  {projectKlaar && !bijlageKlaar && <span data-doel="bijlage-project" className="inline-flex items-center gap-1 normal-case tracking-normal text-petrol"><FolderPlus className="h-3 w-3" />Toevoegen aan project</span>}
                  {bijlageKlaar && <span className="inline-flex items-center gap-1 normal-case tracking-normal font-semibold" style={{ color: '#3A7D52' }}><CheckCheck className="h-3 w-3" />In project {project.project_nummer}</span>}
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 w-[320px]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md text-white" style={{ backgroundColor: '#6A5A8A' }}><ImageIcon className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium text-foreground">gevel-showroom.jpg</p><p className="text-[11px] text-muted-foreground">2,4 MB</p></div>
                </div>
              </div>
              {/* Daan */}
              <div className="mt-5 flex items-center gap-1 text-[12.5px]">
                <Sparkles className="mr-0.5 h-3.5 w-3.5 text-[#9B8EC4]" />
                <span className="text-petrol font-medium">Samenvatten</span><span className="text-border">·</span><span className="text-petrol font-medium">Concept door Daan</span>
              </div>
              {/* Aanvraagkaart, AanvraagKaart.tsx:281-357 */}
              <div className="relative mt-5 overflow-hidden rounded-xl doen-panel doen-wash max-w-[640px]">
                <span className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-flame to-flame/30" />
                <span className="absolute top-3.5 right-3.5 text-muted-hex"><X className="h-3.5 w-3.5" /></span>
                <div className="pl-6 pr-10 py-5">
                  <div className="flex items-center gap-2.5 mb-3"><span className="badge-flame">Aanvraag</span><span className="text-[11px] text-muted-hex font-mono">{mail.aanvraag_zekerheid}% zeker</span></div>
                  <p className="text-[14px] leading-relaxed text-foreground mb-4">{mail.aanvraag_samenvatting}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
                    {projectKlaar ? (
                      <span className="inline-flex items-center gap-1.5 text-[13px] rounded-lg bg-[#E8F2EC] px-3 py-2 font-semibold" style={{ color: '#3A7D52' }}>Project aangemaakt <ArrowRight className="h-3.5 w-3.5" /></span>
                    ) : (
                      <span data-doel="project-aanmaken" className="inline-flex items-center h-10 px-5 rounded-lg bg-flame text-white font-semibold text-[14px]">{projectBezig && <Loader2 className="mr-2 h-4 w-4" />}Project aanmaken</span>
                    )}
                    {klantBekend ? (
                      <span className="inline-flex items-center gap-1.5 text-[13px] text-text-sec"><Building2 className="h-3.5 w-3.5 text-petrol" />Onder <span className="font-semibold text-foreground">{klant.bedrijfsnaam}</span></span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[13px] text-text-sec"><UserPlus className="h-3.5 w-3.5 text-muted-hex" />Nieuwe klant: <span className="font-semibold text-foreground">{klant.bedrijfsnaam}</span></span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[13px] text-muted-foreground">Kies een mail</div>
          )}
        </div>

        {/* Klantkaart */}
        <aside className="flex-shrink-0 border-l border-petrol/[0.08] bg-[#F3F6F6] flex flex-col" style={{ width: 280 }}>
          <div className="flex items-center justify-between px-4 h-[52px]"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Klantkaart</p><X className="h-3.5 w-3.5 text-muted-foreground" /></div>
          {stand.gekozen && (
            <div className="px-4 pb-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[14px] font-bold" style={{ backgroundColor: '#E2F0F0', color: '#1A535C' }}>{klantBekend ? 'V' : 'P'}</div>
                <div className="min-w-0 flex-1">
                  {klantBekend ? (<><p className="font-heading text-[15px] font-bold leading-tight tracking-[-0.01em] text-foreground">{klant.bedrijfsnaam}</p><p className="text-[12px] text-muted-foreground truncate">{contact.naam}</p></>)
                    : (<><p className="font-heading text-[15px] font-bold text-foreground tracking-[-0.01em] truncate">{contact.naam}</p><p className="text-[12px] text-muted-foreground">Onbekende afzender</p></>)}
                </div>
              </div>
              <div className="mt-3 space-y-1.5 text-[12.5px]">
                <p className="flex items-center gap-2 text-foreground/75"><Mail className="h-3.5 w-3.5 text-muted-foreground" /><span className="truncate">{contact.email}</span></p>
                {klantBekend && <p className="flex items-center gap-2 text-foreground/75"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{klant.telefoon}</p>}
                {klantBekend && <p className="flex items-center gap-2 text-foreground/75"><Building2 className="h-3.5 w-3.5 text-muted-foreground" /><span className="truncate">{klant.adres}, {klant.stad}</span></p>}
              </div>
              {!klantBekend ? (
                <span data-doel="klant-toevoegen" className="mt-3 w-full h-9 rounded-lg inline-flex items-center justify-center gap-2 text-[12.5px] font-semibold text-petrol bg-petrol/[0.08]"><UserPlus className="h-3.5 w-3.5" /> Toevoegen als klant</span>
              ) : (
                <>
                  <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-petrol"><Search className="h-3 w-3" /> Alle mail van dit bedrijf</p>
                  <p className="mt-4 mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Open offertes</p>
                  <p className="text-[12px] text-muted-foreground">Geen open offertes</p>
                  <p className="mt-4 mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Lopende projecten</p>
                  {projectKlaar ? (
                    <div className="rounded-lg bg-card px-2.5 py-2 ring-1 ring-border/60" style={{ opacity: vlak(t, stand.projectOp!, stand.projectOp! + 300) }}><p className="text-[12.5px] font-medium text-foreground truncate">{project.naam}</p><p className="font-mono text-[10.5px] text-muted-foreground">{project.project_nummer} · Gepland</p></div>
                  ) : <p className="text-[12px] text-muted-foreground">Geen lopende projecten</p>}
                </>
              )}
            </div>
          )}
        </aside>
      </div>
    </AppVenster>
  )
}
