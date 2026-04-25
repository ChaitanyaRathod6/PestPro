// import { useState, useEffect, useRef } from 'react'
// import { useNavigate } from 'react-router-dom'
// import { useAuth } from '../../context/AuthContext'

// const displayName = (user) => {
//   if (!user) return 'Technician'
//   return (
//     user.full_name ||
//     user.name ||
//     (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : null) ||
//     user.first_name ||
//     user.username ||
//     'Technician'
//   )
// }

// const initials = (name = '') => {
//   const parts = name.trim().split(' ').filter(Boolean)
//   if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
//   return (parts[0]?.[0] || 'T').toUpperCase()
// }

// /* ─────────────────────────────────────────────
//    STYLES — mirrors AdminDashboard conventions
// ───────────────────────────────────────────── */
// const S = `
// @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap');

// *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

// :root {
//   --green:      #1a6b3c;
//   --green-dark: #1a4d2e;
//   --green-light:#edf6f1;
//   --green-mid:  #a8d5ba;
//   --ink:        #1a2e1a;
//   --muted:      #7a8c7a;
//   --pale:       #a0b0a0;
//   --border:     #e8ebe8;
//   --bg:         #f0f2f0;
//   --white:      #ffffff;
//   --red:        #e74c3c;
//   --amber:      #e6a817;
//   --blue:       #3b82f6;
//   --sidebar-w:  220px;
// }

// .td-root {
//   font-family: 'DM Serif Display', serif;
//   min-height: 100vh;
//   background: var(--bg);
//   display: flex;
// }

// /* ── SIDEBAR ─────────────────────────────── */
// .td-sidebar {
//   width: var(--sidebar-w);
//   background: var(--white);
//   border-right: 1px solid var(--border);
//   display: flex;
//   flex-direction: column;
//   min-height: 100vh;
//   position: fixed;
//   top: 0; left: 0; bottom: 0;
//   z-index: 200;
//   transition: transform .25s ease;
//   overflow-y: auto;
// }

// .td-sb-logo {
//   padding: 16px 20px;
//   display: flex; align-items: center; gap: 8px;
//   border-bottom: 1px solid var(--border);
//   flex-shrink: 0;
// }
// .td-sb-icon {
//   width: 28px; height: 28px;
//   background: var(--green);
//   border-radius: 6px;
//   display: flex; align-items: center; justify-content: center;
// }
// .td-sb-icon svg { width: 15px; height: 15px; fill: white; }
// .td-sb-brand { font-size: 16px; color: var(--ink); }

// .td-sb-nav { padding: 12px 10px; flex: 1; }
// .td-sb-item {
//   display: flex; align-items: center; gap: 10px;
//   padding: 9px 12px;
//   border-radius: 10px;
//   cursor: pointer;
//   margin-bottom: 2px;
//   color: var(--muted);
//   font-size: 13.5px;
//   transition: background .15s, color .15s;
//   white-space: nowrap;
// }
// .td-sb-item:hover { background: var(--bg); color: var(--ink); }
// .td-sb-item.active { background: var(--green-light); color: var(--green); }
// .td-sb-item svg { width: 16px; height: 16px; flex-shrink: 0; }

// .td-sb-user {
//   padding: 14px 16px;
//   border-top: 1px solid var(--border);
//   display: flex; align-items: center; gap: 10px;
//   flex-shrink: 0;
// }
// .td-sb-avatar {
//   width: 32px; height: 32px;
//   background: var(--green);
//   border-radius: 50%;
//   display: flex; align-items: center; justify-content: center;
//   color: #fff; font-size: 12px;
//   flex-shrink: 0;
// }
// .td-sb-uname { font-size: 13px; color: var(--ink); line-height: 1.2; }
// .td-sb-urole { font-size: 11px; color: var(--pale); }
// .td-sb-logout {
//   background: none; border: none; cursor: pointer;
//   color: var(--pale); padding: 4px; border-radius: 6px;
//   display: flex; align-items: center; justify-content: center;
//   transition: color .15s, background .15s;
//   flex-shrink: 0; margin-left: auto;
// }
// .td-sb-logout:hover { color: var(--red); background: #fde8e8; }

// .td-overlay {
//   display: none;
//   position: fixed; inset: 0;
//   background: rgba(0,0,0,.35);
//   z-index: 150;
// }
// .td-overlay.show { display: block; }

// /* ── MAIN ─────────────────────────────────── */
// .td-main {
//   flex: 1;
//   margin-left: var(--sidebar-w);
//   display: flex;
//   flex-direction: column;
//   min-height: 100vh;
//   transition: margin-left .25s ease;
// }

// /* ── TOPBAR ─────────────────────────────── */
// .td-topbar {
//   background: var(--white);
//   border-bottom: 1px solid var(--border);
//   padding: 0 24px;
//   height: 50px;
//   display: flex; align-items: center; justify-content: space-between;
//   position: sticky; top: 0; z-index: 100;
//   flex-shrink: 0;
//   gap: 12px;
// }
// .td-topbar-left { display: flex; align-items: center; gap: 10px; }
// .td-hamburger {
//   display: none;
//   background: none; border: none; cursor: pointer;
//   padding: 4px; border-radius: 6px; color: var(--ink);
// }
// .td-hamburger svg { width: 20px; height: 20px; }
// .td-crumb { font-size: 13px; color: var(--pale); }
// .td-crumb span { color: var(--ink); font-size: 14px; }
// .td-topbar-right {
//   display: flex; align-items: center; gap: 8px;
// }
// .td-ticker { font-size: 11px; color: var(--pale); white-space: nowrap; }
// .td-route-btn {
//   background: var(--green);
//   color: #fff;
//   border: none;
//   border-radius: 9px;
//   padding: 8px 18px;
//   font-family: 'DM Serif Display', serif;
//   font-size: 13px;
//   cursor: pointer;
//   display: flex; align-items: center; gap: 6px;
//   white-space: nowrap;
//   transition: background .15s;
// }
// .td-route-btn:hover { background: #155a32; }
// .td-route-btn svg { width: 14px; height: 14px; fill: white; }
// .td-supplies-btn {
//   background: var(--bg);
//   color: var(--ink);
//   border: 1.5px solid var(--border);
//   border-radius: 9px;
//   padding: 7px 14px;
//   font-family: 'DM Serif Display', serif;
//   font-size: 13px;
//   cursor: pointer;
//   white-space: nowrap;
//   transition: background .15s;
// }
// .td-supplies-btn:hover { background: #e8ebe8; }

// /* ── CONTENT ─────────────────────────────── */
// .td-content { padding: 22px 24px; flex: 1; }
// .td-page-title { font-size: 22px; color: var(--ink); margin-bottom: 3px; }
// .td-page-sub { font-size: 13px; color: var(--pale); margin-bottom: 20px; }

// /* ── STAT CARDS ───────────────────────────── */
// .td-stats {
//   display: grid;
//   grid-template-columns: repeat(4, 1fr);
//   gap: 14px;
//   margin-bottom: 20px;
// }
// .td-stat {
//   background: var(--white);
//   border-radius: 14px;
//   padding: 18px 20px;
//   box-shadow: 0 1px 8px rgba(0,0,0,.05);
// }
// .td-stat-label {
//   font-size: 10.5px;
//   text-transform: uppercase;
//   letter-spacing: .8px;
//   color: var(--pale);
//   margin-bottom: 8px;
// }
// .td-stat-val {
//   font-size: 28px;
//   color: var(--ink);
//   letter-spacing: -1px;
//   line-height: 1;
// }
// .td-stat-sub { font-size: 12px; color: var(--muted); margin-top: 5px; }
// .td-stat-chip {
//   display: inline-flex; align-items: center;
//   background: var(--green-light); color: var(--green);
//   border-radius: 6px; padding: 2px 8px;
//   font-size: 11px; margin-top: 6px;
// }
// .td-stat-chip.warn { background: #fff8ec; color: var(--amber); }
// .td-stat-chip.danger { background: #fde8e8; color: var(--red); }

