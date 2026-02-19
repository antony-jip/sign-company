import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Users,
  UserCheck,
  Wrench,
  Euro,
  Plus,
  Search,
  Mail,
  Phone,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import {
  getMedewerkers,
  createMedewerker,
  updateMedewerker,
  deleteMedewerker,
} from '@/services/supabaseService';
import type { Medewerker } from '@/types';
import { cn, getInitials } from '@/lib/utils';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Demo data -- used when the database returns no records
// ---------------------------------------------------------------------------
const DEMO_MEDEWERKERS: Medewerker[] = [
  {
    id: 'demo-1',
    user_id: 'u-1',
    naam: 'Jan de Vries',
    email: 'jan@signbedrijf.nl',
    telefoon: '06-12345678',
    functie: 'Directeur',
    afdeling: 'Management',
    avatar_url: '',
    uurtarief: 95,
    status: 'actief',
    rol: 'admin',
    vaardigheden: ['Bedrijfsvoering', 'Klantenrelaties', 'Financieel beheer'],
    start_datum: '2018-03-01',
    notities: 'Oprichter en eigenaar van het bedrijf.',
    created_at: '2018-03-01T00:00:00Z',
    updated_at: '2024-11-10T00:00:00Z',
  },
  {
    id: 'demo-2',
    user_id: 'u-2',
    naam: 'Lisa Bakker',
    email: 'lisa@signbedrijf.nl',
    telefoon: '06-23456789',
    functie: 'Grafisch Ontwerper',
    afdeling: 'Design',
    avatar_url: '',
    uurtarief: 65,
    status: 'actief',
    rol: 'productie',
    vaardigheden: ['Adobe Illustrator', 'Sign ontwerp', 'Vinyl wrapping design', 'LED-ontwerp'],
    start_datum: '2020-06-15',
    notities: 'Specialist in grootformaat print en signing design.',
    created_at: '2020-06-15T00:00:00Z',
    updated_at: '2024-10-05T00:00:00Z',
  },
  {
    id: 'demo-3',
    user_id: 'u-3',
    naam: 'Pieter Jansen',
    email: 'pieter@signbedrijf.nl',
    telefoon: '06-34567890',
    functie: 'Monteur',
    afdeling: 'Montage',
    avatar_url: '',
    uurtarief: 55,
    status: 'actief',
    rol: 'monteur',
    vaardigheden: ['Hoogwerker', 'Lichtreclame montage', 'Gevelreclame', 'VCA gecertificeerd'],
    start_datum: '2019-09-01',
    notities: 'Ervaren monteur, rijbewijs BE.',
    created_at: '2019-09-01T00:00:00Z',
    updated_at: '2024-12-01T00:00:00Z',
  },
  {
    id: 'demo-4',
    user_id: 'u-4',
    naam: 'Sanne Willems',
    email: 'sanne@signbedrijf.nl',
    telefoon: '06-45678901',
    functie: 'Accountmanager',
    afdeling: 'Verkoop',
    avatar_url: '',
    uurtarief: 70,
    status: 'actief',
    rol: 'verkoop',
    vaardigheden: ['Klantadvies', 'Offerte opstellen', 'Signing consultancy', 'CRM'],
    start_datum: '2021-02-01',
    notities: 'Verantwoordelijk voor regio Zuid-Holland.',
    created_at: '2021-02-01T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z',
  },
  {
    id: 'demo-5',
    user_id: 'u-5',
    naam: 'Mohammed El Amrani',
    email: 'mohammed@signbedrijf.nl',
    telefoon: '06-56789012',
    functie: 'Monteur',
    afdeling: 'Montage',
    avatar_url: '',
    uurtarief: 50,
    status: 'actief',
    rol: 'monteur',
    vaardigheden: ['Folie plakken', 'Autobelettering', 'Raambelettering', 'VCA gecertificeerd'],
    start_datum: '2022-04-11',
    notities: 'Gespecialiseerd in voertuigbelettering.',
    created_at: '2022-04-11T00:00:00Z',
    updated_at: '2025-01-20T00:00:00Z',
  },
  {
    id: 'demo-6',
    user_id: 'u-6',
    naam: 'Kim Mulder',
    email: 'kim@signbedrijf.nl',
    telefoon: '06-67890123',
    functie: 'Productiemedewerker',
    afdeling: 'Productie',
    avatar_url: '',
    uurtarief: 45,
    status: 'inactief',
    rol: 'productie',
    vaardigheden: ['Freesmachine', 'Printer bediening', 'Lamineren', 'Kwaliteitscontrole'],
    start_datum: '2023-01-09',
    notities: 'Momenteel met zwangerschapsverlof.',
    created_at: '2023-01-09T00:00:00Z',
    updated_at: '2025-02-01T00:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
type StatusFilter = 'alle' | 'actief' | 'inactief';
type RolFilter = 'alle' | Medewerker['rol'];

const ROL_OPTIES: { value: Medewerker['rol']; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'medewerker', label: 'Medewerker' },
  { value: 'monteur', label: 'Monteur' },
  { value: 'verkoop', label: 'Verkoop' },
  { value: 'productie', label: 'Productie' },
];

const ROL_KLEUREN: Record<Medewerker['rol'], string> = {
  admin: 'bg-[#CAF7E2]/30 text-[#3D3522] border-[#58B09C]/30',
  medewerker: 'bg-blue-100 text-blue-800 border-blue-200',
  monteur: 'bg-green-100 text-green-800 border-green-200',
  verkoop: 'bg-amber-100 text-amber-800 border-amber-200',
  productie: 'bg-cyan-100 text-cyan-800 border-cyan-200',
};

const ROL_LABELS: Record<Medewerker['rol'], string> = {
  admin: 'Admin',
  medewerker: 'Medewerker',
  monteur: 'Monteur',
  verkoop: 'Verkoop',
  productie: 'Productie',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function avatarColor(naam: string): string {
  let hash = 0;
  for (let i = 0; i < naam.length; i++) {
    hash = naam.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colours = [
    'bg-rose-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-[#58B09C]',
    'bg-[#386150]',
    'bg-[#4A442D]',
    'bg-fuchsia-500',
  ];
  return colours[Math.abs(hash) % colours.length];
}

function blankMedewerker(): Omit<Medewerker, 'id' | 'user_id' | 'created_at' | 'updated_at'> {
  return {
    naam: '',
    email: '',
    telefoon: '',
    functie: '',
    afdeling: '',
    avatar_url: '',
    uurtarief: 0,
    status: 'actief',
    rol: 'medewerker',
    vaardigheden: [],
    start_datum: new Date().toISOString().slice(0, 10),
    notities: '',
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function TeamLayout() {
  // ---- state ---------------------------------------------------------------
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoekterm, setZoekterm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('alle');
  const [rolFilter, setRolFilter] = useState<RolFilter>('alle');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(blankMedewerker());
  const [skillInput, setSkillInput] = useState('');
  const [saving, setSaving] = useState(false);

  // ---- data loading --------------------------------------------------------
  useEffect(() => {
    loadMedewerkers();
  }, []);

  async function loadMedewerkers() {
    setLoading(true);
    try {
      const data = await getMedewerkers();
      if (data && data.length > 0) {
        setMedewerkers(data);
      } else {
        setMedewerkers(DEMO_MEDEWERKERS);
      }
    } catch {
      setMedewerkers(DEMO_MEDEWERKERS);
    } finally {
      setLoading(false);
    }
  }

  // ---- filtered list -------------------------------------------------------
  const gefilterd = useMemo(() => {
    let lijst = [...medewerkers];

    if (statusFilter !== 'alle') {
      lijst = lijst.filter((m) => m.status === statusFilter);
    }
    if (rolFilter !== 'alle') {
      lijst = lijst.filter((m) => m.rol === rolFilter);
    }
    if (zoekterm.trim()) {
      const q = zoekterm.toLowerCase();
      lijst = lijst.filter(
        (m) =>
          m.naam.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.functie.toLowerCase().includes(q)
      );
    }

    return lijst;
  }, [medewerkers, statusFilter, rolFilter, zoekterm]);

  // ---- summary statistics --------------------------------------------------
  const totaal = medewerkers.length;
  const actief = medewerkers.filter((m) => m.status === 'actief').length;
  const monteursActief = medewerkers.filter(
    (m) => m.rol === 'monteur' && m.status === 'actief'
  ).length;
  const gemiddeldUurtarief =
    medewerkers.length > 0
      ? medewerkers.reduce((sum, m) => sum + m.uurtarief, 0) / medewerkers.length
      : 0;

  // ---- dialog helpers ------------------------------------------------------
  function openNieuw() {
    setEditId(null);
    setForm(blankMedewerker());
    setSkillInput('');
    setDialogOpen(true);
  }

  function openBewerken(m: Medewerker) {
    setEditId(m.id);
    setForm({
      naam: m.naam,
      email: m.email,
      telefoon: m.telefoon,
      functie: m.functie,
      afdeling: m.afdeling,
      avatar_url: m.avatar_url,
      uurtarief: m.uurtarief,
      status: m.status,
      rol: m.rol,
      vaardigheden: [...m.vaardigheden],
      start_datum: m.start_datum,
      notities: m.notities,
    });
    setSkillInput('');
    setDialogOpen(true);
  }

  async function handleOpslaan() {
    if (!form.naam.trim() || !form.email.trim()) {
      toast.error('Naam en e-mail zijn verplicht.');
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        const updated = await updateMedewerker(editId, form);
        if (updated) {
          setMedewerkers((prev) =>
            prev.map((m) => (m.id === editId ? { ...m, ...form, updated_at: new Date().toISOString() } : m))
          );
          toast.success('Medewerker bijgewerkt.');
        } else {
          setMedewerkers((prev) =>
            prev.map((m) => (m.id === editId ? { ...m, ...form, updated_at: new Date().toISOString() } : m))
          );
          toast.success('Medewerker bijgewerkt (lokaal).');
        }
      } else {
        const created = await createMedewerker(form);
        if (created) {
          setMedewerkers((prev) => [...prev, created]);
          toast.success('Medewerker toegevoegd.');
        } else {
          const nieuw: Medewerker = {
            ...form,
            id: `local-${Date.now()}`,
            user_id: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setMedewerkers((prev) => [...prev, nieuw]);
          toast.success('Medewerker toegevoegd (lokaal).');
        }
      }
      setDialogOpen(false);
    } catch {
      toast.error('Er is iets misgegaan bij het opslaan.');
    } finally {
      setSaving(false);
    }
  }

  async function handleVerwijderen(id: string) {
    try {
      await deleteMedewerker(id);
    } catch {
      // continue with local deletion
    }
    setMedewerkers((prev) => prev.filter((m) => m.id !== id));
    toast.success('Medewerker verwijderd.');
  }

  function handleSkillInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkills();
    }
  }

  function addSkills() {
    const nieuw = skillInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !form.vaardigheden.includes(s));

    if (nieuw.length > 0) {
      setForm((prev) => ({ ...prev, vaardigheden: [...prev.vaardigheden, ...nieuw] }));
    }
    setSkillInput('');
  }

  function removeSkill(skill: string) {
    setForm((prev) => ({
      ...prev,
      vaardigheden: prev.vaardigheden.filter((v) => v !== skill),
    }));
  }

  // ---- render --------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground">Beheer medewerkers en rollen</p>
        </div>
        <Button onClick={openNieuw}>
          <Plus className="mr-2 h-4 w-4" />
          Nieuwe medewerker
        </Button>
      </div>

      {/* ---- Summary cards ---- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Totaal medewerkers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totaal}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Actief</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actief}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monteurs beschikbaar</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monteursActief}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Gemiddeld uurtarief</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              &euro;{gemiddeldUurtarief.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ---- Search + Filters ---- */}
      <div className="space-y-4">
        {/* Search bar */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoek op naam, e-mail of functie..."
            value={zoekterm}
            onChange={(e) => setZoekterm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex flex-wrap items-center gap-2">
          {(['alle', 'actief', 'inactief'] as StatusFilter[]).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(s)}
              className="capitalize"
            >
              {s === 'alle' ? 'Alle' : s === 'actief' ? 'Actief' : 'Inactief'}
            </Button>
          ))}

          <Separator orientation="vertical" className="mx-1 h-6" />

          {/* Role filter pills */}
          <Button
            variant={rolFilter === 'alle' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setRolFilter('alle')}
          >
            Alle rollen
          </Button>
          {ROL_OPTIES.map((r) => (
            <Button
              key={r.value}
              variant={rolFilter === r.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRolFilter(r.value)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {/* ---- Team grid ---- */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Medewerkers laden...</p>
        </div>
      ) : gefilterd.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Users className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium">Geen medewerkers gevonden</p>
          <p className="text-sm text-muted-foreground">
            Pas je filters aan of voeg een nieuwe medewerker toe.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gefilterd.map((m) => (
            <Card key={m.id} className="relative flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-4 pt-6">
                {/* Top row: avatar + name block */}
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white',
                      avatarColor(m.naam)
                    )}
                  >
                    {getInitials(m.naam)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold">{m.naam}</p>
                    <p className="truncate text-sm text-muted-foreground">{m.functie}</p>
                    <p className="truncate text-sm text-muted-foreground">{m.afdeling}</p>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn('text-xs', ROL_KLEUREN[m.rol])}>
                    {ROL_LABELS[m.rol]}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs',
                      m.status === 'actief'
                        ? 'border-green-200 bg-green-100 text-green-800'
                        : 'border-gray-200 bg-gray-100 text-gray-600'
                    )}
                  >
                    {m.status === 'actief' ? 'Actief' : 'Inactief'}
                  </Badge>
                </div>

                {/* Contact info */}
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{m.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span>{m.telefoon}</span>
                  </div>
                </div>

                {/* Uurtarief */}
                <div className="text-sm">
                  <span className="text-muted-foreground">Uurtarief: </span>
                  <span className="font-medium">&euro;{m.uurtarief.toFixed(2)}</span>
                </div>

                {/* Vaardigheden */}
                {m.vaardigheden.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {m.vaardigheden.map((v) => (
                      <Badge key={v} variant="secondary" className="text-xs font-normal">
                        {v}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-auto flex items-center gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => openBewerken(m)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    Bewerken
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => handleVerwijderen(m.id)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Verwijderen
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ---- Add / Edit Dialog ---- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editId ? 'Medewerker bewerken' : 'Nieuwe medewerker'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Naam */}
            <div className="grid gap-2">
              <Label htmlFor="naam">
                Naam <span className="text-destructive">*</span>
              </Label>
              <Input
                id="naam"
                placeholder="Volledige naam"
                value={form.naam}
                onChange={(e) => setForm((f) => ({ ...f, naam: e.target.value }))}
              />
            </div>

            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="email">
                E-mail <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="naam@bedrijf.nl"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>

            {/* Telefoon */}
            <div className="grid gap-2">
              <Label htmlFor="telefoon">Telefoon</Label>
              <Input
                id="telefoon"
                type="tel"
                placeholder="06-12345678"
                value={form.telefoon}
                onChange={(e) => setForm((f) => ({ ...f, telefoon: e.target.value }))}
              />
            </div>

            {/* Functie + Afdeling */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="functie">Functie</Label>
                <Input
                  id="functie"
                  placeholder="Bijv. Monteur"
                  value={form.functie}
                  onChange={(e) => setForm((f) => ({ ...f, functie: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="afdeling">Afdeling</Label>
                <Input
                  id="afdeling"
                  placeholder="Bijv. Productie"
                  value={form.afdeling}
                  onChange={(e) => setForm((f) => ({ ...f, afdeling: e.target.value }))}
                />
              </div>
            </div>

            {/* Rol */}
            <div className="grid gap-2">
              <Label>Rol</Label>
              <Select
                value={form.rol}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, rol: v as Medewerker['rol'] }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kies een rol" />
                </SelectTrigger>
                <SelectContent>
                  {ROL_OPTIES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Uurtarief */}
            <div className="grid gap-2">
              <Label htmlFor="uurtarief">Uurtarief (&euro;)</Label>
              <Input
                id="uurtarief"
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                value={form.uurtarief || ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, uurtarief: parseFloat(e.target.value) || 0 }))
                }
              />
            </div>

            {/* Status */}
            <div className="flex items-center justify-between">
              <Label htmlFor="status-toggle">Status (actief)</Label>
              <Switch
                id="status-toggle"
                checked={form.status === 'actief'}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, status: checked ? 'actief' : 'inactief' }))
                }
              />
            </div>

            {/* Vaardigheden */}
            <div className="grid gap-2">
              <Label htmlFor="vaardigheden">Vaardigheden</Label>
              <div className="flex gap-2">
                <Input
                  id="vaardigheden"
                  placeholder="Typ en druk op Enter of komma"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={handleSkillInputKeyDown}
                  onBlur={addSkills}
                />
              </div>
              {form.vaardigheden.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {form.vaardigheden.map((v) => (
                    <Badge key={v} variant="secondary" className="gap-1 text-xs">
                      {v}
                      <button
                        type="button"
                        onClick={() => removeSkill(v)}
                        className="ml-0.5 rounded-full hover:bg-muted"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Start datum */}
            <div className="grid gap-2">
              <Label htmlFor="start_datum">Start datum</Label>
              <Input
                id="start_datum"
                type="date"
                value={form.start_datum}
                onChange={(e) => setForm((f) => ({ ...f, start_datum: e.target.value }))}
              />
            </div>

            {/* Notities */}
            <div className="grid gap-2">
              <Label htmlFor="notities">Notities</Label>
              <Textarea
                id="notities"
                placeholder="Eventuele opmerkingen..."
                rows={3}
                value={form.notities}
                onChange={(e) => setForm((f) => ({ ...f, notities: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Annuleren
            </Button>
            <Button onClick={handleOpslaan} disabled={saving}>
              {saving ? 'Opslaan...' : editId ? 'Bijwerken' : 'Toevoegen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
