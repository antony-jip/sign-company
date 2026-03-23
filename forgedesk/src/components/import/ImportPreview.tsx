import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, FolderOpen, FileText, Receipt, AlertTriangle } from 'lucide-react'
import type { ImportSamenvatting } from '@/services/jamesProImportService'

interface ImportPreviewProps {
  samenvatting: ImportSamenvatting
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount)
}

export function ImportPreview({ samenvatting }: ImportPreviewProps) {
  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={Users}
          label="Klanten"
          count={samenvatting.klanten}
        />
        <SummaryCard
          icon={FolderOpen}
          label="Projecten"
          count={samenvatting.projecten.total}
          sub={`${samenvatting.projecten.linkedKlanten} gekoppeld`}
        />
        <SummaryCard
          icon={FileText}
          label="Offertes"
          count={samenvatting.offertes.total}
          sub={`${samenvatting.offertes.akkoord} akkoord, ${samenvatting.offertes.inAfwachting} in afwachting, ${samenvatting.offertes.afgewezen} afgewezen`}
        />
        <SummaryCard
          icon={Receipt}
          label="Facturen"
          count={samenvatting.facturen.total}
          sub={formatCurrency(samenvatting.facturen.totaalBedrag)}
        />
      </div>

      {/* Preview table */}
      {samenvatting.previewKlanten.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top 5 klanten</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E6E4E0]">
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Klant</th>
                    <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Projecten</th>
                    <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Offertes</th>
                    <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Facturen</th>
                    <th className="text-right py-2 pl-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Omzet</th>
                  </tr>
                </thead>
                <tbody>
                  {samenvatting.previewKlanten.map((klant, i) => (
                    <tr key={i} className="border-b border-[#E6E4E0]/50 last:border-0">
                      <td className="py-2.5 pr-4 font-medium text-foreground">{klant.naam}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-muted-foreground">{klant.projecten}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-muted-foreground">{klant.offertes}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-muted-foreground">{klant.facturen}</td>
                      <td className="py-2.5 pl-4 text-right font-mono text-foreground">{formatCurrency(klant.omzet)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {samenvatting.warnings.length > 0 && (
        <div className="space-y-2">
          {samenvatting.warnings.map((warning, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SummaryCard({ icon: Icon, label, count, sub }: { icon: React.ElementType; label: string; count: number; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[#1A5C5E]/10 p-2 text-[#1A5C5E]">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-semibold font-mono text-foreground">{count.toLocaleString('nl-NL')}</p>
            {sub && <p className="text-[11px] text-muted-foreground truncate">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
