import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { Textarea } from '@/components/ui/textarea'
import { FolderPlus, Receipt, XCircle, ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { useMedewerkers } from '@/contexts/MedewerkersContext'
import { getOfferte, updateOfferte, converteerOfferteNaarProject, wijsOfferteAf } from '@/services/offerteService'
import { getKlant, updateKlant, updateProject } from '@/services/supabaseService'
import { useFunctie } from '@/hooks/useFunctie'
import { logCreate } from '@/utils/auditLogger'
import { logger } from '@/utils/logger'
import { cn } from '@/lib/utils'
import type { Offerte } from '@/types'
import { WatFacturerenDialog } from '@/components/invoices/WatFacturerenDialog'

const AFWIJS_REDENEN = ['Te duur', 'Te late levering', 'Iets anders'] as const
type AfwijsReden = (typeof AFWIJS_REDENEN)[number]

interface OfferteVervolgDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  offerteId: string
  /** Wordt aangeroepen met de bijgewerkte offerte zodra er iets is gewijzigd. */
  onBijgewerkt?: (offerte: Offerte) => void
}

export function OfferteVervolgDialog({ open, onOpenChange, offerteId, onBijgewerkt }: OfferteVervolgDialogProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { medewerkers } = useMedewerkers()
  const prospectWordtKlant = useFunctie('prospect_wordt_klant')
  const [offerte, setOfferte] = useState<Offerte | null>(null)
  const [bezig, setBezig] = useState<'project' | 'factuur' | 'afwijzen' | null>(null)
  const deelfactuurAan = useFunctie('factuur_deelfactuur')
  const [watFacturerenOpen, setWatFacturerenOpen] = useState(false)
  const [afwijzenOpen, setAfwijzenOpen] = useState(false)
  const [reden, setReden] = useState<AfwijsReden | null>(null)
  const [toelichting, setToelichting] = useState('')

  useEffect(() => {
    if (!open) return
    let afgebroken = false
    setAfwijzenOpen(false)
    setReden(null)
    setToelichting('')
    getOfferte(offerteId)
      .then((o) => { if (!afgebroken) setOfferte(o) })
      .catch((err) => {
        logger.error('Offerte laden voor vervolg mislukt:', err)
        toast.error('Kon offerte niet laden')
      })
    return () => { afgebroken = true }
  }, [open, offerteId])

  const sluit = () => { if (!bezig) onOpenChange(false) }

  const handleNaarProject = async () => {
    if (!offerte) return
    setBezig('project')
    try {
      let huidig = offerte
      if (huidig.status !== 'goedgekeurd' && huidig.status !== 'gefactureerd') {
        huidig = await updateOfferte(huidig.id, { status: 'goedgekeurd', akkoord_op: new Date().toISOString() })
        if (prospectWordtKlant && huidig.klant_id) {
          getKlant(huidig.klant_id)
            .then((k) => (k?.status === 'prospect' ? updateKlant(k.id, { status: 'actief' }) : null))
            .catch((err) => { logger.error('Prospect naar klant mislukt:', err); toast.error('Klantstatus kon niet worden bijgewerkt') })
        }
      }
      if (huidig.project_id) {
        if (huidig.spoed) {
          updateProject(huidig.project_id, { prioriteit: 'kritiek' }).catch((err) => { logger.error('Spoed-prioriteit zetten mislukt:', err); toast.error('Prioriteit kon niet worden gezet') })
        }
        onBijgewerkt?.(huidig)
        onOpenChange(false)
        navigate(`/projecten/${huidig.project_id}`)
        return
      }
      const { project, offerte: bijgewerkt } = await converteerOfferteNaarProject(huidig, user?.id)
      logCreate({ user, medewerkers, entityType: 'project', entityId: project.id, omschrijving: `Aangemaakt vanuit offerte ${huidig.nummer}` })
      onBijgewerkt?.(bijgewerkt)
      toast.success(<>Project aangemaakt<span style={{ color: '#D24620' }}>.</span></>)
      onOpenChange(false)
      navigate(`/projecten/${project.id}`)
    } catch (err) {
      logger.error('Naar project mislukt:', err)
      toast.error('Kon geen project maken')
    } finally {
      setBezig(null)
    }
  }

  const handleDirectFactureren = () => {
    if (!offerte) return
    if (deelfactuurAan) {
      setWatFacturerenOpen(true)
      return
    }
    const params = new URLSearchParams({ offerte_id: offerte.id, klant_id: offerte.klant_id })
    if (offerte.project_id) params.set('project_id', offerte.project_id)
    if (offerte.titel) params.set('titel', offerte.titel)
    onOpenChange(false)
    navigate(`/facturen/nieuw?${params.toString()}`)
  }

  const handleAfwijzen = async () => {
    if (!offerte || !reden) return
    const tekst = toelichting.trim()
    const redenTekst = reden === 'Iets anders' ? (tekst || reden) : tekst ? `${reden} · ${tekst}` : reden
    setBezig('afwijzen')
    try {
      const bijgewerkt = await wijsOfferteAf(offerte, redenTekst)
      onBijgewerkt?.(bijgewerkt)
      toast.success(<>Offerte afgewezen<span style={{ color: '#D24620' }}>.</span></>)
      onOpenChange(false)
    } catch (err) {
      logger.error('Afwijzen mislukt:', err)
      toast.error('Kon offerte niet afwijzen')
    } finally {
      setBezig(null)
    }
  }

  const keuzeCls = 'w-full flex items-center gap-3 min-h-[52px] px-3.5 py-2.5 rounded-xl border border-[rgba(26,83,92,0.12)] dark:border-white/10 text-left hover:border-petrol/40 hover:bg-petrol/[0.04] dark:hover:bg-white/[0.04] transition-colors disabled:opacity-50'

  return (
    <>
    <ResponsiveDialog
      open={open}
      onOpenChange={(v) => { if (!v) sluit(); else onOpenChange(v) }}
      className="sm:max-w-md"
      title={<>Vervolg<span className="text-flame">.</span></>}
      description={offerte ? `Offerte ${offerte.nummer}${offerte.titel ? ` · ${offerte.titel}` : ''}` : 'Laden…'}
    >

        <div className="space-y-2">
          <button type="button" onClick={handleNaarProject} disabled={!offerte || !!bezig} className={keuzeCls}>
            <span className="h-9 w-9 rounded-lg bg-petrol/10 dark:bg-petrol/20 flex items-center justify-center shrink-0">
              {bezig === 'project' ? <Loader2 className="h-4 w-4 text-petrol animate-spin" /> : <FolderPlus className="h-4 w-4 text-petrol dark:text-petrol-light" strokeWidth={1.75} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-foreground">Naar project</span>
              <span className="block text-[12px] text-muted-foreground leading-snug">
                {offerte?.project_id ? 'Zet op goedgekeurd en opent het gekoppelde project.' : 'Zet op goedgekeurd en maakt een project met deze offerte als bron.'}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>

          <button type="button" onClick={handleDirectFactureren} disabled={!offerte || !!bezig} className={keuzeCls}>
            <span className="h-9 w-9 rounded-lg bg-petrol/10 dark:bg-petrol/20 flex items-center justify-center shrink-0">
              <Receipt className="h-4 w-4 text-petrol dark:text-petrol-light" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-foreground">Direct factureren</span>
              <span className="block text-[12px] text-muted-foreground leading-snug">Opent een nieuwe factuur met de regels van deze offerte.</span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => setAfwijzenOpen((v) => !v)}
            disabled={!offerte || !!bezig}
            className={cn(keuzeCls, afwijzenOpen && 'border-flame/40 bg-flame/[0.04]')}
          >
            <span className="h-9 w-9 rounded-lg bg-flame/10 flex items-center justify-center shrink-0">
              <XCircle className="h-4 w-4 text-flame" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-foreground">Afgewezen</span>
              <span className="block text-[12px] text-muted-foreground leading-snug">Sluit de offerte af met een reden, zodat je later ziet waarom.</span>
            </span>
            <ChevronRight className={cn('h-4 w-4 text-muted-foreground shrink-0 transition-transform', afwijzenOpen && 'rotate-90')} />
          </button>

          {afwijzenOpen && (
            <div className="rounded-xl border border-[rgba(26,83,92,0.08)] dark:border-white/10 bg-muted/30 p-3 space-y-3">
              <div className="flex flex-wrap gap-2">
                {AFWIJS_REDENEN.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReden(r)}
                    className={cn(
                      'min-h-[44px] sm:min-h-[36px] px-3.5 rounded-lg text-[13px] font-medium border transition-colors',
                      reden === r
                        ? 'bg-petrol text-white border-petrol'
                        : 'bg-card text-foreground/80 border-[rgba(26,83,92,0.12)] dark:border-white/10 hover:border-petrol/40',
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <Textarea
                value={toelichting}
                onChange={(e) => setToelichting(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder={reden === 'Iets anders' ? 'Wat was de reden?' : 'Toelichting (optioneel)'}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAfwijzen}
                  disabled={!reden || !!bezig || (reden === 'Iets anders' && !toelichting.trim())}
                  className="inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[36px] px-4 text-[13px] font-semibold rounded-xl bg-flame text-white hover:bg-[#E04520] shadow-[0_2px_8px_rgba(210, 70, 32,0.25)] transition-all disabled:opacity-50"
                >
                  {bezig === 'afwijzen' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" strokeWidth={1.75} />}
                  {bezig === 'afwijzen' ? 'Bezig…' : 'Afwijzen'}
                </button>
              </div>
            </div>
          )}
        </div>
    </ResponsiveDialog>
      {offerte && deelfactuurAan && (
        <WatFacturerenDialog
          open={watFacturerenOpen}
          onOpenChange={(o) => { setWatFacturerenOpen(o); if (!o) onOpenChange(false) }}
          offerte={offerte}
        />
      )}
    </>
  )
}
