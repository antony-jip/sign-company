import { useLayoutEffect, useState } from 'react'
import { AbsoluteFill } from 'remotion'
import { useSceneTijd, vlak, veer, lerp, ease } from '../tijd'
import { fonts } from '../fonts'
import { merk } from '../brand'
import { Wereld, Scherm, useCamera, SCHERM_B, SCHERM_H, type CameraStop } from './Wereld'
import { FormaatCtx, FORMATEN, useFormaat, type Formaat } from './formaat'
import { Cursor, type CursorStap } from './Cursor'
import { Belofte } from './Belofte'
import { Cockpit } from './Cockpit'
import { MailApp } from './schermen/MailApp'
import { OfferteEditor } from './schermen/OfferteEditor'
import { PortaalKlant } from './schermen/PortaalKlant'
import { Planning } from './schermen/Planning'
import { Kanban } from './schermen/Kanban'
import { TelefoonInRuimte } from './schermen/WerkbonTelefoon'
import { FinancieelTab } from './schermen/FinancieelTab'
import { Toast } from '../kern/Toast'
import { FaseBalkFilm } from '../kern/FaseBalkFilm'
import { Sfeer } from '../kern/Sfeer'
import { Wordmark, letterPosities } from '../kern/Wordmark'
import { B0, B, B2 } from './beats'
import { Opening } from './Opening'
import { Gevel, type GevelStand } from './Gevel'
import { COPY } from './copy'
import { Dashboard } from './schermen/Dashboard'
import { Geluid, type Klank } from './Geluid'
import { notificatieAkkoord, notificatieBetaald } from '../mockData'

// Versie 2: één klus, één cockpit, één camera. Alles op absolute ms uit beats.ts.
export const FILM2_DUUR_MS = B2.eind

// Plekken in de ruimte (middelpunten, filmcoördinaten bij zoom 1).
const PLEK = {
  dashboard: { x: -800, y: -900 },
  mail: { x: 160, y: -900 },
  cockpit: { x: 1120, y: 500 },
  editor: { x: 2080, y: -900 },
  portaal: { x: 2080, y: 1900 },
  planning: { x: 160, y: 1900 },
  telefoon: { x: 1120, y: -2000 },
  kanban: { x: 1120, y: 2500 },
}
const CENTRUM = { x: 1120, y: 250 }

const lokaal = (plek: { x: number; y: number }, cx: number, cy: number) => ({ x: plek.x + (cx - 720) * (SCHERM_B / 1440), y: plek.y + (cy - 540) * (SCHERM_H / 1080) })
const TELEFOON_B = 418 * 0.62, TELEFOON_H = 872 * 0.62
const telefoonLokaal = (cx: number, cy: number) => ({ x: PLEK.telefoon.x + (cx - 209) * 0.62, y: PLEK.telefoon.y + (cy - 436) * 0.62 })

