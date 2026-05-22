import { useState } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useInkoopAIUsage, type RouteUsage } from '@/hooks/useInkoopAIUsage'

const SUPPORT_EMAIL = 'hello@doen.team'

const ROUTE_LABEL: Record<'extract' | 'analyze', string> = {
  extract: 'inkoopfacturen',
  analyze: 'inkoopofferte-analyse',
}

type Props =
  | { variant: 'lokaal'; route: 'extract' | 'analyze' }
  | { variant: 'globaal'; route?: never }

function Cta({ children }: { children: React.ReactNode }) {
  return (
    <a
      href={`mailto:${SUPPORT_EMAIL}`}
      className="underline font-semibold hover:no-underline"
    >
      {children}
    </a>
  )
}

function LokaalBanner({ route, usage }: { route: 'extract' | 'analyze'; usage: RouteUsage }) {
  const { isAdmin } = useAuth()
  const dismissKey = `doen_inkoop_warning_dismissed_${route}_${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, '0')}`
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(dismissKey) === '1')

  if (!usage.warning || usage.blocked || dismissed) return null

  const handleDismiss = () => {
    sessionStorage.setItem(dismissKey, '1')
    setDismissed(true)
  }

  return (
    <div
      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-[hsl(var(--status-flame-bg))] dark:bg-[#F15025]/10 text-[#C03A18] dark:text-[#F15025]"
      style={{ minHeight: 36 }}
      role="status"
    >
      <span className="text-center">
        Je organisatie nadert de AI-limiet voor {ROUTE_LABEL[route]}:{' '}
        <strong>{usage.used} van {usage.cap}</strong> deze maand
        {isAdmin && <> — <Cta>Mail {SUPPORT_EMAIL} om te verhogen</Cta></>}
      </span>
      <button
        onClick={handleDismiss}
        className="ml-1 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex-shrink-0"
        aria-label="Sluiten"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function GlobaalBanner({ usage }: { usage: { extract: RouteUsage; analyze: RouteUsage } }) {
  const { isAdmin } = useAuth()

  const blockedRoutes: Array<'extract' | 'analyze'> = []
  if (usage.extract.blocked) blockedRoutes.push('extract')
  if (usage.analyze.blocked) blockedRoutes.push('analyze')

  if (blockedRoutes.length === 0) return null

  const labels = blockedRoutes.map(r => ROUTE_LABEL[r]).join(' en ')

  return (
    <div
      className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium bg-[hsl(var(--status-flame-bg))] dark:bg-[#F15025]/20 text-[#C03A18] dark:text-[#F15025]"
      style={{ minHeight: 36 }}
      role="alert"
    >
      <span className="text-center">
        AI-limiet bereikt voor <strong>{labels}</strong>
        {isAdmin && <> — <Cta>Mail {SUPPORT_EMAIL} om te verhogen</Cta></>}
      </span>
    </div>
  )
}

export function InkoopAILimietBanner(props: Props) {
  const { data } = useInkoopAIUsage()
  if (!data) return null

  if (props.variant === 'lokaal') {
    const usage = props.route === 'extract' ? data.extract : data.analyze
    return <LokaalBanner route={props.route} usage={usage} />
  }

  return <GlobaalBanner usage={data} />
}
