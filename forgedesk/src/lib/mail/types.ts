import type { EmailAttachment, EmailOntvanger } from '@/types'

export type MailMap =
  | 'inbox' | 'verzonden' | 'concepten' | 'archief' | 'prullenbak'
  | 'gesnoozed' | 'opvolgen' | 'beantwoord' | 'ingepland' | 'leads'

export const MAIL_MAPPEN: MailMap[] = [
  'inbox', 'verzonden', 'concepten', 'archief', 'prullenbak',
  'gesnoozed', 'opvolgen', 'beantwoord', 'ingepland', 'leads',
]

/** Eén rij uit emails_list_view, aangevuld met de thread-tellers uit email_threads_view. */
export interface EmailLijstItem {
  id: string
  gmail_id: string
  uid?: number | null
  message_id?: string | null
  van: string
  aan: string
  to_addresses?: EmailOntvanger[] | null
  cc_addresses?: EmailOntvanger[] | null
  onderwerp: string
  datum: string
  gelezen: boolean
  starred?: boolean | null
  labels: string[]
  bijlagen: number
  map: string
  from_name?: string | null
  from_address?: string | null
  imap_folder?: string | null
  pinned?: boolean | null
  snoozed_until?: string | null
  thread_id?: string | null
  attachment_meta?: EmailAttachment[] | null
  has_attachments?: boolean | null
  body_text?: string | null
  created_at: string
  is_aanvraag?: boolean | null
  aanvraag_zekerheid?: number | null
  aanvraag_samenvatting?: string | null
  aanvraag_verborgen?: boolean | null
  wacht_op_reactie?: boolean | null
  beantwoord?: boolean | null
  toegewezen_aan?: string | null
  toegewezen_op?: string | null
  threadAantal?: number
  threadOngelezen?: number
}

export interface EmailBody {
  emailId: string
  html: string | null
  tekst: string | null
  quotedHtml: string | null
}

export type KoppelingSoort = 'klant' | 'project' | 'offerte' | 'factuur' | 'aanvraag' | 'taak' | 'lead'

export interface Ontvanger {
  email: string
  naam?: string
  bedrijf?: string
  bron?: 'klant' | 'contactpersoon' | 'collega' | 'recent' | 'vrij'
}

export interface ComposerBijlage {
  naam: string
  grootte: number
  type: string
  bron: 'upload' | 'storage' | 'origineel'
  pad?: string
  emailId?: string
}

export interface ComposerDocument {
  id?: string
  modus: 'nieuw' | 'antwoord' | 'allen' | 'doorsturen'
  /** Vanuit welk postvak dit bericht gaat (user_email_settings.id). Gaat als `account_id` mee naar send-email. */
  accountId?: string
  aan: Ontvanger[]
  cc: Ontvanger[]
  bcc: Ontvanger[]
  onderwerp: string
  html: string
  handtekening: boolean
  bijlagen: ComposerBijlage[]
  inReplyTo?: string
  references?: string[]
  threadId?: string
  bronEmailId?: string
  opvolgen: boolean
  verzendOp?: string
  koppelingen: { soort: KoppelingSoort; doelId: string }[]
}

export interface EmailKoppeling {
  id: string
  organisatie_id: string
  user_id: string
  email_id: string | null
  thread_id: string | null
  soort: KoppelingSoort
  doel_id: string
  created_at: string
}

export interface ThreadInfo {
  threadId: string
  laatsteDatum: string
  aantal: number
  ongelezen: number
  laatsteEmailId: string
  deelnemers: string[]
}

export interface SyncStatus {
  status: 'ok' | 'fout' | 'uitgezet'
  laatsteFout?: string
  laatsteSucces?: string
}

export type PostvakSoort = 'persoonlijk' | 'gedeeld'

/**
 * Eén gekoppelde mailbox (`user_email_settings`). Zolang migratie 245 niet
 * gedraaid is levert postvakService er precies één, met `naam` = het adres.
 */
export interface Postvak {
  id: string
  adres: string
  naam: string
  soort: PostvakSoort
  isStandaard: boolean
  organisatieId?: string
}

/** Het actieve postvak in de shell: één id, of alle postvakken door elkaar. */
export type PostvakKeuze = string | 'alle'
