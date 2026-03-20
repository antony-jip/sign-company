// Centrale mapping: status → badge klasse
// Gebruik deze functie OVERAL waar een status badge getoond wordt

export function getStatusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    // Offertes
    'concept':      'badge-grijs',
    'verstuurd':    'badge-flame',
    'verzonden':    'badge-flame',
    'bekeken':      'badge-paars',
    'goedgekeurd':  'badge-petrol',
    'afgewezen':    'badge-flame',
    'verlopen':     'badge-grijs',
    'wijziging_gevraagd': 'badge-flame',
    'gefactureerd': 'badge-groen',

    // Facturen
    'open':         'badge-flame',
    'betaald':      'badge-groen',
    'te-laat':      'badge-flame',
    'vervallen':    'badge-flame',
    'gecrediteerd': 'badge-paars',

    // Projecten
    'offerte':      'badge-flame',
    'actief':       'badge-groen',
    'in-uitvoering':'badge-paars',
    'gepland':      'badge-grijs',
    'in-review':    'badge-grijs',
    'te-factureren':'badge-groen',
    'voorbereiding':'badge-warm-paars',
    'productie':    'badge-paars',
    'montage':      'badge-blauw',
    'opgeleverd':   'badge-groen',
    'afgerond':     'badge-petrol',
    'gepauzeerd':   'badge-grijs',
    'on-hold':      'badge-grijs',
    'geannuleerd':  'badge-flame',

    // Taken
    'todo':         'badge-grijs',
    'bezig':        'badge-blauw',
    'klaar':        'badge-petrol',
    'geblokkeerd':  'badge-flame',

    // Werkbonnen
    'ingediend':    'badge-grijs',
    'definitief':   'badge-blauw',

    // Bestelbonnen
    'besteld':         'badge-blauw',
    'deels_ontvangen': 'badge-grijs',
    'ontvangen':       'badge-groen',

    // Leveringsbonnen
    'geleverd':     'badge-blauw',
    'getekend':     'badge-petrol',

    // Klanten
    'inactief':     'badge-grijs',
    'prospect':     'badge-grijs',
    'gearchiveerd': 'badge-grijs',

    // Klant status (Quick Win 1)
    'normaal':         'badge-grijs',
    'vooruit_betalen': 'badge-flame',
    'niet_helpen':     'badge-flame',
    'voorrang':        'badge-groen',

    // Overig
    'review':       'badge-grijs',
    'geweigerd':    'badge-flame',
  }

  return map[status.toLowerCase()] ?? 'badge-grijs'
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
    'gefactureerd':  'Gefactureerd',
    'open':          'Open',
    'betaald':       'Betaald',
    'te-laat':       'Te laat',
    'vervallen':     'Vervallen',
    'gecrediteerd':  'Gecrediteerd',
    'offerte':       'Offerte',
    'actief':        'Actief',
    'in-uitvoering': 'In uitvoering',
    'gepland':       'Gepland',
    'in-review':     'In review',
    'te-factureren': 'Te factureren',
    'voorbereiding': 'Voorbereiding',
    'productie':     'Productie',
    'montage':       'Montage',
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
    'definitief':    'Definitief',
    'besteld':       'Besteld',
    'deels_ontvangen':'Deels ontvangen',
    'ontvangen':     'Ontvangen',
    'geleverd':      'Geleverd',
    'getekend':      'Getekend',
    'inactief':      'Inactief',
    'prospect':      'Prospect',
    'gearchiveerd':  'Gearchiveerd',
    'normaal':       'Normaal',
    'vooruit_betalen': 'Vooruit betalen',
    'niet_helpen':   'Niet helpen',
    'voorrang':      'Voorrang',
    'review':        'Review',
    'geweigerd':     'Geweigerd',
  }

  return labels[status.toLowerCase()] ?? status
}

export function getRowAccentClass(status: string): string {
  const map: Record<string, string> = {
    // Groen
    'goedgekeurd': 'border-l-[#2D6B48]',
    'betaald':     'border-l-[#2D6B48]',
    'actief':      'border-l-[#2D6B48]',
    'afgerond':    'border-l-[#1A535C]',
    'klaar':       'border-l-[#1A535C]',
    'getekend':    'border-l-[#1A535C]',
    'ontvangen':   'border-l-[#2D6B48]',
    'opgeleverd':  'border-l-[#2D6B48]',
    'te-factureren':'border-l-[#2D6B48]',
    'gefactureerd':'border-l-[#2D6B48]',

    // Flame
    'verstuurd':   'border-l-[#F15025]',
    'verzonden':   'border-l-[#F15025]',
    'open':        'border-l-[#F15025]',
    'afgewezen':   'border-l-[#F15025]',
    'verlopen':    'border-l-[#C03A18]',
    'vervallen':   'border-l-[#C03A18]',
    'te-laat':     'border-l-[#C03A18]',
    'geannuleerd': 'border-l-[#C03A18]',
    'wijziging_gevraagd': 'border-l-[#F15025]',

    // Blauw
    'bezig':       'border-l-[#2A5580]',
    'ingediend':   'border-l-[#2A5580]',
    'besteld':     'border-l-[#2A5580]',
    'gepland':     'border-l-[#2A5580]',
    'geleverd':    'border-l-[#2A5580]',
    'montage':     'border-l-[#2A5580]',
    'definitief':  'border-l-[#2A5580]',

    // Petrol
    'petrol':      'border-l-[#1A535C]',

    // Paars
    'bekeken':     'border-l-[#5A4A78]',
    'in-uitvoering':'border-l-[#5A4A78]',
    'productie':   'border-l-[#5A4A78]',
    'gecrediteerd':'border-l-[#5A4A78]',

    // Grijs
    'concept':     'border-l-[#A0A098]',
    'todo':        'border-l-[#A0A098]',
    'in-review':   'border-l-[#A0A098]',
    'on-hold':     'border-l-[#A0A098]',
    'gepauzeerd':  'border-l-[#A0A098]',
    'geblokkeerd': 'border-l-[#C03A18]',
  }
  return map[status.toLowerCase()] ?? 'border-l-transparent'
}

export function getStatusColor(status: string): string {
  return getStatusBadgeClass(status)
}
