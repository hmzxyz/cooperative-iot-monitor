import { useState } from 'react';
import { useAuth } from '../AuthContext.jsx';

export default function LoginPage() {
  const { login, loginAsTestAdmin, testAdmin } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    setError('');
    setAdminLoading(true);
    try {
      await loginAsTestAdmin();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdminLoading(false);
    }
  };

  const isBusy = loading || adminLoading;

  return (
    <div className="login-shell">
      <div className="login-card">
        <p className="eyebrow">Cooperative IoT Monitor</p>
        <h1>Sign In</h1>
        <p className="login-card__intro">Use your account or spin up a test admin in one click.</p>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="login-error">{error}</p>}
          <button className="primary-button" type="submit" disabled={isBusy}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
          <button
            className="secondary-button login-admin-button"
            type="button"
            onClick={handleAdminLogin}
            disabled={isBusy}
          >
            {adminLoading ? 'Preparing admin…' : 'Use Admin Test User'}
          </button>
          <p className="login-helper">
            Test credentials: <span>{testAdmin.username}</span> / <span>{testAdmin.password}</span>
          </p>
        </form>
      </div>
    </div>
  );
}
