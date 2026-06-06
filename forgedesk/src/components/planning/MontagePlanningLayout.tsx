import { useState, useEffect, useMemo, useCallback, useRef, Fragment } from "react";
import { logger } from '../../utils/logger'
import { DatePicker } from '@/components/ui/date-picker'
import { useWeekWeather, getWeatherForDate } from "./WeatherDayStrip";
import type { DayWeather } from "./WeatherDayStrip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  List,
  Clock,
  MapPin,
  Users,
  Wrench,
  Truck,
  PlayCircle,
  CheckCircle2,
  PauseCircle,
  Pencil,
  Trash2,
  Package,
  ClipboardList,
  X,
  AlertTriangle,
  Printer,
  User,
  Paperclip,
  FileText,
  Image,
  Upload,
  Eye,
  ArrowUpRight,
  Check,
  Flame,
  ChevronDown,
} from "lucide-react";
import {
  getMontageAfspraken,
  createMontageAfspraak,
  updateMontageAfspraak,
  deleteMontageAfspraak,
  getProjecten,
  getMedewerkers,
  getKlanten,
  getOffertes,
  getWerkbonnenByProject,
  createWerkbon,
  updateProject,
  getTaken,
  updateTaak,
} from "@/services/supabaseService";
import type { MontageAfspraak, MontageBijlage, Project, Medewerker, Klant, Offerte, Werkbon, Taak } from "@/types";
import { ClipboardCheck } from "lucide-react";
import { uploadMontageBijlage } from '@/services/storageService';
import { getCached, fetchQuery } from '@/lib/queryCache';
import { WerkbonVanProjectDialog } from "@/components/werkbonnen/WerkbonVanProjectDialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getNederlandseFeestdagen, isFeestdag } from "@/utils/feestdagen";
import { confirm } from '@/components/shared/ConfirmDialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useAuth } from "@/contexts/AuthContext";
import { logCreate, logWijziging } from "@/utils/auditLogger";
import { getFase } from "@/utils/projectFases";
import { getAvatarStyle } from "@/utils/medewerkerAvatar";
import { isAdminUser } from "@/utils/authHelpers";
import { Skeleton } from "@/components/ui/skeleton";
import { useOptimisticState } from "@/hooks/useOptimistic";
import { useNavigateWithTab } from "@/hooks/useNavigateWithTab";

const SWIMLANE_COLLAPSED_KEY = 'doen_planning_swimlane_collapsed';
const SWIMLANE_UNASSIGNED_KEY = '__ongetoewezen__';
const HIDE_EMPTY_LANES_KEY = 'doen_planning_hide_empty_lanes';
const LANE_GROUPING_KEY = 'doen_planning_lane_grouping';
const PLANNING_FILTER_KEY = 'doen_planning_filter_v1';
const PLANNING_SCOPE_KEY = 'doen_planning_scope_v1';
const PLANNING_VIEWMODE_KEY = 'doen_planning_viewmode_v1';

type ViewMode = 'week' | 'maand';
const FASES_BLOKKEREN_AFRONDEN: Array<Project['status']> = ['te-factureren', 'gefactureerd', 'afgerond'];

type ScopeMode = 'alle' | 'mijn' | 'medewerker';

function readScopeFromStorage(): { mode: ScopeMode; monteurId: string | null } {
  try {
    const raw = localStorage.getItem(PLANNING_SCOPE_KEY);
    if (raw === 'alle') return { mode: 'alle', monteurId: null };
    if (raw === 'mijn') return { mode: 'mijn', monteurId: null };
    if (raw) return { mode: 'medewerker', monteurId: raw };
    const legacy = localStorage.getItem(PLANNING_FILTER_KEY);
    if (legacy === 'alle' || !legacy) return { mode: 'alle', monteurId: null };
    return { mode: 'medewerker', monteurId: legacy };
  } catch {
    return { mode: 'alle', monteurId: null };
  }
}

function writeScopeToStorage(mode: ScopeMode, monteurId: string | null) {
  try {
    if (mode === 'alle') {
      localStorage.setItem(PLANNING_SCOPE_KEY, 'alle');
    } else if (mode === 'mijn') {
      localStorage.setItem(PLANNING_SCOPE_KEY, 'mijn');
    } else if (monteurId) {
      localStorage.setItem(PLANNING_SCOPE_KEY, monteurId);
    }
  } catch { /* ignore */ }
}

type LaneGrouping = 'none' | 'rol';

const ROL_GROUP_ORDER: Array<{ key: string; label: string; rollen: Medewerker['rol'][] }> = [
  { key: 'monteur', label: 'Monteurs', rollen: ['monteur'] },
  { key: 'productie', label: 'Productie', rollen: ['productie'] },
  { key: 'verkoop', label: 'Verkoop', rollen: ['verkoop'] },
  { key: 'overig', label: 'Overig', rollen: ['admin', 'medewerker'] },
];

function groupLanesByRol(monteurs: Medewerker[]): Array<{ key: string; label: string; monteurs: Medewerker[] }> {
  const buckets = new Map<string, Medewerker[]>();
  monteurs.forEach((m) => {
    const group = ROL_GROUP_ORDER.find((g) => g.rollen.includes(m.rol));
    const key = group ? group.key : 'overig';
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(m);
  });
  return ROL_GROUP_ORDER
    .filter((g) => (buckets.get(g.key)?.length ?? 0) > 0)
    .map((g) => ({ key: g.key, label: g.label, monteurs: buckets.get(g.key) ?? [] }));
}

const STATUS_CONFIG: Record<
  MontageAfspraak["status"],
  { label: string; text: string; bg: string; border: string; dot: string }
> = {
  gepland: { label: "Gepland", text: "#3A5A9A", bg: "#E8EEF9", border: "#C5D5EA", dot: "#4A7AC7" },
  onderweg: { label: "Onderweg", text: "#8A6A2A", bg: "#F5F2E8", border: "#E5DCC8", dot: "#C49A30" },
  bezig: { label: "Bezig", text: "#3A7D52", bg: "#E8F2EC", border: "#C5E0D0", dot: "#4AA366" },
  afgerond: { label: "Afgerond", text: "#1A535C", bg: "#E2F0F0", border: "#C0DDDD", dot: "#2A8A8A" },
  uitgesteld: { label: "Uitgesteld", text: "#C03A18", bg: "#FDE8E2", border: "#F0C8BC", dot: "#E04A28" },
};

const DAG_NAMEN = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
const DAG_NAMEN_LANG = [
  "Maandag",
  "Dinsdag",
  "Woensdag",
  "Donderdag",
  "Vrijdag",
  "Zaterdag",
  "Zondag",
];

function getWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function stripSeconden(t: string | null | undefined): string {
  if (!t) return '';
  return t.slice(0, 5);
}

function formatTijdspanne(start: string | null | undefined, eind: string | null | undefined): string {
  const s = stripSeconden(start);
  const e = stripSeconden(eind);
  if (!s && !e) return '';
  if (!e || s === e) return s;
  if (!s) return e;
  return `${s} – ${e}`;
}

function getDurationMinutes(start: string | null | undefined, eind: string | null | undefined): number {
  const s = stripSeconden(start);
  const e = stripSeconden(eind);
  if (!s || !e || s === e) return 0;
  const [sh, sm] = s.split(':').map(Number);
  const [eh, em] = e.split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => isNaN(n))) return 0;
  return Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
}

function getCardMinHeight(start: string | null | undefined, eind: string | null | undefined): number {
  const mins = getDurationMinutes(start, eind);
  if (mins === 0) return 72;
  return Math.min(280, Math.max(72, Math.round(mins * 1.2)));
}

