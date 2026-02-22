import React from 'react'
import {
  CheckCircle2,
  Eye,
  RotateCcw,
  Clock,
  Copy,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { goedkeuringStatusLabels } from '@/constants/projectConstants'
import type { TekeningGoedkeuring } from '@/types'
import { toast } from 'sonner'

interface ProjectGoedkeuringenProps {
  goedkeuringen: TekeningGoedkeuring[]
  projectNaam: string
  klantNaam: string
  onRevisieVerstuur: (gk: TekeningGoedkeuring) => void
}

function getGoedkeuringStatusIcon(status: string) {
  switch (status) {
    case 'goedgekeurd': return <CheckCircle2 className="h-4 w-4 text-green-600" />
    case 'revisie': return <RotateCcw className="h-4 w-4 text-amber-600" />
    case 'bekeken': return <Eye className="h-4 w-4 text-accent" />
    default: return <Clock className="h-4 w-4 text-blue-600" />
  }
}

function getGoedkeuringStatusColor(status: string) {
  switch (status) {
    case 'goedgekeurd': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    case 'revisie': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
    case 'bekeken': return 'bg-wm-pale/30 text-[#3D3522] dark:bg-accent/30 dark:text-wm-pale'
    default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
  }
}

export function ProjectGoedkeuringen({
  goedkeuringen,
  projectNaam,
  klantNaam,
  onRevisieVerstuur,
}: ProjectGoedkeuringenProps) {
  if (goedkeuringen.length === 0) return null

  const copyApprovalLink = (token: string) => {
    const link = `${window.location.origin}/goedkeuring/${token}`
    navigator.clipboard.writeText(link)
    toast.success('Link gekopieerd naar klembord')
  }

  return (
    <Card className="border-gray-200/80 dark:border-gray-700/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
            <CheckCircle2 className="h-3.5 w-3.5 text-white" />
          </div>
          Klant Goedkeuringen
          <span className="text-xs text-muted-foreground font-normal">{goedkeuringen.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {goedkeuringen.map((gk) => (
          <div
            key={gk.id}
            className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getGoedkeuringStatusIcon(gk.status)}
                <span className="text-sm font-medium text-foreground">
                  {gk.document_ids.length} bestand(en)
                  {gk.offerte_id && ' + offerte'}
                </span>
              </div>
              <Badge className={`${getGoedkeuringStatusColor(gk.status)} text-[10px] px-2`}>
                {goedkeuringStatusLabels[gk.status] || gk.status}
              </Badge>
            </div>

            <div className="text-xs text-muted-foreground">
              Verstuurd naar {gk.email_aan} op {formatDate(gk.created_at)}
              {gk.revisie_nummer > 1 && ` (revisie ${gk.revisie_nummer})`}
            </div>

            {gk.status === 'goedgekeurd' && gk.goedgekeurd_door && (
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg px-3 py-2 text-xs text-green-700 dark:text-green-400">
                Goedgekeurd door <strong>{gk.goedgekeurd_door}</strong>
                {gk.goedgekeurd_op && ` op ${formatDate(gk.goedgekeurd_op)}`}
              </div>
            )}

            {gk.status === 'revisie' && gk.revisie_opmerkingen && (
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                <strong>Revisie opmerkingen:</strong> {gk.revisie_opmerkingen}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => copyApprovalLink(gk.token)}
              >
                <Copy className="h-3 w-3 mr-1" />
                Link kopiëren
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => window.open(`/goedkeuring/${gk.token}`, '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Openen
              </Button>
              {gk.status === 'revisie' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-amber-700 dark:text-amber-400 hover:text-amber-900"
                  onClick={() => onRevisieVerstuur(gk)}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Opnieuw versturen
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
