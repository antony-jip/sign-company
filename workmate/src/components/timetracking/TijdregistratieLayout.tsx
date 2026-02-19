import { useState, useEffect, useRef, useCallback } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  Play,
  Pause,
  Square,
  Plus,
  Pencil,
  Trash2,
  Download,
  FileSpreadsheet,
  Timer,
  CalendarDays,
  Euro,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import {
  getTijdregistraties,
  createTijdregistratie,
  updateTijdregistratie,
  deleteTijdregistratie,
  getProjecten,
} from "@/services/supabaseService";
import type { Tijdregistratie, Project } from "@/types";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { exportCSV, exportExcel } from "@/lib/export";

type FilterType = "alle" | "deze_week" | "deze_maand" | "facturabel" | "niet_facturabel";

type TimerStatus = "stopped" | "running" | "paused";

interface TimerState {
  status: TimerStatus;
  projectId: string;
  projectNaam: string;
  omschrijving: string;
  startTijd: string;
  elapsedSeconds: number;
}

interface FormData {
  project_id: string;
  taak_id: string;
  omschrijving: string;
  datum: string;
  start_tijd: string;
  eind_tijd: string;
  uurtarief: number;
  facturabel: boolean;
}

const DEMO_DATA: Tijdregistratie[] = [
  {
    id: "demo-1",
    user_id: "user-1",
    project_id: "proj-1",
    project_naam: "Gevelreclame Bakkerij Jansen",
    medewerker_naam: "Jan de Vries",
    omschrijving: "Ontwerp lichtreclame gevel - eerste concept uitwerking",
    datum: getMondayOfCurrentWeek(0),
    start_tijd: "08:00",
    eind_tijd: "11:30",
    duur_minuten: 210,
    uurtarief: 75,
    facturabel: true,
    gefactureerd: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-2",
    user_id: "user-1",
    project_id: "proj-2",
    project_naam: "Wayfinding Ziekenhuis Oost",
    medewerker_naam: "Jan de Vries",
    omschrijving: "Productie bewegwijzeringsborden - freeswerk en lamineren",
    datum: getMondayOfCurrentWeek(0),
    start_tijd: "12:30",
    eind_tijd: "17:00",
    duur_minuten: 270,
    uurtarief: 65,
    facturabel: true,
    gefactureerd: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-3",
    user_id: "user-1",
    project_id: "proj-3",
    project_naam: "Autobelettering Loodgieter Pietersen",
    medewerker_naam: "Jan de Vries",
    omschrijving: "Montage autobelettering - bestickering bestelbus",
    datum: getMondayOfCurrentWeek(1),
    start_tijd: "08:00",
    eind_tijd: "12:00",
    duur_minuten: 240,
    uurtarief: 70,
    facturabel: true,
    gefactureerd: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-4",
    user_id: "user-1",
    project_id: "proj-1",
    project_naam: "Gevelreclame Bakkerij Jansen",
    medewerker_naam: "Jan de Vries",
    omschrijving: "Productie freesletters - CNC frezen en aflakken",
    datum: getMondayOfCurrentWeek(1),
    start_tijd: "13:00",
    eind_tijd: "16:30",
    duur_minuten: 210,
    uurtarief: 65,
    facturabel: true,
    gefactureerd: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-5",
    user_id: "user-1",
    project_id: "proj-4",
    project_naam: "Interieur Signing Restaurant De Smulhoek",
    medewerker_naam: "Jan de Vries",
    omschrijving: "Ontwerp menukaarthouders en wanddecoratie",
    datum: getMondayOfCurrentWeek(2),
    start_tijd: "09:00",
    eind_tijd: "12:30",
    duur_minuten: 210,
    uurtarief: 75,
    facturabel: true,
    gefactureerd: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-6",
    user_id: "user-1",
    project_id: "proj-5",
    project_naam: "Intern - Werkplaats onderhoud",
    medewerker_naam: "Jan de Vries",
    omschrijving: "Onderhoud snijplotter en printer - reinigen en kalibreren",
    datum: getMondayOfCurrentWeek(2),
    start_tijd: "13:30",
    eind_tijd: "15:00",
    duur_minuten: 90,
    uurtarief: 0,
    facturabel: false,
    gefactureerd: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-7",
    user_id: "user-1",
    project_id: "proj-2",
    project_naam: "Wayfinding Ziekenhuis Oost",
    medewerker_naam: "Jan de Vries",
    omschrijving: "Montage bewegwijzering - plaatsing vloer- en wandborden",
    datum: getMondayOfCurrentWeek(3),
    start_tijd: "07:30",
    eind_tijd: "16:00",
    duur_minuten: 480,
    uurtarief: 70,
    facturabel: true,
    gefactureerd: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-8",
    user_id: "user-1",
    project_id: "proj-6",
    project_naam: "Lichtreclame Sportschool FitFlex",
    medewerker_naam: "Jan de Vries",
    omschrijving: "LED-module assemblage en elektronische aansluiting",
    datum: getMondayOfCurrentWeek(3),
    start_tijd: "08:00",
    eind_tijd: "10:30",
    duur_minuten: 150,
    uurtarief: 70,
    facturabel: true,
    gefactureerd: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-9",
    user_id: "user-1",
    project_id: "proj-5",
    project_naam: "Intern - Werkplaats onderhoud",
    medewerker_naam: "Jan de Vries",
    omschrijving: "Teamoverleg en weekplanning bespreken",
    datum: getMondayOfCurrentWeek(4),
    start_tijd: "08:30",
    eind_tijd: "09:30",
    duur_minuten: 60,
    uurtarief: 0,
    facturabel: false,
    gefactureerd: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-10",
    user_id: "user-1",
    project_id: "proj-4",
    project_naam: "Interieur Signing Restaurant De Smulhoek",
    medewerker_naam: "Jan de Vries",
    omschrijving: "Productie en montage interieur signing elementen",
    datum: getMondayOfCurrentWeek(4),
    start_tijd: "10:00",
    eind_tijd: "15:30",
    duur_minuten: 300,
    uurtarief: 70,
    facturabel: true,
    gefactureerd: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const DEMO_PROJECTEN: Project[] = [
  { id: "proj-1", naam: "Gevelreclame Bakkerij Jansen" } as Project,
  { id: "proj-2", naam: "Wayfinding Ziekenhuis Oost" } as Project,
  { id: "proj-3", naam: "Autobelettering Loodgieter Pietersen" } as Project,
  { id: "proj-4", naam: "Interieur Signing Restaurant De Smulhoek" } as Project,
  { id: "proj-5", naam: "Intern - Werkplaats onderhoud" } as Project,
  { id: "proj-6", naam: "Lichtreclame Sportschool FitFlex" } as Project,
];

function getMondayOfCurrentWeek(dayOffset: number): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset + dayOffset);
  return monday.toISOString().split("T")[0];
}

