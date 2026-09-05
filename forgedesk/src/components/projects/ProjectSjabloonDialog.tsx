import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { LayoutTemplate, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { kopieerProject } from '@/services/projectService'
import { logCreate } from '@/utils/auditLogger'
import { logger } from '@/utils/logger'
import type { Project } from '@/types'

interface ProjectSjabloonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project
  userId: string
  aantalTaken: number
}

/** Slaat een project op als sjabloon: kopie zonder klant en datums, met de taken. */
export function ProjectSjabloonDialog({ open, onOpenChange, project, userId, aantalTaken }: ProjectSjabloonDialogProps) {
  const navigate = useNavigate()
  const [naam, setNaam] = useState('')
  const [bezig, setBezig] = useState(false)

  useEffect(() => {
    if (open) setNaam(project.naam)
  }, [open, project.naam])

  const opslaan = async () => {
    const sjabloonNaam = naam.trim()
    if (!sjabloonNaam) return
    setBezig(true)
    try {
      const { project: sjabloon, taken } = await kopieerProject(project.id, {
        user_id: userId,
        naam: sjabloonNaam,
        klant_id: '',
        is_template: true,
        status: 'gepland',
        start_datum: undefined,
        eind_datum: undefined,
        contactpersoon_id: undefined,
        vestiging_id: undefined,
        vestiging_naam: undefined,
      })
      logCreate({ user: { id: userId }, entityType: 'project', entityId: sjabloon.id })
      for (const taak of taken) logCreate({ user: { id: userId }, entityType: 'taak', entityId: taak.id })
      toast.success(`Sjabloon "${sjabloonNaam}" opgeslagen met ${taken.length} taken`, {
        action: { label: 'Bekijken', onClick: () => navigate(`/projecten/${sjabloon.id}`) },
      })
      onOpenChange(false)
    } catch (err) {
      logger.error('Sjabloon opslaan mislukt:', err)
      toast.error('Kon sjabloon niet opslaan')
    } finally {
      setBezig(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-petrol" />
            Opslaan als sjabloon
          </DialogTitle>
          <DialogDescription>
            Beschrijving, budget, team en {aantalTaken} taken gaan mee. Klant, datums en uren niet.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="sjabloon-naam">Naam van het sjabloon</Label>
          <Input
            id="sjabloon-naam"
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void opslaan() } }}
            placeholder="Bijv. Gevelbelettering standaard"
            className="h-11"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={bezig}>Annuleren</Button>
          <Button onClick={() => void opslaan()} disabled={bezig || !naam.trim()}>
            {bezig ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <LayoutTemplate className="h-4 w-4 mr-1.5" />}
            {bezig ? 'Opslaan...' : 'Sjabloon opslaan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
