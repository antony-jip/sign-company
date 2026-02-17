import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Plus,
  LayoutGrid,
  List,
  Upload,
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileImage,
  File,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  formatCurrency,
  formatDate,
  getStatusColor,
  getPriorityColor,
  getInitials,
} from '@/lib/utils'
import { getProject, getTakenByProject, getDocumenten, createTaak, updateTaak, updateProject } from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import { ProjectTasksTable } from './ProjectTasksTable'
import { TimelineView } from './TimelineView'
import { TeamAvailability } from './TeamAvailability'
import type { Taak, Project, Document } from '@/types'

const statusLabels: Record<string, string> = {
  gepland: 'Gepland',
  actief: 'Actief',
  'in-review': 'In review',
  afgerond: 'Afgerond',
  'on-hold': 'On-hold',
}

const taakStatusLabels: Record<string, string> = {
  todo: 'Todo',
  bezig: 'Bezig',
  review: 'Review',
  klaar: 'Klaar',
}

const taakStatusKolommen: Array<{ key: string; label: string; kleur: string }> = [
  { key: 'todo', label: 'Todo', kleur: 'border-t-gray-400' },
  { key: 'bezig', label: 'Bezig', kleur: 'border-t-blue-500' },
  { key: 'review', label: 'Review', kleur: 'border-t-yellow-500' },
  { key: 'klaar', label: 'Klaar', kleur: 'border-t-green-500' },
]

