import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/utils/logger";
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
  X,
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
import supabase from "@/services/supabaseClient";
import type { Notificatie } from "@/types";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 30_000; // Fallback polling elke 30s

const typeConfig: Record<
  Notificatie["type"],
  { icon: React.ElementType; colorClass: string; bgClass: string }
> = {
  offerte_bekeken: {
    icon: Eye,
    colorClass: "text-[#5A4A78]",
    bgClass: "bg-[#EEE8F5]",
  },
  offerte_verlopen: {
    icon: AlertTriangle,
    colorClass: "text-[#C03A18]",
    bgClass: "bg-[#FDE8E2]",
  },
  offerte_geaccepteerd: {
    icon: CheckCircle2,
    colorClass: "text-[#1A535C]",
    bgClass: "bg-[#E2F0F0]",
  },
  offerte_wijziging: {
    icon: AlertCircle,
    colorClass: "text-[#C03A18]",
    bgClass: "bg-[#FDE8E2]",
  },
  factuur_vervallen: {
    icon: AlertCircle,
    colorClass: "text-[#C03A18]",
    bgClass: "bg-[#FDE8E2]",
  },
  deadline_nadert: {
    icon: Clock,
    colorClass: "text-[#C03A18]",
    bgClass: "bg-[#FDE8E2]",
  },
  nieuwe_email: {
    icon: Mail,
    colorClass: "text-[#2A5580]",
    bgClass: "bg-[#E5ECF6]",
  },
  taak_voltooid: {
    icon: CheckCircle2,
    colorClass: "text-[#1A535C]",
    bgClass: "bg-[#E2F0F0]",
  },
  montage_gepland: {
    icon: Truck,
    colorClass: "text-[#2A5580]",
    bgClass: "bg-[#E5ECF6]",
  },
  betaling_ontvangen: {
    icon: Banknote,
    colorClass: "text-[#2D6B48]",
    bgClass: "bg-[#E4F0EA]",
  },
  budget_waarschuwing: {
    icon: Wallet,
    colorClass: "text-[#C03A18]",
    bgClass: "bg-[#FDE8E2]",
  },
  booking_nieuw: {
    icon: CalendarCheck,
    colorClass: "text-[#5A4A78]",
    bgClass: "bg-[#EEE8F5]",
  },
  algemeen: {
    icon: Bell,
    colorClass: "text-[#5A5A55]",
    bgClass: "bg-[#EEEEED]",
  },
  portaal_goedkeuring: {
    icon: CheckCircle2,
    colorClass: "text-[#1A535C]",
    bgClass: "bg-[#E2F0F0]",
  },
  portaal_revisie: {
    icon: RotateCcw,
    colorClass: "text-[#C03A18]",
    bgClass: "bg-[#FDE8E2]",
  },
  portaal_bericht: {
    icon: MessageSquare,
    colorClass: "text-[#2A5580]",
    bgClass: "bg-[#E5ECF6]",
  },
  portaal_bekeken: {
    icon: Eye,
    colorClass: "text-[#5A5A55]",
    bgClass: "bg-[#EEEEED]",
  },
  portaal_herinnering: {
    icon: BellRing,
    colorClass: "text-[#C03A18]",
    bgClass: "bg-[#FDE8E2]",
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

// Toast voor nieuwe notificatie
function NotificatieToast({
  notificatie,
  onClose,
  onClick,
}: {
  notificatie: Notificatie;
  onClose: () => void;
  onClick: () => void;
}) {
  const config = typeConfig[notificatie.type];
  const Icon = config.icon;

  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-top-2 fade-in duration-300">
      <button
        onClick={onClick}
        className="flex items-start gap-3 w-96 p-4 text-left transition-colors hover:bg-[#F4F2EE]"
        style={{
          background: '#FEFDFB',
          border: '0.5px solid #E6E4E0',
          borderRadius: '10px',
          boxShadow: '0 4px 16px rgba(120,90,50,0.10)',
        }}
      >
        <div
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            config.bgClass
          )}
        >
          <Icon className={cn("h-4 w-4", config.colorClass)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium truncate" style={{ color: '#191919' }}>
            {notificatie.titel}
          </p>
          <p className="text-[12px] line-clamp-2 mt-0.5" style={{ color: '#5A5A55' }}>
            {notificatie.bericht}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="shrink-0 hover:opacity-70"
          style={{ color: '#A0A098' }}
        >
          <X className="h-4 w-4" />
        </button>
      </button>
    </div>
  );
}

