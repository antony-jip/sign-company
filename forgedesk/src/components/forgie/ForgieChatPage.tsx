import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Sparkles, Send, RotateCcw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  sendForgieChat,
  getForgieHistory,
  clearForgieHistory,
  type ForgieChatMessage,
} from '@/services/forgieChatService'
import { getForgieUsage, type ForgieUsage } from '@/services/forgieService'
import { renderForgieMarkdown } from '@/utils/forgieMarkdown'

const SUGGESTIE_CHIPS = [
  'Wat staat er open?',
  'Omzet deze maand',
  'Laatste offertes',
  'Hoeveel klanten heb ik?',
  'Openstaande facturen',
  'Projecten in uitvoering',
]

export function ForgieChatPage() {
  const [messages, setMessages] = useState<ForgieChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [usage, setUsage] = useState<ForgieUsage | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Load history and usage on mount
  useEffect(() => {
    async function load() {
      const [hist, usg] = await Promise.all([
        getForgieHistory().catch(() => []),
        getForgieUsage().catch(() => ({ usage: 0, limiet: 5 })),
      ])
      setMessages(hist)
      setUsage(usg)
      setHistoryLoaded(true)
    }
    load()
  }, [])

  useEffect(() => {
    if (historyLoaded) scrollToBottom()
  }, [messages, historyLoaded, scrollToBottom])

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
      setUsage({ usage: result.usage, limiet: result.limiet })
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
  }, [input, loading, messages])

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

  const showSuggestions = messages.length === 0 && !loading

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-3xl mx-auto mod-strip mod-strip-forgie">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blush/20 rounded-lg">
            <Sparkles className="w-5 h-5 text-blush-deep" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Daan</h1>
            <p className="text-xs text-muted-foreground">Je bedrijfsgeheugen</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Nieuw gesprek
          </Button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4 scrollbar-thin">
        {/* Welcome message */}
        {showSuggestions && (
          <div className="space-y-6 pt-8">
            {/* Forgie intro */}
            <div className="flex gap-3 max-w-[85%]">
              <div className="flex-shrink-0 mt-1">
                <Sparkles className="w-4 h-4 text-blush-deep" />
              </div>
              <div className="bg-card border rounded-2xl p-4 text-sm text-foreground">
                Hoi! Ik ben Daan, je bedrijfsgeheugen. Stel me een vraag over je klanten, projecten, offertes of facturen.
              </div>
            </div>

            {/* Suggestion chips */}
            <div className="flex flex-wrap gap-2 pl-7">
              {SUGGESTIE_CHIPS.map(chip => (
                <button
                  key={chip}
                  onClick={() => handleSend(chip)}
                  className="rounded-full px-4 py-2 border text-sm bg-mist/10 hover:bg-mist/30 text-foreground transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'flex gap-3',
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {msg.role === 'forgie' && (
              <div className="flex-shrink-0 mt-1">
                <Sparkles className="w-4 h-4 text-blush-deep" />
              </div>
            )}
            <div
              className={cn(
                'max-w-[85%] rounded-2xl p-4 text-sm whitespace-pre-wrap',
                msg.role === 'user'
                  ? 'bg-mist/20 text-foreground'
                  : 'bg-card border text-foreground'
              )}
            >
              {msg.role === 'forgie' ? renderForgieMarkdown(msg.content) : msg.content}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 mt-1">
              <Sparkles className="w-4 h-4 text-blush-deep" />
            </div>
            <div className="bg-card border rounded-2xl p-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                <span className="text-xs">Daan is aan het denken...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="flex-shrink-0 border-t bg-card p-4">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Vraag het aan Daan..."
            disabled={loading}
            className="flex-1 rounded-xl border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blush/50 disabled:opacity-50"
          />
          <Button
            size="icon"
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="rounded-xl h-11 w-11 bg-blush-deep hover:bg-blush-deep/90"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        {usage && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Gebruikt: &euro;{usage.usage.toFixed(2)} / &euro;{usage.limiet.toFixed(2)}
          </p>
        )}
      </div>
    </div>
  )
}
