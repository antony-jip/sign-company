import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createProject, getKlanten } from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import type { Klant } from '@/types'
import { toast } from 'sonner'
import { ArrowLeft, Save, FolderKanban, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { logger } from '../../utils/logger'

export function ProjectCreate() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const paramKlantId = searchParams.get('klant_id') || ''

  const [klanten, setKlanten] = useState<Klant[]>([])
  const [loading, setLoading] = useState(false)

  const [naam, setNaam] = useState('')
  const [beschrijving, setBeschrijving] = useState('')
  const [klantId, setKlantId] = useState(paramKlantId)
  const [contactpersoonId, setContactpersoonId] = useState('')
  const [vestigingId, setVestigingId] = useState('')
  const [status, setStatus] = useState<'gepland' | 'actief' | 'in-review' | 'afgerond' | 'on-hold' | 'te-factureren'>('gepland')
  const [prioriteit, setPrioriteit] = useState<'laag' | 'medium' | 'hoog' | 'kritiek'>('medium')
  const [startDatum, setStartDatum] = useState(() => new Date().toISOString().split('T')[0])
  const [eindDatum, setEindDatum] = useState('')
  const [budget, setBudget] = useState('')
  const [teamLeden, setTeamLeden] = useState('')

  useEffect(() => {
    const fetchKlanten = async () => {
      try {
        const data = await getKlanten()
        setKlanten(data)
      } catch (error) {
        logger.error('Fout bij ophalen klanten:', error)
      }
    }
    fetchKlanten()
  }, [])

  const geselecteerdeKlant = useMemo(() => {
    return klanten.find((k) => k.id === klantId)
  }, [klanten, klantId])

  const contactpersonen = useMemo(() => {
    return geselecteerdeKlant?.contactpersonen || []
  }, [geselecteerdeKlant])

  const vestigingen = useMemo(() => {
    return geselecteerdeKlant?.vestigingen || []
  }, [geselecteerdeKlant])

  // Reset contactpersoon + vestiging when klant changes
  useEffect(() => {
    setContactpersoonId('')
    setVestigingId('')
  }, [klantId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!naam.trim()) {
      toast.error('Projectnaam is verplicht')
      return
    }

    if (!user) {
      toast.error('Je moet ingelogd zijn om een project aan te maken')
      return
    }

    if (eindDatum && startDatum && eindDatum < startDatum) {
      toast.error('Einddatum kan niet voor de startdatum liggen')
      return
    }

    if (budget && parseFloat(budget) < 0) {
      toast.error('Budget kan niet negatief zijn')
      return
    }

    setLoading(true)

    try {
      const teamLedenArray = teamLeden
        .split(',')
        .map((lid) => lid.trim())
        .filter((lid) => lid.length > 0)

      await createProject({
        user_id: user.id,
        klant_id: klantId,
        naam: naam.trim(),
        beschrijving: beschrijving.trim(),
        status,
        prioriteit,
        start_datum: startDatum || undefined,
        eind_datum: eindDatum || undefined,
        budget: parseFloat(budget) || 0,
        besteed: 0,
        voortgang: 0,
        team_leden: teamLedenArray,
        contactpersoon_id: contactpersoonId || undefined,
        vestiging_id: vestigingId || undefined,
        vestiging_naam: vestigingId ? vestigingen.find((v) => v.id === vestigingId)?.naam : undefined,
      })

      toast.success('Project succesvol aangemaakt')
      navigate('/projecten')
    } catch (error) {
      logger.error('Fout bij aanmaken project:', error)
      toast.error('Er is iets misgegaan bij het aanmaken van het project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/projecten')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center">
          <FolderKanban className="h-4 w-4 text-white" />
        </div>
        <h1 className="text-lg font-bold text-foreground">Nieuw project</h1>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Project info */}
        <div className="rounded-xl border border-border dark:border-border bg-white dark:bg-foreground p-5 mb-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="naam" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Projectnaam *
              </Label>
              <Input
                id="naam"
                value={naam}
                onChange={(e) => setNaam(e.target.value)}
                placeholder="Bijv. Gevelbelettering Bakkerij Jansen"
                className="h-9"
                required
              />
            </div>

            <div>
              <Label htmlFor="beschrijving" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Beschrijving
              </Label>
              <Textarea
                id="beschrijving"
                value={beschrijving}
                onChange={(e) => setBeschrijving(e.target.value)}
                placeholder="Korte omschrijving van het project..."
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
        </div>

        {/* Klant + Contactpersoon */}
        <div className="rounded-xl border border-border dark:border-border bg-white dark:bg-foreground p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Klant & Contact</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="klant" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Klant
              </Label>
              <Select value={klantId} onValueChange={setKlantId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={klanten.length === 0 ? 'Geen klanten' : 'Selecteer klant'} />
                </SelectTrigger>
                <SelectContent>
                  {klanten.length === 0 ? (
                    <SelectItem value="_empty" disabled>Voeg eerst een klant toe</SelectItem>
                  ) : klanten.map((klant) => (
                    <SelectItem key={klant.id} value={klant.id}>
                      {klant.bedrijfsnaam || klant.contactpersoon}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="contactpersoon" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Contactpersoon
              </Label>
              <Select
                value={contactpersoonId}
                onValueChange={setContactpersoonId}
                disabled={!klantId || contactpersonen.length === 0}
              >
                <SelectTrigger className="h-9">
                  <SelectValue
                    placeholder={
                      !klantId
                        ? 'Selecteer eerst een klant'
                        : contactpersonen.length === 0
                          ? 'Geen contactpersonen'
                          : 'Selecteer contactpersoon'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {contactpersonen.map((cp) => (
                    <SelectItem key={cp.id} value={cp.id}>
                      <span>{cp.naam}</span>
                      {cp.functie && <span className="text-muted-foreground ml-1.5">({cp.functie})</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Vestiging - alleen tonen als klant meerdere vestigingen heeft */}
            {vestigingen.length > 0 && (
              <div className="sm:col-span-2">
                <Label htmlFor="vestiging" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Vestiging
                </Label>
                <Select value={vestigingId} onValueChange={setVestigingId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecteer vestiging (optioneel)" />
                  </SelectTrigger>
                  <SelectContent>
                    {vestigingen.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        <span>{v.naam}</span>
                        {v.stad && <span className="text-muted-foreground ml-1.5">({v.stad})</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Status + Prioriteit + Datums */}
        <div className="rounded-xl border border-border dark:border-border bg-white dark:bg-foreground p-5 mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</Label>
              <Select value={status} onValueChange={(value: typeof status) => setStatus(value)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gepland">Gepland</SelectItem>
                  <SelectItem value="actief">Actief</SelectItem>
                  <SelectItem value="in-review">In Review</SelectItem>
                  <SelectItem value="afgerond">Afgerond</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  <SelectItem value="te-factureren">Te factureren</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Prioriteit</Label>
              <Select value={prioriteit} onValueChange={(value: typeof prioriteit) => setPrioriteit(value)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="laag">Laag</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hoog">Hoog</SelectItem>
                  <SelectItem value="kritiek">Kritiek</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Startdatum</Label>
              <Input
                type="date"
                value={startDatum}
                onChange={(e) => setStartDatum(e.target.value)}
                className="h-9"
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Einddatum</Label>
              <Input
                type="date"
                value={eindDatum}
                onChange={(e) => setEindDatum(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </div>

        {/* Budget + Team */}
        <div className="rounded-xl border border-border dark:border-border bg-white dark:bg-foreground p-5 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Budget (&euro;)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="0,00"
                className="h-9"
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Teamleden</Label>
              <Input
                value={teamLeden}
                onChange={(e) => setTeamLeden(e.target.value)}
                placeholder="Jan, Piet, Klaas"
                className="h-9"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate('/projecten')}
            className="text-muted-foreground"
          >
            Annuleren
          </Button>
          <Button type="submit" size="sm" disabled={loading} className="bg-gradient-to-r from-accent to-primary border-0">
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {loading ? 'Opslaan...' : 'Project aanmaken'}
          </Button>
        </div>
      </form>
    </div>
  )
}
