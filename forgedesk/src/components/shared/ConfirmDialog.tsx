import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

// ── Types ──────────────────────────────────────────────────────────────────

interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
}

type ConfirmResolver = (confirmed: boolean) => void
type DialogState = (ConfirmOptions & { resolve: ConfirmResolver }) | null

// ── Singleton state ────────────────────────────────────────────────────────

let _setDialog: (opts: DialogState) => void = () => {}
let _currentResolve: ConfirmResolver | null = null

/**
 * Programmatic confirm that returns a Promise<boolean>.
 * Replaces window.confirm with an in-app dialog.
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    if (_currentResolve) _currentResolve(false)
    _currentResolve = resolve
    _setDialog({ ...options, resolve })
  })
}

// ── React component (mount once at app root) ──────────────────────────────

export function ConfirmDialog() {
  const [state, setState] = useState<DialogState>(null)

  useEffect(() => {
    _setDialog = setState
    return () => { _setDialog = () => {} }
  }, [])

  const handleClose = useCallback((confirmed: boolean) => {
    if (state?.resolve) {
      state.resolve(confirmed)
      _currentResolve = null
    }
    setState(null)
  }, [state])

  if (!state) return null

  return (
    <Dialog open onOpenChange={(open) => { if (!open) handleClose(false) }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{state.title || 'Bevestigen'}</DialogTitle>
          <DialogDescription>{state.message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            {state.cancelLabel || 'Annuleren'}
          </Button>
          <Button
            variant={state.variant === 'destructive' ? 'destructive' : 'default'}
            onClick={() => handleClose(true)}
          >
            {state.confirmLabel || 'OK'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
