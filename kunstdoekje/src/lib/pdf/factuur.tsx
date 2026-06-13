import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { COMPANY } from '@/lib/company'
import type { OrderItemRow, OrderRow } from '@/lib/admin-data'

const INK = '#3a3127'
const GOLD = '#b8941e'
const MUTED = '#8b7a6b'
const LINE = '#e5e2d8'

const eur = (c: number) => '€ ' + (c / 100).toFixed(2).replace('.', ',')
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
  page: { padding: 40, paddingBottom: 78, fontSize: 9.5, color: INK, fontFamily: 'Helvetica', lineHeight: 1.4 },
  row: { flexDirection: 'row' },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  brand: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: INK },
  brandSub: { fontSize: 8, color: MUTED, marginTop: 1 },
  docTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: GOLD, textAlign: 'right' },
  goldBar: { height: 2, backgroundColor: GOLD, marginTop: 14, marginBottom: 18 },
  metaLabel: { fontSize: 7.5, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6 },
  metaValue: { fontSize: 9.5, fontFamily: 'Helvetica-Bold' },
  colHead: { fontSize: 7.5, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6 },
  block: { width: '48%' },
  blockTitle: { fontSize: 7.5, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  th: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: INK, paddingBottom: 5, marginTop: 26 },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: LINE, paddingVertical: 7 },
  cDesc: { width: '52%' },
  cQty: { width: '12%', textAlign: 'right' },
  cUnit: { width: '18%', textAlign: 'right' },
  cTot: { width: '18%', textAlign: 'right' },
  itemTitle: { fontFamily: 'Helvetica-Bold' },
  itemSub: { fontSize: 8, color: MUTED, marginTop: 1 },
  totals: { marginTop: 14, alignSelf: 'flex-end', width: '46%' },
  totRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5 },
  totGrand: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: INK, marginTop: 4, paddingTop: 5 },
  grandLabel: { fontFamily: 'Helvetica-Bold', fontSize: 11 },
  grandValue: { fontFamily: 'Helvetica-Bold', fontSize: 11 },
  payNote: { marginTop: 22, padding: 10, backgroundColor: '#faf8ef', borderRadius: 3, fontSize: 8.5, color: INK },
  footer: { position: 'absolute', bottom: 28, left: 40, right: 40, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 8 },
  footerSmall: { fontSize: 7, color: MUTED, lineHeight: 1.3 },
})

