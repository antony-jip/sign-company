import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { Email, Klant } from '@/types'
import { getKlanten, createKlant, createProject, generateProjectNummer, getAppSettings } from '@/services/supabaseService'
import { koppelEmailAanProject } from '@/services/emailProjectService'
import { verbergAanvraag } from '@/services/emailService'
import { extractSenderEmail } from './emailHelpers'
import { extractCompanyName } from './EmailCRMSidebar'
import { useAuth } from '@/contexts/AuthContext'
import { logger } from '@/utils/logger'

const MONO = { fontFamily: '"DM Mono", ui-monospace, monospace' } as const

interface AanvraagKaartProps {
  email: Email
  senderName: string
}

export function AanvraagKaart({ email, senderName }: AanvraagKaartProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [klant, setKlant] = useState<Klant | null>(null)
  const [klantGeladen, setKlantGeladen] = useState(false)
  const [bezig, setBezig] = useState(false)
  const [verborgen, setVerborgen] = useState(false)
  const [aangemaakt, setAangemaakt] = useState<{ id: string; naam: string } | null>(null)

  const afzenderEmail = extractSenderEmail(email.van)
  const bedrijfsgok = extractCompanyName(senderName, afzenderEmail)

  // Zelfde match als de CRM-sidebar: eerst op adres, dan op domein.
  useEffect(() => {
    let gestopt = false
    async function zoekKlant() {
      try {
        const klanten = await getKlanten()
        const adres = afzenderEmail.toLowerCase()
        let match = klanten.find((k) => k.email?.toLowerCase() === adres)
        if (!match) {
          const domein = adres.split('@')[1]
          if (domein) match = klanten.find((k) => k.email?.toLowerCase().endsWith('@' + domein))
        }
        if (!gestopt) setKlant(match || null)
      } catch (err) {
        logger.warn('Klant zoeken mislukt:', err)
      } finally {
        if (!gestopt) setKlantGeladen(true)
      }
    }
    zoekKlant()
    return () => { gestopt = true }
  }, [afzenderEmail])

  async function handleProjectAanmaken() {
    if (!user) { toast.error('Niet ingelogd'); return }
    setBezig(true)
    try {
      let doelKlant = klant
      if (!doelKlant) {
        const domein = afzenderEmail.split('@')[1]?.toLowerCase()
        doelKlant = await createKlant({
          bedrijfsnaam: bedrijfsgok || senderName,
          contactpersoon: senderName,
          email: afzenderEmail,
          telefoon: '',
          adres: '', postcode: '', stad: '', land: 'Nederland',
          website: domein ? `www.${domein}` : '',
          debiteurennummer: '', kvk_nummer: '', btw_nummer: '',
          status: 'actief', tags: [], notities: '',
          contactpersonen: [{
            id: crypto.randomUUID(),
            naam: senderName,
            functie: '',
            email: afzenderEmail,
            telefoon: '',
            is_primair: true,
          }],
        })
        setKlant(doelKlant)
      }

      const settings = await getAppSettings(user.id)
      const projectNummer = await generateProjectNummer(settings?.project_prefix || 'P')
      const klantNaam = doelKlant.bedrijfsnaam || doelKlant.contactpersoon || senderName

      const project = await createProject({
        user_id: user.id,
        klant_id: doelKlant.id,
        project_nummer: projectNummer,
        naam: `${klantNaam} - ${email.onderwerp?.slice(0, 40) || 'Nieuwe aanvraag'}`,
        beschrijving: email.aanvraag_samenvatting || `n.a.v. email: ${email.onderwerp || ''}`,
        status: 'gepland',
        prioriteit: 'medium',
        budget: 0,
        besteed: 0,
        voortgang: 0,
        team_leden: [],
      })

      if (email.thread_id) {
        await koppelEmailAanProject(email.thread_id, project.id).catch((err) => {
          logger.warn('Thread koppelen mislukt:', err)
        })
      }

      setAangemaakt({ id: project.id, naam: project.naam })
      toast.success('Project aangemaakt', {
        action: { label: 'Openen', onClick: () => navigate(`/projecten/${project.id}`) },
      })
    } catch (err) {
      logger.error('Project aanmaken mislukt:', err)
      toast.error('Project aanmaken mislukt')
    } finally {
      setBezig(false)
    }
  }

  async function handleVerbergen() {
    setVerborgen(true)
    try {
      await verbergAanvraag(email.id)
    } catch (err) {
      logger.warn('Aanvraag verbergen mislukt:', err)
    }
  }

  if (verborgen) return null

  if (aangemaakt) {
    return (
      <div className="mt-6 border-l-2 border-flame bg-muted/40 rounded-r-lg px-5 py-4">
        <button
          onClick={() => navigate(`/projecten/${aangemaakt.id}`)}
          className="inline-flex items-center gap-2 text-[14px] font-medium text-petrol hover:underline"
        >
          {aangemaakt.naam}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative mt-6 border-l-2 border-flame bg-muted/40 rounded-r-lg px-5 py-4">
      <button
        onClick={handleVerbergen}
        aria-label="Suggestie verbergen"
        className="absolute top-3 right-3 text-muted-hex hover:text-ink transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <span
        className="block text-[11px] uppercase tracking-wider text-muted-hex mb-3"
        style={MONO}
      >
        herkend als aanvraag
      </span>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button
          onClick={handleProjectAanmaken}
          disabled={bezig || !klantGeladen}
          className="h-10 px-5 rounded-lg bg-flame hover:bg-flame/90 text-white font-semibold text-[14px]"
        >
          {bezig && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Project aanmaken
        </Button>

        <span className="text-[14px] text-text-sec">
          {!klantGeladen
            ? 'Klant zoeken...'
            : klant
              ? `Koppel aan ${klant.bedrijfsnaam || klant.contactpersoon}`
              : `Nieuwe klant: ${bedrijfsgok || senderName}`}
        </span>
      </div>
    </div>
  )
}
