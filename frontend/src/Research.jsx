import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import './App.css'
import { authFetch } from './api'

// Check if the error message indicates the AI service is busy
function isBusyError(errorMessage) {
  if (typeof errorMessage !== 'string') return false
  const lower = errorMessage.toLowerCase()
  return lower.includes('busy') || 
         lower.includes('429') || 
         lower.includes('503') || 
         lower.includes('unavailable') ||
         lower.includes('resource_exhausted')
}

function Research() {
  const [topic, setTopic] = useState('')
  const [depth, setDepth] = useState('Quick')
  const [loading, setLoading] = useState(false)
  const [steps, setSteps] = useState([])
  const [report, setReport] = useState('')
  const [error, setError] = useState('')
  const textareaRef = useRef(null)

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 320)}px`
    }
  }

  useEffect(() => {
    adjustHeight()
  }, [topic])

  const handleSubmit = async () => {
    if (!topic.trim()) return
    setLoading(true)
    setSteps([])
    setReport('')
    setError('')

    try {
      const res = await authFetch('/api/research', {
        method: 'POST',
        body: JSON.stringify({ topic: topic.trim(), depth }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const detail = data.detail
        const errorMsg = typeof detail === 'string' 
          ? detail 
          : (detail ? JSON.stringify(detail) : `Request failed with status ${res.status}`)
        throw new Error(errorMsg)
      }

      const data = await res.json()
      setSteps(data.steps || [])
      const reportValue = data.report
      setReport(typeof reportValue === 'string' ? reportValue : '')
    } catch (err) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>AI Research Agent</h1>
      </div>

      <div className="form">
        <textarea
          ref={textareaRef}
          className="input"
          placeholder="Enter a research topic..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          disabled={loading}
          style={{ 
            resize: 'none', 
            fontFamily: 'inherit', 
            minHeight: '56px',
            overflowY: 'auto' 
          }}
        />

        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="depth"
              value="Quick"
              checked={depth === 'Quick'}
              onChange={() => setDepth('Quick')}
              disabled={loading}
            />
            Quick
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="depth"
              value="Deep"
              checked={depth === 'Deep'}
              onChange={() => setDepth('Deep')}
              disabled={loading}
            />
            Deep
          </label>
        </div>

        <button
          type="button"
          className="button"
          onClick={handleSubmit}
          disabled={loading || !topic.trim()}
        >
          {loading ? 'Researching...' : 'Run'}
        </button>
      </div>

      {loading && <p className="status">Researching...</p>}

      {error && (
        <div className="error">
          {isBusyError(error) ? (
            <p style={{ margin: '0 0 6px', fontWeight: 600 }}>
              The AI model is busy right now. Please try again in a moment.
            </p>
          ) : (
            <p style={{ margin: '0 0 6px', fontWeight: 600 }}>An error occurred.</p>
          )}
          <p style={{ margin: 0, fontSize: '12px', color: '#9aa3b2', wordBreak: 'break-word' }}>
            {error}
          </p>
        </div>
      )}

      {steps.length > 0 && (
        <div className="section">
          <h2>Steps</h2>
          <ul className="steps-list">
            {steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ul>
        </div>
      )}

      {report && (
        <div className="section">
          <h2>Report</h2>
          <div className="report">
            <ReactMarkdown>{report}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}

export default Research