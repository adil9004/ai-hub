import { useState, useEffect } from 'react';
import './App.css';
import { API_URL } from './api';
import { Spinner, useSlowMessage } from './ui';

function Auth({ onLogin, initialError }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initialError || '');
  const [isLoading, setIsLoading] = useState(false);
  const isSlow = useSlowMessage(isLoading, 4000);

  // Wake server on mount
  useEffect(() => {
    fetch(`${API_URL}/api/health`).catch(() => {});
  }, []);

  const handleSubmit = async (e, useDemoUser = false) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const endpoint = isLogin ? `${API_URL}/api/login` : `${API_URL}/api/register`;

    if (useDemoUser) {
      // Use demo credentials for the demo button
      const demoRequestBody = { username: 'demo', password: 'demo1234' };
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(demoRequestBody),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          setError('Demo account not available');
          setIsLoading(false);
          return;
        }

        if (data.token) {
          onLogin(data.token);
        }
      } catch (err) {
        setError('Server not responding, please try again');
        setIsLoading(false);
        return;
      }
    }

    const requestBody = { username, password };

    if (!isLogin && (username.length < 3 || username.length > 30)) {
      setError('Username must be 3 to 30 characters');
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError(isLogin ? 'Invalid username or password' : 'Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401 && isLogin) {
          setError('Invalid username or password');
        } else if (response.status === 409 && !isLogin) {
          setError('That username is taken');
        } else {
          setError(data.detail || (isLogin ? 'Login failed' : 'Registration failed'));
        }
        return;
      }

      if (data.token) {
        onLogin(data.token);
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setUsername('');
    setPassword('');
    setError('');
  };

  return (
    <div className="auth-container">
      <div className="auth-hero">
        <h1>Research faster. Land the job.</h1>
        <p className="subtitle">Autonomous AI agents that research topics, analyze resumes, and match you to jobs — all in one place.</p>
      </div>
      <div className="form auth-card">
        <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>{isLogin ? 'Sign In' : 'Sign Up'}</h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <input
              type="text"
              className="input"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <input
              type="password"
              className="input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          {error && (
            <div className="error">
              <p className="error-header">{error}</p>
              {error === 'Server not responding, please try again' && (
                <button
                  type="button"
                  className="button"
                  style={{ alignSelf: 'flex-start', padding: '8px 14px', fontSize: '13px' }}
                  onClick={(e) => handleSubmit(e, false)}
                >
                  Retry
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            className="button"
            disabled={isLoading || !username || !password}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {isLoading ? (
              <>
                <Spinner />
                <span>
                  {isSlow
                    ? "Waking up the server. This can take up to a minute on the free plan. Please wait..."
                    : "Connecting to server..."}
                </span>
              </>
            ) : (
              isLogin ? 'Sign In' : 'Sign Up'
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            type="button"
            disabled={isLoading}
            onClick={(e) => {
              if (!isLoading) handleSubmit(e, true);
            }}
            className="button"
            style={{ width: '100%', background: 'var(--gradient-primary)', color: '#0b0d12', border: 'none' }}
          >
            Try Demo Account
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)', opacity: 0.6 }}>
          Shared demo account: please don't upload personal documents. Data may reset.
        </p>

        <div className="auth-toggle">
          <button
            type="button"
            onClick={toggleMode}
            disabled={isLoading}
            className="button-ghost"
          >
            {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
          </button>
        </div>

        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </div>
            <h4>Research Agent</h4>
            <p>Deep-dive research with multi-step reasoning and citations.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <h4>Resume Analyzer</h4>
            <p>AI-powered resume scoring and detailed feedback.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </div>
            <h4>Job Assistant</h4>
            <p>Match your resume to job descriptions and get tailored advice.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Auth;