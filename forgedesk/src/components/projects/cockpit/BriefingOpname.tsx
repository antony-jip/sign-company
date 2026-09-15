import { useEffect, useRef, useState } from 'react'
import { Loader2, Mic, Square } from 'lucide-react'
import { toast } from 'sonner'
import { chatCompletion, isAIConfigured } from '@/services/aiService'
import { useMediaQuery } from '@/hooks/useMediaQuery'

interface SpraakResultaat {
  isFinal: boolean
  0: { transcript: string }
}

interface SpraakHerkenning {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: { resultIndex: number; results: ArrayLike<SpraakResultaat> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpraakHerkenningConstructor = new () => SpraakHerkenning

function spraakHerkenningKlasse(): SpraakHerkenningConstructor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpraakHerkenningConstructor
    webkitSpeechRecognition?: SpraakHerkenningConstructor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

interface BriefingOpnameProps {
  huidigeBriefing: string
  projectNaam?: string
  klantNaam?: string
  onBriefing: (punten: string) => void
}

function formatDuur(seconden: number): string {
  const m = Math.floor(seconden / 60)
  const s = seconden % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function BriefingOpname({ huidigeBriefing, projectNaam, klantNaam, onBriefing }: BriefingOpnameProps) {
  const isMobiel = useMediaQuery('(max-width: 767px)')
  const [status, setStatus] = useState<'klaar' | 'opnemen' | 'verwerken'>('klaar')
  const [seconden, setSeconden] = useState(0)
  const [tussenTekst, setTussenTekst] = useState('')

  const herkenningRef = useRef<SpraakHerkenning | null>(null)
  const definitiefRef = useRef('')
  const blijfOpnemenRef = useRef(false)
  const foutGemeldRef = useRef(false)

  useEffect(() => {
    if (status !== 'opnemen') return
    const t = setInterval(() => setSeconden((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [status])

  useEffect(() => {
    return () => {
      blijfOpnemenRef.current = false
      herkenningRef.current?.abort()
    }
  }, [])

  const Klasse = spraakHerkenningKlasse()
  if (!isMobiel || !Klasse || !isAIConfigured()) return null

  const verwerk = async (transcript: string) => {
    setStatus('verwerken')
    try {
      const punten = await chatCompletion(
        [{ role: 'user', content: transcript }],
        `Je bent Daan. Je krijgt een ingesproken voice memo van iemand bij een reclame/signing bedrijf en maakt er een projectbriefing van.

De memo is automatisch uitgeschreven door spraakherkenning en bevat daardoor verkeerd verstane woorden. Herstel die naar de vakterm die bedoeld is, op basis van klank en context. Veelvoorkomende termen: dibond, forex, plexiglas, acrylaat, alucobond, aluminium composiet, trespa, PVC, vinyl, folie, wrap, carwrap, belettering, doorlichtende letters, freesletters, opbouwletters, lichtbak, gevelbord, spandoek, banner, mesh, raamfolie, etsfolie, zandstraalfolie, sticker, laminaat, RAL, Pantone, CMYK, LED, montage, hoogwerker, steiger, bouwvergunning, drukproef, vectorbestand, huisstijl, logo. Kleurcodes zoals "ral zeven nul één zes" schrijf je als RAL 7016, maten als 200 x 80 cm. Twijfel je of een woord echt verkeerd verstaan is, laat het dan staan.

Stijl:
- Alleen korte bullets, elke regel begint met "- "
- Kortbondig zoals een projectleider het opschrijft, geen hele zinnen overnemen
- Kern eruit halen: wat, waar, formaat, materiaal, aantal, kleur, deadline, montage, aandachtspunten
- Laat stopwoorden, herhalingen en twijfels ("eh", "even kijken", "of nee wacht") weg; geldt een correctie, neem dan alleen de laatste versie
- Alleen feiten die in de memo staan, verzin niets
- Geen kop, geen inleiding, geen afsluiting
${huidigeBriefing.trim() ? `- Deze punten staan al in de briefing, herhaal ze niet:\n${huidigeBriefing.trim()}` : ''}
${projectNaam ? `- Project: "${projectNaam}"` : ''}
${klantNaam ? `- Klant: "${klantNaam}"` : ''}

Antwoord ALLEEN met de bullets.`
      )
      const schoon = punten.trim()
      if (!schoon) {
        toast.error('Daan haalde geen briefingpunten uit je memo')
        return
      }
      onBriefing(schoon)
      toast.success('Briefing bijgewerkt')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Onbekende fout'
      toast.error(`Daan kon je memo niet uitwerken: ${msg}`, {
        duration: 15000,
        action: { label: 'Opnieuw', onClick: () => void verwerk(transcript) },
      })
    } finally {
      setStatus('klaar')
    }
  }

  const start = () => {
    const herkenning = new Klasse()
    herkenning.lang = 'nl-NL'
    herkenning.continuous = true
    herkenning.interimResults = true

    herkenning.onresult = (e) => {
      let tussen = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) definitiefRef.current += `${r[0].transcript} `
        else tussen += r[0].transcript
      }
      setTussenTekst(tussen)
    }

    herkenning.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return
      blijfOpnemenRef.current = false
      foutGemeldRef.current = true
      toast.error(
        e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? 'Geef doen. toegang tot je microfoon om in te spreken'
          : 'Opnemen gestopt door een fout'
      )
    }

    // Safari en Chrome stoppen zelf na een stilte. Zolang de gebruiker niet op
    // stop drukte, starten we stil opnieuw zodat één tik genoeg is.
    herkenning.onend = () => {
      if (blijfOpnemenRef.current) {
        try {
          herkenning.start()
          return
        } catch {
          blijfOpnemenRef.current = false
        }
      }
      herkenningRef.current = null
      setTussenTekst('')
      const transcript = definitiefRef.current.trim()
      definitiefRef.current = ''
      if (!transcript) {
        setStatus('klaar')
        if (!foutGemeldRef.current) toast.error('Niets verstaan, probeer het nog eens')
        return
      }
      void verwerk(transcript)
    }

    definitiefRef.current = ''
    foutGemeldRef.current = false
    blijfOpnemenRef.current = true
    herkenningRef.current = herkenning
    setSeconden(0)
    setTussenTekst('')
    try {
      herkenning.start()
      setStatus('opnemen')
    } catch {
      blijfOpnemenRef.current = false
      herkenningRef.current = null
      toast.error('Opnemen lukt niet op dit toestel')
    }
  }

  const stop = () => {
    blijfOpnemenRef.current = false
    setStatus('verwerken')
    herkenningRef.current?.stop()
  }

  if (status === 'opnemen') {
    return (
      <div className="mt-3 rounded-lg border border-flame/30 bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-flame opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-flame" />
          </span>
          <span className="text-[13px] font-semibold text-foreground">Opnemen</span>
          <span className="font-mono text-[13px] text-muted-foreground">{formatDuur(seconden)}</span>
          <button
            onClick={stop}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-flame px-3 py-2 text-[13px] font-semibold text-white"
          >
            <Square className="h-3.5 w-3.5 fill-current" strokeWidth={0} />
            Stop en uitwerken
          </button>
        </div>
        {tussenTekst && (
          <p className="mt-2 line-clamp-2 text-[12px] italic text-muted-foreground">{tussenTekst}</p>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={start}
      disabled={status === 'verwerken'}
      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-[14px] font-semibold text-foreground disabled:opacity-60"
    >
      {status === 'verwerken' ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Daan werkt je memo uit…
        </>
      ) : (
        <>
          <Mic className="h-4 w-4 text-flame" strokeWidth={1.75} />
          Spreek briefing in
        </>
      )}
    </button>
  )
}
