import React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Home, ArrowLeft, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
        <MapPin className="w-12 h-12 text-blue-500 dark:text-blue-400" />
      </div>
      <h1 className="text-4xl font-bold text-foreground dark:text-white mb-2">404</h1>
      <h2 className="text-xl font-semibold text-foreground/70 dark:text-muted-foreground/50 mb-2">Pagina niet gevonden</h2>
      <p className="text-muted-foreground dark:text-muted-foreground/60 max-w-md mb-8">
        De pagina die je zoekt bestaat niet of is verplaatst. Controleer de URL of ga terug naar het dashboard.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Ga terug
        </Button>
        <Button asChild>
          <Link to="/">
            <Home className="w-4 h-4 mr-2" />
            Dashboard
          </Link>
        </Button>
      </div>
    </div>
  )
}
