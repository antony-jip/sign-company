import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Pencil, Sparkles, Loader2 } from 'lucide-react'
import { chatCompletion, isAIConfigured } from '@/services/aiService'

interface BriefingCardProps {
  beschrijving: string
  projectNaam?: string
  klantNaam?: string
  onSave: (text: string) => Promise<void>
}

export function BriefingCard({ beschrijving, projectNaam, klantNaam, onSave }: BriefingCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(beschrijving)
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  if (!isEditing && text !== beschrijving) {
    setText(beschrijving)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(text)
      setIsEditing(false)
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
    <div className="rounded-xl bg-[#FFFFFF] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-bold text-[#1A1A1A] tracking-[-0.2px]">Briefing</h3>
        {isEditing ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setText(beschrijving); setIsEditing(false) }}
              className="text-[12px] text-[#9B9B95] hover:text-[#1A1A1A] transition-colors"
            >
              Annuleren
            </button>
            <button
              disabled={isSaving}
              onClick={handleSave}
              className="text-[12px] text-[#1A535C] font-semibold hover:underline disabled:opacity-50 transition-colors"
            >
              {isSaving ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        ) : beschrijving ? (
          <button
            onClick={() => setIsEditing(true)}
            className="text-[#9B9B95] hover:text-[#1A535C] transition-colors"
          >
            <Pencil className="h-3 w-3" />
          </button>
        ) : null}
      </div>

      {isEditing ? (
        <div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Wat moet er gemaakt worden? Waar? Welke materialen?"
            rows={4}
            className="resize-y text-[14px] leading-relaxed bg-[#F8F7F5] rounded-lg p-4 border border-[#EBEBEB] focus:ring-1 focus:ring-[#1A535C]/20 focus:border-[#1A535C]/30"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Escape') { setText(beschrijving); setIsEditing(false) } }}
          />
          {isAIConfigured() && text.trim() && (
            <button
              disabled={isGenerating}
              onClick={handleDaan}
              className="mt-2 text-[11px] text-[#9B9B95] hover:text-[#1A535C] transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              {isGenerating ? (
                <><Loader2 className="h-3 w-3 animate-spin" /> Daan schrijft...</>
              ) : (
                <><Sparkles className="h-3 w-3" /> Laat Daan herschrijven</>
              )}
            </button>
          )}
        </div>
      ) : beschrijving ? (
        <p
          className="text-[14px] text-[#1A1A1A] leading-[1.65] cursor-pointer hover:bg-[#F8F7F5] rounded-lg px-4 py-3 -mx-1 transition-colors whitespace-pre-wrap"
          onClick={() => setIsEditing(true)}
        >
          {beschrijving}
        </p>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="w-full cursor-pointer rounded-lg border border-dashed border-[#EBEBEB] hover:border-[#1A535C]/30 px-4 py-5 transition-all text-center group"
        >
          <p className="text-[13px] text-[#9B9B95] group-hover:text-[#6B6B66] transition-colors">
            Beschrijf de opdracht<span className="text-[#F15025]">.</span>
          </p>
        </button>
      )}
    </div>
  )
}
