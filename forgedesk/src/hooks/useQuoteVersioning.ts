import { useState } from 'react'
import { toast } from 'sonner'
import { createOfferteVersie, getOfferteVersies, updateOfferte } from '@/services/supabaseService'
import { logger } from '@/utils/logger'
import type { QuoteLineItem } from '@/components/quotes/QuoteItemsTable'

interface VersioningDeps {
  userId: string | undefined
  quoteId: string | null
  performAutoSave: () => Promise<void>
  snapshotData: {
    offerteTitel: string
    items: QuoteLineItem[]
    notities: string
    voorwaarden: string
    introTekst: string
    outroTekst: string
    geldigTot: string
  }
  restoreSnapshot: (snapshot: {
    offerteTitel: string
    items: QuoteLineItem[]
    notities: string
    voorwaarden: string
    introTekst: string
    outroTekst: string
    geldigTot: string
  }) => void
}

export function useQuoteVersioning(deps: VersioningDeps) {
  const [versieNummer, setVersieNummer] = useState(1)
  const [isSavingVersie, setIsSavingVersie] = useState(false)
  const [versieHistorie, setVersieHistorie] = useState<Array<{ id: string; versie_nummer: number; notitie?: string; created_at: string }>>([])
  const [showVersieHistorie, setShowVersieHistorie] = useState(false)

  const handleNieuweVersie = async () => {
    if (!deps.userId) return
    const quoteId = deps.quoteId
    if (!quoteId) {
      toast.error('Sla de offerte eerst op')
      return
    }
    setIsSavingVersie(true)
    try {
      await deps.performAutoSave()

      const snapshot = JSON.stringify(deps.snapshotData)
      await createOfferteVersie({
        user_id: deps.userId,
        offerte_id: quoteId,
        versie_nummer: versieNummer,
        snapshot,
      })

      const newVersie = versieNummer + 1
      setVersieNummer(newVersie)

      await updateOfferte(quoteId, { versie: newVersie })

      const versies = await getOfferteVersies(quoteId)
      setVersieHistorie(versies.map(v => ({ id: v.id, versie_nummer: v.versie_nummer, notitie: v.notitie, created_at: v.created_at })))

      toast.success(`Versie ${versieNummer} opgeslagen, nu op v${newVersie}`)
    } catch (err) {
      logger.error('Nieuwe versie opslaan failed:', err)
      toast.error('Kon versie niet opslaan')
    } finally {
      setIsSavingVersie(false)
    }
  }

  const handleHerstelVersie = async (versieId: string) => {
    const quoteId = deps.quoteId
    if (!quoteId) return
    try {
      const versies = await getOfferteVersies(quoteId)
      const versie = versies.find(v => v.id === versieId)
      if (!versie) return
      const snapshot = JSON.parse(versie.snapshot) as {
        offerteTitel: string
        items: QuoteLineItem[]
        notities: string
        voorwaarden: string
        introTekst: string
        outroTekst: string
        geldigTot: string
      }
      deps.restoreSnapshot(snapshot)
      toast.success(`Versie ${versie.versie_nummer} hersteld`)
      setShowVersieHistorie(false)
    } catch (err) {
      logger.error('Herstel versie failed:', err)
      toast.error('Kon versie niet herstellen')
    }
  }

  return {
    versieNummer,
    setVersieNummer,
    isSavingVersie,
    versieHistorie,
    setVersieHistorie,
    showVersieHistorie,
    setShowVersieHistorie,
    handleNieuweVersie,
    handleHerstelVersie,
  }
}
