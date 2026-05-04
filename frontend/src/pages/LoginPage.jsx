import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const EMPTY_SIGNUP = {
  username: '',
  password: '',
  phone: '',
  securityQuestion: '',
  securityAnswer: '',
};

const EMPTY_RESET = {
  username: '',
  securityQuestion: '',
  securityAnswer: '',
  newPassword: '',
};

export default function LoginPage() {
  const { login, registerTechnician, getPasswordResetQuestion, resetPassword } = useAuth();
  const [view, setView] = useState('signin');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [signupForm, setSignupForm] = useState(EMPTY_SIGNUP);
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
      await login(loginForm.username.trim(), loginForm.password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await registerTechnician({
        username: signupForm.username.trim(),
        password: signupForm.password,
        phone: signupForm.phone.trim(),
        securityQuestion: signupForm.securityQuestion.trim(),
        securityAnswer: signupForm.securityAnswer.trim(),
      });
      setMessage('Technician account created. You can sign in now.');
      setLoginForm({ username: signupForm.username.trim(), password: '' });
      setSignupForm(EMPTY_SIGNUP);
      setView('signin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSecurityQuestion = async () => {
    const normalizedUsername = resetForm.username.trim();
    if (!normalizedUsername) {
      setError('Enter your username first.');
      return;
    }

    setError('');
    setMessage('');
    setLoading(true);
    try {
      const response = await getPasswordResetQuestion(normalizedUsername);
      setResetForm((prev) => ({
        ...prev,
        username: normalizedUsername,
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
        username: resetForm.username.trim(),
        securityAnswer: resetForm.securityAnswer.trim(),
        newPassword: resetForm.newPassword,
      });
      setMessage('Password updated successfully. Sign in with your new password.');
      setLoginForm({ username: resetForm.username.trim(), password: '' });
      setResetForm(EMPTY_RESET);
      setView('signin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const viewText = useMemo(() => {
    if (view === 'signup') {
      return {
        title: 'Technician Sign Up',
        intro: 'Create your factory technician account and set recovery details.',
      };
    }
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
        <p className="eyebrow">Cooperative IoT Monitor</p>
        <h1>{viewText.title}</h1>
        <p className="login-card__intro">{viewText.intro}</p>

        {error && <p className="login-error">{error}</p>}
        {message && <p className="login-success">{message}</p>}

        {view === 'signin' && (
          <form onSubmit={handleLoginSubmit} className="login-form">
            <div className="field">
              <label htmlFor="signin-username">Username</label>
              <input
                id="signin-username"
                type="text"
                autoComplete="username"
                value={loginForm.username}
                onChange={(event) => setLoginForm((prev) => ({ ...prev, username: event.target.value }))}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="signin-password">Password</label>
              <input
                id="signin-password"
                type="password"
                autoComplete="current-password"
                value={loginForm.password}
                onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
                required
              />
            </div>
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {view === 'signup' && (
          <form onSubmit={handleSignupSubmit} className="login-form">
            <div className="field">
              <label htmlFor="signup-username">Username</label>
              <input
                id="signup-username"
                type="text"
                autoComplete="username"
                value={signupForm.username}
                onChange={(event) => setSignupForm((prev) => ({ ...prev, username: event.target.value }))}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                value={signupForm.password}
                onChange={(event) => setSignupForm((prev) => ({ ...prev, password: event.target.value }))}
                required
                minLength={8}
              />
            </div>
            <div className="field">
              <label htmlFor="signup-phone">Phone (optional)</label>
              <input
                id="signup-phone"
                type="tel"
                autoComplete="tel"
                value={signupForm.phone}
                onChange={(event) => setSignupForm((prev) => ({ ...prev, phone: event.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="signup-question">Security question</label>
              <input
                id="signup-question"
                type="text"
                value={signupForm.securityQuestion}
                onChange={(event) => setSignupForm((prev) => ({ ...prev, securityQuestion: event.target.value }))}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="signup-answer">Security answer</label>
              <input
                id="signup-answer"
                type="password"
                autoComplete="new-password"
                value={signupForm.securityAnswer}
                onChange={(event) => setSignupForm((prev) => ({ ...prev, securityAnswer: event.target.value }))}
                required
              />
            </div>
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Technician Account'}
            </button>
          </form>
        )}

        {view === 'reset' && (
          <form onSubmit={handlePasswordResetSubmit} className="login-form">
            <div className="field">
              <label htmlFor="reset-username">Username</label>
              <input
                id="reset-username"
                type="text"
                autoComplete="username"
                value={resetForm.username}
                onChange={(event) =>
                  setResetForm((prev) => ({
                    ...prev,
                    username: event.target.value,
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
            className={`login-link-button ${view === 'signup' ? 'active' : ''}`}
            type="button"
            onClick={() => setCurrentView('signup')}
          >
            Sign Up
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
