import React, { useState } from 'react'
import { ChevronDown, ChevronRight, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImportHelpProps {
  type: 'bedrijfsdata' | 'contactpersonen'
}

export function ImportHelp({ type }: ImportHelpProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <HelpCircle className="w-4 h-4" />
        <span>Hulp nodig bij het invullen?</span>
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      <div className={cn(
        'overflow-hidden transition-all duration-300',
        open ? 'max-h-[2000px] mt-4' : 'max-h-0'
      )}>
        {type === 'bedrijfsdata' ? <BedrijfsdataHelp /> : <ContactpersonenHelp />}
      </div>
    </div>
  )
}

function BedrijfsdataHelp() {
  return (
    <div className="space-y-4 text-sm text-muted-foreground bg-muted/30 rounded-lg p-4 border">
      <p>Het template heeft 14 kolommen. Je hoeft niet alles in te vullen — vul alleen in wat je hebt.</p>

      <div>
        <p className="font-semibold text-foreground mb-1">TYPE (verplicht)</p>
        <p>Vul in de eerste kolom één van deze waarden in:</p>
        <ul className="list-disc list-inside mt-1 space-y-0.5">
          <li><strong>relatie</strong> — voor je klanten en bedrijven</li>
          <li><strong>project</strong> — voor je projecten</li>
          <li><strong>offerte</strong> — voor je offertes</li>
          <li><strong>factuur</strong> — voor je facturen</li>
        </ul>
      </div>

      <div>
        <p className="font-semibold text-foreground mb-1">WELKE KOLOMMEN BIJ WELK TYPE?</p>
        <div className="space-y-2">
          <p>Bij type <strong>&quot;relatie&quot;</strong> vul je in:<br />
            <code className="text-xs bg-muted px-1 py-0.5 rounded">bedrijfsnaam, adres, postcode, plaats, telefoon, email, kvk_nummer, btw_nummer</code>
          </p>
          <p>Bij type <strong>&quot;project&quot;</strong> vul je in:<br />
            <code className="text-xs bg-muted px-1 py-0.5 rounded">bedrijfsnaam, naam (= projectnaam), nummer, datum, verantwoordelijke</code>
          </p>
          <p>Bij type <strong>&quot;offerte&quot;</strong> vul je in:<br />
            <code className="text-xs bg-muted px-1 py-0.5 rounded">bedrijfsnaam, naam (= omschrijving), nummer, datum, bedrag</code>
          </p>
          <p>Bij type <strong>&quot;factuur&quot;</strong> vul je in:<br />
            <code className="text-xs bg-muted px-1 py-0.5 rounded">bedrijfsnaam, naam (= omschrijving), nummer, datum, bedrag</code>
          </p>
        </div>
        <p className="mt-1">De overige kolommen laat je leeg.</p>
      </div>

      <div>
        <p className="font-semibold text-foreground mb-1">DATUMS</p>
        <p>Gebruik het formaat: <code className="text-xs bg-muted px-1 py-0.5 rounded">2026-01-15</code> (jaar-maand-dag)</p>
      </div>

      <div>
        <p className="font-semibold text-foreground mb-1">BEDRAGEN</p>
        <p>Gebruik een punt als decimaalteken: <code className="text-xs bg-muted px-1 py-0.5 rounded">2500.00</code></p>
        <p>Geen euroteken, geen duizendtal-scheidingsteken.</p>
      </div>

      <div>
        <p className="font-semibold text-foreground mb-1">SCHEIDINGSTEKEN</p>
        <p>Het template gebruikt <code className="text-xs bg-muted px-1 py-0.5 rounded">;</code> (puntkomma). Open het bestand in Excel of Google Sheets om het in te vullen.</p>
      </div>

    </div>
  )
}

function ContactpersonenHelp() {
  return (
    <div className="space-y-3 text-sm text-muted-foreground bg-muted/30 rounded-lg p-4 border">
      <p>Het template heeft 6 kolommen:</p>
      <ul className="list-disc list-inside space-y-0.5">
        <li><strong>bedrijfsnaam</strong> — om te koppelen aan een bestaande klant (optioneel)</li>
        <li><strong>voornaam</strong> — voornaam van het contact</li>
        <li><strong>achternaam</strong> — achternaam van het contact</li>
        <li><strong>email</strong> — e-mailadres</li>
        <li><strong>telefoon</strong> — telefoonnummer</li>
        <li><strong>functie</strong> — functietitel</li>
      </ul>
      <p>Laat <strong>bedrijfsnaam</strong> leeg voor losse contacten die niet aan een klant gekoppeld zijn.</p>
      <p>Contacten met hetzelfde e-mailadres worden overgeslagen (duplicaatdetectie).</p>
    </div>
  )
}