function FactuurDoc({
  order,
  items,
  invoiceNumber,
}: {
  order: OrderRow
  items: OrderItemRow[]
  invoiceNumber: string
}) {
  const btwPct = process.env.BTW_PERCENT || '21'
  return (
    <Document title={`Factuur ${invoiceNumber}`} author={COMPANY.merk}>
      <Page size="A4" style={s.page}>
        {/* Kop */}
        <View style={s.between}>
          <View>
            <Text style={s.brand}>{COMPANY.merk}</Text>
            <Text style={s.brandSub}>{COMPANY.onderdeelVan}</Text>
          </View>
          <Text style={s.docTitle}>FACTUUR</Text>
        </View>
        <View style={s.goldBar} />

        {/* Meta */}
        <View style={s.between}>
          <View>
            <Text style={s.metaLabel}>Factuurnummer</Text>
            <Text style={s.metaValue}>{invoiceNumber}</Text>
          </View>
          <View>
            <Text style={s.metaLabel}>Factuurdatum</Text>
            <Text style={s.metaValue}>{datum(order.invoiced_at || order.paid_at || order.created_at)}</Text>
          </View>
          <View>
            <Text style={s.metaLabel}>Bestelnummer</Text>
            <Text style={s.metaValue}>{order.order_number}</Text>
          </View>
          <View>
            <Text style={s.metaLabel}>Status</Text>
            <Text style={s.metaValue}>{order.status === 'paid' ? 'Betaald' : order.status}</Text>
          </View>
        </View>

        {/* Van / Aan */}
        <View style={[s.between, { marginTop: 22 }]}>
          <View style={s.block}>
            <Text style={s.blockTitle}>Van</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{COMPANY.merk}</Text>
            <Text style={{ color: MUTED }}>{COMPANY.onderdeelVan}</Text>
            <Text>{COMPANY.adres}</Text>
            <Text>{COMPANY.postcode} {COMPANY.plaats}</Text>
            <Text>{COMPANY.email}</Text>
            <Text>KvK {COMPANY.kvk} · BTW {COMPANY.btw}</Text>
          </View>
          <View style={s.block}>
            <Text style={s.blockTitle}>Factuur aan</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{order.naam || order.email}</Text>
            {order.adres ? <Text>{order.adres}</Text> : null}
            {(order.postcode || order.plaats) ? <Text>{order.postcode} {order.plaats}</Text> : null}
            {order.land ? <Text>{order.land}</Text> : null}
            <Text>{order.email}</Text>
            {order.telefoon ? <Text>{order.telefoon}</Text> : null}
          </View>
        </View>

        {/* Regels */}
        <View style={s.th}>
          <Text style={[s.cDesc, s.colHead]}>Omschrijving</Text>
          <Text style={[s.cQty, s.colHead]}>Aantal</Text>
          <Text style={[s.cUnit, s.colHead]}>Stuksprijs</Text>
          <Text style={[s.cTot, s.colHead]}>Totaal</Text>
        </View>
        {items.map((it) => (
          <View key={it.id} style={s.tr}>
            <View style={s.cDesc}>
              <Text style={s.itemTitle}>{it.titel_snapshot || 'Kunstdoek'}</Text>
              <Text style={s.itemSub}>{configRegel(it)}{it.sku ? ` · SKU ${it.sku}` : ''}</Text>
            </View>
            <Text style={s.cQty}>{it.aantal}</Text>
            <Text style={s.cUnit}>{eur(it.unit_price_cents)}</Text>
            <Text style={s.cTot}>{eur(it.line_total_cents)}</Text>
          </View>
        ))}

        {/* Totalen */}
        <View style={s.totals}>
          <View style={s.totRow}>
            <Text style={{ color: MUTED }}>Subtotaal</Text>
            <Text>{eur(order.subtotal_cents)}</Text>
          </View>
          <View style={s.totRow}>
            <Text style={{ color: MUTED }}>Verzendkosten</Text>
            <Text>{order.shipping_cents ? eur(order.shipping_cents) : 'Gratis'}</Text>
          </View>
          <View style={s.totGrand}>
            <Text style={s.grandLabel}>Totaal (incl. btw)</Text>
            <Text style={s.grandValue}>{eur(order.total_cents)}</Text>
          </View>
          <View style={[s.totRow, { marginTop: 2 }]}>
            <Text style={{ color: MUTED }}>Totaal excl. btw</Text>
            <Text style={{ color: MUTED }}>{eur(order.total_cents - order.btw_cents)}</Text>
          </View>
          <View style={s.totRow}>
            <Text style={{ color: MUTED }}>Waarvan {btwPct}% btw</Text>
            <Text style={{ color: MUTED }}>{eur(order.btw_cents)}</Text>
          </View>
        </View>

        {/* Betaling */}
        <View style={s.payNote}>
          {order.status === 'paid' ? (
            <Text>
              Voldaan{order.betaalmethode ? ` via ${order.betaalmethode}` : ''}
              {order.paid_at ? ` op ${datum(order.paid_at)}` : ''}. Bedankt voor je bestelling.
            </Text>
          ) : (
            <Text>
              Te voldoen: {eur(order.total_cents)} op {COMPANY.iban} ({COMPANY.bank}) t.n.v. {COMPANY.merk},
              o.v.v. {order.order_number}.
            </Text>
          )}
        </View>

        {/* Voettekst */}
        <View style={s.footer} fixed>
          <Text style={s.footerSmall}>{COMPANY.voorwaarden}</Text>
          <Text style={[s.footerSmall, { marginTop: 3 }]}>
            {COMPANY.merk} ({COMPANY.onderdeelVan}) · {COMPANY.adres}, {COMPANY.postcode} {COMPANY.plaats} ·
            {' '}KvK {COMPANY.kvk} · BTW {COMPANY.btw} · {COMPANY.iban}
          </Text>
        </View>
      </Page>
    </Document>
  )
}

export async function renderFactuur(
  order: OrderRow,
  items: OrderItemRow[],
  invoiceNumber: string,
): Promise<Uint8Array> {
  const buf = await renderToBuffer(<FactuurDoc order={order} items={items} invoiceNumber={invoiceNumber} />)
  const out = new Uint8Array(buf.length)
  out.set(buf)
  return out
}
