import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import './App.css'
import { authFetch } from './api'
import { useSlowMessage } from './ui'

function JobAssistant({ activeResume, setActiveResume }) {
  const [jobDescription, setJobDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const isSlow = useSlowMessage(loading, 6000)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const fileInputRef = useRef(null)

  const handleSubmit = async () => {
    if (!activeResume || !jobDescription.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    const formData = new FormData()
    formData.append('file', activeResume)
    formData.append('job_description', jobDescription.trim())
    try {
      const res = await authFetch('/api/resume/job-assistant', { method: 'POST', body: formData })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || 'Request failed with status ' + res.status)
      }
      const data = await res.json()
      setResult(data)
    } catch (err) {
      // Network or unexpected error
      setError('Server not responding, please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="page-header"><h1>Job Assistant</h1></div>
      <div className="form">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>Job Description</label>
          <textarea className="input" placeholder="Paste job description here..." value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} disabled={loading} />
        </div>

        <div className="example-chips">
          <button
            type="button"
            className="example-chip"
            onClick={() => setJobDescription('Senior Software Engineer - React/Node.js. 5+ years experience building scalable web applications. Strong TypeScript, React, Node.js, PostgreSQL. Experience with AWS, Docker, CI/CD. Must have led teams of 3+ engineers.')}
            disabled={loading}
          >
            Senior Software Engineer example
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>Resume (PDF)</label>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="application/pdf" onChange={(e) => { const f = e.target.files[0]; if (f && setActiveResume) setActiveResume(f); e.target.value = ''; }} disabled={loading} />
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
            <input type="file" accept="application/pdf" className="input" onChange={(e) => { const f = e.target.files[0] || null; if (f && setActiveResume) setActiveResume(f); }} disabled={loading} />
          )}
        </div>
        <button type="button" className="button" onClick={handleSubmit} disabled={loading || !activeResume || !jobDescription.trim()}>
          {loading ? (
            <>
              <Spinner />
              <span>
                {isSlow
                  ? "Still working. The server may be waking up..."
                  : "Generating..."}
              </span>
            </>
          ) : 'Generate'}</button>
      </div>
      {loading && <p className="status">Running 4-step AI agent process...</p>}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2>Job Assistant Result</h2>
            <button
              type="button"
              className="copy-btn"
              onClick={(e) => {
                navigator.clipboard.writeText(result.result)
                const btn = e.currentTarget
                btn.classList.add('copied')
                btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied'
                setTimeout(() => {
                  btn.classList.remove('copied')
                  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy'
                }, 2000)
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              Copy
            </button>
          </div>
          <div className="glass-card">
            <ReactMarkdown>{result.result}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}

export default JobAssistant