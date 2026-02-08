import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import * as c from '../styles/common';

export default function Properties() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', address: '', description: '' });

  const canCreate = user?.role === 'admin' || user?.role === 'manager';
  const canEdit = user?.role === 'admin' || user?.role === 'manager';
  const canDelete = user?.role === 'admin';

  const load = () => api.get('/api/properties').then(r => setItems(r.data));
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    if (editing) {
      await api.put(`/api/properties/${editing}`, form);
    } else {
      await api.post('/api/properties', form);
    }
    setForm({ name: '', address: '', description: '' });
    setEditing(null);
    setShowForm(false);
    load();
  };

  const edit = (p) => { setForm({ name: p.name, address: p.address, description: p.description }); setEditing(p.id); setShowForm(true); };
  const del = async (id) => { if (window.confirm('Wirklich löschen?')) { await api.delete(`/api/properties/${id}`); load(); } };

  return (
    <div>
      <div style={c.pageHeader}>
        <h1 style={c.h1}>Immobilien</h1>
        {canCreate && <button style={c.btn} onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ name: '', address: '', description: '' }); }}>{showForm ? 'Abbrechen' : 'Neue Immobilie'}</button>}
      </div>
      {showForm && (
        <form style={c.form} onSubmit={save}>
          <label style={c.label}>Name *</label>
          <input style={c.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <label style={c.label}>Adresse</label>
          <input style={c.input} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          <label style={c.label}>Beschreibung</label>
          <input style={c.input} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <button style={c.btn} type="submit">{editing ? 'Aktualisieren' : 'Anlegen'}</button>
        </form>
      )}
      <table style={c.table}>
        <thead><tr><th style={c.th}>Name</th><th style={c.th}>Adresse</th><th style={c.th}>Beschreibung</th>{canEdit && <th style={c.th}>Aktionen</th>}</tr></thead>
        <tbody>
          {items.map(p => (
            <tr key={p.id}>
              <td style={c.td}>{p.name}</td>
              <td style={c.td}>{p.address}</td>
              <td style={c.td}>{p.description}</td>
              {canEdit && <td style={c.td}>
                <button style={c.btnSmall} onClick={() => edit(p)}>Bearbeiten</button>
                {canDelete && <button style={c.btnDanger} onClick={() => del(p.id)}>Löschen</button>}
              </td>}
            </tr>
          ))}
          {items.length === 0 && <tr><td style={c.tdEmpty} colSpan={canEdit ? 4 : 3}>Keine Immobilien vorhanden</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
