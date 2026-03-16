import { useEffect } from 'react'

/**
 * Shows a browser warning when the user tries to close/navigate away
 * with unsaved changes. Pass `true` when the form has been modified.
 */
export function useUnsavedWarning(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])
}
