import { useState, useEffect, useMemo } from 'react';
import { logger } from '@/utils/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  BarChart3,
  Calendar,
  Award,
  Clock,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  getMedewerkers,
  createMedewerker,
  updateMedewerker,
  deleteMedewerker,
  getVerlof,
  createVerlof,
  updateVerlof,
  deleteVerlof,
} from '@/services/supabaseService';
import type { Medewerker, Verlof } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { cn, getInitials } from '@/lib/utils';
import { toast } from 'sonner';

type TeamTab = 'overzicht' | 'beschikbaarheid' | 'vaardigheden' | 'prestaties';


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
  admin: 'bg-wm-pale/30 text-[#3D3522] border-primary/30',
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
    'bg-primary',
    'bg-accent',
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
  const { user } = useAuth();
  // ---- state ---------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<TeamTab>('overzicht');
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>([]);
  const [verlofLijst, setVerlofLijst] = useState<Verlof[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoekterm, setZoekterm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('alle');
  const [rolFilter, setRolFilter] = useState<RolFilter>('alle');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(blankMedewerker());
  const [skillInput, setSkillInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Verlof dialog state
  const [verlofDialogOpen, setVerlofDialogOpen] = useState(false);
  const [verlofForm, setVerlofForm] = useState({
    medewerker_id: '',
    type: 'vakantie' as Verlof['type'],
    start_datum: new Date().toISOString().split('T')[0],
    eind_datum: new Date().toISOString().split('T')[0],
    status: 'aangevraagd' as Verlof['status'],
    opmerking: '',
  });

  // ---- data loading --------------------------------------------------------
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [mwData, verlofData] = await Promise.all([
        getMedewerkers(),
        getVerlof(),
      ]);
      setMedewerkers(mwData || []);
      setVerlofLijst(verlofData || []);
    } catch (err) {
      logger.error('Kon teamgegevens niet laden:', err);
      toast.error('Kon teamgegevens niet laden');
    } finally {
      setLoading(false);
    }
  }

  async function loadMedewerkers() {
    setLoading(true);
    try {
      const data = await getMedewerkers();
      setMedewerkers(data || []);
    } catch (err) {
      logger.error('Kon medewerkers niet laden:', err);
      toast.error('Kon medewerkers niet laden');
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
        if (!user?.id) { toast.error('Niet ingelogd'); return; }
        const created = await createMedewerker({ ...form, user_id: user.id });
        if (created) {
          setMedewerkers((prev) => [...prev, created]);
          toast.success('Medewerker toegevoegd.');
        } else {
          const nieuw: Medewerker = {
            ...form,
            id: `local-${Date.now()}`,
            user_id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setMedewerkers((prev) => [...prev, nieuw]);
          toast.success('Medewerker toegevoegd (lokaal).');
        }
      }
      setDialogOpen(false);
    } catch (err) {
      logger.error('Fout bij opslaan medewerker:', err);
      toast.error('Er is iets misgegaan bij het opslaan.');
    } finally {
      setSaving(false);
    }
  }

  async function handleVerwijderen(id: string) {
    try {
      await deleteMedewerker(id);
    } catch (err) {
      logger.error('Fout bij verwijderen medewerker:', err);
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

  // ---- availability data (mock per weekday) --------------------------------
  const beschikbaarheid = useMemo(() => {
    const dagen = ['Ma', 'Di', 'Wo', 'Do', 'Vr'];
    return medewerkers.filter(m => m.status === 'actief').map((m) => ({
      id: m.id,
      naam: m.naam,
      rol: m.rol,
      dagen: dagen.map((dag) => {
        // Simple demo logic based on name hash
        const hash = m.naam.charCodeAt(0) + dag.charCodeAt(0);
        if (hash % 7 === 0) return 'vrij' as const;
        if (hash % 5 === 0) return 'halve-dag' as const;
        return 'beschikbaar' as const;
      }),
    }));
  }, [medewerkers]);

  // ---- skills matrix -------------------------------------------------------
  const alleVaardigheden = useMemo(() => {
    const set = new Set<string>();
    medewerkers.forEach((m) => m.vaardigheden.forEach((v) => set.add(v)));
    return Array.from(set).sort();
  }, [medewerkers]);

  // ---- render --------------------------------------------------------------
  return (
    <div className="space-y-6 mod-strip mod-strip-team">
      {/* ---- Header ---- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title tracking-tight">Team</h1>
          <p className="text-muted-foreground">Beheer medewerkers en rollen</p>
        </div>
        <Button onClick={openNieuw}>
          <Plus className="mr-2 h-4 w-4" />
          Nieuwe medewerker
        </Button>
      </div>

      {/* ---- Tab bar ---- */}
      <div className="flex items-center gap-1">
        {([
          { id: 'overzicht' as TeamTab, label: 'Overzicht', icon: Users },
          { id: 'beschikbaarheid' as TeamTab, label: 'Beschikbaarheid', icon: Calendar },
          { id: 'vaardigheden' as TeamTab, label: 'Vaardigheden', icon: Award },
          { id: 'prestaties' as TeamTab, label: 'Prestaties', icon: BarChart3 },
        ]).map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <TabIcon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
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

      {/* ──── Beschikbaarheid tab ──── */}
      {activeTab === 'beschikbaarheid' && (<>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Weekplanning beschikbaarheid
            </CardTitle>
          </CardHeader>
          <CardContent>
            {beschikbaarheid.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Geen actieve medewerkers</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground w-48">Medewerker</th>
                      {['Ma', 'Di', 'Wo', 'Do', 'Vr'].map((dag) => (
                        <th key={dag} className="text-center py-2 px-2 font-medium text-muted-foreground w-24">{dag}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {beschikbaarheid.map((m) => (
                      <tr key={m.id} className="border-b last:border-0">
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold', avatarColor(m.naam))}>
                              {getInitials(m.naam)}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{m.naam}</p>
                              <p className="text-2xs text-muted-foreground capitalize">{m.rol}</p>
                            </div>
                          </div>
                        </td>
                        {m.dagen.map((status, i) => (
                          <td key={i} className="text-center py-2 px-2">
                            <div className={cn(
                              'inline-flex items-center justify-center w-8 h-8 rounded-md text-xs font-medium',
                              status === 'beschikbaar' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
                              status === 'halve-dag' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
                              status === 'vrij' && 'bg-muted text-muted-foreground/60 dark:bg-muted dark:text-muted-foreground',
                            )}>
                              {status === 'beschikbaar' ? <CheckCircle className="w-4 h-4" /> : status === 'halve-dag' ? <Clock className="w-4 h-4" /> : <X className="w-4 h-4" />}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t">
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-900/30" />
                <span className="text-muted-foreground">Beschikbaar</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/30" />
                <span className="text-muted-foreground">Halve dag</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-3 h-3 rounded bg-muted dark:bg-muted" />
                <span className="text-muted-foreground">Vrij</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verlof overzicht */}
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Verlofregistratie
              </CardTitle>
              <Button size="sm" onClick={() => setVerlofDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Verlof aanvragen
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {verlofLijst.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Geen verlofregistraties</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Medewerker</th>
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Type</th>
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Van</th>
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Tot</th>
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Status</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">Acties</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verlofLijst.map((v) => {
                      const mw = medewerkers.find((m) => m.id === v.medewerker_id);
                      return (
                        <tr key={v.id} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-medium">{mw?.naam || 'Onbekend'}</td>
                          <td className="py-2 pr-4">
                            <Badge className={cn('text-xs',
                              v.type === 'vakantie' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                              v.type === 'ziek' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
                              v.type === 'ouderschapsverlof' && 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
                              v.type === 'bijzonder' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
                              v.type === 'bedrijfssluiting' && 'bg-muted text-foreground/70 dark:bg-muted dark:text-muted-foreground/50',
                            )}>
                              {v.type.charAt(0).toUpperCase() + v.type.slice(1)}
                            </Badge>
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground">{v.start_datum}</td>
                          <td className="py-2 pr-4 text-muted-foreground">{v.eind_datum}</td>
                          <td className="py-2 pr-4">
                            <Badge className={cn('text-xs',
                              v.status === 'goedgekeurd' && 'bg-emerald-100 text-emerald-700',
                              v.status === 'aangevraagd' && 'bg-amber-100 text-amber-700',
                              v.status === 'afgewezen' && 'bg-red-100 text-red-700',
                            )}>
                              {v.status.charAt(0).toUpperCase() + v.status.slice(1)}
                            </Badge>
                          </td>
                          <td className="py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {v.status === 'aangevraagd' && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-7 w-7"
                                    onClick={async () => {
                                      await updateVerlof(v.id, { status: 'goedgekeurd' });
                                      toast.success('Verlof goedgekeurd');
                                      loadData();
                                    }}
                                  >
                                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7"
                                    onClick={async () => {
                                      await updateVerlof(v.id, { status: 'afgewezen' });
                                      toast.success('Verlof afgewezen');
                                      loadData();
                                    }}
                                  >
                                    <X className="h-3.5 w-3.5 text-red-600" />
                                  </Button>
                                </>
                              )}
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                                onClick={async () => {
                                  await deleteVerlof(v.id);
                                  toast.success('Verlof verwijderd');
                                  loadData();
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Verlof aanvraag dialog */}
        <Dialog open={verlofDialogOpen} onOpenChange={setVerlofDialogOpen}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>Verlof aanvragen</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Medewerker</Label>
                <Select value={verlofForm.medewerker_id} onValueChange={(val) => setVerlofForm((p) => ({ ...p, medewerker_id: val }))}>
                  <SelectTrigger><SelectValue placeholder="Selecteer medewerker" /></SelectTrigger>
                  <SelectContent>
                    {medewerkers.filter((m) => m.status === 'actief').map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.naam}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={verlofForm.type} onValueChange={(val) => setVerlofForm((p) => ({ ...p, type: val as Verlof['type'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vakantie">Vakantie</SelectItem>
                    <SelectItem value="ziek">Ziek</SelectItem>
                    <SelectItem value="ouderschapsverlof">Ouderschapsverlof</SelectItem>
                    <SelectItem value="bijzonder">Bijzonder verlof</SelectItem>
                    <SelectItem value="bedrijfssluiting">Bedrijfssluiting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Van</Label>
                  <Input type="date" value={verlofForm.start_datum} onChange={(e) => setVerlofForm((p) => ({ ...p, start_datum: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Tot</Label>
                  <Input type="date" value={verlofForm.eind_datum} onChange={(e) => setVerlofForm((p) => ({ ...p, eind_datum: e.target.value }))} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Opmerking</Label>
                <Textarea value={verlofForm.opmerking} onChange={(e) => setVerlofForm((p) => ({ ...p, opmerking: e.target.value }))} placeholder="Optioneel..." rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setVerlofDialogOpen(false)}>Annuleren</Button>
              <Button onClick={async () => {
                if (!verlofForm.medewerker_id) { toast.error('Selecteer een medewerker'); return; }
                if (verlofForm.eind_datum < verlofForm.start_datum) { toast.error('Einddatum moet na startdatum liggen'); return; }
                // Check overlap
                const overlap = verlofLijst.some((v) =>
                  v.medewerker_id === verlofForm.medewerker_id &&
                  v.status !== 'afgewezen' &&
                  verlofForm.start_datum <= v.eind_datum &&
                  verlofForm.eind_datum >= v.start_datum
                );
                if (overlap) { toast.error('Verlof overlapt met bestaand verlof'); return; }
                try {
                  await createVerlof({
                    user_id: user?.id || '',
                    medewerker_id: verlofForm.medewerker_id,
                    type: verlofForm.type,
                    start_datum: verlofForm.start_datum,
                    eind_datum: verlofForm.eind_datum,
                    status: verlofForm.status,
                    opmerking: verlofForm.opmerking || undefined,
                  });
                  toast.success('Verlof aangevraagd');
                  setVerlofDialogOpen(false);
                  setVerlofForm({ medewerker_id: '', type: 'vakantie', start_datum: new Date().toISOString().split('T')[0], eind_datum: new Date().toISOString().split('T')[0], status: 'aangevraagd', opmerking: '' });
                  loadData();
                } catch (err) { logger.error('Kon verlof niet aanvragen:', err); toast.error('Kon verlof niet aanvragen'); }
              }}>Aanvragen</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>)}

      {/* ──── Vaardigheden tab ──── */}
      {activeTab === 'vaardigheden' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="w-4 h-4" />
              Vaardigheden matrix
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alleVaardigheden.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Geen vaardigheden geregistreerd</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground w-48">Medewerker</th>
                      {alleVaardigheden.map((v) => (
                        <th key={v} className="text-center py-2 px-1 font-medium text-muted-foreground">
                          <span className="text-2xs writing-mode-vertical rotate-[-45deg] inline-block w-16 text-left truncate" title={v}>
                            {v}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {medewerkers.filter(m => m.status === 'actief').map((m) => (
                      <tr key={m.id} className="border-b last:border-0">
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-white text-2xs font-semibold', avatarColor(m.naam))}>
                              {getInitials(m.naam)}
                            </div>
                            <span className="font-medium text-sm truncate">{m.naam}</span>
                          </div>
                        </td>
                        {alleVaardigheden.map((v) => (
                          <td key={v} className="text-center py-2 px-1">
                            {m.vaardigheden.includes(v) ? (
                              <div className="w-5 h-5 mx-auto rounded bg-primary/20 flex items-center justify-center">
                                <CheckCircle className="w-3.5 h-3.5 text-primary" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 mx-auto" />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 pt-3 border-t">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">Vaardigheden dekking</h4>
              <div className="flex flex-wrap gap-2">
                {alleVaardigheden.map((v) => {
                  const count = medewerkers.filter(m => m.status === 'actief' && m.vaardigheden.includes(v)).length;
                  return (
                    <Badge key={v} variant="secondary" className={cn('text-xs', count <= 1 && 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300')}>
                      {v}: {count}
                      {count <= 1 && <AlertTriangle className="w-3 h-3 ml-1" />}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ──── Prestaties tab ──── */}
      {activeTab === 'prestaties' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {medewerkers.filter(m => m.status === 'actief').map((m) => {
              // Generate demo performance data based on name hash
              const hash = m.naam.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
              const projecten = (hash % 8) + 1;
              const uren = ((hash % 30) + 10) * 4;
              const urenTarget = 160;
              const urenPerc = Math.min((uren / urenTarget) * 100, 100);

              return (
                <Card key={m.id}>
                  <CardContent className="pt-4 pb-3 px-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold', avatarColor(m.naam))}>
                        {getInitials(m.naam)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{m.naam}</p>
                        <p className="text-xs text-muted-foreground">{m.functie} — {m.afdeling}</p>
                      </div>
                      <Badge variant="outline" className={cn('text-2xs', ROL_KLEUREN[m.rol])}>
                        {ROL_LABELS[m.rol]}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-lg font-bold">{projecten}</p>
                        <p className="text-2xs text-muted-foreground">Projecten</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{uren}u</p>
                        <p className="text-2xs text-muted-foreground">Uren (maand)</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">&euro;{(uren * m.uurtarief).toFixed(0)}</p>
                        <p className="text-2xs text-muted-foreground">Omzet</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div>
                      <div className="flex justify-between text-2xs text-muted-foreground mb-1">
                        <span>Uren target</span>
                        <span>{uren}/{urenTarget}u ({urenPerc.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            urenPerc >= 90 ? 'bg-emerald-500' : urenPerc >= 70 ? 'bg-amber-500' : 'bg-red-500'
                          )}
                          style={{ width: `${urenPerc}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ---- Search + Filters (only in overzicht tab) ---- */}
      {activeTab === 'overzicht' && (<>
      <div className="space-y-4">
        {/* Search bar */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoek op naam, e-mail of functie..."
            value={zoekterm}
            onChange={(e) => setZoekterm(e.target.value)}
            className="pl-10"
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
        <div className="flex flex-col items-center justify-center py-16">
          <Users className="mb-4 h-10 w-10 text-muted-foreground opacity-30" />
          <p className="text-sm font-medium text-muted-foreground">Geen medewerkers gevonden</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
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
                        : 'border-border bg-muted text-muted-foreground'
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
      </>)}

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
