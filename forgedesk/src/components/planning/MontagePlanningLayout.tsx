import { useState, useEffect, useMemo, useCallback } from "react";
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
  LayoutGrid,
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
} from "@/services/supabaseService";
import type { MontageAfspraak, MontageBijlage, Project, Medewerker, Klant, Offerte, Werkbon } from "@/types";
import { ClipboardCheck } from "lucide-react";
import { uploadMontageBijlage } from '@/services/storageService';
import { WerkbonVanProjectDialog } from "@/components/werkbonnen/WerkbonVanProjectDialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { confirm } from '@/components/shared/ConfirmDialog';

const STATUS_CONFIG: Record<
  MontageAfspraak["status"],
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  gepland: {
    label: "Gepland",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  onderweg: {
    label: "Onderweg",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  bezig: {
    label: "Bezig",
    color: "text-green-700",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  afgerond: {
    label: "Afgerond",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
  uitgesteld: {
    label: "Uitgesteld",
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
};

const BADGE_VARIANT_CLASSES: Record<MontageAfspraak["status"], string> = {
  gepland: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  onderweg: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  bezig: "bg-green-100 text-green-700 hover:bg-green-100",
  afgerond: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  uitgesteld: "bg-red-100 text-red-700 hover:bg-red-100",
};

const STATUS_DOT: Record<MontageAfspraak["status"], string> = {
  gepland: "bg-blue-500",
  onderweg: "bg-amber-500",
  bezig: "bg-green-500",
  afgerond: "bg-emerald-400",
  uitgesteld: "bg-red-500",
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

function getWeekDates(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
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

const AVATAR_COLORS = [
  "bg-primary",
  "bg-accent",
  "bg-teal-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-[#4A442D]",
];

function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
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
  const [currentMonday, setCurrentMonday] = useState<Date>(() =>
    getMondayOfWeek(new Date())
  );
  const [viewMode, setViewMode] = useState<"week" | "list" | "raster">("week");
  const [afspraken, setAfspraken] = useState<MontageAfspraak[]>([]);
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>([]);
  const [projecten, setProjecten] = useState<Project[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAfspraak, setEditingAfspraak] =
    useState<MontageAfspraak | null>(null);
  const [formData, setFormData] = useState<MontageFormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [selectedMonteur, setSelectedMonteur] = useState<string>("alle");
  const [statusFilter, setStatusFilter] = useState<Set<MontageAfspraak["status"]>>(
    new Set(["gepland", "onderweg", "bezig", "uitgesteld"])
  );
  const [draggingAfspraakId, setDraggingAfspraakId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [klanten, setKlanten] = useState<Klant[]>([]);
  const [offertes, setOffertes] = useState<Offerte[]>([]);
  const [werkbonDialogOpen, setWerkbonDialogOpen] = useState(false);
  const [werkbonMontage, setWerkbonMontage] = useState<MontageAfspraak | null>(null);
  const [projectWerkbonnen, setProjectWerkbonnen] = useState<Werkbon[]>([]);

  const weekDates = useMemo(() => getWeekDates(currentMonday), [currentMonday]);
  const weekNumber = useMemo(
    () => getWeekNumber(currentMonday),
    [currentMonday]
  );
  const year = currentMonday.getFullYear();

  const todayStr = formatDate(new Date());
  const weather = useWeekWeather(weekDates);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [afsprakenData, medewerkerData, projectData, klantenData, offertesData] = await Promise.all([
        getMontageAfspraken().catch(() => []),
        getMedewerkers().catch(() => []),
        getProjecten().catch(() => []),
        getKlanten().catch(() => []),
        getOffertes().catch(() => []),
      ]);

      setAfspraken(afsprakenData || []);
      setMedewerkers(medewerkerData || []);
      setProjecten(projectData || []);
      setKlanten(klantenData || []);
      setOffertes(offertesData || []);
    } catch {
      toast.error('Kon montageplanning niet laden');
    } finally {
      setLoading(false);
    }
  }, [currentMonday]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // All afspraken for this week (unfiltered, needed for conflict detection)
  const weekAfsprakenAll = useMemo(() => {
    const startStr = formatDate(weekDates[0]);
    const endStr = formatDate(weekDates[6]);
    return afspraken.filter((a) => a.datum >= startStr && a.datum <= endStr);
  }, [afspraken, weekDates]);

  // Filtered by monteur + status
  const weekAfspraken = useMemo(() => {
    return weekAfsprakenAll.filter((a) => {
      if (selectedMonteur !== "alle" && !a.monteurs.includes(selectedMonteur)) return false;
      if (!statusFilter.has(a.status)) return false;
      return true;
    });
  }, [weekAfsprakenAll, selectedMonteur, statusFilter]);

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

  function printDagplanning() {
    const datum = todayStr;
    const dagLabel = new Date().toLocaleDateString("nl-NL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Get all afspraken for today (or filtered monteur)
    let dagAfspraken = afspraken
      .filter((a) => a.datum === datum && a.status !== "afgerond")
      .sort((a, b) => a.start_tijd.localeCompare(b.start_tijd));

    if (selectedMonteur !== "alle") {
      dagAfspraken = dagAfspraken.filter((a) => a.monteurs.includes(selectedMonteur));
    }

    const monteurNaam = selectedMonteur !== "alle"
      ? monteurMap[selectedMonteur]?.naam || ""
      : "Alle medewerkers";

    const rows = dagAfspraken
      .map(
        (a) =>
          `<tr>
            <td style="padding:8px;border:1px solid #ddd;">${a.start_tijd} - ${a.eind_tijd}</td>
            <td style="padding:8px;border:1px solid #ddd;font-weight:600;">${a.titel}</td>
            <td style="padding:8px;border:1px solid #ddd;">${a.klant_naam || ""}</td>
            <td style="padding:8px;border:1px solid #ddd;">${a.locatie}</td>
            <td style="padding:8px;border:1px solid #ddd;">${a.monteurs.map((id) => monteurMap[id]?.naam || "?").join(", ")}</td>
            <td style="padding:8px;border:1px solid #ddd;">${a.materialen.join(", ")}</td>
            <td style="padding:8px;border:1px solid #ddd;font-size:12px;">${a.notities || ""}</td>
          </tr>`
      )
      .join("");

    const html = `<!DOCTYPE html><html><head><title>Dagplanning ${dagLabel}</title>
      <style>body{font-family:Arial,sans-serif;padding:20px}table{border-collapse:collapse;width:100%}
      th{background:#f3f4f6;padding:10px 8px;border:1px solid #ddd;text-align:left;font-size:13px}
      td{font-size:13px}h1{font-size:20px;margin-bottom:4px}
      @media print{body{padding:10px}}</style></head>
      <body>
      <h1>Dagplanning — ${dagLabel}</h1>
      <p style="color:#666;margin-bottom:16px;">${monteurNaam} &middot; ${dagAfspraken.length} montage${dagAfspraken.length !== 1 ? "s" : ""}</p>
      ${dagAfspraken.length === 0
        ? '<p style="color:#999;font-style:italic;">Geen montages gepland voor vandaag.</p>'
        : `<table><thead><tr>
          <th>Tijd</th><th>Titel</th><th>Klant</th><th>Locatie</th><th>Medewerkers</th><th>Materialen</th><th>Notities</th>
        </tr></thead><tbody>${rows}</tbody></table>`
      }
      </body></html>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => printWindow.print();
    }
  }

  function openNewDialog() {
    setEditingAfspraak(null);
    setFormData({ ...EMPTY_FORM, datum: todayStr });
    setDialogOpen(true);
  }

  function openEditDialog(afspraak: MontageAfspraak) {
    setEditingAfspraak(afspraak);
    setFormData({
      project_id: afspraak.project_id,
      klant_id: afspraak.klant_id,
      klant_naam: afspraak.klant_naam || "",
      titel: afspraak.titel,
      beschrijving: afspraak.beschrijving,
      datum: afspraak.datum,
      start_tijd: afspraak.start_tijd,
      eind_tijd: afspraak.eind_tijd,
      locatie: afspraak.locatie,
      monteurs: [...afspraak.monteurs],
      materialen: afspraak.materialen.join(", "),
      notities: afspraak.notities,
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
      user_id: "u1",
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
      status: "gepland" as const,
    };

    try {
      if (editingAfspraak) {
        const updated = await updateMontageAfspraak(editingAfspraak.id, payload).catch(
          () => null
        );
        if (updated) {
          setAfspraken((prev) =>
            prev.map((a) =>
              a.id === editingAfspraak.id ? { ...a, ...payload, ...updated } : a
            )
          );
        } else {
          setAfspraken((prev) =>
            prev.map((a) =>
              a.id === editingAfspraak.id
                ? { ...a, ...payload, updated_at: new Date().toISOString() }
                : a
            )
          );
        }
        toast.success("Montage afspraak bijgewerkt");
      } else {
        const created = await createMontageAfspraak(payload).catch(() => null);
        const newAfspraak: MontageAfspraak = created || {
          ...payload,
          id: `temp-${Date.now()}`,
          user_id: "u1",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setAfspraken((prev) => [...prev, newAfspraak]);
        toast.success("Montage afspraak aangemaakt");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Er ging iets mis bij het opslaan");
    }
  }

  async function handleDelete(afspraakId: string) {
    const confirmed = await confirm({ message: 'Weet je zeker dat je deze montage-afspraak wilt verwijderen?', variant: 'destructive', confirmLabel: 'Verwijderen' })
    if (!confirmed) return
    try {
      await deleteMontageAfspraak(afspraakId).catch(() => null);
      setAfspraken((prev) => prev.filter((a) => a.id !== afspraakId));
      toast.success("Montage afspraak verwijderd");
    } catch {
      toast.error("Er ging iets mis bij het verwijderen");
    }
  }

  async function handleStatusUpdate(
    afspraak: MontageAfspraak,
    newStatus: MontageAfspraak["status"]
  ) {
    try {
      await updateMontageAfspraak(afspraak.id, { status: newStatus }).catch(
        () => null
      );
      setAfspraken((prev) =>
        prev.map((a) =>
          a.id === afspraak.id
            ? { ...a, status: newStatus, updated_at: new Date().toISOString() }
            : a
        )
      );
      toast.success(`Status bijgewerkt naar ${STATUS_CONFIG[newStatus].label}`);
    } catch {
      toast.error("Kon status niet bijwerken");
    }
  }

  async function handleDragDrop(afspraakId: string, newDate: string) {
    const afspraak = afspraken.find((a) => a.id === afspraakId);
    if (!afspraak || afspraak.datum === newDate) return;
    try {
      await updateMontageAfspraak(afspraakId, { datum: newDate }).catch(() => null);
      setAfspraken((prev) =>
        prev.map((a) =>
          a.id === afspraakId
            ? { ...a, datum: newDate, updated_at: new Date().toISOString() }
            : a
        )
      );
      const dateObj = new Date(newDate + "T00:00:00");
      toast.success(`Verplaatst naar ${formatDateDutch(dateObj)}`);
    } catch {
      toast.error("Kon afspraak niet verplaatsen");
    }
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
    const sizeClasses = size === "sm" ? "h-6 w-6 text-2xs" : "h-8 w-8 text-xs";
    return (
      <div className="flex -space-x-1.5">
        {monteurIds.map((id, idx) => {
          const monteur = monteurMap[id];
          const naam = monteur?.naam || "Onbekend";
          return (
            <div
              key={id}
              className={cn(
                sizeClasses,
                "rounded-full flex items-center justify-center text-white font-medium ring-2 ring-white",
                getAvatarColor(idx)
              )}
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
    const config = STATUS_CONFIG[status];
    return (
      <Badge
        variant="secondary"
        className={cn("text-xs font-medium", BADGE_VARIANT_CLASSES[status])}
      >
        {config.label}
      </Badge>
    );
  }

  // ── Compact grid card for team grid & week view ──
  function renderGridCard(afspraak: MontageAfspraak) {
    const hasConflict = conflictAfspraakIds.has(afspraak.id);
    return (
      <div
        key={afspraak.id}
        draggable
        onDragStart={(e) => {
          setDraggingAfspraakId(afspraak.id);
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", afspraak.id);
        }}
        onDragEnd={() => { setDraggingAfspraakId(null); setDragOverDate(null); }}
        className={cn(
          "rounded-lg border bg-card p-2 mb-1.5 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md",
          hasConflict && "ring-1 ring-red-300 bg-red-50/60",
          draggingAfspraakId === afspraak.id && "opacity-50 ring-2 ring-primary"
        )}
        onClick={() => openEditDialog(afspraak)}
      >
        {/* Row 1: status dot + project name (bold) */}
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={cn("w-2 h-2 rounded-full shrink-0", STATUS_DOT[afspraak.status])} title={STATUS_CONFIG[afspraak.status].label} />
          <span className="text-xs font-semibold truncate leading-tight">{afspraak.titel}</span>
          {hasConflict && <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />}
        </div>
        {/* Row 2: klant */}
        {afspraak.klant_naam && (
          <div className="text-[11px] text-muted-foreground truncate pl-3.5">{afspraak.klant_naam}</div>
        )}
        {/* Row 3: tijd */}
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground pl-3.5 mt-0.5">
          <Clock className="h-2.5 w-2.5 shrink-0" />
          <span className="font-mono tabular-nums">{afspraak.start_tijd} – {afspraak.eind_tijd}</span>
        </div>
        {/* Row 4: locatie */}
        {afspraak.locatie && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(afspraak.locatie)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[11px] text-primary hover:underline pl-3.5 mt-0.5 truncate"
          >
            <MapPin className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{afspraak.locatie}</span>
          </a>
        )}
        {/* Row 5: werkbon */}
        {afspraak.werkbon_nummer && (
          <div className="flex items-center gap-1 text-[10px] font-mono text-[#943520] pl-3.5 mt-0.5">
            <ClipboardCheck className="h-2.5 w-2.5 shrink-0" />
            {afspraak.werkbon_nummer}
          </div>
        )}
      </div>
    );
  }

  // ── Day column header with weather ──
  function renderDayHeader(date: Date, w: DayWeather | undefined) {
    const dateStr = formatDate(date);
    const isToday = dateStr === todayStr;
    const dayIdx = (date.getDay() + 6) % 7; // 0=Ma
    const isRainy = w && w.precipitationProb > 50;

    return (
      <div
        className={cn(
          "text-center py-2 border-b-2",
          isToday ? "bg-primary/5 border-primary" : "bg-muted/30 border-border",
          isRainy && !isToday && "bg-blue-50/60"
        )}
      >
        <div className={cn("text-sm font-bold", isToday ? "text-primary" : "text-foreground/80")}>
          {DAG_NAMEN[dayIdx]}
          <span className="font-normal text-xs ml-1">{formatDateDutch(date)}</span>
        </div>
        {w && (
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            <span className="text-sm leading-none">{w.emoji}</span>
            <span className="text-xs font-mono tabular-nums font-medium">{w.maxTemp}°</span>
            {w.precipitationProb > 0 && (
              <span className={cn("text-[10px] font-mono tabular-nums", w.precipitationProb > 50 ? "text-blue-600 font-semibold" : "text-muted-foreground")}>
                💧{w.precipitationProb}%
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // === WEEK VIEW (team grid: monteurs als rijen, dagen als kolommen) ===
  function renderWeekView() {
    const werkdagen = weekDates.slice(0, 5); // Ma t/m Vr
    const hasWeekend = weekAfspraken.some((a) => {
      const d = new Date(a.datum + "T00:00:00").getDay();
      return d === 0 || d === 6;
    });
    const displayDays = hasWeekend ? weekDates : werkdagen;
    const colCount = displayDays.length;

    return (
      <div className="min-w-[700px]">
        <div className="grid gap-0 rounded-lg overflow-hidden border border-border/40" style={{ gridTemplateColumns: `160px repeat(${colCount}, 1fr)` }}>
          {/* Corner: Monteur label */}
          <div className="p-2 border-b-2 border-r border-border bg-muted/30 flex items-end">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Team</span>
          </div>

          {/* Day headers with weather */}
          {displayDays.map((date) => {
            const w = getWeatherForDate(weather, date);
            return <div key={formatDate(date)} className="border-r last:border-r-0 border-border">{renderDayHeader(date, w)}</div>;
          })}

          {/* Monteur rows */}
          {monteurs.map((monteur, monteurIdx) => (
            <>
              {/* Monteur name cell */}
              <div
                key={`name-${monteur.id}`}
                className="p-2 border-b border-r border-border bg-card flex items-center gap-2"
              >
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0",
                    getAvatarColor(monteurIdx)
                  )}
                >
                  {getInitials(monteur.naam)}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold truncate">{monteur.naam}</div>
                  {monteur.functie && <div className="text-[10px] text-muted-foreground truncate">{monteur.functie}</div>}
                </div>
              </div>

              {/* Day cells for this monteur */}
              {displayDays.map((date) => {
                const dateStr = formatDate(date);
                const isToday = dateStr === todayStr;
                const cellAfspraken = weekAfspraken.filter(
                  (a) => a.datum === dateStr && a.monteurs.includes(monteur.id)
                );
                const w = getWeatherForDate(weather, date);
                const isRainy = w && w.precipitationProb > 50;

                return (
                  <div
                    key={`${monteur.id}-${dateStr}`}
                    className={cn(
                      "p-1.5 border-b border-r last:border-r-0 border-border min-h-[80px]",
                      isToday ? "bg-primary/[0.03]" : "bg-background",
                      isRainy && !isToday && "bg-blue-50/30",
                      dragOverDate === `${monteur.id}-${dateStr}` && "bg-primary/5 ring-2 ring-primary/30 ring-inset"
                    )}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setDragOverDate(`${monteur.id}-${dateStr}`);
                    }}
                    onDragLeave={() => setDragOverDate(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverDate(null);
                      const id = e.dataTransfer.getData("text/plain");
                      if (id) handleDragDrop(id, dateStr);
                    }}
                  >
                    {cellAfspraken.length > 0
                      ? cellAfspraken.map((a) => renderGridCard(a))
                      : <div className="h-full flex items-center justify-center"><span className="text-muted-foreground/20">—</span></div>
                    }
                  </div>
                );
              })}
            </>
          ))}

          {/* Unassigned row (montages without monteurs) */}
          {(() => {
            const unassigned = weekAfspraken.filter((a) => a.monteurs.length === 0);
            if (unassigned.length === 0) return null;
            return (
              <>
                <div className="p-2 border-b border-r border-border bg-card flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center bg-muted text-muted-foreground text-xs font-bold shrink-0">?</div>
                  <div className="text-[13px] font-semibold text-muted-foreground">Niet toegewezen</div>
                </div>
                {displayDays.map((date) => {
                  const dateStr = formatDate(date);
                  const cellAfspraken = unassigned.filter((a) => a.datum === dateStr);
                  return (
                    <div key={`unassigned-${dateStr}`} className="p-1.5 border-b border-r last:border-r-0 border-border min-h-[60px] bg-muted/10">
                      {cellAfspraken.map((a) => renderGridCard(a))}
                    </div>
                  );
                })}
              </>
            );
          })()}
        </div>
      </div>
    );
  }

  // === LIST VIEW ===
  function renderListView() {
    const sortedAfspraken = [...weekAfspraken].sort((a, b) => {
      if (a.datum !== b.datum) return a.datum.localeCompare(b.datum);
      return a.start_tijd.localeCompare(b.start_tijd);
    });

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Dag</th>
              <th className="text-left py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tijd</th>
              <th className="text-left py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Project</th>
              <th className="text-left py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Klant</th>
              <th className="text-left py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Locatie</th>
              <th className="text-left py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Team</th>
              <th className="text-left py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Acties</th>
            </tr>
          </thead>
          <tbody>
            {sortedAfspraken.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Wrench className="h-8 w-8 opacity-30" />
                    <span>Geen montages deze week</span>
                  </div>
                </td>
              </tr>
            ) : (
              sortedAfspraken.map((afspraak) => {
                const dateObj = new Date(afspraak.datum + "T00:00:00");
                const dayIdx = (dateObj.getDay() + 6) % 7;
                const nextActions = getNextStatusActions(afspraak.status);
                const hasConflict = conflictAfspraakIds.has(afspraak.id);

                return (
                  <tr
                    key={afspraak.id}
                    className={cn(
                      "border-b hover:bg-muted/20 transition-colors cursor-pointer",
                      hasConflict && "bg-red-50/50"
                    )}
                    onClick={() => openEditDialog(afspraak)}
                  >
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("w-2 h-2 rounded-full shrink-0", STATUS_DOT[afspraak.status])} />
                        <div>
                          <div className="font-medium text-[13px]">{DAG_NAMEN_LANG[dayIdx]}</div>
                          <div className="text-[11px] text-muted-foreground">{formatDateDutch(dateObj)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[13px]">
                      {afspraak.start_tijd} – {afspraak.eind_tijd}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-[13px]">{afspraak.titel}</div>
                      {afspraak.werkbon_nummer && (
                        <span className="text-[10px] font-mono text-[#943520]">{afspraak.werkbon_nummer}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-[13px]">{afspraak.klant_naam}</td>
                    <td className="py-2.5 px-3">
                      {afspraak.locatie ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(afspraak.locatie)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-[13px] text-primary hover:underline"
                        >
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[180px]">{afspraak.locatie}</span>
                        </a>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-2.5 px-3">
                      {renderMonteurAvatars(afspraak.monteurs, "md")}
                    </td>
                    <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {nextActions.map((action) => (
                          <Button
                            key={action.status}
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleStatusUpdate(afspraak, action.status)}
                            title={action.label}
                          >
                            {action.icon}
                            <span className="ml-1 hidden xl:inline">{action.label}</span>
                          </Button>
                        ))}
                        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => openEditDialog(afspraak)} title="Bewerken">
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  }

  // === RASTER VIEW (original columns-per-day, all monteurs mixed) ===
  function renderRasterView() {
    const werkdagen = weekDates.slice(0, 5);
    return (
      <div className="min-w-[700px]">
        <div className="grid grid-cols-5 gap-2">
          {werkdagen.map((date) => {
            const dateStr = formatDate(date);
            const isToday = dateStr === todayStr;
            const dayAfspraken = afsprakenPerDag[dateStr] || [];
            const w = getWeatherForDate(weather, date);
            const isRainy = w && w.precipitationProb > 50;

            return (
              <div
                key={dateStr}
                className={cn(
                  "rounded-lg border border-border/40 overflow-hidden transition-colors",
                  isRainy && "border-blue-200",
                  dragOverDate === dateStr && "ring-2 ring-primary/30"
                )}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverDate(dateStr); }}
                onDragLeave={() => setDragOverDate(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverDate(null);
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) handleDragDrop(id, dateStr);
                }}
              >
                {renderDayHeader(date, w)}
                <div className={cn("p-1.5 min-h-[200px]", isRainy && "bg-blue-50/20")}>
                  {dayAfspraken.length === 0 ? (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground text-center py-8">
                      <Wrench className="h-4 w-4 opacity-20" />
                      <span className="text-[11px]">Geen montages</span>
                    </div>
                  ) : (
                    dayAfspraken.map((a) => (
                      <div key={a.id}>
                        {renderGridCard(a)}
                        {/* Show monteur avatars below card in this view */}
                        <div className="flex items-center gap-1 -mt-1 mb-2 pl-1">
                          {renderMonteurAvatars(a.monteurs)}
                        </div>
                      </div>
                    ))
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
        <DialogContent className="max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAfspraak
                ? "Montage afspraak bewerken"
                : "Nieuwe montage afspraak"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={handleProjectChange}
                >
                  <SelectTrigger id="project">
                    <SelectValue placeholder="Selecteer project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projecten.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.naam}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="klant">Klant</Label>
                <Input
                  id="klant"
                  value={formData.klant_naam}
                  disabled
                  placeholder="Wordt automatisch ingevuld"
                  className="bg-background"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="titel">Titel</Label>
              <Input
                id="titel"
                value={formData.titel}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, titel: e.target.value }))
                }
                placeholder="Bijv. Gevelreclame montage"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="beschrijving">Beschrijving</Label>
              <Textarea
                id="beschrijving"
                value={formData.beschrijving}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    beschrijving: e.target.value,
                  }))
                }
                placeholder="Beschrijf de werkzaamheden..."
                rows={3}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="datum">Datum</Label>
                <Input
                  id="datum"
                  type="date"
                  value={formData.datum}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, datum: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_tijd">Start tijd</Label>
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
                <Label htmlFor="eind_tijd">Eind tijd</Label>
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="locatie">Locatie</Label>
                <Input
                  id="locatie"
                  className="h-9"
                  value={formData.locatie}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, locatie: e.target.value }))
                  }
                  placeholder="Adres montage"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  Werkbon
                </Label>
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
                          user_id: "u1",
                          klant_id: formData.klant_id,
                          project_id: formData.project_id,
                          titel: formData.titel || "",
                          datum: new Date().toISOString().split("T")[0],
                          status: "concept",
                        });
                        setProjectWerkbonnen((prev) => [...prev, wb]);
                        setFormData((prev) => ({ ...prev, werkbon_id: wb.id }));
                        toast.success(`Werkbon ${wb.werkbon_nummer} aangemaakt`);
                      } catch {
                        toast.error("Kon werkbon niet aanmaken");
                      }
                    } else {
                      setFormData((prev) => ({ ...prev, werkbon_id: v === "__none__" ? "" : v }));
                    }
                  }}
                >
                  <SelectTrigger className="h-9">
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
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Medewerkers</Label>
              <div className="flex flex-wrap gap-1.5">
                {monteurs.map((monteur, idx) => (
                  <button
                    key={monteur.id}
                    type="button"
                    onClick={() => toggleMonteur(monteur.id)}
                    className={cn(
                      "h-7 w-7 rounded-full flex items-center justify-center text-[9px] font-bold transition-colors",
                      formData.monteurs.includes(monteur.id)
                        ? "text-white ring-2 ring-primary/30 " + getAvatarColor(idx)
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                    title={monteur.naam}
                  >
                    {getInitials(monteur.naam)}
                  </button>
                ))}
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
                  <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-red-700 mb-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Overlap gedetecteerd
                    </div>
                    {formConflicts.map((a) => {
                      const overlappingMonteurs = a.monteurs
                        .filter((m) => formData.monteurs.includes(m))
                        .map((m) => monteurMap[m]?.naam || "?")
                        .join(", ");
                      return (
                        <p key={a.id} className="text-xs text-red-600">
                          {overlappingMonteurs} heeft al &quot;{a.titel}&quot; ({a.start_tijd}–{a.eind_tijd})
                        </p>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="materialen">Materialen</Label>
              <Input
                id="materialen"
                value={formData.materialen}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    materialen: e.target.value,
                  }))
                }
                placeholder="Gescheiden door komma's, bijv. Gevelletters, LED-verlichting"
              />
              {formData.materialen && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {formData.materialen
                    .split(",")
                    .map((m) => m.trim())
                    .filter(Boolean)
                    .map((mat, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        <Package className="h-3 w-3 mr-1" />
                        {mat}
                      </Badge>
                    ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notities">Notities</Label>
              <Textarea
                id="notities"
                value={formData.notities}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notities: e.target.value }))
                }
                placeholder="Aanvullende opmerkingen..."
                rows={3}
              />
            </div>

            <Separator />

            {/* Bijlagen */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5" />
                Bijlagen
              </Label>

              {/* Bestaande bijlagen */}
              {formData.bijlagen.length > 0 && (
                <div className="space-y-1.5">
                  {formData.bijlagen.map((bijlage) => (
                    <div
                      key={bijlage.id}
                      className="flex items-center gap-2 p-2 rounded-lg border border-[#E6E4E0] bg-[#FAFAF8]"
                    >
                      {bijlage.type === 'pdf' ? (
                        <FileText className="h-4 w-4 text-[#C03A18] flex-shrink-0" />
                      ) : bijlage.type === 'tekening' || bijlage.type === 'foto' ? (
                        <Image className="h-4 w-4 text-[#3A6B8C] flex-shrink-0" />
                      ) : (
                        <Paperclip className="h-4 w-4 text-[#5A5A55] flex-shrink-0" />
                      )}
                      <span className="text-[13px] text-foreground truncate flex-1">{bijlage.naam}</span>
                      <span className="text-[10px] text-[#A0A098] uppercase font-medium flex-shrink-0">{bijlage.type}</span>
                      <button
                        type="button"
                        title="Bekijken"
                        onClick={() => window.open(bijlage.url, '_blank')}
                        className="text-[#A0A098] hover:text-[#1A535C] transition-colors flex-shrink-0"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Printen"
                        onClick={() => {
                          const w = window.open(bijlage.url, '_blank')
                          if (w) { w.addEventListener('load', () => w.print()) }
                        }}
                        className="text-[#A0A098] hover:text-[#1A535C] transition-colors flex-shrink-0"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({
                          ...prev,
                          bijlagen: prev.bijlagen.filter((b) => b.id !== bijlage.id),
                        }))}
                        className="text-[#A0A098] hover:text-[#C03A18] transition-colors flex-shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload zone */}
              <label
                className="flex flex-col items-center gap-1.5 p-4 rounded-lg border-2 border-dashed border-[#E6E4E0] hover:border-[#1A535C] hover:bg-[#F4F2EE] transition-colors cursor-pointer"
              >
                <Upload className="h-5 w-5 text-[#A0A098]" />
                <span className="text-[12px] text-[#5A5A55]">
                  PDF, tekening of foto uploaden
                </span>
                <span className="text-[10px] text-[#A0A098]">
                  PDF, PNG, JPG, WEBP (max 10MB)
                </span>
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
                        setFormData((prev) => ({
                          ...prev,
                          bijlagen: [...prev.bijlagen, bijlage],
                        }))
                      } catch {
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
              <Button
                variant="destructive"
                onClick={() => {
                  handleDelete(editingAfspraak.id);
                  setDialogOpen(false);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Verwijderen
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuleren
            </Button>
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="animate-spin h-8 w-8 border-4 border-[#7EB5A6] border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Planning laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* ── Header bar ── */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-[-0.03em] font-display truncate">
          Montage Planning
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={printDagplanning} className="h-9 hidden sm:flex">
            <Printer className="h-4 w-4 mr-1.5" />
            Print dagplanning
          </Button>
          <Button onClick={openNewDialog} size="default">
            <Plus className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Nieuwe montage</span>
            <span className="sm:hidden">Nieuw</span>
          </Button>
        </div>
      </div>

      {/* ── Conflict banner ── */}
      {conflicts.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <div className="text-sm text-red-700">
            <span className="font-semibold">{conflicts.length} overlap{conflicts.length !== 1 ? "s" : ""}</span>
            {conflicts.slice(0, 3).map((c, idx) => {
              const dag = new Date(c.afspraak1.datum + "T00:00:00").toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
              return (
                <span key={idx} className="ml-2">
                  {c.monteurNaam}: {dag} {c.afspraak1.start_tijd}–{c.afspraak1.eind_tijd} / {c.afspraak2.start_tijd}–{c.afspraak2.eind_tijd}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Toolbar: week nav + filters + view toggle ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
        {/* Week navigation */}
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateWeek(-1)} title="Vorige week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <button
            onClick={goToCurrentWeek}
            className="text-sm font-bold px-3 py-1.5 rounded-lg hover:bg-muted transition-colors min-w-[130px] text-center"
          >
            Week <span className="font-mono">{weekNumber}</span>
            <span className="text-xs font-normal text-muted-foreground ml-1.5">{formatDateDutch(weekDates[0])} – {formatDateDutch(weekDates[6])}</span>
          </button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateWeek(1)} title="Volgende week">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Medewerker filter */}
        <Select value={selectedMonteur} onValueChange={setSelectedMonteur}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Alle medewerkers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle medewerkers</SelectItem>
            {monteurs.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.naam}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {/* View toggle */}
        <div className="flex items-center gap-0.5 border rounded-lg p-0.5 bg-muted/30">
          <Button
            variant={viewMode === "week" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("week")}
            className="h-7 text-xs px-2.5"
          >
            <Users className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Teamweergave</span>
            <span className="sm:hidden">Team</span>
          </Button>
          <Button
            variant={viewMode === "raster" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("raster")}
            className="h-7 text-xs px-2.5"
          >
            <LayoutGrid className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Dagkolommen</span>
            <span className="sm:hidden">Dagen</span>
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="h-7 text-xs px-2.5"
          >
            <List className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Lijstweergave</span>
            <span className="sm:hidden">Lijst</span>
          </Button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="overflow-x-auto">
        {viewMode === "week" ? renderWeekView() : viewMode === "raster" ? renderRasterView() : renderListView()}
      </div>

      {/* ── Status legend (compact) ── */}
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground px-1">
        {(Object.keys(STATUS_CONFIG) as MontageAfspraak["status"][]).map((s) => (
          <div key={s} className="flex items-center gap-1">
            <span className={cn("w-2 h-2 rounded-full", STATUS_DOT[s])} />
            {STATUS_CONFIG[s].label}
          </div>
        ))}
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
