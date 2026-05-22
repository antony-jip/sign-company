import React, { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { getOrgId } from '@/services/supabaseHelpers'
import {
  DEFAULT_TEMPLATES,
  getTemplate,
  saveSystemTemplate,
  resetTemplateToDefault,
} from '@/services/emailTemplateService'
import { renderTemplate } from '@/utils/templateRender'
import { confirm } from '@/components/shared/ConfirmDialog'

const PLACEHOLDERS_PER_TASK: Record<string, string[]> = {
  offerte_opvolging_dag1: ['contactpersoon', 'offerte_nummer', 'portaal_url', 'bedrijfsnaam'],
  offerte_opvolging_dag7: ['contactpersoon', 'offerte_nummer', 'portaal_url', 'bedrijfsnaam'],
  factuur_herinnering_1: ['contactpersoon', 'factuur_nummer', 'factuur_bedrag', 'verval_datum', 'portaal_url', 'bedrijfsnaam'],
  factuur_herinnering_2: ['contactpersoon', 'factuur_nummer', 'factuur_bedrag', 'portaal_url', 'bedrijfsnaam'],
  factuur_herinnering_3: ['contactpersoon', 'factuur_nummer', 'factuur_bedrag', 'portaal_url', 'bedrijfsnaam'],
  portaal_uitnodiging: ['contactpersoon', 'bedrijfsnaam', 'project_naam', 'portaal_url'],
  portaal_herinnering: ['contactpersoon', 'bedrijfsnaam', 'portaal_url'],
  onboarding_dag3: ['voornaam', 'app_url'],
  onboarding_dag7: ['voornaam', 'app_url'],
  trial_reminder_5: ['voornaam', 'abonnement_url'],
  trial_reminder_2: ['voornaam', 'abonnement_url'],
  trial_reminder_0: ['voornaam', 'abonnement_url'],
}

const DUMMY_VARS: Record<string, string> = {
  contactpersoon: 'Jan de Vries',
  offerte_nummer: 'OFF-2026-999',
  factuur_nummer: 'FAC-2026-001',
  factuur_bedrag: '€ 1.250,00',
  verval_datum: '15 maart 2026',
  portaal_url: 'https://app.doen.team/portaal/voorbeeld',
  bedrijfsnaam: 'doen.',
  project_naam: 'Lichtreclame demo',
  voornaam: 'Jan',
  app_url: 'https://app.doen.team',
  abonnement_url: 'https://app.doen.team/abonnement',
}

const MIN_BODY_LENGTH = 20

interface TemplateEditorProps {
  triggerTaskNaam: string
  open: boolean
  onClose: () => void
  onSaved?: () => void
}

export function TemplateEditor({ triggerTaskNaam, open, onClose, onSaved }: TemplateEditorProps) {
  const def = DEFAULT_TEMPLATES[triggerTaskNaam]
  const placeholders = PLACEHOLDERS_PER_TASK[triggerTaskNaam] ?? []

  const [orgId, setOrgId] = useState<string | null>(null)
  const [onderwerp, setOnderwerp] = useState('')
  const [body, setBody] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [activeField, setActiveField] = useState<'onderwerp' | 'body'>('body')

  const onderwerpRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setIsLoading(true)
    ;(async () => {
      try {
        const oid = await getOrgId()
        if (!oid) throw new Error('Geen organisatie gevonden')
        const tpl = await getTemplate(oid, triggerTaskNaam)
        if (cancelled) return
        setOrgId(oid)
        setOnderwerp(tpl.onderwerp)
        setBody(tpl.body)
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Kon template niet laden')
          onClose()
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, triggerTaskNaam, onClose])

  function insertPlaceholder(key: string) {
    const ref = activeField === 'onderwerp' ? onderwerpRef : bodyRef
    const el = ref.current
    const insert = `{{${key}}}`
    if (!el) {
      if (activeField === 'onderwerp') setOnderwerp(onderwerp + insert)
      else setBody(body + insert)
      return
    }
    const value = activeField === 'onderwerp' ? onderwerp : body
    const setValue = activeField === 'onderwerp' ? setOnderwerp : setBody
    const start = el.selectionStart ?? value.length
    const end = el.selectionEnd ?? value.length
    const newValue = value.slice(0, start) + insert + value.slice(end)
    setValue(newValue)
    requestAnimationFrame(() => {
      el.focus()
      const caret = start + insert.length
      el.setSelectionRange(caret, caret)
    })
  }

  async function handleSave() {
    if (!orgId) return
    const onderwerpTrim = onderwerp.trim()
    const bodyTrim = body.trim()
    if (!onderwerpTrim) {
      toast.error('Onderwerp mag niet leeg zijn')
      return
    }
    if (bodyTrim.length < MIN_BODY_LENGTH) {
      toast.error(`Bericht is te kort (minimaal ${MIN_BODY_LENGTH} tekens)`)
      return
    }
    setIsSaving(true)
    try {
      await saveSystemTemplate(orgId, triggerTaskNaam, { onderwerp: onderwerpTrim, body })
      toast.success('Template opgeslagen.')
      onSaved?.()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kon template niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleReset() {
    if (!orgId || !def) return
    const ok = await confirm({
      message: `Weet je zeker dat je "${def.naam}" terugzet naar de standaard? Je huidige tekst gaat verloren.`,
      variant: 'destructive',
      confirmLabel: 'Herstel standaard',
    })
    if (!ok) return
    setIsResetting(true)
    try {
      await resetTemplateToDefault(orgId, triggerTaskNaam)
      setOnderwerp(def.onderwerp)
      setBody(def.body)
      toast.success('Template hersteld.')
      onSaved?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kon template niet herstellen')
    } finally {
      setIsResetting(false)
    }
  }

  const previewOnderwerp = renderTemplate(onderwerp, DUMMY_VARS)
  const previewBody = renderTemplate(body, DUMMY_VARS)

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{def?.naam ?? 'Template bewerken'}</DialogTitle>
          <DialogDescription>
            Pas onderwerp en bericht aan. Variabelen in {'{{dubbele accolades}}'} worden bij verzenden vervangen.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              {placeholders.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Beschikbare variabelen (klik om in te voegen)
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {placeholders.map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => insertPlaceholder(key)}
                        className="inline-flex items-center rounded-md border border-border bg-white px-2 py-1 text-xs font-mono text-[#1A535C] hover:border-[#1A535C] hover:bg-background transition-colors"
                      >
                        {`{{${key}}}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="template-onderwerp">Onderwerp</Label>
                <Input
                  id="template-onderwerp"
                  ref={onderwerpRef}
                  value={onderwerp}
                  onChange={(e) => setOnderwerp(e.target.value)}
                  onFocus={() => setActiveField('onderwerp')}
                  placeholder="Bv. Herinnering: offerte {{offerte_nummer}}"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="template-body">Bericht</Label>
                <Textarea
                  id="template-body"
                  ref={bodyRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onFocus={() => setActiveField('body')}
                  rows={12}
                  className="font-mono text-xs leading-relaxed"
                />
                <p className="text-xs text-muted-foreground">
                  Minimaal {MIN_BODY_LENGTH} tekens. {body.trim().length} tekens nu.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Voorbeeld (met dummy-data)
              </Label>
              <div className="rounded-lg border border-border bg-white overflow-hidden">
                <div className="border-b border-border bg-background px-4 py-2.5">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Onderwerp</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">{previewOnderwerp || <span className="italic text-muted-foreground">leeg</span>}</p>
                </div>
                <div className="px-4 py-3">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-foreground leading-relaxed">
                    {previewBody || <span className="italic text-muted-foreground">leeg</span>}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-row items-center justify-between sm:justify-between gap-2">
          <Button
            variant="ghost"
            onClick={handleReset}
            disabled={isLoading || isSaving || isResetting}
            className="gap-1.5"
          >
            {isResetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Herstel standaard
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving || isResetting}>
              Annuleren
            </Button>
            <Button onClick={handleSave} disabled={isLoading || isSaving || isResetting}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Opslaan
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
