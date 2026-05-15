import React from 'react'
import { listDefaults } from '@/services/emailTemplateService'

export function TemplatesSubTab() {
  const defaults = listDefaults()
  const triggers = Object.keys(defaults)
  return (
    <div className="space-y-2">
      <p className="text-sm text-[#6B6B66]">
        Systeem-templates ({triggers.length}). Klik in fase 3c voor de editor.
      </p>
      <ul className="border rounded divide-y">
        {triggers.map((key) => (
          <li key={key} className="px-3 py-2 text-sm">
            <span className="font-medium">{defaults[key].naam}</span>
            <span className="ml-2 text-[#9B9B95]">{key}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
