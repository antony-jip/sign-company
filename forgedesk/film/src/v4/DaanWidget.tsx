import { Check, Circle, Loader2, MessageSquare, RotateCcw, Send, Sparkles, X } from 'lucide-react'
import { merk } from '../brand'
import { typ } from '../kern/Typ'
import { klant, project } from '../mockData'
import { veer, vlak } from '../tijd'

// De Daan-chatwidget, nagebouwd naar ForgieChatWidget.tsx en DaanActiePlan.tsx
// (zie team/DAAN-UX.md): petrol header met avatar "D", openingsbericht,
// suggestiechips, gebruikersbubbel, "Daan denkt na…", en het actieplan
// "Daan zet dit klaar" waarin klant, project en offerte live afvinken.
// Het echte component hangt aan auth, Supabase-realtime en een stream; deze
// nabouw gebruikt dezelfde klassen en teksten en loopt op t.
export type DaanWidgetStand = {
  typOp: number       // gebruiker typt de vraag
  verzendOp: number   // klik op verzenden (data-doel="daan-verzend")
  denktOp: number     // "Daan denkt na…"
  planOp: number      // actieplan verschijnt: klant gekoppeld
  projectOp: number   // project aanmaken… klaar
  offerteOp: number   // offerte klaar
  linkOp: number      // "Bekijk het project"
}

const VRAAG = 'Zet een project op voor Van der Berg Interieur, gevelreclame showroom, met een offerte erbij'
const PETROL_DARK = '#143F46'

