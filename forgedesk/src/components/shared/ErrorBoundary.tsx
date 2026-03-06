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
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div role="alert" aria-live="assertive" className="flex flex-col items-center justify-center min-h-[40vh] px-4 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-foreground dark:text-white mb-2">
            Er is iets misgegaan
          </h2>
          <p className="text-muted-foreground dark:text-muted-foreground/60 max-w-md mb-2">
            Er is een onverwachte fout opgetreden. Probeer het opnieuw.
          </p>
          {this.state.error && (
            <p className="text-sm text-red-500 dark:text-red-400 mb-4 font-mono max-w-lg break-all">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleReset}
            aria-label="Opnieuw proberen"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Opnieuw proberen
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
