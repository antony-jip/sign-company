#!/usr/bin/env node
// Hersleutelt opgeslagen mailwachtwoorden naar AES-256-GCM.
//
// AANLEIDING
// user_email_settings.encrypted_app_password kent drie formaten:
//   g1:<base64>      AES-256-GCM, willekeurige salt + auth tag   (nieuw)
//   <hex>:<hex>      AES-256-CBC met de vaste literal salt 'salt' (oud)
//   b64:<base64>     geen versleuteling, alleen base64            (oudst)
// Alle lees-paden slikken alle drie, dus niemand merkt er iets van. Maar de
// b64-rijen staan als leesbare tekst in de database en de CBC-rijen delen één
// afgeleide sleutel zonder integriteitscontrole. Migratie 160 haalde ze uit het
// zicht van de browser; dit script haalt ze uit de database.
//
// GEBRUIK
//   node scripts/hersleutel-mailwachtwoorden.mjs            # droogloop, wijzigt niets
//   node scripts/hersleutel-mailwachtwoorden.mjs --doen     # schrijft echt
//
// Vereist in de omgeving:
//   VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EMAIL_ENCRYPTION_KEY
// De sleutel MOET dezelfde zijn als die de api's gebruiken. Staat hij anders,
// dan wordt elk wachtwoord onleesbaar en kan niemand meer bij zijn mail.
//
// Het script is herhaalbaar: rijen die al op g1: staan worden overgeslagen.

import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SLEUTEL = process.env.EMAIL_ENCRYPTION_KEY
const ECHT = process.argv.includes('--doen')

if (!URL || !SERVICE_KEY || !SLEUTEL) {
  console.error('Ontbrekend: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY of EMAIL_ENCRYPTION_KEY')
  process.exit(1)
}

const supabase = createClient(URL, SERVICE_KEY)

function decrypt(waarde) {
  if (waarde.startsWith('g1:')) {
    const rauw = Buffer.from(waarde.slice(3), 'base64')
    const salt = rauw.subarray(0, 16)
    const iv = rauw.subarray(16, 28)
    const tag = rauw.subarray(28, 44)
    const ct = rauw.subarray(44)
    const key = crypto.scryptSync(SLEUTEL, salt, 32)
    const d = crypto.createDecipheriv('aes-256-gcm', key, iv)
    d.setAuthTag(tag)
    return Buffer.concat([d.update(ct), d.final()]).toString('utf8')
  }
  if (waarde.startsWith('b64:')) {
    return Buffer.from(waarde.slice(4), 'base64').toString('utf8')
  }
  const [ivHex, ct] = waarde.split(':')
  const key = crypto.scryptSync(SLEUTEL, 'salt', 32)
  const d = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'))
  return d.update(ct, 'hex', 'utf8') + d.final('utf8')
}

function encrypt(tekst) {
  const salt = crypto.randomBytes(16)
  const key = crypto.scryptSync(SLEUTEL, salt, 32)
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([c.update(tekst, 'utf8'), c.final()])
  return 'g1:' + Buffer.concat([salt, iv, c.getAuthTag(), ct]).toString('base64')
}

const { data: rijen, error } = await supabase
  .from('user_email_settings')
  .select('id, user_id, gmail_address, encrypted_app_password')

if (error) {
  console.error('Lezen mislukt:', error.message)
  process.exit(1)
}

console.log(`${rijen.length} rijen gevonden. Modus: ${ECHT ? 'SCHRIJVEN' : 'droogloop'}\n`)

let omgezet = 0, overgeslagen = 0, mislukt = 0

for (const rij of rijen) {
  const huidig = rij.encrypted_app_password
  const adres = rij.gmail_address || rij.user_id

  if (!huidig) { overgeslagen++; continue }
  if (huidig.startsWith('g1:')) {
    console.log(`  overslaan  ${adres} (staat al op g1:)`)
    overgeslagen++
    continue
  }

  const formaat = huidig.startsWith('b64:') ? 'b64' : 'cbc'
  let klaartekst
  try {
    klaartekst = decrypt(huidig)
  } catch (e) {
    console.error(`  MISLUKT    ${adres} (${formaat}): ${e.message}`)
    mislukt++
    continue
  }

  const nieuw = encrypt(klaartekst)

  // Controleer vóór het schrijven dat het nieuwe blob hetzelfde teruggeeft.
  // Zonder deze stap kan een verkeerde sleutel stil een rij onbruikbaar maken.
  if (decrypt(nieuw) !== klaartekst) {
    console.error(`  MISLUKT    ${adres}: round-trip klopt niet, niet geschreven`)
    mislukt++
    continue
  }

  if (ECHT) {
    const { error: schrijfFout } = await supabase
      .from('user_email_settings')
      .update({ encrypted_app_password: nieuw })
      .eq('id', rij.id)
    if (schrijfFout) {
      console.error(`  MISLUKT    ${adres}: ${schrijfFout.message}`)
      mislukt++
      continue
    }
  }

  console.log(`  ${ECHT ? 'omgezet   ' : 'zou omzetten'} ${adres} (${formaat} → g1)`)
  omgezet++
}

console.log(`\nomgezet ${omgezet} · overgeslagen ${overgeslagen} · mislukt ${mislukt}`)
if (!ECHT && omgezet > 0) console.log('Droogloop. Draai opnieuw met --doen om te schrijven.')
if (mislukt > 0) process.exitCode = 1
