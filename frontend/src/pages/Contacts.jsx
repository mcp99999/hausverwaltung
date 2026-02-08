import React, { useState, useEffect, useRef } from 'react';
import api, { API_BASE } from '../api';
import theme from '../styles/theme';
import * as c from '../styles/common';

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', company: '', address: '', phone: '', email: '', website: '', tax_id: '', notes: '' });
  const [scanning, setScanning] = useState(false);
  const [photoFilename, setPhotoFilename] = useState(null);
  const [photoModal, setPhotoModal] = useState(null);
  const scanInputRef = useRef(null);

  useEffect(() => { load(); }, []);

  const load = (q) => {
    const params = q !== undefined ? q : search;
    api.get('/api/contacts', { params: { q: params } }).then(r => setContacts(r.data));
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    load(e.target.value);
  };

  const handleScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setScanning(true);
    setShowForm(true);
    setEditId(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/api/contacts/scan', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const d = res.data;
      setForm(f => ({
        ...f,
        name: d.name || f.name,
        company: d.company || f.company,
        phone: d.phone || f.phone,
        email: d.email || f.email,
        address: d.address || f.address,
        website: d.website || f.website,
      }));
      if (d.photo_filename) setPhotoFilename(d.photo_filename);
    } catch (err) {
      alert('KI-Erkennung fehlgeschlagen: ' + (err.response?.data?.error || err.message));
    }
    setScanning(false);
    if (scanInputRef.current) scanInputRef.current.value = '';
  };

  const startEdit = (ct) => {
    setEditId(ct.id);
    setForm({ name: ct.name || '', company: ct.company || '', address: ct.address || '', phone: ct.phone || '', email: ct.email || '', website: ct.website || '', tax_id: ct.tax_id || '', notes: ct.notes || '' });
    setPhotoFilename(null);
    setShowForm(true);
  };

  const save = async (e) => {
    e.preventDefault();
    const payload = { ...form };
    if (photoFilename) payload.photo_filename = photoFilename;
    if (editId) {
      await api.put(`/api/contacts/${editId}`, payload);
    } else {
      await api.post('/api/contacts', payload);
    }
    resetForm();
    load();
  };

  const resetForm = () => {
    setForm({ name: '', company: '', address: '', phone: '', email: '', website: '', tax_id: '', notes: '' });
    setShowForm(false);
    setEditId(null);
    setPhotoFilename(null);
  };

  const del = async (id) => {
    if (window.confirm('Kontakt wirklich löschen?')) {
      await api.delete(`/api/contacts/${id}`);
      load();
    }
  };

  return (
    <div>
      <div style={c.pageHeader}>
        <h1 style={c.h1}>Kontakte</h1>
        <div>
          <button style={c.btnScan} onClick={() => scanInputRef.current?.click()}>Visitenkarte scannen</button>
          <input ref={scanInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleScan} />
          <button style={c.btn} onClick={() => { if (showForm) resetForm(); else { setShowForm(true); setEditId(null); } }}>
            {showForm ? 'Abbrechen' : 'Neuer Kontakt'}
          </button>
        </div>
      </div>

      <input style={c.searchInput} placeholder="Suchen..." value={search} onChange={handleSearch} />

      {scanning && (
        <div style={c.scanBox}>
          <div style={c.spinner} />
          <p style={c.scanLabel}>KI extrahiert Kontaktdaten...</p>
        </div>
      )}

      {showForm && (
        <form style={c.form} onSubmit={save}>
          <div style={c.row3}>
            <div><label style={c.label}>Name *</label>
              <input style={c.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
            <div><label style={c.label}>Firma</label>
              <input style={c.input} value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} /></div>
            <div><label style={c.label}>Telefon</label>
              <input style={c.input} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div style={c.row3}>
            <div><label style={c.label}>E-Mail</label>
              <input style={c.input} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><label style={c.label}>Website</label>
              <input style={c.input} value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} /></div>
            <div><label style={c.label}>Steuernummer</label>
              <input style={c.input} value={form.tax_id} onChange={e => setForm({ ...form, tax_id: e.target.value })} /></div>
          </div>
          <div style={c.row2}>
            <div><label style={c.label}>Adresse</label>
              <input style={c.input} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <div><label style={c.label}>Notizen</label>
              <textarea style={c.textarea} rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <button style={c.btn} type="submit">{editId ? 'Aktualisieren' : 'Speichern'}</button>
        </form>
      )}

      <table style={c.table}>
        <thead>
          <tr>
            <th style={c.th}>Name</th>
            <th style={c.th}>Firma</th>
            <th style={c.th}>Telefon</th>
            <th style={c.th}>E-Mail</th>
            <th style={c.th}>Adresse</th>
            <th style={c.th}>Foto</th>
            <th style={c.th}>Aktionen</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map(ct => (
            <tr key={ct.id}>
              <td style={c.td}>{ct.name}</td>
              <td style={c.td}>{ct.company || '-'}</td>
              <td style={c.td}>{ct.phone || '-'}</td>
              <td style={c.td}>{ct.email ? <a href={`mailto:${ct.email}`} style={{ color: theme.colors.link }}>{ct.email}</a> : '-'}</td>
              <td style={c.td}>{ct.address || '-'}</td>
              <td style={c.td}>
                {ct.photo_url ? (
                  <span style={{ cursor: 'pointer', color: theme.colors.scan }} onClick={() => setPhotoModal(API_BASE + ct.photo_url)}>
                    Anzeigen
                  </span>
                ) : '-'}
              </td>
              <td style={c.td}>
                <button style={c.btnSmall} onClick={() => startEdit(ct)}>Bearbeiten</button>
                <button style={c.btnDanger} onClick={() => del(ct.id)}>Löschen</button>
              </td>
            </tr>
          ))}
          {contacts.length === 0 && <tr><td style={c.tdEmpty} colSpan={7}>Keine Kontakte vorhanden</td></tr>}
        </tbody>
      </table>

      {photoModal && (
        <div style={c.modalOverlay} onClick={() => setPhotoModal(null)}>
          <div style={c.modalContent} onClick={e => e.stopPropagation()}>
            <img src={photoModal} alt="Visitenkarte" style={{ maxWidth: '80vw', maxHeight: '80vh' }} />
            <div style={{ textAlign: 'right', marginTop: 10 }}>
              <button style={c.btn} onClick={() => setPhotoModal(null)}>Schliessen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
