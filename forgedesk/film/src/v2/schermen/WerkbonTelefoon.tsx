import { MapPin, Phone } from 'lucide-react'
import { WerkbonMonteurFeedback } from '@/components/werkbonnen/WerkbonMonteurFeedback'
import { MobielTop } from '../../kern/AppChrome'
import { SCHERM_B, SCHERM_H } from '../../kern/TelefoonFrame'
import { project, klant, contact, montage, werkbonNummer, fotoNa } from '../../mockData'
import { merk, grond } from '../../brand'
import { typ } from '../../kern/Typ'
import { vlak } from '../../tijd'

// De werkbon van de monteur op de telefoon: kop zoals WerkbonMonteurView,
// daaronder de echte foto- en handtekeningsectie uit WerkbonMonteurFeedback.
export type WerkbonTelefoonStand = {
  fotoOp: number      // ms waarop de na-foto in de sectie Na staat
  tekenOp?: number    // ms waarop de klant zijn naam tikt en tekent
}

// Handtekening als SVG-data-url die zichzelf tekent: pathLength 1 en een
// dash-offset uit t. Zo blijft de echte component (img-tak) in gebruik.
const HANDTEKENING_PAD = 'M 60 130 C 70 60, 120 40, 110 100 C 100 160, 60 170, 80 120 C 100 80, 150 70, 190 90 C 230 110, 200 150, 250 115 C 290 90, 300 130, 340 105 C 370 88, 380 120, 420 100 C 450 85, 470 110, 520 95 C 545 88, 555 100, 560 92'
const handtekeningUrl = (p: number) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200" width="600" height="200"><path d="${HANDTEKENING_PAD}" fill="none" stroke="${merk.ink}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${(1 - p).toFixed(4)}"/></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export const WerkbonTelefoon: React.FC<{ t: number; stand: WerkbonTelefoonStand }> = ({ t, stand }) => {
  const fotos = t >= stand.fotoOp ? [fotoNa] : []
  const tekenOp = stand.tekenOp
  const naam = tekenOp === undefined ? '' : typ(contact.naam, t, tekenOp, 45)
  const streekOp = tekenOp === undefined ? undefined : tekenOp + 900
  const streek = streekOp === undefined ? 0 : vlak(t, streekOp, streekOp + 1100)
  const getekend = streekOp !== undefined && t >= streekOp
  // Zodra er getekend wordt schuift de inhoud omhoog, zodat het
  // handtekeningveld binnen het scherm valt.
  const scroll = tekenOp === undefined ? 0 : vlak(t, tekenOp - 500, tekenOp + 100) * 260
  return (
    <div className="bg-background flex flex-col" style={{ width: SCHERM_B, height: SCHERM_H, position: 'relative', overflow: 'hidden' }}>
      <div style={{ transform: `translateY(${-scroll}px)` }}>
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
        <div className="px-4 pt-3 pb-6" style={{ position: 'relative' }}>
          {/* Midden van de knop "Na foto", gemeten op een still. */}
          <div data-doel="na-foto" style={{ position: 'absolute', left: 280, top: 108, width: 1, height: 1, pointerEvents: 'none' }} />
          <WerkbonMonteurFeedback
            key={getekend ? 'getekend' : 'leeg'}
            showUren={false} showOpmerkingen={false} showFotos showHandtekening
            urenGewerkt={undefined} monteurOpmerkingen="" fotos={fotos} klantNaamGetekend={naam} handtekeningData={getekend ? handtekeningUrl(streek) : undefined}
            onUrenChange={() => {}} onOpmerkingenChange={() => {}} onFotoToevoegen={() => {}} onFotoVerwijderen={() => {}}
            onKlantNaamChange={() => {}} onHandtekeningChange={() => {}} onLightbox={() => {}}
            status="definitief"
          />
        </div>
      </div>
    </div>
  )
}

// Het scherm in een telefoonbehuizing, als los object voor de 3D-ruimte.
// Buitenmaat 418 x 872 css-px (390 x 844 plus 14 px rand).
export const TelefoonInRuimte: React.FC<{ t: number; stand: WerkbonTelefoonStand }> = ({ t, stand }) => {
  const rand = 14
  return (
    <div style={{ position: 'relative', width: SCHERM_B + rand * 2, height: SCHERM_H + rand * 2 }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 64, backgroundColor: grond.diep, boxShadow: '0 60px 120px -40px rgba(0,0,0,0.55), 0 0 0 2px rgba(255,255,255,0.06) inset' }} />
      <div style={{ position: 'absolute', left: rand, top: rand, width: SCHERM_B, height: SCHERM_H, borderRadius: 50, overflow: 'hidden', backgroundColor: merk.pagina }}>
        <WerkbonTelefoon t={t} stand={stand} />
        <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', width: 120, height: 34, borderRadius: 999, backgroundColor: grond.diep }} />
      </div>
    </div>
  )
}
