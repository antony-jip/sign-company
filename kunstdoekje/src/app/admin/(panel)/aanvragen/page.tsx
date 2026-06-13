import { listQuotes } from '@/lib/admin-data'

export const dynamic = 'force-dynamic'

function datum(iso: string) {
  return new Date(iso).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })
}

const TYPE_LABEL: Record<string, string> = {
  maatwerk: 'Maatwerk',
  zakelijk: 'Zakelijk',
  contact: 'Contact',
}

export default async function AanvragenPage() {
  let quotes: Awaited<ReturnType<typeof listQuotes>> = []
  let error = ''
  try {
    quotes = await listQuotes()
  } catch (e) {
    error = e instanceof Error ? e.message : 'Kon aanvragen niet laden.'
  }

  return (
    <div>
      <h1 className="font-serif text-3xl">Aanvragen</h1>
      <p className="mt-1 text-sm text-ink/55">Maatwerk, zakelijk en contact · {quotes.length} weergegeven</p>

      {error ? (
        <p className="mt-8 rounded-[4px] border border-red-300 bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : quotes.length === 0 ? (
        <p className="mt-10 text-ink/55">Nog geen aanvragen.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {quotes.map((q) => (
            <article key={q.id} className="rounded-[5px] border border-ink/15 bg-paper p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent-dark">
                    {TYPE_LABEL[q.type] ?? q.type}
                  </span>
                  <span className="font-semibold">{q.naam || q.email}</span>
                  {q.bedrijf && <span className="text-sm text-ink/55">· {q.bedrijf}</span>}
                </div>
                <span className="text-xs text-ink/50">{datum(q.created_at)}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink/70">
                <a href={`mailto:${q.email}`} className="hover:text-accent-dark">{q.email}</a>
                {q.telefoon && <a href={`tel:${q.telefoon}`} className="hover:text-accent-dark">{q.telefoon}</a>}
                {q.gewenst_formaat && <span>Formaat: {q.gewenst_formaat}</span>}
                {q.fabric_key && <span>Stof: {q.fabric_key}</span>}
              </div>
              {q.bericht && <p className="mt-3 whitespace-pre-wrap rounded-[3px] bg-canvas p-3 text-sm text-ink/75">{q.bericht}</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
