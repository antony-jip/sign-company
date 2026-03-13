import { useState, useEffect, useCallback, useRef } from 'react'
import { getKlanten } from '@/services/supabaseService'
import supabase from '@/services/supabaseClient'
import { fetchEmailsFromIMAP, readEmailFromIMAP } from '@/services/gmailService'
import type { IMAPEmailSummary } from '@/services/gmailService'
import type { Email, Klant } from '@/types'
import type { EmailFolder } from '../emailTypes'
import { IMAP_FOLDER_MAP } from '../emailHelpers'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'

const PAGE_SIZE = 50

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

  // Track current offset for "load more" pagination
  const offsetRef = useRef(0)
  const hasMoreRef = useRef(true)

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

  /**
   * Load emails from Supabase cache (instant).
   * Returns cached emails for the given folder, sorted by datum DESC.
   */
  const loadFromSupabase = useCallback(async (folder: string, pageSize: number = PAGE_SIZE, offset: number = 0): Promise<Email[]> => {
    if (!supabase || !user?.id) return []

    const mapFolder = folder === 'INBOX' ? 'inbox' : folder.toLowerCase()

    const { data, error } = await supabase
      .from('emails')
      .select('*')
      .eq('user_id', user.id)
      .eq('map', mapFolder)
      .order('datum', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (error) {
      logger.error('Supabase emails laden mislukt:', error)
      return []
    }

    return (data || []) as Email[]
  }, [user?.id])

  /**
   * Trigger IMAP sync in background (writes to Supabase, returns sync count).
   */
  const syncViaIMAP = useCallback(async (folder: string) => {
    if (!user?.id) return
    try {
      const result = await fetchEmailsFromIMAP(folder, emailFetchLimit || 200, 0, user.id)
      setImapTotal(result.total)
      setUseIMAP(true)
      return result
    } catch {
      // IMAP sync failed — Supabase cache is still valid
      logger.error('IMAP sync mislukt, gebruik Supabase cache')
    }
  }, [user?.id, emailFetchLimit])

  const fetchLimit = emailFetchLimit || 200

  /**
   * Main load: Supabase first, then background IMAP sync.
   */
  const loadEmails = useCallback(async (folder?: string) => {
    const imapFolder = folder || 'INBOX'

    // 1. Load from Supabase cache (instant)
    const cached = await loadFromSupabase(imapFolder)

    if (cached.length > 0) {
      // Show cached emails immediately
      setEmails(cached)
      setIsLoading(false)
      offsetRef.current = cached.length
      hasMoreRef.current = cached.length >= PAGE_SIZE

      // 2. Background IMAP sync
      syncViaIMAP(imapFolder).then(async () => {
        // After sync, reload from Supabase to pick up new emails
        const fresh = await loadFromSupabase(imapFolder, Math.max(PAGE_SIZE, cached.length))
        if (fresh.length > 0) {
          setEmails(fresh)
          offsetRef.current = fresh.length
          hasMoreRef.current = fresh.length >= PAGE_SIZE
        }
      })

      return cached
    }

    // No cache — try IMAP directly (first time)
    try {
      await syncViaIMAP(imapFolder)
      // After sync, load from Supabase
      const fromDb = await loadFromSupabase(imapFolder)
      if (fromDb.length > 0) {
        offsetRef.current = fromDb.length
        hasMoreRef.current = fromDb.length >= PAGE_SIZE
        return fromDb
      }

      // Fallback: old IMAP flow (no Supabase caching, e.g. no user_id)
      const result = await fetchEmailsFromIMAP(imapFolder, fetchLimit, 0)
      setImapTotal(result.total)
      setUseIMAP(true)
      const emailData = result.emails.map((msg) => imapToEmail(msg, imapFolder))
      return emailData
    } catch {
      setUseIMAP(false)
      return []
    }
  }, [loadFromSupabase, syncViaIMAP, imapToEmail, fetchLimit])

  /**
   * Load more emails (pagination from Supabase).
   */
  const loadMoreEmails = useCallback(async (folder: EmailFolder) => {
    if (isLoadingMore || !hasMoreRef.current) return
    const imapFolder = IMAP_FOLDER_MAP[folder] || 'INBOX'
    setIsLoadingMore(true)
    try {
      const more = await loadFromSupabase(imapFolder, PAGE_SIZE, offsetRef.current)
      if (more.length > 0) {
        setEmails((prev) => [...prev, ...more])
        offsetRef.current += more.length
      }
      if (more.length < PAGE_SIZE) {
        hasMoreRef.current = false
      }
    } catch {
      toast.error('Kon meer emails niet laden')
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, loadFromSupabase])

  // Initial load
  useEffect(() => {
    let cancelled = false

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

    return () => { cancelled = true }
  }, [loadEmails])

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
      const imapFolder = IMAP_FOLDER_MAP[selectedFolder] || 'INBOX'
      // Force IMAP sync first
      await syncViaIMAP(imapFolder)
      // Then reload from Supabase
      const emailData = await loadFromSupabase(imapFolder, Math.max(PAGE_SIZE, emails.length))
      setEmails(emailData)
      offsetRef.current = emailData.length
      toast.success('Inbox vernieuwd')
    } catch {
      toast.error('Kon emails niet vernieuwen')
    } finally {
      setIsRefreshing(false)
    }
  }, [syncViaIMAP, loadFromSupabase, emails.length])

  const handleFolderLoad = useCallback(async (folder: EmailFolder) => {
    setIsLoading(true)
    offsetRef.current = 0
    hasMoreRef.current = true
    try {
      const emailData = await loadEmails(IMAP_FOLDER_MAP[folder] || 'INBOX')
      setEmails(emailData)
    } catch {
      // keep existing emails
    } finally {
      setIsLoading(false)
    }
  }, [loadEmails])

  const loadEmailBody = useCallback(async (email: Email, folder: EmailFolder): Promise<Email> => {
    // Check in-memory cache first
    const cached = bodyCacheRef.current.get(email.id)
    if (cached) {
      return { ...email, gelezen: true, inhoud: cached }
    }

    // Check if email already has body from Supabase cache
    if (email.inhoud && email.inhoud.length > 0) {
      bodyCacheRef.current.set(email.id, email.inhoud)
      return { ...email, gelezen: true }
    }

    setIsLoadingBody(true)
    try {
      const detail = await readEmailFromIMAP(
        Number(email.id),
        IMAP_FOLDER_MAP[folder] || 'INBOX',
        user?.id
      )
      const body = detail.bodyHtml || detail.bodyText || ''
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
  }, [user?.id])

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
