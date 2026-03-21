import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  MapContainer, TileLayer, CircleMarker, Popup,
  Polyline, Tooltip as LeafletTooltip, Polygon, useMap,
} from 'react-leaflet';
import { useStore } from '../store/useStore';

// ── Colour palettes ──────────────────────────────────────────────────────────
const RISK_COLORS = {
  CRITICAL: '#ff2d55',
  HIGH:     '#ff6b00',
  MEDIUM:   '#f5c518',
  LOW:      '#00e676',
};
const TRAFFIC_COLORS = {
  SEVERE_JAM: '#ff2d55',
  CLOSED:     '#ff0000',
  HEAVY:      '#ff6b00',
  MODERATE:   '#f5c518',
  CLEAR:      '#00e676',
};
const ROAD_WEIGHT = {
  expressway:       7,
  national_highway: 6,
  state_highway:    5,
  ring_road:        5,
  arterial:         4,
  bypass:           4,
};

// ── Hexagon geometry ─────────────────────────────────────────────────────────
// Returns 6 [lat, lng] vertices of a flat-top hexagon centred at (lat, lng)
// `size` is in degrees (≈ 0.008 ≈ 900 m radius at Pune latitude)
function hexagonPoints(lat, lng, size = 0.009) {
  const pts = [];
  // pointy-top orientation: start at 30°
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i - 30;
    const angleRad = (Math.PI / 180) * angleDeg;
    pts.push([
      lat + size * Math.cos(angleRad),
      lng + size * 1.4 * Math.sin(angleRad), // lng correction for Pune lat
    ]);
  }
  return pts;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function riskFromScore(score) {
  if (score > 0.82) return 'CRITICAL';
  if (score > 0.62) return 'HIGH';
  if (score > 0.38) return 'MEDIUM';
  return 'LOW';
}

// Instant traffic colour from slider (no API needed)
function instantTrafficColor(road, simTraffic, closedRoads, trafficOverlay) {
  if (closedRoads.includes(road.id)) return '#ff0000';
  const simRoad = trafficOverlay?.find(r => r.road_id === road.id);
  if (simRoad) return TRAFFIC_COLORS[simRoad.status] || '#1a6bff';
  // Instant preview from slider alone
  const surge = simTraffic / 150; // 0–1
  if (surge > 0.85) return '#ff2d55';
  if (surge > 0.6)  return '#ff6b00';
  if (surge > 0.35) return '#f5c518';
  return '#1a6bff';
}

function instantTrafficOpacity(road, simTraffic, trafficOverlay) {
  const simRoad = trafficOverlay?.find(r => r.road_id === road.id);
  if (simRoad) {
    const ratio = (simRoad.effective_volume_vph || 0) / (road.capacity_vph || 1);
    return Math.min(0.95, 0.55 + ratio * 0.4);
  }
  return 0.55 + (simTraffic / 150) * 0.4;
}

// ── Broadcast modal ──────────────────────────────────────────────────────────
function BroadcastModal({ onClose }) {
  const { broadcastAlert } = useStore();
  const [form, setForm]   = useState({ title: '', message: '', severity: 'MEDIUM', area: '' });
  const [state, setState] = useState('idle'); // idle | sending | sent

  const handleSend = async () => {
    setState('sending');
    await broadcastAlert(form);
    setState('sent');
    setTimeout(onClose, 1500);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box fade-in" onClick={e => e.stopPropagation()}>
        <div className="modal-title">📢 Broadcast Alert to Citizens</div>
        <div className="form-group">
          <label className="form-label">Alert Title</label>
          <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="E.g., Flood Warning — Wakad Underpass" />
        </div>
        <div className="form-group">
          <label className="form-label">Message</label>
          <textarea className="form-textarea" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Detailed message for citizens..." />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Severity</label>
            <select className="form-select" value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
              <option value="LOW">🟢 LOW</option>
              <option value="MEDIUM">🟡 MEDIUM</option>
              <option value="HIGH">🟠 HIGH</option>
              <option value="CRITICAL">🔴 CRITICAL</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Target Area</label>
            <input className="form-input" value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} placeholder="Ward / Zone" />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={handleSend} disabled={state !== 'idle' || !form.title}>
            {state === 'sent' ? '✓ Sent!' : state === 'sending' ? '⏳ Sending...' : '🚨 Broadcast Alert'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Map auto-fit on first load ───────────────────────────────────────────────
function MapBounds({ wards }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (!fitted.current && wards.length > 0) {
      fitted.current = true;
      map.setView([18.565, 73.825], 12);
    }
  }, [wards, map]);
  return null;
}