export function NotificatieCenter() {
  const { user } = useAuth();
  const [notificaties, setNotificaties] = useState<Notificatie[]>([]);
  const [open, setOpen] = useState(false);
  const [laden, setLaden] = useState(false);
  const [toast, setToast] = useState<Notificatie | null>(null);
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
    } catch (err) {
      logger.error('Load notificaties failed:', err);
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
      } catch (err) {
        logger.error('Load notificaties failed:', err);
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

  // Real-time Supabase subscription voor instant notificaties (gefilterd op user)
  useEffect(() => {
    if (!supabase || !user?.id) return;

    const userId = user.id;

    const setupChannel = async () => {
      const channel = supabase!
        .channel(`notificaties-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notificaties',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const nieuw = payload.new as Notificatie;
            setNotificaties((prev) => {
              if (prev.some((n) => n.id === nieuw.id)) return prev;
              return [nieuw, ...prev];
            });
            setToast(nieuw);
            try {
              const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU' +
                'oGAACBhYqFbF1fdH2LkZGMhHpxam51gIuUl5ORiH54cnBze4WOk5KPiIJ7dnR1eoKKkJCOioWAfHl4eXyDiY2NjImFgn98e3t9gIWJi4qIhoOBf39+f4KFiImIh4WDgYB/f3+BhIaHh4aFg4KBgH+AgYOFhoaGhYSDgoGAgIGChIWFhYWEg4KBgYCBgoOEhYWEhIOCgoGBgYGCg4SEhISEg4OCgoGBgYKDg4SEhIODgoKBgYGBgoODhISDg4OCgoKBgYGCgoODg4ODg4KCgoKBgYGCgoODg4ODgoKCgoKBgYGCgoODg4OCgoKCgoKBgQ==');
              audio.volume = 0.3;
              audio.play().catch(() => {});
            } catch (err) {
              // Negeer audio fouten
            }
          }
        )
        .subscribe();

      return channel;
    };

    let channelRef: ReturnType<typeof supabase.channel> | undefined;
    setupChannel().then((ch) => { channelRef = ch; });

    return () => {
      if (channelRef) supabase!.removeChannel(channelRef);
    };
  }, [user?.id]);

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

  function handleToastClick() {
    if (toast?.link) {
      navigate(toast.link);
    }
    setToast(null);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Toast melding bij nieuwe notificatie */}
      {toast && (
        <NotificatieToast
          notificatie={toast}
          onClose={() => setToast(null)}
          onClick={handleToastClick}
        />
      )}

      {aantalOngelezen > 0 ? (
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-label={`${aantalOngelezen} nieuwe notificatie${aantalOngelezen === 1 ? '' : 's'} openen`}
          className="relative inline-flex items-center gap-1.5 rounded-full pl-2 pr-3 py-1.5 transition-all hover:opacity-90"
          style={{ backgroundColor: '#F15025', color: '#fff' }}
        >
          <Bell className="h-[14px] w-[14px]" fill="#fff" />
          <span className="text-[11px] font-semibold leading-none whitespace-nowrap">
            {aantalOngelezen} nieuwe notificatie{aantalOngelezen === 1 ? '' : 's'}
          </span>
        </button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Notificaties openen"
        >
          <Bell className="h-[18px] w-[18px]" style={{ color: '#5A5A55' }} />
        </Button>
      )}

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-96 overflow-hidden"
          style={{
            background: '#FEFDFB',
            border: '0.5px solid #E6E4E0',
            borderRadius: '10px',
            boxShadow: '0 4px 16px rgba(120,90,50,0.10)',
          }}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <h3 className="font-semibold" style={{ fontSize: '13px', color: '#191919' }}>
              Notificaties
            </h3>
            {aantalOngelezen > 0 && (
              <button
                onClick={handleAllesGelezenMarkeren}
                className="transition-colors hover:opacity-70"
                style={{ fontSize: '11px', color: '#1A535C' }}
              >
                Alles gelezen
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
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#F4F2EE]"
                      style={{
                        backgroundColor: !notificatie.gelezen ? '#FAFAF8' : undefined,
                        borderBottom: '0.5px solid #E6E4E0',
                      }}
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
                          <span className="truncate font-medium" style={{ fontSize: '12px', color: '#191919' }}>
                            {notificatie.titel}
                          </span>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="font-mono whitespace-nowrap" style={{ fontSize: '10px', color: '#A0A098' }}>
                              {formatTijdGeleden(notificatie.created_at)}
                            </span>
                            {!notificatie.gelezen && (
                              <span
                                className="shrink-0 rounded-full"
                                style={{ width: '7px', height: '7px', backgroundColor: '#F15025' }}
                              />
                            )}
                          </div>
                        </div>
                        <p className="line-clamp-2" style={{ fontSize: '11px', color: '#5A5A55' }}>
                          {notificatie.bericht}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          <div style={{ borderTop: '0.5px solid #E6E4E0' }}>
            <button
              onClick={() => {
                setOpen(false);
                navigate("/meldingen");
              }}
              className="w-full px-4 py-2.5 text-center font-medium transition-colors hover:bg-[#F4F2EE]"
              style={{ fontSize: '11px', color: '#1A535C' }}
            >
              Alle meldingen bekijken
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
