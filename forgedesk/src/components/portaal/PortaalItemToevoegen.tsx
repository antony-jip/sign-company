import { useState, useRef, useEffect } from 'react'
import {
  Plus,
  FileText,
  Receipt,
  PenTool,
  ImageIcon,
  MessageSquare,
  Loader2,
  X,
} from 'lucide-react'

interface PortaalItemToevoegenProps {
  offertes: { id: string; nummer?: string; titel?: string; totaal?: number; publiek_token?: string }[]
  facturen: { id: string; nummer?: string; totaal?: number; betaal_link?: string }[]
  disabled?: boolean
  onAddOfferte: (offerteId: string, emailNotify: boolean) => Promise<void>
  onAddFactuur: (factuurId: string, emailNotify: boolean) => Promise<void>
  onAddTekening: (titel: string, files: File[], emailNotify: boolean) => Promise<void>
  onAddAfbeelding: (titel: string, file: File, emailNotify: boolean) => Promise<void>
  onAddBericht: (tekst: string, emailNotify: boolean) => Promise<void>
}

type Stap = 'menu' | 'offerte' | 'factuur' | 'tekening' | 'afbeelding' | 'bericht'

export function PortaalItemToevoegen({
  offertes,
  facturen,
  disabled,
  onAddOfferte,
  onAddFactuur,
  onAddTekening,
  onAddAfbeelding,
  onAddBericht,
}: PortaalItemToevoegenProps) {
  const [open, setOpen] = useState(false)
  const [stap, setStap] = useState<Stap>('menu')
  const [loading, setLoading] = useState(false)
  const [emailNotify, setEmailNotify] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
        setStap('menu')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Tekening form state
  const [tekeningTitel, setTekeningTitel] = useState('')
  const [tekeningFiles, setTekeningFiles] = useState<File[]>([])
  const tekeningFileRef = useRef<HTMLInputElement>(null)

  // Afbeelding form state
  const [afbeeldingTitel, setAfbeeldingTitel] = useState('')
  const [afbeeldingFile, setAfbeeldingFile] = useState<File | null>(null)
  const afbeeldingFileRef = useRef<HTMLInputElement>(null)

  // Bericht form state
  const [berichtTekst, setBerichtTekst] = useState('')

  function reset() {
    setStap('menu')
    setTekeningTitel('')
    setTekeningFiles([])
    setAfbeeldingTitel('')
    setAfbeeldingFile(null)
    setBerichtTekst('')
    setEmailNotify(true)
  }

  async function handleAction(action: () => Promise<void>) {
    setLoading(true)
    try {
      await action()
      setOpen(false)
      reset()
    } catch (err) {
      console.error('Item toevoegen mislukt:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => { setOpen(!open); if (!open) reset() }}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: '#1A535C' }}
      >
        <Plus className="w-4 h-4" />
        Item toevoegen
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border z-50"
          style={{ borderColor: '#E8E6E1' }}
        >
          {stap === 'menu' && (
            <div className="p-2">
              <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: '#A0A098' }}>
                Type kiezen
              </p>
              <MenuItem icon={FileText} label="Offerte" sub={`${offertes.length} beschikbaar`} onClick={() => setStap('offerte')} color="#F15025" />
              <MenuItem icon={Receipt} label="Factuur" sub={`${facturen.length} beschikbaar`} onClick={() => setStap('factuur')} color="#2D6B48" />
              <MenuItem icon={PenTool} label="Tekening" sub="Bestanden uploaden" onClick={() => setStap('tekening')} color="#1A535C" />
              <MenuItem icon={ImageIcon} label="Afbeelding" sub="Foto delen" onClick={() => setStap('afbeelding')} color="#6A5A8A" />
              <MenuItem icon={MessageSquare} label="Bericht" sub="Tekstbericht" onClick={() => setStap('bericht')} color="#5A5A55" />
            </div>
          )}

          {stap === 'offerte' && (
            <div className="p-4 space-y-3">
              <StapHeader titel="Offerte kiezen" onBack={() => setStap('menu')} />
              {offertes.length === 0 ? (
                <p className="text-sm text-gray-400">Geen offertes beschikbaar</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {offertes.map(o => (
                    <button
                      key={o.id}
                      onClick={() => handleAction(() => onAddOfferte(o.id, emailNotify))}
                      disabled={loading}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm transition-colors"
                    >
                      <span className="font-medium">{o.titel || `Offerte ${o.nummer}`}</span>
                      {o.totaal != null && (
                        <span className="ml-2 text-gray-400" style={{ fontFamily: "'DM Mono', monospace" }}>
                          {new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(o.totaal)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              <EmailToggle checked={emailNotify} onChange={setEmailNotify} />
            </div>
          )}

          {stap === 'factuur' && (
            <div className="p-4 space-y-3">
              <StapHeader titel="Factuur kiezen" onBack={() => setStap('menu')} />
              {facturen.length === 0 ? (
                <p className="text-sm text-gray-400">Geen facturen beschikbaar</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {facturen.map(f => (
                    <button
                      key={f.id}
                      onClick={() => handleAction(() => onAddFactuur(f.id, emailNotify))}
                      disabled={loading}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm transition-colors"
                    >
                      <span className="font-medium">Factuur {f.nummer}</span>
                      {f.totaal != null && (
                        <span className="ml-2 text-gray-400" style={{ fontFamily: "'DM Mono', monospace" }}>
                          {new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(f.totaal)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              <EmailToggle checked={emailNotify} onChange={setEmailNotify} />
            </div>
          )}

          {stap === 'tekening' && (
            <div className="p-4 space-y-3">
              <StapHeader titel="Tekening delen" onBack={() => setStap('menu')} />
              <input
                type="text"
                value={tekeningTitel}
                onChange={e => setTekeningTitel(e.target.value)}
                placeholder="Titel (bijv. Plattegrond v2)"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A535C]/30"
                style={{ borderColor: '#E8E6E1' }}
              />
              <div>
                <button
                  onClick={() => tekeningFileRef.current?.click()}
                  className="text-sm text-[#1A535C] hover:underline"
                >
                  + Bestanden kiezen
                </button>
                <input
                  ref={tekeningFileRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={e => {
                    if (e.target.files) setTekeningFiles(prev => [...prev, ...Array.from(e.target.files!)])
                    e.target.value = ''
                  }}
                />
                {tekeningFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <span className="truncate">{f.name}</span>
                    <button onClick={() => setTekeningFiles(prev => prev.filter((_, j) => j !== i))}>
                      <X className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>
                ))}
              </div>
              <EmailToggle checked={emailNotify} onChange={setEmailNotify} />
              <button
                onClick={() => handleAction(() => onAddTekening(tekeningTitel, tekeningFiles, emailNotify))}
                disabled={loading || !tekeningTitel.trim() || tekeningFiles.length === 0}
                className="w-full py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: '#1A535C' }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Toevoegen'}
              </button>
            </div>
          )}

          {stap === 'afbeelding' && (
            <div className="p-4 space-y-3">
              <StapHeader titel="Afbeelding delen" onBack={() => setStap('menu')} />
              <input
                type="text"
                value={afbeeldingTitel}
                onChange={e => setAfbeeldingTitel(e.target.value)}
                placeholder="Titel (bijv. Situatiefoto)"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A535C]/30"
                style={{ borderColor: '#E8E6E1' }}
              />
              <div>
                <button
                  onClick={() => afbeeldingFileRef.current?.click()}
                  className="text-sm text-[#1A535C] hover:underline"
                >
                  + Afbeelding kiezen
                </button>
                <input
                  ref={afbeeldingFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    if (e.target.files?.[0]) setAfbeeldingFile(e.target.files[0])
                    e.target.value = ''
                  }}
                />
                {afbeeldingFile && (
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <span className="truncate">{afbeeldingFile.name}</span>
                    <button onClick={() => setAfbeeldingFile(null)}>
                      <X className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>
                )}
              </div>
              <EmailToggle checked={emailNotify} onChange={setEmailNotify} />
              <button
                onClick={() => handleAction(() => onAddAfbeelding(afbeeldingTitel, afbeeldingFile!, emailNotify))}
                disabled={loading || !afbeeldingTitel.trim() || !afbeeldingFile}
                className="w-full py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: '#1A535C' }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Toevoegen'}
              </button>
            </div>
          )}

          {stap === 'bericht' && (
            <div className="p-4 space-y-3">
              <StapHeader titel="Bericht versturen" onBack={() => setStap('menu')} />
              <textarea
                value={berichtTekst}
                onChange={e => setBerichtTekst(e.target.value)}
                placeholder="Typ uw bericht..."
                rows={3}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A535C]/30 resize-none"
                style={{ borderColor: '#E8E6E1' }}
              />
              <EmailToggle checked={emailNotify} onChange={setEmailNotify} />
              <button
                onClick={() => handleAction(() => onAddBericht(berichtTekst, emailNotify))}
                disabled={loading || !berichtTekst.trim()}
                className="w-full py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: '#1A535C' }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Versturen'}
              </button>
            </div>
          )}

          {loading && (
            <div className="absolute inset-0 bg-white/60 rounded-xl flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#1A535C' }} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MenuItem({ icon: Icon, label, sub, onClick, color }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  label: string
  sub: string
  onClick: () => void
  color: string
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="text-left">
        <p className="text-sm font-medium" style={{ color: '#191919' }}>{label}</p>
        <p className="text-xs" style={{ color: '#A0A098' }}>{sub}</p>
      </div>
    </button>
  )
}

function StapHeader({ titel, onBack }: { titel: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={onBack} className="text-xs text-gray-400 hover:text-gray-600">
        ← Terug
      </button>
      <span className="text-sm font-semibold" style={{ color: '#191919' }}>{titel}</span>
    </div>
  )
}

function EmailToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="rounded border-gray-300 text-[#1A535C] focus:ring-[#1A535C]"
      />
      <span className="text-xs" style={{ color: '#5A5A55' }}>Klant per email notificeren</span>
    </label>
  )
}
