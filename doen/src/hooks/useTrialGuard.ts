import { useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export function useTrialGuard() {
  const { trialStatus } = useAuth()

  const isBlocked = trialStatus === 'verlopen' || trialStatus === 'opgezegd'

  const [showDialog, setShowDialog] = useState(false)

  const guardAction = useCallback(
    (action: () => void) => {
      if (isBlocked) {
        setShowDialog(true)
        return
      }
      action()
    },
    [isBlocked]
  )

  return { isBlocked, guardAction, showDialog, setShowDialog }
}
