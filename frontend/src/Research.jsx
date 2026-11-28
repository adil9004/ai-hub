import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import './App.css'
import { authFetch } from './api'
import { useSlowMessage } from './ui'

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
  const isSlow = useSlowMessage(loading, 6000)
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
      // Network or unexpected error
      setError('Server not responding, please try again')
    } finally {
      setLoading(false)
    }
  }

  const exampleTopics = [
    'AI agents in healthcare',
    'Future of renewable energy',
    'Quantum computing breakthroughs',
  ]

  const handleExampleClick = (example) => {
    setTopic(example)
    textareaRef.current?.focus()
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
        />

        <div className="example-chips">
          {exampleTopics.map((example, i) => (
            <button
              key={i}
              type="button"
              className="example-chip"
              onClick={() => handleExampleClick(example)}
              disabled={loading}
            >
              {example}
            </button>
          ))}
        </div>

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
          {loading ? (
            <>
              <Spinner />
              <span>
                {isSlow
                  ? "Still working. The server may be waking up..."
                  : "Generating..."}
              </span>
            </>
          ) : 'Run'}
        </button>
      </div>

      {loading && <p className="status">Researching...</p>}

      {error && (
        <div className="error">
          {isBusyError(error) ? (
            <p className="error-header">
              The AI model is busy right now. Please try again in a moment.
            </p>
          ) : (
            <p className="error-header">An error occurred.</p>
          )}
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

      {!loading && !error && !steps.length && !report && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
          <h3 className="empty-state-title">Start your research</h3>
          <p className="empty-state-text">Enter a topic above and choose Quick or Deep research mode.</p>
        </div>
      )}

      {steps.length > 0 && (
        <div className="section">
          <h2>Steps</h2>
          <div className="steps-timeline">
            {steps.map((step, i) => (
              <div key={i} className="step-item">
                <div className="step-dot">{i + 1}</div>
                <div className="step-content">
                  <p>{step}</p>
                </div>
              </div>
            ))}
          </div>
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