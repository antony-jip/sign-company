import React, { useState, useCallback } from 'react'
import { FolderOpen, FileText, CheckSquare, Users, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  createKlant,
  createProject,
  createTaak,
  createOfferte,
  generateOfferteNummer,
} from '@/services/supabaseService'
interface ForgieActie {
  type: string
  data: Record<string, unknown>
}

const MODULE_CONFIG: Record<string, {
  icon: React.ElementType
  label: string
  color: string
  bgColor: string
  borderColor: string
}> = {
  project: {
    icon: FolderOpen,
    label: 'Project',
    color: '#7EB5A6',
    bgColor: 'bg-[#7EB5A6]/10',
    borderColor: 'border-l-[#7EB5A6]',
  },
  offerte: {
    icon: FileText,
    label: 'Offerte',
    color: '#9B8EC4',
    bgColor: 'bg-[#9B8EC4]/10',
    borderColor: 'border-l-[#9B8EC4]',
  },
  taak: {
    icon: CheckSquare,
    label: 'Taak',
    color: '#C4A882',
    bgColor: 'bg-[#C4A882]/10',
    borderColor: 'border-l-[#C4A882]',
  },
  klant: {
    icon: Users,
    label: 'Klant',
    color: '#8BAFD4',
    bgColor: 'bg-[#8BAFD4]/10',
    borderColor: 'border-l-[#8BAFD4]',
  },
}

// Display labels for data fields
const FIELD_LABELS: Record<string, string> = {
  naam: 'Naam',
  klant_naam: 'Klant',
  beschrijving: 'Beschrijving',
  status: 'Status',
  onderwerp: 'Onderwerp',
  project_naam: 'Project',
  titel: 'Titel',
  prioriteit: 'Prioriteit',
  deadline: 'Deadline',
  bedrijfsnaam: 'Bedrijfsnaam',
  contactpersoon: 'Contactpersoon',
  email: 'Email',
  telefoon: 'Telefoon',
}

// Fields to show (in order) per type
const DISPLAY_FIELDS: Record<string, string[]> = {
  project: ['naam', 'klant_naam', 'beschrijving', 'status'],
  offerte: ['onderwerp', 'klant_naam', 'project_naam'],
  taak: ['titel', 'beschrijving', 'project_naam', 'prioriteit', 'deadline'],
  klant: ['bedrijfsnaam', 'contactpersoon', 'email', 'telefoon'],
}

const VALID_PROJECT_STATUSES = ['gepland', 'actief', 'in-review', 'afgerond', 'on-hold', 'te-factureren', 'te-plannen']

interface ForgieActieKaartProps {
  actie: ForgieActie
  onCreated: (type: string, id: string) => void
  onCancel: () => void
  disabled?: boolean
  pendingKlantId?: string
  pendingProjectId?: string
}