function getWeekDates(monday: Date): Date[] {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateDutch(date: Date): string {
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

function getInitials(naam: string): string {
  return naam
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}


interface MontageFormData {
  project_id: string;
  klant_id: string;
  klant_naam: string;
  titel: string;
  beschrijving: string;
  datum: string;
  start_tijd: string;
  eind_tijd: string;
  locatie: string;
  monteurs: string[];
  materialen: string;
  notities: string;
  bijlagen: MontageBijlage[];
  werkbon_id: string;
}

const EMPTY_FORM: MontageFormData = {
  project_id: "",
  klant_id: "",
  klant_naam: "",
  titel: "",
  beschrijving: "",
  datum: "",
  start_tijd: "08:00",
  eind_tijd: "12:00",
  locatie: "",
  monteurs: [],
  materialen: "",
  notities: "",
  bijlagen: [],
  werkbon_id: "",
};

export function MontagePlanningLayout() {
  const { user } = useAuth();
  const { navigateWithTab } = useNavigateWithTab();
  const [currentMonday, setCurrentMonday] = useState<Date>(() =>
    getMondayOfWeek(new Date())
  );
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    try {
      const raw = localStorage.getItem(PLANNING_VIEWMODE_KEY);
      return raw === 'maand' ? 'maand' : 'week';
    } catch {
      return 'week';
    }
  });
  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    try { localStorage.setItem(PLANNING_VIEWMODE_KEY, mode); } catch { /* ignore */ }
  }, []);
  const [afspraken, setAfspraken] = useState<MontageAfspraak[]>(() => getCached<MontageAfspraak[]>('montageAfspraken') ?? []);
  const runOptimistic = useOptimisticState(setAfspraken);
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>(() => getCached<Medewerker[]>('medewerkers') ?? []);
  const [projecten, setProjecten] = useState<Project[]>(() => getCached<Project[]>('projecten') ?? []);
  // Taken in /planning — sommige collega's plannen hier hun losse taken
  // naast de montage-afspraken in.
  const [taken, setTaken] = useState<Taak[]>(() => getCached<Taak[]>('taken') ?? []);
  // Drag-state voor taken (los van afspraak-drag bovenin).
  const [draggingTaakId, setDraggingTaakId] = useState<string | null>(null);
  const [taakDragOverDate, setTaakDragOverDate] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAfspraak, setEditingAfspraak] =
    useState<MontageAfspraak | null>(null);
  const [formData, setFormData] = useState<MontageFormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(() => getCached('montageAfspraken') === undefined);
  const initialScope = useMemo(() => readScopeFromStorage(), []);
  const [scopeMode, setScopeModeState] = useState<ScopeMode>(initialScope.mode);
  const [selectedMonteur, setSelectedMonteurState] = useState<string>(
    initialScope.mode === 'medewerker' && initialScope.monteurId ? initialScope.monteurId : 'alle'
  );
  const [filterInitialized, setFilterInitialized] = useState<boolean>(() => {
    try {
      return localStorage.getItem(PLANNING_SCOPE_KEY) !== null
        || localStorage.getItem(PLANNING_FILTER_KEY) !== null;
    } catch { return false; }
  });
  const setSelectedMonteur = useCallback((value: string) => {
    setSelectedMonteurState(value);
    setFilterInitialized(true);
    if (value === 'alle') {
      setScopeModeState('alle');
      writeScopeToStorage('alle', null);
    } else {
      setScopeModeState('medewerker');
      writeScopeToStorage('medewerker', value);
    }
  }, []);
  const setScopeAlle = useCallback(() => {
    setScopeModeState('alle');
    setSelectedMonteurState('alle');
    setFilterInitialized(true);
    writeScopeToStorage('alle', null);
  }, []);
  const setScopeMijn = useCallback((eigenId: string | null) => {
    setScopeModeState('mijn');
    setSelectedMonteurState(eigenId ?? 'alle');
    setFilterInitialized(true);
    writeScopeToStorage('mijn', null);
  }, []);
  const [statusFilter, setStatusFilter] = useState<Set<MontageAfspraak["status"]>>(
    new Set(["gepland", "onderweg", "bezig", "afgerond", "uitgesteld"])
  );
  const [draggingAfspraakId, setDraggingAfspraakId] = useState<string | null>(null);
  const [draggingProjectId, setDraggingProjectId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  // Snap-preview voor montage-drop in member view (toont tijd waar de afspraak landt)
  const [montageDropSnap, setMontageDropSnap] = useState<{ date: string; time: string } | null>(null);
  const [nowTick, setNowTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNowTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  const [afrondenMenuOpen, setAfrondenMenuOpen] = useState(false);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const resizeStartY = useRef(0);
  const resizeStartMinutes = useRef(0);
  const [klanten, setKlanten] = useState<Klant[]>(() => getCached<Klant[]>('klanten') ?? []);
  const [offertes, setOffertes] = useState<Offerte[]>(() => getCached<Offerte[]>('offertes') ?? []);
  const [werkbonDialogOpen, setWerkbonDialogOpen] = useState(false);
  const [werkbonMontage, setWerkbonMontage] = useState<MontageAfspraak | null>(null);
  const [projectWerkbonnen, setProjectWerkbonnen] = useState<Werkbon[]>([]);
  const [recentlyAfgerond, setRecentlyAfgerond] = useState<Set<string>>(new Set());

  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(SWIMLANE_COLLAPSED_KEY);
      if (raw) return new Set(JSON.parse(raw));
    } catch (err) { /* ignore */ }
    return new Set();
  });
  const toggleLaneCollapsed = useCallback((key: string) => {
    setCollapsedLanes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      try { localStorage.setItem(SWIMLANE_COLLAPSED_KEY, JSON.stringify([...next])); } catch (err) { /* ignore */ }
      return next;
    });
  }, []);

  const [hideEmptyLanes, setHideEmptyLanes] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(HIDE_EMPTY_LANES_KEY);
      if (raw !== null) return raw === '1';
    } catch (err) { /* ignore */ }
    return true;
  });
  const toggleHideEmptyLanes = useCallback(() => {
    setHideEmptyLanes((prev) => {
      const next = !prev;
      try { localStorage.setItem(HIDE_EMPTY_LANES_KEY, next ? '1' : '0'); } catch (err) { /* ignore */ }
      return next;
    });
  }, []);

  const [laneGrouping, setLaneGrouping] = useState<LaneGrouping>(() => {
    try {
      const raw = localStorage.getItem(LANE_GROUPING_KEY);
      if (raw === 'rol') return 'rol';
    } catch (err) { /* ignore */ }
    return 'none';
  });
  const handleLaneGroupingChange = useCallback((value: LaneGrouping) => {
    setLaneGrouping(value);
    try { localStorage.setItem(LANE_GROUPING_KEY, value); } catch (err) { /* ignore */ }
  }, []);

  const weekDates = useMemo(() => getWeekDates(currentMonday), [currentMonday]);
  const monthGridDates = useMemo(() => {
    const firstOfMonth = new Date(currentMonday.getFullYear(), currentMonday.getMonth(), 1);
    const firstMonday = getMondayOfWeek(firstOfMonth);
    const lastOfMonth = new Date(currentMonday.getFullYear(), currentMonday.getMonth() + 1, 0);
    const totalDays = Math.ceil((lastOfMonth.getTime() - firstMonday.getTime()) / 86400000) + (7 - lastOfMonth.getDay() || 7);
    const rows = Math.max(5, Math.ceil(totalDays / 7));
    const dates: Date[] = [];
    for (let i = 0; i < rows * 7; i++) {
      const d = new Date(firstMonday);
      d.setDate(firstMonday.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [currentMonday]);
  const weekNumber = useMemo(
    () => getWeekNumber(currentMonday),
    [currentMonday]
  );
  const year = currentMonday.getFullYear();

  const todayStr = formatDate(new Date());
  const weather = useWeekWeather(weekDates);

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('doen_planning_teplannen_collapsed') === '1';
  });
  function toggleSidebar() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem('doen_planning_teplannen_collapsed', next ? '1' : '0'); } catch { /* noop */ }
      return next;
    });
  }
  const feestdagen = useMemo(() => getNederlandseFeestdagen(year), [year]);

  const loadData = useCallback(async () => {
    if (getCached('montageAfspraken') === undefined) setLoading(true);
    try {
      const [afsprakenData, medewerkerData, projectData, klantenData, offertesData, takenData] = await Promise.all([
        fetchQuery('montageAfspraken', getMontageAfspraken).catch(() => []),
        fetchQuery('medewerkers', getMedewerkers).catch(() => []),
        fetchQuery('projecten', getProjecten).catch(() => []),
        fetchQuery('klanten', getKlanten).catch(() => []),
        fetchQuery('offertes', getOffertes).catch(() => []),
        fetchQuery('taken', getTaken).catch(() => []),
      ]);

      setAfspraken(afsprakenData || []);
      setMedewerkers(medewerkerData || []);
      setProjecten(projectData || []);
      setKlanten(klantenData || []);
      setOffertes(offertesData || []);
      setTaken(takenData || []);
    } catch (err) {
      logger.error('Kon montageplanning niet laden:', err)
      toast.error('Kon montageplanning niet laden');
    } finally {
      setLoading(false);
    }
  }, [currentMonday]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const eigenMedewerker = useMemo(() => {
    if (!user?.id || medewerkers.length === 0) return null;
    return medewerkers.find((m) => m.user_id === user.id)
      || medewerkers.find((m) => m.email?.toLowerCase() === user.email?.toLowerCase())
      || null;
  }, [user, medewerkers]);

  // Auto-default filter: monteur ziet eigen agenda bij eerste bezoek
  useEffect(() => {
    if (filterInitialized) return;
    if (!eigenMedewerker) return;
    if (eigenMedewerker.rol !== 'monteur') return;
    if (isAdminUser(eigenMedewerker, user)) return;
    setSelectedMonteurState(eigenMedewerker.id);
    setFilterInitialized(true);
  }, [filterInitialized, user, eigenMedewerker]);

  // Sync: scope=mijn met geladen eigenMedewerker → selectedMonteur op id zetten
  useEffect(() => {
    if (scopeMode !== 'mijn') return;
    if (!eigenMedewerker) return;
    if (selectedMonteur !== eigenMedewerker.id) {
      setSelectedMonteurState(eigenMedewerker.id);
    }
  }, [scopeMode, eigenMedewerker, selectedMonteur]);

  // V-shortcut: open Afronden-menu wanneer dialog editmode + afspraak niet al afgerond
  useEffect(() => {
    if (!dialogOpen || !editingAfspraak) return;
    if (formData.status === 'afgerond') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'v') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const project = projecten.find((p) => p.id === formData.project_id);
      const blocking = project ? FASES_BLOKKEREN_AFRONDEN.includes(project.status) : false;
      e.preventDefault();
      if (blocking) {
        handleAfronden();
      } else {
        setAfrondenMenuOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dialogOpen, editingAfspraak, formData.status, formData.project_id, projecten]);

  // All afspraken for this week (unfiltered, needed for conflict detection)
  const weekAfsprakenAll = useMemo(() => {
    const startStr = formatDate(weekDates[0]);
    const endStr = formatDate(weekDates[weekDates.length - 1]);
    return afspraken.filter((a) => a.datum >= startStr && a.datum <= endStr);
  }, [afspraken, weekDates]);

  // Filtered by monteur + status (afgeronde kaart blijft kort zichtbaar voor fade-out)
  const weekAfspraken = useMemo(() => {
    return weekAfsprakenAll.filter((a) => {
      if (selectedMonteur !== "alle" && !a.monteurs.includes(selectedMonteur)) return false;
      if (!statusFilter.has(a.status) && !recentlyAfgerond.has(a.id)) return false;
      return true;
    });
  }, [weekAfsprakenAll, selectedMonteur, statusFilter, recentlyAfgerond]);

  const afsprakenPerDag = useMemo(() => {
    const map: Record<string, MontageAfspraak[]> = {};
    weekDates.forEach((d) => {
      map[formatDate(d)] = [];
    });
    weekAfspraken.forEach((a) => {
      if (map[a.datum]) {
        map[a.datum].push(a);
      }
    });
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => a.start_tijd.localeCompare(b.start_tijd))
    );
    return map;
  }, [weekAfspraken, weekDates]);

  // Taken per dag in de huidige week (alleen die met een deadline en
  // status !== 'klaar' worden in de planning getoond).
  const takenPerDag = useMemo(() => {
    const startStr = formatDate(weekDates[0]);
    const endStr = formatDate(weekDates[weekDates.length - 1]);
    const map: Record<string, Taak[]> = {};
    weekDates.forEach((d) => { map[formatDate(d)] = []; });
    for (const t of taken) {
      if (!t.deadline) continue;
      if (t.status === 'klaar') continue;
      const dl = t.deadline.slice(0, 10);
      if (dl < startStr || dl > endStr) continue;
      // Optionele monteur-filter zoals afspraken volgen
      if (selectedMonteur !== 'alle' && t.toegewezen_aan !== selectedMonteur) continue;
      if (map[dl]) map[dl].push(t);
    }
    return map;
  }, [taken, weekDates, selectedMonteur]);

  // Drop een taak op een dag → deadline updaten (optimistic).
  const handleDropTaakOnDate = useCallback(async (taakId: string, dateStr: string) => {
    const taak = taken.find(t => t.id === taakId);
    if (!taak) return;
    const oldDeadline = taak.deadline;
    if (oldDeadline?.slice(0, 10) === dateStr) return;
    setTaken(prev => prev.map(t => t.id === taakId ? { ...t, deadline: dateStr } : t));
    try {
      await updateTaak(taakId, { deadline: dateStr });
    } catch (err) {
      logger.error('Taak verplaatsen mislukt:', err);
      setTaken(prev => prev.map(t => t.id === taakId ? { ...t, deadline: oldDeadline } : t));
    }
  }, [taken]);

  const monteurMap = useMemo(() => {
    const map: Record<string, Medewerker> = {};
    medewerkers.forEach((m) => {
      map[m.id] = m;
    });
    return map;
  }, [medewerkers]);

  // Conflict detection: find overlapping montages for the same monteur
  const conflicts = useMemo(() => {
    const found: { monteurId: string; monteurNaam: string; afspraak1: MontageAfspraak; afspraak2: MontageAfspraak }[] = [];
    const activeAfspraken = weekAfsprakenAll.filter((a) => a.status !== "afgerond" && a.status !== "uitgesteld");

    // Group by day
    const perDay: Record<string, MontageAfspraak[]> = {};
    activeAfspraken.forEach((a) => {
      if (!perDay[a.datum]) perDay[a.datum] = [];
      perDay[a.datum].push(a);
    });

    // For each day, check each pair for shared monteurs with overlapping times
    Object.values(perDay).forEach((dayItems) => {
      for (let i = 0; i < dayItems.length; i++) {
        for (let j = i + 1; j < dayItems.length; j++) {
          const a = dayItems[i];
          const b = dayItems[j];
          // Check time overlap: a.start < b.end AND b.start < a.end
          if (a.start_tijd < b.eind_tijd && b.start_tijd < a.eind_tijd) {
            // Find shared monteurs
            const shared = a.monteurs.filter((m) => b.monteurs.includes(m));
            shared.forEach((mId) => {
              // Avoid duplicates
              const exists = found.some(
                (c) => c.monteurId === mId &&
                  ((c.afspraak1.id === a.id && c.afspraak2.id === b.id) ||
                   (c.afspraak1.id === b.id && c.afspraak2.id === a.id))
              );
              if (!exists) {
                found.push({
                  monteurId: mId,
                  monteurNaam: monteurMap[mId]?.naam || "Onbekend",
                  afspraak1: a,
                  afspraak2: b,
                });
              }
            });
          }
        }
      }
    });

    return found;
  }, [weekAfsprakenAll, monteurMap]);

  // Set of afspraak IDs that have conflicts
  const conflictAfspraakIds = useMemo(() => {
    const ids = new Set<string>();
    conflicts.forEach((c) => {
      ids.add(c.afspraak1.id);
      ids.add(c.afspraak2.id);
    });
    return ids;
  }, [conflicts]);

  const monteurs = useMemo(
    () => medewerkers.filter((m) => m.status === "actief"),
    [medewerkers]
  );

  const stats = useMemo(() => {
    const vandaagAfspraken = afspraken.filter((a) => a.datum === todayStr);
    const bezetteMonteurs = new Set(
      vandaagAfspraken
        .filter((a) => a.status !== "afgerond" && a.status !== "uitgesteld")
        .flatMap((a) => a.monteurs)
    );
    const beschikbaar = monteurs.filter(
      (m) => !bezetteMonteurs.has(m.id)
    ).length;

    return {
      totaalWeek: weekAfsprakenAll.length,
      geplandVandaag: vandaagAfspraken.length,
      monteursBeschikbaar: beschikbaar,
    };
  }, [weekAfsprakenAll, afspraken, todayStr, monteurs]);

  // Projects with status "te-plannen" for the sidebar
  const tePlannenProjecten = useMemo(() => {
    const prioOrder: Record<Project['prioriteit'], number> = { kritiek: 0, hoog: 1, medium: 2, laag: 3 };
    return projecten
      .filter((p) => p.status === "te-plannen")
      .sort((a, b) => (prioOrder[a.prioriteit] ?? 2) - (prioOrder[b.prioriteit] ?? 2));
  }, [projecten]);

  async function toggleProjectPrio(project: Project) {
    const newPrio: Project['prioriteit'] = (project.prioriteit === 'hoog' || project.prioriteit === 'kritiek') ? 'medium' : 'hoog';
    setProjecten((prev) => prev.map((p) => p.id === project.id ? { ...p, prioriteit: newPrio } : p));
    try {
      await updateProject(project.id, { prioriteit: newPrio });
    } catch (err) {
      logger.error('Prio updaten mislukt:', err);
      toast.error('Kon prioriteit niet bijwerken');
      setProjecten((prev) => prev.map((p) => p.id === project.id ? { ...p, prioriteit: project.prioriteit } : p));
    }
  }

  function navigateWeek(direction: -1 | 1) {
    setCurrentMonday((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + direction * 7);
      return next;
    });
  }

  function goToCurrentWeek() {
    setCurrentMonday(getMondayOfWeek(new Date()));
  }

  function navigateMonth(direction: -1 | 1) {
    setCurrentMonday((prev) => {
      const mid = new Date(prev.getFullYear(), prev.getMonth(), 15);
      const targetMid = new Date(mid.getFullYear(), mid.getMonth() + direction, 15);
      return getMondayOfWeek(targetMid);
    });
  }

  function toggleStatusFilter(status: MontageAfspraak["status"]) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }

  function printWeekplanning() {
    const werkdagen = weekDates.slice(0, 5);
    const monteurNaam = selectedMonteur !== "alle"
      ? monteurMap[selectedMonteur]?.naam || ""
      : "Alle medewerkers";

    const weekLabel = `Week ${weekNumber}, ${year}`;

    let printAfspraken = weekAfsprakenAll
      .filter((a) => a.status !== "afgerond")
      .sort((a, b) => a.datum.localeCompare(b.datum) || a.start_tijd.localeCompare(b.start_tijd));

    if (selectedMonteur !== "alle") {
      printAfspraken = printAfspraken.filter((a) => a.monteurs.includes(selectedMonteur));
    }

    const dagSections = werkdagen.map((date) => {
      const dateStr = formatDate(date);
      const dagNaam = date.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
      const dagAfspraken = printAfspraken.filter((a) => a.datum === dateStr);

      if (dagAfspraken.length === 0) {
        return `<h3 style="margin:20px 0 4px;font-size:15px;color:#666;">${dagNaam}</h3>
          <p style="color:#999;font-style:italic;font-size:12px;margin:0 0 8px;">Geen montages</p>`;
      }

      const rows = dagAfspraken.map((a) =>
        `<tr>
          <td style="padding:6px 8px;border:1px solid #ddd;white-space:nowrap;">${a.start_tijd} – ${a.eind_tijd}</td>
          <td style="padding:6px 8px;border:1px solid #ddd;font-weight:600;">${a.titel}</td>
          <td style="padding:6px 8px;border:1px solid #ddd;">${a.klant_naam || ""}</td>
          <td style="padding:6px 8px;border:1px solid #ddd;">${a.locatie}</td>
          <td style="padding:6px 8px;border:1px solid #ddd;">${a.monteurs.map((id) => monteurMap[id]?.naam || "?").join(", ")}</td>
          <td style="padding:6px 8px;border:1px solid #ddd;">${a.materialen.join(", ")}</td>
          <td style="padding:6px 8px;border:1px solid #ddd;font-size:11px;">${a.notities || ""}</td>
        </tr>`
      ).join("");

      return `<h3 style="margin:20px 0 4px;font-size:15px;color:#1A1A1A;">${dagNaam} <span style="color:#999;font-weight:normal;font-size:12px;">${dagAfspraken.length} montage${dagAfspraken.length !== 1 ? "s" : ""}</span></h3>
        <table style="border-collapse:collapse;width:100%;margin-bottom:8px;"><thead><tr>
          <th style="background:#f3f4f6;padding:6px 8px;border:1px solid #ddd;text-align:left;font-size:11px;">Tijd</th>
          <th style="background:#f3f4f6;padding:6px 8px;border:1px solid #ddd;text-align:left;font-size:11px;">Titel</th>
          <th style="background:#f3f4f6;padding:6px 8px;border:1px solid #ddd;text-align:left;font-size:11px;">Klant</th>
          <th style="background:#f3f4f6;padding:6px 8px;border:1px solid #ddd;text-align:left;font-size:11px;">Locatie</th>
          <th style="background:#f3f4f6;padding:6px 8px;border:1px solid #ddd;text-align:left;font-size:11px;">Medewerkers</th>
          <th style="background:#f3f4f6;padding:6px 8px;border:1px solid #ddd;text-align:left;font-size:11px;">Materialen</th>
          <th style="background:#f3f4f6;padding:6px 8px;border:1px solid #ddd;text-align:left;font-size:11px;">Notities</th>
        </tr></thead><tbody>${rows}</tbody></table>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><title>Weekplanning ${weekLabel}</title>
      <style>body{font-family:Arial,sans-serif;padding:20px;font-size:13px}
      h1{font-size:20px;margin-bottom:2px}
      @media print{body{padding:10px}h3{page-break-inside:avoid}}</style></head>
      <body>
      <h1>Weekplanning — ${weekLabel}</h1>
      <p style="color:#666;margin-bottom:8px;">${monteurNaam} &middot; ${printAfspraken.length} montage${printAfspraken.length !== 1 ? "s" : ""}</p>
      ${dagSections}
      </body></html>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => printWindow.print();
    }
  }

  function openNewDialog(datum?: string, prefillMonteurId?: string | null) {
    setEditingAfspraak(null);
    setFormData({
      ...EMPTY_FORM,
      datum: datum || todayStr,
      monteurs: prefillMonteurId ? [prefillMonteurId] : [],
    });
    setDialogOpen(true);
  }

  function openNewDialogFromProject(project: Project, datum?: string, prefillMonteurId?: string | null) {
    setEditingAfspraak(null);
    // Auto-fill locatie vanuit klant adres
    const klant = klanten.find((k) => k.id === project.klant_id);
    const locatie = klant ? [klant.adres, klant.postcode, klant.stad].filter(Boolean).join(", ") : "";
    setFormData({
      ...EMPTY_FORM,
      project_id: project.id,
      klant_id: project.klant_id,
      klant_naam: project.klant_naam || "",
      titel: project.naam,
      datum: datum || todayStr,
      locatie,
      monteurs: prefillMonteurId ? [prefillMonteurId] : [],
    });
    if (project.id) {
      getWerkbonnenByProject(project.id).then((wbs) => {
        setProjectWerkbonnen(wbs);
        // Auto-selecteer werkbon als er precies 1 is
        if (wbs.length === 1) {
          setFormData((prev) => ({ ...prev, werkbon_id: wbs[0].id }));
        }
      }).catch(() => setProjectWerkbonnen([]));
    }
    setDialogOpen(true);
  }

  function openEditDialog(afspraak: MontageAfspraak) {
    setEditingAfspraak(afspraak);
    const samengevoegdeNotities = [afspraak.beschrijving, afspraak.notities]
      .map((s) => (s || '').trim())
      .filter(Boolean)
      .join('\n\n');
    setFormData({
      project_id: afspraak.project_id,
      klant_id: afspraak.klant_id,
      klant_naam: afspraak.klant_naam || "",
      titel: afspraak.titel,
      beschrijving: samengevoegdeNotities,
      datum: afspraak.datum,
      start_tijd: afspraak.start_tijd,
      eind_tijd: afspraak.eind_tijd,
      locatie: afspraak.locatie,
      monteurs: [...afspraak.monteurs],
      materialen: afspraak.materialen.join(", "),
      notities: '',
      bijlagen: afspraak.bijlagen ? [...afspraak.bijlagen] : [],
      werkbon_id: afspraak.werkbon_id || "",
    });
    // Fetch werkbonnen for this project so dropdown is populated
    if (afspraak.project_id) {
      getWerkbonnenByProject(afspraak.project_id).then(setProjectWerkbonnen).catch(() => setProjectWerkbonnen([]));
    } else {
      setProjectWerkbonnen([]);
    }
    setDialogOpen(true);
  }

  function handleProjectChange(projectId: string) {
    const project = projecten.find((p) => p.id === projectId);
    setFormData((prev) => ({
      ...prev,
      project_id: projectId,
      klant_id: project?.klant_id || "",
      klant_naam: project?.klant_naam || "",
      werkbon_id: "",
    }));
    // Fetch werkbonnen for this project
    if (projectId) {
      getWerkbonnenByProject(projectId).then(setProjectWerkbonnen).catch(() => setProjectWerkbonnen([]));
    } else {
      setProjectWerkbonnen([]);
    }
  }

  function toggleMonteur(monteurId: string) {
    setFormData((prev) => ({
      ...prev,
      monteurs: prev.monteurs.includes(monteurId)
        ? prev.monteurs.filter((id) => id !== monteurId)
        : [...prev.monteurs, monteurId],
    }));
  }

  async function handleSubmit() {
    if (!formData.titel.trim()) {
      toast.error("Vul een titel in");
      return;
    }
    if (!formData.datum) {
      toast.error("Selecteer een datum");
      return;
    }
    if (!formData.locatie.trim()) {
      toast.error("Vul een locatie in");
      return;
    }
    if (formData.monteurs.length === 0) {
      toast.error("Selecteer minimaal een medewerker");
      return;
    }

    const materialenArr = formData.materialen
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      user_id: user?.id || "",
      project_id: formData.project_id,
      klant_id: formData.klant_id,
      project_naam:
        projecten.find((p) => p.id === formData.project_id)?.naam || "",
      klant_naam: formData.klant_naam,
      titel: formData.titel,
      beschrijving: formData.beschrijving,
      datum: formData.datum,
      start_tijd: formData.start_tijd,
      eind_tijd: formData.eind_tijd,
      locatie: formData.locatie,
      monteurs: formData.monteurs,
      materialen: materialenArr,
      notities: formData.notities,
      bijlagen: formData.bijlagen.length > 0 ? formData.bijlagen : undefined,
      werkbon_id: formData.werkbon_id || undefined,
      werkbon_nummer: formData.werkbon_id ? projectWerkbonnen.find(w => w.id === formData.werkbon_id)?.werkbon_nummer : undefined,
      status: editingAfspraak ? editingAfspraak.status : ("gepland" as const),
    };

    try {
      if (editingAfspraak) {
        const updated = await updateMontageAfspraak(editingAfspraak.id, payload);
        setAfspraken((prev) =>
          prev.map((a) =>
            a.id === editingAfspraak.id ? { ...a, ...payload, ...updated } : a
          )
        );
        toast.success("Montage afspraak bijgewerkt");
      } else {
        const created = await createMontageAfspraak(payload);
        logCreate({ user, medewerkers, entityType: 'montage', entityId: created.id });
        setAfspraken((prev) => [...prev, created]);
        // Montage aangemaakt -> project automatisch op "ingepland" (alleen vooruit)
        if (formData.project_id) {
          const project = projecten.find((p) => p.id === formData.project_id);
          const vanaf = ["te-plannen", "gepland", "in-review", "akkoord-klant", "actief"];
          if (project && vanaf.includes(project.status)) {
            await updateProject(project.id, { status: "ingepland" }).catch(() => null);
            if (user?.id) {
              const naam = medewerkers.find(m => m.user_id === user.id)?.naam ?? user.email ?? ''
              logWijziging({ userId: user.id, entityType: 'project', entityId: project.id, actie: 'status_gewijzigd', medewerkerNaam: naam, veld: 'status', oudeWaarde: project.status, nieuweWaarde: 'ingepland' })
            }
            setProjecten((prev) =>
              prev.map((p) => p.id === project.id ? { ...p, status: "ingepland" as const } : p)
            );
          }
        }
        toast.success("Montage afspraak aangemaakt");
      }
      setDialogOpen(false);
    } catch (err) {
      console.error("Fout bij opslaan montage:", err);
      toast.error("Kon afspraak niet opslaan. Probeer opnieuw.");
    }
  }

  async function handleDelete(afspraakId: string) {
    const confirmed = await confirm({ message: 'Weet je zeker dat je deze montage-afspraak wilt verwijderen?', variant: 'destructive', confirmLabel: 'Verwijderen' })
    if (!confirmed) return
    try {
      await deleteMontageAfspraak(afspraakId).catch(() => null);
      setAfspraken((prev) => prev.filter((a) => a.id !== afspraakId));
      toast.success("Montage afspraak verwijderd");
    } catch (err) {
      logger.error('Montage afspraak verwijderen mislukt:', err)
      toast.error("Er ging iets mis bij het verwijderen");
    }
  }

  async function handleAfronden() {
    if (!editingAfspraak) return;

    const ok = await confirm({
      title: 'Montage afronden?',
      message: 'Montage wordt op \'afgerond\' gezet. Het project blijft in dezelfde fase staan.',
      confirmLabel: 'Afronden',
    });
    if (!ok) return;

    const oudeStatus = formData.status;
    const medewerkerNaam = medewerkers.find((m) => m.user_id === user?.id)?.naam ?? user?.email ?? '';

    try {
      await updateMontageAfspraak(editingAfspraak.id, { status: 'afgerond' });
      setAfspraken((prev) => prev.map((a) => a.id === editingAfspraak.id ? { ...a, status: 'afgerond' } : a));

      if (user?.id) {
        await logWijziging({
          userId: user.id,
          entityType: 'montage',
          entityId: editingAfspraak.id,
          actie: 'status_gewijzigd',
          medewerkerNaam,
          veld: 'status',
          oudeWaarde: oudeStatus,
          nieuweWaarde: 'afgerond',
          omschrijving: 'Afronden vanuit planning-dialog',
        });
      }

      setDialogOpen(false);
    } catch (err) {
      logger.error('Fout bij afronden:', err);
      toast.error('Kon montage niet afronden');
    }
  }

  async function afrondenAfspraak(afspraak: MontageAfspraak, ookFactureren: boolean) {
    const oudeMontageStatus = afspraak.status;
    const medewerkerNaam = medewerkers.find((m) => m.user_id === user?.id)?.naam ?? user?.email ?? '';
    const omschrijving = ookFactureren ? 'Afronden & factureren vanuit kaart' : 'Afronden vanuit kaart';

    try {
      await updateMontageAfspraak(afspraak.id, { status: 'afgerond' });
      setAfspraken((prev) => prev.map((a) => a.id === afspraak.id ? { ...a, status: 'afgerond' } : a));

      let project: Project | undefined;
      let oudeProjectStatus: Project['status'] | undefined;
      if (ookFactureren && afspraak.project_id) {
        project = projecten.find((p) => p.id === afspraak.project_id);
        if (project && !FASES_BLOKKEREN_AFRONDEN.includes(project.status)) {
          oudeProjectStatus = project.status;
          await updateProject(afspraak.project_id, { status: 'te-factureren' });
          setProjecten((prev) => prev.map((p) => p.id === afspraak.project_id ? { ...p, status: 'te-factureren' as const } : p));
        }
      }

      if (user?.id) {
        await logWijziging({
          userId: user.id,
          entityType: 'montage',
          entityId: afspraak.id,
          actie: 'status_gewijzigd',
          medewerkerNaam,
          veld: 'status',
          oudeWaarde: oudeMontageStatus,
          nieuweWaarde: 'afgerond',
          omschrijving,
        });
        if (oudeProjectStatus && afspraak.project_id) {
          await logWijziging({
            userId: user.id,
            entityType: 'project',
            entityId: afspraak.project_id,
            actie: 'status_gewijzigd',
            medewerkerNaam,
            veld: 'status',
            oudeWaarde: oudeProjectStatus,
            nieuweWaarde: 'te-factureren',
            omschrijving,
          });
        }
      }
    } catch (err) {
      logger.error('Fout bij afronden vanuit kaart:', err);
      toast.error('Kon montage niet afronden');
    }
  }

  async function handleAfrondenEnFactureren() {
    if (!editingAfspraak || !formData.project_id) return;
    const project = projecten.find((p) => p.id === formData.project_id);
    if (!project) return;
    if (FASES_BLOKKEREN_AFRONDEN.includes(project.status)) return;

    const ok = await confirm({
      title: 'Montage afronden?',
      message: `Montage wordt op 'afgerond' gezet en project '${project.naam}' op 'Te factureren'.`,
      confirmLabel: 'Afronden',
    });
    if (!ok) return;

    const oudeMontageStatus = formData.status;
    const oudeProjectStatus = project.status;
    const medewerkerNaam = medewerkers.find((m) => m.user_id === user?.id)?.naam ?? user?.email ?? '';
    const omschrijving = 'Afronden & factureren vanuit planning-dialog';

    try {
      await updateMontageAfspraak(editingAfspraak.id, { status: 'afgerond' });
      await updateProject(formData.project_id, { status: 'te-factureren' });

      setAfspraken((prev) => prev.map((a) => a.id === editingAfspraak.id ? { ...a, status: 'afgerond' } : a));
      setProjecten((prev) => prev.map((p) => p.id === formData.project_id ? { ...p, status: 'te-factureren' as const } : p));

      if (user?.id) {
        await logWijziging({
          userId: user.id,
          entityType: 'montage',
          entityId: editingAfspraak.id,
          actie: 'status_gewijzigd',
          medewerkerNaam,
          veld: 'status',
          oudeWaarde: oudeMontageStatus,
          nieuweWaarde: 'afgerond',
          omschrijving,
        });
        await logWijziging({
          userId: user.id,
          entityType: 'project',
          entityId: formData.project_id,
          actie: 'status_gewijzigd',
          medewerkerNaam,
          veld: 'status',
          oudeWaarde: oudeProjectStatus,
          nieuweWaarde: 'te-factureren',
          omschrijving,
        });
      }

      setDialogOpen(false);
    } catch (err) {
      logger.error('Fout bij afronden & factureren:', err);
      toast.error('Kon montage niet afronden');
    }
  }

  async function handleStatusUpdate(
    afspraak: MontageAfspraak,
    newStatus: MontageAfspraak["status"]
  ) {
    const ok = await runOptimistic({
      snapshot: afspraken,
      apply: (prev) =>
        prev.map((a) =>
          a.id === afspraak.id
            ? { ...a, status: newStatus, updated_at: new Date().toISOString() }
            : a
        ),
      commit: async () => {
        await updateMontageAfspraak(afspraak.id, { status: newStatus });
      },
      errorMessage: "Kon status niet bijwerken",
    });
    if (!ok) {
      logger.error("Status bijwerken mislukt");
      return;
    }
    toast.success(`Status bijgewerkt naar ${STATUS_CONFIG[newStatus].label}`);
  }

  async function handleDragDrop(
    dragId: string,
    newDate: string,
    targetMonteurId?: string,
    newStartTime?: string,
  ) {
    // Handle dragging a "te plannen" project onto a day column
    if (dragId.startsWith("project:")) {
      const projectId = dragId.replace("project:", "");
      const project = projecten.find((p) => p.id === projectId);
      if (!project) return;
      const prefillMonteur = targetMonteurId
        ?? (scopeMode === 'mijn' ? eigenMedewerker?.id ?? null
          : scopeMode === 'medewerker' && selectedMonteur !== 'alle' ? selectedMonteur
          : null);
      openNewDialogFromProject(project, newDate, prefillMonteur);
      return;
    }

    const afspraak = afspraken.find((a) => a.id === dragId);
    if (!afspraak) return;
    const sameDate = afspraak.datum === newDate;
    const sameTime = !newStartTime || newStartTime === afspraak.start_tijd;
    if (sameDate && sameTime) return;

    // Bij time-precision drop: schuif start_tijd én eind_tijd met dezelfde delta
    // zodat de duur van de afspraak intact blijft.
    let updates: Partial<MontageAfspraak> = { datum: newDate };
    let newEndTime = afspraak.eind_tijd;
    let newStart = afspraak.start_tijd;
    if (newStartTime) {
      const oldStart = timeToMinutes(afspraak.start_tijd);
      const oldEnd = timeToMinutes(afspraak.eind_tijd);
      const duur = Math.max(15, oldEnd - oldStart);
      const targetStart = timeToMinutes(newStartTime);
      newStart = minutesToTime(targetStart);
      newEndTime = minutesToTime(targetStart + duur);
      updates = { datum: newDate, start_tijd: newStart, eind_tijd: newEndTime };
    }

    const ok = await runOptimistic({
      snapshot: afspraken,
      apply: (prev) =>
        prev.map((a) =>
          a.id === afspraak.id
            ? { ...a, ...updates, updated_at: new Date().toISOString() }
            : a
        ),
      commit: async () => {
        await updateMontageAfspraak(afspraak.id, updates);
      },
      errorMessage: "Kon afspraak niet verplaatsen",
    });
    if (!ok) {
      logger.error("Fout bij verplaatsen");
      return;
    }
    const dateObj = new Date(newDate + "T00:00:00");
    const timePart = newStartTime ? ` om ${newStart}` : '';
    toast.success(`Verplaatst naar ${formatDateDutch(dateObj)}${timePart}`);
  }

  function timeToMinutes(t: string): number {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }
  function minutesToTime(mins: number): string {
    const clamped = Math.max(0, Math.min(1439, mins));
    const h = Math.floor(clamped / 60);
    const m = clamped % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  function handleResizeStart(e: React.MouseEvent, afspraak: MontageAfspraak) {
    e.stopPropagation();
    e.preventDefault();
    setResizingId(afspraak.id);
    resizeStartY.current = e.clientY;
    resizeStartMinutes.current = timeToMinutes(afspraak.eind_tijd);

    const onMove = (ev: MouseEvent) => {
      const deltaY = ev.clientY - resizeStartY.current;
      const deltaMinutes = Math.round(deltaY / 2) * 15;
      const startMins = timeToMinutes(afspraak.start_tijd);
      const newEnd = Math.max(startMins + 15, resizeStartMinutes.current + deltaMinutes);
      const newTime = minutesToTime(newEnd);

      setAfspraken((prev) =>
        prev.map((a) => a.id === afspraak.id ? { ...a, eind_tijd: newTime } : a)
      );
    };

    const onUp = async (ev: MouseEvent) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setResizingId(null);

      const deltaY = ev.clientY - resizeStartY.current;
      const deltaMinutes = Math.round(deltaY / 2) * 15;
      const startMins = timeToMinutes(afspraak.start_tijd);
      const newEnd = Math.max(startMins + 15, resizeStartMinutes.current + deltaMinutes);
      const finalEnd = minutesToTime(newEnd);

      if (finalEnd === afspraak.eind_tijd) return;

      try {
        await updateMontageAfspraak(afspraak.id, { eind_tijd: finalEnd });
        toast.success(`Duur aangepast tot ${finalEnd}`);
      } catch {
        setAfspraken((prev) =>
          prev.map((a) => a.id === afspraak.id ? { ...a, eind_tijd: afspraak.eind_tijd } : a)
        );
        toast.error("Kon duur niet aanpassen");
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function getNextStatusActions(
    status: MontageAfspraak["status"]
  ): { status: MontageAfspraak["status"]; label: string; icon: React.ReactNode }[] {
    switch (status) {
      case "gepland":
        return [
          {
            status: "onderweg",
            label: "Onderweg",
            icon: <Truck className="h-3 w-3" />,
          },
          {
            status: "uitgesteld",
            label: "Uitgesteld",
            icon: <PauseCircle className="h-3 w-3" />,
          },
        ];
      case "onderweg":
        return [
          {
            status: "bezig",
            label: "Gestart",
            icon: <PlayCircle className="h-3 w-3" />,
          },
          {
            status: "uitgesteld",
            label: "Uitgesteld",
            icon: <PauseCircle className="h-3 w-3" />,
          },
        ];
      case "bezig":
        return [
          {
            status: "afgerond",
            label: "Afgerond",
            icon: <CheckCircle2 className="h-3 w-3" />,
          },
          {
            status: "uitgesteld",
            label: "Uitgesteld",
            icon: <PauseCircle className="h-3 w-3" />,
          },
        ];
      case "uitgesteld":
        return [
          {
            status: "gepland",
            label: "Herplannen",
            icon: <CalendarDays className="h-3 w-3" />,
          },
        ];
      case "afgerond":
        return [];
      default:
        return [];
    }
  }

  function renderMonteurAvatars(monteurIds: string[], size: "sm" | "md" = "sm") {
    const sizeClasses = size === "sm" ? "h-5 w-5 text-[9px]" : "h-6 w-6 text-[10px]";
    return (
      <div className="flex -space-x-1.5">
        {monteurIds.map((id, idx) => {
          const monteur = monteurMap[id];
          const naam = monteur?.naam || "Onbekend";
          return (
            <div
              key={id}
              className={cn(sizeClasses, "rounded-lg flex items-center justify-center font-bold ring-2 ring-white")}
              style={getAvatarStyle(idx)}
              title={naam}
            >
              {getInitials(naam)}
            </div>
          );
        })}
      </div>
    );
  }

  function renderStatusBadge(status: MontageAfspraak["status"]) {
    const cfg = STATUS_CONFIG[status];
    return (
      <span
        className="text-[13px] font-semibold px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5"
        style={{ backgroundColor: cfg.bg, color: cfg.text }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
        {cfg.label}<span className="text-[#F15025]">.</span>
      </span>
    );
  }

  async function toggleAfgerond(afspraak: MontageAfspraak) {
    const wasAfgerond = afspraak.status === 'afgerond';
    const nieuweStatus: MontageAfspraak['status'] = wasAfgerond ? 'gepland' : 'afgerond';
    const snapshot = afspraken;
    const ok = await runOptimistic({
      snapshot,
      apply: (prev) => prev.map((a) => a.id === afspraak.id ? { ...a, status: nieuweStatus } : a),
      commit: async () => { await updateMontageAfspraak(afspraak.id, { status: nieuweStatus }); },
      errorMessage: 'Kon status niet bijwerken',
    });
    if (!ok) return;
    if (!wasAfgerond && !statusFilter.has('afgerond')) {
      setRecentlyAfgerond((prev) => {
        const next = new Set(prev);
        next.add(afspraak.id);
        return next;
      });
      setTimeout(() => {
        setRecentlyAfgerond((prev) => {
          if (!prev.has(afspraak.id)) return prev;
          const next = new Set(prev);
          next.delete(afspraak.id);
          return next;
        });
      }, 800);
    }
  }

  // ── Card with colored left border — DOEN style ──
  function renderMontageCard(afspraak: MontageAfspraak, opts?: { variant?: 'personal' | 'timegrid' }) {
    const hasConflict = conflictAfspraakIds.has(afspraak.id);
    const cfg = STATUS_CONFIG[afspraak.status];
    const isAfgerond = afspraak.status === 'afgerond';
    const isFadingOut = isAfgerond && recentlyAfgerond.has(afspraak.id);
    const isPersonal = opts?.variant === 'personal';
    const isTimegrid = opts?.variant === 'timegrid';
    const isCompact = isPersonal || isTimegrid;
    const tijdspanne = formatTijdspanne(afspraak.start_tijd, afspraak.eind_tijd);

    // Zelfde box-look als /taken: uniform lichte petrol-vulling + petrol accent-stripe.
    // (Afgerond houdt eigen surface; conflict/urgent-states blijven via ring/cfg zichtbaar.)
    const cardStyle: React.CSSProperties = { borderLeftColor: isAfgerond ? '#CBC9C4' : '#1A535C' };
    if (!isAfgerond) cardStyle.backgroundColor = 'rgba(26,83,92,0.035)';
    if (isPersonal) cardStyle.minHeight = `${getCardMinHeight(afspraak.start_tijd, afspraak.eind_tijd)}px`;

    return (
      <div
        key={afspraak.id}
        draggable
        onDragStart={(e) => {
          setDraggingAfspraakId(afspraak.id);
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", afspraak.id);
          // Custom drag image for smooth feel
          const ghost = e.currentTarget.cloneNode(true) as HTMLElement;
          ghost.style.width = `${e.currentTarget.offsetWidth}px`;
          ghost.style.background = '#fff';
          ghost.style.borderRadius = '12px';
          ghost.style.boxShadow = '0 12px 32px rgba(0,0,0,0.18)';
          ghost.style.opacity = '0.92';
          ghost.style.transform = 'rotate(2deg)';
          ghost.style.position = 'absolute';
          ghost.style.top = '-1000px';
          document.body.appendChild(ghost);
          e.dataTransfer.setDragImage(ghost, 30, 20);
          requestAnimationFrame(() => document.body.removeChild(ghost));
        }}
        onDragEnd={() => { setDraggingAfspraakId(null); setDragOverDate(null); }}
        className={cn(
          "bg-card border border-border/40 border-l-[3px] px-2.5 py-2 cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-[0_1px_2px_rgba(0,0,0,0.04)] group/card relative",
          isTimegrid ? "h-full overflow-hidden rounded-none" : "rounded-none mb-1.5 hover:-translate-y-[1px]",
          isAfgerond && "bg-[hsl(40,10%,96.5%)]",
          hasConflict && "ring-1 ring-[#F0C8BC]",
          draggingAfspraakId === afspraak.id && "opacity-30 scale-[0.97] ring-2 ring-[#1A535C]/30"
        )}
        style={cardStyle}
        onClick={() => openEditDialog(afspraak)}
      >
        {isAfgerond ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleAfgerond(afspraak); }}
            title="Markeer als gepland"
            aria-label="Markeer als gepland"
            className="absolute top-1 right-1 rounded-full p-0.5 transition-opacity z-10 opacity-100 text-muted-foreground/70 hover:bg-muted"
          >
            <CheckCircle2 className="h-3.5 w-3.5 fill-[#B4BEB9] text-white" />
          </button>
        ) : (() => {
          const project = afspraak.project_id ? projecten.find((p) => p.id === afspraak.project_id) : null;
          const projectBlocking = project ? FASES_BLOKKEREN_AFRONDEN.includes(project.status) : false;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  title="Markeer als afgerond"
                  aria-label="Markeer als afgerond"
                  className="absolute top-1 right-1 rounded-full p-0.5 transition-opacity z-10 opacity-0 group-hover/card:opacity-100 data-[state=open]:opacity-100 text-muted-foreground hover:text-[#2A8A8A] hover:bg-[#2A8A8A]/10"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); afrondenAfspraak(afspraak, false); }}
                  className="flex flex-col items-start gap-0.5 py-1.5 data-[highlighted]:bg-background data-[highlighted]:text-foreground"
                >
                  <span className="text-[12px] font-medium">Alleen afronden</span>
                  <span className="text-[10px] opacity-60">Project blijft in huidige fase</span>
                </DropdownMenuItem>
                {!projectBlocking && afspraak.project_id && (
                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); afrondenAfspraak(afspraak, true); }}
                    className="flex flex-col items-start gap-0.5 py-1.5 data-[highlighted]:bg-background data-[highlighted]:text-foreground"
                  >
                    <span className="text-[12px] font-medium">
                      Afronden &amp; factureren<span className="text-[#F15025]">.</span>
                    </span>
                    <span className="text-[10px] opacity-60">Project naar 'Te factureren'</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })()}
        <div className={cn("min-w-0", isAfgerond && "opacity-60")}>
          <div className="flex items-start justify-between gap-1 pr-5">
            <div className={cn(
              "text-[12px] font-semibold text-[#1A535C] dark:text-foreground leading-tight truncate",
              isAfgerond && "line-through"
            )}>{afspraak.titel}</div>
          </div>
          {afspraak.klant_naam && (
            <div className="text-[11px] text-muted-foreground truncate">{afspraak.klant_naam}</div>
          )}
          {/* Time + Werkbon + Location inline (top-row, altijd zichtbaar) */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {tijdspanne && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-[10px] font-mono tabular-nums",
                  hasConflict ? "rounded px-1 py-px ring-1 ring-[#F0C8BC] text-[#C03A18]" : "text-muted-foreground"
                )}
                style={hasConflict ? { backgroundColor: '#FDE8E2' } : undefined}
                title={hasConflict ? 'Overlap met andere afspraak' : undefined}
              >
                {hasConflict ? <AlertTriangle className="h-2 w-2" /> : <Clock className="h-2 w-2" />}
                {tijdspanne}
              </span>
            )}
            {afspraak.werkbon_id && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`/werkbonnen/${afspraak.werkbon_id}`, "_blank");
                }}
                className="inline-flex items-center gap-0.5 text-[10px] font-mono tabular-nums text-foreground/70 hover:text-[#1A535C] transition-colors"
                title={`Open werkbon ${afspraak.werkbon_nummer || ''}`}
              >
                <FileText className="h-2.5 w-2.5 opacity-70" />
                {afspraak.werkbon_nummer || "WB"}
              </button>
            )}
            {!isCompact && afspraak.locatie && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(afspraak.locatie)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-0.5 text-[10px] text-[#1A535C] hover:underline truncate max-w-[120px]"
              >
                <MapPin className="h-2 w-2 shrink-0" />
                <span className="truncate">{afspraak.locatie}</span>
              </a>
            )}
          </div>
          {/* Monteur avatars (alleen in multi-monteur view, werkbon zit nu in top-row) */}
          {!isCompact && afspraak.monteurs.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1">
              {renderMonteurAvatars(afspraak.monteurs)}
            </div>
          )}
        </div>
        {/* Resize handle */}
        <div
          className={cn(
            "h-1.5 cursor-ns-resize flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity -mb-1",
            resizingId === afspraak.id && "opacity-100"
          )}
          onMouseDown={(e) => handleResizeStart(e, afspraak)}
        >
          <div className="w-8 h-[3px] rounded-full bg-[#C0BDB8]" />
        </div>
      </div>
    );
  }

  // ── Weather cell for a day ──
  function renderWeatherCell(w: DayWeather | undefined) {
    if (!w) return null;
    return (
      <div className="flex items-center justify-center gap-1.5 py-1.5 px-2">
        <span className="text-base leading-none">{w.emoji}</span>
        <span className="text-[10px] text-muted-foreground tabular-nums">{w.maxTemp}°</span>
        {w.precipitationProb > 30 && (
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {w.precipitationProb}%
          </span>
        )}
      </div>
    );
  }

  // === MEMBER WEEK VIEW (time-grid: hour rail × 5 day columns) ===
  function renderMemberWeekView() {
    const werkdagen = weekDates.slice(0, 5); // Ma t/m Vr
    const selectedName = selectedMonteur === "alle"
      ? null
      : monteurMap[selectedMonteur]?.naam || "Onbekend";

    // Get afspraken for selected monteur (or all)
    const viewAfspraken = selectedMonteur === "alle"
      ? weekAfspraken
      : weekAfspraken.filter((a) => a.monteurs.includes(selectedMonteur));

    const HOUR_HEIGHT = 72;
    const START_HOUR = 6;
    const END_HOUR = 19;
    const totalHours = END_HOUR - START_HOUR;
    const gridHeight = totalHours * HOUR_HEIGHT;
    const gridTemplate = '60px repeat(5, minmax(0, 1fr))';

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const nowY = (nowMinutes - START_HOUR * 60) * (HOUR_HEIGHT / 60);
    const nowInRange = nowY >= 0 && nowY <= gridHeight;
    // Reference nowTick so this re-renders every minute
    void nowTick;

    return (
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Header: member name + week nav */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <span className="text-[15px] font-semibold text-[#1A4A52] dark:text-foreground">
              {selectedName || "Overzicht"}
            </span>
            <div className="flex items-center gap-1 ml-4">
              <button className="p-1.5 rounded-full hover:bg-muted transition-colors" onClick={() => navigateWeek(-1)}>
                <ChevronLeft className="h-4 w-4 text-foreground/70" />
              </button>
              <button
                onClick={goToCurrentWeek}
                className="text-[13px] font-bold px-3 py-1 rounded-none hover:bg-[#1A535C]/[0.07] transition-colors text-[#1A535C] font-mono tabular-nums"
              >
                Week {weekNumber}
              </button>
              <button className="p-1.5 rounded-full hover:bg-muted transition-colors" onClick={() => navigateWeek(1)}>
                <ChevronRight className="h-4 w-4 text-foreground/70" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={printWeekplanning} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-none text-[13px] font-medium text-foreground/70 hover:text-[#1A535C] hover:bg-muted transition-colors">
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
            <button
              onClick={() => openNewDialog()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-white bg-[#F15025] shadow-[0_2px_8px_rgba(241,80,37,0.25)] hover:shadow-[0_4px_16px_rgba(241,80,37,0.35)] hover:-translate-y-[1px] active:translate-y-0 active:shadow-[0_1px_4px_rgba(241,80,37,0.2)] transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Nieuw
            </button>
            <button
              className="p-1.5 rounded-full hover:bg-muted transition-colors"
              onClick={goToCurrentWeek}
              title="Vandaag"
            >
              <CalendarDays className="h-4 w-4 text-foreground/70" />
            </button>
          </div>
        </div>

        {/* Weather strip */}
        <div className="grid border-b border-border bg-background" style={{ gridTemplateColumns: gridTemplate }}>
          <div className="border-r border-border" />
          {werkdagen.map((date) => {
            const w = getWeatherForDate(weather, date);
            return (
              <div key={formatDate(date)} className="border-r last:border-r-0 border-border/50">
                {renderWeatherCell(w)}
              </div>
            );
          })}
        </div>

        {/* Day column headers (sticky) */}
        <div className="grid border-b border-border bg-card sticky top-0 z-20" style={{ gridTemplateColumns: gridTemplate }}>
          <div className="border-r border-border py-1.5 px-2 flex items-center">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Tijd</span>
          </div>
          {werkdagen.map((date) => {
            const dateStr = formatDate(date);
            const isToday = dateStr === todayStr;
            const dayIdx = (date.getDay() + 6) % 7;
            const dayAfspraken = viewAfspraken.filter((a) => a.datum === dateStr);
            const afgerond = dayAfspraken.filter((a) => a.status === "afgerond").length;
            const feestdagInfo = isFeestdag(dateStr, feestdagen);

            return (
              <div
                key={dateStr}
                className={cn(
                  "group relative text-center py-1.5 border-r last:border-r-0 border-border/50",
                  feestdagInfo ? "bg-[hsl(var(--status-flame-bg))]/40" : isToday ? "bg-[#1A535C]/[0.04]" : "bg-card",
                  isToday && "border-t-2 border-t-[#F15025]"
                )}
              >
                <div className="flex items-baseline justify-center gap-1.5">
                  <span className={cn(
                    "text-[13px] font-bold",
                    feestdagInfo ? "text-[#C03A18]" : isToday ? "text-[#1A535C]" : "text-[#1A4A52] dark:text-foreground"
                  )}>
                    {DAG_NAMEN_LANG[dayIdx]}
                  </span>
                  <span className={cn(
                    "text-[11px] font-mono tabular-nums",
                    feestdagInfo ? "text-[#C03A18]/70" : isToday ? "text-[#1A535C]" : "text-muted-foreground/80"
                  )}>
                    {date.getDate()} {date.toLocaleDateString("nl-NL", { month: "short" })}
                  </span>
                  {!feestdagInfo && dayAfspraken.length > 0 && (
                    <span
                      className="inline-flex items-center gap-0.5 text-[10px] font-mono tabular-nums"
                      title={`${afgerond} van ${dayAfspraken.length} afgerond`}
                    >
                      <CheckCircle2 className={cn(
                        "h-3 w-3",
                        afgerond === dayAfspraken.length ? "text-[#0F6E56]" : "text-muted-foreground/80"
                      )} />
                      <span className={cn(afgerond === dayAfspraken.length ? "text-[#0F6E56]" : "text-muted-foreground/80")}>
                        {afgerond}/{dayAfspraken.length}
                      </span>
                    </span>
                  )}
                </div>
                {feestdagInfo && (
                  <div className="text-[10px] font-semibold text-[#C03A18] mt-0.5">{feestdagInfo.naam}</div>
                )}
                {!feestdagInfo && (
                  <button
                    type="button"
                    onClick={() => openNewDialog(dateStr)}
                    title={`Nieuwe afspraak op ${dateStr}`}
                    className="absolute top-1 right-1 h-5 w-5 rounded-none flex items-center justify-center opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-[#F15025] hover:bg-muted transition-all"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Taken-rij (member view) — taken met deadline op deze dag */}
        {Object.values(takenPerDag).some(arr => arr.length > 0) && (
          <div className="grid border-b border-border bg-[#FAF9F6]" style={{ gridTemplateColumns: gridTemplate }}>
            <div className="border-r border-border py-2 px-2 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-[#1A535C]" />
              <span className="text-[9px] font-semibold text-[#1A535C] uppercase tracking-widest">Taken</span>
            </div>
            {werkdagen.map((date) => {
              const dateStr = formatDate(date);
              const dayTaken = takenPerDag[dateStr] || [];
              const isDragOver = taakDragOverDate === dateStr;
              return (
                <div
                  key={dateStr}
                  className={cn(
                    "border-r last:border-r-0 border-border/50 p-1.5 space-y-1 min-h-[42px] transition-colors",
                    isDragOver && "bg-[#1A535C]/[0.06] ring-1 ring-inset ring-[#1A535C]/30"
                  )}
                  onDragOver={(e) => {
                    if (!draggingTaakId) return;
                    e.preventDefault();
                    if (taakDragOverDate !== dateStr) setTaakDragOverDate(dateStr);
                  }}
                  onDragLeave={() => {
                    if (taakDragOverDate === dateStr) setTaakDragOverDate(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggingTaakId) handleDropTaakOnDate(draggingTaakId, dateStr);
                    setDraggingTaakId(null);
                    setTaakDragOverDate(null);
                  }}
                >
                  {dayTaken.map((t) => (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => {
                        setDraggingTaakId(t.id);
                        e.dataTransfer.effectAllowed = 'move';
                        try { e.dataTransfer.setData('text/plain', t.id); } catch { /* sommige browsers eisen dit */ }
                      }}
                      onDragEnd={() => {
                        setDraggingTaakId(null);
                        setTaakDragOverDate(null);
                      }}
                      title={t.titel}
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-none bg-card border border-border text-[11px] text-foreground cursor-grab active:cursor-grabbing hover:border-[#1A535C]/40 hover:shadow-sm transition-all",
                        draggingTaakId === t.id && "opacity-50"
                      )}
                    >
                      {t.prioriteit === 'kritiek' && <span className="w-1 h-1 rounded-full bg-[#F15025] flex-shrink-0" />}
                      {t.prioriteit === 'hoog' && <span className="w-1 h-1 rounded-full bg-[#E89A3A] flex-shrink-0" />}
                      <span className="flex-1 truncate">{t.titel}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* Time-grid: hour rail + 5 day columns with absolute-positioned cards */}
        <div className="grid flex-1 overflow-y-auto" style={{ gridTemplateColumns: gridTemplate }}>
          {/* Hour rail */}
          <div className="border-r border-border relative bg-card" style={{ height: gridHeight }}>
            {Array.from({ length: totalHours + 1 }, (_, i) => {
              const hour = START_HOUR + i;
              return (
                <div
                  key={hour}
                  className="absolute left-0 right-0 px-2 text-[10px] font-mono tabular-nums text-muted-foreground/80"
                  style={{ top: i * HOUR_HEIGHT - 6 }}
                >
                  {String(hour).padStart(2, '0')}:00
                </div>
              );
            })}
          </div>

          {/* Day columns */}
          {werkdagen.map((date) => {
            const dateStr = formatDate(date);
            const isToday = dateStr === todayStr;
            const feestdagInfo = isFeestdag(dateStr, feestdagen);
            const dayAfspraken = viewAfspraken
              .filter((a) => a.datum === dateStr)
              .sort((a, b) => a.start_tijd.localeCompare(b.start_tijd));

            return (
              <div
                key={dateStr}
                className={cn(
                  "relative border-r last:border-r-0 border-border/50 transition-colors",
                  feestdagInfo ? "bg-[hsl(var(--status-flame-bg))]/20" : isToday ? "bg-[#1A535C]/[0.02]" : "bg-card",
                  !feestdagInfo && dragOverDate === dateStr && "bg-[#1A535C]/[0.08] ring-2 ring-[#1A535C]/25 ring-inset",
                  feestdagInfo && dragOverDate === dateStr && "ring-2 ring-[#C03A18]/30 ring-inset"
                )}
                style={{ height: gridHeight }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = feestdagInfo ? "none" : draggingProjectId ? "copy" : "move";
                  if (dragOverDate !== dateStr) setDragOverDate(dateStr);
                  // Bereken tijd uit Y-positie en snap naar 15min raster (alleen voor afspraak-drag)
                  if (draggingAfspraakId && !feestdagInfo) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const y = e.clientY - rect.top;
                    const minutesFromStart = (y / HOUR_HEIGHT) * 60;
                    const snapped = Math.max(0, Math.round(minutesFromStart / 15) * 15);
                    const totalMins = START_HOUR * 60 + snapped;
                    const cappedMins = Math.min(totalMins, END_HOUR * 60 - 15);
                    const snapTime = minutesToTime(cappedMins);
                    setMontageDropSnap((prev) => (prev?.date === dateStr && prev?.time === snapTime ? prev : { date: dateStr, time: snapTime }));
                  } else if (montageDropSnap) {
                    setMontageDropSnap(null);
                  }
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverDate(null);
                    setMontageDropSnap(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverDate(null);
                  const snapTime = montageDropSnap?.date === dateStr ? montageDropSnap.time : undefined;
                  setMontageDropSnap(null);
                  if (feestdagInfo) {
                    toast.error(`Kan niet inplannen op ${feestdagInfo.naam}`);
                    return;
                  }
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) handleDragDrop(id, dateStr, undefined, snapTime);
                }}
              >
                {/* Snap-indicator: dun Petrol-lijntje + tijd-label op drop-positie */}
                {montageDropSnap?.date === dateStr && !feestdagInfo && (() => {
                  const snapMins = timeToMinutes(montageDropSnap.time);
                  const top = (snapMins - START_HOUR * 60) * (HOUR_HEIGHT / 60);
                  return (
                    <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top }}>
                      <div className="flex items-center">
                        <span className="bg-[#1A535C] text-white text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-r-md tabular-nums">
                          {montageDropSnap.time}
                        </span>
                        <div className="flex-1 h-0.5 bg-[#1A535C]" />
                      </div>
                    </div>
                  );
                })()}

                {/* Hour grid lines */}
                {Array.from({ length: totalHours }, (_, i) => (
                  <div
                    key={i}
                    className="absolute left-0 right-0 border-t border-border/50 pointer-events-none"
                    style={{ top: i * HOUR_HEIGHT }}
                  />
                ))}

                {/* Current time indicator */}
                {isToday && nowInRange && (
                  <div
                    className="absolute left-0 right-0 pointer-events-none z-10"
                    style={{ top: nowY }}
                  >
                    <div className="relative h-px bg-[#F15025]">
                      <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-[#F15025]" />
                    </div>
                  </div>
                )}

                {/* Feestdag overlay */}
                {feestdagInfo && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="flex flex-col items-center gap-1 text-[#C03A18]/40">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="text-xs font-medium">Geblokt</span>
                    </div>
                  </div>
                )}

                {/* Cards positioned by time. Overlappende afspraken op dezelfde
                    dag krijgen elk een eigen kolom binnen hun cluster zodat ze
                    naast elkaar staan in plaats van bovenop elkaar. */}
                {!feestdagInfo && (() => {
                  type Cluster = { items: { id: string; col: number }[]; columns: number[] }
                  const clusters: Cluster[] = [];
                  const slotById = new Map<string, { col: number; total: number }>();
                  const sorted = [...dayAfspraken].sort((a, b) => a.start_tijd.localeCompare(b.start_tijd));
                  let current: Cluster | null = null;
                  let currentMaxEnd = -1;
                  for (const a of sorted) {
                    const sStr = stripSeconden(a.start_tijd);
                    const eStr = stripSeconden(a.eind_tijd);
                    if (!sStr) continue;
                    const start = timeToMinutes(sStr);
                    const end = eStr ? timeToMinutes(eStr) : start + 60;
                    if (current && start < currentMaxEnd) {
                      let col = current.columns.findIndex((endMin) => endMin <= start);
                      if (col === -1) {
                        col = current.columns.length;
                        current.columns.push(end);
                      } else {
                        current.columns[col] = end;
                      }
                      current.items.push({ id: a.id, col });
                      currentMaxEnd = Math.max(currentMaxEnd, end);
                    } else {
                      current = { items: [{ id: a.id, col: 0 }], columns: [end] };
                      clusters.push(current);
                      currentMaxEnd = end;
                    }
                  }
                  for (const c of clusters) {
                    const total = c.columns.length;
                    for (const it of c.items) slotById.set(it.id, { col: it.col, total });
                  }
                  return dayAfspraken.map((a) => {
                    const startStr = stripSeconden(a.start_tijd);
                    if (!startStr) return null;
                    const startMin = timeToMinutes(startStr);
                    const eindStr = stripSeconden(a.eind_tijd);
                    const endMin = eindStr ? timeToMinutes(eindStr) : startMin + 60;
                    const top = Math.max(0, (startMin - START_HOUR * 60) * (HOUR_HEIGHT / 60));
                    const rawHeight = Math.max(1, endMin - startMin) * (HOUR_HEIGHT / 60);
                    const height = Math.min(gridHeight - top, Math.max(40, rawHeight));
                    const slot = slotById.get(a.id) || { col: 0, total: 1 };
                    const widthPct = 100 / slot.total;
                    const leftPct = slot.col * widthPct;
                    return (
                      <div
                        key={a.id}
                        className="absolute"
                        style={{
                          top,
                          height,
                          left: `calc(${leftPct}% + ${slot.col > 0 ? 2 : 0}px)`,
                          width: `calc(${widthPct}% - ${slot.total > 1 ? 2 : 0}px)`,
                        }}
                      >
                        {renderMontageCard(a, { variant: 'timegrid' })}
                      </div>
                    );
                  });
                })()}

                {/* Empty-state hint */}
                {!feestdagInfo && dayAfspraken.length === 0 && (draggingAfspraakId || draggingProjectId) && (
                  <div className="absolute inset-2 flex items-center justify-center text-[#1A535C] text-xs font-medium border-2 border-dashed border-[#1A535C]/30 rounded-xl bg-[#1A535C]/[0.04] pointer-events-none">
                    Hier neerzetten
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // === MAAND-VIEW (grid van weken × dagen) ===
  function renderMonthView() {
    const monthName = currentMonday.toLocaleDateString("nl-NL", { month: "long" });
    const year = currentMonday.getFullYear();
    const currentMonthIdx = currentMonday.getMonth();

    const monthStartStr = formatDate(monthGridDates[0]);
    const monthEndStr = formatDate(monthGridDates[monthGridDates.length - 1]);
    const monthAfspraken = afspraken.filter((a) => {
      if (a.datum < monthStartStr || a.datum > monthEndStr) return false;
      if (selectedMonteur !== 'alle' && !a.monteurs.includes(selectedMonteur)) return false;
      if (!statusFilter.has(a.status) && !recentlyAfgerond.has(a.id)) return false;
      return true;
    });
    const monthTakenByDate: Record<string, Taak[]> = {};
    for (const t of taken) {
      if (!t.deadline || t.status === 'klaar') continue;
      const dl = t.deadline.slice(0, 10);
      if (dl < monthStartStr || dl > monthEndStr) continue;
      if (selectedMonteur !== 'alle' && t.toegewezen_aan !== selectedMonteur) continue;
      (monthTakenByDate[dl] ||= []).push(t);
    }

    return (
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-muted-foreground mr-1" />
            <button className="p-1.5 rounded-full hover:bg-muted transition-colors" onClick={() => navigateMonth(-1)} title="Vorige maand">
              <ChevronLeft className="h-4 w-4 text-foreground/70" />
            </button>
            <button
              onClick={goToCurrentWeek}
              className="text-[15px] font-semibold text-[#1A4A52] dark:text-foreground capitalize px-2 py-1 rounded-none hover:bg-muted transition-colors tabular-nums"
              title="Naar deze maand"
            >
              {monthName} {year}
            </button>
            <button className="p-1.5 rounded-full hover:bg-muted transition-colors" onClick={() => navigateMonth(1)} title="Volgende maand">
              <ChevronRight className="h-4 w-4 text-foreground/70" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openNewDialog()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-white bg-[#F15025] shadow-[0_2px_8px_rgba(241,80,37,0.25)] hover:shadow-[0_4px_16px_rgba(241,80,37,0.35)] hover:-translate-y-[1px] active:translate-y-0 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Nieuw
            </button>
          </div>
        </div>

        {/* Day-of-week labels */}
        <div className="grid grid-cols-7 border-b border-border bg-background">
          {['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'].map((d) => (
            <div key={d} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-7 auto-rows-fr flex-1 overflow-y-auto">
          {monthGridDates.map((date) => {
            const dateStr = formatDate(date);
            const isToday = dateStr === todayStr;
            const isCurrentMonth = date.getMonth() === currentMonthIdx;
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const feestdagInfo = isFeestdag(dateStr, feestdagen);
            const dayItems = monthAfspraken
              .filter((a) => a.datum === dateStr)
              .sort((a, b) => a.start_tijd.localeCompare(b.start_tijd));
            const visibleItems = dayItems.slice(0, 3);
            const remaining = dayItems.length - visibleItems.length;

            const dayTaken = monthTakenByDate[dateStr] || [];
            const isTaakDragOver = taakDragOverDate === dateStr;
            return (
              <div
                key={dateStr}
                className={cn(
                  "group relative border-b border-r border-border p-1.5 min-h-[96px] flex flex-col gap-0.5 transition-colors",
                  !isCurrentMonth && "bg-background/40",
                  isCurrentMonth && isWeekend && "bg-background/60",
                  feestdagInfo && "bg-[hsl(var(--status-flame-bg))]/40",
                  isToday && "bg-[#1A535C]/[0.04] border-t-2 border-t-[#F15025]",
                  isTaakDragOver && "bg-[#1A535C]/[0.08] ring-2 ring-[#1A535C]/30 ring-inset"
                )}
                onDragOver={(e) => {
                  if (!draggingTaakId) return;
                  e.preventDefault();
                  if (taakDragOverDate !== dateStr) setTaakDragOverDate(dateStr);
                }}
                onDragLeave={(e) => {
                  if (!draggingTaakId) return;
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    if (taakDragOverDate === dateStr) setTaakDragOverDate(null);
                  }
                }}
                onDrop={(e) => {
                  if (!draggingTaakId) return;
                  e.preventDefault();
                  handleDropTaakOnDate(draggingTaakId, dateStr);
                  setDraggingTaakId(null);
                  setTaakDragOverDate(null);
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "text-[12px] font-mono tabular-nums",
                      isToday && "text-[#1A535C] font-bold",
                      !isToday && isCurrentMonth && "text-foreground",
                      !isToday && !isCurrentMonth && "text-muted-foreground/80",
                      feestdagInfo && "text-[#C03A18] font-semibold"
                    )}
                  >
                    {date.getDate()}
                  </span>
                  {!feestdagInfo && (
                    <button
                      type="button"
                      onClick={() => openNewDialog(dateStr)}
                      title="Nieuwe afspraak"
                      className="opacity-0 group-hover:opacity-100 h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-[#F15025] hover:bg-muted transition-all"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {feestdagInfo && (
                  <span className="text-[9px] font-semibold text-[#C03A18] truncate">{feestdagInfo.naam}</span>
                )}
                <div className="flex flex-col gap-0.5">
                  {visibleItems.map((a) => {
                    const cfg = STATUS_CONFIG[a.status];
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => openEditDialog(a)}
                        className="text-left text-[10px] truncate rounded px-1 py-0.5 hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: cfg?.bg || '#F0EFEC', color: cfg?.text || '#1A1A1A' }}
                        title={`${a.titel} (${a.start_tijd}–${a.eind_tijd})`}
                      >
                        <span className="font-mono mr-1 opacity-70">{a.start_tijd}</span>{a.titel}
                      </button>
                    );
                  })}
                  {remaining > 0 && (
                    <span className="text-[10px] text-muted-foreground px-1">+{remaining} meer</span>
                  )}
                  {dayTaken.slice(0, 3).map((t) => (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => {
                        setDraggingTaakId(t.id);
                        e.dataTransfer.effectAllowed = 'move';
                        try { e.dataTransfer.setData('text/plain', t.id); } catch { /* sommige browsers */ }
                      }}
                      onDragEnd={() => {
                        setDraggingTaakId(null);
                        setTaakDragOverDate(null);
                      }}
                      title={`Taak: ${t.titel}`}
                      className={cn(
                        "flex items-center gap-1 text-[10px] truncate rounded-none px-1 py-0.5 bg-card border border-border text-foreground cursor-grab active:cursor-grabbing hover:border-[#1A535C]/40 transition-all",
                        draggingTaakId === t.id && "opacity-50"
                      )}
                    >
                      <CheckCircle2 className="h-2.5 w-2.5 text-[#1A535C] flex-shrink-0" />
                      <span className="truncate">{t.titel}</span>
                    </div>
                  ))}
                  {dayTaken.length > 3 && (
                    <span className="text-[10px] text-muted-foreground px-1">+{dayTaken.length - 3} taken</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // === MULTI-MONTEUR TIMELINE (horizontal lanes per monteur) ===
  function renderMultiMonteurView() {
    const werkdagen = weekDates.slice(0, 5);
    const activeMonteurs = hideEmptyLanes
      ? monteurs.filter((m) => weekAfspraken.some((a) => a.monteurs.includes(m.id)))
      : monteurs;
    const unassigned = weekAfspraken.filter((a) => a.monteurs.length === 0);
    const hasUnassigned = unassigned.length > 0;
    const laneGroups = laneGrouping === 'rol'
      ? groupLanesByRol(activeMonteurs)
      : [{ key: '__all__', label: '', monteurs: activeMonteurs }];
    const indexById = new Map(activeMonteurs.map((m, i) => [m.id, i] as const));

    return (
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            <span className="text-[15px] font-semibold text-[#1A4A52] dark:text-foreground">Team overzicht</span>
            <div className="flex items-center gap-1 ml-4">
              <button className="p-1.5 rounded-full hover:bg-muted transition-colors" onClick={() => navigateWeek(-1)}>
                <ChevronLeft className="h-4 w-4 text-foreground/70" />
              </button>
              <button
                onClick={goToCurrentWeek}
                className="text-[13px] font-bold px-3 py-1 rounded-none hover:bg-[#1A535C]/[0.07] transition-colors text-[#1A535C] font-mono tabular-nums"
              >
                Week {weekNumber}
              </button>
              <button className="p-1.5 rounded-full hover:bg-muted transition-colors" onClick={() => navigateWeek(1)}>
                <ChevronRight className="h-4 w-4 text-foreground/70" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={laneGrouping} onValueChange={(v) => handleLaneGroupingChange(v as LaneGrouping)}>
              <SelectTrigger
                className="hidden sm:flex h-auto w-auto gap-1.5 px-3 py-1.5 rounded-none text-[13px] font-medium text-foreground/70 border-0 bg-transparent hover:text-[#1A535C] hover:bg-muted focus:ring-0 focus:ring-offset-0"
                title="Banen groeperen"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Geen groepering</SelectItem>
                <SelectItem value="rol">Groeperen op rol</SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={toggleHideEmptyLanes}
              aria-pressed={!hideEmptyLanes}
              title={hideEmptyLanes ? 'Toon ook medewerkers zonder afspraken deze week' : 'Verberg lege banen deze week'}
              className={cn(
                "hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-none text-[13px] font-medium transition-colors",
                !hideEmptyLanes
                  ? "text-[#1A535C] bg-[#1A535C]/[0.10] hover:bg-[#1A535C]/[0.12]"
                  : "text-foreground/70 hover:text-[#1A535C] hover:bg-muted"
              )}
            >
              <Eye className="h-3.5 w-3.5" />
              Alle banen
            </button>
            <button onClick={printWeekplanning} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-none text-[13px] font-medium text-foreground/70 hover:text-[#1A535C] hover:bg-muted transition-colors">
              <Printer className="h-3.5 w-3.5" />
              Print week
            </button>
            <button
              onClick={openNewDialog}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-white bg-[#F15025] shadow-[0_2px_8px_rgba(241,80,37,0.25)] hover:shadow-[0_4px_16px_rgba(241,80,37,0.35)] hover:-translate-y-[1px] active:translate-y-0 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Nieuw
            </button>
          </div>
        </div>

        {/* Weather strip + dag-headers staan buiten de onderstaande overflow-y-auto,
            dus blijven ze automatisch zichtbaar tijdens verticaal scrollen door lanes.
            De `sticky top-0` hieronder is een defensieve safety-net voor het geval een
            toekomstige refactor ze binnen de scroll-container plaatst — dan blijft het
            gedrag hetzelfde zonder aanvullende wijziging. */}
        {/* Weather strip */}
        <div className="grid sticky top-0 z-10 border-b border-border bg-background" style={{ gridTemplateColumns: '140px repeat(5, 1fr)' }}>
          <div />
          {werkdagen.map((date) => {
            const w = getWeatherForDate(weather, date);
            return (
              <div key={formatDate(date)} className="border-l border-border">
                {renderWeatherCell(w)}
              </div>
            );
          })}
        </div>

        {/* Day column headers */}
        <div className="grid sticky top-0 z-10 bg-card border-b border-border" style={{ gridTemplateColumns: '140px repeat(5, 1fr)' }}>
          <div className="py-1.5 px-3 bg-card">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Monteur</span>
          </div>
          {werkdagen.map((date) => {
            const dateStr = formatDate(date);
            const isToday = dateStr === todayStr;
            const dayIdx = (date.getDay() + 6) % 7;
            const feestdagInfo = isFeestdag(dateStr, feestdagen);
            return (
              <div
                key={dateStr}
                className={cn(
                  "group relative text-center py-1.5 border-l border-border",
                  feestdagInfo ? "bg-[hsl(var(--status-flame-bg))]/40" : isToday ? "bg-[#1A535C]/[0.04]" : "bg-card",
                  isToday && "border-t-2 border-t-[#F15025]"
                )}
              >
                <div className="flex items-baseline justify-center gap-1.5">
                  <span className={cn("text-[12px] font-bold", feestdagInfo ? "text-[#C03A18]" : isToday ? "text-[#1A535C]" : "text-[#1A4A52] dark:text-foreground")}>
                    {DAG_NAMEN[dayIdx]}
                  </span>
                  <span className={cn("text-[11px] font-mono tabular-nums", feestdagInfo ? "text-[#C03A18]/70" : isToday ? "text-[#1A535C]" : "text-muted-foreground/80")}>
                    {date.getDate()}/{date.getMonth() + 1}
                  </span>
                </div>
                {feestdagInfo && (
                  <div className="text-[9px] font-semibold text-[#C03A18] truncate px-1">{feestdagInfo.naam}</div>
                )}
                {!feestdagInfo && (
                  <button
                    type="button"
                    onClick={() => openNewDialog(dateStr)}
                    title={`Nieuwe afspraak op ${dateStr}`}
                    className="absolute top-1 right-1 h-5 w-5 rounded-none flex items-center justify-center opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-[#F15025] hover:bg-muted transition-all"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Taken-lane — losse taken (met deadline in deze week) verschijnen
            hier zodat collega's hun planning + taken in één scherm hebben.
            Drag-tussen-dagen werkt door deadline van de taak te updaten. */}
        {Object.values(takenPerDag).some(arr => arr.length > 0) && (
          <div
            className="grid border-b border-border bg-[#FAF9F6]"
            style={{ gridTemplateColumns: '140px repeat(5, 1fr)' }}
          >
            <div className="py-2 px-3 flex items-center gap-1.5 border-r border-border">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#1A535C]" />
              <span className="text-[11px] font-semibold text-[#1A535C] uppercase tracking-widest">Taken</span>
            </div>
            {werkdagen.map((date) => {
              const dateStr = formatDate(date);
              const dayTaken = takenPerDag[dateStr] || [];
              const isDragOver = taakDragOverDate === dateStr;
              return (
                <div
                  key={dateStr}
                  className={cn(
                    "border-l border-border p-1.5 space-y-1 min-h-[42px] transition-colors",
                    isDragOver && "bg-[#1A535C]/[0.06] ring-1 ring-inset ring-[#1A535C]/30"
                  )}
                  onDragOver={(e) => {
                    if (!draggingTaakId) return;
                    e.preventDefault();
                    if (taakDragOverDate !== dateStr) setTaakDragOverDate(dateStr);
                  }}
                  onDragLeave={() => {
                    if (taakDragOverDate === dateStr) setTaakDragOverDate(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggingTaakId) {
                      handleDropTaakOnDate(draggingTaakId, dateStr);
                    }
                    setDraggingTaakId(null);
                    setTaakDragOverDate(null);
                  }}
                >
                  {dayTaken.map((t) => {
                    const monteur = monteurMap[t.toegewezen_aan];
                    return (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => {
                          setDraggingTaakId(t.id);
                          e.dataTransfer.effectAllowed = 'move';
                          try { e.dataTransfer.setData('text/plain', t.id); } catch { /* sommige browsers eisen dit */ }
                        }}
                        onDragEnd={() => {
                          setDraggingTaakId(null);
                          setTaakDragOverDate(null);
                        }}
                        title={`${t.titel}${monteur ? ` · ${monteur.naam}` : ''}`}
                        className={cn(
                          "group flex items-center gap-1.5 px-2 py-1 rounded-none bg-card border border-border text-[11px] text-foreground cursor-grab active:cursor-grabbing hover:border-[#1A535C]/40 hover:shadow-sm transition-all",
                          draggingTaakId === t.id && "opacity-50"
                        )}
                      >
                        {t.prioriteit === 'kritiek' && <span className="w-1 h-1 rounded-full bg-[#F15025] flex-shrink-0" />}
                        {t.prioriteit === 'hoog' && <span className="w-1 h-1 rounded-full bg-[#E89A3A] flex-shrink-0" />}
                        <span className="flex-1 truncate">{t.titel}</span>
                        {monteur && (
                          <span className="text-[9px] text-muted-foreground flex-shrink-0">{monteur.naam.split(' ')[0]}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* Monteur lanes — eventueel gegroepeerd per rol (laneGroups). Wanneer
            laneGrouping === 'none' bevat laneGroups één sentinel-groep '__all__'
            zonder header, zodat de output identiek is aan het niet-gegroepeerde
            gedrag. Group-collapse hergebruikt collapsedLanes met prefix 'group:'. */}
        <div className="flex-1 overflow-y-auto">
          {laneGroups.map((group) => {
            const isGroupedMode = group.key !== '__all__';
            const groupCollapseKey = `group:${group.key}`;
            const isGroupCollapsed = isGroupedMode && collapsedLanes.has(groupCollapseKey);
            const groupAfspraakCount = group.monteurs.reduce(
              (n, m) => n + weekAfspraken.filter((a) => a.monteurs.includes(m.id)).length, 0
            );
            const groupHasConflict = group.monteurs.some((m) =>
              weekAfspraken.some((a) => a.monteurs.includes(m.id) && conflictAfspraakIds.has(a.id))
            );
            return (
              <Fragment key={group.key}>
                {isGroupedMode && (
                  <div
                    className="grid border-b border-border bg-background/60"
                    style={{ gridTemplateColumns: '140px repeat(5, 1fr)' }}
                  >
                    <div className="flex items-center gap-1.5 px-2 py-1.5 border-r border-border">
                      <button
                        type="button"
                        onClick={() => toggleLaneCollapsed(groupCollapseKey)}
                        aria-expanded={!isGroupCollapsed}
                        title={isGroupCollapsed ? 'Uitklappen' : 'Inklappen'}
                        className="p-0.5 rounded-none hover:bg-muted transition-colors shrink-0"
                      >
                        <ChevronRight className={cn('h-3 w-3 text-foreground/70 transition-transform', !isGroupCollapsed && 'rotate-90')} />
                      </button>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/70 truncate flex-1">
                        {group.label}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {groupHasConflict && <AlertTriangle className="h-3 w-3 text-[#C03A18]" />}
                        <span className="text-[10px] font-mono text-muted-foreground tabular-nums">{groupAfspraakCount}</span>
                      </div>
                    </div>
                    <div style={{ gridColumn: '2 / -1' }} className="border-l border-border" />
                  </div>
                )}
                {!isGroupCollapsed && group.monteurs.map((monteur) => {
                  const idx = indexById.get(monteur.id) ?? 0;
                  const monteurAfspraken = weekAfspraken.filter((a) => a.monteurs.includes(monteur.id));
                  const isCollapsed = collapsedLanes.has(monteur.id);
                  const laneHasConflict = monteurAfspraken.some((a) => conflictAfspraakIds.has(a.id));
                  return (
                    <div
                      key={monteur.id}
                      className={cn("grid border-b border-border", idx % 2 === 1 && "bg-[#FAFAF9]")}
                      style={{ gridTemplateColumns: '140px repeat(5, 1fr)' }}
                    >
                {/* Monteur label */}
                <div className={cn(
                  "flex items-center gap-1.5 border-r border-border sticky left-0 bg-inherit z-10",
                  isCollapsed ? "px-2 py-1" : "px-3 py-2"
                )}>
                  <button
                    type="button"
                    onClick={() => toggleLaneCollapsed(monteur.id)}
                    className="p-0.5 rounded hover:bg-muted transition-colors shrink-0"
                    title={isCollapsed ? 'Uitklappen' : 'Inklappen'}
                    aria-expanded={!isCollapsed}
                  >
                    <ChevronRight className={cn('h-3 w-3 text-muted-foreground transition-transform', !isCollapsed && 'rotate-90')} />
                  </button>
                  <div
                    className={cn(
                      "rounded-lg flex items-center justify-center font-bold shrink-0",
                      isCollapsed ? "h-5 w-5 text-[9px]" : "h-7 w-7 text-[10px]"
                    )}
                    style={getAvatarStyle(idx)}
                  >
                    {getInitials(monteur.naam)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold text-foreground truncate leading-tight">{monteur.naam}</div>
                    {!isCollapsed && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        <span className="font-mono tabular-nums">{monteurAfspraken.length}</span> deze week
                      </div>
                    )}
                  </div>
                  {isCollapsed && (
                    <div className="flex items-center gap-1 shrink-0">
                      {laneHasConflict && (
                        <AlertTriangle className="h-3 w-3 text-[#C03A18]" />
                      )}
                      <span className="text-[10px] font-mono text-muted-foreground tabular-nums">{monteurAfspraken.length}</span>
                    </div>
                  )}
                </div>
                {/* Day cells — collapsed keeps compact drop-targets so drop op ingeklapte
                    baan (Optie B: auto-expand + toast) werkt per dag, net als uitgeklapt. */}
                {werkdagen.map((date) => {
                  const dateStr = formatDate(date);
                  const isToday = dateStr === todayStr;
                  const feestdagInfo = isFeestdag(dateStr, feestdagen);
                  const dayAfspraken = monteurAfspraken
                    .filter((a) => a.datum === dateStr)
                    .sort((a, b) => a.start_tijd.localeCompare(b.start_tijd));
                  const dragKey = `${monteur.id}-${dateStr}`;

                  return (
                    <div
                      key={dateStr}
                      className={cn(
                        "border-l border-border transition-all duration-200",
                        isCollapsed ? "min-h-[30px]" : "p-1 min-h-[60px]",
                        feestdagInfo ? "bg-[hsl(var(--status-flame-bg))]/15" : isToday && "bg-[#1A535C]/[0.02]",
                        !feestdagInfo && !isCollapsed && dragOverDate !== dragKey && "hover:bg-[#1A535C]/[0.03]",
                        !feestdagInfo && dragOverDate === dragKey && "bg-[#1A535C]/[0.08] ring-2 ring-[#1A535C]/25 ring-inset",
                        feestdagInfo && dragOverDate === dragKey && "ring-2 ring-[#C03A18]/30 ring-inset"
                      )}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = feestdagInfo ? "none" : draggingProjectId ? "copy" : "move";
                        if (dragOverDate !== dragKey) setDragOverDate(dragKey);
                      }}
                      onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverDate(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverDate(null);
                        if (feestdagInfo) {
                          toast.error(`Kan niet inplannen op ${feestdagInfo.naam}`);
                          return;
                        }
                        const id = e.dataTransfer.getData("text/plain");
                        if (!id) return;
                        if (isCollapsed) {
                          toggleLaneCollapsed(monteur.id);
                          toast.info(`Baan uitgeklapt: ${monteur.naam}`);
                        }
                        handleDragDrop(id, dateStr, monteur.id);
                      }}
                    >
                      {!isCollapsed && dayAfspraken.map((a) => renderMontageCard(a))}
                    </div>
                  );
                })}
              </div>
            );
          })}
              </Fragment>
            );
          })}

          {/* Unassigned row */}
          {hasUnassigned && (() => {
            const isCollapsed = collapsedLanes.has(SWIMLANE_UNASSIGNED_KEY);
            const unassignedHasConflict = unassigned.some((a) => conflictAfspraakIds.has(a.id));
            return (
              <div
                className="grid border-b border-border bg-[hsl(var(--status-flame-bg))]/20"
                style={{ gridTemplateColumns: '140px repeat(5, 1fr)' }}
              >
                <div className={cn(
                  "flex items-center gap-1.5 border-r border-border",
                  isCollapsed ? "px-2 py-1" : "px-3 py-2"
                )}>
                  <button
                    type="button"
                    onClick={() => toggleLaneCollapsed(SWIMLANE_UNASSIGNED_KEY)}
                    className="p-0.5 rounded hover:bg-muted transition-colors shrink-0"
                    title={isCollapsed ? 'Uitklappen' : 'Inklappen'}
                    aria-expanded={!isCollapsed}
                  >
                    <ChevronRight className={cn('h-3 w-3 text-muted-foreground transition-transform', !isCollapsed && 'rotate-90')} />
                  </button>
                  <div className={cn(
                    "rounded-lg flex items-center justify-center font-bold bg-muted text-muted-foreground shrink-0",
                    isCollapsed ? "h-5 w-5 text-[9px]" : "h-7 w-7 text-[10px]"
                  )}>?</div>
                  <span className="text-[12px] text-muted-foreground italic truncate flex-1">Niet toegewezen</span>
                  {isCollapsed && (
                    <div className="flex items-center gap-1 shrink-0">
                      {unassignedHasConflict && (
                        <AlertTriangle className="h-3 w-3 text-[#C03A18]" />
                      )}
                      <span className="text-[10px] font-mono text-muted-foreground tabular-nums">{unassigned.length}</span>
                    </div>
                  )}
                </div>
                {isCollapsed ? (
                  <div
                    style={{ gridColumn: '2 / -1' }}
                    className="border-l border-border min-h-[30px] flex items-center"
                  />
                ) : (
                  werkdagen.map((date) => {
                    const dateStr = formatDate(date);
                    const dayUnassigned = unassigned
                      .filter((a) => a.datum === dateStr)
                      .sort((a, b) => a.start_tijd.localeCompare(b.start_tijd));
                    return (
                      <div key={dateStr} className="border-l border-border p-1 min-h-[60px]">
                        {dayUnassigned.map((a) => renderMontageCard(a))}
                      </div>
                    );
                  })
                )}
              </div>
            );
          })()}

          {activeMonteurs.length === 0 && !hasUnassigned && (
            <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
              Geen montages deze week
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderDialog() {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto rounded-2xl p-6">
          <DialogHeader className="pb-1">
            <div className="flex items-start justify-between gap-3 pr-6 flex-wrap">
              <div className="flex-1 min-w-0 space-y-0.5">
                <DialogTitle className="m-0">
                  <div className="group relative">
                    <input
                      type="text"
                      value={formData.titel}
                      onChange={(e) => setFormData((prev) => ({ ...prev, titel: e.target.value }))}
                      placeholder={editingAfspraak ? "Montage afspraak" : "Nieuwe montage afspraak"}
                      aria-label="Titel van montage afspraak"
                      className="bg-transparent border-0 outline-none w-full text-[24px] font-extrabold tracking-[-0.3px] text-foreground placeholder:text-muted-foreground hover:bg-background focus:bg-background rounded-lg px-2 -mx-2 py-0.5 pr-7 transition-colors truncate leading-tight"
                    />
                    <Pencil className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-0 transition-opacity pointer-events-none" />
                  </div>
                </DialogTitle>
                {editingAfspraak && STATUS_CONFIG[formData.status] && (
                  <div className="text-[13px] text-foreground/70 font-medium px-0">
                    {STATUS_CONFIG[formData.status].label}<span className="text-[#F15025]">.</span>
                  </div>
                )}
              </div>
              {formData.project_id && (
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      const project = projecten.find((p) => p.id === formData.project_id);
                      setDialogOpen(false);
                      navigateWithTab({
                        path: `/projecten/${formData.project_id}`,
                        label: project?.naam || 'Project',
                        id: `/projecten/${formData.project_id}`,
                      });
                    }}
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-[#1A535C] hover:text-[#143F46] hover:underline shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A535C]/30 focus-visible:ring-offset-1"
                  >
                    Open project
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Project — context bovenin */}
            <div className="space-y-1.5">
              <Label htmlFor="project" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Project</Label>
              <Select value={formData.project_id} onValueChange={handleProjectChange}>
                <SelectTrigger id="project">
                  {formData.project_id ? (
                    <span className="truncate inline-flex items-baseline gap-1.5">
                      <span>{projecten.find((p) => p.id === formData.project_id)?.naam}</span>
                      {formData.klant_naam && (
                        <span className="text-muted-foreground text-[12px] truncate">· {formData.klant_naam}</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Selecteer project</span>
                  )}
                </SelectTrigger>
                <SelectContent>
                  {projecten.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex flex-col leading-tight">
                        <span className="text-[13px]">{project.naam}</span>
                        {project.klant_naam && (
                          <span className="text-[11px] text-muted-foreground">{project.klant_naam}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Wanneer */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="datum" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Datum</Label>
                <DatePicker
                  value={formData.datum}
                  onChange={(v) => setFormData((prev) => ({ ...prev, datum: v }))}
                  asInput
                />
                {formData.datum && isFeestdag(formData.datum, feestdagen) && (
                  <div className="flex items-center gap-1.5 text-[12px] text-[#C03A18] font-medium bg-[hsl(var(--status-flame-bg))] rounded-lg px-2.5 py-1.5 mt-1">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Let op: {isFeestdag(formData.datum, feestdagen)!.naam}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_tijd" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Start</Label>
                <Input
                  id="start_tijd"
                  type="time"
                  value={formData.start_tijd}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      start_tijd: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eind_tijd" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Eind</Label>
                <Input
                  id="eind_tijd"
                  type="time"
                  value={formData.eind_tijd}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      eind_tijd: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {/* Locatie */}
            <div className="space-y-1.5">
              <Label htmlFor="locatie" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Locatie</Label>
              <Input
                id="locatie"
                value={formData.locatie}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, locatie: e.target.value }))
                }
                placeholder="Adres montage"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Medewerkers</Label>
              <div className="flex flex-wrap gap-2">
                {monteurs.map((monteur, idx) => {
                  const selected = formData.monteurs.includes(monteur.id);
                  return (
                    <button
                      key={monteur.id}
                      type="button"
                      onClick={() => toggleMonteur(monteur.id)}
                      className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
                        selected
                          ? "text-white ring-2 ring-offset-1 ring-[#1A535C]"
                          : "bg-muted text-muted-foreground hover:bg-[#E5E3DE]"
                      )}
                      style={selected ? getAvatarStyle(idx) : undefined}
                      title={monteur.naam}
                      aria-pressed={selected}
                    >
                      {getInitials(monteur.naam)}
                    </button>
                  );
                })}
              </div>

              {/* Live conflict warning in form */}
              {formData.datum && formData.start_tijd && formData.eind_tijd && formData.monteurs.length > 0 && (() => {
                const formConflicts = afspraken.filter((a) => {
                  if (editingAfspraak && a.id === editingAfspraak.id) return false;
                  if (a.datum !== formData.datum) return false;
                  if (a.status === "afgerond" || a.status === "uitgesteld") return false;
                  if (a.start_tijd >= formData.eind_tijd || a.eind_tijd <= formData.start_tijd) return false;
                  return a.monteurs.some((m) => formData.monteurs.includes(m));
                });
                if (formConflicts.length === 0) return null;
                return (
                  <div className="mt-2 rounded-lg border border-[#F0C8BC] bg-[hsl(var(--status-flame-bg))]/60 p-3">
                    <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#C03A18] mb-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Overlap gedetecteerd
                    </div>
                    {formConflicts.map((a) => {
                      const overlappingMonteurs = a.monteurs
                        .filter((m) => formData.monteurs.includes(m))
                        .map((m) => monteurMap[m]?.naam || "?")
                        .join(", ");
                      return (
                        <p key={a.id} className="text-[11px] text-[#C03A18]/85">
                          {overlappingMonteurs} heeft al &quot;{a.titel}&quot; van {a.start_tijd} tot {a.eind_tijd}
                        </p>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notities" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Notities</Label>
              <Textarea
                id="notities"
                value={formData.beschrijving}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, beschrijving: e.target.value }))
                }
                placeholder="Werkzaamheden, materialen, bijzonderheden..."
                rows={3}
              />
            </div>

            {/* Werkbon — koppelen aan een werkbon (optioneel) */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                <ClipboardCheck className="h-3 w-3" />
                Werkbon
              </Label>
              <div className="flex gap-1.5">
                <Select
                  value={formData.werkbon_id || "__none__"}
                  onValueChange={async (v) => {
                    if (v === "__new__") {
                      if (!formData.project_id) {
                        toast.error("Selecteer eerst een project");
                        return;
                      }
                      try {
                        const wb = await createWerkbon({
                          user_id: user?.id || "",
                          klant_id: formData.klant_id,
                          project_id: formData.project_id,
                          titel: formData.titel || "",
                          datum: formatDate(new Date()),
                          status: "concept",
                          toon_briefpapier: false,
                        });
                        logCreate({ user, entityType: 'werkbon', entityId: wb.id });
                        setProjectWerkbonnen((prev) => [...prev, wb]);
                        setFormData((prev) => ({ ...prev, werkbon_id: wb.id }));
                        toast.success(`Werkbon ${wb.werkbon_nummer} aangemaakt`);
                      } catch (err) {
                        logger.error('Werkbon aanmaken mislukt:', err)
                        toast.error("Kon werkbon niet aanmaken");
                      }
                    } else {
                      setFormData((prev) => ({ ...prev, werkbon_id: v === "__none__" ? "" : v }));
                    }
                  }}
                >
                  <SelectTrigger className="h-9 flex-1">
                    <SelectValue placeholder="Geen werkbon" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Geen werkbon</SelectItem>
                    {projectWerkbonnen.map((wb) => (
                      <SelectItem key={wb.id} value={wb.id}>
                        <span className="font-mono text-xs">{wb.werkbon_nummer}</span>
                        <span className="ml-1 text-xs text-muted-foreground truncate">{wb.titel}</span>
                      </SelectItem>
                    ))}
                    {formData.project_id && (
                      <SelectItem value="__new__">
                        <span className="flex items-center gap-1 text-primary font-medium">
                          <Plus className="h-3 w-3" /> Nieuwe werkbon
                        </span>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {formData.werkbon_id && formData.werkbon_id !== "__none__" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    title="Werkbon openen in nieuw tabblad"
                    onClick={() => window.open(`/werkbonnen/${formData.werkbon_id}`, "_blank")}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Bijlagen — compact */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                <Paperclip className="h-3 w-3" />
                Bijlagen
                {formData.bijlagen.length > 0 && (
                  <span className="text-[10px] font-mono text-muted-foreground normal-case tracking-normal">{formData.bijlagen.length}</span>
                )}
              </Label>

              {formData.bijlagen.length > 0 && (
                <div className="space-y-1.5">
                  {formData.bijlagen.map((bijlage) => (
                    <div key={bijlage.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-background">
                      {bijlage.type === 'pdf' ? (
                        <FileText className="h-4 w-4 text-[#C03A18] flex-shrink-0" />
                      ) : bijlage.type === 'tekening' || bijlage.type === 'foto' ? (
                        <Image className="h-4 w-4 text-[#3A6B8C] flex-shrink-0" />
                      ) : (
                        <Paperclip className="h-4 w-4 text-foreground/70 flex-shrink-0" />
                      )}
                      <span className="text-[13px] text-foreground truncate flex-1">{bijlage.naam}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-medium flex-shrink-0">{bijlage.type}</span>
                      <button type="button" title="Bekijken" onClick={() => window.open(bijlage.url, '_blank')} className="text-muted-foreground hover:text-[#1A535C] transition-colors flex-shrink-0">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Printen"
                        onClick={() => { const w = window.open(bijlage.url, '_blank'); if (w) { w.addEventListener('load', () => w.print()) } }}
                        className="text-muted-foreground hover:text-[#1A535C] transition-colors flex-shrink-0"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, bijlagen: prev.bijlagen.filter((b) => b.id !== bijlage.id) }))}
                        className="text-muted-foreground hover:text-[#C03A18] transition-colors flex-shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <label className="inline-flex items-center gap-1 cursor-pointer text-[13px] font-medium text-[#F15025] hover:text-[#D4452A] transition-colors w-fit">
                <span className="font-semibold">+</span>
                {formData.bijlagen.length === 0 ? 'Bestand toevoegen' : 'Nog een bestand'}
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  multiple
                  onChange={async (e) => {
                    const files = e.target.files
                    if (!files) return
                    for (const file of Array.from(files)) {
                      try {
                        const bijlage = await uploadMontageBijlage(file)
                        setFormData((prev) => ({ ...prev, bijlagen: [...prev.bijlagen, bijlage] }))
                      } catch (err) {
                        logger.error('Bijlage uploaden mislukt:', err)
                        toast.error(`Kon ${file.name} niet uploaden`)
                      }
                    }
                    e.target.value = ''
                  }}
                />
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            {editingAfspraak && (
              <button
                type="button"
                onClick={() => {
                  handleDelete(editingAfspraak.id);
                  setDialogOpen(false);
                }}
                className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-[#C03A18] transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Verwijderen
              </button>
            )}
            <div className="flex-1" />
            {editingAfspraak && formData.status !== 'afgerond' && (() => {
              const project = projecten.find((p) => p.id === formData.project_id);
              const blocking = project ? FASES_BLOKKEREN_AFRONDEN.includes(project.status) : false;
              if (blocking) {
                return (
                  <button
                    type="button"
                    onClick={handleAfronden}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[13px] font-medium text-[#1A535C] border border-[#1A535C]/30 hover:bg-[#1A535C] hover:text-white hover:border-[#1A535C] transition-all"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Afronden
                  </button>
                );
              }
              return (
                <DropdownMenu open={afrondenMenuOpen} onOpenChange={setAfrondenMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[13px] font-medium text-[#1A535C] border border-[#1A535C]/30 hover:bg-[#1A535C] hover:text-white hover:border-[#1A535C] transition-all"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Afronden
                      <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[220px]">
                    <DropdownMenuItem
                      onClick={handleAfronden}
                      className="flex flex-col items-start gap-0.5 py-1.5 data-[highlighted]:bg-background data-[highlighted]:text-foreground"
                    >
                      <span className="text-[13px] font-medium">Alleen afronden</span>
                      <span className="text-[11px] opacity-60">Project blijft in huidige fase</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleAfrondenEnFactureren}
                      className="flex flex-col items-start gap-0.5 py-1.5 data-[highlighted]:bg-background data-[highlighted]:text-foreground"
                    >
                      <span className="text-[13px] font-medium">
                        Afronden &amp; factureren<span className="text-[#F15025]">.</span>
                      </span>
                      <span className="text-[11px] opacity-60">Project naar 'Te factureren'</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })()}
            <Button onClick={handleSubmit}>
              {editingAfspraak ? "Opslaan" : "Aanmaken"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full overflow-hidden bg-background">
        {/* Sidebar (Te plannen) */}
        <div className="hidden md:flex flex-col w-64 flex-shrink-0 border-r border-border bg-card p-3 gap-2">
          <Skeleton className="h-5 w-28 mb-2" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-none border border-border p-3 space-y-2">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
        {/* Main grid */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card flex-shrink-0">
            <Skeleton className="h-7 w-20 rounded-md" />
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-5 w-32" />
            <div className="flex-1" />
            <Skeleton className="h-7 w-24 rounded-md" />
            <Skeleton className="h-7 w-32 rounded-md" />
          </div>
          {/* Day-strip + monteur lanes */}
          <div className="flex-1 overflow-hidden">
            <div className="flex border-b-2 border-border bg-[#FAFAF9]">
              <div className="w-32 flex-shrink-0 border-r border-border" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex-1 min-w-0 text-center py-3 border-l border-border/30 space-y-1">
                  <Skeleton className="h-3 w-10 mx-auto" />
                  <Skeleton className="h-4 w-6 mx-auto" />
                </div>
              ))}
            </div>
            {Array.from({ length: 4 }).map((_, laneIdx) => (
              <div key={laneIdx} className="flex border-b border-border">
                <div className="w-32 flex-shrink-0 p-2 flex items-center gap-2 border-r border-border">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
                {Array.from({ length: 5 }).map((_, dayIdx) => (
                  <div key={dayIdx} className="flex-1 min-w-0 p-2 border-l border-border/30">
                    {(laneIdx + dayIdx) % 3 === 0 && <Skeleton className="h-12 w-full rounded-md" />}
                    {(laneIdx + dayIdx) % 4 === 1 && <Skeleton className="h-8 w-full rounded-md" />}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-60px)] overflow-hidden bg-background">
      {/* ── Left sidebar: Te plannen (inklapbaar) ── */}
      <div className={cn(
        "shrink-0 bg-card border-r border-border flex flex-col rounded-none transition-[width] duration-200",
        sidebarCollapsed ? "w-11" : "w-[200px]"
      )}>
        {sidebarCollapsed ? (
          <div className="flex flex-col items-center pt-4 gap-3">
            <button
              type="button"
              onClick={toggleSidebar}
              title="Te plannen tonen"
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-[#1A535C] hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {tePlannenProjecten.length > 0 && (
              <span
                className="text-[10px] font-bold flex items-center justify-center tabular-nums"
                style={{ backgroundColor: '#FDE8E2', color: '#F15025', minWidth: '20px', height: '20px', padding: '0 5px' }}
              >
                {tePlannenProjecten.length}
              </span>
            )}
          </div>
        ) : (
        <>
        {/* Compacte paginatitel */}
        <div className="px-4 pt-5 pb-3 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-baseline gap-2 min-w-0">
            <h1 className="text-[17px] font-bold tracking-[-0.3px] text-[#1A4A52] dark:text-foreground leading-none">
              Planning<span className="text-[#F15025]">.</span>
            </h1>
            <span className="text-[11px] font-mono tabular-nums text-muted-foreground">
              {stats.totaalWeek}
            </span>
          </div>
          <button
            type="button"
            onClick={toggleSidebar}
            title="Te plannen inklappen"
            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-[#1A535C] hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] transition-colors shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Te plannen section */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-3 py-2.5 flex items-center justify-between border-l-2 border-l-[#1A535C] shrink-0">
            <h2 className="text-[11px] font-bold text-[#F15025] uppercase tracking-wider">Te plannen</h2>
            <span
              className="text-[11px] font-bold flex items-center justify-center rounded-none"
              style={{ backgroundColor: '#FDE8E2', color: '#F15025', minWidth: '24px', height: '24px', padding: '0 6px' }}
            >
              {tePlannenProjecten.length}
            </span>
          </div>
          {tePlannenProjecten.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-3 text-[11px] text-muted-foreground/80">
              <Check className="h-3.5 w-3.5" />
              <span>Niets te plannen</span>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-2">
              {tePlannenProjecten.map((project) => {
                const isPrio = project.prioriteit === 'hoog' || project.prioriteit === 'kritiek';
                return (
                  <div
                    key={project.id}
                    draggable
                    onDragStart={(e) => {
                      setDraggingProjectId(project.id);
                      e.dataTransfer.effectAllowed = "copyMove";
                      e.dataTransfer.setData("text/plain", `project:${project.id}`);
                      const ghost = e.currentTarget.cloneNode(true) as HTMLElement;
                      ghost.style.width = `${e.currentTarget.offsetWidth}px`;
                      ghost.style.background = '#fff';
                      ghost.style.borderRadius = '8px';
                      ghost.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
                      ghost.style.opacity = '0.95';
                      ghost.style.position = 'absolute';
                      ghost.style.top = '-1000px';
                      document.body.appendChild(ghost);
                      e.dataTransfer.setDragImage(ghost, 20, 20);
                      requestAnimationFrame(() => document.body.removeChild(ghost));
                    }}
                    onDragEnd={() => { setDraggingProjectId(null); setDragOverDate(null); }}
                    onClick={() => openNewDialogFromProject(project)}
                    className={cn(
                      "group/card relative w-full text-left border-l-2 rounded-none transition-colors duration-150 cursor-grab active:cursor-grabbing select-none hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.05]",
                      isPrio
                        ? "border-l-[#F15025]"
                        : "border-l-[#1A535C]/35",
                      draggingProjectId === project.id && "opacity-50"
                    )}
                    style={{ padding: '8px 10px' }}
                  >
                    <div className="pr-5">
                      <div className="text-[13px] font-medium truncate leading-tight text-foreground">{project.naam}</div>
                      {project.klant_naam && (
                        <div className="text-[11px] text-muted-foreground truncate mt-0.5">{project.klant_naam}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleProjectPrio(project); }}
                      title={isPrio ? "Prioriteit weghalen" : "Prioriteit geven"}
                      className={cn(
                        "absolute top-1.5 right-1.5 h-5 w-5 rounded flex items-center justify-center transition-all",
                        isPrio
                          ? "text-[#F15025] opacity-100"
                          : "text-muted-foreground/80 opacity-0 group-hover/card:opacity-100 hover:text-[#F15025]"
                      )}
                    >
                      <Flame className={cn("h-3.5 w-3.5", isPrio && "fill-[#F15025]")} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar footer: stats */}
        <div className="px-3 py-2.5 border-t border-border text-[11px] text-foreground/70 space-y-0.5">
          <div>
            <span className="font-mono tabular-nums">{stats.totaalWeek}</span> montages<span className="text-[#F15025]">.</span>
          </div>
          <div>
            <span className="font-mono tabular-nums">{stats.monteursBeschikbaar}</span> beschikbaar<span className="text-[#F15025]">.</span>
          </div>
        </div>
        </>
        )}
      </div>

      {/* ── Right content: member's week planning ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Scope pills */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card">
          <div className="inline-flex items-center gap-0.5 rounded-none p-0.5 bg-background border border-border">
          <button
            type="button"
            onClick={setScopeAlle}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-none text-[13px] font-medium px-3 py-1 transition-colors",
              scopeMode === 'alle'
                ? "bg-[#1A535C]/[0.10] text-[#1A535C]"
                : "text-foreground/70 hover:text-[#1A535C]"
            )}
          >
            <Users className="h-3.5 w-3.5" />
            Iedereen
          </button>
          <button
            type="button"
            onClick={() => eigenMedewerker && setScopeMijn(eigenMedewerker.id)}
            disabled={!eigenMedewerker}
            title={!eigenMedewerker ? 'Geen gekoppeld medewerker-profiel' : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-none text-[13px] font-medium px-3 py-1 transition-colors",
              scopeMode === 'mijn'
                ? "bg-[#1A535C]/[0.10] text-[#1A535C]"
                : "text-foreground/70 hover:text-[#1A535C]",
              !eigenMedewerker && "opacity-50 cursor-not-allowed hover:text-foreground/70"
            )}
          >
            <User className="h-3.5 w-3.5" />
            Mijn week
          </button>
          <Select
            value={scopeMode === 'medewerker' && selectedMonteur !== 'alle' ? selectedMonteur : ''}
            onValueChange={(v) => setSelectedMonteur(v)}
          >
            <SelectTrigger
              className={cn(
                "inline-flex items-center gap-1.5 h-auto w-auto rounded-none text-[13px] font-medium px-3 py-1 border-0 transition-colors focus:ring-0 focus:ring-offset-0",
                scopeMode === 'medewerker'
                  ? "bg-[#1A535C]/[0.10] text-[#1A535C]"
                  : "text-foreground/70 hover:text-[#1A535C] bg-transparent"
              )}
            >
              <User className="h-3.5 w-3.5 mr-1" />
              <SelectValue placeholder="Per persoon" />
            </SelectTrigger>
            <SelectContent>
              {monteurs.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.naam}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>

          <div className="flex-1" />

          <div className="inline-flex rounded-none border border-border p-0.5 bg-background">
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={cn(
                "px-2.5 py-1 rounded-none text-[12px] font-medium transition-colors",
                viewMode === 'week' ? "bg-[#1A535C]/[0.10] text-[#1A535C]" : "text-foreground/70 hover:text-[#1A535C]"
              )}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setViewMode('maand')}
              className={cn(
                "px-2.5 py-1 rounded-none text-[12px] font-medium transition-colors",
                viewMode === 'maand' ? "bg-[#1A535C]/[0.10] text-[#1A535C]" : "text-foreground/70 hover:text-[#1A535C]"
              )}
            >
              Maand
            </button>
          </div>
        </div>
        {/* Conflict banner */}
        {conflicts.length > 0 && (
          <div className="bg-[hsl(var(--status-flame-bg))] border-b border-[#F0C8BC] px-4 py-2 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-[#C03A18] shrink-0" />
            <span className="text-xs text-[#C03A18]">
              <span className="font-semibold">{conflicts.length} overlap{conflicts.length !== 1 ? "s" : ""}</span>
              {conflicts.slice(0, 2).map((c, idx) => (
                <span key={idx} className="ml-2">{c.monteurNaam}: {c.afspraak1.titel} / {c.afspraak2.titel}</span>
              ))}
            </span>
          </div>
        )}

        {/* Main view */}
        <div className="flex-1 overflow-auto">
          {viewMode === 'maand'
            ? renderMonthView()
            : selectedMonteur === "alle"
              ? renderMultiMonteurView()
              : renderMemberWeekView()}
        </div>
      </div>

      {renderDialog()}

      {/* Werkbon aanmaken vanuit montage */}
      {werkbonMontage && werkbonMontage.project_id && (() => {
        const project = projecten.find(p => p.id === werkbonMontage.project_id);
        const projectOffertes = offertes.filter(o => o.project_id === werkbonMontage.project_id);
        const klant = klanten.find(k => k.id === project?.klant_id) || null;
        return (
          <WerkbonVanProjectDialog
            open={werkbonDialogOpen}
            onOpenChange={(open) => {
              setWerkbonDialogOpen(open);
              if (!open) setWerkbonMontage(null);
            }}
            projectId={werkbonMontage.project_id}
            klantId={project?.klant_id || ''}
            klant={klant}
            offertes={projectOffertes}
            montageAfspraak={werkbonMontage}
          />
        );
      })()}
    </div>
  );
}
