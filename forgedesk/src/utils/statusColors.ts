// Centrale mapping: status → badge klasse
// Gebruik deze functie OVERAL waar een status badge getoond wordt

export function getStatusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    // Offertes
    'concept':      'badge-cream',
    'verstuurd':    'badge-mist',
    'verzonden':    'badge-mist',
    'bekeken':      'badge-cream',
    'goedgekeurd':  'badge-sage',
    'afgewezen':    'badge-coral',
    'verlopen':     'badge-blush',
    'wijziging_gevraagd': 'badge-blush',

    // Facturen
    'open':         'badge-mist',
    'betaald':      'badge-sage',
    'te-laat':      'badge-coral',
    'vervallen':    'badge-coral',
    'gecrediteerd': 'badge-lavender',

    // Projecten
    'actief':       'badge-sage',
    'in-uitvoering':'badge-mist',
    'gepland':      'badge-mist',
    'in-review':    'badge-cream',
    'te-factureren':'badge-lavender',
    'opgeleverd':   'badge-cream',
    'afgerond':     'badge-sage',
    'gepauzeerd':   'badge-blush',
    'on-hold':      'badge-blush',
    'geannuleerd':  'badge-coral',

    // Taken
    'todo':         'badge-cream',
    'bezig':        'badge-mist',
    'klaar':        'badge-sage',
    'geblokkeerd':  'badge-coral',

    // Werkbonnen
    'ingediend':    'badge-mist',
    'gefactureerd': 'badge-lavender',

    // Bestelbonnen
    'besteld':         'badge-mist',
    'deels_ontvangen': 'badge-cream',
    'ontvangen':       'badge-sage',

    // Leveringsbonnen
    'geleverd':     'badge-mist',
    'getekend':     'badge-sage',

    // Klanten
    'inactief':     'badge-cream',
    'prospect':     'badge-cream',
    'gearchiveerd': 'badge-cream',

    // Overig
    'review':       'badge-cream',
    'definitief':   'badge-sage',
    'geweigerd':    'badge-coral',
  }

  return map[status.toLowerCase()] ?? 'badge-cream'
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'concept':       'Concept',
    'verstuurd':     'Verstuurd',
    'verzonden':     'Verzonden',
    'bekeken':       'Bekeken',
    'goedgekeurd':   'Goedgekeurd',
    'afgewezen':     'Afgewezen',
    'verlopen':      'Verlopen',
    'wijziging_gevraagd': 'Wijziging gevraagd',
    'open':          'Open',
    'betaald':       'Betaald',
    'te-laat':       'Te laat',
    'vervallen':     'Vervallen',
    'gecrediteerd':  'Gecrediteerd',
    'actief':        'Actief',
    'in-uitvoering': 'In uitvoering',
    'gepland':       'Gepland',
    'in-review':     'In review',
    'te-factureren': 'Te factureren',
    'opgeleverd':    'Opgeleverd',
    'afgerond':      'Afgerond',
    'gepauzeerd':    'Gepauzeerd',
    'on-hold':       'On-hold',
    'geannuleerd':   'Geannuleerd',
    'todo':          'Te doen',
    'bezig':         'Bezig',
    'klaar':         'Klaar',
    'geblokkeerd':   'Geblokkeerd',
    'ingediend':     'Ingediend',
    'gefactureerd':  'Gefactureerd',
    'besteld':       'Besteld',
    'deels_ontvangen':'Deels ontvangen',
    'ontvangen':     'Ontvangen',
    'geleverd':      'Geleverd',
    'getekend':      'Getekend',
    'inactief':      'Inactief',
    'prospect':      'Prospect',
    'gearchiveerd':  'Gearchiveerd',
    'review':        'Review',
    'definitief':    'Definitief',
    'geweigerd':     'Geweigerd',
  }

  return labels[status.toLowerCase()] ?? status
}

export function getRowAccentClass(status: string): string {
  const map: Record<string, string> = {
    'goedgekeurd': 'border-l-[var(--color-sage-border)]',
    'betaald':     'border-l-[var(--color-sage-border)]',
    'actief':      'border-l-[var(--color-sage-border)]',
    'afgerond':    'border-l-[var(--color-sage-border)]',
    'klaar':       'border-l-[var(--color-sage-border)]',
    'getekend':    'border-l-[var(--color-sage-border)]',
    'ontvangen':   'border-l-[var(--color-sage-border)]',
    'verstuurd':   'border-l-[var(--color-mist-border)]',
    'verzonden':   'border-l-[var(--color-mist-border)]',
    'open':        'border-l-[var(--color-mist-border)]',
    'ingediend':   'border-l-[var(--color-mist-border)]',
    'besteld':     'border-l-[var(--color-mist-border)]',
    'bezig':       'border-l-[var(--color-mist-border)]',
    'gepland':     'border-l-[var(--color-mist-border)]',
    'geleverd':    'border-l-[var(--color-mist-border)]',
    'concept':     'border-l-[var(--color-cream-border)]',
    'todo':        'border-l-[var(--color-cream-border)]',
    'bekeken':     'border-l-[var(--color-cream-border)]',
    'in-review':   'border-l-[var(--color-cream-border)]',
    'verlopen':    'border-l-[var(--color-coral-border)]',
    'vervallen':   'border-l-[var(--color-coral-border)]',
    'te-laat':     'border-l-[var(--color-coral-border)]',
    'afgewezen':   'border-l-[var(--color-coral-border)]',
    'geannuleerd': 'border-l-[var(--color-coral-border)]',
    'on-hold':     'border-l-[var(--color-blush-border)]',
    'gepauzeerd':  'border-l-[var(--color-blush-border)]',
    'wijziging_gevraagd': 'border-l-[var(--color-blush-border)]',
    'gefactureerd':'border-l-[var(--color-lavender-border)]',
    'gecrediteerd':'border-l-[var(--color-lavender-border)]',
    'te-factureren':'border-l-[var(--color-lavender-border)]',
  }
  return map[status.toLowerCase()] ?? 'border-l-transparent'
}

export function getStatusColor(status: string): string {
  return getStatusBadgeClass(status)
}
