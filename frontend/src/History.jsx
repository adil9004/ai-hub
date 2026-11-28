import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import './App.css'
import { authFetch } from './api'

function History() {
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await authFetch('/api/resume/history')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || `Request failed with status ${res.status}`)
      }
      const data = await res.json()
      setAnalyses(data)
    } catch (err) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      const res = await authFetch(`/api/resume/history/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || `Request failed with status ${res.status}`)
      }
      setAnalyses((prev) => prev.filter((a) => a.id !== id))
      if (expandedId === id) setExpandedId(null)
    } catch (err) {
      setError(err.message || 'An error occurred')
    }
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>History</h1>
      </div>

      {loading && <p className="status">Loading history...</p>}

      {error && (
        <div className="error">
          <p className="error-header">An error occurred.</p>
          <p className="error-detail">{error}</p>
        </div>
      )}

      {!loading && analyses.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <h3 className="empty-state-title">No analyses yet</h3>
          <p className="empty-state-text">Run your first analysis from the Resume Analyzer tab.</p>
        </div>
      )}

      <div className="history-list">
        {analyses.map((a) => (
          <div className="history-card" key={a.id}>
            <div className="history-card-header">
              <div>
                <h3 className="history-title">{a.filename}</h3>
                <span className="history-badge">{new Date(a.timestamp).toLocaleString()}</span>
              </div>
              <div className="history-actions">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                >
                  {expandedId === a.id ? 'Hide' : 'View'}
                </button>
                <button
                  type="button"
                  className="button danger-btn"
                  onClick={() => handleDelete(a.id)}
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                >
                  Delete
                </button>
              </div>
            </div>
            {expandedId === a.id && (
              <div className="history-card-content">
                <div className="glass-card">
                  <ReactMarkdown>{a.analysis_result}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default History