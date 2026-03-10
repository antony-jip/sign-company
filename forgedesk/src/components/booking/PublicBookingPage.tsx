import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  getBookingSlots,
  getBookingAfspraken,
  createBookingAfspraak,
} from '@/services/supabaseService'
import type { BookingSlot, BookingAfspraak } from '@/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const DAGEN_KORT = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za']

export function PublicBookingPage() {
  const { userId } = useParams<{ userId: string }>()
  const [slots, setSlots] = useState<BookingSlot[]>([])
  const [bestaandeAfspraken, setBestaandeAfspraken] = useState<BookingAfspraak[]>([])
  const [loading, setLoading] = useState(true)
  const [gekozenDatum, setGekozenDatum] = useState<string | null>(null)
  const [gekozenTijd, setGekozenTijd] = useState<string | null>(null)
  const [huidigeMaand, setHuidigeMaand] = useState(new Date())
  const [bevestigd, setBevestigd] = useState(false)
  const [verzenden, setVerzenden] = useState(false)

  const [form, setForm] = useState({
    naam: '',
    email: '',
    telefoon: '',
    onderwerp: '',
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
      setSlots((slotsData || []).filter(s => s.actief))
      setBestaandeAfspraken((afsprakenData || []).filter(a => a.status !== 'geannuleerd'))
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  // Genereer kalender dagen
  const kalenderDagen = useMemo(() => {
    const jaar = huidigeMaand.getFullYear()
    const maand = huidigeMaand.getMonth()
    const eersteDag = new Date(jaar, maand, 1)
    const laatsteDag = new Date(jaar, maand + 1, 0)
    const startDag = eersteDag.getDay()

    const dagen: (Date | null)[] = []
    for (let i = 0; i < startDag; i++) dagen.push(null)
    for (let d = 1; d <= laatsteDag.getDate(); d++) {
      dagen.push(new Date(jaar, maand, d))
    }
    return dagen
  }, [huidigeMaand])

  // Beschikbare dagen (op basis van slots)
  const beschikbareDagNummers = useMemo(() => {
    return new Set(slots.map(s => s.dag_van_week))
  }, [slots])

  // Beschikbare tijden voor gekozen datum
  const beschikbareTijden = useMemo(() => {
    if (!gekozenDatum) return []
    const datum = new Date(gekozenDatum + 'T12:00')
    const dagNr = datum.getDay()
    const dagSlots = slots.filter(s => s.dag_van_week === dagNr)

    const tijden: string[] = []
    for (const slot of dagSlots) {
      const startParts = (slot.start_tijd || '0:0').split(':').map(Number)
      const eindParts = (slot.eind_tijd || '0:0').split(':').map(Number)
      const [startH = 0, startM = 0] = startParts
      const [eindH = 0, eindM = 0] = eindParts
      const startMin = startH * 60 + startM
      const eindMin = eindH * 60 + eindM

      for (let min = startMin; min + slot.slot_duur_minuten <= eindMin; min += slot.slot_duur_minuten) {
        const uur = Math.floor(min / 60)
        const mins = min % 60
        const tijd = `${uur.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`

        // Check of al geboekt
        const bezet = bestaandeAfspraken.some(a => a.datum === gekozenDatum && a.start_tijd === tijd)
        if (!bezet) tijden.push(tijd)
      }
    }
    return tijden
  }, [gekozenDatum, slots, bestaandeAfspraken])

  const handleBoek = async () => {
    if (!gekozenDatum || !gekozenTijd || !form.naam || !form.email) {
      toast.error('Vul alle verplichte velden in')
      return
    }
    setVerzenden(true)

    // Bereken eindtijd
    const datum = new Date(gekozenDatum + 'T12:00')
    const dagSlot = slots.find(s => s.dag_van_week === datum.getDay())
    const duur = dagSlot?.slot_duur_minuten || 30
    const [h, m] = gekozenTijd.split(':').map(Number)
    const eindMin = h * 60 + m + duur
    const eindTijd = `${Math.floor(eindMin / 60).toString().padStart(2, '0')}:${(eindMin % 60).toString().padStart(2, '0')}`

    try {
      await createBookingAfspraak({
        user_id: userId || '',
        klant_naam: form.naam,
        klant_email: form.email,
        klant_telefoon: form.telefoon || undefined,
        datum: gekozenDatum,
        start_tijd: gekozenTijd,
        eind_tijd: eindTijd,
        onderwerp: form.onderwerp || undefined,
        status: 'gepland',
      })
      setBevestigd(true)
    } catch {
      toast.error('Kon afspraak niet boeken')
    } finally {
      setVerzenden(false)
    }
  }

  const vandaag = new Date()
  vandaag.setHours(0, 0, 0, 0)

  if (bevestigd) {
    return (
      <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Afspraak geboekt!</h2>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Datum:</strong> {gekozenDatum && new Date(gekozenDatum + 'T12:00').toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p><strong>Tijd:</strong> {gekozenTijd}</p>
              {form.onderwerp && <p><strong>Onderwerp:</strong> {form.onderwerp}</p>}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              U ontvangt een bevestiging op {form.email}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background dark:bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Afspraak inplannen</h1>
          <p className="text-sm text-muted-foreground">Kies een datum en tijd die u uitkomt</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Kalender */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" className="h-8 w-8"
                  onClick={() => setHuidigeMaand(new Date(huidigeMaand.getFullYear(), huidigeMaand.getMonth() - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-base">
                  {huidigeMaand.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8"
                  onClick={() => setHuidigeMaand(new Date(huidigeMaand.getFullYear(), huidigeMaand.getMonth() + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAGEN_KORT.map(d => (
                  <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {kalenderDagen.map((dag, i) => {
                  if (!dag) return <div key={i} />
                  const datumStr = dag.toISOString().split('T')[0]
                  const isPast = dag < vandaag
                  const isBeschikbaar = beschikbareDagNummers.has(dag.getDay()) && !isPast
                  const isGekozen = datumStr === gekozenDatum

                  return (
                    <button
                      key={i}
                      disabled={!isBeschikbaar}
                      onClick={() => {
                        setGekozenDatum(datumStr)
                        setGekozenTijd(null)
                      }}
                      className={cn(
                        'h-9 rounded-md text-sm font-medium transition-colors',
                        isGekozen && 'bg-primary text-primary-foreground',
                        !isGekozen && isBeschikbaar && 'hover:bg-primary/10 text-foreground',
                        !isBeschikbaar && 'text-muted-foreground/30 cursor-not-allowed',
                      )}
                    >
                      {dag.getDate()}
                    </button>
                  )
                })}
              </div>

              {/* Beschikbare tijden */}
              {gekozenDatum && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Beschikbare tijden
                  </p>
                  {beschikbareTijden.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Geen beschikbare tijden</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {beschikbareTijden.map(tijd => (
                        <button
                          key={tijd}
                          onClick={() => setGekozenTijd(tijd)}
                          className={cn(
                            'px-3 py-1.5 rounded-md text-xs font-medium border transition-colors',
                            gekozenTijd === tijd
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-border dark:border-border hover:border-primary hover:text-primary'
                          )}
                        >
                          {tijd}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Formulier */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Uw gegevens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {gekozenDatum && gekozenTijd && (
                <div className="bg-primary/5 dark:bg-primary/10 rounded-lg p-3 text-sm">
                  <p className="font-medium text-foreground">
                    {new Date(gekozenDatum + 'T12:00').toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <p className="text-muted-foreground">{gekozenTijd}</p>
                </div>
              )}

              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label>Naam <span className="text-red-500">*</span></Label>
                  <Input
                    value={form.naam}
                    onChange={(e) => setForm(p => ({ ...p, naam: e.target.value }))}
                    placeholder="Uw volledige naam"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>E-mail <span className="text-red-500">*</span></Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="uw@email.nl"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Telefoon</Label>
                  <Input
                    type="tel"
                    value={form.telefoon}
                    onChange={(e) => setForm(p => ({ ...p, telefoon: e.target.value }))}
                    placeholder="06-12345678"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Onderwerp</Label>
                  <Textarea
                    value={form.onderwerp}
                    onChange={(e) => setForm(p => ({ ...p, onderwerp: e.target.value }))}
                    placeholder="Waar gaat de afspraak over?"
                    rows={3}
                  />
                </div>
              </div>

              <Button
                className="w-full"
                disabled={!gekozenDatum || !gekozenTijd || !form.naam || !form.email || verzenden}
                onClick={handleBoek}
              >
                <Calendar className="h-4 w-4 mr-2" />
                {verzenden ? 'Boeken...' : 'Afspraak boeken'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