// /* ── TWO-COL ROW ────────────────────────── */
// .td-row {
//   display: grid;
//   grid-template-columns: 1fr 300px;
//   gap: 16px;
//   margin-bottom: 18px;
//   align-items: start;
// }

// /* ── CARD BASE ────────────────────────────── */
// .td-card {
//   background: var(--white);
//   border-radius: 16px;
//   box-shadow: 0 2px 12px rgba(0,0,0,.05);
//   overflow: hidden;
//   display: flex;
//   flex-direction: column;
// }
// .td-card-inner { padding: 20px 22px; }
// .td-card-header {
//   display: flex; justify-content: space-between; align-items: flex-start;
//   margin-bottom: 16px;
// }
// .td-card-title { font-size: 16px; color: var(--ink); }
// .td-card-sub { font-size: 12px; color: var(--pale); margin-top: 2px; }

// /* ── MAP ────────────────────────────────── */
// .td-map-wrap { position: relative; }
// #td-live-map { width: 100%; height: 420px; display: block; }
// .td-map-pill {
//   position: absolute; top: 10px; left: 10px; z-index: 999;
//   background: var(--white); border-radius: 20px; padding: 5px 12px;
//   font-size: 12px; display: flex; align-items: center; gap: 6px;
//   box-shadow: 0 2px 8px rgba(0,0,0,.15);
//   font-family: 'DM Serif Display', serif;
// }
// .td-map-pill.live { color: var(--green); }
// .td-map-pill.acquiring { color: var(--amber); }
// .td-map-pill.error { color: var(--red); }
// .td-pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; animation: tdPulse 1.8s infinite; }
// @keyframes tdPulse { 0%,100%{opacity:1;transform:scale(1);}50%{opacity:.4;transform:scale(1.4);} }
// .td-loc-bar { display: flex; gap: 0; border-top: 1px solid #edf1ed; }
// .td-loc-cell { flex: 1; padding: 10px 14px; border-right: 1px solid #edf1ed; }
// .td-loc-cell:last-child { border-right: none; }
// .td-loc-label { font-size: 10px; color: var(--pale); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 3px; }
// .td-loc-val { font-size: 13px; color: var(--ink); }

// /* ── RIGHT METRICS COLUMN ─────────────────── */
// .td-metrics { display: flex; flex-direction: column; gap: 10px; }

// .td-metric-row {
//   background: var(--white);
//   border-radius: 12px; padding: 13px 15px;
//   box-shadow: 0 1px 6px rgba(0,0,0,.05);
// }
// .td-metric-top {
//   display: flex; justify-content: space-between; align-items: center;
//   margin-bottom: 7px;
// }
// .td-metric-name { font-size: 13px; color: var(--ink); }
// .td-metric-pct { font-size: 12px; color: var(--pale); }
// .td-metric-bar { height: 6px; background: var(--bg); border-radius: 3px; overflow: hidden; }
// .td-metric-fill { height: 100%; border-radius: 3px; background: var(--green); transition: width .4s; }
// .td-metric-fill.warn { background: var(--amber); }
// .td-metric-fill.low { background: var(--red); }
// .td-metric-sub { font-size: 11.5px; color: var(--muted); margin-top: 6px; }

// .td-green-card {
//   background: linear-gradient(135deg, var(--green-dark), var(--green));
//   border-radius: 14px; padding: 18px; color: #fff;
// }
// .td-green-card-title { font-size: 13px; opacity: .8; margin-bottom: 8px; }
// .td-green-card-val { font-size: 21px; margin-bottom: 6px; }
// .td-green-card-sub { font-size: 12px; opacity: .75; margin-bottom: 14px; line-height: 1.55; }
// .td-green-card-btn {
//   width: 100%;
//   background: rgba(255,255,255,.15);
//   border: 1px solid rgba(255,255,255,.3);
//   color: #fff;
//   border-radius: 9px; padding: 9px;
//   font-family: 'DM Serif Display', serif;
//   font-size: 13px; cursor: pointer;
//   transition: background .15s;
// }
// .td-green-card-btn:hover { background: rgba(255,255,255,.25); }

// /* ── JOBS SECTION ───────────────────────────── */
// .td-section-hdr {
//   display: flex; justify-content: space-between; align-items: center;
//   margin-bottom: 12px;
// }
// .td-section-title { font-size: 16px; color: var(--ink); display: flex; align-items: center; gap: 8px; }
// .td-section-link {
//   font-size: 12.5px; color: var(--green);
//   cursor: pointer; background: none; border: none;
//   font-family: 'DM Serif Display', serif;
// }

// .td-job-card {
//   background: var(--white);
//   border-radius: 14px; padding: 14px 16px;
//   display: flex; align-items: center; gap: 12px;
//   box-shadow: 0 1px 6px rgba(0,0,0,.05);
//   margin-bottom: 10px;
// }
// .td-job-num {
//   width: 32px; height: 32px; border-radius: 8px;
//   background: var(--green-light);
//   display: flex; align-items: center; justify-content: center;
//   font-size: 13px; color: var(--green); flex-shrink: 0;
// }
// .td-job-info { flex: 1; min-width: 0; }
// .td-job-lbl { font-size: 11px; color: var(--pale); text-transform: uppercase; letter-spacing: .6px; }
// .td-job-name { font-size: 14px; color: var(--ink); margin: 2px 0; }
// .td-job-addr { font-size: 12px; color: var(--muted); }

// .td-badge { font-size: 11.5px; padding: 3px 10px; border-radius: 6px; flex-shrink: 0; }
// .td-badge.inprogress { background: var(--green-light); color: var(--green); }
// .td-badge.pending { background: #fff8ec; color: var(--amber); }
// .td-badge.done { background: var(--bg); color: var(--muted); }

// .td-btn { border: none; border-radius: 8px; padding: 7px 14px; font-family: 'DM Serif Display', serif; font-size: 12.5px; cursor: pointer; flex-shrink: 0; transition: background .15s; }
// .td-btn.primary { background: var(--green); color: #fff; }
// .td-btn.primary:hover { background: #155a32; }
// .td-btn.secondary { background: var(--bg); color: #3d4f3d; }
// .td-btn.secondary:hover { background: #e2e8e2; }

// /* ── LOADING / ERROR ─────────────────────── */
// .td-loading {
//   display: flex; align-items: center; justify-content: center;
//   padding: 60px; color: var(--pale); font-size: 14px; gap: 10px;
// }
// .td-spinner {
//   width: 20px; height: 20px;
//   border: 2px solid var(--border);
//   border-top-color: var(--green);
//   border-radius: 50%;
//   animation: spin .8s linear infinite;
// }
// @keyframes spin { to { transform: rotate(360deg); } }

// /* ── RESPONSIVE ─────────────────────────── */
// @media (max-width: 1024px) {
//   .td-stats { grid-template-columns: repeat(2, 1fr); }
//   .td-row { grid-template-columns: 1fr; }
//   #td-live-map { height: 280px; }
//   .td-metrics { flex-direction: row; flex-wrap: wrap; }
//   .td-metrics > * { flex: 1 1 calc(50% - 5px); }
// }
// @media (max-width: 768px) {
//   .td-sidebar { transform: translateX(-100%); }
//   .td-sidebar.open { transform: translateX(0) !important; }
//   .td-main { margin-left: 0 !important; }
//   .td-hamburger { display: flex; }
//   .td-crumb { display: none; }
//   .td-ticker { display: none; }
//   #td-live-map { height: 220px; }
// }
// @media (max-width: 600px) {
//   .td-stats { grid-template-columns: 1fr 1fr; gap: 10px; }
//   .td-content { padding: 16px; }
//   .td-topbar { padding: 0 14px; }
//   .td-stat-val { font-size: 22px; }
//   .td-metrics { flex-direction: column; }
//   .td-metrics > * { flex: 1 1 100%; }
//   #td-live-map { height: 200px; }
// }
// `

