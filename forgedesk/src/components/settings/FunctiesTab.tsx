import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { isAdminUser } from '@/utils/authHelpers'
import { FUNCTIES, FUNCTIE_GROEPEN, functieAan, functieGetal, type FunctieInstellingen } from '@/lib/functies'
import { logger } from '../../utils/logger'

export function FunctiesTab() {
  const { userRol } = useAuth()
  const { settings, updateSettings } = useAppSettings()
  const magWijzigen = isAdminUser(userRol)
  const [bezig, setBezig] = useState<string | null>(null)

  const functies: FunctieInstellingen = settings.functies ?? {}

  async function bewaar(wijziging: FunctieInstellingen, sleutel: string) {
    setBezig(sleutel)
    try {
      await updateSettings({ functies: { ...functies, ...wijziging } })
    } catch (err) {
      logger.error('Functie-schakelaar opslaan mislukt:', err)
      toast.error('Opslaan mislukt. Probeer het opnieuw.')
    } finally {
      setBezig(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Functies</h2>
        <p className="text-sm text-muted-foreground">
          Zet aan wat je gebruikt. Wat uit staat, zie je nergens in de app. Alleen een beheerder kan dit wijzigen.
        </p>
      </div>

      {FUNCTIE_GROEPEN.map((groep) => {
        const items = FUNCTIES.filter((f) => f.groep === groep.id && !f.binnenkort)
        if (items.length === 0) return null
        return (
          <Card key={groep.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{groep.label}</CardTitle>
              <CardDescription>{items.filter((f) => functieAan(functies, f.sleutel)).length} van {items.length} aan</CardDescription>
            </CardHeader>
            <CardContent className="divide-y">
              {items.map((f) => {
                const aan = functieAan(functies, f.sleutel)
                return (
                  <div key={f.sleutel} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <Label htmlFor={`functie-${f.sleutel}`} className="text-sm font-medium">{f.label}</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {f.uitleg}
                        {f.artikel && (
                          <>
                            {' '}
                            <Link to={`/kennisbank?artikel=${f.artikel}`} className="text-petrol underline-offset-2 hover:underline">Lees meer</Link>
                          </>
                        )}
                      </p>
                      {f.getal && aan && (
                        <div className="mt-2 flex items-center gap-2">
                          <Label htmlFor={`getal-${f.getal.sleutel}`} className="text-xs text-muted-foreground whitespace-nowrap">{f.getal.label}</Label>
                          {f.getal.eenheid === '€' && <span className="text-xs text-muted-foreground">€</span>}
                          <Input
                            id={`getal-${f.getal.sleutel}`}
                            type="number"
                            inputMode="numeric"
                            className="h-8 w-28"
                            disabled={!magWijzigen || bezig === f.getal.sleutel}
                            defaultValue={functieGetal(functies, f.getal.sleutel)}
                            onBlur={(e) => {
                              const n = Number(e.target.value)
                              if (!Number.isFinite(n) || n === functieGetal(functies, f.getal!.sleutel)) return
                              void bewaar({ [f.getal!.sleutel]: n }, f.getal!.sleutel)
                            }}
                          />
                          {f.getal.eenheid && f.getal.eenheid !== '€' && <span className="text-xs text-muted-foreground">{f.getal.eenheid}</span>}
                        </div>
                      )}
                    </div>
                    <Switch
                      id={`functie-${f.sleutel}`}
                      checked={aan}
                      disabled={!magWijzigen || bezig === f.sleutel}
                      onCheckedChange={(v) => void bewaar({ [f.sleutel]: v }, f.sleutel)}
                    />
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
