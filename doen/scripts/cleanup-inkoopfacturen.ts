import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

function loadDotenv(filename: string): void {
  const path = resolve(projectRoot, filename)
  if (!existsSync(path)) return
  const content = readFileSync(path, 'utf8')
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}

loadDotenv('.env.local')
loadDotenv('.env')

const ORG_ID = '226bf02a-ebb2-4b4c-ae51-cdc9919e4229'
const BUCKET = 'inkoopfacturen'
const BATCH_SIZE = 100

const args = process.argv.slice(2)
const execute = args.includes('--execute')
const dryRun = !execute

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_URL) {
  console.error('FOUT: VITE_SUPABASE_URL niet gevonden in .env.local of .env')
  process.exit(1)
}
if (!SERVICE_ROLE_KEY) {
  console.error('FOUT: SUPABASE_SERVICE_ROLE_KEY niet gevonden in .env.local of .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function main() {
  const mode = dryRun ? 'DRY-RUN' : 'EXECUTE'
  console.log(`\n=== Inkoopfactuur cleanup [${mode}] ===`)
  console.log(`Organisatie: ${ORG_ID}`)
  console.log(`Bucket: ${BUCKET}\n`)

  const { data: facturen, error: selErr } = await supabase
    .from('inkoopfacturen')
    .select('id, pdf_storage_path, status, totaal, created_at')
    .eq('organisatie_id', ORG_ID)

  if (selErr) {
    console.error('FOUT bij ophalen inkoopfacturen:', selErr.message)
    process.exit(1)
  }

  const rows = facturen || []
  const paths = rows.map((r) => r.pdf_storage_path).filter((p): p is string => Boolean(p))

  console.log(`Gevonden: ${rows.length} inkoopfactuur-rijen`)
  console.log(`PDF storage-paden: ${paths.length}`)

  const byStatus = new Map<string, number>()
  for (const r of rows) byStatus.set(r.status, (byStatus.get(r.status) || 0) + 1)
  for (const [status, count] of byStatus) console.log(`  status=${status}: ${count}`)

  const { data: config, error: cfgErr } = await supabase
    .from('inkoopfactuur_inbox_config')
    .select('id, imap_user, gmail_label, laatste_uid, laatst_gecheckt_op')
    .eq('organisatie_id', ORG_ID)
    .maybeSingle()

  if (cfgErr) {
    console.error('FOUT bij ophalen config:', cfgErr.message)
    process.exit(1)
  }

  if (config) {
    console.log(`\nConfig gevonden: imap_user=${config.imap_user}, label=${config.gmail_label}, laatste_uid=${config.laatste_uid}`)
  } else {
    console.log('\nGeen config-rij gevonden (al ontkoppeld).')
  }

  if (dryRun) {
    console.log('\n--- DRY-RUN: er wordt niets verwijderd. ---')
    console.log(`Zou verwijderen: ${paths.length} PDFs uit storage in ${chunk(paths, BATCH_SIZE).length} batch(es)`)
    console.log(`Zou verwijderen: ${rows.length} rijen uit inkoopfacturen (CASCADE pakt inkoopfactuur_regels)`)
    console.log(`Zou verwijderen: ${config ? 1 : 0} rij uit inkoopfactuur_inbox_config`)
    console.log('\nGebruik --execute om daadwerkelijk te verwijderen.\n')
    return
  }

  console.log('\n--- EXECUTE: verwijderen wordt nu uitgevoerd ---\n')

  let storageDeleted = 0
  let storageErrors = 0
  for (const batch of chunk(paths, BATCH_SIZE)) {
    const { data, error } = await supabase.storage.from(BUCKET).remove(batch)
    if (error) {
      console.error(`Storage-batch fout (${batch.length} paden):`, error.message)
      storageErrors += batch.length
    } else {
      storageDeleted += data?.length ?? 0
      console.log(`Storage: ${data?.length ?? 0}/${batch.length} verwijderd in deze batch`)
    }
  }
  console.log(`Storage totaal verwijderd: ${storageDeleted}, errors: ${storageErrors}`)

  const { error: delErr, count: rowsDeleted } = await supabase
    .from('inkoopfacturen')
    .delete({ count: 'exact' })
    .eq('organisatie_id', ORG_ID)

  if (delErr) {
    console.error('FOUT bij verwijderen rijen:', delErr.message)
    process.exit(1)
  }
  console.log(`Rijen verwijderd uit inkoopfacturen: ${rowsDeleted ?? 0}`)

  if (config) {
    const { error: cfgDelErr } = await supabase
      .from('inkoopfactuur_inbox_config')
      .delete()
      .eq('organisatie_id', ORG_ID)
    if (cfgDelErr) {
      console.error('FOUT bij verwijderen config-rij:', cfgDelErr.message)
      process.exit(1)
    }
    console.log('Config-rij verwijderd.')
  }

  console.log('\n=== Cleanup voltooid ===\n')
}

main().catch((err) => {
  console.error('Onverwachte fout:', err)
  process.exit(1)
})

// Hoe te runnen:
//   Dry-run (default, verwijdert NIETS):
//     npx tsx scripts/cleanup-inkoopfacturen.ts
//
//   Echt uitvoeren:
//     npx tsx scripts/cleanup-inkoopfacturen.ts --execute
