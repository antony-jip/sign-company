import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CheckCircle2, Info, Mail, Users } from 'lucide-react'
import { useSyncStatus } from '@/lib/mail/hooks'
import { getPostvakGezondheid, getPostvakken } from '@/services/postvakService'
import type { Postvak, SyncStatus } from '@/lib/mail/types'
import { relatieveTijd } from '../EmailTab'

interface Toon {
  Icoon: typeof Info
  kleur: string
  kop: string
  regel: string
}

function toonVoor(sync: SyncStatus): Toon {
  const laatst = sync.laatsteSucces ? relatieveTijd(sync.laatsteSucces) : null
  if (sync.status === 'uitgezet') {
    return { Icoon: AlertTriangle, kleur: 'text-red-600 dark:text-red-400', kop: 'Synchronisatie uitgezet', regel: sync.laatsteFout || 'Verbind opnieuw onder Instellingen, E-mail.' }
  }
  if (sync.status === 'fout') {
    return { Icoon: AlertTriangle, kleur: 'text-amber-600 dark:text-amber-400', kop: 'Synchronisatie hapert', regel: `${sync.laatsteFout || 'Onbekende fout'}${laatst ? ` · laatst gelukt ${laatst}` : ''}` }
  }
  // 'onbekend' is niet hetzelfde als goed: neutraal tonen, niet groen.
  if (sync.status === 'onbekend') {
    return { Icoon: Info, kleur: 'text-muted-foreground', kop: 'Status onbekend', regel: laatst ? `Laatst gelukt ${laatst}` : 'De gezondheid van de koppeling is nu niet op te halen.' }
  }
  return { Icoon: CheckCircle2, kleur: 'text-green-600 dark:text-green-400', kop: laatst ? `Gesynchroniseerd · laatst ${laatst}` : 'Gekoppeld · eerste synchronisatie loopt', regel: '' }
}

/* Overzicht van de gekoppelde postvakken met de gezondheid per postvak.
   Instellen gebeurt op één plek: Instellingen, E-mail, Verbinding. */
export function MijnEmailSubTab() {
  const sync = useSyncStatus()
  const [postvakken, setPostvakken] = useState<Postvak[]>([])
  const [gezondheid, setGezondheid] = useState<Record<string, SyncStatus>>({})
  const [geladen, setGeladen] = useState(false)

  useEffect(() => {
    let actief = true
    getPostvakken()
      .then(async (lijst) => {
        if (!actief) return
        setPostvakken(lijst)
        const per = await getPostvakGezondheid(lijst).catch(() => ({}))
        if (actief) setGezondheid(per)
      })
      .catch(() => undefined)
      .finally(() => { if (actief) setGeladen(true) })
    return () => { actief = false }
  }, [])

  const leeg = geladen && postvakken.length === 0

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-petrol/10 flex items-center justify-center shrink-0">
          <Mail className="h-4 w-4 text-petrol" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">
            {postvakken.length > 1 ? 'Mijn postvakken' : 'Mijn mailbox'}
          </h3>
          {leeg && <p className="text-sm text-muted-foreground mt-0.5">Nog geen mailbox gekoppeld.</p>}
          {!geladen && postvakken.length === 0 && <p className="text-sm text-muted-foreground mt-0.5">Laden</p>}
        </div>
      </div>

      {postvakken.length > 0 && (
        <div className="space-y-3">
          {postvakken.map((postvak) => {
            // Zonder eigen rij in email_sync_state valt een postvak terug op de
            // gezondheid van de mailbox als geheel; dat is de stand van vóór 245.
            const toon = toonVoor(gezondheid[postvak.id] ?? sync)
            return (
              <div key={postvak.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-medium text-foreground">{postvak.naam}</span>
                  {postvak.isStandaard && postvakken.length > 1 && (
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      standaard<span style={{ color: '#F15025' }}>.</span>
                    </span>
                  )}
                  {postvak.soort === 'gedeeld' && (
                    <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                      <Users className="h-3 w-3" />
                      gedeeld
                    </span>
                  )}
                </div>
                {postvak.adres && postvak.adres !== postvak.naam && (
                  <p className="text-xs font-mono text-foreground/60 truncate mt-0.5">{postvak.adres}</p>
                )}
                <div className="flex items-start gap-2 mt-2">
                  <toon.Icoon className={`h-4 w-4 mt-0.5 shrink-0 ${toon.kleur}`} />
                  <div className="min-w-0">
                    <div className="text-sm text-foreground">{toon.kop}</div>
                    {toon.regel && <p className="text-xs text-muted-foreground mt-0.5 break-words">{toon.regel}</p>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Link
        to="/instellingen?tab=email&sub=verbinding"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-petrol hover:text-[#0F3D45] transition-colors"
      >
        {postvakken.length > 0 ? 'Postvakken beheren' : 'Mailbox koppelen'}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}
