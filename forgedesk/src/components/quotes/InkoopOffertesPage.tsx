import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ShoppingCart,
  Upload,
  ChevronDown,
  ChevronRight,
  Trash2,
  FileText,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { round2 } from '@/utils/budgetUtils'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import {
  getInkoopOffertes,
  deleteInkoopOfferte,
} from '@/services/supabaseService'
import type { InkoopOfferte } from '@/types'
import { logger } from '../../utils/logger'

export function InkoopOffertesPage() {
  const { user } = useAuth()
  const [offertes, setOffertes] = useState<InkoopOfferte[]>([])
  const [expandedOffertes, setExpandedOffertes] = useState<Set<string>>(new Set())
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadOffertes = useCallback(async () => {
    if (!user?.id) return
    setIsLoading(true)
    try {
      const data = await getInkoopOffertes(user.id)
      setOffertes(data)
    } catch (err) {
      logger.error('Inkoop offertes laden mislukt:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadOffertes()
  }, [loadOffertes])

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteInkoopOfferte(id)
      setOffertes(prev => prev.filter(o => o.id !== id))
      setDeleteConfirmId(null)
      toast.success('Inkoopofferte verwijderd')
    } catch (err) {
      logger.error('Verwijderen mislukt:', err)
      toast.error('Kon inkoopofferte niet verwijderen')
    }
  }, [])

  const toggleExpanded = useCallback((id: string) => {
    setExpandedOffertes(prev => {
      const copy = new Set(prev)
      if (copy.has(id)) copy.delete(id)
      else copy.add(id)
      return copy
    })
  }, [])

  const totaalInkoop = round2(offertes.reduce((sum, o) => sum + o.totaal, 0))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>
            Inkoopoffertes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overzicht van alle inkoopoffertes van leveranciers
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Totaal inkoop</p>
          <p className="text-xl font-bold tabular-nums">{formatCurrency(totaalInkoop)}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Offertes</p>
            <p className="text-2xl font-bold">{offertes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Leveranciers</p>
            <p className="text-2xl font-bold">{new Set(offertes.map(o => o.leverancier_naam)).size}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Totaal regels</p>
            <p className="text-2xl font-bold">{offertes.reduce((sum, o) => sum + (o.regels?.length || 0), 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Totaal inkoop</p>
            <p className="text-2xl font-bold tabular-nums">{formatCurrency(totaalInkoop)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Offertes list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : offertes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Nog geen inkoopoffertes</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Upload inkoopoffertes via het offerte-scherm bij het aanmaken van een nieuwe offerte.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {offertes.map((offerte) => {
            const isExpanded = expandedOffertes.has(offerte.id)
            return (
              <Card key={offerte.id}>
                <CardHeader className="pb-0 cursor-pointer" onClick={() => toggleExpanded(offerte.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                      <div className="min-w-0">
                        <CardTitle className="text-base font-semibold truncate">{offerte.leverancier_naam}</CardTitle>
                        <p className="text-xs text-muted-foreground">{offerte.datum} &middot; {offerte.regels?.length || 0} regels</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-lg font-bold tabular-nums">{formatCurrency(offerte.totaal)}</span>
                      {deleteConfirmId === offerte.id ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="destructive" size="sm" className="h-7 text-xs px-2" onClick={() => handleDelete(offerte.id)}>
                            Verwijder
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => setDeleteConfirmId(null)}>
                            Annuleer
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(offerte.id) }}
                          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && offerte.regels && (
                  <CardContent className="pt-3">
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Omschrijving</th>
                            <th className="text-right px-3 py-2 font-medium text-muted-foreground w-20">Aantal</th>
                            <th className="text-right px-3 py-2 font-medium text-muted-foreground w-24">Eenheid</th>
                            <th className="text-right px-3 py-2 font-medium text-muted-foreground w-28">Prijs/stk</th>
                            <th className="text-right px-3 py-2 font-medium text-muted-foreground w-28">Totaal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {offerte.regels.map((regel) => (
                            <tr key={regel.id} className={regel.twijfelachtig ? 'bg-orange-50/50 dark:bg-orange-950/10' : ''}>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-1.5">
                                  {regel.twijfelachtig && <AlertTriangle className="h-3.5 w-3.5 text-orange-500 shrink-0" />}
                                  <span className="text-foreground">{regel.omschrijving}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">{regel.aantal}</td>
                              <td className="px-3 py-2 text-right text-muted-foreground">{regel.eenheid || 'stuks'}</td>
                              <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(round2(regel.prijs_per_stuk))}</td>
                              <td className="px-3 py-2 text-right tabular-nums font-medium">{formatCurrency(round2(regel.totaal))}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t bg-muted/30">
                          <tr>
                            <td colSpan={4} className="px-3 py-2 text-right font-semibold">Totaal</td>
                            <td className="px-3 py-2 text-right font-bold tabular-nums">{formatCurrency(offerte.totaal)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
