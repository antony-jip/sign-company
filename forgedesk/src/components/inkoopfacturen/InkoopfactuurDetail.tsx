import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Plus, Trash2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import {
  getInkoopfactuur,
  updateInkoopfactuurVelden,
  updateInkoopfactuurRegels,
  approveInkoopfactuur,
  rejectInkoopfactuur,
  extractInkoopfactuur,
} from '@/services/inkoopfactuurService'
import { supabase } from '@/services/supabaseClient'
import type { InkoopFactuur, InkoopFactuurRegel } from '@/types'

function createEmptyRegel(): Omit<InkoopFactuurRegel, 'id' | 'inkoopfactuur_id' | 'created_at'> {
  return { volgorde: 0, omschrijving: '', aantal: 1, eenheidsprijs: 0, btw_tarief: 21, regel_totaal: 0 }
}

export function InkoopfactuurDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [factuur, setFactuur] = useState<InkoopFactuur | null>(null)
  const [regels, setRegels] = useState<Omit<InkoopFactuurRegel, 'id' | 'inkoopfactuur_id' | 'created_at'>[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [afwijsReden, setAfwijsReden] = useState('')
  const [showAfwijsModal, setShowAfwijsModal] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      try {
        setIsLoading(true)
        const factuurId = id as string
        const result = await getInkoopfactuur(factuurId)
        if (cancelled || !result) {
          if (!cancelled) navigate('/inkoopfacturen')
          return
        }
        setFactuur(result.factuur)
        setRegels(result.regels.map(r => ({
          volgorde: r.volgorde,
          omschrijving: r.omschrijving,
          aantal: r.aantal,
          eenheidsprijs: r.eenheidsprijs,
          btw_tarief: r.btw_tarief,
          regel_totaal: r.regel_totaal,
        })))

        if (supabase && result.factuur.pdf_storage_path) {
          const { data } = await supabase.storage
            .from('inkoopfacturen')
            .createSignedUrl(result.factuur.pdf_storage_path, 3600)
          if (data?.signedUrl) setPdfUrl(data.signedUrl)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id, navigate])

  function updateField<K extends keyof InkoopFactuur>(field: K, value: InkoopFactuur[K]) {
    if (!factuur) return
    setFactuur({ ...factuur, [field]: value })
  }

  function updateRegel(index: number, field: string, value: unknown) {
    const updated = [...regels]
    updated[index] = { ...updated[index], [field]: value }
    if (field === 'aantal' || field === 'eenheidsprijs') {
      updated[index].regel_totaal = (updated[index].aantal || 0) * (updated[index].eenheidsprijs || 0)
    }
    setRegels(updated)
  }

  function addRegel() {
    setRegels([...regels, { ...createEmptyRegel(), volgorde: regels.length }])
  }

  function removeRegel(index: number) {
    setRegels(regels.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (!factuur || !id) return
    try {
      setIsSaving(true)
      await Promise.all([
        updateInkoopfactuurVelden(id, {
          leverancier_naam: factuur.leverancier_naam,
          factuur_nummer: factuur.factuur_nummer,
          factuur_datum: factuur.factuur_datum,
          vervaldatum: factuur.vervaldatum,
          subtotaal: factuur.subtotaal,
          btw_bedrag: factuur.btw_bedrag,
          totaal: factuur.totaal,
          valuta: factuur.valuta,
        }),
        updateInkoopfactuurRegels(id, regels),
      ])
      toast.success('Wijzigingen opgeslagen')
    } catch (err) {
      toast.error('Opslaan mislukt')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleExtract() {
    if (!id) return
    try {
      setIsExtracting(true)
      const result = await extractInkoopfactuur(id)
      if (result.success) {
        toast.success('Factuur geextraheerd')
        const updated = await getInkoopfactuur(id)
        if (updated) {
          setFactuur(updated.factuur)
          setRegels(updated.regels.map(r => ({
            volgorde: r.volgorde, omschrijving: r.omschrijving, aantal: r.aantal,
            eenheidsprijs: r.eenheidsprijs, btw_tarief: r.btw_tarief, regel_totaal: r.regel_totaal,
          })))
        }
      } else {
        toast.error(result.error || 'Extractie mislukt')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Extractie mislukt')
    } finally {
      setIsExtracting(false)
    }
  }

  async function handleApprove() {
    if (!factuur || !id || !user?.id) return
    try {
      setIsSaving(true)
      const updated = await approveInkoopfactuur(id, user.id)
      setFactuur(updated)
      toast.success('Inkoopfactuur goedgekeurd en toegevoegd aan uitgaven')
    } catch (err) {
      toast.error('Goedkeuren mislukt')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleReject() {
    if (!id || !afwijsReden.trim()) return
    try {
      setIsSaving(true)
      const updated = await rejectInkoopfactuur(id, afwijsReden)
      setFactuur(updated)
      setShowAfwijsModal(false)
      toast.success('Inkoopfactuur afgewezen')
    } catch (err) {
      toast.error('Afwijzen mislukt')
    } finally {
      setIsSaving(false)
    }
  }


  if (isLoading || !factuur) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C44830]" />
      </div>
    )
  }

  const vertrouwenKleur = factuur.extractie_vertrouwen === 'hoog' ? '#2D6B48'
    : factuur.extractie_vertrouwen === 'midden' ? '#D4621A' : '#C03A18'

  const isAfgerond = factuur.status === 'goedgekeurd' || factuur.status === 'afgewezen'

  return (
    <div className="p-3 sm:p-4 md:p-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/inkoopfacturen')} className="text-[#9B9B95] hover:text-[#4A4A46]">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold tracking-[-0.3px]">
          {factuur.leverancier_naam || 'Nieuwe factuur'}<span className="text-[#F15025]">.</span>
        </h1>
        {factuur.extractie_vertrouwen && (
          <span className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: vertrouwenKleur }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: vertrouwenKleur }} />
            {factuur.extractie_vertrouwen} vertrouwen
          </span>
        )}
      </div>

      {/* 50/50 split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PDF viewer */}
        <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.03] overflow-hidden">
          {pdfUrl ? (
            <iframe src={pdfUrl} className="w-full h-[700px]" title="PDF preview" />
          ) : (
            <div className="flex items-center justify-center h-[700px] text-[13px] text-[#9B9B95]">
              PDF niet beschikbaar
            </div>
          )}
        </div>

        {/* Form */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.03] p-5 space-y-4">
            {factuur.extractie_opmerkingen && (
              <div className="text-[12px] p-3 rounded-lg bg-[#FFF8E1] text-[#8B6914] border border-[#FFE082]">
                {factuur.extractie_opmerkingen}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[11px]">Leverancier</Label>
                <Input value={factuur.leverancier_naam} onChange={e => updateField('leverancier_naam', e.target.value)} disabled={isAfgerond} />
              </div>
              <div>
                <Label className="text-[11px]">Factuurnummer</Label>
                <Input value={factuur.factuur_nummer || ''} onChange={e => updateField('factuur_nummer', e.target.value)} disabled={isAfgerond} />
              </div>
              <div>
                <Label className="text-[11px]">Factuurdatum</Label>
                <Input type="date" value={factuur.factuur_datum || ''} onChange={e => updateField('factuur_datum', e.target.value)} disabled={isAfgerond} />
              </div>
              <div>
                <Label className="text-[11px]">Vervaldatum</Label>
                <Input type="date" value={factuur.vervaldatum || ''} onChange={e => updateField('vervaldatum', e.target.value)} disabled={isAfgerond} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-[11px]">Subtotaal</Label>
                <Input type="number" step="0.01" value={factuur.subtotaal} onChange={e => updateField('subtotaal', parseFloat(e.target.value) || 0)} disabled={isAfgerond} style={{ fontFamily: "'DM Mono', monospace" }} />
              </div>
              <div>
                <Label className="text-[11px]">BTW</Label>
                <Input type="number" step="0.01" value={factuur.btw_bedrag} onChange={e => updateField('btw_bedrag', parseFloat(e.target.value) || 0)} disabled={isAfgerond} style={{ fontFamily: "'DM Mono', monospace" }} />
              </div>
              <div>
                <Label className="text-[11px]">Totaal</Label>
                <Input type="number" step="0.01" value={factuur.totaal} onChange={e => updateField('totaal', parseFloat(e.target.value) || 0)} disabled={isAfgerond} style={{ fontFamily: "'DM Mono', monospace" }} />
              </div>
            </div>

            {/* Extraheer knop voor nieuw status */}
            {factuur.status === 'nieuw' && (
              <button
                onClick={handleExtract}
                disabled={isExtracting}
                className="inline-flex items-center gap-2 w-full justify-center py-2.5 rounded-xl text-[13px] font-semibold bg-[#C44830] text-white hover:bg-[#A33A26] disabled:opacity-50 transition-all"
              >
                <Sparkles className={`w-4 h-4 ${isExtracting ? 'animate-spin' : ''}`} />
                {isExtracting ? 'Extraheren...' : 'AI Extractie starten'}
              </button>
            )}
          </div>

          {/* Regels */}
          <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.03] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-semibold">Regels</h3>
              {!isAfgerond && (
                <button onClick={addRegel} className="text-[12px] text-[#C44830] hover:underline flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Regel
                </button>
              )}
            </div>
            {regels.length === 0 ? (
              <p className="text-[12px] text-[#9B9B95]">Geen regels geextraheerd</p>
            ) : (
              <div className="space-y-2">
                {regels.map((regel, i) => (
                  <div key={i} className="grid grid-cols-[1fr_60px_80px_60px_80px_28px] gap-2 items-center">
                    <Input
                      placeholder="Omschrijving"
                      value={regel.omschrijving}
                      onChange={e => updateRegel(i, 'omschrijving', e.target.value)}
                      disabled={isAfgerond}
                      className="text-[12px]"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={regel.aantal}
                      onChange={e => updateRegel(i, 'aantal', parseFloat(e.target.value) || 0)}
                      disabled={isAfgerond}
                      className="text-[12px]"
                      style={{ fontFamily: "'DM Mono', monospace" }}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={regel.eenheidsprijs}
                      onChange={e => updateRegel(i, 'eenheidsprijs', parseFloat(e.target.value) || 0)}
                      disabled={isAfgerond}
                      className="text-[12px]"
                      style={{ fontFamily: "'DM Mono', monospace" }}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={regel.btw_tarief}
                      onChange={e => updateRegel(i, 'btw_tarief', parseFloat(e.target.value) || 0)}
                      disabled={isAfgerond}
                      className="text-[12px]"
                      style={{ fontFamily: "'DM Mono', monospace" }}
                    />
                    <span className="text-[12px] text-right" style={{ fontFamily: "'DM Mono', monospace" }}>
                      {new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(regel.regel_totaal)}
                    </span>
                    {!isAfgerond && (
                      <button onClick={() => removeRegel(i)} className="text-[#9B9B95] hover:text-[#C03A18]">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          {!isAfgerond && (
            <div className="flex items-center gap-3 justify-end">
              <Button variant="outline" onClick={handleSave} disabled={isSaving}>
                Opslaan
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAfwijsModal(true)}
                disabled={isSaving}
                className="text-[#C03A18] border-[#C03A18] hover:bg-[#FDE8E2]"
              >
                Afwijzen
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isSaving}
                className="bg-[#C44830] hover:bg-[#A33A26] text-white"
              >
                Goedkeuren
              </Button>
            </div>
          )}

          {factuur.status === 'goedgekeurd' && (
            <div className="text-[12px] text-[#2D6B48] bg-[#E4F0EA] px-4 py-3 rounded-lg">
              Goedgekeurd op {factuur.goedgekeurd_op ? new Date(factuur.goedgekeurd_op).toLocaleDateString('nl-NL') : '-'}. Toegevoegd aan uitgaven.
            </div>
          )}
          {factuur.status === 'afgewezen' && (
            <div className="text-[12px] text-[#5A5A55] bg-[#EEEEED] px-4 py-3 rounded-lg">
              Afgewezen: {factuur.afgewezen_reden || '-'}
            </div>
          )}
        </div>
      </div>

      {/* Afwijs modal */}
      {showAfwijsModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowAfwijsModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-[14px] font-semibold mb-3">Factuur afwijzen</h3>
            <Textarea
              placeholder="Reden voor afwijzing..."
              value={afwijsReden}
              onChange={e => setAfwijsReden(e.target.value)}
              rows={3}
              className="mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAfwijsModal(false)}>Annuleren</Button>
              <Button
                onClick={handleReject}
                disabled={!afwijsReden.trim() || isSaving}
                className="bg-[#C03A18] hover:bg-[#A02E12] text-white"
              >
                Afwijzen
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
