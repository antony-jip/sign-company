import { useLayoutEffect, useState } from 'react'
import { AbsoluteFill, Easing } from 'remotion'
import { useSceneTijd, vlak, veer, lerp, ease } from '../tijd'
import { fonts } from '../fonts'
import { merk } from '../brand'
import { Wereld, Scherm, useCamera, SCHERM_B, SCHERM_H, MIDDEN_Y, type CameraStop } from './Wereld'
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
import { B, B2 } from './beats'
import { Geluid, type Klank } from './Geluid'
import { notificatieAkkoord, notificatieBetaald } from '../mockData'

// Versie 2: één klus, één cockpit, één camera. Alles op absolute ms uit beats.ts.
export const FILM2_DUUR_MS = B2.eind

// Plekken in de ruimte (middelpunten, filmcoördinaten bij zoom 1).
const PLEK = {
  mail: { x: -60, y: 0 },
  cockpit: { x: 1120, y: 120 },
  editor: { x: 2240, y: -420 },
  portaal: { x: 2240, y: 760 },
  planning: { x: -60, y: 1240 },
  telefoon: { x: 1120, y: -1050 },
  kanban: { x: 1120, y: 1420 },
}
const CENTRUM = { x: 1100, y: 420 }

const lokaal = (plek: { x: number; y: number }, cx: number, cy: number) => ({ x: plek.x + (cx - 720) * (SCHERM_B / 1440), y: plek.y + (cy - 540) * (SCHERM_H / 1080) })
const TELEFOON_B = 418 * 0.62, TELEFOON_H = 872 * 0.62
const telefoonLokaal = (cx: number, cy: number) => ({ x: PLEK.telefoon.x + (cx - 209) * 0.62, y: PLEK.telefoon.y + (cy - 436) * 0.62 })

const STOPS: CameraStop[] = [
  { ms: 0, ...lokaal(PLEK.mail, 720, 540), zoom: 0.55 },
  { ms: B.mailCamOp, ...lokaal(PLEK.mail, 560, 470), zoom: 2.1, duurMs: 1100 },
  { ms: B.mailKlantOp, ...lokaal(PLEK.mail, 980, 540), zoom: 2.0, duurMs: 900 },
  { ms: B.mailKlikProject - 700, ...lokaal(PLEK.mail, 900, 720), zoom: 2.4, duurMs: 800 },
  { ms: B.mailKlikBijlage - 600, ...lokaal(PLEK.mail, 900, 560), zoom: 2.6, duurMs: 700 },
  { ms: B.cockpitCamOp, ...lokaal(PLEK.cockpit, 620, 330), zoom: 1.55, duurMs: 1200 },
  { ms: B.voortgangZoomOp, ...lokaal(PLEK.cockpit, 520, 470), zoom: 2.4, duurMs: 700 },
  { ms: B.klikOfferteMaken - 700, ...lokaal(PLEK.cockpit, 1160, 230), zoom: 2.6, duurMs: 800 },
  { ms: B.editorCamOp, ...lokaal(PLEK.editor, 640, 500), zoom: 1.7, duurMs: 1100 },
  { ms: B.klikVerstuur - 700, ...lokaal(PLEK.editor, 1180, 300), zoom: 2.6, duurMs: 800 },
  { ms: B.terugCockpit1, ...lokaal(PLEK.cockpit, 520, 470), zoom: 2.2, duurMs: 1100 },
  { ms: B.portaalCamOp, ...lokaal(PLEK.portaal, 520, 430), zoom: 2.3, duurMs: 1200 },
  { ms: B.publiekOp, ...lokaal(PLEK.portaal, 1180, 720), zoom: 3.2, duurMs: 900 },
  { ms: B.terugCockpit2, ...lokaal(PLEK.cockpit, 520, 470), zoom: 2.2, duurMs: 1100 },
  // Montage
  { ms: B2.klikMontage - 700, ...lokaal(PLEK.cockpit, 420, 840), zoom: 2.4, duurMs: 800 },
  { ms: B2.planningCamOp, ...lokaal(PLEK.planning, 560, 520), zoom: 1.7, duurMs: 1100 },
  { ms: B2.terugCockpit3, ...lokaal(PLEK.cockpit, 520, 470), zoom: 2.2, duurMs: 1100 },
  // Klokken en telefoon
  { ms: B2.klikInklokken - 700, ...lokaal(PLEK.cockpit, 1120, 420), zoom: 2.6, duurMs: 800 },
  { ms: B2.telefoonCamOp, ...telefoonLokaal(209, 470), zoom: 3.0, duurMs: 1100 },
  { ms: B2.terugCockpit4, ...lokaal(PLEK.cockpit, 520, 900), zoom: 2.0, duurMs: 1100 },
  // Mail uit het project
  { ms: B2.klikMailContact - 700, ...lokaal(PLEK.cockpit, 1120, 640), zoom: 2.4, duurMs: 800 },
  { ms: B2.composerOp, ...lokaal(PLEK.cockpit, 1080, 600), zoom: 2.3, duurMs: 900 },
  { ms: B2.klikUitProject - 700, ...lokaal(PLEK.cockpit, 1080, 800), zoom: 2.5, duurMs: 800 },
  // Financieel
  { ms: B2.klikFinancieel - 700, ...lokaal(PLEK.cockpit, 720, 330), zoom: 2.2, duurMs: 900 },
  { ms: B2.klikFactuurMaken - 700, ...lokaal(PLEK.cockpit, 1000, 300), zoom: 2.4, duurMs: 800 },
  { ms: B2.klikFactuurVerstuur - 700, ...lokaal(PLEK.cockpit, 720, 620), zoom: 2.2, duurMs: 800 },
  // Pull-back, constellatie, magneet
  { ms: B2.pullbackOp, ...lokaal(PLEK.cockpit, 720, 540), zoom: 1.0, duurMs: 1400 },
  { ms: B2.constellatieOp, ...CENTRUM, zoom: 0.31, duurMs: 1600 },
  { ms: B2.magneetOp, ...CENTRUM, zoom: 0.5, duurMs: 2400 },
]