const STOPS: CameraStop[] = [
  { ms: 0, ...lokaal(PLEK.dashboard, 720, 540), zoom: 1.0 },
  { ms: B0.dashboardOp, ...lokaal(PLEK.dashboard, 720, 540), zoom: 1.35, duurMs: 1400 },
  { ms: B0.klikEmail - 700, ...lokaal(PLEK.dashboard, 300, 380), zoom: 2.4, duurMs: 800 },
  { ms: B.mailCamOp, ...lokaal(PLEK.mail, 560, 470), zoom: 2.1, duurMs: 1100 },
  { ms: B.mailKlantOp, ...lokaal(PLEK.mail, 980, 540), zoom: 2.0, duurMs: 900 },
  { ms: B.mailKlikProject - 700, ...lokaal(PLEK.mail, 900, 720), zoom: 2.4, duurMs: 800 },
  { ms: B.mailKlikBijlage - 600, ...lokaal(PLEK.mail, 900, 560), zoom: 2.6, duurMs: 700 },
  { ms: B.cockpitCamOp, ...lokaal(PLEK.cockpit, 620, 330), zoom: 1.55, duurMs: 1200 },
  { ms: B.voortgangZoomOp, ...lokaal(PLEK.cockpit, 520, 470), zoom: 2.4, duurMs: 700 },
  { ms: B.klikOfferteMaken - 700, ...lokaal(PLEK.cockpit, 1160, 230), zoom: 2.6, duurMs: 800 },
  { ms: B.editorCamOp, ...lokaal(PLEK.editor, 640, 500), zoom: 1.7, duurMs: 1100 },
  { ms: B.klikCalculatie - 700, ...lokaal(PLEK.editor, 560, 520), zoom: 2.4, duurMs: 800 },
  { ms: B.calculatieOp, ...lokaal(PLEK.editor, 720, 540), zoom: 1.5, duurMs: 800 },
  { ms: B.klikVerstuur - 700, ...lokaal(PLEK.editor, 1180, 300), zoom: 2.6, duurMs: 800 },
  { ms: B.terugCockpit1, ...lokaal(PLEK.cockpit, 520, 470), zoom: 2.2, duurMs: 1100 },
  { ms: B.portaalCamOp, ...lokaal(PLEK.portaal, 520, 430), zoom: 2.3, duurMs: 1200 },
  { ms: B.publiekOp, ...lokaal(PLEK.portaal, 1180, 650), zoom: 3.1, duurMs: 900 },
  { ms: B.terugCockpit2, ...lokaal(PLEK.cockpit, 520, 470), zoom: 2.2, duurMs: 1100 },
  // Montage
  { ms: B2.klikMontage - 700, ...lokaal(PLEK.cockpit, 420, 840), zoom: 2.4, duurMs: 800 },
  { ms: B2.planningCamOp, ...lokaal(PLEK.planning, 880, 600), zoom: 1.7, duurMs: 1100 },
  { ms: B2.sleepOp - 700, ...lokaal(PLEK.planning, 940, 620), zoom: 1.9, duurMs: 1900 },
  { ms: B2.terugCockpit3, ...lokaal(PLEK.cockpit, 520, 470), zoom: 2.2, duurMs: 1100 },
  // Klokken en telefoon
  { ms: B2.klikInklokken - 700, ...lokaal(PLEK.cockpit, 1120, 420), zoom: 2.6, duurMs: 800 },
  { ms: B2.telefoonCamOp, ...telefoonLokaal(209, 540), zoom: 2.9, duurMs: 1100 },
  { ms: B2.terugCockpit4, ...lokaal(PLEK.cockpit, 520, 900), zoom: 2.0, duurMs: 1100 },
  // Mail uit het project
  { ms: B2.klikMailContact - 700, ...lokaal(PLEK.cockpit, 1120, 640), zoom: 2.4, duurMs: 800 },
  { ms: B2.composerOp, ...lokaal(PLEK.cockpit, 1080, 880), zoom: 2.5, duurMs: 900 },
  // Financieel
  { ms: B2.klikFinancieel - 700, ...lokaal(PLEK.cockpit, 720, 330), zoom: 2.2, duurMs: 900 },
  { ms: B2.klikFactuurMaken - 700, ...lokaal(PLEK.cockpit, 1000, 300), zoom: 2.4, duurMs: 800 },
  { ms: B2.klikFactuurVerstuur - 700, ...lokaal(PLEK.cockpit, 900, 520), zoom: 2.6, duurMs: 800 },
  { ms: B2.betaaldOp - 300, ...lokaal(PLEK.cockpit, 760, 470), zoom: 2.8, duurMs: 900 },
  // Pull-back en constellatie, dan de end card
  { ms: B2.pullbackOp, ...lokaal(PLEK.cockpit, 720, 540), zoom: 1.0, duurMs: 1400 },
  { ms: B2.constellatieOp, ...CENTRUM, zoom: 0.30, duurMs: 1600 },
]

const CURSOR: CursorStap[] = [
  { ms: 0, doel: { x: 700, y: 1500 } },
  { ms: B0.klikEmail - 700, doel: 'rail-email', klik: true },
  { ms: B.mailKlikLijst - 700, doel: 'mail-item', klik: true },
  { ms: B.mailKlikLijst + 600, doel: { x: 760, y: 1450 } },
  { ms: B.mailKlikProject - 700, doel: 'project-aanmaken', klik: true },
  { ms: B.mailKlikBijlage - 700, doel: 'bijlage-project', klik: true },
  { ms: B.mailKlikBijlage + 500, doel: { x: 980, y: 1400 } },
  { ms: B.klikOfferteMaken - 700, doel: 'offerte-maken', klik: true },
  { ms: B.editorOp, doel: { x: 900, y: 1500 } },
  { ms: B.klikCalculatie - 700, doel: 'calculatie', klik: true },
  { ms: B.klikCalculatieSluiten - 700, doel: 'calculatie-sluiten', klik: true },
  { ms: B.klikVerstuur - 700, doel: 'verstuur', klik: true },
  { ms: B.klikPortaal - 700, doel: 'via-portaal', klik: true },
  { ms: B.terugCockpit1, doel: { x: 950, y: 1500 } },
  { ms: B.klikBekijken - 700, doel: 'offerte-bekijken', klik: true },
  { ms: B.publiekOp + 200, doel: { x: 800, y: 1560 } },
  { ms: B.klikBevestig - 700, doel: 'bevestigen', klik: true },
  { ms: B.terugCockpit2, doel: { x: 950, y: 1560 } },
  { ms: B2.klikMontage - 700, doel: 'tekst:Montage', klik: true },
  { ms: B2.planningCamOp + 300, doel: { x: 900, y: 1500 } },
  { ms: B2.sleepOp - 700, doel: 'planning-kaart', klik: false },
  { ms: B2.sleepOp, doel: 'planning-donderdag', klik: false },
  { ms: B2.landOp + 300, doel: { x: 950, y: 1500 } },
  { ms: B2.klikInklokken - 700, doel: 'inklokken', klik: true },
  { ms: B2.telefoonCamOp + 300, doel: { x: 900, y: 1520 } },
  { ms: B2.klikNaFoto - 700, doel: 'na-foto', klik: true },
  { ms: B2.terugCockpit4, doel: { x: 950, y: 1520 } },
  { ms: B2.klikMailContact - 700, doel: 'tekst:Mail contactpersoon', klik: true },
  { ms: B2.composerOp + 400, doel: { x: 940, y: 1500 } },
  { ms: B2.klikUitProject - 700, doel: 'uit-project', klik: true },
  { ms: B2.klikVerzenden - 700, doel: 'verzenden', klik: true },
  { ms: B2.composerDichtOp, doel: { x: 950, y: 1520 } },
  { ms: B2.klikFinancieel - 700, doel: 'tekst:Financieel', klik: true },
  { ms: B2.klikFactuurMaken - 700, doel: 'factuur-maken', klik: true },
  { ms: B2.klikFactuurVerstuur - 700, doel: 'factuur-verstuur', klik: true },
  { ms: B2.klikFactuurVerstuur + 900, doel: { x: 950, y: 1560 } },
  { ms: B2.eindkaartOp + 200, doel: 'wordmark-punt', klik: false },
]

