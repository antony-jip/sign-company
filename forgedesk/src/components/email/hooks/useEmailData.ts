import { useState, useEffect, useCallback, useRef } from 'react'
import { getEmails, getKlanten } from '@/services/supabaseService'
import { fetchEmailsFromIMAP, readEmailFromIMAP } from '@/services/gmailService'
import type { IMAPEmailSummary } from '@/services/gmailService'
import type { Email, Klant } from '@/types'
import type { EmailFolder } from '../emailTypes'
import { IMAP_FOLDER_MAP } from '../emailHelpers'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'

export function useEmailData() {
  const { user } = useAuth()
  const { emailFetchLimit } = useAppSettings()
  const [emails, setEmails] = useState<Email[]>([])
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [useIMAP, setUseIMAP] = useState(false)
  const [imapTotal, setImapTotal] = useState(0)
  const [isLoadingBody, setIsLoadingBody] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Email body cache for IMAP
  const bodyCacheRef = useRef<Map<string, string>>(new Map())

  const imapToEmail = useCallback((msg: IMAPEmailSummary, folder: string): Email => ({
    id: String(msg.uid),
    user_id: user?.id || '',
    gmail_id: String(msg.uid),
    van: msg.fromName ? `${msg.fromName} <${msg.from}>` : msg.from,
    aan: msg.to,
    onderwerp: msg.subject,
    inhoud: '',
    datum: msg.date,
    gelezen: msg.isRead,
    starred: false,
    labels: [],
    bijlagen: msg.hasAttachments ? 1 : 0,
    map: folder === 'INBOX' ? 'inbox' : folder.toLowerCase(),
    created_at: msg.date,
    updated_at: msg.date,
  }), [user?.id])

  // SessionStorage cache for instant display while IMAP loads
  const getCachedEmails = useCallback((folder: string): Email[] | null => {
    try {
      const cached = sessionStorage.getItem(`forgedesk_emails_${folder}`)
      if (!cached) return null
      const { emails: cachedEmails, timestamp } = JSON.parse(cached)
      // Cache valid for 5 minutes
      if (Date.now() - timestamp > 5 * 60 * 1000) return null
      return cachedEmails
    } catch { return null }
  }, [])

  const setCachedEmails = useCallback((folder: string, emailData: Email[]) => {
    try {
      sessionStorage.setItem(`forgedesk_emails_${folder}`, JSON.stringify({
        emails: emailData,
        timestamp: Date.now(),
      }))
    } catch { /* storage full, ignore */ }
  }, [])

  const fetchLimit = emailFetchLimit || 200

  const loadEmails = useCallback(async (folder?: string) => {
    const imapFolder = folder || 'INBOX'
    try {
      const result = await fetchEmailsFromIMAP(imapFolder, fetchLimit, 0)
      setImapTotal(result.total)
      setUseIMAP(true)
      const emailData = result.emails.map((msg) => imapToEmail(msg, imapFolder))
      setCachedEmails(imapFolder, emailData)
      return emailData
    } catch {
      setUseIMAP(false)
      return await getEmails().catch(() => [])
    }
  }, [imapToEmail, setCachedEmails, fetchLimit])

  const loadMoreEmails = useCallback(async (folder: EmailFolder) => {
    if (!useIMAP || isLoadingMore) return
    const imapFolder = IMAP_FOLDER_MAP[folder] || 'INBOX'
    const currentCount = emails.length
    if (currentCount >= imapTotal) return
    setIsLoadingMore(true)
    try {
      const result = await fetchEmailsFromIMAP(imapFolder, fetchLimit, currentCount)
      const moreEmails = result.emails.map((msg) => imapToEmail(msg, imapFolder))
      setEmails((prev) => [...prev, ...moreEmails])
      setImapTotal(result.total)
    } catch {
      toast.error('Kon meer emails niet laden')
    } finally {
      setIsLoadingMore(false)
    }
  }, [useIMAP, isLoadingMore, emails.length, imapTotal, imapToEmail, fetchLimit])

  // Initial load: show cached emails instantly, then refresh from IMAP
  useEffect(() => {
    let cancelled = false

    // Show cached emails immediately (no loading spinner)
    const cached = getCachedEmails('INBOX')
    if (cached && cached.length > 0) {
      setEmails(cached)
      setIsLoading(false)
      // Refresh in background
      Promise.all([
        loadEmails(),
        getKlanten().catch(() => []),
      ]).then(([emailData, klantData]) => {
        if (!cancelled) {
          setEmails(emailData)
          setKlanten(klantData)
        }
      })
    } else {
      setIsLoading(true)
      Promise.all([
        loadEmails(),
        getKlanten().catch(() => []),
      ])
        .then(([emailData, klantData]) => {
          if (!cancelled) {
            setEmails(emailData)
            setKlanten(klantData)
          }
        })
        .finally(() => { if (!cancelled) setIsLoading(false) })
    }
    return () => { cancelled = true }
  }, [loadEmails, getCachedEmails])

  // Unsnooze timer
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().toISOString()
      setEmails((prev) => {
        let changed = false
        const next = prev.map((e) => {
          if (e.snoozed_until && e.snoozed_until <= now) {
            changed = true
            return { ...e, snoozed_until: undefined, map: 'inbox' }
          }
          return e
        })
        return changed ? next : prev
      })
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = useCallback(async (selectedFolder: EmailFolder) => {
    setIsRefreshing(true)
    try {
      const emailData = await loadEmails(IMAP_FOLDER_MAP[selectedFolder] || 'INBOX')
      setEmails(emailData)
      toast.success('Inbox vernieuwd')
    } catch {
      toast.error('Kon emails niet vernieuwen')
    } finally {
      setIsRefreshing(false)
    }
  }, [loadEmails])

  const handleFolderLoad = useCallback(async (folder: EmailFolder) => {
    if (!useIMAP) return
    setIsLoading(true)
    try {
      const emailData = await loadEmails(IMAP_FOLDER_MAP[folder] || 'INBOX')
      setEmails(emailData)
    } catch {
      // keep existing emails
    } finally {
      setIsLoading(false)
    }
  }, [useIMAP, loadEmails])

  const loadEmailBody = useCallback(async (email: Email, folder: EmailFolder): Promise<Email> => {
    // Check cache first
    const cached = bodyCacheRef.current.get(email.id)
    if (cached) {
      return { ...email, gelezen: true, inhoud: cached }
    }

    if (!useIMAP || email.inhoud) return email

    setIsLoadingBody(true)
    try {
      const detail = await readEmailFromIMAP(
        Number(email.id),
        IMAP_FOLDER_MAP[folder] || 'INBOX'
      )
      const body = detail.bodyHtml || detail.bodyText || ''
      // Cache the body
      bodyCacheRef.current.set(email.id, body)

      return {
        ...email,
        gelezen: true,
        inhoud: body,
        aan: detail.to || email.aan,
      }
    } catch (err: unknown) {
      logger.error('Email body ophalen mislukt:', err)
      toast.error('Kon email inhoud niet laden')
      return email
    } finally {
      setIsLoadingBody(false)
    }
  }, [useIMAP])

  return {
    emails,
    setEmails,
    klanten,
    setKlanten,
    isLoading,
    isRefreshing,
    useIMAP,
    imapTotal,
    isLoadingBody,
    isLoadingMore,
    handleRefresh,
    handleFolderLoad,
    loadEmailBody,
    loadMoreEmails,
    user,
  }
}