// /* ─────────────────────────────────────────────
//    CONSTANTS
// ───────────────────────────────────────────── */
// const navItems = [
//   { id: 'dashboard', label: 'Dashboard',    d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
//   { id: 'jobs',      label: 'My Jobs',       d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
//   { id: 'route',     label: 'Daily Route',   d: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
//   { id: 'perf',      label: 'Performance',   d: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
//   { id: 'customers', label: 'Customers',     d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
//   { id: 'settings',  label: 'Settings',      d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
// ]

// const jobs = [
//   { num: 1, label: 'Job #3821 · Today',      name: 'Pest Control – Sycamore Park', addr: '17 Hillside Drive, Sycamore Park', badge: 'In Progress', badgeCls: 'inprogress', btn: 'Complete',  btnCls: 'primary'   },
//   { num: 2, label: 'Job #3822 · Next',        name: 'Termite Inspection – Clayfield', addr: '4 Wentworth Ave, Clayfield',    badge: 'Pending',     badgeCls: 'pending',    btn: 'Navigate', btnCls: 'secondary' },
//   { num: 3, label: 'Job #3823 · Scheduled',   name: 'Rodent Proofing – Eastview',   addr: '12 Oak Lane, Eastview',          badge: 'Pending',     badgeCls: 'pending',    btn: 'Navigate', btnCls: 'secondary' },
// ]

// const equip = [
//   { label: 'Chemical Supply', pct: 78, cls: ''     },
//   { label: 'Battery Level',   pct: 91, cls: ''     },
//   { label: 'Spray Pressure',  pct: 55, cls: 'warn' },
//   { label: 'Fuel Reserve',    pct: 22, cls: 'low'  },
// ]

// const AUTO_REFRESH_SECS = 30

// /* ─────────────────────────────────────────────
//    COMPONENT
// ───────────────────────────────────────────── */
// export default function TechnicianDashboard() {
//   const { user, logout } = useAuth()
//   const navigate = useNavigate()
//   const [active,      setActive]      = useState('dashboard')
//   const [sidebarOpen, setSidebarOpen] = useState(false)
//   const [geoStatus,   setGeoStatus]   = useState('acquiring')
//   const [coords,      setCoords]      = useState(null)
//   const [accuracy,    setAccuracy]    = useState(null)
//   const [countdown,   setCountdown]   = useState(AUTO_REFRESH_SECS)

//   const mapRef    = useRef(null)
//   const markerRef = useRef(null)
//   const circleRef = useRef(null)
//   const watchRef  = useRef(null)
//   const tickRef   = useRef(null)

//   const userName     = displayName(user)
//   const userInitials = initials(userName)

//   const handleLogout = async () => {
//     if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current)
//     clearInterval(tickRef.current)
//     await logout()
//     navigate('/login')
//   }

//   /* ── Computed stats from jobs ─── */
//   const totalJobs     = jobs.length
//   const completedJobs = jobs.filter(j => j.badgeCls === 'done').length
//   const inProgressJobs = jobs.filter(j => j.badgeCls === 'inprogress').length
//   const pendingJobs   = jobs.filter(j => j.badgeCls === 'pending').length

  

//   /* ── Auto-refresh countdown ─── */
//   useEffect(() => {
//     tickRef.current = setInterval(() => {
//       setCountdown(c => (c <= 1 ? AUTO_REFRESH_SECS : c - 1))
//     }, 1000)
//     return () => clearInterval(tickRef.current)
//   }, [])

//   /* ── Leaflet map ─── */
//   useEffect(() => {
//     if (!document.getElementById('lf-css')) {
//       const l = document.createElement('link')
//       l.id = 'lf-css'; l.rel = 'stylesheet'
//       l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
//       document.head.appendChild(l)
//     }

//     const boot = () => {
//       if (document.getElementById('td-live-map') && !mapRef.current) initMap()
//       else setTimeout(boot, 80)
//     }

//     const loadScript = () => {
//       if (window.L) { boot(); return }
//       const s = document.createElement('script')
//       s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
//       s.onload = boot
//       document.head.appendChild(s)
//     }
//     loadScript()

//     return () => {
//       if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current)
//       if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
//     }
//   }, [])

//   const initMap = () => {
//     const L = window.L
//     const fallback = [23.0225, 72.5714]

//     delete L.Icon.Default.prototype._getIconUrl
//     L.Icon.Default.mergeOptions({
//       iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
//       iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
//       shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
//     })

//     const map = L.map('td-live-map').setView(fallback, 14)
//     L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//       attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
//       maxZoom: 19,
//     }).addTo(map)
//     mapRef.current = map

//     const makeIcon = () => L.divIcon({
//       className: '',
//       html: `
//         <div style="position:relative;width:20px;height:20px;">
//           <div style="position:absolute;inset:0;border-radius:50%;background:rgba(26,107,60,.25);animation:ripple 2s infinite;"></div>
//           <div style="position:absolute;inset:4px;border-radius:50%;background:#1a6b3c;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);"></div>
//         </div>
//         <style>@keyframes ripple{0%{transform:scale(1);opacity:.6;}100%{transform:scale(2.5);opacity:0;}}</style>
//       `,
//       iconSize: [20, 20], iconAnchor: [10, 10],
//     })

//     markerRef.current = L.marker(fallback, { icon: makeIcon() })
//       .addTo(map)
//       .bindPopup('<b style="font-family:serif">📍 You are here</b>')

//     circleRef.current = L.circle(fallback, {
//       radius: 80, color: '#1a6b3c',
//       fillColor: '#1a6b3c', fillOpacity: 0.08, weight: 1,
//     }).addTo(map)

//     if (!navigator.geolocation) { setGeoStatus('error'); return }

//     watchRef.current = navigator.geolocation.watchPosition(
//       (pos) => {
//         const { latitude: lat, longitude: lng, accuracy: acc } = pos.coords
//         const ll = [lat, lng]
//         setCoords({ lat: lat.toFixed(6), lng: lng.toFixed(6) })
//         setAccuracy(Math.round(acc))
//         setGeoStatus('live')
//         markerRef.current.setLatLng(ll)
//         circleRef.current.setLatLng(ll).setRadius(acc)
//         map.panTo(ll, { animate: true, duration: 1.2 })
//       },
//       (err) => {
//         console.warn('Geo:', err.message)
//         setGeoStatus('error')
//         setCoords({ lat: fallback[0].toFixed(6), lng: fallback[1].toFixed(6) })
//       },
//       { enableHighAccuracy: true, maximumAge: 4000, timeout: 12000 }
//     )
//   }

//   const pillCls = geoStatus === 'live' ? 'live' : geoStatus === 'error' ? 'error' : 'acquiring'
//   const pillTxt = geoStatus === 'live' ? 'Live Location' : geoStatus === 'error' ? 'Location Unavailable' : 'Acquiring GPS…'

//   return (
//     <>
//       <style>{S}</style>
//       <div className="td-root">

//         {/* Mobile overlay */}
//         <div
//           className={`td-overlay${sidebarOpen ? ' show' : ''}`}
//           onClick={() => setSidebarOpen(false)}
//         />

//         {/* ── SIDEBAR ── */}
//         <aside className={`td-sidebar${sidebarOpen ? ' open' : ''}`}>
//           <div className="td-sb-logo">
//             <div className="td-sb-icon">
//               <svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/></svg>
//             </div>
//             <span className="td-sb-brand">PestPro</span>
//           </div>

//           <nav className="td-sb-nav">
//             {navItems.map(n => (
//               <div
//                 key={n.id}
//                 className={`td-sb-item${active === n.id ? ' active' : ''}`}
//                 onClick={() => { setActive(n.id); setSidebarOpen(false) }}
//               >
//                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                   <path strokeLinecap="round" strokeLinejoin="round" d={n.d}/>
//                 </svg>
//                 {n.label}
//               </div>
//             ))}
//           </nav>

