import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getDaanVoorstellen, bevestigDaanGeheugen, wijsDaanGeheugenAf } from '@/services/supabaseService'
import type { DaanVoorstel } from '@/services/supabaseService'

/**
 * De ochtendlijst: wat de nachtploeg heeft gedestilleerd uit de sporen van
 * gisteren. Verdwijnt volledig als er niets ligt; het systeem vraagt maar op
 * één moment van de dag iets van de gebruiker.
 */
export function VannachtGeleerdBlok() {
  const [voorstellen, setVoorstellen] = useState<DaanVoorstel[]>([])

  useEffect(() => {
    let cancelled = false
    getDaanVoorstellen()
      .then((rows) => { if (!cancelled) setVoorstellen(rows) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const handleAannemen = async (v: DaanVoorstel) => {
    const ok = await bevestigDaanGeheugen(v.id)
    if (!ok) { toast.error('Aannemen mislukt'); return }
    setVoorstellen(prev => prev.filter(r => r.id !== v.id))
    toast.success(<>Daan onthoudt dit voortaan<span style={{ color: '#F15025' }}>.</span></>)
  }

  const handleAfwijzen = async (v: DaanVoorstel) => {
    const ok = await wijsDaanGeheugenAf(v.id)
    if (!ok) { toast.error('Afwijzen mislukt'); return }
    setVoorstellen(prev => prev.filter(r => r.id !== v.id))
    toast.success(<>Afgewezen<span style={{ color: '#F15025' }}>.</span></>)
  }

  if (voorstellen.length === 0) return null

  return (
    <section className="doen-panel doen-wash rounded-xl p-6 sm:p-7">
      <header className="flex items-baseline justify-between gap-4 mb-5">
        <div className="flex items-baseline gap-3 min-w-0">
          <h2 className="font-heading text-[14px] font-bold text-foreground">
            Vannacht geleerd<span className="text-flame">.</span>
          </h2>
          <span className="doen-subtitel truncate">
            Daan stelt voor dit te onthouden<span className="text-flame">.</span>
          </span>
        </div>
        <span className="font-mono text-[12px] text-muted-foreground flex-shrink-0">
          {voorstellen.length} {voorstellen.length === 1 ? 'voorstel' : 'voorstellen'}
        </span>
      </header>

      <div className="space-y-3">
        {voorstellen.map((v) => (
          <div
            key={v.id}
            className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-2 border-b border-border/40 last:border-b-0"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">{v.inhoud}</p>
              <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                {v.klant_naam ?? 'bedrijfsbreed'}
                {typeof v.bewijs?.sporen === 'number' ? ` · uit ${v.bewijs.sporen} sporen` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleAannemen(v)}
                className="text-xs font-semibold text-white bg-flame hover:bg-[#E04520] px-3 py-1.5 rounded-md"
              >
                Aannemen
              </button>
              <button
                onClick={() => handleAfwijzen(v)}
                className="text-xs text-muted-foreground hover:text-red-500 px-2.5 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                Afwijzen
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
