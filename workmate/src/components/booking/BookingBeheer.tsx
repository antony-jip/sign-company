import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Calendar,
  Plus,
  Trash2,
  Copy,
  Link2,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  Users,
} from 'lucide-react'
import {
  getBookingSlots,
  createBookingSlot,
  deleteBookingSlot,
  getBookingAfspraken,
  updateBookingAfspraak,
} from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import type { BookingSlot, BookingAfspraak } from '@/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const DAGEN = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag']
const DAGEN_KORT = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za']

export function BookingBeheer() {
  const { user } = useAuth()
  const [slots, setSlots] = useState<BookingSlot[]>([])
  const [afspraken, setAfspraken] = useState<BookingAfspraak[]>([])
  const [loading, setLoading] = useState(true)

  // Nieuw slot dialog
  const [slotDialogOpen, setSlotDialogOpen] = useState(false)
  const [slotForm, setSlotForm] = useState({
    dag_van_week: 1,
    start_tijd: '09:00',
    eind_tijd: '17:00',
    slot_duur_minuten: 30,
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [slotsData, afsprakenData] = await Promise.all([
        getBookingSlots(),
        getBookingAfspraken(),
      ])
      setSlots(slotsData || [])
      setAfspraken(afsprakenData || [])
    } catch {
      toast.error('Kon booking gegevens niet laden')
    } finally {
      setLoading(false)
    }
  }

  const bookingUrl = `${window.location.origin}/boeken/${user?.id || 'demo'}`

  const komende = useMemo(() => {
    const vandaag = new Date().toISOString().split('T')[0]
    return afspraken
      .filter(a => a.datum >= vandaag && a.status !== 'geannuleerd')
      .sort((a, b) => a.datum.localeCompare(b.datum) || a.start_tijd.localeCompare(b.start_tijd))
  }, [afspraken])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(bookingUrl)
    toast.success('Booking link gekopieerd naar klembord')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-display">Booking</h1>
          <p className="text-muted-foreground">Klanten kunnen zelf afspraken inplannen</p>
        </div>
      </div>

      {/* Booking link */}
      <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10">
        <CardContent className="py-4 px-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Link2 className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Jouw booking link</p>
                <p className="text-xs text-muted-foreground truncate">{bookingUrl}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleCopyLink}>
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Kopiëren
              </Button>
              <Button size="sm" variant="outline" onClick={() => window.open(bookingUrl, '_blank')}>
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Openen
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Beschikbare slots */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Beschikbare tijden
                </CardTitle>
                <Button size="sm" onClick={() => setSlotDialogOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Toevoegen
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {slots.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Geen tijdsloten geconfigureerd.
                  <br />
                  <span className="text-xs">Voeg tijdsloten toe zodat klanten kunnen boeken.</span>
                </p>
              ) : (
                <div className="space-y-2">
                  {slots
                    .sort((a, b) => a.dag_van_week - b.dag_van_week)
                    .map((slot) => (
                    <div key={slot.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] w-8 justify-center">
                          {DAGEN_KORT[slot.dag_van_week]}
                        </Badge>
                        <span className="text-sm font-medium">
                          {slot.start_tijd} - {slot.eind_tijd}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({slot.slot_duur_minuten}min)
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                        onClick={async () => {
                          try {
                            await deleteBookingSlot(slot.id)
                            setSlots(prev => prev.filter(s => s.id !== slot.id))
                            toast.success('Tijdslot verwijderd')
                          } catch { toast.error('Kon tijdslot niet verwijderen') }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{komende.length}</p>
                <p className="text-xs text-muted-foreground">Komende afspraken</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{slots.length}</p>
                <p className="text-xs text-muted-foreground">Tijdsloten</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Afspraken lijst */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Geboekte afspraken
                <span className="text-xs text-muted-foreground font-normal ml-1">{afspraken.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {afspraken.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nog geen afspraken geboekt
                </p>
              ) : (
                <div className="space-y-2">
                  {afspraken
                    .sort((a, b) => b.datum.localeCompare(a.datum) || b.start_tijd.localeCompare(a.start_tijd))
                    .map((afspraak) => (
                    <div key={afspraak.id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-4 py-3">
                      <div className="flex-shrink-0">
                        <div className={cn(
                          'w-10 h-10 rounded-lg flex flex-col items-center justify-center text-white',
                          afspraak.status === 'geannuleerd' ? 'bg-gray-400' :
                          afspraak.status === 'bevestigd' ? 'bg-emerald-500' : 'bg-blue-500'
                        )}>
                          <span className="text-[10px] font-medium leading-none">
                            {new Date(afspraak.datum + 'T12:00').toLocaleDateString('nl-NL', { day: 'numeric' })}
                          </span>
                          <span className="text-[9px] leading-none mt-0.5">
                            {new Date(afspraak.datum + 'T12:00').toLocaleDateString('nl-NL', { month: 'short' })}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">
                            {afspraak.klant_naam}
                          </p>
                          <Badge className={cn('text-[10px] px-1.5 py-0',
                            afspraak.status === 'gepland' && 'bg-blue-100 text-blue-700',
                            afspraak.status === 'bevestigd' && 'bg-emerald-100 text-emerald-700',
                            afspraak.status === 'geannuleerd' && 'bg-gray-100 text-gray-500',
                          )}>
                            {afspraak.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {afspraak.start_tijd} - {afspraak.eind_tijd}
                          {afspraak.onderwerp && ` — ${afspraak.onderwerp}`}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {afspraak.klant_email}
                          {afspraak.klant_telefoon && ` • ${afspraak.klant_telefoon}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {afspraak.status === 'gepland' && (
                          <>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                              title="Bevestigen"
                              onClick={async () => {
                                await updateBookingAfspraak(afspraak.id, { status: 'bevestigd' })
                                toast.success('Afspraak bevestigd')
                                loadData()
                              }}
                            >
                              <CheckCircle className="h-4 w-4 text-emerald-500" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                              title="Annuleren"
                              onClick={async () => {
                                await updateBookingAfspraak(afspraak.id, { status: 'geannuleerd' })
                                toast.success('Afspraak geannuleerd')
                                loadData()
                              }}
                            >
                              <XCircle className="h-4 w-4 text-red-400" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Nieuw slot dialog */}
      <Dialog open={slotDialogOpen} onOpenChange={setSlotDialogOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Tijdslot toevoegen</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Dag</Label>
              <select
                value={slotForm.dag_van_week}
                onChange={(e) => setSlotForm(p => ({ ...p, dag_van_week: Number(e.target.value) }))}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {DAGEN.map((dag, i) => (
                  <option key={i} value={i}>{dag}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Van</Label>
                <Input type="time" value={slotForm.start_tijd} onChange={(e) => setSlotForm(p => ({ ...p, start_tijd: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Tot</Label>
                <Input type="time" value={slotForm.eind_tijd} onChange={(e) => setSlotForm(p => ({ ...p, eind_tijd: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Slot duur (minuten)</Label>
              <Input type="number" min={15} step={15} value={slotForm.slot_duur_minuten}
                onChange={(e) => setSlotForm(p => ({ ...p, slot_duur_minuten: Number(e.target.value) }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSlotDialogOpen(false)}>Annuleren</Button>
            <Button onClick={async () => {
              if (slotForm.eind_tijd <= slotForm.start_tijd) {
                toast.error('Eindtijd moet na starttijd liggen')
                return
              }
              try {
                const created = await createBookingSlot({
                  user_id: user?.id || '',
                  dag_van_week: slotForm.dag_van_week,
                  start_tijd: slotForm.start_tijd,
                  eind_tijd: slotForm.eind_tijd,
                  slot_duur_minuten: slotForm.slot_duur_minuten,
                  actief: true,
                })
                setSlots(prev => [...prev, created])
                setSlotDialogOpen(false)
                toast.success('Tijdslot toegevoegd')
              } catch { toast.error('Kon tijdslot niet toevoegen') }
            }}>Toevoegen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
