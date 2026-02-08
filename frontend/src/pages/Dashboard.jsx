import React, { useState, useEffect } from 'react';
import api from '../api';
import theme from '../styles/theme';
import * as c from '../styles/common';

export default function Dashboard() {
  const [data, setData] = useState([]);

  useEffect(() => { api.get('/api/reports/dashboard').then(r => setData(r.data)); }, []);

  return (
    <div>
      <h1 style={c.h1}>Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        {data.map(p => (
          <div key={p.id} style={c.card}>
            <div style={c.cardTitle}>{p.name}</div>
            <div style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.md, marginBottom: theme.spacing.lg }}>{p.address}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div style={{ textAlign: 'center', padding: 10, background: theme.colors.bgPage, borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.border}` }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: theme.colors.primary }}>{p.readings_count}</div>
                <div style={{ fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginTop: 2 }}>Ablesungen</div>
              </div>
              <div style={{ textAlign: 'center', padding: 10, background: theme.colors.bgPage, borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.border}` }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: theme.colors.primary }}>{p.expenses_count}</div>
                <div style={{ fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginTop: 2 }}>Ausgaben</div>
              </div>
              <div style={{ textAlign: 'center', padding: 10, background: theme.colors.bgPage, borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.border}` }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: theme.colors.primary }}>{p.active_recurring_costs}</div>
                <div style={{ fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginTop: 2 }}>Lfd. Kosten</div>
              </div>
            </div>
            {p.latest_reading_date && (
              <div style={{ marginTop: theme.spacing.md, fontSize: theme.fontSize.sm, color: theme.colors.textMuted }}>
                Letzte Ablesung: {new Date(p.latest_reading_date).toLocaleDateString('de-DE')}
              </div>
            )}
          </div>
        ))}
        {data.length === 0 && (
          <div style={c.emptyState}>
            <div style={c.emptyIcon}>{'\u{1F3E2}'}</div>
            <div style={c.emptyText}>Keine Immobilien vorhanden. Legen Sie zuerst eine Immobilie an.</div>
          </div>
        )}
      </div>
    </div>
  );
}
