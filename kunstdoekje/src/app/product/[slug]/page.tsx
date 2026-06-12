import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Configurator from '@/components/Configurator'
import { getArtworkBySlug, getFabrics, getFormats, getFrameColors } from '@/lib/catalog'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  try {
    const art = await getArtworkBySlug(params.slug)
    if (art) {
      return {
        title: `${art.titel} — Kunstdoekje`,
        description: art.beschrijving ?? `${art.titel} als wisselbaar kunstdoek op luxe stof.`,
        openGraph: { images: [art.image_url] },
      }
    }
  } catch { /* noop */ }
  return { title: 'Kunstdoek — Kunstdoekje' }
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  let artwork = null
  let formats, fabrics, frameColors
  try {
    ;[artwork, formats, fabrics, frameColors] = await Promise.all([
      getArtworkBySlug(params.slug),
      getFormats(),
      getFabrics(),
      getFrameColors(),
    ])
  } catch {
    notFound()
  }
  if (!artwork || !formats || !fabrics || !frameColors) notFound()

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/shop" className="text-sm text-ink/50 hover:text-ink">← Terug naar de collectie</Link>

      <div className="mt-6 grid gap-10 md:grid-cols-2">
        {/* Beeld */}
        <div className="space-y-4">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-black/5">
            <Image
              src={artwork.image_url}
              alt={artwork.titel}
              fill
              priority
              sizes="(max-width:768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <p className="text-xs text-ink/50">
            Voorbeeld in lijst. De werkelijke kleurweergave is afhankelijk van je stofkeuze.
          </p>
        </div>

        {/* Configuratie */}
        <div>
          <h1 className="font-serif text-3xl md:text-4xl">{artwork.titel}</h1>
          {artwork.kunstenaar && (
            <p className="mt-1 text-sm text-ink/60">door {artwork.kunstenaar}</p>
          )}
          {artwork.beschrijving && (
            <p className="mt-4 text-ink/70">{artwork.beschrijving}</p>
          )}

          <div className="mt-8">
            <Configurator
              artwork={artwork}
              formats={formats}
              fabrics={fabrics}
              frameColors={frameColors}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
