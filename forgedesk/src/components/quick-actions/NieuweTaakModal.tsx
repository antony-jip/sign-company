import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { createTaak, getProjecten } from '@/services/supabaseService'
import type { Project } from '@/types'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NieuweTaakModal({ open, onOpenChange }: Props) {
  const [projecten, setProjecten] = useState<Project[]>([])
  const [titel, setTitel] = useState('')
  const [projectId, setProjectId] = useState('')
  const [deadline, setDeadline] = useState('')
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
        deadline: deadline || undefined,
        geschatte_tijd: 0,
        bestede_tijd: 0,
      })
      toast.success('Taak toegevoegd')
      onOpenChange(false)
      setTitel('')
      setProjectId('')
      setDeadline('')
    } catch (err) {
      toast.error('Kon taak niet toevoegen')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Nieuwe taak</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Omschrijving *</label>
            <input
              type="text"
              value={titel}
              onChange={e => setTitel(e.target.value)}
              placeholder="Wat moet er gedaan worden?"
              autoFocus
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Project (optioneel)</label>
              <select
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
              >
                <option value="">Geen project</option>
                {projecten.map(p => (
                  <option key={p.id} value={p.id}>{p.naam}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Deadline (optioneel)</label>
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-petrol/20 focus:border-petrol font-mono"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={!titel.trim() || saving}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#1A535C' }}
            >
              {saving ? 'Toevoegen...' : 'Toevoegen'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
