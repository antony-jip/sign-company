import { useSearchParams, Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'

export function BetaaldPagina() {
  const [searchParams] = useSearchParams()
  const factuurId = searchParams.get('factuur_id')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Betaling ontvangen</h2>
          <p className="text-sm text-muted-foreground">
            Bedankt voor uw betaling. De factuur wordt automatisch als betaald gemarkeerd.
          </p>
          {factuurId && (
            <p className="text-xs text-muted-foreground/60 font-mono">
              Referentie: {factuurId.substring(0, 8)}...
            </p>
          )}
          <Link
            to="/"
            className="text-sm text-primary underline mt-2"
          >
            Terug naar de startpagina
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
