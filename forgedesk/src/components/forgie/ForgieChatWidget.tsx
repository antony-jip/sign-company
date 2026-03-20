import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Sparkles, Send, X, RotateCcw, Loader2, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  sendForgieChat,
  getForgieHistory,
  clearForgieHistory,
  type ForgieChatMessage,
} from '@/services/forgieChatService'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { renderForgieMarkdown } from '@/utils/forgieMarkdown'
import { ForgieAvatar } from './ForgieAvatar'

const SUGGESTIE_CHIPS = [
  'Wat staat er open?',
  'Omzet deze maand',
  'Openstaande facturen',
  'Projecten in uitvoering',
]

/** Cute fox mascot SVG for Daan */
function ForgieMascot({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Ears */}
      <path d="M22 38L30 12L42 32Z" fill="#E8825A" />
      <path d="M78 38L70 12L58 32Z" fill="#E8825A" />
      <path d="M26 36L32 18L40 33Z" fill="#FDDBC9" />
      <path d="M74 36L68 18L60 33Z" fill="#FDDBC9" />
      {/* Head */}
      <ellipse cx="50" cy="56" rx="30" ry="28" fill="#E8825A" />
      {/* Face / cheeks */}
      <ellipse cx="50" cy="62" rx="22" ry="20" fill="#FDDBC9" />
      {/* Eyes */}
      <ellipse cx="40" cy="52" rx="4.5" ry="5" fill="#2D1B0E" />
      <ellipse cx="60" cy="52" rx="4.5" ry="5" fill="#2D1B0E" />
      {/* Eye shine */}
      <circle cx="42" cy="50" r="1.8" fill="white" />
      <circle cx="62" cy="50" r="1.8" fill="white" />
      {/* Nose */}
      <ellipse cx="50" cy="60" rx="3.5" ry="2.5" fill="#2D1B0E" />
      {/* Mouth */}
      <path d="M46 63Q50 67 54 63" stroke="#2D1B0E" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Blush spots */}
      <ellipse cx="35" cy="60" rx="4" ry="2.5" fill="#F4A68F" opacity="0.5" />
      <ellipse cx="65" cy="60" rx="4" ry="2.5" fill="#F4A68F" opacity="0.5" />
    </svg>
  )
}

const FORGIE_INTRO_SEEN_KEY = 'forgie-intro-seen'

