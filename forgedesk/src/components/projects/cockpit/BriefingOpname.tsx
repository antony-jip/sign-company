import { useEffect, useRef, useState } from 'react'
import { Loader2, Mic, Square } from 'lucide-react'
import { toast } from 'sonner'
import { chatCompletion, isAIConfigured } from '@/services/aiService'
import supabase from '@/services/supabaseClient'
import { useMediaQuery } from '@/hooks/useMediaQuery'

interface BriefingOpnameProps {
  huidigeBriefing: string
  projectNaam?: string
  klantNaam?: string
  onBriefing: (punten: string) => void
}

type Status = 'klaar' | 'opnemen' | 'uitschrijven' | 'verwerken'

const MAX_SECONDEN = 300
const MAX_AUDIO_BYTES = 3_500_000
const MIME_VOORKEUR = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac']

function kanOpnemen(): boolean {
  return typeof window !== 'undefined'
    && typeof window.MediaRecorder !== 'undefined'
    && !!navigator.mediaDevices?.getUserMedia
}

function formatDuur(seconden: number): string {
  const m = Math.floor(seconden / 60)
  const s = seconden % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function naarBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
    reader.onerror = () => reject(new Error('Opname kon niet gelezen worden'))
    reader.readAsDataURL(blob)
  })
}

async function schrijfUit(blob: Blob, seconden: number): Promise<string> {
  const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
  if (!session?.access_token) throw new Error('Log opnieuw in om in te spreken')

  const res = await fetch('/api/briefing-transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ audio: await naarBase64(blob), mimeType: blob.type, seconden }),
  })
  const data: { tekst?: string; error?: string } = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Uitschrijven mislukt')
  return (data.tekst || '').trim()
}

export function BriefingOpname({ huidigeBriefing, projectNaam, klantNaam, onBriefing }: BriefingOpnameProps) {
  const isMobiel = useMediaQuery('(max-width: 767px)')
  const [status, setStatus] = useState<Status>('klaar')
  const [seconden, setSeconden] = useState(0)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const secondenRef = useRef(0)

  useEffect(() => {
    if (status !== 'opnemen') return
    const t = setInterval(() => {
      secondenRef.current += 1
      setSeconden(secondenRef.current)
      if (secondenRef.current >= MAX_SECONDEN) recorderRef.current?.stop()
    }, 1000)
    return () => clearInterval(t)
  }, [status])

  useEffect(() => {
    return () => {
      const recorder = recorderRef.current
      if (recorder) {
        recorder.onstop = null
        if (recorder.state !== 'inactive') recorder.stop()
      }
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  if (!isMobiel || !kanOpnemen() || !isAIConfigured()) return null

  const werkUit = async (blob: Blob, duur: number) => {
    try {
      setStatus('uitschrijven')
      const transcript = await schrijfUit(blob, duur)
      if (!transcript) {
        toast.error('Niets verstaan, probeer het nog eens')
        return
      }

      setStatus('verwerken')
      const punten = await chatCompletion(
        [{ role: 'user', content: transcript }],
        `Je bent Daan. Je krijgt de uitgeschreven tekst van een voice memo van iemand bij een reclame/signing bedrijf en maakt er een projectbriefing van die de werkplaats en monteurs direct kunnen gebruiken.

Regels:
- Alleen korte bullets, elke regel begint met "- "
- Telegramstijl: geen hele zinnen, geen "we moeten" of "de klant wil graag"
- Eén gegeven per bullet; begin met het onderwerp (product, materiaal, maat, locatie, planning)
- Getallen, maten, aantallen, kleuren en datums altijd exact overnemen; maten als 200 x 80 cm, kleuren als RAL 7016
- Stopwoorden, herhalingen en hardop denken weglaten; bij een correctie ("nee, toch blauw") alleen de laatste versie
- Klinkt een woord als een verkeerd verstane vakterm (dibond, forex, alucobond, belettering, doorlichtende letters), gebruik dan de vakterm
- Open punten of vragen als laatste bullet met "Nog uitzoeken:"
- Alleen wat in de memo staat, verzin niets
- Geen kop, inleiding of afsluiting
${huidigeBriefing.trim() ? `- Deze punten staan al in de briefing, herhaal ze niet:\n${huidigeBriefing.trim()}` : ''}
${projectNaam ? `- Project: "${projectNaam}"` : ''}
${klantNaam ? `- Klant: "${klantNaam}"` : ''}

Voorbeeld van de gewenste vorm:
- Gevelbord 300 x 60 cm, dibond 3 mm, wit met logo full colour
- 2x raamfolie etsfolie voordeur, tekst volgt van klant
- Montage op 1e verdieping, hoogwerker nodig
- Klaar vóór 1 oktober
- Nog uitzoeken: bevestiging op metselwerk of houten gevel

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
      toast.error(msg, {
        duration: 15000,
        action: { label: 'Opnieuw', onClick: () => void werkUit(blob, duur) },
      })
    } finally {
      setStatus('klaar')
    }
  }

  const start = async () => {
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
    } catch (err) {
      const naam = err instanceof DOMException ? err.name : ''
      toast.error(
        naam === 'NotAllowedError' || naam === 'SecurityError'
          ? 'Geef doen. toegang tot je microfoon om in te spreken'
          : 'Microfoon niet beschikbaar'
      )
      return
    }

    const mimeType = MIME_VOORKEUR.find((m) => MediaRecorder.isTypeSupported(m))
    let recorder: MediaRecorder
    try {
      recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 32000 })
    } catch {
      stream.getTracks().forEach((t) => t.stop())
      toast.error('Opnemen lukt niet op dit toestel')
      return
    }

    const stukken: Blob[] = []
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) stukken.push(e.data)
    }
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      recorderRef.current = null
      const blob = new Blob(stukken, { type: recorder.mimeType || mimeType || 'audio/mp4' })
      if (blob.size === 0) {
        setStatus('klaar')
        toast.error('Opname is leeg, probeer het nog eens')
        return
      }
      if (blob.size > MAX_AUDIO_BYTES) {
        setStatus('klaar')
        toast.error('Memo te lang, houd het onder de vijf minuten')
        return
      }
      void werkUit(blob, secondenRef.current)
    }

    streamRef.current = stream
    recorderRef.current = recorder
    secondenRef.current = 0
    setSeconden(0)
    recorder.start(1000)
    setStatus('opnemen')
  }

  const stop = () => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') return
    setStatus('uitschrijven')
    recorder.stop()
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
          <span className="ml-auto font-mono text-[13px] text-muted-foreground">
            {formatDuur(seconden)} / {formatDuur(MAX_SECONDEN)}
          </span>
        </div>
        <button
          type="button"
          onClick={stop}
          className="relative z-10 mt-3 inline-flex w-full touch-manipulation items-center justify-center gap-2 rounded-lg bg-flame px-4 py-3 text-[14px] font-semibold text-white active:opacity-80"
        >
          <Square className="h-3.5 w-3.5 fill-current" strokeWidth={0} />
          Stop en uitwerken
        </button>
      </div>
    )
  }

  const bezig = status === 'uitschrijven' || status === 'verwerken'

  return (
    <button
      type="button"
      onClick={() => void start()}
      disabled={bezig}
      className="mt-3 inline-flex w-full touch-manipulation items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-[14px] font-semibold text-foreground disabled:opacity-60"
    >
      {bezig ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {status === 'uitschrijven' ? 'Memo uitschrijven…' : 'Daan werkt je memo uit…'}
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
