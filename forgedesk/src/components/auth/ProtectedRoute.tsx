import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const ONBOARDING_ROUTES = ['/welkom', '/team-welkom', '/onboarding']

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, organisatieId, organisatie } = useAuth()
  const location = useLocation()
  const isOnboardingPath = ONBOARDING_ROUTES.some(r => location.pathname.startsWith(r))

  const loader = (
    <div className="flex items-center justify-center h-screen bg-background dark:bg-background">
      <style>{`
        @keyframes doen-loader-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.45); opacity: 0.55; }
        }
        .doen-loader-dot {
          display: inline-block;
          animation: doen-loader-pulse 1.35s ease-in-out infinite;
          transform-origin: center;
        }
      `}</style>
      <p
        aria-label="Laden"
        style={{
          fontFamily: '"Bricolage Grotesque", sans-serif',
          fontWeight: 800,
          fontSize: 72,
          color: '#1A535C',
          letterSpacing: '-0.04em',
          lineHeight: 1,
        }}
      >
        doen<span className="doen-loader-dot" style={{ color: '#F15025' }}>.</span>
      </p>
    </div>
  )

  if (isLoading) return loader
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  if (!organisatieId) return <Navigate to="/welkom" replace />
  if (organisatieId && !organisatie) return loader
  if (organisatie && !organisatie.onboarding_compleet && !isOnboardingPath) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}
