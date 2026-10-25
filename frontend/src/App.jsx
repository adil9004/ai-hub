import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import './App.css'

function App() {
  const [topic, setTopic] = useState('')
  const [depth, setDepth] = useState('Quick')
  const [loading, setLoading] = useState(false)
  const [steps, setSteps] = useState([])
  const [report, setReport] = useState('')
  const [error, setError] = useState('')

  const isBusyError = (msg) =>
    msg && (msg.includes('503') || msg.includes('429'))

  const handleSubmit = async () => {
    if (!topic.trim()) return
    setLoading(true)
    setSteps([])
    setReport('')
    setError('')

    try {
      const res = await fetch('http://localhost:8000/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), depth }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || `Request failed with status ${res.status}`)
      }

      const data = await res.json()
      setSteps(data.steps || [])
      setReport(data.report || '')
    } catch (err) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>AI Research Agent</h1>

      <div className="form">
        <input
          type="text"
          className="input"
          placeholder="Enter a research topic..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit()
          }}
          disabled={loading}
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
          {(isBusyError(error) ? (
            <p style={{ margin: '0 0 6px', fontWeight: 600 }}>
              The AI model is busy right now. Please try again in a moment.
            </p>
          ) : (
            <p style={{ margin: '0 0 6px', fontWeight: 600 }}>An error occurred.</p>
          ))}
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

export default App
