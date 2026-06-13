'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { COMBIDEAL_PCT, combidealUnitCents } from '@/lib/pricing'

// Eén geconfigureerde regel in de winkelwagen. We bewaren genoeg om de cart te
// tonen zonder opnieuw te laden; bij checkout sturen we alleen de *_id velden
// + metLijst/aantal, en herberekent de server de prijs (bron van waarheid).
export interface CartItem {
  lineId: string
  artworkId?: string
  customUploadId?: string
  artworkTitel: string
  artworkImage: string | null
  formatId: string
  formatLabel: string
  fabricId: string
  fabricLabel: string
  frameColorId: string
  frameColorLabel: string
  metLijst: boolean
  aantal: number
  unitPriceCents: number
  /** Los frame (aluminium wissellijst) zonder doek. */
  frameOnly?: boolean
}

interface CartContextValue {
  items: CartItem[]
  add: (item: Omit<CartItem, 'lineId'>) => void
  remove: (lineId: string) => void
  setAantal: (lineId: string, aantal: number) => void
  clear: () => void
  count: number
  subtotalCents: number
  /** True zodra er een compleet doek (met lijst) in de wagen ligt → combideal actief. */
  heeftFrame: boolean
  /** Totale combideal-korting (alleen weergave; server herberekent bij checkout). */
  kortingCents: number
  /** Effectieve stuksprijs van een regel, inclusief eventuele combideal-korting. */
  effectiveUnitCents: (item: CartItem) => number
}

const CartContext = createContext<CartContextValue | null>(null)
const STORAGE_KEY = 'kunstdoekje_cart_v1'

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  // Laden uit localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setItems(JSON.parse(raw))
    } catch { /* noop */ }
    setHydrated(true)
  }, [])

  // Opslaan
  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items, hydrated])

  const add = useCallback((item: Omit<CartItem, 'lineId'>) => {
    setItems((prev) => [...prev, { ...item, lineId: crypto.randomUUID() }])
  }, [])

  const remove = useCallback((lineId: string) => {
    setItems((prev) => prev.filter((i) => i.lineId !== lineId))
  }, [])

  const setAantal = useCallback((lineId: string, aantal: number) => {
    setItems((prev) =>
      prev.map((i) => (i.lineId === lineId ? { ...i, aantal: Math.max(1, aantal) } : i)),
    )
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const count = items.reduce((sum, i) => sum + i.aantal, 0)
  // Alleen een compleet kunstdoekje (doek mét lijst) zet de combideal aan · een los frame niet.
  const heeftFrame = items.some((i) => i.metLijst && !i.frameOnly)

  // Zelfde combideal-regel als priceOrder (server blijft bron van waarheid)
  const effectiveUnitCents = useCallback(
    (item: CartItem) =>
      heeftFrame && !item.metLijst ? combidealUnitCents(item.unitPriceCents) : item.unitPriceCents,
    [heeftFrame],
  )

  const brutoCents = items.reduce((sum, i) => sum + i.unitPriceCents * i.aantal, 0)
  const subtotalCents = items.reduce((sum, i) => sum + effectiveUnitCents(i) * i.aantal, 0)
  const kortingCents = brutoCents - subtotalCents

  return (
    <CartContext.Provider
      value={{ items, add, remove, setAantal, clear, count, subtotalCents, heeftFrame, kortingCents, effectiveUnitCents }}
    >
      {children}
    </CartContext.Provider>
  )
}

export { COMBIDEAL_PCT }

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart moet binnen <CartProvider> gebruikt worden')
  return ctx
}
