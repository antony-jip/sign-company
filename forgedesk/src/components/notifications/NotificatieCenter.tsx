import { useState, useEffect, useRef, useCallback, useId } from "react";
import { createPortal } from "react-dom";
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
  ChevronRight,
  Loader2,
  Settings,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getNotificaties,
  markNotificatieGelezen,
  markAlleNotificatiesGelezen,
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
    bgClass: "bg-[hsl(var(--status-violet-bg))]",
  },
  offerte_check_gevraagd: {
    icon: UserCheck,
    colorClass: "text-[#8A6A2A]",
    bgClass: "bg-[hsl(var(--status-amber-bg))]",
  },
  offerte_check_afgehandeld: {
    icon: UserCheck,
    colorClass: "text-petrol",
    bgClass: "bg-[hsl(var(--status-green-bg))]",
  },
  offerte_check_wijzigingen: {
    icon: UserCheck,
    colorClass: "text-[#8A6A2A]",
    bgClass: "bg-[hsl(var(--status-amber-bg))]",
  },
  website_chat: {
    icon: MessageSquare,
    colorClass: "text-petrol",
    bgClass: "bg-[hsl(var(--status-green-bg))]",
  },
  website_aanvraag: {
    icon: MessageSquare,
    colorClass: "text-[#C03A18]",
    bgClass: "bg-[hsl(var(--status-flame-bg))]",
  },
  offerte_verlopen: {
    icon: AlertTriangle,
    colorClass: "text-[#C03A18]",
    bgClass: "bg-[hsl(var(--status-flame-bg))]",
  },
  offerte_geaccepteerd: {
    icon: CheckCircle2,
    colorClass: "text-petrol",
    bgClass: "bg-[hsl(var(--status-green-bg))]",
  },
  offerte_wijziging: {
    icon: AlertCircle,
    colorClass: "text-[#C03A18]",
    bgClass: "bg-[hsl(var(--status-flame-bg))]",
  },
  factuur_vervallen: {
    icon: AlertCircle,
    colorClass: "text-[#C03A18]",
    bgClass: "bg-[hsl(var(--status-flame-bg))]",
  },
  deadline_nadert: {
    icon: Clock,
    colorClass: "text-[#C03A18]",
    bgClass: "bg-[hsl(var(--status-flame-bg))]",
  },
  nieuwe_email: {
    icon: Mail,
    colorClass: "text-[#2A5580]",
    bgClass: "bg-[hsl(var(--status-blue-bg))]",
  },
  taak_voltooid: {
    icon: CheckCircle2,
    colorClass: "text-petrol",
    bgClass: "bg-[hsl(var(--status-green-bg))]",
  },
  taak_toegewezen: {
    icon: CheckCircle2,
    colorClass: "text-petrol",
    bgClass: "bg-[hsl(var(--status-green-bg))]",
  },
  montage_gepland: {
    icon: Truck,
    colorClass: "text-[#2A5580]",
    bgClass: "bg-[hsl(var(--status-blue-bg))]",
  },
  betaling_ontvangen: {
    icon: Banknote,
    colorClass: "text-[#2D6B48]",
    bgClass: "bg-[hsl(var(--status-green-bg))]",
  },
  budget_waarschuwing: {
    icon: Wallet,
    colorClass: "text-[#C03A18]",
    bgClass: "bg-[hsl(var(--status-flame-bg))]",
  },
  booking_nieuw: {
    icon: CalendarCheck,
    colorClass: "text-[#5A4A78]",
    bgClass: "bg-[hsl(var(--status-violet-bg))]",
  },
  algemeen: {
    icon: Bell,
    colorClass: "text-foreground/70",
    bgClass: "bg-muted",
  },
  goedkeuring: {
    icon: CheckCircle2,
    colorClass: "text-petrol",
    bgClass: "bg-[hsl(var(--status-green-bg))]",
  },
  herinnering: {
    icon: BellRing,
    colorClass: "text-[#C03A18]",
    bgClass: "bg-[hsl(var(--status-flame-bg))]",
  },
  portaal_goedkeuring: {
    icon: CheckCircle2,
    colorClass: "text-petrol",
    bgClass: "bg-[hsl(var(--status-green-bg))]",
  },
  portaal_revisie: {
    icon: RotateCcw,
    colorClass: "text-[#C03A18]",
    bgClass: "bg-[hsl(var(--status-flame-bg))]",
  },
  portaal_bericht: {
    icon: MessageSquare,
    colorClass: "text-[#2A5580]",
    bgClass: "bg-[hsl(var(--status-blue-bg))]",
  },
  portaal_bekeken: {
    icon: Eye,
    colorClass: "text-foreground/70",
    bgClass: "bg-muted",
  },
  portaal_herinnering: {
    icon: BellRing,
    colorClass: "text-[#C03A18]",
    bgClass: "bg-[hsl(var(--status-flame-bg))]",
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
    return "net";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }
  if (diffHours < 24) {
    return `${diffHours}u`;
  }
  if (diffDays === 1) {
    return "1d";
  }
  if (diffDays < 7) {
    return `${diffDays}d`;
  }
  return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}

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
  const config = typeConfig[notificatie.type] || typeConfig.algemeen;
  const Icon = config.icon;

  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  // In een portal, want de toast hangt in de header en die staat in een eigen
  // stapelcontext (relative z-10). Alles op de pagina met een hogere z-index
  // schoof er anders overheen.
  return createPortal(
    <div className="fixed top-4 right-4 z-[9600] animate-in slide-in-from-top-2 fade-in duration-300">
      <div
        className="flex w-96 max-w-[calc(100vw-32px)] items-start gap-3 rounded-xl bg-card p-4 shadow-[0_12px_32px_rgba(120,90,50,0.12),0_2px_6px_rgba(0,0,0,0.04)]"
        style={{ border: '0.5px solid hsl(var(--border))' }}
      >
        <button
          onClick={onClick}
          className="flex flex-1 min-w-0 items-start gap-3 text-left"
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
            <p className="text-[13px] font-semibold leading-snug text-foreground">
              {notificatie.titel}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
              {notificatie.bericht}
            </p>
          </div>
        </button>
        <button
          onClick={onClose}
          aria-label="Melding sluiten"
          className="shrink-0 rounded-md p-0.5 text-muted-foreground/70 transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>,
    document.body
  );
}

