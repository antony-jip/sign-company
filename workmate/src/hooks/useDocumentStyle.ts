import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getDocumentStyle } from '@/services/supabaseService'
import { getDefaultDocumentStyle } from '@/lib/documentTemplates'
import type { DocumentStyle } from '@/types'

export function useDocumentStyle(): DocumentStyle | null {
  const { user } = useAuth()
  const [style, setStyle] = useState<DocumentStyle | null>(null)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    getDocumentStyle(user.id).then((data) => {
      if (!cancelled) {
        setStyle(data || getDefaultDocumentStyle(user.id))
      }
    }).catch(() => {
      if (!cancelled) {
        setStyle(getDefaultDocumentStyle(user.id))
      }
    })

    return () => { cancelled = true }
  }, [user?.id])

  return style
}
