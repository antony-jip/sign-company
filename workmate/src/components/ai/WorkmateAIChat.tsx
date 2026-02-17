import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Bot, Send, User, Sparkles, AlertCircle } from 'lucide-react'
import { isAIConfigured, chatCompletion } from '@/services/aiService'
import { AITextGenerator } from './AITextGenerator'

interface ChatMessage {
  id: string
  rol: 'user' | 'assistant'
  bericht: string
  timestamp: Date
}

const suggesties = [
  'Analyseer mijn projecten',
  'Schrijf een email',
  'Maak een offerte tekst',
  'Project status samenvatting',
]


export function WorkmateAIChat() {
  const [activeTab, setActiveTab] = useState('chat')

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
          <Bot className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            AI Assistent
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Uw intelligente werkpartner voor teksten, analyses en meer
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="chat" className="gap-2">
            <Bot className="w-4 h-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="generator" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Tekst Generator
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat">
          <ChatInterface />
        </TabsContent>

        <TabsContent value="generator">
          <AITextGenerator />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      rol: 'assistant',
      bericht:
        'Hallo! Ik ben uw Workmate AI-assistent. Ik kan u helpen met offerteteksten, e-mails, projectanalyses en meer. Waar kan ik u mee helpen?',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const aiConfigured = isAIConfigured()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      rol: 'user',
      bericht: trimmed,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      let response: string

      const chatHistory = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({
          role: m.rol === 'user' ? ('user' as const) : ('assistant' as const),
          content: m.bericht,
        }))

      chatHistory.push({ role: 'user', content: trimmed })

      response = await chatCompletion(
        chatHistory,
        'Je bent een behulpzame AI-assistent voor een Nederlands sign-bedrijf genaamd Workmate. Communiceer altijd in het Nederlands. Wees professioneel, behulpzaam en beknopt.'
      )

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-response`,
        rol: 'assistant',
        bericht: response,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        rol: 'assistant',
        bericht:
          'Er ging iets mis bij het verwerken van uw bericht. Probeer het opnieuw.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion)
  }

  return (
    <Card className="flex flex-col" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
      {/* API Configuration Banner */}
      {!aiConfigured && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Configureer je OpenAI API key in .env voor echte AI responses. Nu in demo modus.
          </p>
        </div>
      )}

      {/* Suggestion Chips */}
      {messages.length <= 1 && (
        <div className="px-4 pt-4 flex flex-wrap gap-2">
          {suggesties.map((suggestion) => (
            <Button
              key={suggestion}
              variant="outline"
              size="sm"
              className="text-xs rounded-full hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-300 transition-colors"
              onClick={() => handleSuggestionClick(suggestion)}
              disabled={isLoading}
            >
              <Sparkles className="w-3 h-3 mr-1.5" />
              {suggestion}
            </Button>
          ))}
        </div>
      )}

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-4 py-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${
                message.rol === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* Avatar */}
              <Avatar className="w-8 h-8 flex-shrink-0 mt-0.5">
                <AvatarFallback
                  className={
                    message.rol === 'user'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                  }
                >
                  {message.rol === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </AvatarFallback>
              </Avatar>

              {/* Message Bubble */}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  message.rol === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md'
                }`}
              >
                {message.bericht.split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {line.startsWith('**') && line.endsWith('**') ? (
                      <strong>{line.replace(/\*\*/g, '')}</strong>
                    ) : line.startsWith('- ') ? (
                      <div className="flex items-start gap-1.5 ml-1">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current flex-shrink-0 opacity-50" />
                        <span
                          dangerouslySetInnerHTML={{
                            __html: line
                              .slice(2)
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                          }}
                        />
                      </div>
                    ) : line.match(/^\d+\./) ? (
                      <div
                        className="ml-1"
                        dangerouslySetInnerHTML={{
                          __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                        }}
                      />
                    ) : (
                      <span
                        dangerouslySetInnerHTML={{
                          __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                        }}
                      />
                    )}
                    {i < message.bericht.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex items-start gap-3">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                  <Bot className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Stel een vraag..."
            disabled={isLoading}
            className="flex-1"
            autoComplete="off"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </Card>
  )
}
