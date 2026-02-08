import React, { useState, useEffect } from 'react';
import api from '../api';
import theme from '../styles/theme';
import * as c from '../styles/common';

const GROUPS = [
  {
    key: 'water',
    label: 'Wasser',
    types: [
      { value: 'water', label: 'Wasser', unit: '\u20AC/m\u00B3' },
      { value: 'wastewater', label: 'Abwasser', unit: '\u20AC/m\u00B3' },
    ],
  },
  {
    key: 'electricity',
    label: 'Strom',
    types: [
      { value: 'electricity_day', label: 'Strom (Tag)', unit: '\u20AC/kWh' },
      { value: 'electricity_night', label: 'Strom (Nacht)', unit: '\u20AC/kWh' },
    ],
  },
];

const ALL_TYPES = GROUPS.flatMap(g => g.types);

const s = {
  formTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.primary, marginBottom: theme.spacing.lg },
  typeRow: { display: 'grid', gridTemplateColumns: '140px 1fr 1fr', gap: 12, alignItems: 'center', marginBottom: 8 },
  typeLabel: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, color: theme.colors.textSecondary },
  groupHeader: { background: theme.colors.bgTableHeader, padding: '10px 16px', fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.primary, borderBottom: `1px solid ${theme.colors.border}` },
};

export default function Tariffs() {
  const [properties, setProperties] = useState([]);
  const [selectedProp, setSelectedProp] = useState('');
  const [tariffs, setTariffs] = useState([]);
  const [activeForm, setActiveForm] = useState(null);
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [prices, setPrices] = useState({});

  useEffect(() => { api.get('/api/properties').then(r => { setProperties(r.data); if (r.data.length > 0) setSelectedProp(r.data[0].id); }); }, []);
  useEffect(() => { if (selectedProp) load(); }, [selectedProp]);

  const load = () => api.get(`/api/properties/${selectedProp}/tariffs`).then(r => setTariffs(r.data));

  const openForm = (groupKey) => {
    const group = GROUPS.find(g => g.key === groupKey);
    const init = {};
    group.types.forEach(t => { init[t.value] = { price: '', base: '0' }; });
    setPrices(init);
    setValidFrom('');
    setValidTo('');
    setActiveForm(groupKey);
  };

  const save = async (e) => {
    e.preventDefault();
    const group = GROUPS.find(g => g.key === activeForm);
    const tariffsList = group.types
      .filter(t => prices[t.value]?.price !== '')
      .map(t => ({
        tariff_type: t.value,
        price_per_unit: parseFloat(prices[t.value].price),
        base_cost_monthly: parseFloat(prices[t.value].base || '0'),
      }));
    if (tariffsList.length === 0) return alert('Bitte mindestens einen Preis eingeben');
    await api.post(`/api/properties/${selectedProp}/tariffs/bulk`, {
      valid_from: validFrom,
      valid_to: validTo || null,
      tariffs: tariffsList,
    });
    setActiveForm(null);
    load();
  };

  const del = async (id) => { if (window.confirm('Wirklich löschen?')) { await api.delete(`/api/tariffs/${id}`); load(); } };

  const delGroup = async (ids) => {
    if (!window.confirm('Alle Tarife dieser Gruppe löschen?')) return;
    for (const id of ids) await api.delete(`/api/tariffs/${id}`);
    load();
  };

  const typeLabel = (v) => ALL_TYPES.find(t => t.value === v)?.label || v;
  const typeUnit = (v) => ALL_TYPES.find(t => t.value === v)?.unit || '';

  const updatePrice = (type, field, value) => {
    setPrices(prev => ({ ...prev, [type]: { ...prev[type], [field]: value } }));
  };

  const groupedByCategory = GROUPS.map(group => {
    const typeValues = group.types.map(t => t.value);
    const relevant = tariffs.filter(t => typeValues.includes(t.tariff_type));
    const byDate = relevant.reduce((acc, t) => {
      const key = t.valid_from;
      if (!acc[key]) acc[key] = [];
      acc[key].push(t);
      return acc;
    }, {});
    return { ...group, byDate };
  });

  const activeGroup = activeForm ? GROUPS.find(g => g.key === activeForm) : null;

  return (
    <div>
      <div style={c.pageHeader}>
        <h1 style={c.h1}>Tarife</h1>
        <div>
          {activeForm ? (
            <button style={c.btn} onClick={() => setActiveForm(null)}>Abbrechen</button>
          ) : (
            <>
              <button style={c.btnOutline} onClick={() => openForm('water')}>Neue Wassertarife</button>
              <button style={c.btn} onClick={() => openForm('electricity')}>Neue Stromtarife</button>
            </>
          )}
        </div>
      </div>
      <select style={{ ...c.filterSelect, width: 300, marginBottom: 20 }} value={selectedProp} onChange={e => setSelectedProp(e.target.value)}>
        {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      {activeForm && activeGroup && (
        <form style={c.form} onSubmit={save}>
          <div style={s.formTitle}>{activeGroup.label}tarife anlegen</div>
          <div style={c.row2}>
            <div><label style={c.label}>Gültig ab *</label>
              <input style={c.input} type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} required /></div>
            <div><label style={c.label}>Gültig bis (leer = aktuell gültig)</label>
              <input style={c.input} type="date" value={validTo} onChange={e => setValidTo(e.target.value)} /></div>
          </div>
          <div style={{ ...s.typeRow, marginBottom: 4 }}>
            <span style={{ fontSize: theme.fontSize.xs, color: theme.colors.textMuted }}>Typ</span>
            <span style={{ fontSize: theme.fontSize.xs, color: theme.colors.textMuted }}>Preis pro Einheit</span>
            <span style={{ fontSize: theme.fontSize.xs, color: theme.colors.textMuted }}>Grundkosten/Monat</span>
          </div>
          {activeGroup.types.map(t => (
            <div key={t.value} style={s.typeRow}>
              <span style={s.typeLabel}>{t.label} <span style={{ color: theme.colors.textLight, fontWeight: 400 }}>({t.unit})</span></span>
              <input style={c.input} type="number" step="0.0001" placeholder={t.unit}
                value={prices[t.value]?.price || ''} onChange={e => updatePrice(t.value, 'price', e.target.value)} />
              <input style={c.input} type="number" step="0.01" placeholder="0.00 \u20AC"
                value={prices[t.value]?.base || ''} onChange={e => updatePrice(t.value, 'base', e.target.value)} />
            </div>
          ))}
          <button style={{ ...c.btn, marginTop: 16 }} type="submit">Speichern</button>
        </form>
      )}

      {groupedByCategory.map(group => {
        const dateEntries = Object.entries(group.byDate).sort(([a], [b]) => b.localeCompare(a));
        if (dateEntries.length === 0) return null;
        return (
          <div key={group.key} style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, marginBottom: 12 }}>{group.label}</h2>
            {dateEntries.map(([validFromDate, items]) => {
              const validToDate = items[0].valid_to;
              return (
                <div key={validFromDate} style={{ marginBottom: 12 }}>
                  <table style={c.table}>
                    <thead>
                      <tr>
                        <td colSpan={4} style={s.groupHeader}>
                          <span>Gültig ab: {new Date(validFromDate).toLocaleDateString('de-DE')}</span>
                          <span style={{ marginLeft: 24 }}>bis: {validToDate ? new Date(validToDate).toLocaleDateString('de-DE') : 'Aktuell'}</span>
                          <button style={{ ...c.btnDanger, marginLeft: 16, float: 'right' }} onClick={() => delGroup(items.map(i => i.id))}>Gruppe löschen</button>
                        </td>
                      </tr>
                      <tr><th style={c.th}>Typ</th><th style={c.th}>Preis/Einheit</th><th style={c.th}>Grundkosten/Monat</th><th style={c.th}>Aktion</th></tr>
                    </thead>
                    <tbody>
                      {items.map(t => (
                        <tr key={t.id}>
                          <td style={c.td}>{typeLabel(t.tariff_type)}</td>
                          <td style={c.td}>{t.price_per_unit.toFixed(4)} {typeUnit(t.tariff_type)}</td>
                          <td style={c.td}>{t.base_cost_monthly.toFixed(2)} \u20AC</td>
                          <td style={c.td}><button style={c.btnDanger} onClick={() => del(t.id)}>Löschen</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        );
      })}

      {tariffs.length === 0 && (
        <table style={c.table}>
          <tbody><tr><td style={c.tdEmpty}>Keine Tarife vorhanden</td></tr></tbody>
        </table>
      )}
    </div>
  );
}
