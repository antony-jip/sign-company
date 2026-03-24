import { Mail } from 'lucide-react'

const MAILTO_HREF =
  'mailto:hello@doen.team?subject=Import%20hulp&body=Hoi%2C%20ik%20wil%20graag%20hulp%20bij%20het%20importeren%20van%20mijn%20data.%0A%0AMijn%20inlognaam%3A%20%0A'

export function ImportHulpBanner() {
  return (
    <div className="rounded-2xl border border-border/60 bg-[#F4F2EE]/50 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-foreground">Kom je er niet uit?</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Geen probleem. Stuur je bestanden en je inlognaam naar{' '}
          <a href={MAILTO_HREF} className="text-[#1A535C] hover:underline font-medium">
            hello@doen.team
          </a>{' '}
          en wij regelen de import voor je. Gratis, zonder gedoe.
        </p>
      </div>
      <a
        href={MAILTO_HREF}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[#1A535C] bg-[#E2F0F0] hover:bg-[#D0E6E6] transition-colors whitespace-nowrap"
      >
        <Mail className="w-4 h-4" />
        Mail ons
      </a>
    </div>
  )
}
