import { useState, useEffect, useRef } from 'react'

const S = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
.sup-root{font-family:'DM Serif Display',serif;min-height:100vh;background:#f0f2f0;display:flex;}

/* Sidebar */
.sup-sidebar{width:210px;background:#fff;border-right:1px solid #e8ebe8;display:flex;flex-direction:column;min-height:100vh;position:sticky;top:0;flex-shrink:0;}
.sup-sb-logo{padding:18px 20px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #e8ebe8;}
.sup-sb-icon{width:28px;height:28px;background:#1a6b3c;border-radius:6px;display:flex;align-items:center;justify-content:center;}
.sup-sb-icon svg{width:15px;height:15px;fill:white;}
.sup-sb-brand{font-size:16px;color:#1a2e1a;}
.sup-sb-nav{padding:14px 12px;flex:1;}
.sup-sb-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;cursor:pointer;margin-bottom:2px;color:#5a6e5a;font-size:13.5px;transition:background .15s;}
.sup-sb-item:hover{background:#f0f2f0;}
.sup-sb-item.active{background:#edf6f1;color:#1a6b3c;}
.sup-sb-item svg{width:16px;height:16px;flex-shrink:0;}
.sup-sb-user{padding:16px;border-top:1px solid #e8ebe8;display:flex;align-items:center;gap:10px;}
.sup-sb-avatar{width:34px;height:34px;background:#1a4e8c;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;flex-shrink:0;}
.sup-sb-uname{font-size:13px;color:#1a2e1a;}
.sup-sb-urole{font-size:11px;color:#a0b0a0;}

/* Main */
.sup-main{flex:1;display:flex;flex-direction:column;overflow:auto;}
.sup-topbar{background:#fff;border-bottom:1px solid #e8ebe8;padding:0 28px;height:52px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
.sup-topbar-title{font-size:15px;color:#1a2e1a;}
.sup-topbar-btn{background:#1a4e8c;color:#fff;border:none;border-radius:9px;padding:8px 18px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;transition:background .15s;}
.sup-topbar-btn:hover{background:#153d72;}
.sup-topbar-btn svg{width:14px;height:14px;fill:white;}

.sup-content{padding:22px 28px;flex:1;}
.sup-page-title{font-size:22px;color:#1a2e1a;margin-bottom:2px;}
.sup-page-sub{font-size:13px;color:#a0b0a0;margin-bottom:18px;}

/* Metrics */
.sup-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px;}
.sup-metric{background:#fff;border-radius:14px;padding:14px 16px;box-shadow:0 2px 12px rgba(0,0,0,0.05);}
.sup-metric-lbl{font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:#a0b0a0;margin-bottom:6px;}
.sup-metric-val{font-size:22px;color:#1a2e1a;}
.sup-metric-sub{font-size:11px;color:#a0b0a0;margin-top:3px;}
.sup-metric.green .sup-metric-val{color:#1a6b3c;}
.sup-metric.amber .sup-metric-val{color:#e6a817;}
.sup-metric.red .sup-metric-val{color:#e74c3c;}

/* Two-col layout */
.sup-two-col{display:grid;grid-template-columns:1fr 300px;gap:16px;margin-bottom:18px;}

/* Cards */
.sup-card{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.05);}
.sup-card-inner{padding:16px 18px;}
.sup-card-title{font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:#a0b0a0;margin-bottom:12px;}

/* Map */
.sup-map-wrap{position:relative;}
#sup-live-map{width:100%;height:280px;display:block;}
.sup-map-pill{position:absolute;top:10px;left:10px;z-index:999;background:#fff;border-radius:20px;padding:5px 12px;font-size:12px;display:flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(0,0,0,.15);font-family:'DM Serif Display',serif;}
.sup-map-pill.live{color:#1a6b3c;}
.sup-map-pill.acquiring{color:#e6a817;}
.sup-map-pill.error{color:#e74c3c;}
.sup-pulse-dot{width:8px;height:8px;border-radius:50%;background:currentColor;animation:supPulse 1.8s infinite;}
@keyframes supPulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.4;transform:scale(1.4);}}
.sup-loc-bar{display:flex;gap:0;border-top:1px solid #edf1ed;}
.sup-loc-cell{flex:1;padding:10px 14px;border-right:1px solid #edf1ed;}
.sup-loc-cell:last-child{border-right:none;}
.sup-loc-label{font-size:10px;color:#a0b0a0;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;}
.sup-loc-val{font-size:13px;color:#1a2e1a;}

/* Technician list */
.sup-tech-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f0f2f0;}
.sup-tech-row:last-child{border-bottom:none;}
.sup-tech-avatar{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff;flex-shrink:0;}
.sup-tech-info{flex:1;}
.sup-tech-name{font-size:13px;color:#1a2e1a;}
.sup-tech-job{font-size:11px;color:#7a8c7a;}
.sup-status-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.sup-status-dot.active{background:#1a6b3c;}
.sup-status-dot.idle{background:#e6a817;}
.sup-status-dot.offline{background:#ccc;}

/* Alerts */
.sup-section-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
.sup-alert-card{background:#fff;border-radius:14px;padding:14px 16px;margin-bottom:10px;display:flex;align-items:center;gap:12px;box-shadow:0 1px 6px rgba(0,0,0,0.05);}
.sup-alert-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.sup-alert-icon.warn{background:#fff8ec;}
.sup-alert-icon.err{background:#fef0f0;}
.sup-alert-icon.info{background:#edf6f1;}
.sup-alert-icon svg{width:14px;height:14px;}
.sup-alert-info{flex:1;}
.sup-alert-lbl{font-size:11px;color:#a0b0a0;text-transform:uppercase;letter-spacing:.6px;}
.sup-alert-msg{font-size:13.5px;color:#1a2e1a;margin:2px 0;}
.sup-badge{font-size:11.5px;padding:3px 10px;border-radius:6px;flex-shrink:0;}
.sup-badge.warn{background:#fff8ec;color:#e6a817;}
.sup-badge.err{background:#fef0f0;color:#e74c3c;}
.sup-badge.ok{background:#edf6f1;color:#1a6b3c;}
.sup-btn{border:none;border-radius:8px;padding:7px 14px;font-family:'DM Serif Display',serif;font-size:12.5px;cursor:pointer;flex-shrink:0;transition:background .15s;}
.sup-btn.primary{background:#1a4e8c;color:#fff;}
.sup-btn.primary:hover{background:#153d72;}
.sup-btn.secondary{background:#f0f2f0;color:#3d4f3d;}
.sup-btn.secondary:hover{background:#e2e8e2;}
`

const navItems = [
  { id: 'overview',  label: 'Overview',      d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'team',      label: 'Team Activity', d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'jobs',      label: 'All Jobs',      d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'reports',   label: 'Reports',       d: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'alerts',    label: 'Alerts',        d: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { id: 'settings',  label: 'Settings',      d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
]

const techs = [
  { initials: 'MJ', color: '#1a6b3c', name: 'Marcus Johnson',  job: 'Pest Control – Sycamore Park',  status: 'active'  },
  { initials: 'AL', color: '#1a4e8c', name: 'Amy Lee',         job: 'Termite Inspection – Clayfield', status: 'active'  },
  { initials: 'RK', color: '#7b3fa0', name: 'Raj Kumar',       job: 'Rodent Proofing – Eastview',     status: 'active'  },
  { initials: 'TD', color: '#e6a817', name: 'Tom Davies',      job: 'En route – Northfields',         status: 'idle'    },
  { initials: 'NP', color: '#5a6e5a', name: 'Nina Patel',      job: 'Break – Westside',               status: 'offline' },
]

const alerts = [
  {
    type: 'warn',
    label: 'Low Supply · 12 min ago',
    msg: 'Marcus Johnson – Fuel reserve critical at 22%',
    badge: 'Warning', badgeCls: 'warn',
    btn: 'View', btnCls: 'secondary',
    iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    iconColor: '#e6a817',
  },
  {
    type: 'err',
    label: 'Missed Check-in · 34 min ago',
    msg: 'Tom Davies has not checked in for 45 minutes',
    badge: 'Urgent', badgeCls: 'err',
    btn: 'Contact', btnCls: 'primary',
    iconPath: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    iconColor: '#e74c3c',
  },
  {
    type: 'info',
    label: 'Job Complete · 1 hr ago',
    msg: 'Amy Lee completed Termite Inspection at Clayfield',
    badge: 'Info', badgeCls: 'ok',
    btn: 'Review', btnCls: 'secondary',
    iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    iconColor: '#1a6b3c',
  },
]

const metrics = [
  { label: 'Active Techs',   val: '42',  sub: 'On route now',     cls: 'green' },
  { label: 'Pending Alerts', val: '3',   sub: 'Require action',   cls: 'amber' },
  { label: 'Open Jobs',      val: '12',  sub: 'Across all teams', cls: ''      },
  { label: 'Avg Response',   val: '18m', sub: "Today's average",  cls: ''      },
]

// Offsets for simulated tech markers (lat, lng deltas from supervisor position)
const TECH_OFFSETS = [
  [0.002,  0.003],
  [-0.003, 0.002],
  [0.004, -0.002],
  [-0.001,-0.004],
  [0.003,  0.001],
]

export default function SupervisorDashboard() {
  const [active, setActive] = useState('team')
  const [geoStatus, setGeoStatus] = useState('acquiring')
  const [coords, setCoords]       = useState(null)
  const [accuracy, setAccuracy]   = useState(null)

  const mapRef    = useRef(null)
  const markerRef = useRef(null)
  const circleRef = useRef(null)
  const watchRef  = useRef(null)

  // ── Bootstrap Leaflet from CDN ──
  useEffect(() => {
    if (!document.getElementById('lf-css')) {
      const l = document.createElement('link')
      l.id = 'lf-css'; l.rel = 'stylesheet'
      l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(l)
    }

    const boot = () => {
      if (document.getElementById('sup-live-map') && !mapRef.current) initMap()
      else setTimeout(boot, 80)
    }

    const loadScript = () => {
      if (window.L) { boot(); return }
      const s = document.createElement('script')
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      s.onload = boot
      document.head.appendChild(s)
    }
    loadScript()

    return () => {
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current)
      if (mapRef.current)   { mapRef.current.remove(); mapRef.current = null }
    }
  }, [])

  const initMap = () => {
    const L = window.L
    const fallback = [23.0225, 72.5714] // Ahmedabad

    delete L.Icon.Default.prototype._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })

    const map = L.map('sup-live-map').setView(fallback, 13)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)
    mapRef.current = map

    // Supervisor – blue pulsing dot
    const supIcon = () => L.divIcon({
      className: '',
      html: `
        <div style="position:relative;width:22px;height:22px;">
          <div style="position:absolute;inset:0;border-radius:50%;background:rgba(26,78,140,.2);animation:ripSup 2s infinite;"></div>
          <div style="position:absolute;inset:4px;border-radius:50%;background:#1a4e8c;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);"></div>
        </div>
        <style>@keyframes ripSup{0%{transform:scale(1);opacity:.6;}100%{transform:scale(2.5);opacity:0;}}</style>
      `,
      iconSize: [22, 22], iconAnchor: [11, 11],
    })

    markerRef.current = L.marker(fallback, { icon: supIcon() })
      .addTo(map)
      .bindPopup('<b style="font-family:serif">📍 You are here (Supervisor)</b>')

    circleRef.current = L.circle(fallback, {
      radius: 80, color: '#1a4e8c',
      fillColor: '#1a4e8c', fillOpacity: 0.08, weight: 1,
    }).addTo(map)

    // Simulated technician markers
    techs.forEach((t, i) => {
      const [dlat, dlng] = TECH_OFFSETS[i]
      const ll = [fallback[0] + dlat, fallback[1] + dlng]
      const icon = L.divIcon({
        className: '',
        html: `
          <div style="width:26px;height:26px;border-radius:50%;background:${t.color};
            border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);
            display:flex;align-items:center;justify-content:center;
            font-size:9px;color:#fff;font-family:serif;">
            ${t.initials}
          </div>`,
        iconSize: [26, 26], iconAnchor: [13, 13],
      })
      L.marker(ll, { icon }).addTo(map)
        .bindPopup(`<b style="font-family:serif">${t.name}</b><br><span style="font-size:11px">${t.job}</span>`)
    })

    if (!navigator.geolocation) { setGeoStatus('error'); return }

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy: acc } = pos.coords
        const ll = [lat, lng]
        setCoords({ lat: lat.toFixed(6), lng: lng.toFixed(6) })
        setAccuracy(Math.round(acc))
        setGeoStatus('live')
        markerRef.current.setLatLng(ll)
        circleRef.current.setLatLng(ll).setRadius(acc)
        map.panTo(ll, { animate: true, duration: 1.2 })
      },
      (err) => {
        console.warn('Geo:', err.message)
        setGeoStatus('error')
        setCoords({ lat: fallback[0].toFixed(6), lng: fallback[1].toFixed(6) })
      },
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 12000 }
    )
  }

  const pillCls = geoStatus === 'live' ? 'live' : geoStatus === 'error' ? 'error' : 'acquiring'
  const pillTxt = geoStatus === 'live' ? 'Live Location' : geoStatus === 'error' ? 'Location Unavailable' : 'Acquiring GPS…'

  return (
    <>
      <style>{S}</style>
      <div className="sup-root">

        {/* ── Sidebar ── */}
        <aside className="sup-sidebar">
          <div className="sup-sb-logo">
            <div className="sup-sb-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/></svg>
            </div>
            <span className="sup-sb-brand">PestPro</span>
          </div>
          <nav className="sup-sb-nav">
            {navItems.map(n => (
              <div
                key={n.id}
                className={`sup-sb-item${active === n.id ? ' active' : ''}`}
                onClick={() => setActive(n.id)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d={n.d}/>
                </svg>
                {n.label}
              </div>
            ))}
          </nav>
          <div className="sup-sb-user">
            <div className="sup-sb-avatar">SL</div>
            <div>
              <div className="sup-sb-uname">Sarah Lin</div>
              <div className="sup-sb-urole">Supervisor</div>
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="sup-main">
          <div className="sup-topbar">
            <span className="sup-topbar-title">Team Overview</span>
            <button className="sup-topbar-btn">
              <svg viewBox="0 0 24 24">
                <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
              Send Alert
            </button>
          </div>

          <div className="sup-content">
            <div className="sup-page-title">Team Activity</div>
            <div className="sup-page-sub">Tuesday, 24 Apr · 42 Technicians Active</div>

            {/* Metrics row */}
            <div className="sup-metrics">
              {metrics.map((m, i) => (
                <div className={`sup-metric ${m.cls}`} key={i}>
                  <div className="sup-metric-lbl">{m.label}</div>
                  <div className="sup-metric-val">{m.val}</div>
                  <div className="sup-metric-sub">{m.sub}</div>
                </div>
              ))}
            </div>

            <div className="sup-two-col">
              {/* Live Map */}
              <div className="sup-card">
                <div className="sup-map-wrap">
                  <div className={`sup-map-pill ${pillCls}`}>
                    <span className="sup-pulse-dot"/>
                    {pillTxt}
                  </div>
                  <div id="sup-live-map"/>
                </div>
                <div className="sup-loc-bar">
                  <div className="sup-loc-cell">
                    <div className="sup-loc-label">Latitude</div>
                    <div className="sup-loc-val">{coords ? coords.lat : '—'}</div>
                  </div>
                  <div className="sup-loc-cell">
                    <div className="sup-loc-label">Longitude</div>
                    <div className="sup-loc-val">{coords ? coords.lng : '—'}</div>
                  </div>
                  <div className="sup-loc-cell">
                    <div className="sup-loc-label">Accuracy</div>
                    <div className="sup-loc-val">{accuracy !== null ? `±${accuracy}m` : '—'}</div>
                  </div>
                </div>
              </div>

              {/* Technician list */}
              <div className="sup-card">
                <div className="sup-card-inner">
                  <div className="sup-card-title">Active Technicians</div>
                  {techs.map((t, i) => (
                    <div className="sup-tech-row" key={i}>
                      <div className="sup-tech-avatar" style={{ background: t.color }}>{t.initials}</div>
                      <div className="sup-tech-info">
                        <div className="sup-tech-name">{t.name}</div>
                        <div className="sup-tech-job">{t.job}</div>
                      </div>
                      <div className={`sup-status-dot ${t.status}`}/>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Alerts */}
            <div>
              <div className="sup-section-hdr">
                <span style={{ fontSize: 16, color: '#1a2e1a' }}>Recent Alerts</span>
                <span style={{ fontSize: 12, color: '#a0b0a0' }}>SORTED BY: TIME</span>
              </div>
              {alerts.map((a, i) => (
                <div className="sup-alert-card" key={i}>
                  <div className={`sup-alert-icon ${a.type}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke={a.iconColor} strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d={a.iconPath}/>
                    </svg>
                  </div>
                  <div className="sup-alert-info">
                    <div className="sup-alert-lbl">{a.label}</div>
                    <div className="sup-alert-msg">{a.msg}</div>
                  </div>
                  <span className={`sup-badge ${a.badgeCls}`}>{a.badge}</span>
                  <button className={`sup-btn ${a.btnCls}`}>{a.btn}</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}