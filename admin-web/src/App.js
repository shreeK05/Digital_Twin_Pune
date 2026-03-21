import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import Dashboard from './pages/Dashboard';
import MapSimulation from './pages/MapSimulation';
import Alerts from './pages/Alerts';
import Analytics from './pages/Analytics';
import WardDirectory from './pages/WardDirectory';
import LandingPage from './pages/LandingPage';
import IoTSensors from './pages/IoTSensors';
import CitizenReports from './pages/CitizenReports';

/* ─── Sidebar Nav ────────────────────────────────────────────── */
function SidebarNav({ unacknowledged }) {
  const ops = [
    { to: '/',          icon: '◈',  label: 'Command Dashboard', end: true },
    { to: '/map',       icon: '⬡',  label: 'Live Map & Simulation'        },
    { to: '/alerts',    icon: '⚠',  label: 'Alerts Center', badge: unacknowledged },
    { to: '/analytics', icon: '∿',  label: 'Analytics & Reports'          },
    { to: '/wards',     icon: '⬡',  label: 'Ward Directory'               },
  ];
  const infra = [
    { to: '/iot',     icon: '◉', label: 'Simulation Monitor' },
    { to: '/reports', icon: '◎', label: 'Citizen Reports'    },
    { to: '/map',     icon: '🌊', label: 'Flood Simulator'   },
    { to: '/map',     icon: '🚦', label: 'Traffic Simulator' },
  ];

  return (
    <nav className="sidebar-nav">
      <div className="nav-section-title">Operations</div>
      {ops.map(item => (
        <NavLink
          key={item.to + item.label}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <span className="nav-icon" style={{ fontFamily: 'monospace', fontSize: 14 }}>{item.icon}</span>
          <span className="nav-label">{item.label}</span>
          {item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
        </NavLink>
      ))}
      <div className="nav-section-title" style={{ marginTop: 16 }}>Infrastructure</div>
      {infra.map(item => (
        <NavLink
          key={item.to + item.label}
          to={item.to}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

/* ─── Topbar ─────────────────────────────────────────────────── */
function Topbar({ weather, alerts, user }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const unacked = alerts.filter(a => !a.acknowledged).length;
  const isReal  = weather?.is_real_data;

  return (
    <div className="topbar">
      <div className="topbar-title">
        <span style={{ fontSize: 16 }}>⚡</span>
        <span>URBAN CRISIS</span>
        <span style={{
          fontSize: 9, padding: '2px 8px', borderRadius: 4,
          background: 'rgba(37,99,235,0.12)', color: 'var(--blue-light)',
          border: '1px solid rgba(37,99,235,0.22)', fontWeight: 600, letterSpacing: '0.08em',
        }}>
          PMC + PCMC
        </span>
        {weather && (
          <span style={{
            fontSize: 8, padding: '2px 8px', borderRadius: 4, fontWeight: 800, letterSpacing: '0.1em',
            background: isReal ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
            color: isReal ? 'var(--success)' : 'var(--warning)',
            border: `1px solid ${isReal ? 'rgba(16,185,129,0.22)' : 'rgba(245,158,11,0.22)'}`,
          }}>
            {isReal ? '● LIVE' : '○ SIM'}
          </span>
        )}
      </div>

      <div className="topbar-spacer" />

      {user && (
        <div style={{ fontSize: 10.5, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ opacity: 0.5 }}>⬡</span>
          <strong style={{ color: 'var(--text-0)', fontWeight: 700 }}>{user.name}</strong>
          <span style={{ color: 'var(--text-2)' }}>·</span>
          <span style={{
            color: user.role === 'PMC' ? 'var(--blue-light)' :
                   user.role === 'PCMC' ? 'var(--cyan)' : 'var(--success)',
            fontWeight: 700, fontSize: 10,
          }}>{user.role}</span>
        </div>
      )}

      {weather && (
        <div className="topbar-weather">
          🌡️ <strong>{weather.temperature}°C</strong>
          &nbsp;·&nbsp;
          🌧️ <strong>{weather.rainfall_mm_hr} mm/hr</strong>
          &nbsp;·&nbsp;
          <span style={{ fontSize: 10, color: 'var(--text-2)' }}>{weather.condition}</span>
        </div>
      )}

      {unacked > 0 && (
        <div className="alert-indicator blinking">
          ⚠ {unacked} Alert{unacked > 1 ? 's' : ''}
        </div>
      )}

      <div className="topbar-datetime">
        {time.toLocaleString('en-IN', { hour12: false, timeZone: 'Asia/Kolkata' })} IST
      </div>
    </div>
  );
}

/* ─── App Layout ─────────────────────────────────────────────── */
function AppLayout({ user, onLogout }) {
  const { weather, alerts, wsConnected, activeAuthority, setActiveAuthority, initApp } = useStore();
  const unacknowledged = alerts.filter(a => !a.acknowledged).length;

  useEffect(() => {
    initApp();
    if (user?.role && user.role !== 'ALL') setActiveAuthority(user.role);
  }, []);

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">⚡</div>
          <div className="logo-text">
            <h2>URBAN CRISIS</h2>
            <span>Digital Twin · Pune</span>
          </div>
        </div>

        <div className="sidebar-authority">
          {['PMC', 'PCMC'].map(auth => (
            <div
              key={auth}
              className={`auth-badge ${auth.toLowerCase()}${activeAuthority === 'ALL' || activeAuthority === auth ? ' active' : ''}`}
              onClick={() => setActiveAuthority(activeAuthority === auth ? 'ALL' : auth)}
            >
              {auth === 'PMC' ? '🏙️' : '🌆'} {auth}
            </div>
          ))}
        </div>

        <SidebarNav unacknowledged={unacknowledged} />

        <div className="sidebar-footer">
          <div className="live-indicator">
            <div className="live-dot" />
            {wsConnected ? 'Live Feed Active' : 'Connecting…'}
          </div>
          {user && (
            <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border-0)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.4 }}>{user.name}</div>
              <div style={{ fontSize: 9, color: 'var(--text-2)' }}>{user.title}</div>
              <button
                onClick={onLogout}
                style={{
                  marginTop: 7, fontSize: 9.5, color: 'var(--text-2)',
                  background: 'none', border: '1px solid var(--border-0)',
                  borderRadius: 'var(--r-sm)', padding: '3px 10px', cursor: 'pointer',
                  transition: '0.15s', fontFamily: 'var(--font)',
                }}
              >
                ← Back to Landing
              </button>
            </div>
          )}
          <div style={{ marginTop: 8, fontSize: 9, color: 'var(--text-3)', lineHeight: 1.5 }}>
            Drona Engine v2.0<br />
            © 2026 PMC · PCMC · Smart City Mission
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        <Topbar weather={weather} alerts={alerts} user={user} />
        <div className="page-content">
          <Routes>
            <Route path="/"         element={<Dashboard />} />
            <Route path="/map"      element={<MapSimulation />} />
            <Route path="/alerts"   element={<Alerts />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/wards"    element={<WardDirectory />} />
            <Route path="/iot"      element={<IoTSensors />} />
            <Route path="/reports"  element={<CitizenReports />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

/* ─── Root App ───────────────────────────────────────────────── */
export default function App() {
  const [user, setUser] = useState(null);

  // Show landing page when not logged in
  if (!user) {
    return <LandingPage onLogin={setUser} />;
  }

  return (
    <BrowserRouter>
      <AppLayout user={user} onLogout={() => setUser(null)} />
    </BrowserRouter>
  );
}
