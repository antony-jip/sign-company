import { MapPin, Phone } from 'lucide-react'
import { WerkbonMonteurFeedback } from '@/components/werkbonnen/WerkbonMonteurFeedback'
import { MobielTop } from '../../kern/AppChrome'
import { SCHERM_B, SCHERM_H, StatusBalk } from '../../kern/TelefoonFrame'
import { project, klant, contact, montage, werkbonNummer, fotoNa } from '../../mockData'
import { merk, grond } from '../../brand'
import { typ } from '../../kern/Typ'
import { vlak, ease } from '../../tijd'

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
  // Foto-landing (HIGHEND 12): de na-foto komt scherp in beeld, scale 0,94
  // naar 1 en blur 4 naar 0 in 400 ms. Gaat als css-variabelen naar de
  // fototegel in WerkbonMonteurFeedback (zie FOTO_CSS).
  const landP = vlak(t, stand.fotoOp, stand.fotoOp + 400, ease.enter)
  const fotoVars = landP >= 1 ? undefined : { '--foto-t': `scale(${0.94 + landP * 0.06})`, '--foto-f': `blur(${(1 - landP) * 4}px)` } as React.CSSProperties
  return (
    <div className="bg-background flex flex-col" style={{ width: SCHERM_B, height: SCHERM_H, position: 'relative', overflow: 'hidden' }}>
      <style>{FOTO_CSS}</style>
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
          <div data-fotoland={fotoVars ? '' : undefined} style={fotoVars}>
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
      {/* Statusbalk als glas: blijft staan als de inhoud scrolt, 20 px backdrop-blur. */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 54, zIndex: 5, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', backgroundColor: `${merk.pagina}B8`, boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.5)' }}>
        <StatusBalk />
      </div>
    </div>
  )
}

const FOTO_CSS = `
[data-fotoland] .grid > div { transform: var(--foto-t, none); filter: var(--foto-f, none); }
`

// Het scherm in een telefoonbehuizing, als los object voor de 3D-ruimte.
// Buitenmaat 418 x 872 css-px (390 x 844 plus 14 px rand).
// Glas (HIGHEND 12): 1 px witte rand op 0,4 om het frame, hairline toplicht,
// scherm concentrisch met de behuizing (radius 44 buiten, 30 binnen: bij de
// kaartradius van 20-28 px elders in de film).
const FRAME_RADIUS = 44
export const TelefoonInRuimte: React.FC<{ t: number; stand: WerkbonTelefoonStand }> = ({ t, stand }) => {
  const rand = 14
  return (
    <div style={{ position: 'relative', width: SCHERM_B + rand * 2, height: SCHERM_H + rand * 2 }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: FRAME_RADIUS, backgroundColor: grond.diep, boxShadow: '0 60px 120px -40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.4), inset 0 1px 0 rgba(255,255,255,0.55), inset 0 0 0 1px rgba(255,255,255,0.06)' }} />
      {/* Toplicht: hairline tussen de hoekrondingen, het licht valt van boven. */}
      <div style={{ position: 'absolute', top: 0, left: FRAME_RADIUS, right: FRAME_RADIUS, height: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0) 100%)' }} />
      <div style={{ position: 'absolute', left: rand, top: rand, width: SCHERM_B, height: SCHERM_H, borderRadius: FRAME_RADIUS - rand, overflow: 'hidden', backgroundColor: merk.pagina }}>
        <WerkbonTelefoon t={t} stand={stand} />
        <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', width: 120, height: 34, borderRadius: 999, backgroundColor: grond.diep, zIndex: 6 }} />
      </div>
    </div>
  )
}
