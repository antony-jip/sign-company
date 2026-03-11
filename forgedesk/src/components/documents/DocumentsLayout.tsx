import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Upload,
  Grid3X3,
  List,
  Columns3,
  FileText,
  FileSpreadsheet,
  Image,
  File,
} from 'lucide-react'
import { cn, formatDate, getStatusColor } from '@/lib/utils'
import { getDocumenten, deleteDocument } from '@/services/supabaseService'
import { DocumentFolders } from './DocumentFolders'
import { DocumentsPipeline } from './DocumentsPipeline'
import { DocumentUpload } from './DocumentUpload'
import type { Document } from '@/types'

type ViewMode = 'grid' | 'list' | 'pipeline'
type TypeFilter = 'alle' | 'pdf' | 'docx' | 'xlsx' | 'afbeelding'

function getFileIcon(type: string) {
  const lower = type.toLowerCase()
  if (lower.includes('pdf')) return FileText
  if (lower.includes('spreadsheet') || lower.includes('xlsx') || lower.includes('xls') || lower.includes('csv')) return FileSpreadsheet
  if (lower.includes('image') || lower.includes('png') || lower.includes('jpg') || lower.includes('jpeg') || lower.includes('svg')) return Image
  return File
}

function getFileIconColor(type: string): string {
  const lower = type.toLowerCase()
  if (lower.includes('pdf')) return 'text-red-500'
  if (lower.includes('spreadsheet') || lower.includes('xlsx') || lower.includes('xls')) return 'text-green-500'
  if (lower.includes('image') || lower.includes('png') || lower.includes('jpg') || lower.includes('jpeg')) return 'text-primary'
  if (lower.includes('word') || lower.includes('docx') || lower.includes('doc')) return 'text-blue-500'
  return 'text-muted-foreground'
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function getTypeLabel(type: string): string {
  const lower = type.toLowerCase()
  if (lower.includes('pdf')) return 'PDF'
  if (lower.includes('spreadsheet') || lower.includes('xlsx')) return 'XLSX'
  if (lower.includes('word') || lower.includes('docx')) return 'DOCX'
  if (lower.includes('image/png') || lower.endsWith('.png')) return 'PNG'
  if (lower.includes('image/jpeg') || lower.includes('image/jpg')) return 'JPG'
  if (lower.includes('dwg') || lower.includes('acad')) return 'DWG'
  if (lower.includes('illustrator') || lower.includes('.ai')) return 'AI'
  if (lower.includes('zip')) return 'ZIP'
  return type.split('/').pop()?.toUpperCase() || 'FILE'
}

function matchesTypeFilter(doc: Document, filter: TypeFilter): boolean {
  if (filter === 'alle') return true
  const lower = doc.type.toLowerCase()
  const name = doc.naam.toLowerCase()
  if (filter === 'pdf') return lower.includes('pdf') || name.endsWith('.pdf')
  if (filter === 'docx') return lower.includes('word') || lower.includes('docx') || name.endsWith('.docx') || name.endsWith('.doc')
  if (filter === 'xlsx') return lower.includes('spreadsheet') || lower.includes('xlsx') || name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')
  if (filter === 'afbeelding') return lower.includes('image') || name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.svg')
  return true
}

function filterByFolder(docs: Document[], folder: string): Document[] {
  if (folder === 'Alle') return docs
  if (folder === 'Archief') return docs.filter((d) => d.status === 'gearchiveerd')
  if (folder === 'Projecten') return docs.filter((d) => d.project_id !== null)
  if (folder === 'Klanten') return docs.filter((d) => d.klant_id !== null && d.project_id === null)
  if (folder === 'Templates') return docs.filter((d) => d.tags.some((t) => t.toLowerCase().includes('template') || t.toLowerCase().includes('sjabloon')))
  return docs
}

export function DocumentsLayout() {
  const [activeFolder, setActiveFolder] = useState('Alle')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('alle')
  const [searchQuery, setSearchQuery] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [documenten, setDocumenten] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getDocumenten().then((d) => {
      setDocumenten(d)
      setIsLoading(false)
    })
  }, [])

  const filteredDocuments = useMemo(() => {
    let docs = [...documenten]

    // Filter by folder
    docs = filterByFolder(docs, activeFolder)

    // Filter by type
    docs = docs.filter((d) => matchesTypeFilter(d, typeFilter))

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      docs = docs.filter(
        (d) =>
          d.naam.toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q)) ||
          d.map.toLowerCase().includes(q)
      )
    }

    return docs
  }, [documenten, activeFolder, typeFilter, searchQuery])

  const handleUploadZoneClick = () => {
    setUploadOpen(true)
  }

  return (
    <div className="h-full flex flex-col mod-strip mod-strip-documenten">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="page-title tracking-tight">Documenten</h1>
        <Button onClick={() => setUploadOpen(true)} className="gap-2">
          <Upload className="w-4 h-4" />
          Upload
        </Button>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        {/* Sidebar */}
        <div className="hidden lg:block w-56 flex-shrink-0">
          <Card className="h-full">
            <DocumentFolders
              activeFolder={activeFolder}
              onFolderChange={setActiveFolder}
              documents={documenten}
            />
          </Card>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Upload zone */}
          <div
            onClick={handleUploadZoneClick}
            className="border-2 border-dashed border-border dark:border-border rounded-lg p-6 mb-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors"
          >
            <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              Sleep bestanden hierheen of klik om te uploaden
            </p>
          </div>

          {/* Search + View toggle */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-3">
            {/* Mobile folder selector */}
            <div className="lg:hidden flex items-center gap-1.5 flex-wrap">
              {['Alle', 'Projecten', 'Klanten', 'Templates', 'Archief'].map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFolder(f)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                    activeFolder === f
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Zoek documenten..."
                className="pl-10"
              />
            </div>

            <div className="flex items-center border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="icon"
                className="rounded-none h-9 w-9"
                onClick={() => setViewMode('grid')}
                title="Rasterweergave"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                className="rounded-none h-9 w-9"
                onClick={() => setViewMode('list')}
                title="Lijstweergave"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'pipeline' ? 'default' : 'ghost'}
                size="icon"
                className="rounded-none h-9 w-9"
                onClick={() => setViewMode('pipeline')}
                title="Pipeline weergave"
              >
                <Columns3 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Type filter pills */}
          <div className="flex items-center gap-1.5 mb-4">
            {(['alle', 'pdf', 'docx', 'xlsx', 'afbeelding'] as TypeFilter[]).map((f) => {
              const labels: Record<TypeFilter, string> = {
                alle: 'Alle types',
                pdf: 'PDF',
                docx: 'DOCX',
                xlsx: 'XLSX',
                afbeelding: 'Afbeeldingen',
              }
              const dotColors: Record<TypeFilter, string> = {
                alle: '',
                pdf: 'bg-red-500',
                docx: 'bg-blue-500',
                xlsx: 'bg-green-500',
                afbeelding: 'bg-primary',
              }
              return (
                <button
                  key={f}
                  onClick={() => setTypeFilter(f)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5',
                    typeFilter === f
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {dotColors[f] && <span className={cn('w-2 h-2 rounded-full', dotColors[f])} />}
                  {labels[f]}
                </button>
              )
            })}
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-auto">
            {viewMode === 'pipeline' ? (
              <DocumentsPipeline documents={filteredDocuments} />
            ) : viewMode === 'grid' ? (
              <DocumentGrid documents={filteredDocuments} />
            ) : (
              <DocumentList documents={filteredDocuments} />
            )}
          </div>
        </div>
      </div>

      {/* Upload dialog */}
      <DocumentUpload open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  )
}

