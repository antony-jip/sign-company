import { MapPin, Phone } from 'lucide-react'
import { WerkbonMonteurFeedback } from '@/components/werkbonnen/WerkbonMonteurFeedback'
import { MobielTop } from '../kern/AppChrome'
import { TikRing } from '../kern/TikRing'
import { project, klant, contact, montage, werkbonNummer, fotoNa } from '../mockData'

// Monteur-werkbon op de bouwplaats: kop zoals WerkbonMonteurView, daaronder de
// echte fotosectie uit WerkbonMonteurFeedback.
export const WerkbonScherm: React.FC<{ t: number; fotoOp: number; tikOp: number }> = ({ t, fotoOp, tikOp }) => {
  const fotos = t >= fotoOp ? [fotoNa] : []
  return (
    <div className="absolute inset-0 bg-background flex flex-col">
      <MobielTop titel={`Werkbon ${werkbonNummer}`} terug />
      <div className="px-4 pt-2">
        <h1 className="font-heading text-[20px] font-bold leading-tight tracking-[-0.015em] text-foreground">{project.naam}</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">{klant.bedrijfsnaam} · {montage.titel}</p>
        <div className="mt-3 rounded-xl doen-panel px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Contact op locatie</p>
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <span className="text-[14px] font-semibold text-foreground">{contact.naam}</span>
            <span className="inline-flex items-center gap-1 text-[12px] text-petrol font-semibold"><Phone className="h-3.5 w-3.5" />{contact.telefoon}</span>
          </div>
          <p className="mt-1 inline-flex items-center gap-1 text-[12px] text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{montage.locatie}</p>
        </div>
      </div>
      <div className="px-4 pt-3" style={{ position: 'relative' }}>
        <TikRing t={t} op={tikOp} x={282} y={96} schaal={1 / 2.3} />
        <WerkbonMonteurFeedback
          showUren={false} showOpmerkingen={false} showFotos showHandtekening={false}
          urenGewerkt={undefined} monteurOpmerkingen="" fotos={fotos} klantNaamGetekend="" handtekeningData={undefined}
          onUrenChange={() => {}} onOpmerkingenChange={() => {}} onFotoToevoegen={() => {}} onFotoVerwijderen={() => {}}
          onKlantNaamChange={() => {}} onHandtekeningChange={() => {}} onLightbox={() => {}}
          status="definitief"
        />
      </div>
    </div>
  )
}
