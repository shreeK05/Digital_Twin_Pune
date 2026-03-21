import React, { useState, useEffect } from 'react';

export default function Login({ onLogin }) {
  const [creds, setCreds] = useState({ username: '', password: '', role: 'PMC' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const DEMO_ACCOUNTS = {
    'admin@pmc.gov.in':    { pass: 'pmc2026', role: 'PMC',  name: 'Dr. Vikram Patil, IAS', title: 'Municipal Commissioner' },
    'admin@pcmc.gov.in':   { pass: 'pcmc2026', role: 'PCMC', name: 'Shri Anil Shinde, IAS', title: 'Commissioner PCMC' },
    'ops@urbanshield.in':  { pass: 'ops2026',  role: 'ALL',  name: 'Urban Shield Operations', title: 'System Administrator' },
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    await new Promise(r => setTimeout(r, 900));
    const account = DEMO_ACCOUNTS[creds.username];
    if (account && account.pass === creds.password) {
      onLogin({ email: creds.username, ...account });
    } else {
      setError('Invalid credentials. Please check your email and password.');
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #050b18 0%, #091428 40%, #0d1f3c 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated background grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(26,107,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(26,107,255,0.04) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        pointerEvents: 'none',
      }} />

      {/* Glow orbs */}
      <div style={{ position: 'absolute', top: '15%', left: '10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(26,107,255,0.08) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '15%', right: '8%', width: 350, height: 350, background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

      {/* Top Header Bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '12px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid rgba(26,107,255,0.1)',
        background: 'rgba(5,11,24,0.8)',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🇮🇳</span>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,165,0,0.8)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Government of Maharashtra</div>
            <div style={{ fontSize: 10, color: '#4a6088', letterSpacing: '0.06em' }}>Smart City Mission — Pune Metropolitan Region</div>
          </div>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#4a6088' }}>
          {time.toLocaleString('en-IN', { hour12: false, timeZone: 'Asia/Kolkata' })} IST
        </div>
      </div>

      {/* Main Login Container */}
      <div style={{ display: 'flex', gap: 64, alignItems: 'center', zIndex: 1, maxWidth: 1000, width: '100%' }}>
        {/* Left — Branding */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
            <div style={{
              width: 64, height: 64,
              background: 'linear-gradient(135deg, #1a6bff, #00d4ff)',
              borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 30,
              boxShadow: '0 0 40px rgba(26,107,255,0.4)',
            }}>🛡️</div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,165,0,0.85)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 3 }}>Urban Crisis · Digital Twin</div>
              <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.03em', color: 'white', lineHeight: 1 }}>PUNE URBAN SHIELD</div>
              <div style={{ fontSize: 10, color: '#4a6088', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>PMC + PCMC · Smart City Mission v2.0</div>
            </div>
          </div>

          <div style={{ fontSize: 13, color: '#8ba3c7', lineHeight: 1.7, maxWidth: 420, marginBottom: 4 }}>
            An exact <strong style={{ color: '#e8f0fe' }}>digital copy of Pune &amp; PCMC</strong> that lets the city
            make its mistakes on a <strong style={{ color: '#00d4ff' }}>computer screen</strong> instead
            of on the real streets.
          </div>

          {/* Feature Pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {[
              {
                icon: '🔮', num: '01',
                text: 'Proactive Crystal Ball',
                sub: 'Predict flood → Act before disaster · Open-Meteo WMO + Manning formula',
                color: '#ff6b00',
              },
              {
                icon: '🎮', num: '02',
                text: 'Ctrl+Z Sandbox for Planners',
                sub: 'Block any road virtually — see traffic impact without real-world chaos',
                color: '#1a6bff',
              },
              {
                icon: '⚔️', num: '03',
                text: 'Smart Resource Commander',
                sub: 'Maths-computed deployment: where to send pumps, police & NDRF teams',
                color: '#00d4ff',
              },
              {
                icon: '📊', num: '04',
                text: 'Visual Budget Proof',
                sub: 'Show ₹ damage prevented · Turn guesswork into mathematical fact',
                color: '#00e676',
              },
              {
                icon: '🛣️', num: '05',
                text: 'Real Street Routing Engine',
                sub: 'OSMnx · 18 real Pune routes · Dynamic rerouting around flooded roads',
                color: '#9b59b6',
              },
            ].map(({ icon, num, text, sub, color }) => (
              <div key={text} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0, marginTop: 1,
                  background: `${color}18`, border: `1px solid ${color}35`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
                }}>{icon}</div>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#e8f0fe' }}>
                    <span style={{ color, fontFamily: 'monospace', fontSize: 10, marginRight: 5 }}>{num}</span>
                    {text}
                  </div>
                  <div style={{ fontSize: 10, color: '#4a6088' }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Authority Badges */}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            {[
              { label: 'PMC', desc: 'Pune Municipal Corporation', color: '#1a6bff' },
              { label: 'PCMC', desc: 'Pimpri-Chinchwad MC', color: '#00d4ff' },
            ].map(({ label, desc, color }) => (
              <div key={label} style={{ padding: '8px 14px', background: `${color}10`, border: `1px solid ${color}30`, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color, letterSpacing: '0.06em' }}>{label}</div>
                <div style={{ fontSize: 9.5, color: '#4a6088', marginTop: 2 }}>{desc}</div>
              </div>
            ))}
            <div style={{ padding: '8px 14px', background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.2)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#00e676', letterSpacing: '0.06em' }}>LIVE</div>
              <div style={{ fontSize: 9.5, color: '#4a6088', marginTop: 2 }}>System Active</div>
            </div>
          </div>
        </div>

        {/* Right — Login Form */}
        <div style={{
          width: 380,
          background: 'rgba(13,27,46,0.95)',
          border: '1px solid rgba(26,107,255,0.2)',
          borderRadius: 20,
          padding: 32,
          backdropFilter: 'blur(20px)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          flexShrink: 0,
        }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#e8f0fe', marginBottom: 6 }}>Secure Command Access</div>
            <div style={{ fontSize: 11.5, color: '#4a6088' }}>Authorised government personnel only. All access is logged and audited.</div>
          </div>

          {/* Demo Credentials Hint */}
          <div style={{ background: 'rgba(26,107,255,0.06)', border: '1px solid rgba(26,107,255,0.15)', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: '#4a6088', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Demo Credentials</div>
            {[
              { email: 'admin@pmc.gov.in', pass: 'pmc2026', role: 'PMC' },
              { email: 'admin@pcmc.gov.in', pass: 'pcmc2026', role: 'PCMC' },
              { email: 'ops@urbanshield.in', pass: 'ops2026', role: 'ALL' },
            ].map(({ email, pass, role }) => (
              <div
                key={email}
                style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 0', fontSize: 10.5, color: '#8ba3c7', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                onClick={() => setCreds({ username: email, password: pass, role })}
              >
                <span>{email}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#1a6bff' }}>→ {role}</span>
              </div>
            ))}
            <div style={{ fontSize: 9, color: '#4a6088', marginTop: 5 }}>Click any row to auto-fill</div>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Government Email</label>
              <input
                className="form-input"
                type="email"
                placeholder="officer@pmc.gov.in"
                value={creds.username}
                onChange={(e) => setCreds({ ...creds, username: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="form-input"
                type="password"
                placeholder="••••••••"
                value={creds.password}
                onChange={(e) => setCreds({ ...creds, password: e.target.value })}
                required
              />
            </div>

            {error && (
              <div style={{ background: 'rgba(255,45,85,0.1)', border: '1px solid rgba(255,45,85,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 11.5, color: 'var(--status-critical)' }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-full"
              style={{ fontSize: 13, fontWeight: 800, padding: '12px', marginTop: 8 }}
              disabled={loading}
            >
              {loading ? (
                <><span className="spinner" style={{ width: 14, height: 14 }} /> Authenticating...</>
              ) : (
                '🔐 Access Command Center'
              )}
            </button>
          </form>

          <div style={{ marginTop: 20, padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, fontSize: 10, color: '#4a6088', lineHeight: 1.7 }}>
            🔒 Encrypted under AES-256 · All sessions logged<br />
            📋 Unauthorised access is a criminal offence under IT Act 2000<br />
            🏛️ © 2026 PMC · PCMC · Smart City Mission, GoI
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center', fontSize: 10, color: '#2a3a55' }}>
        Pune Urban Shield v2.0 · Powered by Drona Simulation Engine · Open-Meteo · OpenStreetMap
      </div>
    </div>
  );
}
