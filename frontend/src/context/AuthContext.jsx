import { createContext, useCallback, useContext, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [email, setEmail] = useState(() => localStorage.getItem('auth_email'));
  const [username, setUsername] = useState(() => localStorage.getItem('auth_username'));
  const [role, setRole] = useState(() => localStorage.getItem('auth_role') || 'technician');

  const parseApiError = useCallback(async (res, fallbackMessage) => {
    const err = await res.json().catch(() => ({}));
    const { detail } = err || {};
    if (Array.isArray(detail)) {
      const message = detail
        .map((item) => {
          if (!item) return null;
          if (typeof item === 'string') return item;
          const loc = Array.isArray(item.loc) ? item.loc.slice(1).join('.') : null;
          const msg = item.msg || item.message || null;
          if (loc && msg) return `${loc}: ${msg}`;
          return msg || null;
        })
        .filter(Boolean)
        .join(' • ');
      throw new Error(message || fallbackMessage);
    }
    if (typeof detail === 'string' && detail.trim()) {
      throw new Error(detail);
    }
    throw new Error(fallbackMessage);
  }, []);

  const setSession = useCallback((nextToken, nextEmail, nextUsername, nextRole) => {
    localStorage.setItem('auth_token', nextToken);
    localStorage.setItem('auth_email', nextEmail);
    if (nextUsername) {
      localStorage.setItem('auth_username', nextUsername);
    } else {
      localStorage.removeItem('auth_username');
    }
    const resolvedRole = nextRole || 'technician';
    localStorage.setItem('auth_role', resolvedRole);
    setToken(nextToken);
    setEmail(nextEmail);
    setUsername(nextUsername || null);
    setRole(resolvedRole);
  }, []);

  const login = useCallback(async (nextEmail, password) => {
    const body = new URLSearchParams({ username: nextEmail, password });
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      await parseApiError(res, 'Login failed');
    }
    const { access_token, user } = await res.json();
    setSession(access_token, user.email, user.username, user.role);
  }, [parseApiError, setSession]);

  const registerTechnician = useCallback(async ({
    email: nextEmail,
    username,
    password,
    phone,
    securityQuestion,
    securityAnswer,
  }) => {
    const payload = {
      email: nextEmail,
      username,
      password,
      role: 'technician',
      phone: phone || undefined,
      security_question: securityQuestion,
      security_answer: securityAnswer,
    };

    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      await parseApiError(res, 'Registration failed');
    }
    return res.json();
  }, [parseApiError]);

  const getPasswordResetQuestion = useCallback(async (nextEmail) => {
    const emailQuery = encodeURIComponent(nextEmail);
    const res = await fetch(`${API_BASE}/auth/password-reset/question?email=${emailQuery}`);
    if (!res.ok) {
      await parseApiError(res, 'Could not load security question');
    }
    return res.json();
  }, [parseApiError]);

  const resetPassword = useCallback(async ({
    email: nextEmail,
    securityAnswer,
    newPassword,
  }) => {
    const res = await fetch(`${API_BASE}/auth/password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: nextEmail,
        security_answer: securityAnswer,
        new_password: newPassword,
      }),
    });

    if (!res.ok) {
      await parseApiError(res, 'Password reset failed');
    }
    return res.json();
  }, [parseApiError]);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_email');
    localStorage.removeItem('auth_username');
    localStorage.removeItem('auth_role');
    setToken(null);
    setEmail(null);
    setUsername(null);
    setRole('technician');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        email,
        username,
        role,
        login,
        registerTechnician,
        getPasswordResetQuestion,
        resetPassword,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
