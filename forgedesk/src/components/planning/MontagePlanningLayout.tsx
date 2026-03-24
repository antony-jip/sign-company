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
  updateProject,
} from "@/services/supabaseService";
import type { MontageAfspraak, MontageBijlage, Project, Medewerker, Klant, Offerte, Werkbon } from "@/types";
import { ClipboardCheck } from "lucide-react";
import { uploadMontageBijlage } from '@/services/storageService';
import { WerkbonVanProjectDialog } from "@/components/werkbonnen/WerkbonVanProjectDialog";
import { cn } from "@/lib/utils";
import { useNavigateWithTab } from "@/hooks/useNavigateWithTab";
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
  const { navigateWithTab } = useNavigateWithTab();
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

  // Projects with status "te-plannen" for the sidebar
  const tePlannenProjecten = useMemo(
    () => projecten.filter((p) => p.status === "te-plannen"),
    [projecten]
  );

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

  function openNewDialogFromProject(project: Project, datum?: string) {
    setEditingAfspraak(null);
    setFormData({
      ...EMPTY_FORM,
      project_id: project.id,
      klant_id: project.klant_id,
      klant_naam: project.klant_naam || "",
      titel: project.naam,
      datum: datum || todayStr,
    });
    if (project.id) {
      getWerkbonnenByProject(project.id).then(setProjectWerkbonnen).catch(() => setProjectWerkbonnen([]));
    }
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
        // Auto-update project from "te-plannen" to "gepland"
        if (formData.project_id) {
          const project = projecten.find((p) => p.id === formData.project_id);
          if (project && project.status === "te-plannen") {
            await updateProject(project.id, { status: "gepland" }).catch(() => null);
            setProjecten((prev) =>
              prev.map((p) => p.id === project.id ? { ...p, status: "gepland" as const } : p)
            );
          }
        }
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

  async function handleDragDrop(dragId: string, newDate: string) {
    // Handle dragging a "te plannen" project onto a day column
    if (dragId.startsWith("project:")) {
      const projectId = dragId.replace("project:", "");
      const project = projecten.find((p) => p.id === projectId);
      if (!project) return;
      openNewDialogFromProject(project, newDate);
      return;
    }

    const afspraak = afspraken.find((a) => a.id === dragId);
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

  // ── Card with colored left border (like screenshot) ──
  function renderMontageCard(afspraak: MontageAfspraak) {
    const hasConflict = conflictAfspraakIds.has(afspraak.id);
    const borderColor = {
      gepland: "border-l-blue-500",
      onderweg: "border-l-amber-500",
      bezig: "border-l-green-500",
      afgerond: "border-l-emerald-400",
      uitgesteld: "border-l-red-500",
    }[afspraak.status];

    // Count done items (placeholder: 0/0 like screenshot shows)
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
          "bg-white rounded-md border border-l-[3px] p-3 mb-2 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md",
          borderColor,
          hasConflict && "ring-1 ring-red-300",
          draggingAfspraakId === afspraak.id && "opacity-50 ring-2 ring-primary"
        )}
        onClick={() => openEditDialog(afspraak)}
      >
        <div className="flex items-start gap-2.5">
          {/* Left: status counts */}
          <div className="flex flex-col items-center text-[11px] text-muted-foreground pt-0.5 shrink-0 min-w-[16px]">
            <span>0</span>
            <span>0</span>
            {hasConflict && <AlertTriangle className="h-3 w-3 text-red-500 mt-1" />}
          </div>

          {/* Right: content */}
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm leading-tight truncate">{afspraak.titel}</div>
            {afspraak.klant_naam && (
              <div className="text-xs text-muted-foreground mt-0.5 truncate">{afspraak.klant_naam}</div>
            )}
            {afspraak.beschrijving && (
              <div className="text-xs text-muted-foreground mt-0.5 truncate">{afspraak.beschrijving}</div>
            )}
            {/* Time badge */}
            {afspraak.start_tijd && (
              <div className="mt-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] bg-amber-100 text-amber-800 rounded px-1.5 py-0.5 font-mono">
                  <Clock className="h-2.5 w-2.5" />
                  {afspraak.start_tijd} - {afspraak.eind_tijd}
                </span>
              </div>
            )}
            {/* Location */}
            {afspraak.locatie && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(afspraak.locatie)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-[11px] text-primary hover:underline mt-1 truncate"
              >
                <MapPin className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{afspraak.locatie}</span>
              </a>
            )}
            {/* Werkbon — klikbaar, opent in tab */}
            {afspraak.werkbon_nummer && afspraak.werkbon_id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateWithTab({
                    path: `/werkbonnen/${afspraak.werkbon_id}`,
                    label: afspraak.werkbon_nummer || "Werkbon",
                    id: `/werkbonnen/${afspraak.werkbon_id}`,
                  });
                }}
                className="inline-flex items-center gap-1.5 text-xs bg-[#FDF2F0] text-[#943520] hover:bg-[#FADED8] rounded px-2 py-1 mt-1.5 font-medium transition-colors"
              >
                <ClipboardCheck className="h-3 w-3 shrink-0" />
                <span className="font-mono">{afspraak.werkbon_nummer}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Weather cell for a day ──
  function renderWeatherCell(w: DayWeather | undefined) {
    if (!w) return null;
    return (
      <div className="flex flex-col items-center gap-0.5 py-3 px-2">
        <span className="text-2xl leading-none">{w.emoji}</span>
        <div className="text-[11px] text-muted-foreground space-y-0 text-center">
          <div>Min: {w.minTemp}°</div>
          <div>Max: {w.maxTemp}°</div>
          {w.precipitationProb > 0 && (
            <div className={cn(w.precipitationProb > 50 ? "text-blue-600 font-semibold" : "")}>
              Regen: {w.precipitationProb}%
            </div>
          )}
        </div>
      </div>
    );
  }

  // === MEMBER WEEK VIEW (5 day columns like screenshot) ===
  function renderMemberWeekView() {
    const werkdagen = weekDates.slice(0, 5); // Ma t/m Vr
    const selectedName = selectedMonteur === "alle"
      ? null
      : monteurMap[selectedMonteur]?.naam || "Onbekend";

    // Get afspraken for selected monteur (or all)
    const viewAfspraken = selectedMonteur === "alle"
      ? weekAfspraken
      : weekAfspraken.filter((a) => a.monteurs.includes(selectedMonteur));

    return (
      <div className="flex-1 min-w-0">
        {/* Header: member name + week nav */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <span className="text-base font-semibold">
              {selectedName || "Overzicht"}
            </span>
            <div className="flex items-center gap-1 ml-4">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateWeek(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <button
                onClick={goToCurrentWeek}
                className="text-sm font-semibold px-2 py-1 rounded hover:bg-muted transition-colors text-primary"
              >
                Week: {weekNumber}
              </button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateWeek(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={printDagplanning} className="h-8 text-xs hidden sm:flex">
              <Printer className="h-3.5 w-3.5 mr-1" />
              Print
            </Button>
            <Button onClick={openNewDialog} size="sm" className="h-8">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Nieuw
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={goToCurrentWeek}
              title="Vandaag"
            >
              <CalendarDays className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Weather strip */}
        <div className="grid grid-cols-5 border-b bg-gray-50/80">
          {werkdagen.map((date) => {
            const w = getWeatherForDate(weather, date);
            return (
              <div key={formatDate(date)} className="border-r last:border-r-0 border-border/40">
                {renderWeatherCell(w)}
              </div>
            );
          })}
        </div>

        {/* Day column headers */}
        <div className="grid grid-cols-5 border-b">
          {werkdagen.map((date) => {
            const dateStr = formatDate(date);
            const isToday = dateStr === todayStr;
            const dayIdx = (date.getDay() + 6) % 7;
            const dayAfspraken = viewAfspraken.filter((a) => a.datum === dateStr);
            const afgerond = dayAfspraken.filter((a) => a.status === "afgerond").length;

            return (
              <div
                key={dateStr}
                className={cn(
                  "text-center py-2 border-r last:border-r-0",
                  isToday ? "bg-primary/5" : "bg-white"
                )}
              >
                <div className={cn(
                  "text-sm font-bold",
                  isToday ? "text-primary" : "text-foreground"
                )}>
                  {DAG_NAMEN_LANG[dayIdx]}
                </div>
                <div className={cn(
                  "text-xs",
                  isToday ? "text-primary" : "text-muted-foreground"
                )}>
                  {date.toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {afgerond} / {dayAfspraken.length}
                </div>
              </div>
            );
          })}
        </div>

        {/* Day columns with cards */}
        <div className="grid grid-cols-5 flex-1">
          {werkdagen.map((date) => {
            const dateStr = formatDate(date);
            const isToday = dateStr === todayStr;
            const dayAfspraken = viewAfspraken
              .filter((a) => a.datum === dateStr)
              .sort((a, b) => a.start_tijd.localeCompare(b.start_tijd));

            return (
              <div
                key={dateStr}
                className={cn(
                  "border-r last:border-r-0 p-2 min-h-[400px]",
                  isToday ? "bg-primary/[0.02]" : "bg-gray-50/30",
                  dragOverDate === dateStr && "bg-primary/5 ring-2 ring-primary/30 ring-inset"
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
                {dayAfspraken.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground/30 text-xs">
                    Geen montages
                  </div>
                ) : (
                  dayAfspraken.map((a) => renderMontageCard(a))
                )}
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
                      title="Werkbon openen"
                      onClick={() => {
                        const wb = projectWerkbonnen.find((w) => w.id === formData.werkbon_id);
                        navigateWithTab({
                          path: `/werkbonnen/${formData.werkbon_id}`,
                          label: wb?.werkbon_nummer || "Werkbon",
                          id: `/werkbonnen/${formData.werkbon_id}`,
                        });
                        setDialogOpen(false);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                </div>
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
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-50">
      {/* ── Left sidebar: Team ── */}
      <div className="w-[180px] shrink-0 bg-white border-r flex flex-col">
        {/* Te plannen section */}
        {tePlannenProjecten.length > 0 && (
          <div className="border-b">
            <div className="px-3 py-2 flex items-center justify-between">
              <h2 className="text-[11px] font-bold text-[#F15025] uppercase tracking-wider">Te plannen</h2>
              <span className="text-[10px] bg-[#F15025]/10 text-[#F15025] font-bold rounded-full px-1.5 py-0.5">
                {tePlannenProjecten.length}
              </span>
            </div>
            <div className="max-h-[200px] overflow-y-auto">
              {tePlannenProjecten.map((project) => (
                <button
                  key={project.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "copy";
                    e.dataTransfer.setData("text/plain", `project:${project.id}`);
                  }}
                  onClick={() => openNewDialogFromProject(project)}
                  className="w-full text-left px-3 py-2 border-l-[3px] border-l-[#F15025] hover:bg-orange-50/60 transition-colors cursor-grab active:cursor-grabbing"
                >
                  <div className="text-[13px] font-semibold truncate leading-tight">{project.naam}</div>
                  {project.klant_naam && (
                    <div className="text-[11px] text-muted-foreground truncate">{project.klant_naam}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sidebar header */}
        <div className="px-3 py-2 border-b">
          <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Team</h2>
        </div>

        {/* Sidebar items (scrollable for 10+ members) */}
        <div className="flex-1 overflow-y-auto">
          {/* Overzicht option */}
          <button
            onClick={() => setSelectedMonteur("alle")}
            className={cn(
              "w-full text-left px-3 py-2.5 flex items-center gap-2 transition-colors border-l-2 text-sm",
              selectedMonteur === "alle"
                ? "bg-primary/5 border-l-primary text-primary font-semibold"
                : "border-l-transparent hover:bg-muted/50 text-muted-foreground"
            )}
          >
            <List className="h-4 w-4 shrink-0" />
            <span>Overzicht</span>
          </button>

          {/* Team members */}
          {monteurs.map((monteur, idx) => {
            const isSelected = selectedMonteur === monteur.id;
            const todayCount = weekAfspraken.filter(
              (a) => a.datum === todayStr && a.monteurs.includes(monteur.id) && a.status !== "afgerond"
            ).length;

            return (
              <button
                key={monteur.id}
                onClick={() => setSelectedMonteur(monteur.id)}
                className={cn(
                  "w-full text-left px-3 py-2.5 flex items-center gap-2 transition-colors border-l-2",
                  isSelected
                    ? "bg-primary/5 border-l-primary"
                    : "border-l-transparent hover:bg-muted/50"
                )}
              >
                <div
                  className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0",
                    getAvatarColor(idx)
                  )}
                >
                  {getInitials(monteur.naam)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={cn(
                    "text-[13px] truncate leading-tight",
                    isSelected ? "font-semibold text-foreground" : "text-foreground/80"
                  )}>
                    {monteur.naam}
                  </div>
                  {todayCount > 0 && (
                    <div className="text-[10px] text-muted-foreground">{todayCount} vandaag</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Sidebar footer: stats */}
        <div className="px-3 py-2.5 border-t bg-muted/20 text-[11px] text-muted-foreground space-y-0.5">
          <div>{stats.totaalWeek} montages deze week</div>
          <div>{stats.monteursBeschikbaar} beschikbaar vandaag</div>
        </div>
      </div>

      {/* ── Right content: member's week planning ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Conflict banner */}
        {conflicts.length > 0 && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
            <span className="text-xs text-red-700">
              <span className="font-semibold">{conflicts.length} overlap{conflicts.length !== 1 ? "s" : ""}</span>
              {conflicts.slice(0, 2).map((c, idx) => (
                <span key={idx} className="ml-2">{c.monteurNaam}: {c.afspraak1.titel} / {c.afspraak2.titel}</span>
              ))}
            </span>
          </div>
        )}

        {/* Main view */}
        <div className="flex-1 overflow-auto">
          {renderMemberWeekView()}
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
