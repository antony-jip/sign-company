import { supabaseAdmin } from '@/lib/supabase'

export type OrderStatus =
  | 'open'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'expired'
  | 'canceled'
  | 'refunded'

export const ORDER_STATUSES: OrderStatus[] = [
  'open',
  'pending',
  'paid',
  'failed',
  'expired',
  'canceled',
  'refunded',
]

export interface OrderRow {
  id: string
  order_number: string
  status: OrderStatus
  email: string
  naam: string | null
  telefoon: string | null
  adres: string | null
  postcode: string | null
  plaats: string | null
  land: string | null
  opmerking: string | null
  subtotal_cents: number
  shipping_cents: number
  total_cents: number
  btw_cents: number
  valuta: string
  mollie_payment_id: string | null
  mollie_status: string | null
  betaalmethode: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
  invoice_number: string | null
  invoiced_at: string | null
}

export type OrderListRow = OrderRow & { skus: string | null }

export interface OrderItemRow {
  id: string
  order_id: string
  met_lijst: boolean
  titel_snapshot: string | null
  format_snapshot: string | null
  fabric_snapshot: string | null
  frame_snapshot: string | null
  image_url_snapshot: string | null
  aantal: number
  unit_price_cents: number
  line_total_cents: number
  sku: string | null
}

export interface QuoteRow {
  id: string
  type: string
  naam: string | null
  email: string
  telefoon: string | null
  bedrijf: string | null
  bericht: string | null
  gewenst_formaat: string | null
  fabric_key: string | null
  status: string
  created_at: string
}

const LIST_LIMIT = 500

