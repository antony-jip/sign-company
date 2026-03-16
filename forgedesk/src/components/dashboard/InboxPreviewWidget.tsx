import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Loader2 } from 'lucide-react'
import { getEmails } from '@/services/supabaseService'
import type { Email } from '@/types'
import { getInitials, cn } from '@/lib/utils'
import { logger } from '../../utils/logger'

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return 'Zojuist'
  if (diffMinutes < 60) return `${diffMinutes}m`
  if (diffHours < 24) return `${diffHours}u`
  if (diffDays === 1) return 'Gisteren'
  return `${diffDays}d`
}

function extractName(from: string): string {
  const match = from.match(/^(.+?)\s*</)
  return match ? match[1].trim() : from
}

const avatarColors = [
  'bg-primary', 'bg-green-500', 'bg-[#4A442D]',
  'bg-orange-500', 'bg-pink-500', 'bg-teal-500',
]

export function InboxPreviewWidget() {
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getEmails()
      .then((data) => { if (!cancelled) setEmails(data) })
      .catch(logger.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const recentEmails = useMemo(() => {
    return [...emails]
      .sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())
      .slice(0, 4)
  }, [emails])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (recentEmails.length === 0) {
    return (
      <p className="text-sm text-muted-foreground/60 py-6 text-center">
        Geen emails gevonden
      </p>
    )
  }

  return (
    <div className="space-y-1">
      {recentEmails.map((email, index) => {
        const senderName = extractName(email.van)
        const initials = getInitials(senderName)
        return (
          <Link
            key={email.id}
            to="/email"
            className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className={cn(
              'flex items-center justify-center h-8 w-8 rounded-full text-white text-[11px] font-semibold flex-shrink-0',
              avatarColors[index % avatarColors.length]
            )}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-foreground truncate">{senderName}</p>
                <span className="text-[10px] text-muted-foreground/50 flex-shrink-0">{timeAgo(email.datum)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">{email.onderwerp}</p>
            </div>
            {!email.gelezen && (
              <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
            )}
          </Link>
        )
      })}
      <div className="pt-2 border-t border-border/50">
        <Link
          to="/email"
          className="flex items-center justify-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors py-1"
        >
          Bekijk inbox <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}
