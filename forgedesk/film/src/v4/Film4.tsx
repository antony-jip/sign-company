import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { ALLE_MODULES } from '@/lib/navigatie'
import { merk } from '../brand'
import { FlameDot } from '../kern/FlameDot'
import { LogoDoen, logoPuntPositie } from '../kern/LogoDoen'
import { veer, vlak } from '../tijd'
import { Belofte } from '../v2/Belofte'
import { Cockpit, type CockpitStand } from '../v2/Cockpit'
import { Cursor, type CursorStap } from '../v2/Cursor'
import { VensterCtx } from '../v2/DesktopChrome'
import { FORMATEN, FormaatCtx } from '../v2/formaat'
import { FinancieelTab } from '../v2/schermen/FinancieelTab'
import { MailApp } from '../v2/schermen/MailApp'
import { Dashboard } from '../v2/schermen/Dashboard'
import { DaanWidget } from './DaanWidget'
import { OfferteEditor } from '../v2/schermen/OfferteEditor'
import { Planning } from '../v2/schermen/Planning'
import { PortaalKlant } from '../v2/schermen/PortaalKlant'
import { WerkbonTelefoon } from '../v2/schermen/WerkbonTelefoon'
import { H1, H2, H3, H4, H5, H6, O, S } from './beats4'
import { DaanIntro, DaanLinks, Geluid4, Kader, Koppelingen, Melding4, Telefoon4, TELEFOON4, type Klank4 } from './Extra'
import { camera4, Paneel, PANEEL_SCHAAL, Ruimte, type CameraStop4 } from './Ruimte'
import { Hoofdstukkaart, Rondleiding4, Statuswoord } from './Tekst'
import { useTexturen } from './texturen'
import { thema } from './thema'
import { PUNT_THUIS, projecteer, Wereld3D } from './Wereld3D'

export const FILM4_DUUR_MS = S.eind

// Panelen in de ruimte (wereld-px), op één rij. De dolly is een zijwaartse
// beweging met echte parallax (translateZ).
const PLEK = {
  mail: { x: 0, y: 0 }, cockpit: { x: 2600, y: 0 }, editor: { x: 5200, y: 0 },
  portaal: { x: 7800, y: 0 }, planning: { x: 10400, y: 0 }, telefoon: { x: 13000, y: 0 },
}
type PaneelNaam = keyof typeof PLEK
const TEL_B = TELEFOON4.b * PANEEL_SCHAAL, TEL_H = TELEFOON4.h * PANEEL_SCHAAL

// Camera: alleen bewegen tussen hoofdstukken (dolly 1,2 s), plus pushes van
// 400 ms op een detail. Elke stop noemt het actieve paneel.
type Stop = CameraStop4 & { paneel: PaneelNaam }
const dolly = (ms: number, paneel: PaneelNaam, dx = 0, dy = 0): Stop => ({ ms, x: PLEK[paneel].x + dx, y: PLEK[paneel].y + dy, paneel })
const push = (ms: number, paneel: PaneelNaam, zoom: number, dx = 0, dy = 0): Stop => ({ ms, x: PLEK[paneel].x + dx, y: PLEK[paneel].y + dy, zoom, duurMs: 400, paneel })
const STOPS: Stop[] = [
  dolly(0, 'mail'),
  dolly(H1.dollyOp, 'cockpit'),
  dolly(H2.dollyOp, 'editor'),
  push(H2.pushOp, 'editor', 1.4, 430, -40), push(H2.urenPushOp, 'editor', 1.4, 430, 140), push(H2.pullOp, 'editor', 1),
  dolly(H3.dollyOp, 'portaal'),
  push(H3.pushOp, 'portaal', 1.5, 440, -40), push(H3.pullOp, 'portaal', 1),
  dolly(H3.terugOp, 'cockpit'),
  dolly(H4.dollyOp, 'planning'),
  dolly(H5.dollyOp, 'telefoon'),
  dolly(H6.dollyOp, 'cockpit'),
  push(H6.pushOp, 'cockpit', 1.4, 180, -200), push(H6.pullOp, 'cockpit', 1),
  { ms: S.overgangOp, x: PLEK.cockpit.x, y: PLEK.cockpit.y, zoom: 0.86, duurMs: 1200, paneel: 'cockpit' },
]

