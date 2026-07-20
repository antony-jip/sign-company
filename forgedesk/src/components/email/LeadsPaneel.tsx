import { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, Phone, Mail, MessageCircle, Building2, MapPin, Users, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import { getLeads, updateLeadStatus, updateLeadNotities, whatsappLink, LEAD_STATUSSEN } from '@/services/leadsService'
import type { Lead, LeadStatus } from '@/types'

const STATUS_STIJL: Record<LeadStatus, string> = {
  benaderd: 'bg-petrol/[0.08] text-petrol dark:bg-petrol/20 dark:text-petrol-200',
  gereageerd: 'bg-flame/[0.10] text-flame',
  geen_interesse: 'bg-muted text-muted-foreground',
  'follow-up_later': 'bg-amber-500/[0.12] text-amber-700 dark:text-amber-400',
}

interface LeadsPaneelProps {
  onMailLead: (email: string) => void
}

export function LeadsPaneel({ onMailLead }: LeadsPaneelProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [zoek, setZoek] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'alle'>('alle')
  const [geselecteerdId, setGeselecteerdId] = useState<string | null>(null)
  const [notitieConcept, setNotitieConcept] = useState('')

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
    setGeselecteerdId(lead.id)
    setNotitieConcept(lead.notities)
  }, [])

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
    <div className="flex flex-1 min-w-0 bg-white dark:bg-card">
      {/* Lijst */}
      <div className="flex flex-col min-w-0 w-full md:w-[380px] md:flex-shrink-0 md:border-r md:border-border">
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
          <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto">
            {([{ id: 'alle' as const, label: 'Alle' }, ...LEAD_STATUSSEN]).map((optie) => (
              <button
                key={optie.id}
                type="button"
                onClick={() => setStatusFilter(optie.id as LeadStatus | 'alle')}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[12px] font-medium whitespace-nowrap transition-colors duration-150',
                  statusFilter === optie.id
                    ? 'bg-petrol text-white'
                    : 'bg-muted/60 text-muted-foreground hover:text-petrol',
                )}
              >
                {optie.label} {tellers[optie.id] ?? 0}
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
                  <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0', STATUS_STIJL[lead.status])}>
                    {LEAD_STATUSSEN.find((s) => s.id === lead.status)?.label}
                  </span>
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
      <div className="hidden md:flex flex-1 min-w-0 flex-col overflow-y-auto">
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

            <div className="mt-5 flex flex-wrap gap-2">
              {LEAD_STATUSSEN.map((status) => (
                <button
                  key={status.id}
                  type="button"
                  onClick={() => zetStatus(geselecteerd, status.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors duration-150',
                    geselecteerd.status === status.id
                      ? 'bg-flame text-white'
                      : 'bg-muted/60 text-muted-foreground hover:text-petrol',
                  )}
                >
                  {status.label}
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
                  <a href={`tel:${geselecteerd.telefoon}`} className="text-foreground hover:text-petrol">
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
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{geselecteerd.email}</span>
                  <button
                    type="button"
                    onClick={() => onMailLead(geselecteerd.email)}
                    className="px-2 py-0.5 rounded-md bg-flame text-white text-[12px] font-medium hover:bg-[#D8421F] transition-colors duration-150"
                  >
                    Mail deze lead
                  </button>
                </div>
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
                          <a href={`tel:${contact.telefoon}`} className="text-muted-foreground hover:text-petrol">
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
