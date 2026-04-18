import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
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
import { formatCurrency, getStatusColor } from '@/lib/utils'
import { GeneralLedgerSettings } from './GeneralLedgerSettings'
import { VATCodesSettings } from './VATCodesSettings'
import { DiscountsSettings } from './DiscountsSettings'

const MAAND_LABELS = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']

const PIE_COLORS = ['#1A535C', '#F15025', '#E8B931', '#9B9B95']

function formatTooltipValue(value: number) {
  return formatCurrency(value)
}

export function FinancialLayout() {
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
      sub: `${facturen.filter((f) => f.status !== 'concept' && f.status !== 'gecrediteerd').length} facturen`,
      icon: TrendingUp,
      color: 'text-[#1A535C]',
      bg: 'bg-[#E2F0F0]',
    },
    {
      label: 'Ontvangen',
      value: formatCurrency(totaleOmzet),
      sub: `${facturen.filter((f) => f.status === 'betaald').length} betaald`,
      icon: Euro,
      color: 'text-[#2D6B48]',
      bg: 'bg-[#E4F0EA]',
    },
    {
      label: 'Openstaand',
      value: formatCurrency(openstaandBedrag),
      sub: vervallenFacturen.length > 0
        ? `${vervallenFacturen.length} vervallen`
        : `${facturen.filter((f) => f.status === 'verzonden').length} wachtend`,
      icon: Clock,
      color: vervallenFacturen.length > 0 ? 'text-[#C03A18]' : 'text-[#8A7A4A]',
      bg: vervallenFacturen.length > 0 ? 'bg-[#FDE8E2]' : 'bg-[#F5F2E8]',
    },
    {
      label: 'Inkoopkosten',
      value: formatCurrency(totaleInkoopkosten),
      sub: `${inkoopGoedgekeurd.length} goedgekeurd${inkoopOpenstaand > 0 ? ` · ${formatCurrency(inkoopOpenstaand)} open` : ''}`,
      icon: TrendingDown,
      color: 'text-[#C44830]',
      bg: 'bg-[#FDE8E2]',
    },
    {
      label: 'Netto resultaat',
      value: formatCurrency(nettoResultaat),
      sub: 'ontvangen - inkoopkosten',
      icon: PiggyBank,
      color: nettoResultaat >= 0 ? 'text-[#2D6B48]' : 'text-[#C03A18]',
      bg: nettoResultaat >= 0 ? 'bg-[#E4F0EA]' : 'bg-[#FDE8E2]',
    },
  ]

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[#1A535C] mb-4" />
        <p className="text-[#9B9B95]">Financieel laden...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 mod-strip mod-strip-financieel">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[#1A535C]/10 rounded-lg flex-shrink-0">
          <PiggyBank className="w-6 h-6 text-[#1A535C]" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-[#1A1A1A] tracking-[-0.3px]">
            Financieel<span className="text-[#F15025]">.</span>
          </h1>
          <p className="text-sm text-[#9B9B95]">
            Overzicht van facturen, omzet en openstaande posten
          </p>
        </div>
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
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat) => {
              const Icon = stat.icon
              return (
                <Card key={stat.label} className="shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-[13px] font-medium text-[#9B9B95]">
                          {stat.label}
                        </p>
                        <p className="text-2xl font-bold font-mono text-[#1A1A1A]">
                          {stat.value}
                        </p>
                        <p className="text-[11px] text-[#B0ADA8]">{stat.sub}</p>
                      </div>
                      <div className={`p-3 rounded-lg ${stat.bg}`}>
                        <Icon className={`w-5 h-5 ${stat.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bar Chart - Monthly Revenue */}
            <Card className="lg:col-span-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <CardHeader>
                <CardTitle className="text-lg text-[#1A1A1A]">Maandelijks Overzicht {currentYear}</CardTitle>
              </CardHeader>
              <CardContent>
                {facturen.length === 0 ? (
                  <div className="h-[350px] flex items-center justify-center">
                    <p className="text-sm text-[#9B9B95]">
                      Nog geen facturen — maak je eerste factuur aan om het overzicht te zien
                    </p>
                  </div>
                ) : (
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={maandData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0EFEC" />
                      <XAxis
                        dataKey="maand"
                        tick={{ fontSize: 12, fill: '#9B9B95' }}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: '#9B9B95' }}
                        tickFormatter={(value) => value >= 1000 ? `€${(value / 1000).toFixed(0)}k` : `€${value}`}
                      />
                      <Tooltip formatter={formatTooltipValue} />
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
            <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <CardHeader>
                <CardTitle className="text-lg text-[#1A1A1A]">Factuurstatus</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  {pieData.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-sm text-[#9B9B95]">Geen factuurdata</p>
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
                      <Tooltip formatter={formatTooltipValue} />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value) => (
                          <span className="text-sm text-[#6B6B66]">{value}</span>
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
          <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2 text-[#1A1A1A]">
                  <FileText className="w-5 h-5" />
                  Openstaande Offertes
                </CardTitle>
                <Badge variant="secondary" className="bg-[#E2F0F0] text-[#1A535C]">{openstaandeOffertes.length} open</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {openstaandeOffertes.length === 0 ? (
                <p className="text-sm text-[#9B9B95] text-center py-8">
                  Geen openstaande offertes
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-[#F0EFEC]">
                        <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95]">Nummer</th>
                        <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95]">Klant</th>
                        <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95]">Titel</th>
                        <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95]">Status</th>
                        <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95]">Totaal</th>
                        <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95]">Geldig tot</th>
                      </tr>
                    </thead>
                    <tbody>
                      {openstaandeOffertes.slice(0, 10).map((offerte) => (
                        <tr
                          key={offerte.id}
                          className="border-b border-[#F0EFEC] hover:bg-[#F8F7F4] transition-colors"
                        >
                          <td className="py-3 px-4 font-mono text-[12px] text-[#9B9B95]">
                            {offerte.nummer}
                          </td>
                          <td className="py-3 px-4 font-medium text-[#1A1A1A] text-[13px]">
                            {offerte.klant_naam}
                          </td>
                          <td className="py-3 px-4 text-[#6B6B66] text-[13px]">
                            {offerte.titel}
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={getStatusColor(offerte.status)}>
                              {offerte.status.charAt(0).toUpperCase() + offerte.status.slice(1)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold font-mono text-[13px] text-[#1A1A1A]">
                            {formatCurrency(offerte.totaal)}
                          </td>
                          <td className="py-3 px-4 text-[#9B9B95] text-[13px]">
                            {offerte.geldig_tot ? new Date(offerte.geldig_tot).toLocaleDateString('nl-NL') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {openstaandeOffertes.length > 10 && (
                    <p className="text-center text-[12px] text-[#9B9B95] py-3">
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
  )
}
