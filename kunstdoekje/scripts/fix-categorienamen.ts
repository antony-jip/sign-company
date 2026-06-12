/**
 * Herstel typefouten en jargon in categorienamen (eenmalig).
 *   - "Asbtract"       -> "Abstract"   (typefout uit WooCommerce)
 *   - "Landschapmodus" -> "Landschap"  (WooCommerce-jargon voor liggende oriëntatie)
 * Slugs blijven ongewijzigd zodat bestaande URL's blijven werken.
 *
 * Gebruik: npx tsx scripts/fix-categorienamen.ts
 */
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('❌ Supabase-env ontbreekt in .env.local')
  process.exit(1)
}
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

const FIXES: Record<string, string> = {
  Asbtract: 'Abstract',
  Landschapmodus: 'Landschap',
}

async function main() {
  for (const [oud, nieuw] of Object.entries(FIXES)) {
    const { data, error } = await supabase
      .from('categories')
      .update({ naam: nieuw })
      .eq('naam', oud)
      .select('slug')
    if (error) console.error(`⚠️  ${oud}: ${error.message}`)
    else if (data?.length) console.log(`✅ "${oud}" -> "${nieuw}" (slug: ${data[0].slug})`)
    else console.log(`ℹ️  "${oud}" niet gevonden (al gefixt?)`)
  }
}

main()
