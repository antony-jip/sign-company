import React from 'react'
import { cn } from '@/lib/utils'
import { Folder, FolderOpen, FileText, Users, LayoutTemplate, Archive, Files } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Document } from '@/types'

export interface FolderItem {
  id: string
  label: string
  icon: React.ElementType
}

const folders: FolderItem[] = [
  { id: 'Alle', label: 'Alle', icon: Files },
  { id: 'Projecten', label: 'Projecten', icon: Folder },
  { id: 'Klanten', label: 'Klanten', icon: Users },
  { id: 'Templates', label: 'Templates', icon: LayoutTemplate },
  { id: 'Archief', label: 'Archief', icon: Archive },
]

interface DocumentFoldersProps {
  activeFolder: string
  onFolderChange: (folder: string) => void
  documents: Document[]
}

function getFolderCount(documents: Document[], folderId: string): number {
  if (folderId === 'Alle') return documents.length
  if (folderId === 'Archief') return documents.filter((d) => d.status === 'gearchiveerd').length
  if (folderId === 'Projecten') return documents.filter((d) => d.project_id !== null).length
  if (folderId === 'Klanten') return documents.filter((d) => d.klant_id !== null && d.project_id === null).length
  if (folderId === 'Templates') return documents.filter((d) => d.tags.some((t) => t.toLowerCase().includes('template') || t.toLowerCase().includes('sjabloon'))).length
  return 0
}

export function DocumentFolders({ activeFolder, onFolderChange, documents }: DocumentFoldersProps) {
  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-3">
          Mappen
        </p>
        {folders.map((folder) => {
          const isActive = activeFolder === folder.id
          const Icon = isActive ? FolderOpen : folder.icon
          const count = getFolderCount(documents, folder.id)

          return (
            <button
              key={folder.id}
              onClick={() => onFolderChange(folder.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
              )}
            >
              <Icon className={cn(
                'w-4 h-4 flex-shrink-0',
                isActive && 'text-blue-600 dark:text-blue-400'
              )} />
              <span className="flex-1 text-left truncate">{folder.label}</span>
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full',
                isActive
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
              )}>
                {count}
              </span>
            </button>
          )
        })}
      </div>
    </ScrollArea>
  )
}
