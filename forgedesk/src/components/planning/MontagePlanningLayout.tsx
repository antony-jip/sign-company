import { useState, useEffect, useMemo, useCallback } from "react";
import { WeatherDayStrip } from "./WeatherDayStrip";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  UserCheck,
  X,
  AlertTriangle,
  Printer,
  Filter,
  User,
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
} from "@/services/supabaseService";
import type { MontageAfspraak, Project, Medewerker, Klant, Offerte } from "@/types";
import { WerkbonVanProjectDialog } from "@/components/werkbonnen/WerkbonVanProjectDialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

  const weekDates = useMemo(() => getWeekDates(currentMonday), [currentMonday]);
  const weekNumber = useMemo(
    () => getWeekNumber(currentMonday),
    [currentMonday]
  );
  const year = currentMonday.getFullYear();

  const todayStr = formatDate(new Date());

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
    });
    setDialogOpen(true);
  }

  function handleProjectChange(projectId: string) {
    const project = projecten.find((p) => p.id === projectId);
    setFormData((prev) => ({
      ...prev,
      project_id: projectId,
      klant_id: project?.klant_id || "",
      klant_naam: project?.klant_naam || "",
    }));
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
    const confirmed = window.confirm('Weet je zeker dat je deze montage-afspraak wilt verwijderen?')
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

  function renderWeekCard(afspraak: MontageAfspraak) {
    const config = STATUS_CONFIG[afspraak.status];
    const nextActions = getNextStatusActions(afspraak.status);
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
          "rounded-lg border p-3 mb-2 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md",
          hasConflict ? "bg-red-50 border-red-300 ring-1 ring-red-200" : config.bgColor,
          !hasConflict && config.borderColor,
          draggingAfspraakId === afspraak.id && "opacity-50 ring-2 ring-primary"
        )}
        onClick={() => openEditDialog(afspraak)}
      >
        {hasConflict && (
          <div className="flex items-center gap-1 text-2xs font-medium text-red-600 mb-1">
            <AlertTriangle className="h-3 w-3" />
            Overlap
          </div>
        )}
        <div className="flex items-start justify-between gap-1 mb-1.5">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span className="font-mono">
              {afspraak.start_tijd} - {afspraak.eind_tijd}
            </span>
          </div>
          {renderStatusBadge(afspraak.status)}
        </div>

        <h4 className="text-sm font-semibold leading-tight mb-1 truncate">
          {afspraak.titel}
        </h4>

        {afspraak.project_naam && (
          <p className="text-xs text-muted-foreground truncate mb-1">
            {afspraak.project_naam}
          </p>
        )}

        {afspraak.locatie && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(afspraak.locatie)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs text-primary hover:underline mb-2"
          >
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{afspraak.locatie}</span>
          </a>
        )}

        <div className="flex items-center justify-between">
          {renderMonteurAvatars(afspraak.monteurs)}
          <div className="flex gap-1">
            {!afspraak.werkbon_id && afspraak.project_id && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setWerkbonMontage(afspraak);
                  setWerkbonDialogOpen(true);
                }}
                title="Werkbon toevoegen"
              >
                <ClipboardList className="h-3 w-3" />
              </Button>
            )}
            {nextActions.length > 0 && nextActions.map((action) => (
              <Button
                key={action.status}
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusUpdate(afspraak, action.status);
                }}
                title={action.label}
              >
                {action.icon}
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderWeekView() {
    return (
      <div className="min-w-[700px]">
        <WeatherDayStrip weekDays={weekDates} />
        <div className="grid grid-cols-7 gap-2">
        {weekDates.map((date, dayIndex) => {
          const dateStr = formatDate(date);
          const isToday = dateStr === todayStr;
          const dayAfspraken = afsprakenPerDag[dateStr] || [];

          return (
            <div
              key={dateStr}
              className={cn(
                "min-h-[200px] rounded-lg transition-colors",
                dragOverDate === dateStr && "bg-primary/5 ring-2 ring-primary/30 ring-dashed"
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
              <div
                className={cn(
                  "text-center py-2 rounded-t-lg mb-2 border-b-2",
                  isToday
                    ? "bg-blue-50 border-blue-500"
                    : "bg-background border-border"
                )}
              >
                <div
                  className={cn(
                    "text-sm font-semibold",
                    isToday ? "text-blue-700" : "text-foreground/70"
                  )}
                >
                  {DAG_NAMEN[dayIndex]}
                </div>
                <div
                  className={cn(
                    "text-xs",
                    isToday ? "text-blue-600" : "text-muted-foreground"
                  )}
                >
                  {formatDateDutch(date)}
                </div>
              </div>

              <div className="space-y-0">
                {dayAfspraken.length === 0 ? (
                  <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground text-center py-4">
                    <Wrench className="h-4 w-4 opacity-30" />
                    Geen montages
                  </div>
                ) : (
                  dayAfspraken.map((afspraak) => renderWeekCard(afspraak))
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>
    );
  }

  function renderListView() {
    const sortedAfspraken = [...weekAfspraken].sort((a, b) => {
      if (a.datum !== b.datum) return a.datum.localeCompare(b.datum);
      return a.start_tijd.localeCompare(b.start_tijd);
    });

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-background">
              <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-label text-text-tertiary">
                Datum
              </th>
              <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-label text-text-tertiary">
                Tijd
              </th>
              <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-label text-text-tertiary">
                Project
              </th>
              <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-label text-text-tertiary">
                Klant
              </th>
              <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-label text-text-tertiary">
                Locatie
              </th>
              <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-label text-text-tertiary">
                Medewerkers
              </th>
              <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-label text-text-tertiary">
                Status
              </th>
              <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-label text-text-tertiary">
                Materialen
              </th>
              <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-label text-text-tertiary">
                Acties
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedAfspraken.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="text-center py-12 text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Wrench className="h-8 w-8 opacity-30" />
                    <span>Geen montages</span>
                  </div>
                </td>
              </tr>
            ) : (
              sortedAfspraken.map((afspraak) => {
                const dateObj = new Date(afspraak.datum + "T00:00:00");
                const dayIdx =
                  (dateObj.getDay() + 6) % 7;
                const nextActions = getNextStatusActions(afspraak.status);
                const rowConflict = conflictAfspraakIds.has(afspraak.id);

                return (
                  <tr
                    key={afspraak.id}
                    className={cn(
                      "border-b hover:bg-background transition-colors",
                      rowConflict && "bg-red-50/60"
                    )}
                  >
                    <td className="py-3 px-4">
                      {rowConflict && (
                        <div className="flex items-center gap-1 text-2xs font-medium text-red-600 mb-0.5">
                          <AlertTriangle className="h-3 w-3" />
                          Overlap
                        </div>
                      )}
                      <div className="font-medium">
                        {DAG_NAMEN_LANG[dayIdx]}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateDutch(dateObj)}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono">
                      {afspraak.start_tijd} - {afspraak.eind_tijd}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium">{afspraak.titel}</div>
                      <div className="text-xs text-muted-foreground">
                        {afspraak.project_naam}
                      </div>
                    </td>
                    <td className="py-3 px-4">{afspraak.klant_naam}</td>
                    <td className="py-3 px-4">
                      {afspraak.locatie ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(afspraak.locatie)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[180px]">
                            {afspraak.locatie}
                          </span>
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {renderMonteurAvatars(afspraak.monteurs, "md")}
                        <div className="text-xs text-muted-foreground">
                          {afspraak.monteurs
                            .map(
                              (id) =>
                                monteurMap[id]?.naam?.split(" ")[0] || "?"
                            )
                            .join(", ")}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {renderStatusBadge(afspraak.status)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {afspraak.materialen.slice(0, 2).map((mat, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="text-xs"
                          >
                            {mat}
                          </Badge>
                        ))}
                        {afspraak.materialen.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{afspraak.materialen.length - 2}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        {nextActions.map((action) => (
                          <Button
                            key={action.status}
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() =>
                              handleStatusUpdate(afspraak, action.status)
                            }
                            title={action.label}
                          >
                            {action.icon}
                            <span className="ml-1">{action.label}</span>
                          </Button>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => openEditDialog(afspraak)}
                          title="Bewerken"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(afspraak.id)}
                          title="Verwijderen"
                        >
                          <Trash2 className="h-3 w-3" />
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

  function renderRasterView() {
    // Grid: monteurs als rijen, Ma-Vr als kolommen
    const werkdagen = weekDates.slice(0, 5); // Ma t/m Vr

    return (
      <div className="min-w-[800px]">
        {/* Header rij met dagen */}
        <div className="grid gap-0" style={{ gridTemplateColumns: "180px repeat(5, 1fr)" }}>
          <div className="p-2 border-b-2 border-r bg-muted/30">
            <span className="text-xs font-bold text-text-tertiary uppercase tracking-label">Monteur</span>
          </div>
          {werkdagen.map((date, i) => {
            const dateStr = formatDate(date);
            const isToday = dateStr === todayStr;
            return (
              <div
                key={dateStr}
                className={cn(
                  "p-2 text-center border-b-2 border-r last:border-r-0",
                  isToday ? "bg-blue-50 border-blue-500" : "bg-muted/30 border-border"
                )}
              >
                <div className={cn("text-sm font-semibold", isToday ? "text-blue-700" : "text-foreground/70")}>
                  {DAG_NAMEN[i]}
                </div>
                <div className={cn("text-xs", isToday ? "text-blue-600" : "text-muted-foreground")}>
                  {formatDateDutch(date)}
                </div>
              </div>
            );
          })}

          {/* Monteur rijen */}
          {monteurs.map((monteur, monteurIdx) => (
            <>
              {/* Monteur naam cel */}
              <div
                key={`name-${monteur.id}`}
                className="p-2 border-b border-r bg-background flex items-center gap-2"
              >
                <div
                  className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0",
                    getAvatarColor(monteurIdx)
                  )}
                >
                  {getInitials(monteur.naam)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{monteur.naam}</div>
                  <div className="text-2xs text-muted-foreground truncate">{monteur.functie}</div>
                </div>
              </div>

              {/* Dag cellen voor deze monteur */}
              {werkdagen.map((date) => {
                const dateStr = formatDate(date);
                const isToday = dateStr === todayStr;
                const cellAfspraken = weekAfspraken.filter(
                  (a) => a.datum === dateStr && a.monteurs.includes(monteur.id)
                );

                return (
                  <div
                    key={`${monteur.id}-${dateStr}`}
                    className={cn(
                      "p-1 border-b border-r last:border-r-0 min-h-[80px]",
                      isToday ? "bg-blue-50/30" : "bg-background",
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
                    {cellAfspraken.map((afspraak) => {
                      const config = STATUS_CONFIG[afspraak.status];
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
                            "rounded-lg border p-1.5 mb-1 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-sm text-xs",
                            config.bgColor, config.borderColor,
                            draggingAfspraakId === afspraak.id && "opacity-50 ring-2 ring-primary"
                          )}
                          onClick={() => openEditDialog(afspraak)}
                        >
                          <div className="flex items-center gap-1 mb-0.5">
                            <Clock className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                            <span className="text-2xs text-muted-foreground font-mono">
                              {afspraak.start_tijd}-{afspraak.eind_tijd}
                            </span>
                          </div>
                          <div className="font-medium truncate leading-tight">{afspraak.titel}</div>
                          {afspraak.locatie && (
                            <div className="flex items-center gap-0.5 text-2xs text-muted-foreground mt-0.5 truncate">
                              <MapPin className="h-2.5 w-2.5 shrink-0" />
                              {afspraak.locatie}
                            </div>
                          )}
                          {afspraak.werkbon_id && (
                            <div className="flex items-center gap-0.5 text-2xs text-primary mt-0.5">
                              <ClipboardList className="h-2.5 w-2.5 shrink-0" />
                              Werkbon
                            </div>
                          )}
                          {!afspraak.werkbon_id && afspraak.project_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-1 text-2xs mt-0.5 w-full justify-start text-muted-foreground hover:text-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                setWerkbonMontage(afspraak);
                                setWerkbonDialogOpen(true);
                              }}
                            >
                              <ClipboardList className="h-2.5 w-2.5 mr-0.5" />
                              + Werkbon
                            </Button>
                          )}
                        </div>
                      );
                    })}
                    {cellAfspraken.length === 0 && (
                      <div className="h-full flex items-center justify-center">
                        <span className="text-2xs text-muted-foreground/40 italic">—</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>
    );
  }

  function renderDialog() {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

            <div className="space-y-2">
              <Label htmlFor="locatie">Locatie</Label>
              <Input
                id="locatie"
                value={formData.locatie}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, locatie: e.target.value }))
                }
                placeholder="Adres van de montage locatie"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Medewerkers</Label>
              <div className="grid grid-cols-2 gap-2">
                {monteurs.map((monteur, idx) => (
                  <label
                    key={monteur.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-xl border cursor-pointer transition-colors",
                      formData.monteurs.includes(monteur.id)
                        ? "bg-blue-50 border-blue-300"
                        : "hover:bg-background"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={formData.monteurs.includes(monteur.id)}
                      onChange={() => toggleMonteur(monteur.id)}
                      className="rounded border-border text-blue-600 focus:ring-blue-500"
                    />
                    <div
                      className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-medium",
                        getAvatarColor(idx)
                      )}
                    >
                      {getInitials(monteur.naam)}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{monteur.naam}</div>
                      <div className="text-xs text-muted-foreground">
                        {monteur.functie}
                      </div>
                    </div>
                  </label>
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
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-[-0.03em] font-display truncate">
            Montage Planning
          </h1>
          <p className="text-muted-foreground mt-1 truncate">
            Plan en beheer montage afspraken
          </p>
        </div>
        <Button onClick={openNewDialog} size="lg" className="flex-shrink-0">
          <Plus className="h-5 w-5 mr-2" />
          <span className="hidden sm:inline">Nieuwe montage</span>
          <span className="sm:hidden">Nieuw</span>
        </Button>
      </div>

      {/* Conflict warnings */}
      {conflicts.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-sm font-semibold text-red-700">
              {conflicts.length} dubbele boeking{conflicts.length !== 1 ? "en" : ""} gedetecteerd
            </span>
          </div>
          <div className="space-y-1.5">
            {conflicts.map((c, idx) => {
              const dag = new Date(c.afspraak1.datum + "T00:00:00").toLocaleDateString("nl-NL", {
                weekday: "short",
                day: "numeric",
                month: "short",
              });
              return (
                <div key={idx} className="flex items-center gap-2 text-sm text-red-700">
                  <span className="font-medium">{c.monteurNaam}</span>
                  <span className="text-red-400">—</span>
                  <span>{dag}: {c.afspraak1.titel} ({c.afspraak1.start_tijd}–{c.afspraak1.eind_tijd})</span>
                  <span className="text-red-400">&amp;</span>
                  <span>{c.afspraak2.titel} ({c.afspraak2.start_tijd}–{c.afspraak2.eind_tijd})</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 flex-wrap">
        {/* Medewerker filter */}
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedMonteur} onValueChange={setSelectedMonteur}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue placeholder="Alle medewerkers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle medewerkers</SelectItem>
              {monteurs.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.naam}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {(Object.keys(STATUS_CONFIG) as MontageAfspraak["status"][]).map((status) => (
            <Button
              key={status}
              variant={statusFilter.has(status) ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-7 px-2.5 text-xs",
                statusFilter.has(status) && BADGE_VARIANT_CLASSES[status]
              )}
              onClick={() => toggleStatusFilter(status)}
            >
              {STATUS_CONFIG[status].label}
            </Button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Print button */}
        <Button variant="outline" size="sm" onClick={printDagplanning} className="h-9 hidden sm:flex">
          <Printer className="h-4 w-4 mr-1.5" />
          Print dagplanning
        </Button>
      </div>

      <Card className="rounded-xl border-black/[0.06]">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateWeek(-1)}
                title="Vorige week"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="text-center min-w-[140px] sm:min-w-[180px]">
                <CardTitle className="text-base sm:text-lg font-bold tracking-[-0.02em]">
                  Week <span className="font-mono">{weekNumber}</span>, {year}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDateDutch(weekDates[0])} -{" "}
                  {formatDateDutch(weekDates[6])}
                </p>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateWeek(1)}
                title="Volgende week"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={goToCurrentWeek}
                className="text-xs"
              >
                Vandaag
              </Button>
            </div>

            <div className="flex items-center gap-1 border rounded-xl p-1">
              <Button
                variant={viewMode === "week" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("week")}
                className="h-8"
              >
                <LayoutGrid className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Weekoverzicht</span>
                <span className="sm:hidden">Week</span>
              </Button>
              <Button
                variant={viewMode === "raster" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("raster")}
                className="h-8"
              >
                <Users className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Rasterweergave</span>
                <span className="sm:hidden">Raster</span>
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="h-8"
              >
                <List className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Lijstweergave</span>
                <span className="sm:hidden">Lijst</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          {viewMode === "week" ? renderWeekView() : viewMode === "raster" ? renderRasterView() : renderListView()}
        </CardContent>
      </Card>

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
