import { useState } from 'react'
import { CheckCircle2, XCircle, HelpCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import supabase from '@/services/supabaseClient'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import type { KlantPeppolStatus } from '@/types'
import { cn } from '@/lib/utils'

const LABEL: Record<KlantPeppolStatus, string> = {
  onbekend: 'Peppol onbekend',
  geregistreerd: 'Op Peppol',
  niet_geregistreerd: 'Niet op Peppol',
}

interface Props {
  klantId: string
  status?: KlantPeppolStatus | null
  gecheckOp?: string | null
  onStatus?: (status: KlantPeppolStatus, gecheckOp: string) => void
  compact?: boolean
}

/**
 * Badge met de laatst bekende Peppol-registratie van een klant en een knop
 * om die opnieuw te controleren via Billit. Zonder Billit-koppeling toont
 * hij alleen de badge: de check zelf loopt via Billit als access point.
 */
export function PeppolCheckKnop({ klantId, status, gecheckOp, onStatus, compact }: Props) {
  const { settings } = useAppSettings()
  const [bezig, setBezig] = useState(false)
  const [lokaleStatus, setLokaleStatus] = useState<KlantPeppolStatus | null>(null)
  const huidig: KlantPeppolStatus = lokaleStatus ?? status ?? 'onbekend'
  const kanChecken = settings.boekhoud_pakket === 'billit' && !!settings.billit_party_id

  const check = async () => {
    setBezig(true)
    try {
      const { data } = supabase ? await supabase.auth.getSession() : { data: null }
      const token = data?.session?.access_token
      if (!token) throw new Error('Niet ingelogd')
      const res = await fetch('/api/billit-peppol-check', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ klant_id: klantId }),
      })
      const body = await res.json().catch(() => ({})) as { peppol_status?: KlantPeppolStatus; peppol_gecheckt_op?: string; error?: string }
      if (!res.ok || !body.peppol_status) throw new Error(body.error || 'Peppol-check mislukt')
      setLokaleStatus(body.peppol_status)
      onStatus?.(body.peppol_status, body.peppol_gecheckt_op ?? new Date().toISOString())
      toast.success(body.peppol_status === 'geregistreerd' ? 'Klant is bereikbaar via Peppol' : 'Klant staat niet op het Peppol-netwerk')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Peppol-check mislukt')
    } finally {
      setBezig(false)
    }
  }

  const Icoon = huidig === 'geregistreerd' ? CheckCircle2 : huidig === 'niet_geregistreerd' ? XCircle : HelpCircle
  const kleur = huidig === 'geregistreerd'
    ? 'bg-[hsl(var(--status-green-bg))] text-[#2D6B48]'
    : huidig === 'niet_geregistreerd'
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
      : 'bg-muted text-muted-foreground'

  return (
    <div className={cn('flex items-center gap-2', compact ? '' : 'pt-1')}>
      <Badge className={cn('text-xs gap-1', kleur)} title={gecheckOp ? `Gecheckt op ${new Date(gecheckOp).toLocaleDateString('nl-NL')}` : undefined}>
        <Icoon className="w-3 h-3" />
        {LABEL[huidig]}
      </Badge>
      {kanChecken && (
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={check} disabled={bezig}>
          <RefreshCw className={cn('w-3 h-3', bezig && 'animate-spin')} />
          {huidig === 'onbekend' ? 'Check Peppol' : 'Opnieuw'}
        </Button>
      )}
    </div>
  )
}
