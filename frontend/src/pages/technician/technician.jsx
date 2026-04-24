import { useState, useEffect, useRef } from 'react'

const S = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
.td-root{font-family:'DM Serif Display',serif;min-height:100vh;background:#f0f2f0;display:flex;}

/* Sidebar */
.td-sidebar{width:210px;background:#fff;border-right:1px solid #e8ebe8;display:flex;flex-direction:column;min-height:100vh;position:sticky;top:0;flex-shrink:0;}
.td-sb-logo{padding:18px 20px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #e8ebe8;}
.td-sb-icon{width:28px;height:28px;background:#1a6b3c;border-radius:6px;display:flex;align-items:center;justify-content:center;}
.td-sb-icon svg{width:15px;height:15px;fill:white;}
.td-sb-brand{font-size:16px;color:#1a2e1a;}
.td-sb-nav{padding:14px 12px;flex:1;}
.td-sb-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;cursor:pointer;margin-bottom:2px;color:#5a6e5a;font-size:13.5px;transition:background .15s;}
.td-sb-item:hover{background:#f0f2f0;}
.td-sb-item.active{background:#edf6f1;color:#1a6b3c;}
.td-sb-item svg{width:16px;height:16px;flex-shrink:0;}
.td-sb-user{padding:16px;border-top:1px solid #e8ebe8;display:flex;align-items:center;gap:10px;}
.td-sb-avatar{width:34px;height:34px;background:#1a6b3c;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;flex-shrink:0;}
.td-sb-uname{font-size:13px;color:#1a2e1a;}
.td-sb-urole{font-size:11px;color:#a0b0a0;}

/* Main */
.td-main{flex:1;display:flex;flex-direction:column;overflow:auto;}
.td-topbar{background:#fff;border-bottom:1px solid #e8ebe8;padding:0 28px;height:52px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
.td-topbar-title{font-size:15px;color:#1a2e1a;}
.td-topbar-btn{background:#1a6b3c;color:#fff;border:none;border-radius:9px;padding:8px 18px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;transition:background .15s;}
.td-topbar-btn:hover{background:#155a32;}
.td-topbar-btn svg{width:14px;height:14px;fill:white;}

.td-content{padding:22px 28px;flex:1;}
.td-page-title{font-size:22px;color:#1a2e1a;margin-bottom:2px;}
.td-page-sub{font-size:13px;color:#a0b0a0;margin-bottom:18px;}

/* Two-col layout */
.td-two-col{display:grid;grid-template-columns:1fr 300px;gap:16px;margin-bottom:18px;}

/* Cards */
.td-card{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.05);}
.td-card-inner{padding:16px 18px;}
.td-card-title{font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:#a0b0a0;margin-bottom:12px;}

/* Map */
.td-map-wrap{position:relative;}
#td-live-map{width:100%;height:260px;display:block;}
.td-map-pill{position:absolute;top:10px;left:10px;z-index:999;background:#fff;border-radius:20px;padding:5px 12px;font-size:12px;display:flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(0,0,0,.15);font-family:'DM Serif Display',serif;}
.td-map-pill.live{color:#1a6b3c;}
.td-map-pill.acquiring{color:#e6a817;}
.td-map-pill.error{color:#e74c3c;}
.td-pulse-dot{width:8px;height:8px;border-radius:50%;background:currentColor;animation:tdPulse 1.8s infinite;}
@keyframes tdPulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.4;transform:scale(1.4);}}
.td-loc-bar{display:flex;gap:0;border-top:1px solid #edf1ed;}
.td-loc-cell{flex:1;padding:10px 14px;border-right:1px solid #edf1ed;}
.td-loc-cell:last-child{border-right:none;}
.td-loc-label{font-size:10px;color:#a0b0a0;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;}
.td-loc-val{font-size:13px;color:#1a2e1a;}

/* Equipment */
.td-equip-row{margin-bottom:13px;}
.td-equip-lbl{display:flex;justify-content:space-between;font-size:12px;color:#5a6e5a;margin-bottom:5px;}
.td-bar{height:7px;background:#f0f2f0;border-radius:4px;overflow:hidden;}
.td-bar-fill{height:100%;border-radius:4px;background:#1a6b3c;transition:width .4s;}
.td-bar-fill.warn{background:#e6a817;}
.td-bar-fill.low{background:#e74c3c;}
.td-log-btn{width:100%;background:#1a2e1a;color:#fff;border:none;border-radius:9px;padding:10px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;margin-top:4px;}
.td-log-btn:hover{background:#0f1e0f;}

/* Jobs */
.td-jobs-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
.td-job-card{background:#fff;border-radius:14px;padding:14px 16px;margin-bottom:10px;display:flex;align-items:center;gap:12px;box-shadow:0 1px 6px rgba(0,0,0,0.05);}
.td-job-num{width:32px;height:32px;border-radius:8px;background:#edf6f1;display:flex;align-items:center;justify-content:center;font-size:13px;color:#1a6b3c;flex-shrink:0;}
.td-job-info{flex:1;}
.td-job-lbl{font-size:11px;color:#a0b0a0;text-transform:uppercase;letter-spacing:.6px;}
.td-job-name{font-size:14px;color:#1a2e1a;margin:2px 0;}
.td-job-addr{font-size:12px;color:#7a8c7a;}
.td-badge{font-size:11.5px;padding:3px 10px;border-radius:6px;flex-shrink:0;}
.td-badge.inprogress{background:#edf6f1;color:#1a6b3c;}
.td-badge.pending{background:#fff8ec;color:#e6a817;}
.td-badge.done{background:#f0f2f0;color:#7a8c7a;}
.td-btn{border:none;border-radius:8px;padding:7px 14px;font-family:'DM Serif Display',serif;font-size:12.5px;cursor:pointer;flex-shrink:0;transition:background .15s;}
.td-btn.primary{background:#1a6b3c;color:#fff;}
.td-btn.primary:hover{background:#155a32;}
.td-btn.secondary{background:#f0f2f0;color:#3d4f3d;}
.td-btn.secondary:hover{background:#e2e8e2;}
`

const navItems = [
  {id:'dashboard',label:'Dashboard',d:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'},
  {id:'jobs',label:'My Jobs',d:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'},
  {id:'route',label:'Daily Route',d:'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7'},
  {id:'perf',label:'Performance',d:'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'},
  {id:'customers',label:'Customers',d:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z'},
  {id:'settings',label:'Settings',d:'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z'},
]

const jobs = [
  {num:1,label:'Job #3821 · Today',name:'Pest Control – Sycamore Park',addr:'17 Hillside Drive, Sycamore Park',badge:'In Progress',badgeCls:'inprogress',btn:'Complete',btnCls:'primary'},
  {num:2,label:'Job #3822 · Next',name:'Termite Inspection – Clayfield',addr:'4 Wentworth Ave, Clayfield',badge:'Pending',badgeCls:'pending',btn:'Navigate',btnCls:'secondary'},
  {num:3,label:'Job #3823 · Scheduled',name:'Rodent Proofing – Eastview',addr:'12 Oak Lane, Eastview',badge:'Pending',badgeCls:'pending',btn:'Navigate',btnCls:'secondary'},
]

const equip = [
  {label:'Chemical Supply',pct:78,cls:''},
  {label:'Battery Level',pct:91,cls:''},
  {label:'Spray Pressure',pct:55,cls:'warn'},
  {label:'Fuel Reserve',pct:22,cls:'low'},
]

export default function TechnicianDashboard() {
  const [active, setActive] = useState('dashboard')
  const [geoStatus, setGeoStatus] = useState('acquiring') // 'acquiring'|'live'|'error'
  const [coords, setCoords] = useState(null)
  const [accuracy, setAccuracy] = useState(null)

  const mapRef    = useRef(null)
  const markerRef = useRef(null)
  const circleRef = useRef(null)
  const watchRef  = useRef(null)

  /* ── Bootstrap Leaflet from CDN ── */
  useEffect(() => {
    // Inject CSS
    if (!document.getElementById('lf-css')) {
      const l = document.createElement('link')
      l.id = 'lf-css'; l.rel = 'stylesheet'
      l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(l)
    }

    const boot = () => {
      if (document.getElementById('td-live-map') && !mapRef.current) initMap()
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
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
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

    const map = L.map('td-live-map').setView(fallback, 14)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)
    mapRef.current = map

    // Green pulsing dot icon
    const makeIcon = () => L.divIcon({
      className: '',
      html: `
        <div style="position:relative;width:20px;height:20px;">
          <div style="position:absolute;inset:0;border-radius:50%;background:rgba(26,107,60,.25);animation:ripple 2s infinite;"></div>
          <div style="position:absolute;inset:4px;border-radius:50%;background:#1a6b3c;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);"></div>
        </div>
        <style>@keyframes ripple{0%{transform:scale(1);opacity:.6;}100%{transform:scale(2.5);opacity:0;}}</style>
      `,
      iconSize: [20, 20], iconAnchor: [10, 10],
    })

    markerRef.current = L.marker(fallback, { icon: makeIcon() })
      .addTo(map)
      .bindPopup('<b style="font-family:serif">📍 You are here</b>')

    circleRef.current = L.circle(fallback, {
      radius: 80, color: '#1a6b3c',
      fillColor: '#1a6b3c', fillOpacity: 0.08, weight: 1,
    }).addTo(map)

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
      <div className="td-root">

        {/* ── Sidebar ── */}
        <aside className="td-sidebar">
          <div className="td-sb-logo">
            <div className="td-sb-icon"><svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/></svg></div>
            <span className="td-sb-brand">PestPro</span>
          </div>
          <nav className="td-sb-nav">
            {navItems.map(n => (
              <div key={n.id} className={`td-sb-item${active===n.id?' active':''}`} onClick={()=>setActive(n.id)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d={n.d}/>
                </svg>
                {n.label}
              </div>
            ))}
          </nav>
          <div className="td-sb-user">
            <div className="td-sb-avatar">MJ</div>
            <div>
              <div className="td-sb-uname">Marcus Johnson</div>
              <div className="td-sb-urole">Technician</div>
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="td-main">
          <div className="td-topbar">
            <span className="td-topbar-title">Dashboard</span>
            <button className="td-topbar-btn">
              <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
              Start Route
            </button>
          </div>

          <div className="td-content">
            <div className="td-page-title">My Daily Route</div>
            <div className="td-page-sub">Tuesday, 24 Apr · 3 Jobs Remaining</div>

            <div className="td-two-col">
              {/* Live Map */}
              <div className="td-card">
                <div className="td-map-wrap">
                  <div className={`td-map-pill ${pillCls}`}>
                    <span className="td-pulse-dot"/>
                    {pillTxt}
                  </div>
                  {/* Leaflet mounts here */}
                  <div id="td-live-map"/>
                </div>
                <div className="td-loc-bar">
                  <div className="td-loc-cell">
                    <div className="td-loc-label">Latitude</div>
                    <div className="td-loc-val">{coords ? coords.lat : '—'}</div>
                  </div>
                  <div className="td-loc-cell">
                    <div className="td-loc-label">Longitude</div>
                    <div className="td-loc-val">{coords ? coords.lng : '—'}</div>
                  </div>
                  <div className="td-loc-cell">
                    <div className="td-loc-label">Accuracy</div>
                    <div className="td-loc-val">{accuracy !== null ? `±${accuracy}m` : '—'}</div>
                  </div>
                </div>
              </div>

              {/* Equipment */}
              <div className="td-card">
                <div className="td-card-inner" style={{paddingBottom:0}}>
                  <div className="td-card-title">Equipment Check</div>
                  {equip.map((e,i) => (
                    <div className="td-equip-row" key={i}>
                      <div className="td-equip-lbl"><span>{e.label}</span><span>{e.pct}%</span></div>
                      <div className="td-bar"><div className={`td-bar-fill ${e.cls}`} style={{width:`${e.pct}%`}}/></div>
                    </div>
                  ))}
                  <button className="td-log-btn">Log Today's Supplies</button>
                </div>
              </div>
            </div>

            {/* Jobs */}
            <div className="td-jobs-hdr">
              <span style={{fontSize:16,color:'#1a2e1a'}}>Scheduled Jobs</span>
              <span style={{fontSize:12,color:'#a0b0a0'}}>SORTED BY: ROUTE ORDER</span>
            </div>
            {jobs.map((j,i) => (
              <div className="td-job-card" key={i}>
                <div className="td-job-num">{j.num}</div>
                <div className="td-job-info">
                  <div className="td-job-lbl">{j.label}</div>
                  <div className="td-job-name">{j.name}</div>
                  <div className="td-job-addr">{j.addr}</div>
                </div>
                <span className={`td-badge ${j.badgeCls}`}>{j.badge}</span>
                <button className={`td-btn ${j.btnCls}`}>{j.btn}</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

