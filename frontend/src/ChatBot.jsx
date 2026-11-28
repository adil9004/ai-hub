import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import './App.css'
import { authFetch } from './api'

function ChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Hello! Ask me anything.', isApi: false }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading, error])

  const greetingMap = {
    'hi': 'Hi! How can I help you today?',
    'hii': 'Hi! How can I help you today?',
    'hiiii': 'Hi! How can I help you today?',
    'hello': 'Hello! How can I help you today?',
    'hey': 'Hey! How can I help you today?',
    'thanks': "You're welcome!",
    'thank you': "You're welcome!",
    'ok': 'Okay! What else can I do for you?',
    'okay': 'Okay! What else can I do for you?',
    'bye': 'Goodbye! Feel free to come back anytime.',
    'how are you': "I'm doing great, how can I help you?",
  }

  const normalizePhrase = (txt) => {
    if (typeof txt !== 'string') return ''
    return txt
      .trim()
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\\-_`~()]/g, '')
      .split(/\s+/)
      .map((w) => (w === 'u' ? 'you' : w))
      .filter(Boolean)
      .join(' ')
  }

  const handleClear = () => {
    setMessages([{ role: 'ai', content: 'Hello! Ask me anything.', isApi: false }])
    setError('')
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessageContent = input.trim()
    const normalized = normalizePhrase(userMessageContent)

    // Check for local reply
    if (greetingMap[normalized]) {
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: userMessageContent, isApi: false },
        { role: 'ai', content: greetingMap[normalized], isApi: false }
      ])
      setInput('')
      return
    }

    const userMessage = { role: 'user', content: userMessageContent, isApi: true }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setError('')

    try {
      const apiHistory = messages
        .filter((m) => m.isApi)
        .map((m) => ({ role: m.role, content: m.content }))
        .slice(-6)

      const res = await authFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessageContent,
          history: apiHistory
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data.detail) {
          if (typeof data.detail === 'string') {
            throw new Error(data.detail)
          } else {
            throw new Error(JSON.stringify(data.detail))
          }
        }
        throw new Error('Something went wrong, try again')
      }

      const data = await res.json()
      setMessages((prev) => [...prev, { role: 'ai', content: data.reply, isApi: true }])
    } catch (err) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button className="chat-fab" onClick={() => setIsOpen(true)} aria-label="Open chat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    )
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div className="chat-header-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          AI Assistant
        </div>
        <div className="chat-header-actions">
          <button type="button" className="chat-clear-btn" onClick={handleClear} title="Clear chat" aria-label="Clear chat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
          <button type="button" className="chat-close-btn" onClick={() => setIsOpen(false)} aria-label="Close chat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
      <div className="chat-messages">
        {messages.map((m, i) => {
          if (m.role === 'user') {
            return (
              <div key={i} className="message user">
                <div className="message-avatar">U</div>
                <div className="message-bubble">{m.content}</div>
              </div>
            )
          }
          // Assistant messages use react-markdown
          return (
            <div key={i} className="message ai">
              <div className="message-avatar">AI</div>
              <div className="message-bubble">
                <ReactMarkdown
                  children={m.content}
                  className="markdown-content"
                  components={{
                    a: (props) => (
                      <a {...props} target="_blank" rel="noopener noreferrer">
                        {props.children}
                      </a>
                    ),
                    code: (props) => (
                      <code {...props} />
                    ),
                    pre: (props) => (
                      <pre {...props} />
                    )
                  }}
                />
              </div>
            </div>
          )
        })}
        {loading && (
          <div className="message ai">
            <div className="message-avatar">AI</div>
            <div className="message-bubble">Typing...</div>
          </div>
        )}
        {error && (
          <div className="message error">
            <div className="message-bubble">{error}</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask a question..."
          disabled={loading}
        />
        <button className="button" onClick={handleSend} disabled={loading || !input.trim()}>Send</button>
      </div>
    </div>
  )
}

export default ChatBot