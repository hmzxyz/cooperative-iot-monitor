import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../api.js';
import { useAuth } from '../context/AuthContext';

async function adminFetch(path, token, options = {}) {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...options.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.detail || `Error ${res.status}`);
  return body;
}

function UserRow({ user, currentUserId, onBlock, onUnblock }) {
  const isSelf = user.id === currentUserId;
  const isAdmin = user.role === 'admin';
  const canToggle = !isSelf && !isAdmin;

  return (
    <div className={`umgmt-user-row${user.is_blocked ? ' umgmt-user-row--blocked' : ''}`}>
      <div className="umgmt-user-avatar" aria-hidden="true">
        {(user.username?.[0] ?? '?').toUpperCase()}
      </div>
      <div className="umgmt-user-info">
        <span className="umgmt-user-name">
          {user.username}
          {isSelf && <span className="umgmt-self-tag"> (you)</span>}
        </span>
        <span className="umgmt-user-email">{user.email}</span>
      </div>
      <div className="umgmt-user-meta">
        <span className={`navbar__role-badge navbar__role-badge--${user.role}`}>
          {user.role}
        </span>
        {user.is_blocked && (
          <span className="umgmt-blocked-badge">Suspended</span>
        )}
      </div>
      {canToggle && (
        <button
          className={`umgmt-toggle-btn${user.is_blocked ? ' umgmt-toggle-btn--unblock' : ' umgmt-toggle-btn--block'}`}
          onClick={() => user.is_blocked ? onUnblock(user.id) : onBlock(user.id)}
          title={user.is_blocked ? 'Restore access' : 'Suspend account'}
        >
          {user.is_blocked ? 'Restore' : 'Suspend'}
        </button>
      )}
    </div>
  );
}

export default function UserManagementPanel({ onClose }) {
  const { token, email: currentEmail } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: '', username: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newCreds, setNewCreds] = useState(null);
  const panelRef = useRef(null);

  const currentUser = users.find((u) => u.email === currentEmail);

  useEffect(() => {
    adminFetch('/admin/users', token)
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');
    setNewCreds(null);
    try {
      const created = await adminFetch('/admin/users', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setUsers((prev) => [created, ...prev]);
      setNewCreds({ username: created.username, email: created.email, password: created.temp_password });
      setForm({ email: '', username: '' });
      setSuccess(`Account created for ${created.username}.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleBlock = async (userId) => {
    setError('');
    try {
      const updated = await adminFetch(`/admin/users/${userId}/block`, token, { method: 'PATCH' });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (e) {
      setError(e.message);
    }
  };

  const handleUnblock = async (userId) => {
    setError('');
    try {
      const updated = await adminFetch(`/admin/users/${userId}/unblock`, token, { method: 'PATCH' });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <>
      <div className="umgmt-backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="umgmt-panel" ref={panelRef} role="dialog" aria-label="User Management">
        {/* Header */}
        <div className="umgmt-header">
          <div>
            <p className="section-kicker">Admin</p>
            <h2 className="umgmt-title">User Management</h2>
          </div>
          <button className="umgmt-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Error / success banners */}
        {error && <p className="login-error umgmt-banner">{error}</p>}
        {success && <p className="login-success umgmt-banner">{success}</p>}

        {/* New-credentials box */}
        {newCreds && (
          <div className="umgmt-creds-box">
            <p className="umgmt-creds-label">Share with the new technician:</p>
            <div className="umgmt-creds-row">
              <span>Username</span><strong>{newCreds.username}</strong>
            </div>
            <div className="umgmt-creds-row">
              <span>Email</span><strong>{newCreds.email}</strong>
            </div>
            <div className="umgmt-creds-row">
              <span>Password</span>
              <strong className="umgmt-creds-password">{newCreds.password}</strong>
            </div>
            <p className="umgmt-creds-note">
              A welcome email was sent (if SMTP is configured). Copy these credentials as a backup.
            </p>
          </div>
        )}

        {/* Create technician form */}
        <section className="umgmt-section">
          <h3 className="umgmt-section-title">Create Technician</h3>
          <form className="umgmt-form" onSubmit={handleCreate}>
            <div className="field">
              <label htmlFor="umgmt-email">Email</label>
              <input
                id="umgmt-email"
                type="email"
                required
                placeholder="technician@company.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="umgmt-username">Username</label>
              <input
                id="umgmt-username"
                type="text"
                required
                minLength={3}
                placeholder="ahmed.benali"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              />
            </div>
            <button
              className="primary-button umgmt-create-btn"
              type="submit"
              disabled={creating}
            >
              {creating ? 'Creating…' : 'Create & Send Email'}
            </button>
          </form>
        </section>

        {/* Users list */}
        <section className="umgmt-section">
          <h3 className="umgmt-section-title">
            All Users
            {!loading && <span className="umgmt-count">{users.length}</span>}
          </h3>

          {loading && <p className="umgmt-loading">Loading…</p>}

          {!loading && users.length === 0 && (
            <p className="umgmt-empty">No users found.</p>
          )}

          <div className="umgmt-user-list">
            {users.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                currentUserId={currentUser?.id}
                onBlock={handleBlock}
                onUnblock={handleUnblock}
              />
            ))}
          </div>
        </section>
      </aside>
    </>
  );
}
