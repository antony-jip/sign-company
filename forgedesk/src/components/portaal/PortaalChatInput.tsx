import { useState, useRef, useCallback, useEffect, type KeyboardEvent, type ChangeEvent } from 'react'
import { Plus, Send, Paperclip, FileText, Image, Receipt, Lock, Camera, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Offerte, Factuur } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SendPayload =
  | { kind: 'tekst'; tekst: string; emailNotify: boolean }
  | { kind: 'foto'; file: File; caption?: string; emailNotify: boolean }
  | { kind: 'notitie_intern'; tekst: string }
  | { kind: 'offerte'; offerteId: string; emailNotify: boolean }
  | { kind: 'factuur'; factuurId: string; emailNotify: boolean }
  | { kind: 'tekening'; files: File[]; titel: string; emailNotify: boolean }

interface PortaalChatInputProps {
  isPublic: boolean
  offertes?: Offerte[]
  facturen?: Factuur[]
  onSend: (payload: SendPayload) => Promise<void>
  disabled?: boolean
}

type MenuMode = null | 'offerte' | 'factuur' | 'tekening' | 'notitie'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const currencyFmt = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
})

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export type { SendPayload }

export function PortaalChatInput({
  isPublic,
  offertes = [],
  facturen = [],
  onSend,
  disabled = false,
}: PortaalChatInputProps) {
  // --- state ---------------------------------------------------------------
  const [tekst, setTekst] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuMode, setMenuMode] = useState<MenuMode>(null)
  const [notitieMode, setNotitieMode] = useState(false)
  const [emailNotify, setEmailNotify] = useState(false)
  const [pendingFoto, setPendingFoto] = useState<File | null>(null)
  const [pendingTekeningFiles, setPendingTekeningFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)

  // --- refs ----------------------------------------------------------------
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fotoInputRef = useRef<HTMLInputElement>(null)
  const tekeningInputRef = useRef<HTMLInputElement>(null)
  const attachInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // --- auto-grow textarea --------------------------------------------------
  const adjustHeight = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 96)}px`
  }, [])

  useEffect(() => {
    adjustHeight()
  }, [tekst, adjustHeight])

  // --- close menu on outside click -----------------------------------------
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
        setMenuMode(null)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClick)
    }
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  // --- helpers -------------------------------------------------------------
  const resetInput = useCallback(() => {
    setTekst('')
    setPendingFoto(null)
    setPendingTekeningFiles([])
    setNotitieMode(false)
    setMenuOpen(false)
    setMenuMode(null)
    setEmailNotify(false)
  }, [])

  const placeholder = notitieMode
    ? 'Schrijf een interne notitie...'
    : isPublic
      ? 'Typ uw reactie...'
      : 'Typ een bericht...'

  const canSend = tekst.trim().length > 0 || pendingFoto !== null || pendingTekeningFiles.length > 0

  // --- send handler --------------------------------------------------------
  const handleSend = useCallback(async () => {
    if (sending || disabled) return

    setSending(true)
    try {
      if (pendingFoto) {
        await onSend({
          kind: 'foto',
          file: pendingFoto,
          caption: tekst.trim() || undefined,
          emailNotify,
        })
      } else if (pendingTekeningFiles.length > 0) {
        await onSend({
          kind: 'tekening',
          files: pendingTekeningFiles,
          titel: tekst.trim() || 'Tekening',
          emailNotify,
        })
      } else if (notitieMode) {
        if (!tekst.trim()) return
        await onSend({ kind: 'notitie_intern', tekst: tekst.trim() })
      } else {
        if (!tekst.trim()) return
        await onSend({ kind: 'tekst', tekst: tekst.trim(), emailNotify })
      }
      resetInput()
    } finally {
      setSending(false)
    }
  }, [sending, disabled, pendingFoto, pendingTekeningFiles, notitieMode, tekst, emailNotify, onSend, resetInput])

  // --- keyboard ------------------------------------------------------------
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (canSend) void handleSend()
      }
    },
    [canSend, handleSend],
  )

  // --- menu actions --------------------------------------------------------
  const handleMenuOfferte = () => setMenuMode('offerte')
  const handleMenuFactuur = () => setMenuMode('factuur')

  const handleMenuTekening = () => {
    setMenuMode('tekening')
    setTimeout(() => tekeningInputRef.current?.click(), 0)
  }

  const handleMenuFoto = () => {
    setMenuOpen(false)
    setMenuMode(null)
    setTimeout(() => fotoInputRef.current?.click(), 0)
  }

  const handleMenuNotitie = () => {
    setMenuOpen(false)
    setMenuMode(null)
    setNotitieMode(true)
    setEmailNotify(false)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  // --- offerte / factuur select --------------------------------------------
  const handleOfferteSelect = async (offerteId: string) => {
    setMenuOpen(false)
    setMenuMode(null)
    setSending(true)
    try {
      await onSend({ kind: 'offerte', offerteId, emailNotify: true })
    } finally {
      setSending(false)
    }
  }

  const handleFactuurSelect = async (factuurId: string) => {
    setMenuOpen(false)
    setMenuMode(null)
    setSending(true)
    try {
      await onSend({ kind: 'factuur', factuurId, emailNotify: true })
    } finally {
      setSending(false)
    }
  }

  // --- file handlers -------------------------------------------------------
  const handleFotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPendingFoto(file)
      setPendingTekeningFiles([])
    }
    e.target.value = ''
  }

  const handleAttachChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPendingFoto(file)
      setPendingTekeningFiles([])
    }
    e.target.value = ''
  }

  const handleTekeningChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setPendingTekeningFiles(Array.from(files))
      setPendingFoto(null)
      setMenuOpen(false)
      setEmailNotify(true)
    }
    e.target.value = ''
  }

  const handleSendTekening = async () => {
    if (pendingTekeningFiles.length === 0 || sending || disabled) return
    setSending(true)
    try {
      await onSend({
        kind: 'tekening',
        files: pendingTekeningFiles,
        titel: tekst.trim() || 'Tekening',
        emailNotify,
      })
      resetInput()
    } finally {
      setSending(false)
    }
  }

  // --- render --------------------------------------------------------------
  return (
    <div className="border-t border-border bg-background px-4 py-3">
      {/* Pending foto preview */}
      {pendingFoto && (
        <div className="mb-2 flex items-center gap-2">
          <div className="relative h-16 w-16 overflow-hidden rounded-md border">
            <img
              src={URL.createObjectURL(pendingFoto)}
              alt="Preview"
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => setPendingFoto(null)}
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <span className="text-xs text-muted-foreground">{pendingFoto.name}</span>
        </div>
      )}

      {/* Pending tekening files */}
      {pendingTekeningFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {pendingTekeningFiles.map((f, i) => (
            <div key={i} className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs">
              <FileText className="h-3 w-3" />
              <span className="max-w-[120px] truncate">{f.name}</span>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setPendingTekeningFiles([])}
            className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-accent"
          >
            <X className="h-3 w-3" />
          </button>
          <Button size="sm" disabled={sending || disabled} onClick={handleSendTekening}>
            Verstuur
          </Button>
        </div>
      )}

      {/* Main input row */}
      <div className="flex items-end gap-2">
        {/* + menu button (internal only) */}
        {!isPublic && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                setMenuOpen((prev) => !prev)
                setMenuMode(null)
              }}
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90',
                'disabled:opacity-50',
              )}
            >
              <Plus className="h-5 w-5" />
            </button>

            {/* Popup menu */}
            {menuOpen && (
              <div className="absolute bottom-full left-0 mb-2 min-w-[240px] rounded-lg border bg-popover p-2 shadow-lg">
                {menuMode === null && (
                  <>
                    <button
                      type="button"
                      onClick={handleMenuOfferte}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                    >
                      <FileText className="h-4 w-4" />
                      Offerte
                    </button>
                    <button
                      type="button"
                      onClick={handleMenuTekening}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                    >
                      <Image className="h-4 w-4" />
                      Tekening
                    </button>
                    <button
                      type="button"
                      onClick={handleMenuFactuur}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                    >
                      <Receipt className="h-4 w-4" />
                      Factuur
                    </button>
                    <button
                      type="button"
                      onClick={handleMenuFoto}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                    >
                      <Camera className="h-4 w-4" />
                      Foto
                    </button>
                    <button
                      type="button"
                      onClick={handleMenuNotitie}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                    >
                      <Lock className="h-4 w-4" />
                      Interne notitie
                    </button>
                  </>
                )}

                {/* Offerte dropdown */}
                {menuMode === 'offerte' && (
                  <div className="flex flex-col gap-1">
                    <div className="px-3 py-1 text-xs font-medium text-muted-foreground">
                      Kies een offerte
                    </div>
                    {offertes.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        Geen offertes beschikbaar
                      </div>
                    ) : (
                      offertes.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => void handleOfferteSelect(o.id)}
                          className="flex w-full flex-col items-start rounded-md px-3 py-2 text-sm hover:bg-accent"
                        >
                          <span className="font-medium">{o.nummer} – {o.titel}</span>
                          <span className="text-xs text-muted-foreground">
                            {currencyFmt.format(o.totaal)}
                          </span>
                        </button>
                      ))
                    )}
                    <button
                      type="button"
                      onClick={() => setMenuMode(null)}
                      className="mt-1 flex items-center gap-1 px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      ← Terug
                    </button>
                  </div>
                )}

                {/* Factuur dropdown */}
                {menuMode === 'factuur' && (
                  <div className="flex flex-col gap-1">
                    <div className="px-3 py-1 text-xs font-medium text-muted-foreground">
                      Kies een factuur
                    </div>
                    {facturen.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        Geen facturen beschikbaar
                      </div>
                    ) : (
                      facturen.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => void handleFactuurSelect(f.id)}
                          className="flex w-full flex-col items-start rounded-md px-3 py-2 text-sm hover:bg-accent"
                        >
                          <span className="font-medium">{f.nummer}</span>
                          <span className="text-xs text-muted-foreground">
                            {currencyFmt.format(f.totaal)}
                          </span>
                        </button>
                      ))
                    )}
                    <button
                      type="button"
                      onClick={() => setMenuMode(null)}
                      className="mt-1 flex items-center gap-1 px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      ← Terug
                    </button>
                  </div>
                )}

                {/* Tekening: handled via file input, show loading state */}
                {menuMode === 'tekening' && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    Bestanden selecteren...
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || sending}
          rows={1}
          className={cn(
            'flex-1 resize-none rounded-lg border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50',
            notitieMode && 'border-amber-200 bg-amber-50',
          )}
        />

        {/* Notitie mode indicator + cancel */}
        {notitieMode && (
          <button
            type="button"
            onClick={() => {
              setNotitieMode(false)
              setTekst('')
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-accent"
            title="Notitie annuleren"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Attachment button (photo shortcut) */}
        {!notitieMode && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => attachInputRef.current?.click()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-accent disabled:opacity-50"
            title="Foto bijvoegen"
          >
            <Paperclip className="h-4 w-4" />
          </button>
        )}

        {/* Send button */}
        <button
          type="button"
          disabled={!canSend || disabled || sending}
          onClick={() => void handleSend()}
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90',
            'disabled:opacity-50',
          )}
          title="Verstuur"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {/* Email notification toggle (internal only) */}
      {!isPublic && (
        <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={emailNotify}
            onChange={(e) => setEmailNotify(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-border"
          />
          <span>📧 Klant notificeren</span>
        </label>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fotoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFotoChange}
      />
      <input
        ref={attachInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAttachChange}
      />
      <input
        ref={tekeningInputRef}
        type="file"
        accept="image/*,.pdf"
        multiple
        className="hidden"
        onChange={handleTekeningChange}
      />
    </div>
  )
}
