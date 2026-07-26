import { ArrowUpRight } from 'lucide-react'

// hello@doen.team is geen postbus die iemand leest · alle hulpvragen lopen
// via het contactformulier op de site.
const CONTACT_URL = 'https://doen.team/contact'

export function ImportHulpBanner() {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/50 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-foreground">Kom je er niet uit?</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Geen probleem. Laat via{' '}
          <a
            href={CONTACT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-petrol hover:underline font-medium"
          >
            het contactformulier
          </a>{' '}
          weten wat je hebt liggen, dan regelen wij de import voor je. Gratis, zonder gedoe.
        </p>
      </div>
      <a
        href={CONTACT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-petrol bg-[hsl(var(--status-green-bg))] hover:bg-[#D0E6E6] transition-colors whitespace-nowrap"
      >
        Neem contact op
        <ArrowUpRight className="w-4 h-4" />
      </a>
    </div>
  )
}
