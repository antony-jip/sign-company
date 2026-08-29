'use client'

import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, Building2, Calendar, CalendarCheck, CheckCircle2, ChevronDown,
  Eye, FileText, Hammer, Loader2, Mail, MapPin, Paperclip, Receipt, Reply, ReplyAll, Forward,
  Send, Sparkles, UserPlus, X,
} from 'lucide-react'
import BrowserBar from '@/components/app-ui/BrowserBar'
import { spaceGrotesk, PETROL, FLAME, LINE, BG } from '@/components/app-ui/tokens'

/* De aanvraag uit je mailbox, in één klik een project.

   Dit is geen plaatje maar de UX zelf, nagebouwd uit forgedesk:
   - de inbox-rij komt uit components/email/EmailListItem.tsx (3-regel-modus:
     squircle-avatar, petrol-rail bij ongelezen, datum in mono)
   - de aanvraagkaart uit components/email/AanvraagKaart.tsx (flame-rail,
     badge, zekerheid, "Project aanmaken", handtekening-aanvulling, en de
     groene bevestiging met "Ga naar project")
   - de fasebalk uit components/projects/cockpit/ProjectFaseBar.tsx

   Wijzigt de app, dan wijkt dit af. Dat is bewust zichtbaar gehouden: de
   labels staan letterlijk zoals ze in de app staan, niet vrij hertaald. */

const CARD = '#FEFDFB'
const BORDER = '#E3DFD9'
const FG = '#231E1A'
const SEC = '#5A5A55'
const MUTED_HEX = '#A0A098'
const GROEN = '#4A9960'
const GROEN_BG = '#E8F5EC'
const GROEN_TEKST = '#3D7A50'

const SAMENVATTING =
  'Bewegwijzering voor een nieuw bedrijfspand in Hoorn: een zuil bij de inrit, twee gevelborden en routebordjes op het terrein. Montage half september, oplevering 14 oktober.'

type Rij = {
  naam: string
  onderwerp: string
  preview: string
  tijd: string
  kleur: string
  tekst: string
  ongelezen?: boolean
  bijlage?: boolean
}

/* Dezelfde mailbox als in de app-demo, zodat het geen ander bedrijf lijkt. */
const INBOX: Rij[] = [
  {
    naam: 'Bouwbedrijf Veld',
    onderwerp: 'Nieuwe aanvraag: bewegwijzering',
    preview: 'Voor ons nieuwe pand aan de Nieuwe Steen zoeken we bewegwijzering.',
    tijd: '11:42',
    kleur: '#EFE2D8',
    tekst: '#8A5A3C',
    ongelezen: true,
    bijlage: true,
  },
  {
    naam: 'Hotel De Linde',
    onderwerp: 'Akkoord op offerte lichtbakken',
    preview: 'Bedankt voor de offerte. We gaan akkoord met de drie lichtbakken.',
    tijd: '10:22',
    kleur: '#DCE9EB',
    tekst: '#1A535C',
  },
  {
    naam: 'Aluminium Benelux',
    onderwerp: 'Levering profielen · week 24',
    preview: 'De profielen staan gepland voor dinsdag, losadres ongewijzigd.',
    tijd: '09:05',
    kleur: '#DFEAE0',
    tekst: '#3A7D52',
  },
  {
    naam: 'Gemeente Hoorn',
    onderwerp: 'Vergunning gevelreclame verleend',
    preview: 'Hierbij de omgevingsvergunning voor de gevelreclame aan de Kerkstraat.',
    tijd: '08:48',
    kleur: '#E4E0EC',
    tekst: '#5A4A82',
  },
  {
    naam: 'Reclamebureau Nova',
    onderwerp: 'Re: Ontwerp gevelletters',
    preview: 'De PMS-kleur wijkt af van het huisstijlboek, kunnen jullie kijken?',
    tijd: '08:19',
    kleur: '#F3DFD8',
    tekst: '#C03A18',
  },
]

const FASES = [
  { label: 'Gepland', caption: 'klaar om te starten', Icon: Calendar },
  { label: 'In review', caption: 'offerte gestuurd', Icon: Eye },
  { label: 'Akkoord klant', caption: 'klant akkoord, te plannen', Icon: CheckCircle2 },
  { label: 'Actief', caption: 'aan het werk', Icon: Hammer },
  { label: 'Ingepland', caption: 'montage ingepland', Icon: CalendarCheck },
  { label: 'Te factureren', caption: 'klaar voor de factuur', Icon: Receipt },
]

export type Stap = 'mail' | 'aangemaakt' | 'project' | 'offerte' | 'portaal' | 'akkoord' | 'factuur'

/* De rail boven het venster. 'aangemaakt' en 'akkoord' zijn tussenstanden
   binnen dezelfde stap, dus die krijgen geen eigen bolletje. */
const RAIL: { stap: Stap; label: string; ook: Stap[] }[] = [
  { stap: 'mail', label: 'Aanvraag', ook: ['aangemaakt'] },
  { stap: 'project', label: 'Project', ook: [] },
  { stap: 'offerte', label: 'Offerte', ook: [] },
  { stap: 'portaal', label: 'Klant keurt', ook: ['akkoord'] },
  { stap: 'factuur', label: 'Factuur', ook: [] },
]

