import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOrder } from '@/lib/admin-data'
import { formatEuro } from '@/lib/pricing'
import StatusBadge from '@/components/admin/StatusBadge'
import OrderStatusControl from '@/components/admin/OrderStatusControl'
import CustomerMailer from '@/components/admin/CustomerMailer'

export const dynamic = 'force-dynamic'

function datumTijd(iso: string) {
  return new Date(iso).toLocaleString('nl-NL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function itemConfig(it: { format_snapshot: string | null; fabric_snapshot: string | null; frame_snapshot: string | null; met_lijst: boolean }) {
  const parts: string[] = []
  if (it.format_snapshot) parts.push(it.format_snapshot)
  if (it.fabric_snapshot) parts.push(it.fabric_snapshot)
  parts.push(it.met_lijst ? (it.frame_snapshot ? `frame ${it.frame_snapshot}` : 'met frame') : 'los doek')
  return parts.filter(Boolean).join(' · ')
}

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const data = await getOrder(params.id)
  if (!data) notFound()
  const { order, items } = data

  return (
    <div>
      <Link href="/admin/orders" className="text-sm text-ink/55 hover:text-ink">← Terug naar bestellingen</Link>

      {/* Kop */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-3xl">{order.order_number}</h1>
          <StatusBadge status={order.status} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/admin/orders/${order.id}/pakbon`}
            className="rounded-[3px] border border-ink/40 px-4 py-2 text-sm font-semibold text-ink transition hover:border-ink hover:bg-ink hover:text-canvas"
          >
            Pakbon (PDF)
          </a>
          <a
            href={`/api/admin/orders/${order.id}/factuur`}
            className="rounded-[3px] border border-ink bg-ink px-4 py-2 text-sm font-semibold text-canvas transition hover:border-accent hover:bg-accent hover:text-ink"
          >
            Factuur (PDF)
          </a>
        </div>
      </div>
      <p className="mt-1 text-sm text-ink/55">Geplaatst op {datumTijd(order.created_at)}</p>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {/* Klant & bezorging */}
        <section className="rounded-[5px] border border-ink/15 bg-paper p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/45">Klant &amp; bezorging</h2>
          <p className="mt-3 font-semibold">{order.naam || '—'}</p>
          <p className="text-sm text-ink/70">{order.email}</p>
          {order.telefoon && <p className="text-sm text-ink/70">{order.telefoon}</p>}
          <div className="mt-3 text-sm text-ink/70">
            {order.adres && <p>{order.adres}</p>}
            {(order.postcode || order.plaats) && <p>{order.postcode} {order.plaats}</p>}
            {order.land && <p>{order.land}</p>}
          </div>
          {order.opmerking && (
            <p className="mt-3 rounded-[3px] bg-canvas p-3 text-sm text-ink/70">
              <span className="font-semibold">Opmerking:</span> {order.opmerking}
            </p>
          )}
        </section>

        {/* Betaling */}
        <section className="rounded-[5px] border border-ink/15 bg-paper p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/45">Betaling</h2>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-ink/55">Status</dt><dd><StatusBadge status={order.status} /></dd></div>
            <div className="flex justify-between"><dt className="text-ink/55">Methode</dt><dd>{order.betaalmethode || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-ink/55">Betaald op</dt><dd>{order.paid_at ? datumTijd(order.paid_at) : '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-ink/55">Mollie-id</dt><dd className="text-xs text-ink/50">{order.mollie_payment_id || '—'}</dd></div>
            {order.invoice_number && (
              <div className="flex justify-between"><dt className="text-ink/55">Factuurnr.</dt><dd className="font-semibold">{order.invoice_number}</dd></div>
            )}
          </dl>
          <div className="mt-4 border-t border-ink/15 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/45">Status handmatig wijzigen</p>
            <OrderStatusControl id={order.id} current={order.status} />
          </div>
        </section>
      </div>

      {/* Regels */}
      <section className="mt-6 overflow-hidden rounded-[5px] border border-ink/15 bg-paper">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/15 text-left text-xs uppercase tracking-wide text-ink/45">
              <th className="px-4 py-3 font-semibold">Artikel</th>
              <th className="px-4 py-3 font-semibold text-right">Aantal</th>
              <th className="px-4 py-3 font-semibold text-right">Stuksprijs</th>
              <th className="px-4 py-3 font-semibold text-right">Totaal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-ink/10">
                <td className="px-4 py-3">
                  <span className="block font-semibold">{it.titel_snapshot || 'Kunstdoek'}</span>
                  <span className="block text-xs text-ink/55">{itemConfig(it)}</span>
                  {it.sku && <span className="mt-0.5 block font-mono text-[11px] text-ink/45">SKU: {it.sku}</span>}
                </td>
                <td className="px-4 py-3 text-right">{it.aantal}</td>
                <td className="px-4 py-3 text-right">{formatEuro(it.unit_price_cents)}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatEuro(it.line_total_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end px-4 py-4">
          <dl className="w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-ink/55">Subtotaal</dt><dd>{formatEuro(order.subtotal_cents)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink/55">Verzending</dt><dd>{order.shipping_cents ? formatEuro(order.shipping_cents) : 'Gratis'}</dd></div>
            <div className="flex justify-between border-t border-ink/15 pt-1.5 text-base font-semibold"><dt>Totaal</dt><dd>{formatEuro(order.total_cents)}</dd></div>
            <div className="flex justify-between text-xs text-ink/50"><dt>Waarvan btw</dt><dd>{formatEuro(order.btw_cents)}</dd></div>
          </dl>
        </div>
      </section>

      <CustomerMailer id={order.id} email={order.email} orderNumber={order.order_number} />
    </div>
  )
}
