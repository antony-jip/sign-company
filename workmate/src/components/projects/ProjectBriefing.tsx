import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { FileEdit, Save, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { updateProject } from '@/services/supabaseService'
import type { Project } from '@/types'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'

interface ProjectBriefingProps {
  project: Project
  onProjectUpdate: (updated: Project) => void
}

export function ProjectBriefing({ project, onProjectUpdate }: ProjectBriefingProps) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(project.beschrijving || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setText(project.beschrijving || '')
  }, [project.beschrijving])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await updateProject(project.id, { beschrijving: text })
      onProjectUpdate(updated)
      toast.success('Briefing opgeslagen')
      setOpen(false)
    } catch (err) {
      logger.error('Fout bij opslaan briefing:', err)
      toast.error('Kon briefing niet opslaan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-gray-200/80 dark:border-gray-700/80">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <FileEdit className="h-3.5 w-3.5 text-white" />
            </div>
            Briefing
          </CardTitle>
          <div className="flex items-center gap-2">
            {open && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-3 text-xs"
                disabled={saving}
                onClick={handleSave}
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Save className="h-3 w-3 mr-1" />
                )}
                Opslaan
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setOpen(!open)}
            >
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      {open ? (
        <CardContent className="pt-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Voeg hier de projectbriefing toe... Beschrijf het project, de wensen van de klant, bijzonderheden, etc."
            rows={6}
            className="resize-y"
          />
        </CardContent>
      ) : (
        <CardContent className="pt-0 pb-3">
          {text ? (
            <p
              className="text-sm text-muted-foreground line-clamp-2 cursor-pointer hover:text-foreground transition-colors"
              onClick={() => setOpen(true)}
            >
              {text}
            </p>
          ) : (
            <p
              className="text-sm text-muted-foreground/60 italic cursor-pointer hover:text-muted-foreground transition-colors"
              onClick={() => setOpen(true)}
            >
              Klik om een briefing toe te voegen...
            </p>
          )}
        </CardContent>
      )}
    </Card>
  )
}
