#!/usr/bin/env node
/**
 * Nachtelijke kopie van alle Supabase Storage-buckets naar deze Mac.
 *
 * Waarom: de 13 buckets (factuur-pdf's, werkbonfoto's, documenten,
 * handtekeningen) zitten niet in de database-back-up van Supabase. Zonder
 * eigen kopie is "wij herstellen uw bestanden" geen belofte die je kunt doen.
 *
 * Incrementeel: per bucket een manifest (pad, grootte, updated_at); alleen
 * gewijzigde of nieuwe objecten worden gedownload. Verwijderde objecten
 * blijven lokaal staan (bewust: een per ongeluk gewiste factuur wil je terug).
 *
 * Gebruik:  node scripts/storage-backup.mjs            (alle buckets)
 *           node scripts/storage-backup.mjs --tel      (alleen tellen, niets downloaden)
 * Env:      ~/.doen-ops.env (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
 * Doel:     ~/doen-backups/storage/<bucket>/<pad>
 * Planning: ~/Library/LaunchAgents/com.doen.storage-backup.plist (03:30)
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createClient } from '@supabase/supabase-js'

const envPad = path.join(os.homedir(), '.doen-ops.env')
const env = Object.fromEntries(
  fs.readFileSync(envPad, 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
)
const URL = env.SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) { console.error('SUPABASE_URL of SUPABASE_SERVICE_ROLE_KEY ontbreekt in ~/.doen-ops.env'); process.exit(2) }

const DOEL = path.join(os.homedir(), 'doen-backups', 'storage')
const ALLEEN_TELLEN = process.argv.includes('--tel')
const PARALLEL = 4
const supabase = createClient(URL, KEY, { auth: { persistSession: false } })

async function lijst(bucket, prefix = '', acc = []) {
  let offset = 0
  for (;;) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } })
    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`)
    for (const e of data) {
      const vol = prefix ? `${prefix}/${e.name}` : e.name
      if (e.id === null) await lijst(bucket, vol, acc)
      else acc.push({ pad: vol, grootte: e.metadata?.size ?? 0, bijgewerkt: e.updated_at ?? '' })
    }
    if (data.length < 1000) break
    offset += 1000
  }
  return acc
}

async function download(bucket, obj) {
  const { data, error } = await supabase.storage.from(bucket).download(obj.pad)
  if (error) throw new Error(`${bucket}/${obj.pad}: ${error.message}`)
  const doel = path.join(DOEL, bucket, obj.pad)
  fs.mkdirSync(path.dirname(doel), { recursive: true })
  fs.writeFileSync(doel, Buffer.from(await data.arrayBuffer()))
}

async function main() {
  const start = Date.now()
  const { data: buckets, error } = await supabase.storage.listBuckets()
  if (error) throw error
  let totaalObjecten = 0, totaalBytes = 0, gedownload = 0, fouten = 0
  const regels = []
  for (const b of buckets) {
    const objecten = await lijst(b.name)
    const bytes = objecten.reduce((s, o) => s + o.grootte, 0)
    totaalObjecten += objecten.length; totaalBytes += bytes
    const manifestPad = path.join(DOEL, b.name, '.manifest.json')
    const manifest = fs.existsSync(manifestPad) ? JSON.parse(fs.readFileSync(manifestPad, 'utf8')) : {}
    const teDoen = objecten.filter((o) => {
      const m = manifest[o.pad]
      return !m || m.grootte !== o.grootte || m.bijgewerkt !== o.bijgewerkt || !fs.existsSync(path.join(DOEL, b.name, o.pad))
    })
    let ok = 0
    if (!ALLEEN_TELLEN) {
      for (let i = 0; i < teDoen.length; i += PARALLEL) {
        const res = await Promise.allSettled(teDoen.slice(i, i + PARALLEL).map((o) => download(b.name, o)))
        res.forEach((r, j) => {
          const o = teDoen[i + j]
          if (r.status === 'fulfilled') { ok++; manifest[o.pad] = { grootte: o.grootte, bijgewerkt: o.bijgewerkt } }
          else { fouten++; console.error('  fout', r.reason?.message ?? r.reason) }
        })
      }
      fs.mkdirSync(path.dirname(manifestPad), { recursive: true })
      fs.writeFileSync(manifestPad, JSON.stringify(manifest))
    }
    gedownload += ok
    regels.push(`${b.name.padEnd(22)} ${String(objecten.length).padStart(6)} objecten ${(bytes / 1048576).toFixed(1).padStart(9)} MB  ${ALLEEN_TELLEN ? '' : `nieuw/gewijzigd: ${teDoen.length}, gekopieerd: ${ok}`}`)
  }
  const duur = ((Date.now() - start) / 1000).toFixed(0)
  const kop = `[${new Date().toISOString()}] storage-backup${ALLEEN_TELLEN ? ' (tellen)' : ''}: ${buckets.length} buckets, ${totaalObjecten} objecten, ${(totaalBytes / 1048576).toFixed(0)} MB, gekopieerd ${gedownload}, fouten ${fouten}, ${duur}s`
  console.log(kop); console.log(regels.join('\n'))
  fs.appendFileSync(path.join(os.homedir(), 'doen-backups', 'logs', 'storage-backup.log'), kop + '\n')
  if (fouten > 0) process.exit(1)
}

main().catch((e) => { console.error(e); fs.appendFileSync(path.join(os.homedir(), 'doen-backups', 'logs', 'storage-backup.log'), `[${new Date().toISOString()}] MISLUKT: ${e.message}\n`); process.exit(1) })
