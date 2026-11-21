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

  const tabs = ['Research', 'Resume Analyzer', 'Job Assistant', 'History']

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
          <h1>AI Hub</h1>
          <button type="button" className="button logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
        <div className="tabs-container">
          <div className="container tabs-scroll">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>
      <main>{renderContent()}</main>
      <ChatBot />
    </div>
  )
}

export default App
