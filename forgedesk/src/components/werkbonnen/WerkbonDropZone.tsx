import React, { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface WerkbonDropZoneProps {
  itemId: string
  onFilesDropped: (itemId: string, files: File[]) => void | Promise<void>
  children?: React.ReactNode
  className?: string
  disabled?: boolean
}

export const WerkbonDropZone = React.memo(function WerkbonDropZone({
  itemId,
  onFilesDropped,
  children,
  className,
  disabled = false,
}: WerkbonDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    setIsDragOver(true)
  }, [disabled])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    if (!isDragOver) setIsDragOver(true)
  }, [disabled, isDragOver])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return
    const related = e.relatedTarget as Node | null
    if (related && e.currentTarget.contains(related)) return
    setIsDragOver(false)
  }, [disabled])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith('image/'))
    if (files.length === 0) return
    void onFilesDropped(itemId, files)
  }, [disabled, itemId, onFilesDropped])

  return (
    <div
      className={cn('relative rounded-xl transition-colors duration-150', className)}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      {isDragOver && !disabled && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-xl"
          style={{
            border: '2px dashed #F15025',
            backgroundColor: 'rgba(248, 247, 245, 0.5)',
          }}
        />
      )}
    </div>
  )
})
