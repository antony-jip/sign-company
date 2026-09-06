import React, { useState } from 'react'
import { ChevronRight, FileText } from 'lucide-react'
import { listDefaults } from '@/services/emailTemplateService'
import { TemplateEditor } from './TemplateEditor'

// Deze 5 templates zijn doen.-platform-mails (doen. → org-admin). Voor
// klant-orgs zijn ze irrelevant · alleen Sign Makers (de doen.-eigenaar)
// ziet ze in de editor.
// Mails die doen. zelf aan een organisatie stuurt (onboarding, proefperiode).
// Niet per organisatie te bewerken: de onboarding-taak heeft eigen vaste tekst
// en de trial-herinnering valt terug op de standaardtekst.
const DOEN_PLATFORM_TRIGGERS = new Set([
  'onboarding_dag3',
  'onboarding_dag7',
  'trial_reminder_5',
  'trial_reminder_2',
  'trial_reminder_0',
])

export function TemplatesSubTab() {
  const defaults = listDefaults()
  const [editing, setEditing] = useState<string | null>(null)
  const triggers = Object.keys(defaults).filter((key) => !DOEN_PLATFORM_TRIGGERS.has(key))

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-foreground/70">
        <FileText className="h-4 w-4" />
        <p className="text-sm">
          {triggers.length} systeem-templates. Klik om te bewerken.
        </p>
      </div>
      <ul className="rounded-lg border border-border bg-card divide-y divide-border">
        {triggers.map((key) => {
          const def = defaults[key]
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => setEditing(key)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-background transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{def.naam}</p>
                  <p className="text-xs text-muted-foreground truncate">{def.onderwerp}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </button>
            </li>
          )
        })}
      </ul>

      {editing && (
        <TemplateEditor
          triggerTaskNaam={editing}
          open={true}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