// Diepte per paneel: 0 als het actief is, 1 als het een hoofdstuk verder ligt;
// tijdens een dolly wisselen de twee.
const diepteVan = (t: number, naam: PaneelNaam) => {
  let i = 0
  for (let k = 0; k < STOPS.length; k++) if (t >= STOPS[k].ms) i = k
  const nu = STOPS[i]
  let vorigIdx = i - 1
  while (vorigIdx >= 0 && STOPS[vorigIdx].paneel === nu.paneel) vorigIdx--
  const vorig = vorigIdx >= 0 ? STOPS[vorigIdx] : null
  const isDolly = vorig !== null && nu.paneel !== (STOPS[i - 1]?.paneel ?? nu.paneel)
  const p = isDolly ? vlak(t, nu.ms, nu.ms + (nu.duurMs ?? thema.camera.dollyMs), thema.ease.inUit) : 1
  if (naam === nu.paneel) return 1 - p
  if (vorig && naam === vorig.paneel) return p
  return 1
}

// Overdrachtspunt: waar de 3D-punt zit als de DOM-cursor het overneemt.
const OVERDRACHT_MS = O.eind + 1000
const overdracht = projecteer(OVERDRACHT_MS, PUNT_THUIS)

// De punt als cursor door de hele film. Kliks landen op ms + 780.
const k = (ms: number) => ms - 780
const CURSOR: CursorStap[] = [
  { ms: OVERDRACHT_MS, doel: overdracht },
  { ms: k(H1.klikProject), doel: 'project-aanmaken', klik: true },
  { ms: k(H1.klikTaak), doel: 'tekst:Taak', klik: true },
  { ms: k(H1.klikTaakSanne), doel: 'taak-sanne', klik: true },
  { ms: k(H1.klikTaakToevoegen), doel: 'taak-toevoegen', klik: true },
  { ms: H1.statusVlucht, doel: 'status-punt' },
  { ms: k(H1.klikOfferteMaken), doel: 'offerte-maken', klik: true },
  { ms: k(H2.klikVerstuur), doel: 'verstuur', klik: true },
  { ms: k(H2.klikPortaal), doel: 'via-portaal', klik: true },
  { ms: H2.statusVlucht, doel: 'status-punt' },
  { ms: k(H3.klikBekijken), doel: 'offerte-bekijken', klik: true },
  { ms: k(H3.klikBevestig), doel: 'bevestigen', klik: true },
  { ms: H3.statusVlucht, doel: 'status-punt' },
  { ms: k(H4.klikWerkbon), doel: 'acties-werkbon', klik: true },
  { ms: k(H4.klikWerkbonMaken), doel: 'werkbon-maken', klik: true },
  { ms: H4.sleepOp - 700, doel: 'planning-kaart' },
  { ms: H4.sleepOp, doel: 'planning-donderdag' },
  { ms: k(H4.klikKoppel), doel: 'montage-werkbon', klik: true },
  { ms: k(H4.klikInplannen), doel: 'montage-inplannen', klik: true },
  { ms: H4.statusVlucht, doel: 'status-punt' },
  { ms: k(H5.klikNaFoto), doel: 'na-foto', klik: true },
  { ms: H5.statusVlucht, doel: 'status-punt' },
  { ms: k(H6.klikFinancieel), doel: 'tekst:Financieel', klik: true },
  { ms: k(H6.klikFactuurMaken), doel: 'factuur-maken', klik: true },
  { ms: k(H6.klikVerstuur), doel: 'factuur-verstuur', klik: true },
  { ms: H6.statusVlucht, doel: 'status-punt' },
  { ms: k(S.frameOp + 2300), doel: 'daan-verzend', klik: true },
  { ms: k(S.frameOp + 2 * S.frameDuur + 3400), doel: 'daan-aannemen', klik: true },
  { ms: S.puntValt, doel: 'wordmark-punt' },
]

