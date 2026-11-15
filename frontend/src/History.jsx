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
          <p style={{ margin: '0 0 6px', fontWeight: 600 }}>An error occurred.</p>
          <p style={{ margin: 0, fontSize: '12px', color: '#9aa3b2', wordBreak: 'break-word' }}>
            {error}
          </p>
        </div>
      )}

      {!loading && analyses.length === 0 && (
        <div className="section">
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            No analyses yet. Run your first analysis from the Resume Analyzer tab.
          </p>
        </div>
      )}

      <div className="history-list">
        {analyses.map((a) => (
          <div className="section history-item" key={a.id}>
            <div className="history-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '16px' }}>{a.filename}</h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                  {new Date(a.timestamp).toLocaleString()}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="tab"
                  onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                >
                  {expandedId === a.id ? 'Hide' : 'View'}
                </button>
                <button
                  type="button"
                  className="button danger-btn"
                  onClick={() => handleDelete(a.id)}
                >
                  Delete
                </button>
              </div>
            </div>
            {expandedId === a.id && (
              <div className="report" style={{ marginTop: '16px' }}>
                <ReactMarkdown>{a.analysis_result}</ReactMarkdown>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default History