import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const displayName = (user) => {
  if (!user) return 'Supervisor'
  return (
    user.full_name ||
    user.name ||
    (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : null) ||
    user.first_name ||
    user.username ||
    'Supervisor'
  )
}

const initials = (name = '') => {
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return (parts[0]?.[0] || 'S').toUpperCase()
}

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */
const S = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --green:      #1a6b3c;
  --green-dark: #1a4d2e;
  --green-light:#edf6f1;
  --green-mid:  #a8d5ba;
  --ink:        #1a2e1a;
  --muted:      #7a8c7a;
  --pale:       #a0b0a0;
  --border:     #e8ebe8;
  --bg:         #f0f2f0;
  --white:      #ffffff;
  --red:        #e74c3c;
  --amber:      #e6a817;
  --blue:       #3b82f6;
  --sidebar-w:  220px;
}

.sup-root {
  font-family: 'DM Serif Display', serif;
  min-height: 100vh;
  background: var(--bg);
  display: flex;
}

/* ── SIDEBAR ─────────────────────────────── */
.sup-sidebar {
  width: var(--sidebar-w);
  background: var(--white);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  position: fixed;
  top: 0; left: 0; bottom: 0;
  z-index: 200;
  transition: transform .25s ease;
  overflow-y: auto;
}

.sup-sb-logo {
  padding: 16px 20px;
  display: flex; align-items: center; gap: 8px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.sup-sb-icon {
  width: 28px; height: 28px;
  background: var(--green);
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
}
.sup-sb-icon svg { width: 15px; height: 15px; fill: white; }
.sup-sb-brand { font-size: 16px; color: var(--ink); }

.sup-sb-nav { padding: 12px 10px; flex: 1; }
.sup-sb-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px;
  border-radius: 10px;
  cursor: pointer;
  margin-bottom: 2px;
  color: var(--muted);
  font-size: 13.5px;
  transition: background .15s, color .15s;
  white-space: nowrap;
}
.sup-sb-item:hover { background: var(--bg); color: var(--ink); }
.sup-sb-item.active { background: var(--green-light); color: var(--green); }
.sup-sb-item svg { width: 16px; height: 16px; flex-shrink: 0; }

