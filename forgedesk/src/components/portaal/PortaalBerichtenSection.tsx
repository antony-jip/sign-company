import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, MessageSquare } from 'lucide-react'
import { PortaalLightbox } from './PortaalLightbox'

interface PortaalReactieData {
  id: string
  type: string
  bericht: string | null
  klant_naam: string | null
  portaal_bestand_id: string | null
  created_at: string
}

interface PortaalItemData {
  id: string
  titel: string
  bericht_type?: string | null
  bericht_tekst?: string | null
  foto_url?: string | null
  afzender?: string | null
  created_at: string
  reacties: PortaalReactieData[]
}

interface Props {
  items: PortaalItemData[]
  allItems: { id: string }[] // Alle portal items (voor getLastItemId)
  token: string
  klantNaam: string
  kanBerichtenSturen: boolean
  primaire_kleur: string
  onReactie: () => void
}

function formatTime(dateStr: string): string {
  return new Intl.DateTimeFormat('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Vandaag'
  if (d.toDateString() === yesterday.toDateString()) return 'Gisteren'
  return new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long' }).format(d)
}

interface Message {
  id: string
  tekst: string
  foto_url?: string | null
  afzender: 'bedrijf' | 'klant'
  created_at: string
}

function extractMessages(items: PortaalItemData[]): Message[] {
  const messages: Message[] = []

  for (const item of items) {
    // Tekst berichten
    if (item.bericht_type === 'tekst' && item.bericht_tekst) {
      messages.push({
        id: item.id,
        tekst: item.bericht_tekst,
        afzender: (item.afzender || 'bedrijf') as 'bedrijf' | 'klant',
        created_at: item.created_at,
      })
    }

    // Foto berichten
    if (item.bericht_type === 'foto' && item.foto_url) {
      messages.push({
        id: item.id,
        tekst: item.bericht_tekst || '',
        foto_url: item.foto_url,
        afzender: (item.afzender || 'bedrijf') as 'bedrijf' | 'klant',
        created_at: item.created_at,
      })
    }

    // Reacties met type 'bericht'
    for (const r of item.reacties) {
      if (r.type === 'bericht' && r.bericht) {
        messages.push({
          id: r.id,
          tekst: r.bericht,
          afzender: 'klant',
          created_at: r.created_at,
        })
      }
    }
  }

  return messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}

export function PortaalBerichtenSection({ items, allItems, token, klantNaam, kanBerichtenSturen, primaire_kleur, onReactie }: Props) {
  const [bericht, setBericht] = useState('')
  const [loading, setLoading] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const messages = extractMessages(items)
  const hasMessages = messages.length > 0

  // Auto-scroll naar beneden bij nieuwe berichten
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  // Niet tonen als er geen berichten zijn en klant niet kan sturen
  if (!hasMessages && !kanBerichtenSturen) return null

  async function handleSend() {
    if (!bericht.trim() || loading) return
    setLoading(true)
    try {
      const lastItemId = allItems.length > 0 ? allItems[allItems.length - 1].id : ''
      if (!lastItemId) return

      await fetch('/api/portaal-reactie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          portaal_item_id: lastItemId,
          type: 'bericht',
          bericht: bericht.trim(),
          klant_naam: klantNaam.trim() || undefined,
        }),
      })
      setBericht('')
      onReactie()
    } catch {
      // Ignore
    } finally {
      setLoading(false)
    }
  }

  // Group messages by date
  const grouped: { date: string; messages: Message[] }[] = []
  for (const msg of messages) {
    const date = formatDate(msg.created_at)
    const last = grouped[grouped.length - 1]
    if (last && last.date === date) {
      last.messages.push(msg)
    } else {
      grouped.push({ date, messages: [msg] })
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-1">Berichten</h2>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Message list */}
        {hasMessages ? (
          <div ref={scrollRef} className="px-5 py-4 space-y-4 max-h-[400px] overflow-y-auto">
            {grouped.map(group => (
              <div key={group.date} className="space-y-2">
                <p className="text-xs text-gray-400 text-center">{group.date}</p>
                {group.messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.afzender === 'klant' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                        msg.afzender === 'klant'
                          ? 'bg-gray-900 text-white rounded-br-md'
                          : 'bg-gray-100 text-gray-800 rounded-bl-md'
                      }`}
                    >
                      {msg.foto_url && (
                        <img
                          src={msg.foto_url}
                          alt={msg.tekst || 'Foto'}
                          className="max-w-[240px] rounded-lg mb-1.5 cursor-pointer"
                          onClick={() => setLightboxUrl(msg.foto_url!)}
                        />
                      )}
                      {msg.tekst && (
                        <p className="whitespace-pre-wrap break-words">{msg.tekst}</p>
                      )}
                      <p className={`text-xs mt-1 ${msg.afzender === 'klant' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8 text-center">
            <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nog geen berichten</p>
          </div>
        )}

        {/* Input */}
        {kanBerichtenSturen && (
          <div className="border-t border-gray-100 px-4 py-3">
            <div className="flex items-end gap-2">
              <textarea
                value={bericht}
                onChange={(e) => {
                  setBericht(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Stel een vraag..."
                rows={1}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent resize-none"
                style={{ '--tw-ring-color': primaire_kleur, minHeight: '38px' } as React.CSSProperties}
              />
              <button
                onClick={handleSend}
                disabled={loading || !bericht.trim()}
                className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-40"
                style={{ backgroundColor: primaire_kleur }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <PortaalLightbox
          images={[{ url: lightboxUrl, bestandsnaam: '' }]}
          startIndex={0}
          onClose={() => setLightboxUrl(null)}
        />
      )}
    </section>
  )
}
