import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Mail,
  Bell,
  FileText,
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  Clock,
  DollarSign,
  BarChart3,
  Send,
} from 'lucide-react'
import { useNavigateWithTab } from '@/hooks/useNavigateWithTab'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { getKlanten, getProjecten, getPortaalByProject, createPortaal, updateOfferte } from '@/services/supabaseService'
import { sendFollowUpEmail, generateFollowUpEmail } from '@/services/followUpService'
import type { FollowUpContext } from '@/services/followUpService'
import { offerteFollowUpTemplate } from '@/services/emailTemplateService'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { round2 } from '@/utils/budgetUtils'
import type { Offerte, Klant, Project } from '@/types'
import { FollowUpMailPanel } from './FollowUpMailPanel'

interface QuotesFollowUpProps {
  offertes: Offerte[]
  onRefresh: () => void
}

type FollowUpFilter = 'alle' | 'urgent' | 'niet_bekeken' | 'bekeken_geen_reactie'

function getDagenOpen(offerte: Offerte): number {
  const datum = offerte.verstuurd_op || offerte.created_at
  if (!datum) return 0
  return Math.floor((Date.now() - new Date(datum).getTime()) / (1000 * 60 * 60 * 24))
}

function getDagenTotVerlopen(offerte: Offerte): number {
  if (!offerte.geldig_tot) return 999
  return Math.floor((new Date(offerte.geldig_tot).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function formatDatumKort(dateStr: string | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' }).format(d)
}

function isFollowUpNodig(offerte: Offerte): boolean {
  if (offerte.status !== 'verzonden' && offerte.status !== 'bekeken') return false
  const now = Date.now()
  const drieDAgen = 3 * 24 * 60 * 60 * 1000

  // Verstuurd > 3 dagen geleden
  if (offerte.verstuurd_op && (now - new Date(offerte.verstuurd_op).getTime()) > drieDAgen) return true

  // Follow-up datum vandaag of eerder
  if (offerte.follow_up_datum) {
    const fud = new Date(offerte.follow_up_datum)
    if (fud.getTime() <= now) return true
  }

  // Geldig tot binnen 5 dagen
  if (offerte.geldig_tot) {
    const vijfDagen = 5 * 24 * 60 * 60 * 1000
    const verloopt = new Date(offerte.geldig_tot).getTime()
    if (verloopt - now <= vijfDagen && verloopt > now) return true
  }

  return false
}

function sorteerOpUrgentie(a: Offerte, b: Offerte): number {
  const aDagenTotVerlopen = getDagenTotVerlopen(a)
  const bDagenTotVerlopen = getDagenTotVerlopen(b)

  // 1. Verlopen binnenkort eerst
  const aUrgent = aDagenTotVerlopen <= 5 ? 1 : 0
  const bUrgent = bDagenTotVerlopen <= 5 ? 1 : 0
  if (aUrgent !== bUrgent) return bUrgent - aUrgent

  // 2. Langst wachtend
  const aDagen = getDagenOpen(a)
  const bDagen = getDagenOpen(b)
  if (aDagen !== bDagen) return bDagen - aDagen

  // 3. Al eerder follow-up gehad
  const aPogingen = a.contact_pogingen || 0
  const bPogingen = b.contact_pogingen || 0
  return bPogingen - aPogingen
}

// ── Demo data voor testen ──
const DEMO_KLANT_ID = 'demo-klant-001'
const DEMO_KLANT_ID_2 = 'demo-klant-002'
const DEMO_KLANT_ID_3 = 'demo-klant-003'

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function daysFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

const DEMO_OFFERTES: Offerte[] = [
  {
    id: 'demo-off-001',
    klant_id: DEMO_KLANT_ID,
    klant_naam: 'Bakkerij De Gouden Krakeling',
    nummer: 'OFF-2026-0042',
    titel: 'Gevelletters met LED verlichting',
    status: 'verzonden',
    subtotaal: 3450,
    btw_bedrag: 724.50,
    totaal: 4174.50,
    geldig_tot: daysFromNow(4),
    notities: '',
    voorwaarden: '',
    verstuurd_op: daysAgo(10),
    contact_pogingen: 1,
    laatste_contact: daysAgo(5),
    follow_up_status: 'gepland',
    prioriteit: 'hoog',
    created_at: daysAgo(12),
    updated_at: daysAgo(5),
  },
  {
    id: 'demo-off-002',
    klant_id: DEMO_KLANT_ID_2,
    klant_naam: 'Autobedrijf Van Dijk & Zonen',
    nummer: 'OFF-2026-0039',
    titel: 'Autobelettering wagenpark (8 voertuigen)',
    status: 'bekeken',
    subtotaal: 6800,
    btw_bedrag: 1428,
    totaal: 8228,
    geldig_tot: daysFromNow(12),
    notities: '',
    voorwaarden: '',
    verstuurd_op: daysAgo(7),
    bekeken_door_klant: true,
    eerste_bekeken_op: daysAgo(5),
    laatst_bekeken_op: daysAgo(2),
    aantal_keer_bekeken: 3,
    contact_pogingen: 0,
    created_at: daysAgo(8),
    updated_at: daysAgo(2),
  },
  {
    id: 'demo-off-003',
    klant_id: DEMO_KLANT_ID_3,
    klant_naam: 'Tandartspraktijk Smile Care',
    nummer: 'OFF-2026-0035',
    titel: 'Raambelettering + zuil signing',
    status: 'verzonden',
    subtotaal: 1850,
    btw_bedrag: 388.50,
    totaal: 2238.50,
    geldig_tot: daysFromNow(18),
    notities: '',
    voorwaarden: '',
    verstuurd_op: daysAgo(15),
    contact_pogingen: 2,
    laatste_contact: daysAgo(3),
    follow_up_status: 'achterstallig',
    created_at: daysAgo(16),
    updated_at: daysAgo(3),
  },
  {
    id: 'demo-off-004',
    klant_id: DEMO_KLANT_ID,
    klant_naam: 'Bakkerij De Gouden Krakeling',
    nummer: 'OFF-2026-0044',
    titel: 'Lichtreclame uithangbord',
    status: 'verzonden',
    subtotaal: 2200,
    btw_bedrag: 462,
    totaal: 2662,
    geldig_tot: daysFromNow(2),
    notities: '',
    voorwaarden: '',
    verstuurd_op: daysAgo(20),
    contact_pogingen: 0,
    prioriteit: 'urgent',
    created_at: daysAgo(21),
    updated_at: daysAgo(20),
  },
  {
    id: 'demo-off-005',
    klant_id: DEMO_KLANT_ID_2,
    klant_naam: 'Autobedrijf Van Dijk & Zonen',
    nummer: 'OFF-2026-0041',
    titel: 'Showroom wanddecoratie',
    status: 'bekeken',
    subtotaal: 4500,
    btw_bedrag: 945,
    totaal: 5445,
    geldig_tot: daysFromNow(25),
    notities: '',
    voorwaarden: '',
    verstuurd_op: daysAgo(5),
    bekeken_door_klant: true,
    eerste_bekeken_op: daysAgo(3),
    laatst_bekeken_op: daysAgo(1),
    aantal_keer_bekeken: 5,
    contact_pogingen: 0,
    created_at: daysAgo(6),
    updated_at: daysAgo(1),
  },
]

const DEMO_KLANTEN: Klant[] = [
  {
    id: DEMO_KLANT_ID,
    bedrijfsnaam: 'Bakkerij De Gouden Krakeling',
    contactpersoon: 'Jan de Bakker',
    email: 'jan@goudenkrakeling.nl',
    telefoon: '06-12345678',
    adres: 'Broodstraat 12',
    postcode: '1234 AB',
    stad: 'Amsterdam',
    land: 'Nederland',
    website: '',
    kvk_nummer: '',
    btw_nummer: '',
    status: 'actief',
    tags: [],
    notities: '',
    contactpersonen: [
      { id: 'cp-1', naam: 'Jan de Bakker', functie: 'Eigenaar', email: 'jan@goudenkrakeling.nl', telefoon: '06-12345678', is_primair: true },
    ],
    vestigingen: [],
    created_at: daysAgo(90),
    updated_at: daysAgo(10),
  },
  {
    id: DEMO_KLANT_ID_2,
    bedrijfsnaam: 'Autobedrijf Van Dijk & Zonen',
    contactpersoon: 'Peter van Dijk',
    email: 'peter@vandijkenzonen.nl',
    telefoon: '06-98765432',
    adres: 'Autoweg 45',
    postcode: '5678 CD',
    stad: 'Rotterdam',
    land: 'Nederland',
    website: '',
    kvk_nummer: '',
    btw_nummer: '',
    status: 'actief',
    tags: [],
    notities: '',
    contactpersonen: [
      { id: 'cp-2', naam: 'Peter van Dijk', functie: 'Directeur', email: 'peter@vandijkenzonen.nl', telefoon: '06-98765432', is_primair: true },
    ],
    vestigingen: [],
    created_at: daysAgo(120),
    updated_at: daysAgo(7),
  },
  {
    id: DEMO_KLANT_ID_3,
    bedrijfsnaam: 'Tandartspraktijk Smile Care',
    contactpersoon: 'Dr. Lisa Molenaar',
    email: 'info@smilecare.nl',
    telefoon: '06-55512345',
    adres: 'Gezondheidslaan 8',
    postcode: '9012 EF',
    stad: 'Utrecht',
    land: 'Nederland',
    website: '',
    kvk_nummer: '',
    btw_nummer: '',
    status: 'actief',
    tags: [],
    notities: '',
    contactpersonen: [
      { id: 'cp-3', naam: 'Dr. Lisa Molenaar', functie: 'Praktijkhouder', email: 'info@smilecare.nl', telefoon: '06-55512345', is_primair: true },
    ],
    vestigingen: [],
    created_at: daysAgo(60),
    updated_at: daysAgo(15),
  },
]

export function QuotesFollowUp({ offertes, onRefresh }: QuotesFollowUpProps) {
  const { user } = useAuth()
  const { profile } = useAppSettings()
  const { navigateWithTab } = useNavigateWithTab()

  const [klanten, setKlanten] = useState<Map<string, Klant>>(new Map())
  const [projecten, setProjecten] = useState<Map<string, Project>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<FollowUpFilter>('alle')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [mailPanelOfferte, setMailPanelOfferte] = useState<Offerte | null>(null)
  const [portaalDialog, setPortaalDialog] = useState<Offerte | null>(null)
  const [sendingPortaal, setSendingPortaal] = useState<string | null>(null)
  const [bulkSending, setBulkSending] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 })

  // Load klanten and projecten
  useEffect(() => {
    async function load() {
      try {
        const [klantenData, projectenData] = await Promise.all([
          getKlanten(),
          getProjecten(),
        ])
        // Merge demo klanten met echte klanten
        const klantenMap = new Map(klantenData.map((k) => [k.id, k]))
        DEMO_KLANTEN.forEach((k) => klantenMap.set(k.id, k))
        setKlanten(klantenMap)
        setProjecten(new Map(projectenData.map((p) => [p.id, p])))
      } catch (err) {
        console.error('Fout bij laden klanten/projecten:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  // Merge demo offertes met echte offertes en filter op follow-up nodig
  const followUpOffertes = useMemo(() => {
    const alleOffertes = [...offertes, ...DEMO_OFFERTES]
    return alleOffertes.filter(isFollowUpNodig).sort(sorteerOpUrgentie)
  }, [offertes])

  // Apply sub-filter
  const gefilterd = useMemo(() => {
    if (filter === 'alle') return followUpOffertes
    if (filter === 'urgent') {
      return followUpOffertes.filter((o) => getDagenTotVerlopen(o) <= 5 || getDagenOpen(o) > 14)
    }
    if (filter === 'niet_bekeken') {
      return followUpOffertes.filter((o) => o.status === 'verzonden')
    }
    if (filter === 'bekeken_geen_reactie') {
      return followUpOffertes.filter((o) => o.status === 'bekeken')
    }
    return followUpOffertes
  }, [followUpOffertes, filter])

  // Stats
  const stats = useMemo(() => {
    const urgent = followUpOffertes.filter((o) => getDagenTotVerlopen(o) <= 5 || getDagenOpen(o) > 14).length
    const nietBekeken = followUpOffertes.filter((o) => o.status === 'verzonden').length
    const openstaandBedrag = round2(followUpOffertes.reduce((sum, o) => sum + (o.totaal || 0), 0))
    return {
      totaal: followUpOffertes.length,
      urgent,
      nietBekeken,
      bekekenGeenReactie: followUpOffertes.filter((o) => o.status === 'bekeken').length,
      openstaandBedrag,
    }
  }, [followUpOffertes])

  // Selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === gefilterd.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(gefilterd.map((o) => o.id)))
    }
  }

  // Portaal herinnering
  const handlePortaalHerinnering = useCallback(async (offerte: Offerte) => {
    if (!offerte.project_id) {
      toast.error('Deze offerte is niet aan een project gekoppeld')
      return
    }

    setSendingPortaal(offerte.id)
    try {
      const portaal = await getPortaalByProject(offerte.project_id)
      if (portaal?.token) {
        // Portaal bestaat — stuur herinnering
        const klant = klanten.get(offerte.klant_id)
        const portaalUrl = `${window.location.origin}/portaal/${portaal.token}`
        const template = offerteFollowUpTemplate({
          klantNaam: klant?.contactpersoon || klant?.bedrijfsnaam || '',
          offerteNummer: offerte.nummer,
          offerteTitel: offerte.titel,
          totaalBedrag: formatCurrency(offerte.totaal || 0),
          geldigTot: offerte.geldig_tot ? formatDate(offerte.geldig_tot) : '',
          bekijkUrl: portaalUrl,
          bedrijfsnaam: profile?.bedrijfsnaam || '',
          handtekening: profile ? `${profile.voornaam} ${profile.achternaam}` : '',
        })

        const klantEmail = klant?.contactpersonen?.find((c) => c.is_primair)?.email || klant?.email || ''
        if (!klantEmail) {
          toast.error('Geen email adres gevonden voor deze klant')
          return
        }

        await sendFollowUpEmail({
          to: klantEmail,
          subject: template.subject,
          body: template.text,
          html: template.html,
        })

        await updateOfferte(offerte.id, {
          contact_pogingen: (offerte.contact_pogingen || 0) + 1,
          laatste_contact: new Date().toISOString(),
        })

        toast.success('Herinnering verstuurd via portaal')
        onRefresh()
      } else {
        // Geen portaal — toon dialog
        setPortaalDialog(offerte)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Herinnering verzenden mislukt')
    } finally {
      setSendingPortaal(null)
    }
  }, [klanten, profile, onRefresh])

  // Create portaal + send reminder
  const handleCreatePortaalAndSend = useCallback(async () => {
    if (!portaalDialog || !user?.id || !portaalDialog.project_id) return

    setSendingPortaal(portaalDialog.id)
    setPortaalDialog(null)
    try {
      const portaal = await createPortaal(portaalDialog.project_id, user.id)
      const klant = klanten.get(portaalDialog.klant_id)
      const portaalUrl = `${window.location.origin}/portaal/${portaal.token}`

      const template = offerteFollowUpTemplate({
        klantNaam: klant?.contactpersoon || klant?.bedrijfsnaam || '',
        offerteNummer: portaalDialog.nummer,
        offerteTitel: portaalDialog.titel,
        totaalBedrag: formatCurrency(portaalDialog.totaal || 0),
        geldigTot: portaalDialog.geldig_tot ? formatDate(portaalDialog.geldig_tot) : '',
        bekijkUrl: portaalUrl,
        bedrijfsnaam: profile?.bedrijfsnaam || '',
        handtekening: profile ? `${profile.voornaam} ${profile.achternaam}` : '',
      })

      const klantEmail = klant?.contactpersonen?.find((c) => c.is_primair)?.email || klant?.email || ''
      await sendFollowUpEmail({
        to: klantEmail,
        subject: template.subject,
        body: template.text,
        html: template.html,
      })

      await updateOfferte(portaalDialog.id, {
        contact_pogingen: (portaalDialog.contact_pogingen || 0) + 1,
        laatste_contact: new Date().toISOString(),
      })

      toast.success('Portaal aangemaakt en herinnering verstuurd')
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Portaal aanmaken mislukt')
    } finally {
      setSendingPortaal(null)
    }
  }, [portaalDialog, user, klanten, profile, onRefresh])

  // Bulk follow-up
  const handleBulkFollowUp = useCallback(async () => {
    const selected = gefilterd.filter((o) => selectedIds.has(o.id))
    if (selected.length === 0) return

    setBulkSending(true)
    setBulkProgress({ current: 0, total: selected.length })

    let succeeded = 0
    for (const offerte of selected) {
      try {
        const klant = klanten.get(offerte.klant_id)
        const project = offerte.project_id ? projecten.get(offerte.project_id) : null
        const contactpersoon = klant?.contactpersonen?.find((c) => c.is_primair)?.naam || klant?.contactpersoon || ''
        const dagenOpen = getDagenOpen(offerte)
        const dagenTotVerlopen = getDagenTotVerlopen(offerte)

        const context: FollowUpContext = {
          klantnaam: klant?.bedrijfsnaam || offerte.klant_naam || '',
          contactpersoon: contactpersoon.split(' ')[0] || contactpersoon,
          projectnaam: project?.naam,
          offerte_nummer: offerte.nummer,
          offerte_titel: offerte.titel,
          bedrag: offerte.totaal || 0,
          dagen_open: dagenOpen,
          geldig_tot: offerte.geldig_tot || '',
          dagen_tot_verlopen: dagenTotVerlopen,
          aantal_eerdere_followups: offerte.contact_pogingen || 0,
          status: offerte.status,
          bedrijfsnaam_afzender: profile?.bedrijfsnaam || '',
          afzender_naam: profile?.voornaam || '',
        }

        const email = await generateFollowUpEmail(context)
        const to = klant?.contactpersonen?.find((c) => c.is_primair)?.email || klant?.email || ''

        if (to) {
          // Check portaal link
          let body = email.body
          if (offerte.project_id) {
            const portaal = await getPortaalByProject(offerte.project_id)
            if (portaal?.token) {
              const url = `${window.location.origin}/portaal/${portaal.token}`
              body = body.replace(/\[PORTAAL_LINK\]/g, url)
            }
          }
          body = body.replace(/[^\n]*\[PORTAAL_LINK\][^\n]*/g, '').replace(/\n{3,}/g, '\n\n')

          await sendFollowUpEmail({ to, subject: email.onderwerp, body })

          await updateOfferte(offerte.id, {
            contact_pogingen: (offerte.contact_pogingen || 0) + 1,
            laatste_contact: new Date().toISOString(),
            follow_up_datum: new Date().toISOString().split('T')[0],
            follow_up_status: 'afgerond',
          })
          succeeded++
        }
      } catch (err) {
        console.error(`Bulk follow-up mislukt voor ${offerte.nummer}:`, err)
      }
      setBulkProgress((p) => ({ ...p, current: p.current + 1 }))
    }

    setBulkSending(false)
    setSelectedIds(new Set())
    toast.success(`${succeeded}/${selected.length} follow-ups verstuurd`)
    onRefresh()
  }, [gefilterd, selectedIds, klanten, projecten, profile, onRefresh])

  // Badge color for days open
  function getDagenBadgeClass(dagen: number): string {
    if (dagen > 14) return 'bg-red-100 text-red-700 border-red-200'
    if (dagen > 7) return 'bg-orange-100 text-orange-700 border-orange-200'
    return 'bg-muted text-muted-foreground'
  }

  // Follow-up info text
  function getFollowUpInfo(offerte: Offerte): string {
    const pogingen = offerte.contact_pogingen || 0
    if (pogingen === 0) return 'geen'
    const datum = offerte.laatste_contact ? formatDatumKort(offerte.laatste_contact) : '?'
    if (pogingen === 1) return `1x op ${datum}`
    return `${pogingen}x, laatst op ${datum}`
  }

  const filterPills: { key: FollowUpFilter; label: string; count: number; icon?: typeof AlertTriangle }[] = [
    { key: 'alle', label: 'Alle', count: stats.totaal },
    { key: 'urgent', label: 'Urgent', count: stats.urgent, icon: AlertTriangle },
    { key: 'niet_bekeken', label: 'Niet bekeken', count: stats.nietBekeken },
    { key: 'bekeken_geen_reactie', label: 'Bekeken, geen reactie', count: stats.bekekenGeenReactie },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-card-gradient-lavender rounded-2xl p-4 border border-black/[0.04] stat-card-hover relative overflow-hidden">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-3.5 h-3.5 text-[var(--color-lavender-text)] opacity-60" />
            <p className="text-2xs font-extrabold uppercase tracking-[0.1em] text-text-tertiary">Opvolgen</p>
          </div>
          <p className="text-2xl font-bold font-mono">{stats.totaal}</p>
          <p className="text-xs text-muted-foreground mt-1">offertes</p>
        </div>
        <div className="stat-card-gradient-lavender rounded-2xl p-4 border border-black/[0.04] stat-card-hover relative overflow-hidden">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-[var(--color-lavender-text)] opacity-60" />
            <p className="text-2xs font-extrabold uppercase tracking-[0.1em] text-text-tertiary">Openstaand</p>
          </div>
          <p className="text-2xl font-bold font-mono">{formatCurrency(stats.openstaandBedrag)}</p>
        </div>
        <div className="stat-card-gradient-mist rounded-2xl p-4 border border-black/[0.04] stat-card-hover relative overflow-hidden">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-mist-text)] opacity-60" />
            <p className="text-2xs font-extrabold uppercase tracking-[0.1em] text-text-tertiary">Urgent</p>
          </div>
          <p className="text-2xl font-bold font-mono">{stats.urgent}</p>
          <p className="text-xs text-muted-foreground mt-1">verlopen binnenkort</p>
        </div>
        <div className="stat-card-gradient-mist rounded-2xl p-4 border border-black/[0.04] stat-card-hover relative overflow-hidden">
          <div className="flex items-center gap-2 mb-1">
            <EyeOff className="w-3.5 h-3.5 text-[var(--color-mist-text)] opacity-60" />
            <p className="text-2xs font-extrabold uppercase tracking-[0.1em] text-text-tertiary">Niet bekeken</p>
          </div>
          <p className="text-2xl font-bold font-mono">{stats.nietBekeken}</p>
          <p className="text-xs text-muted-foreground mt-1">nooit geopend</p>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
        {filterPills.map((pill) => {
          if (pill.key !== 'alle' && pill.count === 0) return null
          return (
            <button
              key={pill.key}
              onClick={() => { setFilter(pill.key); setSelectedIds(new Set()) }}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border',
                filter === pill.key
                  ? 'bg-[var(--color-lavender)] text-[var(--color-lavender-text)] border-[var(--color-lavender-border)]'
                  : 'bg-muted/40 text-muted-foreground border-transparent hover:bg-muted'
              )}
            >
              {pill.icon && <pill.icon className="w-3 h-3" />}
              {pill.label}
              {pill.count > 0 && <span className="opacity-60">{pill.count}</span>}
            </button>
          )
        })}
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[var(--color-lavender)] border border-[var(--color-lavender-border)]">
          <span className="text-sm font-medium text-[var(--color-lavender-text)]">
            {selectedIds.size} geselecteerd
          </span>
          <div className="flex-1" />
          {bulkSending ? (
            <span className="text-sm text-[var(--color-lavender-text)] flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Bezig... {bulkProgress.current}/{bulkProgress.total} verstuurd
            </span>
          ) : (
            <Button
              size="sm"
              onClick={handleBulkFollowUp}
              className="gap-1.5 bg-[var(--color-lavender-text)] hover:bg-[var(--color-lavender-text)]/90 text-white"
            >
              <Send className="w-3.5 h-3.5" />
              Bulk follow-up versturen
            </Button>
          )}
        </div>
      )}

      {/* Select all */}
      {gefilterd.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <Checkbox
            checked={selectedIds.size === gefilterd.length && gefilterd.length > 0}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-xs text-muted-foreground">Alles selecteren</span>
        </div>
      )}

      {/* Offerte cards */}
      {gefilterd.length === 0 ? (
        <div className="text-center py-16">
          <Clock className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">Geen offertes die opvolging nodig hebben</p>
        </div>
      ) : (
        <div className="space-y-3">
          {gefilterd.map((offerte) => {
            const klant = klanten.get(offerte.klant_id)
            const project = offerte.project_id ? projecten.get(offerte.project_id) : null
            const dagenOpen = getDagenOpen(offerte)
            const dagenTotVerlopen = getDagenTotVerlopen(offerte)
            const isSelected = selectedIds.has(offerte.id)

            return (
              <div
                key={offerte.id}
                className={cn(
                  'rounded-2xl border p-4 sm:p-5 transition-all',
                  isSelected
                    ? 'border-[var(--color-lavender-border)] bg-[var(--color-lavender)]/30'
                    : 'border-border bg-card hover:shadow-md'
                )}
              >
                {/* Top row: number, badge, checkbox */}
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelect(offerte.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-semibold">{offerte.nummer}</span>
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                        getDagenBadgeClass(dagenOpen)
                      )}>
                        {dagenOpen} dagen
                      </span>
                      {dagenTotVerlopen <= 5 && dagenTotVerlopen > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                          <AlertTriangle className="w-3 h-3" />
                          Verloopt in {dagenTotVerlopen}d
                        </span>
                      )}
                    </div>

                    {/* Klant + titel */}
                    <p className="font-semibold mt-1.5 truncate">
                      {klant?.bedrijfsnaam || offerte.klant_naam || 'Onbekende klant'}
                      <span className="font-normal text-muted-foreground"> — {offerte.titel}</span>
                    </p>

                    {/* Project */}
                    {project && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Project: {project.naam}
                      </p>
                    )}

                    {/* Details row */}
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                      <span className="font-mono font-medium text-foreground">
                        {formatCurrency(offerte.totaal || 0)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Verstuurd: {formatDatumKort(offerte.verstuurd_op)}
                      </span>
                      {offerte.geldig_tot && (
                        <span className={cn(
                          'flex items-center gap-1',
                          dagenTotVerlopen <= 5 && 'text-red-600 font-medium'
                        )}>
                          Geldig tot: {formatDatumKort(offerte.geldig_tot)}
                        </span>
                      )}
                    </div>

                    {/* Status + follow-up info */}
                    <div className="flex items-center gap-3 mt-2 text-sm flex-wrap">
                      <Badge className={cn(
                        'text-xs',
                        offerte.status === 'verzonden' ? 'badge-mist' : 'badge-cream'
                      )}>
                        {offerte.status === 'verzonden' ? (
                          <><EyeOff className="w-3 h-3 mr-1" />Verstuurd (niet bekeken)</>
                        ) : (
                          <><Eye className="w-3 h-3 mr-1" />Bekeken</>
                        )}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        Vorige follow-up: {getFollowUpInfo(offerte)}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMailPanelOfferte(offerte)}
                        className="gap-1.5 text-xs"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Follow-up mail
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePortaalHerinnering(offerte)}
                        disabled={sendingPortaal === offerte.id || !offerte.project_id}
                        className="gap-1.5 text-xs"
                      >
                        {sendingPortaal === offerte.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Bell className="w-3.5 h-3.5" />
                        )}
                        Portaal herinnering
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigateWithTab({
                          path: `/offertes/${offerte.id}/bewerken`,
                          label: offerte.nummer || offerte.titel || 'Offerte',
                          id: `/offertes/${offerte.id}`,
                        })}
                        className="gap-1.5 text-xs"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Details
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Follow-up mail panel */}
      {mailPanelOfferte && (
        <FollowUpMailPanel
          offerte={mailPanelOfferte}
          klant={klanten.get(mailPanelOfferte.klant_id) || null}
          project={mailPanelOfferte.project_id ? projecten.get(mailPanelOfferte.project_id) || null : null}
          profile={profile ? { voornaam: profile.voornaam, achternaam: profile.achternaam, bedrijfsnaam: profile.bedrijfsnaam } : null}
          userId={user?.id || ''}
          onClose={() => setMailPanelOfferte(null)}
          onSent={onRefresh}
        />
      )}

      {/* Portaal aanmaken dialog */}
      <Dialog open={!!portaalDialog} onOpenChange={(open) => !open && setPortaalDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Geen klantportaal gevonden</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Er is nog geen klantportaal voor dit project. Wil je er een aanmaken en de offerte herinnering delen?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPortaalDialog(null)}>Nee</Button>
            <Button
              onClick={handleCreatePortaalAndSend}
              className="bg-[var(--color-lavender-text)] hover:bg-[var(--color-lavender-text)]/90 text-white"
            >
              Ja, aanmaken en versturen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
