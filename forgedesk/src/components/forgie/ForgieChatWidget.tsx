import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MessageSquare, Send, X, RotateCcw, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  sendForgieChat,
  getForgieHistory,
  clearForgieHistory,
  type ForgieChatMessage,
} from '@/services/forgieChatService'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { renderForgieMarkdown } from '@/utils/forgieMarkdown'

const SUGGESTIE_CHIPS = [
  'Wat staat er open?',
  'Omzet deze maand',
  'Openstaande facturen',
  'Projecten in uitvoering',
]

export function ForgieChatWidget() {
  const { forgieEnabled } = useAppSettings()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ForgieChatMessage[]>([])
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
      {/* ── Chat Panel ── */}
      {isOpen && (
        <div
          ref={panelRef}
          className="fixed z-[9999] flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-200"
          style={{
            right: 16,
            bottom: 80,
            width: 340,
            maxWidth: 'calc(100vw - 2rem)',
            maxHeight: '60vh',
            borderRadius: 12,
            border: '0.5px solid #E6E4E0',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            overflow: 'hidden',
          }}
        >
          {/* Header — petrol */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ backgroundColor: '#1A535C' }}
          >
            <div className="flex items-center gap-2.5">
              {/* D avatar */}
              <div
                className="flex items-center justify-center"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 10,
                  backgroundColor: 'rgba(255,255,255,0.12)',
                }}
              >
                <span style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 800 }}>D</span>
              </div>
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.2 }}>Daan</h2>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', lineHeight: 1.2 }}>Klaar om te helpen</p>
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
            style={{ backgroundColor: '#FFFFFF' }}
          >
            {/* Welcome / suggestions */}
            {messages.length === 0 && !loading && (
              <div className="space-y-4 pt-2">
                <div className="flex gap-2.5 items-start">
                  {/* Daan avatar */}
                  <div
                    className="flex-shrink-0 flex items-center justify-center"
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: '#E2F0F0',
                    }}
                  >
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#1A535C' }}>D</span>
                  </div>
                  <div
                    className="px-3 py-2"
                    style={{
                      fontSize: 12,
                      lineHeight: 1.6,
                      color: '#191919',
                      backgroundColor: '#F4F2EE',
                      borderRadius: '10px 10px 10px 2px',
                    }}
                  >
                    Hoi! Ik ben <strong>Daan</strong>, stel me een vraag over je klanten, projecten, offertes of facturen.
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
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn('flex gap-2.5', msg.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {msg.role === 'forgie' && (
                  <div
                    className="flex-shrink-0 flex items-center justify-center mt-0.5"
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: '#E2F0F0',
                    }}
                  >
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#1A535C' }}>D</span>
                  </div>
                )}
                <div
                  className="max-w-[85%] px-3 py-2 whitespace-pre-wrap"
                  style={msg.role === 'user'
                    ? {
                        fontSize: 12,
                        lineHeight: 1.6,
                        color: '#FFFFFF',
                        backgroundColor: '#1A535C',
                        borderRadius: '10px 10px 2px 10px',
                      }
                    : {
                        fontSize: 12,
                        lineHeight: 1.6,
                        color: '#191919',
                        backgroundColor: '#F4F2EE',
                        borderRadius: '10px 10px 10px 2px',
                      }
                  }
                >
                  {msg.role === 'forgie' ? renderForgieMarkdown(msg.content) : msg.content}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex gap-2.5 justify-start">
                <div
                  className="flex-shrink-0 flex items-center justify-center mt-0.5"
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: '#E2F0F0',
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#1A535C' }}>D</span>
                </div>
                <div
                  className="px-3 py-2"
                  style={{
                    fontSize: 12,
                    color: '#5A5A55',
                    backgroundColor: '#F4F2EE',
                    borderRadius: '10px 10px 10px 2px',
                  }}
                >
                  <span className="flex items-center gap-2">
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: '#A0A098', animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: '#A0A098', animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: '#A0A098', animationDelay: '300ms' }} />
                    </span>
                    <span style={{ fontSize: 11 }}>Daan denkt na...</span>
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="flex-shrink-0 p-3" style={{ borderTop: '0.5px solid #E6E4E0', backgroundColor: '#FFFFFF' }}>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Vraag het aan Daan..."
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: 12,
                  color: '#191919',
                  backgroundColor: '#F4F2EE',
                  border: '0.5px solid #E6E4E0',
                  borderRadius: 8,
                  outline: 'none',
                }}
                onFocus={e => { e.target.style.borderColor = '#1A535C' }}
                onBlur={e => { e.target.style.borderColor = '#E6E4E0' }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="flex items-center justify-center transition-opacity disabled:opacity-40"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: '#1A535C',
                  color: '#FFFFFF',
                  flexShrink: 0,
                }}
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
        className="fixed z-[9999] flex items-center justify-center transition-all duration-200"
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
