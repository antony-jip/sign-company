import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createProject, getKlanten } from '@/services/supabaseService'
import type { Klant } from '@/types'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const inputClass = 'w-full h-9 px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-petrol/20 focus:border-petrol'

export function NieuwProjectModal({ open, onOpenChange }: Props) {
  const navigate = useNavigate()
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [klantId, setKlantId] = useState('')
  const [naam, setNaam] = useState('')
  const [deadline, setDeadline] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      getKlanten().then(setKlanten).catch(() => {})
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!naam.trim()) return

    setSaving(true)
    try {
      const project = await createProject({
        klant_id: klantId || '',
        naam: naam.trim(),
        beschrijving: '',
        status: 'actief',
        prioriteit: 'medium',
        budget: 0,
        besteed: 0,
        voortgang: 0,
        team_leden: [],
        eind_datum: deadline || undefined,
      })
      toast.success('Project aangemaakt')
      onOpenChange(false)
      setKlantId('')
      setNaam('')
      setDeadline('')
      navigate(`/projecten/${project.id}`)
    } catch {
      toast.error('Kon project niet aanmaken')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-4 gap-2">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-base">Nieuw project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex gap-3">
            <div className="flex-[2] min-w-0">
              <label className="text-[10px] text-muted-foreground mb-1 block">Klant</label>
              <select
                value={klantId}
                onChange={e => setKlantId(e.target.value)}
                className={inputClass}
              >
                <option value="">Selecteer klant (optioneel)...</option>
                {klanten.map(k => (
                  <option key={k.id} value={k.id}>{k.bedrijfsnaam}</option>
                ))}
              </select>
            </div>
            <div className="flex-[3] min-w-0">
              <label className="text-[10px] text-muted-foreground mb-1 block">Projectnaam</label>
              <input
                type="text"
                value={naam}
                onChange={e => setNaam(e.target.value)}
                placeholder="Bijv. Signing hoofdkantoor"
                autoFocus
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex gap-3 items-end">
            <div className="flex-[2] min-w-0">
              <label className="text-[10px] text-muted-foreground mb-1 block">Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </div>
            <div className="flex-[3] min-w-0 flex justify-end">
              <button
                type="submit"
                disabled={!naam.trim() || saving}
                className="h-9 px-4 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                style={{ backgroundColor: '#1A535C' }}
              >
                {saving ? 'Aanmaken...' : 'Project aanmaken'}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
