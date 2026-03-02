'use client'

import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  panelName?: string
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

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div
          className="flex flex-col items-center justify-center h-full p-4 text-center"
          style={{ background: 'var(--bg-primary)' }}
        >
          <div
            className="text-sm font-medium mb-1"
            style={{ color: 'var(--error)' }}
          >
            {this.props.panelName
              ? `${this.props.panelName} error`
              : 'Something went wrong'}
          </div>
          <div className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-3 py-1 text-xs rounded"
            style={{
              background: 'var(--bg-hover)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
