import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Target, Loader2, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { round2 } from '@/utils/budgetUtils'
import { getDeals } from '@/services/supabaseService'
import type { Deal } from '@/types'

const MAAND_NAMEN = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']

export function SalesForecastWidget() {
  const navigate = useNavigate()
  const [deals, setDeals] = useState<Deal[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getDeals()
      .catch(() => [])
      .then((data) => {
        if (!cancelled) setDeals(data)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const { gewogenWaarde, pipelineWaarde, chartData } = useMemo(() => {
    const openDeals = deals.filter((d) => d.status === 'open')
    const pipeline = openDeals.reduce((s, d) => s + d.verwachte_waarde, 0)
    const gewogen = openDeals.reduce((s, d) => s + round2(d.verwachte_waarde * ((d.kans_percentage || 50) / 100)), 0)

    // Mini-chart: forecast per maand (3 maanden vooruit)
    const now = new Date()
    const data: Array<{ maand: string; waarde: number }> = []
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      let maandWaarde = 0
      for (const deal of openDeals) {
        const sluit = deal.verwachte_sluitdatum
          ? new Date(deal.verwachte_sluitdatum)
          : new Date(now.getFullYear(), now.getMonth() + 2, 1)
        const dealKey = `${sluit.getFullYear()}-${String(sluit.getMonth() + 1).padStart(2, '0')}`
        if (dealKey === key) {
          maandWaarde += round2(deal.verwachte_waarde * ((deal.kans_percentage || 50) / 100))
        }
      }
      data.push({ maand: MAAND_NAMEN[d.getMonth()], waarde: round2(maandWaarde) })
    }

    return { gewogenWaarde: round2(gewogen), pipelineWaarde: round2(pipeline), chartData: data }
  }, [deals])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[180px]">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Sales Forecast
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => navigate('/forecast')}>
            Bekijk <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Pipeline</p>
            <p className="text-sm font-bold">{formatCurrency(pipelineWaarde)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Gewogen</p>
            <p className="text-sm font-bold text-emerald-600">{formatCurrency(gewogenWaarde)}</p>
          </div>
        </div>
        {chartData.some((d) => d.waarde > 0) && (
          <div className="h-[80px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="maand" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="waarde" fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
