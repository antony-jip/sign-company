import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Check,
  Loader2,
  AlertTriangle,
  Users,
  Plus,
  ArrowRight,
  CalendarClock,
} from 'lucide-react'

const FEATURES = [
  'Onbeperkt klanten en projecten',
  'Offertes, facturen en werkbonnen',
  'Montageplanning met drag-and-drop',
  'Klantportaal',
  'Email integratie',
  'AI-assistent Daan',
  'Geen opzetkosten',
  'Geen verborgen kosten',
  'Maandelijks opzegbaar',
  'Eenvoudig data overzetten',
]

function formatDatum(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function AbonnementTab() {
  const { trialStatus, trialDagenOver, organisatie, session, refreshOrganisatie } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [loadingAction, setLoadingAction] = useState<'activate' | 'opzeggen' | null>(null)
  const [bevestigOpzeggen, setBevestigOpzeggen] = useState(false)
  const [opgezegdTot, setOpgezegdTot] = useState<string | null>(organisatie?.abonnement_actief_tot ?? null)

  useEffect(() => {
    setOpgezegdTot(organisatie?.abonnement_actief_tot ?? null)
  }, [organisatie?.abonnement_actief_tot])

  useEffect(() => {
    if (searchParams.get('abonnement') !== 'klaar') return
    searchParams.delete('abonnement')
    setSearchParams(searchParams, { replace: true })

    if (trialStatus === 'actief') {
      toast.success('Abonnement geactiveerd! Welkom bij doen.')
      return
    }

    // De status flipt pas als Mollie's webhook binnen is. Dat duurt meestal
    // een paar seconden, dus we halen de organisatie zelf een aantal keer op
    // in plaats van de gebruiker te vragen te verversen.
    toast('Betaling wordt verwerkt...')
    let pogingen = 0
    let gestopt = false
    const timers: ReturnType<typeof setTimeout>[] = []
    const controleer = async () => {
      pogingen += 1
      try { await refreshOrganisatie() } catch { /* volgende poging */ }
      if (gestopt) return
      if (pogingen >= 6) {
        toast('Betaling is nog niet verwerkt. Ververs de pagina over een minuutje.')
        return
      }
      timers.push(setTimeout(controleer, 2500))
    }
    timers.push(setTimeout(controleer, 2000))
    return () => { gestopt = true; timers.forEach(clearTimeout) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, setSearchParams])

  const handleActivate = async () => {
    if (!organisatie?.id || !session?.access_token) return
    setIsLoading(true)
    setLoadingAction('activate')
    try {
      const res = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ organisatie_id: organisatie.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Er ging iets mis')
      if (data.url) window.location.href = data.url
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Kon abonnement niet starten')
    } finally {
      setIsLoading(false)
      setLoadingAction(null)
    }
  }

  const handleOpzeggen = async () => {
    if (!organisatie?.id || !session?.access_token) return
    if (!bevestigOpzeggen) {
      setBevestigOpzeggen(true)
      return
    }
    setIsLoading(true)
    setLoadingAction('opzeggen')
    try {
      const res = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ organisatie_id: organisatie.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Er ging iets mis')
      setOpgezegdTot(data.actief_tot ?? null)
      toast.success(
        data.actief_tot
          ? `Abonnement opgezegd. Je houdt toegang tot ${formatDatum(data.actief_tot)}.`
          : 'Abonnement opgezegd.'
      )
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Kon abonnement niet opzeggen')
    } finally {
      setIsLoading(false)
      setLoadingAction(null)
      setBevestigOpzeggen(false)
    }
  }

  const isActive = trialStatus === 'actief'
  const isExpired = trialStatus === 'verlopen' || trialStatus === 'opgezegd'
  const isOpgezegdPending = isActive && !!opgezegdTot

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-[20px] font-bold tracking-tight text-foreground">Abonnement</h2>
        <p className="text-[13px] text-muted-foreground">Plan, facturatie en gebruikers</p>
      </div>

      {/* Status banner */}
      {isActive && !isOpgezegdPending && (
        <div className="flex items-center justify-between rounded-xl p-5 border bg-[#E2F0F0] border-[#C0DDDD] dark:bg-petrol/[0.18] dark:border-petrol/40">
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-[#1A535C] dark:text-[#5AABB5]" />
            <div>
              <span className="text-[14px] font-bold text-[#1A535C] dark:text-[#5AABB5]">Abonnement actief</span>
              <p className="text-[12px] text-[#1A535C]/60 dark:text-[#5AABB5]/70">Je hebt volledige toegang tot alle features.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {bevestigOpzeggen && !isLoading && (
              <Button onClick={() => setBevestigOpzeggen(false)} variant="ghost" className="text-muted-foreground">
                Toch niet
              </Button>
            )}
            <Button onClick={handleOpzeggen} disabled={isLoading} variant="outline" className="border-petrol/20 text-petrol dark:border-white/15 dark:text-[#5AABB5]">
              {loadingAction === 'opzeggen' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {bevestigOpzeggen ? 'Bevestig opzegging' : 'Opzeggen'}
            </Button>
          </div>
        </div>
      )}

      {isOpgezegdPending && (
        <div className="flex items-center gap-3 rounded-xl p-5 border bg-[#F5F2E8] border-[#E5DCC8] dark:bg-[#8A7A4A]/[0.14] dark:border-[#8A7A4A]/40">
          <CalendarClock className="h-5 w-5 flex-shrink-0 text-[#8A7A4A] dark:text-[#C9B87A]" />
          <div>
            <span className="text-[14px] font-bold text-[#8A7A4A] dark:text-[#C9B87A]">Abonnement opgezegd</span>
            <p className="text-[12px] text-[#8A7A4A]/70 dark:text-[#C9B87A]/70">
              Je houdt volledige toegang tot {formatDatum(opgezegdTot!)}. Daarna stopt het abonnement, je data blijft bewaard.
            </p>
          </div>
        </div>
      )}

      {isExpired && (
        <div className="flex items-center gap-3 rounded-xl p-5 border bg-[#FDE8E2] border-[#F0C8BC] dark:bg-[#C03A18]/[0.14] dark:border-[#C03A18]/40">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-[#C03A18] dark:text-[#E8906E]" />
          <div>
            <span className="text-[14px] font-bold text-[#C03A18] dark:text-[#E8906E]">
              {trialStatus === 'verlopen' ? 'Je proefperiode is verlopen' : 'Je abonnement is opgezegd'}
            </span>
            <p className="text-[12px] text-[#C03A18]/70 dark:text-[#E8906E]/70">Je data staat veilig. Activeer een abonnement om verder te werken.</p>
          </div>
        </div>
      )}

      {!isActive && !isExpired && trialDagenOver !== undefined && (
        <div className="flex items-center gap-3 rounded-xl p-5 border bg-[#F5F2E8] border-[#E5DCC8] dark:bg-[#8A7A4A]/[0.14] dark:border-[#8A7A4A]/40">
          <div className="text-[24px] font-bold font-mono text-[#8A7A4A] dark:text-[#C9B87A]">{trialDagenOver}</div>
          <div>
            <span className="text-[14px] font-bold text-[#8A7A4A] dark:text-[#C9B87A]">dagen proefperiode over</span>
            <p className="text-[12px] text-[#8A7A4A]/70 dark:text-[#C9B87A]/70">Alle features beschikbaar, geen beperkingen.</p>
          </div>
        </div>
      )}

      {/* Pricing card */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid hsl(var(--border))' }}>
        <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #F15025, #1A535C)' }} />
        <div className="p-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
            {/* Left: pricing */}
            <div>
              <h3 className="font-heading text-[22px] font-bold tracking-tight text-foreground">
                Gewoon doen<span style={{ color: '#F15025' }}>.</span>
              </h3>

              <div className="flex items-baseline gap-1.5 mt-3">
                <span className="text-[42px] font-bold font-mono tracking-tight text-foreground">€79</span>
                <span className="text-[15px] text-muted-foreground">/ maand</span>
              </div>
              <p className="text-[12px] text-muted-foreground mt-1">excl. btw · €95,59 incl. btw per maand</p>

              <div className="flex items-center gap-2 mt-2 rounded-lg px-3 py-2" style={{ backgroundColor: 'hsl(var(--background))' }}>
                <Users className="h-4 w-4" style={{ color: '#1A535C' }} />
                <span className="text-[13px] font-medium text-foreground">
                  Tot <strong>10 gebruikers</strong> inbegrepen
                </span>
              </div>

              <div className="flex items-center gap-2 mt-2 rounded-lg px-3 py-2" style={{ backgroundColor: 'hsl(var(--background))' }}>
                <Plus className="h-4 w-4" style={{ color: '#1A535C' }} />
                <span className="text-[13px] font-medium text-foreground">
                  Meer gebruikers? <strong>Staffel op maat</strong>
                </span>
              </div>

              <p className="text-[13px] mt-4 text-muted-foreground">
                Geen opzetkosten. Maandelijks opzegbaar. Eenvoudig data overzetten.
              </p>

              {!isActive && (
                <button
                  onClick={handleActivate}
                  disabled={isLoading}
                  className="mt-6 h-12 px-8 text-[15px] font-bold text-white rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 inline-flex items-center gap-2"
                  style={{ backgroundColor: '#F15025' }}
                >
                  {loadingAction === 'activate' && <Loader2 className="h-4 w-4 animate-spin" />}
                  Abonnement activeren
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}

              {!isActive && (
                <p className="text-[12px] mt-3 max-w-[380px] leading-[1.5] text-muted-foreground">
                  Je rekent nu de eerste maand af en geeft toestemming voor automatische
                  incasso. Daarna schrijven we elke maand €95,59 incl. btw af tot je opzegt.
                </p>
              )}
            </div>

            {/* Right: features */}
            <div className="flex-shrink-0 md:w-[300px]">
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-3 text-muted-foreground">Wat je krijgt</p>
              <ul className="space-y-2.5">
                {FEATURES.map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-[13px] text-foreground">
                    <Check className="h-4 w-4 flex-shrink-0" style={{ color: '#1A535C' }} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
