import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Upload,
  CheckCircle2,
  Eye,
  EyeOff,
  Save,
  Mail,
  Lock,
  Server,
  Info,
  ExternalLink,
  FileText,
  Users,
  ImageIcon,
  X,
  Minus,
  Plus,
  UserCircle,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Bell,
  ArrowRight,
  KeyRound,
  Filter,
  Pencil,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { useFunctie } from '@/hooks/useFunctie'
import { useSyncStatus } from '@/lib/mail/hooks'
import { mailStore } from '@/lib/mail/mailStore'
import { getPostvakken, hernoem, ontkoppelPostvak, postvakkenUitgebreid, slaPostvakOp, zetStandaard } from '@/services/postvakService'
import type { Postvak } from '@/lib/mail/types'
import { getBackfillTarget, setBackfillTarget, type BackfillTarget } from '@/services/emailService'
import { getProfile, getProfielenVoorTeam, getAppSettings, updateAppSettings, getMedewerkers, getEmailTemplates, createEmailTemplate, updateEmailTemplate, deleteEmailTemplate, type EmailTemplate } from '@/services/supabaseService'
import { isSupabaseConfigured } from '@/services/supabaseClient'
import { uploadPubliekeMailAfbeelding, getPubliekeMailUrl } from '@/services/storageService'
import { sanitizeStorageFilename } from '@/utils/storageHelpers'
import { toast } from 'sonner'
import { logger } from '../../utils/logger'
import type { Medewerker } from '@/types'
import { SubTabNav } from './SubTabNav'
import { MailRegelsKaart } from './MailRegelsKaart'
import { HandtekeningEditor } from './HandtekeningEditor'
import { SignatureImageUpload } from './SignatureImageUpload'
import { HandtekeningenBeheer } from './HandtekeningenBeheer'
import { handtekeningenBeschikbaar } from '@/services/handtekeningService'
import {
  handtekeningNaarHtml,
  handtekeningBreedte,
  HANDTEKENING_BREEDTE_STANDAARD,
  HANDTEKENING_BREEDTE_MIN,
  HANDTEKENING_BREEDTE_MAX,
} from '@/utils/handtekening'
import type { SubTab } from './settingsShared'
import { EmailSettings, DEFAULT_EMAIL_SETTINGS, EMAIL_PROVIDER_DEFAULTS } from './settingsShared'
import type { EmailProvider } from './settingsShared'

const EMAIL_TABS: SubTab[] = [
  { id: 'verbinding', label: 'Verbinding', icon: Server },
  { id: 'handtekening', label: 'Handtekening', icon: FileText },
  { id: 'templates', label: 'Templates', icon: Mail },
  { id: 'regels', label: 'Regels en labels', icon: Filter },
  { id: 'teamleden', label: 'Team Handtekeningen', icon: Users },
  { id: 'algemeen', label: 'Algemeen', icon: Mail },
]

/* De OAuth-knop verschijnt pas als de app-registratie bij Google of Microsoft
   rond is. Een knop die niets doet, met of zonder "Binnenkort", helpt niemand:
   tot die tijd staat er alleen de route die wél werkt. */
function oauthAan(sleutel: 'VITE_MAIL_OAUTH_GOOGLE' | 'VITE_MAIL_OAUTH_MICROSOFT'): boolean {
  const env = import.meta.env as unknown as Record<string, string | undefined>
  return env[sleutel] === 'aan'
}

function afleidProvider(smtpHost: string): EmailProvider | null {
  if (!smtpHost) return null
  if (smtpHost.includes('office365') || smtpHost.includes('outlook')) return 'outlook'
  if (smtpHost.includes('gmail')) return 'gmail'
  return 'overig'
}

const PROVIDER_KAARTEN: { id: EmailProvider; naam: string; sub: string }[] = [
  { id: 'gmail', naam: 'Google', sub: 'Gmail en Google Workspace' },
  { id: 'outlook', naam: 'Microsoft 365 / Outlook.com', sub: 'Exchange Online, Outlook.com, Hotmail' },
  { id: 'overig', naam: 'Overig', sub: 'Eigen hosting, IMAP en SMTP' },
]

function OAuthKnop({ label, aan }: { label: string; aan: boolean }) {
  if (!aan) return null
  return (
    <Button type="button" variant="outline" className="gap-2">
      <KeyRound className="w-4 h-4" />
      {label}
    </Button>
  )
}

export function relatieveTijd(iso: string, nu: number = Date.now()): string {
  const verschil = Math.max(0, nu - new Date(iso).getTime())
  const min = Math.floor(verschil / 60_000)
  if (min < 1) return 'zojuist'
  if (min < 60) return `${min} min geleden`
  const uur = Math.floor(min / 60)
  if (uur < 24) return `${uur} uur geleden`
  const dag = Math.floor(uur / 24)
  if (dag === 1) return 'gisteren'
  if (dag < 7) return `${dag} dagen geleden`
  return `op ${new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}`
}

