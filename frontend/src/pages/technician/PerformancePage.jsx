import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

const S = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --green:       #1a6b3c;
  --green-dark:  #1a4d2e;
  --green-light: #edf6f1;
  --green-mid:   #a8d5ba;
  --ink:         #1a2e1a;
  --muted:       #7a8c7a;
  --pale:        #a0b0a0;
  --border:      #e8ebe8;
  --bg:          #f0f2f0;
  --white:       #ffffff;
  --red:         #e74c3c;
  --amber:       #e6a817;
  --blue:        #3b82f6;
  --sidebar-w:   220px;
}

.tp-root {
  font-family: 'DM Serif Display', serif;
  min-height: 100vh;
  background: var(--bg);
  display: flex;
}

/* ── SIDEBAR ── */
.tp-sidebar {
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
.tp-sb-logo {
  padding: 16px 20px;
  display: flex; align-items: center; gap: 8px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.tp-sb-icon {
  width: 28px; height: 28px;
  background: var(--green); border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
}
.tp-sb-icon svg { width: 15px; height: 15px; fill: white; }
.tp-sb-brand { font-size: 16px; color: var(--ink); }
.tp-sb-nav { padding: 12px 10px; flex: 1; }
.tp-sb-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; border-radius: 10px;
  cursor: pointer; margin-bottom: 2px;
  color: var(--muted); font-size: 13.5px;
  transition: background .15s, color .15s;
  white-space: nowrap;
}
.tp-sb-item:hover { background: var(--bg); color: var(--ink); }
.tp-sb-item.active { background: var(--green-light); color: var(--green); }
.tp-sb-item svg { width: 16px; height: 16px; flex-shrink: 0; }
.tp-sb-user {
  padding: 14px 16px;
  border-top: 1px solid var(--border);
  display: flex; align-items: center; gap: 10px;
  flex-shrink: 0;
}
.tp-sb-avatar {
  width: 32px; height: 32px;
  background: var(--green); border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 12px; flex-shrink: 0;
}
.tp-sb-uname { font-size: 13px; color: var(--ink); line-height: 1.2; }
.tp-sb-urole { font-size: 11px; color: var(--pale); }
.tp-sb-logout {
  background: none; border: none; cursor: pointer;
  color: var(--pale); padding: 4px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  transition: color .15s, background .15s;
  flex-shrink: 0; margin-left: auto;
}
.tp-sb-logout:hover { color: var(--red); background: #fde8e8; }
.tp-overlay {
  display: none; position: fixed; inset: 0;
  background: rgba(0,0,0,.35); z-index: 150;
}
.tp-overlay.show { display: block; }

/* ── MAIN ── */
.tp-main {
  flex: 1; margin-left: var(--sidebar-w);
  display: flex; flex-direction: column;
  min-height: 100vh;
}
.tp-topbar {
  background: var(--white);
  border-bottom: 1px solid var(--border);
  padding: 0 24px; height: 50px;
  display: flex; align-items: center; justify-content: space-between;
  position: sticky; top: 0; z-index: 100;
  flex-shrink: 0; gap: 12px;
}
.tp-topbar-left { display: flex; align-items: center; gap: 10px; }
.tp-hamburger {
  display: none; background: none; border: none;
  cursor: pointer; padding: 4px; border-radius: 6px; color: var(--ink);
}
.tp-hamburger svg { width: 20px; height: 20px; }
.tp-crumb { font-size: 13px; color: var(--pale); }
.tp-crumb span { color: var(--ink); font-size: 14px; }
.tp-topbar-right { display: flex; align-items: center; gap: 8px; }
.tp-refresh-btn {
  background: var(--bg); color: var(--ink);
  border: 1.5px solid var(--border); border-radius: 9px;
  padding: 7px 14px; font-family: 'DM Serif Display', serif;
  font-size: 13px; cursor: pointer;
  display: flex; align-items: center; gap: 5px;
  transition: background .15s; white-space: nowrap;
}
.tp-refresh-btn:hover { background: #e8ebe8; }
.tp-refresh-btn.spinning svg { animation: tpSpin .7s linear infinite; }
@keyframes tpSpin { to { transform: rotate(360deg); } }

/* ── CONTENT ── */
.tp-content { padding: 22px 24px; flex: 1; }
.tp-page-title { font-size: 22px; color: var(--ink); margin-bottom: 3px; }
.tp-page-sub { font-size: 13px; color: var(--pale); margin-bottom: 20px; }
.tp-error {
  background: #fde8e8; color: var(--red);
  padding: 11px 16px; border-radius: 10px;
  font-size: 13px; margin-bottom: 16px;
}
.tp-loading {
  display: flex; align-items: center; justify-content: center;
  padding: 60px; color: var(--pale); font-size: 14px; gap: 10px;
}
.tp-spinner {
  width: 20px; height: 20px;
  border: 2px solid var(--border);
  border-top-color: var(--green);
  border-radius: 50%;
  animation: tpSpin .8s linear infinite;
}

/* ── PERIOD TABS ── */
.tp-period-tabs {
  display: flex; gap: 6px; margin-bottom: 20px; flex-wrap: wrap;
}
.tp-period-tab {
  padding: 7px 18px; border-radius: 20px;
  font-family: 'DM Serif Display', serif; font-size: 13px;
  cursor: pointer; border: 1.5px solid var(--border);
  background: var(--white); color: var(--muted);
  transition: all .15s; white-space: nowrap;
}
.tp-period-tab:hover { border-color: var(--green); color: var(--green); }
.tp-period-tab.active { background: var(--green); color: #fff; border-color: var(--green); }

/* Custom date range row */
.tp-date-row {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 20px; flex-wrap: wrap;
}
.tp-date-input {
  border: 1.5px solid var(--border); border-radius: 9px;
  padding: 7px 14px; font-family: 'DM Serif Display', serif;
  font-size: 13px; color: var(--ink); outline: none;
  background: var(--white); transition: border-color .2s;
}
.tp-date-input:focus { border-color: var(--green); }
.tp-date-apply {
  background: var(--green); color: #fff; border: none;
  border-radius: 9px; padding: 8px 16px;
  font-family: 'DM Serif Display', serif; font-size: 13px;
  cursor: pointer; transition: background .15s;
}
.tp-date-apply:hover { background: #155a32; }
.tp-date-label { font-size: 13px; color: var(--muted); }

/* ── STAT CARDS ── */
.tp-stats {
  display: grid; grid-template-columns: repeat(5, 1fr);
  gap: 14px; margin-bottom: 20px;
}
.tp-stat {
  background: var(--white); border-radius: 14px;
  padding: 18px 20px; box-shadow: 0 1px 8px rgba(0,0,0,.05);
}
.tp-stat-label {
  font-size: 10px; text-transform: uppercase;
  letter-spacing: .8px; color: var(--pale); margin-bottom: 8px;
}
.tp-stat-val {
  font-size: 26px; color: var(--ink);
  letter-spacing: -1px; line-height: 1;
}
.tp-stat-val.green { color: var(--green); }
.tp-stat-val.amber { color: var(--amber); }
.tp-stat-val.red   { color: var(--red); }
.tp-stat-val.blue  { color: var(--blue); }
.tp-stat-sub { font-size: 12px; color: var(--muted); margin-top: 5px; }
.tp-stat-chip {
  display: inline-flex; align-items: center;
  background: var(--green-light); color: var(--green);
  border-radius: 6px; padding: 2px 8px;
  font-size: 11px; margin-top: 6px;
}
.tp-stat-chip.amber { background: #fff8ec; color: var(--amber); }
.tp-stat-chip.red   { background: #fde8e8; color: var(--red); }
.tp-stat-chip.blue  { background: #eff6ff; color: var(--blue); }

/* ── CARD BASE ── */
.tp-card {
  background: var(--white); border-radius: 16px;
  padding: 20px 22px; box-shadow: 0 2px 12px rgba(0,0,0,.05);
  margin-bottom: 18px;
}
.tp-card-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 16px;
}
.tp-card-title { font-size: 16px; color: var(--ink); }
.tp-card-sub { font-size: 12px; color: var(--pale); margin-top: 2px; }

/* ── TWO-COLUMN ROW ── */
.tp-row {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 16px; margin-bottom: 18px;
}

/* ── PROGRESS BAR ── */
.tp-prog-wrap { margin-bottom: 14px; }
.tp-prog-top {
  display: flex; justify-content: space-between;
  align-items: center; margin-bottom: 7px;
}
.tp-prog-label { font-size: 13px; color: var(--ink); }
.tp-prog-pct { font-size: 12px; color: var(--pale); }
.tp-prog-bar {
  height: 8px; background: var(--bg);
  border-radius: 4px; overflow: hidden;
}
.tp-prog-fill {
  height: 100%; border-radius: 4px;
  background: var(--green);
  transition: width .6s ease;
}
.tp-prog-fill.amber { background: var(--amber); }
.tp-prog-fill.blue  { background: var(--blue); }
.tp-prog-fill.red   { background: var(--red); }
.tp-prog-sub { font-size: 11.5px; color: var(--muted); margin-top: 5px; }

/* ── RECENT JOBS TABLE ── */
.tp-job-row {
  display: flex; align-items: center; gap: 12px;
  padding: 11px 0; border-bottom: 1px solid var(--border);
}
.tp-job-row:last-child { border-bottom: none; }
.tp-job-av {
  width: 34px; height: 34px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 12px; flex-shrink: 0;
  background: var(--green);
}
.tp-job-info { flex: 1; min-width: 0; }
.tp-job-name { font-size: 13.5px; color: var(--ink); }
.tp-job-meta { font-size: 12px; color: var(--pale); text-transform: capitalize; }
.tp-job-tag {
  display: inline-block; padding: 2px 10px; border-radius: 6px;
  font-size: 11px; text-transform: capitalize; flex-shrink: 0;
}
.tp-job-tag.completed,
.tp-job-tag.report_sent { background: var(--green-light); color: var(--green); }
.tp-job-tag.in_progress { background: #eff6ff; color: var(--blue); }
.tp-job-tag.scheduled   { background: #fff8ec; color: var(--amber); }
.tp-job-tag.cancelled   { background: #fde8e8; color: var(--red); }
.tp-job-time { font-size: 11.5px; color: var(--pale); margin-left: 8px; flex-shrink: 0; }

/* ── ALERT ROW ── */
.tp-alert-row {
  display: flex; align-items: center; gap: 12px;
  padding: 11px 14px; border-radius: 10px;
  background: #fff8ec; border-left: 3px solid var(--amber);
  margin-bottom: 8px;
}
.tp-alert-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--amber); flex-shrink: 0;
}
.tp-alert-dot.critical { background: var(--red); }
.tp-alert-dot.medium   { background: var(--blue); }
.tp-alert-row.critical { background: #fde8e8; border-left-color: var(--red); }
.tp-alert-text { font-size: 13px; color: var(--ink); flex: 1; }
.tp-alert-meta { font-size: 11px; color: var(--muted); }
.tp-alert-badge {
  font-size: 11px; padding: 2px 9px; border-radius: 6px; flex-shrink: 0;
}
.tp-alert-badge.critical { background: #fde8e8; color: var(--red); }
.tp-alert-badge.high     { background: #fff8ec; color: var(--amber); }
.tp-alert-badge.medium   { background: #eff6ff; color: var(--blue); }

/* ── GREEN HIGHLIGHT CARD ── */
.tp-green-card {
  background: linear-gradient(135deg, var(--green-dark), var(--green));
  border-radius: 14px; padding: 20px 22px; color: #fff;
  margin-bottom: 18px;
  display: flex; justify-content: space-between; align-items: center; gap: 20px;
  flex-wrap: wrap;
}
.tp-green-card-left {}
.tp-green-card-title { font-size: 12px; opacity: .8; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .8px; }
.tp-green-card-val   { font-size: 28px; margin-bottom: 4px; letter-spacing: -1px; }
.tp-green-card-sub   { font-size: 13px; opacity: .75; line-height: 1.55; }
.tp-green-card-chips { display: flex; gap: 10px; flex-wrap: wrap; }
.tp-green-chip {
  background: rgba(255,255,255,.18);
  border: 1px solid rgba(255,255,255,.3);
  border-radius: 20px; padding: 6px 14px;
  font-size: 12px; color: #fff; white-space: nowrap;
}

/* ── EMPTY ── */
.tp-empty {
  text-align: center; padding: 28px;
  color: var(--pale); font-size: 13px;
  font-style: italic;
}

/* ── SECTION TITLE ── */
.tp-section-title {
  font-size: 10px; text-transform: uppercase;
  letter-spacing: 1px; color: var(--pale);
  margin-bottom: 14px; display: flex; align-items: center; gap: 8px;
}
.tp-section-title::after {
  content: ''; flex: 1; height: 1px; background: var(--border);
}

/* ── RESPONSIVE ── */
@media (max-width: 1100px) {
  .tp-stats { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 900px) {
  .tp-stats { grid-template-columns: repeat(2, 1fr); }
  .tp-row   { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .tp-sidebar { transform: translateX(-100%); }
  .tp-sidebar.open { transform: translateX(0); }
  .tp-main { margin-left: 0; }
  .tp-hamburger { display: flex; }
  .tp-crumb { display: none; }
}
@media (max-width: 600px) {
  .tp-stats { grid-template-columns: 1fr 1fr; gap: 10px; }
  .tp-content { padding: 16px; }
  .tp-topbar { padding: 0 14px; }
  .tp-stat-val { font-size: 22px; }
}
`

const navItems = [
  { id: 'dashboard',   label: 'Dashboard',   path: '/technician',             d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'jobs',        label: 'My Jobs',      path: '/technician/jobs',        d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'performance', label: 'Performance',  path: '/technician/performance', d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
]

const PERIODS = [
  { key: 'week',   label: 'This Week'   },
  { key: 'month',  label: 'This Month'  },
  { key: 'custom', label: 'Custom Range' },
]

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
const fmtDate = (dt) => {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
const fmtDateTime = (dt) => {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
const avatarColors = ['#1a6b3c','#1a4e8c','#7b3fa0','#e6a817','#1a4d2e','#2d9e5c']

export default function TechnicianPerformancePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [period,      setPeriod]      = useState('month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd,   setCustomEnd]   = useState('')
  const [data,        setData]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [spinning,    setSpinning]    = useState(false)
  const [error,       setError]       = useState('')

  const isMounted = useRef(true)

  const fetchPerformance = useCallback(async (p = period, start = '', end = '') => {
    setSpinning(true)
    setError('')
    try {
      const params = { period: p }
      if (p === 'custom') {
        if (start) params.start = start
        if (end)   params.end   = end
      }
      const res = await api.get('/performance/', { params })
      if (isMounted.current) setData(res.data)
    } catch (e) {
      if (isMounted.current)
        setError(e.response?.data?.error || 'Failed to load performance data.')
    } finally {
      if (isMounted.current) { setLoading(false); setSpinning(false) }
    }
  }, [period])

  useEffect(() => {
    isMounted.current = true
    fetchPerformance(period)
    return () => { isMounted.current = false }
  }, [])

  const handlePeriodChange = (p) => {
    setPeriod(p)
    if (p !== 'custom') fetchPerformance(p)
  }

  const handleCustomApply = () => {
    fetchPerformance('custom', customStart, customEnd)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const userName     = displayName(user)
  const userInitials = initials(userName)

  // ── Derived values ──
  const completionRate = data
    ? data.total_jobs > 0
      ? Math.round((data.completed_jobs / data.total_jobs) * 100)
      : 0
    : 0

  return (
    <>
      <style>{S}</style>
      <div className="tp-root">

        <div className={`tp-overlay${sidebarOpen ? ' show' : ''}`} onClick={() => setSidebarOpen(false)}/>

        {/* ── SIDEBAR ── */}
        <aside className={`tp-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="tp-sb-logo">
            <div className="tp-sb-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/></svg>
            </div>
            <span className="tp-sb-brand">PestPro</span>
          </div>
          <nav className="tp-sb-nav">
            {navItems.map(n => (
              <div key={n.id}
                className={`tp-sb-item${n.id === 'performance' ? ' active' : ''}`}
                onClick={() => { setSidebarOpen(false); navigate(n.path) }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d={n.d}/>
                </svg>
                {n.label}
              </div>
            ))}
          </nav>
          <div className="tp-sb-user">
            <div className="tp-sb-avatar">{userInitials}</div>
            <div style={{flex:1, minWidth:0}}>
              <div className="tp-sb-uname" style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{userName}</div>
              <div className="tp-sb-urole">Technician</div>
            </div>
            <button className="tp-sb-logout" onClick={handleLogout} title="Logout">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div className="tp-main">

          {/* TOPBAR */}
          <div className="tp-topbar">
            <div className="tp-topbar-left">
              <button className="tp-hamburger" onClick={() => setSidebarOpen(o => !o)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              </button>
              <span className="tp-crumb">Technician &nbsp;›&nbsp; <span>My Performance</span></span>
            </div>
            <div className="tp-topbar-right">
              <button
                className={`tp-refresh-btn${spinning ? ' spinning' : ''}`}
                onClick={() => fetchPerformance(period, customStart, customEnd)}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Refresh
              </button>
            </div>
          </div>

          {/* CONTENT */}
          <div className="tp-content">
            <div className="tp-page-title">My Performance</div>
            <div className="tp-page-sub">Track your job completion, punctuality, and activity across any time period.</div>

            {/* PERIOD TABS */}
            <div className="tp-period-tabs">
              {PERIODS.map(p => (
                <button key={p.key} type="button"
                  className={`tp-period-tab${period === p.key ? ' active' : ''}`}
                  onClick={() => handlePeriodChange(p.key)}>
                  {p.label}
                </button>
              ))}
            </div>

            {/* CUSTOM DATE ROW */}
            {period === 'custom' && (
              <div className="tp-date-row">
                <span className="tp-date-label">From</span>
                <input type="date" className="tp-date-input"
                  value={customStart} onChange={e => setCustomStart(e.target.value)}/>
                <span className="tp-date-label">To</span>
                <input type="date" className="tp-date-input"
                  value={customEnd} onChange={e => setCustomEnd(e.target.value)}/>
                <button className="tp-date-apply" onClick={handleCustomApply}>Apply</button>
              </div>
            )}

            {error && <div className="tp-error">{error}</div>}

            {loading ? (
              <div className="tp-loading">
                <div className="tp-spinner"/>
                Loading your performance data…
              </div>
            ) : data ? (
              <>
                {/* ── HIGHLIGHT CARD ── */}
                <div className="tp-green-card">
                  <div className="tp-green-card-left">
                    <div className="tp-green-card-title">Overall Performance</div>
                    <div className="tp-green-card-val">{completionRate}% Completion Rate</div>
                    <div className="tp-green-card-sub">
                      {data.completed_jobs} of {data.total_jobs} jobs completed
                      {data.avg_completion_min ? ` · Avg ${data.avg_completion_min} min/job` : ''}
                    </div>
                  </div>
                  <div className="tp-green-card-chips">
                    <div className="tp-green-chip">✓ {data.completed_jobs} Completed</div>
                    <div className="tp-green-chip">⏱ {data.on_time_rate}% On Time</div>
                    <div className="tp-green-chip">📋 {data.observations_recorded} Observations</div>
                  </div>
                </div>

                {/* ── 5 STAT CARDS ── */}
                <div className="tp-stats">
                  <div className="tp-stat">
                    <div className="tp-stat-label">Jobs Completed</div>
                    <div className="tp-stat-val green">{data.completed_jobs}</div>
                    <div className="tp-stat-sub">of {data.total_jobs} total assigned</div>
                    <span className="tp-stat-chip">{completionRate}% rate</span>
                  </div>

                  <div className="tp-stat">
                    <div className="tp-stat-label">On-Time Rate</div>
                    <div className={`tp-stat-val ${data.on_time_rate >= 80 ? 'green' : data.on_time_rate >= 50 ? 'amber' : 'red'}`}>
                      {data.on_time_rate}%
                    </div>
                    <div className="tp-stat-sub">jobs finished on schedule</div>
                    <span className={`tp-stat-chip ${data.on_time_rate >= 80 ? '' : data.on_time_rate >= 50 ? 'amber' : 'red'}`}>
                      {data.on_time_rate >= 80 ? '✓ Excellent' : data.on_time_rate >= 50 ? 'Room to improve' : 'Needs attention'}
                    </span>
                  </div>

                  <div className="tp-stat">
                    <div className="tp-stat-label">Avg Completion Time</div>
                    <div className="tp-stat-val blue">
                      {data.avg_completion_min != null ? `${data.avg_completion_min}` : '—'}
                    </div>
                    <div className="tp-stat-sub">
                      {data.avg_completion_min != null ? 'minutes per job' : 'No completed jobs yet'}
                    </div>
                    {data.avg_completion_min != null && (
                      <span className="tp-stat-chip blue">
                        {data.avg_completion_min <= 60 ? 'Fast' : data.avg_completion_min <= 120 ? 'Average' : 'Slow'}
                      </span>
                    )}
                  </div>

                  <div className="tp-stat">
                    <div className="tp-stat-label">Observations Recorded</div>
                    <div className="tp-stat-val">{data.observations_recorded}</div>
                    <div className="tp-stat-sub">across all jobs this period</div>
                    <span className="tp-stat-chip">
                      {data.completed_jobs > 0
                        ? `${(data.observations_recorded / data.completed_jobs).toFixed(1)} per job`
                        : 'No jobs yet'}
                    </span>
                  </div>

                  <div className="tp-stat">
                    <div className="tp-stat-label">Alerts Triggered</div>
                    <div className={`tp-stat-val ${data.alerts_triggered === 0 ? 'green' : data.alerts_triggered <= 3 ? 'amber' : 'red'}`}>
                      {data.alerts_triggered}
                    </div>
                    <div className="tp-stat-sub">smart alerts on your jobs</div>
                    <span className={`tp-stat-chip ${data.alerts_triggered === 0 ? '' : data.alerts_triggered <= 3 ? 'amber' : 'red'}`}>
                      {data.alerts_triggered === 0 ? '✓ None' : `${data.alerts_triggered} flagged`}
                    </span>
                  </div>
                </div>

                {/* ── PROGRESS BARS + RECENT JOBS ── */}
                <div className="tp-row">

                  {/* LEFT — Performance Breakdown */}
                  <div className="tp-card">
                    <div className="tp-card-header">
                      <div>
                        <div className="tp-card-title">Performance Breakdown</div>
                        <div className="tp-card-sub">How you're doing across key metrics</div>
                      </div>
                    </div>

                    <div className="tp-prog-wrap">
                      <div className="tp-prog-top">
                        <span className="tp-prog-label">Jobs Completed</span>
                        <span className="tp-prog-pct">{data.completed_jobs} / {data.total_jobs}</span>
                      </div>
                      <div className="tp-prog-bar">
                        <div className="tp-prog-fill" style={{width: `${completionRate}%`}}/>
                      </div>
                      <div className="tp-prog-sub">{completionRate}% completion rate this period</div>
                    </div>

                    <div className="tp-prog-wrap">
                      <div className="tp-prog-top">
                        <span className="tp-prog-label">On-Time Delivery</span>
                        <span className="tp-prog-pct">{data.on_time_rate}%</span>
                      </div>
                      <div className="tp-prog-bar">
                        <div className={`tp-prog-fill ${data.on_time_rate >= 80 ? '' : data.on_time_rate >= 50 ? 'amber' : 'red'}`}
                          style={{width: `${data.on_time_rate}%`}}/>
                      </div>
                      <div className="tp-prog-sub">Jobs finished before or at scheduled time</div>
                    </div>

                    <div className="tp-prog-wrap">
                      <div className="tp-prog-top">
                        <span className="tp-prog-label">Observations per Job</span>
                        <span className="tp-prog-pct">
                          {data.completed_jobs > 0
                            ? (data.observations_recorded / data.completed_jobs).toFixed(1)
                            : '0'} avg
                        </span>
                      </div>
                      <div className="tp-prog-bar">
                        <div className="tp-prog-fill blue"
                          style={{width: `${Math.min(data.completed_jobs > 0 ? (data.observations_recorded / data.completed_jobs / 5) * 100 : 0, 100)}%`}}/>
                      </div>
                      <div className="tp-prog-sub">{data.observations_recorded} total observations recorded</div>
                    </div>

                    <div className="tp-prog-wrap">
                      <div className="tp-prog-top">
                        <span className="tp-prog-label">Alert-Free Rate</span>
                        <span className="tp-prog-pct">
                          {data.total_jobs > 0
                            ? `${Math.max(0, Math.round(((data.total_jobs - data.alerts_triggered) / data.total_jobs) * 100))}%`
                            : '—'}
                        </span>
                      </div>
                      <div className="tp-prog-bar">
                        <div className="tp-prog-fill"
                          style={{width: data.total_jobs > 0
                            ? `${Math.max(0, Math.round(((data.total_jobs - data.alerts_triggered) / data.total_jobs) * 100))}%`
                            : '0%'}}/>
                      </div>
                      <div className="tp-prog-sub">
                        {data.alerts_triggered === 0
                          ? 'No alerts triggered — great work!'
                          : `${data.alerts_triggered} job${data.alerts_triggered > 1 ? 's' : ''} triggered alerts`}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT — Recent Jobs */}
                  <div className="tp-card">
                    <div className="tp-card-header">
                      <div>
                        <div className="tp-card-title">Recent Jobs</div>
                        <div className="tp-card-sub">Your last {data.recent_jobs?.length || 0} jobs this period</div>
                      </div>
                    </div>

                    {data.recent_jobs?.length > 0 ? (
                      data.recent_jobs.map((job, i) => (
                        <div key={job.id} className="tp-job-row"
                          onClick={() => navigate(`/technician/jobs/${job.id}`)}
                          style={{cursor:'pointer'}}>
                          <div className="tp-job-av"
                            style={{background: avatarColors[i % avatarColors.length]}}>
                            {(job.service_type?.[0] || 'J').toUpperCase()}
                          </div>
                          <div className="tp-job-info">
                            <div className="tp-job-name">Job #{job.id}</div>
                            <div className="tp-job-meta">
                              {job.service_type?.replace(/_/g, ' ')} · {job.site_address || '—'}
                            </div>
                          </div>
                          <span className={`tp-job-tag ${job.status}`}>
                            {job.status?.replace(/_/g, ' ')}
                          </span>
                          <span className="tp-job-time">{fmtDate(job.scheduled_datetime)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="tp-empty">No jobs found for this period.</div>
                    )}
                  </div>
                </div>

                {/* ── SUMMARY FOOTER ── */}
                <div className="tp-card" style={{marginBottom:0}}>
                  <div className="tp-section-title">Period Summary</div>
                  <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16}}>
                    {[
                      { label: 'Total Jobs',      val: data.total_jobs,             sub: 'assigned to you'         },
                      { label: 'Completed',        val: data.completed_jobs,         sub: 'fully done'              },
                      { label: 'In Progress',      val: data.total_jobs - data.completed_jobs, sub: 'still active' },
                      { label: 'Avg Speed',        val: data.avg_completion_min != null ? `${data.avg_completion_min}m` : '—', sub: 'per job' },
                    ].map((item, i) => (
                      <div key={i} style={{
                        background: 'var(--bg)', borderRadius: 10, padding: '12px 16px',
                      }}>
                        <div style={{fontSize:10, textTransform:'uppercase', letterSpacing:'.7px', color:'var(--pale)', marginBottom:6}}>
                          {item.label}
                        </div>
                        <div style={{fontSize:22, color:'var(--ink)', letterSpacing:'-1px', lineHeight:1}}>
                          {item.val}
                        </div>
                        <div style={{fontSize:11.5, color:'var(--muted)', marginTop:4}}>{item.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="tp-empty">No performance data available.</div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}