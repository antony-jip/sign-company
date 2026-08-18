import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'

interface CompletionPromptModalProps {
  open: boolean
  onClose: () => void
  projectNaam: string
  onUpdateStatus: (status: string) => void
}

const STATUSSEN = [
  { value: 'opgeleverd', label: 'Opgeleverd' },
  { value: 'te-factureren', label: 'Te factureren' },
  { value: 'afgerond', label: 'Afgerond' },
]

export function CompletionPromptModal({
  open,
  onClose,
  projectNaam,
  onUpdateStatus,
}: CompletionPromptModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            Alle taken afgerond
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Alle taken van <strong>{projectNaam}</strong> zijn afgerond. Wil je de projectstatus bijwerken?
        </p>

        <div className="flex flex-col gap-2">
          {STATUSSEN.map((s) => (
            <Button
              key={s.value}
              variant="outline"
              className="justify-start"
              onClick={() => {
                onUpdateStatus(s.value)
                onClose()
              }}
            >
              Markeer als {s.label}
            </Button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Niet nu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
