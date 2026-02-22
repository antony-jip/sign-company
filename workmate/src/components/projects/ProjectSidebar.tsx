import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Plus,
  Users,
  Shield,
  ClipboardCheck,
  CreditCard,
  Receipt,
  Eye,
  Pencil,
  Mail,
  Loader2,
  Trash2,
  UserPlus,
  Wrench,
  Calculator,
  Timer,
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
import {
  formatCurrency,
  getStatusColor,
  getInitials,
} from '@/lib/utils'
import {
  createProjectToewijzing,
  deleteProjectToewijzing,
} from '@/services/supabaseService'
import { round2 } from '@/utils/budgetUtils'
import { useAuth } from '@/contexts/AuthContext'
import type { Project, Offerte, Medewerker, ProjectToewijzing, Werkbon, Uitgave } from '@/types'

interface ProjectSidebarProps {
  project: Project
  offertes: Offerte[]
  medewerkers: Medewerker[]
  toewijzingen: ProjectToewijzing[]
  werkbonnen: Werkbon[]
  uitgaven: Uitgave[]
  onToewijzingenChanged: (toewijzingen: ProjectToewijzing[]) => void
  onOfferteView: (id: string) => void
  onOfferteEdit: (id: string) => void
  onOfferteEmail: (offerte: Offerte) => void
  onOfferteFactuur: (offerte: Offerte) => void
  onNieuweOfferte: () => void
  creatingFactuurForOfferte: string | null
}

