import { useState, useEffect, useRef } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Sparkles, FileText } from 'lucide-react'
import { chatCompletion, isAIConfigured } from '@/services/aiService'

interface BriefingCardProps {
  beschrijving: string
  projectNaam?: string
  klantNaam?: string
  onSave: (text: string) => Promise<void>
}

const AUTOSAVE_DELAY_MS = 800

export function BriefingCard({ beschrijving, projectNaam, klantNaam, onSave }: BriefingCardProps) {
  const [text, setText] = useState(beschrijving)
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const savedRef = useRef(beschrijving)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setText(beschrijving)
    savedRef.current = beschrijving
  }, [beschrijving])

  const flush = async (value: string) => {
    if (value === savedRef.current) return
    setIsSaving(true)
    try {
      await onSave(value)
      savedRef.current = value
    } catch (err) {
      // Niet stil falen — autosave fout was eerder onzichtbaar voor user
      // (kwam vaak voor bij medewerkers door RLS op projecten-tabel).
      console.error('Briefing autosave mislukt:', err)
      const msg = err instanceof Error ? err.message : 'Onbekende fout'
      // Lazy import om toast circular dep te voorkomen
      const { toast } = await import('sonner')
      toast.error(`Briefing niet opgeslagen: ${msg}`)
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    if (text === savedRef.current) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { flush(text) }, AUTOSAVE_DELAY_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [text]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        if (text !== savedRef.current) {
          onSave(text).catch(() => {})
        }
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const hasContent = text.trim().length > 0
  const isDirty = text !== savedRef.current
  const showDaan = isAIConfigured() && hasContent && !isDirty && !isSaving

  const handleBlur = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (text !== savedRef.current) flush(text)
  }

  const handleDaan = async () => {
    if (!text.trim()) return
    setIsGenerating(true)
    try {
      const result = await chatCompletion(
        [{ role: 'user', content: text.trim() }],
        `Je bent Daan. Je herschrijft rommelige notities naar een korte, duidelijke projectbriefing voor een reclame/signing bedrijf.

Stijl:
- Kort en puntig, geen wollige zinnen
- Gebruik korte bullets (streepjes) voor de kern: wat, waar, formaat, materiaal, aantal
- Max 4-6 regels totaal
- Geen inleiding, geen afsluiting, geen "dienen te worden" taal
- Gewoon helder Nederlands zoals een projectleider het zou opschrijven
- Alleen feiten die in de input staan, verzin niets
${projectNaam ? `- Project: "${projectNaam}"` : ''}
${klantNaam ? `- Klant: "${klantNaam}"` : ''}

Antwoord ALLEEN met de briefing, niets anders.`
      )
      setText(result.trim())
    } catch {
      // Keep original text on failure
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="doen-slate-surface rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4 min-h-[24px]">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" strokeWidth={1.75} style={{ color: '#1A535C' }} />
          <h3 className="font-heading text-[15px] font-bold text-foreground">
            Briefing
          </h3>
          <span
            className="text-[12px] text-muted-foreground hidden sm:inline"
            style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
          >
            · wat moet er gebeuren
          </span>
        </div>

        <div className="flex items-center gap-3">
          {isSaving && (
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Opslaan…
            </span>
          )}

          {showDaan && (
            <button
              disabled={isGenerating}
              onClick={handleDaan}
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-foreground/70 hover:text-foreground bg-card border border-border hover:border-[#1A535C]/40 transition-all rounded-lg px-2.5 py-1.5 shadow-sm hover:shadow disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" strokeWidth={1.75} />
              )}
              {isGenerating ? 'Daan schrijft…' : 'Daan AI'}
            </button>
          )}
        </div>
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        placeholder="Wat moet er gemaakt worden? Waar? Welke materialen?"
        className="resize-y text-[14px] leading-relaxed w-full min-h-[110px] px-4 py-3.5 bg-card text-foreground border border-border rounded-lg focus-visible:bg-card focus-visible:border-[#1A535C] focus-visible:ring-[3px] focus-visible:ring-[rgba(26,83,92,0.12)] focus-visible:shadow-none transition-colors placeholder:text-muted-foreground"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setText(savedRef.current)
            ;(e.target as HTMLTextAreaElement).blur()
          }
        }}
      />
    </div>
  )
}
