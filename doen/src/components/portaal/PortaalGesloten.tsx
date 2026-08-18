import { Building2, XCircle } from 'lucide-react'

interface PortaalGeslotenProps {
  bedrijfsnaam: string
  telefoon?: string
  email?: string
  logoUrl?: string
}

export function PortaalGesloten({ bedrijfsnaam, telefoon, email, logoUrl }: PortaalGeslotenProps) {
  return (
    <div className="min-h-screen bg-[#F8F7F5] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {logoUrl && (
          <img src={logoUrl} alt={bedrijfsnaam} className="h-10 w-auto mx-auto object-contain" />
        )}
        <div className="w-16 h-16 rounded-full bg-[#FDE8E4] flex items-center justify-center mx-auto">
          <XCircle className="w-8 h-8 text-[#C0451A]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.3px] text-[#1A1A1A] mb-2">
            Dit portaal is gesloten<span className="text-[#F15025]">.</span>
          </h1>
          <p className="text-[#6B6B66]">
            Neem contact op met {bedrijfsnaam || 'het bedrijf'} voor vragen.
          </p>
        </div>

        {(bedrijfsnaam || telefoon || email) && (
          <div className="bg-[#FFFFFF] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-6 text-left space-y-3">
            <div className="flex items-center gap-2 text-[#1A1A1A] font-medium">
              <Building2 className="w-4 h-4 text-[#6B6B66]" />
              <span>{bedrijfsnaam || 'Contactgegevens'}</span>
            </div>
            {telefoon && (
              <p className="text-sm text-[#6B6B66]">
                Tel: <a href={`tel:${telefoon}`} className="text-[#1A535C] hover:underline">{telefoon}</a>
              </p>
            )}
            {email && (
              <p className="text-sm text-[#6B6B66]">
                Email: <a href={`mailto:${email}`} className="text-[#1A535C] hover:underline">{email}</a>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
