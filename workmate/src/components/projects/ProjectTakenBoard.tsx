import React, { useState, useRef } from 'react'
import { toast } from 'sonner'
import {
  Plus,
  LayoutGrid,
  List,
  Search,
  GripVertical,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  formatDate,
  getPriorityColor,
  getInitials,
} from '@/lib/utils'
import { createTaak, updateTaak } from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import { taakStatusKolommen } from '@/constants/projectConstants'
import { ProjectTasksTable } from './ProjectTasksTable'
import type { Taak } from '@/types'
import { logger } from '@/utils/logger'

interface ProjectTakenBoardProps {
  projectId: string
  taken: Taak[]
  onTakenChanged: () => Promise<void>
}

export function ProjectTakenBoard({ projectId, taken, onTakenChanged }: ProjectTakenBoardProps) {
  const { user } = useAuth()
  const [weergave, setWeergave] = useState<'board' | 'tabel'>('board')
  const [zoekterm, setZoekterm] = useState('')
  const [nieuweTaakOpen, setNieuweTaakOpen] = useState(false)
  const [nieuweTaakTitel, setNieuweTaakTitel] = useState('')
  const [nieuweTaakBeschrijving, setNieuweTaakBeschrijving] = useState('')
  const [nieuweTaakToegewezen, setNieuweTaakToegewezen] = useState('')
  const [nieuweTaakDeadline, setNieuweTaakDeadline] = useState('')

  // Drag state
  const [draggedTaakId, setDraggedTaakId] = useState<string | null>(null)
  const [dragOverKolom, setDragOverKolom] = useState<string | null>(null)

  const gefilterdesTaken = zoekterm.trim()
    ? taken.filter(t =>
        t.titel.toLowerCase().includes(zoekterm.toLowerCase()) ||
        t.beschrijving.toLowerCase().includes(zoekterm.toLowerCase()) ||
        t.toegewezen_aan.toLowerCase().includes(zoekterm.toLowerCase())
      )
    : taken

  const handleStatusChange = async (taakId: string, nieuweStatus: Taak['status']) => {
    try {
      await updateTaak(taakId, { status: nieuweStatus })
      await onTakenChanged()
      toast.success('Taakstatus bijgewerkt')
    } catch (err) {
      logger.error('Fout bij statuswijziging taak:', err)
      toast.error('Kon status niet wijzigen')
    }
  }

  const handleDrop = async (targetStatus: string) => {
    if (!draggedTaakId) return
    const taak = taken.find(t => t.id === draggedTaakId)
    if (!taak || taak.status === targetStatus) {
      setDraggedTaakId(null)
      setDragOverKolom(null)
      return
    }
    setDraggedTaakId(null)
    setDragOverKolom(null)
    await handleStatusChange(draggedTaakId, targetStatus as Taak['status'])
  }

  const handleCreateTaak = async () => {
    if (!nieuweTaakTitel.trim() || !user) return
    try {
      await createTaak({
        user_id: user.id,
        project_id: projectId,
        titel: nieuweTaakTitel.trim(),
        beschrijving: nieuweTaakBeschrijving.trim(),
        status: 'todo',
        prioriteit: 'medium',
        toegewezen_aan: nieuweTaakToegewezen.trim(),
        deadline: nieuweTaakDeadline || new Date().toISOString().split('T')[0],
        geschatte_tijd: 0,
        bestede_tijd: 0,
      })
      toast.success(`Taak "${nieuweTaakTitel}" toegevoegd`)
      setNieuweTaakOpen(false)
      setNieuweTaakTitel('')
      setNieuweTaakBeschrijving('')
      setNieuweTaakToegewezen('')
      setNieuweTaakDeadline('')
      await onTakenChanged()
    } catch (err) {
      logger.error('Fout bij aanmaken taak:', err)
      toast.error('Kon taak niet aanmaken')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant={weergave === 'board' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setWeergave('board')}
            className={weergave === 'board' ? 'bg-gradient-to-r from-accent to-primary border-0' : ''}
          >
            <LayoutGrid className="mr-1.5 h-4 w-4" />
            Board
          </Button>
          <Button
            variant={weergave === 'tabel' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setWeergave('tabel')}
            className={weergave === 'tabel' ? 'bg-gradient-to-r from-accent to-primary border-0' : ''}
          >
            <List className="mr-1.5 h-4 w-4" />
            Tabel
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Zoek taken..."
              value={zoekterm}
              onChange={(e) => setZoekterm(e.target.value)}
              className="pl-8 h-8 w-48 text-sm"
            />
          </div>
          <Dialog open={nieuweTaakOpen} onOpenChange={(open) => {
            setNieuweTaakOpen(open)
            if (!open) {
              setNieuweTaakTitel('')
              setNieuweTaakBeschrijving('')
              setNieuweTaakToegewezen('')
              setNieuweTaakDeadline('')
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-to-r from-accent to-primary border-0">
                <Plus className="mr-1.5 h-4 w-4" />
                Nieuwe Taak
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nieuwe taak toevoegen</DialogTitle>
                <DialogDescription>
                  Voeg een nieuwe taak toe aan dit project.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="taak-titel">Titel</Label>
                  <Input id="taak-titel" placeholder="Titel van de taak..." value={nieuweTaakTitel} onChange={(e) => setNieuweTaakTitel(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taak-beschrijving">Beschrijving</Label>
                  <Input id="taak-beschrijving" placeholder="Beschrijving..." value={nieuweTaakBeschrijving} onChange={(e) => setNieuweTaakBeschrijving(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="taak-toegewezen">Toegewezen aan</Label>
                    <Input id="taak-toegewezen" placeholder="Naam..." value={nieuweTaakToegewezen} onChange={(e) => setNieuweTaakToegewezen(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taak-deadline">Deadline</Label>
                    <Input id="taak-deadline" type="date" value={nieuweTaakDeadline} onChange={(e) => setNieuweTaakDeadline(e.target.value)} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setNieuweTaakOpen(false)}>Annuleren</Button>
                <Button disabled={!nieuweTaakTitel.trim()} className="bg-gradient-to-r from-accent to-primary border-0" onClick={handleCreateTaak}>
                  Taak toevoegen
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Board View with drag-and-drop */}
      {weergave === 'board' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {taakStatusKolommen.map((kolom) => {
            const kolomTaken = gefilterdesTaken.filter((t) => t.status === kolom.key)
            const isDropTarget = dragOverKolom === kolom.key

            return (
              <div
                key={kolom.key}
                className="space-y-3"
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  setDragOverKolom(kolom.key)
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverKolom(null)
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  handleDrop(kolom.key)
                }}
              >
                <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-t-2 border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full bg-gradient-to-r ${kolom.bgKleur}`} />
                    <h3 className="text-sm font-semibold text-foreground">{kolom.label}</h3>
                  </div>
                  <span className="text-xs text-muted-foreground bg-gray-200 dark:bg-gray-700 rounded-full px-2 py-0.5 font-medium">
                    {kolomTaken.length}
                  </span>
                </div>

                <div className={`min-h-[60px] rounded-xl transition-all duration-200 ${
                  isDropTarget
                    ? 'bg-primary/10 border-2 border-dashed border-primary/40 dark:bg-primary/20'
                    : ''
                }`}>
                  {kolomTaken.length === 0 && !isDropTarget ? (
                    <div className="text-center py-8 text-muted-foreground text-xs border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                      {draggedTaakId ? 'Sleep hierheen' : 'Geen taken'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {kolomTaken.map((taak) => (
                        <TaakCard
                          key={taak.id}
                          taak={taak}
                          onStatusChange={handleStatusChange}
                          isDragging={draggedTaakId === taak.id}
                          onDragStart={() => setDraggedTaakId(taak.id)}
                          onDragEnd={() => { setDraggedTaakId(null); setDragOverKolom(null) }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Table View */}
      {weergave === 'tabel' && (
        <Card className="border-gray-200/80 dark:border-gray-700/80">
          <CardContent className="p-0">
            <ProjectTasksTable taken={gefilterdesTaken} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/* ────────────── Taak Card with drag support ────────────── */

function TaakCard({
  taak,
  onStatusChange,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  taak: Taak
  onStatusChange: (id: string, status: Taak['status']) => void
  isDragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
}) {
  const isOverdue = new Date(taak.deadline) < new Date() && taak.status !== 'klaar'
  const statussen: Taak['status'][] = ['todo', 'bezig', 'review', 'klaar']
  const currentIndex = statussen.indexOf(taak.status)
  const nextStatus = currentIndex < statussen.length - 1 ? statussen[currentIndex + 1] : null

  return (
    <Card
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', taak.id)
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      className={`cursor-grab active:cursor-grabbing transition-all duration-200 border-gray-200/80 dark:border-gray-700/80 ${
        isDragging
          ? 'opacity-40 scale-95 ring-2 ring-primary/50'
          : 'hover:shadow-md hover:-translate-y-0.5'
      }`}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start gap-1.5">
          <GripVertical className="h-4 w-4 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-foreground leading-tight flex-1">{taak.titel}</p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap pl-5">
          <Badge className={`${getPriorityColor(taak.prioriteit)} text-[10px] px-1.5 py-0`}>
            {taak.prioriteit}
          </Badge>
          {nextStatus && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onStatusChange(taak.id, nextStatus)
              }}
              className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              → {nextStatus === 'klaar' ? 'Klaar' : nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
            </button>
          )}
        </div>

        <div className="flex items-center justify-between pl-5">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-wm-pale flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[9px] font-semibold">
                {getInitials(taak.toegewezen_aan)}
              </span>
            </div>
            <span className="text-xs text-muted-foreground truncate">
              {taak.toegewezen_aan}
            </span>
          </div>
          <span className={`text-xs ${isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'}`}>
            {formatDate(taak.deadline)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