//           <div className="td-sb-user">
//             <div className="td-sb-avatar">{userInitials}</div>
//             <div style={{flex:1, minWidth:0}}>
//               <div className="td-sb-uname" style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{userName}</div>
//               <div className="td-sb-urole">Technician</div>
//             </div>
//             <button className="td-sb-logout" onClick={handleLogout} title="Logout">
//               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                 <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
//               </svg>
//             </button>
//           </div>
//         </aside>

//         {/* ── MAIN ── */}
//         <div className="td-main">

//           {/* Topbar */}
//           <div className="td-topbar">
//             <div className="td-topbar-left">
//               <button className="td-hamburger" onClick={() => setSidebarOpen(o => !o)}>
//                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                   <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
//                 </svg>
//               </button>
//               <span className="td-crumb">
//                 My Dashboard &nbsp;›&nbsp; <span>Daily Route</span>
//               </span>
//             </div>
//             <div className="td-topbar-right">
//               <span className="td-ticker">↻ in {countdown}s</span>
//               <button className="td-supplies-btn">Log Supplies</button>
//               <button className="td-route-btn">
//                 <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
//                 Start Route
//               </button>
//             </div>
//           </div>

//           {/* Content */}
//           <div className="td-content">
//             <div className="td-page-title">My Daily Route</div>
//             <div className="td-page-sub">
//               Tuesday, 24 Apr · {pendingJobs + inProgressJobs} Jobs Remaining
//             </div>

//             {/* ── STATS ── */}
//             <div className="td-stats">
//               <div className="td-stat">
//                 <div className="td-stat-label">Today's Jobs</div>
//                 <div className="td-stat-val">{totalJobs}</div>
//                 <div className="td-stat-sub">{inProgressJobs} in progress now</div>
//               </div>

//               <div className="td-stat">
//                 <div className="td-stat-label">Completed</div>
//                 <div className="td-stat-val">
//                   {completedJobs}
//                   <span style={{fontSize:16,color:'#a0b0a0'}}>/{totalJobs}</span>
//                 </div>
//                 <div className="td-stat-sub">
//                   {totalJobs > 0
//                     ? `${Math.round((completedJobs / totalJobs) * 100)}% completion rate`
//                     : 'No jobs yet'}
//                 </div>
//               </div>

//               <div className="td-stat">
//                 <div className="td-stat-label">Equipment Status</div>
//                 <div className="td-stat-val" style={{color: equip[3].pct < 30 ? '#e74c3c' : '#1a2e1a'}}>
//                   {equip.filter(e => e.cls === '').length}/{equip.length}
//                 </div>
//                 {equip.some(e => e.cls === 'low')
//                   ? <span className="td-stat-chip danger">Low Alert</span>
//                   : equip.some(e => e.cls === 'warn')
//                   ? <span className="td-stat-chip warn">Check Required</span>
//                   : <span className="td-stat-chip">All Good ✓</span>
//                 }
//               </div>

//               <div className="td-stat">
//                 <div className="td-stat-label">GPS Status</div>
//                 <div className="td-stat-val" style={{fontSize:18,paddingTop:4}}>
//                   {geoStatus === 'live' ? 'Live' : geoStatus === 'error' ? 'Error' : 'Acquiring'}
//                 </div>
//                 {accuracy !== null
//                   ? <span className="td-stat-chip">±{accuracy}m accuracy</span>
//                   : <span className="td-stat-chip warn">Searching…</span>
//                 }
//               </div>
//             </div>

//             {/* ── MAP + EQUIPMENT ROW ── */}
//             <div className="td-row">
//               {/* Live Map */}
//               <div className="td-card">
//                 <div className="td-card-inner" style={{padding:0}}>
//                   <div className="td-map-wrap">
//                     <div className={`td-map-pill ${pillCls}`}>
//                       <span className="td-pulse-dot"/>
//                       {pillTxt}
//                     </div>
//                     <div id="td-live-map"/>
//                   </div>
//                   <div className="td-loc-bar">
//                     <div className="td-loc-cell">
//                       <div className="td-loc-label">Latitude</div>
//                       <div className="td-loc-val">{coords ? coords.lat : '—'}</div>
//                     </div>
//                     <div className="td-loc-cell">
//                       <div className="td-loc-label">Longitude</div>
//                       <div className="td-loc-val">{coords ? coords.lng : '—'}</div>
//                     </div>
//                     <div className="td-loc-cell">
//                       <div className="td-loc-label">Accuracy</div>
//                       <div className="td-loc-val">{accuracy !== null ? `±${accuracy}m` : '—'}</div>
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               {/* Equipment + Live Status */}
//               <div className="td-metrics">
//                 {equip.map((e, i) => (
//                   <div className="td-metric-row" key={i}>
//                     <div className="td-metric-top">
//                       <div className="td-metric-name">{e.label}</div>
//                       <div className="td-metric-pct">{e.pct}%</div>
//                     </div>
//                     <div className="td-metric-bar">
//                       <div className={`td-metric-fill ${e.cls}`} style={{width:`${e.pct}%`}}/>
//                     </div>
//                     <div className="td-metric-sub">
//                       {e.cls === 'low' ? 'Needs immediate refill' : e.cls === 'warn' ? 'Monitor closely' : 'Levels normal'}
//                     </div>
//                   </div>
//                 ))}

//                 <div className="td-green-card">
//                   <div className="td-green-card-title">Live Route Status</div>
//                   <div className="td-green-card-val">{inProgressJobs} Active Job</div>
//                   <div className="td-green-card-sub">
//                     {pendingJobs} pending · {completedJobs} completed · GPS {geoStatus}
//                   </div>
//                   <button className="td-green-card-btn">
//                     ↻ Refresh Location
//                   </button>
//                 </div>
//               </div>
//             </div>

//             {/* ── SCHEDULED JOBS ── */}
//             <div className="td-section-hdr">
//               <div className="td-section-title">
//                 Scheduled Jobs
//                 <span style={{fontSize:12,color:'#1a6b3c',background:'#edf6f1',padding:'2px 8px',borderRadius:6}}>
//                   {totalJobs}
//                 </span>
//               </div>
//               <span className="td-section-link">Sorted by: Route Order</span>
//             </div>

//             {jobs.map((j, i) => (
//               <div className="td-job-card" key={i}>
//                 <div className="td-job-num">{j.num}</div>
//                 <div className="td-job-info">
//                   <div className="td-job-lbl">{j.label}</div>
//                   <div className="td-job-name">{j.name}</div>
//                   <div className="td-job-addr">{j.addr}</div>
//                 </div>
//                 <span className={`td-badge ${j.badgeCls}`}>{j.badge}</span>
//                 <button className={`td-btn ${j.btnCls}`}>{j.btn}</button>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//     </>
//   )
// }
 
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const displayName = (user) => {
  if (!user) return 'Technician'
  return (
    user.full_name ||
    user.name ||
    (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : null) ||
    user.first_name ||
    user.username ||
    'Technician'
  )
}

const initials = (name = '') => {
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return (parts[0]?.[0] || 'T').toUpperCase()
}

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */
const S = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --green:       #1a6b3c;
  --green-dark:  #1a4d2e;
  --green-light: #edf6f1;
  --ink:         #1a2e1a;
  --muted:       #7a8c7a;
  --pale:        #a0b0a0;
  --border:      #e8ebe8;
  --bg:          #f0f2f0;
  --white:       #ffffff;
  --red:         #e74c3c;
  --amber:       #e6a817;
  --sidebar-w:   220px;
}

.td-root {
  font-family: 'DM Serif Display', serif;
  min-height: 100vh;
  background: var(--bg);
  display: flex;
}

