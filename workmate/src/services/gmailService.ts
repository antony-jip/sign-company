declare const gapi: any
declare const google: any

const GMAIL_CLIENT_ID = import.meta.env.VITE_GMAIL_CLIENT_ID || ''
const GMAIL_SCOPES = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify'

let tokenClient: any = null
let accessToken: string | null = null

// ============ CONFIGURATION CHECK ============

export function isGmailConfigured(): boolean {
  return !!(GMAIL_CLIENT_ID && GMAIL_CLIENT_ID !== 'your-gmail-client-id-here')
}

// ============ AUTHENTICATION ============

function loadGapiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof gapi !== 'undefined') {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://apis.google.com/js/api.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Kan Google API script niet laden'))
    document.head.appendChild(script)
  })
}

function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof google !== 'undefined' && google.accounts) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Kan Google Identity Services niet laden'))
    document.head.appendChild(script)
  })
}

function initGapiClient(): Promise<void> {
  return new Promise((resolve, reject) => {
    gapi.load('client', async () => {
      try {
        await gapi.client.init({
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest'],
        })
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  })
}

export async function authenticateGmail(): Promise<boolean> {
  if (!isGmailConfigured()) {
    throw new Error('Gmail is niet geconfigureerd. Voeg VITE_GMAIL_CLIENT_ID toe aan je .env bestand.')
  }

  // Check for stored token
  const storedToken = localStorage.getItem('workmate_gmail_token')
  if (storedToken) {
    const tokenData = JSON.parse(storedToken)
    if (tokenData.expires_at > Date.now()) {
      accessToken = tokenData.access_token
      await loadGapiScript()
      await initGapiClient()
      gapi.client.setToken({ access_token: accessToken })
      return true
    }
    localStorage.removeItem('workmate_gmail_token')
  }

  await loadGapiScript()
  await loadGisScript()
  await initGapiClient()

  return new Promise((resolve) => {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GMAIL_CLIENT_ID,
      scope: GMAIL_SCOPES,
      callback: (response: any) => {
        if (response.error) {
          resolve(false)
          return
        }
        accessToken = response.access_token
        // Store token with expiry
        localStorage.setItem('workmate_gmail_token', JSON.stringify({
          access_token: response.access_token,
          expires_at: Date.now() + (response.expires_in * 1000),
        }))
        gapi.client.setToken({ access_token: accessToken })
        resolve(true)
      },
    })
    tokenClient.requestAccessToken({ prompt: 'consent' })
  })
}

export function isAuthenticated(): boolean {
  if (accessToken) return true
  const storedToken = localStorage.getItem('workmate_gmail_token')
  if (storedToken) {
    const tokenData = JSON.parse(storedToken)
    if (tokenData.expires_at > Date.now()) {
      accessToken = tokenData.access_token
      return true
    }
    localStorage.removeItem('workmate_gmail_token')
  }
  return false
}

export function signOutGmail(): void {
  if (accessToken && typeof google !== 'undefined') {
    google.accounts.oauth2.revoke(accessToken)
  }
  accessToken = null
  localStorage.removeItem('workmate_gmail_token')
}

// ============ HELPER FUNCTIONS ============

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/')
  return decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  )
}

function encodeBase64Url(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function getHeader(headers: any[], name: string): string {
  const header = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())
  return header ? header.value : ''
}

function parseEmailMessage(message: any): {
  id: string
  threadId: string
  van: string
  aan: string
  onderwerp: string
  datum: string
  inhoud: string
  gelezen: boolean
  starred: boolean
  labels: string[]
  bijlagen: number
} {
  const headers = message.payload?.headers || []
  const labelIds = message.labelIds || []

  // Extract body
  let body = ''
  if (message.payload?.body?.data) {
    body = decodeBase64Url(message.payload.body.data)
  } else if (message.payload?.parts) {
    const textPart = message.payload.parts.find((p: any) => p.mimeType === 'text/plain')
    const htmlPart = message.payload.parts.find((p: any) => p.mimeType === 'text/html')
    const part = textPart || htmlPart
    if (part?.body?.data) {
      body = decodeBase64Url(part.body.data)
    }
  }

  // Count attachments
  const attachmentCount = (message.payload?.parts || []).filter(
    (p: any) => p.filename && p.filename.length > 0
  ).length

  return {
    id: message.id,
    threadId: message.threadId,
    van: getHeader(headers, 'From'),
    aan: getHeader(headers, 'To'),
    onderwerp: getHeader(headers, 'Subject'),
    datum: getHeader(headers, 'Date'),
    inhoud: body,
    gelezen: !labelIds.includes('UNREAD'),
    starred: labelIds.includes('STARRED'),
    labels: labelIds,
    bijlagen: attachmentCount,
  }
}

