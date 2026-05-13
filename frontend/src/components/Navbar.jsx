import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(/[\s._-]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export default function Navbar({ connectionLabel, mockMode, onOpenUserMgmt }) {
  const { username, role, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const connectionClass = mockMode
    ? 'navbar__conn-badge--mock'
    : connectionLabel === 'Live MQTT connected'
      ? 'navbar__conn-badge--live'
      : 'navbar__conn-badge--off';

  return (
    <nav className="app-navbar">
      <div className="app-navbar__inner">
        {/* Brand */}
        <div className="navbar__brand">
          <span className="navbar__brand-icon" aria-hidden="true">⚡</span>
          <span className="navbar__brand-name">CoopIoT Monitor</span>
        </div>

        {/* Connection status */}
        <div className="navbar__center">
          <span className={`navbar__conn-badge ${connectionClass}`}>
            <span className="navbar__conn-dot" />
            {connectionLabel}
          </span>
        </div>

        {/* Avatar / user menu */}
        <div className="navbar__user" ref={menuRef}>
          <button
            className="navbar__avatar"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="User menu"
            aria-expanded={menuOpen}
          >
            {getInitials(username)}
          </button>

          {menuOpen && (
            <div className="navbar__dropdown" role="menu">
              <div className="navbar__dropdown-profile">
                <span className="navbar__dropdown-name">{username || 'User'}</span>
                <span className={`navbar__role-badge navbar__role-badge--${role}`}>
                  {role}
                </span>
              </div>

              <div className="navbar__dropdown-divider" />

              {role === 'admin' && (
                <button
                  className="navbar__dropdown-item"
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); onOpenUserMgmt?.(); }}
                >
                  <span className="navbar__dropdown-icon">👥</span>
                  User Management
                </button>
              )}

              <button
                className="navbar__dropdown-item navbar__dropdown-item--danger"
                role="menuitem"
                onClick={logout}
              >
                <span className="navbar__dropdown-icon">🚪</span>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
