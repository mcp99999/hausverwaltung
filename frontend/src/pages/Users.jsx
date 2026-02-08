import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import theme from '../styles/theme';
import * as c from '../styles/common';

const ROLE_LABELS = { admin: 'Admin', manager: 'Manager', user: 'Benutzer' };
const ROLE_COLORS = { admin: '#e74c3c', manager: '#f39c12', user: '#27ae60' };

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', role: 'user', property_ids: [] });

  const canAccess = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  const load = () => api.get('/api/users').then(r => setUsers(r.data)).catch(() => {});
  useEffect(() => { if (canAccess) { load(); api.get('/api/properties').then(r => setProperties(r.data)); } }, [canAccess]);

  if (!canAccess) return <div><h1 style={c.h1}>Zugriff verweigert</h1><p>Nur Admins und Manager können Benutzer verwalten.</p></div>;

  const save = async (e) => {
    e.preventDefault();
    const payload = { ...form };
    if (editing && !payload.password) delete payload.password;
    if (editing) {
      await api.put(`/api/users/${editing}`, payload);
    } else {
      await api.post('/api/users', payload);
    }
    setForm({ username: '', password: '', role: 'user', property_ids: [] });
    setEditing(null);
    setShowForm(false);
    load();
  };

  const edit = (u) => { setForm({ username: u.username, password: '', role: u.role, property_ids: u.property_ids }); setEditing(u.id); setShowForm(true); };
  const del = async (id) => { if (window.confirm('Wirklich löschen?')) { await api.delete(`/api/users/${id}`); load(); } };

  const toggleProp = (pid) => {
    setForm(f => ({ ...f, property_ids: f.property_ids.includes(pid) ? f.property_ids.filter(x => x !== pid) : [...f.property_ids, pid] }));
  };

  const roleOptions = currentUser?.role === 'admin'
    ? [{ value: 'admin', label: 'Admin' }, { value: 'manager', label: 'Manager' }, { value: 'user', label: 'Benutzer' }]
    : [{ value: 'user', label: 'Benutzer' }];

  return (
    <div>
      <div style={c.pageHeader}>
        <h1 style={c.h1}>Benutzer</h1>
        <button style={c.btn} onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ username: '', password: '', role: 'user', property_ids: [] }); }}>
          {showForm ? 'Abbrechen' : 'Neuer Benutzer'}
        </button>
      </div>
      {showForm && (
        <form style={c.form} onSubmit={save}>
          <div style={c.row3}>
            <div><label style={c.label}>Benutzername *</label>
              <input style={c.input} value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required /></div>
            <div><label style={c.label}>Passwort {editing ? '(leer = unverändert)' : '*'}</label>
              <input style={c.input} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} {...(!editing && { required: true })} /></div>
            <div><label style={c.label}>Rolle</label>
              <select style={c.select} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                {roleOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select></div>
          </div>
          <label style={c.label}>Zugeordnete Immobilien</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {properties.map(p => (
              <label key={p.id} style={{ fontSize: 13, padding: '6px 14px', background: form.property_ids.includes(p.id) ? theme.colors.primary : theme.colors.gray150, color: form.property_ids.includes(p.id) ? '#fff' : theme.colors.textPrimary, borderRadius: 20, cursor: 'pointer', transition: 'all 0.2s' }}>
                <input type="checkbox" style={{ display: 'none' }} checked={form.property_ids.includes(p.id)} onChange={() => toggleProp(p.id)} />
                {p.name}
              </label>
            ))}
          </div>
          <button style={c.btn} type="submit">{editing ? 'Aktualisieren' : 'Anlegen'}</button>
        </form>
      )}
      <table style={c.table}>
        <thead><tr><th style={c.th}>Benutzername</th><th style={c.th}>Rolle</th><th style={c.th}>Immobilien</th><th style={c.th}>Aktionen</th></tr></thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td style={c.td}>{u.username}</td>
              <td style={c.td}>
                <span style={{ ...c.badge, background: (ROLE_COLORS[u.role] || '#888') + '20', color: ROLE_COLORS[u.role] || '#888' }}>
                  {ROLE_LABELS[u.role] || u.role}
                </span>
              </td>
              <td style={c.td}>{u.property_ids.length} zugeordnet</td>
              <td style={c.td}>
                <button style={c.btnSmall} onClick={() => edit(u)}>Bearbeiten</button>
                <button style={c.btnDanger} onClick={() => del(u.id)}>Löschen</button>
              </td>
            </tr>
          ))}
          {users.length === 0 && <tr><td style={c.tdEmpty} colSpan={4}>Keine Benutzer vorhanden</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
