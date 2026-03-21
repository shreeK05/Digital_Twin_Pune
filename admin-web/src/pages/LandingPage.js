import React, { useEffect, useRef, useState, useCallback } from 'react';

/* ─── Animated Rain Canvas ──────────────────────────────────────────── */
function RainCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    let raf;
    let drops = [];

    const resize = () => {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const init = () => {
      drops = Array.from({ length: 120 }, () => ({
        x: Math.random() * c.width,
        y: Math.random() * c.height,
        len: 10 + Math.random() * 20,
        speed: 4 + Math.random() * 6,
        alpha: 0.05 + Math.random() * 0.18,
        thickness: 0.5 + Math.random() * 1,
      }));
    };
    init();

    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      drops.forEach(d => {
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - d.len * 0.15, d.y + d.len);
        ctx.strokeStyle = `rgba(0, 180, 255, ${d.alpha})`;
        ctx.lineWidth = d.thickness;
        ctx.stroke();
        d.y += d.speed;
        d.x -= d.speed * 0.15;
        if (d.y > c.height + 30) {
          d.y = -30;
          d.x = Math.random() * c.width;
        }
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.6 }} />;
}

/* ─── 3D Perspective Grid Canvas ───────────────────────────────────── */
function GridCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    let raf;
    let offset = 0;

    const resize = () => {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      const W = c.width, H = c.height;
      const vanishX = W / 2, vanishY = H * 0.42;
      const gridStep = 60;
      const cols = 18, rows = 14;
      offset = (offset + 0.3) % gridStep;

      // Vertical lines
      for (let i = -cols / 2; i <= cols / 2; i++) {
        const baseX = vanishX + i * gridStep;
        const t = Math.abs(i) / (cols / 2);
        const alpha = Math.max(0, (0.25 - t * 0.2));
        ctx.beginPath();
        ctx.moveTo(vanishX, vanishY);
        ctx.lineTo(baseX, H);
        ctx.strokeStyle = `rgba(37,99,235,${alpha})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      // Horizontal lines (receding)
      for (let j = 0; j <= rows; j++) {
        const progress = (j / rows * gridStep + offset) / gridStep;
        const y = vanishY + (H - vanishY) * (progress ** 1.6);
        if (y > H) continue;
        const spreadFrac = (y - vanishY) / (H - vanishY);
        const x1 = vanishX - spreadFrac * (cols / 2) * gridStep;
        const x2 = vanishX + spreadFrac * (cols / 2) * gridStep;
        const alpha = spreadFrac * 0.2;
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.strokeStyle = `rgba(6,182,212,${alpha})`;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />;
}

/* ─── Animated Pulse Nodes ──────────────────────────────────────────── */
function PulseNodes() {
  const nodes = [
    { x: '22%', y: '35%', color: '#ef4444', label: 'Wakad Flood Zone', delay: '0s' },
    { x: '65%', y: '28%', color: '#f59e0b', label: 'Hinjewadi Traffic', delay: '0.4s' },
    { x: '38%', y: '58%', color: '#ef4444', label: 'Katraj Risk', delay: '0.8s' },
    { x: '78%', y: '55%', color: '#10b981', label: 'Kothrud Clear', delay: '1.2s' },
    { x: '15%', y: '62%', color: '#f59e0b', label: 'Swargate Congestion', delay: '0.2s' },
    { x: '55%', y: '70%', color: '#ef4444', label: 'Hadapsar Critical', delay: '1s' },
    { x: '85%', y: '38%', color: '#10b981', label: 'Baner Stable', delay: '1.6s' },
  ];
  return (
    <>
      {nodes.map((n, i) => (
        <div key={i} style={{ position: 'absolute', left: n.x, top: n.y, transform: 'translate(-50%,-50%)' }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: n.color,
            boxShadow: `0 0 0 0 ${n.color}`,
            animation: `nodeP 2s ease-out infinite`,
            animationDelay: n.delay,
            position: 'relative', zIndex: 2,
          }} />
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 30, height: 30, borderRadius: '50%',
            border: `1px solid ${n.color}`,
            opacity: 0.3,
            animation: `ringE 2s ease-out infinite`,
            animationDelay: n.delay,
          }} />
        </div>
      ))}
    </>
  );
}

/* ─── Animated Counter ───────────────────────────────────────────────── */
function Counter({ end, suffix = '', prefix = '', duration = 2000 }) {
  const [current, setCurrent] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      obs.disconnect();
      const step = end / (duration / 16);
      let val = 0;
      const tick = () => {
        val = Math.min(val + step, end);
        setCurrent(Math.round(val));
        if (val < end) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end, duration]);
  return <span ref={ref}>{prefix}{current.toLocaleString()}{suffix}</span>;
}

/* ─── Login Modal ────────────────────────────────────────────────────── */
function LoginModal({ onLogin, onClose }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const ACCOUNTS = {
    'admin@urbancrisis.in': { pass: 'urban2026', role: 'ALL', name: 'Urban Crisis Admin', title: 'System Administrator' },
    'pmc@pune.gov.in':      { pass: 'admin123',  role: 'PMC',  name: 'Dr. Vikram Patil, IAS', title: 'Municipal Commissioner, PMC' },
    'pcmc@pune.gov.in':     { pass: 'admin123',  role: 'PCMC', name: 'Shri Anil Shinde, IAS', title: 'Commissioner, PCMC' },
  };

  const submit = async e => {
    e.preventDefault();
    setErr(''); setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    const acc = ACCOUNTS[email.trim().toLowerCase()];
    if (acc && acc.pass === pass) {
      onLogin({ email, ...acc });
    } else {
      setErr('Invalid credentials. Check your email and password.');
    }
    setLoading(false);
  };

  return (
    <div className="lp-modal-overlay" onClick={onClose}>
      <div className="lp-modal" onClick={e => e.stopPropagation()}>
        <div className="lp-modal-header">
          <div className="lp-modal-logo">
            <span>⚡</span>
          </div>
          <div>
            <div className="lp-modal-title">Secure Access</div>
            <div className="lp-modal-sub">Urban Crisis Digital Twin — Pune</div>
          </div>
          <button className="lp-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="lp-demo-creds">
          <div className="lp-demo-label">Quick Access</div>
          {[
            { e: 'admin@urbancrisis.in', p: 'urban2026', r: 'ADMIN' },
            { e: 'pmc@pune.gov.in',      p: 'admin123',  r: 'PMC' },
            { e: 'pcmc@pune.gov.in',     p: 'admin123',  r: 'PCMC' },
          ].map(({ e, p, r }) => (
            <div key={r} className="lp-demo-row" onClick={() => { setEmail(e); setPass(p); }}>
              <span>{e}</span>
              <span className="lp-demo-role">{r}</span>
            </div>
          ))}
        </div>

        <form onSubmit={submit}>
          <div className="lp-field">
            <label>Email</label>
            <input
              type="email" value={email} required autoFocus
              onChange={e => setEmail(e.target.value)}
              placeholder="officer@pune.gov.in"
            />
          </div>
          <div className="lp-field">
            <label>Password</label>
            <input
              type="password" value={pass} required
              onChange={e => setPass(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {err && <div className="lp-error">{err}</div>}
          <button type="submit" className="lp-submit" disabled={loading}>
            {loading ? <span className="spinner" /> : ''}
            {loading ? 'Authenticating…' : '→ Enter Command Center'}
          </button>
        </form>

        <div className="lp-modal-footer">
          🔒 AES-256 Encrypted · IT Act 2000 · © 2026 Smart City Mission
        </div>
      </div>
    </div>
  );
}

/* ─── Main Landing Page ──────────────────────────────────────────────── */
export default function LandingPage({ onLogin }) {
  const [showLogin, setShowLogin] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = e => setScrolled(e.target.scrollTop > 60);
    const el = document.getElementById('lp-scroll');
    if (el) el.addEventListener('scroll', handleScroll);
    return () => { if (el) el.removeEventListener('scroll', handleScroll); };
  }, []);

  // inject styles for this page only
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'lp-styles';
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap');
      
      .lp-root { background:#030712; color:#e2e8f0; font-family:'Inter',sans-serif; min-height:100vh; overflow-y:auto; overflow-x:hidden; }
      
      /* Navbar */
      .lp-nav { position:fixed; top:0; left:0; right:0; z-index:999; padding:0 40px; height:64px; display:flex; align-items:center; justify-content:space-between; transition:all 0.3s; }
      .lp-nav.scrolled { background:rgba(3,7,18,0.95); border-bottom:1px solid rgba(37,99,235,0.15); backdrop-filter:blur(20px); }
      .lp-nav-brand { display:flex; align-items:center; gap:12px; }
      .lp-nav-icon { width:34px; height:34px; background:linear-gradient(135deg,#2563eb,#06b6d4); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; }
      .lp-nav-name { font-size:15px; font-weight:800; letter-spacing:-0.02em; }
      .lp-nav-name span { color:#06b6d4; }
      .lp-nav-links { display:flex; align-items:center; gap:28px; }
      .lp-nav-link { font-size:13px; color:#64748b; text-decoration:none; transition:color 0.2s; font-weight:500; cursor:pointer; }
      .lp-nav-link:hover { color:#e2e8f0; }
      .lp-nav-btn { padding:8px 20px; border-radius:8px; background:linear-gradient(135deg,#2563eb,#1d4ed8); color:#fff; font-size:13px; font-weight:700; border:none; cursor:pointer; transition:all 0.2s; box-shadow:0 0 20px rgba(37,99,235,0.35); }
      .lp-nav-btn:hover { transform:translateY(-1px); box-shadow:0 0 32px rgba(37,99,235,0.5); }
      
      /* Hero */
      .lp-hero { min-height:100vh; position:relative; display:flex; align-items:center; justify-content:center; overflow:hidden; }
      .lp-hero-bg { position:absolute; inset:0; background:radial-gradient(ellipse 80% 60% at 50% 0%, rgba(37,99,235,0.12) 0%, transparent 70%); }
      .lp-hero-content { position:relative; z-index:10; text-align:center; padding:0 24px; max-width:900px; }
      .lp-hero-eyebrow { display:inline-flex; align-items:center; gap:8px; padding:6px 16px; border-radius:99px; border:1px solid rgba(37,99,235,0.3); background:rgba(37,99,235,0.08); font-size:11px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:#60a5fa; margin-bottom:28px; }
      .lp-hero-eyebrow::before { content:''; width:6px; height:6px; border-radius:50%; background:#60a5fa; animation:pulse-green 1.5s infinite; }
      .lp-hero-title { font-size:clamp(42px,7vw,80px); font-weight:900; letter-spacing:-0.04em; line-height:0.95; margin-bottom:24px; }
      .lp-hero-title .grad { background:linear-gradient(135deg,#60a5fa 0%,#06b6d4 40%,#818cf8 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
      .lp-hero-title .outline { -webkit-text-stroke:1px rgba(255,255,255,0.2); -webkit-text-fill-color:transparent; }
      .lp-hero-sub { font-size:clamp(15px,2vw,19px); color:#64748b; line-height:1.65; max-width:600px; margin:0 auto 40px; font-weight:400; }
      .lp-hero-sub strong { color:#94a3b8; font-weight:600; }
      .lp-hero-actions { display:flex; gap:14px; justify-content:center; flex-wrap:wrap; }
      .lp-btn-primary { padding:14px 32px; border-radius:10px; background:linear-gradient(135deg,#2563eb,#1d4ed8); color:#fff; font-size:14px; font-weight:700; border:none; cursor:pointer; transition:all 0.25s; box-shadow:0 4px 24px rgba(37,99,235,0.4); letter-spacing:0.01em; }
      .lp-btn-primary:hover { transform:translateY(-2px); box-shadow:0 8px 36px rgba(37,99,235,0.55); }
      .lp-btn-ghost { padding:14px 32px; border-radius:10px; background:transparent; color:#94a3b8; font-size:14px; font-weight:600; border:1px solid rgba(255,255,255,0.1); cursor:pointer; transition:all 0.25s; }
      .lp-btn-ghost:hover { border-color:rgba(255,255,255,0.25); color:#e2e8f0; }
      
      /* Stats bar */
      .lp-stats { display:flex; align-items:center; justify-content:center; gap:0; border-top:1px solid rgba(255,255,255,0.05); border-bottom:1px solid rgba(255,255,255,0.05); background:rgba(255,255,255,0.02); flex-wrap:wrap; }
      .lp-stat { padding:24px 40px; display:flex; flex-direction:column; align-items:center; border-right:1px solid rgba(255,255,255,0.05); flex:1; min-width:160px; }
      .lp-stat:last-child { border-right:none; }
      .lp-stat-val { font-size:32px; font-weight:900; letter-spacing:-0.04em; font-family:'JetBrains Mono',monospace; }
      .lp-stat-val.blue { background:linear-gradient(135deg,#2563eb,#06b6d4); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
      .lp-stat-val.orange { background:linear-gradient(135deg,#f59e0b,#ef4444); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
      .lp-stat-val.green { background:linear-gradient(135deg,#10b981,#06b6d4); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
      .lp-stat-val.purple { background:linear-gradient(135deg,#8b5cf6,#2563eb); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
      .lp-stat-label { font-size:11px; color:#475569; text-transform:uppercase; letter-spacing:0.1em; margin-top:4px; font-weight:600; }
      
      /* Sections */
      .lp-section { padding:100px 40px; max-width:1200px; margin:0 auto; }
      .lp-section-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.16em; color:#2563eb; margin-bottom:12px; }
      .lp-section-title { font-size:clamp(28px,4vw,44px); font-weight:800; letter-spacing:-0.03em; line-height:1.1; margin-bottom:16px; }
      .lp-section-sub { font-size:16px; color:#64748b; line-height:1.7; max-width:560px; }
      
      /* Motive Cards */
      .lp-motives { display:grid; grid-template-columns:repeat(auto-fit,minmax(340px,1fr)); gap:20px; margin-top:56px; }
      .lp-motive-card { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:16px; padding:28px; position:relative; overflow:hidden; transition:all 0.3s; cursor:default; }
      .lp-motive-card::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:var(--c); opacity:0.8; }
      .lp-motive-card:hover { background:rgba(255,255,255,0.04); border-color:rgba(255,255,255,0.12); transform:translateY(-4px); box-shadow:0 20px 60px rgba(0,0,0,0.4); }
      .lp-motive-num { font-size:11px; font-weight:800; letter-spacing:0.16em; color:var(--c); text-transform:uppercase; margin-bottom:12px; opacity:0.7; font-family:'JetBrains Mono',monospace; }
      .lp-motive-icon { font-size:36px; margin-bottom:16px; display:block; }
      .lp-motive-title { font-size:18px; font-weight:800; letter-spacing:-0.02em; margin-bottom:10px; }
      .lp-motive-body { font-size:13.5px; color:#64748b; line-height:1.7; }
      .lp-motive-body strong { color:#94a3b8; }
      .lp-motive-tag { margin-top:20px; display:inline-flex; align-items:center; gap:6px; font-size:10px; font-weight:700; color:var(--c); text-transform:uppercase; letter-spacing:0.1em; }
      
      /* Tech Stack Row */
      .lp-tech { display:flex; gap:12px; flex-wrap:wrap; margin-top:40px; }
      .lp-tech-chip { padding:8px 16px; border-radius:99px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03); font-size:12px; color:#64748b; font-weight:500; display:flex; align-items:center; gap:6px; transition:all 0.2s; }
      .lp-tech-chip:hover { border-color:rgba(37,99,235,0.4); color:#93c5fd; background:rgba(37,99,235,0.06); }
      
      /* Simulation preview pane */
      .lp-preview { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:20px; padding:32px; margin-top:56px; position:relative; overflow:hidden; }
      .lp-preview::before { content:''; position:absolute; inset:0; background:radial-gradient(ellipse 60% 50% at 50% 0%,rgba(37,99,235,0.06),transparent); }
      .lp-preview-header { display:flex; align-items:center; gap:8px; margin-bottom:24px; position:relative; }
      .lp-preview-dot { width:10px; height:10px; border-radius:50%; }
      .lp-preview-title { font-size:12px; color:#475569; font-family:'JetBrains Mono',monospace; margin-left:8px; }
      .lp-preview-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; position:relative; }
      .lp-preview-cell { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:16px; }
      .lp-preview-cell-label { font-size:9px; text-transform:uppercase; letter-spacing:0.12em; color:#475569; font-weight:700; margin-bottom:8px; }
      .lp-preview-cell-val { font-size:24px; font-weight:900; font-family:'JetBrains Mono',monospace; letter-spacing:-0.02em; }
      .lp-preview-cell-sub { font-size:10px; color:#475569; margin-top:4px; }
      .lp-preview-bar { height:3px; border-radius:99px; margin-top:12px; }
      
      /* CTA Section */
      .lp-cta { padding:100px 40px; text-align:center; position:relative; overflow:hidden; }
      .lp-cta::before { content:''; position:absolute; inset:0; background:radial-gradient(ellipse 70% 80% at 50% 50%,rgba(37,99,235,0.08),transparent); }
      .lp-cta-title { font-size:clamp(32px,5vw,52px); font-weight:900; letter-spacing:-0.04em; margin-bottom:16px; position:relative; }
      .lp-cta-sub { font-size:16px; color:#64748b; max-width:480px; margin:0 auto 40px; line-height:1.7; position:relative; }
      
      /* Footer */
      .lp-footer { border-top:1px solid rgba(255,255,255,0.05); padding:32px 40px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px; }
      .lp-footer-brand { font-size:13px; color:#334155; }
      .lp-footer-brand strong { color:#475569; }
      .lp-footer-links { display:flex; gap:24px; }
      .lp-footer-link { font-size:12px; color:#334155; text-decoration:none; }
      
      /* Login Modal */
      .lp-modal-overlay { position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,0.75); backdrop-filter:blur(12px); display:flex; align-items:center; justify-content:center; padding:20px; animation:fadeOverlay 0.2s ease; }
      @keyframes fadeOverlay { from { opacity:0; } to { opacity:1; } }
      .lp-modal { background:#0f172a; border:1px solid rgba(37,99,235,0.25); border-radius:20px; padding:0; width:100%; max-width:420px; overflow:hidden; animation:slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1); }
      @keyframes slideUp { from { transform:translateY(24px) scale(0.97); opacity:0; } to { transform:translateY(0) scale(1); opacity:1; } }
      .lp-modal-header { padding:24px 28px 20px; display:flex; align-items:center; gap:14px; border-bottom:1px solid rgba(255,255,255,0.05); }
      .lp-modal-logo { width:40px; height:40px; background:linear-gradient(135deg,#2563eb,#06b6d4); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; }
      .lp-modal-title { font-size:16px; font-weight:800; }
      .lp-modal-sub { font-size:11px; color:#475569; margin-top:2px; }
      .lp-modal-close { margin-left:auto; background:transparent; border:none; color:#475569; font-size:18px; cursor:pointer; padding:4px 8px; border-radius:6px; transition:all 0.2s; }
      .lp-modal-close:hover { color:#e2e8f0; background:rgba(255,255,255,0.05); }
      .lp-demo-creds { margin:16px 28px; background:rgba(37,99,235,0.06); border:1px solid rgba(37,99,235,0.15); border-radius:10px; overflow:hidden; }
      .lp-demo-label { font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:0.14em; color:#475569; padding:10px 14px 6px; }
      .lp-demo-row { display:flex; justify-content:space-between; padding:8px 14px; cursor:pointer; transition:background 0.15s; font-size:11px; color:#64748b; border-top:1px solid rgba(255,255,255,0.04); }
      .lp-demo-row:hover { background:rgba(37,99,235,0.1); color:#93c5fd; }
      .lp-demo-role { font-size:9px; font-weight:800; color:#2563eb; background:rgba(37,99,235,0.15); padding:2px 8px; border-radius:99px; }
      .lp-field { padding:0 28px 16px; }
      .lp-field:first-of-type { padding-top:20px; }
      .lp-field label { display:block; font-size:11px; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:7px; }
      .lp-field input { width:100%; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:9px; padding:11px 14px; color:#e2e8f0; font-size:13px; transition:all 0.2s; outline:none; }
      .lp-field input:focus { border-color:rgba(37,99,235,0.5); background:rgba(37,99,235,0.05); box-shadow:0 0 0 3px rgba(37,99,235,0.12); }
      .lp-error { margin:0 28px 16px; padding:10px 14px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.25); border-radius:8px; font-size:12px; color:#f87171; }
      .lp-submit { width:calc(100% - 56px); margin:0 28px 20px; padding:13px; background:linear-gradient(135deg,#2563eb,#1d4ed8); color:#fff; font-size:13.5px; font-weight:700; border:none; border-radius:10px; cursor:pointer; transition:all 0.25s; box-shadow:0 4px 24px rgba(37,99,235,0.4); display:flex; align-items:center; justify-content:center; gap:8px; }
      .lp-submit:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 8px 32px rgba(37,99,235,0.55); }
      .lp-submit:disabled { opacity:0.6; cursor:wait; }
      .lp-modal-footer { padding:14px 28px; background:rgba(0,0,0,0.2); font-size:10px; color:#334155; text-align:center; }
      
      /* Keyframes */
      @keyframes nodeP { 0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,0.4);} 50%{box-shadow:0 0 0 8px rgba(255,255,255,0);} }  
      @keyframes ringE { 0%{transform:translate(-50%,-50%) scale(0.5);opacity:0.5;} 100%{transform:translate(-50%,-50%) scale(3);opacity:0;} }
      @keyframes fadeIn { from{opacity:0;transform:translateY(16px);} to{opacity:1;transform:translateY(0);} }
      @keyframes pulse-green { 0%,100%{opacity:1;} 50%{opacity:0.5;} }
      .lp-hero-content > * { animation:fadeIn 0.7s ease both; }
      .lp-hero-content > :nth-child(1){animation-delay:0.1s}
      .lp-hero-content > :nth-child(2){animation-delay:0.22s}
      .lp-hero-content > :nth-child(3){animation-delay:0.34s}
      .lp-hero-content > :nth-child(4){animation-delay:0.46s}
    `;
    document.head.appendChild(style);
    return () => { const s = document.getElementById('lp-styles'); if (s) s.remove(); };
  }, []);

  return (
    <div className="lp-root" id="lp-scroll">
      {/* Navbar */}
      <nav className={`lp-nav${scrolled ? ' scrolled' : ''}`}>
        <div className="lp-nav-brand">
          <div className="lp-nav-icon">⚡</div>
          <div className="lp-nav-name">Urban<span>Crisis</span></div>
        </div>
        <div className="lp-nav-links">
          {['Features', 'Architecture', 'How It Works'].map(l => (
            <span key={l} className="lp-nav-link">{l}</span>
          ))}
          <button className="lp-nav-btn" onClick={() => setShowLogin(true)}>Command Center →</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-hero-bg" />
        <GridCanvas />
        <RainCanvas />
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          <PulseNodes />
          {/* Connecting lines between nodes (decorative SVG) */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.12 }}>
            <line x1="22%" y1="35%" x2="65%" y2="28%" stroke="#2563eb" strokeWidth="1" strokeDasharray="4 6" />
            <line x1="65%" y1="28%" x2="78%" y2="55%" stroke="#2563eb" strokeWidth="1" strokeDasharray="4 6" />
            <line x1="22%" y1="35%" x2="38%" y2="58%" stroke="#ef4444" strokeWidth="1" strokeDasharray="4 6" />
            <line x1="38%" y1="58%" x2="55%" y2="70%" stroke="#ef4444" strokeWidth="1" strokeDasharray="4 6" />
            <line x1="15%" y1="62%" x2="38%" y2="58%" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 6" />
          </svg>
        </div>

        <div className="lp-hero-content">
          <div className="lp-hero-eyebrow">
            Live · Pune Metropolitan Region · 2026
          </div>
          <h1 className="lp-hero-title">
            Urban Crisis<br />
            <span className="grad">Digital Twin</span>
          </h1>
          <p className="lp-hero-sub">
            An exact digital replica of Pune and PCMC that lets the city make its
            mistakes <strong>on a screen</strong> — before they happen on real streets.
            Real-time flood modelling, street-level rerouting, AI-driven deployment.
          </p>
          <div className="lp-hero-actions">
            <button className="lp-btn-primary" onClick={() => setShowLogin(true)}>
              → Enter Command Center
            </button>
            <button className="lp-btn-ghost" onClick={() => {
              document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
            }}>
              See how it works ↓
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="lp-stats">
        {[
          { val: 3340000, suffix: '', prefix: '', label: 'Population Covered', color: 'blue', fmt: v => (v / 1e6).toFixed(2) + 'M' },
          { val: 22, suffix: '', prefix: '', label: 'PMC + PCMC Wards', color: 'purple', fmt: v => v },
          { val: 399, suffix: 'Cr', prefix: '₹', label: 'Flood Damage (6yr)', color: 'orange', fmt: v => v },
          { val: 18, suffix: '', prefix: '', label: 'OSMnx Street Routes', color: 'green', fmt: v => v },
        ].map(({ val, suffix, prefix, label, color, fmt }) => (
          <div key={label} className="lp-stat">
            <div className={`lp-stat-val ${color}`}>
              {prefix}<Counter end={val} />{suffix}
            </div>
            <div className="lp-stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Motives Section */}
      <section className="lp-section" id="features">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center', marginBottom: 60 }}>
          <div>
            <div className="lp-section-label">Core Architecture</div>
            <h2 className="lp-section-title">Five Motives.<br />One Platform.</h2>
            <p className="lp-section-sub">
              Built for PMC and PCMC command officers — not data scientists. Every feature addresses a specific gap in how Pune currently responds to urban crises.
            </p>
          </div>
          <div className="lp-tech">
            {['OSMnx', 'OpenStreetMap', 'Open-Meteo WMO', 'Manning-Rational', 'IRC SP-50', 'NetworkX Dijkstra', 'FastAPI', 'WebSocket', 'Groq LLaMA-3'].map(t => (
              <div key={t} className="lp-tech-chip">⬡ {t}</div>
            ))}
          </div>
        </div>

        <div className="lp-motives">
          {[
            {
              num: '01', icon: '🔮', title: 'Proactive Crystal Ball',
              color: '#f59e0b',
              body: `City currently <strong>waits for disaster</strong>. Rain falls, Wakad floods, then they send a pump. Our system connects Open-Meteo forecasts + Manning hydrological formula to predict: <strong>"Heavy rain in 3hr → Wakad will flood. Deploy NOW."</strong>`,
              tag: 'Motive → Stop problems before they happen',
            },
            {
              num: '02', icon: '🎮', title: 'Ctrl+Z Sandbox for Planners',
              color: '#2563eb',
              body: `Before placing Metro barricades at University Circle in real life, planners <strong>click the virtual road closed</strong>. Instantly see exact traffic impact across 22 corridors. Fix the commute disaster before it's a disaster.`,
              tag: 'Motive → Safe simulation before real action',
            },
            {
              num: '03', icon: '⚔️', title: 'Smart Resource Commander',
              color: '#06b6d4',
              body: `PMC has limited water pumps, police units, and NDRF teams. The system <strong>mathematically calculates</strong> — from live flood risk + forecast data — exactly how many units to send to which junction. No guesswork.`,
              tag: 'Motive → Use limited resources optimally',
            },
            {
              num: '04', icon: '📊', title: 'Visual Budget Proof',
              color: '#10b981',
              body: `Engineer needs ₹50L to widen a drainage pipe. Government asks for proof. Pull up our digital twin: <strong>"Simulation shows 2km of road drowns without this pipe. With it — zero flooding."</strong> Guesswork → Mathematical fact.`,
              tag: 'Motive → Justify every rupee of investment',
            },
            {
              num: '05', icon: '🛣️', title: 'Real Street Routing Engine',
              color: '#8b5cf6',
              body: `18 real Pune routes powered by <strong>OSMnx + NetworkX Dijkstra</strong> on actual OpenStreetMap data. When flood zones activate, the algorithm dynamically reroutes around blocked roads — not straight lines. Real navigation.`,
              tag: 'Motive → Hackathon WOW + real engineering',
            },
          ].map(m => (
            <div key={m.num} className="lp-motive-card" style={{ '--c': m.color }}>
              <div className="lp-motive-num">{m.num}</div>
              <span className="lp-motive-icon">{m.icon}</span>
              <div className="lp-motive-title">{m.title}</div>
              <div className="lp-motive-body" dangerouslySetInnerHTML={{ __html: m.body }} />
              <div className="lp-motive-tag">↳ {m.tag}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Live Preview Pane */}
      <section style={{ padding: '0 40px 80px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <div className="lp-preview">
          <div className="lp-preview-header">
            <div className="lp-preview-dot" style={{ background: '#ef4444' }} />
            <div className="lp-preview-dot" style={{ background: '#f59e0b', marginLeft: 6 }} />
            <div className="lp-preview-dot" style={{ background: '#10b981', marginLeft: 6 }} />
            <div className="lp-preview-title">LIVE — PUNE URBAN SHIELD · SIMULATION STATUS</div>
            <div style={{ marginLeft: 'auto', fontSize: 10, color: '#10b981', fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>● OPERATIONAL</div>
          </div>
          <div className="lp-preview-grid">
            {[
              { label: 'Weather Feed', val: '0 mm/hr', sub: 'Open-Meteo · Clear Sky', color: '#10b981', bar: '5%', bg: '#10b981' },
              { label: 'Flood Risk Zones', val: '3 Active', sub: 'HIGH · MEDIUM · LOW', color: '#f59e0b', bar: '35%', bg: '#f59e0b' },
              { label: 'Traffic Corridors', val: '22 Live', sub: 'IRC SP-50 LOS analysis', color: '#2563eb', bar: '60%', bg: '#2563eb' },
              { label: 'OSMnx Routing', val: '18 Routes', sub: 'Dijkstra · Real streets', color: '#06b6d4', bar: '100%', bg: '#06b6d4' },
              { label: 'Population At Risk', val: '~41,000', sub: 'Based on live flood model', color: '#8b5cf6', bar: '12%', bg: '#8b5cf6' },
              { label: 'AI Reports', val: 'Ready', sub: 'Groq · LLaMA 3.3-70B', color: '#10b981', bar: '100%', bg: '#10b981' },
            ].map(c => (
              <div key={c.label} className="lp-preview-cell">
                <div className="lp-preview-cell-label">{c.label}</div>
                <div className="lp-preview-cell-val" style={{ color: c.color }}>{c.val}</div>
                <div className="lp-preview-cell-sub">{c.sub}</div>
                <div className="lp-preview-bar" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div style={{ height: '100%', width: c.bar, background: c.bg, borderRadius: 99, opacity: 0.7, transition: 'width 1s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="lp-cta">
        <h2 className="lp-cta-title">
          Ready to see Pune's<br />
          <span style={{ background: 'linear-gradient(135deg,#2563eb,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            digital twin in action?
          </span>
        </h2>
        <p className="lp-cta-sub">
          Access the live command center. Run flood and traffic simulations. Generate AI situation reports.
        </p>
        <button className="lp-btn-primary" onClick={() => setShowLogin(true)} style={{ fontSize: 15, padding: '16px 40px' }}>
          → Enter Command Center
        </button>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-footer-brand">
          <strong>Urban Crisis Digital Twin</strong> · Pune Metropolitan Region<br />
          © 2026 PMC · PCMC · Smart City Mission, Government of India
        </div>
        <div className="lp-footer-links" style={{ fontSize: 11, color: '#1e293b' }}>
          Powered by OSMnx · Open-Meteo · OpenStreetMap · FastAPI · Groq
        </div>
      </footer>

      {showLogin && <LoginModal onLogin={onLogin} onClose={() => setShowLogin(false)} />}
    </div>
  );
}
