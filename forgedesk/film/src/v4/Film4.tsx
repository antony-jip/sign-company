import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { FlameDot } from '../kern/FlameDot'
import { merk } from '../brand'
import { vlak } from '../tijd'
import { Belofte } from '../v2/Belofte'
import { Cockpit, type CockpitStand } from '../v2/Cockpit'
import { Cursor, type CursorStap } from '../v2/Cursor'
import { FORMATEN, FormaatCtx } from '../v2/formaat'
import { MailApp } from '../v2/schermen/MailApp'
import { H1, O } from './beats4'
import { camera4, Paneel, Ruimte, type CameraStop4 } from './Ruimte'
import { Hoofdstukkaart, Rondleiding4, Statuswoord } from './Tekst'
import { useTexturen } from './texturen'
import { thema } from './thema'
import { PUNT_THUIS, projecteer, Wereld3D } from './Wereld3D'

export const FILM4_DUUR_MS = H1.eind

// Panelen in de ruimte (wereld-px). Mail links, project rechts.
const PLEK = { mail: { x: 0, y: 0 }, cockpit: { x: 2600, y: 0 } }

// Camera: alleen bewegen tussen hoofdstukken.
const STOPS: CameraStop4[] = [
  { ms: 0, ...PLEK.mail },
  { ms: H1.dollyOp, ...PLEK.cockpit },
]

// Overdrachtspunt: waar de 3D-punt zit op het moment dat de DOM-cursor het overneemt.
const OVERDRACHT_MS = O.eind + 1000
const overdracht = projecteer(OVERDRACHT_MS, PUNT_THUIS)

// De punt als cursor: eerst vast op het overdrachtspunt, dan naar de knop, dan naar het statuswoord.
const CURSOR: CursorStap[] = [
  { ms: OVERDRACHT_MS, doel: overdracht },
  { ms: H1.klikProject - 780, doel: 'project-aanmaken', klik: true },
  { ms: H1.statusVlucht, doel: 'status-punt' },
]

