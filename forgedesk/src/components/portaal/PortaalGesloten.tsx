import { ContactKnoppen, KlantKop, MogelijkGemaaktDoor, Paneel, StatusWoord, STATUS_KLEUR } from '@/components/klantpagina/Klantstijl'

interface PortaalGeslotenProps {
  bedrijfsnaam: string
  telefoon?: string
  email?: string
  logoUrl?: string
  kopKleur?: string
}

export function PortaalGesloten({ bedrijfsnaam, telefoon, email, logoUrl, kopKleur }: PortaalGeslotenProps) {
  return (
    <div className="min-h-screen bg-[#F8F7F5]">
      <KlantKop kleur={kopKleur} logoUrl={logoUrl} bedrijfsnaam={bedrijfsnaam} breedte="max-w-[760px]" />
      <main className="mx-auto max-w-[760px] space-y-10 px-4 py-10 md:px-8 md:py-14">
        <Paneel>
          <p><StatusWoord kleur={STATUS_KLEUR.neutraal} groot>Dit portaal is gesloten</StatusWoord></p>
          <p className="mt-2 text-sm text-[#6B6B66]">
            Neem contact op met {bedrijfsnaam || 'het bedrijf'} voor vragen over uw project.
          </p>
          {(telefoon || email) && (
            <div className="mt-5">
              <ContactKnoppen telefoon={telefoon} email={email} />
            </div>
          )}
        </Paneel>
        <MogelijkGemaaktDoor />
      </main>
    </div>
  )
}
