import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { LeadFormulier, LeadFormulierVeld } from '@/types'
import {
  getLeadFormulierByToken, createLeadInzending, createDeal, createKlant,
} from '@/services/supabaseService'
import { logger } from '@/utils/logger'

export function LeadFormulierPubliek() {
  const { token } = useParams<{ token: string }>()
  const [formulier, setFormulier] = useState<LeadFormulier | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    async function loadForm() {
      if (!token) { setNotFound(true); setIsLoading(false); return }
      try {
        const form = await getLeadFormulierByToken(token)
        if (cancelled) return
        if (!form) { setNotFound(true); setIsLoading(false); return }
        setFormulier(form)
        // Init form data
        const initial: Record<string, string> = {}
        for (const veld of form.velden) initial[veld.id] = ''
        setFormData(initial)
      } catch (err) {
        logger.error('Load lead form failed:', err)
        if (!cancelled) setNotFound(true)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadForm()
    return () => { cancelled = true }
  }, [token])

  const handleChange = useCallback((veldId: string, value: string) => {
    setFormData((prev) => ({ ...prev, [veldId]: value }))
    setErrors((prev) => ({ ...prev, [veldId]: '' }))
  }, [])

  const validate = useCallback((): boolean => {
    if (!formulier) return false
    const newErrors: Record<string, string> = {}

    for (const veld of formulier.velden) {
      if (veld.verplicht && !formData[veld.id]?.trim()) {
        newErrors[veld.id] = `${veld.label} is verplicht`
      }
      if (veld.type === 'email' && formData[veld.id]?.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(formData[veld.id])) {
          newErrors[veld.id] = 'Ongeldig emailadres'
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formulier, formData])

  const handleSubmit = useCallback(async () => {
    if (!formulier || !validate()) return

    setIsSubmitting(true)
    try {
      // Get name and email from form data
      const naamVeld = formulier.velden.find((v) => v.type === 'tekst' && v.volgorde === 1)
      const emailVeld = formulier.velden.find((v) => v.type === 'email')
      const naam = naamVeld ? formData[naamVeld.id] : ''
      const email = emailVeld ? formData[emailVeld.id] : ''

      let dealId: string | undefined
      let klantId: string | undefined

      // Auto-create klant + deal if enabled
      if (formulier.auto_deal_aanmaken && naam) {
        try {
          const klant = await createKlant({
            user_id: formulier.user_id,
            bedrijfsnaam: naam,
            contactpersoon: naam,
            email: email || '',
            telefoon: '',
            adres: '',
            postcode: '',
            stad: '',
            land: 'Nederland',
            website: '',
            kvk_nummer: '',
            btw_nummer: '',
            status: 'prospect',
            tags: ['lead-capture'],
            notities: `Via lead formulier: ${formulier.naam}`,
            contactpersonen: [],
          })
          klantId = klant.id

          const deal = await createDeal({
            user_id: formulier.user_id,
            klant_id: klant.id,
            titel: `Lead: ${naam}`,
            verwachte_waarde: 0,
            fase: formulier.deal_fase || 'lead',
            fase_sinds: new Date().toISOString(),
            status: 'open',
            bron: 'website',
            kans_percentage: 10,
          })
          dealId = deal.id
        } catch (err) {
          logger.error('Auto-create deal failed:', err)
        }
      }

      // Create inzending
      await createLeadInzending({
        user_id: formulier.user_id,
        formulier_id: formulier.id,
        data: formData,
        browser: navigator.userAgent,
        pagina_url: window.location.href,
        status: 'nieuw',
        deal_id: dealId,
        klant_id: klantId,
      })

      setIsSubmitted(true)
    } catch (err) {
      logger.error('Submit lead form failed:', err)
      setErrors({ _form: 'Er is een fout opgetreden. Probeer het opnieuw.' })
    } finally {
      setIsSubmitting(false)
    }
  }, [formulier, formData, validate])

  // ============ RENDER ============

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    )
  }

  if (notFound || !formulier) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground/60 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-foreground/70">Formulier niet gevonden</h2>
          <p className="text-sm text-muted-foreground">Dit formulier bestaat niet of is niet meer actief.</p>
        </div>
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-6">
          <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Bedankt!</h2>
          <p className="text-muted-foreground">{formulier.bedank_tekst}</p>
        </div>
      </div>
    )
  }

  const renderVeld = (veld: LeadFormulierVeld) => {
    const error = errors[veld.id]
    return (
      <div key={veld.id}>
        <Label className="text-sm font-medium">
          {veld.label} {veld.verplicht && <span className="text-red-500">*</span>}
        </Label>
        {veld.type === 'textarea' ? (
          <textarea
            value={formData[veld.id] || ''}
            onChange={(e) => handleChange(veld.id, e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
            placeholder={veld.placeholder}
          />
        ) : veld.type === 'select' ? (
          <Select value={formData[veld.id] || ''} onValueChange={(v) => handleChange(veld.id, v)}>
            <SelectTrigger><SelectValue placeholder={veld.placeholder || 'Selecteer...'} /></SelectTrigger>
            <SelectContent>
              {(veld.opties || []).map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : veld.type === 'checkbox' ? (
          <label className="flex items-center gap-2 text-sm mt-1">
            <input
              type="checkbox"
              checked={formData[veld.id] === 'true'}
              onChange={(e) => handleChange(veld.id, e.target.checked ? 'true' : '')}
              className="rounded"
            />
            {veld.placeholder || veld.label}
          </label>
        ) : (
          <Input
            type={veld.type === 'email' ? 'email' : veld.type === 'telefoon' ? 'tel' : 'text'}
            value={formData[veld.id] || ''}
            onChange={(e) => handleChange(veld.id, e.target.value)}
            placeholder={veld.placeholder}
          />
        )}
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">{formulier.naam}</h2>
          {formulier.beschrijving && <p className="text-sm text-muted-foreground mt-1">{formulier.beschrijving}</p>}
        </div>

        <div className="space-y-4">
          {formulier.velden
            .sort((a, b) => a.volgorde - b.volgorde)
            .map(renderVeld)}
        </div>

        {errors._form && (
          <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle className="h-4 w-4" /> {errors._form}</p>
        )}

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700"
          size="lg"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {formulier.knop_tekst}
        </Button>
      </div>
    </div>
  )
}