export function ForgieChatWidget() {
  const { forgieEnabled } = useAppSettings()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ForgieChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const [showIntroBubble, setShowIntroBubble] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Show intro bubble once for new users
  useEffect(() => {
    if (localStorage.getItem(FORGIE_INTRO_SEEN_KEY)) return
    const showTimer = setTimeout(() => setShowIntroBubble(true), 1500)
    const hideTimer = setTimeout(() => {
      setShowIntroBubble(false)
      localStorage.setItem(FORGIE_INTRO_SEEN_KEY, '1')
    }, 7000)
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer) }
  }, [])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Load history when opened for the first time
  useEffect(() => {
    if (!isOpen || historyLoaded) return
    async function load() {
      const hist = await getForgieHistory().catch(() => [])
      setMessages(hist)
      setHistoryLoaded(true)
    }
    load()
  }, [isOpen, historyLoaded])

  useEffect(() => {
    if (isOpen) scrollToBottom()
  }, [messages, isOpen, scrollToBottom])

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false)
      // Small delay to let the panel render
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleSend = useCallback(async (text?: string) => {
    const question = (text || input).trim()
    if (!question || loading) return

    setInput('')
    const userMsg: ForgieChatMessage = { role: 'user', content: question }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const result = await sendForgieChat(question, messages)
      const forgieMsg: ForgieChatMessage = { role: 'forgie', content: result.answer }
      setMessages(prev => [...prev, forgieMsg])
      if (!isOpen) setHasUnread(true)
    } catch (err) {
      const errorMsg: ForgieChatMessage = {
        role: 'forgie',
        content: err instanceof Error ? err.message : 'Er ging iets mis. Probeer het opnieuw.',
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [input, loading, messages, isOpen])

  const handleClear = useCallback(async () => {
    await clearForgieHistory().catch(() => {})
    setMessages([])
    inputRef.current?.focus()
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  if (!forgieEnabled) return null

  return (
    <>
      {/* Chat panel */}
      {isOpen && (
        <div style={{ position: 'fixed' }} className="bottom-24 right-6 z-[9999] w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-8rem)] bg-card/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-card/50 backdrop-blur-sm flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <ForgieAvatar size={28} />
              <div>
                <h2 className="text-sm font-bold text-foreground">Daan</h2>
                <p className="text-2xs text-muted-foreground">Je bedrijfsgeheugen</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClear}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  title="Nieuw gesprek"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <Minus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
            {/* Welcome / suggestions */}
            {messages.length === 0 && !loading && (
              <div className="space-y-4 pt-4">
                <div className="flex gap-2.5 items-start">
                  <ForgieAvatar size={32} className="flex-shrink-0" />
                  <p className="text-sm text-foreground mt-1">
                    Hoi! Ik ben <strong>Daan</strong>, stel me een vraag over je klanten, projecten, offertes of facturen.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 pl-6">
                  {SUGGESTIE_CHIPS.map(chip => (
                    <button
                      key={chip}
                      onClick={() => handleSend(chip)}
                      className="rounded-full px-3 py-1.5 border text-xs bg-mist/10 hover:bg-mist/30 text-foreground transition-colors"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'flex gap-2.5',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {msg.role === 'forgie' && (
                  <Sparkles className="w-3.5 h-3.5 text-blush-deep flex-shrink-0 mt-1" />
                )}
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap',
                    msg.role === 'user'
                      ? 'bg-mist/20 text-foreground'
                      : 'bg-background border text-foreground'
                  )}
                >
                  {msg.role === 'forgie' ? renderForgieMarkdown(msg.content) : msg.content}
                </div>
              </div>
            ))}

            {/* Loading */}
            {loading && (
              <div className="flex gap-2.5 justify-start">
                <Sparkles className="w-3.5 h-3.5 text-blush-deep flex-shrink-0 mt-1" />
                <div className="bg-background border rounded-2xl px-3 py-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                    <span className="text-xs">Daan denkt na...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 border-t p-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Vraag het aan Daan..."
                disabled={loading}
                className="flex-1 rounded-xl border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blush/50 disabled:opacity-50"
              />
              <Button
                size="icon"
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="rounded-xl h-10 w-10 bg-blush-deep hover:bg-blush-deep/90"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating action button – Forgie mascot with glass effect */}
      <button
        onClick={() => {
          setIsOpen(prev => !prev)
          if (showIntroBubble) {
            setShowIntroBubble(false)
            localStorage.setItem(FORGIE_INTRO_SEEN_KEY, '1')
          }
        }}
        style={{ position: 'fixed', right: 24, bottom: 24, left: 'auto' }}
        className={cn(
          'z-[9999] rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 group',
          'hover:scale-110 active:scale-95',
          isOpen ? 'w-14 h-14' : 'w-[68px] h-[68px]'
        )}
      >
        {/* Glass background */}
        <span className={cn(
          'absolute inset-0 rounded-full backdrop-blur-xl border transition-colors duration-200',
          isOpen
            ? 'bg-white/60 dark:bg-white/10 border-white/40'
            : 'bg-white/70 dark:bg-white/15 border-white/50 shadow-[0_8px_32px_rgba(155,142,196,0.35)]'
        )} />

        {isOpen ? (
          <X className="w-5 h-5 text-foreground relative z-10" />
        ) : (
          <span className="relative z-10 flex items-center justify-center">
            <ForgieAvatar size={48} className="drop-shadow-sm transition-transform duration-200 group-hover:rotate-6" />
            {hasUnread && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
            )}
            {/* One-time intro speech bubble for new users */}
            {showIntroBubble && !isOpen && (
              <span className="absolute -top-14 -left-28 bg-white dark:bg-card backdrop-blur-sm text-xs text-foreground font-medium px-3 py-2 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300 whitespace-nowrap pointer-events-none border border-[#9B8EC4]/30 dark:border-[#9B8EC4]/20">
                Hoi! Ik ben <strong>Daan</strong>, je AI-assistent
                <span className="absolute -bottom-1.5 right-8 w-3 h-3 bg-white dark:bg-card border-b border-r border-[#9B8EC4]/30 dark:border-[#9B8EC4]/20 rotate-45" />
              </span>
            )}
            {/* Hover hint */}
            <span className="absolute -top-8 right-0 bg-white/90 dark:bg-card/90 backdrop-blur-sm text-2xs text-foreground font-medium px-2 py-1 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none border border-white/30">
              Vraag het Daan!
            </span>
          </span>
        )}
      </button>
    </>
  )
}
