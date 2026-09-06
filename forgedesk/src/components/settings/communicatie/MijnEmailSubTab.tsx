import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CheckCircle2, Info, Mail } from 'lucide-react'
import { useSyncStatus } from '@/lib/mail/hooks'
import { relatieveTijd } from '../EmailTab'

/* Eén kaart met de stand van zaken. Instellen gebeurt op één plek:
   Instellingen, E-mail, Verbinding. */
export function MijnEmailSubTab() {
  const sync = useSyncStatus()
  const [adres, setAdres] = useState<string | null>(null)
  const [geladen, setGeladen] = useState(false)

  useEffect(() => {
    let actief = true
    try {
      const cached = sessionStorage.getItem('doen_email_settings')
      if (cached) {
        const parsed = JSON.parse(cached) as { gmail_address?: string; has_password?: boolean }
        if (parsed.gmail_address && parsed.has_password) setAdres(parsed.gmail_address)
      }
    } catch { /* geen cache */ }
    import('@/services/gmailService')
      .then((m) => m.loadEmailSettingsFromDb())
      .then((s) => { if (actief) setAdres(s?.gmail_address && s.has_password ? s.gmail_address : null) })
      .catch(() => undefined)
      .finally(() => { if (actief) setGeladen(true) })
    return () => { actief = false }
  }, [])

  const laatst = sync.laatsteSucces ? relatieveTijd(sync.laatsteSucces) : null
  const toon = !adres
    ? { Icoon: Info, kleur: 'text-muted-foreground', kop: geladen ? 'Nog geen mailbox gekoppeld' : 'Laden', regel: geladen ? 'Koppel je mailbox en lees en verstuur mail vanuit doen.' : '' }
    : sync.status === 'uitgezet'
      ? { Icoon: AlertTriangle, kleur: 'text-red-600 dark:text-red-400', kop: 'Synchronisatie uitgezet', regel: sync.laatsteFout || 'Verbind opnieuw onder Instellingen, E-mail.' }
      : sync.status === 'fout'
        ? { Icoon: AlertTriangle, kleur: 'text-amber-600 dark:text-amber-400', kop: 'Synchronisatie hapert', regel: `${sync.laatsteFout || 'Onbekende fout'}${laatst ? ` · laatst gelukt ${laatst}` : ''}` }
        // 'onbekend' is niet hetzelfde als goed: neutraal tonen, niet groen.
        : sync.status === 'onbekend'
          ? { Icoon: Info, kleur: 'text-muted-foreground', kop: 'Status onbekend', regel: laatst ? `Laatst gelukt ${laatst}` : 'De gezondheid van de koppeling is nu niet op te halen.' }
          : { Icoon: CheckCircle2, kleur: 'text-green-600 dark:text-green-400', kop: laatst ? `Gesynchroniseerd · laatst ${laatst}` : 'Gekoppeld · eerste synchronisatie loopt', regel: '' }

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-petrol/10 flex items-center justify-center shrink-0">
          <Mail className="h-4 w-4 text-petrol" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">Mijn mailbox</h3>
          <p className="text-sm font-mono text-foreground/70 truncate mt-0.5">{adres ?? (geladen ? 'geen adres gekoppeld' : '')}</p>
        </div>
      </div>
      <div className="flex items-start gap-2">
        <toon.Icoon className={`h-4 w-4 mt-0.5 shrink-0 ${toon.kleur}`} />
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground">{toon.kop}</div>
          {toon.regel && <p className="text-xs text-muted-foreground mt-0.5 break-words">{toon.regel}</p>}
        </div>
      </div>
      <Link
        to="/instellingen?tab=email&sub=verbinding"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-petrol hover:text-[#0F3D45] transition-colors"
      >
        {adres ? 'Verbinding beheren' : 'Mailbox koppelen'}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}
