import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Search, Phone, Mail, MessageCircle, Building2, MapPin, Users, Tag, Sparkles, CornerUpLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import { getLeads, updateLeadStatus, updateLeadNotities, whatsappLink, LEAD_STATUSSEN } from '@/services/leadsService'
import { getEmailsMetAdres } from '@/services/emailService'
import { callForgie } from '@/services/forgieService'
import type { Email, Lead, LeadStatus } from '@/types'

// Statuskleuren uit het doen-design-systeem. Status is tekst + Flame punt,
// nadrukkelijk geen gekleurde pill-badge.
const STATUS_KLEUR: Record<LeadStatus, string> = {
  nieuw: '#6E6E68',
  benaderd: '#8A7A4A',
  gereageerd: '#3A7D52',
  geen_interesse: '#C0451A',
  'follow-up_later': '#3A5A9A',
}

function StatusTekst({ status }: { status: LeadStatus }) {
  return (
    <span className="text-[13px] font-medium whitespace-nowrap" style={{ color: STATUS_KLEUR[status] }}>
      {LEAD_STATUSSEN.find((s) => s.id === status)?.label}
      <span className="text-flame">.</span>
    </span>
  )
}

interface LeadsPaneelProps {
  /**
   * leadId wordt alleen meegegeven voor leads die nog op 'nieuw' staan: na
   * verzenden zet EmailLayout die op 'benaderd'. Een lead die al gereageerd
   * heeft, mag door een tweede mail niet terugvallen naar benaderd.
   */
  onMailLead: (email: string, body?: string, leadId?: string) => void
  /** Tijdens opstellen staat compose rechts ernaast; de lead blijft dus zichtbaar. */
  naastCompose?: boolean
  /** Desktop: kies je een lead, dan staat de mail er meteen naast. */
  mailDirect?: boolean
  /** Kort reageren op een binnengekomen mail van deze lead. */
  onBeantwoordMail?: (email: Email) => void
  /** Lead die zojuist gemaild is; status lokaal bijwerken zonder refetch. */
  benaderdeLeadId?: string | null
}

/** Alleen ingevulde velden; ontbrekende gegevens laat de prompt liever weg. */
function leadContext(lead: Lead): string {
  return [
    lead.bedrijf && `Bedrijf: ${lead.bedrijf}`,
    lead.naam && `Contactpersoon: ${lead.naam}`,
    [lead.plaats, lead.provincie].filter(Boolean).join(', ') && `Plaats: ${[lead.plaats, lead.provincie].filter(Boolean).join(', ')}`,
    lead.bron && `Gevonden via: ${lead.bron}`,
    lead.notities && `Eigen notitie: ${lead.notities}`,
  ].filter(Boolean).join('\n')
}