const ONDERSCHRIFT: Record<Stap, string> = {
  mail: 'De app zelf, nagebouwd in deze pagina. Klik op Project aanmaken.',
  aangemaakt: 'Het project staat er al. Klik op Ga naar project.',
  project: 'Alles wat in die mail stond, staat nu in het project. Niets overgetypt.',
  offerte: 'Inkoop, verkoop en marge lopen live mee terwijl je regels toevoegt.',
  portaal: 'Dit is wat je klant ziet. Eén link, geen account, geen bijlage in de mail.',
  akkoord: 'De klant is akkoord. Het project schuift zelf een fase op.',
  factuur: 'De factuur rolt uit de offerte. Betaallink erin, gegevens door naar Exact Online.',
}

export default function KlusDoorlopen() {
  const reduce = useReducedMotion() ?? false
  const [stap, setStap] = useState<Stap>('mail')
  const [bezig, setBezig] = useState(false)

  /* De app doet hier een netwerkcall; hier houden we de wachttijd erin
     omdat de knop anders alsof-magisch aanvoelt in plaats van echt. */
  const metWachten = (volgende: Stap) => {
    setBezig(true)
    window.setTimeout(() => {
      setBezig(false)
      setStap(volgende)
    }, reduce ? 0 : 850)
  }

  const railIndex = RAIL.findIndex((r) => r.stap === stap || r.ook.includes(stap))
  const pad =
    stap === 'offerte' ? 'offertes / OFF-2026-241'
    : stap === 'portaal' ? 'portaal / offerte / 241'
    : stap === 'factuur' ? 'facturen / 2026241'
    : stap === 'project' || stap === 'akkoord' ? 'projecten / PRJ-2026-047'
    : 'email / inbox'

  const inMail = stap === 'mail' || stap === 'aangemaakt'
  const inProject = stap === 'project' || stap === 'akkoord'

  return (
    <div>
      {/* Rail: waar zit je in de klus, en hoeveel er nog komt */}
      <ol className="flex items-center gap-2 md:gap-3 mb-5 overflow-x-auto pb-1">
        {RAIL.map((r, i) => {
          const actief = i === railIndex
          const gehad = i < railIndex
          return (
            <li key={r.stap} className="flex items-center gap-2 md:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setStap(r.stap)}
                className="inline-flex items-center gap-2 text-[13px] md:text-[14px] transition-colors"
                style={{ color: actief ? PETROL : gehad ? 'rgba(26,83,92,0.75)' : '#8C9B9E' }}
                aria-current={actief ? 'step' : undefined}
              >
                <span
                  className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full font-mono text-[11px] font-semibold"
                  style={{
                    backgroundColor: actief ? FLAME : gehad ? PETROL : 'transparent',
                    color: actief || gehad ? '#FFFFFF' : '#8C9B9E',
                    border: actief || gehad ? 'none' : '1px solid rgba(26,83,92,0.2)',
                  }}
                >
                  {i + 1}
                </span>
                <span className={actief ? 'font-semibold' : 'font-medium'}>{r.label}</span>
              </button>
              {i < RAIL.length - 1 && (
                <span aria-hidden className="w-4 md:w-7 h-px" style={{ backgroundColor: gehad ? PETROL : 'rgba(26,83,92,0.18)' }} />
              )}
            </li>
          )
        })}
      </ol>

      <div
        className="doen-mock relative flex flex-col overflow-hidden rounded-[16px]"
        style={{
          backgroundColor: BG,
          border: `1px solid ${LINE}`,
          boxShadow: '0 4px 10px rgba(20,40,40,0.05), 0 24px 60px -20px rgba(19,62,69,0.18)',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'IBM Plex Sans', system-ui, sans-serif",
          color: FG,
        }}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `.doen-mock .font-mono{font-family:${spaceGrotesk.style.fontFamily},ui-monospace,monospace;font-variant-numeric:tabular-nums;letter-spacing:-0.3px;}`,
          }}
        />

        <BrowserBar pad={pad} />

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={inMail ? 'mail' : inProject ? 'project' : stap}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {inMail && (
              <MailScherm
                stap={stap}
                bezig={bezig}
                aanmaken={() => metWachten('aangemaakt')}
                naarProject={() => setStap('project')}
                reduce={reduce}
              />
            )}
            {inProject && (
              <ProjectScherm
                akkoord={stap === 'akkoord'}
                bezig={bezig}
                verder={() => (stap === 'akkoord' ? metWachten('factuur') : setStap('offerte'))}
              />
            )}
            {stap === 'offerte' && <OfferteScherm bezig={bezig} versturen={() => metWachten('portaal')} />}
            {stap === 'portaal' && <PortaalScherm bezig={bezig} akkoord={() => metWachten('akkoord')} />}
            {stap === 'factuur' && <FactuurScherm opnieuw={() => setStap('mail')} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p className="text-[14px] text-muted">{ONDERSCHRIFT[stap]}</p>
        {stap !== 'mail' && (
          <button
            type="button"
            onClick={() => setStap('mail')}
            className="text-[14px] font-semibold text-petrol underline decoration-flame decoration-2 underline-offset-4 hover:text-flame transition-colors"
          >
            Opnieuw
          </button>
        )}
      </div>
    </div>
  )
}