// Geluid: tik op elke landing van de punt, diepere tik op elk statuswoord.
const KLANKEN: Klank4[] = [
  { ms: O.inslagOp, bestand: 'inslag', volume: 0.7 }, { ms: O.puntLandt, bestand: 'landing', volume: 0.5 },
  ...CURSOR.filter((c) => c.klik).map((c): Klank4 => ({ ms: c.ms + 780, bestand: 'klik', volume: 0.6 })),
  ...[H1, H2, H3, H4, H5, H6].map((h): Klank4 => ({ ms: h.statusLand, bestand: 'landing', volume: 0.55 })),
  ...[H1, H2, H3, H4, H5, H6].map((h): Klank4 => ({ ms: h.dollyOp, bestand: 'zwiep', volume: 0.35 })),
  { ms: H3.terugOp, bestand: 'zwiep', volume: 0.35 }, { ms: S.overgangOp, bestand: 'zwiep', volume: 0.4 },
  { ms: S.puntValt + 700, bestand: 'landing', volume: 0.6 },
  ...[H1.meldingTaakOp, H2.meldingOp, H3.meldingOp, H6.meldingOp].map((ms): Klank4 => ({ ms, bestand: 'ding', volume: 0.4 })),
  { ms: H3.tekenOp, bestand: 'pen', volume: 0.45 }, { ms: H5.tekenOp, bestand: 'pen', volume: 0.45 },
  { ms: H4.sleepOp, bestand: 'klik', volume: 0.4 }, { ms: H4.landOp, bestand: 'landing', volume: 0.5 },
  { ms: H2.flapOp, bestand: 'flap', volume: 0.5 },
  { ms: S.introNaamOp, bestand: 'landing', volume: 0.4 },
]

const MODULES = ['Klanten', 'Projecten', 'Offertes', 'Planning', 'Werkbonnen', 'Portaal', 'Facturen', 'Email']

