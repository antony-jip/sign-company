import Link from 'next/link'
import { getDashboardStats } from '@/lib/admin-data'
import { formatEuro } from '@/lib/pricing'

export const dynamic = 'force-dynamic'

function Kpi({ label, value, sub, href }: { label: string; value: string; sub?: string; href?: string }) {
  const inner = (
    <div className="h-full rounded-[5px] border border-ink/15 bg-paper p-5 transition hover:border-ink/30">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">{label}</p>
      <p className="mt-2 font-serif text-3xl">{value}</p>
      {sub && <p className="mt-1 text-xs text-ink/50">{sub}</p>}
    </div>
  )
  return href ? <Link href={href} className="block">{inner}</Link> : inner
}

export default async function Dashboard() {
  let stats: Awaited<ReturnType<typeof getDashboardStats>> | null = null
  let error = ''
  try {
    stats = await getDashboardStats()
  } catch (e) {
    error = e instanceof Error ? e.message : 'Kon statistieken niet laden.'
  }

  if (error || !stats) {
    return (
      <div>
        <h1 className="font-serif text-3xl">Dashboard</h1>
        <p className="mt-6 rounded-[4px] border border-red-300 bg-red-50 p-4 text-sm text-red-700">{error}</p>
      </div>
    )
  }

  const maxMaand = Math.max(...stats.omzetPerMaand.map((m) => m.cents), 1)

  return (
    <div>
      <h1 className="font-serif text-3xl">Dashboard</h1>
      <p className="mt-1 text-sm text-ink/55">
        Omzet &amp; aantallen{stats.gekapt ? ' · eerste 5000 orders' : ''}
      </p>

      {/* KPI's */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Omzet totaal" value={formatEuro(stats.omzetTotaalCents)} sub={`${stats.betaaldeOrders} betaalde bestellingen`} />
        <Kpi label="Omzet deze maand" value={formatEuro(stats.omzetMaandCents)} />
        <Kpi label="Omzet vandaag" value={formatEuro(stats.omzetVandaagCents)} />
        <Kpi label="Gem. orderwaarde" value={formatEuro(stats.gemiddeldeOrderCents)} />
        <Kpi label="Betaald" value={String(stats.betaaldeOrders)} href="/admin/orders?status=paid" />
        <Kpi label="Openstaand" value={String(stats.openOrders)} sub="open + in behandeling" href="/admin/orders?status=open" />
        <Kpi label="Items verkocht" value={String(stats.itemsVerkocht)} />
        <Kpi label="Mislukt" value={String(stats.mislukteOrders)} href="/admin/orders?status=failed" />
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {/* Omzet per maand */}
        <section className="rounded-[5px] border border-ink/15 bg-paper p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/45">Omzet per maand</h2>
          <div className="mt-4 space-y-2.5">
            {stats.omzetPerMaand.map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-8 shrink-0 text-xs capitalize text-ink/50">{m.label}</span>
                <div className="h-5 flex-1 overflow-hidden rounded-[2px] bg-canvas">
                  <div className="h-full rounded-[2px] bg-accent" style={{ width: `${Math.round((m.cents / maxMaand) * 100)}%` }} />
                </div>
                <span className="w-20 shrink-0 text-right text-xs font-semibold">{formatEuro(m.cents)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Topproducten */}
        <section className="rounded-[5px] border border-ink/15 bg-paper p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/45">Best verkocht</h2>
          {stats.topProducten.length === 0 ? (
            <p className="mt-4 text-sm text-ink/50">Nog geen verkopen.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {stats.topProducten.map((p, i) => (
                <li key={i} className="flex items-center justify-between gap-3 border-b border-ink/10 pb-2 text-sm last:border-0 last:pb-0">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{p.naam}</span>
                    {p.sku && <span className="font-mono text-xs text-ink/45">SKU {p.sku}</span>}
                  </span>
                  <span className="shrink-0 font-semibold">{p.aantal}×</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