/* Knop onderaan een scherm: de echte actie uit de app, in flame. */
function Actieknop({
  label,
  bezig,
  onClick,
  icoon,
}: {
  label: string
  bezig?: boolean
  onClick: () => void
  icoon?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={bezig}
      className="inline-flex items-center gap-2 h-10 px-5 rounded-lg text-white font-semibold text-[13.5px] transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-80"
      style={{ backgroundColor: FLAME }}
    >
      {bezig ? <Loader2 className="h-4 w-4 animate-spin" /> : icoon}
      {label}
    </button>
  )
}

/* ───────────────────────── Mailbox ───────────────────────── */

function MailScherm({
  stap,
  bezig,
  aanmaken,
  naarProject,
  reduce,
}: {
  stap: Stap
  bezig: boolean
  aanmaken: () => void
  naarProject: () => void
  reduce: boolean
}) {
  return (
    <div className="flex items-stretch">
      {/* Inbox-lijst · op een telefoon te smal, daar toont de app ook alleen de mail */}
      <div
        className="hidden md:flex md:flex-col w-[300px] lg:w-[340px] shrink-0"
        style={{ backgroundColor: CARD, borderRight: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <span className="font-heading text-[16px] font-bold">
            Inbox<span style={{ color: FLAME }}>.</span>
          </span>
          <span
            className="inline-flex items-center h-7 px-3 rounded-lg text-[12px] font-semibold text-white"
            style={{ backgroundColor: FLAME }}
          >
            Nieuw bericht
          </span>
        </div>
        <div className="flex items-center gap-3.5 px-4 pb-3 text-[12px]" style={{ color: SEC }}>
          <span className="font-semibold" style={{ color: PETROL }}>Alle</span>
          <span>Ongelezen</span>
          <span>Vastgepind</span>
          <span>Bijlagen</span>
        </div>
        <div className="px-4 pb-2">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: MUTED_HEX }}>
            Vandaag
          </span>
        </div>
        <div>
          {INBOX.map((rij, i) => (
            <InboxRij key={rij.onderwerp} rij={rij} actief={i === 0} />
          ))}
        </div>
      </div>

      {/* Leesvenster */}
      <div className="flex-1 min-w-0 px-5 py-5 md:px-7 md:py-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <span className="inline-flex items-center gap-1.5 text-[12px]" style={{ color: SEC }}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Terug
          </span>
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: PETROL }}>
            <Sparkles className="h-3.5 w-3.5" />
            Samenvatten
          </span>
        </div>

        <h3 className="font-heading text-[19px] md:text-[23px] font-bold leading-[1.15]" style={{ color: PETROL }}>
          Nieuwe aanvraag: bewegwijzering
        </h3>

        <div className="mt-3.5 flex items-center gap-2.5">
          <span
            className="w-8 h-8 rounded-[12px] flex items-center justify-center text-[13px] font-bold shrink-0"
            style={{ backgroundColor: '#EFE2D8', color: '#8A5A3C' }}
            aria-hidden
          >
            B
          </span>
          <span className="text-[13px] min-w-0 truncate">
            <span className="font-semibold">Bouwbedrijf Veld</span>
            <span style={{ color: MUTED_HEX }}> · m.veld@bouwbedrijfveld.nl</span>
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-[12.5px] font-semibold text-white"
            style={{ backgroundColor: PETROL }}
          >
            <Reply className="h-3.5 w-3.5" />
            Beantwoorden
          </span>
          <span
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px]"
            style={{ border: `1px solid ${BORDER}`, color: SEC }}
          >
            <ReplyAll className="h-3.5 w-3.5" />
            Allen
          </span>
          <span
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px]"
            style={{ border: `1px solid ${BORDER}`, color: SEC }}
          >
            <Forward className="h-3.5 w-3.5" />
            Doorsturen
          </span>
          <span className="inline-flex items-center gap-1.5 text-[12px] ml-1" style={{ color: MUTED_HEX }}>
            <Paperclip className="h-3.5 w-3.5" />
            gevel-oost.pdf
          </span>
        </div>

        <div className="mt-5 space-y-3 text-[13.5px] leading-[1.65]" style={{ color: SEC }}>
          <p>Goedemiddag,</p>
          <p>
            Voor ons nieuwe bedrijfspand aan de Nieuwe Steen in Hoorn zoeken we bewegwijzering.
            Het gaat om een zuil bij de inrit, twee gevelborden en routebordjes op het terrein.
            De oplevering staat op 14 oktober, dus we willen graag half september monteren.
          </p>
          <p>Kunnen jullie hier een offerte voor maken? De geveltekening stuur ik mee.</p>
          <p className="pt-1">
            Met vriendelijke groet,
            <br />
            Martijn Veld · Bouwbedrijf Veld
            <br />
            Nieuwe Steen 21, 1625 HV Hoorn
            <br />
            0229 27 41 80
          </p>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {stap === 'aangemaakt' ? (
            <motion.div
              key="klaar"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <Bevestiging naarProject={naarProject} />
            </motion.div>
          ) : (
            <motion.div key="kaart" exit={reduce ? undefined : { opacity: 0 }} transition={{ duration: 0.2 }}>
              <Aanvraagkaart bezig={bezig} aanmaken={aanmaken} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function InboxRij({ rij, actief }: { rij: Rij; actief: boolean }) {
  return (
    <div
      className="relative flex items-start gap-3 pl-4 pr-3 py-3"
      style={{
        borderBottom: '1px solid rgba(26,83,92,0.06)',
        backgroundColor: actief ? 'rgba(26,83,92,0.06)' : 'transparent',
      }}
    >
      {(rij.ongelezen || actief) && (
        <span
          aria-hidden
          className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full"
          style={{ backgroundColor: actief ? PETROL : 'rgba(26,83,92,0.45)' }}
        />
      )}
      <span
        aria-hidden
        className="w-9 h-9 rounded-[13px] flex items-center justify-center text-[14px] font-bold shrink-0 mt-0.5"
        style={{ backgroundColor: rij.kleur, color: rij.tekst, boxShadow: '0 1px 2px rgba(26,83,92,0.06)' }}
      >
        {rij.naam[0]}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-[3px]">
          <span
            className="truncate text-[13.5px] leading-none"
            style={{ fontWeight: rij.ongelezen ? 700 : 500, color: rij.ongelezen ? FG : 'rgba(35,30,26,0.75)' }}
          >
            {rij.naam}
          </span>
          {rij.bijlage && <Paperclip className="h-3 w-3 shrink-0" style={{ color: 'rgba(26,83,92,0.45)' }} />}
          <span
            className="ml-auto pl-2 font-mono text-[11.5px] leading-none shrink-0"
            style={{ color: rij.ongelezen ? PETROL : MUTED_HEX, fontWeight: rij.ongelezen ? 600 : 400 }}
          >
            {rij.tijd}
          </span>
        </div>
        <p
          className="truncate text-[14px] leading-snug mb-[3px]"
          style={{ fontWeight: rij.ongelezen ? 700 : 500, color: rij.ongelezen ? FG : 'rgba(35,30,26,0.7)' }}
        >
          {rij.onderwerp}
        </p>
        <p className="truncate text-[12.5px] leading-snug" style={{ color: MUTED_HEX }}>
          {rij.preview}
        </p>
      </div>
    </div>
  )
}

/* De aanvraagkaart zoals de app hem onder een herkende aanvraag zet. */
function Aanvraagkaart({ bezig, aanmaken }: { bezig: boolean; aanmaken: () => void }) {
  return (
    <div
      className="relative mt-6 overflow-hidden rounded-xl"
      style={{
        backgroundColor: CARD,
        border: `1px solid ${BORDER}`,
        boxShadow: '0 1px 3px rgba(120,90,50,0.07), inset 0 1px 0 rgba(255,255,255,0.55)',
        backgroundImage:
          'radial-gradient(ellipse 65% 50% at 0% 0%, rgba(26,83,92,0.06), transparent 70%), radial-gradient(ellipse 85% 65% at 100% 100%, rgba(241,80,37,0.06), transparent 65%)',
      }}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: `linear-gradient(to bottom, ${FLAME}, rgba(241,80,37,0.3))` }}
      />
      <X aria-hidden className="absolute top-3.5 right-3.5 h-3.5 w-3.5" style={{ color: MUTED_HEX }} />

      <div className="pl-6 pr-10 py-5">
        <div className="flex items-center gap-2.5 mb-3">
          <span
            className="inline-flex items-center gap-[5px] px-[10px] py-[3px] rounded-[20px] text-[10px] font-semibold"
            style={{ backgroundColor: '#FDE8E2', color: '#C03A18', boxShadow: 'inset 0 0 0 0.5px rgba(192,58,24,0.22)' }}
          >
            <span aria-hidden className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: FLAME }} />
            Aanvraag
            <span aria-hidden style={{ color: FLAME, fontWeight: 800, marginLeft: -2 }}>.</span>
          </span>
          <span className="font-mono text-[11px]" style={{ color: MUTED_HEX }}>
            92% zeker
          </span>
        </div>

        <p className="text-[13.5px] leading-relaxed mb-4 max-w-[64ch]">{SAMENVATTING}</p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
          <button
            type="button"
            onClick={aanmaken}
            disabled={bezig}
            className="inline-flex items-center h-10 px-5 rounded-lg text-white font-semibold text-[13.5px] transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-80"
            style={{ backgroundColor: FLAME }}
          >
            {bezig && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Project aanmaken
          </button>
          <span className="inline-flex items-center gap-1.5 text-[12.5px]" style={{ color: SEC }}>
            <UserPlus className="h-3.5 w-3.5 shrink-0" style={{ color: MUTED_HEX }} />
            Nieuwe klant:
            <span className="font-semibold" style={{ color: FG }}>Bouwbedrijf Veld</span>
          </span>
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="inline-flex items-center gap-1.5 text-[12.5px]" style={{ color: SEC }}>
            <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: MUTED_HEX }} />
            Uit de handtekening:
            <span className="font-medium" style={{ color: FG }}>0229 27 41 80 · Nieuwe Steen 21, 1625 HV Hoorn</span>
          </span>
          <span className="text-[12px]" style={{ color: MUTED_HEX }}>
            nemen we mee bij de nieuwe klant
          </span>
        </div>
      </div>
    </div>
  )
}

