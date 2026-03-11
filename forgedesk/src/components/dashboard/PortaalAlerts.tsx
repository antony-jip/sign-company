import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  RotateCcw,
  X,
  ArrowRight,
  Calendar,
  ClipboardCheck,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  getNotificaties,
  markNotificatieGelezen,
  createTaak,
  createMontageAfspraak,
  getProject,
} from '@/services/supabaseService'
import type { Notificatie } from '@/types'
import { useAuth } from '@/contexts/AuthContext'

const MAX_ALERTS = 3

function formatTijdGeleden(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffHours / 24)
  if (diffHours < 1) return 'Zojuist'
  if (diffHours < 24) return `${diffHours}u`
  if (diffDays === 1) return '1d'
  return `${diffDays}d`
}

export function PortaalAlerts() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState<Notificatie[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  // Montage dialog
  const [montageOpen, setMontageOpen] = useState(false)
  const [montagePrefill, setMontagePrefill] = useState<{ projectId: string; titel: string; locatie: string }>({ projectId: '', titel: '', locatie: '' })
  const [montageDatum, setMontageDatum] = useState('')
  const [montageNotitie, setMontageNotitie] = useState('')
  const [savingMontage, setSavingMontage] = useState(false)
  const [activeNotifId, setActiveNotifId] = useState('')

  // Taak dialog
  const [taakOpen, setTaakOpen] = useState(false)
  const [taakTitel, setTaakTitel] = useState('')
  const [taakBeschrijving, setTaakBeschrijving] = useState('')
  const [savingTaak, setSavingTaak] = useState(false)
  const [taakNotifId, setTaakNotifId] = useState('')
  const [taakProjectId, setTaakProjectId] = useState('')
  const [taakKlantId, setTaakKlantId] = useState('')

  const fetchAlerts = useCallback(async () => {
    try {
      const notifs = await getNotificaties()
      const portaalAlerts = notifs.filter(
        n => !n.gelezen &&
        !n.actie_genomen &&
        ['portaal_goedkeuring', 'portaal_revisie'].includes(n.type)
      )
      setAlerts(portaalAlerts)
    } catch {
      // Stille error
    }
  }, [])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  async function handleDismiss(id: string) {
    setDismissed(prev => new Set([...prev, id]))
    await markNotificatieGelezen(id)
  }

  async function handlePlanMontage(notif: Notificatie) {
    setActiveNotifId(notif.id)
    try {
      const project = notif.project_id ? await getProject(notif.project_id) : null
      setMontagePrefill({
        projectId: notif.project_id || '',
        titel: `Montage — ${project?.naam || 'Project'}`,
        locatie: project?.beschrijving || '',
      })
      setMontageDatum('')
      setMontageNotitie('')
      setMontageOpen(true)
    } catch {
      toast.error('Kon project gegevens niet ophalen')
    }
  }

  async function handleSaveMontage() {
    if (!montageDatum || !user?.id) return
    setSavingMontage(true)
    try {
      await createMontageAfspraak({
        user_id: user.id,
        project_id: montagePrefill.projectId,
        klant_id: '',
        klant_naam: '',
        titel: montagePrefill.titel,
        beschrijving: montageNotitie,
        datum: montageDatum,
        start_tijd: '08:00',
        eind_tijd: '12:00',
        locatie: montagePrefill.locatie,
        monteurs: [] as string[],
        materialen: [] as string[],
        notities: montageNotitie,
        status: 'gepland',
      })
      toast.success('Montage ingepland')
      setMontageOpen(false)
      await handleDismiss(activeNotifId)
      fetchAlerts()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSavingMontage(false)
    }
  }

  async function handleMaakTaak(notif: Notificatie) {
    setTaakNotifId(notif.id)
    setTaakProjectId(notif.project_id || '')
    setTaakKlantId(notif.klant_id || '')
    setTaakTitel(`Montage plannen — ${notif.titel}`)
    setTaakBeschrijving(notif.bericht || '')
    setTaakOpen(true)
  }

  async function handleSaveTaak() {
    if (!taakTitel.trim() || !user?.id) return
    setSavingTaak(true)
    try {
      await createTaak({
        user_id: user.id,
        titel: taakTitel,
        beschrijving: taakBeschrijving,
        status: 'todo',
        prioriteit: 'medium',
        toegewezen_aan: '',
        deadline: '',
        geschatte_tijd: 0,
        bestede_tijd: 0,
        project_id: taakProjectId,
        klant_id: taakKlantId,
        locatie: '',
      })
      toast.success('Taak aangemaakt')
      setTaakOpen(false)
      await handleDismiss(taakNotifId)
      fetchAlerts()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSavingTaak(false)
    }
  }

  function handleUploadRevisie(notif: Notificatie) {
    if (notif.project_id) {
      navigate(`/projecten/${notif.project_id}`)
    }
  }

  const visibleAlerts = alerts.filter(a => !dismissed.has(a.id)).slice(0, MAX_ALERTS)
  const extraCount = alerts.filter(a => !dismissed.has(a.id)).length - MAX_ALERTS

  if (visibleAlerts.length === 0) return null

  return (
    <>
      <div className="space-y-2">
        {visibleAlerts.map(alert => {
          const isGoedkeuring = alert.type === 'portaal_goedkeuring'
          const borderColor = isGoedkeuring ? 'border-l-green-500' : 'border-l-amber-500'
          const bgColor = isGoedkeuring ? 'bg-green-50/50 dark:bg-green-950/20' : 'bg-amber-50/50 dark:bg-amber-950/20'
          const Icon = isGoedkeuring ? CheckCircle2 : RotateCcw
          const iconColor = isGoedkeuring ? 'text-green-600' : 'text-amber-600'

          return (
            <div key={alert.id} className={`relative rounded-xl border-l-4 ${borderColor} ${bgColor} px-4 py-3`}>
              <button
                onClick={() => handleDismiss(alert.id)}
                className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="flex items-start gap-2.5 pr-6">
                <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${iconColor}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{alert.titel}</span>
                    <span className="text-xs text-muted-foreground">{formatTijdGeleden(alert.created_at)}</span>
                  </div>
                  {alert.bericht && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{alert.bericht}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {isGoedkeuring ? (
                      <>
                        <Button variant="outline" size="sm" className="h-6 text-[11px] px-2" onClick={() => handlePlanMontage(alert)}>
                          <Calendar className="h-3 w-3 mr-1" />
                          Plan montage
                        </Button>
                        <Button variant="outline" size="sm" className="h-6 text-[11px] px-2" onClick={() => handleMaakTaak(alert)}>
                          <ClipboardCheck className="h-3 w-3 mr-1" />
                          Maak taak
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" className="h-6 text-[11px] px-2" onClick={() => handleUploadRevisie(alert)}>
                        <Upload className="h-3 w-3 mr-1" />
                        Nieuwe versie uploaden
                      </Button>
                    )}
                    {alert.project_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] px-2 text-muted-foreground"
                        onClick={() => navigate(`/projecten/${alert.project_id}`)}
                      >
                        Bekijk project
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        {extraCount > 0 && (
          <button
            onClick={() => navigate('/portalen')}
            className="text-xs text-primary font-medium hover:underline px-4"
          >
            en {extraCount} meer meldingen →
          </button>
        )}
      </div>

      {/* Plan montage dialog */}
      <Dialog open={montageOpen} onOpenChange={setMontageOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Montage inplannen</DialogTitle>
            <DialogDescription>{montagePrefill.titel}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-sm">Datum</Label>
              <Input type="date" value={montageDatum} onChange={e => setMontageDatum(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Locatie</Label>
              <Input value={montagePrefill.locatie} readOnly className="mt-1 bg-muted" />
            </div>
            <div>
              <Label className="text-sm">Notities</Label>
              <Textarea value={montageNotitie} onChange={e => setMontageNotitie(e.target.value)} rows={2} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMontageOpen(false)}>Annuleren</Button>
            <Button onClick={handleSaveMontage} disabled={savingMontage || !montageDatum}>Inplannen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Maak taak dialog */}
      <Dialog open={taakOpen} onOpenChange={setTaakOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Taak aanmaken</DialogTitle>
            <DialogDescription>Maak een taak aan naar aanleiding van de klantreactie.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-sm">Titel</Label>
              <Input value={taakTitel} onChange={e => setTaakTitel(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Beschrijving</Label>
              <Textarea value={taakBeschrijving} onChange={e => setTaakBeschrijving(e.target.value)} rows={3} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaakOpen(false)}>Annuleren</Button>
            <Button onClick={handleSaveTaak} disabled={savingTaak || !taakTitel.trim()}>Aanmaken</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
