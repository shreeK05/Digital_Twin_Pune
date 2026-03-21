import React, { useEffect, useState, useCallback } from 'react';

const CATEGORY_ICONS = {
  'Flood Risk':       '🌊',
  'Road Damage':      '🛣️',
  'Drainage Issue':   '🚧',
  'Garbage Dumping':  '🗑️',
  'Waterlogging':     '💧',
  'Power Outage':     '⚡',
  'Tree Fall':        '🌳',
  'Other':            '📋',
};

const STATUS_COLORS = {
  RECEIVED:     { color: '#4a8cff', bg: 'rgba(26,107,255,0.1)',   label: '📥 Received'     },
  IN_PROGRESS:  { color: '#f5c518', bg: 'rgba(245,197,24,0.1)',   label: '🔧 In Progress'  },
  RESOLVED:     { color: '#00e676', bg: 'rgba(0,230,118,0.1)',    label: '✅ Resolved'     },
  REJECTED:     { color: '#ff2d55', bg: 'rgba(255,45,85,0.1)',    label: '❌ Rejected'     },
};

export default function CitizenReports() {
  const [reports, setReports]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('ALL');
  const [selected, setSelected]   = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [dbStatus, setDbStatus]   = useState(null);

  const fetchReports = useCallback(async () => {
    try {
      const res  = await fetch('https://pune-urban-shield-backend.onrender.com/api/reports/all?limit=100');
      const json = await res.json();
      setReports(json.reports || []);
      setLastRefresh(new Date());
    } catch (_) {}
    setLoading(false);
  }, []);

  const fetchDbStatus = useCallback(async () => {
    try {
      const res  = await fetch('https://pune-urban-shield-backend.onrender.com/api/db/status');
      const json = await res.json();
      setDbStatus(json);
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchReports();
    fetchDbStatus();
    const t = setInterval(fetchReports, 15000);
    return () => clearInterval(t);
  }, [fetchReports, fetchDbStatus]);

  const filtered = filter === 'ALL'
    ? reports
    : reports.filter(r => r.category === filter || r.status === filter || r.authority === filter);

  // Stats
  const totalCount    = reports.length;
  const photoCount    = reports.filter(r => r.photo_url).length;
  const gpsCount      = reports.filter(r => r.latitude && r.longitude).length;
  const receivedCount = reports.filter(r => r.status === 'RECEIVED').length;

  // Category breakdown
  const categories = [...new Set(reports.map(r => r.category || 'Other'))];

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        padding: '20px 24px 16px', borderBottom: '1px solid var(--border-0)',
        flexShrink: 0,
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.025em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>📋</span> Citizen Reports Panel
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-1)', lineHeight: 1.5 }}>
            All citizen-submitted urban issues — stored in MongoDB Atlas · {totalCount} reports total
          </p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center', flexShrink: 0 }}>
          {lastRefresh && (
            <span style={{ fontSize:10, color:'var(--text-2)' }}>
              Updated {lastRefresh.toLocaleTimeString('en-IN', { hour12:false })}
            </span>
          )}
          <button className="btn btn-outline" onClick={fetchReports} style={{ fontSize:11 }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* DB Status Banner */}
      {dbStatus && (
        <div style={{
          margin:'0 24px 12px',
          padding:'8px 14px',
          borderRadius:10,
          background: dbStatus.mongodb?.connected ? 'rgba(0,230,118,0.06)' : 'rgba(255,45,85,0.06)',
          border:`1px solid ${dbStatus.mongodb?.connected ? 'rgba(0,230,118,0.2)' : 'rgba(255,45,85,0.2)'}`,
          display:'flex', gap:10, alignItems:'center', flexWrap:'wrap',
        }}>
          <span style={{ fontSize:14 }}>{dbStatus.mongodb?.connected ? '🟢' : '🔴'}</span>
          <span style={{ fontSize:11, fontWeight:700, color: dbStatus.mongodb?.connected ? '#00e676' : '#ff2d55' }}>
            MongoDB Atlas: {dbStatus.mongodb?.status}
          </span>
          <span style={{ fontSize:11, color:'var(--text-muted)' }}>
            {dbStatus.mongodb?.connected
              ? 'All reports persisted to cloud — survive server restarts'
              : 'Using in-memory storage — reports will be lost on restart'}
          </span>
          <span style={{ marginLeft:'auto', fontSize:10, color:'#4a6088' }}>
            Cloudinary: {dbStatus.cloudinary?.status}
          </span>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, padding:'16px 24px', flexShrink: 0 }}>
        {[
          { label:'Total Reports',    value: totalCount,    icon:'📋', color:'var(--brand-blue-light)' },
          { label:'Pending Review',   value: receivedCount, icon:'📥', color:'#f5c518'                 },
          { label:'With GPS',         value: gpsCount,      icon:'📍', color:'#00d4ff'                 },
          { label:'With Photo',       value: photoCount,    icon:'📷', color:'#a855f7'                 },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="card" style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ fontSize:24 }}>{icon}</div>
            <div>
              <div style={{ fontSize:24, fontWeight:900, color }}>{loading ? '—' : value}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ padding:'0 24px 12px', display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        <span style={{ fontSize:11, color:'var(--text-muted)', marginRight:4 }}>Filter:</span>
        {['ALL', 'RECEIVED', 'PMC', 'PCMC', ...categories].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              fontSize:10, fontWeight:700, padding:'5px 12px',
              borderRadius:99, cursor:'pointer',
              background: filter === f ? 'var(--brand-blue)' : 'var(--bg-card)',
              color:      filter === f ? '#fff' : 'var(--text-secondary)',
              border:`1px solid ${filter === f ? 'var(--brand-blue)' : 'var(--border-primary)'}`,
            }}
          >
            {CATEGORY_ICONS[f] || ''} {f}
          </button>
        ))}
        <span style={{ marginLeft:'auto', fontSize:10, color:'var(--text-muted)' }}>
          {filtered.length} shown
        </span>
      </div>

      {/* Reports List */}
      <div style={{ flex:1, overflowY:'auto', padding:'0 24px 24px' }}>
        {loading ? (
          <div style={{ textAlign:'center', marginTop:80 }}>
            <div className="spinner" style={{ width:32, height:32, margin:'0 auto 12px' }} />
            <div style={{ color:'var(--text-muted)', fontSize:13 }}>Loading reports from MongoDB Atlas...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign:'center', marginTop:80,
            padding:40, background:'var(--bg-card)', borderRadius:16,
            border:'1px solid var(--border-primary)',
          }}>
            <div style={{ fontSize:48, marginBottom:16 }}>📭</div>
            <div style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', marginBottom:8 }}>
              No citizen reports yet
            </div>
            <div style={{ fontSize:13, color:'var(--text-muted)', maxWidth:400, margin:'0 auto' }}>
              Reports submitted via the Flutter citizen app will appear here in real-time.
              They're stored permanently in MongoDB Atlas.
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {filtered.map(report => {
              const statusStyle = STATUS_COLORS[report.status] || STATUS_COLORS.RECEIVED;
              const categoryIcon = CATEGORY_ICONS[report.category] || '📋';
              const ts = report.timestamp ? new Date(report.timestamp) : null;
              const isSelected = selected === report.report_id;

              return (
                <div
                  key={report.report_id}
                  className="card"
                  style={{
                    padding:16,
                    cursor:'pointer',
                    border:`1px solid ${isSelected ? 'var(--brand-blue)' : 'var(--border-primary)'}`,
                    background: isSelected ? 'rgba(26,107,255,0.04)' : 'var(--bg-card)',
                    transition:'all 0.2s',
                  }}
                  onClick={() => setSelected(isSelected ? null : report.report_id)}
                >
                  {/* Top row */}
                  <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                    <div style={{ fontSize:28, flexShrink:0 }}>{categoryIcon}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4, flexWrap:'wrap' }}>
                        <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>
                          {report.category || 'Urban Issue'}
                        </span>
                        <span style={{
                          fontSize:9, fontWeight:800, padding:'2px 8px', borderRadius:99,
                          background: statusStyle.bg, color: statusStyle.color,
                          border:`1px solid ${statusStyle.color}40`,
                        }}>
                          {statusStyle.label}
                        </span>
                        {report.authority && (
                          <span style={{ fontSize:9, fontWeight:800, padding:'2px 8px', borderRadius:99, background:'rgba(26,107,255,0.12)', color:'#4a8cff' }}>
                            {report.authority}
                          </span>
                        )}
                        {report.photo_url && (
                          <span style={{ fontSize:9, padding:'2px 8px', borderRadius:99, background:'rgba(168,85,247,0.12)', color:'#a855f7' }}>
                            📷 Photo
                          </span>
                        )}
                        {report.latitude && (
                          <span style={{ fontSize:9, padding:'2px 8px', borderRadius:99, background:'rgba(0,212,255,0.12)', color:'#00d4ff' }}>
                            📍 GPS
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:4, lineHeight:1.5 }}>
                        {report.description}
                      </div>
                      <div style={{ display:'flex', gap:12, fontSize:10, color:'var(--text-muted)', flexWrap:'wrap' }}>
                        {report.location && <span>📌 {report.location}</span>}
                        {ts && <span>🕐 {ts.toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</span>}
                        <span style={{ color:'#4a6088' }}>ID: {report.report_id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isSelected && (
                    <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid var(--border-secondary)' }}>
                      <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                        {/* GPS */}
                        {report.latitude && report.longitude && (
                          <div style={{ flex:1, minWidth:200 }}>
                            <div style={{ fontSize:10, fontWeight:700, color:'#00d4ff', marginBottom:6 }}>📍 GPS LOCATION</div>
                            <div style={{ fontSize:11, color:'var(--text-secondary)' }}>
                              {report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}
                            </div>
                            <a
                              href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize:10, color:'#4a8cff', textDecoration:'none', marginTop:4, display:'inline-block' }}
                            >
                              🗺️ Open in Google Maps →
                            </a>
                          </div>
                        )}
                        {/* Photo */}
                        {report.photo_url && (
                          <div style={{ flex:1, minWidth:200 }}>
                            <div style={{ fontSize:10, fontWeight:700, color:'#a855f7', marginBottom:6 }}>📷 ATTACHED PHOTO</div>
                            <img
                              src={report.photo_url}
                              alt="Report"
                              style={{ width:'100%', maxWidth:280, height:140, objectFit:'cover', borderRadius:8, border:'1px solid var(--border-primary)' }}
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          </div>
                        )}
                        {/* Full details */}
                        <div style={{ flex:1, minWidth:200 }}>
                          <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', marginBottom:6 }}>REPORT DETAILS</div>
                          {[
                            ['Report ID', report.report_id],
                            ['Category', report.category],
                            ['Authority', report.authority || '—'],
                            ['Status', report.status],
                            ['Submitted', ts?.toLocaleString('en-IN') || '—'],
                            ['Source', report.source || 'MANUAL'],
                          ].map(([k, v]) => (
                            <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:10, marginBottom:3, gap:8 }}>
                              <span style={{ color:'var(--text-muted)', flexShrink:0 }}>{k}</span>
                              <strong style={{ color:'var(--text-secondary)', textAlign:'right', wordBreak:'break-all' }}>{v}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
