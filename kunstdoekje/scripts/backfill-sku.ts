/**
 * Vul artworks.woo_sku vanuit de WooCommerce-export (match op woo_id).
 * Onder dit productnummer liggen de printbestanden opgeslagen.
 *
 * Vereist:
 *   - supabase/sku.sql is gedraaid (kolom sku bestaat)
 *   - data/woocommerce-products.csv
 *
 * Gebruik: npm run backfill:sku
 * Idempotent: werkt alleen artworks bij waarvan de sku afwijkt of ontbreekt.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { parse } from 'csv-parse/sync'
import * as dotenv from 'dotenv'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })
dotenv.config()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY moeten in .env.local staan')
  process.exit(1)
}
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

const CSV_PATH = process.argv[2] ?? './data/woocommerce-products.csv'

async function main() {
  const rows: Record<string, string>[] = parse(readFileSync(resolve(process.cwd(), CSV_PATH), 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
  })
  const skuByWooId = new Map<string, string>()
  for (const r of rows) {
    const sku = (r.SKU ?? '').trim()
    if (r.ID && sku) skuByWooId.set(String(r.ID), sku)
  }
  console.log(`📄 ${rows.length} CSV-rijen, ${skuByWooId.size} met SKU`)

  // PostgREST geeft max. 1000 rijen per request; pagineer
  const artworks: { id: string; slug: string; woo_id: number | null; woo_sku: string | null }[] = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('artworks')
      .select('id, slug, woo_id, woo_sku')
      .order('id')
      .range(from, from + PAGE - 1)
    if (error || !data) throw new Error(`Artworks laden mislukt: ${error?.message}`)
    artworks.push(...(data as typeof artworks))
    if (data.length < PAGE) break
  }

  const todo = artworks
    .map((a) => ({ a, sku: skuByWooId.get(String(a.woo_id)) }))
    .filter((t): t is { a: (typeof artworks)[number]; sku: string } => !!t.sku && t.sku !== t.a.woo_sku)
  console.log(`📦 ${artworks.length} artworks, ${todo.length} bij te werken`)

  let ok = 0, fail = 0
  for (const { a, sku } of todo) {
    const { error } = await supabase.from('artworks').update({ woo_sku: sku }).eq('id', a.id)
    if (error) {
      console.warn(`⚠️  ${a.slug}: ${error.message}`)
      fail++
    } else ok++
    if ((ok + fail) % 100 === 0) console.log(`   … ${ok + fail}/${todo.length}`)
  }
  console.log(`\n✅ Klaar: ${ok} bijgewerkt, ${fail} mislukt.`)

  const zonder = artworks.filter((a) => !skuByWooId.get(String(a.woo_id)) && !a.woo_sku).length
  if (zonder) console.log(`ℹ️  ${zonder} artworks hebben geen SKU in de bron (ook niet in WooCommerce).`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
