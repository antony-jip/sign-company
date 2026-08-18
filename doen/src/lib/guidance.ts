// Guidance voor nieuwe gebruikers: eenmalige uitleg-regels per module
// (ModuleIntro) plus een globale aan/uit-stand in het gebruikersmenu.
// Bewust localStorage per apparaat, zelfde patroon als doen_mijlpaal_*.

const UIT_KEY = 'doen_guidance_uit'
const INTRO_PREFIX = 'doen_intro_'
export const GUIDANCE_EVENT = 'doen-guidance-changed'

export function guidanceAan(): boolean {
  try {
    return localStorage.getItem(UIT_KEY) === null
  } catch {
    return false
  }
}

/** Aanzetten reset ook alle weggeklikte intro's, zodat "aan" echt alles terugbrengt. */
export function zetGuidance(aan: boolean): void {
  try {
    if (aan) {
      localStorage.removeItem(UIT_KEY)
      Object.keys(localStorage)
        .filter(k => k.startsWith(INTRO_PREFIX))
        .forEach(k => localStorage.removeItem(k))
    } else {
      localStorage.setItem(UIT_KEY, '1')
    }
    window.dispatchEvent(new Event(GUIDANCE_EVENT))
  } catch {
    // Private mode of storage vol: guidance is nice-to-have.
  }
}

export function isIntroGezien(id: string): boolean {
  try {
    return localStorage.getItem(`${INTRO_PREFIX}${id}`) !== null
  } catch {
    return true
  }
}

export function markeerIntroGezien(id: string): void {
  try {
    localStorage.setItem(`${INTRO_PREFIX}${id}`, '1')
  } catch {
    // stil
  }
}
