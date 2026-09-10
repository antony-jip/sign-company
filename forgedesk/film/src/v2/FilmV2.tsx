import { useLayoutEffect, useState } from 'react'
import { AbsoluteFill } from 'remotion'
import { useSceneTijd, vlak, veer, lerp, ease, WOORD_MS, WOORD_STAP_MS } from '../tijd'
import { fonts } from '../fonts'
import { merk } from '../brand'
import { Wereld, Scherm, useCamera, SCHERM_B, SCHERM_H, type CameraStop } from './Wereld'
import { FormaatCtx, FORMATEN, useFormaat, type Formaat } from './formaat'
import { Cursor, useHermeet, rootMeetbaar, type CursorStap } from './Cursor'
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
import { LogoDoen, logoPuntPositie } from '../kern/LogoDoen'
import { B0, B, B2 } from './beats'
import { Opening } from './Opening'
import { Gevel, type GevelStand } from './Gevel'
import { COPY } from './copy'
import { ALLE_MODULES } from '@/lib/navigatie'
import { MessageSquare } from 'lucide-react'
import { Dashboard } from './schermen/Dashboard'
import { Geluid, type Klank } from './Geluid'
import { notificatieAkkoord, notificatieBetaald, notificatieCheckGevraagd, notificatieCheckAkkoord } from '../mockData'

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

