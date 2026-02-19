import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, ArrowRight, Loader2 } from 'lucide-react'
import { getEmails } from '@/services/supabaseService'
import type { Email } from '@/types'
import { getInitials, cn } from '@/lib/utils'

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return 'Zojuist'
  if (diffMinutes < 60) return `${diffMinutes} min geleden`
  if (diffHours < 24) return `${diffHours} uur geleden`
  if (diffDays === 1) return 'Gisteren'
  if (diffDays < 7) return `${diffDays} dagen geleden`
  return `${Math.floor(diffDays / 7)} weken geleden`
}

function extractName(from: string): string {
  // Extract name from format "Name <email>"
  const match = from.match(/^(.+?)\s*</)
  return match ? match[1].trim() : from
}

const avatarColors = [
  'bg-primary',
  'bg-green-500',
  'bg-[#4A442D]',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
]

export function EmailCommunicationHub() {
  const navigate = useNavigate()
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getEmails()
      .then(setEmails)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const recentUnread = useMemo(() => {
    return [...emails]
      .filter((e) => !e.gelezen)
      .sort(
        (a, b) =>
          new Date(b.datum).getTime() - new Date(a.datum).getTime()
      )
      .slice(0, 3)
  }, [emails])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-gradient-to-br from-accent to-primary shadow-md">
              <Mail className="h-4 w-4 text-white" />
            </div>
            <span>Recente Berichten</span>
          </CardTitle>
          {recentUnread.length > 0 && (
            <span className="flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-accent text-white text-[11px] font-bold">
              {recentUnread.length}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : recentUnread.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
            Geen ongelezen berichten
          </p>
        ) : (
          recentUnread.map((email, index) => {
            const senderName = extractName(email.van)
            const initials = getInitials(senderName)
            const colorClass =
              avatarColors[index % avatarColors.length]

            return (
              <div
                key={email.id}
                onClick={() => navigate('/email')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate('/email')}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150 cursor-pointer"
              >
                {/* Avatar */}
                <div
                  className={cn(
                    'flex items-center justify-center h-10 w-10 rounded-full text-white text-sm font-semibold flex-shrink-0',
                    colorClass
                  )}
                >
                  {initials}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {senderName}
                    </p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
                        {timeAgo(email.datum)}
                      </span>
                      {/* Unread indicator */}
                      <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-0.5">
                    {email.onderwerp}
                  </p>
                </div>
              </div>
            )
          })
        )}

        {/* View all link */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
          <Link
            to="/email"
            className="flex items-center justify-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors py-1"
          >
            Bekijk alle berichten
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