const CURSOR: CursorStap[] = [
  { ms: 0, doel: { x: 700, y: 1500 } },
  { ms: B.mailKlikLijst - 700, doel: 'mail-item', klik: true },
  { ms: B.mailKlikLijst + 600, doel: { x: 760, y: 1450 } },
  { ms: B.mailKlikProject - 700, doel: 'project-aanmaken', klik: true },
  { ms: B.mailKlikBijlage - 700, doel: 'bijlage-project', klik: true },
  { ms: B.mailKlikBijlage + 500, doel: { x: 980, y: 1400 } },
  { ms: B.klikOfferteMaken - 700, doel: 'offerte-maken', klik: true },
  { ms: B.editorOp, doel: { x: 900, y: 1500 } },
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
]

// Geluid op de beats.
const KLIKS = [B.mailKlikLijst, B.mailKlikProject, B.mailKlikBijlage, B.klikOfferteMaken, B.klikVerstuur, B.klikPortaal, B.klikBekijken, B.klikBevestig,
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
  { ms: B2.inslagOp, bestand: 'inslag', volume: 0.8 }, { ms: B2.puntOp + 600, bestand: 'landing', volume: 0.5 },
]

// Flame-stip die van een knop naar een cirkel in de fasebalk loopt: de klik
// veroorzaakt zichtbaar de fase.
const FaseStip: React.FC<{ t: number; op: number; vanDoel: string; naarFase: number }> = ({ t, op, vanDoel, naarFase }) => {
  const [pos, setPos] = useState<{ a: { x: number; y: number }; b: { x: number; y: number } } | null>(null)
  useLayoutEffect(() => {
    const root = document.querySelector('[data-film-root]')
    const a = document.querySelector(`[data-doel="${vanDoel}"]`)
    const b = document.querySelector(`[data-fase="${naarFase}"]`)
    if (!root || !a || !b) { setPos((p) => (p === null ? p : null)); return }
    const f = root.getBoundingClientRect(); const s = f.width / 1080
    const ra = a.getBoundingClientRect(); const rb = b.getBoundingClientRect()
    const n = { a: { x: (ra.left + ra.width / 2 - f.left) / s, y: (ra.top + ra.height / 2 - f.top) / s }, b: { x: (rb.left + rb.width / 2 - f.left) / s, y: (rb.top + rb.height / 2 - f.top) / s } }
    setPos((p) => (p && Math.abs(p.a.x - n.a.x) < 0.05 && Math.abs(p.b.y - n.b.y) < 0.05 && Math.abs(p.a.y - n.a.y) < 0.05 && Math.abs(p.b.x - n.b.x) < 0.05 ? p : n))
  })
  if (t < op || t > op + 1100 || !pos) return null
  const p = vlak(t, op, op + 700)
  const x = lerp(pos.a.x, pos.b.x, p), y = lerp(pos.a.y, pos.b.y, p) - Math.sin(p * Math.PI) * 220
  const puls = vlak(t, op + 700, op + 1100)
  return (
    <>
      <div style={{ position: 'absolute', left: x - 14, top: y - 14, width: 28, height: 28, borderRadius: '50%', backgroundColor: merk.flame, boxShadow: `0 0 ${20 + p * 30}px ${merk.flame}99`, zIndex: 70, opacity: 1 - puls }} />
      {puls > 0 && <div style={{ position: 'absolute', left: pos.b.x - 40, top: pos.b.y - 40, width: 80, height: 80, borderRadius: '50%', border: `4px solid ${merk.flame}`, opacity: 1 - puls, transform: `scale(${1 + puls * 2.5})`, zIndex: 70 }} />}
    </>
  )
}

