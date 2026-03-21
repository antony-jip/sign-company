import { Building2, XCircle } from 'lucide-react'

interface PortaalGeslotenProps {
  bedrijfsnaam: string
  telefoon?: string
  email?: string
  logoUrl?: string
}

export function PortaalGesloten({ bedrijfsnaam, telefoon, email, logoUrl }: PortaalGeslotenProps) {
  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {logoUrl && (
          <img src={logoUrl} alt={bedrijfsnaam} className="h-10 w-auto mx-auto object-contain" />
        )}
        <div className="w-16 h-16 rounded-full bg-[#FDE8E2] flex items-center justify-center mx-auto">
          <XCircle className="w-8 h-8 text-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Dit portaal is gesloten</h1>
          <p className="text-gray-600">
            Neem contact op met {bedrijfsnaam || 'het bedrijf'} voor vragen.
          </p>
        </div>

        {(bedrijfsnaam || telefoon || email) && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-left space-y-3">
            <div className="flex items-center gap-2 text-gray-700 font-medium">
              <Building2 className="w-4 h-4" />
              <span>{bedrijfsnaam || 'Contactgegevens'}</span>
            </div>
            {telefoon && (
              <p className="text-sm text-gray-600">
                Tel: <a href={`tel:${telefoon}`} className="text-blue-600 hover:underline">{telefoon}</a>
              </p>
            )}
            {email && (
              <p className="text-sm text-gray-600">
                Email: <a href={`mailto:${email}`} className="text-blue-600 hover:underline">{email}</a>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
