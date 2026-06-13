'use client'

import Configurator from '@/components/Configurator'
import ProductFaq from '@/components/ProductFaq'
import type { Artwork, Fabric, Format, FormatFabricPrice, FrameColor } from '@/lib/types'
import { ProductConfigProvider } from './ProductConfigContext'
import RoomVisualizer from './RoomVisualizer'
import StoffenStrip from './StoffenStrip'

/**
 * Bundelt de interieur-preview (links) en de configurator (rechts) onder één
 * gedeelde keuzestaat, zodat formaat- en framekleurkeuzes het beeld live
 * updaten.
 */
export default function ProductExperience({
  artwork,
  formats,
  fabrics,
  frameColors,
  prices,
}: {
  artwork: Artwork
  formats: Format[]
  fabrics: Fabric[]
  frameColors: FrameColor[]
  prices: FormatFabricPrice[]
}) {
  const sfeerfotos = artwork.gallery_urls ?? []

  return (
    <ProductConfigProvider formats={formats} fabrics={fabrics} frameColors={frameColors}>
      <div className="grid gap-10 md:grid-cols-2">
        {/* Beeld: interieur-preview + kwaliteit-FAQ */}
        <div className="md:sticky md:top-28 md:h-fit">
          <RoomVisualizer artwork={artwork} sfeerfotos={sfeerfotos} />
          <StoffenStrip />
          <ProductFaq />
        </div>

        {/* Configuratie */}
        <div>
          {artwork.woo_sku && (
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-accent">
              Nº {artwork.woo_sku} · uit de collectie
            </p>
          )}
          <h1 className="mt-1 font-serif text-3xl md:text-4xl">{artwork.titel}</h1>
          {artwork.kunstenaar && <p className="mt-1 text-sm text-ink/60">door {artwork.kunstenaar}</p>}
          {artwork.beschrijving && <p className="mt-4 text-ink/70">{artwork.beschrijving}</p>}

          <div className="mt-8">
            <Configurator artwork={artwork} prices={prices} />
          </div>
        </div>
      </div>
    </ProductConfigProvider>
  )
}
