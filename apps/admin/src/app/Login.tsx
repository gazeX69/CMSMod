import { useState } from 'react';

interface LoginProps {
  onLoginSuccess: (user: { id: number; username: string; email: string }) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000';
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ usernameOrEmail, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Connection to authentication server failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Background blobs for premium glowing aesthetic */}
      <div className="bg-blob blob-purple"></div>
      <div className="bg-blob blob-cyan"></div>

      <div className="login-card glass">
        <div className="login-header">
          <span className="login-logo-icon">⚡</span>
          <h2>Welcome to Modern CMS</h2>
          <p className="login-subtitle">Sign in to manage your site configuration</p>
        </div>

        {error && (
          <div className="login-error-box">
            <span className="err-icon">⚠️</span>
            <span className="err-msg">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="usernameOrEmail">Username or Email</label>
            <input
              type="text"
              id="usernameOrEmail"
              placeholder="Enter your username or email"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? (
              <div className="login-spinner-container">
                <div className="mini-spinner"></div>
                <span>Signing in...</span>
              </div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>Demo credentials: <code>admin</code> / <code>adminpassword123</code></p>
        </div>
      </div>
    </div>
  );
}
