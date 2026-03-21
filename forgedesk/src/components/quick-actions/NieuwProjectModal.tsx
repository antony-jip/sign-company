import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { createProject, getKlanten } from '@/services/supabaseService'
import type { Klant } from '@/types'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NieuwProjectModal({ open, onOpenChange }: Props) {
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [klantId, setKlantId] = useState('')
  const [naam, setNaam] = useState('')
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
      await createProject({
        klant_id: klantId || '',
        naam: naam.trim(),
        beschrijving: '',
        status: 'actief',
        prioriteit: 'medium',
        budget: 0,
        besteed: 0,
        voortgang: 0,
        team_leden: [],
      })
      toast.success('Project aangemaakt')
      onOpenChange(false)
      setKlantId('')
      setNaam('')
    } catch (err) {
      toast.error('Kon project niet aanmaken')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Nieuw project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Klant</label>
            <select
              value={klantId}
              onChange={e => setKlantId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
            >
              <option value="">Selecteer klant (optioneel)...</option>
              {klanten.map(k => (
                <option key={k.id} value={k.id}>{k.bedrijfsnaam}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Projectnaam *</label>
            <input
              type="text"
              value={naam}
              onChange={e => setNaam(e.target.value)}
              placeholder="Bijv. Signing hoofdkantoor"
              autoFocus
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
            />
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
              disabled={!naam.trim() || saving}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#1A535C' }}
            >
              {saving ? 'Aanmaken...' : 'Aanmaken'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
