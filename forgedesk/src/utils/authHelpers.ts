import type { Medewerker } from '@/types'

interface UserLike {
  user_metadata?: {
    app_rol?: string
  } & Record<string, unknown>
}

export function isAdminUser(medewerker?: Medewerker | null, user?: UserLike | null): boolean {
  if (medewerker?.rol === 'admin') return true
  if (medewerker?.app_rol === 'admin') return true
  if (user?.user_metadata?.app_rol === 'admin') return true
  return false
}
