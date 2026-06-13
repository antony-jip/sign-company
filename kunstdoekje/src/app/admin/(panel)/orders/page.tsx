import Link from 'next/link'
import { listOrders, type OrderListRow } from '@/lib/admin-data'
import { formatEuro } from '@/lib/pricing'
import StatusBadge from '@/components/admin/StatusBadge'

export const dynamic = 'force-dynamic'

const FILTERS = [
  { value: 'alle', label: 'Alle' },
  { value: 'paid', label: 'Betaald' },
  { value: 'pending', label: 'In behandeling' },
  { value: 'open', label: 'Open' },
  { value: 'failed', label: 'Mislukt' },
]

function datum(iso: string) {
  return new Date(iso).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string }
}) {
  const status = searchParams.status ?? 'alle'
  const q = searchParams.q ?? ''

  let orders: OrderListRow[] = []
  let total = 0
  let error = ''
  try {
    const res = await listOrders({ status, q })
    orders = res.orders
    total = res.total
  } catch (e) {
    error = e instanceof Error ? e.message : 'Kon bestellingen niet laden.'
  }
  const truncated = total > orders.length

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">Bestellingen</h1>
          <p className="mt-1 text-sm text-ink/55">
            {truncated ? `${orders.length} van ${total} getoond (max ${orders.length})` : `${orders.length} weergegeven`}
          </p>
        </div>
        <form className="flex gap-2" action="/admin/orders">
          {status !== 'alle' && <input type="hidden" name="status" value={status} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Zoek op ordernr, e-mail of naam"
            className="w-64 rounded-[3px] border border-ink/25 bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button className="rounded-[3px] border border-ink bg-ink px-4 py-2 text-sm font-semibold text-canvas">
            Zoek
          </button>
        </form>
      </div>

      {/* Statusfilters */}
      <div className="mt-5 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const active = status === f.value
          const params = new URLSearchParams()
          if (f.value !== 'alle') params.set('status', f.value)
          if (q) params.set('q', q)
          const href = `/admin/orders${params.toString() ? `?${params}` : ''}`
          return (
            <Link
              key={f.value}
              href={href}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                active ? 'border-ink bg-ink text-canvas' : 'border-ink/25 text-ink/60 hover:border-ink hover:text-ink'
              }`}
            >
              {f.label}
            </Link>
          )
        })}
      </div>

      {error ? (
        <p className="mt-8 rounded-[4px] border border-red-300 bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : orders.length === 0 ? (
        <p className="mt-10 text-ink/55">Nog geen bestellingen in deze weergave.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-[5px] border border-ink/15 bg-paper">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/15 text-left text-xs uppercase tracking-wide text-ink/45">
                <th className="px-4 py-3 font-semibold">Datum</th>
                <th className="px-4 py-3 font-semibold">Bestelnr.</th>
                <th className="px-4 py-3 font-semibold">Klant</th>
                <th className="px-4 py-3 font-semibold">SKU</th>
                <th className="px-4 py-3 font-semibold text-right">Bedrag</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Betaald via</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-ink/10 transition hover:bg-canvas">
                  <td className="px-4 py-3 text-ink/70">
                    <Link href={`/admin/orders/${o.id}`} className="block">{datum(o.created_at)}</Link>
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    <Link href={`/admin/orders/${o.id}`} className="block hover:text-accent-dark">{o.order_number}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${o.id}`} className="block">
                      <span className="block">{o.naam || '—'}</span>
                      <span className="block text-xs text-ink/50">{o.email}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink/70">{o.skus || '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatEuro(o.total_cents)}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3 text-ink/60">{o.betaalmethode || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
