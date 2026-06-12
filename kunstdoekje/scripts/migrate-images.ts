/**
 * Migreer alle artwork-afbeeldingen van de oude WordPress-site naar
 * Supabase Storage, en werk artworks.image_url bij.
 *
 * Gebruik (lokaal, met .env.local ingevuld):
 *   npm run migrate:images
 *
 * - Idempotent: artworks waarvan image_url al naar *.supabase.co wijst
 *   worden overgeslagen. Veilig om opnieuw te draaien na een onderbreking.
 * - Maakt automatisch de (publieke) bucket 'artworks' aan als die ontbreekt.
 * - Beperkte parallelliteit zodat de oude server niet overbelast raakt.
 */
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
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
const RETRIES = 3

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

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets()
  if (!buckets?.some((b) => b.name === BUCKET)) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true })
    if (error) throw new Error(`Bucket aanmaken mislukt: ${error.message}`)
    console.log(`🪣 Bucket '${BUCKET}' aangemaakt (public)`)
  }
}

async function migrateOne(art: { id: string; slug: string; image_url: string }): Promise<'ok' | 'skip' | 'fail'> {
  if (art.image_url.includes('.supabase.co/')) return 'skip'

  try {
    const ext = extFromUrl(art.image_url)
    const path = `${art.slug}.${ext}`
    const bytes = Buffer.from(await fetchWithRetry(art.image_url))

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: contentTypeFor(ext), upsert: true })
    if (upErr) throw new Error(upErr.message)

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
    const { error: dbErr } = await supabase
      .from('artworks')
      .update({ image_url: pub.publicUrl })
      .eq('id', art.id)
    if (dbErr) throw new Error(dbErr.message)

    return 'ok'
  } catch (e) {
    console.warn(`⚠️  ${art.slug}: ${e instanceof Error ? e.message : e}`)
    return 'fail'
  }
}

async function main() {
  await ensureBucket()

  // Gepagineerd ophalen — Supabase geeft max 1000 rijen per query terug
  const artworks: { id: string; slug: string; image_url: string }[] = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('artworks')
      .select('id, slug, image_url')
      .order('id')
      .range(from, from + PAGE - 1)
    if (error) {
      console.error('❌ Artworks laden mislukt:', error.message)
      process.exit(1)
    }
    artworks.push(...(data ?? []))
    if (!data || data.length < PAGE) break
  }

  const todo = artworks.filter((a) => !a.image_url.includes('.supabase.co/'))
  console.log(`📦 ${artworks.length} artworks, ${todo.length} te migreren (rest al in Supabase)`)

  let ok = 0, fail = 0, done = 0
  // Simpele worker-pool
  const queue = [...todo]
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) {
        const art = queue.shift()!
        const res = await migrateOne(art)
        if (res === 'ok') ok++
        else if (res === 'fail') fail++
        done++
        if (done % 25 === 0) console.log(`   … ${done}/${todo.length} verwerkt`)
      }
    }),
  )

  console.log(`\n✅ Klaar: ${ok} gemigreerd, ${fail} mislukt.`)
  if (fail > 0) console.log('   Draai het script opnieuw om mislukte items nogmaals te proberen.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
