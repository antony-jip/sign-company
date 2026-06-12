/**
 * Migreer de sfeerfoto's (gallery-afbeeldingen) uit de WooCommerce-export
 * naar Supabase Storage en vul artworks.gallery_urls.
 *
 * Vereist:
 *   - supabase/gallery.sql is gedraaid (kolom gallery_urls bestaat)
 *   - data/woocommerce-products.csv (WordPress admin -> Producten -> Exporteren)
 *
 * Gebruik (lokaal, met .env.local ingevuld):
 *   npm run migrate:gallery
 *
 * - Match op artworks.woo_id; de eerste afbeelding per product is het
 *   hoofdbeeld en wordt overgeslagen, de rest zijn sfeerfoto's.
 * - Idempotent: artworks waarvan gallery_urls al compleet is worden
 *   overgeslagen. Veilig om opnieuw te draaien na een onderbreking.
 * - Beperkte parallelliteit zodat de oude server niet overbelast raakt.
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

const BUCKET = 'artworks'
const CONCURRENCY = 4
const RETRIES = 6
const CSV_PATH = process.argv[2] ?? './data/woocommerce-products.csv'

function extFromUrl(u: string): string {
  const m = u.split('?')[0].match(/\.(jpe?g|png|webp|gif|avif)$/i)
  return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'jpg'
}

function contentTypeFor(ext: string): string {
  return { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif' }[ext] ?? 'image/jpeg'
}

async function fetchWithRetry(u: string): Promise<ArrayBuffer> {
  let lastErr: unknown
  for (let i = 0; i < RETRIES; i++) {
    try {
      const res = await fetch(u, {
        headers: { 'User-Agent': 'Mozilla/5.0 (kunstdoekje-migratie)' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.arrayBuffer()
    } catch (e) {
      lastErr = e
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)))
    }
  }
  throw lastErr
}

type Art = { id: string; slug: string; woo_id: number | null; gallery_urls: string[] }

async function loadArtworks(): Promise<Art[]> {
  // PostgREST geeft max. 1000 rijen per request; pagineer zodat alle artworks meegaan
  const all: Art[] = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('artworks')
      .select('id, slug, woo_id, gallery_urls')
      .order('sort')
      .order('id')
      .range(from, from + PAGE - 1)
    if (error || !data) throw new Error(`Artworks laden mislukt: ${error?.message}`)
    all.push(...(data as Art[]))
    if (data.length < PAGE) break
  }
  return all
}

async function migrateOne(art: Art, sources: string[]): Promise<'ok' | 'skip' | 'fail'> {
  if (art.gallery_urls.length >= sources.length) return 'skip'

  try {
    const urls: string[] = []
    for (let i = 0; i < sources.length; i++) {
      const src = sources[i]
      const ext = extFromUrl(src)
      const path = `${art.slug}-sfeer-${i + 1}.${ext}`
      const bytes = Buffer.from(await fetchWithRetry(src))

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, bytes, { contentType: contentTypeFor(ext), upsert: true })
      if (upErr) throw new Error(upErr.message)

      urls.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl)
    }

    const { error: dbErr } = await supabase
      .from('artworks')
      .update({ gallery_urls: urls })
      .eq('id', art.id)
    if (dbErr) throw new Error(dbErr.message)

    return 'ok'
  } catch (e) {
    console.warn(`⚠️  ${art.slug}: ${e instanceof Error ? e.message : e}`)
    return 'fail'
  }
}

async function main() {
  const rows: Record<string, string>[] = parse(readFileSync(resolve(process.cwd(), CSV_PATH), 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
  })

  // woo_id -> sfeerfoto-URL's (alles na het hoofdbeeld)
  const galleryByWooId = new Map<string, string[]>()
  for (const row of rows) {
    const images = (row.Images ?? '').split(',').map((s) => s.trim()).filter(Boolean)
    if (row.ID && images.length > 1) galleryByWooId.set(String(row.ID), images.slice(1))
  }
  console.log(`📄 ${rows.length} CSV-rijen, ${galleryByWooId.size} producten met sfeerfoto's`)

  const artworks = await loadArtworks()
  const todo = artworks
    .map((a) => ({ art: a, sources: galleryByWooId.get(String(a.woo_id)) ?? [] }))
    .filter(({ art, sources }) => sources.length > art.gallery_urls.length)
  const totaal = todo.reduce((n, t) => n + t.sources.length, 0)
  console.log(`📦 ${artworks.length} artworks, ${todo.length} te migreren (${totaal} sfeerfoto's)`)

  let ok = 0, fail = 0, done = 0
  // Simpele worker-pool
  const queue = [...todo]
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) {
        const { art, sources } = queue.shift()!
        const res = await migrateOne(art, sources)
        if (res === 'ok') ok++
        else if (res === 'fail') fail++
        done++
        if (done % 25 === 0) console.log(`   … ${done}/${todo.length} verwerkt`)
      }
    }),
  )

  console.log(`\n✅ Klaar: ${ok} artworks van sfeerfoto's voorzien, ${fail} mislukt.`)
  if (fail > 0) console.log('   Draai het script opnieuw om mislukte items nogmaals te proberen.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
