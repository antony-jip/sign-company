import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  PiggyBank,
  TrendingUp,
  TrendingDown,
  Receipt,
  Euro,
  FileText,
  Clock,
  Loader2,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { getFacturen, getOffertes } from '@/services/supabaseService'
import { getInkoopfacturen } from '@/services/inkoopfactuurService'
import type { Factuur, Offerte, InkoopFactuur } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { GeneralLedgerSettings } from './GeneralLedgerSettings'
import { VATCodesSettings } from './VATCodesSettings'
import { DiscountsSettings } from './DiscountsSettings'

const MAAND_LABELS = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']

const PIE_COLORS = ['#1A535C', '#F15025', '#E8B931', '#9B9B95']

function formatTooltipValue(value: number) {
  return formatCurrency(value)
}

export function FinancialLayout() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overzicht')
  const [facturen, setFacturen] = useState<Factuur[]>([])
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [inkoopfacturen, setInkoopfacturen] = useState<InkoopFactuur[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getFacturen(),
      getOffertes(),
      getInkoopfacturen().catch(() => []),
    ]).then(([fac, off, inkoop]) => {
      if (cancelled) return
      setFacturen(fac)
      setOffertes(off)
      setInkoopfacturen(inkoop)
      setIsLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  // === KPI berekeningen op basis van echte facturen ===
  const totaleOmzet = useMemo(
    () => facturen
      .filter((f) => f.status === 'betaald')
      .reduce((sum, f) => sum + (f.totaal || 0), 0),
    [facturen]
  )

  const gefactureerd = useMemo(
    () => facturen
      .filter((f) => f.status === 'verzonden' || f.status === 'betaald')
      .reduce((sum, f) => sum + (f.totaal || 0), 0),
    [facturen]
  )

  const openstaandBedrag = useMemo(
    () => facturen
      .filter((f) => f.status === 'verzonden' || f.status === 'vervallen')
      .reduce((sum, f) => sum + (f.totaal || 0) - (f.betaald_bedrag || 0), 0),
    [facturen]
  )

  const vervallenFacturen = useMemo(
    () => facturen.filter((f) => f.status === 'vervallen'),
    [facturen]
  )

  const openstaandeOffertes = useMemo(
    () => offertes.filter(
      (o) => o.status === 'verzonden' || o.status === 'bekeken' || o.status === 'concept'
    ),
    [offertes]
  )

  const offerteWaarde = useMemo(
    () => openstaandeOffertes.reduce((sum, o) => sum + (o.totaal || 0), 0),
    [openstaandeOffertes]
  )

  // === Inkoopkosten ===
  const inkoopGoedgekeurd = useMemo(
    () => inkoopfacturen.filter(f => f.status === 'goedgekeurd'),
    [inkoopfacturen]
  )

  const totaleInkoopkosten = useMemo(
    () => inkoopGoedgekeurd.reduce((sum, f) => sum + (f.totaal || 0), 0),
    [inkoopGoedgekeurd]
  )

  const inkoopOpenstaand = useMemo(
    () => inkoopfacturen
      .filter(f => f.status === 'nieuw' || f.status === 'verwerkt')
      .reduce((sum, f) => sum + (f.totaal || 0), 0),
    [inkoopfacturen]
  )

  const nettoResultaat = useMemo(
    () => totaleOmzet - totaleInkoopkosten,
    [totaleOmzet, totaleInkoopkosten]
  )

  // === Maandelijks overzicht op basis van facturen + inkoop ===
  const currentYear = new Date().getFullYear()

  const maandData = useMemo(() => {
    return MAAND_LABELS.map((maand, i) => {
      const maandFacturen = facturen.filter((f) => {
        const d = new Date(f.factuurdatum)
        return d.getFullYear() === currentYear && d.getMonth() === i
      })
      const omzet = maandFacturen
        .filter((f) => f.status === 'betaald')
        .reduce((sum, f) => sum + (f.totaal || 0), 0)
      const gefactureerd = maandFacturen
        .filter((f) => f.status !== 'concept' && f.status !== 'gecrediteerd')
        .reduce((sum, f) => sum + (f.totaal || 0), 0)
      const inkoop = inkoopfacturen
        .filter(f => f.status === 'goedgekeurd' && f.factuur_datum)
        .filter(f => {
          const d = new Date(f.factuur_datum!)
          return d.getFullYear() === currentYear && d.getMonth() === i
        })
        .reduce((sum, f) => sum + (f.totaal || 0), 0)
      return { maand, omzet: Math.round(omzet), gefactureerd: Math.round(gefactureerd), inkoop: Math.round(inkoop) }
    })
  }, [facturen, inkoopfacturen, currentYear])

  const pieData = useMemo(() => {
    const betaald = facturen.filter((f) => f.status === 'betaald').reduce((s, f) => s + (f.totaal || 0), 0)
    const openstaand = facturen.filter((f) => f.status === 'verzonden').reduce((s, f) => s + (f.totaal || 0) - (f.betaald_bedrag || 0), 0)
    const vervallen = facturen.filter((f) => f.status === 'vervallen').reduce((s, f) => s + (f.totaal || 0) - (f.betaald_bedrag || 0), 0)
    const concept = facturen.filter((f) => f.status === 'concept').reduce((s, f) => s + (f.totaal || 0), 0)
    return [
      { name: 'Betaald', value: betaald },
      { name: 'Openstaand', value: openstaand },
      { name: 'Vervallen', value: vervallen },
      { name: 'Concept', value: concept },
    ].filter((d) => d.value > 0)
  }, [facturen])

  const statCards = [
    {
      label: 'Gefactureerd',
      value: formatCurrency(gefactureerd),
      sub: `${facturen.filter((f) => f.status !== 'concept' && f.status !== 'gecrediteerd').length} facturen.`,
      dot: '#1A535C',
      pulse: false,
    },
    {
      label: 'Ontvangen',
      value: formatCurrency(totaleOmzet),
      sub: `${facturen.filter((f) => f.status === 'betaald').length} betaald.`,
      dot: '#2D6B48',
      pulse: false,
    },
    {
      label: 'Openstaand',
      value: formatCurrency(openstaandBedrag),
      sub: vervallenFacturen.length > 0
        ? `${vervallenFacturen.length} vervallen.`
        : `${facturen.filter((f) => f.status === 'verzonden').length} wachtend.`,
      dot: vervallenFacturen.length > 0 ? '#F15025' : '#8A7A4A',
      pulse: vervallenFacturen.length > 0,
    },
    {
      label: 'Inkoopkosten',
      value: formatCurrency(totaleInkoopkosten),
      sub: `${inkoopGoedgekeurd.length} goedgekeurd${inkoopOpenstaand > 0 ? ` · ${formatCurrency(inkoopOpenstaand)} open` : ''}`,
      dot: '#C44830',
      pulse: false,
    },
    {
      label: 'Netto resultaat',
      value: formatCurrency(nettoResultaat),
      sub: 'ontvangen min inkoopkosten',
      dot: nettoResultaat >= 0 ? '#2D6B48' : '#C03A18',
      pulse: false,
    },
  ]

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[#1A535C] mb-4" />
        <p className="text-muted-foreground">Financieel laden...</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col -m-3 sm:-m-4 md:-m-6">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-4 py-4 md:px-8 md:py-8 space-y-6">

      {/* Page Header — DOEN inline style */}
      <div className="flex items-baseline gap-4">
        <h1 className="text-[32px] font-extrabold tracking-[-0.5px] text-foreground">
          Financieel<span className="text-[#F15025]">.</span>
        </h1>
        <span
          className="text-[13px] text-muted-foreground"
          style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
        >
          omzet, openstaand, inkoop · {currentYear}
        </span>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="overzicht">Overzicht</TabsTrigger>
          <TabsTrigger value="grootboek">Grootboek</TabsTrigger>
          <TabsTrigger value="btw">BTW Instellingen</TabsTrigger>
          <TabsTrigger value="kortingen">Kortingen</TabsTrigger>
        </TabsList>

        {/* Overzicht Tab */}
        <TabsContent value="overzicht" className="space-y-6">
          {/* Stat tiles — readouts in slate-surface */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {statCards.map((stat) => (
              <div key={stat.label} className="doen-slate-surface rounded-xl px-5 py-4">
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={cn('w-1.5 h-1.5 rounded-full', stat.pulse && 'doen-pulse')}
                      style={{ backgroundColor: stat.dot }}
                    />
                    <span className="font-heading text-[14px] font-bold text-foreground">
                      {stat.label}<span className="text-[#F15025]">.</span>
                    </span>
                  </span>
                </div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-mono font-bold text-[22px] leading-none text-foreground tabular-nums">
                    {stat.value}
                  </span>
                </div>
                <span
                  className="block mt-1 text-[12px] text-muted-foreground truncate"
                  style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
                >
                  · {stat.sub}
                </span>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bar Chart - Monthly Revenue */}
            <Card className="lg:col-span-2 doen-slate-surface border-0 shadow-none">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Maandelijks Overzicht {currentYear}</CardTitle>
              </CardHeader>
              <CardContent>
                {facturen.length === 0 ? (
                  <div className="h-[350px] flex flex-col items-center justify-center gap-4">
                    <p className="text-sm text-muted-foreground">
                      Nog geen facturen. Maak je eerste factuur aan om het overzicht te zien.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/facturen/nieuw')}
                      className="h-9 px-4 text-sm font-semibold text-white rounded-lg transition-colors"
                      style={{ backgroundColor: '#F15025' }}
                    >
                      Eerste factuur maken
                    </button>
                  </div>
                ) : (
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={maandData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="maand"
                        stroke="hsl(var(--border))"
                        tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis
                        stroke="hsl(var(--border))"
                        tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(value) => value >= 1000 ? `€${(value / 1000).toFixed(0)}k` : `€${value}`}
                      />
                      <Tooltip
                        formatter={formatTooltipValue}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                          color: 'hsl(var(--foreground))',
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                        cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                      />
                      <Bar
                        dataKey="gefactureerd"
                        name="Gefactureerd"
                        fill="#1A535C"
                        radius={[4, 4, 0, 0]}
                        opacity={0.3}
                      />
                      <Bar
                        dataKey="omzet"
                        name="Ontvangen"
                        fill="#1A535C"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="inkoop"
                        name="Inkoopkosten"
                        fill="#C44830"
                        radius={[4, 4, 0, 0]}
                        opacity={0.7}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                )}
              </CardContent>
            </Card>

            {/* Pie Chart - Factuur status verdeling */}
            <Card className="doen-slate-surface border-0 shadow-none">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Factuurstatus</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  {pieData.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">Geen factuurdata</p>
                    </div>
                  ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {pieData.map((_entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={formatTooltipValue}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                          color: 'hsl(var(--foreground))',
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value) => (
                          <span className="text-sm text-foreground/70">{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Openstaande Offertes Table */}
          <Card className="doen-slate-surface border-0 shadow-none">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                  <FileText className="w-5 h-5" />
                  Openstaande Offertes
                </CardTitle>
                <Badge variant="secondary" className="bg-[hsl(var(--status-green-bg))] text-[#1A535C]">{openstaandeOffertes.length} open</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {openstaandeOffertes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Geen openstaande offertes
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Nummer</th>
                        <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Klant</th>
                        <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Titel</th>
                        <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Status</th>
                        <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Totaal</th>
                        <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Geldig tot</th>
                      </tr>
                    </thead>
                    <tbody>
                      {openstaandeOffertes.slice(0, 10).map((offerte) => (
                        <tr
                          key={offerte.id}
                          className="border-b border-border hover:bg-background transition-colors"
                        >
                          <td className="py-3 px-4 font-mono text-[12px] text-muted-foreground">
                            {offerte.nummer}
                          </td>
                          <td className="py-3 px-4 font-medium text-[#1A4A52] dark:text-foreground text-[13px]">
                            {offerte.klant_naam}
                          </td>
                          <td className="py-3 px-4 text-foreground/70 text-[13px]">
                            {offerte.titel}
                          </td>
                          <td className="py-3 px-4">
                            <StatusBadge
                              status={offerte.status}
                              label={offerte.status.charAt(0).toUpperCase() + offerte.status.slice(1)}
                            />
                          </td>
                          <td className="py-3 px-4 text-right font-semibold font-mono text-[13px] text-foreground">
                            {formatCurrency(offerte.totaal)}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground text-[13px]">
                            {offerte.geldig_tot ? new Date(offerte.geldig_tot).toLocaleDateString('nl-NL') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {openstaandeOffertes.length > 10 && (
                    <p className="text-center text-[12px] text-muted-foreground py-3">
                      en {openstaandeOffertes.length - 10} meer...
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Grootboek Tab */}
        <TabsContent value="grootboek">
          <GeneralLedgerSettings />
        </TabsContent>

        {/* BTW Tab */}
        <TabsContent value="btw">
          <VATCodesSettings />
        </TabsContent>

        {/* Kortingen Tab */}
        <TabsContent value="kortingen">
          <DiscountsSettings />
        </TabsContent>
      </Tabs>

        </div>
      </div>
    </div>
  )
}
