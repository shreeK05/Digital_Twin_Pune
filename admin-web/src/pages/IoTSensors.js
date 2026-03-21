import React, { useEffect, useState, useCallback } from 'react';
import { useStore } from '../store/useStore';

const STATUS_MAP = {
  ALERT:     { color: 'var(--status-critical)', label: '⚠ ALERT',     bg: 'rgba(255,45,85,0.1)'   },
  WARNING:   { color: 'var(--status-high)',     label: '⚡ WARNING',   bg: 'rgba(255,107,0,0.1)'   },
  CONGESTED: { color: 'var(--status-critical)', label: '🚗 CONGESTED', bg: 'rgba(255,45,85,0.1)'   },
  HEAVY:     { color: 'var(--status-high)',     label: '🚦 HEAVY',     bg: 'rgba(255,107,0,0.1)'   },
  NORMAL:    { color: 'var(--status-low)',      label: '✅ NORMAL',    bg: 'rgba(0,230,118,0.08)'  },
};

const LOS_LABELS = {
  A:'Free Flow', B:'Stable', C:'Stable',
  D:'Approaching Unstable', E:'Unstable', F:'Forced / Breakdown'
};

export default function IoTSensors() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('ALL');
  const [lastRefresh, setLastRefresh] = useState(null);
  const { weather } = useStore();

  const fetchData = useCallback(async () => {
    try {
      const res  = await fetch('https://pune-urban-shield-backend.onrender.com/api/iot/sensors');
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 10000);
    return () => clearInterval(t);
  }, [fetchData]);

  const sensors      = data?.sensors ?? [];
  const filtered     = filter === 'ALL' ? sensors : sensors.filter(s => s.type === filter.toLowerCase());
  const alertCount   = sensors.filter(s => ['ALERT','CONGESTED'].includes(s.status)).length;
  const warningCount = sensors.filter(s => ['WARNING','HEAVY'].includes(s.status)).length;
  const normalCount  = sensors.filter(s => s.status === 'NORMAL').length;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0, height:'100%' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        padding: '20px 24px 16px', borderBottom: '1px solid var(--border-0)',
        flexShrink: 0,
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.025em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>📐</span> Simulation Model Monitor
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-1)', lineHeight: 1.5 }}>
            Drona Engine v2.0 — Mathematically modelled flood &amp; traffic readings for {sensors.length} Pune locations
          </p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center', flexShrink: 0 }}>
          {lastRefresh && (
            <span style={{ fontSize:10, color:'var(--text-2)' }}>
              Updated {lastRefresh.toLocaleTimeString('en-IN', { hour12:false })}
            </span>
          )}
          <button className="btn btn-outline" onClick={fetchData} style={{ fontSize:11 }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Honesty Banner — critical for trustworthiness */}
      <div style={{
        margin:'16px 24px 0',
        padding:'10px 16px',
        borderRadius: 'var(--r-md)',
        background:'rgba(37,99,235,0.06)',
        border:'1px solid rgba(37,99,235,0.18)',
        display:'flex', gap:12, alignItems:'flex-start',
        flexShrink: 0,
      }}>
        <span style={{ fontSize:18, flexShrink:0 }}>🔬</span>
        <div>
          <div style={{ fontSize:12, fontWeight:800, color:'#4a8cff', marginBottom:3 }}>
            DATA TRANSPARENCY — MODELLED READINGS
          </div>
          <div style={{ fontSize:11, color:'var(--text-muted)', lineHeight:1.6 }}>
            These readings are <strong style={{ color:'#4a8cff' }}>mathematically computed</strong> by the Drona simulation engine, 
            not live hardware sensors. Flood readings use the <strong>Manning-Rational Method (IRC SP-50)</strong> calibrated against 
            PMC drainage capacity data. Traffic LOS uses <strong>IRC HCM capacity formulae</strong>. 
            Input: <strong style={{ color:'#00d4ff' }}>Live rainfall {weather?.rainfall_mm_hr ?? 0} mm/hr</strong> from Open-Meteo WMO API.
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, padding:'16px 24px 0', flexShrink: 0 }}>
        {[
          { label:'Modelled Nodes',   value: sensors.length,  icon:'📐', color:'var(--brand-blue-light)' },
          { label:'Alert State',      value: alertCount,       icon:'🚨', color:'var(--status-critical)'  },
          { label:'Warning State',    value: warningCount,     icon:'⚡', color:'var(--status-high)'      },
          { label:'Normal State',     value: normalCount,      icon:'✅', color:'var(--status-low)'       },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="card" style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ fontSize:24 }}>{icon}</div>
            <div>
              <div style={{ fontSize:22, fontWeight:900, color }}>{loading ? '—' : value}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Live weather input banner */}
      {data && (
        <div style={{
          margin:'12px 24px 0',
          padding:'10px 16px',
          borderRadius: 'var(--r-md)',
          flexShrink: 0,
          background: alertCount > 3 ? 'rgba(255,45,85,0.08)' : 'rgba(0,230,118,0.06)',
          border: `1px solid ${alertCount > 3 ? 'rgba(255,45,85,0.25)' : 'rgba(0,230,118,0.2)'}`,
          display:'flex', alignItems:'center', gap:10,
        }}>
          <span style={{ fontSize:16 }}>{alertCount > 3 ? '🔴' : '🟢'}</span>
          <span style={{ fontSize:12, fontWeight:700, color: alertCount > 3 ? 'var(--status-critical)' : 'var(--status-low)' }}>
            Model Status: {data.network_health}
          </span>
          <span style={{ fontSize:11, color:'var(--text-muted)', marginLeft:8 }}>
            Live input: {weather?.rainfall_mm_hr ?? 0} mm/hr rainfall · {weather?.windspeed_kmh ?? 0} km/h wind
          </span>
          <span style={{ marginLeft:'auto', fontSize:10, color:'#4a6088', background:'rgba(26,107,255,0.08)', padding:'3px 8px', borderRadius:99 }}>
            🌦 Open-Meteo LIVE
          </span>
        </div>
      )}

      {/* Filter */}
      <div style={{ padding:'12px 24px 0', display:'flex', gap:8, flexShrink: 0 }}>
        {['ALL', 'FLOOD', 'TRAFFIC'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              fontSize:11, fontWeight:700, padding:'6px 16px',
              borderRadius:99, cursor:'pointer',
              background: filter === f ? 'var(--brand-blue)' : 'var(--bg-card)',
              color: filter === f ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${filter === f ? 'var(--brand-blue)' : 'var(--border-primary)'}`,
            }}
          >
            {f === 'ALL'
              ? `All (${sensors.length})`
              : f === 'FLOOD'
                ? `🌊 Flood Model (${sensors.filter(s=>s.type==='flood').length})`
                : `🚗 Traffic Model (${sensors.filter(s=>s.type==='traffic').length})`}
          </button>
        ))}
      </div>

      {/* Sensor grid */}
      <div style={{ flex:1, overflowY:'auto', padding:'12px 24px 24px' }}>
        {loading ? (
          <div style={{ textAlign:'center', marginTop:80 }}>
            <div className="spinner" style={{ width:32, height:32, margin:'0 auto 12px' }} />
            <div style={{ color:'var(--text-muted)', fontSize:13 }}>Running simulation models...</div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:12 }}>
            {filtered.map(sensor => {
              const st      = STATUS_MAP[sensor.status] ?? STATUS_MAP.NORMAL;
              const isFlood = sensor.type === 'flood';
              const utilPct = Math.min(100, Math.round((sensor.reading / sensor.threshold) * 100));

              return (
                <div key={sensor.id} className="card" style={{
                  padding:16,
                  borderLeft: `3px solid ${st.color}`,
                  background: st.bg,
                }}>
                  {/* Header row */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                    <div>
                      <div style={{ fontSize:11, fontWeight:800, color:'var(--text-muted)', letterSpacing:'0.08em', marginBottom:3 }}>
                        {sensor.id} · {isFlood ? '🌊 FLOOD MODEL' : '🚗 TRAFFIC MODEL'}
                        <span style={{ marginLeft:8, fontSize:9, background:'rgba(26,107,255,0.15)', color:'#4a8cff', padding:'1px 6px', borderRadius:99, fontWeight:700 }}>MODELLED</span>
                      </div>
                      <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>{sensor.location}</div>
                    </div>
                    <div style={{
                      fontSize:10, fontWeight:800, padding:'4px 10px', borderRadius:99,
                      background: st.bg, color: st.color,
                      border:`1px solid ${st.color}40`,
                    }}>
                      {st.label}
                    </div>
                  </div>

                  {/* Reading */}
                  <div style={{ display:'flex', gap:12, alignItems:'baseline', marginBottom:10 }}>
                    <span style={{ fontSize:28, fontWeight:900, color: st.color }}>
                      {isFlood ? sensor.reading : sensor.reading?.toLocaleString('en-IN')}
                    </span>
                    <span style={{ fontSize:11, color:'var(--text-muted)' }}>{sensor.unit}</span>
                    <span style={{ fontSize:11, color:'var(--text-muted)', marginLeft:'auto' }}>
                      Threshold: {isFlood ? sensor.threshold : sensor.threshold?.toLocaleString('en-IN')} {sensor.unit}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div style={{ background:'var(--bg-secondary)', borderRadius:99, height:5, marginBottom:10 }}>
                    <div style={{
                      height:'100%', borderRadius:99, transition:'width 0.5s ease',
                      width:`${Math.min(utilPct, 100)}%`,
                      background: utilPct > 90 ? 'var(--status-critical)' : utilPct > 70 ? 'var(--status-high)' : 'var(--status-low)',
                    }} />
                  </div>

                  {/* Meta row */}
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-muted)' }}>
                    <span>⏱ Updated {sensor.last_ping ? new Date(sensor.last_ping).toLocaleTimeString('en-IN', { hour12:false }) : '—'}</span>
                    {!isFlood && sensor.los && (
                      <span>LOS: <strong style={{ color:'var(--text-secondary)' }}>{sensor.los}</strong> — {LOS_LABELS[sensor.los]}</span>
                    )}
                    {isFlood && (
                      <span>📐 Manning-Rational (IRC SP-50)</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
