import React, { Component, ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { logger } from '../../utils/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

// Detecteer of de error een Vite chunk-load failure is. Dit gebeurt na een
// Vercel deploy: de browser heeft een oude bundle vast en probeert chunks
// op te halen waarvan de hash niet meer bestaat op de server.
function isChunkLoadError(error: Error | null): boolean {
  if (!error) return false
  const msg = error.message || ''
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Loading chunk') ||
    msg.includes('Loading CSS chunk') ||
    msg.includes('error loading dynamically imported module') ||
    /ChunkLoadError/i.test(error.name)
  )
}

// Gebruik dezelfde key als de globale handler in main.tsx zodat de cleanup
// daar ook deze boundary unblockt na een succesvolle mount.
const RELOAD_KEY = 'forgedesk_chunk_reload_attempted'

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('ErrorBoundary caught an error:', error, errorInfo)

    // Bij chunk-load failure: nieuwe deploy actief, oude bundle stale.
    // Eén keer automatisch reloaden om de nieuwe bundle binnen te halen.
    // sessionStorage flag voorkomt een reload loop als de echte oorzaak
    // server-side iets anders is.
    if (isChunkLoadError(error)) {
      try {
        const alreadyReloaded = sessionStorage.getItem(RELOAD_KEY)
        if (!alreadyReloaded) {
          sessionStorage.setItem(RELOAD_KEY, Date.now().toString())
          logger.warn('Chunk-load error gedetecteerd — pagina wordt herladen voor nieuwe bundle')
          window.location.reload()
        }
      } catch {
        // sessionStorage kan falen (private mode, etc) — gewoon reloaden
        window.location.reload()
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div role="alert" aria-live="assertive" className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center bg-[#F8F7F5]">
          <div className="w-14 h-14 bg-[#FDE8E4] rounded-2xl flex items-center justify-center mb-5">
            <AlertTriangle className="w-7 h-7 text-[#C0451A]" />
          </div>
          <h2 className="text-xl font-bold text-[#1A1A1A] tracking-[-0.3px] mb-2">
            Er is iets misgegaan<span className="text-[#F15025]">.</span>
          </h2>
          <p className="text-sm text-[#6B6B66] max-w-md mb-2">
            Er is een onverwachte fout opgetreden. Probeer het opnieuw of herlaad de pagina.
          </p>
          {this.state.error && (
            <p className="text-xs text-[#C0451A] mb-5 font-mono max-w-lg break-all bg-[#FDE8E4]/50 px-3 py-2 rounded-lg">
              {this.state.error.message}
            </p>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1A535C] text-white text-sm font-medium rounded-lg hover:bg-[#164850] transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Opnieuw proberen
            </button>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-[#6B6B66] border border-[#EBEBEB] rounded-lg hover:bg-[#F8F7F5] transition-colors"
            >
              Pagina herladen
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
