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
    <div className="relative -m-3 sm:-m-4 md:-m-6 -mb-20 md:-mb-6 min-h-[100dvh]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#d5f5e3] via-[#dbeafe] to-[#ede9fe] dark:from-background dark:via-background dark:to-background pointer-events-none" />
      <div className="relative max-w-2xl mx-auto px-4 py-8 md:py-12 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white/50 hover:bg-white/70 backdrop-blur-sm border border-white/30" onClick={() => navigate('/projecten')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="h-11 w-11 rounded-xl bg-foreground/[0.07] dark:bg-foreground/10 flex items-center justify-center">
          <FolderKanban className="h-5 w-5 text-foreground/70" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Nieuw project</h1>
          <p className="text-sm text-muted-foreground">Vul de gegevens in om te starten</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Project info */}
        <div className="group rounded-2xl bg-white/70 dark:bg-card/80 backdrop-blur-xl border border-white/50 dark:border-border shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-emerald-200 via-teal-200 to-emerald-100 dark:from-emerald-800/40 dark:to-teal-800/20" />
          <div className="flex items-center gap-3 px-6 pt-5 pb-1">
            <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-foreground/[0.06] text-foreground/50 text-xs font-semibold">1</div>
            <div>
              <span className="text-sm font-semibold text-foreground">Projectgegevens</span>
              <p className="text-xs text-muted-foreground">Naam en omschrijving</p>
            </div>
          </div>
          <div className="px-6 pb-6 pt-3 space-y-4">
            <div>
              <Label htmlFor="naam" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Projectnaam *
              </Label>
              <Input
                id="naam"
                value={naam}
                onChange={(e) => setNaam(e.target.value)}
                placeholder="Bijv. Gevelbelettering Bakkerij Jansen"
                className="h-10 bg-white/50 dark:bg-background border-black/[0.08] dark:border-border focus:border-foreground/20 focus:ring-1 focus:ring-foreground/10 rounded-xl"
                required
              />
            </div>

            <div>
              <Label htmlFor="beschrijving" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Beschrijving
              </Label>
              <Textarea
                id="beschrijving"
                value={beschrijving}
                onChange={(e) => setBeschrijving(e.target.value)}
                placeholder="Korte omschrijving van het project..."
                rows={3}
                className="resize-none bg-white/50 dark:bg-background border-black/[0.08] dark:border-border focus:border-foreground/20 focus:ring-1 focus:ring-foreground/10 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Klant + Contactpersoon */}
        <div className="group rounded-2xl bg-white/70 dark:bg-card/80 backdrop-blur-xl border border-white/50 dark:border-border shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-blue-200 via-indigo-100 to-blue-100 dark:from-blue-800/40 dark:to-indigo-800/20" />
          <div className="flex items-center gap-3 px-6 pt-5 pb-1">
            <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-foreground/[0.06] text-foreground/50 text-xs font-semibold">2</div>
            <div>
              <span className="text-sm font-semibold text-foreground">Klant & Contact</span>
              <p className="text-xs text-muted-foreground">Koppel aan een klant</p>
            </div>
          </div>
          <div className="px-6 pb-6 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="klant" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Klant
              </Label>
              <Select value={klantId} onValueChange={setKlantId}>
                <SelectTrigger className="h-10 bg-white/50 dark:bg-background border-black/[0.08] dark:border-border rounded-xl">
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
              <Label htmlFor="contactpersoon" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Contactpersoon
              </Label>
              <Select
                value={contactpersoonId}
                onValueChange={setContactpersoonId}
                disabled={!klantId || contactpersonen.length === 0}
              >
                <SelectTrigger className="h-10 bg-white/50 dark:bg-background border-black/[0.08] dark:border-border rounded-xl">
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
                <Label htmlFor="vestiging" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Vestiging
                </Label>
                <Select value={vestigingId} onValueChange={setVestigingId}>
                  <SelectTrigger className="h-10 bg-white/50 dark:bg-background border-black/[0.08] dark:border-border rounded-xl">
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
        <div className="group rounded-2xl bg-white/70 dark:bg-card/80 backdrop-blur-xl border border-white/50 dark:border-border shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-amber-200/80 via-orange-100 to-amber-100 dark:from-amber-800/40 dark:to-orange-800/20" />
          <div className="flex items-center gap-3 px-6 pt-5 pb-1">
            <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-foreground/[0.06] text-foreground/50 text-xs font-semibold">3</div>
            <div>
              <span className="text-sm font-semibold text-foreground">Planning</span>
              <p className="text-xs text-muted-foreground">Status en tijdlijn</p>
            </div>
          </div>
          <div className="px-6 pb-6 pt-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</Label>
              <Select value={status} onValueChange={(value: typeof status) => setStatus(value)}>
                <SelectTrigger className="h-10 bg-white/50 dark:bg-background border-black/[0.08] dark:border-border rounded-xl">
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
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Startdatum</Label>
              <Input
                type="date"
                value={startDatum}
                onChange={(e) => setStartDatum(e.target.value)}
                className="h-10 bg-white/50 dark:bg-background border-black/[0.08] dark:border-border rounded-xl"
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Einddatum</Label>
              <Input
                type="date"
                value={eindDatum}
                onChange={(e) => setEindDatum(e.target.value)}
                className="h-10 bg-white/50 dark:bg-background border-black/[0.08] dark:border-border rounded-xl"
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
            className="text-muted-foreground hover:bg-white/50 rounded-xl px-5"
          >
            Annuleren
          </Button>
          <Button type="submit" size="sm" disabled={loading} className="shadow-sm rounded-xl px-6">
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {loading ? 'Opslaan...' : 'Project aanmaken'}
          </Button>
        </div>
      </form>
      </div>
    </div>
  )
}
