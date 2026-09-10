import { ExternalLink, X, Bold, Italic, Underline, List, Link as LinkIcon, Paperclip, FileText, Image as ImageIcon, Receipt, Plus, ChevronDown, Send, Check } from 'lucide-react'
import { project, klant, contact, offerte, portaalBedrijf } from '../../mockData'
import { typ } from '../../kern/Typ'
import { vlak, veer, ease } from '../../tijd'

// Het zijpaneel "Nieuw bericht" dat in de app over het projectenbord schuift
// (ProjectMailDialog + ProjectMailComposer, variant paneel). Die hangen aan
// de mailstore en Supabase, vandaar deze nabouw met dezelfde klassen.
export type ComposerStand = {
  typOp: number        // ms waarop de tekst begint te tikken
  kiezerOp?: number    // ms waarop de keuzelijst "Uit project" opent
  kiesOp?: number      // ms waarop de tekening in de lijst gekozen wordt
  bijlageOp: number    // ms waarop de tekening als bijlage hangt (einde van de vlucht)
  opvolgenOp: number   // ms waarop Opvolgen aan gaat
  verzendOp: number    // ms waarop de mail verzonden is
}

export const PANEEL_B = 720
export const PANEEL_H = 1080

const BERICHT = 'Beste Pieter,\n\nDonderdag 24 sep om 08:00 komen we monteren. De tekening zit erbij, dan weet je wat er komt.'

const opmaakKnop = 'h-7 w-7 rounded-md flex items-center justify-center text-foreground/70'
const chipKnop = 'flex items-center gap-1.5 h-8 pl-2.5 pr-2 rounded-lg text-[11px] font-semibold border bg-white text-petrol border-petrol/30'
const chipKnopOpen = 'flex items-center gap-1.5 h-8 pl-2.5 pr-2 rounded-lg text-[11px] font-semibold border bg-petrol text-white border-petrol shadow-[0_2px_8px_rgba(26,83,92,0.25)]'

// De keuzelijst van ProjectMailComposer (cats): alleen de groepen die op dit
// moment in het project iets bevatten. Bestanden eerst, zoals in de app.
const KIES_GROEPEN: { label: string; items: { naam: string; icoon: React.ReactNode; doel?: string }[] }[] = [
  { label: 'Bestanden', items: [
    { naam: 'Tekening gevel.pdf', icoon: <FileText className="h-3.5 w-3.5 text-[#C03A18]" />, doel: 'uit-project-tekening' },
    { naam: 'gevel-showroom.jpg', icoon: <ImageIcon className="h-3.5 w-3.5 text-[#3A6B8C]" /> },
  ] },
  { label: 'Offertes', items: [{ naam: `Offerte ${offerte.nummer}`, icoon: <Receipt className="h-3.5 w-3.5" style={{ color: '#3A6B8C' }} /> }] },
  { label: 'Opdrachtbevestigingen', items: [{ naam: `Opdrachtbevestiging ${offerte.nummer}`, icoon: <Receipt className="h-3.5 w-3.5" style={{ color: '#C03A18' }} /> }] },
]

// Vlucht van de chip: van het lijstitem (in de popover boven de knop Uit
// project) naar zijn plek in de bijlagerij. Vaste offsets, want beide staan
// in verschillende containers; gemeten op de stills.
const VLUCHT_MS = 400
const VLUCHT_DX = 288
const VLUCHT_DY = -162

