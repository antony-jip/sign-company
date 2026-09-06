#!/usr/bin/env node
/**
 * Uptime-monitor voor doen., elke 5 minuten via launchd op deze Mac.
 *
 * Controleert de app, de api-laag en de drie Supabase-diensten. Alarm alleen
 * bij een wisseling (twee metingen achter elkaar down, of weer up), via een
 * macOS-melding en een mail via Resend naar ALERT_EMAIL. Log in
 * ~/doen-backups/logs/uptime.log, toestand in ~/doen-backups/uptime-state.json.
 *
 * Beperking: draait alleen als deze Mac aan staat. Voor een echte externe
 * monitor is een dienst als Better Stack of UptimeRobot nodig.
 * Env: ~/.doen-ops.env (SUPABASE_URL, SUPABASE_ANON_KEY, RESEND_API_KEY, ALERT_EMAIL)
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFile } from 'node:child_process'

const env = Object.fromEntries(
  fs.readFileSync(path.join(os.homedir(), '.doen-ops.env'), 'utf8').split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
)
const MAP = path.join(os.homedir(), 'doen-backups')
const STATE = path.join(MAP, 'uptime-state.json')
const LOG = path.join(MAP, 'logs', 'uptime.log')
// De anon-sleutel krijgt op de REST-root een 401; de service-sleutel is de
// enige die alle drie de diensten eenduidig beantwoordt.
const anon = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }

const CHECKS = [
  { naam: 'app', url: 'https://app.doen.team/', ok: (r) => r.status === 200 },
  { naam: 'api', url: 'https://app.doen.team/api/api-status', ok: (r) => r.status === 200 },
  { naam: 'supabase-rest', url: `${env.SUPABASE_URL}/rest/v1/doen_migraties?select=bestand&limit=1`, headers: anon, ok: (r) => r.status === 200 },
  { naam: 'supabase-auth', url: `${env.SUPABASE_URL}/auth/v1/health`, headers: anon, ok: (r) => r.status === 200 },
  { naam: 'supabase-storage', url: `${env.SUPABASE_URL}/storage/v1/bucket`, headers: anon, ok: (r) => r.status < 500 },
]

async function meet(c) {
  const t0 = Date.now()
  try {
    const r = await fetch(c.url, { headers: c.headers, signal: AbortSignal.timeout(15_000), redirect: 'manual' })
    return { naam: c.naam, up: c.ok(r), status: r.status, ms: Date.now() - t0 }
  } catch (e) {
    return { naam: c.naam, up: false, status: e?.name === 'TimeoutError' ? 'timeout' : (e?.message ?? 'fout'), ms: Date.now() - t0 }
  }
}

function melding(titel, tekst) {
  execFile('osascript', ['-e', `display notification ${JSON.stringify(tekst)} with title ${JSON.stringify(titel)}`], () => {})
}

async function mail(onderwerp, tekst) {
  if (!env.RESEND_API_KEY || !env.ALERT_EMAIL) return
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'doen. monitor <noreply@doen.team>', to: [env.ALERT_EMAIL], subject: onderwerp, text: tekst }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => {})
}

async function main() {
  fs.mkdirSync(path.dirname(LOG), { recursive: true })
  const resultaten = await Promise.all(CHECKS.map(meet))
  const nu = new Date().toISOString()
  const regel = resultaten.map((r) => `${r.naam}=${r.up ? 'up' : 'DOWN'}(${r.status},${r.ms}ms)`).join(' ')
  fs.appendFileSync(LOG, `[${nu}] ${regel}\n`)

  const vorige = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {}
  const nieuwe = {}
  const alarmen = []
  for (const r of resultaten) {
    const v = vorige[r.naam] ?? { down: 0, gemeld: false }
    const down = r.up ? 0 : v.down + 1
    let gemeld = v.gemeld
    if (down >= 2 && !gemeld) { gemeld = true; alarmen.push(`DOWN: ${r.naam} (${r.status}) sinds 2 metingen`) }
    if (r.up && gemeld) { gemeld = false; alarmen.push(`hersteld: ${r.naam} is weer bereikbaar`) }
    nieuwe[r.naam] = { down, gemeld, laatst: nu }
  }
  fs.writeFileSync(STATE, JSON.stringify(nieuwe, null, 2))

  if (alarmen.length) {
    const tekst = `${alarmen.join('\n')}\n\nMeting ${nu}:\n${regel}\n\nLog: ${LOG}`
    melding('doen. monitor', alarmen.join(' · '))
    await mail(`doen. monitor: ${alarmen[0]}`, tekst)
    fs.appendFileSync(LOG, `[${nu}] ALARM ${alarmen.join(' | ')}\n`)
  }
  console.log(regel)
}

main().catch((e) => { fs.appendFileSync(LOG, `[${new Date().toISOString()}] monitor-fout ${e.message}\n`); process.exit(1) })
