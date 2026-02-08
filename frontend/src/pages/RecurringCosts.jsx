import React, { useState, useEffect, useRef } from 'react';
import api, { API_BASE } from '../api';
import theme from '../styles/theme';
import * as c from '../styles/common';

const fmt = (n) => n != null ? n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' \u20AC' : '-';

export default function RecurringCosts() {
  const [properties, setProperties] = useState([]);
  const [selectedProp, setSelectedProp] = useState('');
  const [costs, setCosts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description: '', vendor: '', monthly_amount: '', vat_rate: '19', start_date: '', end_date: '', category: '', contact_id: '' });
  const [scanning, setScanning] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [expandedAtts, setExpandedAtts] = useState({});
  const [attachments, setAttachments] = useState({});
  const scanInputRef = useRef(null);
  const attInputRef = useRef(null);
  const [attTarget, setAttTarget] = useState(null);

  useEffect(() => {
    api.get('/api/properties').then(r => { setProperties(r.data); if (r.data.length > 0) setSelectedProp(r.data[0].id); });
    api.get('/api/contacts').then(r => setContacts(r.data));
  }, []);
  useEffect(() => { if (selectedProp) load(); }, [selectedProp]);

  const load = () => api.get(`/api/properties/${selectedProp}/recurring-costs`).then(r => setCosts(r.data));

  const handleScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setScanning(true);
    setShowForm(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/api/recurring-costs/scan', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const d = res.data;
      setForm(f => ({
        ...f,
        vendor: d.vendor || f.vendor,
        description: d.description || f.description,
        monthly_amount: d.monthly_amount != null ? String(d.monthly_amount) : f.monthly_amount,
        start_date: d.start_date || f.start_date,
        end_date: d.end_date || f.end_date,
      }));
    } catch (err) {
      alert('KI-Erkennung fehlgeschlagen: ' + (err.response?.data?.error || err.message));
    }
    setScanning(false);
  };

  const save = async (e) => {
    e.preventDefault();
    await api.post(`/api/properties/${selectedProp}/recurring-costs`, {
      ...form, monthly_amount: parseFloat(form.monthly_amount), vat_rate: parseFloat(form.vat_rate),
      end_date: form.end_date || null,
      contact_id: form.contact_id ? parseInt(form.contact_id) : null,
    });
    setForm({ description: '', vendor: '', monthly_amount: '', vat_rate: '19', start_date: '', end_date: '', category: '', contact_id: '' });
    setShowForm(false);
    load();
  };

  const del = async (id) => { if (window.confirm('Wirklich löschen?')) { await api.delete(`/api/recurring-costs/${id}`); load(); } };

  const toggleAtts = async (cid) => {
    if (expandedAtts[cid]) {
      setExpandedAtts(prev => ({ ...prev, [cid]: false }));
      return;
    }
    const res = await api.get(`/api/recurring-costs/${cid}/attachments`);
    setAttachments(prev => ({ ...prev, [cid]: res.data }));
    setExpandedAtts(prev => ({ ...prev, [cid]: true }));
  };

  const addAtt = async (e) => {
    const file = e.target.files[0];
    if (!file || !attTarget) return;
    const formData = new FormData();
    formData.append('file', file);
    await api.post(`/api/recurring-costs/${attTarget}/attachments`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    const res = await api.get(`/api/recurring-costs/${attTarget}/attachments`);
    setAttachments(prev => ({ ...prev, [attTarget]: res.data }));
    load();
  };

  return (
    <div>
      <div style={c.pageHeader}>
        <h1 style={c.h1}>Laufende Kosten</h1>
        <div>
          <button style={c.btnScan} onClick={() => scanInputRef.current?.click()}>Vertrag scannen</button>
          <input ref={scanInputRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleScan} />
          <button style={c.btn} onClick={() => setShowForm(!showForm)}>{showForm ? 'Abbrechen' : 'Neue laufende Kosten'}</button>
        </div>
      </div>
      <select style={{ ...c.filterSelect, width: 300, marginBottom: 20 }} value={selectedProp} onChange={e => setSelectedProp(e.target.value)}>
        {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      {scanning && (
        <div style={c.scanBox}>
          <div style={c.spinner} />
          <p style={c.scanLabel}>KI extrahiert Vertragsdaten...</p>
        </div>
      )}

      {showForm && (
        <form style={c.form} onSubmit={save}>
          <div style={c.row3}>
            <div><label style={c.label}>Beschreibung *</label>
              <input style={c.input} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required /></div>
            <div><label style={c.label}>Anbieter</label>
              <select style={c.select} value={form.contact_id} onChange={e => {
                const cid = e.target.value;
                const contact = contacts.find(ct => String(ct.id) === cid);
                setForm({ ...form, contact_id: cid, vendor: contact ? contact.name : form.vendor });
              }}>
                <option value="">-- Freitext --</option>
                {contacts.map(ct => <option key={ct.id} value={ct.id}>{ct.name}{ct.company ? ` (${ct.company})` : ''}</option>)}
              </select>
              <input style={c.input} value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} placeholder="Name eingeben oder oben auswählen" /></div>
            <div><label style={c.label}>Monatlicher Betrag (brutto) *</label>
              <input style={c.input} type="number" step="0.01" value={form.monthly_amount} onChange={e => setForm({ ...form, monthly_amount: e.target.value })} required /></div>
          </div>
          <div style={c.row3}>
            <div><label style={c.label}>USt-Satz %</label>
              <input style={c.input} type="number" step="0.1" value={form.vat_rate} onChange={e => setForm({ ...form, vat_rate: e.target.value })} /></div>
            <div><label style={c.label}>Startdatum *</label>
              <input style={c.input} type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} required /></div>
            <div><label style={c.label}>Enddatum (leer = aktiv)</label>
              <input style={c.input} type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
          </div>
          <label style={c.label}>Kategorie</label>
          <input style={{ ...c.input, maxWidth: 300 }} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
          <button style={c.btn} type="submit">Speichern</button>
        </form>
      )}
      <table style={c.table}>
        <thead><tr><th style={c.th}>Beschreibung</th><th style={c.th}>Anbieter</th><th style={c.th}>Monatlich</th><th style={c.th}>Kategorie</th><th style={c.th}>Start</th><th style={c.th}>Ende</th><th style={c.th}>Anh.</th><th style={c.th}>Aktionen</th></tr></thead>
        <tbody>
          {costs.map(ct => (
            <React.Fragment key={ct.id}>
              <tr>
                <td style={c.td}>{ct.description}</td>
                <td style={c.td}>{ct.vendor}</td>
                <td style={c.td}>{fmt(ct.monthly_amount)}</td>
                <td style={c.td}>{ct.category}</td>
                <td style={c.td}>{new Date(ct.start_date).toLocaleDateString('de-DE')}</td>
                <td style={c.td}>{ct.end_date ? new Date(ct.end_date).toLocaleDateString('de-DE') : 'Aktiv'}</td>
                <td style={c.td}>
                  {ct.attachment_count > 0 ? (
                    <span style={{ cursor: 'pointer', color: theme.colors.scan }} onClick={() => toggleAtts(ct.id)} title="Anhänge anzeigen">
                      &#128206; {ct.attachment_count}
                    </span>
                  ) : (
                    <span style={{ color: theme.colors.gray400 }}>-</span>
                  )}
                </td>
                <td style={c.td}>
                  <button style={c.btnSmall} onClick={() => { setAttTarget(ct.id); attInputRef.current?.click(); }}>+ Anhang</button>
                  <button style={c.btnDanger} onClick={() => del(ct.id)}>Löschen</button>
                </td>
              </tr>
              {expandedAtts[ct.id] && attachments[ct.id] && (
                <tr>
                  <td colSpan={8} style={{ padding: '0 16px 12px' }}>
                    <div style={c.attBox}>
                      {attachments[ct.id].map(a => (
                        <div key={a.id} style={c.attItem}>
                          <span>{a.file_type === 'pdf' ? '\u{1F4C4}' : '\u{1F5BC}'}</span>
                          <a href={API_BASE + a.url} target="_blank" rel="noopener noreferrer" style={{ color: theme.colors.link }}>{a.original_filename}</a>
                        </div>
                      ))}
                      {attachments[ct.id].length === 0 && <span style={{ color: theme.colors.textMuted, fontSize: 13 }}>Keine Anhänge</span>}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
          {costs.length === 0 && <tr><td style={c.tdEmpty} colSpan={8}>Keine laufenden Kosten vorhanden</td></tr>}
        </tbody>
      </table>
      <input ref={attInputRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={addAtt} />
    </div>
  );
}
