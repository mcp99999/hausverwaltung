import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import api, { API_BASE } from '../api';
import theme from '../styles/theme';
import * as c from '../styles/common';

const fmt = (n) => n != null ? n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' \u20AC' : '-';
const METER_LABELS = { water: 'Wasser', electricity_day: 'Strom (Tag)', electricity_night: 'Strom (Nacht)', wastewater: 'Abwasser' };
const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

export default function Reports() {
  const [properties, setProperties] = useState([]);
  const [selectedProp, setSelectedProp] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [tab, setTab] = useState('consumption');
  const [consumption, setConsumption] = useState({});
  const [costs, setCosts] = useState(null);
  const [forecast, setForecast] = useState({});
  const [monthly, setMonthly] = useState([]);
  const [annual, setAnnual] = useState(null);

  useEffect(() => {
    api.get('/api/properties').then(r => { setProperties(r.data); if (r.data.length > 0) setSelectedProp(r.data[0].id); });
  }, []);

  useEffect(() => {
    if (!selectedProp) return;
    const start = `${year}-01-01`, end = `${year}-12-31`;
    api.get(`/api/reports/consumption/${selectedProp}?start=${start}&end=${end}`).then(r => setConsumption(r.data));
    api.get(`/api/reports/costs/${selectedProp}?start=${start}&end=${end}`).then(r => setCosts(r.data));
    api.get(`/api/reports/forecast/${selectedProp}?year=${year}`).then(r => setForecast(r.data));
    api.get(`/api/reports/monthly/${selectedProp}?year=${year}`).then(r => setMonthly(r.data));
    api.get(`/api/reports/annual/${selectedProp}?year=${year}`).then(r => setAnnual(r.data));
  }, [selectedProp, year]);

  const exportCSV = async (type) => {
    const start = `${year}-01-01`, end = `${year}-12-31`;
    const res = await api.get(`/api/reports/export/${selectedProp}?type=${type}&start=${start}&end=${end}`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${type}_${selectedProp}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const consumptionChartData = Object.entries(consumption).map(([key, val]) => ({
    name: METER_LABELS[key] || key, Verbrauch: val.total,
  }));

  const costChartData = costs?.consumption_costs ? Object.entries(costs.consumption_costs).map(([key, val]) => ({
    name: METER_LABELS[key] || key, Kosten: val.total_cost,
  })) : [];

  const forecastChartData = Object.entries(forecast).map(([key, val]) => ({
    name: METER_LABELS[key] || key, Ist: val.actual_consumption, Prognose: val.total_forecast,
  }));

  const monthlyChartData = monthly.map((m, i) => ({ name: MONTHS[i], 'Lfd. Kosten': m.recurring_costs, Ausgaben: m.expenses }));

  const tabs = [
    { id: 'consumption', label: 'Verbrauch' },
    { id: 'costs', label: 'Kosten' },
    { id: 'forecast', label: 'Prognose' },
    { id: 'monthly', label: 'Monatlich' },
    { id: 'annual', label: 'Jahresabrechnung' },
  ];

  return (
    <div>
      <h1 style={c.h1}>Reports</h1>
      <div style={c.filterBar}>
        <select style={c.filterSelect} value={selectedProp} onChange={e => setSelectedProp(e.target.value)}>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select style={c.filterSelect} value={year} onChange={e => setYear(parseInt(e.target.value))}>
          {[...Array(5)].map((_, i) => { const y = new Date().getFullYear() - i; return <option key={y} value={y}>{y}</option>; })}
        </select>
        <button style={c.btnExport} onClick={() => exportCSV('meters')}>CSV Zähler</button>
        <button style={c.btnExport} onClick={() => exportCSV('expenses')}>CSV Ausgaben</button>
        <button style={c.btnExport} onClick={() => exportCSV('recurring')}>CSV Lfd. Kosten</button>
      </div>

      <div style={c.tabBar}>
        {tabs.map(t => <button key={t.id} style={tab === t.id ? c.tabActive : c.tab} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>

      {tab === 'consumption' && (
        <div style={c.card}>
          <h2 style={{ ...c.h2, marginTop: 0 }}>Verbrauchsübersicht {year}</h2>
          {consumptionChartData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={consumptionChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="Verbrauch" fill={theme.colors.info} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <table style={{ ...c.table, marginTop: 20 }}>
                <thead><tr><th style={c.th}>Zählertyp</th><th style={c.th}>Verbrauch</th><th style={c.th}>Tage</th><th style={c.th}>&Oslash;/Tag</th></tr></thead>
                <tbody>
                  {Object.entries(consumption).map(([key, val]) => (
                    <tr key={key}><td style={c.td}>{METER_LABELS[key]}</td><td style={c.td}>{val.total.toLocaleString('de-DE')}</td><td style={c.td}>{val.days}</td><td style={c.td}>{val.daily_avg.toFixed(4)}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : <p style={{ color: theme.colors.textMuted }}>Keine Verbrauchsdaten für diesen Zeitraum</p>}
        </div>
      )}

      {tab === 'costs' && costs && (
        <div style={c.card}>
          <h2 style={{ ...c.h2, marginTop: 0 }}>Kostenübersicht {year}</h2>
          <div style={c.kpiGrid}>
            <div style={c.kpiCard}><div style={c.kpiVal}>{fmt(costs.grand_total)}</div><div style={c.kpiLabel}>Gesamtkosten</div></div>
            <div style={c.kpiCard}><div style={c.kpiVal}>{fmt(Object.values(costs.consumption_costs).reduce((a, x) => a + x.total_cost, 0))}</div><div style={c.kpiLabel}>Verbrauchskosten</div></div>
            <div style={c.kpiCard}><div style={c.kpiVal}>{fmt(costs.recurring_costs.total)}</div><div style={c.kpiLabel}>Laufende Kosten</div></div>
            <div style={c.kpiCard}><div style={c.kpiVal}>{fmt(costs.expenses.total)}</div><div style={c.kpiLabel}>Einmalige Ausgaben</div></div>
          </div>
          {costChartData.length > 0 && (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={costChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(v) => fmt(v)} />
                <Bar dataKey="Kosten" fill={theme.colors.danger} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {tab === 'forecast' && (
        <div style={c.card}>
          <h2 style={{ ...c.h2, marginTop: 0 }}>Verbrauchsprognose {year}</h2>
          {forecastChartData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={forecastChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Ist" fill={theme.colors.info} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Prognose" fill="#95a5a6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <table style={{ ...c.table, marginTop: 20 }}>
                <thead><tr><th style={c.th}>Zählertyp</th><th style={c.th}>Ist</th><th style={c.th}>&Oslash;/Tag</th><th style={c.th}>Restliche Tage</th><th style={c.th}>Prognose Gesamt</th></tr></thead>
                <tbody>
                  {Object.entries(forecast).map(([key, val]) => (
                    <tr key={key}><td style={c.td}>{METER_LABELS[key]}</td><td style={c.td}>{val.actual_consumption}</td><td style={c.td}>{val.daily_avg.toFixed(4)}</td><td style={c.td}>{val.remaining_days}</td><td style={c.td}><strong>{val.total_forecast}</strong></td></tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : <p style={{ color: theme.colors.textMuted }}>Nicht genug Daten für Prognose</p>}
        </div>
      )}

      {tab === 'monthly' && (
        <div style={c.card}>
          <h2 style={{ ...c.h2, marginTop: 0 }}>Monatliche Kostenentwicklung {year}</h2>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={monthlyChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(v) => fmt(v)} />
              <Legend />
              <Line type="monotone" dataKey="Lfd. Kosten" stroke={theme.colors.info} strokeWidth={2} />
              <Line type="monotone" dataKey="Ausgaben" stroke={theme.colors.danger} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {tab === 'annual' && annual && (
        <div style={c.card}>
          <h2 style={{ ...c.h2, marginTop: 0 }}>Jahresabrechnung {year}</h2>
          <div style={c.kpiGrid}>
            <div style={c.kpiCard}><div style={{ ...c.kpiVal, color: theme.colors.danger }}>{fmt(annual.grand_total)}</div><div style={c.kpiLabel}>Gesamtkosten</div></div>
          </div>
          {Object.keys(annual.costs).length > 0 && (
            <>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Verbrauchskosten</h3>
              <table style={{ ...c.table, marginBottom: 20 }}>
                <thead><tr><th style={c.th}>Typ</th><th style={c.th}>Verbrauch</th><th style={c.th}>Preis/Einheit</th><th style={c.th}>Verbrauchskosten</th><th style={c.th}>Grundkosten</th><th style={c.th}>Gesamt</th></tr></thead>
                <tbody>
                  {Object.entries(annual.costs).map(([key, val]) => (
                    <tr key={key}><td style={c.td}>{METER_LABELS[key]}</td><td style={c.td}>{val.consumption}</td><td style={c.td}>{val.price_per_unit} \u20AC</td><td style={c.td}>{fmt(val.usage_cost)}</td><td style={c.td}>{fmt(val.base_cost_total)}</td><td style={c.td}><strong>{fmt(val.total_cost)}</strong></td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {annual.recurring_costs.details.length > 0 && (
            <>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Laufende Kosten ({fmt(annual.recurring_costs.total)})</h3>
              <table style={{ ...c.table, marginBottom: 20 }}>
                <thead><tr><th style={c.th}>Beschreibung</th><th style={c.th}>Anbieter</th><th style={c.th}>Monatlich</th><th style={c.th}>Monate</th><th style={c.th}>Gesamt</th></tr></thead>
                <tbody>
                  {annual.recurring_costs.details.map((d, i) => (
                    <tr key={i}><td style={c.td}>{d.description}</td><td style={c.td}>{d.vendor}</td><td style={c.td}>{fmt(d.monthly_amount)}</td><td style={c.td}>{d.months}</td><td style={c.td}>{fmt(d.total)}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {annual.expenses.details.length > 0 && (
            <>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Einmalige Ausgaben ({fmt(annual.expenses.total)})</h3>
              <table style={{ ...c.table, marginBottom: 20 }}>
                <thead><tr><th style={c.th}>Datum</th><th style={c.th}>Rechnungsersteller</th><th style={c.th}>Beschreibung</th><th style={c.th}>Brutto</th><th style={c.th}>Anhänge</th></tr></thead>
                <tbody>
                  {annual.expenses.details.map((e, i) => (
                    <tr key={i}>
                      <td style={c.td}>{new Date(e.invoice_date).toLocaleDateString('de-DE')}</td>
                      <td style={c.td}>{e.vendor}</td>
                      <td style={c.td}>{e.description}</td>
                      <td style={c.td}>{fmt(e.gross_amount)}</td>
                      <td style={c.td}>
                        {e.attachments && e.attachments.length > 0 ? e.attachments.map((a, j) => (
                          <a key={j} href={API_BASE + a.url} target="_blank" rel="noopener noreferrer" style={{ color: theme.colors.link, fontSize: 13, marginRight: 8 }}>
                            {a.file_type === 'pdf' ? '\u{1F4C4}' : '\u{1F5BC}'} {a.original_filename}
                          </a>
                        )) : <span style={{ color: theme.colors.gray400 }}>-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}