export async function listOrders(
  opts: { status?: string; q?: string } = {},
): Promise<{ orders: OrderListRow[]; total: number }> {
  const sb = supabaseAdmin()
  let query = sb
    .from('orders')
    .select('*, order_items(artwork_id, artworks(woo_sku))', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(LIST_LIMIT)

  // Status alleen toepassen als het een geldige enum-waarde is (anders 'alle').
  if (opts.status && opts.status !== 'alle' && ORDER_STATUSES.includes(opts.status as OrderStatus)) {
    query = query.eq('status', opts.status as OrderStatus)
  }
  // Zoekterm saneren: strip de tekens waarmee je uit een PostgREST-.or()-filter
  // kunt breken (komma = scheidingsteken, haakjes = groepering, % * \ wildcards).
  if (opts.q) {
    const term = opts.q.replace(/[%,()*\\]/g, '').trim().slice(0, 80)
    if (term) query = query.or(`order_number.ilike.%${term}%,email.ilike.%${term}%,naam.ilike.%${term}%`)
  }

  const { data, error, count } = await query
  if (error) throw error
  const orders: OrderListRow[] = (data ?? []).map((o: Record<string, unknown>) => {
    const items = (o.order_items as { artworks?: { woo_sku?: string | null } | null }[] | null) ?? []
    const skus = items.map((i) => i.artworks?.woo_sku).filter(Boolean).join(', ')
    const { order_items: _drop, ...rest } = o
    void _drop
    return { ...(rest as unknown as OrderRow), skus: skus || null }
  })
  return { orders, total: count ?? orders.length }
}

export async function getOrder(id: string): Promise<{ order: OrderRow; items: OrderItemRow[] } | null> {
  const sb = supabaseAdmin()
  const { data: order, error } = await sb.from('orders').select('*').eq('id', id).single()
  if (error || !order) return null

  const { data: rawItems, error: itemsError } = await sb
    .from('order_items')
    .select('*, artworks(woo_sku)')
    .eq('order_id', id)
    .order('created_at', { ascending: true })
  // Een fout hier mag NIET stilletjes een factuur/pakbon zonder regels opleveren.
  if (itemsError) throw itemsError

  const items: OrderItemRow[] = (rawItems ?? []).map((it: Record<string, unknown>) => {
    const artwork = it.artworks as { woo_sku?: string | null } | null
    const { artworks: _drop, ...rest } = it
    void _drop
    return { ...(rest as unknown as Omit<OrderItemRow, 'sku'>), sku: artwork?.woo_sku ?? null }
  })
  return { order: order as OrderRow, items }
}

export async function setOrderStatus(id: string, status: OrderStatus): Promise<void> {
  const sb = supabaseAdmin()
  const { error } = await sb.from('orders').update({ status }).eq('id', id)
  if (error) throw error
}

/**
 * Wijst atomair een doorlopend factuurnummer toe (of geeft het bestaande terug).
 * De RPC doet één conditionele UPDATE (WHERE invoice_number IS NULL), zodat
 * gelijktijdige downloads de sequence niet dubbel ophogen en het nummer in de
 * PDF altijd gelijk is aan het opgeslagen nummer.
 */
export async function ensureInvoiceNumber(order: OrderRow): Promise<string> {
  if (order.invoice_number) return order.invoice_number
  const sb = supabaseAdmin()
  const { data, error } = await sb.rpc('assign_invoice_number', { p_order_id: order.id })
  if (error || !data) throw error ?? new Error('Kon geen factuurnummer toewijzen')
  return data as string
}

export interface DashboardStats {
  omzetTotaalCents: number
  omzetMaandCents: number
  omzetVandaagCents: number
  betaaldeOrders: number
  totaalOrders: number
  openOrders: number
  mislukteOrders: number
  gemiddeldeOrderCents: number
  itemsVerkocht: number
  omzetPerMaand: { label: string; cents: number; orders: number }[]
  topProducten: { naam: string; sku: string | null; aantal: number }[]
  gekapt: boolean
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const sb = supabaseAdmin()
  const CAP = 5000

  const { data: ordersData, error } = await sb
    .from('orders')
    .select('status, total_cents, paid_at, created_at')
    .order('created_at', { ascending: false })
    .limit(CAP)
  if (error) throw error
  const orders = (ordersData ?? []) as {
    status: OrderStatus
    total_cents: number
    paid_at: string | null
    created_at: string
  }[]

  const paid = orders.filter((o) => o.status === 'paid')
  const paidTime = (o: { paid_at: string | null; created_at: string }) =>
    new Date(o.paid_at ?? o.created_at).getTime()
  const omzetTotaalCents = paid.reduce((s, o) => s + o.total_cents, 0)

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const omzetMaandCents = paid.filter((o) => paidTime(o) >= monthStart).reduce((s, o) => s + o.total_cents, 0)
  const omzetVandaagCents = paid.filter((o) => paidTime(o) >= dayStart).reduce((s, o) => s + o.total_cents, 0)

  const openOrders = orders.filter((o) => o.status === 'open' || o.status === 'pending').length
  const mislukteOrders = orders.filter(
    (o) => o.status === 'failed' || o.status === 'expired' || o.status === 'canceled',
  ).length

  // Omzet per maand — laatste 6 maanden
  const months: { key: string; label: string; cents: number; orders: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('nl-NL', { month: 'short' }), cents: 0, orders: 0 })
  }
  const idxByKey = new Map(months.map((m, i) => [m.key, i]))
  for (const o of paid) {
    const d = new Date(o.paid_at ?? o.created_at)
    const idx = idxByKey.get(`${d.getFullYear()}-${d.getMonth()}`)
    if (idx !== undefined) {
      months[idx].cents += o.total_cents
      months[idx].orders += 1
    }
  }

  // Items verkocht + topproducten (alleen betaalde orders)
  const { data: itemsData } = await sb
    .from('order_items')
    .select('aantal, titel_snapshot, artworks(woo_sku), orders!inner(status)')
    .eq('orders.status', 'paid')
    .limit(CAP)
  let itemsVerkocht = 0
  const prodMap = new Map<string, { naam: string; sku: string | null; aantal: number }>()
  for (const raw of (itemsData ?? []) as unknown as { aantal: number; titel_snapshot: string | null; artworks: { woo_sku: string | null } | null }[]) {
    const aantal = raw.aantal ?? 0
    itemsVerkocht += aantal
    const naam = raw.titel_snapshot ?? 'Onbekend'
    const sku = raw.artworks?.woo_sku ?? null
    const key = `${naam}|${sku ?? ''}`
    const cur = prodMap.get(key) ?? { naam, sku, aantal: 0 }
    cur.aantal += aantal
    prodMap.set(key, cur)
  }
  const topProducten = Array.from(prodMap.values()).sort((a, b) => b.aantal - a.aantal).slice(0, 6)

  return {
    omzetTotaalCents,
    omzetMaandCents,
    omzetVandaagCents,
    betaaldeOrders: paid.length,
    totaalOrders: orders.length,
    openOrders,
    mislukteOrders,
    gemiddeldeOrderCents: paid.length ? Math.round(omzetTotaalCents / paid.length) : 0,
    itemsVerkocht,
    omzetPerMaand: months.map((m) => ({ label: m.label, cents: m.cents, orders: m.orders })),
    topProducten,
    gekapt: orders.length >= CAP,
  }
}

export async function listQuotes(): Promise<QuoteRow[]> {
  const sb = supabaseAdmin()
  const { data, error } = await sb
    .from('quote_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(LIST_LIMIT)
  if (error) throw error
  return (data ?? []) as QuoteRow[]
}
