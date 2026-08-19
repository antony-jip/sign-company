import { useState, useEffect, useMemo, useCallback, useRef, Fragment } from "react";
import { logger } from '../../utils/logger'
import { DatePicker } from '@/components/ui/date-picker'
import { useWeekWeather, getWeatherForDate, WeerIcon } from "./WeatherDayStrip";
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
  CalendarOff,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Plus,
  List,
  Clock,
  MapPin,
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
  Paperclip,
  FileText,
  Image,
  Upload,
  Eye,
  ArrowUpRight,
  ExternalLink,
  Check,
  Flame,
  ChevronDown,
  StickyNote,
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
import { getDagNotities, upsertDagNotitie, deleteDagNotitie, getVrijPatronen, createVrijPatroon, updateVrijPatroon, deleteVrijPatroon, getAfwezigheid, createAfwezigheid, deleteAfwezigheid } from "@/services/planningService";
import type { MontageAfspraak, MontageBijlage, Project, Medewerker, Klant, Offerte, Werkbon, Taak, DagNotitie, VrijPatroon, Afwezigheid, AfwezigheidType } from "@/types";
import { buildAfwezigheidIndex, resolveAfwezig } from "@/utils/afwezigheid";
import { MontageTijdlijnView } from '@/components/planning/MontageTijdlijnView';
import { ModuleToolbar } from '@/components/layouts/ModuleToolbar';
import { ProjectCombobox } from '@/components/shared/ProjectCombobox';
import { AfwezigheidPopover } from "./AfwezigheidPopover";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ClipboardCheck } from "lucide-react";
import { uploadMontageBijlage } from '@/services/storageService';
import { getCached, fetchQuery } from '@/lib/queryCache';
import { WerkbonVanProjectDialog } from "@/components/werkbonnen/WerkbonVanProjectDialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getNederlandseFeestdagen, isFeestdag } from "@/utils/feestdagen";
import { confirm } from '@/components/shared/ConfirmDialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { useAuth } from "@/contexts/AuthContext";
import { logCreate, logWijziging } from "@/utils/auditLogger";
import { getFase } from "@/utils/projectFases";
import { getAvatarStyle } from "@/utils/medewerkerAvatar";
import { isAdminUser } from "@/utils/authHelpers";
import { Skeleton } from "@/components/ui/skeleton";
import { useOptimisticState } from "@/hooks/useOptimistic";
import { useStilleRefresh } from "@/hooks/useStilleRefresh";
import { useNavigateWithTab } from "@/hooks/useNavigateWithTab";

const SWIMLANE_COLLAPSED_KEY = 'doen_planning_swimlane_collapsed';
const SWIMLANE_UNASSIGNED_KEY = '__ongetoewezen__';
const HIDE_EMPTY_LANES_KEY = 'doen_planning_hide_empty_lanes';

// Vrije/afwezige dag: heel licht petrol-blue frosted-glass blok, full-bleed
// zodat het strak boven en onder aansluit binnen de cel/kolom.
const AFWEZIG_GLASS = "bg-gradient-to-b from-petrol/[0.08] to-petrol/[0.035] backdrop-blur-[2px]";
const LANE_GROUPING_KEY = 'doen_planning_lane_grouping';
const PLANNING_FILTER_KEY = 'doen_planning_filter_v1';
const PLANNING_SCOPE_KEY = 'doen_planning_scope_v1';
const PLANNING_VIEWMODE_KEY = 'doen_planning_viewmode_v1';
const PLANNING_ZOOM_KEY = 'doen_planning_zoom_v1';

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
  "te-plannen": { label: "Te plannen", text: "#B5451F", bg: "#FCEEE8", border: "#F3D2C4", dot: "#F15025" },
  gepland: { label: "Gepland", text: "#3A5A9A", bg: "#E8EEF9", border: "#C5D5EA", dot: "#4A7AC7" },
  onderweg: { label: "Onderweg", text: "#8A6A2A", bg: "#F5F2E8", border: "#E5DCC8", dot: "#C49A30" },
  bezig: { label: "Bezig", text: "#3A7D52", bg: "#E8F2EC", border: "#C5E0D0", dot: "#4AA366" },
  afgerond: { label: "Afgerond", text: "#1A535C", bg: "#E2F0F0", border: "#C0DDDD", dot: "#2A8A8A" },
  uitgesteld: { label: "Uitgesteld", text: "#C03A18", bg: "#FDE8E2", border: "#F0C8BC", dot: "#E04A28" },
};

// Dark-aware kaart/pill-classes · STATUS_CONFIG levert light-pastels via
// inline style; in dark mode moeten bg en tekst via classes schakelen,
// anders krijg je witte tekst op pastel (onleesbaar).
const STATUS_CARD_BG: Record<MontageAfspraak["status"], string> = {
  "te-plannen": "bg-[#FCEEE8] dark:bg-[rgba(241,80,37,0.13)]",
  gepland: "bg-[#E8EEF9] dark:bg-[rgba(74,122,199,0.16)]",
  onderweg: "bg-[#F5F2E8] dark:bg-[rgba(196,154,48,0.15)]",
  bezig: "bg-[#E8F2EC] dark:bg-[rgba(74,163,102,0.15)]",
  afgerond: "",
  uitgesteld: "bg-[#FDE8E2] dark:bg-[rgba(224,74,40,0.15)]",
};
const STATUS_PILL_CLASSES: Record<MontageAfspraak["status"], string> = {
  "te-plannen": "bg-[#FCEEE8] text-[#B5451F] dark:bg-[rgba(241,80,37,0.16)] dark:text-[#FF9166]",
  gepland: "bg-[#E8EEF9] text-[#3A5A9A] dark:bg-[rgba(74,122,199,0.20)] dark:text-[#7FA8E6]",
  onderweg: "bg-[#F5F2E8] text-[#8A6A2A] dark:bg-[rgba(196,154,48,0.18)] dark:text-[#D4B566]",
  bezig: "bg-[#E8F2EC] text-[#3A7D52] dark:bg-[rgba(74,163,102,0.18)] dark:text-[#7AAF85]",
  afgerond: "bg-[#E2F0F0] text-petrol dark:bg-[rgba(42,138,138,0.18)] dark:text-[#5FB5C0]",
  uitgesteld: "bg-[#FDE8E2] text-[#C03A18] dark:bg-[rgba(224,74,40,0.18)] dark:text-[#FF8866]",
};
const PRIO_CARD_BG_CLASS = "bg-[rgba(241,80,37,0.06)] dark:bg-[rgba(241,80,37,0.15)]";
const FALLBACK_CARD_BG_CLASS = "bg-[rgba(26,83,92,0.04)] dark:bg-[rgba(95,181,192,0.10)]";

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

