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
    <div className="border border-[hsl(35,15%,87%)] bg-[#FFFFFE] shadow-[0_1px_3px_rgba(130,100,60,0.04)] rounded-[10px] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-semibold text-foreground">Briefing</h3>
        {isEditing ? (
          <button
            disabled={isSaving}
            onClick={handleSave}
            className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50 transition-colors"
          >
            {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Opslaan
          </button>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="h-3 w-3" />
            Bewerken
          </button>
        )}
      </div>

      {isEditing ? (
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Beschrijf het project: wat moet er gemaakt worden, waar, welke materialen..."
          rows={5}
          className="resize-y text-[13px] border-[hsl(35,15%,87%)] focus:ring-1 focus:ring-emerald-400/30 focus:border-emerald-400 bg-[hsl(35,10%,99%)]"
          autoFocus
        />
      ) : beschrijving ? (
        <p
          className="text-[13px] text-foreground/75 leading-relaxed cursor-pointer hover:text-foreground transition-colors whitespace-pre-wrap"
          onClick={() => setIsEditing(true)}
        >
          {beschrijving}
        </p>
      ) : (
        <p
          className="text-[13px] text-muted-foreground/40 cursor-pointer hover:text-muted-foreground transition-colors"
          onClick={() => setIsEditing(true)}
        >
          Klik om een briefing toe te voegen...
        </p>
      )}
    </div>
  )
}
