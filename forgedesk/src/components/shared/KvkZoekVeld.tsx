import { useState, useCallback, useRef, useEffect } from 'react'
import { Search, Loader2, Building2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import supabase from '@/services/supabaseClient'
import type { KvkResultaat } from '@/types'

// ─── Mock KvK resultaten (fallback als geen API is geconfigureerd) ──

const MOCK_RESULTATEN: KvkResultaat[] = [
  { kvk_nummer: '12345678', bedrijfsnaam: 'Signbedrijf De Vries B.V.', adres: 'Industrieweg 12', postcode: '1234 AB', stad: 'Amsterdam', btw_nummer: 'NL123456789B01' },
  { kvk_nummer: '87654321', bedrijfsnaam: 'Reclame & Sign Solutions', adres: 'Kerkstraat 45', postcode: '5678 CD', stad: 'Rotterdam', btw_nummer: 'NL987654321B01' },
  { kvk_nummer: '11223344', bedrijfsnaam: 'PrintWorks Nederland', adres: 'Havenweg 8', postcode: '3456 EF', stad: 'Utrecht', btw_nummer: 'NL112233445B01' },
  { kvk_nummer: '55667788', bedrijfsnaam: 'Visuals & More B.V.', adres: 'Stationsplein 3', postcode: '7890 GH', stad: 'Den Haag', btw_nummer: 'NL556677889B01' },
  { kvk_nummer: '99001122', bedrijfsnaam: 'LED Displays Holland', adres: 'Lichtweg 22', postcode: '2345 IJ', stad: 'Eindhoven', btw_nummer: 'NL990011223B01' },
]

async function getAuthToken(): Promise<string> {
  if (!supabase) throw new Error('Supabase niet geconfigureerd')
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Niet ingelogd')
  return session.access_token
}

interface KvkApiZoekResultaat {
  kvkNummer: string
  naam: string
  adres: { straat: string; plaats: string }
  postcode: string
  type: string
  vestigingsnummer?: string
}

interface KvkApiBasisProfiel {
  kvkNummer: string
  naam: string
  rechtsvorm: string
  adres: { straat: string; huisnummer: string; postcode: string; stad: string }
  actief: boolean
}

interface KvkZoekVeldProps {
  kvkNummer: string
  onKvkChange: (kvk: string) => void
  onResultSelect: (result: KvkResultaat) => void
}

export function KvkZoekVeld({ kvkNummer, onKvkChange, onResultSelect }: KvkZoekVeldProps) {
  const { settings } = useAppSettings()
  const [zoekDialogOpen, setZoekDialogOpen] = useState(false)
  const [zoekQuery, setZoekQuery] = useState('')
  const [resultaten, setResultaten] = useState<KvkApiZoekResultaat[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [isLoadingProfiel, setIsLoadingProfiel] = useState(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isApiAvailable = !!(settings.kvk_api_enabled || settings.kvk_api_key)

  const searchApi = useCallback(async (query: string) => {
    if (query.length < 3) {
      setResultaten([])
      setHasSearched(false)
      return
    }

    setIsSearching(true)
    setHasSearched(true)

    try {
      const token = await getAuthToken()
      const isKvkNummer = /^\d{8}$/.test(query.trim())
      const param = isKvkNummer ? `kvknummer=${query.trim()}` : `q=${encodeURIComponent(query)}`

      const response = await fetch(`/api/kvk-zoeken?${param}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Fout bij zoeken' }))
        throw new Error(err.error || 'KvK zoeken mislukt')
      }

      const data = await response.json() as { resultaten: KvkApiZoekResultaat[] }
      setResultaten(data.resultaten || [])
    } catch (err) {
      console.error('KvK zoeken error:', err)
      // Fallback naar mock data
      const q = query.toLowerCase()
      const mockResults = MOCK_RESULTATEN.filter(
        (r) => r.bedrijfsnaam.toLowerCase().includes(q) || r.kvk_nummer.includes(q)
      ).map((r) => ({
        kvkNummer: r.kvk_nummer,
        naam: r.bedrijfsnaam,
        adres: { straat: r.adres || '', plaats: r.stad || '' },
        postcode: r.postcode || '',
        type: '',
      }))
      setResultaten(mockResults)
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Debounced search — 400ms na stoppen met typen
  useEffect(() => {
    if (!zoekDialogOpen) return
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    if (zoekQuery.length >= 3) {
      debounceTimer.current = setTimeout(() => searchApi(zoekQuery), 400)
    } else {
      setResultaten([])
      setHasSearched(false)
    }
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current) }
  }, [zoekQuery, zoekDialogOpen, searchApi])

  const handleSelect = useCallback(async (result: KvkApiZoekResultaat) => {
    setIsLoadingProfiel(true)
    try {
      const token = await getAuthToken()
      const response = await fetch(`/api/kvk-basisprofiel?kvknummer=${result.kvkNummer}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (response.ok) {
        const profiel = await response.json() as KvkApiBasisProfiel
        const adresStr = [profiel.adres.straat, profiel.adres.huisnummer].filter(Boolean).join(' ')
        onKvkChange(profiel.kvkNummer)
        onResultSelect({
          kvk_nummer: profiel.kvkNummer,
          bedrijfsnaam: profiel.naam,
          adres: adresStr,
          postcode: profiel.adres.postcode,
          stad: profiel.adres.stad,
        })
        toast.success(`Gegevens ingevuld van ${profiel.naam}`)
      } else {
        // Fallback: gebruik zoekresultaat direct
        onKvkChange(result.kvkNummer)
        onResultSelect({
          kvk_nummer: result.kvkNummer,
          bedrijfsnaam: result.naam,
          adres: result.adres.straat,
          stad: result.adres.plaats,
          postcode: result.postcode,
        })
        toast.success(`Gegevens ingevuld van ${result.naam}`)
      }
    } catch {
      // Fallback bij netwerk error
      onKvkChange(result.kvkNummer)
      onResultSelect({
        kvk_nummer: result.kvkNummer,
        bedrijfsnaam: result.naam,
        adres: result.adres.straat,
        stad: result.adres.plaats,
        postcode: result.postcode,
      })
      toast.success(`Gegevens ingevuld van ${result.naam}`)
    } finally {
      setIsLoadingProfiel(false)
      setZoekDialogOpen(false)
      setZoekQuery('')
      setResultaten([])
      setHasSearched(false)
    }
  }, [onKvkChange, onResultSelect])

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="kvk_nummer">KvK Nummer</Label>
        <div className="flex gap-2">
          <Input
            id="kvk_nummer"
            value={kvkNummer}
            onChange={(e) => onKvkChange(e.target.value)}
            placeholder="12345678"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => { setZoekDialogOpen(true); setZoekQuery(kvkNummer || '') }}
            title="KvK opzoeken"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Zoek dialog */}
      <Dialog open={zoekDialogOpen} onOpenChange={setZoekDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              KvK Opzoeken
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!isApiAvailable && (
              <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 px-3 py-2 rounded-lg">
                KvK API niet geconfigureerd — demogegevens worden gebruikt.
                Configureer in Instellingen &rarr; Integraties.
              </p>
            )}

            <div className="flex gap-2">
              <Input
                value={zoekQuery}
                onChange={(e) => setZoekQuery(e.target.value)}
                placeholder="Zoek op bedrijfsnaam of KvK nummer (min. 3 tekens)..."
                onKeyDown={(e) => e.key === 'Enter' && zoekQuery.length >= 3 && searchApi(zoekQuery)}
                autoFocus
              />
              <Button
                onClick={() => searchApi(zoekQuery)}
                disabled={isSearching || zoekQuery.length < 3}
              >
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {/* Loading profiel overlay */}
            {isLoadingProfiel && (
              <div className="flex items-center justify-center py-4 gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Bedrijfsgegevens ophalen...
              </div>
            )}

            {/* Resultaten */}
            {!isLoadingProfiel && (
              <div className="max-h-[300px] overflow-y-auto space-y-1">
                {resultaten.length === 0 && !isSearching && hasSearched && (
                  <p className="text-sm text-muted-foreground text-center py-6">Geen resultaten gevonden</p>
                )}
                {resultaten.map((r) => (
                  <button
                    key={`${r.kvkNummer}-${r.vestigingsnummer || ''}`}
                    onClick={() => handleSelect(r)}
                    className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold">{r.naam}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.adres.straat}{r.adres.straat && r.adres.plaats ? ', ' : ''}{r.postcode ? `${r.postcode} ` : ''}{r.adres.plaats}
                        </p>
                        <div className="flex gap-3 mt-1">
                          <span className="text-xs text-muted-foreground">KvK: {r.kvkNummer}</span>
                          {r.type && <span className="text-xs text-muted-foreground">{r.type}</span>}
                        </div>
                      </div>
                      <CheckCircle className="h-4 w-4 text-emerald-500 mt-1 opacity-0 group-hover:opacity-100" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