// Geluid op de beats.
const KLIKS = [B0.klikEmail, B.mailKlikLijst, B.mailKlikProject, B.mailKlikBijlage, B.klikOfferteMaken, B.klikCalculatie, B.klikCalculatieSluiten, B.klikVerstuur, B.klikPortaal, B.klikBekijken, B.klikBevestig,
  B2.klikMontage, B2.klikInklokken, B2.klikNaFoto, B2.klikMailContact, B2.klikUitProject, B2.klikVerzenden, B2.klikFinancieel, B2.klikFactuurMaken, B2.klikFactuurVerstuur]
const ZWIEPEN = [B.mailCamOp, B.cockpitCamOp, B.editorCamOp, B.terugCockpit1, B.portaalCamOp, B.terugCockpit2, B2.planningCamOp, B2.terugCockpit3, B2.telefoonCamOp, B2.terugCockpit4, B2.pullbackOp, B2.constellatieOp]
const KLANKEN: Klank[] = [
  ...KLIKS.map((ms) => ({ ms: ms + 80, bestand: 'klik' as const, volume: 0.55 })),
  ...ZWIEPEN.map((ms) => ({ ms, bestand: 'zwiep' as const, volume: 0.35 })),
  { ms: B.flapOp, bestand: 'flap', volume: 0.6 }, { ms: B2.factuurVerstuurdOp, bestand: 'flap', volume: 0.6 },
  { ms: B.regelsOp, bestand: 'typ', volume: 0.35, duurMs: 2600 }, { ms: B.naamOp, bestand: 'typ', volume: 0.3, duurMs: 1200 }, { ms: B2.typOp, bestand: 'typ', volume: 0.35, duurMs: 2400 },
  { ms: B.tekenOp, bestand: 'pen', volume: 0.5 },
  { ms: B.toastAkkoordOp, bestand: 'ding', volume: 0.6 }, { ms: B2.toastBetaaldOp, bestand: 'ding', volume: 0.6 },
  { ms: B.cockpitLandOp, bestand: 'landing', volume: 0.4 }, { ms: B2.landOp, bestand: 'landing', volume: 0.4 },
  { ms: B0.inslagOp, bestand: 'inslag', volume: 0.8 }, { ms: B0.puntOp + 600, bestand: 'landing', volume: 0.5 }, { ms: B2.puntOp + 600, bestand: 'landing', volume: 0.5 },
]

