import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createProject, getKlanten, generateProjectNummer, getAppSettings } from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import type { Klant } from '@/types'
import { toast } from 'sonner'
import { ArrowLeft, Save, FolderKanban, User, CalendarDays, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { logger } from '../../utils/logger'

export function ProjectCreate() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const paramKlantId = searchParams.get('klant_id') || ''

  const [klanten, setKlanten] = useState<Klant[]>([])
  const [loading, setLoading] = useState(false)

  const [naam, setNaam] = useState('')
  const [beschrijving, setBeschrijving] = useState('')
  const [klantId, setKlantId] = useState(paramKlantId)
  const [contactpersoonId, setContactpersoonId] = useState('')
  const [vestigingId, setVestigingId] = useState('')
  const [status, setStatus] = useState<'gepland' | 'actief' | 'in-review' | 'afgerond' | 'on-hold' | 'te-factureren'>('gepland')
  const [startDatum, setStartDatum] = useState(() => new Date().toISOString().split('T')[0])
  const [eindDatum, setEindDatum] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const klantenData = await getKlanten()
        setKlanten(klantenData)
      } catch (error) {
        logger.error('Fout bij ophalen data:', error)
      }
    }
    fetchData()
  }, [])

  const geselecteerdeKlant = useMemo(() => {
    return klanten.find((k) => k.id === klantId)
  }, [klanten, klantId])

  const contactpersonen = useMemo(() => {
    return geselecteerdeKlant?.contactpersonen || []
  }, [geselecteerdeKlant])

  const vestigingen = useMemo(() => {
    return geselecteerdeKlant?.vestigingen || []
  }, [geselecteerdeKlant])

  // Reset contactpersoon + vestiging when klant changes
  useEffect(() => {
    setContactpersoonId('')
    setVestigingId('')
  }, [klantId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!naam.trim()) {
      toast.error('Projectnaam is verplicht')
      return
    }

    if (!user) {
      toast.error('Je moet ingelogd zijn om een project aan te maken')
      return
    }

    if (eindDatum && startDatum && eindDatum < startDatum) {
      toast.error('Einddatum kan niet voor de startdatum liggen')
      return
    }

    setLoading(true)

    try {
      // Genereer project nummer
      const settings = await getAppSettings(user.id)
      const projectNummer = await generateProjectNummer(settings?.project_prefix || 'P')

      await createProject({
        user_id: user.id,
        klant_id: klantId,
        project_nummer: projectNummer,
        naam: naam.trim(),
        beschrijving: beschrijving.trim() || undefined,
        status,
        prioriteit: 'medium',
        start_datum: startDatum || undefined,
        eind_datum: eindDatum || undefined,
        budget: 0,
        besteed: 0,
        voortgang: 0,
        team_leden: [],
        contactpersoon_id: contactpersoonId || undefined,
        vestiging_id: vestigingId || undefined,
        vestiging_naam: vestigingId ? vestigingen.find((v) => v.id === vestigingId)?.naam : undefined,
      })

      toast.success('Project succesvol aangemaakt')
      navigate('/projecten')
    } catch (error) {
      logger.error('Fout bij aanmaken project:', error)
      toast.error('Er is iets misgegaan bij het aanmaken van het project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative -m-3 sm:-m-4 md:-m-6 -mb-20 md:-mb-6 min-h-full">
      <div className="fixed inset-0 bg-gradient-to-br from-[#d5f5e3] via-[#dbeafe] to-[#ede9fe] dark:from-background dark:via-background dark:to-background pointer-events-none" />
      <div className="relative max-w-2xl mx-auto px-4 py-8 md:py-12 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white/60 hover:bg-white/80 backdrop-blur-sm border border-white/40 shadow-sm" onClick={() => navigate('/projecten')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/25 ring-4 ring-teal-100/50">
          <FolderKanban className="h-5.5 w-5.5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Nieuw project</h1>
          <p className="text-sm text-muted-foreground">Vul de gegevens in om te starten</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Project info */}
        <div className="group rounded-2xl bg-white/80 dark:bg-card backdrop-blur-xl border border-white/60 dark:border-border shadow-lg shadow-black/[0.03] hover:shadow-xl hover:shadow-black/[0.06] transition-all duration-300 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-300" />
          <div className="flex items-center gap-3 px-6 pt-5 pb-1">
            <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 text-white text-xs font-bold shadow-md shadow-teal-500/20">1</div>
            <div>
              <span className="text-sm font-bold text-foreground">Projectgegevens</span>
              <p className="text-xs text-muted-foreground">Naam en omschrijving</p>
            </div>
          </div>
          <div className="px-6 pb-6 pt-3 space-y-4">
            <div>
              <Label htmlFor="naam" className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wider">
                Projectnaam *
              </Label>
              <Input
                id="naam"
                value={naam}
                onChange={(e) => setNaam(e.target.value)}
                placeholder="Bijv. Gevelbelettering Bakkerij Jansen"
                className="h-11 bg-white/60 dark:bg-background border-gray-200 dark:border-border focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 rounded-xl text-base"
                required
              />
            </div>

            <div>
              <Label htmlFor="beschrijving" className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wider">
                Beschrijving
              </Label>
              <Textarea
                id="beschrijving"
                value={beschrijving}
                onChange={(e) => setBeschrijving(e.target.value)}
                placeholder="Korte omschrijving van het project..."
                rows={3}
                className="resize-none bg-white/60 dark:bg-background border-gray-200 dark:border-border focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Klant + Contactpersoon */}
        <div className="group rounded-2xl bg-white/80 dark:bg-card backdrop-blur-xl border border-white/60 dark:border-border shadow-lg shadow-black/[0.03] hover:shadow-xl hover:shadow-black/[0.06] transition-all duration-300 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-300" />
          <div className="flex items-center gap-3 px-6 pt-5 pb-1">
            <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-500/20">2</div>
            <div>
              <span className="text-sm font-bold text-foreground">Klant & Contact</span>
              <p className="text-xs text-muted-foreground">Koppel aan een klant</p>
            </div>
          </div>
          <div className="px-6 pb-6 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="klant" className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wider">
                Klant
              </Label>
              <Select value={klantId} onValueChange={setKlantId}>
                <SelectTrigger className="h-11 bg-white/60 dark:bg-background border-gray-200 dark:border-border rounded-xl">
                  <SelectValue placeholder={klanten.length === 0 ? 'Geen klanten' : 'Selecteer klant'} />
                </SelectTrigger>
                <SelectContent>
                  {klanten.length === 0 ? (
                    <SelectItem value="_empty" disabled>Voeg eerst een klant toe</SelectItem>
                  ) : klanten.map((klant) => (
                    <SelectItem key={klant.id} value={klant.id}>
                      {klant.bedrijfsnaam || klant.contactpersoon}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="contactpersoon" className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wider">
                Contactpersoon
              </Label>
              <Select
                value={contactpersoonId}
                onValueChange={setContactpersoonId}
                disabled={!klantId || contactpersonen.length === 0}
              >
                <SelectTrigger className="h-11 bg-white/60 dark:bg-background border-gray-200 dark:border-border rounded-xl">
                  <SelectValue
                    placeholder={
                      !klantId
                        ? 'Selecteer eerst een klant'
                        : contactpersonen.length === 0
                          ? 'Geen contactpersonen'
                          : 'Selecteer contactpersoon'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {contactpersonen.map((cp) => (
                    <SelectItem key={cp.id} value={cp.id}>
                      <span>{cp.naam}</span>
                      {cp.functie && <span className="text-muted-foreground ml-1.5">({cp.functie})</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Vestiging - alleen tonen als klant meerdere vestigingen heeft */}
            {vestigingen.length > 0 && (
              <div className="sm:col-span-2">
                <Label htmlFor="vestiging" className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wider">
                  Vestiging
                </Label>
                <Select value={vestigingId} onValueChange={setVestigingId}>
                  <SelectTrigger className="h-11 bg-white/60 dark:bg-background border-gray-200 dark:border-border rounded-xl">
                    <SelectValue placeholder="Selecteer vestiging (optioneel)" />
                  </SelectTrigger>
                  <SelectContent>
                    {vestigingen.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        <span>{v.naam}</span>
                        {v.stad && <span className="text-muted-foreground ml-1.5">({v.stad})</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Status + Datums */}
        <div className="group rounded-2xl bg-white/80 dark:bg-card backdrop-blur-xl border border-white/60 dark:border-border shadow-lg shadow-black/[0.03] hover:shadow-xl hover:shadow-black/[0.06] transition-all duration-300 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300" />
          <div className="flex items-center gap-3 px-6 pt-5 pb-1">
            <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white text-xs font-bold shadow-md shadow-amber-500/20">3</div>
            <div>
              <span className="text-sm font-bold text-foreground">Planning</span>
              <p className="text-xs text-muted-foreground">Status en tijdlijn</p>
            </div>
          </div>
          <div className="px-6 pb-6 pt-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wider">Status</Label>
              <Select value={status} onValueChange={(value: typeof status) => setStatus(value)}>
                <SelectTrigger className="h-11 bg-white/60 dark:bg-background border-gray-200 dark:border-border rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gepland">Gepland</SelectItem>
                  <SelectItem value="actief">Actief</SelectItem>
                  <SelectItem value="in-review">In Review</SelectItem>
                  <SelectItem value="afgerond">Afgerond</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  <SelectItem value="te-factureren">Te factureren</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wider">Startdatum</Label>
              <Input
                type="date"
                value={startDatum}
                onChange={(e) => setStartDatum(e.target.value)}
                className="h-11 bg-white/60 dark:bg-background border-gray-200 dark:border-border rounded-xl"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wider">Einddatum</Label>
              <Input
                type="date"
                value={eindDatum}
                onChange={(e) => setEindDatum(e.target.value)}
                className="h-11 bg-white/60 dark:bg-background border-gray-200 dark:border-border rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate('/projecten')}
            className="text-muted-foreground hover:bg-white/60 rounded-xl px-5"
          >
            Annuleren
          </Button>
          <Button type="submit" size="lg" disabled={loading} className="shadow-lg shadow-teal-500/20 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 rounded-xl px-8 font-semibold">
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Opslaan...' : 'Project aanmaken'}
          </Button>
        </div>
      </form>
      </div>
    </div>
  )
}
