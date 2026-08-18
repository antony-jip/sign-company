import { useState } from 'react'
import { Check, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Zodra je een taak oppakt komt onderin de plek waar je hem kwijt kunt: af of
// weg. Dat scheelt de omweg via het hover-menu op de kaart, en het is de
// natuurlijke beweging als een taak toch niet meer op de planning hoort.

interface Props {
  actief: boolean
  onGedaan: (taakId: string) => void
  onVerwijder: (taakId: string) => void
}

export function TaakSleepActies({ actief, onGedaan, onVerwijder }: Props) {
  const [boven, setBoven] = useState<'gedaan' | 'verwijder' | null>(null)

  function handleDrop(e: React.DragEvent, doel: 'gedaan' | 'verwijder') {
    e.preventDefault()
    e.stopPropagation()
    const id = e.dataTransfer.getData('text/plain')
    setBoven(null)
    if (!id) return
    if (doel === 'gedaan') onGedaan(id)
    else onVerwijder(id)
  }

  if (!actief) return null

  return (
    <div className="sleep-acties" role="presentation">
      <div
        className={cn('sleep-zone is-gedaan', boven === 'gedaan' && 'is-boven')}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setBoven('gedaan') }}
        onDragLeave={() => setBoven((b) => (b === 'gedaan' ? null : b))}
        onDrop={(e) => handleDrop(e, 'gedaan')}
      >
        <Check className="w-4 h-4" strokeWidth={2.5} />
        <span>Gedaan<span className="sleep-punt">.</span></span>
      </div>

      <div
        className={cn('sleep-zone is-verwijder', boven === 'verwijder' && 'is-boven')}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setBoven('verwijder') }}
        onDragLeave={() => setBoven((b) => (b === 'verwijder' ? null : b))}
        onDrop={(e) => handleDrop(e, 'verwijder')}
      >
        <Trash2 className="w-4 h-4" strokeWidth={2.2} />
        <span>Verwijderen</span>
      </div>
    </div>
  )
}