// ============ EMAIL OPERATIONS ============

export async function fetchEmails(
  query?: string,
  maxResults: number = 20
): Promise<any[]> {
  if (!isGmailConfigured()) {
    throw new Error('Gmail is niet geconfigureerd')
  }

  if (!isAuthenticated()) {
    throw new Error('Niet ingelogd bij Gmail. Authenticeer eerst.')
  }

  try {
    const params: any = {
      userId: 'me',
      maxResults,
    }
    if (query) {
      params.q = query
    }

    const response = await gapi.client.gmail.users.messages.list(params)
    const messages = response.result.messages || []

    const emailPromises = messages.map((msg: any) =>
      gapi.client.gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full',
      })
    )

    const emailResponses = await Promise.all(emailPromises)
    return emailResponses.map((res: any) => parseEmailMessage(res.result))
  } catch (error: any) {
    throw new Error(`Fout bij ophalen van emails: ${error.message || error}`)
  }
}

export async function getEmailDetail(messageId: string): Promise<any> {
  if (!isGmailConfigured()) {
    throw new Error('Gmail is niet geconfigureerd')
  }

  if (!isAuthenticated()) {
    throw new Error('Niet ingelogd bij Gmail')
  }

  try {
    const response = await gapi.client.gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    })
    return parseEmailMessage(response.result)
  } catch (error: any) {
    throw new Error(`Fout bij ophalen van email: ${error.message || error}`)
  }
}

export async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<any> {
  if (!isGmailConfigured()) {
    throw new Error('Gmail is niet geconfigureerd')
  }

  if (!isAuthenticated()) {
    throw new Error('Niet ingelogd bij Gmail')
  }

  try {
    const email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      body,
    ].join('\r\n')

    const encodedMessage = encodeBase64Url(email)

    const response = await gapi.client.gmail.users.messages.send({
      userId: 'me',
      resource: {
        raw: encodedMessage,
      },
    })

    return response.result
  } catch (error: any) {
    throw new Error(`Fout bij verzenden van email: ${error.message || error}`)
  }
}

export async function markAsRead(messageId: string): Promise<void> {
  if (!isGmailConfigured() || !isAuthenticated()) return

  try {
    await gapi.client.gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      resource: {
        removeLabelIds: ['UNREAD'],
      },
    })
  } catch (error: any) {
    throw new Error(`Fout bij markeren als gelezen: ${error.message || error}`)
  }
}

export async function starEmail(messageId: string): Promise<void> {
  if (!isGmailConfigured() || !isAuthenticated()) return

  try {
    // Check current state first
    const response = await gapi.client.gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'minimal',
    })

    const isStarred = (response.result.labelIds || []).includes('STARRED')

    await gapi.client.gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      resource: isStarred
        ? { removeLabelIds: ['STARRED'] }
        : { addLabelIds: ['STARRED'] },
    })
  } catch (error: any) {
    throw new Error(`Fout bij ster toevoegen/verwijderen: ${error.message || error}`)
  }
}

export async function deleteEmail(messageId: string): Promise<void> {
  if (!isGmailConfigured() || !isAuthenticated()) return

  try {
    await gapi.client.gmail.users.messages.trash({
      userId: 'me',
      id: messageId,
    })
  } catch (error: any) {
    throw new Error(`Fout bij verwijderen van email: ${error.message || error}`)
  }
}

export async function searchEmails(query: string): Promise<any[]> {
  return fetchEmails(query, 50)
}