// Regel: een reframe naar een knop vertrekt op klikX - 1200 en landt 400 tot
// 500 ms vóór de klik, zodat de klik op een stil beeld valt. Een vlucht naar
// een ander scherm vertrekt op de beat. Waar de beats dat niet toelaten staat
// het erbij; zie het rapport van de animator.
const STOPS: CameraStop[] = [
  { ms: 0, ...lokaal(PLEK.dashboard, 720, 540), zoom: 1.0 },
  { ms: B0.dashboardOp, ...lokaal(PLEK.dashboard, 720, 540), zoom: 1.35, duurMs: 900 },
  { ms: B0.dashboardMailOp - 400, ...lokaal(PLEK.dashboard, 300, 380), zoom: 2.2, duurMs: 800 },
  // Beats geven 900 ms tussen mailCamOp en de klik op de mail: de camera landt 120 ms na de klik.
  { ms: B.mailCamOp, ...lokaal(PLEK.mail, 560, 470), zoom: 2.1, duurMs: 1100, maxMs: 1100 },
  { ms: B.mailKlantOp, ...lokaal(PLEK.mail, 980, 540), zoom: 2.0, duurMs: 900 },
  { ms: B.mailKlikProject - 1200, ...lokaal(PLEK.mail, 900, 720), zoom: 2.4, duurMs: 800 },
  { ms: B.mailKlikBijlage - 1100, ...lokaal(PLEK.mail, 900, 560), zoom: 2.6, duurMs: 700 },
  { ms: B.cockpitCamOp, ...lokaal(PLEK.cockpit, 620, 330), zoom: 1.55, duurMs: 1200 },
  { ms: B.voortgangZoomOp - 200, ...lokaal(PLEK.cockpit, 520, 470), zoom: 2.4, duurMs: 700 },
  { ms: B.klikOfferteMaken - 1300, ...lokaal(PLEK.cockpit, 1160, 230), zoom: 2.6, duurMs: 800 },
  { ms: B.editorCamOp, ...lokaal(PLEK.editor, 640, 500), zoom: 1.7, duurMs: 1100 },
  { ms: B.klikCalculatie - 1200, ...lokaal(PLEK.editor, 560, 520), zoom: 2.4, duurMs: 800 },
  { ms: B.calculatieOp, ...lokaal(PLEK.editor, 752, 500), zoom: 2.2, duurMs: 800 },
  // Beats laten hier 700 ms tussen twee kliks: de camera landt 40 ms na de klik op Verstuur.
  { ms: B.klikCalculatieSluiten, ...lokaal(PLEK.editor, 1180, 260), zoom: 2.4, duurMs: 800 },
  { ms: B.checkOp, ...lokaal(PLEK.editor, 720, 520), zoom: 1.9, duurMs: 800 },
  { ms: B.checkVraagOp + 200, ...lokaal(PLEK.editor, 1180, 300), zoom: 2.6, duurMs: 800 },
  { ms: B.terugCockpit1, ...lokaal(PLEK.cockpit, 520, 470), zoom: 2.2, duurMs: 1100 },
  { ms: B.portaalCamOp, ...lokaal(PLEK.portaal, 520, 430), zoom: 2.3, duurMs: 900, maxMs: 900 },
  { ms: B.publiekOp, ...lokaal(PLEK.portaal, 1180, 490), zoom: 2.6, duurMs: 900 },
  { ms: B.terugCockpit2, ...lokaal(PLEK.cockpit, 520, 470), zoom: 2.2, duurMs: 1100 },
  // Montage: de hartslag Akkoord klant krijgt 700 ms, de klik landt 180 ms na de camera.
  { ms: B2.klikMontage - 900, ...lokaal(PLEK.cockpit, 420, 840), zoom: 2.4, duurMs: 800 },
  { ms: B2.planningCamOp, ...lokaal(PLEK.planning, 880, 600), zoom: 1.7, duurMs: 1100 },
  { ms: B2.sleepOp, ...lokaal(PLEK.planning, 940, 620), zoom: 1.9, duurMs: 1900 },
  // Terug in één kader met Voortgang: geen aparte reframe vóór de klik.
  { ms: B2.terugCockpit3, ...lokaal(PLEK.cockpit, 820, 450), zoom: 2.1, duurMs: 1100 },
  // Klokken en telefoon
  { ms: B2.klikWerkbon - 1200, ...lokaal(PLEK.cockpit, 1160, 930), zoom: 2.3, duurMs: 800 },
  { ms: B2.werkbonDialoogOp, ...lokaal(PLEK.cockpit, 720, 520), zoom: 2.2, duurMs: 800 },
  { ms: B2.telefoonCamOp, ...telefoonLokaal(209, 540), zoom: 2.9, duurMs: 900, maxMs: 900 },
  // Kader met portaalkaart én Mail contactpersoon; 1200 ms zodat de foto op een stil beeld landt.
  { ms: B2.terugCockpit4, ...lokaal(PLEK.cockpit, 820, 705), zoom: 2.0, duurMs: 900, maxMs: 900 },
  { ms: B2.composerOp, ...lokaal(PLEK.cockpit, 1080, 820), zoom: 2.5, duurMs: 900 },
  // Financieel: de tab en Factuur maken staan in één kader.
  { ms: B2.klikFinancieel - 1000, ...lokaal(PLEK.cockpit, 720, 330), zoom: 2.2, duurMs: 900 },
  { ms: B2.klikFactuurVerstuur - 1100, ...lokaal(PLEK.cockpit, 900, 520), zoom: 2.6, duurMs: 800 },
  { ms: B2.betaaldOp - 900, ...lokaal(PLEK.cockpit, 760, 470), zoom: 2.8, duurMs: 900 },
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
  { ms: B.klikMenu - 700, doel: 'acties-menu', klik: true },
  { ms: B.klikLatenChecken - 700, doel: 'laten-checken', klik: true },
  { ms: B.klikCheckVragen - 700, doel: 'check-vragen', klik: true },
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
  { ms: B2.klikWerkbon - 700, doel: 'acties-werkbon', klik: true },
  { ms: B2.klikWerkbonMaken - 700, doel: 'werkbon-maken', klik: true },
  { ms: B2.telefoonCamOp + 300, doel: { x: 900, y: 1520 } },
  { ms: B2.klikNaFoto - 700, doel: 'na-foto', klik: true },
  { ms: B2.terugCockpit4, doel: { x: 950, y: 1520 } },
  { ms: B2.klikMailContact - 700, doel: 'tekst:Mail contactpersoon', klik: true },
  { ms: B2.composerOp + 400, doel: { x: 940, y: 1500 } },
  { ms: B2.klikUitProject - 700, doel: 'uit-project', klik: true },
  { ms: B2.klikKiesTekening - 700, doel: 'uit-project-tekening', klik: true },
  { ms: B2.klikVerzenden - 700, doel: 'verzenden', klik: true },
  { ms: B2.composerDichtOp, doel: { x: 950, y: 1520 } },
  { ms: B2.klikFinancieel - 700, doel: 'tekst:Financieel', klik: true },
  { ms: B2.klikFactuurMaken - 700, doel: 'factuur-maken', klik: true },
  { ms: B2.klikFactuurVerstuur - 700, doel: 'factuur-verstuur', klik: true },
  { ms: B2.klikFactuurVerstuur + 900, doel: { x: 950, y: 1560 } },
  { ms: B2.eindkaartOp + 200, doel: 'wordmark-punt', klik: false },
]

