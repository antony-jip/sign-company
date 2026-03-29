import { useEffect, useState } from 'react'
import supabase from '@/services/supabaseClient'

const LABELS: Record<string, string> = {
  bekeken: 'Portaal bekeken',
  herinnering_verstuurd: 'Herinnering verstuurd ✓',
  bericht_verstuurd: 'Klant heeft gereageerd',
  bestand_geupload: 'Bestand geüpload',
  item_goedgekeurd: 'Item goedgekeurd ✓',
  item_revisie: 'Revisie aangevraagd',
}

export function PortaalActiviteitenLog({ portaalId }: { portaalId: string }) {
  const [items, setItems] = useState<{ actie: string; created_at: string }[]>([])

  useEffect(() => {
    supabase!
      .from('portaal_activiteiten')
      .select('actie, created_at')
      .eq('portaal_id', portaalId)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => { if (data) setItems(data) })
  }, [portaalId])

  if (items.length === 0) return null

  return (
    <div className="px-4 py-2 border-t border-[#E6E4E0] bg-[#FAFAF8]">
      <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wide mb-1.5">Activiteit</p>
      {items.map((a, i) => (
        <div key={i} className="flex justify-between text-[11px] py-0.5">
          <span className="text-foreground/70">{LABELS[a.actie] || a.actie}</span>
          <span className="text-muted-foreground/40 font-mono">{new Date(a.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</span>
        </div>
      ))}
    </div>
  )
}
