import React from 'react'

interface State {
  hasError: boolean
  error: Error | null
}

interface Props {
  children?: React.ReactNode
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: any) {
    // Log to console for dev
    console.error('[ErrorBoundary] error', error, info)
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div style={{ padding: 24, color: 'var(--color-text-primary)', background: 'var(--color-app-bg)', height: '100vh', boxSizing: 'border-box' }}>
          <h2 style={{ marginTop: 0 }}>An unexpected error occurred</h2>
          <pre style={{ whiteSpace: 'pre-wrap', color: 'var(--color-text-secondary)' }}>{this.state.error.message}</pre>
          <details style={{ color: 'var(--color-text-muted)', marginTop: 12 }}>
            <summary>Stack trace</summary>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error.stack}</pre>
          </details>
        </div>
      )
    }

    return this.props.children
  }
}
