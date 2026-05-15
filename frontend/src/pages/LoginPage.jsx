import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const EMPTY_RESET = {
  email: '',
  securityQuestion: '',
  securityAnswer: '',
  newPassword: '',
};

export default function LoginPage() {
  const { login, getPasswordResetQuestion, resetPassword } = useAuth();
  const [view, setView] = useState('signin');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [resetForm, setResetForm] = useState(EMPTY_RESET);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const setCurrentView = (nextView) => {
    setView(nextView);
    setError('');
    setMessage('');
    if (nextView !== 'reset') {
      setResetForm(EMPTY_RESET);
    }
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await login(loginEmail.trim(), loginPassword);
      setMessage('Logged in successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSecurityQuestion = async () => {
    const normalizedEmail = resetForm.email.trim();
    if (!normalizedEmail) {
      setError('Enter your email first.');
      return;
    }

    setError('');
    setMessage('');
    setLoading(true);
    try {
      const response = await getPasswordResetQuestion(normalizedEmail);
      setResetForm((prev) => ({
        ...prev,
        email: normalizedEmail,
        securityQuestion: response.security_question,
        securityAnswer: '',
        newPassword: '',
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await resetPassword({
        email: resetForm.email.trim(),
        securityAnswer: resetForm.securityAnswer.trim(),
        newPassword: resetForm.newPassword,
      });
      setMessage('Password updated successfully. Sign in.');
      setLoginEmail(resetForm.email.trim());
      setResetForm(EMPTY_RESET);
      setView('signin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const viewText = useMemo(() => {
    if (view === 'reset') {
      return {
        title: 'Password Recovery',
        intro: 'Load your security question, then set a new password.',
      };
    }
    return {
      title: 'Technician Sign In',
      intro: 'Use your technician account to access the MES dashboard.',
    };
  }, [view]);

  return (
    <div className="login-shell">
      <div className="login-card">
        <p className="eyebrow">IoT Cooperative Monitor</p>
        <h1>{viewText.title}</h1>
        <p className="login-card__intro">{viewText.intro}</p>

        {error && <p className="login-error">{error}</p>}
        {message && <p className="login-success">{message}</p>}

        {view === 'signin' && (
          <form onSubmit={handleLoginSubmit} className="login-form">
            <div className="field">
              <label htmlFor="signin-email">Email</label>
              <input
                id="signin-email"
                type="email"
                autoComplete="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="signin-password">Password</label>
              <input
                id="signin-password"
                type="password"
                autoComplete="current-password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                required
              />
            </div>
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {view === 'reset' && (
          <form onSubmit={handlePasswordResetSubmit} className="login-form">
            <div className="field">
              <label htmlFor="reset-email">Email</label>
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                value={resetForm.email}
                onChange={(event) =>
                  setResetForm((prev) => ({
                    ...prev,
                    email: event.target.value,
                    securityQuestion: '',
                    securityAnswer: '',
                    newPassword: '',
                  }))
                }
                required
              />
            </div>
            <button
              className="secondary-button login-admin-button"
              type="button"
              onClick={handleLoadSecurityQuestion}
              disabled={loading}
            >
              {loading ? 'Loading question...' : 'Load Security Question'}
            </button>

            {resetForm.securityQuestion && (
              <>
                <div className="field">
                  <label htmlFor="reset-question">Your security question</label>
                  <input
                    id="reset-question"
                    type="text"
                    value={resetForm.securityQuestion}
                    readOnly
                  />
                </div>
                <div className="field">
                  <label htmlFor="reset-answer">Security answer</label>
                  <input
                    id="reset-answer"
                    type="password"
                    value={resetForm.securityAnswer}
                    onChange={(event) =>
                      setResetForm((prev) => ({ ...prev, securityAnswer: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="reset-new-password">New password</label>
                  <input
                    id="reset-new-password"
                    type="password"
                    autoComplete="new-password"
                    value={resetForm.newPassword}
                    onChange={(event) =>
                      setResetForm((prev) => ({ ...prev, newPassword: event.target.value }))
                    }
                    minLength={8}
                    required
                  />
                </div>
                <button className="primary-button" type="submit" disabled={loading}>
                  {loading ? 'Updating password...' : 'Reset Password'}
                </button>
              </>
            )}
          </form>
        )}

        <div className="login-links">
          <button
            className={`login-link-button ${view === 'signin' ? 'active' : ''}`}
            type="button"
            onClick={() => setCurrentView('signin')}
          >
            Sign In
          </button>
          <button
            className={`login-link-button ${view === 'reset' ? 'active' : ''}`}
            type="button"
            onClick={() => setCurrentView('reset')}
          >
            Forgot Password
          </button>
        </div>
      </div>
    </div>
  );
}
