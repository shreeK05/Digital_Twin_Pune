import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';

const SEVERITY_COLORS = {
  CRITICAL: 'var(--status-critical)',
  HIGH:     'var(--status-high)',
  MEDIUM:   'var(--status-medium)',
  LOW:      'var(--status-low)',
};
const SEVERITY_ICONS  = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🟢' };
const SEVERITY_BG     = {
  CRITICAL: 'rgba(255,45,85,0.07)',
  HIGH:     'rgba(255,107,0,0.07)',
  MEDIUM:   'rgba(245,197,24,0.07)',
  LOW:      'rgba(0,230,118,0.06)',
};
const SEVERITY_BORDER = {
  CRITICAL: 'rgba(255,45,85,0.25)',
  HIGH:     'rgba(255,107,0,0.25)',
  MEDIUM:   'rgba(245,197,24,0.25)',
  LOW:      'rgba(0,230,118,0.2)',
};

function timeAgo(ts) {
  const secs = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (secs < 60)  return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

function AlertCard({ alert, onAck }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      style={{
        display: 'flex', gap: 14, padding: '14px 16px',
        borderRadius: 10, marginBottom: 8,
        background: SEVERITY_BG[alert.severity] || 'rgba(255,255,255,0.03)',
        border: `1px solid ${SEVERITY_BORDER[alert.severity] || 'var(--border-primary)'}`,
        borderLeft: `4px solid ${SEVERITY_COLORS[alert.severity] || 'var(--border-primary)'}`,
        opacity: alert.acknowledged ? 0.55 : 1,
        transition: 'opacity 0.3s',
      }}
    >
      {/* Icon */}
      <div style={{ fontSize: 24, lineHeight: 1, paddingTop: 2, flexShrink: 0 }}>
        {SEVERITY_ICONS[alert.severity]}
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)' }}>
            {alert.title}
          </span>
          <span className={`risk-badge ${alert.severity}`}>{alert.severity}</span>
          {alert.auto_generated && (
            <span style={{
              fontSize: 9, background: 'rgba(0,212,255,0.1)', color: 'var(--brand-cyan)',
              padding: '1px 7px', borderRadius: 99, border: '1px solid rgba(0,212,255,0.2)',
              fontWeight: 700, letterSpacing: 0.5,
            }}>
              AUTO
            </span>
          )}
          {alert.source === 'MANUAL' && (
            <span style={{
              fontSize: 9, background: 'rgba(124,58,237,0.12)', color: '#a78bfa',
              padding: '1px 7px', borderRadius: 99, border: '1px solid rgba(124,58,237,0.2)',
              fontWeight: 700,
            }}>
              BROADCAST
            </span>
          )}
          {alert.acknowledged && (
            <span style={{ fontSize: 9, color: 'var(--status-low)', fontWeight: 700 }}>✓ ACK</span>
          )}
        </div>

        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.5 }}>
          {alert.message}
        </div>

        <div style={{ display: 'flex', gap: 14, fontSize: 10.5, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
          <span>📍 {alert.area || 'City-Wide'}</span>
          <span>🆔 {alert.id}</span>
          <span title={new Date(alert.timestamp).toLocaleString('en-IN', { hour12: false })}>
            🕐 {timeAgo(alert.timestamp)}
          </span>
        </div>
      </div>

      {/* Action */}
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        {!alert.acknowledged ? (
          <button
            className="btn btn-outline"
            style={{ fontSize: 10, padding: '5px 12px', whiteSpace: 'nowrap' }}
            onClick={() => onAck(alert.id)}
          >
            ✓ Acknowledge
          </button>
        ) : (
          <span style={{ fontSize: 10, color: 'var(--status-low)', fontWeight: 700, whiteSpace: 'nowrap' }}>
            ✓ Done
          </span>
        )}
      </div>
    </div>
  );
}

