import { useState } from 'react'
import './App.css'
import Auth from './Auth.jsx'
import Research from './Research.jsx'
import ResumeAnalyzer from './ResumeAnalyzer.jsx'
import JobAssistant from './JobAssistant.jsx'
import History from './History.jsx'
import ChatBot from './ChatBot.jsx'

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

  const handleLogin = (newToken) => {
    setToken(newToken)
    setAuthError('')
    localStorage.setItem('auth_token', newToken)
  }

  const handleLogout = () => {
    setToken('')
    setAuthError('')
    localStorage.removeItem('auth_token')
  }

  if (!token) {
    return <Auth onLogin={handleLogin} initialError={authError} />
  }

  const tabs = ['Research', 'Resume Analyzer', 'Job Assistant', 'History']

  const renderContent = () => {
    switch (activeTab) {
      case 'Research': return <Research />
      case 'Resume Analyzer': return <ResumeAnalyzer />
      case 'Job Assistant': return <JobAssistant />
      case 'History': return <History />
      default: return <ComingSoon />
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
