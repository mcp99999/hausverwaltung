import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import theme from '../styles/theme';

const baseItems = [
  { to: '/', label: 'Dashboard', icon: '\u{1F4CA}' },
  { to: '/properties', label: 'Immobilien', icon: '\u{1F3E0}' },
  { to: '/meter-readings', label: 'Zählerstände', icon: '\u{1F4CF}' },
  { to: '/tariffs', label: 'Tarife', icon: '\u{1F4B0}' },
  { to: '/contacts', label: 'Kontakte', icon: '\u{1F464}' },
  { to: '/expenses', label: 'Ausgaben', icon: '\u{1F4B3}' },
  { to: '/recurring-costs', label: 'Laufende Kosten', icon: '\u{1F504}' },
  { to: '/reports', label: 'Reports', icon: '\u{1F4C8}' },
];

const ROLE_LABELS = { admin: 'Admin', manager: 'Manager', user: 'Benutzer' };

const styles = {
  sidebar: {
    width: 260, background: theme.colors.primary, color: '#fff', height: '100vh',
    position: 'fixed', left: 0, top: 0, display: 'flex', flexDirection: 'column',
    padding: '24px 0', overflowY: 'auto',
  },
  titleWrap: { padding: '0 24px 20px', borderBottom: `1px solid ${theme.colors.primaryLighter}` },
  title: { fontSize: 18, fontWeight: 700 },
  subtitle: { fontSize: 12, color: theme.colors.textLight, marginTop: 4, letterSpacing: '0.5px' },
  nav: { flex: 1, padding: '12px 0' },
  link: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '11px 24px', color: theme.colors.textLight, textDecoration: 'none',
    fontSize: 14, transition: 'all 0.2s',
  },
  activeLink: { color: '#fff', background: theme.colors.primaryLight, borderLeft: `3px solid ${theme.colors.accent}`, paddingLeft: 21 },
  icon: { fontSize: 16, width: 20, textAlign: 'center' },
  footer: { padding: '16px 24px', borderTop: `1px solid ${theme.colors.primaryLighter}`, fontSize: 13 },
  username: { color: '#fff', fontWeight: 600 },
  role: { color: theme.colors.textLight, fontSize: 12, marginTop: 2 },
  logoutBtn: {
    background: 'none', border: `1px solid ${theme.colors.primaryLighter}`, color: theme.colors.textLight, padding: '8px 14px',
    borderRadius: 6, cursor: 'pointer', fontSize: 13, marginTop: 12, width: '100%', transition: 'all 0.2s',
  },
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const role = user?.role || 'user';
  const isAdminOrManager = role === 'admin' || role === 'manager';

  const items = [...baseItems];
  if (isAdminOrManager) {
    items.push({ to: '/users', label: 'Benutzer', icon: '\u{1F465}' });
    items.push({ to: '/activity-log', label: 'Aktivitätslog', icon: '\u{1F4DD}' });
    items.push({ to: '/backup', label: 'Backup', icon: '\u{1F4BE}' });
  }

  return (
    <div style={styles.sidebar}>
      <div style={styles.titleWrap}>
        <div style={styles.title}>Hausverwaltung</div>
        <div style={styles.subtitle}>Immobilienverwaltung</div>
      </div>
      <nav style={styles.nav}>
        {items.map(item => (
          <NavLink
            key={item.to} to={item.to} end={item.to === '/'}
            style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.activeLink : {}) })}
          >
            <span style={styles.icon}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div style={styles.footer}>
        <div style={styles.username}>{user?.username}</div>
        <div style={styles.role}>{ROLE_LABELS[role] || role}</div>
        <button style={styles.logoutBtn} onClick={logout}>Abmelden</button>
      </div>
    </div>
  );
}
