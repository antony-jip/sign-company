import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  Languages,
  Loader2,
  Copy,
  X,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { callForgie } from '@/services/forgieService'
import { toast } from 'sonner'

interface EmailReaderAIToolbarProps {
  /** Ref to the container element with email body */
  containerRef: React.RefObject<HTMLDivElement | null>
  disabled?: boolean
}

type ReaderAction = 'translate-nl' | 'translate-en' | 'copy'

const ACTIONS: { id: ReaderAction; label: string; icon: React.ElementType }[] = [
  { id: 'translate-nl', label: 'NL', icon: Languages },
  { id: 'translate-en', label: 'EN', icon: Languages },
  { id: 'copy', label: 'Kopieer', icon: Copy },
]

export function EmailReaderAIToolbar({ containerRef, disabled }: EmailReaderAIToolbarProps) {
  const [selectedText, setSelectedText] = useState('')
  const [showToolbar, setShowToolbar] = useState(false)
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0 })
  const [loading, setLoading] = useState(false)
  const [loadingAction, setLoadingAction] = useState<ReaderAction | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
  }, [])

  const hideToolbar = useCallback(() => {
    setShowToolbar(false)
    setSelectedText('')
    setResult(null)
    setLoading(false)
    setLoadingAction(null)
  }, [])

  // Detect text selection in the container
  useEffect(() => {
    const container = containerRef.current
    if (!container || disabled) return

    const handleSelectionChange = () => {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return

      const range = selection.getRangeAt(0)
      const text = selection.toString().trim()

      // Check if selection is inside our container
      if (!container.contains(range.commonAncestorContainer)) {
        return
      }

      if (text.length < 3) {
        if (!loading && !result) {
          hideTimeoutRef.current = setTimeout(hideToolbar, 200)
        }
        return
      }

      clearHideTimeout()
      setSelectedText(text)

      // Position toolbar above selection
      const rect = range.getBoundingClientRect()
      setToolbarPos({
        top: rect.top - 8 + window.scrollY,
        left: rect.left + rect.width / 2,
      })
      setShowToolbar(true)
    }

    const handleMouseUp = () => {
      setTimeout(handleSelectionChange, 10)
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.shiftKey) handleSelectionChange()
    }

    container.addEventListener('mouseup', handleMouseUp)
    container.addEventListener('keyup', handleKeyUp)

    return () => {
      container.removeEventListener('mouseup', handleMouseUp)
      container.removeEventListener('keyup', handleKeyUp)
    }
  }, [containerRef, disabled, loading, result, clearHideTimeout, hideToolbar])

  // Close on outside click
  useEffect(() => {
    if (!showToolbar) return

    const handleClickOutside = (e: MouseEvent) => {
      const toolbar = toolbarRef.current
      const container = containerRef.current
      if (
        toolbar && !toolbar.contains(e.target as Node) &&
        container && !container.contains(e.target as Node)
      ) {
        hideToolbar()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showToolbar, containerRef, hideToolbar])

  const handleAction = useCallback(async (action: ReaderAction) => {
    if (!selectedText || loading) return
    clearHideTimeout()

    if (action === 'copy') {
      try {
        await navigator.clipboard.writeText(selectedText)
        toast.success('Gekopieerd naar klembord')
        hideToolbar()
      } catch {
        toast.error('Kopiëren mislukt')
      }
      return
    }

    // AI actions
    setLoading(true)
    setLoadingAction(action)
    setResult(null)

    try {
      const response = await callForgie(action, selectedText)
      if (response?.result) {
        setResult(response.result)
      }
    } catch {
      toast.error('Forgie kon dit niet verwerken. Probeer het opnieuw.')
      setResult(null)
    } finally {
      setLoading(false)
      setLoadingAction(null)
    }
  }, [selectedText, loading, clearHideTimeout, hideToolbar])

  if (!showToolbar) return null

  return createPortal(
    <div
      ref={toolbarRef}
      className={cn(
        'fixed z-[99999] flex flex-col items-center',
        'animate-in fade-in slide-in-from-bottom-2 duration-150',
      )}
      style={{
        top: `${toolbarPos.top}px`,
        left: `${toolbarPos.left}px`,
        transform: 'translate(-50%, -100%)',
      }}
    >
      {/* Action buttons pill */}
      <div
        className="flex items-center gap-0.5 px-1.5 py-1 rounded-full bg-card border border-border/50"
        style={{ boxShadow: '0 2px 12px rgba(120,90,50,0.12), 0 1px 3px rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-center gap-0.5 pr-1 mr-0.5 border-r border-border/30">
          <Sparkles className="h-3 w-3" style={{ color: '#9B8EC4' }} />
        </div>
        {ACTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => handleAction(id)}
            disabled={loading}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-colors',
              'text-foreground/55 hover:text-foreground hover:bg-foreground/[0.06]',
              'disabled:opacity-50',
              loadingAction === id && 'bg-foreground/[0.06]',
            )}
          >
            {loadingAction === id ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Icon className="h-3 w-3" />
            )}
            <span>{label}</span>
          </button>
        ))}
        {(result || loading) && (
          <button
            onClick={hideToolbar}
            className="flex items-center justify-center w-5 h-5 rounded-full text-foreground/30 hover:text-foreground/60 hover:bg-foreground/[0.06] transition-colors ml-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Result popover */}
      {result && (
        <div
          className="mt-2 max-w-[360px] p-3 rounded-xl bg-card border border-border/50 text-[12px] leading-relaxed text-foreground/70"
          style={{ boxShadow: '0 2px 12px rgba(120,90,50,0.12), 0 1px 3px rgba(0,0,0,0.06)' }}
        >
          <p className="whitespace-pre-wrap">{result}</p>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(result)
                toast.success('Gekopieerd naar klembord')
              } catch {
                toast.error('Kopiëren mislukt')
              }
            }}
            className="mt-2 flex items-center gap-1 text-[10px] font-medium transition-colors hover:text-foreground/80"
            style={{ color: '#9B8EC4' }}
          >
            <Copy className="h-3 w-3" />
            <span>Kopieer resultaat</span>
          </button>
        </div>
      )}
    </div>,
    document.body,
  )
}