export function ForgieActieKaart({
  actie,
  onCreated,
  onCancel,
  disabled = false,
  pendingKlantId,
  pendingProjectId,
}: ForgieActieKaartProps) {
  const [editedData, setEditedData] = useState<Record<string, unknown>>({ ...actie.data })
  const [editingField, setEditingField] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'creating' | 'created' | 'cancelled'>('idle')
  const [error, setError] = useState<string | null>(null)

  const config = MODULE_CONFIG[actie.type] || MODULE_CONFIG.project
  const Icon = config.icon
  const fields = DISPLAY_FIELDS[actie.type] || []

  const handleFieldChange = useCallback((field: string, value: string) => {
    setEditedData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleCreate = useCallback(async () => {
    setStatus('creating')
    setError(null)
    try {
      let createdId = ''

      if (actie.type === 'klant') {
        const result = await createKlant({
          bedrijfsnaam: String(editedData.bedrijfsnaam || ''),
          contactpersoon: String(editedData.contactpersoon || ''),
          email: String(editedData.email || ''),
          telefoon: String(editedData.telefoon || ''),
          adres: '',
          postcode: '',
          stad: '',
          land: 'Nederland',
          website: '',
          kvk_nummer: '',
          btw_nummer: '',
          status: 'prospect',
          tags: [],
          notities: '',
          contactpersonen: [],
        })
        createdId = result.id
      } else if (actie.type === 'project') {
        const klantId = String(editedData.klant_id || pendingKlantId || '')
        if (!klantId) {
          setError('Klant is verplicht voor een project')
          setStatus('idle')
          return
        }
        const statusValue = VALID_PROJECT_STATUSES.includes(String(editedData.status || ''))
          ? String(editedData.status)
          : 'gepland'
        const result = await createProject({
          klant_id: klantId,
          naam: String(editedData.naam || 'Nieuw project'),
          beschrijving: String(editedData.beschrijving || ''),
          status: statusValue as 'gepland' | 'actief' | 'in-review' | 'afgerond' | 'on-hold' | 'te-factureren' | 'te-plannen',
          prioriteit: 'medium',
          budget: 0,
          besteed: 0,
          voortgang: 0,
          team_leden: [],
        })
        createdId = result.id
      } else if (actie.type === 'offerte') {
        const klantId = String(editedData.klant_id || '')
        if (!klantId) {
          setError('Klant is verplicht voor een offerte')
          setStatus('idle')
          return
        }
        const nummer = await generateOfferteNummer()
        const geldigTot = new Date()
        geldigTot.setDate(geldigTot.getDate() + 30)
        const result = await createOfferte({
          klant_id: klantId,
          project_id: String(editedData.project_id || pendingProjectId || ''),
          nummer,
          titel: String(editedData.onderwerp || 'Nieuwe offerte'),
          status: 'concept',
          subtotaal: 0,
          btw_bedrag: 0,
          totaal: 0,
          geldig_tot: geldigTot.toISOString().split('T')[0],
          notities: '',
          voorwaarden: '',
        })
        createdId = result.id
      } else if (actie.type === 'taak') {
        const result = await createTaak({
          titel: String(editedData.titel || 'Nieuwe taak'),
          beschrijving: String(editedData.beschrijving || ''),
          project_id: String(editedData.project_id || pendingProjectId || '') || undefined,
          status: 'todo',
          prioriteit: (editedData.prioriteit as 'laag' | 'medium' | 'hoog') || 'medium',
          toegewezen_aan: '',
          deadline: editedData.deadline ? String(editedData.deadline) : undefined,
          geschatte_tijd: 0,
          bestede_tijd: 0,
        })
        createdId = result.id
      }

      setStatus('created')
      onCreated(actie.type, createdId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aanmaken mislukt')
      setStatus('idle')
    }
  }, [actie.type, editedData, pendingKlantId, pendingProjectId, onCreated])

  const handleCancel = useCallback(() => {
    setStatus('cancelled')
    onCancel()
  }, [onCancel])

  if (status === 'cancelled') return null

  return (
    <div
      className={cn(
        'rounded-xl border-l-4 p-3 transition-all',
        config.borderColor,
        config.bgColor,
        disabled && 'opacity-50 pointer-events-none',
        status === 'created' && 'bg-emerald-50 dark:bg-emerald-950/20 border-l-emerald-500',
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        {status === 'created' ? (
          <Check className="w-4 h-4 text-emerald-600" />
        ) : (
          <Icon className="w-4 h-4" style={{ color: config.color }} />
        )}
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: status === 'created' ? '#059669' : config.color }}>
          {status === 'created' ? `${config.label} aangemaakt` : `${config.label} aanmaken`}
        </span>
      </div>

      {/* Fields */}
      {status !== 'created' && (
        <div className="space-y-1.5 mb-3">
          {fields.map(field => {
            const value = String(editedData[field] || '')
            if (!value && field !== 'beschrijving') return null
            const label = FIELD_LABELS[field] || field

            return (
              <div key={field} className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground w-24 flex-shrink-0">{label}</span>
                {editingField === field ? (
                  <input
                    autoFocus
                    className="flex-1 bg-background border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    value={value}
                    onChange={e => handleFieldChange(field, e.target.value)}
                    onBlur={() => setEditingField(null)}
                    onKeyDown={e => e.key === 'Enter' && setEditingField(null)}
                  />
                ) : (
                  <button
                    className="flex-1 text-left text-foreground hover:bg-background/50 rounded px-2 py-1 -mx-2 transition-colors"
                    onClick={() => setEditingField(field)}
                    title="Klik om aan te passen"
                  >
                    {value || <span className="text-muted-foreground italic">-</span>}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500 mb-2">{error}</p>
      )}

      {/* Actions */}
      {status === 'idle' && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleCreate}
            className="h-7 text-xs bg-foreground text-background hover:bg-foreground/90"
          >
            Aanmaken
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            className="h-7 text-xs"
          >
            Annuleren
          </Button>
        </div>
      )}

      {status === 'creating' && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Bezig met aanmaken...</span>
        </div>
      )}
    </div>
  )
}
