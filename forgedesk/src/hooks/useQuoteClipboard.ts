import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { safeSetItem } from '@/utils/localStorageUtils'
import type { QuoteLineItem } from '@/components/quotes/QuoteItemsTable'

const CLIPBOARD_KEY = 'doen_clipboard_items'

export function useQuoteClipboard(
  items: QuoteLineItem[],
  setItems: React.Dispatch<React.SetStateAction<QuoteLineItem[]>>
) {
  const [clipboardCount, setClipboardCount] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(CLIPBOARD_KEY) || '[]').length
    } catch (err) { return 0 }
  })

  const handleCopyItem = useCallback((item: QuoteLineItem) => {
    try {
      const existing = JSON.parse(localStorage.getItem(CLIPBOARD_KEY) || '[]')
      const { id, ...template } = item
      const updated = [...existing.slice(-49), template]
      if (!safeSetItem(CLIPBOARD_KEY, JSON.stringify(updated))) {
        toast.error('Onvoldoende opslagruimte voor klembord')
        return
      }
      setClipboardCount(updated.length)
      toast.success('Item gekopieerd naar klembord')
    } catch (err) {
      toast.error('Kon item niet kopiëren')
    }
  }, [])

  const handlePasteItems = useCallback(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(CLIPBOARD_KEY) || '[]')
      if (stored.length === 0) return

      const pastedItems: QuoteLineItem[] = stored.map((template: Omit<QuoteLineItem, 'id'>) => ({
        ...template,
        id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      }))

      setItems(prev => [...prev, ...pastedItems])
      localStorage.removeItem(CLIPBOARD_KEY)
      setClipboardCount(0)
      toast.success(`${pastedItems.length} item${pastedItems.length === 1 ? '' : 's'} geplakt`)
    } catch (err) {
      toast.error('Kon items niet plakken')
    }
  }, [setItems])

  const handleCopyAllItems = useCallback(() => {
    try {
      const pricedItems = items.filter(i => i.soort === 'prijs' && i.beschrijving.trim())
      if (pricedItems.length === 0) {
        toast.error('Geen items om te kopiëren')
        return
      }
      const templates = pricedItems.map(({ id, ...rest }) => rest)
      if (!safeSetItem(CLIPBOARD_KEY, JSON.stringify(templates))) {
        toast.error('Onvoldoende opslagruimte voor klembord')
        return
      }
      setClipboardCount(templates.length)
      toast.success(`${templates.length} item${templates.length === 1 ? '' : 's'} gekopieerd naar klembord`)
    } catch (err) {
      toast.error('Kon items niet kopiëren')
    }
  }, [items])

  const handleClearClipboard = useCallback(() => {
    localStorage.removeItem(CLIPBOARD_KEY)
    setClipboardCount(0)
    toast.success('Klembord geleegd')
  }, [])

  return {
    clipboardCount,
    handleCopyItem,
    handlePasteItems,
    handleCopyAllItems,
    handleClearClipboard,
  }
}
