import { useState } from 'react'
import { Pencil, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground">Briefing</h3>
        {isEditing ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-3 text-xs"
            disabled={isSaving}
            onClick={handleSave}
          >
            {isSaving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
            Opslaan
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="h-3 w-3 mr-1" />
            Bewerken
          </Button>
        )}
      </div>

      {isEditing ? (
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Voeg hier de projectbriefing toe..."
          rows={5}
          className="resize-y text-sm"
          autoFocus
        />
      ) : beschrijving ? (
        <p
          className="text-sm text-muted-foreground leading-relaxed cursor-pointer hover:text-foreground transition-colors"
          onClick={() => setIsEditing(true)}
        >
          {beschrijving}
        </p>
      ) : (
        <p
          className="text-sm text-muted-foreground/50 italic cursor-pointer hover:text-muted-foreground transition-colors"
          onClick={() => setIsEditing(true)}
        >
          Klik om een briefing toe te voegen...
        </p>
      )}
    </div>
  )
}
