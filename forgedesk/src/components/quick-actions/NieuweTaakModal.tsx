import { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import { logger } from '@/utils/logger'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { createTaak, getProjecten, getMedewerkers } from '@/services/supabaseService'
import type { Project, Medewerker } from '@/types'
import { toast } from 'sonner'
import { MedewerkerSelector } from '@/components/shared/MedewerkerSelector'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NieuweTaakModal({ open, onOpenChange }: Props) {
  const [projecten, setProjecten] = useState<Project[]>([])
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>([])
  const [titel, setTitel] = useState('')
  const [projectId, setProjectId] = useState('')
  const [toegewezenAan, setToegewezenAan] = useState('')
  const [deadline, setDeadline] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      getProjecten().then(p => setProjecten(p.filter(pr => pr.status === 'actief' || pr.status === 'gepland'))).catch(() => {})
      getMedewerkers().then(m => setMedewerkers(m.filter(mw => mw.status === 'actief'))).catch(() => {})
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
        toegewezen_aan: toegewezenAan || '',
        deadline: deadline || new Date().toISOString().split('T')[0],
        geschatte_tijd: 0,
        bestede_tijd: 0,
      })
      toast.success('Taak toegevoegd')
      onOpenChange(false)
      setTitel('')
      setProjectId('')
      setToegewezenAan('')
      setDeadline('')
    } catch (err) {
      logger.error('Taak toevoegen mislukt:', err)
      toast.error('Kon taak niet toevoegen')
    } finally {
      setSaving(false)
    }
  }

  const selectClass = 'h-9 px-3 py-1.5 text-[13px] border border-[#EBEBEB] rounded-lg bg-[#F8F7F5] focus:outline-none focus:ring-2 focus:ring-[#1A535C]/20 focus:border-[#1A535C] text-[#4A4A46] appearance-none'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-5 gap-0">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={titel}
            onChange={e => setTitel(e.target.value)}
            placeholder="Wat moet er gedaan worden?"
            autoFocus
            className="w-full h-11 px-4 text-[15px] border border-[#EBEBEB] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1A535C]/20 focus:border-[#1A535C] placeholder:text-[#B0ADA8]"
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <select
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className={`w-full ${selectClass}`}
              >
                <option value="">Geen project</option>
                {projecten.map(p => (
                  <option key={p.id} value={p.id}>{p.naam}</option>
                ))}
              </select>
            </div>

            <MedewerkerSelector
              mode="single"
              medewerkers={medewerkers}
              value={toegewezenAan || null}
              onChange={(v) => setToegewezenAan(v ?? '')}
              valueKind="naam"
              trigger="input"
              allLabel="Niet toegewezen"
              placeholder="Zoek medewerker…"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9B9B95] pointer-events-none" />
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className={`w-full pl-8 ${selectClass} font-mono`}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <button
              type="submit"
              disabled={!titel.trim() || saving}
              className="h-9 px-5 text-[13px] font-semibold text-white rounded-xl transition-all duration-150 disabled:opacity-50 whitespace-nowrap shrink-0 bg-[#1A535C] hover:bg-[#16454D] shadow-sm hover:shadow active:scale-[0.98]"
            >
              {saving ? 'Toevoegen...' : 'Toevoegen'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
