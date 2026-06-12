import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { loadCatalogForLines } from '@/lib/catalog'
import { priceOrder } from '@/lib/pricing'
import { mollie, molliAmount } from '@/lib/mollie'
import type { CheckoutRequest } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SHIPPING_CENTS = parseInt(process.env.SHIPPING_CENTS ?? '0', 10)
const BTW_PERCENT = parseInt(process.env.BTW_PERCENT ?? '21', 10)

export async function POST(req: NextRequest) {
  let body: CheckoutRequest
  try {
    body = (await req.json()) as CheckoutRequest
  } catch {
    return NextResponse.json({ error: 'Ongeldige JSON' }, { status: 400 })
  }

  const { items, customer } = body ?? {}
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Winkelwagen is leeg' }, { status: 400 })
  }
  if (!customer?.email) {
    return NextResponse.json({ error: 'E-mailadres is verplicht' }, { status: 400 })
  }

  const admin = supabaseAdmin()
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? `https://${req.headers.get('host')}`

  // 1. Prijzen ALTIJD server-side herberekenen (nooit client vertrouwen)
  let priced
  try {
    const artworkIds = items.map((i) => i.artworkId).filter(Boolean) as string[]
    const catalog = await loadCatalogForLines(admin, artworkIds)
    priced = priceOrder(items, catalog, {
      shippingCents: SHIPPING_CENTS,
      btwPercent: BTW_PERCENT,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Prijsberekening mislukt' },
      { status: 400 },
    )
  }

  if (priced.totalCents <= 0) {
    return NextResponse.json({ error: 'Ordertotaal is nul' }, { status: 400 })
  }

  // 2. Order-nummer + order aanmaken (status 'open')
  const { data: numRow, error: numErr } = await admin.rpc('gen_order_number')
  if (numErr) {
    return NextResponse.json({ error: 'Order-nummer genereren mislukt' }, { status: 500 })
  }
  const orderNumber = numRow as unknown as string

  const { data: order, error: orderErr } = await admin
    .from('orders')
    .insert({
      order_number: orderNumber,
      status: 'open',
      email: customer.email,
      naam: customer.naam ?? null,
      telefoon: customer.telefoon ?? null,
      adres: customer.adres ?? null,
      postcode: customer.postcode ?? null,
      plaats: customer.plaats ?? null,
      land: customer.land ?? 'NL',
      opmerking: customer.opmerking ?? null,
      subtotal_cents: priced.subtotalCents,
      shipping_cents: priced.shippingCents,
      total_cents: priced.totalCents,
      btw_cents: priced.btwCents,
    })
    .select('id, order_number')
    .single()

  if (orderErr || !order) {
    return NextResponse.json({ error: 'Order aanmaken mislukt' }, { status: 500 })
  }

  // 3. Order-items (met prijssnapshot)
  const itemRows = priced.lines.map((l) => ({
    order_id: order.id,
    artwork_id: l.input.artworkId ?? null,
    custom_upload_id: l.input.customUploadId ?? null,
    format_id: l.input.formatId,
    fabric_id: l.input.fabricId,
    frame_color_id: l.input.frameColorId,
    met_lijst: l.input.metLijst,
    titel_snapshot: l.titelSnapshot,
    format_snapshot: l.formatSnapshot,
    fabric_snapshot: l.fabricSnapshot,
    frame_snapshot: l.frameSnapshot,
    image_url_snapshot: l.imageUrlSnapshot,
    aantal: l.input.aantal,
    unit_price_cents: l.unitPriceCents,
    line_total_cents: l.lineTotalCents,
  }))
  const { error: itemsErr } = await admin.from('order_items').insert(itemRows)
  if (itemsErr) {
    return NextResponse.json({ error: 'Order-items opslaan mislukt' }, { status: 500 })
  }

  // 4. Mollie-betaling aanmaken
  try {
    const payment = await mollie().payments.create({
      amount: { currency: 'EUR', value: molliAmount(priced.totalCents) },
      description: `Kunstdoekje bestelling ${order.order_number}`,
      redirectUrl: `${baseUrl}/bedankt?order=${order.order_number}`,
      webhookUrl: `${baseUrl}/api/webhook/mollie`,
      metadata: { orderId: order.id, orderNumber: order.order_number },
    })

    await admin
      .from('orders')
      .update({
        status: 'pending',
        mollie_payment_id: payment.id,
        mollie_status: payment.status,
      })
      .eq('id', order.id)

    const checkoutUrl = payment.getCheckoutUrl()
    return NextResponse.json({ checkoutUrl, orderNumber: order.order_number })
  } catch (e) {
    await admin.from('orders').update({ status: 'failed' }).eq('id', order.id)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Betaling aanmaken mislukt' },
      { status: 502 },
    )
  }
}