function getWeekDates(weekOffset: number): Date[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset + weekOffset * 7);
  const dates: Date[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function formatDuur(minuten: number): string {
  const uren = Math.floor(minuten / 60);
  const min = minuten % 60;
  return `${uren}:${min.toString().padStart(2, "0")}`;
}

function formatElapsedTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function berekenDuurMinuten(start: string, eind: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = eind.split(":").map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

function formatDatumKort(datum: string): string {
  const d = new Date(datum + "T00:00:00");
  return d.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
}

function formatDatumLang(datum: string): string {
  const d = new Date(datum + "T00:00:00");
  return d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function isCurrentWeek(datum: string): boolean {
  const weekDates = getWeekDates(0);
  const d = datum;
  return weekDates.some((wd) => wd.toISOString().split("T")[0] === d);
}

function isCurrentMonth(datum: string): boolean {
  const now = new Date();
  const d = new Date(datum + "T00:00:00");
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

const DAG_NAMEN = ["Ma", "Di", "Wo", "Do", "Vr"];

const EMPTY_FORM: FormData = {
  project_id: "",
  taak_id: "",
  omschrijving: "",
  datum: new Date().toISOString().split("T")[0],
  start_tijd: "08:00",
  eind_tijd: "17:00",
  uurtarief: 65,
  facturabel: true,
};

export function TijdregistratieLayout() {
  const [registraties, setRegistraties] = useState<Tijdregistratie[]>([]);
  const [projecten, setProjecten] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>("deze_week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [timer, setTimer] = useState<TimerState>({
    status: "stopped",
    projectId: "",
    projectNaam: "",
    omschrijving: "",
    startTijd: "",
    elapsedSeconds: 0,
  });

  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerStartRef = useRef<number>(0);
  const timerPausedElapsedRef = useRef<number>(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [regData, projData] = await Promise.all([
        getTijdregistraties(),
        getProjecten(),
      ]);

      if (regData && regData.length > 0) {
        setRegistraties(regData);
      } else {
        setRegistraties(DEMO_DATA);
      }

      if (projData && projData.length > 0) {
        setProjecten(projData);
      } else {
        setProjecten(DEMO_PROJECTEN);
      }
    } catch {
      setRegistraties(DEMO_DATA);
      setProjecten(DEMO_PROJECTEN);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const startTimer = useCallback(() => {
    if (!timer.projectId) {
      toast.error("Selecteer eerst een project om de timer te starten");
      return;
    }

    timerStartRef.current = Date.now();
    timerPausedElapsedRef.current = 0;

    setTimer((prev) => ({
      ...prev,
      status: "running",
      startTijd: new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }),
      elapsedSeconds: 0,
    }));

    timerIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - timerStartRef.current) / 1000) + timerPausedElapsedRef.current;
      setTimer((prev) => ({ ...prev, elapsedSeconds: elapsed }));
    }, 1000);

    toast.success("Timer gestart");
  }, [timer.projectId]);

  const pauseTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    timerPausedElapsedRef.current = timer.elapsedSeconds;

    setTimer((prev) => ({ ...prev, status: "paused" }));
    toast.info("Timer gepauzeerd");
  }, [timer.elapsedSeconds]);

  const resumeTimer = useCallback(() => {
    timerStartRef.current = Date.now();

    timerIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - timerStartRef.current) / 1000) + timerPausedElapsedRef.current;
      setTimer((prev) => ({ ...prev, elapsedSeconds: elapsed }));
    }, 1000);

    setTimer((prev) => ({ ...prev, status: "running" }));
    toast.success("Timer hervat");
  }, []);

  const stopTimer = useCallback(async () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    const duurMinuten = Math.round(timer.elapsedSeconds / 60);
    const now = new Date();
    const eindTijd = now.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });

    const nieuweRegistratie: Partial<Tijdregistratie> = {
      project_id: timer.projectId,
      project_naam: timer.projectNaam,
      omschrijving: timer.omschrijving || "Timer registratie",
      datum: now.toISOString().split("T")[0],
      start_tijd: timer.startTijd,
      eind_tijd: eindTijd,
      duur_minuten: duurMinuten,
      uurtarief: 65,
      facturabel: true,
      gefactureerd: false,
    };

    try {
      await createTijdregistratie(nieuweRegistratie as Tijdregistratie);
      toast.success(`Tijdregistratie opgeslagen: ${formatDuur(duurMinuten)}`);
      loadData();
    } catch {
      const fallbackEntry: Tijdregistratie = {
        id: `timer-${Date.now()}`,
        user_id: "user-1",
        project_id: timer.projectId,
        project_naam: timer.projectNaam,
        omschrijving: timer.omschrijving || "Timer registratie",
        datum: now.toISOString().split("T")[0],
        start_tijd: timer.startTijd,
        eind_tijd: eindTijd,
        duur_minuten: duurMinuten,
        uurtarief: 65,
        facturabel: true,
        gefactureerd: false,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      setRegistraties((prev) => [fallbackEntry, ...prev]);
      toast.success(`Tijdregistratie lokaal opgeslagen: ${formatDuur(duurMinuten)}`);
    }

    setTimer({
      status: "stopped",
      projectId: "",
      projectNaam: "",
      omschrijving: "",
      startTijd: "",
      elapsedSeconds: 0,
    });
    timerPausedElapsedRef.current = 0;
  }, [timer, loadData]);

  const filteredRegistraties = registraties.filter((r) => {
    switch (activeFilter) {
      case "deze_week":
        return isCurrentWeek(r.datum);
      case "deze_maand":
        return isCurrentMonth(r.datum);
      case "facturabel":
        return r.facturabel;
      case "niet_facturabel":
        return !r.facturabel;
      case "alle":
      default:
        return true;
    }
  });

  const sortedRegistraties = [...filteredRegistraties].sort((a, b) => {
    const datumCompare = b.datum.localeCompare(a.datum);
    if (datumCompare !== 0) return datumCompare;
    return b.start_tijd.localeCompare(a.start_tijd);
  });

  const weekDates = getWeekDates(weekOffset);
  const weekNumber = getWeekNumber(weekDates[0]);

  const weekHoursPerDay = weekDates.map((date) => {
    const dateStr = date.toISOString().split("T")[0];
    const dayEntries = registraties.filter((r) => r.datum === dateStr);
    const totalMinutes = dayEntries.reduce((sum, r) => sum + r.duur_minuten, 0);
    return totalMinutes / 60;
  });

  const weekTotal = weekHoursPerDay.reduce((sum, h) => sum + h, 0);
  const maxDayHours = Math.max(...weekHoursPerDay, 8);

  const urenDezeWeek = registraties
    .filter((r) => isCurrentWeek(r.datum))
    .reduce((sum, r) => sum + r.duur_minuten, 0) / 60;

  const urenDezeMaand = registraties
    .filter((r) => isCurrentMonth(r.datum))
    .reduce((sum, r) => sum + r.duur_minuten, 0) / 60;

  const factuabelBedrag = registraties
    .filter((r) => isCurrentMonth(r.datum) && r.facturabel)
    .reduce((sum, r) => sum + (r.duur_minuten / 60) * r.uurtarief, 0);

  const nietFactuabelUren = registraties
    .filter((r) => isCurrentMonth(r.datum) && !r.facturabel)
    .reduce((sum, r) => sum + r.duur_minuten, 0) / 60;

  function openNewDialog() {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEditDialog(reg: Tijdregistratie) {
    setEditingId(reg.id);
    setFormData({
      project_id: reg.project_id,
      taak_id: reg.taak_id || "",
      omschrijving: reg.omschrijving,
      datum: reg.datum,
      start_tijd: reg.start_tijd,
      eind_tijd: reg.eind_tijd,
      uurtarief: reg.uurtarief,
      facturabel: reg.facturabel,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formData.project_id) {
      toast.error("Selecteer een project");
      return;
    }
    if (!formData.omschrijving.trim()) {
      toast.error("Voer een omschrijving in");
      return;
    }
    if (!formData.start_tijd || !formData.eind_tijd) {
      toast.error("Vul start- en eindtijd in");
      return;
    }

    const duurMin = berekenDuurMinuten(formData.start_tijd, formData.eind_tijd);
    if (duurMin <= 0) {
      toast.error("Eindtijd moet na starttijd liggen");
      return;
    }

    const selectedProject = projecten.find((p) => p.id === formData.project_id);

    const entry: Partial<Tijdregistratie> = {
      project_id: formData.project_id,
      project_naam: selectedProject?.naam || "",
      taak_id: formData.taak_id || undefined,
      omschrijving: formData.omschrijving,
      datum: formData.datum,
      start_tijd: formData.start_tijd,
      eind_tijd: formData.eind_tijd,
      duur_minuten: duurMin,
      uurtarief: formData.uurtarief,
      facturabel: formData.facturabel,
      gefactureerd: false,
    };

    try {
      if (editingId) {
        await updateTijdregistratie(editingId, entry as Tijdregistratie);
        toast.success("Tijdregistratie bijgewerkt");
      } else {
        await createTijdregistratie(entry as Tijdregistratie);
        toast.success("Tijdregistratie aangemaakt");
      }
      loadData();
    } catch {
      if (editingId) {
        setRegistraties((prev) =>
          prev.map((r) =>
            r.id === editingId
              ? {
                  ...r,
                  ...entry,
                  updated_at: new Date().toISOString(),
                }
              : r
          )
        );
        toast.success("Tijdregistratie lokaal bijgewerkt");
      } else {
        const newEntry: Tijdregistratie = {
          id: `local-${Date.now()}`,
          user_id: "user-1",
          ...entry,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Tijdregistratie;
        setRegistraties((prev) => [newEntry, ...prev]);
        toast.success("Tijdregistratie lokaal aangemaakt");
      }
    }

    setDialogOpen(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
  }

  async function handleDelete(id: string) {
    try {
      await deleteTijdregistratie(id);
      toast.success("Tijdregistratie verwijderd");
      loadData();
    } catch {
      setRegistraties((prev) => prev.filter((r) => r.id !== id));
      toast.success("Tijdregistratie lokaal verwijderd");
    }
    setDeleteConfirmId(null);
  }

  function handleExportCSV() {
    const headers = ["Datum", "Project", "Omschrijving", "Start", "Eind", "Duur (uur)", "Uurtarief", "Totaal", "Facturabel"];
    const exportData = sortedRegistraties.map((r) => ({
      Datum: r.datum,
      Project: r.project_naam || "",
      Omschrijving: r.omschrijving,
      Start: r.start_tijd,
      Eind: r.eind_tijd,
      "Duur (uur)": (r.duur_minuten / 60).toFixed(2),
      Uurtarief: r.uurtarief.toFixed(2),
      Totaal: ((r.duur_minuten / 60) * r.uurtarief).toFixed(2),
      Facturabel: r.facturabel ? "Ja" : "Nee",
    }));
    exportCSV("tijdregistratie", headers, exportData);
    toast.success("CSV gedownload");
  }

  function handleExportExcel() {
    const headers = ["Datum", "Project", "Omschrijving", "Start", "Eind", "Duur (uur)", "Uurtarief", "Totaal", "Facturabel"];
    const exportData = sortedRegistraties.map((r) => ({
      Datum: r.datum,
      Project: r.project_naam || "",
      Omschrijving: r.omschrijving,
      Start: r.start_tijd,
      Eind: r.eind_tijd,
      "Duur (uur)": (r.duur_minuten / 60).toFixed(2),
      Uurtarief: r.uurtarief.toFixed(2),
      Totaal: ((r.duur_minuten / 60) * r.uurtarief).toFixed(2),
      Facturabel: r.facturabel ? "Ja" : "Nee",
    }));
    exportExcel("tijdregistratie", headers, exportData);
    toast.success("Excel gedownload");
  }

  const berekendeFormDuur = formData.start_tijd && formData.eind_tijd
    ? berekenDuurMinuten(formData.start_tijd, formData.eind_tijd)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Tijdregistraties laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-display">Tijdregistratie</h1>
          <p className="text-muted-foreground">
            Registreer en beheer uw gewerkte uren per project
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button onClick={openNewDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nieuwe registratie
          </Button>
        </div>
      </div>

      {/* Active Timer */}
      <Card
        className={cn(
          "border-2 transition-colors",
          timer.status === "running" && "border-green-500 bg-green-50 dark:bg-green-950/20",
          timer.status === "paused" && "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20",
          timer.status === "stopped" && "border-dashed"
        )}
      >
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full",
                  timer.status === "running" && "bg-green-100 dark:bg-green-900",
                  timer.status === "paused" && "bg-yellow-100 dark:bg-yellow-900",
                  timer.status === "stopped" && "bg-muted"
                )}
              >
                <Timer
                  className={cn(
                    "h-6 w-6",
                    timer.status === "running" && "text-green-600 animate-pulse",
                    timer.status === "paused" && "text-yellow-600",
                    timer.status === "stopped" && "text-muted-foreground"
                  )}
                />
              </div>
              <div>
                <div className="text-3xl font-mono font-bold tabular-nums">
                  {formatElapsedTime(timer.elapsedSeconds)}
                </div>
                {timer.status !== "stopped" && (
                  <div className="text-sm text-muted-foreground">
                    {timer.projectNaam} - Gestart om {timer.startTijd}
                  </div>
                )}
                {timer.status === "stopped" && (
                  <div className="text-sm text-muted-foreground">
                    Selecteer een project en start de timer
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              {timer.status === "stopped" && (
                <>
                  <div className="w-full sm:w-56">
                    <Label className="text-xs text-muted-foreground mb-1 block">Project</Label>
                    <Select
                      value={timer.projectId}
                      onValueChange={(value) => {
                        const proj = projecten.find((p) => p.id === value);
                        setTimer((prev) => ({
                          ...prev,
                          projectId: value,
                          projectNaam: proj?.naam || "",
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Kies project..." />
                      </SelectTrigger>
                      <SelectContent>
                        {projecten.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.naam}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full sm:w-48">
                    <Label className="text-xs text-muted-foreground mb-1 block">Omschrijving</Label>
                    <Input
                      placeholder="Waar werk je aan?"
                      value={timer.omschrijving}
                      onChange={(e) =>
                        setTimer((prev) => ({ ...prev, omschrijving: e.target.value }))
                      }
                    />
                  </div>
                </>
              )}

              <div className="flex items-center gap-2">
                {timer.status === "stopped" && (
                  <Button
                    onClick={startTimer}
                    className="bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Start
                  </Button>
                )}
                {timer.status === "running" && (
                  <>
                    <Button
                      onClick={pauseTimer}
                      variant="outline"
                      size="lg"
                      className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                    >
                      <Pause className="mr-2 h-4 w-4" />
                      Pauzeer
                    </Button>
                    <Button
                      onClick={stopTimer}
                      variant="destructive"
                      size="lg"
                    >
                      <Square className="mr-2 h-4 w-4" />
                      Stop
                    </Button>
                  </>
                )}
                {timer.status === "paused" && (
                  <>
                    <Button
                      onClick={resumeTimer}
                      className="bg-green-600 hover:bg-green-700"
                      size="lg"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Hervat
                    </Button>
                    <Button
                      onClick={stopTimer}
                      variant="destructive"
                      size="lg"
                    >
                      <Square className="mr-2 h-4 w-4" />
                      Stop
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uren deze week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{urenDezeWeek.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              van 40 uur ({((urenDezeWeek / 40) * 100).toFixed(0)}%)
            </p>
            <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${Math.min((urenDezeWeek / 40) * 100, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uren deze maand</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{urenDezeMaand.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              van 160 uur ({((urenDezeMaand / 160) * 100).toFixed(0)}%)
            </p>
            <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min((urenDezeMaand / 160) * 100, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturabel bedrag</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(factuabelBedrag)}</div>
            <p className="text-xs text-muted-foreground">
              deze maand factureerbaar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Niet-facturabel uren</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nietFactuabelUren.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              interne uren deze maand
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Week Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Weekoverzicht - Week {weekNumber}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setWeekOffset((prev) => prev - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeekOffset(0)}
                className={cn(weekOffset === 0 && "bg-primary text-primary-foreground")}
              >
                Vandaag
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setWeekOffset((prev) => prev + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 h-40">
            {weekDates.map((date, index) => {
              const hours = weekHoursPerDay[index];
              const barHeight = maxDayHours > 0 ? (hours / maxDayHours) * 100 : 0;
              const dateStr = date.toISOString().split("T")[0];
              const isToday = dateStr === new Date().toISOString().split("T")[0];

              return (
                <div key={dateStr} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {hours > 0 ? `${hours.toFixed(1)}u` : "-"}
                  </span>
                  <div className="w-full h-24 flex items-end justify-center">
                    <div
                      className={cn(
                        "w-full max-w-[48px] rounded-t-md transition-all",
                        isToday ? "bg-blue-500" : "bg-blue-300 dark:bg-blue-700",
                        hours === 0 && "bg-muted min-h-[4px]"
                      )}
                      style={{ height: `${Math.max(barHeight, 3)}%` }}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      isToday ? "text-blue-600 font-bold" : "text-muted-foreground"
                    )}
                  >
                    {DAG_NAMEN[index]}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {date.getDate()}/{date.getMonth() + 1}
                  </span>
                </div>
              );
            })}
            <Separator orientation="vertical" className="h-24 mx-2" />
            <div className="flex flex-col items-center gap-1 min-w-[60px]">
              <span className="text-xs font-medium text-muted-foreground">Totaal</span>
              <div className="flex items-center justify-center h-24">
                <span className="text-2xl font-bold">{weekTotal.toFixed(1)}</span>
              </div>
              <span className="text-xs font-medium text-muted-foreground">uur</span>
              <span className="text-[10px] text-muted-foreground">&nbsp;</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {(
          [
            { key: "alle", label: "Alle" },
            { key: "deze_week", label: "Deze week" },
            { key: "deze_maand", label: "Deze maand" },
            { key: "facturabel", label: "Facturabel" },
            { key: "niet_facturabel", label: "Niet-facturabel" },
          ] as { key: FilterType; label: string }[]
        ).map((filter) => (
          <Button
            key={filter.key}
            variant={activeFilter === filter.key ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={() => setActiveFilter(filter.key)}
          >
            {filter.label}
            {filter.key !== "alle" && (
              <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px]">
                {filter.key === "deze_week"
                  ? registraties.filter((r) => isCurrentWeek(r.datum)).length
                  : filter.key === "deze_maand"
                    ? registraties.filter((r) => isCurrentMonth(r.datum)).length
                    : filter.key === "facturabel"
                      ? registraties.filter((r) => r.facturabel).length
                      : registraties.filter((r) => !r.facturabel).length}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Timesheet Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Tijdregistraties ({sortedRegistraties.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">Datum</th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">Project</th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground hidden lg:table-cell">
                    Omschrijving
                  </th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">Start</th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">Eind</th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">Duur</th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground hidden md:table-cell">
                    Tarief
                  </th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground hidden md:table-cell">
                    Totaal
                  </th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">
                    Facturabel
                  </th>
                  <th className="pb-3 font-medium text-muted-foreground text-right">Acties</th>
                </tr>
              </thead>
              <tbody>
                {sortedRegistraties.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-muted-foreground">
                      Geen tijdregistraties gevonden voor het geselecteerde filter.
                    </td>
                  </tr>
                ) : (
                  sortedRegistraties.map((reg) => {
                    const totaal = (reg.duur_minuten / 60) * reg.uurtarief;
                    return (
                      <tr
                        key={reg.id}
                        className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 pr-4">
                          <div className="font-medium">{formatDatumKort(reg.datum)}</div>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="font-medium max-w-[200px] truncate">
                            {reg.project_naam}
                          </div>
                          <div className="text-xs text-muted-foreground lg:hidden max-w-[200px] truncate">
                            {reg.omschrijving}
                          </div>
                        </td>
                        <td className="py-3 pr-4 hidden lg:table-cell">
                          <div className="max-w-[280px] truncate text-muted-foreground">
                            {reg.omschrijving}
                          </div>
                        </td>
                        <td className="py-3 pr-4 font-mono text-xs">{reg.start_tijd}</td>
                        <td className="py-3 pr-4 font-mono text-xs">{reg.eind_tijd}</td>
                        <td className="py-3 pr-4">
                          <Badge variant="secondary" className="font-mono">
                            {formatDuur(reg.duur_minuten)}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 hidden md:table-cell">
                          {reg.uurtarief > 0 ? formatCurrency(reg.uurtarief) : "-"}
                        </td>
                        <td className="py-3 pr-4 hidden md:table-cell font-medium">
                          {totaal > 0 ? formatCurrency(totaal) : "-"}
                        </td>
                        <td className="py-3 pr-4 text-center">
                          {reg.facturabel ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="h-5 w-5 text-muted-foreground mx-auto" />
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(reg)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirmId(reg.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {sortedRegistraties.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 font-medium">
                    <td className="pt-3 pr-4" colSpan={5}>
                      Totaal ({sortedRegistraties.length} registraties)
                    </td>
                    <td className="pt-3 pr-4">
                      <Badge className="font-mono">
                        {formatDuur(
                          sortedRegistraties.reduce((sum, r) => sum + r.duur_minuten, 0)
                        )}
                      </Badge>
                    </td>
                    <td className="pt-3 pr-4 hidden md:table-cell" />
                    <td className="pt-3 pr-4 hidden md:table-cell font-bold">
                      {formatCurrency(
                        sortedRegistraties.reduce(
                          (sum, r) => sum + (r.duur_minuten / 60) * r.uurtarief,
                          0
                        )
                      )}
                    </td>
                    <td className="pt-3 pr-4 text-center text-xs text-muted-foreground">
                      {sortedRegistraties.filter((r) => r.facturabel).length}/
                      {sortedRegistraties.length}
                    </td>
                    <td className="pt-3" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Tijdregistratie bewerken" : "Nieuwe tijdregistratie"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="form-project">Project</Label>
              <Select
                value={formData.project_id}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, project_id: value }))
                }
              >
                <SelectTrigger id="form-project">
                  <SelectValue placeholder="Selecteer een project..." />
                </SelectTrigger>
                <SelectContent>
                  {projecten.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.naam}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="form-taak">Taak (optioneel)</Label>
              <Input
                id="form-taak"
                placeholder="Bijv. ontwerp, productie, montage..."
                value={formData.taak_id}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, taak_id: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="form-omschrijving">Omschrijving</Label>
              <Input
                id="form-omschrijving"
                placeholder="Wat heb je gedaan?"
                value={formData.omschrijving}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, omschrijving: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="form-datum">Datum</Label>
              <Input
                id="form-datum"
                type="date"
                value={formData.datum}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, datum: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="form-start">Starttijd</Label>
                <Input
                  id="form-start"
                  type="time"
                  value={formData.start_tijd}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, start_tijd: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="form-eind">Eindtijd</Label>
                <Input
                  id="form-eind"
                  type="time"
                  value={formData.eind_tijd}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, eind_tijd: e.target.value }))
                  }
                />
              </div>
            </div>

            {berekendeFormDuur > 0 && (
              <div className="text-sm text-muted-foreground bg-muted rounded-md px-3 py-2">
                Berekende duur: <strong>{formatDuur(berekendeFormDuur)}</strong> (
                {(berekendeFormDuur / 60).toFixed(2)} uur)
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="form-tarief">Uurtarief</Label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="form-tarief"
                  type="number"
                  min={0}
                  step={5}
                  className="pl-9"
                  value={formData.uurtarief}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      uurtarief: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>

            {berekendeFormDuur > 0 && formData.uurtarief > 0 && (
              <div className="text-sm text-muted-foreground bg-muted rounded-md px-3 py-2">
                Geschat totaal:{" "}
                <strong>
                  {formatCurrency((berekendeFormDuur / 60) * formData.uurtarief)}
                </strong>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="form-facturabel" className="text-sm font-medium">
                  Facturabel
                </Label>
                <div className="text-xs text-muted-foreground">
                  Uren die aan de klant gefactureerd worden
                </div>
              </div>
              <Switch
                id="form-facturabel"
                checked={formData.facturabel}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, facturabel: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleSave}>
              {editingId ? "Bijwerken" : "Opslaan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Tijdregistratie verwijderen</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Weet u zeker dat u deze tijdregistratie wilt verwijderen? Deze actie kan niet
            ongedaan worden gemaakt.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Annuleren
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
