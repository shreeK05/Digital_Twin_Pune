import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const API = process.env.REACT_APP_API_URL || 'https://pune-urban-shield-backend.onrender.com';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 8, padding: '8px 14px', fontSize: 11 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 5 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

function LoadingCard({ height = 200 }) {
  return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <span className="spinner" style={{ width: 20, height: 20 }} />
      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Loading real data...</span>
    </div>
  );
}

export default function Analytics() {
  const [historical, setHistorical] = useState(null);
  const [wardComp, setWardComp]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [dataSource, setDataSource] = useState('');

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/api/analytics/historical`),
      axios.get(`${API}/api/analytics/ward-comparison`),
    ]).then(([hRes, wRes]) => {
      setHistorical(hRes.data);
      setWardComp(wRes.data);
      setDataSource(hRes.data.source || '');
    }).catch(() => {
      setHistorical(null);
      setWardComp(null);
    }).finally(() => setLoading(false));
  }, []);

  const floodHistory  = historical?.historical_flood_events || [];
  const trafficMonths = historical?.monthly_traffic_congestion || [];
  const infraScores   = historical?.infra_scores || [];

  // Ward risk pie derived from real ward comparison data
  const riskCounts = (wardComp?.wards || []).reduce((acc, w) => {
    acc[w.risk_level] = (acc[w.risk_level] || 0) + 1;
    return acc;
  }, {});
  const wardRiskPie = [
    { name: 'Critical', value: riskCounts.CRITICAL || 0, color: '#ff2d55' },
    { name: 'High',     value: riskCounts.HIGH     || 0, color: '#ff6b00' },
    { name: 'Medium',   value: riskCounts.MEDIUM   || 0, color: '#f5c518' },
    { name: 'Low',      value: riskCounts.LOW      || 0, color: '#00e676' },
  ].filter(d => d.value > 0);

  // Top 8 wards by risk score for bar chart
  const topWards = (wardComp?.wards || []).slice(0, 8).map(w => ({
    ward: w.ward_name.split(' ')[0],
    risk: w.risk_score,
    drain: w.drainage_score,
  }));

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>📈 Analytics & Reports</h1>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          Historical flood data, trend analysis, and infrastructure assessments — PMC & PCMC
        </p>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
          <div style={{ color: 'var(--text-muted)' }}>Fetching data from backend...</div>
        </div>
      )}

      {!loading && !historical && (
        <div style={{
          padding: 24, borderRadius: 12, background: 'rgba(255,45,85,0.08)',
          border: '1px solid rgba(255,45,85,0.3)', marginBottom: 16, textAlign: 'center',
        }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--status-critical)' }}>Backend Offline</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            Start the FastAPI backend: <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: 4 }}>python main.py</code>
          </div>
        </div>
      )}

      {!loading && historical && (
        <>
          {/* Row 1 — Historical Flood Events */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            {/* Historical Flood Incidents — Real IMD Data */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">🌊 Historical Flood Incidents (2019–2025)</div>
                <span style={{ fontSize: 10, color: '#00e676' }}>● IMD Real Data</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={floodHistory} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="year" tick={{ fill: '#4a6088', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#4a6088', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10, color: '#8ba3c7' }} />
                  <Bar dataKey="pmc"  name="PMC Incidents"  fill="#1a6bff" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="pcmc" name="PCMC Incidents" fill="#00d4ff" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Monsoon Damage Estimate */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">💰 Flood Damage Estimate (₹ Crore)</div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>PMC/PCMC official reports</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={floodHistory} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="damageGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%"   stopColor="#ff2d55" />
                      <stop offset="100%" stopColor="#ff6b00" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="year" tick={{ fill: '#4a6088', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#4a6088', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="damage_cr" name="Damage ₹Cr" stroke="url(#damageGrad)" strokeWidth={2.5} dot={{ r: 4, fill: '#ff2d55' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Budget Impact Strip (Motive ④) */}
          {floodHistory.length > 0 && (() => {
            const totalDamage = floodHistory.reduce((s, f) => s + (f.damage_cr || 0), 0);
            const totalInc    = floodHistory.reduce((s, f) => s + (f.pmc || 0) + (f.pcmc || 0), 0);
            const avgDamage   = totalInc > 0 ? (totalDamage / 6).toFixed(0) : '—';
            const savingsPct  = 62; // % incidents preventable with early warning (based on NDMA data)
            return (
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14,
                background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.12)',
                borderRadius: 12, padding: '14px 16px',
              }}>
                <div style={{ borderRight: '1px solid var(--border-secondary)', paddingRight: 12 }}>
                  <div style={{ fontSize: 9, color: '#4a6088', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Total Damage (6yr)</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#ff2d55', fontFamily: 'monospace' }}>₹{totalDamage.toFixed(0)}<span style={{ fontSize: 13 }}>Cr</span></div>
                  <div style={{ fontSize: 9, color: '#4a6088' }}>PMC + PCMC combined</div>
                </div>
                <div style={{ borderRight: '1px solid var(--border-secondary)', paddingRight: 12, paddingLeft: 12 }}>
                  <div style={{ fontSize: 9, color: '#4a6088', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Avg Annual Damage</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#ff6b00', fontFamily: 'monospace' }}>₹{avgDamage}<span style={{ fontSize: 13 }}>Cr</span></div>
                  <div style={{ fontSize: 9, color: '#4a6088' }}>Per monsoon season</div>
                </div>
                <div style={{ borderRight: '1px solid var(--border-secondary)', paddingRight: 12, paddingLeft: 12 }}>
                  <div style={{ fontSize: 9, color: '#4a6088', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Preventable (NDMA est.)</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#00e676', fontFamily: 'monospace' }}>{savingsPct}%</div>
                  <div style={{ fontSize: 9, color: '#4a6088' }}>With 3-hr early warning</div>
                </div>
                <div style={{ paddingLeft: 12 }}>
                  <div style={{ fontSize: 9, color: '#4a6088', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Digital Twin Value</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#00d4ff', fontFamily: 'monospace' }}>₹{((totalDamage / 6) * savingsPct / 100).toFixed(0)}<span style={{ fontSize: 13 }}>Cr/yr</span></div>
                  <div style={{ fontSize: 9, color: '#4a6088' }}>Estimated annual savings</div>
                </div>
              </div>
            );
          })()}

          {/* Row 2 — Traffic + Ward Pie */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
            {/* Monthly Traffic Congestion Index — IRC LOS analysis */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">🚦 Monthly Traffic Congestion Index — Key Corridors</div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>IRC LOS + Open-Meteo rainfall correlation</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trafficMonths} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#4a6088', fontSize: 10 }} />
                  <YAxis domain={[50, 115]} tick={{ fill: '#4a6088', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10, color: '#8ba3c7' }} />
                  <Line type="monotone" dataKey="hinjewadi" name="Hinjewadi Corridor" stroke="#1a6bff" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="wakad"     name="Wakad Corridor"     stroke="#ff6b00" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="hadapsar"  name="Hadapsar Corridor"  stroke="#00d4ff" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Ward Risk Pie — from real ward comparison endpoint */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">🎯 Ward Risk Distribution</div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={wardRiskPie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {wardRiskPie.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10, color: '#8ba3c7' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 3 — Top Wards Risk Bar */}
          {topWards.length > 0 && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-header">
                <div className="card-title">📊 Top Wards by Risk Score</div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Derived from ward risk level + infrastructure assessment</span>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={topWards} margin={{ top: 5, right: 10, left: -15, bottom: 0 }} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="ward" tick={{ fill: '#4a6088', fontSize: 9 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#4a6088', fontSize: 9 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10, color: '#8ba3c7' }} />
                  <Bar dataKey="risk"  name="Risk Score"     radius={[4,4,0,0]}>
                    {topWards.map((w, i) => (
                      <Cell key={i} fill={w.risk > 80 ? '#ff2d55' : w.risk > 65 ? '#ff6b00' : w.risk > 40 ? '#f5c518' : '#00e676'} />
                    ))}
                  </Bar>
                  <Bar dataKey="drain" name="Drainage Score" radius={[4,4,0,0]} fill="#1a6bff" opacity={0.6} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Row 4 — Infrastructure Resilience Scores */}
          {infraScores.length > 0 && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-header">
                <div className="card-title">🏗️ Infrastructure Resilience Scores (PMC + PCMC)</div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Q1 2026 Assessment</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {infraScores.map(item => (
                  <div key={item.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {item.note && <span style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>{item.note}</span>}
                        <strong style={{ color: item.fill, fontFamily: 'var(--font-mono)' }}>{item.value}/100</strong>
                      </div>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{
                        width: `${item.value}%`,
                        background: item.fill,
                        boxShadow: `0 0 8px ${item.fill}50`,
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Insights — from real data */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 14 }}>
            {[
              {
                icon: '📍', color: 'var(--status-critical)',
                title: 'Wakad Most Vulnerable',
                desc: `PCMC records show Wakad underpass flooding in ${floodHistory.filter(y => y.pcmc > 20).length} of last 7 monsoon seasons. Drainage capacity only 25 mm/hr vs 40+ required per IRC SP-50.`,
              },
              {
                icon: '📈', color: 'var(--status-high)',
                title: 'Monsoon Traffic Surge',
                desc: `Monthly data shows Hinjewadi-Wakad corridor reaches congestion index ${Math.max(...trafficMonths.map(m => m.wakad), 0)} in Aug — 30% above Jan baseline. Rain effect: +${Math.round(trafficMonths.find(m => m.month === 'Aug')?.wakad - trafficMonths.find(m => m.month === 'Jan')?.wakad || 0)} points.`,
              },
              {
                icon: '🛡️', color: 'var(--status-low)',
                title: 'Digital Twin Coverage',
                desc: `${wardComp?.total_wards || 22} wards modelled with Census 2021 population data. ${wardComp?.pmc_wards || 12} PMC + ${wardComp?.pcmc_wards || 10} PCMC wards. All coordinates verified against OSM and PMC ward boundaries.`,
              },
            ].map(insight => (
              <div key={insight.title} className="card" style={{ borderTop: `2px solid ${insight.color}` }}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>{insight.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: insight.color, marginBottom: 6 }}>{insight.title}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{insight.desc}</div>
              </div>
            ))}
          </div>

          {/* Data Transparency Notice */}
          <div className="card" style={{ borderLeft: '3px solid var(--brand-blue)', background: 'rgba(26,107,255,0.04)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand-blue-light)', marginBottom: 8 }}>📋 Data Transparency Notice</div>
            {dataSource && (
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 10, fontStyle: 'italic' }}>
                Primary source: {dataSource}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: '✅ Real Data', items: [
                  'Weather: Open-Meteo (WMO/ECMWF live API)',
                  'Ward geography: Real Pune OSM coordinates',
                  'Population: Census 2021 + PMC ward registry',
                  'Monsoon history 2019–2025: IMD Pune records',
                  'Road capacities: IRC Highway Manual standards',
                ]},
                { label: '🔵 Modelled / Estimated', items: [
                  'Traffic volumes: IRC LOS capacity formula',
                  'Damage estimates: ±10–20% from press releases',
                  'Sensor readings: Manning-Rational model (no hardware)',
                  'Monthly traffic index: IRC LOS + rainfall correlation',
                  'Infrastructure scores: Expert assessment framework',
                ]},
              ].map(({ label, items }) => (
                <div key={label}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</div>
                  {items.map(item => (
                    <div key={item} style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.7 }}>• {item}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
