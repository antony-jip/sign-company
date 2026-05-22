import { useState, useEffect, useRef } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { Sparkle as PhSparkle, FileText as PhFileText } from '@phosphor-icons/react'
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
    <div className="doen-slate-surface rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4 min-h-[24px]">
        <div className="flex items-center gap-2">
          <span className="doen-duo-icon" style={{ '--duo-sec': '#1A535C' } as React.CSSProperties}>
            <PhFileText size={16} weight="duotone" />
          </span>
          <h3 className="font-heading text-[15px] font-bold text-foreground">
            Briefing<span className="text-[#F15025]">.</span>
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
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-foreground/70 hover:text-foreground bg-white border border-[rgba(26,83,92,0.1)] hover:border-[rgba(26,83,92,0.22)] transition-all rounded-lg px-2.5 py-1.5 shadow-[0_1px_2px_rgba(20,62,71,0.04)] hover:shadow-[0_2px_8px_rgba(20,62,71,0.08)] disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <span className="doen-duo-icon">
                  <PhSparkle size={13} weight="duotone" />
                </span>
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
        className="resize-y text-[14px] leading-relaxed w-full min-h-[110px] px-4 py-3.5 bg-white border border-[rgba(26,83,92,0.12)] rounded-lg focus-visible:bg-white focus-visible:border-[#1A535C] focus-visible:ring-[3px] focus-visible:ring-[rgba(26,83,92,0.12)] focus-visible:shadow-none transition-colors"
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
