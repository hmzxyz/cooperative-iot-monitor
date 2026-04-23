const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export async function apiFetch(path, token, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
  if (res.status === 401) throw new Error('unauthorized');
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}
