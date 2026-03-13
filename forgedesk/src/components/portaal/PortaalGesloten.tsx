import { Building2, XCircle } from 'lucide-react'

interface PortaalGeslotenProps {
  bedrijfsnaam: string
  telefoon?: string
  email?: string
}

export function PortaalGesloten({ bedrijfsnaam, telefoon, email }: PortaalGeslotenProps) {
  return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#F7ECE7] flex items-center justify-center mx-auto">
          <XCircle className="w-8 h-8 text-[#C49585]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A] tracking-[-0.03em] mb-2">Portaal gesloten</h1>
          <p className="text-[#5A5A55] leading-relaxed">
            Dit portaal is niet meer beschikbaar.
          </p>
        </div>

        {(bedrijfsnaam || telefoon || email) && (
          <div className="bg-white rounded-xl border border-[#E8E8E3] p-6 text-left space-y-3 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
            <div className="flex items-center gap-2 text-[#1A1A1A] font-semibold text-sm">
              <Building2 className="w-4 h-4 text-[#8A8A85]" />
              <span>{bedrijfsnaam || 'Contactgegevens'}</span>
            </div>
            {telefoon && (
              <p className="text-sm text-[#5A5A55]">
                Tel: <a href={`tel:${telefoon}`} className="text-[#5D7A93] hover:text-[#1A1A1A] transition-colors">{telefoon}</a>
              </p>
            )}
            {email && (
              <p className="text-sm text-[#5A5A55]">
                Email: <a href={`mailto:${email}`} className="text-[#5D7A93] hover:text-[#1A1A1A] transition-colors">{email}</a>
              </p>
            )}
          </div>
        )}

        <p className="text-xs text-[#C0C0BA]">
          Powered by <strong className="font-semibold text-[#8A8A85]">FORGE</strong><span className="text-[#8A8A85]">desk</span>
        </p>
      </div>
    </div>
  )
}
