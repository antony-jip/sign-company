import { type RefObject } from 'react'
import { MessageCircle } from 'lucide-react'
import type { PortaalItem } from '@/types'
import { TimelineItem, formatDate } from './PortaalTimelineItems'

interface PortaalSidebarTimelineProps {
  items: PortaalItem[]
  voortgang: { goedgekeurd: number; totaal: number }
  timelineEndRef: RefObject<HTMLDivElement>
}

export function PortaalSidebarTimeline({
  items,
  voortgang,
  timelineEndRef,
}: PortaalSidebarTimelineProps) {
  // Group items by date for timeline separators
  const itemsByDate: { date: string; items: PortaalItem[] }[] = []
  items.forEach((item) => {
    const dateKey = new Date(item.created_at).toDateString()
    const last = itemsByDate[itemsByDate.length - 1]
    if (last && last.date === dateKey) {
      last.items.push(item)
    } else {
      itemsByDate.push({ date: dateKey, items: [item] })
    }
  })

  return (
    <>
      {/* Progress bar if there are approvable items */}
      {voortgang.totaal > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-[#FAFAF8] border-b border-[#E6E4E0]">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-[11px] text-muted-foreground">Voortgang</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-[200px]">
              <div
                className="h-full bg-mod-projecten rounded-full transition-all duration-500"
                style={{ width: `${(voortgang.goedgekeurd / voortgang.totaal) * 100}%` }}
              />
            </div>
            <span className="text-[11px] font-medium text-foreground font-mono">
              {voortgang.goedgekeurd}/{voortgang.totaal} goedgekeurd
            </span>
          </div>
        </div>
      )}

      {/* Chat timeline */}
      <div className="max-h-[400px] overflow-y-auto px-4 py-3 space-y-1 bg-[#FAFAF8]">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="h-12 w-12 rounded-2xl bg-mod-projecten-light flex items-center justify-center mb-3">
              <MessageCircle className="h-6 w-6 text-mod-projecten-text" />
            </div>
            <p className="text-sm font-medium text-foreground/70">Nog geen berichten</p>
            <p className="text-[12px] text-muted-foreground/50 mt-1 max-w-[240px]">
              Stuur een bericht, offerte of factuur naar je klant via het portaal.
            </p>
          </div>
        ) : (
          itemsByDate.map((group) => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex items-center gap-3 py-3">
                <div className="flex-1 h-px bg-[#E6E4E0]" />
                <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wide">
                  {formatDate(group.items[0].created_at)}
                </span>
                <div className="flex-1 h-px bg-[#E6E4E0]" />
              </div>
              {/* Items */}
              <div className="space-y-3">
                {group.items.map((item) => (
                  <TimelineItem key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))
        )}
        <div ref={timelineEndRef} />
      </div>
    </>
  )
}
