import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { FileText, Download, Loader2 } from 'lucide-react'

interface Factuurrij {
  id: string
  nummer: string
  datum: string
  bedrag_excl: number
  btw_bedrag: number
  bedrag_incl: number
  periode_start: string | null
  periode_eind: string | null
  pdf_url: string | null
}

function formatBedrag(n: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}

function formatDatum(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * De facturen van het doen.-abonnement zelf. Mollie incasseert maandelijks,
 * de factuur komt uit `abonnement_facturen` met een eigen DOEN-nummerreeks.
 */
export function MijnFacturenTab() {
  const { session } = useAuth()
  const [facturen, setFacturen] = useState<Factuurrij[]>([])
  const [laden, setLaden] = useState(true)

  useEffect(() => {
    if (!session?.access_token) return
    let geannuleerd = false
    setLaden(true)
    fetch('/api/abonnement-facturen', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!geannuleerd && Array.isArray(d?.facturen)) setFacturen(d.facturen) })
      .catch(() => { /* lege lijst is een prima eindstand */ })
      .finally(() => { if (!geannuleerd) setLaden(false) })
    return () => { geannuleerd = true }
  }, [session?.access_token])

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[15px] font-bold text-foreground">Mijn facturen</h3>
        <p className="text-[13px] text-muted-foreground">
          De facturen van je doen.-abonnement. Elke maandelijkse incasso levert er een op, je krijgt hem ook per e-mail.
        </p>
      </div>

      {laden ? (
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Facturen ophalen...
        </div>
      ) : facturen.length === 0 ? (
        <div className="rounded-xl border border-border px-5 py-8 text-center">
          <FileText className="mx-auto h-5 w-5 text-muted-foreground/60" />
          <p className="mt-3 text-[13px] font-medium text-foreground">Nog geen facturen</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Zodra de eerste incasso is gelukt staat je factuur hier klaar.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          {facturen.map((f, i) => (
            <div
              key={f.id}
              className={`flex items-center gap-4 px-5 py-3.5 ${i > 0 ? 'border-t border-border' : ''}`}
            >
              <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-foreground font-mono">{f.nummer}</p>
                <p className="text-[12px] text-muted-foreground">
                  {formatDatum(f.datum)}
                  {f.periode_start && f.periode_eind && (
                    <> · periode {formatDatum(f.periode_start)} t/m {formatDatum(f.periode_eind)}</>
                  )}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[13px] font-mono text-foreground">{formatBedrag(f.bedrag_excl)}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatBedrag(f.bedrag_incl)} incl. btw
                </p>
              </div>
              {f.pdf_url ? (
                <a
                  href={f.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-petrol hover:opacity-70 transition-opacity flex-shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  PDF
                </a>
              ) : (
                <span className="text-[11px] text-muted-foreground flex-shrink-0">geen PDF</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
