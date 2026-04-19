import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
)

async function isRateLimited(ip: string, maxCount: number, windowSeconds: number): Promise<boolean> {
  const { data } = await supabaseAdmin.rpc('check_rate_limit', {
    p_key: `csp-report:${ip}`,
    p_max_count: maxCount,
    p_window_seconds: windowSeconds,
  })
  return data === true
}

function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 32)
}

function truncate(value: unknown, max = 2048): string | null {
  if (value == null) return null
  const str = String(value)
  return str.length > max ? str.slice(0, max) : str
}

interface CspReportBody {
  'document-uri'?: string
  'blocked-uri'?: string
  'violated-directive'?: string
  'effective-directive'?: string
  'source-file'?: string
  'line-number'?: number | string
  'column-number'?: number | string
  disposition?: string
}

interface ReportingApiEntry {
  type?: string
  body?: CspReportBody & {
    documentURL?: string
    blockedURL?: string
    effectiveDirective?: string
    sourceFile?: string
    lineNumber?: number
    columnNumber?: number
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown'
  if (await isRateLimited(clientIp, 100, 60)) {
    return res.status(429).end()
  }

  try {
    const raw = req.body as unknown
    let report: CspReportBody | null = null

    if (raw && typeof raw === 'object') {
      const legacy = (raw as { 'csp-report'?: CspReportBody })['csp-report']
      if (legacy) {
        report = legacy
      } else if (Array.isArray(raw)) {
        const entry = (raw as ReportingApiEntry[]).find((r) => r?.type === 'csp-violation' || r?.body)
        if (entry?.body) {
          report = {
            'document-uri': entry.body.documentURL ?? entry.body['document-uri'],
            'blocked-uri': entry.body.blockedURL ?? entry.body['blocked-uri'],
            'violated-directive': entry.body['violated-directive'] ?? entry.body.effectiveDirective,
            'effective-directive': entry.body.effectiveDirective ?? entry.body['effective-directive'],
            'source-file': entry.body.sourceFile ?? entry.body['source-file'],
            'line-number': entry.body.lineNumber ?? entry.body['line-number'],
            'column-number': entry.body.columnNumber ?? entry.body['column-number'],
            disposition: entry.body.disposition,
          }
        }
      }
    }

    if (!report) return res.status(204).end()

    const lineNumber = Number(report['line-number'])
    const columnNumber = Number(report['column-number'])

    await supabaseAdmin.from('csp_violations').insert({
      document_uri: truncate(report['document-uri']),
      blocked_uri: truncate(report['blocked-uri']),
      violated_directive: truncate(report['violated-directive'], 256),
      effective_directive: truncate(report['effective-directive'], 256),
      source_file: truncate(report['source-file']),
      line_number: Number.isFinite(lineNumber) ? lineNumber : null,
      column_number: Number.isFinite(columnNumber) ? columnNumber : null,
      disposition: truncate(report.disposition, 32),
      user_agent: truncate(req.headers['user-agent'], 512),
      ip_hash: hashIp(clientIp),
    })

    return res.status(204).end()
  } catch {
    return res.status(204).end()
  }
}

export const config = { maxDuration: 5 }