// Org-brede dagnotitie onder de dag-header. Toont de notitie als subtiel
// petrol-regeltje; klikken opent een popover om te bewerken. Lege dagen
// tonen pas bij hover een fijne 'notitie'-affordance. Leeg opslaan wist.
function DagNotitiePopover({
  datum,
  notitie,
  label,
  onSave,
}: {
  datum: string;
  notitie: string;
  label: string;
  onSave: (datum: string, tekst: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(notitie);

  const commit = (next: string) => {
    if (next.trim() !== notitie.trim()) onSave(datum, next);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        if (o) setDraft(notitie);
        else commit(draft);
        setOpen(o);
      }}
    >
      <PopoverTrigger asChild>
        {notitie ? (
          <button
            type="button"
            title={`${notitie} · klik om te bewerken`}
            className="mx-auto mt-1 flex max-w-[95%] items-center gap-1 rounded-full bg-flame/[0.07] dark:bg-flame/[0.12] px-2 py-[2px] text-[10px] font-medium leading-tight text-petrol dark:text-foreground/80 ring-1 ring-inset ring-flame/15 dark:ring-flame/25 hover:bg-flame/[0.12] dark:hover:bg-flame/[0.18] transition-colors"
          >
            <StickyNote className="h-2.5 w-2.5 shrink-0 text-flame" />
            <span className="truncate">{notitie}</span>
          </button>
        ) : (
          <button
            type="button"
            title={`Notitie voor ${label}`}
            className="mx-auto mt-1 flex items-center gap-1 rounded-full px-2 py-[2px] text-[10px] font-medium leading-tight text-muted-foreground/60 opacity-0 group-hover:opacity-100 hover:text-petrol dark:hover:text-foreground hover:bg-petrol/[0.06] dark:hover:bg-white/[0.06] transition-all"
          >
            <StickyNote className="h-2.5 w-2.5 shrink-0" />
            notitie
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align="center" className="w-64 overflow-hidden rounded-xl border-[rgba(26,83,92,0.12)] p-0 shadow-[0_8px_28px_-6px_rgba(26,83,92,0.28)]">
        <div className="flex items-center gap-2 px-3.5 pt-3 pb-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-flame/10">
            <StickyNote className="h-3 w-3 text-flame" />
          </span>
          <div className="leading-tight">
            <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">Dagnotitie</div>
            <div className="text-[12px] font-semibold text-petrol dark:text-foreground">{label}</div>
          </div>
        </div>
        <div className="px-3.5 pb-3">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                commit(draft);
                setOpen(false);
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setOpen(false);
              }
            }}
            rows={2}
            placeholder="Bijv. ZZP'er werkt vandaag"
            className="w-full resize-none rounded-lg border border-[rgba(26,83,92,0.14)] dark:border-white/15 bg-[#FAFBFB] dark:bg-white/[0.05] px-2.5 py-2 text-[12px] leading-snug outline-none placeholder:text-muted-foreground/45 focus:border-petrol dark:focus:border-white/25 focus:bg-white dark:focus:bg-card focus:ring-2 focus:ring-petrol/15 dark:focus:ring-white/10 transition-colors"
          />
          <div className="mt-2.5 flex items-center justify-end gap-1">
            {notitie && (
              <button
                type="button"
                onClick={() => { onSave(datum, ""); setOpen(false); }}
                className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[#C03A18] hover:bg-[#C03A18]/[0.08] transition-colors"
              >
                Verwijderen
              </button>
            )}
            <button
              type="button"
              onClick={() => { commit(draft); setOpen(false); }}
              className="rounded-lg bg-petrol px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-[#16444c] active:scale-[0.98] transition-all"
            >
              Opslaan
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function MontagePlanningLayout() {
  const { user, userRol } = useAuth();
  const { navigateWithTab } = useNavigateWithTab();
  const [currentMonday, setCurrentMonday] = useState<Date>(() =>
    getMondayOfWeek(new Date())
  );
  // Zoom · niet iedereen leest 11px net zo makkelijk. Blijft staan tussen
  // sessies, want wie hem nodig heeft, heeft hem elke dag nodig.
  const [stapelZoom, setStapelZoomState] = useState<number>(() => {
    try {
      const raw = Number(localStorage.getItem(PLANNING_ZOOM_KEY));
      return raw >= 90 && raw <= 160 ? raw : 100;
    } catch {
      return 100;
    }
  });
  const zoomStap = useCallback((delta: number) => {
    setStapelZoomState((z) => {
      const next = Math.min(160, Math.max(90, z + delta));
      try { localStorage.setItem(PLANNING_ZOOM_KEY, String(next)); } catch { /* private mode */ }
      return next;
    });
  }, []);

  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    try {
      const raw = localStorage.getItem(PLANNING_VIEWMODE_KEY);
      if (raw === 'maand') return 'maand';
      // Wie 'stapel' of 'tijdlijn' opgeslagen had komt in de week uit · er is
      // nog maar één weekweergave om naartoe te gaan.
      return 'week';
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
  // Taken in /planning · sommige collega's plannen hier hun losse taken
  // naast de montage-afspraken in.
  const [taken, setTaken] = useState<Taak[]>(() => getCached<Taak[]>('taken') ?? []);
  const [dagNotities, setDagNotities] = useState<DagNotitie[]>(() => getCached<DagNotitie[]>('dagNotities') ?? []);
  const [vrijPatronen, setVrijPatronen] = useState<VrijPatroon[]>(() => getCached<VrijPatroon[]>('vrijPatronen') ?? []);
  const [afwezigheden, setAfwezigheden] = useState<Afwezigheid[]>(() => getCached<Afwezigheid[]>('afwezigheid') ?? []);
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
    new Set(["te-plannen", "gepland", "onderweg", "bezig", "afgerond", "uitgesteld"])
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
      const [afsprakenData, medewerkerData, projectData, klantenData, offertesData, takenData, dagNotitiesData, vrijPatronenData, afwezigheidData] = await Promise.all([
        fetchQuery('montageAfspraken', getMontageAfspraken).catch(() => []),
        fetchQuery('medewerkers', getMedewerkers).catch(() => []),
        fetchQuery('projecten', getProjecten).catch(() => []),
        fetchQuery('klanten', getKlanten).catch(() => []),
        fetchQuery('offertes', getOffertes).catch(() => []),
        fetchQuery('taken', getTaken).catch(() => []),
        fetchQuery('dagNotities', getDagNotities).catch(() => []),
        fetchQuery('vrijPatronen', getVrijPatronen).catch(() => []),
        fetchQuery('afwezigheid', getAfwezigheid).catch(() => []),
      ]);

      setAfspraken(afsprakenData || []);
      setMedewerkers(medewerkerData || []);
      setProjecten(projectData || []);
      setKlanten(klantenData || []);
      setOffertes(offertesData || []);
      setTaken(takenData || []);
      setDagNotities(dagNotitiesData || []);
      setVrijPatronen(vrijPatronenData || []);
      setAfwezigheden(afwezigheidData || []);
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

  // Stille verversing zodat planners elkaars wijzigingen zien; nooit tijdens
  // een sleep, resize of open dialoog (de D&D-logica zelf blijft ongemoeid).
  useStilleRefresh({
    verversen: loadData,
    magVerversen: () =>
      !draggingAfspraakId && !draggingTaakId && !draggingProjectId && !dragOverDate &&
      !resizingId && !dialogOpen && !werkbonDialogOpen && !afrondenMenuOpen,
  });

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
    if (isAdminUser(userRol)) return;
    setSelectedMonteurState(eigenMedewerker.id);
    setFilterInitialized(true);
  }, [filterInitialized, user, eigenMedewerker, userRol]);

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

  const dagNotitieMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const n of dagNotities) map[n.datum] = n.notitie;
    return map;
  }, [dagNotities]);

  const handleSaveDagNotitie = useCallback(async (datum: string, tekst: string) => {
    const trimmed = tekst.trim();
    try {
      if (!trimmed) {
        await deleteDagNotitie(datum);
        setDagNotities((prev) => prev.filter((n) => n.datum !== datum));
        return;
      }
      const saved = await upsertDagNotitie(datum, trimmed);
      setDagNotities((prev) => [...prev.filter((n) => n.datum !== datum), saved]);
    } catch (err) {
      logger.error('Kon dagnotitie niet opslaan:', err);
      toast.error('Kon notitie niet opslaan');
    }
  }, []);

  // Afwezigheid: index voor snelle per-cel lookups (zoals dagNotitieMap).
  const afwezigIndex = useMemo(
    () => buildAfwezigheidIndex(vrijPatronen, afwezigheden),
    [vrijPatronen, afwezigheden]
  );

  const handleSavePatroon = useCallback(async (mwId: string, data: { id?: string; vrije_dagen: number; geldig_van: string | null; geldig_tot: string | null }) => {
    try {
      if (data.id) {
        const saved = await updateVrijPatroon(data.id, data);
        setVrijPatronen((prev) => prev.map((p) => (p.id === data.id ? saved : p)));
      } else {
        const saved = await createVrijPatroon({ medewerker_id: mwId, vrije_dagen: data.vrije_dagen, geldig_van: data.geldig_van, geldig_tot: data.geldig_tot });
        setVrijPatronen((prev) => [...prev, saved]);
      }
    } catch (err) {
      logger.error('Kon weekpatroon niet opslaan:', err);
      toast.error('Kon weekpatroon niet opslaan');
    }
  }, []);

  const handleDeletePatroon = useCallback(async (id: string) => {
    try {
      await deleteVrijPatroon(id);
      setVrijPatronen((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      logger.error('Kon weekpatroon niet verwijderen:', err);
      toast.error('Kon weekpatroon niet verwijderen');
    }
  }, []);

  const handleAddAfwezigheid = useCallback(async (mwId: string, data: { type: AfwezigheidType; start_datum: string; eind_datum: string; start_tijd?: string | null; eind_tijd?: string | null; opmerking?: string }) => {
    try {
      const saved = await createAfwezigheid({ medewerker_id: mwId, ...data });
      setAfwezigheden((prev) => [...prev, saved]);
      toast.success('Afwezigheid toegevoegd');
    } catch (err) {
      logger.error('Kon afwezigheid niet opslaan:', err);
      toast.error('Kon afwezigheid niet opslaan');
    }
  }, []);

  const handleDeleteAfwezigheid = useCallback((id: string) => {
    setAfwezigheden((prev) => {
      const item = prev.find((a) => a.id === id);
      if (!item) return prev;
      let undone = false;
      const timer = setTimeout(async () => {
        if (undone) return;
        try {
          await deleteAfwezigheid(id);
        } catch (err) {
          logger.error('Kon afwezigheid niet verwijderen:', err);
          toast.error('Kon afwezigheid niet verwijderen');
          setAfwezigheden((cur) => (cur.some((a) => a.id === id) ? cur : [...cur, item]));
        }
      }, 5000);
      toast('Afwezigheid verwijderd', {
        action: {
          label: 'Ongedaan maken',
          onClick: () => { undone = true; clearTimeout(timer); setAfwezigheden((cur) => (cur.some((a) => a.id === id) ? cur : [...cur, item])); },
        },
        duration: 5000,
      });
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  // Helper voor entry-points: render een AfwezigheidPopover voor één monteur.
  const renderAfwezigheidPopover = useCallback((monteur: Medewerker, trigger: React.ReactNode, defaultDatum?: string) => (
    <AfwezigheidPopover
      monteur={monteur}
      patronen={vrijPatronen.filter((p) => p.medewerker_id === monteur.id)}
      afwezigheden={afwezigheden.filter((a) => a.medewerker_id === monteur.id && a.eind_datum >= todayStr).sort((a, b) => a.start_datum.localeCompare(b.start_datum))}
      defaultDatum={defaultDatum}
      trigger={trigger}
      onSavePatroon={(data) => handleSavePatroon(monteur.id, data)}
      onDeletePatroon={handleDeletePatroon}
      onAddAfwezigheid={(data) => handleAddAfwezigheid(monteur.id, data)}
      onDeleteAfwezigheid={handleDeleteAfwezigheid}
    />
  ), [vrijPatronen, afwezigheden, todayStr, handleSavePatroon, handleDeletePatroon, handleAddAfwezigheid, handleDeleteAfwezigheid]);

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

  // Afspraken die op een vrije/afwezige dag van een toegewezen monteur vallen.
  const afwezigConflicts = useMemo(() => {
    const found: { monteurNaam: string; titel: string; label: string }[] = [];
    for (const a of weekAfsprakenAll) {
      if (a.status === "afgerond" || a.status === "uitgesteld") continue;
      const dayIdx = (new Date(a.datum + "T00:00:00").getDay() + 6) % 7;
      for (const m of a.monteurs) {
        const status = resolveAfwezig(afwezigIndex, m, a.datum, dayIdx);
        if (status.afwezig) {
          found.push({ monteurNaam: monteurMap[m]?.naam || "?", titel: a.titel, label: status.label });
        }
      }
    }
    return found;
  }, [weekAfsprakenAll, afwezigIndex, monteurMap]);

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
    const todayDayIdx = (new Date(todayStr + "T00:00:00").getDay() + 6) % 7;
    const beschikbaar = monteurs.filter(
      (m) => !bezetteMonteurs.has(m.id) && !resolveAfwezig(afwezigIndex, m.id, todayStr, todayDayIdx).afwezig
    ).length;

    return {
      totaalWeek: weekAfsprakenAll.length,
      geplandVandaag: vandaagAfspraken.length,
      monteursBeschikbaar: beschikbaar,
    };
  }, [weekAfsprakenAll, afspraken, todayStr, monteurs, afwezigIndex]);

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

  async function toggleAfspraakPrio(afspraak: MontageAfspraak) {
    const newPrio = !afspraak.prioriteit;
    setAfspraken((prev) => prev.map((a) => a.id === afspraak.id ? { ...a, prioriteit: newPrio } : a));
    try {
      await updateMontageAfspraak(afspraak.id, { prioriteit: newPrio });
    } catch (err) {
      logger.error('Prio updaten mislukt:', err);
      toast.error('Kon prioriteit niet bijwerken');
      setAfspraken((prev) => prev.map((a) => a.id === afspraak.id ? { ...a, prioriteit: afspraak.prioriteit } : a));
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
      <h1>Weekplanning · ${weekLabel}</h1>
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

  function openNewDialog(datum?: string, prefillMonteurId?: string | null, prefillStart?: string) {
    setEditingAfspraak(null);
    // Klik je in de tijdlijn op 14:00, dan hoort daar 14:00 te staan. De duur
    // van het lege formulier blijft intact, die schuift gewoon mee.
    const tijden = prefillStart
      ? {
          start_tijd: prefillStart,
          eind_tijd: minutesToTime(timeToMinutes(prefillStart) + (timeToMinutes(EMPTY_FORM.eind_tijd) - timeToMinutes(EMPTY_FORM.start_tijd))),
        }
      : {};
    setFormData({
      ...EMPTY_FORM,
      ...tijden,
      datum: datum || todayStr,
      // Wie een montage aanmaakt staat er zelf bijna altijd op · dat hoef je
      // niet elke keer aan te klikken. Een andere keuze haal je er zo weer af.
      monteurs: prefillMonteurId ? [prefillMonteurId] : eigenMedewerker ? [eigenMedewerker.id] : [],
    });
    setDialogOpen(true);
  }

  function openNewDialogFromProject(project: Project, datum?: string, prefillMonteurId?: string | null, prefillStart?: string) {
    setEditingAfspraak(null);
    // Auto-fill locatie vanuit klant adres
    const klant = klanten.find((k) => k.id === project.klant_id);
    const locatie = klant ? [klant.adres, klant.postcode, klant.stad].filter(Boolean).join(", ") : "";
    setFormData({
      ...EMPTY_FORM,
      ...(prefillStart
        ? {
            start_tijd: prefillStart,
            eind_tijd: minutesToTime(timeToMinutes(prefillStart) + (timeToMinutes(EMPTY_FORM.eind_tijd) - timeToMinutes(EMPTY_FORM.start_tijd))),
          }
        : {}),
      project_id: project.id,
      klant_id: project.klant_id,
      klant_naam: project.klant_naam || "",
      titel: project.naam,
      datum: datum || todayStr,
      locatie,
      monteurs: prefillMonteurId ? [prefillMonteurId] : eigenMedewerker ? [eigenMedewerker.id] : [],
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

  /** Monteurs die op dit tijdvak al ergens anders staan · zelfde overlaptoets
   *  als de conflictdetectie hierboven, maar dan voor een verplaatsing die nog
   *  moet gebeuren. */
  function dubbelGeboekteMonteurs(
    afspraak: MontageAfspraak,
    datum: string,
    start: string,
    eind: string,
  ): string[] {
    const botsend = new Set<string>();
    for (const ander of afspraken) {
      if (ander.id === afspraak.id) continue;
      if (ander.datum !== datum) continue;
      if (ander.status === 'afgerond' || ander.status === 'uitgesteld') continue;
      if (!(start < ander.eind_tijd && ander.start_tijd < eind)) continue;
      for (const m of afspraak.monteurs) {
        if (ander.monteurs.includes(m)) botsend.add(monteurMap[m]?.naam || 'Onbekend');
      }
    }
    return [...botsend];
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
      openNewDialogFromProject(project, newDate, prefillMonteur, newStartTime);
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

    // Een rode ring op het blok zegt dát er iets botst, niet wie. Verplaatsen
    // is toegestaan · een planner weet soms dat twee klussen naast elkaar kunnen
    // · maar hij hoort het wel te hóren op het moment dat hij het doet.
    const dubbel = dubbelGeboekteMonteurs(afspraak, newDate, newStart, newEndTime);
    if (dubbel.length > 0) {
      toast.warning(
        dubbel.length === 1
          ? `${dubbel[0]} staat dan dubbel geboekt`
          : `${dubbel.join(' en ')} staan dan dubbel geboekt`
      );
    }
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
              style={getAvatarStyle(id)}
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
        className={cn(
          "text-[13px] font-semibold px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5",
          STATUS_PILL_CLASSES[status],
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
        {cfg.label}<span className="text-flame">.</span>
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

  // ── Week · uurraster met de werkdag als venster ──
  async function handleDuurWijzigen(afspraak: MontageAfspraak, eindTijd: string) {
    if (eindTijd === afspraak.eind_tijd) return;
    const vorige = afspraak.eind_tijd;
    setAfspraken((prev) => prev.map((a) => a.id === afspraak.id ? { ...a, eind_tijd: eindTijd } : a));
    try {
      await updateMontageAfspraak(afspraak.id, { eind_tijd: eindTijd });
      toast.success(`Duur aangepast tot ${eindTijd}`);
    } catch {
      setAfspraken((prev) => prev.map((a) => a.id === afspraak.id ? { ...a, eind_tijd: vorige } : a));
      toast.error('Kon duur niet aanpassen');
    }
  }

  function renderWeekView() {
    return (
      <MontageTijdlijnView
        zoom={stapelZoom}
        weekDates={weekDates}
        datumSleutel={formatDate}
        afsprakenPerDag={afsprakenPerDag}
        takenPerDag={takenPerDag}
        vandaagSleutel={formatDate(new Date())}
        conflictIds={conflictAfspraakIds}
        sleepId={draggingAfspraakId}
        onSleepStart={setDraggingAfspraakId}
        onSleepEnd={() => { setDraggingAfspraakId(null); setDragOverDate(null); }}
        onDropOpTijd={(id, datum, startTijd) => {
          const feestdagInfo = isFeestdag(datum, feestdagen);
          if (feestdagInfo) {
            toast.error(`Kan niet inplannen op ${feestdagInfo.naam}`);
            return;
          }
          handleDragDrop(id, datum, undefined, startTijd);
        }}
        onDuurWijzigen={handleDuurWijzigen}
        onOpen={openEditDialog}
        onNieuwOpTijd={(datum, startTijd) => openNewDialog(datum, undefined, startTijd)}
        accentKleur={(a) => a.prioriteit
          ? '#F15025'
          : (a.status === 'gepland' || a.status === 'afgerond')
            ? 'transparent'
            : (STATUS_CONFIG[a.status]?.dot ?? 'transparent')}
        toonMonteurs={selectedMonteur === 'alle'}
        monteurLabel={(a) => a.monteurs
          .map((id) => monteurMap[id]?.naam)
          .filter(Boolean)
          .join(', ')}
        gesloten={(datum) => isFeestdag(datum, feestdagen)?.naam ?? null}
        renderDagWeer={(datum) => renderWeatherCell(getWeatherForDate(weather, new Date(datum + "T00:00:00")))}
        renderDagNotitie={(datum) => {
          if (isFeestdag(datum, feestdagen)) return null;
          const d = new Date(datum + "T00:00:00");
          return (
            <DagNotitiePopover
              datum={datum}
              notitie={dagNotitieMap[datum] ?? ""}
              label={`${DAG_NAMEN_LANG[(d.getDay() + 6) % 7]} ${d.getDate()} ${d.toLocaleDateString("nl-NL", { month: "short" })}`}
              onSave={handleSaveDagNotitie}
            />
          );
        }}
      />
    );
  }

  // ── Card with colored left border · DOEN style ──
  function renderMontageCard(afspraak: MontageAfspraak, opts?: { variant?: 'personal' | 'timegrid' }) {
    const hasConflict = conflictAfspraakIds.has(afspraak.id);
    const cfg = STATUS_CONFIG[afspraak.status];
    const isAfgerond = afspraak.status === 'afgerond';
    const isFadingOut = isAfgerond && recentlyAfgerond.has(afspraak.id);
    const isPrio = !!afspraak.prioriteit && !isAfgerond;
    const isPersonal = opts?.variant === 'personal';
    const isTimegrid = opts?.variant === 'timegrid';
    const isCompact = isPersonal || isTimegrid;
    const tijdspanne = formatTijdspanne(afspraak.start_tijd, afspraak.eind_tijd);

    // Zelfde box-look als /taken: uniform lichte petrol-vulling + petrol accent-stripe.
    // Prioriteit: flame accent-stripe + lichte flame-vulling zodat het opvalt.
    // Achtergrond via classes (STATUS_CARD_BG) zodat dark mode meeschakelt.
    const cardStyle: React.CSSProperties = { borderLeftColor: isAfgerond ? '#CBC9C4' : isPrio ? '#F15025' : (cfg?.dot ?? '#1A535C') };
    if (isPersonal) cardStyle.minHeight = `${getCardMinHeight(afspraak.start_tijd, afspraak.eind_tijd)}px`;
    const cardBgClass = isAfgerond
      ? null
      : isPrio
        ? PRIO_CARD_BG_CLASS
        : (STATUS_CARD_BG[afspraak.status] || FALLBACK_CARD_BG_CLASS);

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
          ghost.style.background = document.documentElement.classList.contains('dark') ? 'hsl(190 32% 12%)' : '#fff';
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
          "border border-border/40 border-l-[3px] px-2.5 py-2 cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-[0_4px_14px_rgba(20,62,71,0.10)] dark:hover:shadow-[0_4px_14px_rgba(0,0,0,0.40)] group/card relative",
          isTimegrid ? "h-full overflow-hidden rounded-none" : "rounded-none mb-1.5 hover:-translate-y-[1px]",
          isAfgerond && "bg-[hsl(40,10%,96.5%)] dark:bg-[hsl(190,20%,9%)]",
          cardBgClass,
          hasConflict && "ring-1 ring-[#F0C8BC] dark:ring-[#E04A28]/40",
          draggingAfspraakId === afspraak.id && "opacity-30 scale-[0.97] ring-2 ring-petrol/30 dark:ring-[#5FB5C0]/40"
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
                      Afronden &amp; factureren<span className="text-flame">.</span>
                    </span>
                    <span className="text-[10px] opacity-60">Project naar 'Te factureren'</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })()}
        {!isAfgerond && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleAfspraakPrio(afspraak); }}
            title={isPrio ? 'Prioriteit weghalen' : 'Prioriteit geven'}
            aria-label={isPrio ? 'Prioriteit weghalen' : 'Prioriteit geven'}
            className={cn(
              "absolute top-1 right-7 rounded-full p-0.5 transition-all z-10",
              isPrio ? "opacity-100 text-flame" : "opacity-0 group-hover/card:opacity-100 text-muted-foreground/70 hover:text-flame"
            )}
          >
            <Flame className={cn("h-3.5 w-3.5", isPrio && "fill-flame")} />
          </button>
        )}
        <div className={cn("min-w-0", isAfgerond && "opacity-60")}>
          <div className={cn("flex items-start justify-between gap-1", isAfgerond ? "pr-5" : "pr-12")}>
            <div className={cn(
              "text-[12px] font-semibold text-petrol dark:text-foreground leading-tight truncate",
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
                  hasConflict
                    ? "rounded px-1 py-px ring-1 ring-[#F0C8BC] text-[#C03A18] bg-[#FDE8E2] dark:bg-[rgba(224,74,40,0.18)] dark:text-[#FF8866] dark:ring-[#E04A28]/40"
                    : "text-muted-foreground"
                )}
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
                className="inline-flex items-center gap-0.5 text-[10px] font-mono tabular-nums text-foreground/70 hover:text-petrol dark:hover:text-foreground transition-colors"
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
                className="inline-flex items-center gap-0.5 text-[10px] text-petrol dark:text-[#5AABB5] hover:underline truncate max-w-[120px]"
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
  // Regenkans alleen boven de 30% · daaronder is het ruis waar niemand een
  // montage op verzet.
  function renderWeatherCell(w: DayWeather | undefined) {
    if (!w) return null;
    return (
      <span className="inline-flex items-center gap-1 align-baseline" title={`${w.maxTemp}° · ${w.precipitationProb}% kans op neerslag`}>
        <WeerIcon code={w.code} className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground tabular-nums">{w.maxTemp}°</span>
        {w.precipitationProb > 30 && (
          <span className={cn(
            'text-[10px] tabular-nums',
            w.precipitationProb >= 70 ? 'text-flame/80' : 'text-muted-foreground',
          )}>
            {w.precipitationProb}%
          </span>
        )}
      </span>
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
        <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(26,83,92,0.08)] bg-card">
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
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-white bg-flame shadow-[0_2px_8px_rgba(241,80,37,0.25)] hover:shadow-[0_4px_16px_rgba(241,80,37,0.35)] hover:-translate-y-[1px] active:translate-y-0 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Nieuw
            </button>
          </div>
        </div>

        {/* Day-of-week labels */}
        <div className="grid grid-cols-7 border-b border-[rgba(26,83,92,0.08)] bg-background">
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
                  "group relative border-b border-r border-[rgba(26,83,92,0.08)] p-1.5 min-h-[96px] flex flex-col gap-0.5 transition-colors",
                  !isCurrentMonth && "bg-background/40",
                  isCurrentMonth && isWeekend && "bg-background/60",
                  feestdagInfo && "bg-[hsl(var(--status-flame-bg))]/40",
                  isToday && "bg-petrol/[0.04] border-t-2 border-t-flame",
                  isTaakDragOver && "bg-petrol/[0.08] ring-2 ring-petrol/30 ring-inset"
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
                      isToday && "text-petrol dark:text-[#5AABB5] font-bold",
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
                      className="opacity-0 group-hover:opacity-100 h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-flame hover:bg-muted transition-all"
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
                        className={cn(
                          "text-left text-[10px] truncate rounded-none border-l-2 pl-1.5 pr-1 py-0.5 hover:opacity-80 transition-opacity",
                          STATUS_PILL_CLASSES[a.status] || "bg-[#F0EFEC] text-foreground dark:bg-white/[0.06] dark:text-foreground",
                        )}
                        style={{ borderLeftColor: cfg?.dot || '#1A535C' }}
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
                        "flex items-center gap-1 text-[10px] truncate rounded-none px-1 py-0.5 bg-card border border-border text-foreground cursor-grab active:cursor-grabbing hover:border-petrol/40 transition-all",
                        draggingTaakId === t.id && "opacity-50"
                      )}
                    >
                      <CheckCircle2 className="h-2.5 w-2.5 text-petrol dark:text-[#5AABB5] flex-shrink-0" />
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

  function renderDialog() {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto rounded-2xl p-6">
          <DialogHeader className="pb-1">
            <div className="flex items-start justify-between gap-3 pr-6 flex-wrap">
              <div className="flex-1 min-w-0 space-y-0.5">
                <DialogTitle className="m-0">
                  {/* Zelfde behandeling als de titel in het taakformulier: in
                      rust al een vlak, zodat je ziet dat je hem kunt wijzigen
                      zonder dat er een potloodje bij hoeft. */}
                  <input
                    type="text"
                    value={formData.titel}
                    onChange={(e) => setFormData((prev) => ({ ...prev, titel: e.target.value }))}
                    placeholder={editingAfspraak ? "Montage afspraak" : "Nieuwe montage afspraak"}
                    aria-label="Titel van montage afspraak"
                    title="Klik om de titel te wijzigen"
                    className="w-full rounded-lg border-0 bg-background px-3 py-2.5 text-[20px] font-bold leading-tight tracking-[-0.3px] text-[#1A4A52] dark:text-foreground outline-none transition-colors placeholder:font-medium placeholder:text-muted-foreground hover:bg-muted focus:bg-card focus-visible:ring-1 focus-visible:ring-petrol/25 cursor-text"
                  />
                </DialogTitle>
                {editingAfspraak && STATUS_CONFIG[formData.status] && (
                  <div className="text-[13px] text-foreground/70 font-medium px-0">
                    {STATUS_CONFIG[formData.status].label}<span className="text-flame">.</span>
                  </div>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Project · context bovenin */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="project" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Project</Label>
                {/* Stond rechtsboven naast de titel · hij hoort bij het veld
                    waar hij over gaat, en is nu een echte link zodat cmd-klik
                    werkt. */}
                {formData.project_id && (
                  <a
                    href={`/projecten/${formData.project_id}`}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                      e.preventDefault();
                      const project = projecten.find((p) => p.id === formData.project_id);
                      setDialogOpen(false);
                      navigateWithTab({
                        path: `/projecten/${formData.project_id}`,
                        label: project?.naam || 'Project',
                        id: `/projecten/${formData.project_id}`,
                      });
                    }}
                    title="Ga naar dit project · cmd-klik voor een nieuw tabblad"
                    className="group inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-flame/85 hover:text-flame transition-colors"
                  >
                    <span className="border-b border-transparent group-hover:border-current transition-colors">Open project</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
              {/* Was een Select met álle projecten en geen zoekveld · dezelfde
                  combobox als in Taken en de mail, dus zoekbaar en nieuwste
                  bovenaan. */}
              <ProjectCombobox
                projecten={projecten}
                value={formData.project_id}
                onChange={handleProjectChange}
                leegLabel="Geen project"
                placeholder="Selecteer project"
              />
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
                          ? "text-white ring-2 ring-offset-1 ring-petrol"
                          : "bg-muted text-muted-foreground hover:bg-[#E5E3DE]"
                      )}
                      style={selected ? getAvatarStyle(monteur.id) : undefined}
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

              {/* Live afwezigheid-waarschuwing (informatief, blokkeert niet) */}
              {formData.datum && formData.monteurs.length > 0 && (() => {
                const dayIdx = (new Date(formData.datum + "T00:00:00").getDay() + 6) % 7;
                const afwezigen = formData.monteurs
                  .map((m) => ({ m, status: resolveAfwezig(afwezigIndex, m, formData.datum, dayIdx) }))
                  .filter((x) => x.status.afwezig);
                if (afwezigen.length === 0) return null;
                return (
                  <div className="mt-2 rounded-lg border border-[#F0C8BC] bg-[hsl(var(--status-flame-bg))]/60 p-3">
                    <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#C03A18] mb-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Let op: afwezig op deze dag
                    </div>
                    {afwezigen.map(({ m, status }) => (
                      <p key={m} className="text-[11px] text-[#C03A18]/85">
                        {monteurMap[m]?.naam || "?"}: {status.label}
                      </p>
                    ))}
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

            {/* Werkbon · koppelen aan een werkbon (optioneel) */}
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

            {/* Bijlagen · compact */}
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
                      <button type="button" title="Bekijken" onClick={() => window.open(bijlage.url, '_blank')} className="text-muted-foreground hover:text-petrol dark:hover:text-foreground transition-colors flex-shrink-0">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Printen"
                        onClick={() => { const w = window.open(bijlage.url, '_blank'); if (w) { w.addEventListener('load', () => w.print()) } }}
                        className="text-muted-foreground hover:text-petrol dark:hover:text-foreground transition-colors flex-shrink-0"
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

              <label className="inline-flex items-center gap-1 cursor-pointer text-[13px] font-medium text-flame hover:text-[#D4452A] transition-colors w-fit">
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
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[13px] font-medium text-petrol dark:text-[#5AABB5] border border-petrol/30 dark:border-[#5AABB5]/30 hover:bg-petrol hover:text-white hover:border-petrol transition-all"
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
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[13px] font-medium text-petrol dark:text-[#5AABB5] border border-petrol/30 dark:border-[#5AABB5]/30 hover:bg-petrol hover:text-white hover:border-petrol transition-all"
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
                        Afronden &amp; factureren<span className="text-flame">.</span>
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
        <div className="hidden md:flex flex-col w-64 flex-shrink-0 border-r border-[rgba(26,83,92,0.08)] bg-card p-3 gap-2">
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
          <div className="flex items-center gap-3 px-4 py-2 border-b border-[rgba(26,83,92,0.08)] bg-card flex-shrink-0">
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
              <div className="w-32 flex-shrink-0 border-r border-[rgba(26,83,92,0.08)]" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex-1 min-w-0 text-center py-3 border-l border-border/30 space-y-1">
                  <Skeleton className="h-3 w-10 mx-auto" />
                  <Skeleton className="h-4 w-6 mx-auto" />
                </div>
              ))}
            </div>
            {Array.from({ length: 4 }).map((_, laneIdx) => (
              <div key={laneIdx} className="flex border-b border-[rgba(26,83,92,0.08)]">
                <div className="w-32 flex-shrink-0 p-2 flex items-center gap-2 border-r border-[rgba(26,83,92,0.08)]">
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
    <div className="flex h-full overflow-hidden bg-background">
      {/* ── Left sidebar: Te plannen (inklapbaar) ── */}
      <div className={cn(
        "shrink-0 bg-card border-r border-[rgba(26,83,92,0.08)] flex flex-col rounded-none transition-[width] duration-200",
        sidebarCollapsed ? "w-11" : "w-[200px]"
      )}>
        {sidebarCollapsed ? (
          <div className="flex flex-col items-center pt-4 gap-3">
            <button
              type="button"
              onClick={toggleSidebar}
              title="Te plannen tonen"
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-petrol hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {tePlannenProjecten.length > 0 && (
              <span
                className="text-[10px] font-bold flex items-center justify-center tabular-nums bg-[#FDE8E2] text-flame dark:bg-[rgba(241,80,37,0.20)] dark:text-[#FF8866]"
                style={{ minWidth: '20px', height: '20px', padding: '0 5px' }}
              >
                {tePlannenProjecten.length}
              </span>
            )}
          </div>
        ) : (
        <>
        {/* Compacte paginatitel */}
        <div className="px-4 pt-5 pb-3 flex items-center justify-between gap-2 shrink-0">
          {/* De titel stond hier én in de balk erboven · TE PLANNEN hieronder
              is de kop die deze kolom echt nodig heeft. */}
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Deze week
            </span>
            <span className="text-[12px] font-mono tabular-nums text-foreground">
              {stats.totaalWeek}
            </span>
          </div>
          <button
            type="button"
            onClick={toggleSidebar}
            title="Te plannen inklappen"
            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-petrol hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] transition-colors shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Te plannen section */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-3 py-2.5 flex items-center justify-between border-l-2 border-l-petrol shrink-0">
            <h2 className="text-[11px] font-bold text-flame uppercase tracking-wider">Te plannen</h2>
            <span
              className="text-[11px] font-bold flex items-center justify-center rounded-full bg-[#FDE8E2] text-flame dark:bg-[rgba(241,80,37,0.20)] dark:text-[#FF8866]"
              style={{ minWidth: '22px', height: '22px', padding: '0 7px' }}
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
            <div className="flex-1 overflow-y-auto px-1.5 py-1 flex flex-col">
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
                      "group/card relative w-full text-left border-l-2 rounded-lg transition-colors duration-150 cursor-grab active:cursor-grabbing select-none",
                      "shadow-[inset_0_1px_0_hsl(var(--border)/0.55)] first:shadow-none hover:shadow-none",
                      "hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.05]",
                      isPrio ? "border-l-flame" : "border-l-transparent",
                      draggingProjectId === project.id && "opacity-50"
                    )}
                    style={{ padding: '8px 10px 8px 12px' }}
                  >
                    {/* De naam kapte af op de plek waar hij onderscheidend werd:
                        "Nieuwe signing - De ..." en "Nieuwe signing locati..."
                        waren niet uit elkaar te houden. Hij mag nu afbreken. */}
                    <div className="pr-5 grid grid-cols-[14px_minmax(0,1fr)] gap-x-[9px] items-start">
                      {/* Zelfde cirkel als op een blok in de tijdlijn en op een
                          kaart in Taken · een project dat straks een blok wordt
                          hoort er nu al uit te zien als een blok. */}
                      <span className="mt-[3px] flex h-[14px] w-[14px] items-center justify-center rounded-full border-[1.5px] border-[rgba(26,83,92,0.4)] dark:border-white/30 text-muted-foreground">
                        <span className={cn('h-[3px] w-[3px] rounded-full', isPrio ? 'bg-flame opacity-100' : 'bg-current opacity-55')} />
                      </span>
                      <div className="min-w-0">
                      <div className="text-[12.5px] font-semibold leading-[1.3] text-[#1A535C] dark:text-[#CFE3E6] [text-wrap:pretty]">{project.naam}</div>
                      <div className="flex items-baseline gap-1.5 mt-[1px]">
                        {project.klant_naam && (
                          <span className="text-[11px] leading-[1.35] text-[#1A535C]/60 dark:text-[#CFE3E6]/60 truncate">{project.klant_naam}</span>
                        )}
                        {/* Hoe lang het al wacht · daar plan je op, niet op
                            de volgorde waarin het toevallig binnenkwam. */}
                        {(() => {
                          const dagen = Math.floor((Date.now() - new Date(project.created_at).getTime()) / 86400000)
                          if (!Number.isFinite(dagen) || dagen < 1) return null
                          return (
                            <span
                              className={cn(
                                'ml-auto shrink-0 text-[10px] font-mono tabular-nums',
                                dagen >= 30 ? 'text-flame/80' : 'text-muted-foreground/70'
                              )}
                              title={`Staat ${dagen} dagen te wachten`}
                            >
                              {dagen}d
                            </span>
                          )
                        })()}
                      </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleProjectPrio(project); }}
                      title={isPrio ? "Prioriteit weghalen" : "Prioriteit geven"}
                      className={cn(
                        "absolute top-1.5 right-1.5 h-5 w-5 rounded flex items-center justify-center transition-all",
                        isPrio
                          ? "text-flame opacity-100"
                          : "text-muted-foreground/80 opacity-0 group-hover/card:opacity-100 hover:text-flame"
                      )}
                    >
                      <Flame className={cn("h-3.5 w-3.5", isPrio && "fill-flame")} />
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
            <span className="font-mono tabular-nums">{stats.totaalWeek}</span> montages<span className="text-flame">.</span>
          </div>
          <div>
            <span className="font-mono tabular-nums">{stats.monteursBeschikbaar}</span> beschikbaar<span className="text-flame">.</span>
          </div>
        </div>
        </>
        )}
      </div>

      {/* ── Right content: member's week planning ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Gereedschap · gaat de header in, net als bij Taken. Planning had
            hier een tweede balk met zijn eigen titel erin, boven een header die
            "Planning." al zei. */}
        <ModuleToolbar>
          {/* Scope · één dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="flex items-center gap-1 text-[14px] font-semibold text-petrol dark:text-foreground hover:opacity-75 transition-opacity">
                {scopeMode === 'alle' ? 'Iedereen' : scopeMode === 'mijn' ? 'Mijn week' : (monteurMap[selectedMonteur]?.naam ?? 'Per persoon')}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={setScopeAlle}>Iedereen</DropdownMenuItem>
              <DropdownMenuItem onClick={() => eigenMedewerker && setScopeMijn(eigenMedewerker.id)} disabled={!eigenMedewerker}>Mijn week</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Per persoon</DropdownMenuLabel>
              {monteurs.map((m) => (
                <DropdownMenuItem key={m.id} onClick={() => setSelectedMonteur(m.id)}>{m.naam}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Week-navigatie (week-view, alle scopes) */}
          {viewMode !== 'maand' && (
            <>
              <div className="h-4 w-px bg-[rgba(26,83,92,0.12)] dark:bg-white/10" />
              <div className="flex items-center gap-0.5">
                <button
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] transition-colors"
                  onClick={() => navigateWeek(-1)}
                  title="Vorige week"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={goToCurrentWeek}
                  title="Naar huidige week"
                  className="px-2 py-0.5 rounded-md text-[13px] font-semibold text-foreground hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] transition-colors"
                >
                  {/* Zelfde vorm als in Taken · daar staat "wk 34 17 – 21 aug",
                      en dat is ook hier het antwoord dat je zoekt. */}
                  <span className="text-muted-foreground font-medium mr-1.5">wk {weekNumber}</span>
                  {weekDates[0].getDate()} – {weekDates[weekDates.length - 1].getDate()}{' '}
                  {weekDates[weekDates.length - 1].toLocaleDateString('nl-NL', { month: 'short' })}
                </button>
                <button
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] transition-colors"
                  onClick={() => navigateWeek(1)}
                  title="Volgende week"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}

          <div className="flex-1" />

          {/* Zoom · twee subtiele text-knoppen, net als in Taken. */}
          {viewMode !== 'maand' && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => zoomStap(-10)}
                title="Kleiner"
                aria-label="Kleiner weergeven"
                className="px-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >A</button>
              <button
                type="button"
                onClick={() => zoomStap(10)}
                title="Groter"
                aria-label="Groter weergeven"
                className="px-1 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >A</button>
            </div>
          )}

          {/* Week / Maand · compacte segmented toggle */}
          <div className="flex rounded-lg bg-[hsl(38,20%,95.5%)] dark:bg-white/[0.06] p-0.5 text-[12px]">
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={cn("px-2.5 py-1 rounded-md font-medium transition-colors", viewMode === 'week' ? "bg-white dark:bg-white/[0.12] text-petrol dark:text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setViewMode('maand')}
              className={cn("px-2.5 py-1 rounded-md font-medium transition-colors", viewMode === 'maand' ? "bg-white dark:bg-white/[0.12] text-petrol dark:text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              Maand
            </button>
          </div>

          {/* Afwezigheid · compact icoon (persoon-view) */}
          {viewMode !== 'maand' && selectedMonteur !== 'alle' && monteurMap[selectedMonteur] && renderAfwezigheidPopover(monteurMap[selectedMonteur], (
            <button
              type="button"
              title="Afwezigheid / vrije dagen"
              className="p-1.5 rounded-md text-muted-foreground hover:text-petrol hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] transition-colors"
            >
              <CalendarOff className="h-4 w-4" />
            </button>
          ))}

          {/* Primaire actie */}
          <button
            onClick={() => openNewDialog()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold text-white bg-flame shadow-[0_1px_3px_rgba(241,80,37,0.25)] hover:bg-[#E0481D] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Nieuw
          </button>

          {/* Overflow · secundaire acties */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" title="Meer" className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] transition-colors">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {selectedMonteur === 'alle' && viewMode !== 'maand' && (
                <>
                  <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Banen</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={laneGrouping} onValueChange={(v) => handleLaneGroupingChange(v as LaneGrouping)}>
                    <DropdownMenuRadioItem value="none">Geen groepering</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="rol">Groeperen op rol</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuCheckboxItem checked={!hideEmptyLanes} onCheckedChange={() => toggleHideEmptyLanes()}>
                    Toon lege banen
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={printWeekplanning}>
                <Printer className="h-4 w-4 mr-2 opacity-70" />
                Print week
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ModuleToolbar>
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

        {/* Afwezigheid-banner: afspraken op een vrije/afwezige dag */}
        {afwezigConflicts.length > 0 && (
          <div className="bg-[hsl(var(--status-flame-bg))] border-b border-[#F0C8BC] px-4 py-2 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-[#C03A18] shrink-0" />
            <span className="text-xs text-[#C03A18]">
              <span className="font-semibold">{afwezigConflicts.length} ingepland op vrije/afwezige dag</span>
              {afwezigConflicts.slice(0, 2).map((c, idx) => (
                <span key={idx} className="ml-2">{c.monteurNaam} ({c.label}): {c.titel}</span>
              ))}
            </span>
          </div>
        )}

        {/* Main view */}
        <div className="flex-1 overflow-auto">
          {viewMode === 'maand' ? renderMonthView() : renderWeekView()}
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