export const MailComposer: React.FC<{ t: number; stand: ComposerStand }> = ({ t, stand }) => {
  const tekst = typ(BERICHT, t, stand.typOp)
  const tiktNog = t >= stand.typOp && tekst.length < BERICHT.length
  const bijlage = t >= stand.bijlageOp
  const opvolgen = t >= stand.opvolgenOp
  const verzonden = t >= stand.verzendOp
  const bijlagePop = veer(t, stand.bijlageOp, { demping: 16, duurMs: 600 })
  const bijlageZicht = vlak(t, stand.bijlageOp, stand.bijlageOp + 180)

  // Keuzelijst: open met een veer vanaf de knop, dicht kort na de keuze.
  const metKiezer = stand.kiezerOp !== undefined && stand.kiesOp !== undefined
  const kiezerOp = stand.kiezerOp ?? Infinity
  const kiesOp = stand.kiesOp ?? Infinity
  const kiezerDichtOp = kiesOp + 120
  const kiezerOpen = metKiezer && t >= kiezerOp && t < kiezerDichtOp + 220
  const kiezerPop = veer(t, kiezerOp, { demping: 15, duurMs: 500 })
  const kiezerIn = vlak(t, kiezerOp, kiezerOp + 150)
  const kiezerUit = vlak(t, kiezerDichtOp, kiezerDichtOp + 220, ease.in)
  const kiezerZicht = kiezerIn * (1 - kiezerUit)
  const gekozen = metKiezer && t >= kiesOp
  const gekozenFlits = vlak(t, kiesOp, kiesOp + 300)
  const knopActief = metKiezer && t >= kiezerOp && t < kiezerDichtOp

  // Vlucht van de chip; de schaduw komt 2 frames later aan.
  const vluchtVan = stand.bijlageOp - VLUCHT_MS
  const vlucht = metKiezer && t >= vluchtVan && t < stand.bijlageOp
  const vluchtP = vlak(t, vluchtVan, stand.bijlageOp)
  const schaduwP = vlak(t, vluchtVan + 67, stand.bijlageOp + 67)
  const schaduw = 1 - schaduwP
  const chipRij = metKiezer ? t >= kiezerOp : bijlage
  const chipZichtbaar = metKiezer ? t >= vluchtVan : bijlage
  const chipStijl: React.CSSProperties = metKiezer
    ? vlucht
      ? { transform: `translate(${VLUCHT_DX * (1 - vluchtP)}px, ${VLUCHT_DY * (1 - vluchtP)}px) scale(${0.94 + vluchtP * 0.06})`, transformOrigin: 'left center', position: 'relative', zIndex: 60 }
      : { boxShadow: schaduw > 0.01 ? `0 ${10 * schaduw}px ${28 * schaduw}px rgba(13,52,60,${0.22 * schaduw})` : undefined, position: 'relative', zIndex: 60 }
    : { opacity: bijlageZicht, transform: `scale(${0.92 + bijlagePop * 0.08})`, transformOrigin: 'left center' }
  return (
    <div className="bg-card text-foreground flex flex-col border-l border-border shadow-[-12px_0_32px_rgba(13,52,60,0.10)]" style={{ width: PANEEL_B, height: '100%', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      {/* Kop, ProjectMailDialog */}
      <div className="flex items-center justify-between gap-3 pl-5 pr-2 h-12 border-b border-border/70 flex-shrink-0">
        <div className="min-w-0 flex items-baseline gap-2">
          <span className="text-[14px] font-semibold text-foreground truncate">{project.naam}</span>
          <span className="text-[12.5px] text-muted-foreground truncate">· {klant.bedrijfsnaam}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12.5px] font-semibold text-petrol"><ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />Ga naar project</span>
          <span className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground"><X className="h-4 w-4" /></span>
        </div>
      </div>

      {/* Gesprek, nog leeg */}
      <div className="flex-1 min-h-0 flex items-center justify-center px-6 text-center text-[13px] text-muted-foreground bg-muted/25">
        Nog geen gesprek over dit project. Je eerste bericht start het.
      </div>

      {/* Invoer */}
      <div className="flex-shrink-0 border-t border-border/70 px-4 pt-2 pb-1 bg-background">
        <div className="flex items-center justify-between gap-2 py-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-petrol">Nieuw bericht</span>
          <span className="text-[11.5px] text-muted-foreground truncate">aan {klant.bedrijfsnaam}</span>
        </div>
        <div className="border-y border-border/60 divide-y divide-border/50">
          <div className="flex items-center gap-3 px-3 py-1.5 min-h-[36px] min-w-0">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 w-[74px] flex-shrink-0 whitespace-nowrap">Aan</span>
            <div className="relative flex-1 flex flex-wrap items-center gap-1.5 min-w-0">
              <span className="inline-flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded-full border border-petrol/15 bg-petrol/[0.06] text-[12px] leading-5 text-petrol">{contact.email}<X className="h-3 w-3 text-petrol/50" /></span>
            </div>
            <span className="text-[11px] font-medium text-muted-foreground flex-shrink-0 px-1.5 py-0.5">Cc/Bcc</span>
          </div>
          <div className="flex items-center gap-3 px-3 py-1.5 min-h-[36px] min-w-0">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 w-[74px] flex-shrink-0 whitespace-nowrap">Onderwerp</span>
            <span className="flex-1 min-w-0 text-[13px] font-medium text-foreground truncate">[{project.project_nummer}] {project.naam}</span>
          </div>
        </div>

        {/* Tekst + handtekening als één mailvak */}
        <div className="px-3 pt-3 pb-1 space-y-2">
          <div className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap" style={{ minHeight: 96 }}>
            {tekst}
            {tiktNog && <span className="inline-block w-[1.5px] h-[15px] align-[-3px] bg-flame ml-px" />}
            {!tiktNog && tekst.length === 0 && <span className="text-muted-foreground">Typ je bericht...</span>}
          </div>
          <div className="border-t border-dashed border-border/70 pt-3 text-[12px] leading-[1.5] text-foreground/60">
            <p className="font-heading text-[15px] font-bold tracking-[-0.01em] text-foreground/80 leading-none">{portaalBedrijf.naam.toLowerCase().replace(' ', '')}<span className="text-flame">.</span></p>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-2.5">Creatieve groet,</p>
            <p className="font-heading text-[18px] font-bold tracking-[-0.015em] text-foreground/80 mt-0.5 leading-tight">Antony Bootsma<span className="text-flame">.</span></p>
            <p className="font-mono text-[10.5px] text-foreground/55 mt-1.5">{portaalBedrijf.telefoon} <span className="text-muted-foreground/60">kantoor</span> · {portaalBedrijf.email} · {portaalBedrijf.website}</p>
            <p className="font-mono text-[10.5px] text-foreground/55">{portaalBedrijf.naam} · Industrieweg 3, Ermelo</p>
          </div>
        </div>

        {chipRij && (
          <div className="flex flex-wrap gap-1.5 px-3 pt-2 pb-1" style={{ minHeight: 37, ...(metKiezer ? {} : chipStijl) }}>
            {chipZichtbaar && (
              <span className="inline-flex items-center gap-1.5 pl-1.5 pr-1 py-1 rounded-lg border max-w-full" style={{ borderColor: 'rgba(26,83,92,0.25)', backgroundColor: vlucht ? '#F4F7F7' : 'rgba(26,83,92,0.05)', ...(metKiezer ? chipStijl : {}) }}>
                <FileText className="h-3.5 w-3.5 text-[#C03A18] flex-shrink-0" />
                <span className="text-[11px] font-medium text-foreground truncate">Tekening gevel.pdf</span>
                <span className="text-[9px] font-mono tabular-nums text-muted-foreground">· 1,2 MB</span>
                <span className="h-4 w-4 rounded flex items-center justify-center text-muted-foreground"><X className="h-3 w-3" /></span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actiebalk */}
      <div className="flex flex-col gap-2 px-4 pt-1 pb-3 flex-shrink-0 bg-background">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-0.5 rounded-lg bg-muted/50 border border-border/60 p-0.5">
            <span className={opmaakKnop}><Bold className="h-3.5 w-3.5" /></span>
            <span className={opmaakKnop}><Italic className="h-3.5 w-3.5" /></span>
            <span className={opmaakKnop}><Underline className="h-3.5 w-3.5" /></span>
            <div className="w-px h-4 bg-border mx-0.5" />
            <span className={opmaakKnop}><List className="h-3.5 w-3.5" /></span>
            <span className={opmaakKnop}><LinkIcon className="h-3.5 w-3.5" /></span>
            <div className="w-px h-4 bg-border mx-0.5" />
            <span className={opmaakKnop}><Paperclip className="h-3.5 w-3.5" /></span>
          </div>
          <span className={chipKnop}><FileText className="h-3.5 w-3.5" /><span className="whitespace-nowrap">Template</span><ChevronDown className="h-3 w-3" /></span>
          <div className="relative">
            <span data-doel="uit-project" className={knopActief ? chipKnopOpen : chipKnop}><Plus className="h-3.5 w-3.5" /><span className="whitespace-nowrap">Uit project</span><ChevronDown className="h-3 w-3" style={{ transform: knopActief ? 'rotate(180deg)' : undefined }} /></span>
            {kiezerOpen && (
              <div className="absolute bottom-full mb-2 left-0 z-50 w-[320px] rounded-2xl border border-border bg-white shadow-[0_12px_40px_rgba(0,0,0,0.16)] overflow-hidden" style={{ opacity: kiezerZicht, transform: `translateY(${(1 - kiezerPop) * 6}px) scale(${0.96 + kiezerPop * 0.04 - kiezerUit * 0.02})`, transformOrigin: 'left bottom' }}>
                <div className="px-3 py-2 border-b border-border/60 bg-gradient-to-b from-petrol/[0.05] to-transparent">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-petrol">Toevoegen vanuit project</span>
                </div>
                <div className="py-1">
                  {KIES_GROEPEN.map((g) => (
                    <div key={g.label}>
                      <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground bg-white/95">{g.label}</div>
                      {g.items.map((it) => {
                        const dit = gekozen && it.doel === 'uit-project-tekening'
                        return (
                          <div key={it.naam} data-doel={it.doel} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left" style={{ backgroundColor: dit ? `rgba(26,83,92,${0.05 + (1 - gekozenFlits) * 0.11})` : undefined }}>
                            <span className="h-7 w-7 rounded-md border border-border bg-white flex items-center justify-center flex-shrink-0">{it.icoon}</span>
                            <span className="flex-1 min-w-0 text-[12px] text-foreground truncate">{it.naam}</span>
                            {dit ? (
                              <span className="h-5 w-5 rounded-full bg-petrol flex items-center justify-center flex-shrink-0"><Check className="h-3 w-3 text-white" /></span>
                            ) : (
                              <span className="h-5 w-5 rounded-full border border-border flex items-center justify-center flex-shrink-0 text-muted-foreground"><Plus className="h-3 w-3" /></span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 w-full justify-between pt-2 border-t border-border/60">
          <span className={`inline-flex items-center gap-2 h-8 px-2.5 rounded-lg text-[12px] font-medium border ${opvolgen ? 'bg-petrol/[0.06] text-petrol border-petrol/25' : 'text-foreground/70 border-transparent'}`}>
            <span className={`relative inline-block h-4 w-7 rounded-full ${opvolgen ? 'bg-petrol' : 'bg-[#D4D2CC]'}`}>
              <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow ${opvolgen ? 'left-3.5' : 'left-0.5'}`} />
            </span>
            Opvolgen
          </span>
          {verzonden ? (
            <span className="h-9 px-4 rounded-[10px] text-[13px] font-semibold inline-flex items-center gap-2 bg-[#E8F2EC]" style={{ color: '#3A7D52' }}><Check className="h-3.5 w-3.5" strokeWidth={2.5} />Verzonden</span>
          ) : (
            <div className="relative flex items-center">
              <span data-doel="verzenden" className="h-9 pl-4 pr-3.5 rounded-l-[10px] text-[13px] font-semibold text-white bg-flame shadow-[0_2px_8px_rgba(210,70,32,0.25)] flex items-center gap-2"><Send className="h-3.5 w-3.5" />Verzenden</span>
              <span className="h-9 w-8 rounded-r-[10px] bg-flame text-white border-l border-white/25 flex items-center justify-center"><ChevronDown className="h-3.5 w-3.5" /></span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
