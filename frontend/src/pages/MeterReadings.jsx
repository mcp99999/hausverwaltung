import React, { useState, useEffect, useRef } from 'react';
import api, { API_BASE } from '../api';
import theme from '../styles/theme';
import * as c from '../styles/common';

const METER_TYPES = [
  { value: 'water', label: 'Wasser' },
  { value: 'electricity_day', label: 'Strom (Tag)' },
  { value: 'electricity_night', label: 'Strom (Nacht)' },
];

export default function MeterReadings() {
  const [properties, setProperties] = useState([]);
  const [selectedProp, setSelectedProp] = useState('');
  const [filterType, setFilterType] = useState('');
  const [readings, setReadings] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ meter_type: 'water', reading_value: '', reading_date: new Date().toISOString().split('T')[0], notes: '' });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [viewPhoto, setViewPhoto] = useState(null);
  const scanInputRef = useRef(null);

  useEffect(() => { api.get('/api/properties').then(r => { setProperties(r.data); if (r.data.length > 0) setSelectedProp(r.data[0].id); }); }, []);

  useEffect(() => {
    if (selectedProp) {
      const params = filterType ? `?meter_type=${filterType}` : '';
      api.get(`/api/properties/${selectedProp}/meters${params}`).then(r => setReadings(r.data));
    }
  }, [selectedProp, filterType]);

  const loadReadings = () => {
    const params = filterType ? `?meter_type=${filterType}` : '';
    api.get(`/api/properties/${selectedProp}/meters${params}`).then(r => setReadings(r.data));
  };

  const handleScanPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedProp) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setScanning(true);
    setShowForm(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await api.post(`/api/properties/${selectedProp}/meters/scan`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = res.data;
      setForm(f => ({
        ...f,
        reading_value: data.reading_value != null ? String(data.reading_value) : f.reading_value,
        meter_type: data.meter_type || f.meter_type,
        reading_date: data.date || f.reading_date,
      }));
    } catch (err) {
      alert('KI-Erkennung fehlgeschlagen: ' + (err.response?.data?.error || err.message));
    }
    setScanning(false);
  };

  const save = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('meter_type', form.meter_type);
    formData.append('reading_value', form.reading_value);
    formData.append('reading_date', form.reading_date);
    formData.append('notes', form.notes);
    if (photoFile) formData.append('photo', photoFile);

    await api.post(`/api/properties/${selectedProp}/meters`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    setForm({ meter_type: 'water', reading_value: '', reading_date: new Date().toISOString().split('T')[0], notes: '' });
    setPhotoFile(null);
    setPhotoPreview(null);
    setShowForm(false);
    loadReadings();
  };

  const del = async (id) => {
    if (window.confirm('Wirklich löschen?')) {
      await api.delete(`/api/meters/${id}`);
      loadReadings();
    }
  };

  const typeLabel = (v) => METER_TYPES.find(t => t.value === v)?.label || v;

  return (
    <div>
      <div style={c.pageHeader}>
        <h1 style={c.h1}>Zählerstände</h1>
        <div>
          <button style={c.btnScan} onClick={() => scanInputRef.current?.click()}>Foto scannen</button>
          <input ref={scanInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleScanPhoto} />
          <button style={c.btn} onClick={() => { setShowForm(!showForm); setPhotoFile(null); setPhotoPreview(null); }}>{showForm ? 'Abbrechen' : 'Neue Ablesung'}</button>
        </div>
      </div>
      <div style={c.filterBar}>
        <select style={{ ...c.filterSelect, width: 250 }} value={selectedProp} onChange={e => setSelectedProp(e.target.value)}>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select style={{ ...c.filterSelect, width: 200 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Alle Zählertypen</option>
          {METER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {scanning && (
        <div style={c.scanBox}>
          <div style={c.spinner} />
          <p style={c.scanLabel}>KI liest Zählerstand ab...</p>
        </div>
      )}

      {showForm && (
        <form style={c.form} onSubmit={save}>
          {photoPreview && (
            <div style={{ marginBottom: 16, textAlign: 'center' }}>
              <img src={photoPreview} alt="Vorschau" style={{ maxWidth: 300, maxHeight: 200, borderRadius: 8, border: `1px solid ${theme.colors.border}` }} />
            </div>
          )}
          <div style={c.row2}>
            <div>
              <label style={c.label}>Zählertyp *</label>
              <select style={c.select} value={form.meter_type} onChange={e => setForm({ ...form, meter_type: e.target.value })}>
                {METER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={c.label}>Zählerstand *</label>
              <input style={c.input} type="number" step="0.01" value={form.reading_value} onChange={e => setForm({ ...form, reading_value: e.target.value })} required />
            </div>
          </div>
          <div style={c.row2}>
            <div>
              <label style={c.label}>Datum *</label>
              <input style={c.input} type="date" value={form.reading_date} onChange={e => setForm({ ...form, reading_date: e.target.value })} required />
            </div>
            <div>
              <label style={c.label}>Notizen</label>
              <input style={c.input} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <button style={c.btn} type="submit">Speichern</button>
        </form>
      )}
      <table style={c.table}>
        <thead><tr><th style={c.th}>Datum</th><th style={c.th}>Zählertyp</th><th style={c.th}>Wert</th><th style={c.th}>Notizen</th><th style={c.th}>Foto</th><th style={c.th}>Aktionen</th></tr></thead>
        <tbody>
          {readings.map(r => (
            <tr key={r.id}>
              <td style={c.td}>{new Date(r.reading_date).toLocaleDateString('de-DE')}</td>
              <td style={c.td}>{typeLabel(r.meter_type)}</td>
              <td style={c.td}>{r.reading_value.toLocaleString('de-DE')}</td>
              <td style={c.td}>{r.notes}</td>
              <td style={c.td}>
                {r.photo_url && <span style={{ cursor: 'pointer', fontSize: 18, color: theme.colors.scan }} onClick={() => setViewPhoto(API_BASE + r.photo_url)} title="Foto anzeigen">&#128247;</span>}
              </td>
              <td style={c.td}><button style={c.btnDanger} onClick={() => del(r.id)}>Löschen</button></td>
            </tr>
          ))}
          {readings.length === 0 && <tr><td style={c.tdEmpty} colSpan={6}>Keine Ablesungen vorhanden</td></tr>}
        </tbody>
      </table>

      {viewPhoto && (
        <div style={c.modalOverlay} onClick={() => setViewPhoto(null)}>
          <img src={viewPhoto} alt="Zählerfoto" style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: 8 }} />
        </div>
      )}
    </div>
  );
}