function Bevestiging({ naarProject }: { naarProject: () => void }) {
  return (
    <div
      className="relative mt-6 overflow-hidden rounded-xl px-5 py-4 pl-6"
      style={{ backgroundColor: GROEN_BG, border: `1px solid rgba(74,153,96,0.25)` }}
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: GROEN }} />
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: GROEN }} />
          <span className="text-[12.5px] shrink-0" style={{ color: GROEN_TEKST }}>
            Project aangemaakt
          </span>
          <span className="truncate text-[13.5px] font-semibold">Bewegwijzering Bouwbedrijf Veld</span>
        </div>
        <button
          type="button"
          onClick={naarProject}
          className="group inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-4 text-[12.5px] font-semibold text-white transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97]"
          style={{ backgroundColor: GROEN }}
        >
          Ga naar project
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  )
}

/* ───────────────────────── Project ───────────────────────── */

function ProjectScherm({
  akkoord,
  bezig,
  verder,
}: {
  akkoord: boolean
  bezig: boolean
  verder: () => void
}) {
  return (
    <div className="px-5 py-5 md:px-7 md:py-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 text-[12px] mb-3" style={{ color: SEC }}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Projecten
            <span className="font-mono ml-1.5" style={{ color: MUTED_HEX }}>
              PRJ-2026-047
            </span>
          </span>

          <h3 className="font-heading text-[21px] md:text-[26px] font-bold leading-[1.1]" style={{ color: PETROL }}>
            Bewegwijzering Bouwbedrijf Veld<span style={{ color: FLAME }}>.</span>
          </h3>
          <p className="mt-1.5 text-[12.5px]" style={{ color: SEC }}>
            Bouwbedrijf Veld · Hoorn ·{' '}
            <span className="italic">
              {akkoord ? 'klant akkoord, klaar om in te plannen' : 'zojuist aangemaakt uit de mail'}
            </span>
          </p>
        </div>
        <div className="shrink-0 hidden sm:block">
          <Actieknop
            label={akkoord ? 'Maak factuur' : 'Offerte maken'}
            bezig={bezig}
            onClick={verder}
            icoon={akkoord ? <Receipt className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-5 text-[12.5px] overflow-x-auto pb-1" style={{ color: SEC }}>
        <span className="font-semibold shrink-0" style={{ color: PETROL, borderBottom: `2px solid ${FLAME}`, paddingBottom: 6 }}>
          Overzicht
        </span>
        <span className="shrink-0">Werkbon</span>
        <span className="shrink-0">Financieel</span>
        <span className="inline-flex items-center gap-1.5 shrink-0">
          E-mail
          <span
            className="font-mono text-[10px] px-1.5 rounded-full"
            style={{ backgroundColor: 'rgba(26,83,92,0.08)', color: PETROL }}
          >
            1
          </span>
        </span>
        <span className="shrink-0">Notities</span>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-[1fr,260px] gap-4">
        <div className="space-y-4 min-w-0">
          <Paneel>
            <div className="flex items-baseline justify-between gap-3 mb-5">
              <span className="font-heading text-[14px] font-bold">
                Voortgang<span style={{ color: FLAME }}>.</span>
              </span>
              <span className="text-[12px] font-semibold" style={{ color: PETROL, opacity: 0.65 }}>
                {akkoord ? 'fase 3 van 6 · klant akkoord, te plannen' : 'fase 1 van 6 · klaar om te starten'}
              </span>
            </div>
            <Fasebalk huidig={akkoord ? 2 : 0} />
          </Paneel>

          <Paneel>
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="font-heading text-[14px] font-bold">
                Briefing<span style={{ color: FLAME }}>.</span>
                <span className="ml-2 font-sans text-[12px] font-semibold" style={{ color: PETROL, opacity: 0.65 }}>
                  wat moet er gebeuren
                </span>
              </span>
              <span
                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11.5px] font-semibold"
                style={{ border: `1px solid ${BORDER}`, color: PETROL }}
              >
                <Sparkles className="h-3 w-3" />
                Daan AI
              </span>
            </div>
            <p
              className="text-[13px] leading-[1.6] rounded-lg px-3.5 py-3"
              style={{ backgroundColor: BG, border: `1px solid ${BORDER}`, color: SEC }}
            >
              {SAMENVATTING}
            </p>
            <p className="mt-2.5 text-[11.5px]" style={{ color: MUTED_HEX }}>
              Overgenomen uit de aanvraag van Bouwbedrijf Veld · niets overgetypt
            </p>
          </Paneel>
        </div>

        <div className="space-y-4">
          <Paneel>
            <div className="flex items-center justify-between mb-3">
              <span className="font-heading text-[14px] font-bold">
                Klant<span style={{ color: FLAME }}>.</span>
              </span>
              <span className="font-mono text-[10px]" style={{ color: MUTED_HEX }}>
                Deb. 10471
              </span>
            </div>
            <p className="text-[13.5px] font-semibold">Bouwbedrijf Veld</p>
            <dl className="mt-3 space-y-2 text-[12px]" style={{ color: SEC }}>
              <Regel icoon={<MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: MUTED_HEX }} />}>
                Nieuwe Steen 21, 1625 HV Hoorn
              </Regel>
              <Regel icoon={<Mail className="h-3.5 w-3.5 shrink-0" style={{ color: MUTED_HEX }} />}>
                m.veld@bouwbedrijfveld.nl
              </Regel>
              <Regel icoon={<Building2 className="h-3.5 w-3.5 shrink-0" style={{ color: MUTED_HEX }} />}>
                <span className="font-mono">0229 27 41 80</span>
              </Regel>
            </dl>
            <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: MUTED_HEX }}>
                Contactpersoon
              </span>
              <span
                className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[12.5px]"
                style={{ border: `1px solid ${BORDER}`, backgroundColor: BG }}
              >
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden
                    className="w-5 h-5 rounded-[7px] flex items-center justify-center text-[10px] font-bold"
                    style={{ backgroundColor: '#EFE2D8', color: '#8A5A3C' }}
                  >
                    M
                  </span>
                  Martijn Veld
                </span>
                <ChevronDown className="h-3.5 w-3.5" style={{ color: MUTED_HEX }} />
              </span>
            </div>
          </Paneel>

          <Paneel>
            <span className="font-heading text-[14px] font-bold">
              Acties<span style={{ color: FLAME }}>.</span>
              <span className="ml-2 font-sans text-[12px] font-semibold" style={{ color: PETROL, opacity: 0.65 }}>
                volgende stap
              </span>
            </span>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {['Offerte', 'Werkbon'].map((a) => (
                <span
                  key={a}
                  className="flex items-center justify-center h-9 rounded-lg text-[12.5px] font-semibold"
                  style={{ border: `1px solid ${BORDER}`, color: PETROL, backgroundColor: BG }}
                >
                  {a}
                </span>
              ))}
            </div>
          </Paneel>
        </div>
      </div>

      <div className="mt-4 sm:hidden">
        <Actieknop
          label={akkoord ? 'Maak factuur' : 'Offerte maken'}
          bezig={bezig}
          onClick={verder}
          icoon={akkoord ? <Receipt className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
        />
      </div>
    </div>
  )
}

