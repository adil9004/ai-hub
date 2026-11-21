import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import './App.css'
import { authFetch } from './api'

function ResumeAnalyzer({ activeResume, setActiveResume, onAnalysisComplete }) {
  const [loading, setLoading] = useState(false)
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
      setError(err.message || 'An error occurred')
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
            // Reset input to allow selecting same file again
            e.target.value = ''
          }}
          disabled={loading}
        />

        {activeResume ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '12px 14px',
            width: '100%'
          }}>
            <span style={{
              fontSize: '14px',
              color: 'var(--text)',
              wordBreak: 'break-word'
            }}>
              Using resume: {activeResume.name}
            </span>
            <button
              type="button"
              className="button"
              style={{
                alignSelf: 'auto',
                padding: '6px 14px',
                fontSize: '13px',
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text)'
              }}
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              Change resume
            </button>
          </div>
        ) : (
          <input
            type="file"
            accept="application/pdf"
            className="input"
            onChange={(e) => {
              const f = e.target.files[0] || null
              if (f && setActiveResume) {
                setActiveResume(f)
              }
            }}
            disabled={loading}
          />
        )}

        <button
          type="button"
          className="button"
          onClick={handleSubmit}
          disabled={loading || !activeResume}
        >
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>

      {loading && <p className="status">Analyzing your resume...</p>}

      {error && (
        <div className="error">
          <p style={{ margin: '0 0 6px', fontWeight: 600 }}>An error occurred.</p>
          <p style={{ margin: 0, fontSize: '12px', color: '#9aa3b2', wordBreak: 'break-word' }}>
            {error}
          </p>
        </div>
      )}

      {result && (
        <div className="section">
          <h2>Analysis Result</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>
            {result.filename}
          </p>
          <div className="report">
            <ReactMarkdown>{result.analysis_result}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}

export default ResumeAnalyzer