import { useState, useEffect } from 'react'

export function Spinner() {
  return (
    <div style={{
      display: 'inline-block',
      width: '18px',
      height: '18px',
      border: '2px solid var(--border)',
      borderTopColor: 'var(--accent)',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    }} />
  )
}

export function useSlowMessage(loading, delayMs) {
  const [showMessage, setShowMessage] = useState(false)

  useEffect(() => {
    if (!loading) {
      setShowMessage(false)
      return
    }

    const timer = setTimeout(() => {
      setShowMessage(true)
    }, delayMs)

    return () => clearTimeout(timer)
  }, [loading, delayMs])

  return showMessage
}