function getFileIcon(type: string) {
  if (type.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />
  if (type.includes('spreadsheet') || type.includes('xlsx') || type.includes('csv'))
    return <FileSpreadsheet className="h-8 w-8 text-green-600" />
  if (type.includes('zip') || type.includes('archive'))
    return <FileArchive className="h-8 w-8 text-yellow-600" />
  if (type.includes('image') || type.includes('jpeg') || type.includes('png'))
    return <FileImage className="h-8 w-8 text-purple-500" />
  if (type.includes('illustrator') || type.includes('acad'))
    return <File className="h-8 w-8 text-orange-500" />
  return <File className="h-8 w-8 text-gray-400" />
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [takenWeergave, setTakenWeergave] = useState<'board' | 'tabel'>('board')
  const [nieuweTaakOpen, setNieuweTaakOpen] = useState(false)
  const [nieuweTaakTitel, setNieuweTaakTitel] = useState('')
  const [nieuweTaakBeschrijving, setNieuweTaakBeschrijving] = useState('')
  const [nieuweTaakToegewezen, setNieuweTaakToegewezen] = useState('')
  const [nieuweTaakDeadline, setNieuweTaakDeadline] = useState('')

  const [project, setProject] = useState<Project | null>(null)
  const [projectTaken, setProjectTaken] = useState<Taak[]>([])
  const [projectDocumenten, setProjectDocumenten] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTaken = useCallback(async () => {
    if (!id) return
    try {
      const taken = await getTakenByProject(id)
      setProjectTaken(taken)
    } catch (err) {
      console.error('Fout bij ophalen taken:', err)
    }
  }, [id])

  useEffect(() => {
    async function fetchData() {
      if (!id) return
      setIsLoading(true)
      try {
        const [projectData, takenData, allDocumenten] = await Promise.all([
          getProject(id),
          getTakenByProject(id),
          getDocumenten(),
        ])
        setProject(projectData)
        setProjectTaken(takenData)
        setProjectDocumenten(allDocumenten.filter((d) => d.project_id === id))
      } catch (err) {
        console.error('Fout bij ophalen projectgegevens:', err)
        toast.error('Kon projectgegevens niet laden')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [id])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link to="/projecten">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Terug naar projecten
          </Link>
        </Button>
        <Card>
          <CardContent className="py-16 text-center">
            <div className="animate-pulse space-y-3">
              <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mx-auto" />
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mx-auto" />
            </div>
            <p className="text-sm text-muted-foreground mt-4">Project laden...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link to="/projecten">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Terug naar projecten
          </Link>
        </Button>
        <Card>
          <CardContent className="py-16 text-center">
            <h3 className="text-lg font-medium text-foreground">Project niet gevonden</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Het project met ID "{id}" bestaat niet.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const budgetPercentage = project.budget > 0 ? (project.besteed / project.budget) * 100 : 0
  const budgetOverschrijding = project.besteed > project.budget

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/projecten">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Terug naar projecten
          </Link>
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{project.naam}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {project.klant_naam || 'Onbekende klant'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${getStatusColor(project.status)} text-sm px-3 py-1`}>
              {statusLabels[project.status] || project.status}
            </Badge>
            <Badge className={`${getPriorityColor(project.prioriteit)} text-sm px-3 py-1`}>
              {project.prioriteit.charAt(0).toUpperCase() + project.prioriteit.slice(1)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overzicht" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
          <TabsTrigger value="overzicht">Overzicht</TabsTrigger>
          <TabsTrigger value="taken">Taken</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="tijdlijn">Tijdlijn</TabsTrigger>
          <TabsTrigger value="bestanden">Bestanden</TabsTrigger>
        </TabsList>

        {/* ────────────── Overzicht Tab ────────────── */}
        <TabsContent value="overzicht" className="space-y-6">
          {/* Project Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Projectgegevens</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Klant
                    </p>
                    <p className="text-sm font-medium text-foreground mt-1">
                      {project.klant_naam || 'Onbekend'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Status
                    </p>
                    <div className="mt-1">
                      <Badge className={getStatusColor(project.status)}>
                        {statusLabels[project.status]}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Start datum
                    </p>
                    <p className="text-sm font-medium text-foreground mt-1">
                      {formatDate(project.start_datum)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Eind datum
                    </p>
                    <p className="text-sm font-medium text-foreground mt-1">
                      {formatDate(project.eind_datum)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Prioriteit
                    </p>
                    <div className="mt-1">
                      <Badge className={getPriorityColor(project.prioriteit)}>
                        {project.prioriteit.charAt(0).toUpperCase() +
                          project.prioriteit.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Teamleden
                    </p>
                    <p className="text-sm font-medium text-foreground mt-1">
                      {project.team_leden.length} personen
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Budget & Voortgang */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Budget & Voortgang</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Voortgang */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Voortgang
                    </p>
                    <span className="text-sm font-semibold text-foreground">
                      {project.voortgang}%
                    </span>
                  </div>
                  <Progress value={project.voortgang} className="h-3" />
                </div>

                {/* Budget */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Budget
                    </p>
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(project.budget)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Besteed
                    </p>
                    <span
                      className={`text-sm font-semibold ${
                        budgetOverschrijding
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-foreground'
                      }`}
                    >
                      {formatCurrency(project.besteed)}
                    </span>
                  </div>
                </div>

                {/* Budget bar visualization */}
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">
                    Budget vs Besteed
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-16">Budget</span>
                      <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-16">Besteed</span>
                      <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            budgetOverschrijding ? 'bg-red-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">
                      {budgetPercentage.toFixed(0)}% van budget
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Resterend: {formatCurrency(Math.max(project.budget - project.besteed, 0))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Beschrijving */}
          {project.beschrijving && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Beschrijving</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground leading-relaxed">{project.beschrijving}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ────────────── Taken Tab ────────────── */}
        <TabsContent value="taken" className="space-y-4">
          {/* Taken header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant={takenWeergave === 'board' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTakenWeergave('board')}
              >
                <LayoutGrid className="mr-1.5 h-4 w-4" />
                Board
              </Button>
              <Button
                variant={takenWeergave === 'tabel' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTakenWeergave('tabel')}
              >
                <List className="mr-1.5 h-4 w-4" />
                Tabel
              </Button>
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
                <Button size="sm">
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
                    <Input
                      id="taak-titel"
                      placeholder="Titel van de taak..."
                      value={nieuweTaakTitel}
                      onChange={(e) => setNieuweTaakTitel(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taak-beschrijving">Beschrijving</Label>
                    <Input
                      id="taak-beschrijving"
                      placeholder="Beschrijving..."
                      value={nieuweTaakBeschrijving}
                      onChange={(e) => setNieuweTaakBeschrijving(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="taak-toegewezen">Toegewezen aan</Label>
                      <Input
                        id="taak-toegewezen"
                        placeholder="Naam..."
                        value={nieuweTaakToegewezen}
                        onChange={(e) => setNieuweTaakToegewezen(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taak-deadline">Deadline</Label>
                      <Input
                        id="taak-deadline"
                        type="date"
                        value={nieuweTaakDeadline}
                        onChange={(e) => setNieuweTaakDeadline(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setNieuweTaakOpen(false)}>
                    Annuleren
                  </Button>
                  <Button
                    disabled={!nieuweTaakTitel.trim()}
                    onClick={async () => {
                      try {
                        await createTaak({
                          user_id: user?.id || 'demo',
                          project_id: id!,
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
                        await fetchTaken()
                      } catch (err) {
                        console.error('Fout bij aanmaken taak:', err)
                        toast.error('Kon taak niet aanmaken')
                      }
                    }}
                  >
                    Taak toevoegen
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Board View */}
          {takenWeergave === 'board' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {taakStatusKolommen.map((kolom) => {
                const kolomTaken = projectTaken.filter((t) => t.status === kolom.key)

                return (
                  <div key={kolom.key} className="space-y-3">
                    <div
                      className={`flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-t-2 ${kolom.kleur}`}
                    >
                      <h3 className="text-sm font-semibold text-foreground">{kolom.label}</h3>
                      <span className="text-xs text-muted-foreground bg-gray-200 dark:bg-gray-700 rounded-full px-2 py-0.5 font-medium">
                        {kolomTaken.length}
                      </span>
                    </div>

                    {kolomTaken.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-xs border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                        Geen taken
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {kolomTaken.map((taak) => (
                          <TaakCard key={taak.id} taak={taak} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Table View */}
          {takenWeergave === 'tabel' && (
            <Card>
              <CardContent className="p-0">
                <ProjectTasksTable taken={projectTaken} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ────────────── Team Tab ────────────── */}
        <TabsContent value="team" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Projectteam</h2>
              <p className="text-sm text-muted-foreground">
                {project.team_leden.length} teamleden toegewezen
              </p>
            </div>
          </div>
          <TeamAvailability teamLeden={project.team_leden} />
        </TabsContent>

        {/* ────────────── Tijdlijn Tab ────────────── */}
        <TabsContent value="tijdlijn" className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Projecttijdlijn</h2>
            <p className="text-sm text-muted-foreground">
              {formatDate(project.start_datum)} tot {formatDate(project.eind_datum)}
            </p>
          </div>
          <Card>
            <CardContent className="p-6">
              <TimelineView
                taken={projectTaken}
                projectStart={project.start_datum}
                projectEind={project.eind_datum}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ────────────── Bestanden Tab ────────────── */}
        <TabsContent value="bestanden" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Bestanden</h2>
              <p className="text-sm text-muted-foreground">
                {projectDocumenten.length} bestanden
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => toast.info('Upload functionaliteit binnenkort beschikbaar')}>
              <Upload className="mr-1.5 h-4 w-4" />
              Uploaden
            </Button>
          </div>

          {projectDocumenten.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
                <h3 className="text-lg font-medium text-foreground">Geen bestanden</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Er zijn nog geen bestanden toegevoegd aan dit project.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {projectDocumenten.map((doc) => (
                <Card
                  key={doc.id}
                  className="hover:shadow-md transition-shadow duration-200 cursor-pointer"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">{getFileIcon(doc.type)}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {doc.naam}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatFileSize(doc.grootte)}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge
                            className={`${getStatusColor(doc.status)} text-[10px] px-1.5 py-0`}
                          >
                            {doc.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground capitalize">
                            {doc.type}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(doc.created_at)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

/* ────────────── Taak Card Component ────────────── */

function TaakCard({ taak }: { taak: Taak }) {
  const isOverdue = new Date(taak.deadline) < new Date() && taak.status !== 'klaar'

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-3 space-y-2">
        <p className="text-sm font-medium text-foreground leading-tight">{taak.titel}</p>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge className={`${getPriorityColor(taak.prioriteit)} text-[10px] px-1.5 py-0`}>
            {taak.prioriteit}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-700 dark:text-blue-300 text-[9px] font-semibold">
                {getInitials(taak.toegewezen_aan)}
              </span>
            </div>
            <span className="text-xs text-muted-foreground truncate">
              {taak.toegewezen_aan}
            </span>
          </div>
          <span
            className={`text-xs ${
              isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'
            }`}
          >
            {formatDate(taak.deadline)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