export default function Alerts() {
  const { alerts, fetchAlerts, acknowledgeAlert } = useStore();
  const [filter, setFilter]           = useState('ALL');
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchAlerts();
    setLastRefresh(new Date());
    setLoading(false);
  }, [fetchAlerts]);

  // Fetch on mount + every 8 seconds
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 8000);
    return () => clearInterval(interval);
  }, [refresh]);

  const filtered = filter === 'ALL' ? alerts : alerts.filter(a => a.severity === filter);
  const counts   = { ALL: alerts.length, CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  alerts.forEach(a => { if (counts[a.severity] !== undefined) counts[a.severity]++; });
  const unacked  = alerts.filter(a => !a.acknowledged).length;

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100, margin: '0 auto' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            🚨 Alerts Center
            {unacked > 0 && (
              <span style={{
                fontSize: 12, fontWeight: 700, background: 'var(--status-critical)',
                color: '#fff', borderRadius: 99, padding: '2px 9px',
              }}>
                {unacked} LIVE
              </span>
            )}
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 5 }}>
            Real-time incident monitoring — PMC &amp; PCMC Pune
            {lastRefresh && (
              <span style={{ marginLeft: 10, color: 'var(--brand-cyan)', fontSize: 10.5 }}>
                ● Live · refreshed {timeAgo(lastRefresh)}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            className="btn btn-outline"
            style={{ fontSize: 11, opacity: loading ? 0.6 : 1 }}
            onClick={refresh}
            disabled={loading}
          >
            {loading ? '⏳' : '↻'} Refresh
          </button>
          <button className="btn btn-danger" onClick={() => setShowBroadcast(true)}>
            📢 Broadcast New Alert
          </button>
        </div>
      </div>

      {/* ── Summary KPI Cards ───────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 22 }}>
        {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(s => (
          <div
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
              background: filter === s
                ? (s === 'ALL' ? 'rgba(26,107,255,0.12)' : `${SEVERITY_BG[s]}`)
                : 'var(--bg-2)',
              border: `1px solid ${filter === s
                ? (s === 'ALL' ? 'rgba(26,107,255,0.4)' : SEVERITY_BORDER[s])
                : 'var(--border-primary)'}`,
              borderTop: `3px solid ${s === 'ALL' ? 'var(--brand-blue)' : (SEVERITY_COLORS[s] || 'var(--border-primary)')}`,
              transition: 'all 0.18s',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
              {s === 'ALL' ? 'Total Alerts' : s}
            </div>
            <div style={{
              fontSize: 28, fontWeight: 800, lineHeight: 1,
              color: s === 'ALL' ? 'var(--text-primary)' : (SEVERITY_COLORS[s] || 'var(--text-primary)'),
            }}>
              {counts[s]}
            </div>
            <div style={{ marginTop: 4, fontSize: 16 }}>{s === 'ALL' ? '📋' : SEVERITY_ICONS[s]}</div>
          </div>
        ))}
      </div>

      {/* ── Alerts List ─────────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-2)', borderRadius: 12,
        border: '1px solid var(--border-primary)', overflow: 'hidden',
      }}>
        {/* List header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderBottom: '1px solid var(--border-primary)',
        }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>
            📋 {filter === 'ALL' ? 'All Alerts' : `${filter} Alerts`}
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {unacked} unacknowledged
            </span>
            {/* Filter pills */}
            <div style={{ display: 'flex', gap: 4 }}>
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(s => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  style={{
                    fontSize: 10, padding: '3px 9px', borderRadius: 99, border: 'none',
                    cursor: 'pointer', fontWeight: 600,
                    background: filter === s
                      ? (s === 'ALL' ? 'var(--brand-blue)' : SEVERITY_COLORS[s])
                      : 'var(--bg-3)',
                    color: filter === s ? '#fff' : 'var(--text-muted)',
                    transition: 'all 0.15s',
                  }}
                >
                  {s === 'ALL' ? 'All' : s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List body */}
        <div style={{ padding: '12px 14px', minHeight: 120 }}>
          {loading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
              <div style={{ fontSize: 13 }}>Fetching alerts…</div>
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                No {filter === 'ALL' ? '' : filter + ' '}alerts at this time
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                Alerts appear here when:
                <br />• The simulation detects <strong>Critical / High</strong> flood or traffic risk
                <br />• You click <strong>"📢 Broadcast New Alert"</strong> above
              </div>
              <button
                className="btn btn-primary"
                style={{ marginTop: 16, fontSize: 12 }}
                onClick={() => setShowBroadcast(true)}
              >
                📢 Create Manual Alert
              </button>
            </div>
          )}
          {filtered.map(alert => (
            <AlertCard key={alert.id} alert={alert} onAck={acknowledgeAlert} />
          ))}
        </div>
      </div>

      {showBroadcast && <BroadcastModal onClose={() => { setShowBroadcast(false); refresh(); }} />}
    </div>
  );
}

