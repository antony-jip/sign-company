import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createProject, getKlanten, generateProjectNummer, getAppSettings } from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import type { Klant } from '@/types'
import { toast } from 'sonner'
import { ArrowLeft, Save, FolderKanban } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { KlantContactSelector } from '@/components/shared/KlantContactSelector'
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
  const [status, setStatus] = useState<'gepland' | 'actief' | 'in-review' | 'afgerond' | 'on-hold' | 'te-factureren' | 'te-plannen'>('gepland')
  const [startDatum, setStartDatum] = useState(() => new Date().toISOString().split('T')[0])
  const [eindDatum, setEindDatum] = useState('')

  async function fetchKlanten() {
    try {
      const klantenData = await getKlanten()
      setKlanten(klantenData)
    } catch (error) {
      logger.error('Fout bij ophalen data:', error)
    }
  }

  useEffect(() => {
    fetchKlanten()
  }, [])

  const geselecteerdeKlant = useMemo(() => {
    return klanten.find((k) => k.id === klantId)
  }, [klanten, klantId])

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

      const nieuwProject = await createProject({
        user_id: user.id,
        klant_id: klantId,
        project_nummer: projectNummer,
        naam: naam.trim(),
        beschrijving: beschrijving.trim(),
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
      navigate(`/projecten/${nieuwProject.id}`)
    } catch (error) {
      logger.error('Fout bij aanmaken project:', error)
      toast.error('Er is iets misgegaan bij het aanmaken van het project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative -m-3 sm:-m-4 md:-m-6 -mb-20 md:-mb-6 min-h-full bg-[#F8F7F5]">
      <div className="relative max-w-2xl mx-auto px-4 py-8 md:py-12 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/projecten')}
          className="h-10 w-10 rounded-xl flex items-center justify-center transition-colors"
          style={{ backgroundColor: '#FFFFFE', border: '0.5px solid #E6E4E0' }}
        >
          <ArrowLeft className="h-4 w-4" style={{ color: '#5A5A55' }} />
        </button>
        <div className="h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm" style={{ backgroundColor: '#1A535C' }}>
          <FolderKanban className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#191919' }}>Nieuw project</h1>
          <p className="text-sm" style={{ color: '#5A5A55' }}>Vul de gegevens in om te starten</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Section 1: Project + Planning — merged */}
        <div className="rounded-xl" style={{ backgroundColor: '#FFFFFE', border: '0.5px solid #E6E4E0' }}>
          <div className="h-[3px] rounded-t-xl" style={{ background: 'linear-gradient(90deg, #F15025, #F1502560)' }} />
          <div className="flex items-center gap-3 px-5 pt-4 pb-1">
            <div className="flex items-center justify-center h-7 w-7 rounded-lg text-white text-[11px] font-bold" style={{ backgroundColor: '#F15025' }}>1</div>
            <div>
              <span className="text-[13px] font-semibold" style={{ color: '#191919' }}>Projectgegevens</span>
              <p className="text-[11px]" style={{ color: '#A0A098' }}>Naam, planning en status</p>
            </div>
          </div>
          <div className="px-5 pb-5 pt-3 space-y-3">
            {/* Naam + Beschrijving inline */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr] gap-3">
              <div>
                <Label htmlFor="naam" className="text-[11px] font-semibold mb-1.5 block uppercase tracking-wider" style={{ color: '#A0A098' }}>
                  Projectnaam *
                </Label>
                <Input
                  id="naam"
                  value={naam}
                  onChange={(e) => setNaam(e.target.value)}
                  placeholder="Bijv. Gevelbelettering Bakkerij Jansen"
                  className="h-10 rounded-lg text-[14px]"
                  style={{ backgroundColor: '#FAFAF8', border: '0.5px solid #E6E4E0' }}
                  required
                />
              </div>
              <div>
                <Label htmlFor="beschrijving" className="text-[11px] font-semibold mb-1.5 block uppercase tracking-wider" style={{ color: '#A0A098' }}>
                  Beschrijving
                </Label>
                <Input
                  id="beschrijving"
                  value={beschrijving}
                  onChange={(e) => setBeschrijving(e.target.value)}
                  placeholder="Korte omschrijving..."
                  className="h-10 rounded-lg text-[14px]"
                  style={{ backgroundColor: '#FAFAF8', border: '0.5px solid #E6E4E0' }}
                />
              </div>
            </div>

            {/* Status + Dates row */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-[11px] font-semibold mb-1.5 block uppercase tracking-wider" style={{ color: '#A0A098' }}>Status</Label>
                <Select value={status} onValueChange={(value: typeof status) => setStatus(value)}>
                  <SelectTrigger className="h-10 rounded-lg text-[13px]" style={{ backgroundColor: '#FAFAF8', border: '0.5px solid #E6E4E0' }}>
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
                <Label className="text-[11px] font-semibold mb-1.5 block uppercase tracking-wider" style={{ color: '#A0A098' }}>Startdatum</Label>
                <Input
                  type="date"
                  value={startDatum}
                  onChange={(e) => setStartDatum(e.target.value)}
                  className="h-10 rounded-lg font-mono text-[13px]"
                  style={{ backgroundColor: '#FAFAF8', border: '0.5px solid #E6E4E0' }}
                />
              </div>
              <div>
                <Label className="text-[11px] font-semibold mb-1.5 block uppercase tracking-wider" style={{ color: '#A0A098' }}>Einddatum</Label>
                <Input
                  type="date"
                  value={eindDatum}
                  onChange={(e) => setEindDatum(e.target.value)}
                  className="h-10 rounded-lg font-mono text-[13px]"
                  style={{ backgroundColor: '#FAFAF8', border: '0.5px solid #E6E4E0' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Klant & Contact */}
        <div className="rounded-xl relative" style={{ backgroundColor: '#FFFFFE', border: '0.5px solid #E6E4E0' }}>
          <div className="h-[3px] rounded-t-xl" style={{ background: 'linear-gradient(90deg, #9A4070, #9A407060)' }} />
          <div className="flex items-center gap-3 px-5 pt-4 pb-1">
            <div className="flex items-center justify-center h-7 w-7 rounded-lg text-white text-[11px] font-bold" style={{ backgroundColor: '#9A4070' }}>2</div>
            <div>
              <span className="text-[13px] font-semibold" style={{ color: '#191919' }}>Klant & Contact</span>
              <p className="text-[11px]" style={{ color: '#A0A098' }}>Koppel aan een klant</p>
            </div>
          </div>
          <div className="px-5 pb-5 pt-3">
            <KlantContactSelector
              klantId={klantId}
              onKlantChange={(id) => setKlantId(id)}
              contactpersoonId={contactpersoonId}
              onContactpersoonChange={setContactpersoonId}
              vestigingId={vestigingId}
              onVestigingChange={setVestigingId}
              klanten={klanten}
              onKlantenRefresh={fetchKlanten}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/projecten')}
            className="h-9 px-5 text-[13px] font-medium rounded-lg transition-colors"
            style={{ color: '#5A5A55', border: '0.5px solid #E6E4E0' }}
          >
            Annuleren
          </button>
          <button
            type="submit"
            disabled={loading}
            className="h-10 px-6 text-[14px] font-bold text-white rounded-lg shadow-sm hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: '#1A535C' }}
          >
            <Save className="h-4 w-4" />
            {loading ? 'Opslaan...' : 'Project aanmaken'}
          </button>
        </div>
      </form>
      </div>
    </div>
  )
}
