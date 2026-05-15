import React from 'react'
import { ArrowRight, Globe } from 'lucide-react'

export function PortaalEmailsSubTab() {
  return (
    <div className="rounded-lg border border-dashed border-[#E2E2DD] bg-[#F8F7F4] p-6 space-y-3">
      <div className="flex items-center gap-2 text-[#1A1A1A]">
        <Globe className="h-4 w-4" />
        <h3 className="text-sm font-semibold">Open op de huidige locatie</h3>
      </div>
      <p className="text-sm text-[#6B6B66] leading-relaxed">
        Portaal-uitnodiging, -herinnering en timing staan nog onder
        Instellingen, Integraties, Portaal. Pas ze daar aan tot we ze
        hierheen verhuizen.
      </p>
      <a
        href="/instellingen?tab=portaal"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1A535C] hover:text-[#0F3D45] transition-colors"
      >
        Open Instellingen, Integraties, Portaal
        <ArrowRight className="h-3.5 w-3.5" />
      </a>
    </div>
  )
}
