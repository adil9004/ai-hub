import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error in tab:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    const { children, fallback } = this.props
    const { hasError, error } = this.state

    if (hasError) {
      return (
        <div className="container">
          <div className="section">
            <h2>Something went wrong in this tab.</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>
              {error?.message || 'An unexpected error occurred.'}
            </p>
            <button className="button" onClick={this.handleRetry}>
              Retry
            </button>
          </div>
        </div>
      )
    }

    return children
  }
}

export default ErrorBoundary