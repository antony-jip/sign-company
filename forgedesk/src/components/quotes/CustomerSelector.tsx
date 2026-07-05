import React, { useState, useEffect, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Search,
  Building2,
  X,
  Plus,
  UserPlus,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  Receipt,
  ArrowRight,
} from 'lucide-react'
import type { Klant, Project, Contactpersoon, ContactpersoonRecord } from '@/types'
import { getContactpersonenByKlant } from '@/services/supabaseService'
import { cn } from '@/lib/utils'
import { hapticLight, hapticMedium } from '@/utils/haptic'

const ITEM_COUNT_OPTIONS = [1, 2, 3, 4, 5] as const

interface ContactManagement {
  showNewContact: boolean
  setShowNewContact: (v: boolean) => void
  newContactNaam: string
  setNewContactNaam: (v: string) => void
  newContactFunctie: string
  setNewContactFunctie: (v: string) => void
  newContactEmail: string
  setNewContactEmail: (v: string) => void
  newContactTelefoon: string
  setNewContactTelefoon: (v: string) => void
  handleAddContact: () => void
  handleSelectContact: (id: string) => void
}

export interface CustomerSelectorProps {
  locationState: unknown
  navigate: (path: string) => void
  klantSearch: string
  setKlantSearch: (v: string) => void
  showKlantResults: boolean
  setShowKlantResults: (v: boolean) => void
  showNieuwBedrijf: boolean
  setShowNieuwBedrijf: (v: boolean) => void
  selectedKlantId: string
  setSelectedKlantId: (v: string) => void
  selectedKlant: Klant | undefined
  klantWrapperRef: React.RefObject<HTMLDivElement | null>
  filteredKlanten: Klant[]
  nbData: { bedrijfsnaam: string; contactpersoon: string; email: string; telefoon: string; adres: string; postcode: string; stad: string; website: string; debiteurennummer: string; kvk_nummer: string; btw_nummer: string }
  setNbData: React.Dispatch<React.SetStateAction<{ bedrijfsnaam: string; contactpersoon: string; email: string; telefoon: string; adres: string; postcode: string; stad: string; website: string; debiteurennummer: string; kvk_nummer: string; btw_nummer: string }>>
  showNbUitgebreid: boolean
  setShowNbUitgebreid: (v: boolean) => void
  nbCreating: boolean
  handleCreateNieuwBedrijf: () => void
  selectedProjectId: string
  setSelectedProjectId: (v: string) => void
  klantProjecten: Project[]
  selectedContactId: string
  setSelectedContactId: (v: string) => void
  contactpersoon: string
  setContactpersoon: (v: string) => void
  contact: ContactManagement
  offerteTitel: string
  setOfferteTitel: (v: string) => void
  offerteNummer: string
  geldigTot: string
  setGeldigTot: (v: string) => void
  itemCount: number
  setItemCount: (v: number) => void
  handleStartEditing: () => void
  canStartEditing: boolean
}

