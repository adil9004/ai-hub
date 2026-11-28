import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    console.error('Error in tab:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    const { children } = this.props
    const { hasError, error, errorInfo } = this.state

    if (hasError) {
      const stackLines = errorInfo?.componentStack
        ?.split('\n')
        .slice(0, 5)
        .join('\n') || ''

      return (
        <div className="container">
          <div className="section" style={{ maxWidth: '700px', margin: '40px auto' }}>
            <h2 style={{ marginBottom: '16px', color: 'var(--danger)' }}>Something went wrong</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '16px', wordBreak: 'break-word' }}>
              {error?.message || 'An unexpected error occurred.'}
            </p>
            {stackLines && (
              <pre style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                fontSize: '11px',
                lineHeight: '1.5',
                color: 'var(--text-muted)',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                fontFamily: 'ui-monospace, Consolas, monospace'
              }}>
                {stackLines}
              </pre>
            )}
            <button className="button" onClick={this.handleReload}>
              Reload
            </button>
          </div>
        </div>
      )
    }

    return children
  }
}

export default ErrorBoundary