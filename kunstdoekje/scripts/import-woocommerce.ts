/**
 * Importeer een WooCommerce product-CSV-export naar Supabase (tabel `artworks`).
 *
 * Gebruik:
 *   1. WordPress admin -> Producten -> Exporteren -> CSV downloaden
 *   2. Leg het bestand neer als kunstdoekje/data/woocommerce-products.csv
 *      (of geef een pad mee als argument)
 *   3. npm run import:woo -- ./data/woocommerce-products.csv
 *
 * Idempotent: matcht op woo_id, dus opnieuw draaien werkt een bestaand artwork bij.
 *
 * Belangrijk over prijzen:
 *   In het Kunstdoekje-model bepaalt het FORMAAT de prijs, niet de print. Dit
 *   script importeert dus alleen de PRINTS (titel, beeld, categorie, tags). De
 *   formaat-/stofprijzen staan in supabase/seed.sql en beheer je los. De Woo-
 *   prijzen worden wel gelogd zodat je de formaatprijzen kunt kalibreren.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'csv-parse/sync'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })
dotenv.config() // fallback .env

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY moeten in .env(.local) staan')
  process.exit(1)
}
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

// ─── Helpers ─────────────────────────────────────────────────────────────────
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/** Pak de eerste niet-lege waarde uit meerdere mogelijke kolomnamen. */
function pick(row: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k] ?? row[k.toLowerCase()] ?? row[k.toUpperCase()]
    if (v && v.trim()) return v.trim()
  }
  return ''
}

function splitList(v: string): string[] {
  if (!v) return []
  // WooCommerce scheidt met komma's; categorieën kunnen "Parent > Child" zijn
  return v.split(',').map((x) => x.trim()).filter(Boolean)
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const path = process.argv[2] ?? './data/woocommerce-products.csv'
  const csvRaw = readFileSync(resolve(process.cwd(), path), 'utf8')
  const rows: Record<string, string>[] = parse(csvRaw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
  })

  console.log(`📄 ${rows.length} rijen gelezen uit ${path}`)

  // Bestaande categorieën ophalen om op naam/slug te matchen
  const { data: cats } = await supabase.from('categories').select('id, slug, naam')
  const catBySlug = new Map((cats ?? []).map((c) => [c.slug, c.id as string]))

  let created = 0, updated = 0, skipped = 0
  const priceSamples: number[] = []

  for (const row of rows) {
    const type = pick(row, ['Type', 'type']).toLowerCase()
    // Sla variaties over — die zijn formaat/stof, geen aparte print
    if (type === 'variation') { skipped++; continue }

    const titel = pick(row, ['Name', 'Title', 'post_title'])
    if (!titel) { skipped++; continue }

    const published = pick(row, ['Published', 'post_status'])
    const isActive = published === '' || published === '1' || published.toLowerCase() === 'publish'

    const wooIdRaw = pick(row, ['ID', 'id', 'post_id'])
    const wooId = wooIdRaw ? parseInt(wooIdRaw, 10) : null

    const images = splitList(pick(row, ['Images', 'Image URL', 'image']))
    const imageUrl = images[0] ?? ''
    if (!imageUrl) { skipped++; continue } // zonder beeld geen artwork

    const tags = splitList(pick(row, ['Tags', 'tags', 'product_tag']))
    const catNames = splitList(pick(row, ['Categories', 'categories', 'product_cat']))
      .map((c) => c.split('>').pop()!.trim()) // alleen het diepste niveau

    let categoryId: string | null = null
    for (const name of catNames) {
      const id = catBySlug.get(slugify(name))
      if (id) { categoryId = id; break }
    }

    const priceRaw = pick(row, ['Regular price', 'Sale price', 'price'])
    const price = priceRaw ? parseFloat(priceRaw.replace(',', '.')) : NaN
    if (!Number.isNaN(price)) priceSamples.push(price)

    const slug = slugify(pick(row, ['Slug', 'post_name']) || titel)
    const beschrijving =
      pick(row, ['Short description', 'Description', 'post_excerpt', 'post_content']) || null

    const record = {
      slug,
      titel,
      beschrijving,
      image_url: imageUrl,
      thumb_url: images[1] ?? null,
      tags,
      category_id: categoryId,
      is_active: isActive,
      is_featured: pick(row, ['Is featured?', 'featured']) === '1',
      woo_id: wooId,
      woo_sku: pick(row, ['SKU', 'sku']) || null,
    }

    // Upsert op woo_id indien aanwezig, anders op slug
    const conflictKey = wooId ? 'woo_id' : 'slug'
    const { error, data } = await supabase
      .from('artworks')
      .upsert(record, { onConflict: conflictKey, ignoreDuplicates: false })
      .select('id')
      .maybeSingle()

    if (error) {
      console.warn(`⚠️  "${titel}": ${error.message}`)
      skipped++
    } else if (data) {
      // upsert geeft niet of het insert/update was; tel grof
      created++
    } else {
      updated++
    }
  }

  console.log(`\n✅ Klaar: ~${created} verwerkt, ${updated} bijgewerkt, ${skipped} overgeslagen`)
  if (priceSamples.length) {
    const uniq = [...new Set(priceSamples)].sort((a, b) => a - b)
    console.log(`\n💶 Woo-prijzen aangetroffen (om formaatprijzen te kalibreren):`)
    console.log(`   ${uniq.map((p) => '€' + p.toFixed(2)).join(', ')}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
