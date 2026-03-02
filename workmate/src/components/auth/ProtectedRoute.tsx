import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'
import { LandingPage } from '@/components/landing/LandingPage'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-500">Laden...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    // On root "/" → show landing page instead of redirecting to login
    if (location.pathname === '/') {
      return <LandingPage />
    }
    // On any other protected route → redirect to login
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
