import { useState, useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { createTaak, getProjecten } from '@/services/supabaseService'
import type { Project } from '@/types'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const inputClass = 'w-full h-9 px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-petrol/20 focus:border-petrol'

export function NieuweTaakModal({ open, onOpenChange }: Props) {
  const [projecten, setProjecten] = useState<Project[]>([])
  const [titel, setTitel] = useState('')
  const [projectId, setProjectId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      getProjecten().then(p => setProjecten(p.filter(pr => pr.status === 'actief' || pr.status === 'gepland'))).catch(() => {})
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titel.trim()) return

    setSaving(true)
    try {
      await createTaak({
        titel: titel.trim(),
        beschrijving: '',
        project_id: projectId || undefined,
        status: 'todo',
        prioriteit: 'medium',
        toegewezen_aan: '',
        geschatte_tijd: 0,
        bestede_tijd: 0,
      })
      toast.success('Taak toegevoegd')
      onOpenChange(false)
      setTitel('')
      setProjectId('')
    } catch {
      toast.error('Kon taak niet toevoegen')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-3 gap-0">
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          <div className="flex-[4] min-w-0">
            <input
              type="text"
              value={titel}
              onChange={e => setTitel(e.target.value)}
              placeholder="Wat moet er gedaan worden?"
              autoFocus
              className={inputClass}
            />
          </div>
          <div className="flex-[2] min-w-0">
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className={inputClass}
            >
              <option value="">Geen project</option>
              {projecten.map(p => (
                <option key={p.id} value={p.id}>{p.naam}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={!titel.trim() || saving}
            className="h-9 px-4 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
            style={{ backgroundColor: '#1A535C' }}
          >
            {saving ? 'Toevoegen...' : 'Toevoegen'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
