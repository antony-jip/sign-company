import { ensureInvoiceNumber, getOrder } from '@/lib/admin-data'
import { renderFactuur } from '@/lib/pdf/factuur'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const data = await getOrder(params.id)
  if (!data) return new Response('Bestelling niet gevonden', { status: 404 })

  try {
    const invoiceNumber = await ensureInvoiceNumber(data.order)
    const order = { ...data.order, invoice_number: invoiceNumber }
    const pdf = await renderFactuur(order, data.items, invoiceNumber)

    return new Response(pdf as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="factuur-${invoiceNumber}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    console.error('Factuur genereren faalde:', e)
    return new Response(
      'Factuur kon niet worden gemaakt. Is de migratie supabase/admin_invoices.sql al in de database gedraaid?',
      { status: 500 },
    )
  }
}
