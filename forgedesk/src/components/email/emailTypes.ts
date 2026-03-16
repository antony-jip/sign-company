import type React from 'react'

export type EmailFolder = 'inbox' | 'verzonden' | 'concepten' | 'gepland' | 'gesnoozed' | 'prullenbak'
export type FilterType = 'alle' | 'ongelezen' | 'met-ster' | 'vastgepind' | 'bijlagen' | 'geen-antwoord'
export type NoReplyRange = '0-3' | '4-7' | '8-30'
export type FontSize = 'small' | 'medium' | 'large'
export type EmailTab = 'email' | 'gedeelde-inbox' | 'tracking' | 'sequences' | 'analytics'
export type ViewMode = 'idle' | 'reading' | 'composing'

export interface FolderTab {
  id: EmailFolder
  label: string
  icon: React.ElementType
}

export interface EmailLabel {
  id: string
  name: string
  color: string
}

export interface EmailThread {
  id: string
  emails: string[] // email IDs
  subject: string
  lastDate: string
  participantCount: number
}

export interface SearchOperator {
  key: string
  description: string
  example: string
}