// Geluid op de beats.
const KLIKS = [B0.klikEmail, B.mailKlikLijst, B.mailKlikProject, B.mailKlikBijlage, B.klikOfferteMaken, B.klikCalculatie, B.klikCalculatieSluiten, B.klikMenu, B.klikLatenChecken, B.klikCheckVragen, B.klikVerstuur, B.klikPortaal, B.klikBekijken, B.klikBevestig,
  B2.klikMontage, B2.klikWerkbon, B2.klikWerkbonMaken, B2.klikNaFoto, B2.klikMailContact, B2.klikUitProject, B2.klikKiesTekening, B2.klikVerzenden, B2.klikFinancieel, B2.klikFactuurMaken, B2.klikFactuurVerstuur]
const ZWIEPEN = [B.mailCamOp, B.cockpitCamOp, B.editorCamOp, B.terugCockpit1, B.portaalCamOp, B.terugCockpit2, B2.planningCamOp, B2.terugCockpit3, B2.telefoonCamOp, B2.terugCockpit4, B2.pullbackOp, B2.constellatieOp]
const KLANKEN: Klank[] = [
  ...KLIKS.map((ms) => ({ ms: ms + 80, bestand: 'klik' as const, volume: 0.55 })),
  ...ZWIEPEN.map((ms) => ({ ms, bestand: 'zwiep' as const, volume: 0.35 })),
  { ms: B.flapOp, bestand: 'flap', volume: 0.6 }, { ms: B2.factuurVerstuurdOp, bestand: 'flap', volume: 0.6 },
  { ms: B.regelsOp, bestand: 'typ', volume: 0.35, duurMs: 2600 }, { ms: B.naamOp, bestand: 'typ', volume: 0.3, duurMs: 1200 }, { ms: B2.typOp, bestand: 'typ', volume: 0.35, duurMs: 2400 },
  { ms: B.tekenOp, bestand: 'pen', volume: 0.5 },
  { ms: B.toastAkkoordOp, bestand: 'ding', volume: 0.6 }, { ms: B2.toastBetaaldOp, bestand: 'ding', volume: 0.6 }, { ms: B.meldingSanneOp, bestand: 'ding', volume: 0.5 }, { ms: B.meldingAkkoordOp, bestand: 'ding', volume: 0.5 },
  { ms: B.cockpitLandOp, bestand: 'landing', volume: 0.4 }, { ms: B2.landOp, bestand: 'landing', volume: 0.4 },
  { ms: B0.inslagOp, bestand: 'inslag', volume: 0.8 }, { ms: B0.puntOp + 600, bestand: 'landing', volume: 0.5 }, { ms: B2.puntOp + 600, bestand: 'landing', volume: 0.5 },
]

