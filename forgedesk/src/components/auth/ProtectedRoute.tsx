import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const ONBOARDING_ROUTES = ['/welkom', '/team-welkom', '/onboarding']

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, organisatieId, organisatie } = useAuth()
  const location = useLocation()
  const isOnboardingPath = ONBOARDING_ROUTES.some(r => location.pathname.startsWith(r))

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

  if (isLoading) return loader
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  if (!organisatieId) return <Navigate to="/welkom" replace />
  if (organisatieId && !organisatie) return loader
  if (organisatie && !organisatie.onboarding_compleet && !isOnboardingPath) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}
