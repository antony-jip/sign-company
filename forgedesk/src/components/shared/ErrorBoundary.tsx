import React, { Component, ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { logger } from '../../utils/logger'
import { isChunkLoadError, probeerHerstelNaChunkFout } from '../../utils/chunkErrorHandler'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  herlaadt: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, herlaadt: false }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('ErrorBoundary caught an error:', error, errorInfo)

    // Bij chunk-load failure: nieuwe deploy actief, oude bundle stale. De
    // handler herlaadt zelf en zegt of dat lukt; zolang die reload loopt tonen
    // we geen foutscherm, want dat flikkert alleen maar voorbij.
    if (probeerHerstelNaChunkFout(error)) {
      this.setState({ herlaadt: true })
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, herlaadt: false })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.state.herlaadt) {
        return (
          <div role="status" aria-live="polite" className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center bg-background">
            <div className="w-8 h-8 border-2 border-petrol/20 border-t-petrol rounded-full animate-spin mb-4" />
            <p className="text-sm text-foreground/70">Nieuwe versie laden<span className="text-flame">.</span></p>
          </div>
        )
      }

      if (this.props.fallback) {
        return this.props.fallback
      }

      const isStaleBundle = isChunkLoadError(this.state.error)

      return (
        <div role="alert" aria-live="assertive" className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center bg-background">
          <div className="w-14 h-14 bg-[hsl(var(--status-flame-bg))] rounded-2xl flex items-center justify-center mb-5">
            <AlertTriangle className="w-7 h-7 text-[#C0451A]" />
          </div>
          <h2 className="text-xl font-bold text-foreground tracking-[-0.3px] mb-2">
            {isStaleBundle ? (
              <>Er staat een nieuwe versie klaar<span className="text-flame">.</span></>
            ) : (
              <>Er is iets misgegaan<span className="text-flame">.</span></>
            )}
          </h2>
          <p className="text-sm text-foreground/70 max-w-md mb-5">
            {isStaleBundle
              ? 'Deze pagina draait nog op een oudere versie van doen. Herlaad om verder te gaan.'
              : 'Er is een onverwachte fout opgetreden. Probeer het opnieuw of herlaad de pagina.'}
          </p>
          {!isStaleBundle && this.state.error && (
            <p className="text-xs text-[#C0451A] mb-5 font-mono max-w-lg break-all bg-[hsl(var(--status-flame-bg))]/50 px-3 py-2 rounded-lg -mt-1">
              {this.state.error.message}
            </p>
          )}
          <div className="flex items-center gap-3">
            {/* Bij een stale bundle heeft "opnieuw proberen" geen zin: React.lazy
                onthoudt de mislukte import en probeert die nooit opnieuw. */}
            {isStaleBundle ? (
              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-petrol text-white text-sm font-medium rounded-lg hover:bg-[#164850] transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Pagina herladen
              </button>
            ) : (
              <>
                <button
                  onClick={this.handleReset}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-petrol text-white text-sm font-medium rounded-lg hover:bg-[#164850] transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Opnieuw proberen
                </button>
                <button
                  onClick={this.handleReload}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-foreground/70 border border-border rounded-lg hover:bg-background transition-colors"
                >
                  Pagina herladen
                </button>
              </>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
