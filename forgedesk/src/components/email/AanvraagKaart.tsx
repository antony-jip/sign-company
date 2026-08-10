import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ArrowRight, Loader2, Building2, UserPlus, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { Email, Klant } from '@/types'
import { getKlanten, createKlant, createProject, generateProjectNummer, getAppSettings } from '@/services/supabaseService'
import { koppelEmailAanProject } from '@/services/emailProjectService'
import { verbergAanvraag } from '@/services/emailService'
import { extractSenderEmail, zoekKlantVoorAfzender, bepaalAanvraagContact, bodyAlsTekst, GENERIEKE_MAILDOMEINEN } from './emailHelpers'
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

  // Meestal is de afzender de klant. Komt de aanvraag via ons eigen
  // contactformulier binnen, dan mailt aanvraag@signcompany.nl namens iemand
  // anders en staat de echte klant in de body.
  const contact = bepaalAanvraagContact(
    afzenderEmail,
    senderName,
    bodyAlsTekst(email.inhoud || ''),
    user?.email || ''
  )
  const contactNaam = contact.naam || senderName
  const bedrijfsgok = contact.bedrijf || extractCompanyName(contactNaam, contact.email)

  // Zelfde match als de CRM-sidebar: eerst op adres, dan op domein.
  useEffect(() => {
    let gestopt = false
    async function zoekKlant() {
      try {
        const klanten = await getKlanten()
        const match = zoekKlantVoorAfzender(klanten, contact.email)
        if (!gestopt) setKlant(match)
      } catch (err) {
        logger.warn('Klant zoeken mislukt:', err)
      } finally {
        if (!gestopt) setKlantGeladen(true)
      }
    }
    zoekKlant()
    return () => { gestopt = true }
  }, [contact.email])

  async function handleProjectAanmaken() {
    if (!user) { toast.error('Niet ingelogd'); return }
    setBezig(true)
    try {
      let doelKlant = klant
      if (!doelKlant) {
        const domein = contact.email.split('@')[1]?.toLowerCase()
        const generiekDomein = GENERIEKE_MAILDOMEINEN.includes(domein || '')
        doelKlant = await createKlant({
          bedrijfsnaam: bedrijfsgok || contactNaam,
          contactpersoon: contactNaam,
          email: contact.email,
          telefoon: contact.telefoon,
          adres: '', postcode: '', stad: '', land: 'Nederland',
          website: domein && !generiekDomein ? `www.${domein}` : '',
          debiteurennummer: '', kvk_nummer: '', btw_nummer: '',
          status: 'actief', tags: [], notities: '',
          contactpersonen: [{
            id: crypto.randomUUID(),
            naam: contactNaam,
            functie: '',
            email: contact.email,
            telefoon: contact.telefoon,
            is_primair: true,
          }],
        })
        setKlant(doelKlant)
      }

      const settings = await getAppSettings(user.id)
      const projectNummer = await generateProjectNummer(settings?.project_prefix || 'P')
      const klantNaam = doelKlant.bedrijfsnaam || doelKlant.contactpersoon || contactNaam

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
      <div className="relative mt-6 overflow-hidden rounded-xl doen-panel doen-wash px-5 py-4 pl-6">
        <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-petrol" />
        <div className="flex flex-wrap items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-petrol shrink-0" />
          <span className="text-[13px] text-text-sec">Project aangemaakt</span>
          <button
            onClick={() => navigate(`/projecten/${aangemaakt.id}`)}
            className="group inline-flex items-center gap-1.5 text-[14px] font-semibold text-petrol hover:underline"
          >
            {aangemaakt.naam}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    )
  }

  const klantNaam = klant?.bedrijfsnaam || klant?.contactpersoon || ''

  return (
    <div className="relative mt-6 overflow-hidden rounded-xl doen-panel doen-wash">
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-flame to-flame/30"
      />

      <button
        onClick={handleVerbergen}
        aria-label="Suggestie verbergen"
        className="absolute top-3.5 right-3.5 text-muted-hex hover:text-ink transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="pl-6 pr-10 py-5">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="badge-flame">Aanvraag</span>
          {typeof email.aanvraag_zekerheid === 'number' && email.aanvraag_zekerheid > 0 && (
            <span className="text-[11px] text-muted-hex" style={MONO}>
              {email.aanvraag_zekerheid}% zeker
            </span>
          )}
        </div>

        {email.aanvraag_samenvatting && (
          <p className="text-[14px] leading-relaxed text-foreground mb-4 max-w-[64ch]">
            {email.aanvraag_samenvatting}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
          <Button
            onClick={handleProjectAanmaken}
            disabled={bezig || !klantGeladen}
            className="h-10 px-5 rounded-lg bg-flame hover:bg-flame/90 text-white font-semibold text-[14px]"
          >
            {bezig && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Project aanmaken
          </Button>

          {!klantGeladen ? (
            <span className="text-[13px] text-muted-hex">Klant zoeken...</span>
          ) : klant ? (
            <span className="inline-flex items-center gap-1.5 text-[13px] text-text-sec">
              <Building2 className="h-3.5 w-3.5 text-petrol shrink-0" />
              Onder
              <span className="font-semibold text-foreground">{klantNaam}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[13px] text-text-sec">
              <UserPlus className="h-3.5 w-3.5 text-muted-hex shrink-0" />
              Nieuwe klant:
              <span className="font-semibold text-foreground">{bedrijfsgok || contactNaam}</span>
            </span>
          )}
        </div>

        {contact.uitBody && (
          <p className="mt-2.5 text-[12px] text-muted-hex">
            Aanvrager uit de mailtekst · {contactNaam} · {contact.email}
            {contact.telefoon ? ` · ${contact.telefoon}` : ''}
          </p>
        )}
      </div>
    </div>
  )
}
