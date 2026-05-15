import React, { useState } from 'react'
import { ChevronRight, FileText } from 'lucide-react'
import { listDefaults } from '@/services/emailTemplateService'
import { TemplateEditor } from './TemplateEditor'

export function TemplatesSubTab() {
  const defaults = listDefaults()
  const triggers = Object.keys(defaults)
  const [editing, setEditing] = useState<string | null>(null)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[#6B6B66]">
        <FileText className="h-4 w-4" />
        <p className="text-sm">
          {triggers.length} systeem-templates. Klik om te bewerken.
        </p>
      </div>
      <ul className="rounded-lg border border-[#E2E2DD] bg-white divide-y divide-[#E2E2DD]">
        {triggers.map((key) => {
          const def = defaults[key]
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => setEditing(key)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#F8F7F4] transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1A1A1A] truncate">{def.naam}</p>
                  <p className="text-xs text-[#9B9B95] truncate">{def.onderwerp}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-[#9B9B95] flex-shrink-0" />
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
