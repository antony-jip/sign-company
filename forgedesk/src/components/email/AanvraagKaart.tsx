import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ArrowRight, Loader2, Building2, UserPlus, CheckCircle2, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { Email, Klant } from '@/types'
import { getKlanten, createKlant, updateKlant, createProject, generateProjectNummer, getAppSettings } from '@/services/supabaseService'
import { koppelEmailAanProject, getProjectVoorThread } from '@/services/emailProjectService'
import { verbergAanvraag } from '@/services/emailService'
import { extractSenderEmail, zoekKlantVoorAfzender, bepaalAanvraagContact, bodyAlsTekst, haalHandtekeningUitBody, GENERIEKE_MAILDOMEINEN } from './emailHelpers'
import type { HandtekeningGegevens } from './emailHelpers'
import { extractCompanyName } from './EmailCRMSidebar'
import { useAuth } from '@/contexts/AuthContext'
import { logger } from '@/utils/logger'

const MONO = { fontFamily: '"DM Mono", ui-monospace, monospace' } as const

const LEGE_HANDTEKENING: HandtekeningGegevens = { telefoon: '', adres: '', postcode: '', stad: '' }

/** Alleen wat de klant nog mist; wat al ingevuld staat blijft ongemoeid. */
function ontbrekendeGegevens(klant: Klant | null, ht: HandtekeningGegevens): Partial<Klant> {
  const patch: Partial<Klant> = {}
  if (ht.telefoon && !klant?.telefoon?.trim()) patch.telefoon = ht.telefoon
  if (ht.adres && !klant?.adres?.trim()) patch.adres = ht.adres
  if (ht.postcode && !klant?.postcode?.trim()) patch.postcode = ht.postcode
  if (ht.stad && !klant?.stad?.trim()) patch.stad = ht.stad
  return patch
}