function DocumentGrid({ documents }: { documents: Document[] }) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <File className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">Geen documenten gevonden</p>
        <p className="text-sm mt-1">Pas de filters aan of upload een nieuw document.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
      {documents.map((doc) => {
        const Icon = getFileIcon(doc.type)
        const iconColor = getFileIconColor(doc.type)

        return (
          <Card
            key={doc.id}
            className="p-4 hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="flex items-start gap-3">
              <div className={cn('p-3 rounded-lg bg-muted group-hover:bg-muted/80 transition-colors')}>
                <Icon className={cn('w-6 h-6', iconColor)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" title={doc.naam}>
                  {doc.naam}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {getTypeLabel(doc.type)}
                  </Badge>
                  <Badge className={cn('text-[10px] px-1.5 py-0', getStatusColor(doc.status))}>
                    {doc.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(doc.grootte)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(doc.updated_at)}
                  </span>
                </div>
              </div>
            </div>
            {doc.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t">
                {doc.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                    {tag}
                  </Badge>
                ))}
                {doc.tags.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{doc.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

function DocumentList({ documents }: { documents: Document[] }) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <File className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">Geen documenten gevonden</p>
        <p className="text-sm mt-1">Pas de filters aan of upload een nieuw document.</p>
      </div>
    )
  }

  return (
    <Card>
      <div className="divide-y">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/50">
          <div className="col-span-5">Naam</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-1">Grootte</div>
          <div className="col-span-2">Datum</div>
          <div className="col-span-2">Status</div>
        </div>

        {/* Rows */}
        {documents.map((doc) => {
          const Icon = getFileIcon(doc.type)
          const iconColor = getFileIconColor(doc.type)

          return (
            <div
              key={doc.id}
              className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-muted/30 cursor-pointer transition-colors"
            >
              <div className="col-span-5 flex items-center gap-3 min-w-0">
                <Icon className={cn('w-5 h-5 flex-shrink-0', iconColor)} />
                <span className="text-sm font-medium truncate">{doc.naam}</span>
              </div>
              <div className="col-span-2">
                <Badge variant="outline" className="text-xs">
                  {getTypeLabel(doc.type)}
                </Badge>
              </div>
              <div className="col-span-1 text-sm text-muted-foreground">
                {formatFileSize(doc.grootte)}
              </div>
              <div className="col-span-2 text-sm text-muted-foreground">
                {formatDate(doc.updated_at)}
              </div>
              <div className="col-span-2">
                <Badge className={cn('text-xs', getStatusColor(doc.status))}>
                  {doc.status}
                </Badge>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
