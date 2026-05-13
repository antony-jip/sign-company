import { useState, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, Loader2 } from 'lucide-react'
import { chatCompletion, isAIConfigured } from '@/services/aiService'
import { cn } from '@/lib/utils'

interface BriefingCardProps {
  beschrijving: string
  projectNaam?: string
  klantNaam?: string
  onSave: (text: string) => Promise<void>
}

export function BriefingCard({ beschrijving, projectNaam, klantNaam, onSave }: BriefingCardProps) {
  const [text, setText] = useState(beschrijving)
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    setText(beschrijving)
  }, [beschrijving])

  const isDirty = text !== beschrijving
  const hasContent = text.trim().length > 0
  const showDaan = isAIConfigured() && hasContent && !isDirty

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(text)
    } finally {
      setIsSaving(false)
    }
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

        {/* Save-bar — alleen bij dirty */}
        <div
          className={cn(
            'flex items-center gap-2 transition-all duration-150',
            isDirty
              ? 'opacity-100 visible'
              : 'opacity-0 invisible pointer-events-none'
          )}
        >
          <button
            disabled={isSaving}
            onClick={() => setText(beschrijving)}
            className="text-[12px] text-[#9B9B95] hover:text-[#1A1A1A] transition-colors disabled:opacity-40"
          >
            Annuleren
          </button>
          <button
            disabled={isSaving}
            onClick={handleSave}
            className="text-[12px] font-semibold text-white bg-[#1A535C] hover:bg-[#237580] transition-colors px-3 py-1 rounded-md disabled:opacity-40"
          >
            {isSaving ? 'Opslaan…' : 'Opslaan'}
          </button>
        </div>

        {/* Daan ghost-button — alleen bij content + clean */}
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

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Wat moet er gemaakt worden? Waar? Welke materialen?"
        className="resize-y text-[14px] leading-relaxed w-full min-h-[110px] px-4 py-3.5 bg-[var(--cream-bg)] border-[var(--cream-border)] focus-visible:bg-white focus-visible:border-[var(--amber)] focus-visible:ring-[3px] focus-visible:ring-[rgba(204,138,63,0.18)] focus-visible:shadow-none"
        onKeyDown={(e) => {
          if (e.key === 'Escape') setText(beschrijving)
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && isDirty) handleSave()
        }}
      />
    </div>
  )
}
