import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import './App.css'
import { authFetch } from './api'

function JobAssistant() {
  const [file, setFile] = useState(null)
  const [jobDescription, setJobDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!file || !jobDescription.trim()) return
    setLoading(true)
    setError('')
    setResults(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('job_description', jobDescription.trim())

    try {
      const res = await authFetch('/api/resume/job-assistant', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || `Request failed with status ${res.status}`)
      }

      const data = await res.json()
      setResults(data)
    } catch (err) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>Job Assistant</h1>
      </div>

      <div className="form">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
            Job Description
          </label>
          <textarea
            className="input"
            rows={8}
            placeholder="Paste job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            disabled={loading}
            style={{ resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
            Resume (PDF)
          </label>
          <input
            type="file"
            accept="application/pdf"
            className="input"
            onChange={(e) => setFile(e.target.files[0] || null)}
            disabled={loading}
          />
        </div>

        <button
          type="button"
          className="button"
          onClick={handleSubmit}
          disabled={loading || !file || !jobDescription.trim()}
        >
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {loading && <p className="status">Running 4-step AI agent process (analyzing job, comparing resume, crafting cover letter, and formulating bullet points)...</p>}

      {error && (
        <div className="error">
          <p style={{ margin: '0 0 6px', fontWeight: 600 }}>An error occurred.</p>
          <p style={{ margin: 0, fontSize: '12px', color: '#9aa3b2', wordBreak: 'break-word' }}>
            {error}
          </p>
        </div>
      )}

      {results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '24px' }}>
          {results.step1 && (
            <div className="section">
              <h2>Step 1: Job Description Analysis</h2>
              <div className="report">
                <ReactMarkdown>{results.step1}</ReactMarkdown>
              </div>
            </div>
          )}

          {results.step2 && (
            <div className="section">
              <h2>Step 2: Resume Match & Gap Analysis</h2>
              <div className="report">
                <ReactMarkdown>{results.step2}</ReactMarkdown>
              </div>
            </div>
          )}

          {results.step3 && (
            <div className="section">
              <h2>Step 3: Tailored Cover Letter</h2>
              <div className="report">
                <ReactMarkdown>{results.step3}</ReactMarkdown>
              </div>
            </div>
          )}

          {results.step4 && (
            <div className="section">
              <h2>Step 4: Actionable Resume Bullet Edits</h2>
              <div className="report">
                <ReactMarkdown>{results.step4}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default JobAssistant
