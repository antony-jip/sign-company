import React, { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Bell, Smartphone, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { pushStatus, zetPushAan, zetPushUit, draaitAlsApp, type PushStatus } from '@/lib/push'

/**
 * Meldingen bij nieuwe mail.
 *
 * De toestemmingsvraag valt bewust hier, achter een schakelaar die uitlegt
 * waarvoor hij is — niet bij het opstarten. Eén weigering is in de meeste
 * browsers permanent, dus de vraag mag maar één keer gesteld worden en dan
 * op het moment dat je hem verwacht.
 */
export function PushMeldingenKaart() {
  const { user, session } = useAuth()
  const { profile, updateUserProfile } = useAppSettings()
  const [status, setStatus] = useState<PushStatus | null>(null)
  const [bezig, setBezig] = useState(false)
  const [testBezig, setTestBezig] = useState(false)

  const aan = !!profile?.push_nieuwe_mail && status === 'aan'

  useEffect(() => { void pushStatus().then(setStatus) }, [])

  const wissel = useCallback(async (nieuweStand: boolean) => {
    setBezig(true)
    try {
      if (nieuweStand) {
        const uitkomst = await zetPushAan()
        setStatus(uitkomst.status)
        if (!uitkomst.ok) {
          toast.error(uitkomst.melding || 'Kon meldingen niet inschakelen')
          return
        }
        await updateUserProfile({ push_nieuwe_mail: true })
        toast.success(<>Meldingen staan aan<span style={{ color: '#F15025' }}>.</span></>)
      } else {
        await zetPushUit()
        await updateUserProfile({ push_nieuwe_mail: false })
        setStatus('uit')
      }
    } catch (err) {
      logger.error(err)
      toast.error('Kon meldingen niet wijzigen')
    } finally {
      setBezig(false)
    }
  }, [updateUserProfile])

  const stuurTest = useCallback(async () => {
    if (!session?.access_token) return
    setTestBezig(true)
    try {
      const respons = await fetch('/api/push-verstuur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ titel: 'doen.', tekst: 'Zo ziet een melding eruit.', url: '/email', tag: 'doen-test' }),
      })
      const uitkomst = await respons.json().catch(() => ({}))
      if (!respons.ok) throw new Error(uitkomst?.error || 'Versturen mislukt')
      if (!uitkomst.bezorgd) toast.error('Geen toestel bereikt. Staat de schakelaar op dit apparaat aan?')
      else toast.success(<>Testmelding verstuurd<span style={{ color: '#F15025' }}>.</span></>)
    } catch (err) {
      logger.error(err)
      toast.error(err instanceof Error ? err.message : 'Kon testmelding niet versturen')
    } finally {
      setTestBezig(false)
    }
  }, [session?.access_token])

  if (!user) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Meldingen bij nieuwe mail
        </CardTitle>
        <CardDescription>
          Een melding op je toestel zodra er mail binnenkomt, ook als doen. dicht staat.
          Afzender en onderwerp — nooit de inhoud, want die staat op je vergrendelscherm.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {status === 'installeer-eerst' ? (
          <div className="flex items-start gap-3 rounded-xl bg-[hsl(38,20%,95.5%)] dark:bg-white/[0.04] px-4 py-3">
            <Smartphone className="w-[18px] h-[18px] text-petrol dark:text-foreground/70 flex-shrink-0 mt-0.5" />
            <div className="min-w-0 text-[13px] leading-relaxed text-foreground/80">
              <p className="font-semibold text-foreground">Voeg doen. eerst toe aan je beginscherm</p>
              <p className="mt-0.5">
                Apple staat meldingen niet toe in een gewoon Safari-tabblad. Tik op delen en
                daarna op <span className="font-medium text-foreground">Zet op beginscherm</span>;
                daarna kun je meldingen hier aanzetten.
              </p>
            </div>
          </div>
        ) : status === 'kan-niet' ? (
          <p className="text-[13px] text-muted-foreground">
            Deze browser ondersteunt geen meldingen. Op je telefoon werkt het wel.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Nieuwe mail melden</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {status === 'geweigerd'
                    ? 'Je browser blokkeert meldingen voor doen. Zet ze aan in de browserinstellingen.'
                    : draaitAlsApp()
                      ? 'Geldt voor dit toestel.'
                      : 'Geldt voor deze browser. Op je telefoon: installeer doen. eerst.'}
                </p>
              </div>
              <Switch
                checked={aan}
                disabled={bezig || status === 'geweigerd'}
                onCheckedChange={(v) => void wissel(v === true)}
              />
            </div>

            {aan && (
              <button
                type="button"
                onClick={() => void stuurTest()}
                disabled={testBezig}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-petrol hover:text-[#0F3D44] hover:underline disabled:opacity-50"
              >
                {testBezig && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Stuur een testmelding
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