export const Film4: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()
  const t = (frame / fps) * 1000
  const tex = useTexturen()
  const F = FORMATEN['16:9']

  const cam = camera4(t, STOPS)
  const inslagFlits = t >= O.inslagOp ? 1 - vlak(t, O.inslagOp, O.inslagOp + 200) : 0
  const openingZicht = 1 - vlak(t, O.eind + 1400, O.eind + 2000)

  // Duik: het mailpaneel komt uit de diepte terwijl de 3D-camera door het logo pusht.
  const duikP = vlak(t, H1.duikOp + 600, H1.duikTot, thema.ease.camera)
  const ruimteZicht = vlak(t, H1.duikOp + 600, H1.duikOp + 1100) * (1 - vlak(t, S.overgangOp, S.overgangTot, thema.ease.inUit))
  const d = (naam: PaneelNaam) => diepteVan(t, naam)
  const diepteMail = Math.max(d('mail'), (1 - duikP) * 1.6)

  // Stands per scherm
  const mailStand = { gekozen: true, klantOp: 0, projectOp: H1.projectOp }
  const inFinancieel = t >= H6.financieelOp && t < S.eind
  const financieelP = vlak(t, H6.financieelOp, H6.financieelOp + 300)
  const cockpitStand: CockpitStand = {
    status: t >= H6.betaaldOp ? 'te-factureren' : t >= H4.landOp ? 'ingepland' : t >= H3.klaarOp ? 'akkoord-klant' : t >= H2.flapOp ? 'in-review' : 'gepland',
    offerteStatus: t >= H3.klaarOp ? 'goedgekeurd' : t >= H2.flapOp ? 'verzonden' : null,
    montage: t >= H4.landOp,
    portaal: t >= H2.flapOp ? ['offerte'] : [], activiteiten: [], tab: 'Overzicht', meldingen: 0,
    blokOp: t < H2.dollyOp ? { kop: H1.cockpitOp, fase: H1.cockpitOp + 150, briefing: H1.cockpitOp + 300, grid: H1.cockpitOp + 450, portaal: H1.cockpitOp + 600, tijd: H1.cockpitOp + 250, klant: H1.cockpitOp + 400, team: H1.cockpitOp + 550, acties: H1.cockpitOp + 700 } : undefined,
    taak: { dialoogOp: H1.taakDialoogOp, typOp: H1.taakTypOp, kiesOp: H1.taakKiesOp, klaarOp: H1.taakKlaarOp },
    werkbon: { dialoogOp: H4.werkbonDialoogOp, klaarOp: H4.werkbonKlaarOp },
    klikOp: { offerteMaken: H1.klikOfferteMaken, taakToevoegen: H1.klikTaakToevoegen, taakSanne: H1.klikTaakSanne, werkbonMaken: H4.klikWerkbonMaken, factuurMaken: H6.klikFactuurMaken },
    // Rondleiding: de pagina scrolt 300 px omhoog voor het portaal-blok, en terug voor de taak.
    scrollY: t < H1.klikTaak - 900 ? vlak(t, H1.rondOp + 2 * H1.rondStap - 700, H1.rondOp + 2 * H1.rondStap - 150, thema.ease.inUit) * 300
      : t < H4.klikWerkbon - 1000 ? (1 - vlak(t, H1.klikTaak - 900, H1.klikTaak - 400, thema.ease.inUit)) * 300
      : (vlak(t, H4.klikWerkbon - 900, H4.klikWerkbon - 400, thema.ease.inUit) - vlak(t, H4.werkbonKlaarOp + 400, H4.werkbonKlaarOp + 900, thema.ease.inUit)) * 300,
  }
  const editorStand = { regelsOp: H2.regelsOp, checkAkkoordOp: H2.checkAkkoordOp, verstuurTikOp: H2.klikVerstuur, keuzeOp: H2.keuzeOp, keuzeTikOp: H2.klikPortaal, flapOp: H2.flapOp }
  // Klantportaal op desktop: eerst de ontvangen offerte, na Bekijken de publieke pagina met handtekening.
  const portaalStand = t < H3.publiekOp
    ? { pagina: 'portaal' as const, projectStatus: 'in-review', kaarten: [{ soort: 'offerte' as const, status: 'verstuurd', op: H3.kaartZichtOp }] }
    : { pagina: 'publiek' as const, projectStatus: 'in-review', kaarten: [], naamOp: H3.naamOp, tekenOp: H3.tekenOp, vinkOp: H3.vinkOp, tikOp: H3.klikBevestig, klaarOp: H3.klaarOp }

  // Zichtvensters per paneel (gemonteerd als ze in de buurt van de camera zijn).
  const inMail = t < H2.dollyOp
  const inCockpit = t >= H1.dollyOp - 300
  const inEditor = t >= H2.dollyOp - 300 && t < H4.dollyOp + 1400
  const inPortaal = t >= H3.dollyOp - 300 && t < H5.dollyOp + 1400
  const inPlanning = t >= H4.dollyOp - 300
  const inTelefoon = t >= H5.dollyOp - 300

  // Slot
  const gridZicht = Math.min(vlak(t, S.gridOp, S.gridOp + 300), 1 - vlak(t, S.gridUit, S.gridUit + 300, thema.ease.exit))
  const eindGrond = 0
  const logoBreedte = 640
  const puntXY = logoPuntPositie(logoBreedte, width / 2, height / 2 - 40)
  const lettersP = veer(t, S.gridOp, { demping: 16, duurMs: 800 })
  const regelP = veer(t, S.regelOp, { demping: 18, duurMs: 800 })
  const urlP = veer(t, S.urlOp, { demping: 18, duurMs: 800 })

  return (
    <FormaatCtx.Provider value={F}>
    <AbsoluteFill data-film-root className="film-root" style={{ backgroundColor: thema.kleur.studio, fontFamily: thema.fonts.body }}>
      <Geluid4 klanken={KLANKEN} muziekUitOp={S.overgangOp} totMs={S.eind} dips={[[O.inslagOp + 100, O.inslagOp + 1500], [H3.tekenOp + 1300, H3.tekenOp + 2200], [H6.meldingOp + 100, H6.meldingOp + 2400]]} />
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
      {t >= H1.duikOp + 600 && t < S.overgangTot + 100 && (
        <Ruimte cam={cam} zicht={ruimteZicht}>
          {inMail && (
            <Paneel id="mail" plek={PLEK.mail} diepte={diepteMail}>
              <MailApp t={t} stand={mailStand} />
            </Paneel>
          )}
          {inCockpit && (
            <Paneel id="cockpit" plek={PLEK.cockpit} diepte={d('cockpit')}>
              <div style={{ opacity: inFinancieel ? 1 - financieelP : 1 }}><Cockpit t={t} stand={cockpitStand} /></div>
              {inFinancieel && (
                <div style={{ position: 'absolute', inset: 0, opacity: financieelP }}>
                  <FinancieelTab t={t} stand={{ factuurOp: H6.factuurOp, verstuurdOp: H6.verstuurdOp, betaaldOp: H6.betaaldOp }} />
                </div>
              )}
            </Paneel>
          )}
          {inEditor && (
            <Paneel id="editor" plek={PLEK.editor} diepte={d('editor')}>
              <OfferteEditor t={t} stand={editorStand} />
            </Paneel>
          )}
          {inPortaal && (
            <Paneel id="portaal" plek={PLEK.portaal} diepte={d('portaal')}>
              <PortaalKlant t={t} stand={portaalStand} />
            </Paneel>
          )}
          {inPlanning && (
            <Paneel id="planning" plek={PLEK.planning} diepte={d('planning')}>
              <Planning t={t} stand={{ sleepOp: H4.sleepOp, landOp: H4.landOp, dialoogOp: H4.dialoogOp, koppelOp: H4.koppelOp, klaarOp: H4.klaarOp }} />
            </Paneel>
          )}
          {inTelefoon && (
            <Paneel id="telefoon" plek={PLEK.telefoon} diepte={d('telefoon')} breedte={TEL_B} hoogte={TEL_H} kaal vasteKantel={8}>
              <Telefoon4>
                <WerkbonTelefoon t={t} stand={{ fotoOp: H5.fotoOp, tekenOp: H5.tekenOp }} />
              </Telefoon4>
            </Paneel>
          )}
        </Ruimte>
      )}

      {/* Hoofdstukkaarten */}
      <Hoofdstukkaart t={t} op={H1.kaartOp} uit={H1.kaartUit} nummer={1} totaal={6} woord="mail" wie="jij" />
      <Hoofdstukkaart t={t} op={H2.kaartOp} uit={H2.kaartUit} nummer={2} totaal={6} woord="offerte" wie="jij" />
      <Hoofdstukkaart t={t} op={H3.kaartOp} uit={H3.kaartUit} nummer={3} totaal={6} woord="portaal" wie="je klant" extra="geen inlog, geen app" />
      <Hoofdstukkaart t={t} op={H4.kaartOp} uit={H4.kaartUit} nummer={4} totaal={6} woord="planning" wie="jij" />
      <Hoofdstukkaart t={t} op={H5.kaartOp} uit={H5.kaartUit} nummer={5} totaal={6} woord="werkbon" wie="je monteur, op locatie" />
      <Hoofdstukkaart t={t} op={H6.kaartOp} uit={H6.kaartUit} nummer={6} totaal={6} woord="betaald" wie="jij" />

      {/* Openingsbelofte */}
      {t >= O.belofteOp && t < O.belofteUit + 300 && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: height * 0.80, textAlign: 'center', opacity: Math.min(vlak(t, O.belofteOp, O.belofteOp + 300), 1 - vlak(t, O.belofteUit, O.belofteUit + 300, thema.ease.exit)), fontFamily: thema.fonts.kop, fontWeight: 700, fontSize: 72, letterSpacing: '-0.03em', color: thema.kleur.petrol }}>
          Van mail tot betaald<FlameDot /> In <span style={{ color: thema.kleur.flame }}>één app</span>
        </div>
      )}
      {/* Beloften per hoofdstuk */}
      <Belofte t={t} op={H1.belofteOp} uit={H1.belofteUit} tekst="Je mail is je werkvoorraad" kernwoord="werkvoorraad" positie="onder" />
      <Belofte t={t} op={H2.belofteOp} uit={H2.belofteUit} tekst="Je marge zie je vóór je verstuurt" kernwoord="marge" positie="onder" />
      <Belofte t={t} op={H3.belofteOp} uit={H3.belofteUit} tekst="Klant tekent. Jij ziet het meteen" kernwoord="tekent" positie="boven" />
      <Belofte t={t} op={H4.belofteOp} uit={H4.belofteUit} tekst="Eén sleep. De montage staat" kernwoord="staat" positie="boven" />
      <Belofte t={t} op={H5.belofteOp} uit={H5.belofteUit} tekst="Werkbon op locatie. Niets overtypen" kernwoord="Niets overtypen" positie="boven" />
      <Belofte t={t} op={H6.belofteOp} uit={H6.belofteUit} tekst="Factuur eruit. Geld binnen" kernwoord="Geld binnen" positie="boven" />
      <Belofte t={t} op={S.belofteOp} uit={S.belofteUit} tekst="Eén project. Alles erin" kernwoord="Alles erin" positie="onder" />

      {/* Rondleiding op de projectpagina */}
      {t >= H1.rondOp - 100 && t < H1.klikTaak && <Rondleiding4 t={t} op={H1.rondOp} stap={H1.rondStap} stappen={[{ doel: 'blok-briefing', tekst: 'briefing' }, { doel: 'blok-grid', tekst: 'offerte', deel: 'rechts' }, { doel: 'blok-portaal', tekst: 'portaal' }]} />}

      {/* Uren: grotere projecten met meerdere items, overzicht in je uren */}
      {t >= H2.urenLabelOp - 100 && t < H2.urenLabelUit + 400 && <Rondleiding4 t={t} op={H2.urenLabelOp} stap={H2.urenLabelUit - H2.urenLabelOp} stappen={[{ doel: 'uren-blok', tekst: 'overzicht in je uren' }]} />}

      {/* Koppelingen: factuur naar de boekhouding, betaling via Mollie */}
      <Koppelingen t={t} op={H6.koppelingOp} uit={H6.koppelingUit} />

      {/* Meldingen */}
      <Melding4 t={t} op={H1.meldingTaakOp} uit={H1.meldingTaakUit} label="je collega" titel="Antony heeft je een taak toegewezen" tekst="Even telefonisch contact opnemen · Gevelreclame Van der Berg Interieur" />
      <Melding4 t={t} op={H2.meldingOp} uit={H2.meldingUit} label="je collega" titel="Sanne keurt goed" tekst="Offerte OFF-2026-0042 gecheckt: akkoord" />
      <Melding4 t={t} op={H3.meldingOp} uit={H3.meldingUit} label="je klant" titel="Klant akkoord" tekst="Pieter van der Berg heeft offerte OFF-2026-0042 getekend" />
      <Melding4 t={t} op={H6.meldingOp} uit={H6.meldingUit} label="je klant" titel="Factuur FAC-2026-0118 betaald" tekst="€ 5.142,50 ontvangen van Van der Berg Interieur" />

      {/* Statuswoorden: de punt landt als laatste teken */}
      <Statuswoord t={t} op={H1.statusOp} uit={H1.klikOfferteMaken - 800} woord="aangemaakt" />
      <Statuswoord t={t} op={H2.statusOp} uit={H2.eind - 100} woord="verstuurd" />
      <Statuswoord t={t} op={H3.statusOp} uit={H3.eind - 100} woord="getekend" />
      <Statuswoord t={t} op={H4.statusOp} uit={H4.eind - 100} woord="ingepland" />
      <Statuswoord t={t} op={H5.statusOp} uit={H5.eind - 100} woord="gedaan" />
      <Statuswoord t={t} op={H6.statusOp} uit={S.overgangOp} woord="betaald" />

      {/* Slot: Daan, jouw slimme collega, powered by Claude. Intro, dan drie 50/50-frames. */}
      <DaanIntro t={t} op={S.introOp} naamOp={S.introNaamOp} uit={S.introUit} width={width} height={height} />
      <DaanLinks t={t} frameOp={S.frameOp} frameDuur={S.frameDuur} uit={S.frameUit} width={width} height={height} />
      {t >= S.frameOp - 200 && t < S.frameUit + 500 && (
        <VensterCtx.Provider value={{ b: 1600, h: 1000 }}>
          <Kader t={t} op={S.frameOp} uit={S.frameOp + S.frameDuur} centreer>
            <DaanWidget t={t} stand={{ typOp: S.frameOp + 500, verzendOp: S.frameOp + 2300, denktOp: S.frameOp + 2400, planOp: S.frameOp + 3300, projectOp: S.frameOp + 4200, offerteOp: S.frameOp + 4900, linkOp: S.frameOp + 5100 }} />
          </Kader>
          <Kader t={t} op={S.frameOp + S.frameDuur} uit={S.frameOp + 2 * S.frameDuur} focus={{ x: 600, y: 100, schaal: 0.95 }}>
            <MailApp t={t} stand={{ gekozen: true, klantOp: 0 }} />
          </Kader>
          <Kader t={t} op={S.frameOp + 2 * S.frameDuur} uit={S.frameUit} focus={{ x: 70, y: 310, schaal: 0.8 }}>
            <Dashboard t={t} stand={{ mailOp: 0, geleerd: true, aannemenOp: S.frameOp + 2 * S.frameDuur + 3400 }} />
          </Kader>
        </VensterCtx.Provider>
      )}

      {/* Slot: het logo met de modules eromheen; het logo blijft staan voor de eindkaart */}
      {t >= S.gridOp && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 12, pointerEvents: 'none' }}>
          <div style={{ opacity: Math.min(1, lettersP * 1.2) }}>
            <LogoDoen breedte={logoBreedte} x={width / 2} y={height / 2 - 40} kleur={thema.kleur.petrol} stand={(i) => (i === 4 ? { op: 0, dy: 0 } : { op: 1, dy: (1 - lettersP) * 24 })} />
          </div>
          <span data-doel="wordmark-punt" style={{ position: 'absolute', left: puntXY.x, top: puntXY.y, width: 1, height: 1 }} />
          {gridZicht > 0 && MODULES.map((naam, i) => {
            const m = ALLE_MODULES.find((x) => x.label === naam)
            if (!m) return null
            const op = S.gridOp + 300 + i * 70
            const p = veer(t, op, { demping: 16, duurMs: 500 })
            const hoek = -Math.PI / 2 + (i / MODULES.length) * Math.PI * 2
            const x = width / 2 + Math.cos(hoek) * 720, y = height / 2 - 40 + Math.sin(hoek) * 340
            const Icon = m.icon
            return (
              <div key={naam} style={{ position: 'absolute', left: x, top: y, opacity: Math.min(1, p * 1.4) * gridZicht, transform: `translate(-50%, -50%) translate(${(1 - p) * -Math.cos(hoek) * 24}px, ${(1 - p) * -Math.sin(hoek) * 24}px) scale(${0.96 + p * 0.04})`, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 24px 14px 16px', borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.86)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', boxShadow: '0 24px 60px -24px rgba(26,83,92,0.35), 0 0 0 1px rgba(255,255,255,0.9) inset', fontFamily: thema.fonts.kop, fontWeight: 700, fontSize: 30, letterSpacing: '-0.02em', color: thema.kleur.ink, whiteSpace: 'nowrap' }}>
                <span style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: `${m.color}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={24} color={m.color} strokeWidth={2} /></span>
                {naam.toLowerCase()}<span style={{ color: thema.kleur.flame }}>.</span>
              </div>
            )
          })}
          <div style={{ position: 'absolute', left: 0, right: 0, top: height / 2 + 120, textAlign: 'center', fontFamily: thema.fonts.kop, fontWeight: 600, fontSize: 64, letterSpacing: '-0.02em', color: thema.kleur.petrol, opacity: vlak(t, S.regelOp, S.regelOp + 250), transform: `translateY(${(1 - regelP) * 24}px)` }}>slim gedaan<FlameDot /></div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: height / 2 + 215, textAlign: 'center', fontFamily: thema.fonts.body, fontWeight: 500, fontSize: 30, letterSpacing: '0.01em', color: thema.kleur.tekstSec, opacity: 0.9 * vlak(t, S.urlOp, S.urlOp + 250), transform: `translateY(${(1 - urlP) * 16}px)` }}>doen.team</div>
        </div>
      )}

      {/* De punt als cursor, vanaf de overdracht uit de 3D-opening */}
      {t >= OVERDRACHT_MS && <Cursor t={t} stappen={CURSOR} zichtVan={OVERDRACHT_MS} vorm="punt" kleur={thema.kleur.flame} />}

      {/* Kleurgrade, grain 4 procent, vignet 15 procent */}
      <AbsoluteFill style={{ backgroundColor: thema.kleur.petrol, mixBlendMode: 'soft-light', opacity: 0.06, pointerEvents: 'none', zIndex: 90 }} />
      <AbsoluteFill style={{ backgroundColor: '#F5D4A8', mixBlendMode: 'overlay', opacity: 0.04, pointerEvents: 'none', zIndex: 90 }} />
      <AbsoluteFill style={{ backgroundImage: `url(${staticFile('sfeer/ruis.png')})`, backgroundSize: '256px 256px', backgroundPosition: `${(frame * 37) % 256}px ${(frame * 53) % 256}px`, mixBlendMode: 'overlay', opacity: thema.laag.grain, pointerEvents: 'none', zIndex: 90 }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(26,83,92,${thema.laag.vignet}) 100%)`, pointerEvents: 'none', zIndex: 90 }} />
    </AbsoluteFill>
    </FormaatCtx.Provider>
  )
}
