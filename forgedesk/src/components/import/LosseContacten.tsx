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
import { Users, Search, Link2, Building2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getContactpersonenDB,
  getKlanten,
  koppelContactAanKlant,
  createKlant,
} from '@/services/supabaseService'
import type { ContactpersoonRecord, Klant } from '@/types'
import { toast } from 'sonner'

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

  // Koppel dialog state
  const [koppelDialogOpen, setKoppelDialogOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<ContactpersoonRecord | null>(null)
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [koppelSearch, setKoppelSearch] = useState('')
  const [selectedKlant, setSelectedKlant] = useState<Klant | null>(null)
  const [koppelLoading, setKoppelLoading] = useState(false)

  useEffect(() => {
    loadContacten()
  }, [organisatieId])

  async function loadContacten() {
    try {
      setLoading(true)
      const alle = await getContactpersonenDB(organisatieId)
      setContacten(alle.filter((c) => c.klant_id === null))
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

  async function openKoppelDialog(contact: ContactpersoonRecord) {
    setSelectedContact(contact)
    setKoppelSearch('')
    setSelectedKlant(null)
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
      setKoppelDialogOpen(false)
      toast.success(`${selectedContact.voornaam} ${selectedContact.achternaam} gekoppeld aan ${selectedKlant.bedrijfsnaam}`)
    } catch {
      toast.error('Fout bij koppelen')
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
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            Losse contacten
            {contacten.length > 0 && (
              <Badge variant="secondary" className="ml-1 font-mono text-xs">
                {contacten.length}
              </Badge>
            )}
          </CardTitle>
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

              {/* Tabel */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
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
                        <td colSpan={6} className="py-4 text-center text-sm text-muted-foreground">
                          Geen resultaten gevonden.
                        </td>
                      </tr>
                    ) : (
                      paged.map((contact) => {
                        const bedrijfsnaam = parseBedrijfsnaamUitNotities(contact.notities)
                        return (
                          <tr key={contact.id} className="border-b last:border-0">
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
        </DialogContent>
      </Dialog>
    </>
  )
}
