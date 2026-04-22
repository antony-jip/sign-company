import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

interface TrialGuardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TrialGuardDialog({ open, onOpenChange }: TrialGuardDialogProps) {
  const navigate = useNavigate()

  const handleActivate = () => {
    onOpenChange(false)
    navigate('/instellingen?tab=abonnement')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[18px] font-bold tracking-tight" style={{ color: '#1A1A1A' }}>
            Je proefperiode is verlopen
          </DialogTitle>
          <DialogDescription className="text-[14px] pt-2" style={{ color: '#6B6B66', lineHeight: 1.6 }}>
            Bedankt voor het uitproberen van doen. Activeer je abonnement om verder te gaan — je data blijft bewaard.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="sm:order-1"
          >
            Sluiten
          </Button>
          <Button
            onClick={handleActivate}
            className="text-white font-bold sm:order-2 inline-flex items-center gap-2"
            style={{ backgroundColor: '#F15025' }}
          >
            Activeer abonnement — €49/maand
            <ArrowRight className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
