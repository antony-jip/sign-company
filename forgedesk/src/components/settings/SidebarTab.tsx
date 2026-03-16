import { Switch } from '@/components/ui/switch'
import { useProjectSidebarConfig, type ProjectSidebarConfig } from '@/hooks/useProjectSidebarConfig'
import {
  MapPin,
  Users,
  TrendingUp,
  Wrench,
  ClipboardCheck,
  CreditCard,
  Wallet,
  Receipt,
  Sparkles,
  Camera,
  FileText,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface SidebarBoxOption {
  key: keyof ProjectSidebarConfig
  label: string
  icon: LucideIcon
  description: string
}

const SIDEBAR_BOXES: SidebarBoxOption[] = [
  { key: 'voortgang', label: 'Voortgang', icon: TrendingUp, description: 'Project stappen indicator' },
  { key: 'klant', label: 'Klant & Contact', icon: MapPin, description: 'Klantinformatie en contactpersoon' },
  { key: 'team', label: 'Team', icon: Users, description: 'Projectteam leden' },
  { key: 'offertes', label: 'Offertes', icon: Receipt, description: 'Gekoppelde offertes' },
  { key: 'werkbonnen', label: 'Werkbonnen', icon: ClipboardCheck, description: 'Werkbonnen en uitvoering' },
  { key: 'facturen', label: 'Facturen', icon: CreditCard, description: 'Gekoppelde facturen' },
  { key: 'uitgaven', label: 'Uitgaven', icon: Wallet, description: 'Projectuitgaven en inkoop' },
  { key: 'montage', label: 'Montage', icon: Wrench, description: 'Montage planning' },
  { key: 'visualisaties', label: 'Visualisaties', icon: Sparkles, description: 'Signing visualisaties' },
  { key: 'fotos', label: 'Situatiefoto\'s', icon: Camera, description: 'Project foto\'s' },
  { key: 'bestanden', label: 'Bestanden', icon: FileText, description: 'Documenten en uploads' },
]

export function SidebarTab() {
  const { config, toggleBox } = useProjectSidebarConfig()

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground mb-1">Project sidebar</h3>
        <p className="text-sm text-muted-foreground">
          Kies welke secties zichtbaar zijn in de project detail sidebar.
        </p>
      </div>

      <div className="space-y-1">
        {SIDEBAR_BOXES.map((box) => {
          const Icon = box.icon
          return (
            <div
              key={box.key}
              className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{box.label}</p>
                  <p className="text-xs text-muted-foreground">{box.description}</p>
                </div>
              </div>
              <Switch
                checked={config[box.key]}
                onCheckedChange={() => toggleBox(box.key)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
