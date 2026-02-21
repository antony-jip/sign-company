import { useState, useEffect, useMemo } from 'react'
import {
  TrendingUp, Loader2, DollarSign, Target, BarChart3, ArrowUp, ArrowDown,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, Area, AreaChart,
} from 'recharts'
import { cn, formatCurrency, round2 } from '@/lib/utils'
import { getFacturen, getDeals } from '@/services/supabaseService'
import type { Factuur, Deal } from '@/types'

// ─── Helpers ────────────────────────────────────────────────────────

const MAAND_NAMEN = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getMonthLabel(key: string): string {
  const [jaar, maand] = key.split('-')
  return `${MAAND_NAMEN[parseInt(maand) - 1]} ${jaar.slice(2)}`
}

// ─── Component ──────────────────────────────────────────────────────

export function ForecastLayout() {
  const [facturen, setFacturen] = useState<Factuur[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [forecastPeriod, setForecastPeriod] = useState<'6' | '12'>('6')

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      try {
        const [fData, dData] = await Promise.all([
          getFacturen().catch(() => []),
          getDeals().catch(() => []),
        ])
        if (cancelled) return
        setFacturen(fData)
        setDeals(dData)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [])

  // ── KPIs ──
  const kpis = useMemo(() => {
    const openDeals = deals.filter((d) => d.status === 'open')
    const pipelineWaarde = openDeals.reduce((s, d) => s + d.verwachte_waarde, 0)
    const gewogenWaarde = openDeals.reduce((s, d) => s + round2(d.verwachte_waarde * ((d.kans_percentage || 50) / 100)), 0)

    const now = new Date()
    const thisMonth = getMonthKey(now)
    const betaaldeFacturen = facturen.filter((f) => f.status === 'betaald')
    const omzetDezeMaand = betaaldeFacturen
      .filter((f) => f.betaaldatum && getMonthKey(new Date(f.betaaldatum)) === thisMonth)
      .reduce((s, f) => s + f.totaal, 0)

    const gewonnenDezeMaand = deals
      .filter((d) => d.status === 'gewonnen' && d.gewonnen_op && getMonthKey(new Date(d.gewonnen_op)) === thisMonth)
      .reduce((s, d) => s + (d.werkelijke_waarde || d.verwachte_waarde), 0)

    const gemKansPercentage = openDeals.length > 0
      ? Math.round(openDeals.reduce((s, d) => s + (d.kans_percentage || 50), 0) / openDeals.length)
      : 0

    return {
      pipelineWaarde: round2(pipelineWaarde),
      gewogenWaarde: round2(gewogenWaarde),
      omzetDezeMaand: round2(omzetDezeMaand),
      gewonnenDezeMaand: round2(gewonnenDezeMaand),
      aantalOpenDeals: openDeals.length,
      gemKansPercentage,
    }
  }, [deals, facturen])

  // ── Grafiek data: historisch + forecast ──
  const chartData = useMemo(() => {
    const now = new Date()
    const monthsBack = 6
    const monthsForward = parseInt(forecastPeriod)

    // Historische omzet uit betaalde facturen
    const historisch: Record<string, number> = {}
    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      historisch[getMonthKey(d)] = 0
    }
    for (const f of facturen.filter((f) => f.status === 'betaald' && f.betaaldatum)) {
      const key = getMonthKey(new Date(f.betaaldatum!))
      if (key in historisch) {
        historisch[key] = round2((historisch[key] || 0) + f.totaal)
      }
    }

    // Forecast uit open deals (verwachte_waarde × kans_percentage, verdeeld over maanden)
    const forecast: Record<string, number> = {}
    for (let i = 0; i < monthsForward; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1)
      forecast[getMonthKey(d)] = 0
    }

    const openDeals = deals.filter((d) => d.status === 'open')
    for (const deal of openDeals) {
      const sluitdatum = deal.verwachte_sluitdatum
        ? new Date(deal.verwachte_sluitdatum)
        : new Date(now.getFullYear(), now.getMonth() + 2, 1) // default: 2 maanden
      const key = getMonthKey(sluitdatum)
      if (key in forecast) {
        const gewogen = round2(deal.verwachte_waarde * ((deal.kans_percentage || 50) / 100))
        forecast[key] = round2((forecast[key] || 0) + gewogen)
      }
    }

    // Gemiddelde historische omzet voor baseline forecast
    const histValues = Object.values(historisch)
    const gemHistorisch = histValues.length > 0
      ? round2(histValues.reduce((s, v) => s + v, 0) / histValues.length)
      : 0

    // Combine
    const data: Array<{
      maand: string
      historisch?: number
      forecast?: number
      baseline?: number
    }> = []

    for (const [key, val] of Object.entries(historisch)) {
      data.push({ maand: getMonthLabel(key), historisch: val })
    }

    for (const [key, val] of Object.entries(forecast)) {
      data.push({
        maand: getMonthLabel(key),
        forecast: val,
        baseline: gemHistorisch,
      })
    }

    return data
  }, [facturen, deals, forecastPeriod])

  // ── Deals per fase tabel ──
  const dealsPerFase = useMemo(() => {
    const faseMap: Record<string, { count: number; waarde: number; gewogen: number }> = {}
    for (const d of deals.filter((d) => d.status === 'open')) {
      const key = d.fase
      if (!faseMap[key]) faseMap[key] = { count: 0, waarde: 0, gewogen: 0 }
      faseMap[key].count++
      faseMap[key].waarde = round2(faseMap[key].waarde + d.verwachte_waarde)
      faseMap[key].gewogen = round2(faseMap[key].gewogen + round2(d.verwachte_waarde * ((d.kans_percentage || 50) / 100)))
    }
    return Object.entries(faseMap).map(([fase, data]) => ({ fase, ...data }))
  }, [deals])

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Sales Forecasting</h1>
            <p className="text-sm text-muted-foreground">Gewogen pipeline en omzetprognose</p>
          </div>
        </div>
        <Select value={forecastPeriod} onValueChange={(v) => setForecastPeriod(v as '6' | '12')}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="6">6 maanden vooruit</SelectItem>
            <SelectItem value="12">12 maanden vooruit</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-medium text-muted-foreground">Pipeline waarde</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(kpis.pipelineWaarde)}</p>
            <p className="text-xs text-muted-foreground">{kpis.aantalOpenDeals} open deals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-medium text-muted-foreground">Gewogen waarde</span>
            </div>
            <p className="text-xl font-bold text-emerald-600">{formatCurrency(kpis.gewogenWaarde)}</p>
            <p className="text-xs text-muted-foreground">Gem. kans {kpis.gemKansPercentage}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Omzet deze maand</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(kpis.omzetDezeMaand)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium text-muted-foreground">Gewonnen deze maand</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(kpis.gewonnenDezeMaand)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Forecast grafiek */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Omzet & Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="maand" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="historisch" name="Omzet (gerealiseerd)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="forecast" name="Forecast (gewogen)" fill="#10b981" radius={[4, 4, 0, 0]} opacity={0.7} />
                <Bar dataKey="baseline" name="Baseline (gem.)" fill="#94a3b8" radius={[4, 4, 0, 0]} opacity={0.3} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline breakdown tabel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline per fase</CardTitle>
        </CardHeader>
        <CardContent>
          {dealsPerFase.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Geen open deals</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  {['Fase', 'Deals', 'Pipeline waarde', 'Gewogen waarde'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {dealsPerFase.map((row) => (
                  <tr key={row.fase} className="hover:bg-muted/50">
                    <td className="px-4 py-2.5 text-sm font-medium capitalize">{row.fase}</td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground">{row.count}</td>
                    <td className="px-4 py-2.5 text-sm">{formatCurrency(row.waarde)}</td>
                    <td className="px-4 py-2.5 text-sm text-emerald-600 font-medium">{formatCurrency(row.gewogen)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 font-semibold">
                  <td className="px-4 py-2.5 text-sm">Totaal</td>
                  <td className="px-4 py-2.5 text-sm">{dealsPerFase.reduce((s, r) => s + r.count, 0)}</td>
                  <td className="px-4 py-2.5 text-sm">{formatCurrency(dealsPerFase.reduce((s, r) => s + r.waarde, 0))}</td>
                  <td className="px-4 py-2.5 text-sm text-emerald-600">{formatCurrency(dealsPerFase.reduce((s, r) => s + r.gewogen, 0))}</td>
                </tr>
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
