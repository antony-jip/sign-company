// Brug tussen de mobiele bottom-nav en de Daan-widget. De widget houdt zijn
// open/dicht-stand en zijn bulletje zelf bij en hangt buiten de navigatieboom,
// dus events in plaats van context — hetzelfde patroon als doen-sticky-changed.

export const DAAN_OPEN_EVENT = 'doen-daan-open'
export const DAAN_ONGELEZEN_EVENT = 'doen-daan-ongelezen'

export function openDaan() {
  window.dispatchEvent(new Event(DAAN_OPEN_EVENT))
}

export function meldDaanOngelezen(ongelezen: boolean) {
  window.dispatchEvent(new CustomEvent(DAAN_ONGELEZEN_EVENT, { detail: ongelezen }))
}
