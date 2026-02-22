import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createProject, getKlanten } from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import type { Klant } from '@/types'
import { toast } from 'sonner'
import { ArrowLeft, Save } from 'lucide-react'
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

export function ProjectCreate() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [klanten, setKlanten] = useState<Klant[]>([])
  const [loading, setLoading] = useState(false);

  const [naam, setNaam] = useState('');
  const [beschrijving, setBeschrijving] = useState('');
  const [klantId, setKlantId] = useState('');
  const [status, setStatus] = useState<'gepland' | 'actief' | 'in-review' | 'afgerond' | 'on-hold'>('gepland');
  const [prioriteit, setPrioriteit] = useState<'laag' | 'medium' | 'hoog' | 'kritiek'>('medium');
  const [startDatum, setStartDatum] = useState(() => new Date().toISOString().split('T')[0]);
  const [eindDatum, setEindDatum] = useState('');
  const [budget, setBudget] = useState('');
  const [teamLeden, setTeamLeden] = useState('');
  const [type, setType] = useState('');
  const [fase, setFase] = useState('ontwerp');

  useEffect(() => {
    const fetchKlanten = async () => {
      try {
        const data = await getKlanten();
        setKlanten(data);
      } catch (error) {
        logger.error('Fout bij ophalen klanten:', error);
      }
    };
    fetchKlanten();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

    setLoading(true);

    try {
      const selectedKlant = klanten.find(k => k.id === klantId);
      const teamLedenArray = teamLeden
        .split(',')
        .map((lid) => lid.trim())
        .filter((lid) => lid.length > 0);

      await createProject({
        user_id: user.id,
        klant_id: klantId,
        klant_naam: selectedKlant?.bedrijfsnaam || selectedKlant?.contactpersoon || '',
        naam: naam.trim(),
        beschrijving: beschrijving.trim(),
        status,
        prioriteit,
        start_datum: startDatum,
        eind_datum: eindDatum,
        budget: parseFloat(budget) || 0,
        besteed: 0,
        voortgang: 0,
        team_leden: teamLedenArray,
        type: type || undefined,
        fase: fase || undefined,
      });

      toast.success('Project succesvol aangemaakt');
      navigate('/projecten');
    } catch (error) {
      logger.error('Fout bij aanmaken project:', error);
      toast.error('Er is iets misgegaan bij het aanmaken van het project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/projecten')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold font-display">Nieuw Project</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projectgegevens</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="naam">Projectnaam *</Label>
              <Input
                id="naam"
                value={naam}
                onChange={(e) => setNaam(e.target.value)}
                placeholder="Voer de projectnaam in"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="beschrijving">Beschrijving</Label>
              <Textarea
                id="beschrijving"
                value={beschrijving}
                onChange={(e) => setBeschrijving(e.target.value)}
                placeholder="Beschrijf het project..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="klant">Klant</Label>
              <Select value={klantId} onValueChange={setKlantId}>
                <SelectTrigger>
                  <SelectValue placeholder={klanten.length === 0 ? 'Geen klanten beschikbaar' : 'Selecteer een klant'} />
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(value: typeof status) => setStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                <Label htmlFor="prioriteit">Prioriteit</Label>
                <Select value={prioriteit} onValueChange={(value: typeof prioriteit) => setPrioriteit(value)}>
                  <SelectTrigger>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="type">Project type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer type" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectTypeOpties.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fase">Productiefase</Label>
                <Select value={fase} onValueChange={setFase}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
                <Input
                  id="startDatum"
                  type="date"
                  value={startDatum}
                  onChange={(e) => setStartDatum(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eindDatum">Einddatum</Label>
                <Input
                  id="eindDatum"
                  type="date"
                  value={eindDatum}
                  onChange={(e) => setEindDatum(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">Budget (&euro;)</Label>
              <Input
                id="budget"
                type="number"
                min="0"
                step="0.01"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="teamLeden">Team leden</Label>
              <Input
                id="teamLeden"
                value={teamLeden}
                onChange={(e) => setTeamLeden(e.target.value)}
                placeholder="Naam 1, Naam 2, Naam 3"
              />
              <p className="text-sm text-muted-foreground">
                Voer teamleden in, gescheiden door komma's
              </p>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Opslaan...' : 'Project Opslaan'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
