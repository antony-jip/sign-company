import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Pencil,
  Mail,
  Phone,
  MapPin,
  Globe,
  Building2,
  FileText,
  FolderKanban,
  Calendar,
  Clock,
  Tag,
  StickyNote,
  User,
  Hash,
  FileIcon,
  Star,
  Paperclip,
} from 'lucide-react'
import { cn, getStatusColor, getPriorityColor, formatDate, formatCurrency, formatDateTime } from '@/lib/utils'
import { getKlant, getProjectenByKlant, getEmails, getDocumenten, updateKlant } from '@/services/supabaseService'
import { AddEditClient } from './AddEditClient'
import type { Klant, Project, Email, Document as DocType } from '@/types'

// Mock activity data for the timeline
const mockActivities = [
  { id: 'a1', type: 'project', beschrijving: 'Project gestart', datum: '2025-02-15T10:00:00Z', icon: FolderKanban },
  { id: 'a2', type: 'offerte', beschrijving: 'Offerte verzonden', datum: '2025-02-10T14:00:00Z', icon: FileText },
  { id: 'a3', type: 'email', beschrijving: 'Email ontvangen', datum: '2025-02-08T09:30:00Z', icon: Mail },
  { id: 'a4', type: 'meeting', beschrijving: 'Klantoverleg gehad', datum: '2025-02-05T11:00:00Z', icon: Calendar },
  { id: 'a5', type: 'document', beschrijving: 'Document gedeeld', datum: '2025-02-01T16:00:00Z', icon: FileIcon },
]

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ClientProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [klant, setKlant] = useState<Klant | null>(null)
  const [clientProjecten, setClientProjecten] = useState<Project[]>([])
  const [clientEmails, setClientEmails] = useState<Email[]>([])
  const [clientDocumenten, setClientDocumenten] = useState<DocType[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setIsLoading(true)
    Promise.all([
      getKlant(id),
      getProjectenByKlant(id),
      getEmails(),
      getDocumenten(),
    ]).then(([klantData, projecten, allEmails, allDocs]) => {
      setKlant(klantData)
      setClientProjecten(projecten)
      if (klantData) {
        const email = klantData.email.toLowerCase()
        setClientEmails(
          allEmails.filter(
            (e) =>
              e.van.toLowerCase().includes(email) ||
              e.aan.toLowerCase().includes(email)
          )
        )
      }
      setClientDocumenten(allDocs.filter((d) => d.klant_id === id))
      setIsLoading(false)
    })
  }, [id])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-lg text-gray-500 dark:text-gray-400">
          Laden...
        </p>
      </div>
    )
  }

  if (!klant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-lg text-gray-500 dark:text-gray-400">
          Klant niet gevonden
        </p>
        <Button variant="outline" onClick={() => navigate('/klanten')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug naar klanten
        </Button>
      </div>
    )
  }

  function handleKlantSaved(updatedKlant: Klant) {
    setKlant(updatedKlant)
  }

  return (
    <div className="space-y-6">
      {/* Back button + Header */}
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/klanten')}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Terug naar klanten
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <Building2 className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {klant.bedrijfsnaam}
                </h1>
                <Badge className={cn('capitalize', getStatusColor(klant.status))}>
                  {klant.status}
                </Badge>
              </div>
              <p className="text-gray-500 dark:text-gray-400">
                {klant.contactpersoon}
              </p>
            </div>
          </div>
          <Button onClick={() => setEditDialogOpen(true)}>
            <Pencil className="w-4 h-4 mr-2" />
            Bewerken
          </Button>
        </div>
      </div>

      {/* Contact info summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                <a
                  href={`mailto:${klant.email}`}
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline truncate block"
                >
                  {klant.email}
                </a>
              </div>
            </div>
            {klant.telefoon && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Telefoon</p>
                  <a
                    href={`tel:${klant.telefoon}`}
                    className="text-sm font-medium text-gray-900 dark:text-white hover:underline"
                  >
                    {klant.telefoon}
                  </a>
                </div>
              </div>
            )}
            {klant.stad && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Locatie</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {klant.stad}
                  </p>
                </div>
              </div>
            )}
            {klant.website && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <Globe className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Website</p>
                  <a
                    href={klant.website.startsWith('http') ? klant.website : `https://${klant.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline truncate block"
                  >
                    {klant.website}
                  </a>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overzicht" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overzicht">Overzicht</TabsTrigger>
          <TabsTrigger value="projecten">
            Projecten
            {clientProjecten.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0">
                {clientProjecten.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="communicatie">
            Communicatie
            {clientEmails.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0">
                {clientEmails.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="documenten">
            Documenten
            {clientDocumenten.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0">
                {clientDocumenten.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ===================== OVERZICHT TAB ===================== */}
        <TabsContent value="overzicht" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Client details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Bedrijfsgegevens
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailRow icon={User} label="Contactpersoon" value={klant.contactpersoon} />
                  <DetailRow icon={Mail} label="Email" value={klant.email} />
                  <DetailRow icon={Phone} label="Telefoon" value={klant.telefoon} />
                  <DetailRow icon={MapPin} label="Adres" value={[klant.adres, klant.postcode, klant.stad].filter(Boolean).join(', ')} />
                  <DetailRow icon={Globe} label="Website" value={klant.website} />
                  <DetailRow icon={Hash} label="KvK Nummer" value={klant.kvk_nummer} />
                  <DetailRow icon={Hash} label="BTW Nummer" value={klant.btw_nummer} />
                  <DetailRow
                    icon={Calendar}
                    label="Klant sinds"
                    value={formatDate(klant.created_at)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Activity timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Recente Activiteiten
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockActivities.map((activity, index) => {
                    const Icon = activity.icon
                    return (
                      <div key={activity.id} className="flex gap-3">
                        <div className="relative flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          {index < mockActivities.length - 1 && (
                            <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700 mt-1" />
                          )}
                        </div>
                        <div className="pb-4">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {activity.beschrijving}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDateTime(activity.datum)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tags + Notes row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                {klant.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {klant.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-sm">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Geen tags toegevoegd
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <StickyNote className="w-4 h-4" />
                  Notities
                </CardTitle>
              </CardHeader>
              <CardContent>
                {klant.notities ? (
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {klant.notities}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Geen notities
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===================== PROJECTEN TAB ===================== */}
        <TabsContent value="projecten" className="space-y-4">
          {clientProjecten.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderKanban className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  Geen projecten voor deze klant
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clientProjecten.map((project) => (
                <Card
                  key={project.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/projecten/${project.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{project.naam}</CardTitle>
                      <Badge className={cn('capitalize flex-shrink-0', getStatusColor(project.status))}>
                        {project.status}
                      </Badge>
                    </div>
                    {project.beschrijving && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                        {project.beschrijving}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Voortgang</span>
                        <span className="font-medium text-gray-900 dark:text-white">{project.voortgang}%</span>
                      </div>
                      <Progress value={project.voortgang} className="h-2" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <span className="text-gray-500 dark:text-gray-400">
                          {formatDate(project.start_datum)} - {formatDate(project.eind_datum)}
                        </span>
                      </div>
                      <Badge className={cn('capitalize text-xs', getPriorityColor(project.prioriteit))}>
                        {project.prioriteit}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100 dark:border-gray-800">
                      <span className="text-gray-500 dark:text-gray-400">Budget</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(project.besteed)} / {formatCurrency(project.budget)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ===================== COMMUNICATIE TAB ===================== */}
        <TabsContent value="communicatie" className="space-y-4">
          {clientEmails.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Mail className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  Geen emailcommunicatie gevonden
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {clientEmails.map((email) => (
                <Card
                  key={email.id}
                  className={cn(
                    'cursor-pointer hover:shadow-md transition-shadow',
                    !email.gelezen && 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20'
                  )}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Mail className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn(
                            'text-sm truncate',
                            !email.gelezen
                              ? 'font-semibold text-gray-900 dark:text-white'
                              : 'font-medium text-gray-700 dark:text-gray-300'
                          )}>
                            {email.onderwerp}
                          </p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {email.starred && (
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            )}
                            {email.bijlagen > 0 && (
                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                <Paperclip className="w-3.5 h-3.5" />
                                {email.bijlagen}
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Van: {email.van} &middot; {formatDateTime(email.datum)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5 line-clamp-2">
                          {email.inhoud}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ===================== DOCUMENTEN TAB ===================== */}
        <TabsContent value="documenten" className="space-y-4">
          {clientDocumenten.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  Geen documenten gevonden
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {clientDocumenten.map((doc) => (
                <Card key={doc.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                        <FileIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={doc.naam}>
                          {doc.naam}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {formatFileSize(doc.grootte)} &middot; {doc.map}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <Badge className={cn('text-xs capitalize', getStatusColor(doc.status))}>
                        {doc.status}
                      </Badge>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {formatDate(doc.updated_at)}
                      </span>
                    </div>
                    {doc.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {doc.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0 font-normal">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      <AddEditClient
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        klant={klant}
        onSaved={handleKlantSaved}
      />
    </div>
  )
}

// Helper component for detail rows
function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm text-gray-900 dark:text-white break-words">{value}</p>
      </div>
    </div>
  )
}
