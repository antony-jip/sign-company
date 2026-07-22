import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const ONBOARDING_ROUTES = ['/welkom', '/team-welkom', '/onboarding']

// Na deze tijd gaan we ervan uit dat het laden van de organisatie niet meer
// goedkomt en bieden we een uitweg in plaats van een eeuwig pulserend logo.
const LAAD_TIMEOUT_MS = 10000

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, organisatieId, organisatie, refreshOrganisatie, logout } = useAuth()
  const location = useLocation()
  const isOnboardingPath = ONBOARDING_ROUTES.some(r => location.pathname.startsWith(r))

  const wachtOpOrganisatie = isLoading || (!!organisatieId && !organisatie)
  const [timeoutBereikt, setTimeoutBereikt] = React.useState(false)
  const [opnieuwBezig, setOpnieuwBezig] = React.useState(false)

  React.useEffect(() => {
    if (!wachtOpOrganisatie) {
      setTimeoutBereikt(false)
      return
    }
    const t = setTimeout(() => setTimeoutBereikt(true), LAAD_TIMEOUT_MS)
    return () => clearTimeout(t)
  }, [wachtOpOrganisatie])

  const loader = (
    <div className="flex items-center justify-center h-screen bg-background">
      <style>{`
        @keyframes doen-loader-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        .doen-loader-logo {
          animation: doen-loader-pulse 1.35s ease-in-out infinite;
        }
      `}</style>
      <img
        src="/logos/doen-logo.svg"
        alt="doen."
        aria-label="Laden"
        className="doen-loader-logo w-[180px] dark:hidden"
      />
      <img
        src="/logos/doen-logo-wit.svg"
        alt="doen."
        aria-hidden
        className="doen-loader-logo w-[180px] hidden dark:block"
      />
    </div>
  )

  if (wachtOpOrganisatie && timeoutBereikt) {
    return (
      <div className="flex items-center justify-center h-screen bg-background px-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <p className="text-[15px] font-semibold text-foreground">
            Laden duurt langer dan normaal<span className="text-flame">.</span>
          </p>
          <p className="text-sm text-muted-foreground">
            We konden je gegevens niet ophalen. Controleer je verbinding en probeer het opnieuw.
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              disabled={opnieuwBezig}
              onClick={async () => {
                setOpnieuwBezig(true)
                try { await refreshOrganisatie() } finally {
                  setOpnieuwBezig(false)
                  setTimeoutBereikt(false)
                }
              }}
              className="px-4 py-2 rounded-lg bg-flame text-white text-sm font-semibold disabled:opacity-60"
            >
              {opnieuwBezig ? 'Bezig...' : 'Opnieuw proberen'}
            </button>
            <button
              type="button"
              onClick={() => { void logout() }}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground"
            >
              Uitloggen
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) return loader
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  if (!organisatieId) return <Navigate to="/welkom" replace />
  if (organisatieId && !organisatie) return loader
  if (organisatie && !organisatie.onboarding_compleet && !isOnboardingPath) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}