/* ─── Broadcast Modal ────────────────────────────────────────────────────── */
function BroadcastModal({ onClose }) {
  const { broadcastAlert } = useStore();
  const [form, setForm]   = useState({ title: '', message: '', severity: 'HIGH', area: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent]   = useState(false);
  const [error, setError] = useState('');

  const valid = form.title.trim().length >= 3 && form.area.trim().length >= 2;

  const handleSend = async () => {
    if (!valid) { setError('Please fill in Title (min 3 chars) and Target Area.'); return; }
    setError('');
    setSending(true);
    const ok = await broadcastAlert({
      title:    form.title.trim(),
      message:  form.message.trim() || `${form.severity} alert issued for ${form.area}.`,
      severity: form.severity,
      area:     form.area.trim(),
    });
    setSending(false);
    if (ok) {
      setSent(true);
      setTimeout(onClose, 1400);
    } else {
      setError('Failed to send — check if backend is running.');
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 480, background: 'var(--bg-1)', borderRadius: 14,
          border: '1px solid var(--border-primary)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)', overflow: 'hidden',
        }}
      >
        {/* Modal header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(255,45,85,0.07)',
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>📢 Broadcast Alert</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Sends to all citizens · Appears in Alerts Center
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4,
            }}
          >×</button>
        </div>

        {/* Modal body */}
        <div style={{ padding: '20px 20px' }}>
          {/* Severity selector */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.7, display: 'block', marginBottom: 6 }}>
              Severity Level
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(s => (
                <button
                  key={s}
                  onClick={() => setForm({ ...form, severity: s })}
                  style={{
                    flex: 1, padding: '8px 4px', borderRadius: 8,
                    border: `2px solid ${form.severity === s ? SEVERITY_COLORS[s] : 'var(--border-primary)'}`,
                    background: form.severity === s ? `${SEVERITY_BG[s]}` : 'transparent',
                    color: form.severity === s ? SEVERITY_COLORS[s] : 'var(--text-muted)',
                    cursor: 'pointer', fontWeight: 700, fontSize: 11, transition: 'all 0.15s',
                  }}
                >
                  {SEVERITY_ICONS[s]}<br />{s}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.7, display: 'block', marginBottom: 5 }}>
              Alert Title *
            </label>
            <input
              className="form-input"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="E.g., Flood Warning — Wakad Underpass"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {/* Message */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.7, display: 'block', marginBottom: 5 }}>
              Message <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
            </label>
            <textarea
              className="form-textarea"
              value={form.message}
              onChange={e => setForm({ ...form, message: e.target.value })}
              placeholder="Detailed guidance for citizens in the affected area..."
              rows={3}
              style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>

          {/* Target Area */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.7, display: 'block', marginBottom: 5 }}>
              Target Area *
            </label>
            <input
              className="form-input"
              value={form.area}
              onChange={e => setForm({ ...form, area: e.target.value })}
              placeholder="E.g., Wakad, Hinjewadi, City-Wide"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {error && (
            <div style={{ fontSize: 12, color: 'var(--status-critical)', marginBottom: 12, background: 'rgba(255,45,85,0.08)', borderRadius: 6, padding: '8px 12px' }}>
              ⚠ {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-danger"
              style={{ flex: 2, fontSize: 13, opacity: (!valid || sending) ? 0.6 : 1 }}
              onClick={handleSend}
              disabled={sending || !valid}
            >
              {sent ? '✓ Broadcast Sent!' : sending ? '⏳ Sending…' : '🚨 Send Broadcast'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
