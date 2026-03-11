import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Eye,
  AlertTriangle,
  AlertCircle,
  Clock,
  Mail,
  CheckCircle2,
  Truck,
  Banknote,
  Wallet,
  CalendarCheck,
  RotateCcw,
  MessageSquare,
  BellRing,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getNotificaties,
  markNotificatieGelezen,
  markAlleNotificatiesGelezen,
  createNotificatie,
} from "@/services/supabaseService";
import type { Notificatie } from "@/types";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 60_000;

const typeConfig: Record<
  Notificatie["type"],
  { icon: React.ElementType; colorClass: string; bgClass: string }
> = {
  offerte_bekeken: {
    icon: Eye,
    colorClass: "text-blue-600",
    bgClass: "bg-blue-100",
  },
  offerte_verlopen: {
    icon: AlertTriangle,
    colorClass: "text-amber-600",
    bgClass: "bg-amber-100",
  },
  offerte_geaccepteerd: {
    icon: CheckCircle2,
    colorClass: "text-green-600",
    bgClass: "bg-green-100",
  },
  offerte_wijziging: {
    icon: AlertCircle,
    colorClass: "text-blue-600",
    bgClass: "bg-blue-100",
  },
  factuur_vervallen: {
    icon: AlertCircle,
    colorClass: "text-red-600",
    bgClass: "bg-red-100",
  },
  deadline_nadert: {
    icon: Clock,
    colorClass: "text-orange-600",
    bgClass: "bg-orange-100",
  },
  nieuwe_email: {
    icon: Mail,
    colorClass: "text-blue-600",
    bgClass: "bg-blue-100",
  },
  taak_voltooid: {
    icon: CheckCircle2,
    colorClass: "text-green-600",
    bgClass: "bg-green-100",
  },
  montage_gepland: {
    icon: Truck,
    colorClass: "text-accent",
    bgClass: "bg-wm-pale/30",
  },
  betaling_ontvangen: {
    icon: Banknote,
    colorClass: "text-emerald-600",
    bgClass: "bg-emerald-100",
  },
  budget_waarschuwing: {
    icon: Wallet,
    colorClass: "text-orange-600",
    bgClass: "bg-orange-100",
  },
  booking_nieuw: {
    icon: CalendarCheck,
    colorClass: "text-purple-600",
    bgClass: "bg-purple-100",
  },
  algemeen: {
    icon: Bell,
    colorClass: "text-muted-foreground",
    bgClass: "bg-muted",
  },
  portaal_goedkeuring: {
    icon: CheckCircle2,
    colorClass: "text-green-600",
    bgClass: "bg-green-100",
  },
  portaal_revisie: {
    icon: RotateCcw,
    colorClass: "text-amber-600",
    bgClass: "bg-amber-100",
  },
  portaal_bericht: {
    icon: MessageSquare,
    colorClass: "text-blue-600",
    bgClass: "bg-blue-100",
  },
  portaal_bekeken: {
    icon: Eye,
    colorClass: "text-gray-600",
    bgClass: "bg-gray-100",
  },
  portaal_herinnering: {
    icon: BellRing,
    colorClass: "text-orange-600",
    bgClass: "bg-orange-100",
  },
};