export function LeadsPaneel({ onMailLead, naastCompose = false, mailDirect = false, onBeantwoordMail, benaderdeLeadId }: LeadsPaneelProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [zoek, setZoek] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'alle'>('alle')
  const [geselecteerdId, setGeselecteerdId] = useState<string | null>(null)
  const [notitieConcept, setNotitieConcept] = useState('')
  const [aanwijzing, setAanwijzing] = useState('')
  const [schrijftVoorId, setSchrijftVoorId] = useState<string | null>(null)
  const [correspondentie, setCorrespondentie] = useState<Email[]>([])
  const actieveLeadRef = useRef<string | null>(null)

  useEffect(() => {
    getLeads()
      .then(setLeads)
      .catch((err) => {
        logger.error('Leads laden mislukt:', err)
        toast.error('Leads laden mislukt')
      })
      .finally(() => setIsLoading(false))
  }, [])

  const zichtbaar = useMemo(() => {
    const term = zoek.trim().toLowerCase()
    return leads.filter((lead) => {
      if (statusFilter !== 'alle' && lead.status !== statusFilter) return false
      if (!term) return true
      return [lead.naam, lead.bedrijf, lead.plaats, lead.provincie, lead.email, lead.telefoon]
        .some((veld) => veld.toLowerCase().includes(term))
    })
  }, [leads, zoek, statusFilter])

  const geselecteerd = leads.find((l) => l.id === geselecteerdId) || null

  const tellers = useMemo(() => {
    const per = { alle: leads.length } as Record<string, number>
    for (const status of LEAD_STATUSSEN) per[status.id] = leads.filter((l) => l.status === status.id).length
    return per
  }, [leads])

  const kiesLead = useCallback((lead: Lead) => {
    actieveLeadRef.current = lead.id
    setGeselecteerdId(lead.id)
    setNotitieConcept(lead.notities)
    setAanwijzing('')
    if (mailDirect && lead.email) onMailLead(lead.email, undefined, lead.status === 'nieuw' ? lead.id : undefined)
    setCorrespondentie([])
    if (lead.email) {
      getEmailsMetAdres(lead.email)
        // Snel doorklikken: alleen tonen als deze lead nog geselecteerd is.
        .then((mails) => { if (actieveLeadRef.current === lead.id) setCorrespondentie(mails) })
        .catch((err) => logger.error('Correspondentie laden mislukt:', err))
    }
  }, [mailDirect, onMailLead])

  const zetStatus = useCallback(async (lead: Lead, status: LeadStatus) => {
    const vorige = lead.status
    setLeads((huidig) => huidig.map((l) => (l.id === lead.id ? { ...l, status } : l)))
    try {
      await updateLeadStatus(lead.id, status)
    } catch (err) {
      logger.error('Status opslaan mislukt:', err)
      setLeads((huidig) => huidig.map((l) => (l.id === lead.id ? { ...l, status: vorige } : l)))
      toast.error('Status opslaan mislukt')
    }
  }, [])

  useEffect(() => {
    if (!benaderdeLeadId) return
    setLeads((huidig) => huidig.map((l) => (
      l.id === benaderdeLeadId && l.status === 'nieuw' ? { ...l, status: 'benaderd' } : l
    )))
  }, [benaderdeLeadId])

  const mailMetOpzet = useCallback(async (lead: Lead) => {
    setSchrijftVoorId(lead.id)
    try {
      const { result } = await callForgie('write-lead-email', aanwijzing.trim(), leadContext(lead))
      onMailLead(lead.email, result, lead.status === 'nieuw' ? lead.id : undefined)
    } catch (err) {
      logger.error('Opzetje schrijven mislukt:', err)
      toast.error(err instanceof Error ? err.message : 'Opzetje schrijven mislukt')
    } finally {
      setSchrijftVoorId(null)
    }
  }, [aanwijzing, onMailLead])

  const bewaarNotitie = useCallback(async (lead: Lead) => {
    if (notitieConcept === lead.notities) return
    try {
      await updateLeadNotities(lead.id, notitieConcept)
      setLeads((huidig) => huidig.map((l) => (l.id === lead.id ? { ...l, notities: notitieConcept } : l)))
    } catch (err) {
      logger.error('Notitie opslaan mislukt:', err)
      toast.error('Notitie opslaan mislukt')
    }
  }, [notitieConcept])

  return (
    <div className={cn('flex min-w-0 bg-white dark:bg-card', naastCompose ? 'md:flex-shrink-0' : 'flex-1')}>
      {/* Lijst */}
      <div className={cn(
        'flex-col min-w-0 w-full md:w-[380px] md:flex-shrink-0 md:border-r md:border-border',
        naastCompose ? 'hidden 2xl:flex' : 'flex',
      )}>
        <div className="sticky top-0 z-20 bg-white dark:bg-card border-b border-[rgba(26,83,92,0.08)] dark:border-white/10 flex-shrink-0">
          <div className="px-4 pt-4 pb-3">
            <h1 className="font-heading text-[20px] font-bold tracking-[-0.01em] text-foreground leading-none">
              Leads<span className="text-flame">.</span>
            </h1>
          </div>
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={zoek}
                onChange={(e) => setZoek(e.target.value)}
                placeholder="Zoek op naam, bedrijf of plaats"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted/60 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-petrol/30"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-4 pb-3">
            {([{ id: 'alle' as const, label: 'Alle' }, ...LEAD_STATUSSEN]).map((optie) => (
              <button
                key={optie.id}
                type="button"
                onClick={() => setStatusFilter(optie.id as LeadStatus | 'alle')}
                className={cn(
                  'text-[13px] whitespace-nowrap transition-colors duration-150',
                  statusFilter === optie.id
                    ? 'font-semibold text-foreground'
                    : 'text-[#9B9B95] hover:text-foreground',
                )}
              >
                {optie.label} <span className="font-mono text-[12px]">{tellers[optie.id] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 text-[13px] text-muted-foreground">Laden…</div>
          ) : zichtbaar.length === 0 ? (
            <div className="p-6 text-[13px] text-muted-foreground">
              {leads.length === 0 ? 'Nog geen leads geïmporteerd.' : 'Geen leads met dit filter.'}
            </div>
          ) : (
            zichtbaar.map((lead) => (
              <button
                key={lead.id}
                type="button"
                onClick={() => kiesLead(lead)}
                className={cn(
                  'w-full text-left px-4 py-3 border-b border-[rgba(26,83,92,0.06)] dark:border-white/[0.06] transition-colors duration-150',
                  geselecteerdId === lead.id ? 'bg-petrol/[0.06]' : 'hover:bg-muted/40',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[14px] font-semibold text-foreground truncate">
                    {lead.bedrijf || lead.naam || '(naamloos)'}
                  </span>
                  <span className="flex-shrink-0"><StatusTekst status={lead.status} /></span>
                </div>
                <div className="mt-0.5 text-[12px] text-muted-foreground truncate">
                  {[lead.naam && lead.bedrijf ? lead.naam : '', lead.plaats].filter(Boolean).join(' · ')}
                </div>
                {lead.contactpersonen.length > 0 && (
                  <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Users className="h-3 w-3" />
                    +{lead.contactpersonen.length} contactpersoon
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail */}
      <div className={cn(
        'min-w-0 flex-col overflow-y-auto hidden md:flex',
        naastCompose ? 'md:w-[380px] md:flex-shrink-0 md:border-r md:border-border' : 'flex-1',
      )}>
        {!geselecteerd ? (
          <div className="flex-1 flex items-center justify-center text-[13px] text-muted-foreground">
            Kies een lead
          </div>
        ) : (
          <div className="p-6 max-w-[640px]">
            <h2 className="font-heading text-[22px] font-bold tracking-[-0.01em] text-foreground">
              {geselecteerd.bedrijf || geselecteerd.naam}
            </h2>
            {geselecteerd.naam && geselecteerd.bedrijf && (
              <p className="mt-1 text-[14px] text-muted-foreground">{geselecteerd.naam}</p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-5">
              {LEAD_STATUSSEN.map((status) => (
                <button
                  key={status.id}
                  type="button"
                  onClick={() => zetStatus(geselecteerd, status.id)}
                  className={cn(
                    'text-[13px] transition-colors duration-150',
                    geselecteerd.status === status.id
                      ? 'font-semibold text-foreground'
                      : 'text-[#9B9B95] hover:text-foreground',
                  )}
                >
                  {status.label}
                  {geselecteerd.status === status.id && <span className="text-flame">.</span>}
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-2 text-[13px]">
              {geselecteerd.plaats && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {[geselecteerd.plaats, geselecteerd.provincie].filter(Boolean).join(', ')}
                </div>
              )}
              {geselecteerd.telefoon && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${geselecteerd.telefoon}`} className="font-mono text-[13px] text-foreground hover:text-petrol">
                    {geselecteerd.telefoon}
                  </a>
                  {whatsappLink(geselecteerd.telefoon) && (
                    <a
                      href={whatsappLink(geselecteerd.telefoon)!}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 text-[12px] text-muted-foreground hover:text-petrol"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                    </a>
                  )}
                </div>
              )}
              {geselecteerd.email && (
                <div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground truncate">{geselecteerd.email}</span>
                  </div>
                  <div className="mt-1 pl-6 flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => onMailLead(geselecteerd.email, undefined, geselecteerd.status === 'nieuw' ? geselecteerd.id : undefined)}
                      className="text-[13px] text-muted-foreground hover:text-petrol whitespace-nowrap"
                    >
                      Nieuwe mail
                    </button>
                    <button
                      type="button"
                      onClick={() => mailMetOpzet(geselecteerd)}
                      disabled={schrijftVoorId === geselecteerd.id}
                      className="inline-flex items-center gap-1 text-[13px] font-medium text-flame hover:underline underline-offset-2 disabled:opacity-50 disabled:no-underline whitespace-nowrap"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {schrijftVoorId === geselecteerd.id ? 'Daan schrijft…' : 'Schrijf opzetje'}
                    </button>
                  </div>
                </div>
              )}
              {geselecteerd.email && (
                <input
                  type="text"
                  value={aanwijzing}
                  onChange={(e) => setAanwijzing(e.target.value)}
                  placeholder="Aanwijzing voor Daan, bijvoorbeeld: houd het extra kort"
                  className="w-full px-3 py-2 rounded-lg bg-muted/40 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-petrol/30"
                />
              )}
              {geselecteerd.bron && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Tag className="h-4 w-4" />
                  Gevonden via {geselecteerd.bron}
                  {geselecteerd.bron_status && ` · ${geselecteerd.bron_status}`}
                </div>
              )}
            </div>

            {geselecteerd.contactpersonen.length > 0 && (
              <div className="mt-6">
                <h3 className="text-[13px] font-semibold text-foreground flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Ook bij dit bedrijf
                </h3>
                <div className="mt-2 space-y-2">
                  {geselecteerd.contactpersonen.map((contact) => (
                    <div key={contact.id} className="p-3 rounded-lg bg-muted/40 text-[13px]">
                      <div className="font-medium text-foreground">{contact.naam || '(naam onbekend)'}</div>
                      {contact.functie && <div className="text-[12px] text-muted-foreground">{contact.functie}</div>}
                      {contact.telefoon && (
                        <div className="mt-1 flex items-center gap-2">
                          <a href={`tel:${contact.telefoon}`} className="font-mono text-[12px] text-muted-foreground hover:text-petrol">
                            {contact.telefoon}
                          </a>
                          {whatsappLink(contact.telefoon) && (
                            <a
                              href={whatsappLink(contact.telefoon)!}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-petrol"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              WhatsApp
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {correspondentie.length > 0 && (
              <div className="mt-6">
                <h3 className="text-[13px] font-semibold text-foreground">Mailwisseling</h3>
                <div className="mt-2 space-y-1">
                  {correspondentie.map((mail) => {
                    const vanLead = mail.van?.toLowerCase().includes(geselecteerd.email.toLowerCase()) ?? false
                    return (
                      <div key={mail.id} className="group flex items-start gap-2 py-1.5 border-b border-[rgba(26,83,92,0.06)] dark:border-white/[0.06] last:border-b-0">
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] text-foreground truncate">
                            {mail.onderwerp || '(geen onderwerp)'}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {vanLead ? 'Van deze lead' : 'Door jou verstuurd'} · {new Date(mail.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                          </div>
                        </div>
                        {vanLead && onBeantwoordMail && (
                          <button
                            type="button"
                            onClick={() => onBeantwoordMail(mail)}
                            className="flex-shrink-0 inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-petrol transition-colors duration-150"
                          >
                            <CornerUpLeft className="h-3.5 w-3.5" />
                            Reageer
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="mt-6">
              <h3 className="text-[13px] font-semibold text-foreground">Notities</h3>
              <textarea
                value={notitieConcept}
                onChange={(e) => setNotitieConcept(e.target.value)}
                onBlur={() => bewaarNotitie(geselecteerd)}
                rows={4}
                placeholder="Wat is er besproken?"
                className="mt-2 w-full px-3 py-2 rounded-lg bg-muted/40 text-[13px] text-foreground placeholder:text-muted-foreground resize-y focus:outline-none focus:ring-2 focus:ring-petrol/30"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
