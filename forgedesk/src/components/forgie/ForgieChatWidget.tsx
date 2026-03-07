import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Sparkles, Send, X, RotateCcw, Loader2, MessageCircle, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  sendForgieChat,
  getForgieHistory,
  clearForgieHistory,
  type ForgieChatMessage,
} from '@/services/forgieChatService'

const SUGGESTIE_CHIPS = [
  'Wat staat er open?',
  'Omzet deze maand',
  'Openstaande facturen',
  'Projecten in uitvoering',
]

export function ForgieChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ForgieChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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

  return (
    <>
      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-8rem)] bg-card border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-card flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-blush/20 rounded-lg">
                <Sparkles className="w-4 h-4 text-blush-deep" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Forgie</h2>
                <p className="text-[10px] text-muted-foreground">Je bedrijfsgeheugen</p>
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
                <div className="flex gap-2.5">
                  <Sparkles className="w-4 h-4 text-blush-deep flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">
                    Hoi! Ik ben <strong>Forgie</strong>. Stel me een vraag over je klanten, projecten, offertes of facturen.
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
                  {msg.content}
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
                    <span className="text-xs">Forgie denkt na...</span>
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
                placeholder="Vraag het aan Forgie..."
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

      {/* Floating action button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={cn(
          'fixed bottom-4 right-4 sm:right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95',
          isOpen
            ? 'bg-muted text-foreground hover:bg-muted/80'
            : 'bg-blush-deep text-white hover:bg-blush-deep/90'
        )}
      >
        {isOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <>
            <MessageCircle className="w-6 h-6" />
            {hasUnread && (
              <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white" />
            )}
          </>
        )}
      </button>
    </>
  )
}
