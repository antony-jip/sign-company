import React, { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Upload, FileText, CheckCircle2, AlertTriangle, Loader2, X } from 'lucide-react'
import { parseCSV } from '@/services/importService'
import { getKlanten, createKlant, createProject } from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import type { Klant } from '@/types'

interface ParsedProject {
  jamesId: string
  naam: string
  bedrijfsnaam: string
  budget: number
  datumAangemaakt: string
  deadline: string
  pm: string
  tags: string
  selected: boolean
  klantMatch: Klant | null
  isDuplicaat: boolean
}

interface ImportResultaat {
  projecten: number
  nieuweKlanten: number
  fouten: string[]
}

type Stap = 'upload' | 'preview' | 'importing' | 'resultaat'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete: () => void
}

export function ProjectImportDialog({ open, onOpenChange, onImportComplete }: Props) {
  const { user } = useAuth()
  const [stap, setStap] = useState<Stap>('upload')
  const [projecten, setProjecten] = useState<ParsedProject[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const [resultaat, setResultaat] = useState<ImportResultaat | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const reset = useCallback(() => {
    setStap('upload')
    setProjecten([])
    setParseError(null)
    setImportProgress({ current: 0, total: 0 })
    setResultaat(null)
  }, [])

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) reset()
    onOpenChange(open)
  }, [onOpenChange, reset])

  // ── CSV Parsing ──
  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setParseError('Alleen CSV bestanden worden ondersteund.')
      return
    }
    setParseError(null)

    try {
      const { headers, rows } = await parseCSV(file)

      if (rows.length === 0) {
        setParseError('CSV bevat geen data rijen.')
        return
      }

      // Check required columns
      const lowerHeaders = headers.map(h => h.toLowerCase())
      if (!lowerHeaders.includes('name') && !lowerHeaders.includes('naam')) {
        setParseError('Kolom "name" ontbreekt in de CSV.')
        return
      }

      // Load existing klanten for matching
      const bestaandeKlanten = await getKlanten()

      // Load existing projecten for duplicate detection
      const { getProjecten } = await import('@/services/supabaseService')
      const bestaandeProjecten = await getProjecten()

      // Parse rows
      const parsed: ParsedProject[] = rows
        .filter(row => {
          const naam = row.name || row.naam || ''
          return naam.trim() !== ''
        })
        .map(row => {
          const bedrijfsnaam = (row.company || row.bedrijfsnaam || '').trim()
          const naam = (row.name || row.naam || '').trim()
          const budgetStr = row.value || row.budget || '0'
          const budget = parseFloat(budgetStr.replace(/[^0-9.,\-]/g, '').replace(',', '.')) || 0

          // Match klant (case-insensitive, trimmed)
          const klantMatch = bedrijfsnaam
            ? bestaandeKlanten.find(k =>
                k.bedrijfsnaam.trim().toLowerCase() === bedrijfsnaam.toLowerCase()
              ) || null
            : null

          // Duplicate detection: same naam + same klant
          const isDuplicaat = bestaandeProjecten.some(p =>
            p.naam.trim().toLowerCase() === naam.toLowerCase() &&
            klantMatch && p.klant_id === klantMatch.id
          )

          return {
            jamesId: (row.id || '').trim(),
            naam,
            bedrijfsnaam,
            budget,
            datumAangemaakt: (row.date_created || row.datum || '').trim(),
            deadline: (row.deadline || '').trim(),
            pm: (row.pm || row.projectmanager || '').trim(),
            tags: (row.tags || '').trim(),
            selected: true,
            klantMatch,
            isDuplicaat,
          }
        })

      if (parsed.length === 0) {
        setParseError('Geen geldige projecten gevonden in de CSV.')
        return
      }

      setProjecten(parsed)
      setStap('preview')
    } catch {
      setParseError('CSV kon niet worden gelezen. Controleer het bestandsformaat.')
    }
  }, [])

  // ── Import Logic ──
  const handleImport = useCallback(async () => {
    if (!user?.id) return

    const selected = projecten.filter(p => p.selected)
    if (selected.length === 0) return

    setStap('importing')
    setImportProgress({ current: 0, total: selected.length })

    const result: ImportResultaat = { projecten: 0, nieuweKlanten: 0, fouten: [] }
    const klantCache = new Map<string, string>() // bedrijfsnaam → klant_id

    // Pre-fill cache with matched klanten
    for (const p of selected) {
      if (p.klantMatch) {
        klantCache.set(p.bedrijfsnaam.toLowerCase(), p.klantMatch.id)
      }
    }

    for (let i = 0; i < selected.length; i++) {
      const p = selected[i]
      setImportProgress({ current: i + 1, total: selected.length })

      try {
        // 1. Klant opzoeken of aanmaken
        let klantId = klantCache.get(p.bedrijfsnaam.toLowerCase())

        if (!klantId && p.bedrijfsnaam) {
          // Maak nieuwe klant aan
          const nieuweKlant = await createKlant({
            bedrijfsnaam: p.bedrijfsnaam,
            contactpersoon: '',
            email: '',
            telefoon: '',
            adres: '',
            postcode: '',
            stad: '',
            land: 'Nederland',
            website: '',
            kvk_nummer: '',
            btw_nummer: '',
            status: 'actief',
            tags: [],
            notities: '',
            contactpersonen: [],
            import_bron: 'james_pro_import',
          } as Omit<Klant, 'id' | 'created_at' | 'updated_at'>)
          klantId = nieuweKlant.id
          klantCache.set(p.bedrijfsnaam.toLowerCase(), klantId)
          result.nieuweKlanten++
        }

        if (!klantId) {
          result.fouten.push(`"${p.naam}": geen klant opgegeven`)
          continue
        }

        // 2. Notities samenstellen
        const notitieRegels = [`Geïmporteerd uit James PRO`]
        if (p.jamesId) notitieRegels.push(`James PRO #${p.jamesId}`)
        if (p.pm) notitieRegels.push(`PM: ${p.pm}`)

        // 3. Project aanmaken
        await createProject({
          klant_id: klantId,
          naam: p.naam,
          beschrijving: '',
          status: 'actief',
          prioriteit: 'medium',
          budget: p.budget,
          besteed: 0,
          voortgang: 0,
          team_leden: [],
          ...(p.datumAangemaakt ? { start_datum: p.datumAangemaakt } : {}),
          ...(p.deadline ? { eind_datum: p.deadline } : {}),
        } as Parameters<typeof createProject>[0])

        result.projecten++
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Onbekende fout'
        result.fouten.push(`"${p.naam}": ${msg}`)
      }
    }

    setResultaat(result)
    setStap('resultaat')
  }, [projecten, user?.id])

  // ── Toggle helpers ──
  const toggleAll = useCallback((selected: boolean) => {
    setProjecten(prev => prev.map(p => ({ ...p, selected })))
  }, [])

  const toggleProject = useCallback((index: number) => {
    setProjecten(prev => prev.map((p, i) => i === index ? { ...p, selected: !p.selected } : p))
  }, [])

  const selectedCount = projecten.filter(p => p.selected).length

  // ── Drag & Drop ──
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])
  const handleDragLeave = useCallback(() => setIsDragging(false), [])
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col bg-[#FEFDFB]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold" style={{ color: '#1A535C' }}>
            Projecten importeren
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[#9B9B95]">
            Importeer lopende projecten vanuit James PRO
          </DialogDescription>
        </DialogHeader>

        {/* ── Stap 1: Upload ── */}
        {stap === 'upload' && (
          <div className="py-6">
            <div
              className={`
                border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer
                ${isDragging ? 'border-[#1A535C] bg-[#1A535C08]' : 'border-[#E0DFDB] hover:border-[#1A535C50]'}
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = '.csv'
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0]
                  if (file) handleFile(file)
                }
                input.click()
              }}
            >
              <Upload className="w-10 h-10 mx-auto mb-4" style={{ color: '#1A535C' }} />
              <p className="text-[15px] font-semibold mb-1" style={{ color: '#1A535C' }}>
                Upload je projecten CSV-export
              </p>
              <p className="text-[13px]" style={{ color: '#9B9B95' }}>
                Sleep een bestand hierheen of klik om te selecteren
              </p>
            </div>

            {parseError && (
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-3">
                <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-[13px] text-red-700">{parseError}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Stap 2: Preview ── */}
        {stap === 'preview' && (
          <div className="flex flex-col gap-4 min-h-0 flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4" style={{ color: '#1A535C' }} />
                <span className="text-[14px] font-semibold" style={{ color: '#1A535C' }}>
                  {projecten.length} projecten gevonden
                </span>
                <span className="text-[12px]" style={{ color: '#9B9B95' }}>
                  ({selectedCount} geselecteerd)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => toggleAll(true)}>
                  Alles selecteren
                </Button>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => toggleAll(false)}>
                  Niets selecteren
                </Button>
              </div>
            </div>

            <div className="overflow-auto flex-1 rounded-xl border border-[#E8E7E3]">
              <table className="w-full text-[13px]">
                <thead className="bg-[#F8F7F5] sticky top-0">
                  <tr>
                    <th className="w-10 px-3 py-2.5" />
                    <th className="text-left px-3 py-2.5 font-semibold text-[#6B6B66]">#</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-[#6B6B66]">Projectnaam</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-[#6B6B66]">Klant</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-[#6B6B66]">Datum</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-[#6B6B66]">Budget</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-[#6B6B66]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {projecten.map((p, i) => (
                    <tr
                      key={i}
                      className={`border-t border-[#F0EFEB] transition-colors ${p.selected ? 'bg-white' : 'bg-[#FAFAF8] opacity-50'}`}
                    >
                      <td className="px-3 py-2">
                        <Checkbox
                          checked={p.selected}
                          onCheckedChange={() => toggleProject(i)}
                        />
                      </td>
                      <td className="px-3 py-2 font-mono text-[#9B9B95]">{p.jamesId || '—'}</td>
                      <td className="px-3 py-2 font-medium text-[#1A1A1A]">{p.naam}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[#6B6B66]">{p.bedrijfsnaam || '—'}</span>
                          {p.klantMatch ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-200 text-green-700 bg-green-50">
                              Bestaand
                            </Badge>
                          ) : p.bedrijfsnaam ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-200 text-blue-700 bg-blue-50">
                              Nieuw
                            </Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-[#9B9B95]">{p.datumAangemaakt || '—'}</td>
                      <td className="px-3 py-2 text-right font-mono text-[#6B6B66]">
                        {p.budget > 0 ? `€ ${p.budget.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}` : '—'}
                      </td>
                      <td className="px-3 py-2">
                        {p.isDuplicaat && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-200 text-amber-700 bg-amber-50">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Duplicaat?
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" size="sm" onClick={reset}>
                Terug
              </Button>
              <Button
                size="sm"
                disabled={selectedCount === 0}
                onClick={handleImport}
                className="bg-[#1A535C] hover:bg-[#143F46] text-white"
              >
                Importeer {selectedCount} project{selectedCount !== 1 ? 'en' : ''}
              </Button>
            </div>
          </div>
        )}

        {/* ── Stap 3: Importing ── */}
        {stap === 'importing' && (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" style={{ color: '#1A535C' }} />
            <p className="text-[15px] font-semibold mb-1" style={{ color: '#1A535C' }}>
              Bezig met importeren...
            </p>
            <p className="text-[13px]" style={{ color: '#9B9B95' }}>
              {importProgress.current} van {importProgress.total} projecten
            </p>
            <div className="w-64 mx-auto mt-4 h-1.5 bg-[#E8E7E3] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%`,
                  backgroundColor: '#1A535C',
                }}
              />
            </div>
          </div>
        )}

        {/* ── Stap 4: Resultaat ── */}
        {stap === 'resultaat' && resultaat && (
          <div className="py-8 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-4" style={{ color: '#2D6B48' }} />
            <p className="text-[17px] font-bold mb-2" style={{ color: '#1A535C' }}>
              Import voltooid
            </p>
            <div className="flex items-center justify-center gap-6 mb-4">
              <div>
                <span className="text-[24px] font-bold font-mono" style={{ color: '#1A535C' }}>{resultaat.projecten}</span>
                <p className="text-[12px] text-[#9B9B95]">projecten</p>
              </div>
              {resultaat.nieuweKlanten > 0 && (
                <div>
                  <span className="text-[24px] font-bold font-mono" style={{ color: '#3A6B8C' }}>{resultaat.nieuweKlanten}</span>
                  <p className="text-[12px] text-[#9B9B95]">nieuwe klanten</p>
                </div>
              )}
            </div>

            {resultaat.fouten.length > 0 && (
              <div className="text-left max-w-md mx-auto mb-4 rounded-xl bg-amber-50 border border-amber-100 p-3">
                <p className="text-[12px] font-semibold text-amber-800 mb-1">
                  {resultaat.fouten.length} fout{resultaat.fouten.length !== 1 ? 'en' : ''}:
                </p>
                {resultaat.fouten.slice(0, 5).map((f, i) => (
                  <p key={i} className="text-[11px] text-amber-700">{f}</p>
                ))}
                {resultaat.fouten.length > 5 && (
                  <p className="text-[11px] text-amber-600 mt-1">...en {resultaat.fouten.length - 5} meer</p>
                )}
              </div>
            )}

            <Button
              size="sm"
              onClick={() => {
                handleOpenChange(false)
                onImportComplete()
                toast.success(`${resultaat.projecten} projecten geïmporteerd`)
              }}
              className="bg-[#1A535C] hover:bg-[#143F46] text-white"
            >
              Sluiten
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