function Paneel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-4 md:p-5"
      style={{
        backgroundColor: CARD,
        border: `1px solid ${BORDER}`,
        boxShadow: '0 1px 3px rgba(120,90,50,0.07), inset 0 1px 0 rgba(255,255,255,0.55)',
      }}
    >
      {children}
    </div>
  )
}

function Regel({ icoon, children }: { icoon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-[2px]">{icoon}</span>
      <span className="min-w-0">{children}</span>
    </div>
  )
}

function Fasebalk({ huidig }: { huidig: number }) {
  return (
    <div className="flex items-start">
      {FASES.map((fase, i) => {
        const actief = i === huidig
        const gehad = i < huidig
        const laatste = i === FASES.length - 1
        const Icoon = fase.Icon
        return (
          <div key={fase.label} className="flex items-start flex-1 last:flex-initial min-w-0">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <span
                className="flex items-center justify-center w-[34px] h-[34px] md:w-[40px] md:h-[40px] rounded-full"
                style={{
                  backgroundColor: gehad ? PETROL : CARD,
                  border: `2px solid ${gehad || actief ? PETROL : 'rgba(26,83,92,0.18)'}`,
                  boxShadow: actief ? `0 0 0 3px ${FLAME}1F` : undefined,
                }}
              >
                <Icoon
                  className="h-[15px] w-[15px] md:h-[17px] md:w-[17px]"
                  style={{ color: gehad ? '#FFFFFF' : actief ? PETROL : 'rgba(26,83,92,0.3)' }}
                  strokeWidth={actief ? 2.2 : 1.8}
                />
              </span>
              <span className="hidden md:block text-center max-w-[92px]">
                <span
                  className="block text-[12px] font-bold leading-tight"
                  style={{ color: actief || gehad ? FG : 'rgba(35,30,26,0.42)' }}
                >
                  {fase.label}
                  <span style={{ color: FLAME }}>.</span>
                </span>
                <span
                  className="block text-[9.5px] uppercase tracking-[0.06em] leading-tight mt-0.5"
                  style={{ color: MUTED_HEX }}
                >
                  {fase.caption}
                </span>
              </span>
            </div>
            {!laatste && (
              <div className="flex-1 h-px mt-[17px] md:mt-[20px] mx-1 relative">
                <span
                  className="absolute inset-0"
                  style={{
                    backgroundImage: 'linear-gradient(90deg, rgba(26,83,92,0.22) 50%, transparent 50%)',
                    backgroundSize: '6px 1px',
                    backgroundRepeat: 'repeat-x',
                  }}
                />
                {i < huidig && <span className="absolute inset-0" style={{ background: PETROL }} />}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ───────────────────────── Offerte ─────────────────────────
   De calculatie is voor een eigenaar het echte moment: hij ziet
   inkoop, verkoop en marge meelopen terwijl hij regels toevoegt.
   Cijfers en kolommen volgen QuoteItemsTable en QuoteSidebar. */

const REGELS = [
  { oms: 'Zuil bij de inrit · 2500 × 600, dubbelzijdig, gefreesd alu', aantal: 1, prijs: 2450, inkoop: 1180 },
  { oms: 'Gevelborden · 1200 × 800 dibond, full colour', aantal: 2, prijs: 385, inkoop: 240 },
  { oms: 'Routebordjes op paal · 400 × 150', aantal: 12, prijs: 78, inkoop: 410 },
  { oms: 'Montage incl. hoogwerker · 1 dag', aantal: 1, prijs: 890, inkoop: 320 },
]

const VERKOOP = REGELS.reduce((t, r) => t + r.aantal * r.prijs, 0)
const INKOOP = REGELS.reduce((t, r) => t + r.inkoop, 0)
const MARGE = VERKOOP - INKOOP
const MARGE_PCT = Math.round((MARGE / VERKOOP) * 100)

function euro(n: number) {
  return n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function OfferteScherm({ bezig, versturen }: { bezig: boolean; versturen: () => void }) {
  return (
    <div className="px-5 py-5 md:px-7 md:py-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div className="min-w-0">
          <span className="font-mono text-[11px]" style={{ color: MUTED_HEX }}>
            OFF-2026-241
          </span>
          <h3 className="font-heading text-[21px] md:text-[26px] font-bold leading-[1.1] mt-0.5" style={{ color: PETROL }}>
            Bewegwijzering Bouwbedrijf Veld<span style={{ color: FLAME }}>.</span>
          </h3>
          <p className="mt-1.5 text-[12.5px]" style={{ color: SEC }}>
            Regels overgenomen uit het project · geldig tot 30 september
          </p>
        </div>
        <Actieknop label="Versturen naar klant" bezig={bezig} onClick={versturen} icoon={<Send className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,240px] gap-4">
        <Paneel>
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ minWidth: 460 }}>
              <thead>
                <tr>
                  {['Omschrijving', 'Aantal', 'Prijs', 'Totaal'].map((k, i) => (
                    <th
                      key={k}
                      className={`pb-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${i > 0 ? 'text-right' : ''}`}
                      style={{ color: MUTED_HEX }}
                    >
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {REGELS.map((r) => (
                  <tr key={r.oms} style={{ borderTop: `1px solid ${BORDER}` }}>
                    <td className="py-2.5 pr-4 text-[13px] leading-snug">{r.oms}</td>
                    <td className="py-2.5 pr-4 text-right font-mono text-[13px]">{r.aantal}</td>
                    <td className="py-2.5 pr-4 text-right font-mono text-[13px]" style={{ color: SEC }}>
                      € {euro(r.prijs)}
                    </td>
                    <td className="py-2.5 text-right font-mono text-[13px] font-semibold">
                      € {euro(r.aantal * r.prijs)}
                    </td>
                  </tr>
                ))}
                <tr style={{ borderTop: `1px solid ${BORDER}` }}>
                  <td className="pt-3 text-[13px] font-semibold" colSpan={3}>
                    Totaal ex btw
                  </td>
                  <td className="pt-3 text-right font-mono text-[15px] font-bold">€ {euro(VERKOOP)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Paneel>

        <div className="space-y-4">
          <Paneel>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: MUTED_HEX }}>
              Marge<span style={{ color: FLAME }}>.</span>
            </span>
            <div className="rounded-xl p-3" style={{ backgroundColor: '#EFF6F1', border: '1px solid rgba(74,153,96,0.22)' }}>
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: GROEN_TEKST }}>
                  %
                </span>
                <span className="font-mono text-[20px] font-extrabold" style={{ color: GROEN }}>
                  {MARGE_PCT}%
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(74,153,96,0.18)' }}>
                <span className="block h-full rounded-full" style={{ width: `${MARGE_PCT}%`, backgroundColor: GROEN }} />
              </div>
            </div>
            <dl className="mt-3 space-y-1.5 text-[12.5px]">
              {[
                ['Inkoop', `€ ${euro(INKOOP)}`],
                ['Verkoop', `€ ${euro(VERKOOP)}`],
                ['Marge', `€ ${euro(MARGE)}`],
              ].map(([k, v], i) => (
                <div key={k} className="flex items-baseline justify-between gap-3">
                  <dt style={{ color: SEC }}>{k}</dt>
                  <dd className="font-mono" style={{ fontWeight: i === 2 ? 700 : 500 }}>
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
          </Paneel>

          <Paneel>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] mb-2.5" style={{ color: MUTED_HEX }}>
              Uren<span style={{ color: FLAME }}>.</span>
            </span>
            <dl className="space-y-1.5 text-[12.5px]">
              {[
                ['Productie', '6,5 u'],
                ['Montage', '8,0 u'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-3">
                  <dt style={{ color: SEC }}>{k}</dt>
                  <dd className="font-mono">{v}</dd>
                </div>
              ))}
              <div className="flex items-baseline justify-between gap-3 pt-1.5" style={{ borderTop: `1px solid ${BORDER}` }}>
                <dt className="font-semibold">Totaal</dt>
                <dd className="font-mono font-bold">14,5 u</dd>
              </div>
            </dl>
          </Paneel>
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────── Klantportaal ─────────────────────────
   Wat de klant ziet als hij op de link klikt: geen account, geen
   PDF-bijlage, wel een knop. Vandaar de andere achtergrond. */

function PortaalScherm({ bezig, akkoord }: { bezig: boolean; akkoord: () => void }) {
  return (
    <div style={{ backgroundColor: '#F1F5F5' }} className="px-5 py-6 md:px-7 md:py-8">
      <div className="mx-auto max-w-[560px]">
        <div className="flex items-center justify-between mb-4">
          <span className="font-heading text-[15px] font-bold" style={{ color: PETROL }}>
            Sign Company<span style={{ color: FLAME }}>.</span>
          </span>
          <span className="text-[11.5px]" style={{ color: MUTED_HEX }}>
            Voor Bouwbedrijf Veld
          </span>
        </div>

        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: CARD, border: `1px solid ${BORDER}`, boxShadow: '0 1px 3px rgba(120,90,50,0.07)' }}
        >
          <div className="px-5 py-4 md:px-6" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <span className="font-mono text-[11px]" style={{ color: MUTED_HEX }}>
              OFF-2026-241
            </span>
            <h3 className="font-heading text-[18px] md:text-[20px] font-bold leading-tight mt-0.5" style={{ color: PETROL }}>
              Bewegwijzering nieuw bedrijfspand
            </h3>
          </div>

          <div className="px-5 py-4 md:px-6 space-y-2">
            {REGELS.map((r) => (
              <div key={r.oms} className="flex items-baseline justify-between gap-4 text-[12.5px]">
                <span className="min-w-0" style={{ color: SEC }}>
                  {r.aantal} × {r.oms.split(' · ')[0]}
                </span>
                <span className="font-mono shrink-0">€ {euro(r.aantal * r.prijs)}</span>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-4 pt-2.5" style={{ borderTop: `1px solid ${BORDER}` }}>
              <span className="text-[13px] font-semibold">Totaal ex btw</span>
              <span className="font-mono text-[15px] font-bold">€ {euro(VERKOOP)}</span>
            </div>
          </div>

          <div className="px-5 py-4 md:px-6 flex flex-wrap items-center gap-3" style={{ backgroundColor: BG, borderTop: `1px solid ${BORDER}` }}>
            <button
              type="button"
              onClick={akkoord}
              disabled={bezig}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-lg text-white font-semibold text-[13.5px] transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-80"
              style={{ backgroundColor: GROEN }}
            >
              {bezig ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Akkoord, ga maar bouwen
            </button>
            <span className="text-[12.5px]" style={{ color: SEC }}>
              Vraag stellen
            </span>
          </div>
        </div>

        <p className="mt-3 text-[11.5px] text-center" style={{ color: MUTED_HEX }}>
          Je klant hoeft niets te installeren en niets in te loggen.
        </p>
      </div>
    </div>
  )
}

/* ───────────────────────── Factuur ───────────────────────── */

function FactuurScherm({ opnieuw }: { opnieuw: () => void }) {
  const btw = VERKOOP * 0.21
  return (
    <div className="px-5 py-5 md:px-7 md:py-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <span className="font-mono text-[11px]" style={{ color: MUTED_HEX }}>
            2026241
          </span>
          <h3 className="font-heading text-[21px] md:text-[26px] font-bold leading-[1.1] mt-0.5" style={{ color: PETROL }}>
            Factuur verstuurd<span style={{ color: FLAME }}>.</span>
          </h3>
          <p className="mt-1.5 text-[12.5px]" style={{ color: SEC }}>
            Uit de offerte, zonder één regel over te typen
          </p>
        </div>
        <button
          type="button"
          onClick={opnieuw}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-lg font-semibold text-[13.5px] transition-colors"
          style={{ border: `1px solid ${BORDER}`, color: PETROL }}
        >
          Nog een keer van voren af aan
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,260px] gap-4">
        <Paneel>
          <div className="flex items-baseline justify-between gap-4 mb-3">
            <span className="font-heading text-[14px] font-bold">
              Bedrag<span style={{ color: FLAME }}>.</span>
            </span>
            <span
              className="inline-flex items-center gap-[5px] px-[10px] py-[3px] rounded-[20px] text-[10px] font-semibold"
              style={{ backgroundColor: '#E2EBF5', color: '#3A5A9A' }}
            >
              <span aria-hidden className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: '#3A5A9A' }} />
              Verstuurd
              <span aria-hidden style={{ color: FLAME, fontWeight: 800, marginLeft: -2 }}>.</span>
            </span>
          </div>
          <dl className="space-y-1.5 text-[13px]">
            {[
              ['Subtotaal', `€ ${euro(VERKOOP)}`],
              ['Btw 21%', `€ ${euro(btw)}`],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3">
                <dt style={{ color: SEC }}>{k}</dt>
                <dd className="font-mono">{v}</dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-3 pt-2" style={{ borderTop: `1px solid ${BORDER}` }}>
              <dt className="font-semibold">Te voldoen</dt>
              <dd className="font-mono text-[17px] font-bold">€ {euro(VERKOOP + btw)}</dd>
            </div>
          </dl>
          <div
            className="mt-4 flex flex-wrap items-center gap-2.5 rounded-lg px-3.5 py-3"
            style={{ backgroundColor: BG, border: `1px solid ${BORDER}` }}
          >
            <span className="text-[12.5px]" style={{ color: SEC }}>
              Betaallink in de mail:
            </span>
            <span className="font-mono text-[11.5px]" style={{ color: PETROL }}>
              doen.team/betalen/3d752882
            </span>
          </div>
        </Paneel>

        <div className="space-y-4">
          <Paneel>
            <span className="font-heading text-[14px] font-bold">
              Boekhouding<span style={{ color: FLAME }}>.</span>
            </span>
            <div className="mt-3 space-y-2.5 text-[12.5px]">
              <Regel icoon={<CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: GROEN }} />}>
                Doorgezet naar Exact Online
              </Regel>
              <Regel icoon={<CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: GROEN }} />}>
                Betaalstand komt vanzelf terug
              </Regel>
              <Regel icoon={<CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: GROEN }} />}>
                Project op <span className="font-semibold">Te factureren</span>
              </Regel>
            </div>
          </Paneel>

          <Paneel>
            <span className="font-heading text-[14px] font-bold">
              Wat jij deed<span style={{ color: FLAME }}>.</span>
            </span>
            <p className="mt-2.5 text-[12.5px] leading-[1.6]" style={{ color: SEC }}>
              Vijf keer klikken. De klantgegevens, de omschrijving en de bedragen heb je
              precies één keer gezien: in de mail van je klant.
            </p>
          </Paneel>
        </div>
      </div>
    </div>
  )
}
