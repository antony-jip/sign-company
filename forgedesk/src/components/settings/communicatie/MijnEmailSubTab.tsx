import React from 'react'
import { ArrowRight, Mail } from 'lucide-react'

export function MijnEmailSubTab() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-background p-6 space-y-3">
      <div className="flex items-center gap-2 text-foreground">
        <Mail className="h-4 w-4" />
        <h3 className="text-sm font-semibold">Open op de huidige locatie</h3>
      </div>
      <p className="text-sm text-foreground/70 leading-relaxed">
        Handtekening, SMTP-instellingen en email-voorkeuren staan nog
        onder Instellingen, E-mail. Pas ze daar aan tot we ze hierheen
        verhuizen.
      </p>
      <a
        href="/instellingen?tab=email"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1A535C] hover:text-[#0F3D45] transition-colors"
      >
        Open Instellingen, E-mail
        <ArrowRight className="h-3.5 w-3.5" />
      </a>
    </div>
  )
}