interface NotificatieCenterProps {
  variant?: 'bell' | 'avatar'
  userInitial?: string
}

export function NotificatieCenter({ variant = 'bell', userInitial }: NotificatieCenterProps = {}) {
  const { user } = useAuth();
  const [notificaties, setNotificaties] = useState<Notificatie[]>([]);
  const [open, setOpen] = useState(false);
  const [laden, setLaden] = useState(false);
  const [toast, setToast] = useState<Notificatie | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const paneelRef = useRef<HTMLDivElement>(null);
  const [paneelStijl, setPaneelStijl] = useState<React.CSSProperties | null>(null);
  const navigate = useNavigate();

  const aantalOngelezen = notificaties.filter((n) => !n.gelezen).length;

  const laadNotificaties = useCallback(async () => {
    try {
      const data = await getNotificaties();
      setNotificaties(data || []);
    } catch (err) {
      logger.error('Load notificaties failed:', err);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLaden(true);
      try {
        const data = await getNotificaties();
        if (!cancelled) setNotificaties(data || []);
      } catch (err) {
        logger.error('Load notificaties failed:', err);
      } finally {
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
  // Uniek per component-instantie. Dit component staat op DRIE plekken in de
  // boom (TopNav, Header, EmailMobileTopBar), en staan er twee tegelijk
  // gemount, dan vragen ze hetzelfde kanaal op. supabase.channel() geeft bij
  // een bestaande topic hetzelfde object terug, dus de tweede krijgt een kanaal
  // dat al ge-subscribed is en valt over "cannot add postgres_changes callbacks
  // after subscribe()". Dat trad echt op, ook in een gebouwde versie.
  //
  // useId geeft een stabiele id per instantie; de dubbele punten die React
  // erin zet horen niet in een kanaalnaam thuis.
  const kanaalId = useId().replace(/[^a-zA-Z0-9]/g, '');

  useEffect(() => {
    if (!supabase || !user?.id) return;

    const userId = user.id;

    // Bewust synchroon. Stond dit in een async functie met .then(), dan liep de
    // cleanup (die synchroon draait) vóór het toekennen van de referentie: het
    // kanaal werd dan niet opgeruimd en bleef achter.
    const channel = supabase!
      .channel(`notificaties-${userId}-${kanaalId}`)
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
            // website-meldingen krijgen de grote popup rechtsonder
            // (WebsiteMeldingPopup) incl. geluid; hier dempen tegen dubbel
            if (nieuw.type === 'website_chat' || nieuw.type === 'website_aanvraag') return;
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

    return () => {
      supabase!.removeChannel(channel);
    };
  }, [user?.id, kanaalId]);

  useEffect(() => {
    function handleBuitenKlik(event: MouseEvent) {
      const doel = event.target as Node;
      // Het paneel hangt in een portal, dus het zit níét in dropdownRef.
      if (paneelRef.current?.contains(doel)) return;
      if (dropdownRef.current && !dropdownRef.current.contains(doel)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleBuitenKlik);
    return () => document.removeEventListener("mousedown", handleBuitenKlik);
  }, []);

  // Het paneel wordt naar de body geportaald: de header staat in een eigen
  // stapelcontext (relative z-10), dus een z-index op het paneel zelf hielp
  // niet. Pagina-onderdelen met z-20 of hoger schoven er gewoon overheen.
  // Daarom meten we de knop en zetten we het paneel er met fixed onder.
  useEffect(() => {
    if (!open) return;

    function meet() {
      const knop = dropdownRef.current;
      if (!knop) return;
      const rect = knop.getBoundingClientRect();
      if (window.innerWidth < 768) {
        setPaneelStijl({ position: 'fixed', left: 8, right: 8, top: 60 });
        return;
      }
      setPaneelStijl({
        position: 'fixed',
        top: Math.round(rect.bottom + 8),
        right: Math.max(8, Math.round(window.innerWidth - rect.right)),
        width: 380,
        maxWidth: 'calc(100vw - 16px)',
      });
    }

    meet();
    window.addEventListener('resize', meet);
    // capture, zodat ook scrollende panelen binnen de pagina meetellen
    window.addEventListener('scroll', meet, true);
    return () => {
      window.removeEventListener('resize', meet);
      window.removeEventListener('scroll', meet, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

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

      {variant === 'avatar' ? (
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-label={aantalOngelezen > 0
            ? `${aantalOngelezen} nieuwe notificatie${aantalOngelezen === 1 ? '' : 's'} openen`
            : 'Notificaties openen'}
          className="relative inline-flex items-center justify-center w-[34px] h-[34px] rounded-full bg-petrol text-white flex-shrink-0"
        >
          <span className="text-[13px] font-bold leading-none">{userInitial ?? '·'}</span>
          {aantalOngelezen > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] rounded-full bg-flame text-white text-[9px] font-bold leading-none flex items-center justify-center px-1 ring-2 ring-muted">
              {aantalOngelezen > 99 ? '99+' : aantalOngelezen}
            </span>
          )}
        </button>
      ) : aantalOngelezen > 0 ? (
        // Een bel met een telbolletje volstaat · de volle oranje pil was op elk
        // scherm het felste element, ook als er niets dringends lag.
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-label={`${aantalOngelezen} nieuwe notificatie${aantalOngelezen === 1 ? '' : 's'} openen`}
          className="relative inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted/60 transition-colors"
        >
          <Bell className="h-[18px] w-[18px]" style={{ color: 'hsl(var(--muted-foreground))' }} />
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] rounded-full bg-flame text-white text-[10px] font-bold leading-none flex items-center justify-center px-1">
            {aantalOngelezen > 99 ? '99+' : aantalOngelezen}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Notificaties openen"
          className="relative w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-black/[0.04] focus-visible:outline-none focus-visible:bg-black/[0.04]"
        >
          <Bell className="h-[18px] w-[18px]" style={{ color: 'hsl(var(--muted-foreground))' }} />
        </button>
      )}

      {open && paneelStijl && createPortal(
        <div
          ref={paneelRef}
          className="z-[9500] overflow-hidden bg-card rounded-xl animate-in fade-in-0 slide-in-from-top-1 duration-150"
          style={{
            ...paneelStijl,
            border: '0.5px solid hsl(var(--border))',
            boxShadow: '0 12px 32px rgba(120,90,50,0.12), 0 2px 6px rgba(0,0,0,0.04)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5">
            <h3 className="text-[14px] font-bold text-foreground tracking-[-0.2px]">
              Notificaties{aantalOngelezen > 0 && <span className="text-flame">.</span>}
            </h3>
            <div className="flex items-center gap-2">
              {aantalOngelezen > 0 && (
                <button
                  onClick={handleAllesGelezenMarkeren}
                  className="text-[12px] font-medium text-petrol hover:text-[#0F3C44] transition-colors"
                >
                  Alles gelezen
                </button>
              )}
              <button
                type="button"
                onClick={() => { setOpen(false); navigate('/instellingen') }}
                aria-label="Instellingen"
                className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Body */}
          {laden ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : notificaties.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14">
              <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center">
                <Bell className="h-4 w-4 text-muted-foreground/80" />
              </div>
              <p className="text-[13px] text-muted-foreground">Geen nieuwe notificaties</p>
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto overscroll-contain">
              <div className="flex flex-col py-1">
                {notificaties.map((notificatie) => {
                  const config = typeConfig[notificatie.type] || typeConfig.algemeen;
                  const Icon = config.icon;
                  const isUnread = !notificatie.gelezen;

                  return (
                    <button
                      key={notificatie.id}
                      onClick={() => handleNotificatieKlik(notificatie)}
                      className="group flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-background"
                    >
                      <div className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        config.bgClass
                      )}>
                        <Icon className={cn("h-[15px] w-[15px]", config.colorClass)} />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div className="flex items-start justify-between gap-2">
                          {/* Gelezen zakt terug in gewicht en kleur · dat leest
                              rustiger dan een oranje balk naast elke regel. */}
                          <span className={cn(
                            'line-clamp-2 min-w-0 flex-1 text-[13px] leading-snug',
                            isUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground/65'
                          )}>
                            {notificatie.titel}
                            {isUnread && !/[.!?:]$/.test(notificatie.titel.trim()) && (
                              <span className="text-flame">.</span>
                            )}
                          </span>
                          <div className="flex flex-shrink-0 items-center gap-1.5 pt-px">
                            <span className={cn(
                              'whitespace-nowrap text-[11px] tabular-nums',
                              isUnread ? 'text-muted-foreground' : 'text-muted-foreground/70',
                            )}>
                              {formatTijdGeleden(notificatie.created_at)}
                            </span>
                            {isUnread && (
                              <span className="h-1.5 w-1.5 rounded-full bg-flame" />
                            )}
                          </div>
                        </div>
                        <p className={cn(
                          'line-clamp-2 text-[12px] leading-snug',
                          isUnread ? 'text-muted-foreground' : 'text-muted-foreground/70'
                        )}>
                          {notificatie.bericht}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="h-px bg-border" />
          <button
            onClick={() => {
              setOpen(false);
              navigate("/meldingen");
            }}
            className="w-full px-5 py-3 text-center text-[12px] font-medium text-petrol hover:bg-background transition-colors inline-flex items-center justify-center gap-1"
          >
            Alle meldingen bekijken
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
