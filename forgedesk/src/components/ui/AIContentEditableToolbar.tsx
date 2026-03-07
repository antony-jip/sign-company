import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  Sparkles,
  AlignLeft,
  AlignJustify,
  SmilePlus,
  BookOpen,
  CheckCheck,
  Languages,
  Loader2,
  Check,
  X,
  RefreshCw,
  Wand2,
  MessageSquarePlus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { rewriteText, type RewriteAction } from '@/services/aiRewriteService'
import { toast } from 'sonner'

interface AIContentEditableToolbarProps {
  /** Ref to the contentEditable element */
  editorRef: React.RefObject<HTMLDivElement | null>
  /** Called after text is replaced so parent can sync state */
  onContentChange?: () => void
  disabled?: boolean
}

const ACTIONS: { id: RewriteAction; label: string; icon: React.ElementType }[] = [
  { id: 'beknopt', label: 'Beknopt', icon: AlignLeft },
  { id: 'uitgebreid', label: 'Uitgebreider', icon: AlignJustify },
  { id: 'professioneel', label: 'Professioneler', icon: BookOpen },
  { id: 'informeel', label: 'Informeler', icon: SmilePlus },
  { id: 'humor', label: 'Humor', icon: SmilePlus },
  { id: 'informatief', label: 'Informatief', icon: BookOpen },
  { id: 'taalcheck', label: 'Taalcheck', icon: CheckCheck },
  { id: 'vertaal-en', label: 'Engels', icon: Languages },
  { id: 'vertaal-nl', label: 'Nederlands', icon: Languages },
]