.sup-sb-user {
  padding: 14px 16px;
  border-top: 1px solid var(--border);
  display: flex; align-items: center; gap: 10px;
  flex-shrink: 0;
}
.sup-sb-avatar {
  width: 32px; height: 32px;
  background: var(--ink);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 12px;
  flex-shrink: 0;
}
.sup-sb-uname { font-size: 13px; color: var(--ink); line-height: 1.2; }
.sup-sb-urole { font-size: 11px; color: var(--pale); }
.sup-sb-logout {
  background: none; border: none; cursor: pointer;
  color: var(--pale); padding: 4px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  transition: color .15s, background .15s;
  flex-shrink: 0; margin-left: auto;
}
.sup-sb-logout:hover { color: var(--red); background: #fde8e8; }

/* Mobile overlay */
.sup-overlay {
  display: none;
  position: fixed; inset: 0;
  background: rgba(0,0,0,.35);
  z-index: 150;
}
.sup-overlay.show { display: block; }

/* ── MAIN ─────────────────────────────────── */
.sup-main {
  flex: 1;
  margin-left: var(--sidebar-w);
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  transition: margin-left .25s ease;
}

/* ── TOPBAR ─────────────────────────────── */
.sup-topbar {
  background: var(--white);
  border-bottom: 1px solid var(--border);
  padding: 0 24px;
  height: 50px;
  display: flex; align-items: center; justify-content: space-between;
  position: sticky; top: 0; z-index: 100;
  flex-shrink: 0;
  gap: 12px;
}
.sup-topbar-left { display: flex; align-items: center; gap: 10px; }
.sup-hamburger {
  display: none;
  background: none; border: none; cursor: pointer;
  padding: 4px; border-radius: 6px; color: var(--ink);
}
.sup-hamburger svg { width: 20px; height: 20px; }
.sup-crumb { font-size: 13px; color: var(--pale); }
.sup-crumb span { color: var(--ink); font-size: 14px; }
.sup-topbar-right { display: flex; align-items: center; gap: 8px; }
.sup-ticker { font-size: 11px; color: var(--pale); white-space: nowrap; }
.sup-alert-btn {
  background: var(--green);
  color: #fff;
  border: none;
  border-radius: 9px;
  padding: 8px 18px;
  font-family: 'DM Serif Display', serif;
  font-size: 13px;
  cursor: pointer;
  display: flex; align-items: center; gap: 6px;
  white-space: nowrap;
  transition: background .15s;
}
.sup-alert-btn:hover { background: #155a32; }
.sup-alert-btn svg { width: 14px; height: 14px; stroke: white; fill: none; }

/* ── CONTENT ─────────────────────────────── */
.sup-content { padding: 22px 24px; flex: 1; }
.sup-page-title { font-size: 22px; color: var(--ink); margin-bottom: 3px; }
.sup-page-sub { font-size: 13px; color: var(--pale); margin-bottom: 20px; }

/* ── STAT CARDS ───────────────────────────── */
.sup-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}
.sup-stat {
  background: var(--white);
  border-radius: 14px;
  padding: 18px 20px;
  box-shadow: 0 1px 8px rgba(0,0,0,.05);
}
.sup-stat-label {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: .8px;
  color: var(--pale);
  margin-bottom: 8px;
}
.sup-stat-val {
  font-size: 28px;
  color: var(--ink);
  letter-spacing: -1px;
  line-height: 1;
}
.sup-stat-val.green { color: var(--green); }
.sup-stat-val.amber { color: var(--amber); }
.sup-stat-val.red   { color: var(--red); }
.sup-stat-sub { font-size: 12px; color: var(--muted); margin-top: 5px; }
.sup-stat-chip {
  display: inline-flex; align-items: center;
  background: var(--green-light); color: var(--green);
  border-radius: 6px; padding: 2px 8px;
  font-size: 11px; margin-top: 6px;
}
.sup-stat-chip.warn   { background: #fff8ec; color: var(--amber); }
.sup-stat-chip.danger { background: #fde8e8; color: var(--red); }

/* ── TWO-COL ROW ────────────────────────── */
.sup-row {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 16px;
  margin-bottom: 18px;
  align-items: start;
}

/* ── CARD BASE ────────────────────────────── */
.sup-card {
  background: var(--white);
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,.05);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.sup-card-inner { padding: 20px 22px; }
.sup-card-title {
  font-size: 11px; text-transform: uppercase;
  letter-spacing: .8px; color: var(--pale);
  margin-bottom: 14px;
}

/* ── MAP ────────────────────────────────── */
.sup-map-wrap { position: relative; }
#sup-live-map { width: 100%; height: 420px; display: block; }
.sup-map-pill {
  position: absolute; top: 10px; left: 10px; z-index: 999;
  background: var(--white); border-radius: 20px; padding: 5px 12px;
  font-size: 12px; display: flex; align-items: center; gap: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,.15);
  font-family: 'DM Serif Display', serif;
}
.sup-map-pill.live { color: var(--green); }
.sup-map-pill.acquiring { color: var(--amber); }
.sup-map-pill.error { color: var(--red); }
.sup-pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; animation: supPulse 1.8s infinite; }
@keyframes supPulse { 0%,100%{opacity:1;transform:scale(1);}50%{opacity:.4;transform:scale(1.4);} }
.sup-loc-bar { display: flex; border-top: 1px solid #edf1ed; }
.sup-loc-cell { flex: 1; padding: 10px 14px; border-right: 1px solid #edf1ed; }
.sup-loc-cell:last-child { border-right: none; }
.sup-loc-label { font-size: 10px; color: var(--pale); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 3px; }
.sup-loc-val { font-size: 13px; color: var(--ink); }

/* ── RIGHT METRICS COLUMN ─────────────────── */
.sup-metrics-col { display: flex; flex-direction: column; gap: 10px; }

/* Technician list */
.sup-tech-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 0; border-bottom: 1px solid #f0f2f0;
}
.sup-tech-row:last-child { border-bottom: none; }
.sup-tech-av {
  width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; color: #fff; flex-shrink: 0;
}
.sup-tech-info { flex: 1; min-width: 0; }
.sup-tech-name { font-size: 13px; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sup-tech-job  { font-size: 11px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sup-status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.sup-status-dot.active  { background: var(--green); }
.sup-status-dot.idle    { background: var(--amber); }
.sup-status-dot.offline { background: #ccc; }

/* Green summary card */
.sup-green-card {
  background: linear-gradient(135deg, var(--green-dark), var(--green));
  border-radius: 14px; padding: 18px; color: #fff;
}
.sup-green-card-title { font-size: 13px; opacity: .8; margin-bottom: 8px; }
.sup-green-card-val   { font-size: 21px; margin-bottom: 6px; }
.sup-green-card-sub   { font-size: 12px; opacity: .75; margin-bottom: 14px; line-height: 1.55; }
.sup-green-card-btn {
  width: 100%;
  background: rgba(255,255,255,.15);
  border: 1px solid rgba(255,255,255,.3);
  color: #fff;
  border-radius: 9px; padding: 9px;
  font-family: 'DM Serif Display', serif;
  font-size: 13px; cursor: pointer;
  transition: background .15s;
}
.sup-green-card-btn:hover { background: rgba(255,255,255,.25); }

/* ── ALERTS SECTION ─────────────────────── */
.sup-section-hdr {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 12px;
}
.sup-section-title { font-size: 16px; color: var(--ink); display: flex; align-items: center; gap: 8px; }
.sup-section-sub { font-size: 12px; color: var(--pale); }

.sup-alert-card {
  background: var(--white);
  border-radius: 14px; padding: 14px 16px;
  margin-bottom: 10px;
  display: flex; align-items: center; gap: 12px;
  box-shadow: 0 1px 6px rgba(0,0,0,.05);
}
.sup-alert-icon {
  width: 32px; height: 32px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.sup-alert-icon.warn { background: #fff8ec; }
.sup-alert-icon.err  { background: #fde8e8; }
.sup-alert-icon.info { background: var(--green-light); }
.sup-alert-icon svg  { width: 14px; height: 14px; }
.sup-alert-info { flex: 1; min-width: 0; }
.sup-alert-lbl { font-size: 11px; color: var(--pale); text-transform: uppercase; letter-spacing: .6px; }
.sup-alert-msg { font-size: 13.5px; color: var(--ink); margin: 2px 0; }

.sup-badge { font-size: 11.5px; padding: 3px 10px; border-radius: 6px; flex-shrink: 0; }
.sup-badge.warn   { background: #fff8ec; color: var(--amber); }
.sup-badge.err    { background: #fde8e8; color: var(--red); }
.sup-badge.ok     { background: var(--green-light); color: var(--green); }

.sup-btn { border: none; border-radius: 8px; padding: 7px 14px; font-family: 'DM Serif Display', serif; font-size: 12.5px; cursor: pointer; flex-shrink: 0; transition: background .15s; }
.sup-btn.primary   { background: var(--green); color: #fff; }
.sup-btn.primary:hover  { background: #155a32; }
.sup-btn.secondary { background: var(--bg); color: #3d4f3d; }
.sup-btn.secondary:hover { background: #e2e8e2; }

/* ── LOADING ─────────────────────────────── */
.sup-loading {
  display: flex; align-items: center; justify-content: center;
  padding: 60px; color: var(--pale); font-size: 14px; gap: 10px;
}
.sup-spinner {
  width: 20px; height: 20px;
  border: 2px solid var(--border);
  border-top-color: var(--green);
  border-radius: 50%;
  animation: supSpin .8s linear infinite;
}
@keyframes supSpin { to { transform: rotate(360deg); } }

/* ── RESPONSIVE ─────────────────────────── */
@media (max-width: 1024px) {
  .sup-stats { grid-template-columns: repeat(2, 1fr); }
  .sup-row { grid-template-columns: 1fr; }
  #sup-live-map { height: 280px; }
  .sup-metrics-col { flex-direction: row; flex-wrap: wrap; }
  .sup-metrics-col > * { flex: 1 1 calc(50% - 5px); }
}
@media (max-width: 768px) {
  .sup-sidebar { transform: translateX(-100%); }
  .sup-sidebar.open { transform: translateX(0) !important; }
  .sup-main { margin-left: 0 !important; }
  .sup-hamburger { display: flex; }
  .sup-crumb { display: none; }
  .sup-ticker { display: none; }
  #sup-live-map { height: 220px; }
}
@media (max-width: 600px) {
  .sup-stats { grid-template-columns: 1fr 1fr; gap: 10px; }
  .sup-content { padding: 16px; }
  .sup-topbar { padding: 0 14px; }
  .sup-stat-val { font-size: 22px; }
  .sup-metrics-col { flex-direction: column; }
  .sup-metrics-col > * { flex: 1 1 100%; }
  #sup-live-map { height: 200px; }
}
`

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const navItems = [
  { id: 'overview', label: 'Overview',      d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'team',     label: 'Team Activity', d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'jobs',     label: 'All Jobs',      d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'reports',  label: 'Reports',       d: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'alerts',   label: 'Alerts',        d: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { id: 'settings', label: 'Settings',      d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
]

const techs = [
  { initials: 'MJ', color: '#1a6b3c', name: 'Marcus Johnson',  job: 'Pest Control – Sycamore Park',   status: 'active'  },
  { initials: 'AL', color: '#1a4e8c', name: 'Amy Lee',          job: 'Termite Inspection – Clayfield',  status: 'active'  },
  { initials: 'RK', color: '#7b3fa0', name: 'Raj Kumar',        job: 'Rodent Proofing – Eastview',      status: 'active'  },
  { initials: 'TD', color: '#e6a817', name: 'Tom Davies',       job: 'En route – Northfields',          status: 'idle'    },
  { initials: 'NP', color: '#5a6e5a', name: 'Nina Patel',       job: 'Break – Westside',                status: 'offline' },
]

const alertItems = [
  {
    type: 'warn', label: 'Low Supply · 12 min ago',
    msg: 'Marcus Johnson – Fuel reserve critical at 22%',
    badge: 'Warning', badgeCls: 'warn', btn: 'View', btnCls: 'secondary',
    iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    iconColor: '#e6a817',
  },
  {
    type: 'err', label: 'Missed Check-in · 34 min ago',
    msg: 'Tom Davies has not checked in for 45 minutes',
    badge: 'Urgent', badgeCls: 'err', btn: 'Contact', btnCls: 'primary',
    iconPath: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    iconColor: '#e74c3c',
  },
  {
    type: 'info', label: 'Job Complete · 1 hr ago',
    msg: 'Amy Lee completed Termite Inspection at Clayfield',
    badge: 'Info', badgeCls: 'ok', btn: 'Review', btnCls: 'secondary',
    iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    iconColor: '#1a6b3c',
  },
]

const TECH_OFFSETS = [
  [0.002,  0.003],
  [-0.003, 0.002],
  [0.004, -0.002],
  [-0.001,-0.004],
  [0.003,  0.001],
]

const AUTO_REFRESH_SECS = 30

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */
export default function SupervisorDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [active,      setActive]      = useState('team')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [geoStatus,   setGeoStatus]   = useState('acquiring')
  const [coords,      setCoords]      = useState(null)
  const [accuracy,    setAccuracy]    = useState(null)
  const [countdown,   setCountdown]   = useState(AUTO_REFRESH_SECS)

  const mapRef    = useRef(null)
  const markerRef = useRef(null)
  const circleRef = useRef(null)
  const watchRef  = useRef(null)
  const tickRef   = useRef(null)

  const userName     = displayName(user)
  const userInitials = initials(userName)

  const activeTechs  = techs.filter(t => t.status === 'active').length
  const idleTechs    = techs.filter(t => t.status === 'idle').length
  const pendingAlerts = alertItems.filter(a => a.type !== 'info').length

  /* ── Auto-refresh countdown ── */
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setCountdown(c => (c <= 1 ? AUTO_REFRESH_SECS : c - 1))
    }, 1000)
    return () => clearInterval(tickRef.current)
  }, [])

  /* ── Logout ── */
  const handleLogout = async () => {
    if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current)
    clearInterval(tickRef.current)
    await logout()
    navigate('/login')
  }

  /* ── Leaflet map ── */
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
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [])

  const initMap = () => {
    const L = window.L
    const fallback = [23.0225, 72.5714]

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

    // Supervisor — green pulsing dot
    const supIcon = () => L.divIcon({
      className: '',
      html: `
        <div style="position:relative;width:22px;height:22px;">
          <div style="position:absolute;inset:0;border-radius:50%;background:rgba(26,107,60,.2);animation:ripSup 2s infinite;"></div>
          <div style="position:absolute;inset:4px;border-radius:50%;background:#1a6b3c;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);"></div>
        </div>
        <style>@keyframes ripSup{0%{transform:scale(1);opacity:.6;}100%{transform:scale(2.5);opacity:0;}}</style>
      `,
      iconSize: [22, 22], iconAnchor: [11, 11],
    })

    markerRef.current = L.marker(fallback, { icon: supIcon() })
      .addTo(map)
      .bindPopup('<b style="font-family:serif">📍 You are here (Supervisor)</b>')

    circleRef.current = L.circle(fallback, {
      radius: 80, color: '#1a6b3c',
      fillColor: '#1a6b3c', fillOpacity: 0.08, weight: 1,
    }).addTo(map)

    // Technician markers
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

        {/* Mobile overlay */}
        <div
          className={`sup-overlay${sidebarOpen ? ' show' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* ── SIDEBAR ── */}
        <aside className={`sup-sidebar${sidebarOpen ? ' open' : ''}`}>
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
                onClick={() => { setActive(n.id); setSidebarOpen(false) }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d={n.d}/>
                </svg>
                {n.label}
              </div>
            ))}
          </nav>

          {/* ── USER + LOGOUT ICON ── */}
          <div className="sup-sb-user">
            <div className="sup-sb-avatar">{userInitials}</div>
            <div style={{flex:1, minWidth:0}}>
              <div className="sup-sb-uname" style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {userName}
              </div>
              <div className="sup-sb-urole">Supervisor</div>
            </div>
            <button className="sup-sb-logout" onClick={handleLogout} title="Logout">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div className="sup-main">

          {/* Topbar */}
          <div className="sup-topbar">
            <div className="sup-topbar-left">
              <button className="sup-hamburger" onClick={() => setSidebarOpen(o => !o)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              </button>
              <span className="sup-crumb">
                Team &nbsp;›&nbsp; <span>Team Activity</span>
              </span>
            </div>
            <div className="sup-topbar-right">
              <span className="sup-ticker">↻ in {countdown}s</span>
              <button className="sup-alert-btn">
                <svg viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
                Send Alert
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="sup-content">
            <div className="sup-page-title">Team Activity</div>
            <div className="sup-page-sub">
              Tuesday, 24 Apr · {activeTechs} Technicians Active
            </div>

            {/* ── STATS ── */}
            <div className="sup-stats">
              <div className="sup-stat">
                <div className="sup-stat-label">Active Techs</div>
                <div className="sup-stat-val green">{activeTechs}</div>
                <div className="sup-stat-sub">On route now</div>
              </div>

              <div className="sup-stat">
                <div className="sup-stat-label">Pending Alerts</div>
                <div className="sup-stat-val amber">{pendingAlerts}</div>
                {pendingAlerts > 0
                  ? <span className="sup-stat-chip warn">{pendingAlerts} require action</span>
                  : <span className="sup-stat-chip">All Clear ✓</span>
                }
              </div>

              <div className="sup-stat">
                <div className="sup-stat-label">Open Jobs</div>
                <div className="sup-stat-val">12</div>
                <div className="sup-stat-sub">Across all teams</div>
              </div>

              <div className="sup-stat">
                <div className="sup-stat-label">Avg Response</div>
                <div className="sup-stat-val">18m</div>
                <div className="sup-stat-sub">Today's average</div>
              </div>
            </div>

            {/* ── MAP + TEAM LIST ROW ── */}
            <div className="sup-row">
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

              {/* Right column: tech list + summary card */}
              <div className="sup-metrics-col">
                <div className="sup-card">
                  <div className="sup-card-inner">
                    <div className="sup-card-title">Active Technicians</div>
                    {techs.map((t, i) => (
                      <div className="sup-tech-row" key={i}>
                        <div className="sup-tech-av" style={{background: t.color}}>{t.initials}</div>
                        <div className="sup-tech-info">
                          <div className="sup-tech-name">{t.name}</div>
                          <div className="sup-tech-job">{t.job}</div>
                        </div>
                        <div className={`sup-status-dot ${t.status}`}/>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="sup-green-card">
                  <div className="sup-green-card-title">Live Team Status</div>
                  <div className="sup-green-card-val">{activeTechs} Active</div>
                  <div className="sup-green-card-sub">
                    {idleTechs} idle · {techs.filter(t => t.status === 'offline').length} offline · {pendingAlerts} alerts open
                  </div>
                  <button className="sup-green-card-btn">↻ Refresh Team Data</button>
                </div>
              </div>
            </div>

            {/* ── ALERTS ── */}
            <div className="sup-section-hdr">
              <div className="sup-section-title">
                Recent Alerts
                {pendingAlerts > 0 && (
                  <span style={{fontSize:12,color:'#e74c3c',background:'#fde8e8',padding:'2px 8px',borderRadius:6}}>
                    {pendingAlerts}
                  </span>
                )}
              </div>
              <span className="sup-section-sub">SORTED BY: TIME</span>
            </div>
            {alertItems.map((a, i) => (
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
    </>
  )
}