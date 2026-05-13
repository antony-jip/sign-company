import { useState, useEffect, useRef } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, Loader2 } from 'lucide-react'
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
    <div className="rounded-xl bg-[#FFFFFF] shadow-[0_1px_3px_rgba(130,100,60,0.04)] p-6">
      <div className="flex items-center justify-between mb-3 min-h-[24px]">
        <h3 className="text-[11px] font-semibold text-[#6B6B66] uppercase tracking-[0.08em]">Briefing</h3>

        <div className="flex items-center gap-3">
          {isSaving && (
            <span className="flex items-center gap-1.5 text-[11px] text-[#9B9B95]">
              <Loader2 className="h-3 w-3 animate-spin" />
              Opslaan…
            </span>
          )}

          {showDaan && (
            <button
              disabled={isGenerating}
              onClick={handleDaan}
              className="flex items-center gap-1.5 text-[11px] text-[#6B6B66] hover:text-[#1A1A1A] hover:bg-[var(--cream-bg)] transition-colors rounded-md px-2 py-1 disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" style={{ color: 'var(--lavender-text)' }} />
              )}
              {isGenerating ? 'Daan schrijft…' : 'Daan'}
            </button>
          )}
        </div>
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        placeholder="Wat moet er gemaakt worden? Waar? Welke materialen?"
        className="resize-y text-[14px] leading-relaxed w-full min-h-[110px] px-4 py-3.5 bg-[var(--cream-bg)] border-[var(--cream-border)] focus-visible:bg-white focus-visible:border-[var(--amber)] focus-visible:ring-[3px] focus-visible:ring-[rgba(204,138,63,0.18)] focus-visible:shadow-none"
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
