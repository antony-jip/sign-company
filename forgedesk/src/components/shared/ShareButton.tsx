import { Button } from '@/components/ui/button'
import { Share2 } from 'lucide-react'
import { toast } from 'sonner'

interface ShareButtonProps {
  title: string
  url: string
  className?: string
}

export function ShareButton({ title, url, className }: ShareButtonProps) {
  const handleShare = async () => {
    const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`

    if (navigator.share) {
      try {
        await navigator.share({ title, url: fullUrl })
      } catch (err) {
        // User cancelled share — ignore AbortError
        if (err instanceof Error && err.name !== 'AbortError') {
          toast.error('Delen mislukt')
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(fullUrl)
        toast.success('Link gekopieerd naar klembord')
      } catch (err) {
        toast.error('Kon link niet kopiëren')
      }
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleShare} className={className}>
      <Share2 className="h-4 w-4 mr-1.5" />
      Deel
    </Button>
  )
}
