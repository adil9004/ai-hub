import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import './App.css'
import { authFetch } from './api'

function JobAssistant({ activeResume, setActiveResume }) {
  const [jobDescription, setJobDescription] = useState('')
  const [loading, setLoading] = useState(false)
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
      setError(err.message)
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
          <textarea className="input" placeholder="Paste job description here..." value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} disabled={loading} style={{ resize: 'none', fontFamily: 'inherit', minHeight: '56px', overflowY: 'auto' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>Resume (PDF)</label>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="application/pdf" onChange={(e) => { const f = e.target.files[0]; if (f && setActiveResume) setActiveResume(f); e.target.value = ''; }} disabled={loading} />
          {activeResume ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 14px', width: '100%' }}>
              <span style={{ fontSize: '14px', color: 'var(--text)', wordBreak: 'break-word' }}>Using resume: {activeResume.name}</span>
              <button type="button" className="button" style={{ alignSelf: 'auto', padding: '6px 14px', fontSize: '13px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }} onClick={() => fileInputRef.current?.click()} disabled={loading}>Change resume</button>
            </div>
          ) : (
            <input type="file" accept="application/pdf" className="input" onChange={(e) => { const f = e.target.files[0] || null; if (f && setActiveResume) setActiveResume(f); }} disabled={loading} />
          )}
        </div>
        <button type="button" className="button" onClick={handleSubmit} disabled={loading || !activeResume || !jobDescription.trim()}>{loading ? 'Generating...' : 'Generate'}</button>
      </div>
      {loading && <p className="status">Running 4-step AI agent process...</p>}
      {error && (<div className="error"><p style={{ margin: '0 0 6px', fontWeight: 600 }}>An error occurred.</p><p style={{ margin: 0, fontSize: '12px', color: '#9aa3b2', wordBreak: 'break-word' }}>{error}</p></div>)}

      {result && (
        <div className="section">
          <h2>Job Assistant Result</h2>
          <div className="report">
            <ReactMarkdown>{result.result}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}

export default JobAssistant