// Deeltjes voor de inslag, deterministisch.
const lcg = (seed: number) => { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296 } }
const DEELTJES = (() => {
  const rnd = lcg(311); const kleuren = ['#1A535C', '#D24620', '#2D6B48', '#3A6B8C', '#9A5A48', '#6A5A8A', '#C44830']
  return Array.from({ length: 110 }, (_, i) => { const hoek = rnd() * Math.PI * 2; const v = 500 + rnd() * 900; return { kleur: kleuren[i % kleuren.length], dx: Math.cos(hoek) * v, dy: Math.sin(hoek) * v - 150, r: 6 + rnd() * 14, vertraag: rnd() * 90 } })
})()

const MeldingFilm: React.FC<{ t: number; op: number; notificatie: typeof notificatieAkkoord }> = ({ t, op, notificatie }) => {
  if (t < op || t >= op + 4000) return null
  return (
    <div style={{ position: 'absolute', left: 60, top: 300, width: 960, zIndex: 60, transform: 'scale(1.35)', transformOrigin: 'top left', opacity: 1 - vlak(t, op + 3400, op + 4000) }}>
      <div style={{ position: 'relative', height: 90 }}><Toast t={t} op={op} notificatie={notificatie} top={0} /></div>
    </div>
  )
}

export const FilmV2: React.FC = () => {
  const t = useSceneTijd(true)
  const cam = useCamera(t, STOPS)

  // Welk scherm actief is, en hoe ver een wissel gevorderd is (0..1).
  const WISSELS: { ms: number; naar: string }[] = [
    { ms: 0, naar: 'mail' }, { ms: B.cockpitCamOp, naar: 'cockpit' }, { ms: B.editorCamOp, naar: 'editor' },
    { ms: B.terugCockpit1, naar: 'cockpit' }, { ms: B.portaalCamOp, naar: 'portaal' }, { ms: B.terugCockpit2, naar: 'cockpit' },
    { ms: B2.planningCamOp, naar: 'planning' }, { ms: B2.terugCockpit3, naar: 'cockpit' },
    { ms: B2.telefoonCamOp, naar: 'telefoon' }, { ms: B2.terugCockpit4, naar: 'cockpit' },
    { ms: B2.constellatieOp, naar: 'alles' },
  ]
  let actiefScherm = 'mail', vorigScherm = 'mail', wisselP = 1
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

  // Magneet: alle schermen trekken naar het centrum en krimpen, dan inslag.
  const trek = vlak(t, B2.magneetOp, B2.inslagOp, Easing.in(Easing.quad))
  const naInslag = t >= B2.inslagOp
  const plekVan = (p: { x: number; y: number }) => ({ x: lerp(p.x, CENTRUM.x, trek), y: lerp(p.y, CENTRUM.y, trek) })
  const magneetSchaal = lerp(1, 0.18, trek)
  const wereldZicht = naInslag ? 0 : 1
  const openingZicht = 1 - vlak(t, B.mailCamOp - 200, B.mailCamOp + 600)
  const eindGrond = vlak(t, B2.eindkaartOp, B2.eindkaartOp + 700, ease.inUit)

  // Letters
  const puntZicht = vlak(t, B2.puntOp, B2.puntOp + 150)
  const puntP = veer(t, B2.puntOp, { demping: 12, duurMs: 800 })
  const pulse = Math.sin(vlak(t, B2.pulseOp, B2.pulseOp + 600, ease.inUit) * Math.PI)
  const puntPos = letterPosities().find((p) => p.teken === '.')!
  const regelP = veer(t, B2.regelOp, { demping: 18, duurMs: 800 })
  const urlP = veer(t, B2.urlOp, { demping: 18, duurMs: 800 })

  const inMail = t < B.cockpitCamOp + 1300 || t >= B2.pullbackOp
  const inEditor = (t >= B.editorCamOp - 800 && t <= B.terugCockpit1 + 1300) || t >= B2.pullbackOp
  const inPortaal = (t >= B.portaalCamOp - 800 && t <= B.terugCockpit2 + 1300) || t >= B2.pullbackOp
  const inPlanning = (t >= B2.planningCamOp - 800 && t <= B2.terugCockpit3 + 1300) || t >= B2.pullbackOp
  const inTelefoon = (t >= B2.telefoonCamOp - 800 && t <= B2.terugCockpit4 + 1300) || t >= B2.pullbackOp
  const inKanban = t >= B2.pullbackOp - 200
  const inCockpit = t >= B.cockpitCamOp - 1000

  return (
    <AbsoluteFill data-film-root className="film-root" style={{ fontFamily: fonts.body, backgroundColor: merk.pagina }}>
      {/* Sfeer achter de opening en achter de landing, licht gewassen */}
      {t < B.mailCamOp + 800 && <Sfeer bestand="sfeer/hero-opening.mp4" t={t} waas={0} zoom={0} />}
      {t < B.mailCamOp + 800 && <AbsoluteFill style={{ backgroundColor: merk.pagina, opacity: 0.86 }} />}

      <div style={{ opacity: wereldZicht }}>
      <Wereld camera={cam} grond={t >= B2.pullbackOp ? 'transparent' : merk.pagina}>
        {inKanban && (
          <Scherm id="kanban" x={plekVan(PLEK.kanban).x} y={plekVan(PLEK.kanban).y} diepte={diepte('kanban')} kantel={0} gloed={0} extraSchaal={magneetSchaal} rotatie={trek * 14}>
            <Kanban t={t} stand={{ kolom: 'te-factureren', wisselOp: B2.pullbackOp + 900 }} />
          </Scherm>
        )}
        {inMail && (
          <Scherm id="mail" x={plekVan(PLEK.mail).x} y={plekVan(PLEK.mail).y} diepte={diepte('mail')} kantel={kantelVan('mail', -5)} gloed={gloedVan('mail')} extraSchaal={magneetSchaal} rotatie={trek * -10}>
            <MailApp t={t} stand={{ gekozen: t >= B.mailReaderOp, klantOp: B.mailKlantOp, projectOp: B.mailProjectOp, bijlageOp: B.mailBijlageOp }} />
          </Scherm>
        )}
        {inCockpit && (
          <Scherm id="cockpit" x={plekVan(PLEK.cockpit).x} y={plekVan(PLEK.cockpit).y} diepte={diepte('cockpit')} kantel={kantelVan('cockpit', 5)} gloed={gloedVan('cockpit')} extraSchaal={magneetSchaal} rotatie={trek * 6}>
            <div style={{ opacity: inFinancieel ? 1 - financieelP : 1 }}><Cockpit t={t} stand={cockpitStand} /></div>
            {inFinancieel && (
              <div style={{ position: 'absolute', inset: 0, opacity: financieelP }}>
                <FinancieelTab t={t} stand={{ factuurOp: B2.factuurOp, verstuurdOp: B2.factuurVerstuurdOp, betaaldOp: B2.betaaldOp }} />
              </div>
            )}
          </Scherm>
        )}
        {inEditor && (
          <Scherm id="editor" x={plekVan(PLEK.editor).x} y={plekVan(PLEK.editor).y} diepte={diepte('editor')} kantel={kantelVan('editor', -5)} gloed={gloedVan('editor')} extraSchaal={magneetSchaal} rotatie={trek * -8}>
            <OfferteEditor t={t} stand={{ regelsOp: B.regelsOp, verstuurTikOp: B.klikVerstuur + 80, keuzeOp: B.keuzeOp, keuzeTikOp: B.klikPortaal + 80, flapOp: B.flapOp }} />
          </Scherm>
        )}
        {inPortaal && (
          <Scherm id="portaal" x={plekVan(PLEK.portaal).x} y={plekVan(PLEK.portaal).y} diepte={diepte('portaal')} kantel={kantelVan('portaal', -5)} gloed={gloedVan('portaal')} extraSchaal={magneetSchaal} rotatie={trek * 9}>
            <PortaalKlant t={t} stand={t < B.publiekOp
              ? { pagina: 'portaal', projectStatus: 'in-review', kaarten: [{ soort: 'offerte', status: 'verstuurd', op: B.portaalCamOp + 900 }] }
              : t < B.terugCockpit2 + 1300
                ? { pagina: 'publiek', projectStatus: 'in-review', kaarten: [], naamOp: B.naamOp, tekenOp: B.tekenOp, vinkOp: B.vinkOp, tikOp: B.klikBevestig + 80, klaarOp: B.geaccepteerdOp }
                : { pagina: 'portaal', projectStatus: 'te-factureren', kaarten: [{ soort: 'offerte', status: 'geaccepteerd' }, { soort: 'foto' }, { soort: 'factuur', status: 'betaald' }] }} />
          </Scherm>
        )}
        {inPlanning && (
          <Scherm id="planning" x={plekVan(PLEK.planning).x} y={plekVan(PLEK.planning).y} diepte={diepte('planning')} kantel={kantelVan('planning', 5)} gloed={gloedVan('planning')} extraSchaal={magneetSchaal} rotatie={trek * -6}>
            <Planning t={t} stand={{ sleepOp: B2.sleepOp, landOp: B2.landOp }} />
          </Scherm>
        )}
        {inTelefoon && (
          <Scherm id="telefoon" x={plekVan(PLEK.telefoon).x} y={plekVan(PLEK.telefoon).y} diepte={diepte('telefoon')} kantel={kantelVan('telefoon', -4)} gloed={gloedVan('telefoon')} breedte={TELEFOON_B} hoogte={TELEFOON_H} extraSchaal={magneetSchaal} rotatie={trek * 12}>
            <TelefoonInRuimte t={t} stand={{ fotoOp: B2.fotoOp }} />
          </Scherm>
        )}
      </Wereld>
      </div>

      {/* Opening: de belofte over de wazige ruimte */}
      <AbsoluteFill style={{ backgroundColor: merk.pagina, opacity: openingZicht * 0.35, pointerEvents: 'none' }} />
      <Belofte t={t} op={B.belofteOp} uit={B.belofteUit} tekst="Alles wat een signmaker nodig heeft. In één app" kernwoord="één app" selectOp={B.belofteSelectOp} />
      <Belofte t={t} op={B.mailBelofteOp} uit={B.mailBelofteUit} tekst="Je mail is je werkvoorraad" kernwoord="werkvoorraad" positie="onder" />
      <Belofte t={t} op={B.projectBelofteOp} uit={B.projectBelofteUit} tekst="Eén klik. Het project staat" kernwoord="staat" positie="onder" />
      <Belofte t={t} op={B.offerteBelofteOp} uit={B.offerteBelofteUit} tekst="Je marge zie je vóór je verstuurt" kernwoord="marge" positie="onder" />
      <Belofte t={t} op={B.portaalBelofteOp} uit={B.portaalBelofteUit} tekst="Je klant tekent. Jij ziet het meteen" kernwoord="tekent" positie="onder" />
      <Belofte t={t} op={B2.montageBelofteOp} uit={B2.montageBelofteUit} tekst="Montage slepen is inplannen" kernwoord="slepen" positie="onder" />
      <Belofte t={t} op={B2.werkbonBelofteOp} uit={B2.werkbonBelofteUit} tekst="Uren, foto's en maten. Op locatie" kernwoord="locatie" positie="onder" />
      <Belofte t={t} op={B2.mailBelofteOp} uit={B2.mailBelofteUit} tekst="Mailen uit het project. Tekening erbij" kernwoord="Tekening" positie="onder" />
      <Belofte t={t} op={B2.factuurBelofteOp} uit={B2.factuurBelofteUit} tekst="Factuur eruit. Betaald gezien" kernwoord="Betaald" positie="onder" />
      <Belofte t={t} op={B2.allesBelofteOp} uit={B2.allesBelofteUit} tekst="Eén project. Alles erin" kernwoord="Alles" positie="boven" />

      <MeldingFilm t={t} op={B.toastAkkoordOp} notificatie={notificatieAkkoord} />
      <MeldingFilm t={t} op={B2.toastBetaaldOp} notificatie={notificatieBetaald} />

      <Geluid klanken={KLANKEN} totMs={FILM2_DUUR_MS} />
      {t < B2.constellatieOp && <Cursor t={t} stappen={CURSOR} zichtVan={B.mailCamOp + 400} zichtTot={B2.pullbackOp + 400} />}
      <FaseStip t={t} op={B.stipOp} vanDoel="bevestigen" naarFase={2} />
      {t >= B.cockpitOp && t < B2.magneetOp && <FaseBalkFilm fase={faseIdx} sindsWissel={t - faseWissel} donker={false} zicht={Math.min(vlak(t, B.cockpitOp, B.cockpitOp + 500), 1 - vlak(t, B2.constellatieOp, B2.constellatieOp + 600))} />}

      {/* Inslag, letters, punt, end card */}
      {naInslag && (
        <>
          <AbsoluteFill style={{ backgroundColor: merk.wit, opacity: 0.75 * (1 - vlak(t, B2.inslagOp, B2.inslagOp + 160)) }} />
          {DEELTJES.map((d, i) => {
            const p = vlak(t, B2.inslagOp + d.vertraag, B2.inslagOp + d.vertraag + 1100, ease.uit)
            const val = vlak(t, B2.inslagOp + d.vertraag, B2.inslagOp + d.vertraag + 1100, ease.in)
            const zicht = 1 - vlak(t, B2.inslagOp + d.vertraag + 500, B2.inslagOp + d.vertraag + 1100)
            return <div key={i} style={{ position: 'absolute', left: 540 + d.dx * p - d.r, top: MIDDEN_Y + d.dy * p + 400 * val - d.r, width: d.r * 2, height: d.r * 2, borderRadius: '50%', backgroundColor: d.kleur, opacity: zicht }} />
          })}
        </>
      )}
      <AbsoluteFill style={{ backgroundColor: merk.petrol, opacity: eindGrond, zIndex: 5 }} />
      {t >= B2.lettersOp && (
        <div style={{ position: 'relative', zIndex: 10 }}>
          <Wordmark y={MIDDEN_Y} kleur={eindGrond > 0.5 ? merk.wit : merk.petrol} stand={(i) => {
            if (i === 4) return { op: puntZicht, dy: (1 - puntP) * -260, schaal: 1 + pulse * 0.45 }
            const p = veer(t, B2.lettersOp + i * 280, { demping: 14, duurMs: 800 })
            return { op: vlak(t, B2.lettersOp + i * 280, B2.lettersOp + i * 280 + 150), dy: (1 - p) * 140 }
          }} />
          {t >= B2.pulseOp && pulse > 0 && <div style={{ position: 'absolute', left: puntPos.x + puntPos.b / 2 - 40, top: MIDDEN_Y + 92 - 40, width: 80, height: 80, borderRadius: '50%', border: `4px solid ${merk.flame}`, opacity: 1 - vlak(t, B2.pulseOp, B2.pulseOp + 700), transform: `scale(${1 + vlak(t, B2.pulseOp, B2.pulseOp + 700, ease.uit) * 3})` }} />}
          <div style={{ position: 'absolute', left: 90, right: 90, top: MIDDEN_Y + 290, textAlign: 'center', fontFamily: fonts.kop, fontWeight: 600, fontSize: 52, lineHeight: 1.2, letterSpacing: '-0.02em', color: merk.wit, opacity: vlak(t, B2.regelOp, B2.regelOp + 250), transform: `translateY(${(1 - regelP) * 30}px)`, textWrap: 'balance' as never }}>
            Alles wat een signmaker nodig heeft. In één app.
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: MIDDEN_Y + 470, textAlign: 'center', fontFamily: fonts.mono, fontSize: 40, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.85)', opacity: vlak(t, B2.urlOp, B2.urlOp + 250), transform: `translateY(${(1 - urlP) * 20}px)` }}>
            app.doen.team
          </div>
        </div>
      )}
    </AbsoluteFill>
  )
}
