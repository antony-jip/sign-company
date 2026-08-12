import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { isAdminUser } from '@/utils/authHelpers'
import supabase from '@/services/supabaseClient'
import { downloadBlob } from '@/lib/export'
import { toast } from 'sonner'
import { logger } from '../../utils/logger'

/**
 * Uitvoer van alle organisatiegegevens (AVG artikel 15 en 20).
 *
 * Alleen voor admins, want dit is de hele klantenbase in één bestand. De
 * server controleert dat nog een keer; dit is alleen de knop weglaten
 * voor wie er niets mee kan.
 */
export function DataExportKaart() {
  const { userRol } = useAuth()
  const [isBezig, setIsBezig] = useState(false)

  if (!isAdminUser(userRol)) return null

  const handleDownload = async () => {
    if (!supabase) {
      toast.error('Supabase niet geconfigureerd')
      return
    }
    setIsBezig(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('Je bent niet ingelogd')
        return
      }

      const res = await fetch('/api/org-export', {
        method: 'GET',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      const tekst = await res.text()

      if (!res.ok) {
        let melding = `Uitvoer mislukt (${res.status})`
        try {
          const fout = JSON.parse(tekst)
          if (fout?.error) melding = fout.error
        } catch {
          // Geen JSON terug: de statuscode is dan alles wat we hebben.
        }
        toast.error(melding)
        return
      }

      const datum = new Date().toISOString().slice(0, 10)
      downloadBlob(new Blob([tekst], { type: 'application/json' }), `doen-gegevens-${datum}.json`)

      let aantal: number | null = null
      try {
        aantal = JSON.parse(tekst)?.totaal_rijen ?? null
      } catch {
        // Het bestand is al gedownload; het aantal is alleen voor de melding.
      }
      toast.success(
        aantal === null
          ? <>Gedownload<span className="text-flame">.</span></>
          : <>{aantal.toLocaleString('nl-NL')} regels gedownload<span className="text-flame">.</span></>
      )
    } catch (err) {
      logger.error('Gegevensuitvoer mislukt:', err)
      toast.error('Er ging iets mis bij het maken van de uitvoer')
    } finally {
      setIsBezig(false)
    }
  }

  return (
    <Card className="mt-6 rounded-xl">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">Al je gegevens downloaden</h3>
            <p className="text-sm text-muted-foreground">
              Eén JSON-bestand met alles wat er van je organisatie in doen. staat: klanten,
              projecten, offertes, facturen, werkbonnen, planning en instellingen.
              Wachtwoorden en toegangssleutels blijven eruit.
            </p>
            <p className="text-[13px] text-muted-foreground/80">
              Je gesynchroniseerde mailbox en de bestanden in de opslag zitten er niet in.
              Die vraag je aan via een bericht aan de support.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={isBezig}
            className="border-petrol/30 text-petrol hover:bg-petrol/5 dark:border-petrol/40 dark:hover:bg-petrol/10 flex-shrink-0"
          >
            {isBezig ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-2 h-3.5 w-3.5" />}
            {isBezig ? 'Bezig...' : 'Downloaden'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
