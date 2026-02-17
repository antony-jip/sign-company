import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { mockBtwCodes } from '@/data/mockData'
import type { BtwCode } from '@/types'
import { toast } from 'sonner'

const emptyForm: Omit<BtwCode, 'id' | 'user_id' | 'created_at'> = {
  code: '',
  omschrijving: '',
  percentage: 0,
  actief: true,
}

export function VATCodesSettings() {
  const [btwCodes, setBtwCodes] = useState<BtwCode[]>(mockBtwCodes)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const openNew = () => {
    setForm(emptyForm)
    setEditingId(null)
    setDialogOpen(true)
  }

  const openEdit = (btw: BtwCode) => {
    setForm({
      code: btw.code,
      omschrijving: btw.omschrijving,
      percentage: btw.percentage,
      actief: btw.actief,
    })
    setEditingId(btw.id)
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!form.code.trim() || !form.omschrijving.trim()) {
      toast.error('Vul alle verplichte velden in')
      return
    }

    if (editingId) {
      setBtwCodes((prev) =>
        prev.map((b) =>
          b.id === editingId
            ? {
                ...b,
                code: form.code,
                omschrijving: form.omschrijving,
                percentage: form.percentage,
                actief: form.actief,
              }
            : b
        )
      )
      toast.success('BTW code bijgewerkt')
    } else {
      const newBtw: BtwCode = {
        id: `btw-${Date.now()}`,
        user_id: 'u1',
        code: form.code,
        omschrijving: form.omschrijving,
        percentage: form.percentage,
        actief: form.actief,
        created_at: new Date().toISOString(),
      }
      setBtwCodes((prev) => [...prev, newBtw])
      toast.success('BTW code aangemaakt')
    }

    setDialogOpen(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const handleDelete = (id: string) => {
    setBtwCodes((prev) => prev.filter((b) => b.id !== id))
    toast.success('BTW code verwijderd')
  }

  const handleToggleActief = (id: string) => {
    setBtwCodes((prev) =>
      prev.map((b) => (b.id === id ? { ...b, actief: !b.actief } : b))
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg">BTW Codes</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Beheer de BTW tarieven voor uw offertes en facturen
            </p>
          </div>
          <Button onClick={openNew} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Nieuwe BTW Code
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                  Code
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                  Omschrijving
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                  Percentage
                </th>
                <th className="text-center py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                  Actief
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                  Acties
                </th>
              </tr>
            </thead>
            <tbody>
              {btwCodes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500 dark:text-gray-400">
                    Geen BTW codes gevonden
                  </td>
                </tr>
              ) : (
                btwCodes.map((btw) => (
                  <tr
                    key={btw.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {btw.code}
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">
                      {btw.omschrijving}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900 dark:text-white">
                      {btw.percentage}%
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center">
                        <Switch
                          checked={btw.actief}
                          onCheckedChange={() => handleToggleActief(btw.id)}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-blue-600"
                          onClick={() => openEdit(btw)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-red-600"
                          onClick={() => handleDelete(btw.id)}
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
      </CardContent>

      {/* Dialog for New / Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'BTW Code Bewerken' : 'Nieuwe BTW Code'}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Pas de gegevens van deze BTW code aan.'
                : 'Voeg een nieuwe BTW code toe aan uw administratie.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="btw-code">Code *</Label>
                <Input
                  id="btw-code"
                  value={form.code}
                  onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                  placeholder="bijv. BTW-21"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="btw-percentage">Percentage (%) *</Label>
                <Input
                  id="btw-percentage"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={form.percentage}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      percentage: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="btw-omschrijving">Omschrijving *</Label>
              <Input
                id="btw-omschrijving"
                value={form.omschrijving}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, omschrijving: e.target.value }))
                }
                placeholder="bijv. Standaard tarief"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="btw-actief"
                checked={form.actief}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, actief: checked }))
                }
              />
              <Label htmlFor="btw-actief">Actief</Label>
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
