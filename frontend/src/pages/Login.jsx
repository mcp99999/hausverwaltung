import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import theme from '../styles/theme';

const s = {
  wrap: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryLight} 50%, #0f3460 100%)` },
  card: { background: theme.colors.white, borderRadius: theme.radius.xxl, padding: 40, width: 400, boxShadow: theme.shadow.xl },
  title: { fontSize: theme.fontSize.xxxl, fontWeight: theme.fontWeight.bold, marginBottom: theme.spacing.sm, color: theme.colors.primary },
  sub: { color: theme.colors.textSecondary, marginBottom: theme.spacing.xxl, fontSize: theme.fontSize.base },
  label: { display: 'block', fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, marginBottom: theme.spacing.xs, color: theme.colors.textSecondary },
  input: { width: '100%', padding: '12px 14px', border: `1.5px solid ${theme.colors.gray300}`, borderRadius: theme.radius.md, fontSize: theme.fontSize.base, marginBottom: theme.spacing.lg, outline: 'none' },
  btn: { width: '100%', padding: '14px', background: theme.colors.primary, color: theme.colors.white, border: 'none', borderRadius: theme.radius.md, fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.semibold, cursor: 'pointer', transition: 'all 0.2s' },
  errBox: { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: theme.radius.md, padding: theme.spacing.md, marginBottom: theme.spacing.lg },
  errText: { color: theme.colors.danger, fontSize: theme.fontSize.md, margin: 0 },
};

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
      navigate('/');
    } catch {
      setError('Ungültige Anmeldedaten');
    }
  };

  return (
    <div style={s.wrap}>
      <form style={s.card} onSubmit={handleSubmit}>
        <div style={s.title}>Hausverwaltung</div>
        <div style={s.sub}>Bitte melden Sie sich an</div>
        {error && <div style={s.errBox}><p style={s.errText}>{error}</p></div>}
        <label style={s.label}>Benutzername</label>
        <input style={s.input} value={username} onChange={e => setUsername(e.target.value)} required />
        <label style={s.label}>Passwort</label>
        <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button style={s.btn} type="submit">Anmelden</button>
      </form>
    </div>
  );
}
