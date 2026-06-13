'use client'

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Fabric, Format, FrameColor } from '@/lib/types'

/**
 * Gedeelde keuzestaat voor de productpagina. De interieur-preview én de
 * configurator lezen en schrijven hetzelfde formaat, dezelfde stof en
 * framekleur · zo reageert het beeld live op elke keuze.
 */
interface ProductConfig {
  formats: Format[] // alleen standaardformaten (maatwerk valt buiten de config)
  fabrics: Fabric[]
  frameColors: FrameColor[]
  formatId: string
  fabricId: string
  frameColorId: string
  metLijst: boolean
  setFormatId: (id: string) => void
  setFabricId: (id: string) => void
  setFrameColorId: (id: string) => void
  setMetLijst: (v: boolean) => void
  format?: Format
  fabric?: Fabric
  frameColor?: FrameColor
}

const Ctx = createContext<ProductConfig | null>(null)

export function ProductConfigProvider({
  formats,
  fabrics,
  frameColors,
  children,
}: {
  formats: Format[]
  fabrics: Fabric[]
  frameColors: FrameColor[]
  children: ReactNode
}) {
  const standaardFormats = useMemo(() => formats.filter((f) => !f.is_maatwerk), [formats])

  const [formatId, setFormatId] = useState(standaardFormats[0]?.id ?? '')
  const [fabricId, setFabricId] = useState(fabrics[0]?.id ?? '')
  const [frameColorId, setFrameColorId] = useState(frameColors[0]?.id ?? '')
  const [metLijst, setMetLijst] = useState(true)

  const value = useMemo<ProductConfig>(
    () => ({
      formats: standaardFormats,
      fabrics,
      frameColors,
      formatId,
      fabricId,
      frameColorId,
      metLijst,
      setFormatId,
      setFabricId,
      setFrameColorId,
      setMetLijst,
      format: standaardFormats.find((f) => f.id === formatId),
      fabric: fabrics.find((f) => f.id === fabricId),
      frameColor: frameColors.find((f) => f.id === frameColorId),
    }),
    [standaardFormats, fabrics, frameColors, formatId, fabricId, frameColorId, metLijst],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useProductConfig() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useProductConfig moet binnen <ProductConfigProvider> gebruikt worden')
  return ctx
}