// Lagen (remotion-motion-graphics regel 5), van onder naar boven:
// grond, 3D-opening, ruimte met app-panelen, tekst, kleurgrade, grain plus vignet.
export const Film4: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()
  const t = (frame / fps) * 1000
  const tex = useTexturen()
  const F = FORMATEN['16:9']

  const cam = camera4(t, STOPS)
  const inslagFlits = t >= O.inslagOp ? 1 - vlak(t, O.inslagOp, O.inslagOp + 200) : 0
  const openingZicht = 1 - vlak(t, O.eind + 1400, O.eind + 2000)

  // Duik: het mailpaneel komt uit de diepte (diepte 1,6 naar 0) terwijl de
  // 3D-camera door het logo pusht.
  const duikP = vlak(t, H1.duikOp + 600, H1.duikTot, thema.ease.camera)
  const ruimteZicht = vlak(t, H1.duikOp + 600, H1.duikOp + 1100)
  // Dolly mail -> cockpit: diepten wisselen.
  const dollyP = vlak(t, H1.dollyOp, H1.dollyTot, thema.ease.inUit)
  const diepteMail = (1 - duikP) * 1.6 + dollyP
  const diepteCockpit = 1 - dollyP

  const mailStand = { gekozen: true, klantOp: 0, projectOp: H1.projectOp }
  const cockpitStand: CockpitStand = {
    status: 'gepland', portaal: [], activiteiten: [], tab: 'Overzicht', meldingen: 0,
    // Voor de portaal-stap van de rondleiding scrolt de pagina 170 px omhoog.
    scrollY: vlak(t, H1.rondOp + 2 * H1.rondStap - 700, H1.rondOp + 2 * H1.rondStap - 150, thema.ease.inUit) * 300,
    blokOp: { kop: H1.cockpitOp, fase: H1.cockpitOp + 150, briefing: H1.cockpitOp + 300, grid: H1.cockpitOp + 450, portaal: H1.cockpitOp + 600, tijd: H1.cockpitOp + 250, klant: H1.cockpitOp + 400, team: H1.cockpitOp + 550, acties: H1.cockpitOp + 700 },
  }

  return (
    <FormaatCtx.Provider value={F}>
    <AbsoluteFill data-film-root className="film-root" style={{ backgroundColor: thema.kleur.studio, fontFamily: thema.fonts.body }}>
      {/* Lichte studio: crème grond met zachte kleurvlekken (flame, petrol, zand) die traag ademen */}
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${thema.kleur.studio} 0%, ${thema.kleur.studioLaag} 100%)` }} />
      <div style={{ position: 'absolute', inset: -300, filter: 'blur(80px) saturate(1.3)' }}>
        <div style={{ position: 'absolute', left: 300 + width * 0.15 - 700 + Math.sin(t / 13000) * 90, top: 300 + height * 0.2 - 700, width: 1400, height: 1400, borderRadius: '50%', background: `radial-gradient(circle, ${thema.kleur.flame}2E 0%, ${thema.kleur.flame}00 66%)` }} />
        <div style={{ position: 'absolute', left: 300 + width * 0.85 - 760 + Math.cos(t / 16000) * 80, top: 300 + height * 0.3 - 760, width: 1520, height: 1520, borderRadius: '50%', background: `radial-gradient(circle, ${thema.kleur.petrol}30 0%, ${thema.kleur.petrol}00 66%)` }} />
        <div style={{ position: 'absolute', left: 300 + width * 0.35 - 700, top: 300 + height * 0.9 - 700 + Math.sin(t / 14500) * 70, width: 1400, height: 1400, borderRadius: '50%', background: `radial-gradient(circle, ${merk.zand}66 0%, ${merk.zand}00 66%)` }} />
        <div style={{ position: 'absolute', left: 300 + width * 0.8 - 720, top: 300 + height * 0.9 - 720, width: 1440, height: 1440, borderRadius: '50%', background: `radial-gradient(circle, ${thema.kleur.petrolLicht}FF 0%, ${thema.kleur.petrolLicht}00 66%)` }} />
      </div>

      {/* Opening in 3D: tool-kaartjes, punt, inslag, logo; pusht weg in de duik */}
      {tex && openingZicht > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: openingZicht }}>
          <Wereld3D t={t} tex={tex} width={width} height={height} />
        </div>
      )}
      <AbsoluteFill style={{ backgroundColor: thema.kleur.wit, opacity: inslagFlits * 0.22, pointerEvents: 'none' }} />

      {/* De ruimte met de app-panelen */}
      {t >= H1.duikOp + 600 && (
        <Ruimte cam={cam} zicht={ruimteZicht}>
          <Paneel id="mail" plek={PLEK.mail} diepte={diepteMail}>
            <MailApp t={t} stand={mailStand} />
          </Paneel>
          {t >= H1.dollyOp - 200 && (
            <Paneel id="cockpit" plek={PLEK.cockpit} diepte={diepteCockpit}>
              <Cockpit t={t} stand={cockpitStand} />
            </Paneel>
          )}
        </Ruimte>
      )}

      {/* Tekstlagen */}
      <Hoofdstukkaart t={t} op={H1.kaartOp} uit={H1.kaartUit} nummer={1} totaal={6} woord="mail" wie="jij" />
      {t >= O.belofteOp && t < O.belofteUit + 300 && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: height * 0.80, textAlign: 'center', opacity: Math.min(vlak(t, O.belofteOp, O.belofteOp + 300), 1 - vlak(t, O.belofteUit, O.belofteUit + 300, thema.ease.exit)), fontFamily: thema.fonts.kop, fontWeight: 700, fontSize: 72, letterSpacing: '-0.03em', color: thema.kleur.petrol }}>
          Van mail tot betaald<FlameDot /> In <span style={{ color: thema.kleur.flame }}>één app</span>
        </div>
      )}
      <Belofte t={t} op={H1.belofteOp} uit={H1.belofteUit} tekst="Je mail is je werkvoorraad" kernwoord="werkvoorraad" positie="onder" />
      {t >= H1.rondOp - 100 && <Rondleiding4 t={t} op={H1.rondOp} stap={H1.rondStap} stappen={[{ doel: 'blok-briefing', tekst: 'briefing' }, { doel: 'blok-grid', tekst: 'offerte', deel: 'rechts' }, { doel: 'blok-portaal', tekst: 'portaal' }]} />}
      <Statuswoord t={t} op={H1.statusOp} uit={H1.eind + 1000} woord="aangemaakt" />

      {/* De punt als cursor, vanaf de overdracht uit de 3D-opening */}
      {t >= OVERDRACHT_MS && <Cursor t={t} stappen={CURSOR} zichtVan={OVERDRACHT_MS} vorm="punt" kleur={thema.kleur.flame} />}

      {/* Kleurgrade: schaduwen licht naar petrol, warme highlights, subtiel op de lichte grond */}
      <AbsoluteFill style={{ backgroundColor: thema.kleur.petrol, mixBlendMode: 'soft-light', opacity: 0.10, pointerEvents: 'none' }} />
      <AbsoluteFill style={{ backgroundColor: '#F5D4A8', mixBlendMode: 'overlay', opacity: 0.06, pointerEvents: 'none' }} />
      {/* Grain 4 procent, verschuift per frame; vignet 15 procent */}
      <AbsoluteFill style={{ backgroundImage: `url(${staticFile('sfeer/ruis.png')})`, backgroundSize: '256px 256px', backgroundPosition: `${(frame * 37) % 256}px ${(frame * 53) % 256}px`, mixBlendMode: 'overlay', opacity: thema.laag.grain, pointerEvents: 'none' }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(26,83,92,${thema.laag.vignet}) 100%)`, pointerEvents: 'none' }} />
    </AbsoluteFill>
    </FormaatCtx.Provider>
  )
}