// Flame-stip die van een knop naar een cirkel in de fasebalk loopt: de klik
// veroorzaakt zichtbaar de fase.
const FaseStip: React.FC<{ t: number; op: number; vanDoel: string; naarFase?: number; naarPunt?: { x: number; y: number }; duurMs?: number }> = ({ t, op, vanDoel, naarFase, naarPunt, duurMs = 700 }) => {
  const [pos, setPos] = useState<{ a: { x: number; y: number }; b: { x: number; y: number } } | null>(null)
  const formaat = useFormaat()
  useLayoutEffect(() => {
    const root = document.querySelector('[data-film-root]')
    const a = document.querySelector(vanDoel.startsWith('fase:') ? `[data-fase="${vanDoel.slice(5)}"]` : `[data-doel="${vanDoel}"]`)
    const b = naarFase !== undefined ? document.querySelector(`[data-fase="${naarFase}"]`) : null
    if (!root || !a || (!b && !naarPunt)) { setPos((p) => (p === null ? p : null)); return }
    const f = root.getBoundingClientRect(); const s = f.width / formaat.b
    const ra = a.getBoundingClientRect()
    const bb = b ? (() => { const rb = b.getBoundingClientRect(); return { x: (rb.left + rb.width / 2 - f.left) / s, y: (rb.top + rb.height / 2 - f.top) / s } })() : naarPunt!
    const n = { a: { x: (ra.left + ra.width / 2 - f.left) / s, y: (ra.top + ra.height / 2 - f.top) / s }, b: bb }
    setPos((p) => (p && Math.abs(p.a.x - n.a.x) < 0.05 && Math.abs(p.b.y - n.b.y) < 0.05 && Math.abs(p.a.y - n.a.y) < 0.05 && Math.abs(p.b.x - n.b.x) < 0.05 ? p : n))
  })
  if (t < op || t > op + duurMs + 400 || !pos) return null
  const p = vlak(t, op, op + duurMs)
  const x = lerp(pos.a.x, pos.b.x, p), y = lerp(pos.a.y, pos.b.y, p) - Math.sin(p * Math.PI) * 220
  const puls = vlak(t, op + duurMs, op + duurMs + 400)
  return (
    <>
      <div style={{ position: 'absolute', left: x - 14, top: y - 14, width: 28, height: 28, borderRadius: '50%', backgroundColor: merk.flame, boxShadow: `0 0 ${20 + p * 30}px ${merk.flame}99`, zIndex: 70, opacity: 1 - puls }} />
      {puls > 0 && <div style={{ position: 'absolute', left: pos.b.x - 40, top: pos.b.y - 40, width: 80, height: 80, borderRadius: '50%', border: `4px solid ${merk.flame}`, opacity: 1 - puls, transform: `scale(${1 + puls * 2.5})`, zIndex: 70 }} />}
    </>
  )
}

const MeldingFilm: React.FC<{ t: number; op: number; notificatie: typeof notificatieAkkoord }> = ({ t, op, notificatie }) => {
  const f = useFormaat()
  if (t < op || t >= op + 4000) return null
  return (
    <div style={{ position: 'absolute', left: f.toastLeft, top: f.toastTop, width: f.toastBreedte, zIndex: 60, transform: `scale(${f.toastSchaal})`, transformOrigin: 'top left', opacity: 1 - vlak(t, op + 3400, op + 4000) }}>
      <div style={{ position: 'relative', height: 90 }}><Toast t={t} op={op} notificatie={notificatie} top={0} /></div>
    </div>
  )
}

export const FilmV2: React.FC<{ formaat?: Formaat['naam'] }> = ({ formaat = '4:3' }) => (
  <FormaatCtx.Provider value={FORMATEN[formaat]}>
    <FilmV2Binnen />
  </FormaatCtx.Provider>
)

