import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { FileText, Receipt, Users, ClipboardList, Calendar, Sparkles, ArrowRight } from 'lucide-react'

const features = [
  { icon: FileText, title: 'Offertes maken en versturen als PDF', description: 'Professionele offertes in je huisstijl' },
  { icon: Receipt, title: 'Facturen genereren en bijhouden', description: 'Van offerte naar factuur in één klik' },
  { icon: Users, title: 'Klanten en projecten beheren', description: 'Overzichtelijk klantenbeheer' },
  { icon: ClipboardList, title: 'Werkbonnen voor je team', description: 'Digitale werkbonnen met foto\'s en handtekeningen' },
  { icon: Calendar, title: 'Planning en montage-afspraken', description: 'Plan montages en afspraken visueel' },
  { icon: Sparkles, title: 'AI-assistent Forgie helpt je met teksten', description: 'Schrijf offerteteksten in een handomdraai' },
]

export function WelkomPagina() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ backgroundColor: '#F4F3F0' }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div className="w-full max-w-2xl text-center">
        {/* Celebration */}
        <div className="text-5xl mb-6 animate-bounce" style={{ animationDuration: '2s', animationIterationCount: '3' }}>
          🎉
        </div>

        <h1 className="text-3xl font-extrabold text-black mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Welkom bij FORGEdesk!
        </h1>

        <p className="text-[15px] text-neutral-600 mb-10 max-w-lg mx-auto leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
          Je account is aangemaakt. In de komende 30 dagen kun je alles gratis uitproberen — zonder verplichtingen.
        </p>

        {/* Feature header */}
        <p className="text-[13px] font-semibold text-neutral-500 uppercase tracking-wider mb-5" style={{ fontFamily: 'Inter, sans-serif' }}>
          Wat je allemaal kunt
        </p>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10 text-left">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex items-start gap-3 p-4 bg-white rounded-xl border border-neutral-200"
            >
              <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-4.5 h-4.5 text-neutral-700" />
              </div>
              <div>
                <p className="text-[13.5px] font-semibold text-black" style={{ fontFamily: 'Inter, sans-serif' }}>{title}</p>
                <p className="text-[12px] text-neutral-500 mt-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>{description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Timing */}
        <p className="text-[13px] text-neutral-500 mb-5" style={{ fontFamily: 'Inter, sans-serif' }}>
          Dit duurt ongeveer 2 minuten.
        </p>

        {/* CTA */}
        <Button
          onClick={() => navigate('/onboarding')}
          className="h-12 bg-black text-white hover:bg-neutral-800 rounded-xl font-semibold text-[15px] px-8 group"
        >
          Mijn bedrijf instellen
          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </Button>
      </div>
    </div>
  )
}
