import { getOrder } from '@/lib/admin-data'
import { renderPakbon } from '@/lib/pdf/pakbon'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const data = await getOrder(params.id)
  if (!data) return new Response('Bestelling niet gevonden', { status: 404 })

  try {
    const pdf = await renderPakbon(data.order, data.items)
    return new Response(pdf as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="pakbon-${data.order.order_number}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    console.error('Pakbon genereren faalde:', e)
    return new Response('Pakbon kon niet worden gemaakt.', { status: 500 })
  }
}