function omschrijfGegevens(patch: Partial<Klant>): string {
  const adresregel = [patch.adres, [patch.postcode, patch.stad].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ')
  return [patch.telefoon, adresregel].filter(Boolean).join(' · ')
}

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
  const [aangemaakt, setAangemaakt] = useState<{ id: string; naam: string; bestaand?: boolean } | null>(null)
  const [aanvullenBezig, setAanvullenBezig] = useState(false)
  const [aangevuld, setAangevuld] = useState(false)

  const afzenderEmail = extractSenderEmail(email.van)

  // Meestal is de afzender de klant. Komt de aanvraag via ons eigen
  // contactformulier binnen, dan mailt aanvraag@signcompany.nl namens iemand
  // anders en staat de echte klant in de body.
  const bodyTekst = bodyAlsTekst(email.inhoud || '')
  const contact = bepaalAanvraagContact(afzenderEmail, senderName, bodyTekst, user?.email || '')
  const contactNaam = contact.naam || senderName
  const bedrijfsgok = contact.bedrijf || extractCompanyName(contactNaam, contact.email)

  // De handtekening is van de afzender. Mailt een doorgeefluik namens iemand
  // anders, dan hoort die handtekening niet bij deze klant.
  const handtekening = contact.uitBody ? LEGE_HANDTEKENING : haalHandtekeningUitBody(bodyTekst)
  const aanvulling = ontbrekendeGegevens(klant, handtekening)
  const aanvullingTekst = omschrijfGegevens(aanvulling)

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

  // Hangt er al een project aan deze thread, dan is de aanvraag belegd — ook
  // na een herlaad of vanaf een ander apparaat.
  useEffect(() => {
    if (!email.thread_id) return
    let gestopt = false
    getProjectVoorThread(email.thread_id)
      .then((koppeling) => {
        if (!gestopt && koppeling) {
          setAangemaakt({ id: koppeling.project.id, naam: koppeling.project.naam, bestaand: true })
        }
      })
      .catch((err) => logger.warn('Projectkoppeling ophalen mislukt:', err))
    return () => { gestopt = true }
  }, [email.thread_id])

  async function handleProjectAanmaken() {
    if (!user) { toast.error('Niet ingelogd'); return }
    setBezig(true)
    try {
      let doelKlant = klant
      if (!doelKlant) {
        const domein = contact.email.split('@')[1]?.toLowerCase()
        const generiekDomein = GENERIEKE_MAILDOMEINEN.includes(domein || '')
        const telefoon = contact.telefoon || handtekening.telefoon
        doelKlant = await createKlant({
          bedrijfsnaam: bedrijfsgok || contactNaam,
          contactpersoon: contactNaam,
          email: contact.email,
          telefoon,
          adres: handtekening.adres,
          postcode: handtekening.postcode,
          stad: handtekening.stad,
          land: 'Nederland',
          website: domein && !generiekDomein ? `www.${domein}` : '',
          debiteurennummer: '', kvk_nummer: '', btw_nummer: '',
          status: 'actief', tags: [], notities: '',
          contactpersonen: [{
            id: crypto.randomUUID(),
            naam: contactNaam,
            functie: '',
            email: contact.email,
            telefoon,
            is_primair: true,
          }],
        })
        setKlant(doelKlant)
        setAangevuld(true)
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

  async function handleAanvullen() {
    if (!klant) return
    setAanvullenBezig(true)
    try {
      const patch: Partial<Klant> = { ...aanvulling }
      if (patch.telefoon) {
        const contactpersonen = klant.contactpersonen || []
        const index = contactpersonen.findIndex(
          (c) => c.email?.trim().toLowerCase() === contact.email.trim().toLowerCase() && !c.telefoon?.trim()
        )
        if (index >= 0) {
          patch.contactpersonen = contactpersonen.map((c, i) =>
            i === index ? { ...c, telefoon: patch.telefoon as string } : c
          )
        }
      }
      const bijgewerkt = await updateKlant(klant.id, patch)
      setKlant(bijgewerkt)
      setAangevuld(true)
      toast.success('Klantgegevens aangevuld')
    } catch (err) {
      logger.error('Klant aanvullen mislukt:', err)
      toast.error('Aanvullen mislukt')
    } finally {
      setAanvullenBezig(false)
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

  const aanvullingBlok = klantGeladen && !aangevuld && aanvullingTekst ? (
    <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="inline-flex items-center gap-1.5 text-[13px] text-text-sec">
        <MapPin className="h-3.5 w-3.5 text-muted-hex shrink-0" />
        Uit de handtekening:
        <span className="font-medium text-foreground">{aanvullingTekst}</span>
      </span>
      {klant ? (
        <button
          onClick={handleAanvullen}
          disabled={aanvullenBezig}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-[13px] font-semibold text-petrol hover:bg-petrol/[0.06] disabled:opacity-60 transition-colors"
        >
          {aanvullenBezig && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Toevoegen aan klant
        </button>
      ) : (
        <span className="text-[12px] text-muted-hex">nemen we mee bij de nieuwe klant</span>
      )}
    </div>
  ) : null

  if (aangemaakt) {
    return (
      <div className="relative mt-6 overflow-hidden rounded-xl border border-[#4A9960]/25 dark:border-[#7AAF85]/25 bg-[#E8F5EC] dark:bg-[rgba(74,153,96,0.14)] px-5 py-4 pl-6">
        <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-[#4A9960] dark:bg-[#7AAF85]" />
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#4A9960] dark:text-[#7AAF85]" />
            <span className="text-[13px] text-[#3D7A50] dark:text-[#9BC7A5] shrink-0">
              {aangemaakt.bestaand ? 'Al gekoppeld aan' : 'Project aangemaakt'}
            </span>
            <span className="truncate text-[14px] font-semibold text-foreground">{aangemaakt.naam}</span>
          </div>
          <button
            onClick={() => navigate(`/projecten/${aangemaakt.id}`)}
            className="group inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[#4A9960] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#418754]"
          >
            Ga naar project
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
        {aanvullingBlok}
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

        {aanvullingBlok}

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
