import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { COMPANY } from '@/lib/company'
import type { OrderItemRow, OrderRow } from '@/lib/admin-data'

const INK = '#3a3127'
const GOLD = '#b8941e'
const MUTED = '#8b7a6b'
const LINE = '#e5e2d8'

const datum = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'

function configRegel(it: OrderItemRow): string {
  const parts: string[] = []
  if (it.format_snapshot) parts.push(it.format_snapshot)
  if (it.fabric_snapshot) parts.push(it.fabric_snapshot)
  parts.push(it.met_lijst ? (it.frame_snapshot ? `frame ${it.frame_snapshot}` : 'met frame') : 'los doek')
  return parts.filter(Boolean).join(' · ')
}

const s = StyleSheet.create({
  page: { padding: 40, paddingBottom: 70, fontSize: 10, color: INK, fontFamily: 'Helvetica', lineHeight: 1.45 },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  brand: { fontSize: 20, fontFamily: 'Helvetica-Bold' },
  brandSub: { fontSize: 8, color: MUTED, marginTop: 1 },
  docTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: GOLD, textAlign: 'right' },
  goldBar: { height: 2, backgroundColor: GOLD, marginTop: 14, marginBottom: 18 },
  label: { fontSize: 7.5, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  th: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: INK, paddingBottom: 5, marginTop: 24 },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: LINE, paddingVertical: 8, alignItems: 'center' },
  cQty: { width: '12%', fontFamily: 'Helvetica-Bold', fontSize: 12 },
  cDesc: { width: '88%' },
  colHead: { fontSize: 7.5, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6 },
  itemTitle: { fontFamily: 'Helvetica-Bold' },
  itemSub: { fontSize: 8.5, color: MUTED, marginTop: 1 },
  itemSku: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: INK, marginTop: 2 },
  note: { marginTop: 22, padding: 10, backgroundColor: '#faf8ef', borderRadius: 3, fontSize: 9 },
  footer: { position: 'absolute', bottom: 28, left: 40, right: 40, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 8 },
  footerSmall: { fontSize: 7.5, color: MUTED },
})

function PakbonDoc({ order, items }: { order: OrderRow; items: OrderItemRow[] }) {
  const totaalStuks = items.reduce((n, it) => n + it.aantal, 0)
  return (
    <Document title={`Pakbon ${order.order_number}`} author={COMPANY.merk}>
      <Page size="A4" style={s.page}>
        <View style={s.between}>
          <View>
            <Text style={s.brand}>{COMPANY.merk}</Text>
            <Text style={s.brandSub}>{COMPANY.onderdeelVan}</Text>
          </View>
          <Text style={s.docTitle}>PAKBON</Text>
        </View>
        <View style={s.goldBar} />

        <View style={s.between}>
          <View style={{ width: '48%' }}>
            <Text style={s.label}>Bezorgadres</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{order.naam || order.email}</Text>
            {order.adres ? <Text>{order.adres}</Text> : null}
            {(order.postcode || order.plaats) ? <Text>{order.postcode} {order.plaats}</Text> : null}
            {order.land ? <Text>{order.land}</Text> : null}
            {order.telefoon ? <Text style={{ color: MUTED, marginTop: 2 }}>{order.telefoon}</Text> : null}
          </View>
          <View style={{ width: '40%' }}>
            <Text style={s.label}>Bestelnummer</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{order.order_number}</Text>
            <Text style={[s.label, { marginTop: 10 }]}>Besteldatum</Text>
            <Text>{datum(order.created_at)}</Text>
          </View>
        </View>

        <View style={s.th}>
          <Text style={[s.cQty, s.colHead]}>Aantal</Text>
          <Text style={[s.cDesc, s.colHead]}>Artikel</Text>
        </View>
        {items.map((it) => (
          <View key={it.id} style={s.tr}>
            <Text style={s.cQty}>{it.aantal}×</Text>
            <View style={s.cDesc}>
              <Text style={s.itemTitle}>{it.titel_snapshot || 'Kunstdoek'}</Text>
              <Text style={s.itemSub}>{configRegel(it)}</Text>
              {it.sku ? <Text style={s.itemSku}>SKU {it.sku}</Text> : null}
            </View>
          </View>
        ))}

        <View style={s.note}>
          <Text>Totaal {totaalStuks} artikel{totaalStuks === 1 ? '' : 'en'}.</Text>
          {order.opmerking ? <Text style={{ marginTop: 4, color: MUTED }}>Opmerking klant: {order.opmerking}</Text> : null}
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerSmall}>
            {COMPANY.merk} · {COMPANY.adres}, {COMPANY.postcode} {COMPANY.plaats} · {COMPANY.telefoon} · {COMPANY.email}
          </Text>
        </View>
      </Page>
    </Document>
  )
}

export async function renderPakbon(order: OrderRow, items: OrderItemRow[]): Promise<Uint8Array> {
  const buf = await renderToBuffer(<PakbonDoc order={order} items={items} />)
  const out = new Uint8Array(buf.length)
  out.set(buf)
  return out
}
