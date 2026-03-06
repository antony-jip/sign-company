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
import { getGrootboek, getOffertes } from '@/services/supabaseService'
import type { Grootboek, Offerte } from '@/types'
import { formatCurrency, getStatusColor } from '@/lib/utils'
import { GeneralLedgerSettings } from './GeneralLedgerSettings'
import { VATCodesSettings } from './VATCodesSettings'
import { DiscountsSettings } from './DiscountsSettings'

const MAAND_LABELS = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']

const PIE_COLORS = ['#3B82F6', '#EF4444']

function formatTooltipValue(value: number) {
  return formatCurrency(value)
}

export function FinancialLayout() {
  const [activeTab, setActiveTab] = useState('overzicht')
  const [grootboek, setGrootboek] = useState<Grootboek[]>([])
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([getGrootboek(), getOffertes()]).then(([gb, off]) => {
      setGrootboek(gb)
      setOffertes(off)
      setIsLoading(false)
    })
  }, [])

  const totaleOmzet = useMemo(
    () =>
      grootboek
        .filter((g) => g.categorie === 'omzet')
        .reduce((sum, g) => sum + g.saldo, 0),
    [grootboek]
  )

  const totaleKosten = useMemo(
    () =>
      grootboek
        .filter((g) => g.categorie === 'kosten')
        .reduce((sum, g) => sum + g.saldo, 0),
    [grootboek]
  )

  const winst = totaleOmzet - totaleKosten

  const openstaandeOffertes = useMemo(
    () =>
      offertes.filter(
        (o) => o.status === 'verzonden' || o.status === 'bekeken' || o.status === 'concept'
      ),
    [offertes]
  )

  // Distribute grootboek saldo evenly across months for chart display
  const maandData = useMemo(() => {
    if (grootboek.length === 0) return []
    const omzetPerMaand = totaleOmzet / 12
    const kostenPerMaand = totaleKosten / 12
    return MAAND_LABELS.map((maand) => ({
      maand,
      omzet: Math.round(omzetPerMaand),
      kosten: Math.round(kostenPerMaand),
    }))
  }, [grootboek, totaleOmzet, totaleKosten])

  const pieData = [
    { name: 'Inkomsten', value: totaleOmzet },
    { name: 'Uitgaven', value: totaleKosten },
  ]

  const statCards = [
    {
      label: 'Totale Omzet',
      value: formatCurrency(totaleOmzet),
      icon: TrendingUp,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/30',
    },
    {
      label: 'Totale Kosten',
      value: formatCurrency(totaleKosten),
      icon: TrendingDown,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-900/30',
    },
    {
      label: 'Winst',
      value: formatCurrency(winst),
      icon: Euro,
      color: winst >= 0 ? 'text-accent dark:text-primary' : 'text-red-600 dark:text-red-400',
      bg: winst >= 0 ? 'bg-primary/10 dark:bg-primary/20' : 'bg-red-50 dark:bg-red-900/30',
    },
    {
      label: 'Openstaande Offertes',
      value: String(openstaandeOffertes.length),
      icon: Receipt,
      color: 'text-accent dark:text-wm-light',
      bg: 'bg-wm-pale/20 dark:bg-accent/30',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg flex-shrink-0">
          <PiggyBank className="w-6 h-6 text-accent dark:text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground dark:text-white font-display truncate">
            Financieel Overzicht
          </h1>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground/60 truncate">
            Beheer uw financi&euml;le administratie en instellingen
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
                <Card key={stat.label}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground/60">
                          {stat.label}
                        </p>
                        <p className="text-2xl font-bold text-foreground dark:text-white">
                          {stat.value}
                        </p>
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
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Maandelijks Overzicht</CardTitle>
              </CardHeader>
              <CardContent>
                {maandData.length === 0 ? (
                  <div className="h-[350px] flex items-center justify-center">
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground/60">
                      Voeg grootboekrekeningen toe om het overzicht te zien
                    </p>
                  </div>
                ) : (
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={maandData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border dark:stroke-border" />
                      <XAxis
                        dataKey="maand"
                        tick={{ fontSize: 12 }}
                        className="text-muted-foreground dark:text-muted-foreground/60"
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                        className="text-muted-foreground dark:text-muted-foreground/60"
                      />
                      <Tooltip
                        formatter={formatTooltipValue}
                        contentStyle={{
                          backgroundColor: 'var(--color-background, #fff)',
                          border: '1px solid var(--color-border, #e5e7eb)',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        }}
                      />
                      <Bar
                        dataKey="omzet"
                        name="Omzet"
                        fill="#3B82F6"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="kosten"
                        name="Kosten"
                        fill="#EF4444"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                )}
              </CardContent>
            </Card>

            {/* Pie Chart - Income vs Expenses */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Inkomsten vs Uitgaven</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
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
                          <span className="text-sm text-foreground/70 dark:text-muted-foreground/50">
                            {value}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent / Open Offertes Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Openstaande Offertes
                </CardTitle>
                <Badge variant="secondary">{openstaandeOffertes.length} open</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {openstaandeOffertes.length === 0 ? (
                <p className="text-sm text-muted-foreground dark:text-muted-foreground/60 text-center py-8">
                  Geen openstaande offertes
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border dark:border-border">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground dark:text-muted-foreground/60">
                          Nummer
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground dark:text-muted-foreground/60">
                          Klant
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground dark:text-muted-foreground/60">
                          Titel
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground dark:text-muted-foreground/60">
                          Status
                        </th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground dark:text-muted-foreground/60">
                          Totaal
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground dark:text-muted-foreground/60">
                          Geldig tot
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {openstaandeOffertes.map((offerte) => (
                        <tr
                          key={offerte.id}
                          className="border-b border-border dark:border-border hover:bg-background dark:hover:bg-foreground/80/50 transition-colors"
                        >
                          <td className="py-3 px-4 font-mono text-xs text-muted-foreground dark:text-muted-foreground/60">
                            {offerte.nummer}
                          </td>
                          <td className="py-3 px-4 font-medium text-foreground dark:text-white">
                            {offerte.klant_naam}
                          </td>
                          <td className="py-3 px-4 text-foreground/70 dark:text-muted-foreground/50">
                            {offerte.titel}
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={getStatusColor(offerte.status)}>
                              {offerte.status.charAt(0).toUpperCase() + offerte.status.slice(1)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-foreground dark:text-white">
                            {formatCurrency(offerte.totaal)}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground dark:text-muted-foreground/60">
                            {new Date(offerte.geldig_tot).toLocaleDateString('nl-NL')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
