import type { ReactNode } from 'react'
export function AuthProvider({ children }: { children: ReactNode }) { return <>{children}</> }
export function useAuth() {
  return {
    user: { id: 'film', email: 'kees@signcompany.nl' },
    organisatieId: 'film',
    profiel: { rol: 'admin' },
    loading: false,
    isTrialExpired: false,
    isTrialBlocked: false,
  }
}
