import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import type { Maatje, MaatjeAnnotatie } from '@/types'
import { getProjectMaatjes, updateMaatje, getMaatjeWeergaveUrl } from '@/services/maatjeService'
import { MaatjeEditor } from './MaatjeEditor'

interface ProjectMaatjesTabProps {
  projectId: string
}

interface EditorState {
  fotoBron: string
  annotaties: MaatjeAnnotatie[]
  titel: string | null
  maatjeId: string
}

function ProjectMaatjeThumb({ maatje, onOpenen }: { maatje: Maatje; onOpenen: (m: Maatje) => void }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let actief = true
    getMaatjeWeergaveUrl(maatje.foto_render_url).then((u) => { if (actief) setUrl(u) })
    return () => { actief = false }
  }, [maatje.foto_render_url])

  return (
    <button
      type="button"
      onClick={() => onOpenen(maatje)}
      className="group block overflow-hidden rounded-xl bg-white text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
    >
      <div className="aspect-square w-full bg-[#F8F7F5]">
        {url && <img src={url} alt={maatje.titel ?? 'Maatje'} className="h-full w-full object-cover" />}
      </div>
      {maatje.titel && (
        <div className="truncate px-2.5 py-2 text-[12px] font-medium text-[#1A1A1A]">{maatje.titel}</div>
      )}
    </button>
  )
}

export function ProjectMaatjesTab({ projectId }: ProjectMaatjesTabProps) {
  const [maatjes, setMaatjes] = useState<Maatje[]>([])
  const [laden, setLaden] = useState(true)
  const [editor, setEditor] = useState<EditorState | null>(null)

  const laad = useCallback(async () => {
    try {
      setMaatjes(await getProjectMaatjes(projectId))
    } catch (err) {
      logger.error('Project-maatjes laden mislukt:', err)
      toast.error('Kon maatjes niet laden')
    } finally {
      setLaden(false)
    }
  }, [projectId])

  useEffect(() => { laad() }, [laad])

  const openen = useCallback(async (m: Maatje) => {
    const url = await getMaatjeWeergaveUrl(m.foto_origineel_url)
    if (!url) {
      toast.error('Kon foto niet laden')
      return
    }
    setEditor({ fotoBron: url, annotaties: m.annotaties ?? [], titel: m.titel, maatjeId: m.id })
  }, [])

  const bewaar = useCallback(async (data: { annotaties: MaatjeAnnotatie[]; titel: string | null; render: Blob }) => {
    if (!editor) return
    await updateMaatje(editor.maatjeId, { titel: data.titel, annotaties: data.annotaties }, data.render)
    toast.success(<span>Opgeslagen<span className="text-[#F15025]">.</span></span>)
    setEditor(null)
    await laad()
  }, [editor, laad])

  return (
    <div className="px-4 py-4 md:px-8 md:py-6">
      {laden ? (
        <p className="py-12 text-center text-[13px] text-[#9B9B95]">Laden...</p>
      ) : maatjes.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-[14px] text-[#6B6B66]">Nog geen maatjes gekoppeld aan dit project.</p>
          <p className="mt-1 text-[13px] text-[#9B9B95]">Koppel ze vanuit het kladblok onder Maatjes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {maatjes.map((m) => (
            <ProjectMaatjeThumb key={m.id} maatje={m} onOpenen={openen} />
          ))}
        </div>
      )}

      {editor && (
        <MaatjeEditor
          fotoBron={editor.fotoBron}
          beginAnnotaties={editor.annotaties}
          beginTitel={editor.titel}
          onBewaren={bewaar}
          onAnnuleren={() => setEditor(null)}
        />
      )}
    </div>
  )
}
