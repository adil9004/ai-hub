import { useState } from 'react'
import './App.css'
import Auth from './Auth.jsx'
import Research from './Research.jsx'
import ResumeAnalyzer from './ResumeAnalyzer.jsx'
import JobAssistant from './JobAssistant.jsx'
import History from './History.jsx'
import ChatBot from './ChatBot.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'

function ComingSoon() {
  return (
    <div className="container">
      <div className="section">
        <h2>Coming soon</h2>
        <p style={{ color: 'var(--text-muted)' }}>This feature is currently under development.</p>
      </div>
    </div>
  )
}

function App() {
  const [token, setToken] = useState(() => {
    const stored = localStorage.getItem('auth_token')
    return stored || ''
  })
  const [authError, setAuthError] = useState('')
  const [activeTab, setActiveTab] = useState('Research')
  const [activeResume, setActiveResume] = useState(() => {
    try {
      const stored = localStorage.getItem('active_resume')
      if (!stored) return null
      const parsed = JSON.parse(stored)
      if (!parsed || !parsed.dataUrl || !parsed.name) return null
      
      const arr = parsed.dataUrl.split(',')
      const mime = arr[0].match(/:(.*?);/)[1]
      const bstr = atob(arr[1])
      let n = bstr.length
      const u8arr = new Uint8Array(n)
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n)
      }
      return new File([u8arr], parsed.name, { type: mime })
    } catch (e) {
      console.error('Failed to load resume from storage', e)
      return null
    }
  })

  const handleSetActiveResume = (file) => {
    setActiveResume(file)
    if (!file) {
      localStorage.removeItem('active_resume')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = {
          name: file.name,
          type: file.type || 'application/pdf',
          dataUrl: reader.result
        }
        localStorage.setItem('active_resume', JSON.stringify(data))
      } catch (e) {
        console.warn('Resume too large to persist or storage error', e)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleLogin = (newToken) => {
    setToken(newToken)
    setAuthError('')
    localStorage.setItem('auth_token', newToken)
  }

  const handleLogout = () => {
    setToken('')
    setAuthError('')
    localStorage.removeItem('auth_token')
    setActiveResume(null)
    localStorage.removeItem('active_resume')
  }

  if (!token) {
    return <Auth onLogin={handleLogin} initialError={authError} />
  }

  const tabs = [
    { id: 'Research', label: 'Research', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    )},
    { id: 'Resume Analyzer', label: 'Resume', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    )},
    { id: 'Job Assistant', label: 'Job Assistant', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    )},
    { id: 'History', label: 'History', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    )}
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'Research': 
        return (
          <ErrorBoundary>
            <Research />
          </ErrorBoundary>
        )
      case 'Resume Analyzer': 
        return (
          <ErrorBoundary>
            <ResumeAnalyzer activeResume={activeResume} setActiveResume={handleSetActiveResume} />
          </ErrorBoundary>
        )
      case 'Job Assistant': 
        return (
          <ErrorBoundary>
            <JobAssistant activeResume={activeResume} setActiveResume={handleSetActiveResume} />
          </ErrorBoundary>
        )
      case 'History': 
        return (
          <ErrorBoundary>
            <History />
          </ErrorBoundary>
        )
      default: 
        return (
          <ErrorBoundary>
            <ComingSoon />
          </ErrorBoundary>
        )
    }
  }

  return (
    <div className="app-wrapper">
      <header className="main-header">
        <div className="container header-container">
          <a href="/" className="logo" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="logo-mark">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0b0d12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <span className="logo-text">AI Hub</span>
          </a>
          <p className="tagline">Autonomous research and resume tools powered by AI</p>
          <div className="header-actions">
            <button type="button" className="button logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
        <div className="tabs-container">
          <div className="container tabs-scroll">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>
      <main>{renderContent()}</main>
      <ChatBot />
      <footer className="app-footer">
        <p className="footer-text">
          Built with FastAPI, React and Gemini •{' '}
          <a href="https://github.com/adil9004/ai-hub" target="_blank" rel="noopener noreferrer" className="footer-link">
            GitHub
          </a>
        </p>
      </footer>
    </div>
  )
}

export default App