function formatTijdGeleden(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "Zojuist";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} min geleden`;
  }
  if (diffHours < 24) {
    return `${diffHours} uur geleden`;
  }
  if (diffDays === 1) {
    return "Gisteren";
  }
  return `${diffDays} dagen geleden`;
}

function minsAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

const demoNotificaties: Omit<Notificatie, "id" | "created_at">[] = [
  {
    user_id: "",
    type: "offerte_bekeken",
    titel: "Offerte bekeken",
    bericht:
      "Klant Van der Berg B.V. heeft offerte OFF-2024-0892 voor gevelreclame bekeken.",
    link: "/offertes/OFF-2024-0892",
    gelezen: false,
  },
  {
    user_id: "",
    type: "betaling_ontvangen",
    titel: "Betaling ontvangen",
    bericht:
      "Betaling van \u20AC 4.250,00 ontvangen van Bakkerij Jansen voor factuur FAC-2024-0341.",
    link: "/facturen/FAC-2024-0341",
    gelezen: false,
  },
  {
    user_id: "",
    type: "deadline_nadert",
    titel: "Deadline nadert",
    bericht:
      "Project lichtreclame voor Restaurant De Gouden Leeuw moet over 2 dagen worden opgeleverd.",
    link: "/projecten/PRJ-2024-0156",
    gelezen: false,
  },
  {
    user_id: "",
    type: "factuur_vervallen",
    titel: "Factuur vervallen",
    bericht:
      "Factuur FAC-2024-0298 van \u20AC 1.875,00 voor Sportcentrum Oost is 14 dagen over de betaaltermijn.",
    link: "/facturen/FAC-2024-0298",
    gelezen: false,
  },
  {
    user_id: "",
    type: "montage_gepland",
    titel: "Montage ingepland",
    bericht:
      "Montage van reclamebord bij Autobedrijf Kuipers is ingepland op donderdag 20 februari om 09:00.",
    link: "/planning/MON-2024-0067",
    gelezen: false,
  },
  {
    user_id: "",
    type: "nieuwe_email",
    titel: "Nieuw e-mailbericht",
    bericht:
      "Nieuw bericht van info@vandelft-architecten.nl over offerte-aanvraag bewegwijzering kantoorpand.",
    link: "/berichten/MSG-2024-1102",
    gelezen: true,
  },
  {
    user_id: "",
    type: "taak_voltooid",
    titel: "Taak voltooid",
    bericht:
      "Ontwerp voor freesletters Kapsalon Stijlvol is goedgekeurd door de klant.",
    link: "/taken/TAAK-2024-0445",
    gelezen: true,
  },
  {
    user_id: "",
    type: "offerte_verlopen",
    titel: "Offerte verlopen",
    bericht:
      "Offerte OFF-2024-0845 voor raambelettering Bloemenwinkel Flora is verlopen na 30 dagen.",
    link: "/offertes/OFF-2024-0845",
    gelezen: true,
  },
  {
    user_id: "",
    type: "algemeen",
    titel: "Systeemmelding",
    bericht:
      "Het maandelijkse rapport voor januari 2026 is beschikbaar in het dashboard.",
    link: "/rapporten/januari-2026",
    gelezen: true,
  },
];

export function NotificatieCenter() {
  const [notificaties, setNotificaties] = useState<Notificatie[]>([]);
  const [open, setOpen] = useState(false);
  const [laden, setLaden] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const aantalOngelezen = notificaties.filter((n) => !n.gelezen).length;

  const laadNotificaties = useCallback(async () => {
    try {
      const data = await getNotificaties();
      if (data && data.length > 0) {
        setNotificaties(data);
      } else {
        setLaden(true);
        const aangemaakteNotificaties: Notificatie[] = [];
        for (const demo of demoNotificaties) {
          const nieuw = await createNotificatie(demo);
          if (nieuw) {
            aangemaakteNotificaties.push(nieuw);
          }
        }
        if (aangemaakteNotificaties.length > 0) {
          setNotificaties(aangemaakteNotificaties);
        }
        setLaden(false);
      }
    } catch {
      setLaden(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await getNotificaties();
        if (cancelled) return;
        if (data && data.length > 0) {
          setNotificaties(data);
        } else {
          setLaden(true);
          const aangemaakteNotificaties: Notificatie[] = [];
          for (const demo of demoNotificaties) {
            const nieuw = await createNotificatie(demo);
            if (cancelled) return;
            if (nieuw) aangemaakteNotificaties.push(nieuw);
          }
          if (!cancelled && aangemaakteNotificaties.length > 0) {
            setNotificaties(aangemaakteNotificaties);
          }
          if (!cancelled) setLaden(false);
        }
      } catch {
        if (!cancelled) setLaden(false);
      }
    };

    load();

    const interval = setInterval(() => {
      if (!cancelled) laadNotificaties();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [laadNotificaties]);

  useEffect(() => {
    function handleBuitenKlik(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleBuitenKlik);
    return () => document.removeEventListener("mousedown", handleBuitenKlik);
  }, []);

  async function handleNotificatieKlik(notificatie: Notificatie) {
    if (!notificatie.gelezen) {
      await markNotificatieGelezen(notificatie.id);
      setNotificaties((prev) =>
        prev.map((n) =>
          n.id === notificatie.id ? { ...n, gelezen: true } : n
        )
      );
    }

    if (notificatie.link) {
      setOpen(false);
      navigate(notificatie.link);
    }
  }

  async function handleAllesGelezenMarkeren() {
    await markAlleNotificatiesGelezen();
    setNotificaties((prev) => prev.map((n) => ({ ...n, gelezen: true })));
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notificaties openen"
      >
        <Bell className="h-5 w-5" />
        {aantalOngelezen > 0 && (
          <Badge
            variant="destructive"
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold"
          >
            {aantalOngelezen > 99 ? "99+" : aantalOngelezen}
          </Badge>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-96 rounded-lg border border-border bg-popover shadow-lg">
          <div className="flex items-center justify-between px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">
              Notificaties
            </h3>
            {aantalOngelezen > 0 && (
              <button
                onClick={handleAllesGelezenMarkeren}
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Alles als gelezen markeren
              </button>
            )}
          </div>

          <Separator />

          {laden ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">Laden...</p>
            </div>
          ) : notificaties.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12">
              <Bell className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Geen nieuwe notificaties
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="flex flex-col">
                {notificaties.map((notificatie) => {
                  const config = typeConfig[notificatie.type];
                  const Icon = config.icon;

                  return (
                    <button
                      key={notificatie.id}
                      onClick={() => handleNotificatieKlik(notificatie)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent",
                        !notificatie.gelezen && "bg-accent/50"
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                          config.bgClass
                        )}
                      >
                        <Icon className={cn("h-4 w-4", config.colorClass)} />
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-foreground">
                            {notificatie.titel}
                          </span>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatTijdGeleden(notificatie.created_at)}
                            </span>
                            {!notificatie.gelezen && (
                              <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                            )}
                          </div>
                        </div>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {notificatie.bericht}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          <Separator />
          <button
            onClick={() => {
              setOpen(false);
              navigate("/portalen");
            }}
            className="w-full px-4 py-2.5 text-xs font-medium text-center text-primary hover:bg-accent transition-colors"
          >
            Alle meldingen bekijken →
          </button>
        </div>
      )}
    </div>
  );
}