function MailboxGezondheidKaart({ settings, isConnected }: { settings: EmailSettings; isConnected: boolean }) {
  const sync = useSyncStatus()
  const verzondenNaarServer = useFunctie('mail_verzonden_naar_server')
  const [herstelt, setHerstelt] = useState(false)

  const opnieuwVerbinden = async () => {
    setHerstelt(true)
    try {
      const { saveEmailSettingsToDb, loadEmailSettingsFromDb } = await import('@/services/gmailService')
      // De banner toont de slechtste stand van álle postvakken, dus herstel het
      // postvak dat die stand veroorzaakt en niet blind het standaardpostvak.
      // Anders meldt de kaart postvak 2 en repareert de knop postvak 1.
      const doelPostvak = sync.postvakId || null
      // Alles uit één bron: adres, hosts en poorten horen bij hetzelfde postvak
      // als het account_id. Ze mengen zou de rij van postvak 2 het adres van
      // postvak 1 geven, en dan dragen beide postvakken hetzelfde adres.
      // Lukt het ophalen niet, dan liever niets doen dan half.
      const geladen = doelPostvak ? await loadEmailSettingsFromDb(doelPostvak).catch(() => null) : null
      const doel = doelPostvak
        ? geladen
        : {
          gmail_address: settings.gmail_address,
          account_id: undefined as string | undefined,
          auth_type: undefined as import('@/services/gmailService').MailAuthType | undefined,
          has_password: settings.has_password,
          smtp_host: settings.smtp_host,
          smtp_port: settings.smtp_port,
          imap_host: settings.imap_host,
          imap_port: settings.imap_port,
        }
      if (!doel || !doel.gmail_address) {
        toast.error('De gegevens van dit postvak zijn nu niet op te halen. Probeer het zo opnieuw.')
        return
      }
      // De wachtwoordeis geldt voor het postvak dat we herstellen, niet voor het
      // postvak dat toevallig in het formulier staat.
      const heeftWachtwoord = doel.has_password
      const viaOauth = doel.auth_type === 'google' || doel.auth_type === 'microsoft'
      if (!heeftWachtwoord && !viaOauth) {
        toast.error('Vul hieronder eerst je wachtwoord in en sla op')
        return
      }
      await saveEmailSettingsToDb({
        gmail_address: doel.gmail_address,
        account_id: doel.account_id ?? doelPostvak ?? undefined,
        app_password: '',
        auth_type: doel.auth_type,
        smtp_host: doel.smtp_host,
        smtp_port: doel.smtp_port,
        imap_host: doel.imap_host,
        imap_port: doel.imap_port,
      })
      await mailStore.laadSyncStatus()
      const naam = doel.gmail_address !== settings.gmail_address ? ` (${doel.gmail_address})` : ''
      toast.success(<>Opnieuw verbonden{naam}<span style={{ color: '#F15025' }}>.</span> De volgende synchronisatie start direct.</>)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Opnieuw verbinden mislukt')
    } finally {
      setHerstelt(false)
    }
  }

  const laatst = sync.laatsteSucces ? relatieveTijd(sync.laatsteSucces) : null
  const toon = !isConnected
    ? { kleur: 'neutraal' as const, kop: 'Nog geen mailbox gekoppeld', regel: 'Kies hieronder hoe je koppelt. Daarna lees en verstuur je mail vanuit doen.' }
    : sync.status === 'uitgezet'
      ? { kleur: 'rood' as const, kop: 'Synchronisatie uitgezet', regel: sync.laatsteFout || 'De mailserver weigerde te vaak. Controleer je wachtwoord en verbind opnieuw.' }
      : sync.status === 'fout'
        ? { kleur: 'oranje' as const, kop: 'Synchronisatie hapert', regel: `${sync.laatsteFout || 'Onbekende fout'}${laatst ? ` · laatst gelukt ${laatst}` : ''}` }
        // 'onbekend' betekent dat de gezondheid niet op te halen was. Groen
        // tonen zou "alles goed" beweren zonder dat iemand dat weet.
        : sync.status === 'onbekend'
          ? { kleur: 'neutraal' as const, kop: 'Status onbekend', regel: `De gezondheid van de koppeling is nu niet op te halen${laatst ? ` · laatst gelukt ${laatst}` : ''}.` }
          : laatst
            ? { kleur: 'groen' as const, kop: `Gesynchroniseerd · laatst ${laatst}`, regel: 'Nieuwe mail komt binnen zonder dat je iets hoeft te doen.' }
            : { kleur: 'neutraal' as const, kop: 'Gekoppeld · eerste synchronisatie loopt', regel: 'De eerste ronde haalt je inbox op. Dat duurt een paar minuten.' }

  const stijl = {
    groen: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
    oranje: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
    rood: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
    neutraal: 'bg-muted/40 border-border text-foreground/80',
  }[toon.kleur]
  const Icoon = toon.kleur === 'groen' ? CheckCircle2 : toon.kleur === 'neutraal' ? Info : AlertTriangle

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className={`flex items-start gap-3 rounded-lg border p-3 ${stijl}`}>
          <Icoon className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">{toon.kop}</div>
            <p className="text-xs mt-0.5 opacity-90 break-words">{toon.regel}</p>
          </div>
          {(toon.kleur === 'oranje' || toon.kleur === 'rood') && (
            <Button size="sm" variant="outline" onClick={opnieuwVerbinden} disabled={herstelt} className="gap-1.5 shrink-0 bg-background">
              <RefreshCw className={`w-3.5 h-3.5 ${herstelt ? 'animate-spin' : ''}`} />
              {herstelt ? 'Bezig' : 'Opnieuw verbinden'}
            </Button>
          )}
        </div>
        {isConnected && (
          <p className="text-xs text-muted-foreground px-1">
            {verzondenNaarServer
              ? 'Wat je via doen. verstuurt komt ook in je Verzonden-map. '
              : 'Wat je via doen. verstuurt blijft nu alleen in doen.; de Verzonden-map van je mailbox krijgt geen kopie. '}
            <Link to="/instellingen?tab=functies#functie-mail_verzonden_naar_server" className="font-medium text-petrol hover:underline">
              Schakelaar: Verzonden mail ook in je mailbox
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  )
}


/**
 * De gekoppelde postvakken, met hernoemen, standaard maken en ontkoppelen.
 *
 * De lijst verschijnt pas als de kolommen uit migratie 245 leesbaar zijn of er
 * meer dan één postvak is. Daarvoor is er per definitie één mailbox en zou een
 * lijst van één regel alleen maar ruis boven het formulier zijn.
 */
function PostvakkenLijst({
  postvakken,
  laden,
  onVernieuw,
  onToevoegen,
  toevoegenOpen,
  onOntkoppel,
}: {
  postvakken: Postvak[]
  laden: boolean
  onVernieuw: () => void
  onToevoegen: () => void
  toevoegenOpen: boolean
  onOntkoppel: (postvak: Postvak) => Promise<void>
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Postvakken
        </CardTitle>
        <CardDescription>
          {postvakken.length === 1
            ? 'Eén mailbox gekoppeld. Voeg er een tweede toe als je bijvoorbeeld ook studio@ leest.'
            : `${postvakken.length} mailboxen gekoppeld. De kiezer boven je mappen laat je wisselen.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {laden && postvakken.length === 0 ? (
          <Skeleton className="h-12 w-full" />
        ) : (
          postvakken.map((p) => (
            <PostvakRij key={p.id} postvak={p} enige={postvakken.length === 1} onVernieuw={onVernieuw} onOntkoppel={onOntkoppel} />
          ))
        )}
        <div className="pt-3">
          <button
            type="button"
            onClick={onToevoegen}
            className="text-sm font-medium text-flame hover:text-flame/80 transition-colors"
          >
            {toevoegenOpen ? 'Bezig met toevoegen…' : 'Postvak toevoegen'}
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

function PostvakRij({
  postvak,
  enige,
  onVernieuw,
  onOntkoppel,
}: {
  postvak: Postvak
  enige: boolean
  onVernieuw: () => void
  onOntkoppel: (postvak: Postvak) => Promise<void>
}) {
  const [naam, setNaam] = useState(postvak.naam)
  const [hernoemt, setHernoemt] = useState(false)
  const [vraagtOntkoppel, setVraagtOntkoppel] = useState(false)
  const [bezig, setBezig] = useState(false)

  const bewaarNaam = async () => {
    const schoon = naam.trim()
    if (!schoon || schoon === postvak.naam) { setHernoemt(false); setNaam(postvak.naam); return }
    setBezig(true)
    try {
      await hernoem(postvak.id, schoon)
      setHernoemt(false)
      onVernieuw()
      toast.success(<>Hernoemd<span style={{ color: '#F15025' }}>.</span></>)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Hernoemen mislukt')
      setNaam(postvak.naam)
    } finally {
      setBezig(false)
    }
  }

  const maakStandaard = async () => {
    setBezig(true)
    try {
      await zetStandaard(postvak.id)
      onVernieuw()
      toast.success(<>Standaard postvak gewijzigd<span style={{ color: '#F15025' }}>.</span></>)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Standaard instellen mislukt')
    } finally {
      setBezig(false)
    }
  }

  const ontkoppel = async () => {
    setBezig(true)
    try {
      await onOntkoppel(postvak)
      setVraagtOntkoppel(false)
    } finally {
      setBezig(false)
    }
  }

  return (
    <div className="rounded-lg px-3 py-3 -mx-3 hover:bg-background transition-colors">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {hernoemt ? (
            <div className="flex items-center gap-2">
              <Input
                value={naam}
                autoFocus
                maxLength={60}
                onChange={(e) => setNaam(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void bewaarNaam()
                  if (e.key === 'Escape') { setHernoemt(false); setNaam(postvak.naam) }
                }}
                className="h-8 max-w-[260px]"
              />
              <Button size="sm" variant="outline" onClick={() => void bewaarNaam()} disabled={bezig}>Bewaren</Button>
              <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => { setHernoemt(false); setNaam(postvak.naam) }}>
                Annuleren
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm font-semibold text-foreground">{postvak.naam}</span>
              {postvak.isStandaard && (
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  standaard<span style={{ color: '#F15025' }}>.</span>
                </span>
              )}
              {postvak.soort === 'gedeeld' && (
                <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <Users className="w-3 h-3" />
                  gedeeld
                </span>
              )}
            </div>
          )}
          {postvak.adres && postvak.adres !== postvak.naam && !hernoemt && (
            <p className="mt-0.5 text-xs font-mono text-muted-foreground break-all">{postvak.adres}</p>
          )}
        </div>
        {!hernoemt && !vraagtOntkoppel && (
          <div className="flex items-center gap-3 shrink-0 text-xs">
            <button type="button" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground" onClick={() => setHernoemt(true)}>
              <Pencil className="w-3 h-3" />
              Hernoemen
            </button>
            {!postvak.isStandaard && (
              <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => void maakStandaard()} disabled={bezig}>
                Als standaard
              </button>
            )}
            <button type="button" className="text-flame hover:text-flame/80" onClick={() => setVraagtOntkoppel(true)}>
              Ontkoppelen
            </button>
          </div>
        )}
      </div>
      {vraagtOntkoppel && (
        <div className="mt-3 rounded-lg border border-border bg-background p-3">
          <p className="text-xs text-foreground/80">
            {enige
              ? 'Ontkoppelen haalt de koppeling en het wachtwoord weg. Je mail blijft in doen. staan; er komt alleen niets nieuws meer binnen.'
              : 'Ontkoppelen haalt de koppeling en het wachtwoord van dit postvak weg. De mail van dit postvak blijft in doen. staan.'}
          </p>
          <div className="mt-2.5 flex items-center gap-3">
            <Button size="sm" variant="outline" className="text-flame border-flame/40 hover:bg-flame/5" onClick={() => void ontkoppel()} disabled={bezig}>
              {bezig ? 'Bezig…' : 'Ontkoppelen'}
            </Button>
            <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setVraagtOntkoppel(false)}>
              Annuleren
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const STANDAARD_TEMPLATES = [
  { naam: 'Offerte + tekening', onderwerp: 'Offerte + tekening [projectnaam]', body: 'Beste [naam],\n\nBedankt voor je aanvraag. Hierbij de offerte en tekening voor [projectnaam].\n\nKijk het op je gemak door. Mocht je vragen hebben of willen aanpassen, laat het gerust weten.\n\nHoor graag van je!' },
  { naam: 'Offerte opvolging', onderwerp: 'Even checken: offerte [projectnaam]', body: 'Hoi [naam],\n\nIk wilde even checken of je de offerte voor [projectnaam] hebt kunnen bekijken.\n\nHeb je nog vragen, of kan ik ergens bij helpen? Laat het gerust weten, dan plan ik het in.\n\nGroet!' },
  { naam: 'Project update', onderwerp: 'Update [projectnaam]', body: 'Hoi [naam],\n\nEen korte update over [projectnaam]:\n\n- [punt 1]\n- [punt 2]\n\nVolgende stap is [stap 1]. Verwacht dat dit rond [datum] klaar is.\n\nVragen? Laat het weten!' },
  { naam: 'Bedankt voor opdracht', onderwerp: 'Bedankt voor de opdracht!', body: 'Hoi [naam],\n\nTop, bedankt voor de opdracht! We gaan ermee aan de slag.\n\nDe planning ziet er als volgt uit:\n- Productie: [datum]\n- Montage: [datum]\n\nIk hou je op de hoogte. Mocht je in de tussentijd nog iets hebben, je weet me te vinden.' },
  { naam: 'Betaalherinnering', onderwerp: 'Herinnering factuur [nummer]', body: 'Hoi [naam],\n\nKleine herinnering, we zien dat de volgende factuur nog openstaat:\n\nFactuurnummer: [nummer]\nBedrag: [bedrag]\nVervaldatum: [vervaldatum]\n\nKan gebeuren natuurlijk. Zou je ernaar willen kijken? Bij vragen hoor ik het graag.' },
  { naam: 'Montage inplannen', onderwerp: 'Montage inplannen [projectnaam]', body: 'Hoi [naam],\n\nGoed nieuws: [projectnaam] is klaar voor montage!\n\nWe willen graag een datum inplannen. Wanneer zou het uitkomen? Dan stemmen we dat af met ons team.\n\nLaat het even weten!' },
]

function EmailTemplatesBeheerTab() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [editNaam, setEditNaam] = useState('')
  const [editOnderwerp, setEditOnderwerp] = useState('')
  const [editBody, setEditBody] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showNew, setShowNew] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        // Systeem-templates horen bij de automatische mails en worden op hun
        // eigen plek beheerd (Communicatie > Templates). Stonden ze hier ook,
        // dan telde de seed-check ze mee en kwamen de standaard-templates bij
        // een bestaande organisatie nooit meer binnen.
        let dbTemplates = (await getEmailTemplates()).filter((t) => !t.is_systeem)
        // Seed standaard templates als de gebruiker er nog geen heeft
        if (dbTemplates.length === 0) {
          const seeded: EmailTemplate[] = []
          for (const tmpl of STANDAARD_TEMPLATES) {
            try {
              const created = await createEmailTemplate(tmpl)
              seeded.push(created)
            } catch { /* negeer individuele seed-fouten */ }
          }
          dbTemplates = seeded
        }
        setTemplates(dbTemplates)
      } catch { /* negeer */ }
      setIsLoading(false)
    }
    load()
  }, [])

  const startEdit = (t: EmailTemplate) => {
    setEditId(t.id)
    setEditNaam(t.naam)
    setEditOnderwerp(t.onderwerp)
    setEditBody(t.body)
    setShowNew(false)
  }

  const startNew = () => {
    setEditId(null)
    setEditNaam('')
    setEditOnderwerp('')
    setEditBody('')
    setShowNew(true)
  }

  const handleSave = async () => {
    if (!editNaam.trim()) { toast.error('Vul een naam in'); return }
    setIsSaving(true)
    try {
      if (editId) {
        await updateEmailTemplate(editId, { naam: editNaam, onderwerp: editOnderwerp, body: editBody })
        setTemplates(prev => prev.map(t => t.id === editId ? { ...t, naam: editNaam, onderwerp: editOnderwerp, body: editBody } : t))
        toast.success('Template bijgewerkt')
      } else {
        const created = await createEmailTemplate({ naam: editNaam, onderwerp: editOnderwerp, body: editBody })
        setTemplates(prev => [...prev, created])
        toast.success('Template aangemaakt')
      }
      setEditId(null)
      setShowNew(false)
    } catch {
      toast.error('Opslaan mislukt')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteEmailTemplate(id)
      setTemplates(prev => prev.filter(t => t.id !== id))
      if (editId === id) { setEditId(null); setShowNew(false) }
      toast.success(<>Template verwijderd<span style={{ color: '#F15025' }}>.</span></>)
    } catch {
      toast.error('Verwijderen mislukt')
    }
  }

  if (isLoading) return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent className="space-y-2">
        {[0, 1, 2].map(i => (
          <Skeleton key={i} className="h-[60px] w-full rounded-lg" />
        ))}
      </CardContent>
    </Card>
  )

  const isEditing = editId || showNew

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email Templates
              </CardTitle>
              <CardDescription>
                Maak en beheer herbruikbare email templates voor je team
              </CardDescription>
            </div>
            {!isEditing && (
              <Button onClick={startNew} size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />
                Nieuw template
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 && !showNew && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Nog geen templates aangemaakt</p>
              <p className="text-xs mt-1">Klik op "Nieuw template" om te beginnen</p>
            </div>
          )}

          {!isEditing && templates.length > 0 && (
            <div className="space-y-2">
              {templates.map(t => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors group"
                >
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => startEdit(t)}>
                    <p className="text-sm font-medium truncate">{t.naam}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.onderwerp || '(geen onderwerp)'}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => startEdit(t)}>
                      <FileText className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive" onClick={() => handleDelete(t.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isEditing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Naam</Label>
                <Input
                  value={editNaam}
                  onChange={e => setEditNaam(e.target.value)}
                  placeholder="Bijv. Offerte + tekening"
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Onderwerp</Label>
                <Input
                  value={editOnderwerp}
                  onChange={e => setEditOnderwerp(e.target.value)}
                  placeholder="Bijv. Offerte [projectnaam]"
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Inhoud</Label>
                <Textarea
                  value={editBody}
                  onChange={e => setEditBody(e.target.value)}
                  placeholder="Schrijf je template tekst..."
                  rows={8}
                  className="text-sm"
                />
              </div>
              <div className="rounded-md border bg-muted/50 px-3 py-2">
                <p className="text-[10px] font-medium text-muted-foreground mb-1">Beschikbare velden:</p>
                <div className="flex flex-wrap gap-1">
                  {['[naam]', '[bedrijf]', '[datum]', '[projectnaam]', '[offerte_nummer]'].map(v => (
                    <code key={v} className="rounded bg-background px-1.5 py-0.5 text-[10px] font-mono border">{v}</code>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => { setEditId(null); setShowNew(false) }}>
                  Annuleren
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1.5">
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'Opslaan...' : 'Opslaan'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SignaturePreview({
  naam,
  handtekening,
  afbeelding,
  afbeeldingGrootte,
}: {
  naam: string
  handtekening: string
  afbeelding: string
  afbeeldingGrootte?: number
}) {
  if (!handtekening && !afbeelding) return null
  const imgSize = handtekeningBreedte(afbeeldingGrootte)
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-label text-muted-foreground">Voorbeeld</Label>
      <div className="border border-border rounded-lg p-4 bg-card space-y-3">
        <div className="border-t border-muted pt-3">
          {afbeelding && (
            <img
              src={afbeelding}
              alt="Logo"
              style={{ maxWidth: `${imgSize}px`, maxHeight: `${imgSize}px` }}
              className="object-contain mb-2"
            />
          )}
          <div
            className="text-sm text-foreground/80 [&_a]:text-petrol [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5"
            dangerouslySetInnerHTML={{
              __html: handtekeningNaarHtml(handtekening || `Met vriendelijke groet,\n\n${naam}`),
            }}
          />
        </div>
      </div>
    </div>
  )
}

export function EmailTab() {
  const { user, isAdmin, session } = useAuth()
  const { refreshSettings, refreshProfile, profile, emailFetchLimit: currentFetchLimit } = useAppSettings()
  const initialSub = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('sub') || 'verbinding' : 'verbinding'
  const [subTab, setSubTab] = useState(initialSub)
  // Migratie 248 zet meerdere handtekeningen aan. Zonder die migratie blijft
  // alles zoals het was: één handtekening op het profiel.
  // null = nog onbekend. Bewust drie standen: bij `false` verschijnt de oude
  // handtekening-editor en mag "toepassen op iedereen", en dat mag geen van
  // beide gebeuren zolang we het antwoord niet hebben.
  const [meerHandtekeningen, setMeerHandtekeningen] = useState<boolean | null>(null)
  useEffect(() => {
    let actueel = true
    handtekeningenBeschikbaar()
      .then((ja) => { if (actueel) setMeerHandtekeningen(ja) })
      .catch(() => {})
    return () => { actueel = false }
  }, [])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [emailHandtekening, setEmailHandtekening] = useState('')
  const [afzenderNaam, setAfzenderNaam] = useState('')
  const [handtekeningAfbeelding, setHandtekeningAfbeelding] = useState('')
  const [afbeeldingGrootte, setAfbeeldingGrootte] = useState(HANDTEKENING_BREEDTE_STANDAARD)
  const [afbeeldingLink, setAfbeeldingLink] = useState('')
  const [emailFetchLimit, setEmailFetchLimit] = useState(currentFetchLimit || 200)
  const [backfillTarget, setBackfillTargetState] = useState<BackfillTarget>('1jaar')
  useEffect(() => {
    getBackfillTarget().then(setBackfillTargetState).catch(() => { /* default blijft staan */ })
  }, [])

  // Team signatures (admin only)
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>([])
  const [teamLoading, setTeamLoading] = useState(false)
  const [savingMwId, setSavingMwId] = useState<string | null>(null)
  const [teamEdits, setTeamEdits] = useState<Record<string, { handtekening: string; afbeelding: string }>>({})

  const loadSettings = useCallback(async () => {
    if (!user?.id) return
    try {
      setIsLoading(true)
      // Handtekening + afzender_naam staan op profiles (migratie 091).
      // Fallback op app_settings voor profiles die nog geen waarde hebben.
      const userProfile = await getProfile(user.id)
      const data = await getAppSettings(user.id)
      setEmailHandtekening((userProfile?.email_handtekening?.trim() ? userProfile.email_handtekening : null) || data.email_handtekening || '')
      setAfzenderNaam((userProfile?.afzender_naam?.trim() ? userProfile.afzender_naam : null) || data.afzender_naam || '')
      setHandtekeningAfbeelding(userProfile?.handtekening_afbeelding || data.handtekening_afbeelding || '')
      setAfbeeldingGrootte(userProfile?.handtekening_afbeelding_grootte || data.handtekening_afbeelding_grootte || HANDTEKENING_BREEDTE_STANDAARD)
      setAfbeeldingLink(userProfile?.handtekening_afbeelding_link || data.handtekening_afbeelding_link || '')
    } catch (err) {
      logger.error('Fout bij laden e-mailinstellingen:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const loadTeam = useCallback(async () => {
    try {
      setTeamLoading(true)
      const data = await getMedewerkers()
      const actief = data.filter(m => m.status === 'actief')
      setMedewerkers(actief)

      // Handtekeningen staan op profiles, niet op medewerkers. Teamleden zonder
      // gekoppeld account hebben er dus geen.
      const userIds = actief.map(m => m.user_id).filter((id): id is string => !!id)
      const profielen = userIds.length > 0 ? await getProfielenVoorTeam(userIds) : []
      const perUser = new Map(profielen.map(p => [p.id, p]))

      const edits: Record<string, { handtekening: string; afbeelding: string }> = {}
      actief.forEach(m => {
        const p = m.user_id ? perUser.get(m.user_id) : undefined
        edits[m.id] = {
          handtekening: p?.email_handtekening || '',
          afbeelding: p?.handtekening_afbeelding || '',
        }
      })
      setTeamEdits(edits)
    } catch (err) {
      logger.error('Fout bij laden teamleden:', err)
    } finally {
      setTeamLoading(false)
    }
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])
  useEffect(() => { if (subTab === 'teamleden') loadTeam() }, [subTab, loadTeam])

  const handleSave = async () => {
    if (!user?.id) return
    try {
      setIsSaving(true)
      // updateAppSettings sluist per-user velden (handtekening, afzender_naam)
      // automatisch door naar updateProfile. Daarna profile + settings refreshen.
      // Zodra het handtekeningbeheer leidt, schrijft dat de standaard naar het
      // profiel. Deze knop stuurde dan de waarde mee die bij het openen van de
      // pagina geladen was en draaide die spiegeling stil terug: je offertes en
      // facturen vielen terug op je vorige handtekening. Alleen de velden
      // meesturen die deze knop ook echt beheert.
      await updateAppSettings(user.id, {
        afzender_naam: afzenderNaam,
        ...(meerHandtekeningen ? {} : {
          email_handtekening: emailHandtekening,
          handtekening_afbeelding: handtekeningAfbeelding,
          handtekening_afbeelding_grootte: afbeeldingGrootte,
          handtekening_afbeelding_link: afbeeldingLink.trim(),
        }),
      })
      await Promise.all([refreshProfile(), refreshSettings()])
      toast.success(<>Opgeslagen<span style={{ color: '#F15025' }}>.</span></>)
    } catch (err) {
      logger.error('Fout bij opslaan e-mailinstellingen:', err)
      toast.error('Kon e-mailinstellingen niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }

  const bewaarHandtekeningen = async (acties: { user_id: string; email_handtekening: string; handtekening_afbeelding: string }[]) => {
    if (!session?.access_token) throw new Error('Niet ingelogd')
    const res = await fetch('/api/team-handtekening', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ acties }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Opslaan mislukt')
    return data as { bijgewerkt: number; overgeslagen: number }
  }

  const handleSaveTeamMember = async (mw: Medewerker) => {
    const edits = teamEdits[mw.id]
    if (!edits) return
    if (!mw.user_id) {
      toast.error(`${mw.naam} heeft nog geen account, dus geen eigen handtekening`)
      return
    }
    try {
      setSavingMwId(mw.id)
      await bewaarHandtekeningen([{
        user_id: mw.user_id,
        email_handtekening: edits.handtekening,
        handtekening_afbeelding: edits.afbeelding,
      }])
      toast.success(`Handtekening van ${mw.naam} opgeslagen`)
    } catch (err) {
      logger.error('Fout bij opslaan teamlid handtekening:', err)
      toast.error(err instanceof Error ? err.message : `Kon handtekening van ${mw.naam} niet opslaan`)
    } finally {
      setSavingMwId(null)
    }
  }

  const handleApplyToAll = async () => {
    // Met meerdere handtekeningen (migratie 248) schrijft dit de handtekening
    // van elk teamlid over, óók de standaard die hij zelf heeft ingesteld en
    // waarmee zijn offertes en facturen ondertekenen. Dat is niet wat "toepassen
    // op iedereen" belooft, dus dan liever helemaal niet.
    // Alleen doorgaan als we zéker weten dat het beheer niet aanstaat. Bij een
    // netwerkhikje blijft de vlag op null, en dan zou dit het profiel van elk
    // teamlid overschrijven terwijl hun eigen handtekeningen blijven staan.
    if (meerHandtekeningen !== false) {
      toast.error(meerHandtekeningen
        ? 'Iedereen beheert nu zijn eigen handtekeningen. Vraag je collega om er een over te nemen.'
        : 'Even wachten, de handtekeningen worden nog geladen.')
      return
    }
    if (!emailHandtekening && !handtekeningAfbeelding) {
      toast.error('Stel eerst je eigen handtekening in')
      return
    }
    const count = medewerkers.length
    if (count === 0) {
      toast.error('Geen actieve teamleden gevonden')
      return
    }
    const metAccount = medewerkers.filter(m => !!m.user_id)
    if (metAccount.length === 0) {
      toast.error('Geen teamleden met een gekoppeld account')
      return
    }
    try {
      setIsSaving(true)
      const resultaat = await bewaarHandtekeningen(metAccount.map(mw => ({
        user_id: mw.user_id as string,
        // Personaliseer: vervang eigen naam door teamlid naam
        email_handtekening: afzenderNaam
          ? emailHandtekening.replace(afzenderNaam, mw.naam)
          : emailHandtekening,
        handtekening_afbeelding: handtekeningAfbeelding,
      })))
      await loadTeam()
      const zonderAccount = count - metAccount.length
      toast.success(
        zonderAccount > 0
          ? `Handtekening toegepast op ${resultaat.bijgewerkt} teamleden · ${zonderAccount} zonder account overgeslagen`
          : `Handtekening toegepast op ${resultaat.bijgewerkt} teamleden`
      )
    } catch (err) {
      logger.error('Fout bij toepassen op team:', err)
      toast.error(err instanceof Error ? err.message : 'Kon handtekening niet op alle teamleden toepassen')
    } finally {
      setIsSaving(false)
    }
  }

  // Email connection settings · lifted to EmailTab so they survive sub-tab switches
  const [emailSettings, setEmailSettings] = useState<EmailSettings>(DEFAULT_EMAIL_SETTINGS)
  const [emailConnected, setEmailConnected] = useState(false)

  // Postvakken · lijst boven het formulier. `nieuwPostvak` zet het formulier in
  // de stand "nieuw": een leeg formulier dat een extra rij aanmaakt in plaats
  // van de bestaande bij te werken.
  const [postvakken, setPostvakken] = useState<Postvak[]>([])
  const [postvakkenLaden, setPostvakkenLaden] = useState(true)
  const [nieuwPostvak, setNieuwPostvak] = useState<EmailSettings | null>(null)

  const laadPostvakken = useCallback(async () => {
    setPostvakkenLaden(true)
    try {
      setPostvakken(await getPostvakken())
    } catch {
      setPostvakken([])
    } finally {
      setPostvakkenLaden(false)
    }
    void mailStore.laadPostvakken(true)
  }, [])

  useEffect(() => { void laadPostvakken() }, [laadPostvakken])

  const toonPostvakkenLijst = emailConnected && (postvakken.length > 1 || postvakkenUitgebreid())
  // Het postvak waar het formulier bij hoort: de rij waarvan de server de
  // instellingen teruggaf. Zonder treffer blijft het leeg en werkt opslaan als
  // vanouds op de enige rij van deze gebruiker.
  const bewerktAccountId = postvakken.find((p) => p.adres && p.adres === emailSettings.gmail_address)?.id

  const checkEmailStatus = useCallback(() => {
    setEmailConnected(!!emailSettings.gmail_address && (!!emailSettings.has_password || !!emailSettings.app_password))
  }, [emailSettings])

  // Load email settings from Supabase (or sessionStorage cache) on mount
  useEffect(() => {
    async function loadEmailSettings() {
      // 1. Try sessionStorage cache first (fast). Het wachtwoord staat hier NIET
      // meer in; has_password markeert dat er een wachtwoord bekend is.
      try {
        const cached = sessionStorage.getItem('doen_email_settings')
        if (cached) {
          const parsed = JSON.parse(cached)
          if (parsed.gmail_address) {
            setEmailSettings(prev => ({ ...prev, ...parsed, app_password: '' }))
            setEmailConnected(!!parsed.has_password)
          }
        }
      } catch (err) { /* ignore */ }

      // 2. Load from API endpoint (source of truth, handles decryption server-side)
      try {
        const { loadEmailSettingsFromDb } = await import('@/services/gmailService')
        const dbSettings = await loadEmailSettingsFromDb()
        if (dbSettings?.gmail_address) {
          const merged = {
            ...DEFAULT_EMAIL_SETTINGS,
            ...dbSettings,
            smtp_encryption: 'TLS' as const,
            accept_self_signed: false,
          }
          setEmailSettings(merged)
          setEmailConnected(!!merged.has_password)
          // Update cache · nooit het wachtwoord meecachen.
          sessionStorage.setItem('doen_email_settings', JSON.stringify({ ...merged, app_password: '' }))
        }
      } catch (err) {
        console.error('Email settings laden mislukt:', err)
      }
    }
    loadEmailSettings()
  }, [])

  useEffect(() => { checkEmailStatus() }, [checkEmailStatus])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground dark:text-muted-foreground/60">
          E-mailinstellingen laden...
        </CardContent>
      </Card>
    )
  }

  const saveButton = (
    <div className="flex justify-end mt-6">
      <Button onClick={handleSave} disabled={isSaving} className="gap-2">
        <Save className="w-4 h-4" />
        {isSaving ? 'Opslaan...' : 'Opslaan'}
      </Button>
    </div>
  )

  return (
    <>
      <SubTabNav tabs={EMAIL_TABS} active={subTab} onChange={setSubTab} variant="underline" />

      {subTab === 'handtekening' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                E-mail Handtekening
              </CardTitle>
              <CardDescription>Wordt automatisch toegevoegd aan uitgaande e-mails</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="afzender-naam">Standaard afzendernaam</Label>
                <Input
                  id="afzender-naam"
                  value={afzenderNaam}
                  onChange={(e) => setAfzenderNaam(e.target.value)}
                  placeholder="Bijv. Jan de Vries - Sign Company B.V."
                />
                <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">
                  De naam die ontvangers zien als afzender
                </p>
              </div>

              {/* Zodra migratie 248 gedraaid is beheer je de handtekeningen
                  in de kaart hieronder. Deze velden blijven staan zolang dat
                  niet zo is; twee plekken die hetzelfde bewerken zou betekenen
                  dat je nooit weet welke wint. */}
              {meerHandtekeningen === false && (
                <>
                  <SignatureImageUpload
                    imageUrl={handtekeningAfbeelding}
                    onImageChange={setHandtekeningAfbeelding}
                    imageSize={afbeeldingGrootte}
                    onImageSizeChange={setAfbeeldingGrootte}
                    imageLink={afbeeldingLink}
                    onImageLinkChange={setAfbeeldingLink}
                  />

                  <div className="space-y-2">
                    <Label>Handtekening</Label>
                    <HandtekeningEditor
                      waarde={emailHandtekening}
                      onChange={setEmailHandtekening}
                    />
                  </div>

                  <SignaturePreview
                    naam={afzenderNaam}
                    handtekening={emailHandtekening}
                    afbeelding={handtekeningAfbeelding}
                    afbeeldingGrootte={afbeeldingGrootte}
                  />
                </>
              )}
            </CardContent>
          </Card>

          {meerHandtekeningen === true && <HandtekeningenBeheer />}

          {saveButton}
        </div>
      )}

      {subTab === 'templates' && <EmailTemplatesBeheerTab />}

      {subTab === 'regels' && <MailRegelsKaart />}

      {subTab === 'teamleden' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team Handtekeningen
              </CardTitle>
              <CardDescription>
                Beheer de e-mail handtekeningen van alle teamleden vanuit één plek
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isAdmin && medewerkers.length > 0 && (
                <div className="flex items-center justify-between p-3 mb-6 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary" />
                    <span className="text-sm">Pas jouw handtekening toe op alle teamleden (met naam gepersonaliseerd)</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleApplyToAll} disabled={isSaving}>
                    {isSaving ? 'Toepassen...' : 'Toepassen op iedereen'}
                  </Button>
                </div>
              )}

              {teamLoading ? (
                <p className="text-center text-muted-foreground py-8">Teamleden laden...</p>
              ) : medewerkers.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <Users className="w-8 h-8 mx-auto text-muted-foreground/40" />
                  <p className="text-muted-foreground">Geen actieve teamleden gevonden</p>
                  <p className="text-xs text-muted-foreground/60">Voeg teamleden toe via Teamleden in het menu</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {medewerkers.map((mw) => {
                    const edits = teamEdits[mw.id] || { handtekening: '', afbeelding: '' }
                    return (
                      <Card key={mw.id} className="border-muted">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            {/* Avatar / info */}
                            <div className="flex-shrink-0">
                              {mw.avatar_url ? (
                                <img src={mw.avatar_url} alt={mw.naam} className="w-10 h-10 rounded-full object-cover" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                  <UserCircle className="w-5 h-5 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 space-y-3">
                              <div>
                                <p className="font-medium text-sm">{mw.naam}</p>
                                <p className="text-xs text-muted-foreground">{mw.functie || mw.rol} · {mw.email}</p>
                              </div>

                              <SignatureImageUpload
                                imageUrl={edits.afbeelding}
                                onImageChange={(url) => setTeamEdits(prev => ({
                                  ...prev,
                                  [mw.id]: { ...prev[mw.id], afbeelding: url },
                                }))}
                                label="Handtekening afbeelding"
                              />

                              <div className="space-y-1">
                                <Label className="text-xs">Handtekening tekst</Label>
                                <Textarea
                                  value={edits.handtekening}
                                  onChange={(e) => setTeamEdits(prev => ({
                                    ...prev,
                                    [mw.id]: { ...prev[mw.id], handtekening: e.target.value },
                                  }))}
                                  placeholder={`Met vriendelijke groet,\n\n${mw.naam}\n${mw.functie || ''}`}
                                  rows={4}
                                />
                              </div>

                              <SignaturePreview
                                naam={mw.naam}
                                handtekening={edits.handtekening}
                                afbeelding={edits.afbeelding}
                              />

                              <div className="flex justify-end">
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveTeamMember(mw)}
                                  disabled={savingMwId === mw.id}
                                  className="gap-1.5"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  {savingMwId === mw.id ? 'Opslaan...' : 'Opslaan'}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {subTab === 'verbinding' && (
        <div className="space-y-6">
          <MailboxGezondheidKaart settings={emailSettings} isConnected={emailConnected} />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                E-mail Verbinding
              </CardTitle>
              <CardDescription>
                {emailConnected
                  ? `Gekoppeld als ${emailSettings.gmail_address}`
                  : 'Koppel je mailbox om e-mail te lezen en te versturen vanuit doen.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg border border-border dark:border-border bg-background dark:bg-muted/30">
                <div className="flex items-start gap-2">
                  <UserCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">Afzender-naam in verzonden e-mails</div>
                    <div className="mt-1.5 text-sm font-mono text-foreground/70 dark:text-muted-foreground break-all">
                      {profile?.bedrijfsnaam
                        ? <>&quot;{profile.bedrijfsnaam}&quot; &lt;{emailSettings.gmail_address || 'je@email'}&gt;</>
                        : <span className="italic">Nog niet ingesteld. Ontvangers zien alleen je e-mailadres.</span>
                      }
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Dit is wat ontvangers zien als afzender. De naam komt uit <span className="font-medium">Instellingen → Bedrijf → Bedrijfsnaam</span>. Gebruik daar je bedrijfsnaam, geen persoonsnaam.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          {toonPostvakkenLijst && (
            <PostvakkenLijst
              postvakken={postvakken}
              laden={postvakkenLaden}
              onVernieuw={() => void laadPostvakken()}
              toevoegenOpen={!!nieuwPostvak}
              onToevoegen={() => setNieuwPostvak({ ...DEFAULT_EMAIL_SETTINGS })}
              onOntkoppel={async (postvak) => {
                try {
                  await ontkoppelPostvak(postvak.id)
                  // De cache en het formulier horen bij het postvak dat de
                  // server teruggaf; alleen dát postvak leegt hier mee.
                  if (postvak.adres === emailSettings.gmail_address) {
                    const { clearEmailCache } = await import('@/services/gmailService')
                    await clearEmailCache()
                    sessionStorage.removeItem('doen_email_settings')
                    localStorage.removeItem('doen_email_settings')
                    setEmailSettings(DEFAULT_EMAIL_SETTINGS)
                  }
                  await laadPostvakken()
                  checkEmailStatus()
                  toast.success(<>Postvak ontkoppeld<span style={{ color: '#F15025' }}>.</span> Je mail blijft in doen. staan.</>)
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Ontkoppelen mislukt')
                }
              }}
            />
          )}
          {nieuwPostvak ? (
            <EmailSettingsInline
              onSaved={() => { setNieuwPostvak(null); void laadPostvakken(); checkEmailStatus() }}
              settings={nieuwPostvak}
              setSettings={setNieuwPostvak}
              isConnected={false}
              stand="nieuw"
              onAnnuleer={() => setNieuwPostvak(null)}
            />
          ) : (
            <EmailSettingsInline
              onSaved={() => { checkEmailStatus(); void laadPostvakken() }}
              settings={emailSettings}
              setSettings={setEmailSettings}
              isConnected={emailConnected}
              stand="bewerken"
              accountId={bewerktAccountId}
            />
          )}
        </div>
      )}

      {subTab === 'algemeen' && (
        <div className="space-y-6">

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              E-mail Voorkeuren
            </CardTitle>
            <CardDescription>Aantal emails dat bij opstarten wordt geladen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Aantal mails bij opstarten</Label>
              <Select
                value={String(emailFetchLimit)}
                onValueChange={(val) => setEmailFetchLimit(Number(val))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Meer emails laden kan trager zijn bij een grote inbox.</p>
            </div>
            <div className="space-y-2 mt-6">
              <Label>Mail-historie ophalen</Label>
              <Select
                value={backfillTarget}
                onValueChange={(val) => setBackfillTargetState(val as BackfillTarget)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1jaar">1 jaar terug</SelectItem>
                  <SelectItem value="5jaar">5 jaar terug</SelectItem>
                  <SelectItem value="alles">Alles</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Oudere mail wordt stapsgewijs op de achtergrond binnengehaald, zodat je er gewoon doorheen kunt bladeren en zoeken.</p>
            </div>
            <div className="flex justify-end mt-6">
              <Button
                onClick={async () => {
                  if (!user?.id) return
                  try {
                    setIsSaving(true)
                    await updateAppSettings(user.id, { email_fetch_limit: emailFetchLimit })
                    await setBackfillTarget(backfillTarget)
                    await refreshSettings()
                    toast.success(<>Opgeslagen<span style={{ color: '#F15025' }}>.</span></>)
                  } catch (err) {
                    console.error('[SettingsLayout] Email voorkeuren opslaan mislukt:', err)
                    toast.error('Kon voorkeuren niet opslaan')
                  } finally {
                    setIsSaving(false)
                  }
                }}
                disabled={isSaving}
              >
                {isSaving ? 'Opslaan...' : 'Opslaan'}
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      )}
    </>
  )
}

function EmailSettingsInline({
  onSaved,
  settings,
  setSettings,
  isConnected,
  stand = 'bewerken',
  accountId,
  onAnnuleer,
}: {
  onSaved: () => void
  settings: EmailSettings
  setSettings: (s: EmailSettings) => void
  isConnected: boolean
  /** 'nieuw' koppelt een extra postvak; 'bewerken' werkt het bestaande bij. */
  stand?: 'bewerken' | 'nieuw'
  /** Welk postvak bijgewerkt wordt. Leeg bij een nieuw postvak of vóór migratie 245. */
  accountId?: string
  onAnnuleer?: () => void
}) {
  const nieuw = stand === 'nieuw'
  const { isAdmin } = useAuth()
  // Team-inbox: alleen te kiezen bij een nieuw postvak en alleen door een
  // beheerder. De server controleert de rol nog een keer; deze schakelaar is
  // er om de keuze te tonen, niet om hem te bewaken.
  const [gedeeld, setGedeeld] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [provider, setProvider] = useState<EmailProvider>(afleidProvider(settings.smtp_host) ?? 'gmail')

  // De instellingen komen na de mount uit de database; dan pas weten we
  // welke provider hoort bij de opgeslagen server. Een lege host zegt niets.
  useEffect(() => {
    const p = afleidProvider(settings.smtp_host)
    if (p) setProvider(p)
  }, [settings.smtp_host])

  const handleProviderChange = (p: EmailProvider) => {
    setProvider(p)
    const defaults = EMAIL_PROVIDER_DEFAULTS[p]
    setSettings({ ...settings, ...defaults })
  }

  const metServerDefaults = (): EmailSettings =>
    provider === 'overig' || settings.smtp_host ? settings : { ...settings, ...EMAIL_PROVIDER_DEFAULTS[provider] }

  const handleSave = async () => {
    setError('')
    setSuccess('')

    if (!settings.gmail_address) {
      setError('Vul een e-mailadres in')
      return
    }
    // Leeg laten mag alleen als er al een wachtwoord is opgeslagen (dan blijft
    // het ongewijzigd). Bij de eerste keer is een wachtwoord verplicht.
    if (!settings.app_password && !settings.has_password) {
      setError('Vul een app-wachtwoord in')
      return
    }
    const teBewaren = metServerDefaults()
    if (!teBewaren.smtp_host) {
      setError('Vul een SMTP server in')
      return
    }

    setIsSaving(true)
    try {
      // Save via API endpoint (server-side encryptie, supabaseAdmin bypass RLS).
      // Het account_id bepaalt wélk postvak wordt bijgewerkt; bij een nieuw
      // postvak gaat het niet mee en maakt de server er een bij.
      const { clearEmailCache } = await import('@/services/gmailService')
      await slaPostvakOp({
        accountId: nieuw ? undefined : accountId,
        nieuw,
        adres: teBewaren.gmail_address,
        wachtwoord: teBewaren.app_password,
        smtpHost: teBewaren.smtp_host,
        smtpPort: teBewaren.smtp_port,
        imapHost: teBewaren.imap_host,
        imapPort: teBewaren.imap_port,
        gedeeld: nieuw && gedeeld,
      })

      // Wis de cache van de vorige mailbox zodat de inbox-view alleen nog
      // mails van het zojuist gekoppelde adres toont. Bij een extra postvak
      // juist niet: de mail van het eerste postvak hoort gewoon te blijven.
      if (!nieuw) await clearEmailCache()
      void mailStore.laadSyncStatus()

      // Na opslaan is er een wachtwoord bekend; wachtwoord zelf niet in state/cache houden.
      const opgeslagen = { ...teBewaren, app_password: '', has_password: true }
      setSettings(opgeslagen)
      // Cache in sessionStorage for quick loads · zonder wachtwoord.
      sessionStorage.setItem('doen_email_settings', JSON.stringify(opgeslagen))

      setSuccess(nieuw ? 'Postvak toegevoegd. De eerste synchronisatie start vanzelf.' : 'E-mailinstellingen opgeslagen!')
      onSaved()
    } catch (err: unknown) {
      const melding = err instanceof Error ? err.message : 'Onbekende fout'
      setError(nieuw ? melding : `Opslaan mislukt: ${melding}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleTest = async () => {
    setIsTesting(true)
    setError('')
    setSuccess('')

    if (!settings.gmail_address || !settings.app_password) {
      setError('Vul eerst e-mailadres en app-wachtwoord in')
      setIsTesting(false)
      return
    }

    try {
      const { testEmailConnection } = await import('@/services/gmailService')
      const teTesten = metServerDefaults()
      const result = await testEmailConnection(
        teTesten.gmail_address,
        teTesten.app_password,
        {
          smtp_host: teTesten.smtp_host,
          smtp_port: teTesten.smtp_port,
          imap_host: teTesten.imap_host,
          imap_port: teTesten.imap_port,
        }
      )

      if (result.imap_ok && result.smtp_ok) {
        setSuccess('Verbinding gelukt! IMAP en SMTP werken beide correct.')
      } else {
        const parts: string[] = []
        parts.push(result.imap_ok ? 'IMAP: OK' : 'IMAP: Mislukt')
        parts.push(result.smtp_ok ? 'SMTP: OK' : 'SMTP: Mislukt')
        const msg = parts.join(' | ')
        setError(result.error ? `${msg}. ${result.error}` : msg)
      }
    } catch (err: unknown) {
      setError(`Test mislukt: ${err instanceof Error ? err.message : 'Onbekende fout'}`)
    } finally {
      setIsTesting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      if (isSupabaseConfigured()) {
        await ontkoppelPostvak(accountId)
        const { clearEmailCache } = await import('@/services/gmailService')
        await clearEmailCache()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ontkoppelen mislukt')
      return
    }
    sessionStorage.removeItem('doen_email_settings')
    localStorage.removeItem('doen_email_settings')
    setSettings(DEFAULT_EMAIL_SETTINGS)
    setSuccess('')
    setError('')
    onSaved()
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="w-8 h-8 bg-flame/10 dark:bg-flame/20 rounded-lg flex items-center justify-center">
            <Mail className="w-4 h-4 text-flame" />
          </div>
          {nieuw ? 'Postvak toevoegen' : 'Mailbox koppelen'}
        </CardTitle>
        <CardDescription>
          Kies waar je mail staat. Google en Microsoft vullen de servers zelf in; bij Overig vul je IMAP en SMTP in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {PROVIDER_KAARTEN.map((k) => {
              const actief = provider === k.id
              return (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => handleProviderChange(k.id)}
                  aria-pressed={actief}
                  className={`text-left rounded-xl border p-3.5 transition-colors ${actief ? 'border-petrol bg-petrol/[0.06] ring-1 ring-petrol' : 'border-border bg-card hover:border-petrol/40'}`}
                >
                  <div className={`text-sm font-semibold ${actief ? 'text-petrol' : 'text-foreground'}`}>{k.naam}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{k.sub}</div>
                </button>
              )
            })}
          </div>

          {provider === 'gmail' && (
            <div className="rounded-lg border border-border bg-muted/30 p-3.5 space-y-3">
              <OAuthKnop label="Aanmelden met Google" aan={oauthAan('VITE_MAIL_OAUTH_GOOGLE')} />
              <div className="text-xs text-foreground/80 space-y-1.5">
                <p className="font-medium text-foreground">Koppelen met een app-wachtwoord</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Zet <strong>2-stapsverificatie</strong> aan op je Google-account.</li>
                  <li>
                    Maak een app-wachtwoord op{' '}
                    <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5 text-petrol">
                      Google App-wachtwoorden <ExternalLink className="w-3 h-3" />
                    </a>
                    .
                  </li>
                  <li>Plak de 16 tekens hieronder bij Wachtwoord en sla op.</li>
                </ol>
              </div>
            </div>
          )}
          {provider === 'outlook' && (
            <div className="rounded-lg border border-border bg-muted/30 p-3.5 space-y-3">
              <OAuthKnop label="Aanmelden met Microsoft" aan={oauthAan('VITE_MAIL_OAUTH_MICROSOFT')} />
              <p className="text-xs text-foreground/80">
                Microsoft zet wachtwoord-login op IMAP en SMTP steeds verder uit. Staan ze bij jouw beheerder nog aan,
                dan werkt een app-wachtwoord hieronder. Anders wacht je op aanmelden met Microsoft.
              </p>
            </div>
          )}

          {provider === 'overig' && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="smtp_host" className="flex items-center gap-2 text-sm font-medium">
                  <Server className="w-3.5 h-3.5 text-muted-foreground" />
                  SMTP Serveradres (verzenden)
                </Label>
                <Input
                  id="smtp_host"
                  placeholder="smtp.jouwhosting.nl"
                  value={settings.smtp_host}
                  onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="smtp_port" className="text-sm font-medium">Poort</Label>
                  <Input
                    id="smtp_port"
                    type="number"
                    placeholder="587"
                    value={settings.smtp_port}
                    onChange={(e) => setSettings({ ...settings, smtp_port: parseInt(e.target.value) || 587 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="imap_host" className="flex items-center gap-2 text-sm font-medium">
                  <Server className="w-3.5 h-3.5 text-muted-foreground" />
                  IMAP Serveradres (ontvangen)
                </Label>
                <Input
                  id="imap_host"
                  placeholder="imap.jouwhosting.nl"
                  value={settings.imap_host}
                  onChange={(e) => setSettings({ ...settings, imap_host: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imap_port" className="text-sm font-medium">IMAP Poort</Label>
                <Input
                  id="imap_port"
                  type="number"
                  placeholder="993"
                  value={settings.imap_port}
                  onChange={(e) => setSettings({ ...settings, imap_port: parseInt(e.target.value) || 993 })}
                />
              </div>
            </>
          )}

          <Separator />

          {/* Username (email) */}
          <div className="space-y-2">
            <Label htmlFor="gmail_address" className="flex items-center gap-2 text-sm font-medium">
              <Mail className="w-3.5 h-3.5 text-muted-foreground" />
              Gebruikersnaam (e-mailadres)
            </Label>
            <Input
              id="gmail_address"
              type="email"
              placeholder="studio@signcompany.nl"
              value={settings.gmail_address}
              onChange={(e) => setSettings({ ...settings, gmail_address: e.target.value })}
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="app_password" className="flex items-center gap-2 text-sm font-medium">
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              Wachtwoord / App Wachtwoord
              {settings.has_password && !settings.app_password && (
                <span className="text-xs font-normal text-muted-foreground">ingesteld, laat leeg om ongewijzigd te laten</span>
              )}
            </Label>
            <div className="relative">
              <Input
                id="app_password"
                type={showPassword ? 'text' : 'password'}
                placeholder={settings.has_password ? 'Opgeslagen · leeg laten om te behouden' : '••••••••••••••••'}
                value={settings.app_password}
                onChange={(e) => setSettings({ ...settings, app_password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Team-inbox. Alleen bij een nieuw postvak en alleen voor een
              beheerder: dit zet een mailbox open voor de hele organisatie. */}
          {nieuw && isAdmin && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={gedeeld}
                  onChange={(e) => setGedeeld(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-petrol"
                />
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium">Teampostvak</span>
                  <span className="block text-xs text-muted-foreground">
                    Iedereen in je organisatie leest en beantwoordt deze mailbox mee, met het
                    wachtwoord dat je hier invult. Bedoeld voor een adres als info@ of studio@.
                    Voor een persoonlijke mailbox laat je dit uit.
                  </span>
                </span>
              </label>
            </div>
          )}

          {provider === 'gmail' && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
              <div className="flex gap-2">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                  <p className="font-medium">SPF-record</p>
                  <p>
                    Mail je vanaf een eigen domein via Google, zet dan <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">include:_spf.google.com</code> in
                    het SPF-record van je domein. Anders belandt je offerte bij de klant in de spam.
                  </p>
                </div>
              </div>
            </div>
          )}

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Bell className="w-3.5 h-3.5" />
            Meldingen bij nieuwe mail regel je onder{' '}
            <Link to="/instellingen?tab=meldingen" className="font-medium text-petrol hover:underline inline-flex items-center gap-0.5">
              Account, Meldingen <ArrowRight className="w-3 h-3" />
            </Link>
          </p>

          {/* Error/Success messages */}
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3">
              <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
          {success && (
            <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3">
              <p className="text-xs text-green-700 dark:text-green-300">{success}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              <Save className="w-4 h-4" />
              {isSaving ? 'Opslaan...' : nieuw ? 'Postvak opslaan' : 'Opslaan'}
            </Button>
            {nieuw && onAnnuleer && (
              <button type="button" onClick={onAnnuleer} className="text-sm text-muted-foreground hover:text-foreground">
                Annuleren
              </button>
            )}
            {isConnected && !nieuw && (
              <Button variant="ghost" onClick={handleDisconnect} className="gap-2 text-flame hover:text-flame/80 hover:bg-flame/5">
                <Trash2 className="w-4 h-4" />
                Verwijderen
              </Button>
            )}
            <Button variant="outline" onClick={handleTest} disabled={isTesting} className="gap-2 ml-auto">
              <Mail className="w-4 h-4" />
              {isTesting ? 'Testen...' : 'Test verbinding'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