export function ProjectSidebar({
  project,
  offertes,
  medewerkers,
  toewijzingen,
  werkbonnen,
  uitgaven,
  onToewijzingenChanged,
  onOfferteView,
  onOfferteEdit,
  onOfferteEmail,
  onOfferteFactuur,
  onNieuweOfferte,
  creatingFactuurForOfferte,
}: ProjectSidebarProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [toewijzingMedewerkerId, setToewijzingMedewerkerId] = useState('')
  const [toewijzingRol, setToewijzingRol] = useState<ProjectToewijzing['rol']>('medewerker')
  const [deleteConfirm, setDeleteConfirm] = useState<ProjectToewijzing | null>(null)

  const handleAddToewijzing = async () => {
    if (!toewijzingMedewerkerId || !user) return
    try {
      const created = await createProjectToewijzing({
        user_id: user.id,
        project_id: project.id,
        medewerker_id: toewijzingMedewerkerId,
        rol: toewijzingRol,
      })
      onToewijzingenChanged([...toewijzingen, created])
      setToewijzingMedewerkerId('')
      toast.success('Medewerker toegewezen')
    } catch { toast.error('Kon niet toewijzen') }
  }

  const handleDeleteToewijzing = async () => {
    if (!deleteConfirm) return
    try {
      await deleteProjectToewijzing(deleteConfirm.id)
      onToewijzingenChanged(toewijzingen.filter(t => t.id !== deleteConfirm.id))
      setDeleteConfirm(null)
      toast.success('Toewijzing verwijderd')
    } catch { toast.error('Kon toewijzing niet verwijderen') }
  }

  return (
    <div className="space-y-6">
      {/* Team */}
      <Card className="border-gray-200/80 dark:border-gray-700/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <Users className="h-3.5 w-3.5 text-white" />
            </div>
            Team
            <span className="text-xs text-muted-foreground font-normal ml-auto">{project.team_leden.length} leden</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {project.team_leden.length === 0 ? (
            <p className="text-sm text-muted-foreground">Geen teamleden toegewezen.</p>
          ) : (
            <div className="space-y-2">
              {project.team_leden.map((lid) => (
                <div key={lid} className="flex items-center gap-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-wm-pale flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                    {getInitials(lid)}
                  </div>
                  <span className="text-sm font-medium text-foreground truncate">{lid}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rechten */}
      <Card className="border-gray-200/80 dark:border-gray-700/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Shield className="h-3.5 w-3.5 text-white" />
            </div>
            Rechten
            <span className="text-xs text-muted-foreground font-normal ml-auto">{toewijzingen.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {toewijzingen.length > 0 && (
            <div className="space-y-1.5">
              {toewijzingen.map((tw) => {
                const mw = medewerkers.find(m => m.id === tw.medewerker_id)
                return (
                  <div key={tw.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                      {getInitials(mw?.naam || '?')}
                    </div>
                    <span className="text-sm font-medium text-foreground truncate flex-1">{mw?.naam || 'Onbekend'}</span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                      tw.rol === 'eigenaar' ? 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                      tw.rol === 'viewer' ? 'border-gray-300 bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400' :
                      'border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    }`}>
                      {tw.rol}
                    </Badge>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-red-400 hover:text-red-600"
                      onClick={() => setDeleteConfirm(tw)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}

          <div className="flex items-center gap-2">
            <select
              value={toewijzingMedewerkerId}
              onChange={(e) => setToewijzingMedewerkerId(e.target.value)}
              className="flex-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">Medewerker...</option>
              {medewerkers
                .filter(m => m.status === 'actief' && !toewijzingen.some(t => t.medewerker_id === m.id))
                .map(m => <option key={m.id} value={m.id}>{m.naam}</option>)
              }
            </select>
            <select
              value={toewijzingRol}
              onChange={(e) => setToewijzingRol(e.target.value as ProjectToewijzing['rol'])}
              className="w-24 text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="medewerker">Medewerker</option>
              <option value="eigenaar">Eigenaar</option>
              <option value="viewer">Viewer</option>
            </select>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
              disabled={!toewijzingMedewerkerId}
              onClick={handleAddToewijzing}
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Module koppelingen */}
      <Card className="border-gray-200/80 dark:border-gray-700/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="p-1 rounded-md bg-primary/10">
              <Wrench className="h-3.5 w-3.5 text-primary" />
            </div>
            Snelkoppelingen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-8 text-xs"
            onClick={() => navigate(`/montage?project=${project.id}`)}
          >
            <Wrench className="h-3.5 w-3.5 mr-2" />
            Montage planning
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-8 text-xs"
            onClick={() => navigate(`/nacalculatie?project=${project.id}`)}
          >
            <Calculator className="h-3.5 w-3.5 mr-2" />
            Nacalculatie
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-8 text-xs"
            onClick={() => navigate(`/tijdregistratie?project=${project.id}`)}
          >
            <Timer className="h-3.5 w-3.5 mr-2" />
            Tijdregistratie
          </Button>
        </CardContent>
      </Card>

      {/* Werkbonnen */}
      <Card className="border-gray-200/80 dark:border-gray-700/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1 rounded-md bg-amber-500/10">
                <ClipboardCheck className="h-3.5 w-3.5 text-amber-600" />
              </div>
              Werkbonnen
              <span className="text-xs text-muted-foreground font-normal">{werkbonnen.length}</span>
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/werkbonnen/nieuw`)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {werkbonnen.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">Geen werkbonnen</p>
            </div>
          ) : (
            <div className="space-y-2">
              {werkbonnen.map((wb) => (
                <div
                  key={wb.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/werkbonnen/${wb.id}`)}
                >
                  <div>
                    <p className="text-sm font-medium font-mono">{wb.werkbon_nummer}</p>
                    <p className="text-xs text-muted-foreground">{new Date(wb.datum).toLocaleDateString('nl-NL')}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    wb.status === 'concept' ? 'bg-gray-100 text-gray-700' :
                    wb.status === 'ingediend' ? 'bg-blue-100 text-blue-700' :
                    wb.status === 'goedgekeurd' ? 'bg-green-100 text-green-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {wb.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Uitgaven */}
      <Card className="border-gray-200/80 dark:border-gray-700/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1 rounded-md bg-red-500/10">
                <CreditCard className="h-3.5 w-3.5 text-red-600" />
              </div>
              Uitgaven
              <span className="text-xs text-muted-foreground font-normal">{uitgaven.length}</span>
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate('/uitgaven')}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {uitgaven.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">Geen uitgaven</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {uitgaven.slice(0, 5).map((uit) => (
                  <div key={uit.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{uit.omschrijving}</p>
                      <p className="text-xs text-muted-foreground">{new Date(uit.datum).toLocaleDateString('nl-NL')}</p>
                    </div>
                    <span className="text-sm font-medium">{formatCurrency(uit.bedrag_incl_btw)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t flex justify-between text-sm">
                <span className="text-muted-foreground">Totaal</span>
                <span className="font-semibold">{formatCurrency(round2(uitgaven.reduce((s, u) => s + u.bedrag_incl_btw, 0)))}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Offertes */}
      <Card className="border-gray-200/80 dark:border-gray-700/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Receipt className="h-3.5 w-3.5 text-white" />
              </div>
              Offertes
              <span className="text-xs text-muted-foreground font-normal">{offertes.length}</span>
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onNieuweOfferte} title="Nieuwe offerte">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {offertes.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">Geen offertes</p>
              <Button variant="link" size="sm" className="text-accent dark:text-primary mt-1 h-auto p-0" onClick={onNieuweOfferte}>
                Eerste offerte aanmaken
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {offertes.map((offerte) => (
                <div key={offerte.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{offerte.titel}</p>
                    <Badge className={`${getStatusColor(offerte.status)} text-[10px] px-1.5 py-0 flex-shrink-0`}>
                      {offerte.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{offerte.nummer}</span>
                    <span className="text-sm font-bold text-foreground">{formatCurrency(offerte.totaal)}</span>
                  </div>
                  <div className="flex items-center gap-1 pt-0.5 flex-wrap">
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => onOfferteView(offerte.id)}>
                      <Eye className="h-3 w-3 mr-1" /> Bekijk
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => onOfferteEdit(offerte.id)}>
                      <Pencil className="h-3 w-3 mr-1" /> Bewerk
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => onOfferteEmail(offerte)}>
                      <Mail className="h-3 w-3 mr-1" /> Mail
                    </Button>
                    {offerte.status === 'goedgekeurd' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
                        disabled={creatingFactuurForOfferte === offerte.id}
                        onClick={() => onOfferteFactuur(offerte)}
                      >
                        {creatingFactuurForOfferte === offerte.id ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <CreditCard className="h-3 w-3 mr-1" />
                        )}
                        Factuur
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Toewijzing delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Toewijzing verwijderen</DialogTitle>
            <DialogDescription>
              Weet je zeker dat je deze toewijzing wilt verwijderen?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annuleren</Button>
            <Button variant="destructive" onClick={handleDeleteToewijzing}>Verwijderen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
