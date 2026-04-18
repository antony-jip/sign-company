import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  getInboxConfig,
  upsertInboxConfig,
  testImapConnection,
} from '@/services/inkoopfactuurService'
import type { InkoopFactuurInboxConfig } from '@/types'

export function InkoopfactuurInboxSetup() {
  const [config, setConfig] = useState<InkoopFactuurInboxConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string; label_gevonden?: boolean } | null>(null)
  const [overlapWarning, setOverlapWarning] = useState(false)

  const [form, setForm] = useState({
    imap_user: '',
    password_plaintext: '',
    imap_host: 'imap.gmail.com',
    imap_port: 993,
    gmail_label: 'doen-inkoop',
    actief: true,
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setIsLoading(true)
        const existing = await getInboxConfig()
        if (cancelled) return
        if (existing) {
          setConfig(existing)
          setForm({
            imap_user: existing.imap_user,
            password_plaintext: '',
            imap_host: existing.imap_host,
            imap_port: existing.imap_port,
            gmail_label: existing.gmail_label,
            actief: existing.actief,
          })
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  async function handleTest() {
    if (!form.imap_user) {
      toast.error('Vul een email adres in')
      return
    }
    if (!form.password_plaintext && !config) {
      toast.error('Vul een wachtwoord in')
      return
    }
    try {
      setIsTesting(true)
      setTestResult(null)
      const result = await testImapConnection({
        imap_host: form.imap_host,
        imap_port: form.imap_port,
        imap_user: form.imap_user,
        imap_password: form.password_plaintext || undefined,
        gmail_label: form.gmail_label,
        use_stored: !form.password_plaintext && !!config,
      })
      setTestResult(result)
    } catch {
      setTestResult({ success: false, error: 'Verbinding mislukt' })
    } finally {
      setIsTesting(false)
    }
  }

  async function handleSave() {
    if (!form.imap_user) {
      toast.error('Email adres is verplicht')
      return
    }
    if (!config && !form.password_plaintext) {
      toast.error('Wachtwoord is verplicht')
      return
    }
    try {
      setIsSaving(true)
      const result = await upsertInboxConfig({
        imap_host: form.imap_host,
        imap_port: form.imap_port,
        imap_user: form.imap_user,
        password_plaintext: form.password_plaintext || 'UNCHANGED',
        gmail_label: form.gmail_label,
        actief: form.actief,
      })
      setConfig(result.config)
      setOverlapWarning(result.overlapWarning)
      setForm(f => ({ ...f, password_plaintext: '' }))
      toast.success('Inbox configuratie opgeslagen')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Opslaan mislukt')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-[#9B9B95]" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-[15px] font-bold tracking-[-0.3px]">
          inkoopfactuur inbox<span className="text-[#F15025]">.</span>
        </h2>
        <p className="text-[12px] text-[#5A5A55] mt-1">
          Koppel een Gmail inbox om inkoopfacturen automatisch op te halen.
        </p>
      </div>

      {/* Setup stappen */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px]">Voorbereiding in Gmail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-[12px] text-[#4A4A46]">
          <div className="flex gap-2"><span className="font-semibold text-[#C44830] shrink-0">1.</span> Maak een Gmail label <code className="bg-[#F5F5F3] px-1.5 py-0.5 rounded text-[11px]">doen-inkoop</code> in je factuur@ account</div>
          <div className="flex gap-2"><span className="font-semibold text-[#C44830] shrink-0">2.</span> Maak een filter: "Matches: heeft bijlage" &rarr; "Apply label: doen-inkoop"</div>
          <div className="flex gap-2"><span className="font-semibold text-[#C44830] shrink-0">3.</span> Zet 2-staps-verificatie aan op je Google account</div>
          <div className="flex gap-2"><span className="font-semibold text-[#C44830] shrink-0">4.</span> Ga naar myaccount.google.com/apppasswords, genereer wachtwoord voor "doen"</div>
          <div className="flex gap-2"><span className="font-semibold text-[#C44830] shrink-0">5.</span> Vul gegevens hieronder in</div>
        </CardContent>
      </Card>

      {overlapWarning && (
        <div className="flex items-start gap-2 text-[12px] p-3 rounded-lg bg-[#FFF8E1] text-[#8B6914] border border-[#FFE082]">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Dit emailadres is ook gekoppeld als persoonlijke inbox. Weet je zeker dat je hem ook als inkoopfactuur inbox wilt gebruiken?</span>
        </div>
      )}

      {/* Form */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-[11px]">Email adres</Label>
              <Input
                type="email"
                placeholder="facturen@bedrijf.nl"
                value={form.imap_user}
                onChange={e => setForm({ ...form, imap_user: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label className="text-[11px]">App wachtwoord</Label>
              <Input
                type="password"
                placeholder={config ? 'Laat leeg om huidig wachtwoord te behouden' : 'Plak hier je app-wachtwoord'}
                value={form.password_plaintext}
                onChange={e => setForm({ ...form, password_plaintext: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-[11px]">Gmail label</Label>
              <Input
                value={form.gmail_label}
                onChange={e => setForm({ ...form, gmail_label: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-[11px]">IMAP host</Label>
              <Input
                value={form.imap_host}
                onChange={e => setForm({ ...form, imap_host: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-[11px]">IMAP port</Label>
              <Input
                type="number"
                value={form.imap_port}
                onChange={e => setForm({ ...form, imap_port: parseInt(e.target.value) || 993 })}
              />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <Switch
                checked={form.actief}
                onCheckedChange={checked => setForm({ ...form, actief: checked })}
              />
              <Label className="text-[12px]">Polling actief</Label>
            </div>
          </div>

          {/* Test result */}
          {testResult && (
            <div className={`flex items-center gap-2 text-[12px] p-3 rounded-lg ${testResult.success ? 'bg-[#E4F0EA] text-[#2D6B48]' : 'bg-[#FDE8E2] text-[#C03A18]'}`}>
              {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {testResult.success
                ? `Verbonden${testResult.label_gevonden ? `, label "${form.gmail_label}" gevonden` : ', maar label niet gevonden'}`
                : testResult.error || 'Verbinding mislukt'
              }
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button variant="outline" onClick={handleTest} disabled={isTesting || !form.imap_user || (!form.password_plaintext && !config)}>
              {isTesting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Test verbinding
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-[#C44830] hover:bg-[#A33A26] text-white">
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Opslaan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      {config && (
        <Card>
          <CardContent className="pt-5">
            <div className="grid grid-cols-2 gap-4 text-[12px]">
              <div>
                <span className="text-[#9B9B95]">Laatst gecheckt</span>
                <p className="font-medium">{config.laatst_gecheckt_op ? new Date(config.laatst_gecheckt_op).toLocaleString('nl-NL') : 'Nog niet'}</p>
              </div>
              <div>
                <span className="text-[#9B9B95]">Status</span>
                <p className="font-medium">{config.actief ? 'Actief' : 'Gepauzeerd'}</p>
              </div>
              {config.laatste_error && (
                <div className="col-span-2">
                  <span className="text-[#9B9B95]">Laatste fout</span>
                  <p className="font-medium text-[#C03A18]">{config.laatste_error}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
