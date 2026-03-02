import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, FileSpreadsheet, Image, File } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getStatusColor } from '@/lib/utils'
import type { Document } from '@/types'

interface DocumentsPipelineProps {
  documents: Document[]
}

const pipelineColumns = [
  { id: 'concept', label: 'Concept', color: 'border-t-gray-400' },
  { id: 'review', label: 'Review', color: 'border-t-yellow-400' },
  { id: 'definitief', label: 'Definitief', color: 'border-t-green-400' },
  { id: 'gearchiveerd', label: 'Gearchiveerd', color: 'border-t-gray-300' },
] as const

function getFileIcon(type: string) {
  const lower = type.toLowerCase()
  if (lower.includes('pdf')) return FileText
  if (lower.includes('spreadsheet') || lower.includes('xlsx') || lower.includes('xls') || lower.includes('csv')) return FileSpreadsheet
  if (lower.includes('image') || lower.includes('png') || lower.includes('jpg') || lower.includes('jpeg') || lower.includes('svg')) return Image
  return File
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function DocumentsPipeline({ documents }: DocumentsPipelineProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
      {pipelineColumns.map((column) => {
        const columnDocs = documents.filter((d) => d.status === column.id)

        return (
          <div key={column.id} className="flex flex-col min-h-0">
            <div className={cn('flex items-center justify-between px-3 py-2 mb-3 bg-card rounded-lg border-t-4', column.color)}>
              <h3 className="font-semibold text-sm">{column.label}</h3>
              <Badge variant="secondary" className="text-xs">
                {columnDocs.length}
              </Badge>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-2 pr-2">
                {columnDocs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Geen documenten
                  </div>
                ) : (
                  columnDocs.map((doc) => {
                    const Icon = getFileIcon(doc.type)
                    return (
                      <Card
                        key={doc.id}
                        className="p-3 hover:shadow-md transition-shadow cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-muted flex-shrink-0">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{doc.naam}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatFileSize(doc.grootte)}
                            </p>
                            {doc.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {doc.tags.slice(0, 2).map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                                {doc.tags.length > 2 && (
                                  <span className="text-[10px] text-muted-foreground">
                                    +{doc.tags.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        )
      })}
    </div>
  )
}
