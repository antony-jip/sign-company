import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'

interface BriefingCardProps {
  beschrijving: string
  onSave: (text: string) => Promise<void>
}

export function BriefingCard({ beschrijving, onSave }: BriefingCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(beschrijving)
  const [isSaving, setIsSaving] = useState(false)

  // Sync external changes
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

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-[11px] font-semibold text-[#9B9B95] uppercase tracking-widest">Briefing</h3>
        {isEditing && (
          <button
            disabled={isSaving}
            onClick={handleSave}
            className="text-[11px] text-[#1A535C] font-semibold hover:underline disabled:opacity-50 transition-colors"
          >
            {isSaving ? 'Opslaan...' : 'Opslaan'}
          </button>
        )}
      </div>

      {isEditing ? (
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Beschrijf het project: wat moet er gemaakt worden, waar, welke materialen..."
          rows={3}
          className="resize-y text-[13px] bg-[#F8F7F5] rounded-lg p-3 border border-[#EBEBEB] focus:ring-1 focus:ring-[#1A535C]/20"
          autoFocus
          onBlur={() => { if (text === beschrijving) setIsEditing(false) }}
        />
      ) : beschrijving ? (
        <p
          className="text-[13px] text-[#1A1A1A] leading-relaxed cursor-pointer hover:bg-[#F8F7F5] rounded-lg px-3 py-2 -mx-3 transition-colors whitespace-pre-wrap"
          onClick={() => setIsEditing(true)}
        >
          {beschrijving}
        </p>
      ) : (
        <div
          className="text-[13px] text-[#9B9B95] cursor-pointer rounded-lg px-3 py-2 border border-dashed border-[#EBEBEB] hover:border-[#1A535C]/30 hover:text-[#6B6B66] transition-all"
          onClick={() => setIsEditing(true)}
        >
          Klik om een briefing toe te voegen...
        </div>
      )}
    </div>
  )
}
