export const TOKEN_TTL_DAYS = {
  OFFERTE_PUBLIEK: 183,
  FACTUUR_BETAAL: 92,
  GOEDKEURING: 365,
} as const

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

export function offerteTokenExpiry(): string {
  return daysFromNow(TOKEN_TTL_DAYS.OFFERTE_PUBLIEK)
}

export function factuurBetaalTokenExpiry(): string {
  return daysFromNow(TOKEN_TTL_DAYS.FACTUUR_BETAAL)
}

export function goedkeuringTokenExpiry(): string {
  return daysFromNow(TOKEN_TTL_DAYS.GOEDKEURING)
}
