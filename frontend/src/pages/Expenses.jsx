import React, { useState, useEffect, useRef } from 'react';
import api, { API_BASE } from '../api';
import theme from '../styles/theme';
import * as c from '../styles/common';

const fmt = (n) => n != null ? n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' \u20AC' : '-';

export default function Expenses() {
  const [properties, setProperties] = useState([]);
  const [selectedProp, setSelectedProp] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ vendor: '', invoice_date: '', invoice_number: '', net_amount: '', vat_rate: '19', description: '', category: '', contact_id: '' });
  const [scanning, setScanning] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [expandedAtts, setExpandedAtts] = useState({});
  const [attachments, setAttachments] = useState({});
  const [scanFile, setScanFile] = useState(null);
  const scanInputRef = useRef(null);
  const attInputRef = useRef(null);
  const [attTarget, setAttTarget] = useState(null);

  useEffect(() => {
    api.get('/api/properties').then(r => { setProperties(r.data); if (r.data.length > 0) setSelectedProp(r.data[0].id); });
    api.get('/api/contacts').then(r => setContacts(r.data));
  }, []);
  useEffect(() => { if (selectedProp) load(); }, [selectedProp]);

  const load = () => api.get(`/api/properties/${selectedProp}/expenses`).then(r => setExpenses(r.data));

  const handleScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setScanFile(file);
    setScanning(true);
    setShowForm(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/api/expenses/scan', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const d = res.data;
      setForm(f => ({
        ...f,
        vendor: d.vendor || f.vendor,
        invoice_date: d.invoice_date || f.invoice_date,
        invoice_number: d.invoice_number || f.invoice_number,
        net_amount: d.net_amount != null ? String(d.net_amount) : f.net_amount,
        vat_rate: d.vat_rate != null ? String(d.vat_rate) : f.vat_rate,
        description: d.description || f.description,
        contact_id: d.contact_id ? String(d.contact_id) : f.contact_id,
      }));
      api.get('/api/contacts').then(r => setContacts(r.data));
    } catch (err) {
      alert('KI-Erkennung fehlgeschlagen: ' + (err.response?.data?.error || err.message));
    }
    setScanning(false);
  };

  const save = async (e) => {
    e.preventDefault();
    if (scanFile) {
      const formData = new FormData();
      formData.append('vendor', form.vendor);
      formData.append('invoice_date', form.invoice_date);
      formData.append('invoice_number', form.invoice_number);
      formData.append('net_amount', parseFloat(form.net_amount));
      formData.append('vat_rate', parseFloat(form.vat_rate));
      formData.append('description', form.description);
      formData.append('category', form.category);
      if (form.contact_id) formData.append('contact_id', form.contact_id);
      formData.append('files', scanFile);
      await api.post(`/api/properties/${selectedProp}/expenses`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    } else {
      await api.post(`/api/properties/${selectedProp}/expenses`, {
        ...form, net_amount: parseFloat(form.net_amount), vat_rate: parseFloat(form.vat_rate),
        contact_id: form.contact_id ? parseInt(form.contact_id) : null,
      });
    }
    setForm({ vendor: '', invoice_date: '', invoice_number: '', net_amount: '', vat_rate: '19', description: '', category: '', contact_id: '' });
    setScanFile(null);
    setShowForm(false);
    load();
  };

  const del = async (id) => { if (window.confirm('Wirklich löschen?')) { await api.delete(`/api/expenses/${id}`); load(); } };

  const toggleAtts = async (eid) => {
    if (expandedAtts[eid]) {
      setExpandedAtts(prev => ({ ...prev, [eid]: false }));
      return;
    }
    const res = await api.get(`/api/expenses/${eid}/attachments`);
    setAttachments(prev => ({ ...prev, [eid]: res.data }));
    setExpandedAtts(prev => ({ ...prev, [eid]: true }));
  };

  const addAtt = async (e) => {
    const file = e.target.files[0];
    if (!file || !attTarget) return;
    const formData = new FormData();
    formData.append('file', file);
    await api.post(`/api/expenses/${attTarget}/attachments`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    const res = await api.get(`/api/expenses/${attTarget}/attachments`);
    setAttachments(prev => ({ ...prev, [attTarget]: res.data }));
    load();
  };

  const delAtt = async (aid, eid) => {
    if (!window.confirm('Anhang löschen?')) return;
    await api.delete(`/api/attachments/${aid}`);
    const res = await api.get(`/api/expenses/${eid}/attachments`);
    setAttachments(prev => ({ ...prev, [eid]: res.data }));
    load();
  };

  return (
    <div>
      <div style={c.pageHeader}>
        <h1 style={c.h1}>Ausgaben</h1>
        <div>
          <button style={c.btnScan} onClick={() => scanInputRef.current?.click()}>Rechnung scannen</button>
          <input ref={scanInputRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleScan} />
          <button style={c.btn} onClick={() => { setShowForm(!showForm); setScanFile(null); }}>{showForm ? 'Abbrechen' : 'Neue Ausgabe'}</button>
        </div>
      </div>
      <select style={{ ...c.filterSelect, width: 300, marginBottom: 20 }} value={selectedProp} onChange={e => setSelectedProp(e.target.value)}>
        {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      {scanning && (
        <div style={c.scanBox}>
          <div style={c.spinner} />
          <p style={c.scanLabel}>KI extrahiert Rechnungsdaten...</p>
        </div>
      )}

      {showForm && (
        <form style={c.form} onSubmit={save}>
          <div style={c.row3}>
            <div><label style={c.label}>Rechnungsersteller *</label>
              <select style={c.select} value={form.contact_id} onChange={e => {
                const cid = e.target.value;
                const contact = contacts.find(ct => String(ct.id) === cid);
                setForm({ ...form, contact_id: cid, vendor: contact ? contact.name : form.vendor });
              }}>
                <option value="">-- Freitext --</option>
                {contacts.map(ct => <option key={ct.id} value={ct.id}>{ct.name}{ct.company ? ` (${ct.company})` : ''}</option>)}
              </select>
              <input style={c.input} value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} required placeholder="Name eingeben oder oben auswählen" /></div>
            <div><label style={c.label}>Rechnungsdatum *</label>
              <input style={c.input} type="date" value={form.invoice_date} onChange={e => setForm({ ...form, invoice_date: e.target.value })} required /></div>
            <div><label style={c.label}>Rechnungsnummer</label>
              <input style={c.input} value={form.invoice_number} onChange={e => setForm({ ...form, invoice_number: e.target.value })} /></div>
          </div>
          <div style={c.row3}>
            <div><label style={c.label}>Nettobetrag *</label>
              <input style={c.input} type="number" step="0.01" value={form.net_amount} onChange={e => setForm({ ...form, net_amount: e.target.value })} required /></div>
            <div><label style={c.label}>USt-Satz %</label>
              <input style={c.input} type="number" step="0.1" value={form.vat_rate} onChange={e => setForm({ ...form, vat_rate: e.target.value })} /></div>
            <div><label style={c.label}>Kategorie</label>
              <input style={c.input} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
          </div>
          <label style={c.label}>Beschreibung</label>
          <input style={c.input} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <button style={c.btn} type="submit">Speichern</button>
        </form>
      )}
      <table style={c.table}>
        <thead><tr><th style={c.th}>Datum</th><th style={c.th}>Rechnungsersteller</th><th style={c.th}>Nr.</th><th style={c.th}>Kategorie</th><th style={c.th}>Netto</th><th style={c.th}>USt</th><th style={c.th}>Brutto</th><th style={c.th}>Anh.</th><th style={c.th}>Aktionen</th></tr></thead>
        <tbody>
          {expenses.map(e => (
            <React.Fragment key={e.id}>
              <tr>
                <td style={c.td}>{new Date(e.invoice_date).toLocaleDateString('de-DE')}</td>
                <td style={c.td}>{e.vendor}</td>
                <td style={c.td}>{e.invoice_number}</td>
                <td style={c.td}>{e.category}</td>
                <td style={c.td}>{fmt(e.net_amount)}</td>
                <td style={c.td}>{fmt(e.vat_amount)}</td>
                <td style={c.td}><strong>{fmt(e.gross_amount)}</strong></td>
                <td style={c.td}>
                  {e.attachment_count > 0 ? (
                    <span style={{ cursor: 'pointer', color: theme.colors.scan }} onClick={() => toggleAtts(e.id)} title="Anhänge anzeigen">
                      &#128206; {e.attachment_count}
                    </span>
                  ) : (
                    <span style={{ color: theme.colors.gray400 }}>-</span>
                  )}
                </td>
                <td style={c.td}>
                  <button style={c.btnSmall} onClick={() => { setAttTarget(e.id); attInputRef.current?.click(); }}>+ Anhang</button>
                  <button style={c.btnDanger} onClick={() => del(e.id)}>Löschen</button>
                </td>
              </tr>
              {expandedAtts[e.id] && attachments[e.id] && (
                <tr>
                  <td colSpan={9} style={{ padding: '0 16px 12px' }}>
                    <div style={c.attBox}>
                      {attachments[e.id].map(a => (
                        <div key={a.id} style={c.attItem}>
                          <span style={{ fontSize: 16 }}>{a.file_type === 'pdf' ? '\u{1F4C4}' : '\u{1F5BC}'}</span>
                          <a href={API_BASE + a.url} target="_blank" rel="noopener noreferrer" style={{ color: theme.colors.link }}>{a.original_filename}</a>
                          <button style={c.btnSmallDanger} onClick={() => delAtt(a.id, e.id)}>x</button>
                        </div>
                      ))}
                      {attachments[e.id].length === 0 && <span style={{ color: theme.colors.textMuted, fontSize: 13 }}>Keine Anhänge</span>}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
          {expenses.length === 0 && <tr><td style={c.tdEmpty} colSpan={9}>Keine Ausgaben vorhanden</td></tr>}
        </tbody>
      </table>
      <input ref={attInputRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={addAtt} />
    </div>
  );
}
