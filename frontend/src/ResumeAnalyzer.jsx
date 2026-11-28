import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import './App.css'
import { authFetch } from './api'
import { useSlowMessage } from './ui'

function ResumeAnalyzer({ activeResume, setActiveResume, onAnalysisComplete }) {
  const [loading, setLoading] = useState(false)
  const isSlow = useSlowMessage(loading, 6000)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const handleSubmit = async () => {
    if (!activeResume) return
    setLoading(true)
    setError('')
    setResult(null)

    const formData = new FormData()
    formData.append('file', activeResume)

    try {
      const res = await authFetch('/api/resume/analyze', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || 'Request failed with status ' + res.status)
      }

      const data = await res.json()
      setResult(data)
      if (onAnalysisComplete) {
        onAnalysisComplete(activeResume)
      }
    } catch (err) {
      // Network or unexpected error
      setError('Server not responding, please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>Resume Analyzer</h1>
      </div>

      <div className="form">
        {/* Hidden file input for "Change resume" */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="application/pdf"
          onChange={(e) => {
            const f = e.target.files[0]
            if (f && setActiveResume) {
              setActiveResume(f)
            }
            e.target.value = ''
          }}
          disabled={loading}
        />

        {activeResume ? (
          <div className="file-selected">
            <div className="file-selected-info">
              <div className="file-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <span className="file-name">{activeResume.name}</span>
            </div>
            <button
              type="button"
              className="file-change-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              Change resume
            </button>
          </div>
        ) : (
          <div className="drop-zone" onClick={() => fileInputRef.current?.click()}>
            <div className="drop-zone-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="drop-zone-text">Click to choose a PDF</p>
            <p className="drop-zone-hint">Or drag and drop</p>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const f = e.target.files[0] || null
                if (f && setActiveResume) {
                  setActiveResume(f)
                }
              }}
              disabled={loading}
            />
          </div>
        )}

        <button
          type="button"
          className="button"
          onClick={handleSubmit}
          disabled={loading || !activeResume}
        >
          {loading ? (
            <>
              <Spinner />
              <span>
                {isSlow
                  ? "Still working. The server may be waking up..."
                  : "Analyzing..."}
              </span>
            </>
          ) : 'Analyze'}
        </button>
      </div>

      {loading && <p className="status">Analyzing your resume...</p>}

      {error && (
        <div className="error">
          <p className="error-header">An error occurred.</p>
          <p className="error-detail">{error}</p>
          {error === 'Server not responding, please try again' && (
            <button
              type="button"
              className="button"
              style={{ alignSelf: 'flex-start', padding: '8px 14px', fontSize: '13px' }}
              onClick={(e) => { e.preventDefault(); handleSubmit(); }}
            >
              Retry
            </button>
          )}
        </div>
      )}

      {result && (
        <div className="section">
          <h2>Analysis Result</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>
            {result.filename}
          </p>
          {result.score !== undefined && (
            <div className="score-display">
              <div className="score-ring">
                <svg viewBox="0 0 80 80">
                  <defs>
                    <linearGradient id="score-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#6ea8fe" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                  <circle
                    className="score-ring-bg"
                    cx="40"
                    cy="40"
                    r="34"
                  />
                  <circle
                    className="score-ring-progress"
                    cx="40"
                    cy="40"
                    r="34"
                    strokeDasharray={213.6}
                    strokeDashoffset={213.6 * (1 - (result.score / 100))}
                  />
                  <text className="score-ring-text" x="40" y="40">{result.score}</text>
                </svg>
              </div>
              <div className="score-info">
                <p className="score-label">Overall Score</p>
                <p className="score-value">{result.score}/100</p>
              </div>
            </div>
          )}
          <div className="glass-card">
            <ReactMarkdown>{result.analysis_result}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}

export default ResumeAnalyzer