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
  CalendarDays,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  Target,
  Briefcase,
  ArrowUpRight,
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
import { getProject, getTakenByProject, getDocumenten, createTaak } from '@/services/supabaseService'
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

const taakStatusKolommen: Array<{ key: string; label: string; kleur: string; bgKleur: string }> = [
  { key: 'todo', label: 'Todo', kleur: 'border-t-gray-400', bgKleur: 'from-gray-400 to-gray-500' },
  { key: 'bezig', label: 'Bezig', kleur: 'border-t-blue-500', bgKleur: 'from-blue-400 to-blue-600' },
  { key: 'review', label: 'Review', kleur: 'border-t-yellow-500', bgKleur: 'from-yellow-400 to-orange-500' },
  { key: 'klaar', label: 'Klaar', kleur: 'border-t-green-500', bgKleur: 'from-emerald-400 to-green-600' },
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
      <div className="space-y-6 animate-fade-in-up">
        <Button variant="ghost" asChild>
          <Link to="/projecten">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Terug naar projecten
          </Link>
        </Button>
        <Card>
          <CardContent className="py-16 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
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
  const isOverdue = new Date(project.eind_datum) < new Date() && project.status !== 'afgerond'
  const daysLeft = Math.ceil((new Date(project.eind_datum).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  const takenKlaar = projectTaken.filter(t => t.status === 'klaar').length
  const takenTotaal = projectTaken.length

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ── Back + Header ── */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4 text-muted-foreground hover:text-foreground">
          <Link to="/projecten">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Terug naar projecten
          </Link>
        </Button>

        {/* Project Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-400 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-400 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
          </div>

          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="h-6 w-6 text-indigo-300" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{project.naam}</h1>
                  <p className="text-sm text-indigo-200/70 mt-0.5 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {project.klant_naam || 'Onbekende klant'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`${getStatusColor(project.status)} text-sm px-3 py-1`}>
                  {statusLabels[project.status] || project.status}
                </Badge>
                <Badge className={`${getPriorityColor(project.prioriteit)} text-sm px-3 py-1`}>
                  {project.prioriteit.charAt(0).toUpperCase() + project.prioriteit.slice(1)}
                </Badge>
              </div>
            </div>

            {/* Quick stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-1.5 mb-1">
                  <Target className="h-3.5 w-3.5 text-indigo-300" />
                  <span className="text-[10px] text-indigo-200/80 uppercase tracking-wider font-medium">Voortgang</span>
                </div>
                <p className="text-xl font-bold">{project.voortgang}%</p>
                <div className="mt-1 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full"
                    style={{ width: `${project.voortgang}%` }}
                  />
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-1.5 mb-1">
                  <DollarSign className="h-3.5 w-3.5 text-blue-300" />
                  <span className="text-[10px] text-indigo-200/80 uppercase tracking-wider font-medium">Budget</span>
                </div>
                <p className="text-xl font-bold">{formatCurrency(project.budget)}</p>
                <p className={`text-[10px] mt-0.5 ${budgetOverschrijding ? 'text-red-300' : 'text-indigo-200/60'}`}>
                  {formatCurrency(project.besteed)} besteed ({budgetPercentage.toFixed(0)}%)
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-1.5 mb-1">
                  <CalendarDays className="h-3.5 w-3.5 text-purple-300" />
                  <span className="text-[10px] text-indigo-200/80 uppercase tracking-wider font-medium">Deadline</span>
                </div>
                <p className={`text-xl font-bold ${isOverdue ? 'text-amber-400' : ''}`}>
                  {isOverdue ? `${Math.abs(daysLeft)}d` : project.status === 'afgerond' ? 'Klaar' : `${daysLeft}d`}
                </p>
                <p className={`text-[10px] mt-0.5 ${isOverdue ? 'text-amber-300/80' : 'text-indigo-200/60'}`}>
                  {isOverdue ? 'verlopen' : project.status === 'afgerond' ? 'afgerond' : 'resterend'}
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="h-3.5 w-3.5 text-green-300" />
                  <span className="text-[10px] text-indigo-200/80 uppercase tracking-wider font-medium">Taken</span>
                </div>
                <p className="text-xl font-bold">{takenKlaar}/{takenTotaal}</p>
                <p className="text-[10px] mt-0.5 text-indigo-200/60">afgerond</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="overzicht" className="space-y-4">
        <TabsList className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/80 dark:border-gray-700/80 p-1 h-auto">
          <TabsTrigger value="overzicht" className="text-sm px-4 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm">
            Overzicht
          </TabsTrigger>
          <TabsTrigger value="taken" className="text-sm px-4 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm">
            Taken ({takenTotaal})
          </TabsTrigger>
          <TabsTrigger value="team" className="text-sm px-4 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm">
            Team ({project.team_leden.length})
          </TabsTrigger>
          <TabsTrigger value="tijdlijn" className="text-sm px-4 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm">
            Tijdlijn
          </TabsTrigger>
          <TabsTrigger value="bestanden" className="text-sm px-4 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm">
            Bestanden ({projectDocumenten.length})
          </TabsTrigger>
        </TabsList>

        {/* ────────────── Overzicht Tab ────────────── */}
        <TabsContent value="overzicht" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column: Project details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Beschrijving */}
              {project.beschrijving && (
                <Card className="border-gray-200/80 dark:border-gray-700/80">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                        <FileText className="h-3.5 w-3.5 text-white" />
                      </div>
                      Beschrijving
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground leading-relaxed">{project.beschrijving}</p>
                  </CardContent>
                </Card>
              )}

              {/* Budget visual */}
              <Card className="border-gray-200/80 dark:border-gray-700/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <DollarSign className="h-3.5 w-3.5 text-white" />
                    </div>
                    Budget & Besteding
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Budget</p>
                      <p className="text-lg font-bold text-foreground">{formatCurrency(project.budget)}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Besteed</p>
                      <p className={`text-lg font-bold ${budgetOverschrijding ? 'text-red-500' : 'text-foreground'}`}>
                        {formatCurrency(project.besteed)}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Resterend</p>
                      <p className={`text-lg font-bold ${budgetOverschrijding ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {formatCurrency(Math.max(project.budget - project.besteed, 0))}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">{budgetPercentage.toFixed(0)}% van budget besteed</span>
                    </div>
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          budgetOverschrijding
                            ? 'bg-gradient-to-r from-red-400 to-red-600'
                            : budgetPercentage > 80
                            ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                            : 'bg-gradient-to-r from-indigo-400 to-purple-500'
                        }`}
                        style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right column: Info sidebar */}
            <div className="space-y-6">
              <Card className="border-gray-200/80 dark:border-gray-700/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                      <Briefcase className="h-3.5 w-3.5 text-white" />
                    </div>
                    Projectgegevens
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <InfoRow label="Klant" value={project.klant_naam || 'Onbekend'} />
                    <InfoRow label="Status">
                      <Badge className={getStatusColor(project.status)}>
                        {statusLabels[project.status]}
                      </Badge>
                    </InfoRow>
                    <InfoRow label="Prioriteit">
                      <Badge className={getPriorityColor(project.prioriteit)}>
                        {project.prioriteit.charAt(0).toUpperCase() + project.prioriteit.slice(1)}
                      </Badge>
                    </InfoRow>
                    <InfoRow label="Startdatum" value={formatDate(project.start_datum)} />
                    <InfoRow label="Einddatum" value={formatDate(project.eind_datum)} />
                    <InfoRow label="Teamleden" value={`${project.team_leden.length} personen`} />
                    <InfoRow label="Voortgang" value={`${project.voortgang}%`} />
                  </div>
                </CardContent>
              </Card>

              {/* Team preview */}
              {project.team_leden.length > 0 && (
                <Card className="border-gray-200/80 dark:border-gray-700/80">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                        <Users className="h-3.5 w-3.5 text-white" />
                      </div>
                      Team
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {project.team_leden.map((lid, i) => (
                        <div
                          key={lid}
                          className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-1.5"
                        >
                          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold">
                            {getInitials(lid)}
                          </div>
                          <span className="text-xs font-medium text-foreground">{lid}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ────────────── Taken Tab ────────────── */}
        <TabsContent value="taken" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant={takenWeergave === 'board' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTakenWeergave('board')}
                className={takenWeergave === 'board' ? 'bg-gradient-to-r from-indigo-500 to-purple-600 border-0' : ''}
              >
                <LayoutGrid className="mr-1.5 h-4 w-4" />
                Board
              </Button>
              <Button
                variant={takenWeergave === 'tabel' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTakenWeergave('tabel')}
                className={takenWeergave === 'tabel' ? 'bg-gradient-to-r from-indigo-500 to-purple-600 border-0' : ''}
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
                <Button size="sm" className="bg-gradient-to-r from-indigo-500 to-purple-600 border-0">
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
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 border-0"
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
                    <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-t-2 border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full bg-gradient-to-r ${kolom.bgKleur}`} />
                        <h3 className="text-sm font-semibold text-foreground">{kolom.label}</h3>
                      </div>
                      <span className="text-xs text-muted-foreground bg-gray-200 dark:bg-gray-700 rounded-full px-2 py-0.5 font-medium">
                        {kolomTaken.length}
                      </span>
                    </div>

                    {kolomTaken.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-xs border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
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
            <Card className="border-gray-200/80 dark:border-gray-700/80">
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
          <Card className="border-gray-200/80 dark:border-gray-700/80">
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
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <div className="h-16 w-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground opacity-40" />
                </div>
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
                  className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 border-gray-200/80 dark:border-gray-700/80 cursor-pointer group"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform duration-200">
                        {getFileIcon(doc.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
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

/* ────────────── Info Row Component ────────────── */

function InfoRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
      {children || <span className="text-sm font-medium text-foreground">{value}</span>}
    </div>
  )
}

/* ────────────── Taak Card Component ────────────── */

function TaakCard({ taak }: { taak: Taak }) {
  const isOverdue = new Date(taak.deadline) < new Date() && taak.status !== 'klaar'

  return (
    <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-gray-200/80 dark:border-gray-700/80">
      <CardContent className="p-3 space-y-2">
        <p className="text-sm font-medium text-foreground leading-tight">{taak.titel}</p>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge className={`${getPriorityColor(taak.prioriteit)} text-[10px] px-1.5 py-0`}>
            {taak.prioriteit}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[9px] font-semibold">
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
