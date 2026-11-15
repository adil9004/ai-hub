import { useState, useRef, useEffect } from 'react'
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
    return txt
      .trim()
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '')
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
      <button className="chat-fab" onClick={() => setIsOpen(true)}>
        {'\u{1F4AC}'}
      </button>
    )
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <span>AI Assistant</span>
        <div className="chat-header-actions">
          <button type="button" className="chat-clear-btn" onClick={handleClear} title="Clear chat">Clear</button>
          <button type="button" className="chat-close-btn" onClick={() => setIsOpen(false)}>×</button>
        </div>
      </div>
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role}`}>{m.content}</div>
        ))}
        {loading && <div className="message ai">Typing...</div>}
        {error && <div className="message error">{error}</div>}
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
        <button onClick={handleSend} disabled={loading || !input.trim()}>Send</button>
      </div>
    </div>
  )
}

export default ChatBot
