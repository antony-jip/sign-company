import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProject, updateProject, getKlanten } from '@/services/supabaseService'
import type { Project, Klant } from '@/types'
import { toast } from 'sonner'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { projectTypeOpties, productieFasen } from '@/constants/projectConstants'
import { logger } from '../../utils/logger'

export function ProjectEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Editable fields
  const [naam, setNaam] = useState('')
  const [beschrijving, setBeschrijving] = useState('')
  const [klantId, setKlantId] = useState('')
  const [status, setStatus] = useState<Project['status']>('gepland')
  const [prioriteit, setPrioriteit] = useState<Project['prioriteit']>('medium')
  const [startDatum, setStartDatum] = useState('')
  const [eindDatum, setEindDatum] = useState('')
  const [budget, setBudget] = useState('')
  const [budgetWaarschuwingPct, setBudgetWaarschuwingPct] = useState('')
  const [teamLeden, setTeamLeden] = useState('')
  const [type, setType] = useState('')
  const [fase, setFase] = useState('')

  useEffect(() => {
    async function fetchData() {
      if (!id) return
      setLoading(true)
      try {
        const [projectData, klantenData] = await Promise.all([
          getProject(id),
          getKlanten(),
        ])
        if (projectData) {
          setProject(projectData)
          setNaam(projectData.naam)
          setBeschrijving(projectData.beschrijving || '')
          setKlantId(projectData.klant_id || '')
          setStatus(projectData.status)
          setPrioriteit(projectData.prioriteit)
          setStartDatum(projectData.start_datum || '')
          setEindDatum(projectData.eind_datum || '')
          setBudget(projectData.budget ? String(projectData.budget) : '')
          setBudgetWaarschuwingPct(projectData.budget_waarschuwing_pct ? String(projectData.budget_waarschuwing_pct) : '80')
          setTeamLeden(projectData.team_leden?.join(', ') || '')
          setType(projectData.type || '')
          setFase(projectData.fase || '')
        }
        setKlanten(klantenData || [])
      } catch (err) {
        logger.error('Fout bij laden project:', err)
        toast.error('Kon project niet laden')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !naam.trim()) {
      toast.error('Projectnaam is verplicht')
      return
    }

    if (eindDatum && startDatum && eindDatum < startDatum) {
      toast.error('Einddatum kan niet voor de startdatum liggen')
      return
    }

    setSaving(true)
    try {
      const selectedKlant = klanten.find(k => k.id === klantId)
      const teamLedenArray = teamLeden
        .split(',')
        .map((lid) => lid.trim())
        .filter((lid) => lid.length > 0)

      await updateProject(id, {
        naam: naam.trim(),
        beschrijving: beschrijving.trim(),
        klant_id: klantId,
        klant_naam: selectedKlant?.bedrijfsnaam || project?.klant_naam,
        status,
        prioriteit,
        start_datum: startDatum,
        eind_datum: eindDatum,
        budget: parseFloat(budget) || 0,
        budget_waarschuwing_pct: parseInt(budgetWaarschuwingPct) || 80,
        team_leden: teamLedenArray,
        type: type || undefined,
        fase: fase || undefined,
      })

      toast.success('Project bijgewerkt')
      navigate(`/projecten/${id}`)
    } catch (err) {
      logger.error('Fout bij bijwerken project:', err)
      toast.error('Kon project niet bijwerken')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Card>
          <CardContent className="py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground mt-4">Project laden...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/projecten')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Card>
          <CardContent className="py-16 text-center">
            <h3 className="text-lg font-medium">Project niet gevonden</h3>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/projecten/${id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold font-display">Project Bewerken</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projectgegevens</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="naam">Projectnaam *</Label>
              <Input id="naam" value={naam} onChange={(e) => setNaam(e.target.value)} placeholder="Voer de projectnaam in" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="beschrijving">Beschrijving / Briefing</Label>
              <Textarea id="beschrijving" value={beschrijving} onChange={(e) => setBeschrijving(e.target.value)} placeholder="Beschrijf het project..." rows={4} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="klant">Klant</Label>
              <Select value={klantId} onValueChange={setKlantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer een klant" />
                </SelectTrigger>
                <SelectContent>
                  {klanten.map((klant) => (
                    <SelectItem key={klant.id} value={klant.id}>
                      {klant.bedrijfsnaam || klant.contactpersoon}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v: Project['status']) => setStatus(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gepland">Gepland</SelectItem>
                    <SelectItem value="actief">Actief</SelectItem>
                    <SelectItem value="in-review">In Review</SelectItem>
                    <SelectItem value="afgerond">Afgerond</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prioriteit</Label>
                <Select value={prioriteit} onValueChange={(v: Project['prioriteit']) => setPrioriteit(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="laag">Laag</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hoog">Hoog</SelectItem>
                    <SelectItem value="kritiek">Kritiek</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Project type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue placeholder="Selecteer type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Geen type</SelectItem>
                    {projectTypeOpties.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Productiefase</Label>
                <Select value={fase} onValueChange={setFase}>
                  <SelectTrigger><SelectValue placeholder="Selecteer fase" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Geen fase</SelectItem>
                    {productieFasen.map((f) => (
                      <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="startDatum">Startdatum</Label>
                <Input id="startDatum" type="date" value={startDatum} onChange={(e) => setStartDatum(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eindDatum">Einddatum</Label>
                <Input id="eindDatum" type="date" value={eindDatum} onChange={(e) => setEindDatum(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="budget">Budget (&euro;)</Label>
                <Input id="budget" type="number" min="0" step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budgetPct">Budget waarschuwing (%)</Label>
                <Input id="budgetPct" type="number" min="0" max="100" value={budgetWaarschuwingPct}
                  onChange={(e) => setBudgetWaarschuwingPct(e.target.value)} placeholder="80" />
                <p className="text-xs text-muted-foreground">Waarschuw bij dit percentage budgetverbruik</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="teamLeden">Team leden</Label>
              <Input id="teamLeden" value={teamLeden} onChange={(e) => setTeamLeden(e.target.value)} placeholder="Naam 1, Naam 2, Naam 3" />
              <p className="text-sm text-muted-foreground">Voer teamleden in, gescheiden door komma's</p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate(`/projecten/${id}`)}>Annuleren</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {saving ? 'Opslaan...' : 'Wijzigingen Opslaan'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
