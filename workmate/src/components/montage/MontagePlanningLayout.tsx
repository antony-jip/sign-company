import { useState, useEffect, useMemo, useCallback } from "react";
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
} from "lucide-react";
import {
  getMontageAfspraken,
  createMontageAfspraak,
  updateMontageAfspraak,
  deleteMontageAfspraak,
  getProjecten,
  getMedewerkers,
} from "@/services/supabaseService";
import type { MontageAfspraak, Project, Medewerker } from "@/types";
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

function generateDemoData(monday: Date): {
  afspraken: MontageAfspraak[];
  medewerkers: Medewerker[];
  projecten: Project[];
} {
  const weekDates = getWeekDates(monday);

  const medewerkers: Medewerker[] = [
    {
      id: "m1",
      user_id: "u1",
      naam: "Jan van der Berg",
      email: "jan@signcompany.nl",
      telefoon: "06-12345678",
      functie: "Senior Monteur",
      afdeling: "Montage",
      avatar_url: "",
      uurtarief: 55,
      status: "actief",
      rol: "monteur",
      vaardigheden: ["Gevelreclame", "Lichtbakken", "Hoogwerker"],
      start_datum: "2020-03-15",
      notities: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "m2",
      user_id: "u1",
      naam: "Pieter de Vries",
      email: "pieter@signcompany.nl",
      telefoon: "06-23456789",
      functie: "Monteur",
      afdeling: "Montage",
      avatar_url: "",
      uurtarief: 45,
      status: "actief",
      rol: "monteur",
      vaardigheden: ["Raambelettering", "Gevelreclame"],
      start_datum: "2021-06-01",
      notities: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "m3",
      user_id: "u1",
      naam: "Klaas Bakker",
      email: "klaas@signcompany.nl",
      telefoon: "06-34567890",
      functie: "Monteur",
      afdeling: "Montage",
      avatar_url: "",
      uurtarief: 45,
      status: "actief",
      rol: "monteur",
      vaardigheden: ["Reclamezuilen", "Lichtbakken"],
      start_datum: "2022-01-10",
      notities: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "m4",
      user_id: "u1",
      naam: "Willem Jansen",
      email: "willem@signcompany.nl",
      telefoon: "06-45678901",
      functie: "Junior Monteur",
      afdeling: "Montage",
      avatar_url: "",
      uurtarief: 35,
      status: "actief",
      rol: "monteur",
      vaardigheden: ["Raambelettering", "Signing"],
      start_datum: "2023-09-01",
      notities: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const projecten: Project[] = [
    {
      id: "p1",
      naam: "Albert Heijn Gevel",
      klant_id: "k1",
      klant_naam: "Albert Heijn BV",
    } as Project,
    {
      id: "p2",
      naam: "Restaurant De Gouden Leeuw",
      klant_id: "k2",
      klant_naam: "De Gouden Leeuw",
    } as Project,
    {
      id: "p3",
      naam: "Apotheek Centrum Lichtbak",
      klant_id: "k3",
      klant_naam: "Apotheek Centrum",
    } as Project,
    {
      id: "p4",
      naam: "Autobedrijf Smit Signing",
      klant_id: "k4",
      klant_naam: "Autobedrijf Smit",
    } as Project,
    {
      id: "p5",
      naam: "Hotel Oranje Reclamezuil",
      klant_id: "k5",
      klant_naam: "Hotel Oranje",
    } as Project,
  ];

  const afspraken: MontageAfspraak[] = [
    {
      id: "a1",
      user_id: "u1",
      project_id: "p1",
      project_naam: "Albert Heijn Gevel",
      klant_id: "k1",
      klant_naam: "Albert Heijn BV",
      titel: "Gevelreclame montage",
      beschrijving:
        "Plaatsing van nieuwe gevelletters en verlichte reclamebak aan de voorgevel.",
      datum: formatDate(weekDates[0]),
      start_tijd: "08:00",
      eind_tijd: "12:00",
      locatie: "Hoofdstraat 45, Amsterdam",
      monteurs: ["m1", "m2"],
      status: "gepland",
      materialen: ["Gevelletters", "LED-verlichting", "Bevestigingsmateriaal"],
      notities: "Hoogwerker is gereserveerd. Parkeervergunning aangevraagd.",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "a2",
      user_id: "u1",
      project_id: "p2",
      project_naam: "Restaurant De Gouden Leeuw",
      klant_id: "k2",
      klant_naam: "De Gouden Leeuw",
      titel: "Uithangbord plaatsing",
      beschrijving:
        "Montage van dubbelzijdig verlicht uithangbord met gouden letters.",
      datum: formatDate(weekDates[1]),
      start_tijd: "09:00",
      eind_tijd: "13:00",
      locatie: "Kerkplein 12, Utrecht",
      monteurs: ["m1", "m3"],
      status: "gepland",
      materialen: ["Uithangbord", "Beugels", "Elektrische aansluiting"],
      notities: "Contact opnemen met eigenaar voor toegang tot het dak.",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "a3",
      user_id: "u1",
      project_id: "p3",
      project_naam: "Apotheek Centrum Lichtbak",
      klant_id: "k3",
      klant_naam: "Apotheek Centrum",
      titel: "Lichtbak installatie",
      beschrijving:
        "Vervanging oude lichtbak door nieuwe LED-lichtbak met apotheeklogo.",
      datum: formatDate(weekDates[2]),
      start_tijd: "10:00",
      eind_tijd: "14:00",
      locatie: "Marktstraat 8, Den Haag",
      monteurs: ["m2", "m4"],
      status: "gepland",
      materialen: ["LED-lichtbak", "Transformator", "Kabels", "RVS-beugels"],
      notities: "Oude lichtbak demonteren en meenemen voor recycling.",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "a4",
      user_id: "u1",
      project_id: "p4",
      project_naam: "Autobedrijf Smit Signing",
      klant_id: "k4",
      klant_naam: "Autobedrijf Smit",
      titel: "Showroom signing",
      beschrijving:
        "Complete signing pakket voor showroom: raambelettering, zuil en gevelletters.",
      datum: formatDate(weekDates[3]),
      start_tijd: "07:30",
      eind_tijd: "16:00",
      locatie: "Industrieweg 23, Rotterdam",
      monteurs: ["m1", "m2", "m3"],
      status: "gepland",
      materialen: [
        "Raamfolie",
        "Reclamezuil",
        "Gevelletters",
        "Montagelijm",
        "LED-modules",
      ],
      notities:
        "Groot project, hele dag nodig. Lunch wordt verzorgd door de klant.",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "a5",
      user_id: "u1",
      project_id: "p5",
      project_naam: "Hotel Oranje Reclamezuil",
      klant_id: "k5",
      klant_naam: "Hotel Oranje",
      titel: "Reclamezuil plaatsing",
      beschrijving:
        "Plaatsing van verlichte reclamezuil bij de ingang van het hotel.",
      datum: formatDate(weekDates[4]),
      start_tijd: "08:30",
      eind_tijd: "11:30",
      locatie: "Strandweg 1, Scheveningen",
      monteurs: ["m3", "m4"],
      status: "gepland",
      materialen: ["Reclamezuil", "Fundering", "Elektrische aansluiting"],
      notities: "Fundering moet eerst uitgeharden, eventueel tweede bezoek.",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "a6",
      user_id: "u1",
      project_id: "p1",
      project_naam: "Albert Heijn Gevel",
      klant_id: "k1",
      klant_naam: "Albert Heijn BV",
      titel: "Nacontrole gevelreclame",
      beschrijving:
        "Controle en afwerking van eerder geplaatste gevelletters. Eventuele aanpassingen uitvoeren.",
      datum: formatDate(weekDates[4]),
      start_tijd: "13:00",
      eind_tijd: "15:00",
      locatie: "Hoofdstraat 45, Amsterdam",
      monteurs: ["m1"],
      status: "gepland",
      materialen: ["Gereedschap", "Siliconenkit"],
      notities: "Korte klus, alleen Jan nodig voor de afwerking.",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  return { afspraken, medewerkers, projecten };
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
  const [viewMode, setViewMode] = useState<"week" | "list">("week");
  const [afspraken, setAfspraken] = useState<MontageAfspraak[]>([]);
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>([]);
  const [projecten, setProjecten] = useState<Project[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAfspraak, setEditingAfspraak] =
    useState<MontageAfspraak | null>(null);
  const [formData, setFormData] = useState<MontageFormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);

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
      const [afsprakenData, medewerkerData, projectData] = await Promise.all([
        getMontageAfspraken().catch(() => []),
        getMedewerkers().catch(() => []),
        getProjecten().catch(() => []),
      ]);

      if (afsprakenData && afsprakenData.length > 0) {
        setAfspraken(afsprakenData);
      } else {
        const demo = generateDemoData(currentMonday);
        setAfspraken(demo.afspraken);
      }

      if (medewerkerData && medewerkerData.length > 0) {
        setMedewerkers(medewerkerData);
      } else {
        const demo = generateDemoData(currentMonday);
        setMedewerkers(demo.medewerkers);
      }

      if (projectData && projectData.length > 0) {
        setProjecten(projectData);
      } else {
        const demo = generateDemoData(currentMonday);
        setProjecten(demo.projecten);
      }
    } catch {
      const demo = generateDemoData(currentMonday);
      setAfspraken(demo.afspraken);
      setMedewerkers(demo.medewerkers);
      setProjecten(demo.projecten);
    } finally {
      setLoading(false);
    }
  }, [currentMonday]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const weekAfspraken = useMemo(() => {
    const startStr = formatDate(weekDates[0]);
    const endStr = formatDate(weekDates[6]);
    return afspraken.filter((a) => a.datum >= startStr && a.datum <= endStr);
  }, [afspraken, weekDates]);

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

  const monteurs = useMemo(
    () => medewerkers.filter((m) => m.rol === "monteur" && m.status === "actief"),
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
      totaalWeek: weekAfspraken.length,
      geplandVandaag: vandaagAfspraken.length,
      monteursBeschikbaar: beschikbaar,
    };
  }, [weekAfspraken, afspraken, todayStr, monteurs]);

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
      klant_id: (project as any)?.klant_id || "",
      klant_naam: (project as any)?.klant_naam || "",
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
      toast.error("Selecteer minimaal een monteur");
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
    const sizeClasses = size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs";
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

    return (
      <div
        key={afspraak.id}
        className={cn(
          "rounded-lg border p-3 mb-2 cursor-pointer transition-shadow hover:shadow-md",
          config.bgColor,
          config.borderColor
        )}
        onClick={() => openEditDialog(afspraak)}
      >
        <div className="flex items-start justify-between gap-1 mb-1.5">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
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

        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{afspraak.locatie}</span>
        </div>

        <div className="flex items-center justify-between">
          {renderMonteurAvatars(afspraak.monteurs)}
          {nextActions.length > 0 && (
            <div className="flex gap-1">
              {nextActions.map((action) => (
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
          )}
        </div>
      </div>
    );
  }

  function renderWeekView() {
    return (
      <div className="grid grid-cols-7 gap-2">
        {weekDates.map((date, dayIndex) => {
          const dateStr = formatDate(date);
          const isToday = dateStr === todayStr;
          const dayAfspraken = afsprakenPerDag[dateStr] || [];

          return (
            <div key={dateStr} className="min-h-[200px]">
              <div
                className={cn(
                  "text-center py-2 rounded-t-lg mb-2 border-b-2",
                  isToday
                    ? "bg-blue-50 border-blue-500"
                    : "bg-gray-50 border-gray-200"
                )}
              >
                <div
                  className={cn(
                    "text-sm font-semibold",
                    isToday ? "text-blue-700" : "text-gray-700"
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
                  <div className="text-xs text-muted-foreground text-center py-4 italic">
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
            <tr className="border-b bg-gray-50">
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                Datum
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                Tijd
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                Project
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                Klant
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                Locatie
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                Monteurs
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                Status
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                Materialen
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                Acties
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedAfspraken.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="text-center py-8 text-muted-foreground"
                >
                  Geen montage afspraken deze week
                </td>
              </tr>
            ) : (
              sortedAfspraken.map((afspraak) => {
                const dateObj = new Date(afspraak.datum + "T00:00:00");
                const dayIdx =
                  (dateObj.getDay() + 6) % 7;
                const nextActions = getNextStatusActions(afspraak.status);

                return (
                  <tr
                    key={afspraak.id}
                    className="border-b hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium">
                        {DAG_NAMEN_LANG[dayIdx]}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateDutch(dateObj)}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
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
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[180px]">
                          {afspraak.locatie}
                        </span>
                      </div>
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
                  className="bg-gray-50"
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
              <Label>Monteurs</Label>
              <div className="grid grid-cols-2 gap-2">
                {monteurs.map((monteur, idx) => (
                  <label
                    key={monteur.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors",
                      formData.monteurs.includes(monteur.id)
                        ? "bg-blue-50 border-blue-300"
                        : "hover:bg-gray-50"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={formData.monteurs.includes(monteur.id)}
                      onChange={() => toggleMonteur(monteur.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Planning laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-display">
            Montage Planning
          </h1>
          <p className="text-muted-foreground mt-1">
            Plan en beheer montage afspraken voor installatieteams
          </p>
        </div>
        <Button onClick={openNewDialog} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Nieuwe montage
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-100">
                <ClipboardList className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Montages deze week
                </p>
                <p className="text-2xl font-bold">{stats.totaalWeek}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-100">
                <CalendarDays className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Gepland vandaag
                </p>
                <p className="text-2xl font-bold">{stats.geplandVandaag}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-100">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Monteurs beschikbaar
                </p>
                <p className="text-2xl font-bold">
                  {stats.monteursBeschikbaar}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateWeek(-1)}
                title="Vorige week"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="text-center min-w-[180px]">
                <CardTitle className="text-lg">
                  Week {weekNumber}, {year}
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

            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === "week" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("week")}
                className="h-8"
              >
                <LayoutGrid className="h-4 w-4 mr-1.5" />
                Weekoverzicht
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="h-8"
              >
                <List className="h-4 w-4 mr-1.5" />
                Lijstweergave
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {viewMode === "week" ? renderWeekView() : renderListView()}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5" />
            Monteurs overzicht
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {monteurs.map((monteur, idx) => {
              const monteurAfspraken = weekAfspraken.filter((a) =>
                a.monteurs.includes(monteur.id)
              );
              const vandaagBezet = afspraken
                .filter((a) => a.datum === todayStr)
                .some(
                  (a) =>
                    a.monteurs.includes(monteur.id) &&
                    a.status !== "afgerond" &&
                    a.status !== "uitgesteld"
                );

              return (
                <div
                  key={monteur.id}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                >
                  <div
                    className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0",
                      getAvatarColor(idx)
                    )}
                  >
                    {getInitials(monteur.naam)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {monteur.naam}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {monteur.functie}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          vandaagBezet
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700"
                        )}
                      >
                        {vandaagBezet ? "Bezet" : "Beschikbaar"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {monteurAfspraken.length} deze week
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {renderDialog()}
    </div>
  );
}
