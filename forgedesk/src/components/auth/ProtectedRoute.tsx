import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, organisatieId, organisatie } = useAuth()
  const location = useLocation()

  const loader = (
    <div className="flex items-center justify-center h-screen bg-background dark:bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-muted-foreground">Laden...</p>
      </div>
    </div>
  )

  if (isLoading) return loader
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  if (!organisatieId) return <Navigate to="/welkom" replace />
  if (organisatieId && !organisatie) return loader
  if (organisatie && !organisatie.onboarding_compleet) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}
