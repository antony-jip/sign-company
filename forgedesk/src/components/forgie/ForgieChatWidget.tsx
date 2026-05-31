import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MessageSquare, Send, X, RotateCcw, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  sendForgieChat,
  getForgieHistory,
  clearForgieHistory,
  type ForgieChatMessage,
  type ForgieActie,
} from '@/services/forgieChatService'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { renderForgieMarkdown } from '@/utils/forgieMarkdown'
import { DaanActiePlan } from './DaanActiePlan'

type WidgetMessage = ForgieChatMessage & { acties?: ForgieActie[] }

function DaanAvatar() {
  return (
    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-petrol flex items-center justify-center mt-0.5">
      <span className="text-white text-[10px] font-extrabold">D</span>
    </div>
  )
}

const SUGGESTIE_CHIPS = [
  'Wat staat er open?',
  'Omzet deze maand',
  'Openstaande facturen',
  'Projecten in uitvoering',
]

export function ForgieChatWidget() {
  const { forgieEnabled } = useAppSettings()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<WidgetMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

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
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    // Delay to avoid closing on the same click that opened
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClick), 50)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
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
      const forgieMsg: WidgetMessage = { role: 'forgie', content: result.answer, acties: result.acties }
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
      {/* ── Chat Panel ── */}
      {isOpen && (
        <div
          ref={panelRef}
          className={cn(
            'fixed z-[9999] flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-200',
            'hidden md:flex',
          )}
          style={{
            right: 16,
            bottom: 80,
            width: 340,
            maxWidth: 'calc(100vw - 2rem)',
            maxHeight: '60vh',
            borderRadius: 12,
            border: '0.5px solid #E6E4E0',
            boxShadow: '0 8px 32px rgba(120, 90, 50, 0.12)',
            overflow: 'hidden',
          }}
        >
          {/* Header — petrol */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--color-petrol) 0%, var(--color-petrol-dark) 100%)' }}
          >
            <div className="flex items-center gap-2.5">
              {/* D avatar met flame-statusstipje */}
              <div className="relative flex items-center justify-center w-[34px] h-[34px] rounded-xl bg-white/10">
                <span className="text-white text-sm font-extrabold">D</span>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-flame ring-2 ring-petrol" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white leading-tight">
                  Daan<span className="text-flame">.</span>
                </h2>
                <p className="text-[10px] text-white/55 leading-tight">je digitale collega</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={handleClear}
                  className="flex items-center justify-center transition-opacity hover:opacity-80"
                  style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.4)' }}
                  title="Nieuw gesprek"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center transition-opacity hover:opacity-80"
                style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.4)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat area */}
          <div
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
            style={{ backgroundColor: 'hsl(var(--card))' }}
          >
            {/* Welcome / suggestions */}
            {messages.length === 0 && !loading && (
              <div className="space-y-4 pt-2">
                <div className="flex gap-2.5 items-start">
                  <DaanAvatar />
                  <div className="max-w-[85%] px-3.5 py-2.5 text-[13px] leading-relaxed bg-white dark:bg-card text-foreground border border-border/60 shadow-sm rounded-2xl rounded-bl-md">
                    Hoi, ik ben <strong>Daan</strong>. Stel me een vraag over je klanten, projecten, offertes of facturen, of vraag me iets aan te maken.
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5" style={{ paddingLeft: 32 }}>
                  {SUGGESTIE_CHIPS.map(chip => (
                    <button
                      key={chip}
                      onClick={() => handleSend(chip)}
                      className="transition-colors"
                      style={{
                        padding: '4px 10px',
                        fontSize: 10,
                        color: '#5A5A55',
                        border: '0.5px solid #E6E4E0',
                        borderRadius: 999,
                        backgroundColor: 'transparent',
                      }}
                      onMouseEnter={e => { (e.target as HTMLElement).style.backgroundColor = '#F4F2EE' }}
                      onMouseLeave={e => { (e.target as HTMLElement).style.backgroundColor = 'transparent' }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => {
              if (msg.role === 'user') {
                return (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[85%] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap bg-petrol text-white rounded-2xl rounded-br-md shadow-sm">
                      {msg.content}
                    </div>
                  </div>
                )
              }
              const hasActies = !!msg.acties && msg.acties.length > 0
              return (
                <div key={i} className="space-y-3">
                  {msg.content?.trim() && (
                    <div className="flex gap-2.5 justify-start">
                      <DaanAvatar />
                      <div className="max-w-[85%] px-3.5 py-2.5 text-[13px] leading-relaxed bg-white dark:bg-card text-foreground border border-border/60 shadow-sm rounded-2xl rounded-bl-md">
                        {renderForgieMarkdown(msg.content)}
                      </div>
                    </div>
                  )}
                  {hasActies && (
                    <div className="flex gap-2.5 justify-start">
                      <DaanAvatar />
                      <div className="min-w-0 flex-1">
                        <DaanActiePlan acties={msg.acties!} />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Loading indicator */}
            {loading && (
              <div className="flex gap-2.5 justify-start">
                <DaanAvatar />
                <div className="px-3.5 py-2.5 bg-white dark:bg-card border border-border/60 shadow-sm rounded-2xl rounded-bl-md">
                  <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                    Daan denkt na…
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="flex-shrink-0 p-3 border-t border-border/60 bg-card">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Zeg het tegen Daan…"
                disabled={loading}
                className="flex-1 px-3 py-2 text-[13px] text-foreground bg-muted/50 rounded-lg outline-none border border-border/60 focus:border-petrol placeholder:text-muted-foreground/70"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-flame text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FAB (Floating Action Button) ── */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={cn(
          'fixed z-[9999] flex items-center justify-center transition-all duration-200',
          'hidden md:flex',
        )}
        style={{
          right: 16,
          bottom: 16,
          width: 48,
          height: 48,
          borderRadius: 14,
          backgroundColor: '#1A535C',
          boxShadow: isOpen
            ? '0 2px 8px rgba(26, 83, 92, 0.2)'
            : '0 2px 12px rgba(26, 83, 92, 0.3)',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)'
          ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(26, 83, 92, 0.4)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1)'
          ;(e.currentTarget as HTMLElement).style.boxShadow = isOpen
            ? '0 2px 8px rgba(26, 83, 92, 0.2)'
            : '0 2px 12px rgba(26, 83, 92, 0.3)'
        }}
      >
        {isOpen ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <>
            <MessageSquare className="w-[22px] h-[22px] text-white" />
            {hasUnread && (
              <span
                className="absolute -top-1 -right-1 rounded-full animate-pulse"
                style={{ width: 10, height: 10, backgroundColor: '#F15025', border: '2px solid #FFFFFF' }}
              />
            )}
          </>
        )}
      </button>
    </>
  )
}
