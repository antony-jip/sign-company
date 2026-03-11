import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import {
  Link2,
  Copy,
  Plus,
  ExternalLink,
  FileText,
  Image,
  Receipt,
  MessageSquare,
  Eye,
  EyeOff,
  Clock,
  CheckCircle2,
  RotateCcw,
  CreditCard,
  Loader2,
  Trash2,
  RefreshCw,
  Power,
  PowerOff,
  Upload,
  Calendar,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import {
  getPortaalByProject,
  getPortaalItems,
  createPortaalItem,
  deletePortaalItem,
  createPortaalBestand,
  getOffertesByProject,
  getFacturenByProject,
} from '@/services/supabaseService'
import { uploadFile } from '@/services/storageService'
import type { ProjectPortaal, PortaalItem, Offerte, Factuur } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'

interface ProjectPortaalTabProps {
  projectId: string
  projectNaam: string
}

const TYPE_ICONS: Record<string, typeof FileText> = {
  offerte: FileText,
  tekening: Image,
  factuur: Receipt,
  bericht: MessageSquare,
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Eye }> = {
  verstuurd: { label: 'Verstuurd', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300', icon: Clock },
  bekeken: { label: 'Bekeken', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', icon: Eye },
  goedgekeurd: { label: 'Goedgekeurd', color: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300', icon: CheckCircle2 },
  revisie: { label: 'Revisie', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300', icon: RotateCcw },
  betaald: { label: 'Betaald', color: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300', icon: CreditCard },
  vervangen: { label: 'Vervangen', color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400', icon: AlertCircle },
}

export function ProjectPortaalTab({ projectId, projectNaam }: ProjectPortaalTabProps) {
  const { user } = useAuth()
  const [portaal, setPortaal] = useState<ProjectPortaal | null>(null)
  const [items, setItems] = useState<PortaalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  // Item toevoegen state
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [itemType, setItemType] = useState<'offerte' | 'tekening' | 'factuur' | 'bericht'>('bericht')
  const [itemTitel, setItemTitel] = useState('')
  const [itemOmschrijving, setItemOmschrijving] = useState('')
  const [itemLabel, setItemLabel] = useState('')
  const [selectedOfferteId, setSelectedOfferteId] = useState('')
  const [selectedFactuurId, setSelectedFactuurId] = useState('')
  const [savingItem, setSavingItem] = useState(false)

  // Tekening upload
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadFiles, setUploadFiles] = useState<File[]>([])

  // Dropdown data
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [facturen, setFacturen] = useState<Factuur[]>([])

  const fetchPortaal = useCallback(async () => {
    try {
      const p = await getPortaalByProject(projectId)
      setPortaal(p)
      if (p) {
        const itms = await getPortaalItems(p.id)
        setItems(itms)
      }
    } catch (err) {
      console.error('Fout bij ophalen portaal:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchPortaal()
  }, [fetchPortaal])

  async function handleCreatePortaal() {
    if (!user?.id) return
    setCreating(true)
    try {
      const response = await fetch('/api/portaal-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await (await import('@supabase/supabase-js')).createClient(
            import.meta.env.VITE_SUPABASE_URL || '',
            import.meta.env.VITE_SUPABASE_ANON_KEY || ''
          ).auth.getSession()).data.session?.access_token || ''}`,
        },
        body: JSON.stringify({ project_id: projectId }),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Kon portaal niet aanmaken')
      }
      toast.success('Klantportaal aangemaakt')
      await fetchPortaal()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  async function handleVerlengen() {
    if (!portaal) return
    try {
      const response = await fetch('/api/portaal-verlengen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await (await import('@supabase/supabase-js')).createClient(
            import.meta.env.VITE_SUPABASE_URL || '',
            import.meta.env.VITE_SUPABASE_ANON_KEY || ''
          ).auth.getSession()).data.session?.access_token || ''}`,
        },
        body: JSON.stringify({ portaal_id: portaal.id }),
      })
      if (!response.ok) throw new Error('Kon portaal niet verlengen')
      toast.success('Portaal verlengd met 30 dagen')
      await fetchPortaal()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  async function handleDeactiveer() {
    if (!portaal) return
    try {
      const { deactiveerPortaal } = await import('@/services/supabaseService')
      await deactiveerPortaal(portaal.id)
      toast.success('Portaal gedeactiveerd')
      await fetchPortaal()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  async function handleActiveer() {
    if (!portaal) return
    // Re-activate by extending
    await handleVerlengen()
  }

  function copyLink() {
    if (!portaal) return
    const url = `${window.location.origin}/portaal/${portaal.token}`
    navigator.clipboard.writeText(url)
    toast.success('Portaallink gekopieerd')
  }

  function openItemDialog(type: 'offerte' | 'tekening' | 'factuur' | 'bericht') {
    setItemType(type)
    setItemTitel('')
    setItemOmschrijving('')
    setItemLabel('')
    setSelectedOfferteId('')
    setSelectedFactuurId('')
    setUploadFiles([])

    // Laad data voor dropdowns
    if (type === 'offerte') {
      getOffertesByProject(projectId).then(setOffertes)
    } else if (type === 'factuur') {
      getFacturenByProject(projectId).then(setFacturen)
    }

    setItemDialogOpen(true)
  }

  async function handleSaveItem() {
    if (!portaal || !user?.id) return

    if (itemType === 'offerte' && !selectedOfferteId) {
      toast.error('Selecteer een offerte')
      return
    }
    if (itemType === 'factuur' && !selectedFactuurId) {
      toast.error('Selecteer een factuur')
      return
    }
    if (itemType === 'tekening' && uploadFiles.length === 0) {
      toast.error('Upload minimaal één bestand')
      return
    }
    if (!itemTitel.trim() && itemType === 'bericht') {
      toast.error('Titel is verplicht')
      return
    }

    setSavingItem(true)
    try {
      // Build titel from selection if needed
      let titel = itemTitel.trim()
      let offerte_id: string | undefined
      let factuur_id: string | undefined
      let bedrag: number | undefined
      let mollie_payment_url: string | undefined

      if (itemType === 'offerte') {
        const offerte = offertes.find(o => o.id === selectedOfferteId)
        if (!titel && offerte) titel = offerte.titel || `Offerte ${offerte.offerte_nummer}`
        offerte_id = selectedOfferteId
      } else if (itemType === 'factuur') {
        const factuur = facturen.find(f => f.id === selectedFactuurId)
        if (!titel && factuur) titel = `Factuur ${factuur.factuur_nummer}`
        factuur_id = selectedFactuurId
        bedrag = factuur?.totaal_incl_btw
        mollie_payment_url = factuur?.betaal_link || undefined
      } else if (itemType === 'tekening') {
        if (!titel) titel = uploadFiles[0]?.name || 'Tekening'
      }

      if (!titel) {
        toast.error('Titel is verplicht')
        setSavingItem(false)
        return
      }

      const newItem = await createPortaalItem({
        user_id: user.id,
        project_id: projectId,
        portaal_id: portaal.id,
        type: itemType,
        titel,
        omschrijving: itemOmschrijving || undefined,
        label: itemLabel || undefined,
        offerte_id,
        factuur_id,
        bedrag,
        mollie_payment_url,
        status: 'verstuurd',
        zichtbaar_voor_klant: true,
        volgorde: 0,
      })

      // Upload bestanden bij tekening
      if (itemType === 'tekening' && uploadFiles.length > 0) {
        for (const file of uploadFiles) {
          const path = `portaal/${portaal.id}/${Date.now()}_${file.name}`
          const url = await uploadFile(file, path)
          await createPortaalBestand({
            portaal_item_id: newItem.id,
            bestandsnaam: file.name,
            mime_type: file.type,
            grootte: file.size,
            url,
            thumbnail_url: file.type.startsWith('image/') ? url : undefined,
            uploaded_by: 'bedrijf',
          })
        }
      }

      toast.success('Item toegevoegd aan portaal')
      setItemDialogOpen(false)
      await fetchPortaal()
    } catch (err) {
      toast.error((err as Error).message || 'Kon item niet toevoegen')
    } finally {
      setSavingItem(false)
    }
  }

  async function handleDeleteItem(itemId: string) {
    try {
      await deletePortaalItem(itemId)
      toast.success('Item verborgen voor klant')
      await fetchPortaal()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  if (loading) {
    return (
      <Card className="border-border/80 dark:border-border/80">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  // Geen portaal — toon aanmaken knop
  if (!portaal) {
    return (
      <Card className="border-border/80 dark:border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Link2 className="h-3.5 w-3.5 text-white" />
            </div>
            Klantportaal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Maak een klantportaal aan om offertes, tekeningen en facturen te delen.
          </p>
          <Button size="sm" onClick={handleCreatePortaal} disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
            Portaal aanmaken
          </Button>
        </CardContent>
      </Card>
    )
  }

  const isVerlopen = new Date(portaal.verloopt_op) < new Date()
  const isActief = portaal.actief && !isVerlopen

  return (
    <>
      <Card className="border-border/80 dark:border-border/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Link2 className="h-3.5 w-3.5 text-white" />
              </div>
              Klantportaal
              <Badge className={isActief
                ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 text-[10px]'
                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 text-[10px]'
              }>
                {isActief ? 'Actief' : isVerlopen ? 'Verlopen' : 'Gedeactiveerd'}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={copyLink}>
                <Copy className="h-3.5 w-3.5 mr-1" />
                Link
              </Button>
              <a
                href={`${window.location.origin}/portaal/${portaal.token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center h-7 px-2 text-xs rounded-md hover:bg-muted transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Status info */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Geldig tot {formatDate(portaal.verloopt_op)}
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              {items.length} item{items.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Acties */}
          <div className="flex flex-wrap gap-1.5">
            {isVerlopen || !portaal.actief ? (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleActiveer}>
                <Power className="h-3 w-3 mr-1" />
                Heractiveren
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleVerlengen}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Verlengen
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={handleDeactiveer}>
                  <PowerOff className="h-3 w-3 mr-1" />
                  Deactiveren
                </Button>
              </>
            )}
          </div>

          {/* Item toevoegen knoppen */}
          {isActief && (
            <div className="border-t pt-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Item toevoegen</p>
              <div className="flex flex-wrap gap-1.5">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openItemDialog('offerte')}>
                  <FileText className="h-3 w-3 mr-1" />
                  Offerte
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openItemDialog('tekening')}>
                  <Image className="h-3 w-3 mr-1" />
                  Tekening
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openItemDialog('factuur')}>
                  <Receipt className="h-3 w-3 mr-1" />
                  Factuur
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openItemDialog('bericht')}>
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Bericht
                </Button>
              </div>
            </div>
          )}

          {/* Items lijst */}
          {items.length > 0 && (
            <div className="border-t pt-3 space-y-2">
              {items.map((item) => {
                const TypeIcon = TYPE_ICONS[item.type] || FileText
                const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.verstuurd
                const StatusIcon = config.icon

                return (
                  <div key={item.id} className="space-y-1">
                    <div
                      className="flex items-center gap-2.5 bg-background dark:bg-foreground/80/50 rounded-lg px-3 py-2 group hover:bg-muted dark:hover:bg-foreground/80 transition-colors"
                    >
                      <TypeIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">{item.titel}</span>
                          {item.label && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{item.label}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">{formatDate(item.created_at)}</span>
                          {item.bekeken_op ? (() => {
                            const bekekenDagenGeleden = (Date.now() - new Date(item.bekeken_op).getTime()) / 86400000
                            const heeftReactie = item.reacties && item.reacties.length > 0
                            const isOranje = bekekenDagenGeleden > 1 && !heeftReactie
                            return (
                              <span className={`text-[10px] flex items-center gap-0.5 ${isOranje ? 'text-amber-500' : 'text-blue-500'}`}
                                title={isOranje ? `Bekeken ${Math.floor(bekekenDagenGeleden)} dagen geleden, geen reactie` : `Bekeken op ${formatDate(item.bekeken_op)}`}
                              >
                                <Eye className="h-2.5 w-2.5" />
                                {isOranje ? `${Math.floor(bekekenDagenGeleden)}d geen reactie` : 'Bekeken'}
                              </span>
                            )
                          })() : (
                            <span className="text-[10px] text-muted-foreground/50 flex items-center gap-0.5" title="Nog niet bekeken">
                              <Eye className="h-2.5 w-2.5" /> Niet bekeken
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge className={`${config.color} text-[10px] px-1.5 flex items-center gap-0.5`}>
                        <StatusIcon className="h-2.5 w-2.5" />
                        {config.label}
                      </Badge>
                      {!item.zichtbaar_voor_klant && (
                        <EyeOff className="h-3 w-3 text-muted-foreground" title="Verborgen" />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteItem(item.id)}
                        title="Verbergen voor klant"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    {/* Reacties onder het item */}
                    {item.reacties && item.reacties.length > 0 && (
                      <div className="ml-6 space-y-1">
                        {item.reacties.map((reactie) => (
                          <div key={reactie.id} className={`flex items-start gap-1.5 text-[10px] rounded px-2 py-1 ${
                            reactie.type === 'goedkeuring' ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'
                            : reactie.type === 'revisie' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                            : 'bg-muted text-muted-foreground'
                          }`}>
                            {reactie.type === 'goedkeuring' ? <CheckCircle2 className="h-3 w-3 flex-shrink-0 mt-0.5" /> : <RotateCcw className="h-3 w-3 flex-shrink-0 mt-0.5" />}
                            <div>
                              <span className="font-medium">
                                {reactie.type === 'goedkeuring' ? 'Goedgekeurd' : 'Revisie'}
                                {reactie.klant_naam && ` — ${reactie.klant_naam}`}
                              </span>
                              {reactie.bericht && <p className="text-muted-foreground mt-0.5">{reactie.bericht}</p>}
                              <span className="text-muted-foreground/60">{formatDate(reactie.created_at)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Item toevoegen dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {itemType === 'offerte' && <FileText className="h-5 w-5 text-blue-500" />}
              {itemType === 'tekening' && <Image className="h-5 w-5 text-emerald-500" />}
              {itemType === 'factuur' && <Receipt className="h-5 w-5 text-amber-500" />}
              {itemType === 'bericht' && <MessageSquare className="h-5 w-5 text-purple-500" />}
              {{
                offerte: 'Offerte delen',
                tekening: 'Tekening uploaden',
                factuur: 'Factuur delen',
                bericht: 'Bericht sturen',
              }[itemType]}
            </DialogTitle>
            <DialogDescription>
              Dit item wordt zichtbaar op het klantportaal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Offerte selectie */}
            {itemType === 'offerte' && (
              <div>
                <Label className="text-sm">Offerte</Label>
                <Select value={selectedOfferteId} onValueChange={setSelectedOfferteId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecteer offerte..." />
                  </SelectTrigger>
                  <SelectContent>
                    {offertes.map(o => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.offerte_nummer} — {o.titel || 'Geen titel'} ({formatCurrency(o.totaal_incl_btw || 0)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Factuur selectie */}
            {itemType === 'factuur' && (
              <div>
                <Label className="text-sm">Factuur</Label>
                <Select value={selectedFactuurId} onValueChange={setSelectedFactuurId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecteer factuur..." />
                  </SelectTrigger>
                  <SelectContent>
                    {facturen.map(f => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.factuur_nummer} — {formatCurrency(f.totaal_incl_btw || 0)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Tekening upload */}
            {itemType === 'tekening' && (
              <div>
                <Label className="text-sm">Bestanden</Label>
                <div
                  className="mt-1 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">
                    {uploadFiles.length > 0
                      ? `${uploadFiles.length} bestand(en) geselecteerd`
                      : 'Klik om bestanden te selecteren'}
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) setUploadFiles(Array.from(e.target.files))
                  }}
                />
              </div>
            )}

            {/* Titel */}
            <div>
              <Label className="text-sm">Titel{itemType !== 'offerte' && itemType !== 'factuur' ? ' *' : ' (optioneel)'}</Label>
              <Input
                value={itemTitel}
                onChange={(e) => setItemTitel(e.target.value)}
                placeholder={
                  itemType === 'offerte' ? 'Wordt overgenomen van offerte'
                    : itemType === 'factuur' ? 'Wordt overgenomen van factuur'
                    : itemType === 'tekening' ? 'Bijv. Ontwerp voorgevel v2'
                    : 'Titel van het bericht'
                }
                className="mt-1"
              />
            </div>

            {/* Omschrijving */}
            <div>
              <Label className="text-sm">Omschrijving</Label>
              <Textarea
                value={itemOmschrijving}
                onChange={(e) => setItemOmschrijving(e.target.value)}
                placeholder="Optionele toelichting..."
                rows={3}
                className="mt-1"
              />
            </div>

            {/* Label */}
            <div>
              <Label className="text-sm">Label (optioneel)</Label>
              <Input
                value={itemLabel}
                onChange={(e) => setItemLabel(e.target.value)}
                placeholder="Bijv. Concept, Definitief, Revisie 2"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleSaveItem} disabled={savingItem}>
              {savingItem ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
              Toevoegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
