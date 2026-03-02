import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, ArrowUpDown } from 'lucide-react'
import { getGrootboek, createGrootboekRekening, updateGrootboekRekening, deleteGrootboekRekening } from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency } from '@/lib/utils'
import type { Grootboek } from '@/types'
import { toast } from 'sonner'

type Categorie = 'alle' | 'activa' | 'passiva' | 'omzet' | 'kosten'
type SortField = 'code' | 'naam'
type SortDir = 'asc' | 'desc'

const categorieColors: Record<string, string> = {
  activa: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  passiva: 'bg-wm-pale/30 text-[#3D3522] dark:bg-accent/30 dark:text-wm-pale',
  omzet: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  kosten: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

const categorieLabels: Record<string, string> = {
  activa: 'Activa',
  passiva: 'Passiva',
  omzet: 'Omzet',
  kosten: 'Kosten',
}

const emptyForm: Omit<Grootboek, 'id' | 'user_id' | 'created_at'> = {
  code: '',
  naam: '',
  categorie: 'activa',
  saldo: 0,
}

export function GeneralLedgerSettings() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<Grootboek[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategorie, setFilterCategorie] = useState<Categorie>('alle')
  const [sortField, setSortField] = useState<SortField>('code')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getGrootboek()
      setAccounts(data)
    } catch (error) {
      toast.error('Fout bij ophalen grootboekrekeningen')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredAccounts = useMemo(() => {
    let result = [...accounts]

    if (filterCategorie !== 'alle') {
      result = result.filter((a) => a.categorie === filterCategorie)
    }

    result.sort((a, b) => {
      const valA = a[sortField].toLowerCase()
      const valB = b[sortField].toLowerCase()
      const cmp = valA.localeCompare(valB, 'nl')
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [accounts, filterCategorie, sortField, sortDir])

  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = { activa: 0, passiva: 0, omzet: 0, kosten: 0 }
    accounts.forEach((a) => {
      totals[a.categorie] += a.saldo
    })
    return totals
  }, [accounts])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const openNew = () => {
    setForm(emptyForm)
    setEditingId(null)
    setDialogOpen(true)
  }

  const openEdit = (account: Grootboek) => {
    setForm({
      code: account.code,
      naam: account.naam,
      categorie: account.categorie,
      saldo: account.saldo,
    })
    setEditingId(account.id)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.code.trim() || !form.naam.trim()) {
      toast.error('Vul alle verplichte velden in')
      return
    }

    try {
      if (editingId) {
        await updateGrootboekRekening(editingId, {
          code: form.code,
          naam: form.naam,
          categorie: form.categorie,
          saldo: form.saldo,
        })
        toast.success('Rekening bijgewerkt')
      } else {
        await createGrootboekRekening({
          user_id: user?.id ?? '',
          code: form.code,
          naam: form.naam,
          categorie: form.categorie,
          saldo: form.saldo,
        })
        toast.success('Rekening aangemaakt')
      }

      setDialogOpen(false)
      setEditingId(null)
      setForm(emptyForm)
      await fetchData()
    } catch (error) {
      toast.error('Fout bij opslaan rekening')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteGrootboekRekening(id)
      toast.success('Rekening verwijderd')
      await fetchData()
    } catch (error) {
      toast.error('Fout bij verwijderen rekening')
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-lg">Grootboekrekeningen</CardTitle>
          <div className="flex items-center gap-3">
            <Select
              value={filterCategorie}
              onValueChange={(val) => setFilterCategorie(val as Categorie)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter categorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle</SelectItem>
                <SelectItem value="activa">Activa</SelectItem>
                <SelectItem value="passiva">Passiva</SelectItem>
                <SelectItem value="omzet">Omzet</SelectItem>
                <SelectItem value="kosten">Kosten</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={openNew} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Rekening
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            Laden...
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4">
                      <button
                        onClick={() => toggleSort('code')}
                        className="flex items-center gap-1 font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                      >
                        Code
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="text-left py-3 px-4">
                      <button
                        onClick={() => toggleSort('naam')}
                        className="flex items-center gap-1 font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                      >
                        Naam
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                      Categorie
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                      Saldo
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                      Acties
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500 dark:text-gray-400">
                        Geen grootboekrekeningen gevonden
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((account) => (
                      <tr
                        key={account.id}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                          {account.code}
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                          {account.naam}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={categorieColors[account.categorie]}>
                            {categorieLabels[account.categorie]}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(account.saldo)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-blue-600"
                              onClick={() => openEdit(account)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-red-600"
                              onClick={() => handleDelete(account.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Category Totals */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Totalen per categorie
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(Object.entries(categoryTotals) as [string, number][]).map(([cat, total]) => (
                  <div
                    key={cat}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                  >
                    <Badge className={categorieColors[cat]}>
                      {categorieLabels[cat]}
                    </Badge>
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">
                      {formatCurrency(total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>

      {/* Dialog for New / Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Rekening Bewerken' : 'Nieuwe Rekening'}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Pas de gegevens van deze grootboekrekening aan.'
                : 'Voeg een nieuwe grootboekrekening toe.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                  placeholder="bijv. 4600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categorie">Categorie *</Label>
                <Select
                  value={form.categorie}
                  onValueChange={(val) =>
                    setForm((prev) => ({
                      ...prev,
                      categorie: val as Grootboek['categorie'],
                    }))
                  }
                >
                  <SelectTrigger id="categorie">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activa">Activa</SelectItem>
                    <SelectItem value="passiva">Passiva</SelectItem>
                    <SelectItem value="omzet">Omzet</SelectItem>
                    <SelectItem value="kosten">Kosten</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="naam">Naam *</Label>
              <Input
                id="naam"
                value={form.naam}
                onChange={(e) => setForm((prev) => ({ ...prev, naam: e.target.value }))}
                placeholder="bijv. Afschrijving inventaris"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="saldo">Saldo</Label>
              <Input
                id="saldo"
                type="number"
                value={form.saldo}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, saldo: parseFloat(e.target.value) || 0 }))
                }
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleSave}>
              {editingId ? 'Bijwerken' : 'Toevoegen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
