import { useCallback, useRef, useState } from 'react'
import { useLocalStorage } from './useLocalStorage'

export type SidebarSectionId = 'klant' | 'factureren' | 'samenvatting' | 'inkoop'

export interface SidebarLayoutState {
  order: SidebarSectionId[]
  pinned: SidebarSectionId[]  // pinned sections stick to top
}

const DEFAULT_ORDER: SidebarSectionId[] = ['klant', 'factureren', 'samenvatting', 'inkoop']

const DEFAULT_STATE: SidebarLayoutState = {
  order: DEFAULT_ORDER,
  pinned: [],
}

export function useSidebarLayout() {
  const [layout, setLayout] = useLocalStorage<SidebarLayoutState>('forgedesk-sidebar-layout', DEFAULT_STATE)

  // Drag state
  const [draggedSection, setDraggedSection] = useState<SidebarSectionId | null>(null)
  const [dragOverSection, setDragOverSection] = useState<SidebarSectionId | null>(null)
  const dragCounter = useRef(0)

  // Ensure all sections exist in order (in case new ones were added)
  const order = (() => {
    const existing = layout.order.filter(id => DEFAULT_ORDER.includes(id))
    const missing = DEFAULT_ORDER.filter(id => !existing.includes(id))
    return [...existing, ...missing]
  })()

  const pinned = new Set(layout.pinned)

  const togglePin = useCallback((id: SidebarSectionId) => {
    setLayout(prev => {
      const pins = new Set(prev.pinned)
      if (pins.has(id)) pins.delete(id)
      else pins.add(id)
      return { ...prev, pinned: [...pins] }
    })
  }, [setLayout])

  const handleDragStart = useCallback((e: React.DragEvent, id: SidebarSectionId) => {
    setDraggedSection(id)
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedSection(null)
    setDragOverSection(null)
    dragCounter.current = 0
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent, id: SidebarSectionId) => {
    e.preventDefault()
    dragCounter.current++
    setDragOverSection(id)
  }, [])

  const handleDragLeave = useCallback(() => {
    dragCounter.current--
    if (dragCounter.current <= 0) {
      setDragOverSection(null)
      dragCounter.current = 0
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetId: SidebarSectionId) => {
    e.preventDefault()
    const sourceId = e.dataTransfer.getData('text/plain') as SidebarSectionId
    if (!sourceId || sourceId === targetId) {
      setDraggedSection(null)
      setDragOverSection(null)
      dragCounter.current = 0
      return
    }

    setLayout(prev => {
      const currentOrder = [...prev.order]
      // Ensure all sections exist
      for (const id of DEFAULT_ORDER) {
        if (!currentOrder.includes(id)) currentOrder.push(id)
      }
      const sourceIdx = currentOrder.indexOf(sourceId)
      const targetIdx = currentOrder.indexOf(targetId)
      if (sourceIdx === -1 || targetIdx === -1) return prev

      currentOrder.splice(sourceIdx, 1)
      currentOrder.splice(targetIdx, 0, sourceId)
      return { ...prev, order: currentOrder }
    })

    setDraggedSection(null)
    setDragOverSection(null)
    dragCounter.current = 0
  }, [setLayout])

  const moveSection = useCallback((id: SidebarSectionId, direction: 'up' | 'down') => {
    setLayout(prev => {
      const currentOrder = [...prev.order]
      const idx = currentOrder.indexOf(id)
      if (idx === -1) return prev
      if (direction === 'up' && idx === 0) return prev
      if (direction === 'down' && idx === currentOrder.length - 1) return prev
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1
      ;[currentOrder[idx], currentOrder[targetIdx]] = [currentOrder[targetIdx], currentOrder[idx]]
      return { ...prev, order: currentOrder }
    })
  }, [setLayout])

  return {
    order,
    pinned,
    draggedSection,
    dragOverSection,
    togglePin,
    moveSection,
    handleDragStart,
    handleDragEnd,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  }
}
