import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

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

.ad-root {
  font-family: 'DM Serif Display', serif;
  min-height: 100vh;
  background: var(--bg);
  display: flex;
}

/* ── SIDEBAR ─────────────────────────────── */
.ad-sidebar {
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

.ad-sb-logo {
  padding: 16px 20px;
  display: flex; align-items: center; gap: 8px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.ad-sb-icon {
  width: 28px; height: 28px;
  background: var(--green);
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
}
.ad-sb-icon svg { width: 15px; height: 15px; fill: white; }
.ad-sb-brand { font-size: 16px; color: var(--ink); }

.ad-sb-nav { padding: 12px 10px; flex: 1; }
.ad-sb-item {
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
.ad-sb-item:hover { background: var(--bg); color: var(--ink); }
.ad-sb-item.active { background: var(--green-light); color: var(--green); }
.ad-sb-item svg { width: 16px; height: 16px; flex-shrink: 0; }

.ad-sb-user {
  padding: 14px 16px;
  border-top: 1px solid var(--border);
  display: flex; align-items: center; gap: 10px;
  flex-shrink: 0;
}
.ad-sb-avatar {
  width: 32px; height: 32px;
  background: var(--ink);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 12px;
  flex-shrink: 0;
}
.ad-sb-uname { font-size: 13px; color: var(--ink); line-height: 1.2; }
.ad-sb-urole { font-size: 11px; color: var(--pale); }
.ad-sb-logout {
  background: none; border: none; cursor: pointer;
  color: var(--pale); padding: 4px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  transition: color .15s, background .15s;
  flex-shrink: 0; margin-left: auto;
}
.ad-sb-logout:hover { color: var(--red); background: #fde8e8; }

/* Sidebar overlay for mobile */
.ad-overlay {
  display: none;
  position: fixed; inset: 0;
  background: rgba(0,0,0,.35);
  z-index: 150;
}
.ad-overlay.show { display: block; }

/* ── MAIN ─────────────────────────────────── */
.ad-main {
  flex: 1;
  margin-left: var(--sidebar-w);
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  transition: margin-left .25s ease;
}

/* ── TOPBAR ─────────────────────────────── */
.ad-topbar {
  background: var(--white);
  border-bottom: 1px solid var(--border);
  padding: 0 24px;
  height: 50px;
  display: flex; align-items: center; justify-content: space-between;
  position: sticky; top: 0; z-index: 100;
  flex-shrink: 0;
  gap: 12px;
}
.ad-topbar-left { display: flex; align-items: center; gap: 10px; }
.ad-hamburger {
  display: none;
  background: none; border: none; cursor: pointer;
  padding: 4px; border-radius: 6px; color: var(--ink);
}
.ad-hamburger svg { width: 20px; height: 20px; }
.ad-crumb { font-size: 13px; color: var(--pale); }
.ad-crumb span { color: var(--ink); font-size: 14px; }
.ad-topbar-right {
  display: flex; align-items: center; gap: 8px;
}
.ad-search {
  background: var(--bg);
  border: 1.5px solid var(--border);
  border-radius: 9px;
  padding: 7px 14px;
  font-family: 'DM Serif Display', serif;
  font-size: 13px;
  color: var(--ink);
  outline: none;
  width: 180px;
  transition: border-color .18s;
}
.ad-search:focus { border-color: var(--green); }
.ad-refresh-btn {
  background: var(--bg);
  color: var(--ink);
  border: 1.5px solid var(--border);
  border-radius: 9px;
  padding: 7px 14px;
  font-family: 'DM Serif Display', serif;
  font-size: 13px;
  cursor: pointer;
  display: flex; align-items: center; gap: 5px;
  transition: background .15s;
  white-space: nowrap;
}
.ad-refresh-btn:hover { background: #e8ebe8; }
.ad-refresh-btn.spinning svg { animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.ad-new-btn {
  background: var(--green);
  color: #fff;
  border: none;
  border-radius: 9px;
  padding: 8px 16px;
  font-family: 'DM Serif Display', serif;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: background .15s;
}
.ad-new-btn:hover { background: #155a32; }

/* Auto-refresh ticker */
.ad-ticker {
  font-size: 11px; color: var(--pale);
  white-space: nowrap;
}
.ad-ticker.active { color: var(--green); }

/* ── CONTENT ─────────────────────────────── */
.ad-content { padding: 22px 24px; flex: 1; }
.ad-page-title { font-size: 22px; color: var(--ink); margin-bottom: 3px; }
.ad-page-sub { font-size: 13px; color: var(--pale); margin-bottom: 20px; }

.ad-error {
  background: #fde8e8; color: var(--red);
  padding: 11px 16px; border-radius: 10px;
  font-size: 13px; margin-bottom: 16px;
}
.ad-loading {
  display: flex; align-items: center; justify-content: center;
  padding: 60px; color: var(--pale); font-size: 14px; gap: 10px;
}
.ad-spinner {
  width: 20px; height: 20px;
  border: 2px solid var(--border);
  border-top-color: var(--green);
  border-radius: 50%;
  animation: spin .8s linear infinite;
}

/* ── STAT CARDS ───────────────────────────── */
.ad-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}
.ad-stat {
  background: var(--white);
  border-radius: 14px;
  padding: 18px 20px;
  box-shadow: 0 1px 8px rgba(0,0,0,.05);
}
.ad-stat-label {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: .8px;
  color: var(--pale);
  margin-bottom: 8px;
}
.ad-stat-val {
  font-size: 28px;
  color: var(--ink);
  letter-spacing: -1px;
  line-height: 1;
}
.ad-stat-sub { font-size: 12px; color: var(--muted); margin-top: 5px; }
.ad-stat-up { color: var(--green); }
.ad-stat-chip {
  display: inline-flex; align-items: center;
  background: var(--green-light); color: var(--green);
  border-radius: 6px; padding: 2px 8px;
  font-size: 11px; margin-top: 6px;
}
.ad-stat-chip.danger { background: #fde8e8; color: var(--red); }

/* ── MAIN ROW: chart + metrics ───────────── */
.ad-row {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 16px;
  margin-bottom: 18px;
}

/* ── CARD BASE ────────────────────────────── */
.ad-card {
  background: var(--white);
  border-radius: 16px;
  padding: 20px 22px;
  box-shadow: 0 2px 12px rgba(0,0,0,.05);
}
.ad-card-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 16px;
}
.ad-card-title { font-size: 16px; color: var(--ink); }
.ad-card-sub { font-size: 12px; color: var(--pale); margin-top: 2px; }
.ad-chart-legend { display: flex; gap: 14px; }
.ad-legend-item {
  display: flex; align-items: center; gap: 5px;
  font-size: 12px; color: var(--muted);
}
.ad-legend-dot { width: 8px; height: 8px; border-radius: 50%; }

/* ── BAR CHART ─────────────────────────────── */
.ad-bars {
  display: flex; align-items: flex-end;
  gap: 8px; height: 140px; padding-bottom: 4px;
}
.ad-bar-wrap {
  display: flex; flex-direction: column;
  align-items: center; gap: 6px; flex: 1;
}
.ad-bar-group { display: flex; gap: 3px; align-items: flex-end; }
.ad-bar {
  border-radius: 4px 4px 0 0;
  width: 16px;
  transition: opacity .2s;
  cursor: pointer;
}
.ad-bar:hover { opacity: .75; }
.ad-bar-lbl { font-size: 10px; color: var(--pale); }

/* ── RIGHT METRICS COLUMN ─────────────────── */
.ad-metrics { display: flex; flex-direction: column; gap: 10px; }
.ad-metric-row {
  background: var(--white);
  border-radius: 12px; padding: 13px 15px;
  box-shadow: 0 1px 6px rgba(0,0,0,.05);
}
.ad-metric-top {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 7px;
}
.ad-metric-name { font-size: 13px; color: var(--ink); }
.ad-metric-pct { font-size: 12px; color: var(--pale); }
.ad-metric-bar { height: 6px; background: var(--bg); border-radius: 3px; overflow: hidden; }
.ad-metric-fill { height: 100%; border-radius: 3px; background: var(--green); }
.ad-metric-sub { font-size: 11.5px; color: var(--muted); margin-top: 6px; }

.ad-green-card {
  background: linear-gradient(135deg, var(--green-dark), var(--green));
  border-radius: 14px; padding: 18px; color: #fff;
}
.ad-green-card-title { font-size: 13px; opacity: .8; margin-bottom: 8px; }
.ad-green-card-val { font-size: 21px; margin-bottom: 6px; }
.ad-green-card-sub { font-size: 12px; opacity: .75; margin-bottom: 14px; line-height: 1.55; }
.ad-green-card-btn {
  width: 100%;
  background: rgba(255,255,255,.15);
  border: 1px solid rgba(255,255,255,.3);
  color: #fff;
  border-radius: 9px; padding: 9px;
  font-family: 'DM Serif Display', serif;
  font-size: 13px; cursor: pointer;
  transition: background .15s;
}
.ad-green-card-btn:hover { background: rgba(255,255,255,.25); }

/* ── ALERTS ───────────────────────────────── */
.ad-alerts-section { margin-bottom: 18px; }
.ad-section-hdr {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 12px;
}
.ad-section-title { font-size: 16px; color: var(--ink); display: flex; align-items: center; gap: 8px; }
.ad-section-link {
  font-size: 12.5px; color: var(--green);
  cursor: pointer; background: none; border: none;
  font-family: 'DM Serif Display', serif;
}
.ad-alert-card {
  background: var(--white);
  border-radius: 14px; padding: 13px 15px;
  display: flex; align-items: center; gap: 12px;
  box-shadow: 0 1px 5px rgba(0,0,0,.05);
  margin-bottom: 8px;
}
.ad-alert-icon {
  width: 32px; height: 32px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.ad-alert-icon.critical { background: #fde8e8; }
.ad-alert-icon.high     { background: #fff8ec; }
.ad-alert-icon.medium   { background: #eff6ff; }
.ad-alert-icon.low      { background: var(--bg); }
.ad-alert-info { flex: 1; min-width: 0; }
.ad-alert-rule  { font-size: 11px; color: var(--pale); text-transform: uppercase; letter-spacing: .5px; }
.ad-alert-title { font-size: 13.5px; color: var(--ink); margin: 2px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ad-alert-meta  { font-size: 12px; color: var(--muted); }
.ad-badge { font-size: 11px; padding: 3px 9px; border-radius: 6px; flex-shrink: 0; }
.ad-badge.critical { background: #fde8e8; color: var(--red); }
.ad-badge.high     { background: #fff8ec; color: var(--amber); }
.ad-badge.medium   { background: #eff6ff; color: var(--blue); }
.ad-badge.low      { background: var(--bg); color: var(--pale); }
.ad-resolve-btn {
  border: none; border-radius: 8px; padding: 6px 13px;
  font-family: 'DM Serif Display', serif; font-size: 12px;
  cursor: pointer; background: var(--green); color: #fff; flex-shrink: 0;
}
.ad-resolve-btn:hover { background: #155a32; }

/* ── RECENT JOBS ───────────────────────────── */
.ad-job-row {
  display: flex; align-items: center; gap: 12px;
  padding: 11px 0; border-bottom: 1px solid #f0f2f0;
}
.ad-job-row:last-child { border-bottom: none; }
.ad-job-av {
  width: 34px; height: 34px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 12px; flex-shrink: 0;
}
.ad-job-info { flex: 1; min-width: 0; }
.ad-job-name { font-size: 13.5px; color: var(--ink); }
.ad-job-meta { font-size: 12px; color: var(--pale); text-transform: capitalize; }
.ad-job-tag {
  display: inline-block; padding: 2px 9px; border-radius: 6px;
  font-size: 11px; text-transform: capitalize; flex-shrink: 0;
}
.ad-job-tag.completed,
.ad-job-tag.report_sent  { background: var(--green-light); color: var(--green); }
.ad-job-tag.in_progress  { background: #eff6ff; color: var(--blue); }
.ad-job-tag.scheduled    { background: #fff8ec; color: var(--amber); }
.ad-job-tag.cancelled    { background: #fde8e8; color: var(--red); }
.ad-job-amount { font-size: 14px; color: var(--ink); margin-left: 8px; flex-shrink: 0; }
.ad-empty { text-align: center; padding: 20px; color: var(--pale); font-size: 13px; }

/* ── RESPONSIVE ────────────────────────────── */
@media (max-width: 1024px) {
  .ad-stats { grid-template-columns: repeat(2, 1fr); }
  .ad-row { grid-template-columns: 1fr; }
  .ad-metrics { flex-direction: row; flex-wrap: wrap; }
  .ad-metrics > * { flex: 1 1 calc(50% - 5px); }
}

@media (max-width: 768px) {
  .ad-sidebar { transform: translateX(-100%); }
  .ad-sidebar.open { transform: translateX(0) !important; }
  .ad-main { margin-left: 0 !important; }
  .ad-hamburger { display: flex; }
  .ad-search { width: 120px; }
  .ad-crumb { display: none; }
  .ad-ticker { display: none; }
}

@media (max-width: 600px) {
  .ad-stats { grid-template-columns: 1fr 1fr; gap: 10px; }
  .ad-content { padding: 16px; }
  .ad-topbar { padding: 0 14px; }
  .ad-stat-val { font-size: 22px; }
  .ad-new-btn { display: none; }
  .ad-metrics { flex-direction: column; }
  .ad-metrics > * { flex: 1 1 100%; }
}
`

const navItems = [
  { id: 'overview',  label: 'Dashboard',       d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'staff',     label: 'Staff Management', d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'jobs',      label: 'Job Orders',       d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'customers', label: 'Customers',        d: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
  { id: 'alerts',    label: 'Alerts',           d: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { id: 'reports',   label: 'Reports',          d: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'emails',    label: 'Email Logs',       d: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { id: 'settings',  label: 'System Settings',  d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
]

const avatarColors  = ['#1a6b3c', '#1a4e8c', '#7b3fa0', '#e6a817', '#1a4d2e', '#2d9e5c']
const serviceTypes  = ['rodent_control','flying_insect','cockroach','termite','mosquito','general','bed_bug']
const serviceLabels = ['Rodent','Flying','Roach','Termite','Mosq.','General','BedBug']

const AUTO_REFRESH_SECS = 30

const displayName = (user) => {
  if (!user) return 'Admin'
  return (
    user.full_name ||
    user.name ||
    (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : null) ||
    user.first_name ||
    user.username ||
    'Admin'
  )
}

const initials = (name = '') => {
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return (parts[0]?.[0] || 'A').toUpperCase()
}

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [active,      setActive]      = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [jobs,        setJobs]        = useState([])
  const [alerts,      setAlerts]      = useState([])
  const [alertStats,  setAlertStats]  = useState(null)
  const [staff,       setStaff]       = useState([])
  const [customers,   setCustomers]   = useState([])
  const [emailStats,  setEmailStats]  = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [spinning,    setSpinning]    = useState(false)
  const [error,       setError]       = useState('')
  const [countdown,   setCountdown]   = useState(AUTO_REFRESH_SECS)

  const intervalRef = useRef(null)
  const tickRef     = useRef(null)
  const isMounted   = useRef(true)

  const fetchAllData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setSpinning(true)
    setError('')
    try {
      const [j, a, s, st, c, e] = await Promise.all([
        api.get('/jobs/'),
        api.get('/alerts/?is_resolved=false'),
        api.get('/alerts/stats/'),
        api.get('/staff/'),
        api.get('/customers/'),
        api.get('/emails/stats/'),
      ])
      if (!isMounted.current) return
      setJobs(j.data || [])
      setAlerts(a.data?.results || [])
      setAlertStats(s.data)
      setStaff(st.data || [])
      setCustomers(c.data || [])
      setEmailStats(e.data)
    } catch {
      if (isMounted.current)
        setError('Failed to load dashboard data. Check your connection and try refreshing.')
    } finally {
      if (isMounted.current) { setLoading(false); setSpinning(false) }
    }
  }, [])

  const resetTimer = useCallback(() => {
    clearInterval(intervalRef.current)
    clearInterval(tickRef.current)
    setCountdown(AUTO_REFRESH_SECS)
    intervalRef.current = setInterval(() => {
      fetchAllData(false)
      setCountdown(AUTO_REFRESH_SECS)
    }, AUTO_REFRESH_SECS * 1000)
    tickRef.current = setInterval(() => {
      setCountdown(c => (c <= 1 ? AUTO_REFRESH_SECS : c - 1))
    }, 1000)
  }, [fetchAllData])

  useEffect(() => {
    isMounted.current = true
    fetchAllData(false).then(resetTimer)
    return () => {
      isMounted.current = false
      clearInterval(intervalRef.current)
      clearInterval(tickRef.current)
    }
  }, [fetchAllData, resetTimer])

  const handleResolve = async (id) => {
    const notes = window.prompt('Enter resolution notes:')
    if (!notes) return
    try {
      await api.patch(`/alerts/${id}/resolve/`, { resolution_notes: notes })
      fetchAllData(false)
      resetTimer()
    } catch (e) {
      alert(e.response?.data?.error || 'Could not resolve alert.')
    }
  }

  const handleRefresh = () => { fetchAllData(true); resetTimer() }

  const handleLogout = async () => {
    clearInterval(intervalRef.current)
    clearInterval(tickRef.current)
    await logout()
    navigate('/login')
  }

  const totalJobs     = jobs.length
  const completedJobs = jobs.filter(j => ['completed','report_sent'].includes(j.status)).length
  const activeJobs    = jobs.filter(j => j.status === 'in_progress').length
  const scheduledJobs = jobs.filter(j => j.status === 'scheduled').length
  const revenue       = completedJobs * 2450

  const barData = serviceTypes.map(t => jobs.filter(j => j.service_type === t).length)
  const barDone = serviceTypes.map(t => jobs.filter(j => j.service_type === t && ['completed','report_sent'].includes(j.status)).length)
  const maxBar  = Math.max(...barData, 1)

  const techGroups = jobs.reduce((acc, job) => {
    const n = job.technician_name || 'Unassigned'
    if (!acc[n]) acc[n] = { total: 0, done: 0 }
    acc[n].total++
    if (['completed','report_sent'].includes(job.status)) acc[n].done++
    return acc
  }, {})
  const topTech = Object.entries(techGroups).sort((a, b) => b[1].done - a[1].done)[0]

  const userName     = displayName(user)
  const userInitials = initials(userName)

  return (
    <>
      <style>{S}</style>
      <div className="ad-root">

        {/* Mobile overlay */}
        <div
          className={`ad-overlay${sidebarOpen ? ' show' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* ── SIDEBAR ── */}
        <aside className={`ad-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="ad-sb-logo">
            <div className="ad-sb-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/></svg>
            </div>
            <span className="ad-sb-brand">PestPro</span>
          </div>

          <nav className="ad-sb-nav">
            {navItems.map(n => (
              <div
                key={n.id}
                className={`ad-sb-item${active === n.id ? ' active' : ''}`}
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
          <div className="ad-sb-user">
            <div className="ad-sb-avatar">{userInitials}</div>
            <div style={{flex:1, minWidth:0}}>
              <div className="ad-sb-uname" style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {userName}
              </div>
              <div className="ad-sb-urole">Administrator</div>
            </div>
            <button className="ad-sb-logout" onClick={handleLogout} title="Logout">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div className="ad-main">

          {/* Topbar — logout button removed */}
          <div className="ad-topbar">
            <div className="ad-topbar-left">
              <button className="ad-hamburger" onClick={() => setSidebarOpen(o => !o)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              </button>
              <span className="ad-crumb">
                Overview &nbsp;›&nbsp; <span>Service Analytics</span>
              </span>
            </div>

            <div className="ad-topbar-right">
              <span className={`ad-ticker${countdown <= 10 ? ' active' : ''}`}>
                ↻ in {countdown}s
              </span>
              <input className="ad-search" placeholder="Search anything…"/>
              <button
                className={`ad-refresh-btn${spinning ? ' spinning' : ''}`}
                onClick={handleRefresh}
                title="Refresh now"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Refresh
              </button>
              <button className="ad-new-btn">+ New Report</button>
            </div>
          </div>

          {/* Content */}
          <div className="ad-content">
            <div className="ad-page-title">Service Analytics</div>
            <div className="ad-page-sub">
              Real-time overview of all operations, revenue, and team performance.
            </div>

            {error && <div className="ad-error">{error}</div>}

            {loading ? (
              <div className="ad-loading">
                <div className="ad-spinner"/>
                Loading dashboard data…
              </div>
            ) : (
              <>
                {/* ── STATS ── */}
                <div className="ad-stats">
                  <div className="ad-stat">
                    <div className="ad-stat-label">Total Revenue</div>
                    <div className="ad-stat-val">₹{revenue.toLocaleString()}</div>
                    <div className="ad-stat-sub">
                      <span className="ad-stat-up">{completedJobs} completed jobs</span>
                    </div>
                  </div>

                  <div className="ad-stat">
                    <div className="ad-stat-label">Jobs This Period</div>
                    <div className="ad-stat-val">
                      {completedJobs}
                      <span style={{fontSize:16,color:'#a0b0a0'}}>/{totalJobs}</span>
                    </div>
                    <div className="ad-stat-sub">
                      {totalJobs > 0
                        ? `${Math.round((completedJobs / totalJobs) * 100)}% completion rate`
                        : 'No jobs yet'}
                    </div>
                  </div>

                  <div className="ad-stat">
                    <div className="ad-stat-label">Active Staff</div>
                    <div className="ad-stat-val">{staff.length}</div>
                    <div className="ad-stat-sub">
                      {staff.filter(s => s.role === 'technician').length} techs ·{' '}
                      {staff.filter(s => s.role === 'supervisor').length} supervisors
                    </div>
                  </div>

                  <div className="ad-stat">
                    <div className="ad-stat-label">Open Alerts</div>
                    <div className="ad-stat-val" style={{color: alertStats?.critical > 0 ? '#e74c3c' : '#1a2e1a'}}>
                      {alertStats?.unresolved_total || 0}
                    </div>
                    {alertStats?.critical > 0
                      ? <span className="ad-stat-chip danger">{alertStats.critical} Critical</span>
                      : <span className="ad-stat-chip">All Clear ✓</span>
                    }
                  </div>
                </div>

                {/* ── CHART ROW ── */}
                <div className="ad-row">
                  <div className="ad-card">
                    <div className="ad-card-header">
                      <div>
                        <div className="ad-card-title">Jobs by Service Type</div>
                        <div className="ad-card-sub">{totalJobs} total jobs across all categories</div>
                      </div>
                      <div className="ad-chart-legend">
                        <div className="ad-legend-item">
                          <div className="ad-legend-dot" style={{background:'#a8d5ba'}}/>Total
                        </div>
                        <div className="ad-legend-item">
                          <div className="ad-legend-dot" style={{background:'#1a6b3c'}}/>Done
                        </div>
                      </div>
                    </div>
                    <div className="ad-bars">
                      {barData.map((count, i) => (
                        <div className="ad-bar-wrap" key={i}>
                          <div className="ad-bar-group">
                            <div className="ad-bar" style={{height:`${(count/maxBar)*120}px`,background:'#a8d5ba',minHeight:count>0?4:0}} title={`Total: ${count}`}/>
                            <div className="ad-bar" style={{height:`${(barDone[i]/maxBar)*120}px`,background:'#1a6b3c',minHeight:barDone[i]>0?4:0}} title={`Done: ${barDone[i]}`}/>
                          </div>
                          <div className="ad-bar-lbl">{serviceLabels[i]}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="ad-metrics">
                    <div className="ad-metric-row">
                      <div className="ad-metric-top">
                        <div className="ad-metric-name">Top Performer — {topTech ? topTech[0] : 'No data'}</div>
                        <div className="ad-metric-pct">{topTech ? topTech[1].done : 0} jobs</div>
                      </div>
                      <div className="ad-metric-bar">
                        <div className="ad-metric-fill" style={{width: topTech ? `${Math.round((topTech[1].done/Math.max(topTech[1].total,1))*100)}%` : '0%'}}/>
                      </div>
                      <div className="ad-metric-sub">
                        {topTech ? `${topTech[1].total} assigned · ${topTech[1].done} completed` : 'Assign jobs to see performance'}
                      </div>
                    </div>

                    <div className="ad-metric-row">
                      <div className="ad-metric-top">
                        <div className="ad-metric-name">Total Customers</div>
                        <div className="ad-metric-pct">{customers.length}</div>
                      </div>
                      <div className="ad-metric-bar">
                        <div className="ad-metric-fill" style={{width:`${Math.min(customers.length*10,100)}%`,background:'#1a4e8c'}}/>
                      </div>
                      <div className="ad-metric-sub">
                        {customers.filter(c => c.is_active).length} active · {customers.filter(c => !c.is_active).length} inactive
                      </div>
                    </div>

                    <div className="ad-metric-row">
                      <div className="ad-metric-top">
                        <div className="ad-metric-name">Email Delivery Rate</div>
                        <div className="ad-metric-pct">
                          {emailStats?.total > 0 ? `${Math.round((emailStats.sent/emailStats.total)*100)}%` : '—'}
                        </div>
                      </div>
                      <div className="ad-metric-bar">
                        <div className="ad-metric-fill" style={{width:emailStats?.total>0?`${Math.round((emailStats.sent/emailStats.total)*100)}%`:'0%',background:'#2d9e5c'}}/>
                      </div>
                      <div className="ad-metric-sub">
                        {emailStats ? `${emailStats.sent||0} sent · ${emailStats.failed||0} failed` : 'No emails sent yet'}
                      </div>
                    </div>

                    <div className="ad-green-card">
                      <div className="ad-green-card-title">Live System Status</div>
                      <div className="ad-green-card-val">{activeJobs} Active Jobs</div>
                      <div className="ad-green-card-sub">
                        {scheduledJobs} scheduled · {completedJobs} completed · {alertStats?.unresolved_total || 0} alerts open
                      </div>
                      <button className="ad-green-card-btn" onClick={handleRefresh}>↻ Refresh All Data</button>
                    </div>
                  </div>
                </div>

                {/* ── ALERTS ── */}
                {alerts.length > 0 && (
                  <div className="ad-alerts-section">
                    <div className="ad-section-hdr">
                      <div className="ad-section-title">
                        Unresolved Alerts
                        <span style={{fontSize:12,color:'#e74c3c',background:'#fde8e8',padding:'2px 8px',borderRadius:6}}>
                          {alerts.length}
                        </span>
                      </div>
                      <button className="ad-section-link" onClick={() => setActive('alerts')}>View all →</button>
                    </div>
                    {alerts.slice(0, 4).map(alert => (
                      <div key={alert.id} className="ad-alert-card">
                        <div className={`ad-alert-icon ${alert.priority}`}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke={alert.priority==='critical'?'#e74c3c':alert.priority==='high'?'#e6a817':alert.priority==='medium'?'#3b82f6':'#9ca3af'}
                            strokeWidth="2"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                          </svg>
                        </div>
                        <div className="ad-alert-info">
                          <div className="ad-alert-rule">Rule {alert.rule_triggered} · {alert.pest_category}</div>
                          <div className="ad-alert-title">{alert.title}</div>
                          <div className="ad-alert-meta">{alert.customer_name} · {new Date(alert.created_at).toLocaleDateString()}</div>
                        </div>
                        <span className={`ad-badge ${alert.priority}`}>{alert.priority}</span>
                        <button className="ad-resolve-btn" onClick={() => handleResolve(alert.id)}>Resolve</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── RECENT JOBS ── */}
                <div className="ad-card">
                  <div className="ad-section-hdr">
                    <div className="ad-section-title">Recent Jobs</div>
                    <button className="ad-section-link" onClick={() => setActive('jobs')}>View all →</button>
                  </div>
                  {jobs.length === 0 ? (
                    <div className="ad-empty">No jobs yet. Create your first job to get started.</div>
                  ) : (
                    jobs.slice(0, 6).map((job, i) => (
                      <div key={job.id} className="ad-job-row">
                        <div className="ad-job-av" style={{background: avatarColors[i % avatarColors.length]}}>
                          {job.customer_name?.[0]?.toUpperCase() || 'C'}
                        </div>
                        <div className="ad-job-info">
                          <div className="ad-job-name">{job.customer_name || 'Unknown Customer'}</div>
                          <div className="ad-job-meta">
                            {job.service_type?.replace(/_/g,' ')} · Job #{job.id} · {job.technician_name || 'Unassigned'}
                          </div>
                        </div>
                        <span className={`ad-job-tag ${job.status}`}>{job.status?.replace(/_/g,' ')}</span>
                        <div className="ad-job-amount">
                          {['completed','report_sent'].includes(job.status) ? '₹2,450' : '—'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}