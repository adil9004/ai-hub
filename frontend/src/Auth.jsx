import { useState } from 'react';
import './App.css';
import { API_URL } from './api';

function Auth({ onLogin, initialError }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initialError || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const endpoint = isLogin ? `${API_URL}/api/login` : `${API_URL}/api/register`;

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
      <div className="form auth-card">
        <h1 style={{ textAlign: 'center', marginBottom: '24px' }}>{isLogin ? 'Sign In' : 'Sign Up'}</h1>

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
            <div className="error" style={{ marginBottom: '16px' }}>
              <p style={{ margin: '0', fontWeight: '600' }}>
                {error}
              </p>
            </div>
          )}

          <button
            type="submit"
            className="button"
            disabled={isLoading || !username || !password}
            style={{ width: '100%' }}
          >
            {isLoading ? 'Loading...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="auth-toggle">
          <button
            type="button"
            onClick={toggleMode}
            disabled={isLoading}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Auth;