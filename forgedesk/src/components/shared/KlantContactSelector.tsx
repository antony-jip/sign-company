import { useState, useMemo, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, X, Plus, ChevronDown, ChevronUp, Building2, UserPlus, Check } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { createKlant, updateKlant } from '@/services/supabaseService'
import type { Klant, Contactpersoon } from '@/types'
import { toast } from 'sonner'

interface KlantContactSelectorProps {
  klantId: string
  onKlantChange: (klantId: string, klant: Klant | null) => void
  contactpersoonId?: string
  onContactpersoonChange?: (cpId: string) => void
  vestigingId?: string
  onVestigingChange?: (vId: string) => void
  klanten: Klant[]
  onKlantenRefresh?: () => void
}

export function KlantContactSelector({
  klantId,
  onKlantChange,
  contactpersoonId = '',
  onContactpersoonChange,
  vestigingId = '',
  onVestigingChange,
  klanten,
  onKlantenRefresh,
}: KlantContactSelectorProps) {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [showNieuwBedrijf, setShowNieuwBedrijf] = useState(false)
  const [showUitgebreid, setShowUitgebreid] = useState(false)
  const [showNieuwContact, setShowNieuwContact] = useState(false)
  const [creating, setCreating] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Nieuw bedrijf state
  const [nb, setNb] = useState({ bedrijfsnaam: '', contactpersoon: '', email: '', telefoon: '', adres: '', postcode: '', stad: '', website: '', kvk_nummer: '', btw_nummer: '' })
  // Nieuw contact state
  const [nc, setNc] = useState({ naam: '', functie: '', email: '', telefoon: '' })

  const selectedKlant = useMemo(() => klanten.find((k) => k.id === klantId) || null, [klanten, klantId])
  const contactpersonen = selectedKlant?.contactpersonen || []
  const vestigingen = selectedKlant?.vestigingen || []

  const filtered = useMemo(() => {
    if (!search.trim()) return klanten.slice(0, 8)
    const q = search.toLowerCase()
    return klanten
      .filter((k) =>
        k.bedrijfsnaam.toLowerCase().includes(q) ||
        k.contactpersoon.toLowerCase().includes(q) ||
        k.email.toLowerCase().includes(q)
      )
      .slice(0, 8)
  }, [klanten, search])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelectKlant(klant: Klant) {
    onKlantChange(klant.id, klant)
    setSearch('')
    setShowResults(false)
    setShowNieuwBedrijf(false)
    onContactpersoonChange?.('')
    onVestigingChange?.('')
  }

  function handleClearKlant() {
    onKlantChange('', null)
    onContactpersoonChange?.('')
    onVestigingChange?.('')
    setSearch('')
  }

  async function handleCreateBedrijf() {
    if (!nb.bedrijfsnaam.trim()) return
    setCreating(true)
    try {
      const cpArray: Contactpersoon[] = nb.contactpersoon.trim() ? [{
        id: crypto.randomUUID(),
        naam: nb.contactpersoon.trim(),
        functie: '',
        email: nb.email.trim(),
        telefoon: nb.telefoon.trim(),
        is_primair: true,
      }] : []

      const nieuw = await createKlant({
        bedrijfsnaam: nb.bedrijfsnaam.trim(),
        contactpersoon: nb.contactpersoon.trim(),
        email: nb.email.trim(),
        telefoon: nb.telefoon.trim(),
        adres: nb.adres.trim(),
        postcode: nb.postcode.trim(),
        stad: nb.stad.trim(),
        land: 'Nederland',
        website: nb.website.trim(),
        kvk_nummer: nb.kvk_nummer.trim(),
        btw_nummer: nb.btw_nummer.trim(),
        status: 'actief',
        tags: [],
        notities: '',
        contactpersonen: cpArray,
        user_id: user?.id || '',
      } as Omit<Klant, 'id' | 'created_at' | 'updated_at'>)

      onKlantenRefresh?.()
      onKlantChange(nieuw.id, nieuw)
      setNb({ bedrijfsnaam: '', contactpersoon: '', email: '', telefoon: '', adres: '', postcode: '', stad: '', website: '', kvk_nummer: '', btw_nummer: '' })
      setShowNieuwBedrijf(false)
      setShowUitgebreid(false)
      setShowResults(false)
      toast.success(`Bedrijf "${nieuw.bedrijfsnaam}" aangemaakt`)
    } catch {
      toast.error('Fout bij aanmaken bedrijf')
    } finally {
      setCreating(false)
    }
  }

  async function handleAddContact() {
    if (!selectedKlant || !nc.naam.trim()) return
    setCreating(true)
    try {
      const newCp: Contactpersoon = {
        id: crypto.randomUUID(),
        naam: nc.naam.trim(),
        functie: nc.functie.trim(),
        email: nc.email.trim(),
        telefoon: nc.telefoon.trim(),
        is_primair: (selectedKlant.contactpersonen?.length || 0) === 0,
      }
      const updatedCps = [...(selectedKlant.contactpersonen || []), newCp]
      await updateKlant(selectedKlant.id, { contactpersonen: updatedCps })
      onKlantenRefresh?.()
      onContactpersoonChange?.(newCp.id)
      setNc({ naam: '', functie: '', email: '', telefoon: '' })
      setShowNieuwContact(false)
      toast.success(`Contactpersoon "${newCp.naam}" toegevoegd`)
    } catch {
      toast.error('Fout bij toevoegen contactpersoon')
    } finally {
      setCreating(false)
    }
  }

  const inputStyle = { backgroundColor: '#FAFAF8', border: '0.5px solid #E6E4E0' }

  return (
    <div className="space-y-3">
      {/* Klant zoeken / selectie */}
      <div>
        <Label className="text-[11px] font-semibold mb-1.5 block uppercase tracking-wider" style={{ color: '#A0A098' }}>
          Klant
        </Label>

        {selectedKlant ? (
          <div className="rounded-lg p-3 flex items-center gap-2.5" style={{ backgroundColor: '#FAFAF8', border: '0.5px solid #E6E4E0' }}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1A535C] to-[#1A535C]/70 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-[10px]">{selectedKlant.bedrijfsnaam[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate" style={{ color: '#191919' }}>{selectedKlant.bedrijfsnaam}</p>
              <div className="flex items-center gap-3">
                {selectedKlant.email && <span className="text-[11px] truncate" style={{ color: '#5A5A55' }}>{selectedKlant.email}</span>}
                {selectedKlant.stad && <span className="text-[11px]" style={{ color: '#A0A098' }}>{selectedKlant.stad}</span>}
              </div>
            </div>
            <button
              className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors hover:bg-[#F4F2EE]"
              onClick={handleClearKlant}
            >
              <X className="h-3.5 w-3.5" style={{ color: '#A0A098' }} />
            </button>
          </div>
        ) : (
          <div ref={wrapperRef} className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#A0A098' }} />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShowResults(true); setShowNieuwBedrijf(false) }}
                onFocus={() => setShowResults(true)}
                placeholder="Zoek op bedrijfsnaam, contactpersoon of email..."
                className="pl-10 h-10 rounded-lg text-[13px]"
                style={inputStyle}
              />
            </div>

            {showResults && !showNieuwBedrijf && (
              <div className="absolute z-50 w-full mt-1 rounded-lg border bg-white shadow-lg max-h-[320px] overflow-y-auto" style={{ border: '0.5px solid #E6E4E0' }}>
                {/* Nieuw bedrijf optie */}
                <button
                  className="w-full text-left px-3 py-2.5 flex items-center gap-2 text-[#1A535C] hover:bg-[#E2F0F0]/50 transition-colors border-b"
                  style={{ borderColor: '#E6E4E0' }}
                  onClick={() => {
                    setShowNieuwBedrijf(true)
                    setNb((prev) => ({ ...prev, bedrijfsnaam: search }))
                  }}
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-[13px] font-medium">
                    Nieuw bedrijf toevoegen{search.trim() ? `: "${search.trim()}"` : ''}
                  </span>
                </button>

                {filtered.length === 0 ? (
                  <div className="py-4 text-center text-[13px]" style={{ color: '#A0A098' }}>
                    Geen klanten gevonden
                  </div>
                ) : (
                  filtered.map((klant) => (
                    <button
                      key={klant.id}
                      className="w-full text-left px-3 py-2 hover:bg-[#F4F2EE] transition-colors border-b last:border-0"
                      style={{ borderColor: '#E6E4E0' }}
                      onClick={() => handleSelectKlant(klant)}
                    >
                      <p className="text-[13px] font-medium" style={{ color: '#191919' }}>{klant.bedrijfsnaam}</p>
                      <div className="flex items-center gap-2">
                        {klant.contactpersoon && <span className="text-[11px]" style={{ color: '#5A5A55' }}>{klant.contactpersoon}</span>}
                        {klant.stad && <span className="text-[11px]" style={{ color: '#A0A098' }}>{klant.stad}</span>}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Nieuw bedrijf formulier (inline) */}
            {showNieuwBedrijf && (
              <div className="mt-2 rounded-lg p-4 space-y-3" style={{ border: '0.5px solid #E6E4E0', backgroundColor: '#FAFAF8' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-4 w-4" style={{ color: '#1A535C' }} />
                  <span className="text-[13px] font-semibold" style={{ color: '#191919' }}>Nieuw bedrijf</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    value={nb.bedrijfsnaam}
                    onChange={(e) => setNb({ ...nb, bedrijfsnaam: e.target.value })}
                    placeholder="Bedrijfsnaam *"
                    className="h-9 text-[13px] rounded-lg"
                    style={{ border: '0.5px solid #E6E4E0' }}
                    autoFocus
                  />
                  <Input
                    value={nb.stad}
                    onChange={(e) => setNb({ ...nb, stad: e.target.value })}
                    placeholder="Stad"
                    className="h-9 text-[13px] rounded-lg"
                    style={{ border: '0.5px solid #E6E4E0' }}
                  />
                </div>

                {/* Uitgebreid toggle */}
                <button
                  onClick={() => setShowUitgebreid(!showUitgebreid)}
                  className="flex items-center gap-1.5 text-[11px] font-medium transition-colors"
                  style={{ color: '#A0A098' }}
                >
                  {showUitgebreid ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {showUitgebreid ? 'Minder gegevens' : 'Meer gegevens (adres, KvK, etc.)'}
                </button>

                {showUitgebreid && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input value={nb.contactpersoon} onChange={(e) => setNb({ ...nb, contactpersoon: e.target.value })} placeholder="Contactpersoon" className="h-9 text-[13px] rounded-lg" style={{ border: '0.5px solid #E6E4E0' }} />
                    <Input value={nb.email} onChange={(e) => setNb({ ...nb, email: e.target.value })} placeholder="E-mail" className="h-9 text-[13px] rounded-lg" style={{ border: '0.5px solid #E6E4E0' }} />
                    <Input value={nb.telefoon} onChange={(e) => setNb({ ...nb, telefoon: e.target.value })} placeholder="Telefoon" className="h-9 text-[13px] rounded-lg" style={{ border: '0.5px solid #E6E4E0' }} />
                    <Input value={nb.adres} onChange={(e) => setNb({ ...nb, adres: e.target.value })} placeholder="Adres" className="h-9 text-[13px] rounded-lg" style={{ border: '0.5px solid #E6E4E0' }} />
                    <Input value={nb.postcode} onChange={(e) => setNb({ ...nb, postcode: e.target.value })} placeholder="Postcode" className="h-9 text-[13px] rounded-lg" style={{ border: '0.5px solid #E6E4E0' }} />
                    <Input value={nb.website} onChange={(e) => setNb({ ...nb, website: e.target.value })} placeholder="Website" className="h-9 text-[13px] rounded-lg" style={{ border: '0.5px solid #E6E4E0' }} />
                    <Input value={nb.kvk_nummer} onChange={(e) => setNb({ ...nb, kvk_nummer: e.target.value })} placeholder="KvK-nummer" className="h-9 text-[13px] rounded-lg" style={{ border: '0.5px solid #E6E4E0' }} />
                    <Input value={nb.btw_nummer} onChange={(e) => setNb({ ...nb, btw_nummer: e.target.value })} placeholder="BTW-nummer" className="h-9 text-[13px] rounded-lg" style={{ border: '0.5px solid #E6E4E0' }} />
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleCreateBedrijf}
                    disabled={!nb.bedrijfsnaam.trim() || creating}
                    className="h-8 px-3 text-[12px] font-semibold rounded-lg text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
                    style={{ backgroundColor: '#1A535C' }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {creating ? 'Aanmaken...' : 'Bedrijf aanmaken'}
                  </button>
                  <button
                    onClick={() => { setShowNieuwBedrijf(false); setShowResults(true) }}
                    className="h-8 px-3 text-[12px] font-medium rounded-lg"
                    style={{ color: '#5A5A55' }}
                  >
                    Annuleren
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contactpersoon */}
      {selectedKlant && onContactpersoonChange && (
        <div>
          <Label className="text-[11px] font-semibold mb-1.5 block uppercase tracking-wider" style={{ color: '#A0A098' }}>
            Contactpersoon
          </Label>

          {contactpersonen.length > 0 && (
            <div className="space-y-1 mb-2">
              {contactpersonen.map((cp) => (
                <button
                  key={cp.id}
                  onClick={() => onContactpersoonChange(cp.id)}
                  className="w-full text-left rounded-lg px-3 py-2 transition-all flex items-center gap-2"
                  style={{
                    border: contactpersoonId === cp.id ? '1px solid #1A535C' : '0.5px solid #E6E4E0',
                    backgroundColor: contactpersoonId === cp.id ? '#E2F0F0' : 'transparent',
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                    style={{
                      backgroundColor: contactpersoonId === cp.id ? '#1A535C' : '#EEEEED',
                      color: contactpersoonId === cp.id ? '#FFFFFF' : '#5A5A55',
                    }}
                  >
                    {cp.naam[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-medium" style={{ color: '#191919' }}>{cp.naam}</span>
                    {cp.functie && <span className="text-[11px] ml-1.5" style={{ color: '#A0A098' }}>({cp.functie})</span>}
                  </div>
                  {cp.is_primair && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#E2F0F0', color: '#1A535C' }}>
                      primair
                    </span>
                  )}
                  {contactpersoonId === cp.id && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#1A535C' }} />}
                </button>
              ))}
            </div>
          )}

          {!showNieuwContact ? (
            <button
              onClick={() => setShowNieuwContact(true)}
              className="w-full flex items-center gap-2 text-[11px] py-2 px-3 rounded-lg transition-colors hover:bg-[#FAFAF8]"
              style={{ border: '1px dashed #E6E4E0', color: '#A0A098' }}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Nieuwe contactpersoon toevoegen
            </button>
          ) : (
            <div className="rounded-lg p-3 space-y-2" style={{ border: '0.5px solid #E6E4E0', backgroundColor: '#FAFAF8' }}>
              <p className="text-[12px] font-semibold flex items-center gap-1.5" style={{ color: '#191919' }}>
                <UserPlus className="h-3.5 w-3.5" style={{ color: '#1A535C' }} />
                Nieuwe contactpersoon
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input value={nc.naam} onChange={(e) => setNc({ ...nc, naam: e.target.value })} placeholder="Naam *" className="h-9 text-[13px] rounded-lg" style={{ border: '0.5px solid #E6E4E0' }} autoFocus />
                <Input value={nc.functie} onChange={(e) => setNc({ ...nc, functie: e.target.value })} placeholder="Functie" className="h-9 text-[13px] rounded-lg" style={{ border: '0.5px solid #E6E4E0' }} />
                <Input value={nc.email} onChange={(e) => setNc({ ...nc, email: e.target.value })} placeholder="E-mailadres" type="email" className="h-9 text-[13px] rounded-lg" style={{ border: '0.5px solid #E6E4E0' }} />
                <Input value={nc.telefoon} onChange={(e) => setNc({ ...nc, telefoon: e.target.value })} placeholder="Telefoonnummer" className="h-9 text-[13px] rounded-lg" style={{ border: '0.5px solid #E6E4E0' }} />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleAddContact}
                  disabled={!nc.naam.trim() || creating}
                  className="h-7 px-3 text-[11px] font-semibold rounded-lg text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
                  style={{ backgroundColor: '#1A535C' }}
                >
                  <Plus className="h-3 w-3" />
                  Toevoegen
                </button>
                <button
                  onClick={() => { setShowNieuwContact(false); setNc({ naam: '', functie: '', email: '', telefoon: '' }) }}
                  className="h-7 px-3 text-[11px] font-medium rounded-lg"
                  style={{ color: '#5A5A55' }}
                >
                  Annuleren
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vestiging */}
      {selectedKlant && vestigingen.length > 0 && onVestigingChange && (
        <div>
          <Label className="text-[11px] font-semibold mb-1.5 block uppercase tracking-wider" style={{ color: '#A0A098' }}>
            Vestiging
          </Label>
          <div className="space-y-1">
            {vestigingen.map((v) => (
              <button
                key={v.id}
                onClick={() => onVestigingChange(vestigingId === v.id ? '' : v.id)}
                className="w-full text-left rounded-lg px-3 py-2 transition-all flex items-center gap-2"
                style={{
                  border: vestigingId === v.id ? '1px solid #1A535C' : '0.5px solid #E6E4E0',
                  backgroundColor: vestigingId === v.id ? '#E2F0F0' : 'transparent',
                }}
              >
                <span className="text-[13px]" style={{ color: '#191919' }}>{v.naam}</span>
                {v.stad && <span className="text-[11px]" style={{ color: '#A0A098' }}>({v.stad})</span>}
                {vestigingId === v.id && <Check className="w-3.5 h-3.5 ml-auto" style={{ color: '#1A535C' }} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