// Flame-stip die van een knop naar een cirkel in de fasebalk loopt: de klik
// veroorzaakt zichtbaar de fase.
const FaseStip: React.FC<{ t: number; op: number; vanDoel: string; naarFase?: number; naarPunt?: { x: number; y: number }; duurMs?: number }> = ({ t, op, vanDoel, naarFase, naarPunt, duurMs = 700 }) => {
  const [pos, setPos] = useState<{ a: { x: number; y: number }; b: { x: number; y: number } } | null>(null)
  const formaat = useFormaat()
  const hermeet = useHermeet()
  useLayoutEffect(() => {
    if (!rootMeetbaar()) { hermeet(); return }
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

// De melding groeit uit de bel-hoek (rechtsboven), waar de badge optelt.
const MeldingFilm: React.FC<{ t: number; op: number; notificatie: typeof notificatieAkkoord; duurMs?: number }> = ({ t, op, notificatie, duurMs = 2800 }) => {
  const f = useFormaat()
  // 2,8 s: weg vóór de camera op het volgende scherm landt.
  if (t < op || t >= op + duurMs) return null
  const uitP = vlak(t, op + 2520, op + 2800, ease.exit)
  return (
    <div style={{ position: 'absolute', right: f.toastLeft, top: f.toastTop, width: f.toastBreedte, zIndex: 60, transform: `scale(${f.toastSchaal * (1 - uitP * 0.03)})`, transformOrigin: 'top right', opacity: 1 - uitP }}>
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
  const schermStand = (tt: number) => {
    let actief = 'dashboard', vorig = 'dashboard', wisselP = 1
    for (let i = 0; i < WISSELS.length; i++) {
      if (tt >= WISSELS[i].ms) { vorig = i > 0 ? WISSELS[i - 1].naar : WISSELS[i].naar; actief = WISSELS[i].naar; wisselP = vlak(tt, WISSELS[i].ms, WISSELS[i].ms + 1100) }
    }
    return { actief, vorig, wisselP }
  }
  const diepteOp = (naam: string, tt: number) => {
    const { actief, vorig, wisselP } = schermStand(tt)
    return actief === 'alles' ? 0.35 * (1 - wisselP) + 0 : (naam === actief ? 1 - wisselP : naam === vorig ? wisselP : 1)
  }
  const actiefScherm = schermStand(t).actief
  const diepte = (naam: string) => diepteOp(naam, t)
  const kantelVan = (naam: string, rust: number) => rust * diepte(naam)
  // Secundaire laag: de slagschaduw volgt de kantel 2,5 f later.
  const schaduwKantelVan = (naam: string, rust: number) => rust * diepteOp(naam, t - 83)
  const gloedVan = (naam: string) => 0.8 * (1 - diepte(naam))
  const laag = (naam: string, rust: number) => ({ t, diepte: diepte(naam), kantel: kantelVan(naam, rust), schaduwKantel: schaduwKantelVan(naam, rust), gloed: gloedVan(naam) })

  // Fase-hartslag
  const status = t >= B2.betaaldOp ? 'te-factureren' : t >= B2.ingeplandOp ? 'ingepland' : t >= B.akkoordKlantOp ? 'akkoord-klant' : 'gepland'
  const faseIdx = { gepland: 0, 'in-review': 1, 'akkoord-klant': 2, ingepland: 4, 'te-factureren': 5 }[status]
  const faseWissel = t >= B2.betaaldOp ? B2.betaaldOp : t >= B2.ingeplandOp ? B2.ingeplandOp : t >= B.akkoordKlantOp ? B.akkoordKlantOp : B.cockpitOp
  const meldingen = t >= B2.toastBetaaldOp - 200 ? 6 : t >= B.toastAkkoordOp - 200 ? 5 : 4
  // De gevel achter alles volgt de klus.
  const gevelStand: GevelStand = t >= B2.gevelBrandtOp ? 'brandt' : t >= B2.ingeplandOp ? 'gemonteerd' : t >= B.akkoordKlantOp ? 'akkoord' : t >= B.flapOp ? 'offerte' : 'aanvraag'
  const gevelSinds = t >= B2.gevelBrandtOp ? B2.gevelBrandtOp : t >= B2.ingeplandOp ? B2.ingeplandOp : t >= B.akkoordKlantOp ? B.akkoordKlantOp : t >= B.flapOp ? B.flapOp : B.cockpitOp
  const gevelReveal = vlak(t, B2.pullbackOp, B2.constellatieOp + 900, ease.inUit)
  const zwenk = t < B2.pullbackOp ? Math.sin(Math.min(1, Math.max(0, schermStand(t).wisselP)) * Math.PI) : 0
  const logoP = vlak(t, B2.logoOp, B2.logoOp + 900, ease.inUit)
  const gevelZicht = t < B0.dashboardOp ? 0 : Math.min(1, 0.22 + 0.22 * zwenk + gevelReveal * 0.78) * (1 - logoP * 0.55)
  const gevelBlur = (10 - 5 * zwenk) * (1 - gevelReveal) + logoP * 8
  // Welke kant van de tafel: jij of je klant.
  const bijKlant = (t >= B.portaalCamOp && t < B.terugCockpit2) 
  const kantWissel = bijKlant ? B.portaalCamOp : B.terugCockpit2
  const kantIn = vlak(t, kantWissel + 300, kantWissel + 500, ease.uiUit)
  const kantUit = vlak(t, kantWissel + 2460, kantWissel + 2600, ease.exit)
  const kantZicht = t >= B.portaalCamOp && t < B.terugCockpit2 + 2600 ? Math.min(kantIn, 1 - kantUit) : 0
  const faseLabel = t >= B2.betaaldOp ? 'Betaald' : undefined
  const faseLabelWissel = faseWissel

  const cockpitStand = {
    status: status as 'gepland' | 'in-review' | 'akkoord-klant' | 'ingepland' | 'te-factureren',
    offerteStatus: t >= B.akkoordKlantOp ? 'goedgekeurd' as const : t >= B.inReviewOp ? 'verzonden' as const : null,
    montage: t >= B2.ingeplandOp,
    portaal: [...(t >= B.inReviewOp ? ['offerte' as const] : [])],
    portaalReactie: t >= B.akkoordKlantOp,
    activiteiten: t >= B2.fotoPortaalOp ? [{ id: 'a-foto', tekst: 'Na-foto toegevoegd aan werkbon WB-2026-0097', datum: '2026-09-24T10:12:00.000Z', type: 'foto' as const, medewerker: 'Kees' }] : [],
    meldingen,
    composer: { op: B2.composerOp, dichtOp: B2.composerDichtOp, typOp: B2.typOp, bijlageOp: B2.bijlageOp, opvolgenOp: B2.opvolgenOp, verzendOp: B2.verzondenOp, kiezerOp: B2.kiezerOp, kiesOp: B2.kiesOp },
    werkbon: { dialoogOp: B2.werkbonDialoogOp, klaarOp: B2.werkbonKlaarOp },
    blokOp: { kop: B.cockpitOp, fase: B.cockpitOp + 150, briefing: B.cockpitOp + 300, grid: B.cockpitOp + 450, portaal: B.cockpitOp + 600, tijd: B.cockpitOp + 250, klant: B.cockpitOp + 400, team: B.cockpitOp + 550, acties: B.cockpitOp + 700 },
  }
  const inFinancieel = t >= B2.financieelOp && t < B2.pullbackOp + 600
  const financieelP = vlak(t, B2.financieelOp, B2.financieelOp + 300)

  const plekVan = (p: { x: number; y: number }) => p
  const wereldZicht = (1 - vlak(t, B2.eindkaartOp, B2.eindkaartOp + 600)) * (1 - logoP * 0.35)
  const eindGrond = vlak(t, B2.eindkaartOp, B2.eindkaartOp + 700, ease.inUit)

  // Letters
  const puntZicht = vlak(t, B2.puntOp, B2.puntOp + 150)
  const puntP = veer(t, B2.puntOp, { demping: 12, duurMs: 800 })
  const pulse = Math.sin(vlak(t, B2.pulseOp, B2.pulseOp + 600, ease.inUit) * Math.PI)
  const logoBreedte = F.wordmarkSize * 0.86 * 2.3
  const puntXY = logoPuntPositie(logoBreedte, MIDDEN_X, MIDDEN_Y)
  const regelP = veer(t, B2.regelOp, { demping: 18, duurMs: 800 })
  const urlP = veer(t, B2.urlOp, { demping: 18, duurMs: 800 })

  const inDashboard = t < B.mailCamOp + 1300 || t >= B2.pullbackOp
  const inMail = (t >= B.mailCamOp - 300 && t < B.cockpitCamOp + 1300) || t >= B2.pullbackOp
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
        <Gevel t={t} x={CENTRUM.x + (cam.x - CENTRUM.x) * 0.8} y={CENTRUM.y + 1250 + (cam.y - CENTRUM.y) * 0.8} stand={gevelStand} standSinds={gevelSinds} zicht={gevelZicht} blur={gevelBlur} breedte={5600} />
        {inDashboard && (
          <Scherm id="dashboard" x={PLEK.dashboard.x} y={PLEK.dashboard.y} {...laag('dashboard', -4)} zicht={t < B0.dashboardOp ? 0 : vlak(t, B0.dashboardOp, B0.dashboardOp + 500)}>
            <Dashboard t={t} stand={{ mailOp: B0.dashboardMailOp }} />
          </Scherm>
        )}
        {inKanban && (
          <Scherm id="kanban" x={plekVan(PLEK.kanban).x} y={plekVan(PLEK.kanban).y} t={t} diepte={diepte('kanban')} kantel={0} gloed={0}>
            <Kanban t={t} stand={{ kolom: 'te-factureren', wisselOp: B2.pullbackOp + 900 }} />
          </Scherm>
        )}
        {inMail && (
          <Scherm id="mail" x={plekVan(PLEK.mail).x} y={plekVan(PLEK.mail).y} {...laag('mail', -5)}>
            <MailApp t={t} stand={{ gekozen: t >= B.mailReaderOp, klantOp: B.mailKlantOp, projectOp: B.mailProjectOp, bijlageOp: B.mailBijlageOp }} />
          </Scherm>
        )}
        {inCockpit && (
          <Scherm id="cockpit" x={plekVan(PLEK.cockpit).x} y={plekVan(PLEK.cockpit).y} {...laag('cockpit', 5)}>
            <div style={{ opacity: inFinancieel ? 1 - financieelP : 1 }}><Cockpit t={t} stand={cockpitStand} /></div>
            {inFinancieel && (
              <div style={{ position: 'absolute', inset: 0, opacity: financieelP }}>
                <FinancieelTab t={t} stand={{ factuurOp: B2.factuurOp, verstuurdOp: B2.factuurVerstuurdOp, betaaldOp: B2.betaaldOp }} />
              </div>
            )}
          </Scherm>
        )}
        {inEditor && (
          <Scherm id="editor" x={plekVan(PLEK.editor).x} y={plekVan(PLEK.editor).y} {...laag('editor', -5)}>
            <OfferteEditor t={t} stand={{ regelsOp: B.regelsOp, calculatieOp: B.calculatieOp, calculatieDichtOp: B.calculatieDichtOp, menuOp: B.menuOp, checkOp: B.checkOp, checkVraagOp: B.checkVraagOp, checkAkkoordOp: B.checkAkkoordOp, verstuurTikOp: B.klikVerstuur + 80, keuzeOp: B.keuzeOp, keuzeTikOp: B.klikPortaal + 80, flapOp: B.flapOp }} />
          </Scherm>
        )}
        {inPortaal && (
          <Scherm id="portaal" x={plekVan(PLEK.portaal).x} y={plekVan(PLEK.portaal).y} {...laag('portaal', -5)}>
            <PortaalKlant t={t} stand={t < B.publiekOp
              ? { pagina: 'portaal', projectStatus: 'in-review', kaarten: [{ soort: 'offerte', status: 'verstuurd', op: B.portaalCamOp + 900 }] }
              : t < B.terugCockpit2 + 1300
                ? { pagina: 'publiek', projectStatus: 'in-review', kaarten: [], naamOp: B.naamOp, tekenOp: B.tekenOp, vinkOp: B.vinkOp, tikOp: B.klikBevestig + 80, klaarOp: B.geaccepteerdOp }
                : { pagina: 'portaal', projectStatus: 'gefactureerd', kaarten: [{ soort: 'offerte', status: 'geaccepteerd' }, { soort: 'factuur', status: 'betaald' }] }} />
          </Scherm>
        )}
        {inPlanning && (
          <Scherm id="planning" x={plekVan(PLEK.planning).x} y={plekVan(PLEK.planning).y} {...laag('planning', 5)}>
            <Planning t={t} stand={{ sleepOp: B2.sleepOp, landOp: B2.landOp }} />
          </Scherm>
        )}
        {inTelefoon && (
          <Scherm id="telefoon" x={plekVan(PLEK.telefoon).x} y={plekVan(PLEK.telefoon).y} {...laag('telefoon', -4)} breedte={TELEFOON_B} hoogte={TELEFOON_H}>
            <TelefoonInRuimte t={t} stand={{ fotoOp: B2.fotoOp }} />
          </Scherm>
        )}
      </Wereld>
      </div>

      <Opening t={t} />
      <Belofte t={t} op={B0.belofteOp} uit={B0.belofteUit} {...COPY.opening} selectOp={B0.belofteSelectOp} positie="onder" />
      <Belofte t={t} op={B.mailBelofteOp} uit={B.mailBelofteUit} {...COPY.mail} positie="onder" />
      <Belofte t={t} op={B.projectBelofteOp} uit={B.projectBelofteUit} {...COPY.project} positie="onder" />
      <Belofte t={t} op={B.offerteBelofteOp} uit={B.offerteBelofteUit} {...COPY.offerte} positie="boven" />
      <Belofte t={t} op={B.portaalBelofteOp} uit={B.portaalBelofteUit} {...COPY.portaal} positie="onder" />
      <Belofte t={t} op={B2.montageBelofteOp} uit={B2.montageBelofteUit} {...COPY.montage} positie="onder" />
      <Belofte t={t} op={B2.werkbonBelofteOp} uit={B2.werkbonBelofteUit} {...COPY.werkbon} positie="onder" />
      <Belofte t={t} op={B2.mailBelofteOp} uit={B2.mailBelofteUit} {...COPY.mailUitProject} positie="onder" />
      {/* Onder: boven botst de regel met de projecttitel in het Financieel-kader. */}
      <Belofte t={t} op={B2.factuurBelofteOp} uit={B2.factuurBelofteUit} {...COPY.factuur} positie="onder" />
      <Belofte t={t} op={B2.allesBelofteOp} uit={B2.allesBelofteUit} {...COPY.alles} positie="boven" licht />

      {kantZicht > 0 && (
        <div style={{ position: 'absolute', left: 48, top: 40, zIndex: 55, opacity: kantZicht, transform: `translateX(${(1 - kantIn) * -16 - kantUit * 8}px) scale(${0.96 + 0.04 * kantIn})`, transformOrigin: 'left center', padding: '12px 26px', borderRadius: 999, backgroundColor: bijKlant ? merk.wit : merk.petrol, color: bijKlant ? merk.petrol : merk.wit, fontFamily: fonts.kop, fontWeight: 700, fontSize: 30, letterSpacing: '-0.01em', boxShadow: '0 12px 32px rgba(120,90,50,0.16)' }}>
          {bijKlant ? 'je klant ziet' : 'jij ziet'}<span style={{ color: merk.flame }}>.</span>
        </div>
      )}
      {t >= B.meldingSanneOp && t < B.meldingSanneOp + 1500 && (
        <div style={{ position: 'absolute', left: 48, top: 40, zIndex: 55, opacity: Math.min(vlak(t, B.meldingSanneOp, B.meldingSanneOp + 250), 1 - vlak(t, B.meldingSanneOp + 1200, B.meldingSanneOp + 1500)), padding: '12px 26px', borderRadius: 999, backgroundColor: merk.wit, color: merk.petrol, fontFamily: fonts.kop, fontWeight: 700, fontSize: 30, letterSpacing: '-0.01em', boxShadow: '0 12px 32px rgba(120,90,50,0.16)' }}>
          Sanne ziet<span style={{ color: merk.flame }}>.</span>
        </div>
      )}
      <MeldingFilm t={t} op={B.meldingSanneOp} notificatie={notificatieCheckGevraagd} duurMs={1300} />
      <MeldingFilm t={t} op={B.meldingAkkoordOp} notificatie={notificatieCheckAkkoord} duurMs={1900} />
      <MeldingFilm t={t} op={B.toastAkkoordOp} notificatie={notificatieAkkoord} />
      <MeldingFilm t={t} op={B2.toastBetaaldOp} notificatie={notificatieBetaald} duurMs={1900} />

      <Geluid klanken={KLANKEN} totMs={FILM2_DUUR_MS} />
      {t < B2.constellatieOp && <Cursor t={t} stappen={CURSOR} zichtVan={B0.dashboardMailOp} zichtTot={B2.pullbackOp + 400} />}
      {t >= B2.eindkaartOp && <Cursor t={t} stappen={CURSOR} zichtVan={B2.eindkaartOp + 100} zichtTot={B2.puntOp + 140} />}
      <span data-doel="wordmark-punt" style={{ position: 'absolute', left: puntXY.x, top: puntXY.y, width: 1, height: 1 }} />
      <FaseStip t={t} op={B.stipOp} vanDoel="bevestigen" naarFase={2} />
      {t >= B.cockpitOp && t < B2.eindkaartOp && <FaseBalkFilm fase={faseIdx} sindsWissel={t - Math.max(faseWissel, faseLabelWissel)} label={faseLabel} donker={false} bottom={F.faseBottom} zijkant={F.faseZijkant} schaal={F.faseSchaal} zicht={Math.min(vlak(t, B.cockpitOp, B.cockpitOp + 500), 1 - vlak(t, B2.constellatieOp, B2.constellatieOp + 600))} />}

      {/* Constellatie: het logo van doen. met alles wat erin zit eromheen */}
      {t >= B2.logoOp && (() => {
        const inP = veer(t, B2.logoOp, { demping: 16, duurMs: 900 })
        const zichtW = vlak(t, B2.logoOp, B2.logoOp + 250)
        const chips = [...ALLE_MODULES.filter((m) => ['Projecten', 'Offertes', 'Klanten', 'Werkbonnen', 'Planning', 'Taken', 'Email', 'Portaal', 'Facturen', 'Maatjes'].includes(m.label)).map((m) => ({ label: m.label, Icon: m.icon, kleur: m.color })), { label: 'Daan', Icon: MessageSquare, kleur: merk.petrol }]
        const straal = F.naam === '4:3' ? 400 : 430
        const chipZicht = 1 - vlak(t, B2.eindkaartOp, B2.eindkaartOp + 400)
        return (
          <div style={{ position: 'absolute', inset: 0, zIndex: 12, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', left: MIDDEN_X - 520, top: MIDDEN_Y - 520, width: 1040, height: 1040, borderRadius: '50%', background: `radial-gradient(circle, ${merk.petrol}E6 0%, ${merk.petrol}99 35%, transparent 70%)`, opacity: zichtW * 0.9 * chipZicht, filter: 'blur(10px)' }} />
            <div style={{ position: 'absolute', inset: 0, opacity: zichtW, transform: `scale(${0.7 + inP * 0.3})`, transformOrigin: `${MIDDEN_X}px ${MIDDEN_Y}px` }}>
              <LogoDoen breedte={logoBreedte} x={MIDDEN_X} y={MIDDEN_Y} kleur={merk.wit} stand={(i) => (i === 4 ? { op: 1, dy: 0, schaal: 1 + pulse * 0.45 } : { op: 1, dy: 0 })} />
            </div>
            {chips.map((c, i) => {
              const hoek = -Math.PI / 2 + (i / chips.length) * Math.PI * 2
              const op = B2.logoOp + 500 + i * 70
              const p = veer(t, op, { demping: 14, duurMs: 700 })
              const z = vlak(t, op, op + 150) * chipZicht
              const x = MIDDEN_X + Math.cos(hoek) * straal, y = MIDDEN_Y + Math.sin(hoek) * straal * 0.78
              return (
                <div key={c.label} style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) scale(${0.8 + p * 0.2})`, opacity: z, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 22px 12px 14px', borderRadius: 999, backgroundColor: merk.wit, boxShadow: '0 16px 40px -12px rgba(0,0,0,0.45)', fontFamily: fonts.kop, fontWeight: 700, fontSize: 26, letterSpacing: '-0.02em', color: merk.ink, whiteSpace: 'nowrap' }}>
                  <span style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${c.kleur}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><c.Icon size={22} color={c.kleur} strokeWidth={2} /></span>
                  {c.label.toLowerCase()}{c.label === 'Daan' && <span style={{ color: merk.flame }}>.</span>}
                </div>
              )
            })}
          </div>
        )
      })()}
      {/* End card */}
      <AbsoluteFill style={{ backgroundColor: merk.petrol, opacity: eindGrond, zIndex: 5 }} />
      {t >= B2.lettersOp && (
        <div style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ position: 'absolute', left: 90, right: 90, top: MIDDEN_Y + F.wordmarkSize * 0.88, textAlign: 'center', fontFamily: fonts.kop, fontWeight: 600, fontSize: F.naam === '4:3' ? 44 : 52, lineHeight: 1.2, letterSpacing: '-0.02em', color: merk.wit, opacity: vlak(t, B2.regelOp, B2.regelOp + 250), transform: `translateY(${(1 - regelP) * 30}px)`, textWrap: 'balance' as never }}>
            {COPY.eindkaart.regel}
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: MIDDEN_Y + F.wordmarkSize * (F.naam === '4:3' ? 1.28 : 1.42), textAlign: 'center', fontFamily: fonts.mono, fontSize: F.naam === '4:3' ? 46 : 40, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.85)', opacity: vlak(t, B2.urlOp, B2.urlOp + 250), transform: `translateY(${(1 - urlP) * 20}px)` }}>
            {COPY.eindkaart.url}
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: MIDDEN_Y + F.wordmarkSize * (F.naam === '4:3' ? 1.5 : 1.64), textAlign: 'center', fontFamily: fonts.body, fontWeight: 500, fontSize: F.naam === '4:3' ? 32 : 30, color: 'rgba(255,255,255,0.78)', opacity: vlak(t, B2.urlOp + 120, B2.urlOp + 370) }}>{COPY.eindkaart.sub}</div>
        </div>
      )}
    </AbsoluteFill>
  )
}
