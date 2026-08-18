import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { logger } from '../../utils/logger'
import { createKlant, createProject } from '@/services/supabaseService'

interface VerwerkAanvraagDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bron: {
    naam?: string
    email?: string
    telefoon?: string
    dienst?: string
    bericht?: string
  }
}

export function VerwerkAanvraagDialog({ open, onOpenChange, bron }: VerwerkAanvraagDialogProps) {
  const navigate = useNavigate()
  const [bedrijfsnaam, setBedrijfsnaam] = useState('')
  const [contactpersoon, setContactpersoon] = useState('')
  const [email, setEmail] = useState('')
  const [telefoon, setTelefoon] = useState('')
  const [metProject, setMetProject] = useState(false)
  const [projectNaam, setProjectNaam] = useState('')
  const [isBezig, setIsBezig] = useState(false)

  useEffect(() => {
    if (!open) return
    setBedrijfsnaam(bron.naam || '')
    setContactpersoon(bron.naam || '')
    setEmail(bron.email || '')
    setTelefoon(bron.telefoon || '')
    setMetProject(false)
    setProjectNaam(bron.dienst ? `${bron.dienst} ${bron.naam || ''}`.trim() : '')
  }, [open, bron])

  const handleAanmaken = async () => {
    if (!bedrijfsnaam.trim()) {
      toast.error('Vul een bedrijfsnaam in')
      return
    }
    if (metProject && !projectNaam.trim()) {
      toast.error('Vul een projectnaam in')
      return
    }
    setIsBezig(true)
    try {
      const klant = await createKlant({
        bedrijfsnaam: bedrijfsnaam.trim(),
        contactpersoon: contactpersoon.trim(),
        email: email.trim(),
        telefoon: telefoon.trim(),
        adres: '',
        postcode: '',
        stad: '',
        land: 'Nederland',
        website: '',
        debiteurennummer: '',
        kvk_nummer: '',
        btw_nummer: '',
        status: 'prospect',
        tags: [],
        notities: bron.bericht ? `Via signcompany.nl:\n${bron.bericht}` : '',
        contactpersonen: [],
      })
      if (metProject) {
        const project = await createProject({
          klant_id: klant.id,
          naam: projectNaam.trim(),
          beschrijving: bron.bericht || '',
          status: 'te-plannen',
          prioriteit: 'medium',
          budget: 0,
          besteed: 0,
          voortgang: 0,
          team_leden: [],
        })
        toast.success('Klant en project aangemaakt')
        onOpenChange(false)
        navigate(`/projecten/${project.id}`)
      } else {
        toast.success('Klant aangemaakt')
        onOpenChange(false)
        navigate(`/klanten/${klant.id}`)
      }
    } catch (err) {
      logger.error('Verwerken aanvraag mislukt:', err)
      toast.error('Aanmaken mislukt, probeer het opnieuw')
    } finally {
      setIsBezig(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Verwerk tot klant</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="vw-bedrijf">Bedrijfsnaam</Label>
            <Input id="vw-bedrijf" value={bedrijfsnaam} onChange={(e) => setBedrijfsnaam(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vw-contact">Contactpersoon</Label>
            <Input id="vw-contact" value={contactpersoon} onChange={(e) => setContactpersoon(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="vw-email">E-mail</Label>
              <Input id="vw-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vw-tel">Telefoon</Label>
              <Input id="vw-tel" value={telefoon} onChange={(e) => setTelefoon(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Checkbox id="vw-project" checked={metProject} onCheckedChange={(v) => setMetProject(v === true)} />
            <Label htmlFor="vw-project" className="cursor-pointer">Maak ook een project aan</Label>
          </div>
          {metProject && (
            <div className="space-y-1.5">
              <Label htmlFor="vw-projectnaam">Projectnaam</Label>
              <Input id="vw-projectnaam" value={projectNaam} onChange={(e) => setProjectNaam(e.target.value)} />
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            De klant komt erin als prospect; het bericht van de aanvraag gaat mee in de notities.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isBezig}>Annuleren</Button>
          <Button onClick={handleAanmaken} disabled={isBezig} className="gap-1 bg-flame hover:bg-flame/90 text-white">
            {isBezig && <Loader2 className="h-4 w-4 animate-spin" />}
            {metProject ? 'Klant + project aanmaken' : 'Klant aanmaken'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
