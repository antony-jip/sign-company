import React, { useState } from 'react'
import { Mail, FileText, FileSearch, Receipt, Globe, Sparkles } from 'lucide-react'
import { SubTabNav } from '../SubTabNav'
import type { SubTab } from '../settingsShared'
import { MijnEmailSubTab } from './MijnEmailSubTab'
import { TemplatesSubTab } from './TemplatesSubTab'
import { OfferteOpvolgingSubTab } from './OfferteOpvolgingSubTab'
import { FactuurOpvolgingSubTab } from './FactuurOpvolgingSubTab'
import { PortaalEmailsSubTab } from './PortaalEmailsSubTab'
import { OnboardingTrialSubTab } from './OnboardingTrialSubTab'

const COMMUNICATIE_SUBTABS: SubTab[] = [
  { id: 'mijn-email', label: 'Mijn e-mail', icon: Mail },
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'offerte-opvolging', label: 'Offerte-opvolging', icon: FileSearch },
  { id: 'factuur-opvolging', label: 'Factuur-opvolging', icon: Receipt },
  { id: 'portaal-emails', label: 'Portaal e-mails', icon: Globe },
  { id: 'onboarding-trial', label: 'Onboarding & Trial', icon: Sparkles },
]

export function CommunicatieTab() {
  const [active, setActive] = useState<string>('mijn-email')

  return (
    <div>
      <SubTabNav tabs={COMMUNICATIE_SUBTABS} active={active} onChange={setActive} variant="underline" />
      {active === 'mijn-email' && <MijnEmailSubTab />}
      {active === 'templates' && <TemplatesSubTab />}
      {active === 'offerte-opvolging' && <OfferteOpvolgingSubTab />}
      {active === 'factuur-opvolging' && <FactuurOpvolgingSubTab />}
      {active === 'portaal-emails' && <PortaalEmailsSubTab />}
      {active === 'onboarding-trial' && <OnboardingTrialSubTab />}
    </div>
  )
}
