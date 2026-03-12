import { useState, useEffect } from 'react'
import { ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import { logger } from '../../utils/logger'

interface NewsItem {
  title: string
  link: string
  pubDate: string
  source: string
}

const RSS_FEEDS = [
  { url: 'https://feeds.nos.nl/nosnieuwsalgemeen', source: 'NOS' },
]

// Use rss2json.com as a free RSS-to-JSON proxy
const RSS2JSON_URL = 'https://api.rss2json.com/v1/api.json?rss_url='

export function NieuwsWidget() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchNews = async () => {
    setLoading(true)
    setError(false)
    try {
      const feed = RSS_FEEDS[0]
      const res = await fetch(`${RSS2JSON_URL}${encodeURIComponent(feed.url)}`)
      if (!res.ok) throw new Error('Feed fetch failed')
      const data = await res.json()
      if (data.status !== 'ok') throw new Error('Feed parse failed')

      const newsItems: NewsItem[] = data.items.slice(0, 5).map((item: { title: string; link: string; pubDate: string }) => ({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        source: feed.source,
      }))
      setItems(newsItems)
    } catch (err) {
      logger.error('News fetch error:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNews()
  }, [])

  function formatTime(dateStr: string): string {
    const date = new Date(dateStr)
    const now = new Date()
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    if (diffHours < 1) return 'Zojuist'
    if (diffHours < 24) return `${diffHours}u geleden`
    return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-6 gap-2">
        <p className="text-xs text-muted-foreground">Nieuws kon niet geladen worden</p>
        <button
          onClick={fetchNews}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium"
        >
          <RefreshCw className="h-3 w-3" /> Opnieuw proberen
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {items.map((item, i) => (
        <a
          key={i}
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {item.title}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-medium text-primary/70">{item.source}</span>
              <span className="text-[10px] text-muted-foreground/40">{formatTime(item.pubDate)}</span>
            </div>
          </div>
          <ExternalLink className="h-3 w-3 text-muted-foreground/30 group-hover:text-primary/50 flex-shrink-0 mt-0.5" />
        </a>
      ))}
    </div>
  )
}
