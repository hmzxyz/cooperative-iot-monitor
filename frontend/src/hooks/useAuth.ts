import { useState } from 'react';

// Key used to store the JWT token in local storage.
const STORAGE_KEY = 'cooperative-iot-monitor:token';

export function useAuth() {
  const [token, setTokenState] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    return localStorage.getItem(STORAGE_KEY);
  });

  /**
   * Save the JWT token to local storage and component state.
   */
  const setToken = (value: string) => {
    localStorage.setItem(STORAGE_KEY, value);
    setTokenState(value);
  };

  /**
   * Log out the current user and redirect to the login page.
   */
  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setTokenState(null);
    window.location.href = '/login';
  };

  return { token, setToken, logout };
}
