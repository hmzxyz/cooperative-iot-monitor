import { createContext, useCallback, useContext, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const TEST_ADMIN = { username: 'admin', password: 'admin' };

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [username, setUsername] = useState(() => localStorage.getItem('auth_username'));

  const setSession = useCallback((nextToken, nextUsername) => {
    localStorage.setItem('auth_token', nextToken);
    localStorage.setItem('auth_username', nextUsername);
    setToken(nextToken);
    setUsername(nextUsername);
  }, []);

  const login = useCallback(async (username, password) => {
    const body = new URLSearchParams({ username, password });
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Login failed');
    }
    const { access_token } = await res.json();
    setSession(access_token, username);
  }, [setSession]);

  const ensureTestAdminUser = useCallback(async () => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_ADMIN),
    });
    if (res.ok) return;
    const err = await res.json().catch(() => ({}));
    const detail = String(err.detail || '').toLowerCase();
    if (res.status === 400 && detail.includes('already')) return;
    throw new Error(err.detail || 'Could not create test admin user');
  }, []);

  const loginAsTestAdmin = useCallback(async () => {
    await ensureTestAdminUser();
    await login(TEST_ADMIN.username, TEST_ADMIN.password);
  }, [ensureTestAdminUser, login]);

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
        loginAsTestAdmin,
        logout,
        isAuthenticated: !!token,
        testAdmin: TEST_ADMIN,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
