import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import './App.css'
import { authFetch } from './api'

function ResumeAnalyzer({ onAnalysisComplete }) {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await authFetch('/api/resume/analyze', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || `Request failed with status ${res.status}`)
      }

      const data = await res.json()
      setResult(data)
      if (onAnalysisComplete) {
        onAnalysisComplete(file)
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
        <input
          type="file"
          accept="application/pdf"
          className="input"
          onChange={(e) => setFile(e.target.files[0] || null)}
          disabled={loading}
        />

        <button
          type="button"
          className="button"
          onClick={handleSubmit}
          disabled={loading || !file}
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