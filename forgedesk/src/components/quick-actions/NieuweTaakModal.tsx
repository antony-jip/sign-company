import { useState, useEffect } from 'react'
import { DatePicker } from '@/components/ui/date-picker'
import { logger } from '@/utils/logger'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { createTaak, getProjecten, getMedewerkers } from '@/services/supabaseService'
import type { Project, Medewerker, Taak } from '@/types'
import { toast } from 'sonner'
import { MedewerkerSelector } from '@/components/shared/MedewerkerSelector'
import { ProjectCombobox } from '@/components/shared/ProjectCombobox'
import { SchattingSelect } from '@/components/shared/TaakVelden'
import { useAuth } from '@/contexts/AuthContext'
import { logCreate } from '@/utils/auditLogger'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Voor schermen die hun eigen takenlijst bijhouden · zonder dit verschijnt
   *  een nieuwe taak pas na een verversing. */
  onCreated?: (taak: Taak) => void
}

export function NieuweTaakModal({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth()
  const [projecten, setProjecten] = useState<Project[]>([])
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>([])
  const [titel, setTitel] = useState('')
  const [projectId, setProjectId] = useState('')
  const [toegewezenAan, setToegewezenAan] = useState('')
  const [deadline, setDeadline] = useState(() => new Date().toISOString().split('T')[0])
  const [schatting, setSchatting] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      getProjecten().then(setProjecten).catch(() => {})
      getMedewerkers().then(m => setMedewerkers(m.filter(mw => mw.status === 'actief'))).catch(() => {})
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titel.trim()) return
    if (!toegewezenAan.trim()) { toast.error('Wijs de taak toe aan een medewerker'); return }

    setSaving(true)
    try {
      const taak = await createTaak({
        titel: titel.trim(),
        beschrijving: '',
        project_id: projectId || undefined,
        status: 'todo',
        prioriteit: 'medium',
        toegewezen_aan: toegewezenAan || '',
        deadline: deadline || new Date().toISOString().split('T')[0],
        geschatte_tijd: schatting,
        bestede_tijd: 0,
      })
      logCreate({ user, medewerkers, entityType: 'taak', entityId: taak.id })
      onCreated?.(taak)
      toast.success('Taak toegevoegd')
      onOpenChange(false)
      setTitel('')
      setProjectId('')
      setToegewezenAan('')
      setDeadline(new Date().toISOString().split('T')[0])
      setSchatting(0)
    } catch (err) {
      logger.error('Taak toevoegen mislukt:', err)
      toast.error('Kon taak niet toevoegen')
    } finally {
      setSaving(false)
    }
  }

  const selectClass = 'h-9 px-3 py-1.5 text-[13px] border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-petrol/20 focus:border-petrol text-foreground/80 appearance-none'

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
            className="w-full h-11 px-4 text-[15px] border border-border rounded-xl bg-card focus:outline-none focus:ring-2 focus:ring-petrol/20 focus:border-petrol placeholder:text-muted-foreground/80"
          />

          <div className="grid grid-cols-2 gap-3">
            <ProjectCombobox
              projecten={projecten}
              value={projectId}
              onChange={setProjectId}
            />

            <MedewerkerSelector
              mode="single"
              medewerkers={medewerkers}
              value={toegewezenAan || null}
              onChange={(v) => setToegewezenAan(v ?? '')}
              valueKind="naam"
              trigger="input"
              allLabel="Kies medewerker"
              placeholder="Zoek medewerker…"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <DatePicker
                value={deadline}
                onChange={v => setDeadline(v)}
                min={new Date().toISOString().split('T')[0]}
                asInput
                className={`w-full ${selectClass} font-mono`}
              />
            </div>

            <SchattingSelect waarde={schatting} onChange={setSchatting} triggerClassName="h-9 flex-shrink-0" />

            <button
              type="submit"
              disabled={!titel.trim() || !toegewezenAan.trim() || saving}
              className="h-9 px-5 text-[13px] font-semibold text-white rounded-xl transition-all duration-150 disabled:opacity-50 whitespace-nowrap shrink-0 bg-petrol hover:bg-[#16454D] shadow-sm hover:shadow active:scale-[0.98]"
            >
              {saving ? 'Toevoegen...' : 'Toevoegen'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
