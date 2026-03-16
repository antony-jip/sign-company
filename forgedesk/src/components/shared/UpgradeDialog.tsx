import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ShieldAlert } from 'lucide-react'

interface UpgradeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UpgradeDialog({ open, onOpenChange }: UpgradeDialogProps) {
  const navigate = useNavigate()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle>Je proefperiode is verlopen</DialogTitle>
          </div>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Je data staat veilig. Kies een abonnement om verder te werken.
        </p>
        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Sluiten
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false)
              navigate('/instellingen?tab=abonnement')
            }}
            className="flex-1"
          >
            Abonnement kiezen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
