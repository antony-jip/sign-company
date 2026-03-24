import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Users, Search, Link2, Building2, ChevronLeft, ChevronRight, Trash2, UserCheck, Plus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getContactpersonenDB,
  getKlanten,
  koppelContactAanKlant,
  createKlant,
  markeerAlsLosContact,
  bulkDeleteContactpersonen,
} from '@/services/supabaseService'
import type { ContactpersoonRecord, Klant } from '@/types'
import { toast } from 'sonner'
import { confirm } from '@/components/shared/ConfirmDialog'

interface LosseContactenProps {
  organisatieId: string
}

const PAGE_SIZE = 25

function parseBedrijfsnaamUitNotities(notities: string): string {
  const match = notities.match(/Import: bedrijfsnaam '(.+)'/)
  return match ? match[1] : ''
}

export function LosseContacten({ organisatieId }: LosseContactenProps) {
  const { user } = useAuth()
  const [contacten, setContacten] = useState<ContactpersoonRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  // Koppel dialog state
  const [koppelDialogOpen, setKoppelDialogOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<ContactpersoonRecord | null>(null)
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [koppelSearch, setKoppelSearch] = useState('')
  const [selectedKlant, setSelectedKlant] = useState<Klant | null>(null)
  const [koppelLoading, setKoppelLoading] = useState(false)

  // Nieuw bedrijf inline state
  const [showNieuwBedrijf, setShowNieuwBedrijf] = useState(false)
  const [nieuwBedrijfsnaam, setNieuwBedrijfsnaam] = useState('')
  const [nieuwStad, setNieuwStad] = useState('')

  useEffect(() => {
    loadContacten()
  }, [organisatieId])

  async function loadContacten() {
    try {
      setLoading(true)
      const alle = await getContactpersonenDB(organisatieId)
      setContacten(alle.filter((c) => c.klant_id === null && !c.notities.startsWith('[LOS_CONTACT]')))
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return contacten
    const q = searchQuery.toLowerCase()
    return contacten.filter(
      (c) =>
        c.voornaam.toLowerCase().includes(q) ||
        c.achternaam.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        parseBedrijfsnaamUitNotities(c.notities).toLowerCase().includes(q)
    )
  }, [contacten, searchQuery])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Reset page when search changes
  useEffect(() => {
    setPage(0)
  }, [searchQuery])

  // Selection helpers
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === paged.length && paged.every((c) => selectedIds.has(c.id))) {
      // Deselect all on current page
      setSelectedIds((prev) => {
        const next = new Set(prev)
        paged.forEach((c) => next.delete(c.id))
        return next
      })
    } else {
      // Select all on current page
      setSelectedIds((prev) => {
        const next = new Set(prev)
        paged.forEach((c) => next.add(c.id))
        return next
      })
    }
  }

  const allPageSelected = paged.length > 0 && paged.every((c) => selectedIds.has(c.id))

  async function handleBulkLosOpslaan() {
    if (selectedIds.size === 0) return
    const confirmed = await confirm({
      message: `${selectedIds.size} contact${selectedIds.size === 1 ? '' : 'en'} als los contact opslaan? Ze verdwijnen uit deze lijst maar blijven beschikbaar in het systeem.`,
    })
    if (!confirmed) return
    setBulkLoading(true)
    try {
      await markeerAlsLosContact([...selectedIds])
      setContacten((prev) => prev.filter((c) => !selectedIds.has(c.id)))
      toast.success(`${selectedIds.size} contact${selectedIds.size === 1 ? '' : 'en'} opgeslagen als los contact`)
      setSelectedIds(new Set())
    } catch {
      toast.error('Fout bij opslaan als los contact')
    } finally {
      setBulkLoading(false)
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    const confirmed = await confirm({
      message: `Weet je zeker dat je ${selectedIds.size} contact${selectedIds.size === 1 ? '' : 'en'} wilt verwijderen? Dit kan niet ongedaan worden.`,
      variant: 'destructive',
      confirmLabel: 'Verwijderen',
    })
    if (!confirmed) return
    setBulkLoading(true)
    try {
      await bulkDeleteContactpersonen([...selectedIds])
      setContacten((prev) => prev.filter((c) => !selectedIds.has(c.id)))
      toast.success(`${selectedIds.size} contact${selectedIds.size === 1 ? '' : 'en'} verwijderd`)
      setSelectedIds(new Set())
    } catch {
      toast.error('Fout bij verwijderen')
    } finally {
      setBulkLoading(false)
    }
  }

  async function handleDeleteAlleLosse() {
    if (contacten.length === 0) return
    const confirmed = await confirm({
      message: `Weet je zeker dat je alle ${contacten.length} losse contacten wilt verwijderen? Dit kan niet ongedaan worden.`,
      variant: 'destructive',
      confirmLabel: 'Verwijderen',
    })
    if (!confirmed) return
    setBulkLoading(true)
    try {
      await bulkDeleteContactpersonen(contacten.map((c) => c.id))
      setContacten([])
      setSelectedIds(new Set())
      toast.success(`Alle ${contacten.length} losse contacten verwijderd`)
    } catch {
      toast.error('Fout bij verwijderen van contacten')
    } finally {
      setBulkLoading(false)
    }
  }

  async function openKoppelDialog(contact: ContactpersoonRecord) {
    setSelectedContact(contact)
    setKoppelSearch('')
    setSelectedKlant(null)
    setShowNieuwBedrijf(false)
    setNieuwBedrijfsnaam('')
    setNieuwStad('')
    setKoppelDialogOpen(true)
    try {
      const allKlanten = await getKlanten()
      setKlanten(allKlanten)
    } catch {
      toast.error('Fout bij ophalen bedrijven')
    }
  }

  async function handleKoppel() {
    if (!selectedContact || !selectedKlant) return
    setKoppelLoading(true)
    try {
      await koppelContactAanKlant(selectedContact.id, selectedKlant.id)
      setContacten((prev) => prev.filter((c) => c.id !== selectedContact.id))
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(selectedContact.id); return next })
      setKoppelDialogOpen(false)
      toast.success(`${selectedContact.voornaam} ${selectedContact.achternaam} gekoppeld aan ${selectedKlant.bedrijfsnaam}`)
    } catch {
      toast.error('Fout bij koppelen')
    } finally {
      setKoppelLoading(false)
    }
  }

  async function handleNieuwBedrijfEnKoppel() {
    if (!selectedContact || !nieuwBedrijfsnaam.trim()) return
    setKoppelLoading(true)
    try {
      const nieuwKlant = await createKlant({
        bedrijfsnaam: nieuwBedrijfsnaam.trim(),
        organisatie_id: organisatieId,
        user_id: user?.id || '',
        import_bron: 'csv_import',
        status: 'actief',
        contactpersoon: `${selectedContact.voornaam} ${selectedContact.achternaam}`.trim(),
        email: selectedContact.email || '',
        telefoon: selectedContact.telefoon || '',
        adres: '',
        postcode: '',
        stad: nieuwStad.trim(),
        land: 'Nederland',
        website: '',
        kvk_nummer: '',
        btw_nummer: '',
        tags: [],
        notities: '',
        contactpersonen: [],
      } as Omit<Klant, 'id' | 'created_at' | 'updated_at'>)
      await koppelContactAanKlant(selectedContact.id, nieuwKlant.id)
      setContacten((prev) => prev.filter((c) => c.id !== selectedContact.id))
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(selectedContact.id); return next })
      setKoppelDialogOpen(false)
      toast.success(`Bedrijf "${nieuwBedrijfsnaam.trim()}" aangemaakt en ${selectedContact.voornaam} gekoppeld`)
    } catch {
      toast.error('Fout bij aanmaken bedrijf')
    } finally {
      setKoppelLoading(false)
    }
  }

  async function handleNieuwBedrijf(contact: ContactpersoonRecord) {
    const bedrijfsnaam = parseBedrijfsnaamUitNotities(contact.notities)
    if (!bedrijfsnaam) {
      toast.error('Geen bedrijfsnaam beschikbaar')
      return
    }
    try {
      const nieuwKlant = await createKlant({
        bedrijfsnaam,
        organisatie_id: organisatieId,
        user_id: user?.id || '',
        import_bron: 'csv_import',
        status: 'actief',
        contactpersoon: `${contact.voornaam} ${contact.achternaam}`.trim(),
        email: contact.email || '',
        telefoon: contact.telefoon || '',
        adres: '',
        postcode: '',
        stad: '',
        land: 'Nederland',
        website: '',
        kvk_nummer: '',
        btw_nummer: '',
        tags: [],
        notities: '',
        contactpersonen: [],
      } as Omit<Klant, 'id' | 'created_at' | 'updated_at'>)
      await koppelContactAanKlant(contact.id, nieuwKlant.id)
      setContacten((prev) => prev.filter((c) => c.id !== contact.id))
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(contact.id); return next })
      toast.success(`Bedrijf "${bedrijfsnaam}" aangemaakt en ${contact.voornaam} gekoppeld`)
    } catch {
      toast.error('Fout bij aanmaken bedrijf')
    }
  }

  const filteredKlanten = useMemo(() => {
    if (!koppelSearch.trim()) return klanten
    const q = koppelSearch.toLowerCase()
    return klanten.filter(
      (k) =>
        k.bedrijfsnaam.toLowerCase().includes(q) ||
        k.contactpersoon.toLowerCase().includes(q) ||
        k.email.toLowerCase().includes(q)
    )
  }, [klanten, koppelSearch])

  // Verberg hele sectie als er geen losse contacten zijn
  if (!loading && contacten.length === 0) return null

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              Losse contacten
              {contacten.length > 0 && (
                <Badge variant="secondary" className="ml-1 font-mono text-xs">
                  {contacten.length}
                </Badge>
              )}
            </CardTitle>
            {contacten.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-destructive"
                onClick={handleDeleteAlleLosse}
                disabled={bulkLoading}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Alle verwijderen
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Contactpersonen die niet automatisch aan een bedrijf gekoppeld konden worden.
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground py-4 text-center">Laden...</div>
          ) : (
            <>
              {/* Zoekbalk */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek op naam, email of bedrijfsnaam..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Bulk actiebalk */}
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 mb-4 p-3 bg-muted/50 rounded-lg border">
                  <span className="text-sm font-medium">
                    {selectedIds.size} geselecteerd
                  </span>
                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleBulkLosOpslaan}
                      disabled={bulkLoading}
                    >
                      <UserCheck className="w-3 h-3 mr-1" />
                      Als los contact opslaan ({selectedIds.size})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={handleBulkDelete}
                      disabled={bulkLoading}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Verwijderen ({selectedIds.size})
                    </Button>
                    <button
                      className="text-muted-foreground hover:text-foreground ml-1"
                      onClick={() => setSelectedIds(new Set())}
                    >
                      &times;
                    </button>
                  </div>
                </div>
              )}

              {/* Tabel */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 pr-2 w-8">
                        <input
                          type="checkbox"
                          checked={allPageSelected}
                          onChange={toggleSelectAll}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="text-left py-2 pr-3 text-xs font-medium text-muted-foreground">Voornaam</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Achternaam</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Email</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Telefoon</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Bedrijfsnaam</th>
                      <th className="text-right py-2 pl-3 text-xs font-medium text-muted-foreground">Acties</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-sm text-muted-foreground">
                          Geen resultaten gevonden.
                        </td>
                      </tr>
                    ) : (
                      paged.map((contact) => {
                        const bedrijfsnaam = parseBedrijfsnaamUitNotities(contact.notities)
                        return (
                          <tr key={contact.id} className="border-b last:border-0">
                            <td className="py-2.5 pr-2">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(contact.id)}
                                onChange={() => toggleSelect(contact.id)}
                                className="rounded border-gray-300"
                              />
                            </td>
                            <td className="py-2.5 pr-3 text-sm">{contact.voornaam}</td>
                            <td className="py-2.5 px-3 text-sm">{contact.achternaam}</td>
                            <td className="py-2.5 px-3 text-sm text-muted-foreground truncate max-w-[200px]">{contact.email}</td>
                            <td className="py-2.5 px-3 text-sm text-muted-foreground hidden md:table-cell">{contact.telefoon}</td>
                            <td className="py-2.5 px-3 text-sm text-muted-foreground hidden lg:table-cell italic">
                              {bedrijfsnaam || '-'}
                            </td>
                            <td className="py-2.5 pl-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => openKoppelDialog(contact)}
                                >
                                  <Link2 className="w-3 h-3 mr-1" />
                                  Koppelen
                                </Button>
                                {bedrijfsnaam && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => handleNieuwBedrijf(contact)}
                                  >
                                    <Building2 className="w-3 h-3 mr-1" />
                                    Nieuw bedrijf
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginering */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <span className="text-xs text-muted-foreground">
                    {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} van {filtered.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Koppel Dialog */}
      <Dialog open={koppelDialogOpen} onOpenChange={setKoppelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Contact koppelen aan bedrijf
            </DialogTitle>
            {selectedContact && (
              <p className="text-sm text-muted-foreground">
                {selectedContact.voornaam} {selectedContact.achternaam}
              </p>
            )}
          </DialogHeader>

          {!showNieuwBedrijf ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek bedrijf..."
                  value={koppelSearch}
                  onChange={(e) => setKoppelSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="max-h-64 overflow-y-auto border rounded-md">
                {/* Nieuw bedrijf aanmaken optie */}
                <button
                  className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors border-b flex items-center gap-2 text-primary"
                  onClick={() => {
                    setShowNieuwBedrijf(true)
                    setNieuwBedrijfsnaam(koppelSearch)
                  }}
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Nieuw bedrijf aanmaken{koppelSearch.trim() ? `: "${koppelSearch.trim()}"` : ''}
                  </span>
                </button>

                {filteredKlanten.length === 0 ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    Geen bedrijven gevonden.
                  </div>
                ) : (
                  filteredKlanten.map((klant) => (
                    <button
                      key={klant.id}
                      className={`w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors border-b last:border-0 ${
                        selectedKlant?.id === klant.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                      }`}
                      onClick={() => setSelectedKlant(klant)}
                    >
                      <div className="text-sm font-medium">{klant.bedrijfsnaam}</div>
                      {klant.contactpersoon && (
                        <div className="text-xs text-muted-foreground">{klant.contactpersoon}</div>
                      )}
                    </button>
                  ))
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setKoppelDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button
                  onClick={handleKoppel}
                  disabled={!selectedKlant || koppelLoading}
                >
                  {koppelLoading ? 'Koppelen...' : 'Koppelen'}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Bedrijfsnaam *</label>
                <Input
                  placeholder="Bijv. Bakkerij De Gouden Korenaar"
                  value={nieuwBedrijfsnaam}
                  onChange={(e) => setNieuwBedrijfsnaam(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Stad</label>
                <Input
                  placeholder="Bijv. Amsterdam"
                  value={nieuwStad}
                  onChange={(e) => setNieuwStad(e.target.value)}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNieuwBedrijf(false)}>
                  Terug
                </Button>
                <Button
                  onClick={handleNieuwBedrijfEnKoppel}
                  disabled={!nieuwBedrijfsnaam.trim() || koppelLoading}
                >
                  {koppelLoading ? 'Aanmaken...' : 'Aanmaken & koppelen'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
