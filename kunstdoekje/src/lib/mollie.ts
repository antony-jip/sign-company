import createMollieClient, { MollieClient } from '@mollie/api-client'

let _mollie: MollieClient | null = null

/** Mollie client (server-side). Test- of live-key bepaald door MOLLIE_API_KEY. */
export function mollie(): MollieClient {
  const apiKey = process.env.MOLLIE_API_KEY
  if (!apiKey) throw new Error('MOLLIE_API_KEY ontbreekt in env')
  if (!_mollie) _mollie = createMollieClient({ apiKey })
  return _mollie
}

/** Formatteer centen naar het Mollie-bedragformaat: "12.34". */
export function molliAmount(cents: number): string {
  return (cents / 100).toFixed(2)
}
