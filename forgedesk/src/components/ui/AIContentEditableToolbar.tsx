import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
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
  Pen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { rewriteText, type RewriteAction } from '@/services/aiRewriteService'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'

interface AIContentEditableToolbarProps {
  /** Ref to the contentEditable element */
  editorRef: React.RefObject<HTMLDivElement | null>
  /** Called after text is replaced so parent can sync state */
  onContentChange?: () => void
  disabled?: boolean
  /** Suppress tone-of-voice for this field. Defaults to false (tone applied). */
  skipTone?: boolean
}

const ACTIONS: { id: RewriteAction; label: string; icon: React.ElementType }[] = [
  { id: 'beknopt', label: 'Beknopt', icon: AlignLeft },
  { id: 'uitgebreid', label: 'Uitgebreider', icon: AlignJustify },
  { id: 'professioneel', label: 'Professioneler', icon: BookOpen },
  { id: 'informeel', label: 'Informeler', icon: SmilePlus },
  { id: 'humor', label: 'Humor', icon: SmilePlus },
  { id: 'informatief', label: 'Informatief', icon: BookOpen },
  { id: 'taalcheck', label: 'Spelling', icon: CheckCheck },
  { id: 'vertaal-en', label: 'Naar Engels', icon: Languages },
  { id: 'vertaal-nl', label: 'Naar Nederlands', icon: Languages },
]

export function AIContentEditableToolbar({ editorRef, onContentChange, disabled, skipTone }: AIContentEditableToolbarProps) {
  const { settings } = useAppSettings()
  const heeftSchrijfstijl = !!(settings.ai_tone_of_voice && settings.ai_tone_of_voice.trim())
  const toneActive = heeftSchrijfstijl && !skipTone
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
      const result = await rewriteText(action, selectedText, instruction, skipTone)
      setPreview(result.result)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Herschrijven mislukt')
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }, [selectedText, loading, clearHideTimeout, skipTone])

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
        <div className="mb-2 w-[320px] bg-white rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-3 py-2 border-b border-[#EBEBEB] flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#9B9B95]" />
            <span className="text-xs font-medium text-[#1A1A1A]">AI Suggestie</span>
          </div>
          {!heeftSchrijfstijl && !loading && (
            <div className="px-3 py-1.5 bg-[#F8F7F5] border-b border-[#EBEBEB] flex items-center gap-1.5">
              <Pen className="w-3 h-3 text-[#9B9B95] shrink-0" />
              <span className="text-[11px] text-[#6B6B66]">
                Tip · stel je schrijfstijl in via{' '}
                <Link to="/instellingen?tab=daan" className="underline hover:text-[#1A1A1A]">Instellingen</Link>
                {' '}voor resultaten die meer als jou klinken
              </span>
            </div>
          )}
          <div className="px-3 py-2.5 max-h-[200px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center gap-2 py-3 justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-[#F15025]" />
                <span className="text-sm text-[#6B6B66]">Bezig met herschrijven...</span>
              </div>
            ) : (
              <p className="text-sm text-[#1A1A1A] whitespace-pre-wrap leading-relaxed">{preview}</p>
            )}
          </div>
          {preview && !loading && (
            <div className="px-3 py-2 border-t border-[#EBEBEB] flex items-center gap-1.5">
              <button
                onClick={handleAccept}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F15025] text-white text-xs font-medium hover:bg-[#F15025]/90 transition-colors"
              >
                <Check className="w-3 h-3" />
                Toepassen
              </button>
              <button
                onClick={handleRetry}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[#1A1A1A] text-xs font-medium hover:bg-[#F8F7F5] transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Opnieuw
              </button>
              <button
                onClick={() => { setShowActions(true); setPreview(null) }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[#1A1A1A] text-xs font-medium hover:bg-[#F8F7F5] transition-colors"
              >
                <Wand2 className="w-3 h-3" />
                Ander
              </button>
              <button
                onClick={hideToolbar}
                className="ml-auto flex items-center justify-center w-7 h-7 rounded-lg text-[#9B9B95] hover:text-[#1A1A1A] hover:bg-[#F8F7F5] transition-colors"
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
            <div className="mb-2 w-[280px] bg-white rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="p-2 flex items-center gap-2">
                <input
                  ref={customInputRef}
                  type="text"
                  value={customInstruction}
                  onChange={e => setCustomInstruction(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCustomSubmit(); if (e.key === 'Escape') setShowCustomInput(false) }}
                  placeholder="Bijv: maak het vriendelijker..."
                  className="flex-1 text-sm bg-transparent border-none outline-none text-[#1A1A1A] placeholder:text-[#9B9B95]"
                />
                <button
                  onClick={handleCustomSubmit}
                  disabled={!customInstruction.trim()}
                  className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#F15025] text-white disabled:opacity-40 hover:bg-[#F15025]/90 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {showActions && (
            <div className="mb-2 w-[280px] bg-white rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] overflow-hidden p-1.5">
              {!skipTone && (
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={heeftSchrijfstijl ? () => handleAction('eigen-stijl') : undefined}
                        disabled={!heeftSchrijfstijl}
                        className={cn(
                          'w-full flex items-center justify-center gap-2 px-3 py-2.5 mb-1.5 rounded-lg bg-[#1A535C] text-white text-xs font-medium transition-all',
                          heeftSchrijfstijl
                            ? 'hover:bg-[#1A535C]/95 hover:shadow-[0_0_18px_rgba(241,80,37,0.18)] cursor-pointer'
                            : 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Mijn stijl<span className="text-[#F15025]">.</span></span>
                      </button>
                    </TooltipTrigger>
                    {!heeftSchrijfstijl && (
                      <TooltipContent side="top" className="max-w-[240px] text-xs">
                        Vul je schrijfstijl in via{' '}
                        <Link to="/instellingen?tab=daan" className="underline font-medium">instellingen</Link>
                        {' '}om dit te gebruiken
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              )}
              <div className="grid grid-cols-3 gap-1">
                {ACTIONS.map(action => {
                  const Icon = action.icon
                  return (
                    <button
                      key={action.id}
                      onClick={() => handleAction(action.id)}
                      className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-xs text-[#1A1A1A] hover:bg-[#F8F7F5] transition-colors"
                    >
                      <Icon className="w-3.5 h-3.5 text-[#9B9B95]" />
                      <span className="font-medium leading-tight">{action.label}</span>
                    </button>
                  )
                })}
                <button
                  onClick={() => { setShowCustomInput(true); setShowActions(false) }}
                  className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-xs text-[#1A1A1A] hover:bg-[#F8F7F5] transition-colors"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5 text-[#9B9B95]" />
                  <span className="font-medium leading-tight">Eigen</span>
                </button>
              </div>
            </div>
          )}

          {!showActions && !showCustomInput && (
            <button
              onClick={() => setShowActions(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06)] text-xs font-medium text-[#1A1A1A] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all group"
              title={
                toneActive
                  ? 'AI herschrijven · jouw schrijfstijl actief'
                  : skipTone && heeftSchrijfstijl
                    ? 'AI herschrijven · schrijfstijl uit voor dit veld'
                    : 'AI herschrijven · geen schrijfstijl ingesteld'
              }
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F15025] group-hover:scale-110 transition-transform" />
              <span>AI herschrijven</span>
              <Pen className={cn('w-3 h-3 transition-colors', toneActive ? 'text-[#1A535C]' : 'text-[#9B9B95]/50')} />
            </button>
          )}
        </>
      )}
    </div>
  )

  return createPortal(toolbar, document.body)
}
