import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { UserCheck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { useMedewerkers } from '@/contexts/MedewerkersContext'
import { MedewerkerSelector } from '@/components/shared/MedewerkerSelector'
import { vraagOfferteCheck } from '@/services/offerteCheckService'
import { logger } from '@/utils/logger'
import type { Medewerker } from '@/types'

interface OfferteCheckDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  offerteId: string
  offerteNummer: string
  onGevraagd: (result: { aanUserId: string; aanNaam: string; notitie?: string; updatedAt?: string }) => void
}

export function OfferteCheckDialog({ open, onOpenChange, offerteId, offerteNummer, onGevraagd }: OfferteCheckDialogProps) {
  const { user } = useAuth()
  const { medewerkers } = useMedewerkers()
  const [gekozenId, setGekozenId] = useState<string | null>(null)
  const [notitie, setNotitie] = useState('')
  const [bezig, setBezig] = useState(false)

  // Alleen collega's met een eigen login kunnen een melding ontvangen.
  const kanChecken = (m: Medewerker) => !!m.user_id && m.user_id !== user?.id

  const gekozen = gekozenId ? medewerkers.find((m) => m.id === gekozenId) : null

  const handleVragen = async () => {
    if (!gekozen?.user_id) {
      toast.error('Kies eerst een collega')
      return
    }
    setBezig(true)
    try {
      const result = await vraagOfferteCheck(offerteId, gekozen.user_id, notitie.trim() || undefined)
      toast.success(<>Check gevraagd aan {gekozen.naam}<span style={{ color: '#F15025' }}>.</span></>)
      onGevraagd({
        aanUserId: gekozen.user_id,
        aanNaam: gekozen.naam,
        notitie: notitie.trim() || undefined,
        updatedAt: result.offerte?.updated_at,
      })
      setGekozenId(null)
      setNotitie('')
      onOpenChange(false)
    } catch (err) {
      logger.error('Check aanvragen mislukt:', err)
      toast.error(err instanceof Error && err.message ? err.message : 'Kon de check niet aanvragen')
    } finally {
      setBezig(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!bezig) onOpenChange(v) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Laten checken<span className="text-flame">.</span></DialogTitle>
          <DialogDescription>
            Je collega krijgt een melding en een mail, en kan de offerte {offerteNummer} goedkeuren of zelf versturen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="check-collega">Collega</Label>
            <MedewerkerSelector
              id="check-collega"
              mode="single"
              medewerkers={medewerkers}
              rolFilter={kanChecken}
              value={gekozenId}
              onChange={setGekozenId}
              valueKind="id"
              trigger="input"
              placeholder="Zoek collega…"
              popoverAlign="start"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="check-notitie">Notitie <span className="text-muted-foreground font-normal">(optioneel)</span></Label>
            <Textarea
              id="check-notitie"
              value={notitie}
              onChange={(e) => setNotitie(e.target.value)}
              placeholder="Waar moet je collega op letten?"
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={bezig}
            className="inline-flex items-center justify-center h-9 px-4 text-[13px] font-medium rounded-xl border border-[rgba(26,83,92,0.12)] dark:border-white/10 text-foreground/70 hover:text-petrol dark:hover:text-petrol-light hover:border-[rgba(26,83,92,0.25)] dark:hover:border-white/20 transition-all disabled:opacity-50"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={handleVragen}
            disabled={bezig || !gekozen}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 text-[13px] font-semibold rounded-xl bg-flame text-white hover:bg-[#E04520] shadow-[0_2px_8px_rgba(241,80,37,0.25)] transition-all disabled:opacity-50"
          >
            {bezig ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" strokeWidth={1.75} />}
            {bezig ? 'Versturen…' : 'Vraag check aan'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
