/**
 * doen. service worker — uitsluitend meldingen.
 *
 * Bewust géén precaching en géén runtime-cache: offline werken is een eigen
 * project (zie docs/archief/PLAN_PWA_PUSH.md) en een service worker die bestanden vasthoudt
 * is berucht om vastzittende versies. Deze worker raakt geen enkel verzoek aan
 * en heeft dus ook geen cache-invalidatie nodig.
 */

// Meteen de actieve worker worden; er is geen oude cache om voorzichtig mee te
// zijn en een halve minuut wachten op een melding is zinloos.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let lading = {}
  try {
    lading = event.data ? event.data.json() : {}
  } catch {
    lading = { titel: 'doen.', tekst: event.data ? event.data.text() : '' }
  }

  const titel = lading.titel || 'doen.'
  const opties = {
    body: lading.tekst || '',
    icon: '/logos/doen-icon-192.png',
    badge: '/logos/doen-icon-192.png',
    // Zelfde tag = de nieuwe melding vervangt de vorige in plaats van te
    // stapelen. Anders staat je vergrendelscherm na een ochtend vol.
    tag: lading.tag || 'doen-melding',
    renotify: true,
    data: { url: lading.url || '/' },
  }

  event.waitUntil(self.registration.showNotification(titel, opties))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const doel = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((vensters) => {
      // Staat de app al open, dan daarheen navigeren in plaats van een tweede
      // exemplaar openen — anders raak je je ongeopslagen werk kwijt.
      for (const venster of vensters) {
        if ('focus' in venster) {
          venster.navigate?.(doel)
          return venster.focus()
        }
      }
      return self.clients.openWindow(doel)
    })
  )
})