const FilmV2Binnen: React.FC = () => {
  const t = useSceneTijd(true)
  const cam = useCamera(t, STOPS)
  const F = useFormaat()
  const MIDDEN_Y = F.middenY
  const MIDDEN_X = F.middenX

  // Welk scherm actief is, en hoe ver een wissel gevorderd is (0..1).
  const WISSELS: { ms: number; naar: string }[] = [
    { ms: 0, naar: 'dashboard' }, { ms: B.mailCamOp, naar: 'mail' }, { ms: B.cockpitCamOp, naar: 'cockpit' }, { ms: B.editorCamOp, naar: 'editor' },
    { ms: B.terugCockpit1, naar: 'cockpit' }, { ms: B.portaalCamOp, naar: 'portaal' }, { ms: B.terugCockpit2, naar: 'cockpit' },
    { ms: B2.planningCamOp, naar: 'planning' }, { ms: B2.terugCockpit3, naar: 'cockpit' },
    { ms: B2.telefoonCamOp, naar: 'telefoon' }, { ms: B2.terugCockpit4, naar: 'cockpit' },
    { ms: B2.constellatieOp, naar: 'alles' },
  ]
  let actiefScherm = 'dashboard', vorigScherm = 'dashboard', wisselP = 1
  for (let i = 0; i < WISSELS.length; i++) {
    if (t >= WISSELS[i].ms) { vorigScherm = i > 0 ? WISSELS[i - 1].naar : WISSELS[i].naar; actiefScherm = WISSELS[i].naar; wisselP = vlak(t, WISSELS[i].ms, WISSELS[i].ms + 1100) }
  }
  const diepte = (naam: string) => actiefScherm === 'alles' ? 0.35 * (1 - wisselP) + 0 : (naam === actiefScherm ? 1 - wisselP : naam === vorigScherm ? wisselP : 1)
  const kantelVan = (naam: string, rust: number) => rust * diepte(naam)
  const gloedVan = (naam: string) => 0.8 * (1 - diepte(naam))

  // Fase-hartslag
  const status = t >= B2.teFacturerenOp ? 'te-factureren' : t >= B2.ingeplandOp ? 'ingepland' : t >= B.akkoordKlantOp ? 'akkoord-klant' : t >= B.inReviewOp ? 'in-review' : 'gepland'
  const faseIdx = { gepland: 0, 'in-review': 1, 'akkoord-klant': 2, ingepland: 4, 'te-factureren': 5 }[status]
  const faseWissel = t >= B2.teFacturerenOp ? B2.teFacturerenOp : t >= B2.ingeplandOp ? B2.ingeplandOp : t >= B.akkoordKlantOp ? B.akkoordKlantOp : t >= B.inReviewOp ? B.inReviewOp : B.cockpitOp
  const meldingen = t >= B2.toastBetaaldOp - 200 ? 6 : t >= B.toastAkkoordOp - 200 ? 5 : 4
  // De gevel achter alles volgt de klus.
  const gevelStand: GevelStand = t >= B2.gevelBrandtOp ? 'brandt' : t >= B2.ingeplandOp ? 'gemonteerd' : t >= B.akkoordKlantOp ? 'akkoord' : t >= B.inReviewOp ? 'offerte' : 'aanvraag'
  const gevelSinds = t >= B2.gevelBrandtOp ? B2.gevelBrandtOp : t >= B2.ingeplandOp ? B2.ingeplandOp : t >= B.akkoordKlantOp ? B.akkoordKlantOp : t >= B.inReviewOp ? B.inReviewOp : B.cockpitOp
  const gevelReveal = vlak(t, B2.pullbackOp, B2.constellatieOp + 900, ease.inUit)
  const gevelZicht = t < B0.dashboardOp ? 0 : 0.22 + gevelReveal * 0.78
  const gevelBlur = 10 * (1 - gevelReveal)
  // De klok loopt door na Inklokken, bovenin de film, tot de factuur betaald is.
  const klokZicht = t >= B2.ingekloktOp && t < B2.betaaldOp ? Math.min(vlak(t, B2.ingekloktOp + 900, B2.ingekloktOp + 1300), 1 - vlak(t, B2.betaaldOp - 400, B2.betaaldOp)) : 0
  const klokSec = Math.max(0, Math.floor((t - B2.ingekloktOp) / 1000))
  // Welke kant van de tafel: jij of je klant.
  const bijKlant = (t >= B.portaalCamOp && t < B.terugCockpit2) 
  const kantWissel = bijKlant ? B.portaalCamOp : B.terugCockpit2
  const kantZicht = t >= B.portaalCamOp && t < B.terugCockpit2 + 2600 ? Math.min(vlak(t, kantWissel + 300, kantWissel + 600), 1 - vlak(t, kantWissel + 2200, kantWissel + 2600)) : 0
  const faseLabel = t >= B2.betaaldOp ? 'Betaald' : t >= B2.factuurVerstuurdOp ? 'Gefactureerd' : undefined
  const faseLabelWissel = t >= B2.betaaldOp ? B2.betaaldOp : t >= B2.factuurVerstuurdOp ? B2.factuurVerstuurdOp : faseWissel

  const cockpitStand = {
    status: status as 'gepland' | 'in-review' | 'akkoord-klant' | 'ingepland' | 'te-factureren',
    offerteStatus: t >= B.akkoordKlantOp ? 'goedgekeurd' as const : t >= B.inReviewOp ? 'verzonden' as const : null,
    montage: t >= B2.ingeplandOp,
    ingekloktSinds: t >= B2.ingekloktOp ? B2.ingekloktOp : null,
    portaal: [...(t >= B.inReviewOp ? ['offerte' as const] : []), ...(t >= B2.fotoPortaalOp ? ['foto' as const] : [])],
    portaalReactie: t >= B.akkoordKlantOp,
    activiteiten: [],
    meldingen,
    composer: { op: B2.composerOp, dichtOp: B2.composerDichtOp, typOp: B2.typOp, bijlageOp: B2.bijlageOp, opvolgenOp: B2.opvolgenOp, verzendOp: B2.verzondenOp },
    blokOp: { kop: B.cockpitOp, fase: B.cockpitOp + 150, briefing: B.cockpitOp + 300, grid: B.cockpitOp + 450, portaal: B.cockpitOp + 600, tijd: B.cockpitOp + 250, klant: B.cockpitOp + 400, team: B.cockpitOp + 550, acties: B.cockpitOp + 700 },
  }
  const inFinancieel = t >= B2.financieelOp && t < B2.pullbackOp + 600
  const financieelP = vlak(t, B2.financieelOp, B2.financieelOp + 300)

  const plekVan = (p: { x: number; y: number }) => p
  const wereldZicht = 1 - vlak(t, B2.eindkaartOp, B2.eindkaartOp + 600)
  const eindGrond = vlak(t, B2.eindkaartOp, B2.eindkaartOp + 700, ease.inUit)

  // Letters
  const puntZicht = vlak(t, B2.puntOp, B2.puntOp + 150)
  const puntP = veer(t, B2.puntOp, { demping: 12, duurMs: 800 })
  const pulse = Math.sin(vlak(t, B2.pulseOp, B2.pulseOp + 600, ease.inUit) * Math.PI)
  const puntPos = letterPosities(F.wordmarkSize, MIDDEN_X).find((p) => p.teken === '.')!
  const regelP = veer(t, B2.regelOp, { demping: 18, duurMs: 800 })
  const urlP = veer(t, B2.urlOp, { demping: 18, duurMs: 800 })

  const inDashboard = t < B.mailCamOp + 1300 || t >= B2.pullbackOp
  const inMail = (t >= B0.klikEmail - 1500 && t < B.cockpitCamOp + 1300) || t >= B2.pullbackOp
  const rust = (x: number, y: number) => ({ x: (x / 1080) * F.b, y: (y / 1920) * F.h })
  const inEditor = (t >= B.editorCamOp - 800 && t <= B.terugCockpit1 + 1300) || t >= B2.pullbackOp
  const inPortaal = (t >= B.portaalCamOp - 800 && t <= B.terugCockpit2 + 1300) || t >= B2.pullbackOp
  const inPlanning = (t >= B2.planningCamOp - 800 && t <= B2.terugCockpit3 + 1300) || t >= B2.pullbackOp
  const inTelefoon = (t >= B2.telefoonCamOp - 800 && t <= B2.terugCockpit4 + 1300) || t >= B2.pullbackOp
  const inKanban = t >= B2.pullbackOp - 200
  const inCockpit = t >= B.cockpitCamOp - 1000

  return (
    <AbsoluteFill data-film-root className="film-root" style={{ fontFamily: fonts.body, backgroundColor: merk.pagina }}>
      {/* Sfeer achter de opening, licht gewassen */}
      {t < B0.dashboardOp + 1200 && <Sfeer bestand="sfeer/hero-opening.mp4" t={t} waas={0} zoom={0} />}
      {t < B0.dashboardOp + 1200 && <AbsoluteFill style={{ backgroundColor: merk.pagina, opacity: 0.88 }} />}

      <div style={{ opacity: wereldZicht }}>
      <Wereld camera={cam} grond={t < B0.dashboardOp + 1200 || t >= B2.pullbackOp ? 'transparent' : merk.pagina}>
        <Gevel t={t} x={CENTRUM.x} y={CENTRUM.y + 900} stand={gevelStand} standSinds={gevelSinds} zicht={gevelZicht} blur={gevelBlur} breedte={5600} />
        {inDashboard && (
          <Scherm id="dashboard" x={PLEK.dashboard.x} y={PLEK.dashboard.y} diepte={diepte('dashboard')} kantel={kantelVan('dashboard', -4)} gloed={gloedVan('dashboard')} zicht={t < B0.dashboardOp ? 0 : vlak(t, B0.dashboardOp, B0.dashboardOp + 500)}>
            <Dashboard t={t} stand={{ mailOp: B0.dashboardMailOp }} />
          </Scherm>
        )}
        {inKanban && (
          <Scherm id="kanban" x={plekVan(PLEK.kanban).x} y={plekVan(PLEK.kanban).y} diepte={diepte('kanban')} kantel={0} gloed={0}>
            <Kanban t={t} stand={{ kolom: 'te-factureren', wisselOp: B2.pullbackOp + 900 }} />
          </Scherm>
        )}
        {inMail && (
          <Scherm id="mail" x={plekVan(PLEK.mail).x} y={plekVan(PLEK.mail).y} diepte={diepte('mail')} kantel={kantelVan('mail', -5)} gloed={gloedVan('mail')}>
            <MailApp t={t} stand={{ gekozen: t >= B.mailReaderOp, klantOp: B.mailKlantOp, projectOp: B.mailProjectOp, bijlageOp: B.mailBijlageOp }} />
          </Scherm>
        )}
        {inCockpit && (
          <Scherm id="cockpit" x={plekVan(PLEK.cockpit).x} y={plekVan(PLEK.cockpit).y} diepte={diepte('cockpit')} kantel={kantelVan('cockpit', 5)} gloed={gloedVan('cockpit')}>
            <div style={{ opacity: inFinancieel ? 1 - financieelP : 1 }}><Cockpit t={t} stand={cockpitStand} /></div>
            {inFinancieel && (
              <div style={{ position: 'absolute', inset: 0, opacity: financieelP }}>
                <FinancieelTab t={t} stand={{ factuurOp: B2.factuurOp, verstuurdOp: B2.factuurVerstuurdOp, betaaldOp: B2.betaaldOp }} />
              </div>
            )}
          </Scherm>
        )}
        {inEditor && (
          <Scherm id="editor" x={plekVan(PLEK.editor).x} y={plekVan(PLEK.editor).y} diepte={diepte('editor')} kantel={kantelVan('editor', -5)} gloed={gloedVan('editor')}>
            <OfferteEditor t={t} stand={{ regelsOp: B.regelsOp, calculatieOp: B.calculatieOp, calculatieDichtOp: B.calculatieDichtOp, verstuurTikOp: B.klikVerstuur + 80, keuzeOp: B.keuzeOp, keuzeTikOp: B.klikPortaal + 80, flapOp: B.flapOp }} />
          </Scherm>
        )}
        {inPortaal && (
          <Scherm id="portaal" x={plekVan(PLEK.portaal).x} y={plekVan(PLEK.portaal).y} diepte={diepte('portaal')} kantel={kantelVan('portaal', -5)} gloed={gloedVan('portaal')}>
            <PortaalKlant t={t} stand={t < B.publiekOp
              ? { pagina: 'portaal', projectStatus: 'in-review', kaarten: [{ soort: 'offerte', status: 'verstuurd', op: B.portaalCamOp + 900 }] }
              : t < B.terugCockpit2 + 1300
                ? { pagina: 'publiek', projectStatus: 'in-review', kaarten: [], naamOp: B.naamOp, tekenOp: B.tekenOp, vinkOp: B.vinkOp, tikOp: B.klikBevestig + 80, klaarOp: B.geaccepteerdOp }
                : { pagina: 'portaal', projectStatus: 'te-factureren', kaarten: [{ soort: 'offerte', status: 'geaccepteerd' }, { soort: 'foto' }, { soort: 'factuur', status: 'betaald' }] }} />
          </Scherm>
        )}
        {inPlanning && (
          <Scherm id="planning" x={plekVan(PLEK.planning).x} y={plekVan(PLEK.planning).y} diepte={diepte('planning')} kantel={kantelVan('planning', 5)} gloed={gloedVan('planning')}>
            <Planning t={t} stand={{ sleepOp: B2.sleepOp, landOp: B2.landOp }} />
          </Scherm>
        )}
        {inTelefoon && (
          <Scherm id="telefoon" x={plekVan(PLEK.telefoon).x} y={plekVan(PLEK.telefoon).y} diepte={diepte('telefoon')} kantel={kantelVan('telefoon', -4)} gloed={gloedVan('telefoon')} breedte={TELEFOON_B} hoogte={TELEFOON_H}>
            <TelefoonInRuimte t={t} stand={{ fotoOp: B2.fotoOp }} />
          </Scherm>
        )}
      </Wereld>
      </div>

      <Opening t={t} />
      <Belofte t={t} op={B0.belofteOp} uit={B0.belofteUit} {...COPY.opening} selectOp={B0.belofteSelectOp} positie="onder" />
      <Belofte t={t} op={B.mailBelofteOp} uit={B.mailBelofteUit} {...COPY.mail} positie="onder" />
      <Belofte t={t} op={B.projectBelofteOp} uit={B.projectBelofteUit} {...COPY.project} positie="onder" />
      <Belofte t={t} op={B.offerteBelofteOp} uit={B.offerteBelofteUit} {...COPY.offerte} positie="onder" />
      <Belofte t={t} op={B.portaalBelofteOp} uit={B.portaalBelofteUit} {...COPY.portaal} positie="onder" />
      <Belofte t={t} op={B2.montageBelofteOp} uit={B2.montageBelofteUit} {...COPY.montage} positie="onder" />
      <Belofte t={t} op={B2.werkbonBelofteOp} uit={B2.werkbonBelofteUit} {...COPY.werkbon} positie="boven" />
      <Belofte t={t} op={B2.mailBelofteOp} uit={B2.mailBelofteUit} {...COPY.mailUitProject} positie="boven" />
      <Belofte t={t} op={B2.factuurBelofteOp} uit={B2.factuurBelofteUit} {...COPY.factuur} positie="boven" />
      <Belofte t={t} op={B2.allesBelofteOp} uit={B2.allesBelofteUit} {...COPY.alles} positie="boven" />

      {klokZicht > 0 && (
        <div style={{ position: 'absolute', right: 48, top: 40, zIndex: 55, opacity: klokZicht, display: 'flex', alignItems: 'center', gap: 14, padding: '12px 22px', borderRadius: 999, backgroundColor: merk.wit, boxShadow: '0 12px 32px rgba(120,90,50,0.16)', fontFamily: fonts.mono, fontSize: 30, color: merk.ink }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: merk.flame, opacity: 0.6 + 0.4 * Math.abs(Math.sin(t / 500)) }} />
          {`${Math.floor(klokSec / 3600)}:${String(Math.floor((klokSec % 3600) / 60)).padStart(2, '0')}:${String(klokSec % 60).padStart(2, '0')}`}
          <span style={{ fontFamily: fonts.body, fontSize: 22, color: merk.tekstSec }}>ingeklokt</span>
        </div>
      )}
      {kantZicht > 0 && (
        <div style={{ position: 'absolute', left: 48, top: 40, zIndex: 55, opacity: kantZicht, padding: '12px 26px', borderRadius: 999, backgroundColor: bijKlant ? merk.wit : merk.petrol, color: bijKlant ? merk.petrol : merk.wit, fontFamily: fonts.kop, fontWeight: 700, fontSize: 30, letterSpacing: '-0.01em', boxShadow: '0 12px 32px rgba(120,90,50,0.16)' }}>
          {bijKlant ? 'je klant ziet' : 'jij ziet'}<span style={{ color: merk.flame }}>.</span>
        </div>
      )}
      <MeldingFilm t={t} op={B.toastAkkoordOp} notificatie={notificatieAkkoord} />
      <MeldingFilm t={t} op={B2.toastBetaaldOp} notificatie={notificatieBetaald} />

      <Geluid klanken={KLANKEN} totMs={FILM2_DUUR_MS} />
      {t < B2.constellatieOp && <Cursor t={t} stappen={CURSOR} zichtVan={B.mailCamOp + 400} zichtTot={B2.pullbackOp + 400} />}
      {t >= B2.eindkaartOp && <Cursor t={t} stappen={CURSOR} zichtVan={B2.eindkaartOp + 100} zichtTot={B2.puntOp + 100} />}
      <span data-doel="wordmark-punt" style={{ position: 'absolute', left: puntPos.x + puntPos.b / 2, top: MIDDEN_Y + F.wordmarkSize * 0.28, width: 1, height: 1 }} />
      <FaseStip t={t} op={B.stipOp} vanDoel="bevestigen" naarFase={2} />
      {t >= B.cockpitOp && t < B2.eindkaartOp && <FaseBalkFilm fase={faseIdx} sindsWissel={t - Math.max(faseWissel, faseLabelWissel)} label={faseLabel} donker={false} bottom={F.faseBottom} zijkant={F.faseZijkant} schaal={F.faseSchaal} zicht={Math.min(vlak(t, B.cockpitOp, B.cockpitOp + 500), 1 - vlak(t, B2.constellatieOp, B2.constellatieOp + 600))} />}

      {/* End card */}
      <AbsoluteFill style={{ backgroundColor: merk.petrol, opacity: eindGrond, zIndex: 5 }} />
      {t >= B2.lettersOp && (
        <div style={{ position: 'relative', zIndex: 10 }}>
          <Wordmark y={MIDDEN_Y} centrumX={MIDDEN_X} size={F.wordmarkSize} kleur={merk.wit} stand={(i) => {
            if (i === 4) return { op: puntZicht, dy: (1 - puntP) * -260, schaal: 1 + pulse * 0.45 }
            const p = veer(t, B2.lettersOp + i * 280, { demping: 14, duurMs: 800 })
            return { op: vlak(t, B2.lettersOp + i * 280, B2.lettersOp + i * 280 + 150), dy: (1 - p) * 140 }
          }} />
          {t >= B2.pulseOp && pulse > 0 && <div style={{ position: 'absolute', left: puntPos.x + puntPos.b / 2 - 40, top: MIDDEN_Y + F.wordmarkSize * 0.28 - 40, width: 80, height: 80, borderRadius: '50%', border: `4px solid ${merk.flame}`, opacity: 1 - vlak(t, B2.pulseOp, B2.pulseOp + 700), transform: `scale(${1 + vlak(t, B2.pulseOp, B2.pulseOp + 700, ease.uit) * 3})` }} />}
          <div style={{ position: 'absolute', left: 90, right: 90, top: MIDDEN_Y + F.wordmarkSize * 0.88, textAlign: 'center', fontFamily: fonts.kop, fontWeight: 600, fontSize: F.naam === '4:3' ? 40 : 52, lineHeight: 1.2, letterSpacing: '-0.02em', color: merk.wit, opacity: vlak(t, B2.regelOp, B2.regelOp + 250), transform: `translateY(${(1 - regelP) * 30}px)`, textWrap: 'balance' as never }}>
            {COPY.eindkaart.regel}
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: MIDDEN_Y + F.wordmarkSize * (F.naam === '4:3' ? 1.28 : 1.42), textAlign: 'center', fontFamily: fonts.mono, fontSize: F.naam === '4:3' ? 30 : 40, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.85)', opacity: vlak(t, B2.urlOp, B2.urlOp + 250), transform: `translateY(${(1 - urlP) * 20}px)` }}>
            {COPY.eindkaart.url}
          </div>
        </div>
      )}
    </AbsoluteFill>
  )
}
