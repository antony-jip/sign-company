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
import { toast } from "sonner";
import { confirm } from '@/components/shared/ConfirmDialog';
import { useAuth } from "@/contexts/AuthContext";

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

const DOEN_AVATAR_PALETTE = [
  { bg: '#E8F2EC', text: '#3A7D52' },
  { bg: '#E8EEF9', text: '#3A5A9A' },
  { bg: '#F5F2E8', text: '#8A7A4A' },
  { bg: '#F0EFEC', text: '#6B6B66' },
  { bg: '#EDE8F4', text: '#6A5A8A' },
];

function getAvatarStyle(index: number): { backgroundColor: string; color: string } {
  const p = DOEN_AVATAR_PALETTE[index % DOEN_AVATAR_PALETTE.length];
  return { backgroundColor: p.bg, color: p.text };
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
  const [draggingProjectId, setDraggingProjectId] = useState<string | null>(null);
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
      status: "gepland" as const,
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
        setAfspraken((prev) => [...prev, created]);
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
      await updateMontageAfspraak(afspraak.id, { datum: newDate });
      setAfspraken((prev) =>
        prev.map((a) =>
          a.id === afspraak.id
            ? { ...a, datum: newDate, updated_at: new Date().toISOString() }
            : a
        )
      );
      const dateObj = new Date(newDate + "T00:00:00");
      toast.success(`Verplaatst naar ${formatDateDutch(dateObj)}`);
    } catch (err) {
      console.error("Fout bij verplaatsen:", err);
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
    const sizeClasses = size === "sm" ? "h-6 w-6 text-[10px]" : "h-7 w-7 text-[11px]";
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

  // ── Card with colored left border — DOEN style ──
  function renderMontageCard(afspraak: MontageAfspraak) {
    const hasConflict = conflictAfspraakIds.has(afspraak.id);
    const cfg = STATUS_CONFIG[afspraak.status];

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
          "bg-white rounded-xl border border-[#F0EFEC] border-l-[3px] p-3 mb-2 cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] group/card",
          hasConflict && "ring-1 ring-[#F0C8BC]",
          draggingAfspraakId === afspraak.id && "opacity-30 scale-[0.97] ring-2 ring-[#1A535C]/30"
        )}
        style={{ borderLeftColor: cfg.dot }}
        onClick={() => openEditDialog(afspraak)}
      >
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-1">
            <div className="text-[13px] font-semibold text-[#1A1A1A] leading-tight truncate">{afspraak.titel}</div>
            {hasConflict && <AlertTriangle className="h-3 w-3 text-[#C03A18] shrink-0 mt-0.5" />}
          </div>
          {afspraak.klant_naam && (
            <div className="text-[12px] text-[#9B9B95] mt-0.5 truncate">{afspraak.klant_naam}</div>
          )}
          {afspraak.beschrijving && (
            <div className="text-[12px] text-[#B0ADA8] mt-0.5 truncate">{afspraak.beschrijving}</div>
          )}
          {/* Time badge */}
          {afspraak.start_tijd && (
            <div className="mt-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] rounded-md px-1.5 py-0.5 font-mono tabular-nums" style={{ backgroundColor: cfg.bg, color: cfg.text }}>
                <Clock className="h-2.5 w-2.5" />
                {afspraak.start_tijd} – {afspraak.eind_tijd}
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
              className="flex items-center gap-1 text-[11px] text-[#1A535C] hover:underline mt-1 truncate"
            >
              <MapPin className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{afspraak.locatie}</span>
            </a>
          )}
          {/* Monteur avatars */}
          {afspraak.monteurs.length > 0 && (
            <div className="mt-1.5">
              {renderMonteurAvatars(afspraak.monteurs)}
            </div>
          )}
          {/* Werkbon */}
          {afspraak.werkbon_id && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(`/werkbonnen/${afspraak.werkbon_id}`, "_blank");
              }}
              className="flex items-center gap-1.5 w-full text-[11px] rounded-lg px-2 py-1.5 mt-1.5 font-medium transition-colors"
              style={{ backgroundColor: '#FDE8E2', color: '#C03A18' }}
            >
              <ClipboardCheck className="h-3.5 w-3.5 shrink-0" />
              <span className="font-mono">{afspraak.werkbon_nummer || "Werkbon"}</span>
              <Eye className="h-3 w-3 shrink-0 ml-auto opacity-50" />
            </button>
          )}
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
        <div className="text-[11px] text-[#9B9B95] space-y-0 text-center">
          <div>Min: {w.minTemp}°</div>
          <div>Max: {w.maxTemp}°</div>
          {w.precipitationProb > 0 && (
            <div className={cn(w.precipitationProb > 50 ? "text-[#3A5A9A] font-semibold" : "")}>
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
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#F0EFEC] bg-white">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-[#9B9B95]" />
            <span className="text-[15px] font-semibold text-[#1A1A1A]">
              {selectedName || "Overzicht"}
            </span>
            <div className="flex items-center gap-1 ml-4">
              <button className="p-1.5 rounded-lg hover:bg-[#F0EFEC] transition-all" onClick={() => navigateWeek(-1)}>
                <ChevronLeft className="h-4 w-4 text-[#6B6B66]" />
              </button>
              <button
                onClick={goToCurrentWeek}
                className="text-[13px] font-bold px-3 py-1 rounded-lg hover:bg-[#1A535C]/[0.07] transition-all text-[#1A535C] font-mono tabular-nums"
              >
                Week {weekNumber}
              </button>
              <button className="p-1.5 rounded-lg hover:bg-[#F0EFEC] transition-all" onClick={() => navigateWeek(1)}>
                <ChevronRight className="h-4 w-4 text-[#6B6B66]" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={printDagplanning} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-[#6B6B66] hover:bg-[#F0EFEC] transition-all">
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
            <button
              onClick={openNewDialog}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-white bg-[#F15025] shadow-[0_2px_8px_rgba(241,80,37,0.25)] hover:shadow-[0_4px_16px_rgba(241,80,37,0.35)] hover:-translate-y-[1px] active:translate-y-0 active:shadow-[0_1px_4px_rgba(241,80,37,0.2)] transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Nieuw
            </button>
            <button
              className="p-1.5 rounded-lg hover:bg-[#F0EFEC] transition-all"
              onClick={goToCurrentWeek}
              title="Vandaag"
            >
              <CalendarDays className="h-4 w-4 text-[#6B6B66]" />
            </button>
          </div>
        </div>

        {/* Weather strip */}
        <div className="grid grid-cols-5 border-b border-[#F0EFEC] bg-[#F8F7F5]">
          {werkdagen.map((date) => {
            const w = getWeatherForDate(weather, date);
            return (
              <div key={formatDate(date)} className="border-r last:border-r-0 border-[#F0EFEC]">
                {renderWeatherCell(w)}
              </div>
            );
          })}
        </div>

        {/* Day column headers */}
        <div className="grid grid-cols-5 border-b border-[#F0EFEC]">
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
                  "text-center py-2.5 border-r last:border-r-0 border-[#F0EFEC]",
                  isToday ? "bg-[#1A535C]/[0.04]" : "bg-white"
                )}
              >
                <div className={cn(
                  "text-[13px] font-bold",
                  isToday ? "text-[#1A535C]" : "text-[#1A1A1A]"
                )}>
                  {DAG_NAMEN_LANG[dayIdx]}
                </div>
                <div className={cn(
                  "text-[12px] font-mono tabular-nums",
                  isToday ? "text-[#1A535C]" : "text-[#B0ADA8]"
                )}>
                  {date.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                </div>
                <div className="text-[11px] text-[#B0ADA8] font-mono tabular-nums mt-0.5">
                  {afgerond}/{dayAfspraken.length}
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
                  "border-r last:border-r-0 border-[#F0EFEC] p-2 min-h-[400px] transition-all duration-200",
                  isToday ? "bg-[#1A535C]/[0.02]" : "bg-[#F8F7F5]/50",
                  dragOverDate === dateStr && "bg-[#1A535C]/[0.08] ring-2 ring-[#1A535C]/25 ring-inset scale-[1.01]"
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = draggingProjectId ? "copy" : "move";
                  if (dragOverDate !== dateStr) setDragOverDate(dateStr);
                }}
                onDragLeave={(e) => {
                  // Only reset if leaving the column itself, not entering a child
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverDate(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverDate(null);
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) handleDragDrop(id, dateStr);
                }}
              >
                {dayAfspraken.length === 0 ? (
                  <div className={cn(
                    "flex items-center justify-center h-32 text-xs transition-all duration-200",
                    dragOverDate === dateStr
                      ? "text-[#1A535C] font-medium border-2 border-dashed border-[#1A535C]/30 rounded-xl bg-[#1A535C]/[0.04]"
                      : "text-[#B0ADA8]/50"
                  )}>
                    {(draggingAfspraakId || draggingProjectId) ? "Hier neerzetten" : "Geen montages"}
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
                            user_id: user?.id || "",
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
                      title="Werkbon openen in nieuw tabblad"
                      onClick={() => window.open(`/werkbonnen/${formData.werkbon_id}`, "_blank")}
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
                        ? "text-white ring-2 ring-primary/30"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                    style={formData.monteurs.includes(monteur.id) ? getAvatarStyle(idx) : undefined}
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
          <div className="animate-spin h-8 w-8 border-4 border-[#1A535C] border-t-transparent rounded-full mx-auto" />
          <p className="text-[#9B9B95]">Planning laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] overflow-hidden bg-[#F8F7F5]">
      {/* ── Left sidebar: Team ── */}
      <div className="w-[200px] shrink-0 bg-white border-r border-[#F0EFEC] flex flex-col rounded-tr-2xl">
        {/* Te plannen section */}
        {tePlannenProjecten.length > 0 && (
          <div className="border-b border-[#F0EFEC]">
            <div className="px-3 py-2.5 flex items-center justify-between">
              <h2 className="text-[11px] font-bold text-[#F15025] uppercase tracking-wider">Te plannen</h2>
              <span className="text-[10px] font-bold rounded-md px-1.5 py-0.5" style={{ backgroundColor: '#FDE8E2', color: '#F15025' }}>
                {tePlannenProjecten.length}
              </span>
            </div>
            <div className="max-h-[200px] overflow-y-auto">
              {tePlannenProjecten.map((project) => (
                <div
                  key={project.id}
                  draggable
                  onDragStart={(e) => {
                    setDraggingProjectId(project.id);
                    e.dataTransfer.effectAllowed = "copyMove";
                    e.dataTransfer.setData("text/plain", `project:${project.id}`);
                    // Custom drag image
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
                    "w-full text-left px-3 py-2 border-l-[3px] border-l-[#F15025] hover:bg-[#FDE8E2]/40 transition-all duration-200 cursor-grab active:cursor-grabbing select-none",
                    draggingProjectId === project.id && "opacity-40 scale-95"
                  )}
                >
                  <div className="text-[13px] font-semibold truncate leading-tight text-[#1A1A1A]">{project.naam}</div>
                  {project.klant_naam && (
                    <div className="text-[11px] text-[#9B9B95] truncate">{project.klant_naam}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sidebar header */}
        <div className="px-3 py-2.5 border-b border-[#F0EFEC]">
          <h2 className="text-[11px] font-semibold text-[#9B9B95] uppercase tracking-widest">Team</h2>
        </div>

        {/* Sidebar items */}
        <div className="flex-1 overflow-y-auto">
          {/* Overzicht option */}
          <button
            onClick={() => setSelectedMonteur("alle")}
            className={cn(
              "w-full text-left px-3 py-2.5 flex items-center gap-2 transition-all border-l-2 text-sm",
              selectedMonteur === "alle"
                ? "bg-[#1A535C]/[0.05] border-l-[#1A535C] text-[#1A535C] font-semibold"
                : "border-l-transparent hover:bg-[#F8F7F4] text-[#6B6B66]"
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
                  "w-full text-left px-3 py-2.5 flex items-center gap-2 transition-all border-l-2",
                  isSelected
                    ? "bg-[#1A535C]/[0.05] border-l-[#1A535C]"
                    : "border-l-transparent hover:bg-[#F8F7F4]"
                )}
              >
                <div
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={getAvatarStyle(idx)}
                >
                  {getInitials(monteur.naam)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={cn(
                    "text-[13px] truncate leading-tight",
                    isSelected ? "font-semibold text-[#1A1A1A]" : "text-[#4A4A46]"
                  )}>
                    {monteur.naam}
                  </div>
                  {todayCount > 0 && (
                    <div className="text-[10px] text-[#9B9B95]">{todayCount} vandaag</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Sidebar footer: stats */}
        <div className="px-3 py-2.5 border-t border-[#F0EFEC] bg-[#F8F7F5] text-[11px] text-[#9B9B95] space-y-0.5">
          <div>{stats.totaalWeek} montages deze week</div>
          <div>{stats.monteursBeschikbaar} beschikbaar vandaag</div>
        </div>
      </div>

      {/* ── Right content: member's week planning ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Conflict banner */}
        {conflicts.length > 0 && (
          <div className="bg-[#FDE8E2] border-b border-[#F0C8BC] px-4 py-2 flex items-center gap-2">
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