export const DaanWidget: React.FC<{ t: number; stand: DaanWidgetStand }> = ({ t, stand }) => {
  const vraag = typ(VRAAG, t, stand.typOp, 28)
  const verzonden = t >= stand.verzendOp
  const denkt = t >= stand.denktOp && t < stand.planOp
  const plan = t >= stand.planOp
  const planP = veer(t, stand.planOp, { demping: 18, duurMs: 500 })
  const bubbelP = veer(t, stand.verzendOp, { demping: 18, duurMs: 450 })
  const projectBezig = t >= stand.planOp + 250 && t < stand.projectOp
  const projectKlaar = t >= stand.projectOp
  const offerteBezig = t >= stand.projectOp && t < stand.offerteOp
  const offerteKlaar = t >= stand.offerteOp
  const link = t >= stand.linkOp
  const Stap: React.FC<{ status: 'klaar' | 'bezig' | 'wacht'; label: string }> = ({ status, label }) => (
    <div className="flex items-center gap-2.5 px-3 py-2 text-[13px]">
      {status === 'klaar' && <Check className="w-3.5 h-3.5" style={{ color: '#3A7D52' }} />}
      {status === 'bezig' && <Loader2 className="w-3.5 h-3.5 text-flame" style={{ transform: `rotate(${(t * 0.36) % 360}deg)` }} />}
      {status === 'wacht' && <Circle className="w-2 h-2 text-muted-foreground/40" />}
      <span className={status === 'wacht' ? 'text-muted-foreground' : 'text-foreground'}>{label}</span>
    </div>
  )
  return (
    <div className="flex flex-col bg-card text-foreground" style={{ width: 440, height: 660, borderRadius: 12, border: '0.5px solid #E6E4E0', boxShadow: '0 8px 32px rgba(120,90,50,0.12)', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ background: `linear-gradient(135deg, ${merk.petrol} 0%, ${PETROL_DARK} 100%)` }}>
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-[34px] h-[34px] rounded-xl bg-white/10">
            <span className="text-white text-sm font-extrabold">D</span>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-flame ring-2 ring-petrol" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white leading-tight">Daan<span className="text-flame">.</span></h2>
            <p className="text-[10px] text-white/55 leading-tight">je digitale collega</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-white/70"><RotateCcw className="w-4 h-4" /><X className="w-4 h-4" /></div>
      </div>
      {/* Berichten */}
      <div className="flex-1 min-h-0 px-3.5 py-3 space-y-3 overflow-hidden" style={{ backgroundColor: '#FAF9F6' }}>
        <div className="flex items-end gap-2">
          <span className="w-6 h-6 rounded-full bg-petrol text-white text-[10px] font-extrabold flex items-center justify-center flex-shrink-0">D</span>
          <div className="bg-card rounded-2xl rounded-bl-md border border-border/60 shadow-sm px-3.5 py-2.5 text-[13px] leading-relaxed max-w-[320px]">Hoi, ik ben <b>Daan</b>. Stel me een vraag over je klanten, projecten, offertes of facturen, of vraag me iets aan te maken.</div>
        </div>
        {!verzonden && (
          <div className="flex flex-wrap gap-1.5 pl-8">
            {['Maak een offerte voor een klant', 'Zet een nieuw project op', 'Wat staat er open?', 'Omzet deze maand'].map((c) => (
              <span key={c} className="text-[10px] text-foreground/80 px-2.5 py-1 rounded-full bg-card" style={{ border: '0.5px solid #E6E4E0' }}>{c}</span>
            ))}
          </div>
        )}
        {verzonden && (
          <div className="flex justify-end" style={{ opacity: Math.min(1, bubbelP * 1.3), transform: `translateY(${(1 - bubbelP) * 8}px)` }}>
            <div className="bg-petrol text-white rounded-2xl rounded-br-md px-3.5 py-2.5 text-[13px] leading-relaxed max-w-[320px]">{VRAAG}</div>
          </div>
        )}
        {denkt && (
          <div className="flex items-end gap-2">
            <span className="w-6 h-6 rounded-full bg-petrol text-white text-[10px] font-extrabold flex items-center justify-center flex-shrink-0">D</span>
            <div className="bg-card rounded-2xl rounded-bl-md border border-border/60 shadow-sm px-3.5 py-2.5 text-[12px] text-muted-foreground flex items-center gap-2">
              <span className="flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" style={{ transform: `translateY(${Math.sin((t / 150) + i * 1.1) * 2.5}px)` }} />)}</span>
              Daan denkt na…
            </div>
          </div>
        )}
        {plan && (
          <div className="flex items-start gap-2" style={{ opacity: Math.min(1, planP * 1.3), transform: `translateY(${(1 - planP) * 10}px)` }}>
            <span className="w-6 h-6 rounded-full bg-petrol text-white text-[10px] font-extrabold flex items-center justify-center flex-shrink-0">D</span>
            <div className="flex-1 min-w-0">
              <div className="bg-card rounded-2xl rounded-bl-md border border-border/60 shadow-sm px-3.5 py-2.5 text-[13px] leading-relaxed">Ik zet het klaar.</div>
              {/* DaanActiePlan */}
              <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden mt-2 w-full">
                <div className="flex items-center gap-1.5 px-3 py-2 border-b" style={{ backgroundColor: '#FDE8E2', borderColor: 'rgba(210,70,32,0.18)' }}>
                  <Sparkles className="w-3.5 h-3.5 text-flame" />
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#C03A18' }}>Daan zet dit klaar</span>
                </div>
                <Stap status="klaar" label={`Klant gekoppeld · ${klant.bedrijfsnaam}`} />
                <Stap status={projectKlaar ? 'klaar' : projectBezig ? 'bezig' : 'wacht'} label={projectKlaar ? `Project · ${project.naam}` : projectBezig ? 'Project aanmaken…' : 'Project'} />
                <Stap status={offerteKlaar ? 'klaar' : offerteBezig ? 'bezig' : 'wacht'} label={offerteKlaar ? 'Offerte · OFF-2026-0042, concept' : offerteBezig ? 'Offerte aanmaken…' : 'Offerte'} />
                {link && (
                  <div className="px-3 py-2.5 border-t border-border/60 text-[13px] font-semibold text-petrol" style={{ opacity: vlak(t, stand.linkOp, stand.linkOp + 250) }}>Bekijk het project →</div>
                )}
              </div>
              {link && <p className="mt-1.5 text-[11px] text-muted-foreground" style={{ opacity: vlak(t, stand.linkOp + 200, stand.linkOp + 500) }}>Genoteerd: Van der Berg Interieur wil eerst een proef zien<span className="text-flame">.</span></p>}
            </div>
          </div>
        )}
      </div>
      {/* Invoer */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-t border-border flex-shrink-0 bg-card">
        <div className="flex-1 h-9 rounded-lg bg-muted/50 px-3 flex items-center text-[13px]">
          {verzonden ? <span className="text-muted-foreground">Zeg het tegen Daan…</span> : vraag ? <span className="text-foreground">{vraag}<span className="text-flame">|</span></span> : <span className="text-muted-foreground">Zeg het tegen Daan…</span>}
        </div>
        <span data-doel="daan-verzend" className="w-9 h-9 rounded-lg bg-flame text-white flex items-center justify-center flex-shrink-0"><Send className="w-4 h-4" /></span>
      </div>
      <span className="hidden"><MessageSquare /></span>
    </div>
  )
}
