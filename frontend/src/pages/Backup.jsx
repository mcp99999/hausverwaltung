import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import theme from '../styles/theme';
import * as c from '../styles/common';

const STAT_LABELS = { properties: 'Immobilien', users: 'Benutzer', meter_readings: 'Zählerstände', tariffs: 'Tarife', expenses: 'Ausgaben', recurring_costs: 'Lfd. Kosten', attachments: 'Anhänge', activity_logs: 'Aktivitätslogs' };

export default function Backup() {
  const { user } = useAuth();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restorePreview, setRestorePreview] = useState(null);
  const [message, setMessage] = useState(null);

  const canAccess = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    if (canAccess) {
      api.get('/api/backup/info').then(r => setInfo(r.data));
    }
  }, [canAccess]);

  if (!canAccess) return <div><h1 style={c.h1}>Zugriff verweigert</h1></div>;

  const doBackup = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await api.get('/api/backup', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `hausverwaltung_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Backup erfolgreich heruntergeladen' });
    } catch {
      setMessage({ type: 'error', text: 'Backup fehlgeschlagen' });
    }
    setLoading(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setRestoreFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        setRestorePreview({
          properties: data.properties?.length || 0,
          users: data.users?.length || 0,
          meter_readings: data.meter_readings?.length || 0,
          tariffs: data.tariffs?.length || 0,
          expenses: data.expenses?.length || 0,
          recurring_costs: data.recurring_costs?.length || 0,
          attachments: (data.attachments?.length || 0) + (data.meter_photos?.length || 0),
        });
      } catch {
        setMessage({ type: 'error', text: 'Ungültige Backup-Datei' });
      }
    };
    reader.readAsText(file);
  };

  const doRestore = async () => {
    if (!restoreFile || !window.confirm('Backup wirklich wiederherstellen? Bestehende Daten mit gleichen Namen werden übersprungen.')) return;
    setLoading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', restoreFile);
      const res = await api.post('/api/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage({ type: 'success', text: `Wiederherstellung erfolgreich: ${JSON.stringify(res.data.imported)}` });
      setRestoreFile(null);
      setRestorePreview(null);
      api.get('/api/backup/info').then(r => setInfo(r.data));
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Wiederherstellung fehlgeschlagen' });
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 style={c.h1}>Backup & Wiederherstellung</h1>

      <div style={c.card}>
        <h2 style={{ ...c.h2, marginTop: 0 }}>Backup erstellen</h2>
        {info && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
            {Object.entries(info).map(([key, val]) => (
              <div key={key} style={{ background: theme.colors.bgPage, borderRadius: theme.radius.lg, padding: 16, textAlign: 'center', border: `1px solid ${theme.colors.border}` }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: theme.colors.primary }}>{val}</div>
                <div style={{ fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginTop: 4 }}>{STAT_LABELS[key] || key}</div>
              </div>
            ))}
          </div>
        )}
        <button style={c.btn} onClick={doBackup} disabled={loading}>
          {loading ? 'Wird erstellt...' : 'Backup herunterladen'}
        </button>
      </div>

      <div style={{ ...c.card, marginTop: 24 }}>
        <h2 style={{ ...c.h2, marginTop: 0 }}>Wiederherstellen</h2>
        <p style={{ fontSize: theme.fontSize.base, color: theme.colors.textSecondary, marginBottom: 12 }}>
          Lade eine JSON-Backup-Datei hoch, um Daten wiederherzustellen. Bestehende Einträge mit gleichen Namen werden übersprungen.
        </p>
        <input type="file" accept=".json" onChange={handleFileSelect} style={{ margin: '12px 0' }} />
        {restorePreview && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginTop: 16, marginBottom: 20 }}>
              {Object.entries(restorePreview).map(([key, val]) => (
                <div key={key} style={{ background: theme.colors.bgPage, borderRadius: theme.radius.lg, padding: 16, textAlign: 'center', border: `1px solid ${theme.colors.border}` }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: theme.colors.primary }}>{val}</div>
                  <div style={{ fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginTop: 4 }}>{STAT_LABELS[key] || key}</div>
                </div>
              ))}
            </div>
            <button style={{ ...c.btn, background: theme.colors.danger }} onClick={doRestore} disabled={loading}>
              {loading ? 'Wird wiederhergestellt...' : 'Jetzt wiederherstellen'}
            </button>
          </>
        )}
      </div>

      {message && (
        <div style={message.type === 'success' ? c.msgSuccess : c.msgError}>
          {message.text}
        </div>
      )}
    </div>
  );
}
