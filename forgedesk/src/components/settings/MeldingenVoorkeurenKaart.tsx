import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { useFunctie } from '@/hooks/useFunctie'
import { MELDING_CATEGORIEEN, categorieToegestaan, type MeldingKanaal, type Meldingsvoorkeuren } from '@/lib/meldingsvoorkeuren'

/**
 * Per categorie twee schakelaars: in de app en als push. Staat op
 * profiles.meldingsvoorkeuren, dus persoonlijk. Push volgt daarnaast de
 * toestelschakelaar in PushMeldingenKaart; hier kies je alleen wát er komt.
 */
export function MeldingenVoorkeurenKaart() {
  const aan = useFunctie('meldingen_voorkeuren')
  const { profile, updateUserProfile } = useAppSettings()
  const [lokaal, setLokaal] = useState<Meldingsvoorkeuren | null>(null)
  const voorkeuren = lokaal ?? profile?.meldingsvoorkeuren ?? {}

  const wissel = useCallback(async (categorie: string, kanaal: MeldingKanaal, stand: boolean) => {
    const huidig = lokaal ?? profile?.meldingsvoorkeuren ?? {}
    const volgende: Meldingsvoorkeuren = { ...huidig, [categorie]: { ...huidig[categorie], [kanaal]: stand } }
    setLokaal(volgende)
    try {
      await updateUserProfile({ meldingsvoorkeuren: volgende })
    } catch (err) {
      logger.error('[meldingsvoorkeuren] opslaan mislukt:', err)
      setLokaal(huidig)
      toast.error('Kon de voorkeur niet opslaan')
    }
  }, [lokaal, profile?.meldingsvoorkeuren, updateUserProfile])

  if (!aan || !profile) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5" />
          Welke meldingen je krijgt
        </CardTitle>
        <CardDescription>
          Per onderwerp: in de app (het belletje) en als push op je toestel. Geldt alleen voor jou.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4">
          <div />
          <span className="w-11 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">App</span>
          <span className="w-11 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Push</span>
          {MELDING_CATEGORIEEN.map((cat) => (
            <div key={cat.id} className="contents">
              <div className="min-h-[44px] py-2 border-t border-border min-w-0">
                <p className="text-sm font-medium text-foreground">{cat.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{cat.uitleg}</p>
              </div>
              <div className="min-h-[44px] flex items-center justify-center border-t border-border">
                <Switch
                  aria-label={`${cat.label} in de app`}
                  checked={categorieToegestaan(voorkeuren, cat.id, 'app')}
                  onCheckedChange={(v) => void wissel(cat.id, 'app', v === true)}
                />
              </div>
              <div className="min-h-[44px] flex items-center justify-center border-t border-border">
                <Switch
                  aria-label={`${cat.label} als push`}
                  checked={categorieToegestaan(voorkeuren, cat.id, 'push')}
                  onCheckedChange={(v) => void wissel(cat.id, 'push', v === true)}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