/* ── SIDEBAR ── */
.td-sidebar {
  width: var(--sidebar-w);
  background: var(--white);
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column;
  min-height: 100vh;
  position: fixed; top: 0; left: 0; bottom: 0;
  z-index: 200;
  transition: transform .25s ease;
  overflow-y: auto;
}
.td-sb-logo {
  padding: 16px 20px;
  display: flex; align-items: center; gap: 8px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.td-sb-icon {
  width: 28px; height: 28px; background: var(--green);
  border-radius: 6px; display: flex; align-items: center; justify-content: center;
}
.td-sb-icon svg { width: 15px; height: 15px; fill: white; }
.td-sb-brand { font-size: 16px; color: var(--ink); }

.td-sb-nav { padding: 12px 10px; flex: 1; }
.td-sb-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; border-radius: 10px;
  cursor: pointer; margin-bottom: 2px;
  color: var(--muted); font-size: 13.5px;
  transition: background .15s, color .15s;
  white-space: nowrap;
}
.td-sb-item:hover  { background: var(--bg); color: var(--ink); }
.td-sb-item.active { background: var(--green-light); color: var(--green); }
.td-sb-item svg    { width: 16px; height: 16px; flex-shrink: 0; }

.td-sb-user {
  padding: 14px 16px; border-top: 1px solid var(--border);
  display: flex; align-items: center; gap: 10px; flex-shrink: 0;
}
.td-sb-avatar {
  width: 32px; height: 32px; background: var(--green);
  border-radius: 50%; display: flex; align-items: center;
  justify-content: center; color: #fff; font-size: 12px; flex-shrink: 0;
}
.td-sb-uname { font-size: 13px; color: var(--ink); line-height: 1.2; }
.td-sb-urole { font-size: 11px; color: var(--pale); }
.td-sb-logout {
  background: none; border: none; cursor: pointer;
  color: var(--pale); padding: 4px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  transition: color .15s, background .15s;
  flex-shrink: 0; margin-left: auto;
}
.td-sb-logout:hover { color: var(--red); background: #fde8e8; }

.td-overlay {
  display: none; position: fixed; inset: 0;
  background: rgba(0,0,0,.35); z-index: 150;
}
.td-overlay.show { display: block; }

/* ── MAIN ── */
.td-main {
  flex: 1; margin-left: var(--sidebar-w);
  display: flex; flex-direction: column; min-height: 100vh;
  transition: margin-left .25s ease;
}

/* ── TOPBAR — exactly like screenshot ── */
.td-topbar {
  background: var(--white);
  border-bottom: 1px solid var(--border);
  padding: 0 24px; height: 50px;
  display: flex; align-items: center; justify-content: space-between;
  position: sticky; top: 0; z-index: 100; flex-shrink: 0; gap: 12px;
}
.td-topbar-left { display: flex; align-items: center; gap: 10px; }
.td-hamburger {
  display: none; background: none; border: none; cursor: pointer;
  padding: 4px; border-radius: 6px; color: var(--ink);
}
.td-hamburger svg { width: 20px; height: 20px; }
.td-crumb { font-size: 13px; color: var(--pale); }
.td-crumb span { color: var(--ink); font-size: 14px; }

.td-topbar-right { display: flex; align-items: center; gap: 10px; }

/* ticker: "↻ in 13s" */
.td-ticker { font-size: 12px; color: var(--pale); white-space: nowrap; }
.td-ticker.soon { color: var(--green); }

/* "Log Supplies" — outlined button */
.td-log-supplies-btn {
  background: var(--white); color: var(--ink);
  border: 1.5px solid var(--border);
  border-radius: 9px; padding: 7px 16px;
  font-family: 'DM Serif Display', serif; font-size: 13px;
  cursor: pointer; white-space: nowrap; transition: background .15s, border-color .15s;
}
.td-log-supplies-btn:hover { background: var(--bg); border-color: #c8d0c8; }

/* "▶ Start Route" — green filled button */
.td-start-route-btn {
  background: var(--green); color: #fff; border: none;
  border-radius: 9px; padding: 8px 18px;
  font-family: 'DM Serif Display', serif; font-size: 13px;
  cursor: pointer; display: flex; align-items: center; gap: 6px;
  white-space: nowrap; transition: background .15s;
}
.td-start-route-btn:hover { background: #155a32; }
.td-start-route-btn svg { width: 12px; height: 12px; fill: white; }

/* ── CONTENT ── */
.td-content { padding: 22px 24px; flex: 1; }
.td-page-title { font-size: 22px; color: var(--ink); margin-bottom: 3px; }
.td-page-sub   { font-size: 13px; color: var(--green); margin-bottom: 20px; font-style: italic; }

/* ── LOADING / ERROR ── */
.td-loading {
  display: flex; align-items: center; justify-content: center;
  padding: 60px; color: var(--pale); font-size: 14px; gap: 10px;
}
.td-spinner {
  width: 20px; height: 20px;
  border: 2px solid var(--border); border-top-color: var(--green);
  border-radius: 50%; animation: tdSpin .8s linear infinite;
}
@keyframes tdSpin { to { transform: rotate(360deg); } }
.td-error {
  background: #fde8e8; color: var(--red);
  padding: 11px 16px; border-radius: 10px; font-size: 13px; margin-bottom: 16px;
}

/* ── STAT CARDS — 4 col exactly like screenshot ── */
.td-stats {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 14px; margin-bottom: 20px;
}
.td-stat {
  background: var(--white); border-radius: 14px;
  padding: 18px 20px; box-shadow: 0 1px 8px rgba(0,0,0,.05);
}
.td-stat-label {
  font-size: 10px; text-transform: uppercase;
  letter-spacing: 1px; color: var(--pale); margin-bottom: 8px;
}
.td-stat-val {
  font-size: 32px; color: var(--ink); letter-spacing: -1px; line-height: 1;
}
.td-stat-val.green { color: var(--green); }
.td-stat-val.amber { color: var(--amber); }
.td-stat-val.red   { color: var(--red); }
.td-stat-val-small { font-size: 16px; color: var(--pale); }
.td-stat-sub { font-size: 12px; color: var(--muted); margin-top: 5px; }
.td-stat-chip {
  display: inline-flex; align-items: center;
  background: var(--green-light); color: var(--green);
  border-radius: 6px; padding: 2px 8px; font-size: 11px; margin-top: 6px;
}
.td-stat-chip.warn   { background: #fff8ec; color: var(--amber); }
.td-stat-chip.danger { background: #fde8e8; color: var(--red); }

/* ── TWO-COL ROW: map (flex-1) + equipment (300px) ── */
.td-row {
  display: grid; grid-template-columns: 1fr 300px;
  gap: 16px; margin-bottom: 24px; align-items: start;
}

/* ── MAP CARD ── */
.td-map-card {
  background: var(--white); border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,.05);
  overflow: hidden;
}
.td-map-wrap { position: relative; }
#td-live-map { width: 100%; height: 300px; display: block; }
.td-map-pill {
  position: absolute; top: 10px; left: 10px; z-index: 999;
  background: var(--white); border-radius: 20px; padding: 5px 12px;
  font-size: 12px; display: flex; align-items: center; gap: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,.15);
  font-family: 'DM Serif Display', serif;
}
.td-map-pill.live      { color: var(--green); }
.td-map-pill.acquiring { color: var(--amber); }
.td-map-pill.error     { color: var(--red); }
.td-pulse-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: currentColor; animation: tdPulse 1.8s infinite;
}
@keyframes tdPulse { 0%,100%{opacity:1;transform:scale(1);}50%{opacity:.4;transform:scale(1.4);} }

/* Location bar below map */
.td-loc-bar { display: flex; border-top: 1px solid #edf1ed; }
.td-loc-cell { flex: 1; padding: 10px 16px; border-right: 1px solid #edf1ed; }
.td-loc-cell:last-child { border-right: none; }
.td-loc-label { font-size: 10px; color: var(--pale); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 3px; }
.td-loc-val   { font-size: 13px; color: var(--ink); }

/* ── RIGHT EQUIPMENT COLUMN ── */
.td-equip-col { display: flex; flex-direction: column; gap: 0; }

/* Equipment rows — stacked inside one card */
.td-equip-card {
  background: var(--white); border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,.05);
  padding: 18px 20px; margin-bottom: 12px;
  display: flex; flex-direction: column; gap: 16px;
}
.td-equip-row { display: flex; flex-direction: column; gap: 6px; }
.td-equip-top { display: flex; justify-content: space-between; align-items: center; }
.td-equip-name { font-size: 13.5px; color: var(--ink); }
.td-equip-pct  { font-size: 13px; color: var(--muted); }
.td-equip-bar  { height: 7px; background: #f0f2f0; border-radius: 4px; overflow: hidden; }
.td-equip-fill { height: 100%; border-radius: 4px; background: var(--green); transition: width .4s; }
.td-equip-fill.warn { background: var(--amber); }
.td-equip-fill.low  { background: var(--red); }
.td-equip-sub  { font-size: 11.5px; color: var(--muted); }

/* Live Route Status card */
.td-status-card {
  background: linear-gradient(135deg, var(--green-dark), var(--green));
  border-radius: 14px; padding: 18px; color: #fff;
}
.td-status-label { font-size: 12px; opacity: .8; margin-bottom: 6px; }
.td-status-val   { font-size: 22px; margin-bottom: 6px; }
.td-status-sub   { font-size: 12px; opacity: .75; margin-bottom: 14px; line-height: 1.55; }
.td-status-btn {
  width: 100%;
  background: rgba(255,255,255,.15);
  border: 1px solid rgba(255,255,255,.3);
  color: #fff; border-radius: 9px; padding: 9px;
  font-family: 'DM Serif Display', serif; font-size: 13px;
  cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;
  transition: background .15s;
}
.td-status-btn:hover { background: rgba(255,255,255,.25); }
.td-status-btn svg { width: 13px; height: 13px; stroke: white; fill: none; }

/* ── SCHEDULED JOBS SECTION ── */
.td-jobs-hdr {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 14px;
}
.td-jobs-hdr-left { display: flex; align-items: center; gap: 10px; }
.td-jobs-title { font-size: 17px; color: var(--ink); }
.td-jobs-count {
  background: var(--green-light); color: var(--green);
  border-radius: 6px; padding: 2px 9px; font-size: 13px;
}
.td-jobs-sort { font-size: 12px; color: var(--pale); }

/* Job card — matches screenshot exactly */
.td-job-card {
  background: var(--white); border-radius: 14px;
  padding: 16px 20px; margin-bottom: 10px;
  display: flex; align-items: center; gap: 14px;
  box-shadow: 0 1px 6px rgba(0,0,0,.05);
}
.td-job-num {
  width: 30px; height: 30px; border-radius: 8px;
  background: var(--green-light);
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; color: var(--green); flex-shrink: 0;
}
.td-job-info { flex: 1; min-width: 0; }
.td-job-lbl  { font-size: 11px; color: var(--pale); text-transform: uppercase; letter-spacing: .6px; margin-bottom: 2px; }
.td-job-name { font-size: 14.5px; color: var(--ink); margin-bottom: 2px; }
.td-job-addr { font-size: 12px; color: var(--muted); }
.td-job-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

/* Status badge — "In Progress" / "Pending" / "Today" / "Next" */
.td-job-badge { font-size: 12px; padding: 4px 12px; border-radius: 6px; white-space: nowrap; }
.td-job-badge.inprogress { background: var(--green-light); color: var(--green); }
.td-job-badge.pending    { background: #fff8ec; color: var(--amber); }
.td-job-badge.done       { background: #f0f2f0; color: var(--muted); }
.td-job-badge.cancelled  { background: #fde8e8; color: var(--red); }

/* Action buttons — "Complete" (green) / "Navigate" (outlined) */
.td-job-complete-btn {
  background: var(--green); color: #fff; border: none;
  border-radius: 9px; padding: 8px 18px;
  font-family: 'DM Serif Display', serif; font-size: 13px;
  cursor: pointer; white-space: nowrap; transition: background .15s;
}
.td-job-complete-btn:hover { background: #155a32; }

.td-job-navigate-btn {
  background: var(--white); color: var(--ink);
  border: 1.5px solid var(--border);
  border-radius: 9px; padding: 7px 16px;
  font-family: 'DM Serif Display', serif; font-size: 13px;
  cursor: pointer; white-space: nowrap; transition: background .15s;
}
.td-job-navigate-btn:hover { background: var(--bg); }

.td-job-view-btn {
  background: var(--bg); color: var(--muted);
  border: 1.5px solid var(--border);
  border-radius: 9px; padding: 7px 16px;
  font-family: 'DM Serif Display', serif; font-size: 13px;
  cursor: pointer; white-space: nowrap;
}

.td-empty { text-align: center; padding: 30px; color: var(--pale); font-size: 13px; }

/* ── RESPONSIVE ── */
@media (max-width: 1024px) {
  .td-stats { grid-template-columns: repeat(2, 1fr); }
  .td-row   { grid-template-columns: 1fr; }
  #td-live-map { height: 250px; }
}
@media (max-width: 768px) {
  .td-sidebar { transform: translateX(-100%); }
  .td-sidebar.open { transform: translateX(0) !important; }
  .td-main { margin-left: 0 !important; }
  .td-hamburger { display: flex; }
  .td-crumb { display: none; }
  .td-ticker { display: none; }
  #td-live-map { height: 220px; }
}
@media (max-width: 600px) {
  .td-stats { grid-template-columns: 1fr 1fr; gap: 10px; }
  .td-content { padding: 14px; }
  .td-topbar { padding: 0 14px; }
  .td-stat-val { font-size: 24px; }
  #td-live-map { height: 200px; }
}
`

/* ─────────────────────────────────────────────
   SIDEBAR NAV ITEMS — exact labels from screenshot
───────────────────────────────────────────── */
const navItems = [
  { id: 'dashboard',  label: 'Dashboard',   d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'jobs',       label: 'My Jobs',     d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'route',      label: 'Daily Route', d: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
  { id: 'perf',       label: 'Performance', d: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'customers',  label: 'Customers',   d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'settings',   label: 'Settings',    d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
]

/* Default equipment — overridden by API */
const DEFAULT_EQUIP = [
  { label: 'Chemical Supply', pct: 78, cls: '' },
  { label: 'Battery Level',   pct: 91, cls: '' },
  { label: 'Spray Pressure',  pct: 55, cls: 'warn' },
  { label: 'Fuel Reserve',    pct: 22, cls: 'low' },
]

const AUTO_REFRESH_SECS = 30

/* Derive badge class from API status */
const jobBadgeClass = (status = '') => {
  const s = status.toLowerCase()
  if (s === 'in_progress')                          return 'inprogress'
  if (s === 'completed' || s === 'report_sent')     return 'done'
  if (s === 'cancelled')                            return 'cancelled'
  return 'pending'
}

/* Derive badge label shown on card */
const jobBadgeLabel = (status = '') => {
  const s = status.toLowerCase()
  if (s === 'in_progress')  return 'In Progress'
  if (s === 'completed' || s === 'report_sent') return 'Completed'
  if (s === 'cancelled')    return 'Cancelled'
  if (s === 'scheduled')    return 'Scheduled'
  return 'Pending'
}

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */
export default function TechnicianDashboard() {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()

  /* ── UI ── */
  const [active,      setActive]      = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  /* ── API data ── */
  const [jobs,      setJobs]      = useState([])
  const [equip,     setEquip]     = useState(DEFAULT_EQUIP)
  const [todayStr,  setTodayStr]  = useState('')
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')

  /* ── Geo ── */
  const [geoStatus, setGeoStatus] = useState('acquiring')
  const [coords,    setCoords]    = useState(null)
  const [accuracy,  setAccuracy]  = useState(null)

  /* ── Auto-refresh ── */
  const [countdown, setCountdown] = useState(AUTO_REFRESH_SECS)

  /* ── Refs ── */
  const mapRef    = useRef(null)
  const markerRef = useRef(null)
  const circleRef = useRef(null)
  const watchRef  = useRef(null)
  const tickRef   = useRef(null)
  const isMounted = useRef(true)

  const userName     = displayName(user)
  const userInitials = initials(userName)

  /* ══════════════════════════════════════════
     API: fetch dashboard data
     — mirrors supervisor's fetchDashboardData
  ══════════════════════════════════════════ */
  const fetchDashboardData = useCallback(async () => {
    setError('')
    try {
      /* Primary endpoint: /technician/dashboard/ */
      const res  = await api.get('/technician/dashboard/')
      const data = res.data

      console.log('Technician API DATA:', data)

      if (!isMounted.current) return

      setJobs(data.jobs || [])
      setTodayStr(
        data.today_date ||
        new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'short' })
      )

      /* Equipment from API if provided */
      if (data.equipment && Array.isArray(data.equipment) && data.equipment.length > 0) {
        setEquip(
          data.equipment.map(e => {
            const pct = e.level ?? e.pct ?? 0
            return {
              label: e.label || e.name,
              pct,
              cls: pct < 30 ? 'low' : pct < 60 ? 'warn' : '',
            }
          })
        )
      }

    } catch (primaryErr) {
      console.warn('Primary endpoint failed, falling back to /jobs/', primaryErr)

      /* Fallback: /jobs/ filtered to this technician */
      try {
        const jobsRes = await api.get('/jobs/')
        if (!isMounted.current) return

        const all  = jobsRes.data || []
        const mine = all.filter(j =>
          !j.technician_id ||
          j.technician_id === user?.id ||
          j.technician_name === userName
        )
        setJobs(mine.length > 0 ? mine : all)
        setTodayStr(
          new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'short' })
        )
        setError('')
      } catch (fallbackErr) {
        console.error('All API calls failed:', fallbackErr)
        if (isMounted.current)
          setError('Failed to load dashboard data. Check your connection.')
      }
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [user, userName])

  /* ══════════════════════════════════════════
     ACTION: Complete job
  ══════════════════════════════════════════ */
  const handleCompleteJob = async (jobId) => {
    try {
      await api.patch(`/jobs/${jobId}/complete/`, { status: 'completed' })
      fetchDashboardData()
      resetTimer()
    } catch (e) {
      alert(e.response?.data?.error || 'Could not update job status.')
    }
  }

  /* ══════════════════════════════════════════
     ACTION: Navigate to job address
  ══════════════════════════════════════════ */
  const handleNavigate = (job) => {
    const addr = encodeURIComponent(job.address || job.customer_address || job.location || '')
    if (addr) window.open(`https://www.google.com/maps/search/?api=1&query=${addr}`, '_blank')
  }

  /* ══════════════════════════════════════════
     AUTO-REFRESH — combine: auto + manual + after action
     (same pattern as Admin/Supervisor dashboards)
  ══════════════════════════════════════════ */
  const resetTimer = useCallback(() => {
    clearInterval(tickRef.current)
    setCountdown(AUTO_REFRESH_SECS)

    tickRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          fetchDashboardData()
          return AUTO_REFRESH_SECS
        }
        return c - 1
      })
    }, 1000)
  }, [fetchDashboardData])

  /* ══════════════════════════════════════════
     MOUNT
  ══════════════════════════════════════════ */
  useEffect(() => {
    isMounted.current = true
    fetchDashboardData().then(resetTimer)
    return () => {
      isMounted.current = false
      clearInterval(tickRef.current)
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current)
      if (mapRef.current)   { mapRef.current.remove(); mapRef.current = null }
    }
  }, [fetchDashboardData, resetTimer])

  /* ══════════════════════════════════════════
     LEAFLET MAP (free, no API key)
  ══════════════════════════════════════════ */
  useEffect(() => {
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
    if (window.L) { boot(); return }
    const s = document.createElement('script')
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    s.onload = boot
    document.head.appendChild(s)
  }, [])

  const initMap = () => {
    const L       = window.L
    const fallback = [23.0225, 72.5714]  // Ahmedabad default

    delete L.Icon.Default.prototype._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })

    const map = L.map('td-live-map').setView(fallback, 13)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)
    mapRef.current = map

    /* Pulsing green dot — technician location */
    const makeIcon = () => L.divIcon({
      className: '',
      html: `
        <div style="position:relative;width:20px;height:20px;">
          <div style="position:absolute;inset:0;border-radius:50%;
            background:rgba(26,107,60,.25);animation:ripTech 2s infinite;"></div>
          <div style="position:absolute;inset:4px;border-radius:50%;
            background:#1a6b3c;border:2px solid #fff;
            box-shadow:0 1px 4px rgba(0,0,0,.3);"></div>
        </div>
        <style>
          @keyframes ripTech{
            0%{transform:scale(1);opacity:.6;}
            100%{transform:scale(2.5);opacity:0;}
          }
        </style>`,
      iconSize: [20, 20], iconAnchor: [10, 10],
    })

    markerRef.current = L.marker(fallback, { icon: makeIcon() })
      .addTo(map)
      .bindPopup(`<b style="font-family:serif">📍 ${userName}</b>`)

    circleRef.current = L.circle(fallback, {
      radius: 80, color: '#1a6b3c',
      fillColor: '#1a6b3c', fillOpacity: 0.08, weight: 1,
    }).addTo(map)

    if (!navigator.geolocation) { setGeoStatus('error'); return }

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy: acc } = pos.coords
        const ll = [lat, lng]
        if (!isMounted.current) return
        setCoords({ lat: lat.toFixed(6), lng: lng.toFixed(6) })
        setAccuracy(Math.round(acc))
        setGeoStatus('live')
        markerRef.current?.setLatLng(ll)
        circleRef.current?.setLatLng(ll).setRadius(acc)
        map.panTo(ll, { animate: true, duration: 1.2 })
      },
      (err) => {
        console.warn('Geo:', err.message)
        if (isMounted.current) {
          setGeoStatus('error')
          setCoords({ lat: fallback[0].toFixed(6), lng: fallback[1].toFixed(6) })
        }
      },
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 12000 }
    )
  }

  /* ── Computed stats from API data ── */
  const totalJobs      = jobs.length
  const completedJobs  = jobs.filter(j => ['completed','report_sent'].includes(j.status)).length
  const inProgressJobs = jobs.filter(j => j.status === 'in_progress').length
  const pendingJobs    = jobs.filter(j => ['pending','scheduled'].includes(j.status)).length
  const remainingJobs  = inProgressJobs + pendingJobs

  const equipLowCount  = equip.filter(e => e.cls === 'low').length
  const equipGoodCount = equip.filter(e => e.cls === '').length

  const pillCls = geoStatus === 'live' ? 'live' : geoStatus === 'error' ? 'error' : 'acquiring'
  const pillTxt = geoStatus === 'live' ? 'Live Location'
    : geoStatus === 'error' ? 'Location Unavailable'
    : 'Acquiring GPS…'

  /* ── Logout ── */
  const handleLogout = async () => {
    clearInterval(tickRef.current)
    if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current)
    await logout()
    navigate('/login')
  }

  /* ════════════════════════════════════════
     RENDER
  ════════════════════════════════════════ */
  return (
    <>
      <style>{S}</style>
      <div className="td-root">

        {/* Mobile overlay */}
        <div
          className={`td-overlay${sidebarOpen ? ' show' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* ── SIDEBAR ── */}
        <aside className={`td-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="td-sb-logo">
            <div className="td-sb-icon">
              <svg viewBox="0 0 24 24">
                <path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/>
              </svg>
            </div>
            <span className="td-sb-brand">PestPro</span>
          </div>

          <nav className="td-sb-nav">
            {navItems.map(n => (
              <div
                key={n.id}
                className={`td-sb-item${active === n.id ? ' active' : ''}`}
                onClick={() => { setActive(n.id); setSidebarOpen(false) }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d={n.d}/>
                </svg>
                {n.label}
              </div>
            ))}
          </nav>

          {/* Bottom user row — real name from auth */}
          <div className="td-sb-user">
            <div className="td-sb-avatar">{userInitials}</div>
            <div style={{flex:1, minWidth:0}}>
              <div className="td-sb-uname"
                style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {userName}
              </div>
              <div className="td-sb-urole">Technician</div>
            </div>
            <button className="td-sb-logout" onClick={handleLogout} title="Logout">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div className="td-main">

          {/* ── TOPBAR — exact screenshot layout ── */}
          <div className="td-topbar">
            <div className="td-topbar-left">
              {/* Hamburger (mobile) */}
              <button className="td-hamburger" onClick={() => setSidebarOpen(o => !o)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              </button>
              {/* Breadcrumb: "My Dashboard › Daily Route" */}
              <span className="td-crumb">
                My Dashboard &nbsp;›&nbsp; <span>Daily Route</span>
              </span>
            </div>

            <div className="td-topbar-right">
              {/* "↻ in 13s" */}
              <span className={`td-ticker${countdown <= 10 ? ' soon' : ''}`}>
                ↻ in {countdown}s
              </span>

              {/* "Log Supplies" — outlined */}
              <button
                className="td-log-supplies-btn"
                onClick={() => { fetchDashboardData(); resetTimer() }}
              >
                Log Supplies
              </button>

              {/* "▶ Start Route" — green filled */}
              <button className="td-start-route-btn">
                <svg viewBox="0 0 24 24">
                  <path d="M5 3l14 9-14 9V3z"/>
                </svg>
                Start Route
              </button>
            </div>
          </div>

          {/* ── CONTENT ── */}
          <div className="td-content">

            {/* Page title + subtitle */}
            <div className="td-page-title">My Daily Route</div>
            <div className="td-page-sub">
              {todayStr || 'Today'} · {remainingJobs} Jobs Remaining
            </div>

            {error && <div className="td-error">{error}</div>}

            {loading ? (
              <div className="td-loading">
                <div className="td-spinner"/>
                Loading dashboard data…
              </div>
            ) : (
              <>
                {/* ── STAT CARDS ── */}
                <div className="td-stats">

                  {/* TODAY'S JOBS */}
                  <div className="td-stat">
                    <div className="td-stat-label">Today's Jobs</div>
                    <div className="td-stat-val">{totalJobs}</div>
                    <div className="td-stat-sub">
                      {inProgressJobs > 0 ? `${inProgressJobs} in progress now` : 'None active yet'}
                    </div>
                  </div>

                  {/* COMPLETED */}
                  <div className="td-stat">
                    <div className="td-stat-label">Completed</div>
                    <div className="td-stat-val">
                      {completedJobs}
                      <span className="td-stat-val-small">/{totalJobs}</span>
                    </div>
                    <div className="td-stat-sub">
                      {totalJobs > 0
                        ? `${Math.round((completedJobs / totalJobs) * 100)}% completion rate`
                        : 'No jobs assigned'}
                    </div>
                  </div>

                  {/* EQUIPMENT STATUS */}
                  <div className="td-stat">
                    <div className="td-stat-label">Equipment Status</div>
                    <div className={`td-stat-val${equipLowCount > 0 ? ' red' : equip.some(e=>e.cls==='warn') ? ' amber' : ' green'}`}>
                      {equipGoodCount}/{equip.length}
                    </div>
                    {equipLowCount > 0
                      ? <span className="td-stat-chip danger">Low Alert</span>
                      : equip.some(e => e.cls === 'warn')
                      ? <span className="td-stat-chip warn">Check Required</span>
                      : <span className="td-stat-chip">All Good ✓</span>
                    }
                  </div>

                  {/* GPS STATUS */}
                  <div className="td-stat">
                    <div className="td-stat-label">GPS Status</div>
                    <div className={`td-stat-val${geoStatus==='live'?' green':geoStatus==='error'?' red':' amber'}`}>
                      {geoStatus === 'live' ? 'Live' : geoStatus === 'error' ? 'Error' : 'Acquiring'}
                    </div>
                    {accuracy !== null
                      ? <span className="td-stat-chip">±{accuracy}m accuracy</span>
                      : <span className="td-stat-chip warn">Searching…</span>
                    }
                  </div>
                </div>

                {/* ── MAP + EQUIPMENT ROW ── */}
                <div className="td-row">

                  {/* Left: Live Map */}
                  <div className="td-map-card">
                    <div className="td-map-wrap">
                      <div className={`td-map-pill ${pillCls}`}>
                        <span className="td-pulse-dot"/>
                        {pillTxt}
                      </div>
                      <div id="td-live-map"/>
                    </div>
                    {/* Coords bar */}
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
                        <div className="td-loc-val">
                          {accuracy !== null ? `±${accuracy}m` : '—'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Equipment + Status */}
                  <div className="td-equip-col">

                    {/* Equipment card */}
                    <div className="td-equip-card">
                      {equip.map((e, i) => (
                        <div className="td-equip-row" key={i}>
                          <div className="td-equip-top">
                            <span className="td-equip-name">{e.label}</span>
                            <span className="td-equip-pct">{e.pct}%</span>
                          </div>
                          <div className="td-equip-bar">
                            <div
                              className={`td-equip-fill ${e.cls}`}
                              style={{width:`${e.pct}%`}}
                            />
                          </div>
                          <div className="td-equip-sub">
                            {e.cls === 'low'  ? 'Needs immediate refill'
                             : e.cls === 'warn' ? 'Monitor closely'
                             : 'Levels normal'}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Live Route Status card */}
                    <div className="td-status-card">
                      <div className="td-status-label">Live Route Status</div>
                      <div className="td-status-val">
                        {inProgressJobs > 0
                          ? `${inProgressJobs} Active Job${inProgressJobs > 1 ? 's' : ''}`
                          : 'No Active Jobs'}
                      </div>
                      <div className="td-status-sub">
                        {pendingJobs} pending · {completedJobs} completed · GPS {geoStatus}
                      </div>
                      <button
                        className="td-status-btn"
                        onClick={() => { fetchDashboardData(); resetTimer() }}
                      >
                        <svg viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                        Refresh Location
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── SCHEDULED JOBS ── */}
                <div className="td-jobs-hdr">
                  <div className="td-jobs-hdr-left">
                    <span className="td-jobs-title">Scheduled Jobs</span>
                    <span className="td-jobs-count">{totalJobs}</span>
                  </div>
                  <span className="td-jobs-sort">Sorted by: Route Order</span>
                </div>

                {jobs.length === 0 ? (
                  <div className="td-empty">No jobs assigned for today.</div>
                ) : (
                  jobs.map((job, i) => {
                    const bCls  = jobBadgeClass(job.status)
                    const bLbl  = jobBadgeLabel(job.status)
                    const isIP  = job.status === 'in_progress'
                    const isPending = ['pending','scheduled'].includes(job.status)

                    /* Build "JOB #3821 · TODAY" style label */
                    const jobLabel = `JOB #${job.id} · ${
                      isIP ? 'TODAY' :
                      i === 1 ? 'NEXT' :
                      (job.scheduled_date || 'SCHEDULED').toUpperCase()
                    }`

                    /* Service type formatted: "Pest Control" */
                    const serviceName = job.service_type
                      ? job.service_type.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase())
                      : job.title || 'Service Job'

                    return (
                      <div className="td-job-card" key={job.id || i}>
                        <div className="td-job-num">{i + 1}</div>

                        <div className="td-job-info">
                          <div className="td-job-lbl">{jobLabel}</div>
                          <div className="td-job-name">
                            {serviceName}
                            {job.customer_name ? ` – ${job.customer_name}` : ''}
                          </div>
                          <div className="td-job-addr">
                            {job.address || job.customer_address || job.location || '—'}
                          </div>
                        </div>

                        <div className="td-job-actions">
                          {/* Status badge */}
                          <span className={`td-job-badge ${bCls}`}>{bLbl}</span>

                          {/* Action button */}
                          {isIP && (
                            <button
                              className="td-job-complete-btn"
                              onClick={() => handleCompleteJob(job.id)}
                            >
                              Complete
                            </button>
                          )}
                          {isPending && (
                            <button
                              className="td-job-navigate-btn"
                              onClick={() => handleNavigate(job)}
                            >
                              Navigate
                            </button>
                          )}
                          {!isIP && !isPending && (
                            <button className="td-job-view-btn">
                              View
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}

              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}