import { useState } from 'react'
import { CheckCircle2, XCircle, ShieldCheck, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import supabase from '@/services/supabaseClient'
import { cn } from '@/lib/utils'

export interface ViesResultaat {
  geldig: boolean
  btw_nummer: string
  naam: string | null
  adres: { straat: string; postcode: string; stad: string } | null
  gevalideerd_op: string | null
}

interface Props {
  btwNummer: string
  doel: 'profiel' | 'klant'
  klantId?: string
  gevalideerdOp?: string | null
  onResultaat?: (r: ViesResultaat) => void
}

/**
 * Controleert een EU-btw-nummer bij VIES via api/vies-check.ts. Voor
 * Belgische nummers geeft VIES naam en adres terug; de aanroeper kan daar
 * lege velden mee vullen (het KBO-equivalent van de KvK-autocomplete).
 */
export function BtwCheckKnop({ btwNummer, doel, klantId, gevalideerdOp, onResultaat }: Props) {
  const [bezig, setBezig] = useState(false)
  const [lokaal, setLokaal] = useState<ViesResultaat | null>(null)
  const kan = /^[A-Za-z]{2}[A-Za-z0-9 .\-]{2,16}$/.test(btwNummer.trim())

  const check = async () => {
    setBezig(true)
    try {
      const { data } = supabase ? await supabase.auth.getSession() : { data: null }
      const token = data?.session?.access_token
      if (!token) throw new Error('Niet ingelogd')
      const res = await fetch('/api/vies-check', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ btw_nummer: btwNummer, doel, klant_id: klantId }),
      })
      const body = await res.json().catch(() => ({})) as Partial<ViesResultaat> & { error?: string }
      if (!res.ok) throw new Error(body.error || 'Btw-controle mislukt')
      const r = body as ViesResultaat
      setLokaal(r)
      onResultaat?.(r)
      toast[r.geldig ? 'success' : 'warning'](r.geldig ? `Btw-nummer geldig${r.naam ? ` · ${r.naam}` : ''}` : 'VIES kent dit btw-nummer niet')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Btw-controle mislukt')
    } finally {
      setBezig(false)
    }
  }

  const status: 'geldig' | 'ongeldig' | 'onbekend' = lokaal ? (lokaal.geldig ? 'geldig' : 'ongeldig') : gevalideerdOp ? 'geldig' : 'onbekend'
  const datum = lokaal?.gevalideerd_op ?? gevalideerdOp

  return (
    <div className="flex items-center gap-2 pt-1">
      {status !== 'onbekend' && (
        <Badge
          className={cn('text-xs gap-1', status === 'geldig' ? 'bg-[hsl(var(--status-green-bg))] text-[#2D6B48]' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200')}
          title={datum ? `VIES-controle op ${new Date(datum).toLocaleDateString('nl-NL')}` : undefined}
        >
          {status === 'geldig' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
          {status === 'geldig' ? 'Btw-nummer gevalideerd' : 'Btw-nummer ongeldig'}
        </Badge>
      )}
      <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={check} disabled={bezig || !btwNummer.trim() || !kan}>
        {bezig ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
        {status === 'onbekend' ? 'Controleer btw-nummer (VIES)' : 'Opnieuw controleren'}
      </Button>
    </div>
  )
}