export function AIContentEditableToolbar({ editorRef, onContentChange, disabled }: AIContentEditableToolbarProps) {
  const [selectedText, setSelectedText] = useState('')
  const [savedRange, setSavedRange] = useState<Range | null>(null)
  const [showToolbar, setShowToolbar] = useState(false)
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0 })
  const [showActions, setShowActions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [lastAction, setLastAction] = useState<RewriteAction | null>(null)
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customInstruction, setCustomInstruction] = useState('')
  const toolbarRef = useRef<HTMLDivElement>(null)
  const customInputRef = useRef<HTMLInputElement>(null)
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
  }, [])

  const hideToolbar = useCallback(() => {
    setShowToolbar(false)
    setShowActions(false)
    setPreview(null)
    setLastAction(null)
    setShowCustomInput(false)
    setCustomInstruction('')
    setSelectedText('')
    setSavedRange(null)
  }, [])

  // Detect text selection in the contentEditable
  useEffect(() => {
    const editor = editorRef.current
    if (!editor || disabled) return

    const handleSelectionChange = () => {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return

      const range = selection.getRangeAt(0)
      const text = selection.toString().trim()

      // Check if selection is inside our editor
      if (!editor.contains(range.commonAncestorContainer)) {
        return
      }

      if (text.length < 3) {
        if (!loading && !preview) {
          hideTimeoutRef.current = setTimeout(hideToolbar, 200)
        }
        return
      }

      clearHideTimeout()
      setSelectedText(text)
      setSavedRange(range.cloneRange())

      // Position toolbar above selection
      const rect = range.getBoundingClientRect()
      setToolbarPos({
        top: rect.top - 8 + window.scrollY,
        left: rect.left + rect.width / 2,
      })
      setShowToolbar(true)
    }

    // Use mouseup for selection detection
    const handleMouseUp = () => {
      // Small delay to let selection finalize
      setTimeout(handleSelectionChange, 10)
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.shiftKey) handleSelectionChange()
    }

    editor.addEventListener('mouseup', handleMouseUp)
    editor.addEventListener('keyup', handleKeyUp)

    return () => {
      editor.removeEventListener('mouseup', handleMouseUp)
      editor.removeEventListener('keyup', handleKeyUp)
    }
  }, [editorRef, disabled, loading, preview, clearHideTimeout, hideToolbar])

  // Close on outside click
  useEffect(() => {
    if (!showToolbar) return

    const handleClickOutside = (e: MouseEvent) => {
      const toolbar = toolbarRef.current
      const editor = editorRef.current
      if (
        toolbar && !toolbar.contains(e.target as Node) &&
        editor && !editor.contains(e.target as Node)
      ) {
        hideToolbar()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showToolbar, editorRef, hideToolbar])

  useEffect(() => {
    if (showCustomInput) {
      setTimeout(() => customInputRef.current?.focus(), 50)
    }
  }, [showCustomInput])

  const handleAction = useCallback(async (action: RewriteAction, instruction?: string) => {
    if (!selectedText || loading) return
    clearHideTimeout()
    setLoading(true)
    setLastAction(action)
    setShowActions(false)
    setShowCustomInput(false)

    try {
      const result = await rewriteText(action, selectedText, instruction)
      setPreview(result.result)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Herschrijven mislukt')
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }, [selectedText, loading, clearHideTimeout])

  const handleAccept = useCallback(() => {
    if (!preview || !savedRange) return

    const editor = editorRef.current
    if (!editor) return

    // Restore the saved selection range and replace content
    const selection = window.getSelection()
    if (selection) {
      selection.removeAllRanges()
      selection.addRange(savedRange)
      // Replace with new text, preserving line breaks
      const fragment = document.createDocumentFragment()
      const lines = preview.split('\n')
      lines.forEach((line, i) => {
        fragment.appendChild(document.createTextNode(line))
        if (i < lines.length - 1) {
          fragment.appendChild(document.createElement('br'))
        }
      })
      savedRange.deleteContents()
      savedRange.insertNode(fragment)
      // Collapse selection after inserted text
      selection.collapseToEnd()
    }

    // Notify parent of content change
    onContentChange?.()
    // Dispatch input event so parent handlers fire
    editor.dispatchEvent(new Event('input', { bubbles: true }))

    hideToolbar()
    toast.success('Tekst vervangen')
  }, [preview, savedRange, editorRef, onContentChange, hideToolbar])

  const handleRetry = useCallback(() => {
    if (lastAction) handleAction(lastAction)
  }, [lastAction, handleAction])

  const handleCustomSubmit = useCallback(() => {
    if (customInstruction.trim()) {
      handleAction('custom', customInstruction.trim())
    }
  }, [customInstruction, handleAction])

  if (!showToolbar) return null

  const toolbar = (
    <div
      ref={toolbarRef}
      style={{
        position: 'fixed',
        top: Math.max(8, Math.min(toolbarPos.top, window.innerHeight - 200)),
        left: Math.max(8, Math.min(toolbarPos.left - 100, window.innerWidth - 320)),
        zIndex: 99999,
      }}
      className="animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      {/* Preview panel */}
      {(preview || loading) && (
        <div className="mb-2 w-[320px] bg-card/95 backdrop-blur-xl border border-border/60 rounded-xl shadow-2xl overflow-hidden">
          <div className="px-3 py-2 border-b border-border/40 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground">AI Suggestie</span>
          </div>
          <div className="px-3 py-2.5 max-h-[200px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center gap-2 py-3 justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Bezig met herschrijven...</span>
              </div>
            ) : (
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{preview}</p>
            )}
          </div>
          {preview && !loading && (
            <div className="px-3 py-2 border-t border-border/40 flex items-center gap-1.5">
              <button
                onClick={handleAccept}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                <Check className="w-3 h-3" />
                Toepassen
              </button>
              <button
                onClick={handleRetry}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted text-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Opnieuw
              </button>
              <button
                onClick={() => { setShowActions(true); setPreview(null) }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted text-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
              >
                <Wand2 className="w-3 h-3" />
                Ander
              </button>
              <button
                onClick={hideToolbar}
                className="ml-auto flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main toolbar */}
      {!preview && !loading && (
        <>
          {showCustomInput && (
            <div className="mb-2 w-[280px] bg-card/95 backdrop-blur-xl border border-border/60 rounded-xl shadow-2xl overflow-hidden">
              <div className="p-2 flex items-center gap-2">
                <input
                  ref={customInputRef}
                  type="text"
                  value={customInstruction}
                  onChange={e => setCustomInstruction(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCustomSubmit(); if (e.key === 'Escape') setShowCustomInput(false) }}
                  placeholder="Bijv: maak het vriendelijker..."
                  className="flex-1 text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
                />
                <button
                  onClick={handleCustomSubmit}
                  disabled={!customInstruction.trim()}
                  className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {showActions && (
            <div className="mb-2 w-[280px] bg-card/95 backdrop-blur-xl border border-border/60 rounded-xl shadow-2xl overflow-hidden p-1.5">
              <div className="grid grid-cols-3 gap-1">
                {ACTIONS.map(action => {
                  const Icon = action.icon
                  return (
                    <button
                      key={action.id}
                      onClick={() => handleAction(action.id)}
                      className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-xs text-foreground hover:bg-muted/80 transition-colors"
                    >
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-medium leading-tight">{action.label}</span>
                    </button>
                  )
                })}
                <button
                  onClick={() => { setShowCustomInput(true); setShowActions(false) }}
                  className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-xs text-foreground hover:bg-muted/80 transition-colors"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-medium leading-tight">Eigen</span>
                </button>
              </div>
            </div>
          )}

          {!showActions && !showCustomInput && (
            <button
              onClick={() => setShowActions(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-card/95 backdrop-blur-xl border border-border/60 shadow-2xl text-xs font-medium text-foreground hover:bg-muted/80 transition-all hover:shadow-lg group"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
              <span>AI herschrijven</span>
            </button>
          )}
        </>
      )}
    </div>
  )

  return createPortal(toolbar, document.body)
}
