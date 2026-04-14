import { useCallback, useRef, useState } from 'react'
import { useLocalStorage } from './useLocalStorage'

export type DashboardWidgetId =
  | 'statistieken' | 'activiteit' | 'planning' | 'taken'
  | 'offertes' | 'weer' | 'montage' | 'visualizer'
  | 'kalender' | 'te_factureren'
  | 'klok' | 'notities' | 'inbox' | 'nieuws'

/** Number of grid columns a widget spans (1–4) */
export type WidgetSize = 1 | 2 | 3 | 4

export interface DashboardLayoutState {
  order: DashboardWidgetId[]
  hidden: DashboardWidgetId[]
  sizes: Partial<Record<DashboardWidgetId, WidgetSize>>
}

const ALL_WIDGETS: DashboardWidgetId[] = [
  'statistieken', 'activiteit', 'planning', 'taken',
  'offertes', 'weer', 'montage', 'visualizer',
  'kalender', 'te_factureren',
  'klok', 'notities', 'inbox', 'nieuws',
]

const DEFAULT_ORDER: DashboardWidgetId[] = [
  'statistieken',
  'planning', 'taken',
  'montage', 'weer',
  'te_factureren', 'kalender', 'klok',
  'activiteit', 'offertes',
]

const DEFAULT_HIDDEN: DashboardWidgetId[] = [
  'visualizer', 'notities', 'inbox', 'nieuws',
]

const DEFAULT_SIZES: Partial<Record<DashboardWidgetId, WidgetSize>> = {
  statistieken: 4,
  planning: 2,
  taken: 2,
  montage: 3,
  weer: 1,
  te_factureren: 2,
  kalender: 1,
  klok: 1,
  activiteit: 2,
  offertes: 2,
}

const DEFAULT_STATE: DashboardLayoutState = {
  order: DEFAULT_ORDER,
  hidden: DEFAULT_HIDDEN,
  sizes: DEFAULT_SIZES,
}

/** Migrate old string-based sizes ('small'/'medium'/'large') to numeric (1/2/3) */
function migrateSizes(sizes: Record<string, unknown>): Partial<Record<DashboardWidgetId, WidgetSize>> {
  const migrated: Partial<Record<DashboardWidgetId, WidgetSize>> = {}
  for (const [key, val] of Object.entries(sizes)) {
    if (typeof val === 'number' && val >= 1 && val <= 4) {
      migrated[key as DashboardWidgetId] = val as WidgetSize
    } else if (typeof val === 'string') {
      migrated[key as DashboardWidgetId] = val === 'large' ? 3 : val === 'medium' ? 2 : 1
    }
  }
  return migrated
}

export function useDashboardLayout() {
  const [layout, setLayout] = useLocalStorage<DashboardLayoutState>('forgedesk-dashboard-layout', DEFAULT_STATE)

  // Migrate old string sizes on read
  const migratedSizes = layout.sizes ? migrateSizes(layout.sizes as Record<string, unknown>) : {}

  const [draggedWidget, setDraggedWidget] = useState<DashboardWidgetId | null>(null)
  const [dragOverWidget, setDragOverWidget] = useState<DashboardWidgetId | null>(null)
  const dragCounter = useRef(0)

  // Ensure all active widgets exist in order
  const order = (() => {
    const existing = layout.order.filter(id => ALL_WIDGETS.includes(id) && !layout.hidden.includes(id))
    const missing = ALL_WIDGETS.filter(id => !existing.includes(id) && !layout.hidden.includes(id))
    return [...existing, ...missing]
  })()

  const hidden = new Set(layout.hidden)

  const toggleWidget = useCallback((id: DashboardWidgetId) => {
    setLayout(prev => {
      const isHidden = prev.hidden.includes(id)
      if (isHidden) {
        return {
          ...prev,
          order: [...prev.order, id],
          hidden: prev.hidden.filter(h => h !== id),
        }
      } else {
        return {
          ...prev,
          order: prev.order.filter(o => o !== id),
          hidden: [...prev.hidden, id],
        }
      }
    })
  }, [setLayout])

  const resizeWidget = useCallback((id: DashboardWidgetId, size: WidgetSize) => {
    setLayout(prev => ({
      ...prev,
      sizes: { ...prev.sizes, [id]: size },
    }))
  }, [setLayout])

  const resetLayout = useCallback(() => {
    setLayout(DEFAULT_STATE)
  }, [setLayout])

  const handleDragStart = useCallback((e: React.DragEvent, id: DashboardWidgetId) => {
    setDraggedWidget(id)
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedWidget(null)
    setDragOverWidget(null)
    dragCounter.current = 0
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent, id: DashboardWidgetId) => {
    e.preventDefault()
    dragCounter.current++
    setDragOverWidget(id)
  }, [])

  const handleDragLeave = useCallback(() => {
    dragCounter.current--
    if (dragCounter.current <= 0) {
      setDragOverWidget(null)
      dragCounter.current = 0
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetId: DashboardWidgetId) => {
    e.preventDefault()
    const sourceId = e.dataTransfer.getData('text/plain') as DashboardWidgetId
    if (!sourceId || sourceId === targetId) {
      setDraggedWidget(null)
      setDragOverWidget(null)
      dragCounter.current = 0
      return
    }

    setLayout(prev => {
      const currentOrder = [...prev.order]
      for (const id of ALL_WIDGETS) {
        if (!currentOrder.includes(id) && !prev.hidden.includes(id)) currentOrder.push(id)
      }
      const sourceIdx = currentOrder.indexOf(sourceId)
      const targetIdx = currentOrder.indexOf(targetId)
      if (sourceIdx === -1 || targetIdx === -1) return prev

      currentOrder.splice(sourceIdx, 1)
      currentOrder.splice(targetIdx, 0, sourceId)
      return { ...prev, order: currentOrder }
    })

    setDraggedWidget(null)
    setDragOverWidget(null)
    dragCounter.current = 0
  }, [setLayout])

  return {
    order,
    hidden,
    sizes: migratedSizes,
    allWidgets: ALL_WIDGETS,
    draggedWidget,
    dragOverWidget,
    toggleWidget,
    resizeWidget,
    resetLayout,
    handleDragStart,
    handleDragEnd,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  }
}