export function CustomerSelector({
  locationState,
  navigate,
  klantSearch,
  setKlantSearch,
  showKlantResults,
  setShowKlantResults,
  showNieuwBedrijf,
  setShowNieuwBedrijf,
  selectedKlantId,
  setSelectedKlantId,
  selectedKlant,
  klantWrapperRef,
  filteredKlanten,
  nbData,
  setNbData,
  showNbUitgebreid,
  setShowNbUitgebreid,
  nbCreating,
  handleCreateNieuwBedrijf,
  selectedProjectId,
  setSelectedProjectId,
  klantProjecten,
  selectedContactId,
  setSelectedContactId,
  contactpersoon,
  setContactpersoon,
  contact,
  offerteTitel,
  setOfferteTitel,
  offerteNummer,
  geldigTot,
  setGeldigTot,
  itemCount,
  setItemCount,
  handleStartEditing,
  canStartEditing,
}: CustomerSelectorProps) {
  const [dbContacten, setDbContacten] = useState<ContactpersoonRecord[]>([])
  useEffect(() => {
    if (!selectedKlant?.id) { setDbContacten([]); return }
    let cancelled = false
    getContactpersonenByKlant(selectedKlant.id)
      .then((rows) => { if (!cancelled) setDbContacten(rows) })
      .catch(() => { if (!cancelled) setDbContacten([]) })
    return () => { cancelled = true }
  }, [selectedKlant?.id])

  const gemergedeContactpersonen = useMemo<Contactpersoon[]>(() => {
    const jsonbCps = selectedKlant?.contactpersonen || []
    const jsonbEmails = new Set(jsonbCps.map((c) => c.email?.toLowerCase()).filter(Boolean))
    const fromDb: Contactpersoon[] = dbContacten
      .filter((c) => !jsonbEmails.has(c.email?.toLowerCase()))
      .map((c) => ({
        id: c.id,
        naam: [c.voornaam, c.achternaam].filter(Boolean).join(' ') || c.email || '',
        functie: c.functie || '',
        email: c.email || '',
        telefoon: c.telefoon || '',
        is_primair: false,
      }))
    return [...jsonbCps, ...fromDb]
  }, [selectedKlant, dbContacten])

  return (
      <div className="relative -m-3 sm:-m-4 md:-m-6 -mb-20 md:-mb-6 min-h-full" style={{ backgroundColor: 'hsl(var(--background))' }}>
        <div className="relative max-w-2xl mx-auto px-4 py-8 md:py-12 animate-fade-in-up">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              className="h-10 w-10 rounded-xl flex items-center justify-center transition-colors"
              style={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              onClick={() => {
                const from = (locationState as { from?: string })?.from
                navigate(from || '/offertes')
              }}
            >
              <ArrowLeft className="h-4 w-4" style={{ color: 'hsl(var(--muted-foreground))' }} />
            </button>
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm" style={{ backgroundColor: '#F15025' }}>
              <Receipt className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>Nieuwe Offerte</h1>
              <p className="text-[13px]" style={{ color: 'hsl(var(--muted-foreground))' }}>Selecteer een klant en vul de details in</p>
            </div>
          </div>

        <div className="space-y-4">
          {/* Step 1: Klant + Contactpersoon · merged */}
          <div className="rounded-xl" style={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
            <div className="h-[3px] rounded-t-xl" style={{ background: 'linear-gradient(90deg, #F15025, #F1502560)' }} />
            <div className="flex items-center gap-3 px-5 pt-4 pb-1">
              <div className="flex items-center justify-center h-7 w-7 rounded-lg text-white text-[11px] font-bold" style={{ backgroundColor: '#F15025' }}>1</div>
              <div>
                <span className="text-[13px] font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Klant & contactpersoon</span>
                <p className="text-[11px]" style={{ color: 'hsl(var(--muted-foreground))' }}>Wie is de opdrachtgever?</p>
              </div>
            </div>
            <div className="px-5 pb-5 pt-3 space-y-3">
              <div className="space-y-2" ref={klantWrapperRef as React.RefObject<HTMLDivElement>}>
                {!selectedKlant && (
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'hsl(var(--muted-foreground))' }} />
                      <Input value={klantSearch} onChange={(e) => { setKlantSearch(e.target.value); setShowKlantResults(true); setShowNieuwBedrijf(false) }} onFocus={() => setShowKlantResults(true)} placeholder="Zoek op bedrijfsnaam, contactpersoon of email..." className="pl-10 h-10 rounded-lg text-[13px]" style={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                    </div>
                    {showKlantResults && !showNieuwBedrijf && (
                      <div className="absolute z-50 w-full mt-1 rounded-[12px] border bg-popover shadow-[0_12px_40px_rgba(0,0,0,0.10),0_1px_2px_rgba(0,0,0,0.05)] max-h-[320px] overflow-y-auto" style={{ border: '1px solid hsl(var(--border))' }}>
                        <button className="w-full text-left px-3 py-2.5 flex items-center gap-2 text-petrol hover:bg-[hsl(var(--status-green-bg))]/50 transition-colors border-b" style={{ borderColor: '#EBEBEB' }} onClick={() => { setShowNieuwBedrijf(true); setNbData((p) => ({ ...p, bedrijfsnaam: klantSearch })) }}>
                          <Plus className="w-4 h-4" /><span className="text-[13px] font-medium">Nieuw bedrijf toevoegen{klantSearch.trim() ? `: "${klantSearch.trim()}"` : ''}</span>
                        </button>
                        {filteredKlanten.length === 0 ? (
                          <div className="py-4 text-center text-[13px]" style={{ color: 'hsl(var(--muted-foreground))' }}>Geen klanten gevonden</div>
                        ) : filteredKlanten.map((klant) => (
                          <button key={klant.id} className="w-full text-left px-3 py-2 hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] transition-colors border-b last:border-0" style={{ borderColor: '#EBEBEB' }} onClick={() => { setSelectedKlantId(klant.id); setKlantSearch(''); setShowKlantResults(false) }}>
                            <p className="text-[13px] font-medium" style={{ color: 'hsl(var(--foreground))' }}>{klant.bedrijfsnaam}</p>
                            <div className="flex items-center gap-2">
                              {klant.contactpersoon && <span className="text-[11px]" style={{ color: 'hsl(var(--muted-foreground))' }}>{klant.contactpersoon}</span>}
                              {klant.stad && <span className="text-[11px]" style={{ color: 'hsl(var(--muted-foreground))' }}>{klant.stad}</span>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {showNieuwBedrijf && (
                      <div className="mt-2 rounded-lg p-4 space-y-3" style={{ border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))' }}>
                        <div className="flex items-center gap-2 mb-1"><Building2 className="h-4 w-4" style={{ color: '#1A535C' }} /><span className="text-[13px] font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Nieuw bedrijf</span></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Input value={nbData.bedrijfsnaam} onChange={(e) => setNbData({ ...nbData, bedrijfsnaam: e.target.value })} placeholder="Bedrijfsnaam *" className="h-9 text-[13px] rounded-lg" style={{ border: '1px solid hsl(var(--border))' }} autoFocus />
                          <Input value={nbData.stad} onChange={(e) => setNbData({ ...nbData, stad: e.target.value })} placeholder="Stad" className="h-9 text-[13px] rounded-lg" style={{ border: '1px solid hsl(var(--border))' }} />
                        </div>
                        <button onClick={() => setShowNbUitgebreid(!showNbUitgebreid)} className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>
                          {showNbUitgebreid ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}{showNbUitgebreid ? 'Minder gegevens' : 'Meer gegevens (adres, btw, etc.)'}
                        </button>
                        {showNbUitgebreid && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Input value={nbData.contactpersoon} onChange={(e) => setNbData({ ...nbData, contactpersoon: e.target.value })} placeholder="Contactpersoon" className="h-9 text-[13px] rounded-lg" style={{ border: '1px solid hsl(var(--border))' }} />
                            <Input value={nbData.email} onChange={(e) => setNbData({ ...nbData, email: e.target.value })} placeholder="E-mail" className="h-9 text-[13px] rounded-lg" style={{ border: '1px solid hsl(var(--border))' }} />
                            <Input value={nbData.telefoon} onChange={(e) => setNbData({ ...nbData, telefoon: e.target.value })} placeholder="Telefoon" className="h-9 text-[13px] rounded-lg" style={{ border: '1px solid hsl(var(--border))' }} />
                            <Input value={nbData.adres} onChange={(e) => setNbData({ ...nbData, adres: e.target.value })} placeholder="Adres" className="h-9 text-[13px] rounded-lg" style={{ border: '1px solid hsl(var(--border))' }} />
                            <Input value={nbData.postcode} onChange={(e) => setNbData({ ...nbData, postcode: e.target.value })} placeholder="Postcode" className="h-9 text-[13px] rounded-lg" style={{ border: '1px solid hsl(var(--border))' }} />
                            <Input value={nbData.website} onChange={(e) => setNbData({ ...nbData, website: e.target.value })} placeholder="Website" className="h-9 text-[13px] rounded-lg" style={{ border: '1px solid hsl(var(--border))' }} />
                            <Input value={nbData.debiteurennummer} onChange={(e) => setNbData({ ...nbData, debiteurennummer: e.target.value })} placeholder="Debiteurennummer" className="h-9 text-[13px] rounded-lg" style={{ border: '1px solid hsl(var(--border))' }} />
                            <Input value={nbData.btw_nummer} onChange={(e) => setNbData({ ...nbData, btw_nummer: e.target.value })} placeholder="BTW-nummer" className="h-9 text-[13px] rounded-lg" style={{ border: '1px solid hsl(var(--border))' }} />
                          </div>
                        )}
                        <div className="flex items-center gap-2 pt-1">
                          <button onClick={handleCreateNieuwBedrijf} disabled={!nbData.bedrijfsnaam.trim() || nbCreating} className="h-8 px-3 text-[12px] font-semibold rounded-lg text-white bg-petrol hover:bg-petrol/90 transition-all disabled:opacity-50 flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" />{nbCreating ? 'Aanmaken...' : 'Bedrijf aanmaken'}</button>
                          <button onClick={() => { setShowNieuwBedrijf(false); setShowKlantResults(true) }} className="h-8 px-3 text-[12px] font-medium rounded-lg" style={{ color: 'hsl(var(--muted-foreground))' }}>Annuleren</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {selectedKlant && (
                <div className="rounded-lg p-3" style={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8BAFD4] to-[#6B8FB4] flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-[10px]">{selectedKlant.bedrijfsnaam[0]?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-[13px] truncate" style={{ color: 'hsl(var(--foreground))' }}>{selectedKlant.bedrijfsnaam}</h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        {selectedKlant.email && <span className="flex items-center gap-1 text-[11px]" style={{ color: 'hsl(var(--muted-foreground))' }}><Mail className="h-3 w-3" />{selectedKlant.email}</span>}
                        {selectedKlant.telefoon && <span className="flex items-center gap-1 text-[11px] font-mono" style={{ color: 'hsl(var(--muted-foreground))' }}><Phone className="h-3 w-3" />{selectedKlant.telefoon}</span>}
                      </div>
                    </div>
                    <button className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors hover:bg-muted" onClick={() => { setSelectedKlantId(''); setSelectedProjectId(''); setContactpersoon(''); setSelectedContactId('') }}>
                      <X className="h-3.5 w-3.5" style={{ color: 'hsl(var(--muted-foreground))' }} />
                    </button>
                  </div>
                </div>
              )}
              {selectedKlantId && (
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'hsl(var(--muted-foreground))' }}>Project <span className="text-[11px] font-normal normal-case tracking-normal">(optioneel)</span></Label>
                  {klantProjecten.length > 0 ? (
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                      <SelectTrigger className="h-10 rounded-lg text-[13px]" style={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}><SelectValue placeholder="Koppel aan een project..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="geen"><span style={{ color: 'hsl(var(--muted-foreground))' }}>Geen project</span></SelectItem>
                        {klantProjecten.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            <div className="flex items-center gap-2"><span className="font-medium">{project.naam}</span><Badge variant="outline" className="text-2xs px-1.5 py-0">{project.status}</Badge></div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : <p className="text-[11px] py-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Geen projecten gevonden voor deze klant</p>}
                </div>
              )}
              {/* Contactpersoon · inline under klant */}
              {selectedKlant && (
                <div className="pt-2 border-t space-y-2" style={{ borderColor: '#EBEBEB' }}>
                  <Label className="text-[11px] font-semibold uppercase tracking-wider block" style={{ color: 'hsl(var(--muted-foreground))' }}>Contactpersoon</Label>
                  {(gemergedeContactpersonen.length > 0 || selectedKlant.contactpersoon) && (
                    <div className="space-y-1.5">
                      {gemergedeContactpersonen.map((cp) => (
                        <button key={cp.id} onClick={() => contact.handleSelectContact(cp.id)} className={cn('w-full text-left rounded-lg p-2.5 transition-all')} style={{ border: selectedContactId === cp.id ? '1px solid #1A535C' : '0.5px solid #EBEBEB', backgroundColor: selectedContactId === cp.id ? '#E2F0F0' : 'transparent' }}>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold" style={{ backgroundColor: selectedContactId === cp.id ? '#1A535C' : '#EBEBEB', color: selectedContactId === cp.id ? '#FFFFFF' : '#6B6B66' }}>{cp.naam[0]?.toUpperCase()}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-medium truncate" style={{ color: 'hsl(var(--foreground))' }}>{cp.naam}</p>
                              {cp.functie && <p className="text-[11px] truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>{cp.functie}</p>}
                            </div>
                            {cp.is_primair && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#E2F0F0', color: '#1A535C' }}>primair</span>}
                          </div>
                        </button>
                      ))}
                      {gemergedeContactpersonen.length === 0 && selectedKlant.contactpersoon && (
                        <div className="rounded-lg p-2.5" style={{ border: '1px solid #1A535C', backgroundColor: '#E2F0F0' }}>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold" style={{ backgroundColor: '#1A535C', color: '#FFFFFF' }}>{selectedKlant.contactpersoon[0]?.toUpperCase()}</div>
                            <p className="text-[13px] font-medium" style={{ color: 'hsl(var(--foreground))' }}>{selectedKlant.contactpersoon}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {!contact.showNewContact ? (
                    <button onClick={() => contact.setShowNewContact(true)} className="w-full flex items-center gap-2 text-[11px] py-2 px-3 rounded-lg transition-colors hover:bg-background" style={{ border: '1px dashed #EBEBEB', color: 'hsl(var(--muted-foreground))' }}>
                      <UserPlus className="h-3.5 w-3.5" />Nieuwe contactpersoon toevoegen
                    </button>
                  ) : (
                    <div className="rounded-lg p-3.5 space-y-2" style={{ border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))' }}>
                      <p className="text-[12px] font-semibold flex items-center gap-1.5" style={{ color: 'hsl(var(--foreground))' }}><UserPlus className="h-3.5 w-3.5" style={{ color: '#1A535C' }} />Nieuwe contactpersoon</p>
                      <Input value={contact.newContactNaam} onChange={(e) => contact.setNewContactNaam(e.target.value)} placeholder="Naam *" className="h-9 text-[13px] rounded-lg" style={{ border: '1px solid hsl(var(--border))' }} autoFocus />
                      <Input value={contact.newContactFunctie} onChange={(e) => contact.setNewContactFunctie(e.target.value)} placeholder="Functie" className="h-9 text-[13px] rounded-lg" style={{ border: '1px solid hsl(var(--border))' }} />
                      <Input value={contact.newContactEmail} onChange={(e) => contact.setNewContactEmail(e.target.value)} placeholder="E-mailadres" type="email" className="h-9 text-[13px] rounded-lg" style={{ border: '1px solid hsl(var(--border))' }} />
                      <Input value={contact.newContactTelefoon} onChange={(e) => contact.setNewContactTelefoon(e.target.value)} placeholder="Telefoonnummer" className="h-9 text-[13px] rounded-lg" style={{ border: '1px solid hsl(var(--border))' }} />
                      <div className="flex items-center gap-2 pt-1">
                        <button onClick={contact.handleAddContact} disabled={!contact.newContactNaam.trim()} className="h-7 px-3 text-[11px] font-semibold rounded-lg text-white bg-petrol hover:bg-petrol/90 transition-all disabled:opacity-50 flex items-center gap-1"><Plus className="h-3 w-3" />Toevoegen</button>
                        <button onClick={() => { contact.setShowNewContact(false); contact.setNewContactNaam(''); contact.setNewContactFunctie(''); contact.setNewContactEmail(''); contact.setNewContactTelefoon('') }} className="h-7 px-3 text-[11px] font-medium rounded-lg" style={{ color: 'hsl(var(--muted-foreground))' }}>Annuleren</button>
                      </div>
                    </div>
                  )}
                  {!contact.showNewContact && (
                    <div className="space-y-1 pt-2" style={{ borderTop: '0.5px solid #EBEBEB' }}>
                      <Label className="text-[11px]" style={{ color: 'hsl(var(--muted-foreground))' }}>Of typ een naam</Label>
                      <Input value={contactpersoon} onChange={(e) => { setContactpersoon(e.target.value); setSelectedContactId('') }} placeholder="Contactpersoon naam..." className="h-9 text-[13px] rounded-lg" style={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Offerte details + items · merged */}
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
            <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #3A6B8C, #3A6B8C60)' }} />
            <div className="flex items-center gap-3 px-5 pt-4 pb-1">
              <div className="flex items-center justify-center h-7 w-7 rounded-lg text-white text-[11px] font-bold" style={{ backgroundColor: '#3A6B8C' }}>2</div>
              <div>
                <span className="text-[13px] font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Offerte details</span>
                <p className="text-[11px]" style={{ color: 'hsl(var(--muted-foreground))' }}>Titel, nummer en geldigheid</p>
              </div>
            </div>
            <div className="px-5 pb-5 pt-3 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="offerte-titel" className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>Titel</Label>
                <Input id="offerte-titel" value={offerteTitel} onChange={(e) => setOfferteTitel(e.target.value)} placeholder="bijv. Gevelreclame nieuwe locatie, Autobelettering wagenpark..." className="text-[14px] h-10 rounded-lg" style={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="offerte-nummer" className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>Nummer</Label>
                  <Input id="offerte-nummer" value={offerteNummer} readOnly className="text-[13px] font-mono h-10 rounded-lg" style={{ backgroundColor: 'hsl(var(--border))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="geldig-tot" className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>Geldig tot</Label>
                  <DatePicker value={geldigTot} onChange={(v) => setGeldigTot(v)} asInput className="text-[13px] font-mono h-10 rounded-lg" />
                </div>
              </div>
            </div>
          </div>

          {/* Start button with inline item count · stack on mobile */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0 pt-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>Items</span>
              {ITEM_COUNT_OPTIONS.map((count) => (
                <button
                  key={count}
                  onClick={() => { hapticLight(); setItemCount(count) }}
                  className="tap-press h-9 w-9 md:h-8 md:w-8 rounded-lg text-[13px] font-bold transition-all"
                  style={{ border: itemCount === count ? '2px solid #1A535C' : '0.5px solid #EBEBEB', backgroundColor: itemCount === count ? '#1A535C' : '#F8F7F5', color: itemCount === count ? '#FFFFFF' : '#1A1A1A' }}
                >
                  {count}
                </button>
              ))}
            </div>
            <button
              onClick={() => { hapticMedium(); handleStartEditing() }}
              disabled={!canStartEditing}
              className="tap-press w-full md:w-auto h-11 md:h-10 px-6 text-[14px] font-bold text-white rounded-lg shadow-sm transition-all hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2 whitespace-nowrap"
              style={{ backgroundColor: '#F15025' }}
            >
              Items toevoegen
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        </div>
      </div>
  )
}
