import { useState, useCallback } from 'react'
import { Search, Loader2, Building2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import type { KvkResultaat } from '@/types'

// ─── Mock KvK resultaten (fallback als geen API is geconfigureerd) ──

const MOCK_RESULTATEN: KvkResultaat[] = [
  { kvk_nummer: '12345678', bedrijfsnaam: 'Signbedrijf De Vries B.V.', adres: 'Industrieweg 12', postcode: '1234 AB', stad: 'Amsterdam', btw_nummer: 'NL123456789B01' },
  { kvk_nummer: '87654321', bedrijfsnaam: 'Reclame & Sign Solutions', adres: 'Kerkstraat 45', postcode: '5678 CD', stad: 'Rotterdam', btw_nummer: 'NL987654321B01' },
  { kvk_nummer: '11223344', bedrijfsnaam: 'PrintWorks Nederland', adres: 'Havenweg 8', postcode: '3456 EF', stad: 'Utrecht', btw_nummer: 'NL112233445B01' },
  { kvk_nummer: '55667788', bedrijfsnaam: 'Visuals & More B.V.', adres: 'Stationsplein 3', postcode: '7890 GH', stad: 'Den Haag', btw_nummer: 'NL556677889B01' },
  { kvk_nummer: '99001122', bedrijfsnaam: 'LED Displays Holland', adres: 'Lichtweg 22', postcode: '2345 IJ', stad: 'Eindhoven', btw_nummer: 'NL990011223B01' },
]

interface KvkZoekVeldProps {
  kvkNummer: string
  onKvkChange: (kvk: string) => void
  onResultSelect: (result: KvkResultaat) => void
}

export function KvkZoekVeld({ kvkNummer, onKvkChange, onResultSelect }: KvkZoekVeldProps) {
  const { settings } = useAppSettings()
  const [zoekDialogOpen, setZoekDialogOpen] = useState(false)
  const [zoekQuery, setZoekQuery] = useState('')
  const [resultaten, setResultaten] = useState<KvkResultaat[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const handleSearch = useCallback(async () => {
    if (!zoekQuery.trim()) return
    setIsSearching(true)

    try {
      if (settings.kvk_api_enabled && settings.kvk_api_key) {
        // Real API call would go here
        // For now, simulate with delay + mock data
        await new Promise((r) => setTimeout(r, 600))
        const q = zoekQuery.toLowerCase()
        const results = MOCK_RESULTATEN.filter(
          (r) => r.bedrijfsnaam.toLowerCase().includes(q) || r.kvk_nummer.includes(q)
        )
        setResultaten(results)
      } else {
        // Fallback: zoek in mock data
        await new Promise((r) => setTimeout(r, 300))
        const q = zoekQuery.toLowerCase()
        const results = MOCK_RESULTATEN.filter(
          (r) => r.bedrijfsnaam.toLowerCase().includes(q) || r.kvk_nummer.includes(q)
        )
        setResultaten(results)
      }
    } catch {
      toast.error('Fout bij zoeken in KvK register')
      setResultaten([])
    } finally {
      setIsSearching(false)
    }
  }, [zoekQuery, settings.kvk_api_enabled, settings.kvk_api_key])

  const handleSelect = useCallback((result: KvkResultaat) => {
    onKvkChange(result.kvk_nummer)
    onResultSelect(result)
    setZoekDialogOpen(false)
    setZoekQuery('')
    setResultaten([])
    toast.success(`Gegevens ingevuld van ${result.bedrijfsnaam}`)
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
            {!settings.kvk_api_enabled && (
              <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 px-3 py-2 rounded-lg">
                KvK API niet geconfigureerd — demogegevens worden gebruikt.
                Configureer in Instellingen → Integraties.
              </p>
            )}

            <div className="flex gap-2">
              <Input
                value={zoekQuery}
                onChange={(e) => setZoekQuery(e.target.value)}
                placeholder="Zoek op bedrijfsnaam of KvK nummer..."
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                autoFocus
              />
              <Button onClick={handleSearch} disabled={isSearching || !zoekQuery.trim()}>
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {/* Resultaten */}
            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {resultaten.length === 0 && !isSearching && zoekQuery && (
                <p className="text-sm text-muted-foreground text-center py-6">Geen resultaten gevonden</p>
              )}
              {resultaten.map((r) => (
                <button
                  key={r.kvk_nummer}
                  onClick={() => handleSelect(r)}
                  className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold">{r.bedrijfsnaam}</p>
                      <p className="text-xs text-muted-foreground">{r.adres}, {r.postcode} {r.stad}</p>
                      <div className="flex gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">KvK: {r.kvk_nummer}</span>
                        {r.btw_nummer && <span className="text-xs text-muted-foreground">BTW: {r.btw_nummer}</span>}
                      </div>
                    </div>
                    <CheckCircle className="h-4 w-4 text-emerald-500 mt-1 opacity-0 group-hover:opacity-100" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
