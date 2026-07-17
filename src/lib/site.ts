// Centrale site-configuratie. Eén bron voor domein, app-URL, contact en locale,
// zodat dezelfde codebase op meerdere EU-domeinen kan draaien zonder code te
// wijzigen: alleen env-variabelen verschillen per omgeving/land.
//
// Alle waarden hier zijn PUBLIEK (mogen in de client-bundle). Server-only
// geheimen (mail-inbox, afzender, API-keys) blijven in de betreffende route.

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

/** Canoniek domein van deze omgeving. Default: NL-productie. */
export const SITE_URL = stripTrailingSlash(
  process.env.NEXT_PUBLIC_SITE_URL || 'https://doen.team',
)

/** Domein van de web-app (registreren/inloggen). Kan gedeeld zijn over landen. */
export const APP_URL = stripTrailingSlash(
  process.env.NEXT_PUBLIC_APP_URL || 'https://app.doen.team',
)

/** Publiek contact-adres (footer, mailto). */
export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'hello@doen.team'

/** BCP-47 taal-regio en OG-locale, afgeleid uit één env-waarde. */
export const SITE_LOCALE = process.env.NEXT_PUBLIC_SITE_LOCALE || 'nl-NL'
export const SITE_LANG = SITE_LOCALE.split('-')[0] // 'nl'
export const OG_LOCALE = SITE_LOCALE.replace('-', '_') // 'nl_NL'

/**
 * hreflang-map. Nu één taal; zodra vertaalde domeinen live gaan voeg je hier
 * per land een entry toe ({ hrefLang: 'de-DE', url: 'https://doen.de' }), dan
 * genereren alle pagina's automatisch wederkerige alternates + x-default.
 */
export const LOCALES: { hrefLang: string; url: string }[] = [
  { hrefLang: SITE_LOCALE, url: SITE_URL },
]

/** Valuta voor structured data / prijsweergave (per land instelbaar). */
export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || 'EUR'

export const appUrl = (path = ''): string => `${APP_URL}${path}`
export const REGISTER_URL = appUrl('/register')
export const LOGIN_URL = appUrl('/login')
