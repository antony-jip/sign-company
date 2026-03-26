import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { MessageSquare } from 'lucide-react'
import { PortaalChatDaySeparator } from './PortaalChatDaySeparator'
import { PortaalChatBubble, type ChatMessage } from './PortaalChatBubble'
import { PortaalChatRichCard } from './PortaalChatRichCard'
import { PortaalChatInput, type SendPayload } from './PortaalChatInput'
import { PortaalLightbox } from './PortaalLightbox'
import type { PortaalItem, Offerte, Factuur } from '@/types'

// ---------------------------------------------------------------------------
// Timeline entry — unified type for rendering
// ---------------------------------------------------------------------------

interface TimelineBase {
  key: string
  ts: string
}

interface DaySeparatorEntry extends TimelineBase {
  kind: 'day_separator'
  date: string
}

interface BubbleEntry extends TimelineBase {
  kind: 'bubble'
  message: ChatMessage
}

interface RichCardEntry extends TimelineBase {
  kind: 'rich_card'
  item: PortaalItem
}

type TimelineEntry = DaySeparatorEntry | BubbleEntry | RichCardEntry

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PortaalChatProps {
  items: PortaalItem[]
  isPublic: boolean
  bedrijfNaam?: string
  // Intern-only
  offertes?: Offerte[]
  facturen?: Factuur[]
  onSend?: (payload: SendPayload) => Promise<void>
  onApprove?: (itemId: string) => void
  onRevisie?: (itemId: string) => void
  disabled?: boolean
  instellingen?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dateKey(ts: string): string {
  return new Date(ts).toISOString().split('T')[0]
}

function isBubbleItem(item: PortaalItem): boolean {
  const bt = item.bericht_type
  return bt === 'tekst' || bt === 'notitie_intern'
}

function isRichCardItem(item: PortaalItem): boolean {
  if (item.bericht_type === 'foto') return true
  if (item.bericht_type === 'item' || !item.bericht_type) {
    return ['offerte', 'tekening', 'factuur'].includes(item.type)
  }
  // Fallback: old bericht items with omschrijving
  if (item.type === 'bericht' && !item.bericht_type) return false
  return false
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PortaalChat({
  items,
  isPublic,
  bedrijfNaam,
  offertes,
  facturen,
  onSend,
  onApprove,
  onRevisie,
  disabled,
  instellingen,
}: PortaalChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // --- build timeline -------------------------------------------------------
  const timeline = useMemo(() => {
    type TempEntry = (BubbleEntry | RichCardEntry) & { key: string }

    const entries: TempEntry[] = []

    for (const item of items) {
      if (isPublic && item.bericht_type === 'notitie_intern') continue
      if (isPublic && !item.zichtbaar_voor_klant) continue

      const source = (item.afzender || 'bedrijf') as 'bedrijf' | 'klant'
      const ts = item.created_at

      if (isBubbleItem(item)) {
        entries.push({
          kind: 'bubble',
          key: `msg-${item.id}`,
          ts,
          message: {
            id: item.id,
            type: 'bubble',
            source,
            timestamp: ts,
            text: item.bericht_tekst || item.omschrijving || '',
            isInternalNote: item.bericht_type === 'notitie_intern',
            senderName: source === 'bedrijf' ? (bedrijfNaam || 'Jij') : 'Klant',
          },
        })
      } else if (isRichCardItem(item)) {
        entries.push({ kind: 'rich_card', key: `card-${item.id}`, ts, item })
      } else {
        // Old-style bericht items → show as bubble
        entries.push({
          kind: 'bubble',
          key: `msg-${item.id}`,
          ts,
          message: {
            id: item.id,
            type: 'bubble',
            source,
            timestamp: ts,
            text: item.omschrijving || item.titel || '',
            senderName: source === 'bedrijf' ? (bedrijfNaam || 'Jij') : 'Klant',
          },
        })
      }

    }

    // Sort chronologically
    entries.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())

    // Insert day separators
    const result: TimelineEntry[] = []
    let lastDay = ''
    for (const entry of entries) {
      const day = dateKey(entry.ts)
      if (day !== lastDay) {
        result.push({ kind: 'day_separator', date: entry.ts, key: `day-${day}`, ts: entry.ts })
        lastDay = day
      }
      result.push(entry)
    }

    return result
  }, [items, isPublic, bedrijfNaam])

  // --- auto-scroll to bottom ------------------------------------------------
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    // Scroll on initial load and when items change
    const timer = setTimeout(scrollToBottom, 100)
    return () => clearTimeout(timer)
  }, [timeline.length, scrollToBottom])

  // --- image lightbox -------------------------------------------------------
  const handleImageClick = useCallback((url: string) => {
    setLightboxUrl(url)
  }, [])

  // --- render ---------------------------------------------------------------
  const isOwnMessage = useCallback(
    (source: string) => {
      // In public view: klant messages are "own" (right side)
      // In internal view: bedrijf messages are "own" (right side)
      return isPublic ? source === 'klant' : source === 'bedrijf'
    },
    [isPublic],
  )

  if (items.length === 0 && !onSend) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <MessageSquare className="h-12 w-12 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-muted-foreground">Start de conversatie met je klant</p>
          <p className="text-sm text-muted-foreground">Deel offertes, tekeningen en berichten via het portaal</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Scrollable chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-2xl space-y-3">
          {timeline.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Start de conversatie met je klant</p>
                <p className="text-sm text-muted-foreground">Deel offertes, tekeningen en berichten via het portaal</p>
              </div>
            </div>
          )}
          {timeline.map((entry) => {
            switch (entry.kind) {
              case 'day_separator':
                return <PortaalChatDaySeparator key={entry.key} date={entry.date} />
              case 'bubble':
                return (
                  <PortaalChatBubble
                    key={entry.key}
                    message={entry.message}
                    isOwnMessage={isOwnMessage(entry.message.source)}
                    onImageClick={handleImageClick}
                  />
                )
              case 'rich_card':
                return (
                  <PortaalChatRichCard
                    key={entry.key}
                    item={entry.item}
                    isPublic={isPublic}
                    onApprove={onApprove}
                    onRevisie={onRevisie}
                    onImageClick={handleImageClick}
                    instellingen={instellingen}
                  />
                )
              default:
                return null
            }
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Message input bar */}
      {onSend && (
        <PortaalChatInput
          isPublic={isPublic}
          offertes={offertes}
          facturen={facturen}
          onSend={onSend}
          disabled={disabled}
          kanBestandenUploaden={instellingen?.klant_kan_bestanden_uploaden !== false}
          kanBerichtenSturen={instellingen?.klant_kan_berichten_sturen !== false}
        />
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <PortaalLightbox
          images={[{ url: lightboxUrl, bestandsnaam: '' }]}
          startIndex={0}
          onClose={() => setLightboxUrl(null)}
        />
      )}
    </div>
  )
}
