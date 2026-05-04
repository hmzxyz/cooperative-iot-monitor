import { createContext, useCallback, useContext, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [username, setUsername] = useState(() => localStorage.getItem('auth_username'));

  const parseApiError = useCallback(async (res, fallbackMessage) => {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || fallbackMessage);
  }, []);

  const setSession = useCallback((nextToken, nextUsername) => {
    localStorage.setItem('auth_token', nextToken);
    localStorage.setItem('auth_username', nextUsername);
    setToken(nextToken);
    setUsername(nextUsername);
  }, []);

  const login = useCallback(async (nextUsername, password) => {
    const body = new URLSearchParams({ username: nextUsername, password });
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      await parseApiError(res, 'Login failed');
    }
    const { access_token } = await res.json();
    setSession(access_token, nextUsername);
  }, [parseApiError, setSession]);

  const registerTechnician = useCallback(async ({
    username: nextUsername,
    password,
    phone,
    securityQuestion,
    securityAnswer,
  }) => {
    const payload = {
      username: nextUsername,
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

  const getPasswordResetQuestion = useCallback(async (nextUsername) => {
    const usernameQuery = encodeURIComponent(nextUsername);
    const res = await fetch(`${API_BASE}/auth/password-reset/question?username=${usernameQuery}`);
    if (!res.ok) {
      await parseApiError(res, 'Could not load security question');
    }
    return res.json();
  }, [parseApiError]);

  const resetPassword = useCallback(async ({
    username: nextUsername,
    securityAnswer,
    newPassword,
  }) => {
    const res = await fetch(`${API_BASE}/auth/password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: nextUsername,
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
    localStorage.removeItem('auth_username');
    setToken(null);
    setUsername(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        username,
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
