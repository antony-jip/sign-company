import { supabaseAdmin, supabasePublic } from './supabase'
import type { Artwork, Category, Fabric, Format, FormatFabricPrice, FrameColor } from './types'
import type { Catalog } from './pricing'
import { priceKey } from './pricing'

type Client = ReturnType<typeof supabaseAdmin>

/**
 * Laadt de prijs-relevante referentiedata (formaten, stoffen, lijstkleuren) +
 * de gevraagde artworks in Maps voor snelle, betrouwbare prijsberekening.
 * Wordt server-side gebruikt door de checkout, met de service-role client.
 */
export async function loadCatalogForLines(
  client: Client,
  artworkIds: string[],
): Promise<Catalog> {
  const [formatsRes, fabricsRes, framesRes, pricesRes, artworksRes] = await Promise.all([
    client.from('formats').select('*'),
    client.from('fabrics').select('*'),
    client.from('frame_colors').select('*'),
    client.from('format_fabric_prices').select('*'),
    artworkIds.length
      ? client.from('artworks').select('*').in('id', artworkIds)
      : Promise.resolve({ data: [] as Artwork[], error: null }),
  ])

  for (const r of [formatsRes, fabricsRes, framesRes, pricesRes, artworksRes]) {
    if (r.error) throw new Error(`Catalogus laden mislukt: ${r.error.message}`)
  }

  const toMap = <T extends { id: string }>(rows: T[] | null) =>
    new Map((rows ?? []).map((r) => [r.id, r]))

  return {
    formats: toMap(formatsRes.data as Format[]),
    fabrics: toMap(fabricsRes.data as Fabric[]),
    frameColors: toMap(framesRes.data as FrameColor[]),
    artworks: toMap(artworksRes.data as Artwork[]),
    prices: new Map(
      ((pricesRes.data ?? []) as FormatFabricPrice[]).map((p) => [
        priceKey(p.format_id, p.fabric_id),
        p,
      ]),
    ),
  }
}

// ─── Publieke read-helpers voor de frontend (anon client) ────────────────────

export async function getFormats(): Promise<Format[]> {
  const { data, error } = await supabasePublic()
    .from('formats').select('*').eq('is_active', true).order('sort')
  if (error) throw error
  return data as Format[]
}

export async function getFabrics(): Promise<Fabric[]> {
  const { data, error } = await supabasePublic()
    .from('fabrics').select('*').eq('is_active', true).order('sort')
  if (error) throw error
  return data as Fabric[]
}

export async function getFrameColors(): Promise<FrameColor[]> {
  const { data, error } = await supabasePublic()
    .from('frame_colors').select('*').eq('is_active', true).order('sort')
  if (error) throw error
  return data as FrameColor[]
}

export async function getPrices(): Promise<FormatFabricPrice[]> {
  const { data, error } = await supabasePublic()
    .from('format_fabric_prices').select('*')
  if (error) throw error
  return data as FormatFabricPrice[]
}

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabasePublic()
    .from('categories').select('*').order('sort')
  if (error) throw error
  return data as Category[]
}

// De bijgesneden doek-crops staan op een vaste URL (crop/<slug>.webp). Na een
// her-crop verandert de inhoud maar niet de URL, dus voegen we een versie toe
// om browser-, CDN- en Next-image-cache te omzeilen. Verhoog bij een her-crop.
const CROP_VER = '3'
function bustThumb<T extends { thumb_url: string | null }>(a: T): T {
  if (a.thumb_url && a.thumb_url.includes('/crop/') && !a.thumb_url.includes('?')) {
    a.thumb_url = `${a.thumb_url}?v=${CROP_VER}`
  }
  return a
}

export async function getArtworks(opts: { categorySlug?: string; limit?: number; featured?: boolean } = {}): Promise<Artwork[]> {
  // PostgREST geeft max. 1000 rijen per request; pagineer zodat de hele catalogus meegaat
  const PAGE = 1000
  let rows: Artwork[] = []
  for (let from = 0; ; from += PAGE) {
    let q = supabasePublic().from('artworks').select('*').eq('is_active', true)
    if (opts.featured) q = q.eq('is_featured', true)
    const { data, error } = await q.order('sort').order('id').range(from, from + PAGE - 1)
    if (error) throw error
    rows.push(...(data as Artwork[]))
    if (data.length < PAGE || (opts.limit && rows.length >= opts.limit)) break
  }
  if (opts.limit) rows = rows.slice(0, opts.limit)
  if (opts.categorySlug) {
    const cats = await getCategories()
    const cat = cats.find((c) => c.slug === opts.categorySlug)
    rows = cat ? rows.filter((r) => r.category_id === cat.id) : []
  }
  return rows.map(bustThumb)
}

export async function getArtworkBySlug(slug: string): Promise<Artwork | null> {
  const { data, error } = await supabasePublic()
    .from('artworks').select('*').eq('slug', slug).eq('is_active', true).maybeSingle()
  if (error) throw error
  return data ? bustThumb(data as Artwork) : null
}
