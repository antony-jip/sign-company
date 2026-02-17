import React, { useState, useMemo } from 'react'
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
import { mockGrootboek, mockOffertes } from '@/data/mockData'
import { formatCurrency, getStatusColor } from '@/lib/utils'
import { GeneralLedgerSettings } from './GeneralLedgerSettings'
import { VATCodesSettings } from './VATCodesSettings'
import { DiscountsSettings } from './DiscountsSettings'

const maandData = [
  { maand: 'Jan', omzet: 32000, kosten: 18000 },
  { maand: 'Feb', omzet: 28000, kosten: 15000 },
  { maand: 'Mrt', omzet: 45000, kosten: 22000 },
  { maand: 'Apr', omzet: 38000, kosten: 20000 },
  { maand: 'Mei', omzet: 52000, kosten: 25000 },
  { maand: 'Jun', omzet: 41000, kosten: 21000 },
  { maand: 'Jul', omzet: 35000, kosten: 19000 },
  { maand: 'Aug', omzet: 29000, kosten: 16000 },
  { maand: 'Sep', omzet: 48000, kosten: 24000 },
  { maand: 'Okt', omzet: 55000, kosten: 28000 },
  { maand: 'Nov', omzet: 47000, kosten: 23000 },
  { maand: 'Dec', omzet: 42000, kosten: 20000 },
]

const PIE_COLORS = ['#3B82F6', '#EF4444']

function formatTooltipValue(value: number) {
  return formatCurrency(value)
}

export function FinancialLayout() {
  const [activeTab, setActiveTab] = useState('overzicht')

  const totaleOmzet = useMemo(
    () =>
      mockGrootboek
        .filter((g) => g.categorie === 'omzet')
        .reduce((sum, g) => sum + g.saldo, 0),
    []
  )

  const totaleKosten = useMemo(
    () =>
      mockGrootboek
        .filter((g) => g.categorie === 'kosten')
        .reduce((sum, g) => sum + g.saldo, 0),
    []
  )

  const winst = totaleOmzet - totaleKosten

  const openstaandeOffertes = useMemo(
    () =>
      mockOffertes.filter(
        (o) => o.status === 'verzonden' || o.status === 'bekeken' || o.status === 'concept'
      ),
    []
  )

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
      color: winst >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400',
      bg: winst >= 0 ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-red-50 dark:bg-red-900/30',
    },
    {
      label: 'Openstaande Offertes',
      value: String(openstaandeOffertes.length),
      icon: Receipt,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-900/30',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
          <PiggyBank className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Financieel Overzicht
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Beheer uw financi&euml;le administratie en instellingen
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
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
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          {stat.label}
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
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
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={maandData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                      <XAxis
                        dataKey="maand"
                        tick={{ fontSize: 12 }}
                        className="text-gray-600 dark:text-gray-400"
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                        className="text-gray-600 dark:text-gray-400"
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
                          <span className="text-sm text-gray-700 dark:text-gray-300">
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
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                  Geen openstaande offertes
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                          Nummer
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                          Klant
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                          Titel
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                          Status
                        </th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                          Totaal
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                          Geldig tot
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {openstaandeOffertes.map((offerte) => (
                        <tr
                          key={offerte.id}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <td className="py-3 px-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                            {offerte.nummer}
                          </td>
                          <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                            {offerte.klant_naam}
                          </td>
                          <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                            {offerte.titel}
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={getStatusColor(offerte.status)}>
                              {offerte.status.charAt(0).toUpperCase() + offerte.status.slice(1)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(offerte.totaal)}
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
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
