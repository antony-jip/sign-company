import React from 'react'
import { useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { mockOffertes, mockKlanten, mockOfferteItems } from '@/data/mockData'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import type { Offerte, OfferteItem, Klant } from '@/types'

interface ForgeQuotePreviewProps {
  offerte?: {
    nummer: string
    titel: string
    status: string
    klant_id: string
    geldig_tot: string
    notities: string
    voorwaarden: string
    created_at: string
  }
  items?: {
    beschrijving: string
    aantal: number
    eenheidsprijs: number
    btw_percentage: number
    korting_percentage: number
  }[]
}

function calculateLineTotaal(item: { aantal: number; eenheidsprijs: number; korting_percentage: number }) {
  const bruto = item.aantal * item.eenheidsprijs
  return bruto - bruto * (item.korting_percentage / 100)
}

export function ForgeQuotePreview({ offerte: propOfferte, items: propItems }: ForgeQuotePreviewProps) {
  const { id } = useParams<{ id: string }>()

  // Determine the data source: props or mock data by route param
  let offerteData: typeof propOfferte | undefined = propOfferte
  let itemsData: typeof propItems | undefined = propItems
  let klant: Klant | undefined

  if (!offerteData && id) {
    const found = mockOffertes.find((o) => o.id === id)
    if (found) {
      offerteData = {
        nummer: found.nummer,
        titel: found.titel,
        status: found.status,
        klant_id: found.klant_id,
        geldig_tot: found.geldig_tot,
        notities: found.notities,
        voorwaarden: found.voorwaarden,
        created_at: found.created_at,
      }
      itemsData = mockOfferteItems
        .filter((i) => i.offerte_id === found.id)
        .sort((a, b) => a.volgorde - b.volgorde)
        .map((i) => ({
          beschrijving: i.beschrijving,
          aantal: i.aantal,
          eenheidsprijs: i.eenheidsprijs,
          btw_percentage: i.btw_percentage,
          korting_percentage: i.korting_percentage,
        }))
    }
  }

  if (offerteData) {
    klant = mockKlanten.find((k) => k.id === offerteData!.klant_id)
  }

  if (!offerteData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-400">Offerte niet gevonden.</p>
      </div>
    )
  }

  const items = itemsData || []

  // Calculate totals
  const subtotaal = items.reduce((sum, item) => sum + calculateLineTotaal(item), 0)

  const btwGroups: Record<number, number> = {}
  items.forEach((item) => {
    const lineTotaal = calculateLineTotaal(item)
    const btwBedrag = lineTotaal * (item.btw_percentage / 100)
    btwGroups[item.btw_percentage] = (btwGroups[item.btw_percentage] || 0) + btwBedrag
  })

  const totaalBtw = Object.values(btwGroups).reduce((sum, val) => sum + val, 0)
  const totaal = subtotaal + totaalBtw

  return (
    <div className="max-w-4xl mx-auto">
      {/* A4-like document */}
      <div className="bg-white dark:bg-gray-900 shadow-xl rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="px-10 pt-10 pb-6">
          <div className="flex justify-between items-start">
            {/* Company Logo & Info */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-white font-bold text-2xl">W</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Workmate</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sign Company B.V.</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Industrieweg 42</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">1234 AB Amsterdam</p>
              </div>
            </div>

            {/* Status Badge */}
            {offerteData.status && (
              <Badge className={getStatusColor(offerteData.status)}>
                {offerteData.status.charAt(0).toUpperCase() + offerteData.status.slice(1)}
              </Badge>
            )}
          </div>

          {/* Title */}
          <div className="mt-8 mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              OFFERTE
            </h1>
            <p className="text-lg text-blue-600 dark:text-blue-400 font-semibold mt-1">
              {offerteData.nummer}
            </p>
          </div>

          {/* Client Info & Quote Details */}
          <div className="grid grid-cols-2 gap-8">
            {/* Client */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Klantgegevens
              </h3>
              {klant ? (
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900 dark:text-white">{klant.bedrijfsnaam}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">t.a.v. {klant.contactpersoon}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{klant.adres}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {klant.postcode} {klant.stad}
                  </p>
                  {klant.btw_nummer && (
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                      BTW: {klant.btw_nummer}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Klant niet gevonden</p>
              )}
            </div>

            {/* Quote Details */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Offertegegevens
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Nummer:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{offerteData.nummer}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Datum:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatDate(offerteData.created_at)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Geldig tot:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatDate(offerteData.geldig_tot)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Title Bar */}
        <div className="mx-10 mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {offerteData.titel}
          </h3>
        </div>

        {/* Items Table */}
        <div className="mx-10 mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-300 dark:border-gray-600">
                <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300 w-10">
                  #
                </th>
                <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">
                  Beschrijving
                </th>
                <th className="text-right py-3 px-2 font-semibold text-gray-700 dark:text-gray-300 w-20">
                  Aantal
                </th>
                <th className="text-right py-3 px-2 font-semibold text-gray-700 dark:text-gray-300 w-28">
                  Eenheidsprijs
                </th>
                <th className="text-right py-3 px-2 font-semibold text-gray-700 dark:text-gray-300 w-16">
                  BTW
                </th>
                <th className="text-right py-3 px-2 font-semibold text-gray-700 dark:text-gray-300 w-28">
                  Totaal
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const lineTotaal = calculateLineTotaal(item)
                return (
                  <tr
                    key={index}
                    className={`border-b border-gray-100 dark:border-gray-800 ${
                      index % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-800/20'
                    }`}
                  >
                    <td className="py-3 px-2 text-gray-500 dark:text-gray-400">{index + 1}</td>
                    <td className="py-3 px-2 text-gray-900 dark:text-gray-100">
                      {item.beschrijving}
                      {item.korting_percentage > 0 && (
                        <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                          (-{item.korting_percentage}% korting)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right text-gray-700 dark:text-gray-300">
                      {item.aantal}
                    </td>
                    <td className="py-3 px-2 text-right text-gray-700 dark:text-gray-300">
                      {formatCurrency(item.eenheidsprijs)}
                    </td>
                    <td className="py-3 px-2 text-right text-gray-500 dark:text-gray-400">
                      {item.btw_percentage}%
                    </td>
                    <td className="py-3 px-2 text-right font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(lineTotaal)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mx-10 mb-8 flex justify-end">
          <div className="w-72 space-y-2">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 py-1">
              <span>Subtotaal</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatCurrency(subtotaal)}
              </span>
            </div>

            {Object.entries(btwGroups)
              .sort(([a], [b]) => Number(b) - Number(a))
              .map(([percentage, bedrag]) => (
                <div
                  key={percentage}
                  className="flex justify-between text-sm text-gray-600 dark:text-gray-400 py-1"
                >
                  <span>BTW {percentage}%</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(bedrag)}
                  </span>
                </div>
              ))}

            <div className="border-t-2 border-gray-300 dark:border-gray-600 pt-3 mt-2">
              <div className="flex justify-between">
                <span className="text-lg font-bold text-gray-900 dark:text-white">Totaal</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(totaal)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        <div className="mx-10 pb-10 space-y-6">
          {offerteData.notities && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                Notities
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                {offerteData.notities}
              </p>
            </div>
          )}

          {offerteData.voorwaarden && (
            <div className="bg-gray-50 dark:bg-gray-800/30 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                Voorwaarden
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                {offerteData.voorwaarden}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 text-center">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Sign Company B.V. | KVK: 12345678 | BTW: NL123456789B01 | IBAN: NL00 ABCD 0123 4567 89
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