// ── Main component ───────────────────────────────────────────────────────────
export default function MapSimulation() {
  const {
    wards, floodNodes, roads,
    simRainfall, simTraffic, closedRoads,
    setSimRainfall, setSimTraffic, toggleClosedRoad,
    simRunning, floodResult, trafficResult,
    runFloodSim, runTrafficSim, runCombinedSim, resetSim,
    activeAuthority, weather,
    routes, routingReady, routesLoading,
  } = useStore();

  const [mapMode, setMapMode]       = useState('OVERVIEW');
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [aiReport, setAiReport]     = useState(null);
  const [aiLoading, setAiLoading]   = useState(false);
  const [hexSize, setHexSize]       = useState(0.009); // user-adjustable hex size
  const debounceRef = useRef(null);

  // ── Debounced auto-run: fire simulation 900ms after slider stops ──────────
  const triggerAutoSim = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runCombinedSim();
    }, 900);
  }, [runCombinedSim]);

  const handleRainfallChange = useCallback((val) => {
    setSimRainfall(val);
    triggerAutoSim();
  }, [setSimRainfall, triggerAutoSim]);

  const handleTrafficChange = useCallback((val) => {
    setSimTraffic(val);
    triggerAutoSim();
  }, [setSimTraffic, triggerAutoSim]);

  // ── Auto-switch map mode when results arrive ──────────────────────────────
  useEffect(() => {
    if (floodResult && !trafficResult) setMapMode('FLOOD');
    else if (trafficResult && !floodResult) setMapMode('TRAFFIC');
    else if (floodResult && trafficResult) setMapMode('COMBINED');
    // When routing results also arrive, switch to ROUTING mode if we have routes
  }, [floodResult, trafficResult]);

  useEffect(() => {
    if (routes && routes.length > 0) setMapMode('ROUTING');
  }, [routes]);

  useEffect(() => {
    if (!floodResult && !trafficResult) setAiReport(null);
  }, [floodResult, trafficResult]);

  const displayWards = useMemo(
    () => wards.filter(w => activeAuthority === 'ALL' || w.authority === activeAuthority),
    [wards, activeAuthority]
  );

  const floodOverlay   = floodResult?.results  || null;
  const trafficOverlay = trafficResult?.results || null;

  const criticalCount = floodOverlay ? floodOverlay.filter(n => n.risk_level === 'CRITICAL').length : 0;
  const severeJams    = trafficOverlay ? trafficOverlay.filter(r => r.status === 'SEVERE_JAM').length : 0;

  // ── Hexagon flood data: merge floodNodes with simulation results ──────────
  const hexData = useMemo(() => {
    return floodNodes.map(node => {
      const simNode = floodOverlay?.find(r => r.node_id === node.id);
      const riskScore = simNode?.risk_score ?? node.base_risk;
      const risk = simNode?.risk_level ?? riskFromScore(node.base_risk);
      const floodEta = simNode?.time_to_flood_hours ?? null;
      const effectiveRain = simNode?.effective_rainfall_mm ?? 0;
      return { ...node, simNode, risk, riskScore, floodEta, effectiveRain };
    });
  }, [floodNodes, floodOverlay]);

  // ── Groq AI ──────────────────────────────────────────────────────────────
  const runGroqAnalysis = useCallback(async () => {
    setAiLoading(true);
    setAiReport(null);
    try {
      const res = await fetch('https://pune-urban-shield-backend.onrender.com/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weather: weather || null,
          flood_results:   floodResult   || null,
          traffic_results: trafficResult || null,
          context: `Pune Urban Shield — ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`,
        }),
      });
      setAiReport(await res.json());
    } catch {
      setAiReport({ status: 'ERROR', error: 'Cannot reach AI endpoint', summary: null });
    }
    setAiLoading(false);
  }, [weather, floodResult, trafficResult]);

  // ── Road closure side-effect: re-run traffic sim instantly ───────────────
  const handleRoadToggle = useCallback((roadId) => {
    toggleClosedRoad(roadId);
    // Slight delay so store updates first
    setTimeout(() => runTrafficSim(), 200);
  }, [toggleClosedRoad, runTrafficSim]);

  // Simulation status text
  const simStatus = simRunning
    ? { label: 'Computing…', color: 'var(--blue-light)', dot: 'var(--blue)' }
    : floodResult || trafficResult
    ? { label: `Results Active — ${mapMode}`, color: 'var(--success)', dot: 'var(--success)' }
    : { label: 'Standby — Ready', color: 'var(--text-2)', dot: 'var(--text-2)' };

  return (
    <div className="map-page">
      {/* ═══ SIDEBAR ══════════════════════════════════════════════════════════ */}
      <div className="map-sidebar" style={{ width: 340, minWidth: 340, flexShrink: 0, overflowX: 'hidden' }}>

        {/* ─ SIM STATUS HEADER ─────────────────────────────────────────────── */}
        <div style={{
          padding: '10px 16px',
          background: 'var(--bg-2)',
          borderBottom: '1px solid var(--border-0)',
          display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0,
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: simStatus.dot,
            boxShadow: `0 0 6px ${simStatus.dot}`,
            flexShrink: 0,
            animation: simRunning ? 'livePulse 1s ease-in-out infinite' : 'none',
          }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: simStatus.color, lineHeight: 1.3 }}>
              {simStatus.label}
            </div>
            {(floodResult || trafficResult) && (
              <div style={{ fontSize: 9, color: 'var(--text-2)', marginTop: 1 }}>
                {criticalCount > 0 && <span style={{ color: 'var(--danger)' }}>{criticalCount} critical zones · </span>}
                {severeJams > 0 && <span style={{ color: 'var(--warning)' }}>{severeJams} severe jams · </span>}
                {routes.length > 0 && <span>{routes.length} routes computed</span>}
              </div>
            )}
          </div>
          {(floodResult || trafficResult) && (
            <button
              onClick={() => { resetSim(); setMapMode('OVERVIEW'); }}
              style={{
                fontSize: 9, padding: '3px 8px',
                background: 'transparent', color: 'var(--text-2)',
                border: '1px solid var(--border-0)', borderRadius: 4,
                cursor: 'pointer', fontFamily: 'var(--font)',
                transition: '0.15s',
              }}
            >
              ↺ Reset
            </button>
          )}
        </div>

        {/* ─ OVERLAY MODE ──────────────────────────────────────────────────── */}
        <div className="map-panel-section">
          <div className="map-panel-section-title">VIEW MODE</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {[
              { key: 'OVERVIEW', icon: '🗺️', label: 'Overview' },
              { key: 'FLOOD',    icon: '🌊', label: 'Flood'    },
              { key: 'TRAFFIC',  icon: '🚦', label: 'Traffic'  },
              { key: 'COMBINED', icon: '⚡', label: 'Combined' },
              { key: 'ROUTING',  icon: '🛣️', label: 'Routes'   },
            ].map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => setMapMode(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 10px', borderRadius: 'var(--r-sm)',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  border: '1px solid',
                  borderColor: mapMode === key ? 'var(--blue)' : 'var(--border-0)',
                  background: mapMode === key ? 'var(--blue-faint)' : 'transparent',
                  color: mapMode === key ? 'var(--blue-light)' : 'var(--text-2)',
                  transition: 'all 0.15s var(--ease)',
                  fontFamily: 'var(--font)',
                }}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Data source pills */}
          <div style={{ display: 'flex', gap: 5, marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 9, padding: '2px 8px', borderRadius: 99,
              background: weather?.is_real_data ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
              color: weather?.is_real_data ? 'var(--success)' : 'var(--warning)',
              border: `1px solid ${weather?.is_real_data ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
              fontWeight: 700,
            }}>
              🌦️ {weather?.is_real_data ? 'Open-Meteo LIVE' : 'Simulated Weather'}
            </span>
            <span style={{
              fontSize: 9, padding: '2px 8px', borderRadius: 99,
              background: routingReady ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
              color: routingReady ? 'var(--success)' : 'var(--warning)',
              border: `1px solid ${routingReady ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'}`,
              fontWeight: 700,
            }}>
              🛣️ OSMnx {routingReady ? `READY · ${routes.length} routes` : routesLoading ? 'Loading…' : 'Pending'}
            </span>
            <span style={{
              fontSize: 9, padding: '2px 8px', borderRadius: 99,
              background: 'var(--blue-faint)', color: 'var(--blue-light)',
              border: '1px solid rgba(37,99,235,0.15)', fontWeight: 600,
            }}>
              📐 Manning-Rational IRC SP-50
            </span>
          </div>
        </div>

        {/* ─ SIMULATION CONTROLS ───────────────────────────────────────────── */}
        <div className="map-panel-section">
          <div className="map-panel-section-title">⚡ WHAT-IF CONTROLS</div>
          <div style={{ fontSize: 9.5, color: 'var(--text-2)', marginBottom: 14, lineHeight: 1.5 }}>
            Drag sliders — map updates <strong style={{ color: 'var(--cyan)' }}>automatically</strong> within 1 second
          </div>

          {/* Rainfall Slider */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>🌧️</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-1)' }}>Rainfall Intensity</span>
              </div>
              <div style={{
                fontSize: 11, fontWeight: 800, fontFamily: 'var(--mono)',
                padding: '2px 8px', borderRadius: 4,
                background: simRainfall > 100 ? 'var(--danger-f)' : simRainfall > 50 ? 'var(--warning-f)' : simRainfall > 0 ? 'rgba(245,158,11,0.1)' : 'var(--bg-2)',
                color: simRainfall > 100 ? 'var(--danger)' : simRainfall > 50 ? 'var(--warning)' : simRainfall > 0 ? '#fbbf24' : 'var(--text-2)',
              }}>
                {simRainfall === 0 ? 'LIVE BASE' : `+${simRainfall}%`}
              </div>
            </div>
            <input
              type="range" min="0" max="200" step="5" value={simRainfall}
              onChange={e => handleRainfallChange(Number(e.target.value))}
              style={{ accentColor: 'var(--blue)', width: '100%', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: 'var(--text-2)', marginTop: 3 }}>
              <span>Base</span><span>+50%</span><span>+100%</span><span>+150%</span><span>+200%</span>
            </div>
          </div>

          {/* Traffic Slider */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>🚗</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-1)' }}>Traffic Surge</span>
              </div>
              <div style={{
                fontSize: 11, fontWeight: 800, fontFamily: 'var(--mono)',
                padding: '2px 8px', borderRadius: 4,
                background: simTraffic > 100 ? 'var(--danger-f)' : simTraffic > 60 ? 'var(--warning-f)' : simTraffic > 0 ? 'rgba(245,158,11,0.1)' : 'var(--bg-2)',
                color: simTraffic > 100 ? 'var(--danger)' : simTraffic > 60 ? 'var(--warning)' : simTraffic > 0 ? '#fbbf24' : 'var(--text-2)',
              }}>
                {simTraffic === 0 ? 'NORMAL' : `+${simTraffic}%`}
              </div>
            </div>
            <input
              type="range" min="0" max="150" step="5" value={simTraffic}
              onChange={e => handleTrafficChange(Number(e.target.value))}
              style={{ accentColor: '#f59e0b', width: '100%', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: 'var(--text-2)', marginTop: 3 }}>
              <span>Normal</span><span>+50%</span><span>+100%</span><span>+150%</span>
            </div>
          </div>

          {/* Hex Size */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>⬡</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-1)' }}>Flood Zone Size</span>
              </div>
              <div style={{
                fontSize: 11, fontWeight: 800, fontFamily: 'var(--mono)',
                padding: '2px 8px', borderRadius: 4,
                background: 'var(--cyan-faint)', color: 'var(--cyan)',
              }}>
                {Math.round(hexSize * 10000)}px
              </div>
            </div>
            <input
              type="range" min="5" max="20" step="1"
              value={Math.round(hexSize * 1000)}
              onChange={e => setHexSize(Number(e.target.value) / 1000)}
              style={{ accentColor: 'var(--cyan)', width: '100%', cursor: 'pointer' }}
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              className="btn btn-primary btn-full pulse-btn"
              onClick={runCombinedSim}
              disabled={simRunning}
              style={{ fontSize: 12, padding: '10px 16px', fontWeight: 800 }}
            >
              {simRunning
                ? <><span className="spinner" /> Computing simulation…</>
                : '▶  Run Full Simulation'}
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <button
                className="btn btn-outline"
                style={{ fontSize: 11 }}
                onClick={runFloodSim}
                disabled={simRunning}
              >
                🌊 Flood Only
              </button>
              <button
                className="btn btn-outline"
                style={{ fontSize: 11 }}
                onClick={runTrafficSim}
                disabled={simRunning}
              >
                🚦 Traffic Only
              </button>
            </div>
          </div>
        </div>

        {/* ─ ROAD CLOSURES ─────────────────────────────────────────────────── */}
        <div className="map-panel-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div className="map-panel-section-title" style={{ margin: 0 }}>🚧 ROAD CLOSURES</div>
            {closedRoads.length > 0 && (
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 99,
                background: 'var(--danger-f)', color: 'var(--danger)',
                border: '1px solid rgba(239,68,68,0.25)',
              }}>
                {closedRoads.length} closed
              </span>
            )}
          </div>
          <div style={{ fontSize: 9.5, color: 'var(--text-2)', marginBottom: 8 }}>
            Toggle a road to close it — traffic simulation re-runs automatically
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 180, overflowY: 'auto' }}>
            {roads.slice(0, 10).map(road => {
              const isClosed = closedRoads.includes(road.id);
              return (
                <button
                  key={road.id}
                  onClick={() => handleRoadToggle(road.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    cursor: 'pointer', borderRadius: 'var(--r-sm)', padding: '7px 10px',
                    background: isClosed ? 'var(--danger-f)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isClosed ? 'rgba(239,68,68,0.3)' : 'var(--border-0)'}`,
                    transition: 'all 0.18s', textAlign: 'left', width: '100%',
                    fontFamily: 'var(--font)',
                  }}
                >
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    background: isClosed ? 'var(--danger)' : 'var(--success)',
                    boxShadow: isClosed ? '0 0 5px var(--danger)' : 'none',
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: isClosed ? 'var(--danger)' : 'var(--text-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {road.name}
                    </div>
                    <div style={{ fontSize: 8.5, color: 'var(--text-2)' }}>
                      {road.type?.replace(/_/g, ' ').toUpperCase()} · {road.capacity_vph?.toLocaleString()} vph cap.
                    </div>
                  </div>
                  <span style={{
                    fontSize: 9, fontWeight: 800, flexShrink: 0,
                    color: isClosed ? 'var(--danger)' : 'var(--text-2)',
                    fontFamily: 'var(--mono)',
                  }}>
                    {isClosed ? 'CLOSED' : 'OPEN'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─ FLOOD RESULTS ─────────────────────────────────────────────────── */}
        {floodOverlay && (
          <div className="map-panel-section" style={{ borderTop: `2px solid ${criticalCount > 0 ? 'var(--danger)' : 'var(--warning)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div className="map-panel-section-title" style={{ margin: 0 }}>🌊 FLOOD RESULTS</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(r => {
                  const c = floodOverlay.filter(n => n.risk_level === r).length;
                  return c > 0 ? <span key={r} className={`risk-badge ${r}`}>{c} {r}</span> : null;
                })}
              </div>
            </div>
            <div style={{ fontSize: 9.5, color: 'var(--text-2)', marginBottom: 8, fontFamily: 'var(--mono)' }}>
              Input: {floodResult?.parameters?.effective_rainfall_mm_hr?.toFixed(1) ?? floodResult?.parameters?.effective_rainfall_mm?.toFixed(1) ?? '--'} mm/hr effective rainfall
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 220, overflowY: 'auto' }}>
              {floodOverlay.map(node => (
                <div key={node.node_id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 'var(--r-sm)',
                  background: 'var(--bg-2)', border: '1px solid var(--border-0)',
                  borderLeft: `3px solid ${RISK_COLORS[node.risk_level]}`,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.location}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-2)', marginTop: 2 }}>
                      {node.effective_rainfall_mm} mm/hr · {(node.risk_score * 100).toFixed(0)}% risk
                      {node.time_to_flood_hours && <span style={{ color: RISK_COLORS[node.risk_level], marginLeft: 4 }}>⏱ {node.time_to_flood_hours.toFixed(1)}h</span>}
                    </div>
                  </div>
                  <span className={`risk-badge ${node.risk_level}`}>{node.risk_level}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─ TRAFFIC RESULTS ───────────────────────────────────────────────── */}
        {trafficOverlay && (
          <div className="map-panel-section" style={{ borderTop: `2px solid ${severeJams > 0 ? 'var(--warning)' : 'var(--success)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div className="map-panel-section-title" style={{ margin: 0 }}>🚦 TRAFFIC RESULTS</div>
              <span style={{ fontSize: 9, color: 'var(--text-2)', fontFamily: 'var(--mono)' }}>
                {trafficOverlay.length} corridors
              </span>
            </div>
            {severeJams > 0 && (
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--danger)', background: 'var(--danger-f)', padding: '5px 8px', borderRadius: 5, marginBottom: 8 }}>
                ⚠ {severeJams} severe jam{severeJams > 1 ? 's' : ''} detected — consider rerouting
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
              {trafficOverlay.map(road => (
                <div key={road.road_id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 10px', borderRadius: 'var(--r-sm)',
                  background: 'var(--bg-2)', border: '1px solid var(--border-0)',
                }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    background: TRAFFIC_COLORS[road.status] || 'var(--text-2)',
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {road.road_name}
                    </div>
                    <div style={{ fontSize: 8.5, color: 'var(--text-2)' }}>
                      {road.effective_volume_vph?.toLocaleString()} / {road.capacity_vph?.toLocaleString()} vph
                      {road.los && <span style={{ marginLeft: 4 }}>· LOS {road.los}</span>}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 9, fontWeight: 800, flexShrink: 0, fontFamily: 'var(--mono)',
                    color: TRAFFIC_COLORS[road.status] || 'var(--text-2)',
                  }}>
                    {road.status?.replace(/_/g, ' ') ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─ ROUTING RESULTS ───────────────────────────────────────────────── */}
        {routes && routes.length > 0 && (
          <div className="map-panel-section" style={{ borderTop: '2px solid var(--cyan)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div className="map-panel-section-title" style={{ margin: 0 }}>🛣️ STREET ROUTES</div>
              <div style={{ display: 'flex', gap: 5 }}>
                <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 99, background: 'var(--cyan-faint)', color: 'var(--cyan)', fontWeight: 700, border: '1px solid rgba(6,182,212,0.2)' }}>
                  {routes.filter(r => !r.is_rerouted).length} normal
                </span>
                {routes.filter(r => r.is_rerouted).length > 0 && (
                  <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 99, background: 'var(--warning-f)', color: 'var(--warning)', fontWeight: 700, border: '1px solid rgba(245,158,11,0.25)' }}>
                    {routes.filter(r => r.is_rerouted).length} detour
                  </span>
                )}
              </div>
            </div>
            <div style={{ fontSize: 9.5, color: 'var(--text-2)', marginBottom: 8 }}>
              OSMnx · NetworkX Dijkstra · Real Pune street network
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
              {routes.map((route, idx) => (
                <div key={idx} style={{
                  padding: '7px 10px', borderRadius: 'var(--r-sm)',
                  background: route.is_rerouted ? 'rgba(245,158,11,0.05)' : 'rgba(6,182,212,0.04)',
                  border: `1px solid ${route.is_rerouted ? 'rgba(245,158,11,0.2)' : 'rgba(6,182,212,0.15)'}`,
                  borderLeft: `3px solid ${route.is_rerouted ? 'var(--warning)' : 'var(--cyan)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 10 }}>{route.is_rerouted ? '🔀' : '🛣️'}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-0)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {route.label}
                    </span>
                    <span style={{
                      fontSize: 9, fontWeight: 800, fontFamily: 'var(--mono)', flexShrink: 0,
                      color: route.is_rerouted ? 'var(--warning)' : 'var(--success)',
                    }}>
                      {route.is_rerouted ? 'DETOUR' : 'OK'}
                    </span>
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-2)' }}>
                    {((route.distance_m || 0) / 1000).toFixed(1)} km ·
                    {' '}{Math.round((route.travel_time_base_s || 0) / 60)} min base
                    {route.is_rerouted && (
                      <span style={{ color: 'var(--warning)' }}>
                        {' → '}{Math.round((route.travel_time_sim_s || 0) / 60)} min via detour
                      </span>
                    )}
                  </div>
                  {route.is_rerouted && route.rerouting_reason && route.rerouting_reason !== 'No detour needed' && (
                    <div style={{ fontSize: 8.5, color: 'var(--warning)', marginTop: 2 }}>
                      ⚠ {route.rerouting_reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-2)', marginTop: 8, padding: '5px 8px', background: 'var(--cyan-faint)', borderRadius: 5 }}>
              Switch to <strong style={{ color: 'var(--cyan)' }}>Routes</strong> view to see paths on the map
            </div>
          </div>
        )}

        {/* ─ AI REPORT ─────────────────────────────────────────────────────── */}
        {(floodResult || trafficResult) && (
          <div className="map-panel-section">
            <div className="map-panel-section-title">🤖 AI SITUATION REPORT</div>
            <div style={{ fontSize: 9.5, color: 'var(--text-2)', marginBottom: 8 }}>
              Groq LLaMA 3.3-70B — analyses flood + traffic together
            </div>
            <button
              onClick={runGroqAnalysis}
              disabled={aiLoading}
              style={{
                width: '100%', padding: '9px 14px', borderRadius: 'var(--r-md)',
                border: 'none', cursor: aiLoading ? 'wait' : 'pointer', fontFamily: 'var(--font)',
                background: aiLoading
                  ? 'rgba(37,99,235,0.2)'
                  : 'linear-gradient(135deg, #7c3aed, var(--blue), var(--cyan))',
                color: '#fff', fontWeight: 800, fontSize: 11,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: aiLoading ? 'none' : '0 0 20px rgba(124,58,237,0.35)',
                transition: 'all 0.2s',
              }}
            >
              {aiLoading
                ? <><span className="spinner" /> Generating report…</>
                : aiReport ? '🔄 Regenerate Report' : '🤖 Generate AI Report'}
            </button>
            {aiReport && !aiLoading && (
              <div style={{
                marginTop: 10, padding: '12px 12px', borderRadius: 'var(--r-md)',
                background: aiReport.status === 'OK' ? 'rgba(124,58,237,0.06)' : 'var(--danger-f)',
                border: `1px solid ${aiReport.status === 'OK' ? 'rgba(124,58,237,0.2)' : 'rgba(239,68,68,0.2)'}`,
              }}>
                {aiReport.status === 'OK' ? (
                  <>
                    <div style={{ fontSize: 10, lineHeight: 1.7, color: 'var(--text-1)', whiteSpace: 'pre-wrap' }}>{aiReport.summary}</div>
                    <div style={{ marginTop: 8, fontSize: 9, color: 'var(--text-2)', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-0)', paddingTop: 6 }}>
                      <span>🤖 {aiReport.model}</span>
                      {aiReport.generated_at && <span>{new Date(aiReport.generated_at).toLocaleTimeString('en-IN', { hour12: false })} IST</span>}
                    </div>
                  </>
                ) : aiReport.status === 'GROQ_NOT_CONFIGURED' ? (
                  <div style={{ fontSize: 10, color: 'var(--warning)' }}>⚠️ {aiReport.message}</div>
                ) : (
                  <div style={{ fontSize: 10, color: 'var(--danger)' }}>❌ {aiReport.error}</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─ FOOTER BROADCAST ──────────────────────────────────────────────── */}
        <div style={{ padding: '12px 14px', marginTop: 'auto', borderTop: '1px solid var(--border-0)', flexShrink: 0 }}>
          <button className="btn btn-danger btn-full" onClick={() => setShowBroadcast(true)}>
            📢 Broadcast Alert to Citizens
          </button>
        </div>
      </div>

      {/* ═══ MAP ══════════════════════════════════════════════════════════════ */}
      <div className="map-container">
        <div className="map-wrapper">
          <MapContainer
            center={[18.565, 73.825]}
            zoom={12}
            zoomControl
            style={{ width: '100%', height: '100%' }}
          >
            <MapBounds wards={wards} />
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              maxZoom={19}
            />

            {/* ── Ward Circles ─────────────────────────────────────────────── */}
            {displayWards.map(ward => (
              <CircleMarker
                key={ward.id}
                center={[ward.lat, ward.lng]}
                radius={Math.sqrt(ward.population / 8000) * 5}
                fillColor={RISK_COLORS[ward.risk] || '#1a6bff'}
                fillOpacity={0.18}
                color={RISK_COLORS[ward.risk] || '#1a6bff'}
                weight={1.5}
              >
                <LeafletTooltip direction="top" offset={[0, -6]}>
                  <strong>{ward.name}</strong> ({ward.authority}) — <span style={{ color: RISK_COLORS[ward.risk] }}>{ward.risk}</span>
                </LeafletTooltip>
                <Popup>
                  <div className="popup-title">{ward.name} — {ward.authority}</div>
                  <div className="popup-row"><span>Population</span><strong>{ward.population.toLocaleString()}</strong></div>
                  <div className="popup-row"><span>Risk Level</span><strong style={{ color: RISK_COLORS[ward.risk] }}>{ward.risk}</strong></div>
                  <div className="popup-row"><span>Coordinates</span><strong>{ward.lat.toFixed(4)}, {ward.lng.toFixed(4)}</strong></div>
                </Popup>
              </CircleMarker>
            ))}

            {/* ── FLOOD HEXAGONS ────────────────────────────────────────────
                Shown in FLOOD, COMBINED, OVERVIEW modes.
                Each flood node gets a hexagonal polygon whose:
                  - fill colour reflects risk level
                  - opacity reflects risk score (0–1)
                  - size is user-adjustable via the hex slider
            ─────────────────────────────────────────────────────────────── */}
            {(mapMode === 'FLOOD' || mapMode === 'OVERVIEW' || mapMode === 'COMBINED') &&
              hexData.map(node => {
                const pts      = hexagonPoints(node.lat, node.lng, hexSize);
                const color    = RISK_COLORS[node.risk];
                const fillOp   = 0.25 + node.riskScore * 0.55; // 0.25–0.80
                const strokeW  = node.risk === 'CRITICAL' ? 3 : node.risk === 'HIGH' ? 2.5 : 1.5;
                const strokeOp = 0.8;
                const isActive = !!node.simNode;

                return (
                  <Polygon
                    key={node.id}
                    positions={pts}
                    pathOptions={{
                      fillColor:   color,
                      fillOpacity: fillOp,
                      color:       color,
                      weight:      strokeW,
                      opacity:     strokeOp,
                      dashArray:   isActive ? null : '4 3',
                    }}
                  >
                    <LeafletTooltip direction="top" offset={[0, -8]}>
                      <strong>⬡ {node.name}</strong><br />
                      Risk: <strong style={{ color }}>{node.risk}</strong>
                      &nbsp;({(node.riskScore * 100).toFixed(0)}%)<br />
                      {node.effectiveRain > 0 && <>Rain: {node.effectiveRain} mm/hr<br /></>}
                      Drain Capacity: {node.drainage_capacity_mm} mm/hr<br />
                      {node.floodEta && <><span style={{ color: '#ff2d55' }}>⚠ Flood ETA: {node.floodEta.toFixed(1)} hrs</span><br /></>}
                      {!isActive && <span style={{ color: '#4a6088' }}>↑ Run simulation for live data</span>}
                    </LeafletTooltip>
                    <Popup>
                      <div className="popup-title">⬡ {node.name}</div>
                      <div className="popup-row"><span>Risk Level</span><strong style={{ color }}>{node.risk}</strong></div>
                      <div className="popup-row"><span>Risk Score</span><strong>{(node.riskScore * 100).toFixed(1)}%</strong></div>
                      <div className="popup-row"><span>Elevation</span><strong>{node.elevation_m} m</strong></div>
                      <div className="popup-row"><span>Drain Capacity</span><strong>{node.drainage_capacity_mm} mm/hr</strong></div>
                      {node.simNode && <>
                        <div className="popup-row"><span>Effective Rainfall</span><strong>{node.effectiveRain} mm/hr</strong></div>
                        {node.floodEta && <div className="popup-row"><span style={{ color: '#ff2d55' }}>⚠ Flood ETA</span><strong style={{ color: '#ff2d55' }}>{node.floodEta.toFixed(1)} hours</strong></div>}
                      </>}
                      {!node.simNode && <div style={{ fontSize: 10, color: '#4a6088', marginTop: 6 }}>Run simulation to see live risk data</div>}
                    </Popup>
                  </Polygon>
                );
              })
            }

            {/* ── TRAFFIC ROAD LINES ────────────────────────────────────────
                Shown in TRAFFIC, COMBINED, OVERVIEW modes.
                Each road polyline updates INSTANTLY when:
                  - simTraffic slider changes (instant colour preview)
                  - a road is toggled closed (red dash)
                  - simulation results arrive (precise LOS colour)
                Width encodes road type (expressway > national > arterial).
            ─────────────────────────────────────────────────────────────── */}
            {(mapMode === 'TRAFFIC' || mapMode === 'OVERVIEW' || mapMode === 'COMBINED') &&
              roads.map(road => {
                const isClosed   = closedRoads.includes(road.id);
                const simRoad    = trafficOverlay?.find(r => r.road_id === road.id);
                const color      = isClosed ? '#ff0000' : (
                  simRoad
                    ? (TRAFFIC_COLORS[simRoad.status] || '#1a6bff')
                    : instantTrafficColor(road, simTraffic, closedRoads, trafficOverlay)
                );
                const baseW      = ROAD_WEIGHT[road.type] || 4;
                const weight     = isClosed ? baseW + 2 : simRoad?.status === 'SEVERE_JAM' ? baseW + 3 : baseW;
                const opacity    = isClosed ? 1 : instantTrafficOpacity(road, simTraffic, trafficOverlay);
                const ratio      = simRoad ? (simRoad.effective_volume_vph || 0) / (road.capacity_vph || 1) : 0;

                return (
                  <Polyline
                    key={road.id}
                    positions={road.coords.map(([lng, lat]) => [lat, lng])}
                    pathOptions={{
                      color,
                      weight,
                      opacity,
                      dashArray: isClosed ? '12 8' : null,
                      lineCap:  'round',
                      lineJoin: 'round',
                    }}
                  >
                    <LeafletTooltip direction="center" sticky>
                      <strong>{isClosed ? '🚧 CLOSED — ' : ''}{road.name}</strong><br />
                      Type: {road.type?.replace(/_/g, ' ')}<br />
                      Capacity: {road.capacity_vph?.toLocaleString()} vph<br />
                      {simRoad && <>
                        Flow: {simRoad.effective_volume_vph?.toLocaleString()} vph
                        &nbsp;({(ratio * 100).toFixed(0)}% util)<br />
                        Status: <strong style={{ color }}>{simRoad.status?.replace('_', ' ')}</strong>
                        {simRoad.los && <>&nbsp;· LOS {simRoad.los}</>}
                      </>}
                      {!simRoad && simTraffic > 0 && <>
                        Preview: +{simTraffic}% surge applied<br />
                        <span style={{ color: '#f5c518' }}>Run simulation for exact LOS</span>
                      </>}
                    </LeafletTooltip>
                    <Popup>
                      <div className="popup-title">{road.name}</div>
                      <div className="popup-row"><span>Type</span><strong>{road.type?.replace(/_/g, ' ')}</strong></div>
                      <div className="popup-row"><span>Capacity</span><strong>{road.capacity_vph?.toLocaleString()} vph</strong></div>
                      {simRoad && <>
                        <div className="popup-row"><span>Flow</span><strong>{simRoad.effective_volume_vph?.toLocaleString()} vph</strong></div>
                        <div className="popup-row"><span>Utilisation</span><strong>{(ratio * 100).toFixed(1)}%</strong></div>
                        <div className="popup-row"><span>Status</span><strong style={{ color }}>{simRoad.status?.replace('_', ' ')}</strong></div>
                        {simRoad.los && <div className="popup-row"><span>Level of Service</span><strong>LOS {simRoad.los}</strong></div>}
                      </>}
                      <div className="popup-row"><span>Status</span><strong style={{ color: isClosed ? '#ff2d55' : '#00e676' }}>{isClosed ? 'CLOSED' : 'OPEN'}</strong></div>
                    </Popup>
                  </Polyline>
                );
              })
            }
            {/* ── REAL STREET ROUTES (OSMnx) ───────────────────────────────
                Shown in ROUTING mode.
                Each route is computed by the backend Dijkstra algorithm on
                the actual OpenStreetMap road network for Pune.
                - CYAN  = normal fastest route (no flood interference)
                - AMBER = rerouted path (avoids flooded / closed roads)
                Width: 5px base + 2px glow via two overlaid polylines.
            ─────────────────────────────────────────────────────────────── */}
            {mapMode === 'ROUTING' && routes.map((route, idx) => {
              if (!route.coords || route.coords.length < 2) return null;
              const isRerouted = route.is_rerouted;
              const color      = isRerouted ? '#f5c518' : '#00d4ff';
              const glowColor  = isRerouted ? 'rgba(245,197,24,0.25)' : 'rgba(0,212,255,0.20)';
              return (
                <React.Fragment key={`route-${idx}`}>
                  {/* Glow halo (wider, transparent) */}
                  <Polyline
                    positions={route.coords}
                    pathOptions={{ color: glowColor, weight: 14, opacity: 1, lineCap: 'round', lineJoin: 'round' }}
                  />
                  {/* Core line */}
                  <Polyline
                    positions={route.coords}
                    pathOptions={{ color, weight: isRerouted ? 5 : 4, opacity: 0.92, lineCap: 'round', lineJoin: 'round' }}
                  >
                    <LeafletTooltip direction="center" sticky>
                      <strong>{isRerouted ? '🔀 REROUTED: ' : '🛣️ '}{route.label}</strong><br />
                      Distance: {((route.distance_m || 0) / 1000).toFixed(1)} km<br />
                      Base time: {Math.round((route.travel_time_base_s || 0) / 60)} min&nbsp;
                      {isRerouted && <>→ Sim: {Math.round((route.travel_time_sim_s || 0) / 60)} min<br /></>}
                      {isRerouted && <span style={{ color: '#f5c518' }}>⚠ {route.rerouting_reason}</span>}
                    </LeafletTooltip>
                    <Popup>
                      <div className="popup-title">{isRerouted ? '🔀 Rerouted — ' : '🛣️ '}{route.label}</div>
                      <div className="popup-row"><span>Distance</span><strong>{((route.distance_m || 0) / 1000).toFixed(2)} km</strong></div>
                      <div className="popup-row"><span>Normal time</span><strong>{Math.round((route.travel_time_base_s || 0) / 60)} min</strong></div>
                      {isRerouted && <div className="popup-row"><span>Sim time</span><strong style={{ color: '#f5c518' }}>{Math.round((route.travel_time_sim_s || 0) / 60)} min</strong></div>}
                      <div className="popup-row"><span>Status</span><strong style={{ color: isRerouted ? '#f5c518' : '#00e676' }}>{isRerouted ? 'REROUTED' : 'NORMAL'}</strong></div>
                      {isRerouted && <div className="popup-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}><span>Reason</span><span style={{ color: '#ff6b00', fontSize: 10, marginTop: 2 }}>{route.rerouting_reason}</span></div>}
                      <div className="popup-row"><span>Points</span><strong>{route.node_count} nodes</strong></div>
                    </Popup>
                  </Polyline>
                </React.Fragment>
              );
            })}

            {/* Routing waypoint markers */}
            {mapMode === 'ROUTING' && routes.map((route, idx) => (
              <React.Fragment key={`wp-${idx}`}>
                <CircleMarker center={route.origin_coords} radius={5}
                  pathOptions={{ color: '#00d4ff', fillColor: '#00d4ff', fillOpacity: 1, weight: 2 }}>
                  <LeafletTooltip direction="top"><strong>▶ {route.origin?.replace(/_/g, ' ')}</strong></LeafletTooltip>
                </CircleMarker>
                <CircleMarker center={route.dest_coords} radius={5}
                  pathOptions={{ color: route.is_rerouted ? '#f5c518' : '#00e676', fillColor: route.is_rerouted ? '#f5c518' : '#00e676', fillOpacity: 1, weight: 2 }}>
                  <LeafletTooltip direction="top"><strong>■ {route.dest?.replace(/_/g, ' ')}</strong></LeafletTooltip>
                </CircleMarker>
              </React.Fragment>
            ))}
          </MapContainer>
        </div>

        {/* ── Map Legend ──────────────────────────────────────────────────── */}
        <div className="map-overlay-badge map-legend">
          <div style={{ fontSize: 10, fontWeight: 800, marginBottom: 8, color: 'var(--text-secondary)' }}>RISK LEGEND</div>
          {Object.entries(RISK_COLORS).map(([level, color]) => (
            <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 14, height: 12, background: color, opacity: 0.7, clipPath: 'polygon(25% 0%,75% 0%,100% 50%,75% 100%,25% 100%,0% 50%)' }} />
              <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{level}</span>
            </div>
          ))}
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-secondary)', margin: '8px 0' }} />
          <div style={{ fontSize: 10, fontWeight: 800, marginBottom: 6, color: 'var(--text-secondary)' }}>TRAFFIC</div>
          {[['CLEAR', '#00e676'], ['MODERATE', '#f5c518'], ['HEAVY', '#ff6b00'], ['SEVERE JAM', '#ff2d55'], ['CLOSED', '#ff0000']].map(([label, color]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <div style={{ width: 16, height: 3, background: color, borderRadius: 2 }} />
              <span style={{ fontSize: 9.5, color: 'var(--text-secondary)' }}>{label}</span>
            </div>
          ))}
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-secondary)', margin: '8px 0' }} />
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>⬡ Hex = Flood Zone · — = Road</span>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-secondary)', margin: '8px 0' }} />
          <div style={{ fontSize: 10, fontWeight: 800, marginBottom: 6, color: 'var(--text-secondary)' }}>STREET ROUTES</div>
          {[['NORMAL ROUTE', '#00d4ff'], ['REROUTED', '#f5c518']].map(([label, color]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <div style={{ width: 18, height: 4, background: color, borderRadius: 2 }} />
              <span style={{ fontSize: 9.5, color: 'var(--text-secondary)' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* ── Simulation Status ───────────────────────────────────────────── */}
        <div className="map-overlay-badge map-status">
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>SIMULATION STATUS</div>
          <div className={`live-indicator ${simRunning ? 'blinking' : ''}`}>
            <div className="live-dot" style={{
              background: simRunning
                ? 'var(--status-medium)'
                : (floodResult || trafficResult) ? 'var(--status-low)' : 'var(--text-muted)',
            }} />
            <span style={{ fontSize: 11, fontWeight: 700 }}>
              {simRunning ? 'Computing...' : (floodResult || trafficResult) ? `Results Active — ${mapMode}` : 'Standby'}
            </span>
          </div>
          {floodResult && (
            <div style={{ fontSize: 9.5, color: '#4a6088', marginTop: 4 }}>
              🌊 {criticalCount} critical zones · 🌦️ {weather?.is_real_data ? 'Live' : 'Sim'} weather
            </div>
          )}
          {trafficResult && (
            <div style={{ fontSize: 9.5, color: '#4a6088', marginTop: 2 }}>
              🚦 {severeJams} severe jams · {trafficResult?.results?.length || 0} corridors
            </div>
          )}
          {!floodResult && !trafficResult && simTraffic > 0 && (
            <div style={{ fontSize: 9.5, color: '#f5c518', marginTop: 4 }}>
              ↑ Road colours preview +{simTraffic}% surge
            </div>
          )}
        </div>
      </div>

      {showBroadcast && <BroadcastModal onClose={() => setShowBroadcast(false)} />}
    </div>
  );
}
