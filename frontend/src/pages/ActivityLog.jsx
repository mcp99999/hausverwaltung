import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import theme from '../styles/theme';
import * as c from '../styles/common';

const ACTION_COLORS = { create: '#27ae60', update: '#3498db', delete: '#e74c3c', view: '#8e44ad', export: '#f39c12', import: '#2980b9' };
const ACTION_LABELS = { create: 'Erstellt', update: 'Aktualisiert', delete: 'Gelöscht', view: 'Angesehen', export: 'Exportiert', import: 'Importiert' };
const ENTITY_LABELS = { property: 'Immobilie', user: 'Benutzer', meter_reading: 'Zählerstand', tariff: 'Tarif', expense: 'Ausgabe', recurring_cost: 'Lfd. Kosten', report: 'Report', attachment: 'Anhang', backup: 'Backup' };

export default function ActivityLog() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const limit = 50;

  const canAccess = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    if (!canAccess) return;
    const params = new URLSearchParams({ limit, offset });
    if (actionFilter) params.set('action', actionFilter);
    if (entityFilter) params.set('entity_type', entityFilter);
    api.get(`/api/activity-log?${params}`).then(r => {
      setEntries(r.data.entries);
      setTotal(r.data.total);
    });
  }, [offset, actionFilter, entityFilter, canAccess]);

  if (!canAccess) return <div><h1 style={c.h1}>Zugriff verweigert</h1></div>;

  return (
    <div>
      <h1 style={c.h1}>Aktivitätslog</h1>
      <div style={c.filterBar}>
        <select style={c.filterSelect} value={actionFilter} onChange={e => { setActionFilter(e.target.value); setOffset(0); }}>
          <option value="">Alle Aktionen</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select style={c.filterSelect} value={entityFilter} onChange={e => { setEntityFilter(e.target.value); setOffset(0); }}>
          <option value="">Alle Bereiche</option>
          {Object.entries(ENTITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <span style={{ fontSize: theme.fontSize.md, color: theme.colors.textMuted }}>{total} Einträge</span>
      </div>
      <table style={c.table}>
        <thead>
          <tr>
            <th style={c.th}>Zeitpunkt</th>
            <th style={c.th}>Benutzer</th>
            <th style={c.th}>Aktion</th>
            <th style={c.th}>Bereich</th>
            <th style={c.th}>Details</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(e => (
            <tr key={e.id}>
              <td style={c.td}>{new Date(e.timestamp).toLocaleString('de-DE')}</td>
              <td style={c.td}>{e.username}</td>
              <td style={c.td}>
                <span style={{ ...c.badge, background: (ACTION_COLORS[e.action] || '#888') + '20', color: ACTION_COLORS[e.action] || '#888' }}>
                  {ACTION_LABELS[e.action] || e.action}
                </span>
              </td>
              <td style={c.td}>{ENTITY_LABELS[e.entity_type] || e.entity_type}</td>
              <td style={c.td}>{e.details}</td>
            </tr>
          ))}
          {entries.length === 0 && <tr><td style={c.tdEmpty} colSpan={5}>Keine Einträge</td></tr>}
        </tbody>
      </table>
      {total > limit && (
        <div style={c.pagination}>
          <button style={c.btn} disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>Zurück</button>
          <span style={{ fontSize: theme.fontSize.md }}>{offset + 1}–{Math.min(offset + limit, total)} von {total}</span>
          <button style={c.btn} disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)}>Weiter</button>
        </div>
      )}
    </div>
  );
}
