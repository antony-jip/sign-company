import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { mollie } from '@/lib/mollie'
import type { OrderStatus } from '@/lib/types'
import { getOrder } from '@/lib/admin-data'
import { sendPaidOrderEmails } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Map Mollie-status -> onze order_status enum
function mapStatus(mollieStatus: string): OrderStatus {
  switch (mollieStatus) {
    case 'paid': return 'paid'
    case 'failed': return 'failed'
    case 'expired': return 'expired'
    case 'canceled': return 'canceled'
    case 'refunded': return 'refunded'
    case 'pending':
    case 'open':
    case 'authorized': return 'pending'
    default: return 'pending'
  }
}

/**
 * Mollie webhook. Mollie stuurt ALLEEN het payment-id; we halen zelf de
 * actuele status op bij Mollie (nooit de body vertrouwen) en updaten de order.
 * Altijd 200 teruggeven zodat Mollie niet eindeloos opnieuw probeert.
 */
export async function POST(req: NextRequest) {
  let paymentId: string | null = null
  try {
    const form = await req.formData()
    paymentId = form.get('id')?.toString() ?? null
  } catch {
    // sommige tests sturen JSON
    try {
      const json = await req.json()
      paymentId = json?.id ?? null
    } catch { /* noop */ }
  }

  if (!paymentId) {
    return NextResponse.json({ ok: false, error: 'geen payment id' }, { status: 200 })
  }

  try {
    const payment = await mollie().payments.get(paymentId)
    const newStatus = mapStatus(payment.status)
    const admin = supabaseAdmin()

    const baseUpdate = {
      status: newStatus,
      mollie_status: payment.status,
      betaalmethode: payment.method ?? null,
    }

    if (payment.status === 'paid') {
      // Atomaire overgang: alleen de eerste call die de order op 'paid' zet wint
      // (via .neq('status','paid') + RETURNING). Zo sturen we de mails exact één
      // keer, ook als Mollie de webhook meerdere keren (parallel) aanroept.
      const { data: flipped } = await admin
        .from('orders')
        .update({ ...baseUpdate, paid_at: new Date().toISOString() })
        .eq('mollie_payment_id', paymentId)
        .neq('status', 'paid')
        .select('id')
        .maybeSingle()

      if (flipped) {
        try {
          const full = await getOrder(flipped.id)
          if (full) await sendPaidOrderEmails(full.order, full.items)
        } catch (mailErr) {
          console.error('Versturen bestelmails na betaling faalde:', mailErr)
        }
      }
    } else {
      // Niet-paid update: status bijwerken, maar paid_at NOOIT wissen
      // (een latere refund/expired-call mag de betaaldatum niet weghalen).
      await admin.from('orders').update(baseUpdate).eq('mollie_payment_id', paymentId)
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e) {
    // Log maar geef 200 zodat Mollie het later opnieuw probeert via retry-schema
    console.error('Mollie webhook fout:', e)
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
