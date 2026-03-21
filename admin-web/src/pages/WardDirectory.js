import React, { useState } from 'react';
import { useStore } from '../store/useStore';

const RISK_COLORS = {
  CRITICAL: '#ff2d55',
  HIGH: '#ff6b00',
  MEDIUM: '#f5c518',
  LOW: '#00e676',
};

export default function WardDirectory() {
  const { wards, activeAuthority } = useStore();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [filterRisk, setFilterRisk] = useState('ALL');

  const displayWards = wards.filter((w) => {
    const matchAuth = activeAuthority === 'ALL' || w.authority === activeAuthority;
    const matchSearch = w.name.toLowerCase().includes(search.toLowerCase());
    const matchRisk = filterRisk === 'ALL' || w.risk === filterRisk;
    return matchAuth && matchSearch && matchRisk;
  });

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Ward List */}
      <div style={{ width: 380, borderRight: '1px solid var(--border-secondary)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-secondary)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>🏛️ Ward Directory</h2>
          <input
            className="form-input"
            placeholder="Search ward name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((r) => (
              <button
                key={r}
                className={`btn ${filterRisk === r ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: 9, padding: '4px 10px', color: r !== 'ALL' && filterRisk !== r ? RISK_COLORS[r] : undefined }}
                onClick={() => setFilterRisk(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Ward List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', padding: '4px 8px', marginBottom: 4 }}>
            {displayWards.length} ward{displayWards.length !== 1 ? 's' : ''}
          </div>
          {displayWards.map((ward) => (
            <div
              key={ward.id}
              className="ward-item"
              style={{ outline: selected?.id === ward.id ? '1px solid var(--brand-blue)' : 'none', borderRadius: 8, marginBottom: 2 }}
              onClick={() => setSelected(ward)}
            >
              <div style={{ flex: 1 }}>
                <div className="ward-name">{ward.name}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                  <span style={{ fontSize: 9, color: ward.authority === 'PMC' ? 'var(--brand-blue-light)' : 'var(--brand-cyan)', background: ward.authority === 'PMC' ? 'rgba(26,107,255,0.12)' : 'rgba(0,212,255,0.1)', padding: '1px 6px', borderRadius: 99, border: `1px solid ${ward.authority === 'PMC' ? 'rgba(26,107,255,0.25)' : 'rgba(0,212,255,0.2)'}`, fontWeight: 700 }}>
                    {ward.authority}
                  </span>
                  <span className="ward-pop">👥 {ward.population.toLocaleString()}</span>
                </div>
              </div>
              <span className={`risk-badge ${ward.risk}`}>{ward.risk}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ward Detail Panel */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {!selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80%', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏛️</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Select a ward to view details</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>Infrastructure data, risk metrics, and historical incidents</div>
          </div>
        ) : (
          <div className="fade-in">
            {/* Ward Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <h1 style={{ fontSize: 22, fontWeight: 900 }}>{selected.name}</h1>
                  <span className={`risk-badge ${selected.risk}`} style={{ fontSize: 11 }}>{selected.risk} RISK</span>
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                  <span>🏛️ {selected.authority} Municipal Corporation</span>
                  <span>🆔 Ward {selected.id}</span>
                  <span>📍 {selected.lat.toFixed(4)}°N, {selected.lng.toFixed(4)}°E</span>
                </div>
              </div>
            </div>

            {/* KPI Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Population', value: selected.population.toLocaleString(), icon: '👥', color: 'var(--brand-blue)' },
                { label: 'Risk Level', value: selected.risk, icon: '⚠️', color: RISK_COLORS[selected.risk] },
                { label: 'Authority', value: selected.authority, icon: '🏛️', color: 'var(--brand-cyan)' },
                { label: 'Area (est.)', value: `${Math.round(selected.population / 12000)} km²`, icon: '📐', color: 'var(--status-medium)' },
              ].map(({ label, value, icon, color }) => (
                <div key={label} className="kpi-card" style={{ '--card-accent': color }}>
                  <div className="kpi-label">{label}</div>
                  <div className="kpi-value" style={{ fontSize: 18, color }}>{value}</div>
                  <div className="kpi-icon">{icon}</div>
                </div>
              ))}
            </div>

            {/* Infrastructure Scores */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <div className="card-title">🏗️ Infrastructure Assessment</div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>2026 Q1</span>
              </div>
              {[
                { label: 'Drainage Network', score: selected.risk === 'CRITICAL' ? 28 : selected.risk === 'HIGH' ? 45 : selected.risk === 'MEDIUM' ? 62 : 81 },
                { label: 'Road Quality Index', score: selected.risk === 'CRITICAL' ? 55 : selected.risk === 'HIGH' ? 68 : selected.risk === 'MEDIUM' ? 74 : 88 },
                { label: 'Emergency Access', score: selected.risk === 'CRITICAL' ? 62 : selected.risk === 'HIGH' ? 71 : 85 },
                { label: 'Flood Sensor Coverage', score: selected.risk === 'CRITICAL' ? 44 : selected.risk === 'HIGH' ? 57 : 78 },
              ].map(({ label, score }) => (
                <div key={label} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 5 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    <strong style={{ fontFamily: 'var(--font-mono)', color: score < 50 ? 'var(--status-critical)' : score < 70 ? 'var(--status-medium)' : 'var(--status-low)' }}>{score}/100</strong>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${score}%`, background: score < 50 ? 'var(--status-critical)' : score < 70 ? 'var(--status-medium)' : 'var(--status-low)' }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Recommendations */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">💡 Urban Shield Recommendations</div>
              </div>
              {selected.risk === 'CRITICAL' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 10, padding: 12, background: 'rgba(255,45,85,0.07)', borderRadius: 8, border: '1px solid rgba(255,45,85,0.2)' }}>
                    <span>🚨</span>
                    <div style={{ fontSize: 12 }}>Immediate drainage capacity upgrade required. Current infrastructure below safe threshold for monsoon season.</div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, padding: 12, background: 'rgba(255,107,0,0.07)', borderRadius: 8, border: '1px solid rgba(255,107,0,0.2)' }}>
                    <span>📡</span>
                    <div style={{ fontSize: 12 }}>Deploy additional IoT flood sensors at all 4 major intersections. Current coverage: 44%.</div>
                  </div>
                </div>
              )}
              {selected.risk === 'HIGH' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 10, padding: 12, background: 'rgba(255,107,0,0.07)', borderRadius: 8, border: '1px solid rgba(255,107,0,0.2)' }}>
                    <span>⚠️</span>
                    <div style={{ fontSize: 12 }}>Pre-monsoon desilting of storm drains recommended. Historical data shows 35% recurrence rate.</div>
                  </div>
                </div>
              )}
              {(selected.risk === 'MEDIUM' || selected.risk === 'LOW') && (
                <div style={{ display: 'flex', gap: 10, padding: 12, background: 'rgba(0,230,118,0.07)', borderRadius: 8, border: '1px solid rgba(0,230,118,0.2)' }}>
                  <span>✅</span>
                  <div style={{ fontSize: 12 }}>Ward within safe operational parameters. Continue routine monitoring and preventive maintenance schedule.</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
