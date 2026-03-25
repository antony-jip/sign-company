import { useState } from 'react'
import { Pencil, Save, Loader2 } from 'lucide-react'
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
    <div className="bg-[#FFFFFF] border border-[#EBEBEB]/60 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-semibold text-[#1A1A1A] uppercase tracking-widest">Briefing</h3>
        {isEditing ? (
          <button
            disabled={isSaving}
            onClick={handleSave}
            className="text-xs text-[#1A535C] font-medium hover:underline disabled:opacity-50 transition-colors"
          >
            {isSaving ? 'Opslaan...' : 'Opslaan'}
          </button>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs text-[#9B9B95] hover:text-[#6B6B66] transition-colors"
          >
            Bewerken
          </button>
        )}
      </div>

      {isEditing ? (
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Beschrijf het project: wat moet er gemaakt worden, waar, welke materialen..."
          rows={4}
          className="resize-y text-sm bg-[#F8F7F5] rounded-lg p-3 border-none focus:ring-1 focus:ring-[#1A535C]/20"
          autoFocus
        />
      ) : beschrijving ? (
        <p
          className="text-sm text-[#1A1A1A] leading-relaxed cursor-pointer hover:text-[#6B6B66] transition-colors whitespace-pre-wrap"
          onClick={() => setIsEditing(true)}
        >
          {beschrijving}
        </p>
      ) : (
        <p
          className="text-sm text-[#9B9B95] cursor-pointer hover:text-[#6B6B66] transition-colors"
          onClick={() => setIsEditing(true)}
        >
          Klik om een briefing toe te voegen...
        </p>
      )}
    </div>
  )
}
