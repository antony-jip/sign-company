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

export async function getArtworks(opts: { categorySlug?: string; limit?: number; featured?: boolean } = {}): Promise<Artwork[]> {
  let q = supabasePublic().from('artworks').select('*').eq('is_active', true)
  if (opts.featured) q = q.eq('is_featured', true)
  if (opts.limit) q = q.limit(opts.limit)
  const { data, error } = await q.order('sort')
  if (error) throw error
  let rows = data as Artwork[]
  if (opts.categorySlug) {
    const cats = await getCategories()
    const cat = cats.find((c) => c.slug === opts.categorySlug)
    rows = cat ? rows.filter((r) => r.category_id === cat.id) : []
  }
  return rows
}

export async function getArtworkBySlug(slug: string): Promise<Artwork | null> {
  const { data, error } = await supabasePublic()
    .from('artworks').select('*').eq('slug', slug).eq('is_active', true).maybeSingle()
  if (error) throw error
  return (data as Artwork) ?? null
}
