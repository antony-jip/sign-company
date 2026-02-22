import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Plus,
  Play,
  Pause,
  Pencil,
  Trash2,
  Mail,
  Clock,
  Users,
  ArrowRight,
  GripVertical,
  Copy,
  Eye,
  MailCheck,
  ChevronDown,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { EmailSequence, EmailSequenceStap } from '@/types'

function generateId(): string {
  return crypto.randomUUID()
}

function getStatusColor(status: EmailSequence['status']) {
  switch (status) {
    case 'actief': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
    case 'gepauzeerd': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
    case 'concept': return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  }
}

function getStatusLabel(status: EmailSequence['status']) {
  switch (status) {
    case 'actief': return 'Actief'
    case 'gepauzeerd': return 'Gepauzeerd'
    case 'concept': return 'Concept'
  }
}

const EMPTY_STAP: Omit<EmailSequenceStap, 'id'> = {
  volgorde: 0,
  onderwerp: '',
  inhoud: '',
  wacht_dagen: 1,
  verzonden: 0,
  geopend: 0,
}

export function EmailSequences() {
  const [sequences, setSequences] = useState<EmailSequence[]>([
    {
      id: 'seq-demo-1',
      user_id: '',
      naam: 'Offerte follow-up',
      beschrijving: 'Automatische opvolging na het versturen van een offerte',
      status: 'actief',
      stappen: [
        { id: 's1', volgorde: 1, onderwerp: 'Opvolging offerte', inhoud: 'Beste [naam], hierbij een herinnering aan onze offerte...', wacht_dagen: 3, verzonden: 12, geopend: 8 },
        { id: 's2', volgorde: 2, onderwerp: 'Heeft u nog vragen?', inhoud: 'Beste [naam], wij wilden graag even navragen of u onze offerte heeft ontvangen...', wacht_dagen: 5, verzonden: 8, geopend: 4 },
        { id: 's3', volgorde: 3, onderwerp: 'Laatste herinnering', inhoud: 'Beste [naam], dit is onze laatste herinnering betreffende de offerte...', wacht_dagen: 7, verzonden: 3, geopend: 1 },
      ],
      ontvangers: ['klant1@voorbeeld.nl', 'klant2@voorbeeld.nl'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ])

  const [editingSequence, setEditingSequence] = useState<EmailSequence | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Dialog form state
  const [formNaam, setFormNaam] = useState('')
  const [formBeschrijving, setFormBeschrijving] = useState('')
  const [formStappen, setFormStappen] = useState<EmailSequenceStap[]>([])

  const openNewSequence = () => {
    setEditingSequence(null)
    setFormNaam('')
    setFormBeschrijving('')
    setFormStappen([{ ...EMPTY_STAP, id: generateId(), volgorde: 1 }])
    setDialogOpen(true)
  }

  const openEditSequence = (seq: EmailSequence) => {
    setEditingSequence(seq)
    setFormNaam(seq.naam)
    setFormBeschrijving(seq.beschrijving)
    setFormStappen([...seq.stappen])
    setDialogOpen(true)
  }

  const addStap = () => {
    setFormStappen((prev) => [
      ...prev,
      { ...EMPTY_STAP, id: generateId(), volgorde: prev.length + 1 },
    ])
  }

  const updateStap = (index: number, field: keyof EmailSequenceStap, value: string | number) => {
    setFormStappen((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    )
  }

  const removeStap = (index: number) => {
    setFormStappen((prev) =>
      prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, volgorde: i + 1 }))
    )
  }

  const handleSave = () => {
    if (!formNaam.trim()) {
      toast.error('Naam is verplicht')
      return
    }
    if (formStappen.length === 0) {
      toast.error('Voeg minimaal één stap toe')
      return
    }

    const now = new Date().toISOString()
    if (editingSequence) {
      setSequences((prev) =>
        prev.map((s) =>
          s.id === editingSequence.id
            ? { ...s, naam: formNaam, beschrijving: formBeschrijving, stappen: formStappen, updated_at: now }
            : s
        )
      )
      toast.success('Sequence bijgewerkt')
    } else {
      const newSeq: EmailSequence = {
        id: generateId(),
        user_id: '',
        naam: formNaam,
        beschrijving: formBeschrijving,
        status: 'concept',
        stappen: formStappen,
        ontvangers: [],
        created_at: now,
        updated_at: now,
      }
      setSequences((prev) => [...prev, newSeq])
      toast.success('Sequence aangemaakt')
    }
    setDialogOpen(false)
  }

  const toggleStatus = (seq: EmailSequence) => {
    const newStatus: EmailSequence['status'] = seq.status === 'actief' ? 'gepauzeerd' : 'actief'
    setSequences((prev) =>
      prev.map((s) => (s.id === seq.id ? { ...s, status: newStatus } : s))
    )
    toast.success(newStatus === 'actief' ? 'Sequence geactiveerd' : 'Sequence gepauzeerd')
  }

  const deleteSequence = (id: string) => {
    setSequences((prev) => prev.filter((s) => s.id !== id))
    toast.success('Sequence verwijderd')
  }

  const duplicateSequence = (seq: EmailSequence) => {
    const now = new Date().toISOString()
    const copy: EmailSequence = {
      ...seq,
      id: generateId(),
      naam: `${seq.naam} (kopie)`,
      status: 'concept',
      stappen: seq.stappen.map((s) => ({ ...s, id: generateId(), verzonden: 0, geopend: 0 })),
      ontvangers: [],
      created_at: now,
      updated_at: now,
    }
    setSequences((prev) => [...prev, copy])
    toast.success('Sequence gekopieerd')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Email Sequences</h3>
          <p className="text-sm text-muted-foreground">Automatische email opvolgingsreeksen</p>
        </div>
        <Button onClick={openNewSequence} className="gap-2">
          <Plus className="w-4 h-4" />
          Nieuwe sequence
        </Button>
      </div>

      {/* Sequences list */}
      {sequences.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Zap className="w-10 h-10 text-muted-foreground mb-3 opacity-30" />
            <p className="text-sm font-medium">Geen sequences</p>
            <p className="text-xs text-muted-foreground mt-1">Maak uw eerste automatische email sequence aan</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sequences.map((seq) => {
            const isExpanded = expandedId === seq.id
            const totalVerzonden = seq.stappen.reduce((sum, s) => sum + s.verzonden, 0)
            const totalGeopend = seq.stappen.reduce((sum, s) => sum + s.geopend, 0)

            return (
              <Card key={seq.id} className="overflow-hidden">
                <div
                  className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : seq.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold truncate">{seq.naam}</h4>
                      <Badge variant="secondary" className={cn('text-[10px]', getStatusColor(seq.status))}>
                        {getStatusLabel(seq.status)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{seq.beschrijving}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {seq.stappen.length} stappen
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {seq.ontvangers.length}
                    </div>
                    <div className="flex items-center gap-1">
                      <MailCheck className="w-3 h-3" />
                      {totalVerzonden} verzonden
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); toggleStatus(seq) }}
                      title={seq.status === 'actief' ? 'Pauzeren' : 'Activeren'}
                    >
                      {seq.status === 'actief' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); openEditSequence(seq) }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); duplicateSequence(seq) }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={(e) => { e.stopPropagation(); deleteSequence(seq.id) }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
                </div>

                {/* Expanded: show steps */}
                {isExpanded && (
                  <div className="border-t px-4 py-3 bg-muted/10">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Stappen</span>
                    </div>
                    <div className="space-y-2">
                      {seq.stappen.map((stap, index) => (
                        <div key={stap.id} className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {index + 1}
                          </div>
                          {index > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              +{stap.wacht_dagen}d
                            </div>
                          )}
                          <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0 px-3 py-2 bg-background rounded-md border">
                            <p className="text-sm font-medium truncate">{stap.onderwerp}</p>
                            <p className="text-xs text-muted-foreground truncate">{stap.inhoud.substring(0, 60)}...</p>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                            <span>{stap.verzonden} verzonden</span>
                            <span>{stap.geopend} geopend</span>
                            {stap.verzonden > 0 && (
                              <span className="font-medium">
                                {((stap.geopend / stap.verzonden) * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSequence ? 'Sequence bewerken' : 'Nieuwe sequence'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label>Naam</Label>
              <Input
                value={formNaam}
                onChange={(e) => setFormNaam(e.target.value)}
                placeholder="Bijv. Offerte follow-up"
              />
            </div>

            <div className="grid gap-2">
              <Label>Beschrijving</Label>
              <Textarea
                value={formBeschrijving}
                onChange={(e) => setFormBeschrijving(e.target.value)}
                placeholder="Korte beschrijving van deze sequence..."
                rows={2}
              />
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Stappen</Label>
                <Button variant="outline" size="sm" onClick={addStap} className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  Stap toevoegen
                </Button>
              </div>

              <div className="space-y-3">
                {formStappen.map((stap, index) => (
                  <Card key={stap.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium flex-1">Stap {index + 1}</span>
                        {index > 0 && (
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Wacht</Label>
                            <Input
                              type="number"
                              min={1}
                              value={stap.wacht_dagen}
                              onChange={(e) => updateStap(index, 'wacht_dagen', parseInt(e.target.value) || 1)}
                              className="w-16 h-7 text-sm"
                            />
                            <span className="text-xs text-muted-foreground">dagen</span>
                          </div>
                        )}
                        {formStappen.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeStap(index)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                      <Input
                        value={stap.onderwerp}
                        onChange={(e) => updateStap(index, 'onderwerp', e.target.value)}
                        placeholder="Onderwerp..."
                        className="h-8 text-sm"
                      />
                      <Textarea
                        value={stap.inhoud}
                        onChange={(e) => updateStap(index, 'inhoud', e.target.value)}
                        placeholder="Email inhoud... Gebruik [naam], [bedrijf], etc."
                        rows={3}
                        className="text-sm"
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleSave}>
              {editingSequence ? 'Bijwerken' : 'Aanmaken'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
