import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { FileText, Receipt, Users, ClipboardList, Calendar, Sparkles, ArrowRight } from 'lucide-react'

const features = [
  { icon: FileText, title: 'Offertes maken en versturen als PDF', description: 'Professionele offertes in je huisstijl', color: '#E8866A' },
  { icon: Receipt, title: 'Facturen genereren en bijhouden', description: 'Van offerte naar factuur in één klik', color: '#7EB5A6' },
  { icon: Users, title: 'Klanten en projecten beheren', description: 'Overzichtelijk klantenbeheer', color: '#8BAFD4' },
  { icon: ClipboardList, title: 'Werkbonnen voor je team', description: 'Digitale werkbonnen met foto\'s en handtekeningen', color: '#C4A882' },
  { icon: Calendar, title: 'Planning en montage-afspraken', description: 'Plan montages en afspraken visueel', color: '#9B8EC4' },
  { icon: Sparkles, title: 'AI-assistent Forgie helpt je met teksten', description: 'Schrijf offerteteksten in een handomdraai', color: '#D4836A' },
]

export function WelkomPagina() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center p-5 relative overflow-hidden" style={{
      background: `
        radial-gradient(ellipse 70% 50% at 15% 5%, #7EB5A620 0%, transparent 60%),
        radial-gradient(ellipse 60% 45% at 90% 20%, #E8866A18 0%, transparent 55%),
        radial-gradient(ellipse 50% 40% at 50% 95%, #9B8EC415 0%, transparent 50%),
        radial-gradient(ellipse 55% 40% at 80% 70%, #C4A88212 0%, transparent 50%),
        radial-gradient(ellipse 45% 35% at 5% 60%, #8BAFD410 0%, transparent 45%),
        hsl(var(--background))
      `
    }}>
      {/* Animated accent orbs */}
      <div className="absolute top-[-100px] right-[-40px] w-[450px] h-[450px] rounded-full blur-[100px] opacity-30 pointer-events-none" style={{ background: 'linear-gradient(135deg, #7EB5A6, #8BAFD4)' }} />
      <div className="absolute bottom-[-80px] left-[-60px] w-[350px] h-[350px] rounded-full blur-[90px] opacity-25 pointer-events-none" style={{ background: 'linear-gradient(225deg, #E8866A, #9B8EC4)' }} />
      <div className="absolute top-[30%] right-[10%] w-[200px] h-[200px] rounded-full blur-[70px] opacity-20 pointer-events-none" style={{ background: '#C4A882' }} />

      <div className="w-full max-w-2xl text-center relative z-10 bg-card/60 backdrop-blur-xl rounded-3xl border border-border/50 shadow-[0_8px_40px_rgba(0,0,0,0.04)] p-8 sm:p-12">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg" style={{ boxShadow: '0 4px 14px hsl(var(--primary) / 0.3)' }}>
            <svg className="w-5.5 h-5.5 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="12" rx="2" />
              <path d="M8 20h8" />
              <path d="M12 16v4" />
            </svg>
          </div>
          <span className="text-xl font-extrabold text-foreground tracking-tight font-display">FORGEdesk</span>
        </div>

        {/* Branded accent line */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          <div className="h-1 w-8 rounded-full" style={{ backgroundColor: '#E8866A' }} />
          <div className="h-1 w-8 rounded-full" style={{ backgroundColor: '#7EB5A6' }} />
          <div className="h-1 w-8 rounded-full" style={{ backgroundColor: '#8BAFD4' }} />
          <div className="h-1 w-8 rounded-full" style={{ backgroundColor: '#9B8EC4' }} />
          <div className="h-1 w-8 rounded-full" style={{ backgroundColor: '#C4A882' }} />
        </div>

        <h1 className="text-3xl font-extrabold text-foreground mb-3 font-display">
          Welkom bij FORGEdesk!
        </h1>

        <p className="text-[15px] text-muted-foreground mb-10 max-w-lg mx-auto leading-relaxed">
          Je account is aangemaakt. In de komende 30 dagen kun je alles gratis uitproberen — zonder verplichtingen.
        </p>

        {/* Feature header */}
        <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-5">
          Wat je allemaal kunt
        </p>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10 text-left">
          {features.map(({ icon: Icon, title, description, color }) => (
            <div
              key={title}
              className="flex items-start gap-3 p-4 bg-card rounded-xl border border-border hover:shadow-md transition-shadow"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: `${color}15` }}
              >
                <Icon className="w-[18px] h-[18px]" style={{ color }} />
              </div>
              <div>
                <p className="text-[13.5px] font-semibold text-foreground">{title}</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">{description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Timing */}
        <p className="text-[13px] text-muted-foreground mb-5">
          Dit duurt ongeveer 2 minuten.
        </p>

        {/* CTA */}
        <Button
          onClick={() => navigate('/onboarding')}
          className="h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold text-[15px] px-8 group"
        >
          Mijn bedrijf instellen
          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </Button>
      </div>
    </div>
  )
}
