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

const fmt = (s = '') =>
  s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

const fmtDate = (dt) => {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

const fmtTime = (dt) => {
  if (!dt) return '—'
  return new Date(dt).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  })
}

const AUTO_REFRESH_SECS = 30

const STATUS_CONFIG = {
  scheduled:             { label: 'Scheduled',           cls: 'pending'     },
  in_progress:           { label: 'In Progress',         cls: 'inprogress'  },
  observations_recorded: { label: 'Obs. Recorded',       cls: 'obs'         },
  completed:             { label: 'Completed',           cls: 'done'        },
  report_sent:           { label: 'Report Sent',         cls: 'done'        },
  cancelled:             { label: 'Cancelled',           cls: 'cancelled'   },
}

const FILTER_TABS = [
  { key: 'all',                  label: 'All'           },
  { key: 'scheduled',            label: 'Scheduled'     },
  { key: 'in_progress',          label: 'In Progress'   },
  { key: 'observations_recorded',label: 'Obs. Recorded' },
  { key: 'completed',            label: 'Completed'     },
  { key: 'cancelled',            label: 'Cancelled'     },
]

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */
const S = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --green:#1a6b3c;--green-dark:#1a4d2e;--green-light:#edf6f1;
  --ink:#1a2e1a;--muted:#7a8c7a;--pale:#a0b0a0;
  --border:#e8ebe8;--bg:#f0f2f0;--white:#fff;
  --red:#e74c3c;--amber:#e6a817;--blue:#3b82f6;
  --sidebar-w:220px;
}
.mj-root{font-family:'DM Serif Display',serif;min-height:100vh;background:var(--bg);display:flex;}

/* ── SIDEBAR ── */
.mj-sidebar{width:var(--sidebar-w);background:var(--white);border-right:1px solid var(--border);
  display:flex;flex-direction:column;min-height:100vh;
  position:fixed;top:0;left:0;bottom:0;z-index:200;overflow-y:auto;
  transition:transform .25s ease;}
.mj-sb-logo{padding:16px 20px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border);}
.mj-sb-icon{width:28px;height:28px;background:var(--green);border-radius:6px;
  display:flex;align-items:center;justify-content:center;}
.mj-sb-icon svg{width:15px;height:15px;fill:white;}
.mj-sb-brand{font-size:16px;color:var(--ink);}
.mj-sb-nav{padding:12px 10px;flex:1;}
.mj-sb-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;
  cursor:pointer;margin-bottom:2px;color:var(--muted);font-size:13.5px;
  transition:background .15s,color .15s;white-space:nowrap;}
.mj-sb-item:hover{background:var(--bg);color:var(--ink);}
.mj-sb-item.active{background:var(--green-light);color:var(--green);}
.mj-sb-item svg{width:16px;height:16px;flex-shrink:0;}
.mj-sb-user{padding:14px 16px;border-top:1px solid var(--border);
  display:flex;align-items:center;gap:10px;flex-shrink:0;}
.mj-sb-avatar{width:32px;height:32px;background:var(--green);border-radius:50%;
  display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;flex-shrink:0;}
.mj-sb-uname{font-size:13px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.mj-sb-urole{font-size:11px;color:var(--pale);}
.mj-sb-logout{background:none;border:none;cursor:pointer;color:var(--pale);
  padding:4px;border-radius:6px;display:flex;align-items:center;margin-left:auto;
  transition:color .15s,background .15s;}
.mj-sb-logout:hover{color:var(--red);background:#fde8e8;}

/* ── OVERLAY ── */
.mj-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:150;}
.mj-overlay.show{display:block;}

/* ── HAMBURGER ── */
.mj-hamburger{display:none;background:none;border:none;cursor:pointer;
  padding:4px;border-radius:6px;color:var(--ink);}
.mj-hamburger svg{width:20px;height:20px;}

/* ── MAIN ── */
.mj-main{flex:1;margin-left:var(--sidebar-w);display:flex;flex-direction:column;min-height:100vh;}

/* ── TOPBAR ── */
.mj-topbar{background:var(--white);border-bottom:1px solid var(--border);
  padding:0 24px;height:52px;display:flex;align-items:center;
  justify-content:space-between;position:sticky;top:0;z-index:100;flex-shrink:0;gap:12px;}
.mj-topbar-left{display:flex;align-items:center;gap:10px;}
.mj-crumb{font-size:13px;color:var(--pale);}
.mj-crumb span{color:var(--ink);}
.mj-topbar-right{display:flex;align-items:center;gap:10px;}
.mj-ticker{font-size:12px;color:var(--pale);white-space:nowrap;}
.mj-ticker.soon{color:var(--green);}
.mj-refresh-btn{background:var(--bg);color:var(--ink);border:1.5px solid var(--border);
  border-radius:9px;padding:7px 14px;font-family:'DM Serif Display',serif;font-size:13px;
  cursor:pointer;display:flex;align-items:center;gap:6px;transition:background .15s;}
.mj-refresh-btn:hover{background:#e2e8e2;}
.mj-refresh-btn svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2;
  transition:transform .35s;}
.mj-refresh-btn.spinning svg{animation:mjSpin .55s linear;}
@keyframes mjSpin{to{transform:rotate(360deg);}}

/* ── CONTENT ── */
.mj-content{padding:22px 24px;flex:1;}
.mj-page-title{font-size:22px;color:var(--ink);margin-bottom:3px;}
.mj-page-sub{font-size:13px;color:var(--pale);margin-bottom:20px;font-style:italic;}

/* ── STATS ── */
.mj-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px;}
.mj-stat{background:var(--white);border-radius:14px;padding:16px 18px;
  box-shadow:0 1px 8px rgba(0,0,0,.05);}
.mj-stat-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;
  color:var(--pale);margin-bottom:6px;}
.mj-stat-val{font-size:28px;color:var(--ink);letter-spacing:-1px;line-height:1;}
.mj-stat-val.green{color:var(--green);}
.mj-stat-val.amber{color:var(--amber);}
.mj-stat-val.red{color:var(--red);}
.mj-stat-val.blue{color:var(--blue);}
.mj-stat-sub{font-size:11px;color:var(--muted);margin-top:4px;}

/* ── CONTROLS ── */
.mj-controls{display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap;}
.mj-search-wrap{flex:1;min-width:200px;position:relative;}
.mj-search-wrap svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);
  width:15px;height:15px;color:var(--pale);pointer-events:none;}
.mj-search{width:100%;border:1.5px solid var(--border);border-radius:10px;
  padding:9px 14px 9px 36px;font-family:'DM Serif Display',serif;font-size:13px;
  color:var(--ink);outline:none;background:var(--white);transition:border-color .2s;}
.mj-search:focus{border-color:var(--green);}
.mj-sort-select{border:1.5px solid var(--border);border-radius:10px;
  padding:9px 14px;font-family:'DM Serif Display',serif;font-size:13px;
  color:var(--ink);outline:none;background:var(--white);cursor:pointer;
  transition:border-color .2s;}
.mj-sort-select:focus{border-color:var(--green);}

/* ── FILTER TABS ── */
.mj-tabs{display:flex;gap:6px;margin-bottom:18px;flex-wrap:wrap;}
.mj-tab{padding:7px 16px;border-radius:20px;font-family:'DM Serif Display',serif;
  font-size:12.5px;cursor:pointer;border:1.5px solid var(--border);
  background:var(--white);color:var(--muted);transition:all .15s;white-space:nowrap;}
.mj-tab:hover{border-color:var(--green);color:var(--green);}
.mj-tab.active{background:var(--green);color:#fff;border-color:var(--green);}
.mj-tab-count{background:rgba(255,255,255,.25);border-radius:10px;
  padding:1px 6px;font-size:11px;margin-left:5px;}
.mj-tab:not(.active) .mj-tab-count{background:var(--bg);color:var(--muted);}

/* ── JOB CARDS ── */
.mj-jobs-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
.mj-jobs-title{font-size:15px;color:var(--ink);}
.mj-jobs-sort-lbl{font-size:12px;color:var(--pale);}

.mj-job-card{background:var(--white);border-radius:14px;padding:16px 20px;
  margin-bottom:10px;display:flex;align-items:center;gap:16px;
  box-shadow:0 1px 6px rgba(0,0,0,.05);transition:box-shadow .15s,transform .15s;
  cursor:pointer;}
.mj-job-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.1);transform:translateY(-1px);}
.mj-job-num{width:36px;height:36px;border-radius:10px;background:var(--green-light);
  display:flex;align-items:center;justify-content:center;
  font-size:13px;color:var(--green);flex-shrink:0;}
.mj-job-body{flex:1;min-width:0;}
.mj-job-top{display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;}
.mj-job-id{font-size:10px;color:var(--pale);text-transform:uppercase;letter-spacing:.6px;}
.mj-job-name{font-size:15px;color:var(--ink);}
.mj-job-customer{font-size:13px;color:var(--muted);margin-bottom:3px;}
.mj-job-addr{font-size:12px;color:var(--pale);display:flex;align-items:center;gap:4px;}
.mj-job-addr svg{width:11px;height:11px;flex-shrink:0;}
.mj-job-time{font-size:12px;color:var(--muted);display:flex;align-items:center;gap:4px;margin-top:4px;}
.mj-job-time svg{width:11px;height:11px;flex-shrink:0;}
.mj-job-actions{display:flex;align-items:center;gap:8px;flex-shrink:0;flex-wrap:wrap;}

/* ── STATUS BADGES ── */
.mj-badge{font-size:11.5px;padding:4px 12px;border-radius:6px;white-space:nowrap;flex-shrink:0;}
.mj-badge.pending{background:#fff8ec;color:var(--amber);}
.mj-badge.inprogress{background:var(--green-light);color:var(--green);}
.mj-badge.obs{background:#eff6ff;color:var(--blue);}
.mj-badge.done{background:#f0f2f0;color:var(--muted);}
.mj-badge.cancelled{background:#fde8e8;color:var(--red);}

/* ── ACTION BUTTONS ── */
.mj-btn-nav{background:#eff6ff;color:var(--blue);border:none;border-radius:8px;
  padding:7px 14px;font-family:'DM Serif Display',serif;font-size:12.5px;
  cursor:pointer;display:flex;align-items:center;gap:5px;transition:background .15s;
  white-space:nowrap;}
.mj-btn-nav:hover{background:#dbeafe;}
.mj-btn-nav svg{width:12px;height:12px;}
.mj-btn-view{background:var(--green);color:#fff;border:none;border-radius:8px;
  padding:7px 14px;font-family:'DM Serif Display',serif;font-size:12.5px;
  cursor:pointer;transition:background .15s;white-space:nowrap;}
.mj-btn-view:hover{background:#155a32;}

/* ── EMPTY STATE ── */
.mj-empty{text-align:center;padding:60px 20px;}
.mj-empty-icon{font-size:40px;margin-bottom:12px;}
.mj-empty-title{font-size:18px;color:var(--ink);margin-bottom:6px;}
.mj-empty-sub{font-size:13px;color:var(--pale);}

/* ── LOADING ── */
.mj-loading{display:flex;align-items:center;justify-content:center;
  padding:60px;color:var(--pale);font-size:14px;gap:10px;}
.mj-spinner{width:20px;height:20px;border:2px solid var(--border);
  border-top-color:var(--green);border-radius:50%;animation:mjSpinner .8s linear infinite;}
@keyframes mjSpinner{to{transform:rotate(360deg);}}

/* ── ERROR ── */
.mj-error{background:#fde8e8;color:var(--red);padding:12px 16px;
  border-radius:10px;font-size:13px;margin-bottom:16px;}

/* ── RESPONSIVE ── */
@media(max-width:900px){
  .mj-stats{grid-template-columns:repeat(2,1fr);}
}
@media(max-width:768px){
  .mj-sidebar{transform:translateX(-100%);}
  .mj-sidebar.open{transform:translateX(0);}
  .mj-main{margin-left:0;}
  .mj-hamburger{display:flex;}
  .mj-job-card{flex-wrap:wrap;}
  .mj-job-actions{width:100%;justify-content:flex-end;}
}
@media(max-width:600px){
  .mj-stats{grid-template-columns:1fr 1fr;gap:10px;}
  .mj-content{padding:14px;}
  .mj-topbar{padding:0 14px;}
  .mj-stat-val{font-size:22px;}
}
`

/* ─────────────────────────────────────────────
   NAV ITEMS
───────────────────────────────────────────── */
const navItems = [
  { id: 'dashboard',  label: 'Dashboard',   path: '/technician',       d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'jobs',       label: 'My Jobs',     path: '/technician/jobs',  d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'route',      label: 'Daily Route', path: '/technician',       d: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
  { id: 'perf',       label: 'Performance', path: '/technician',       d: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'customers',  label: 'Customers',   path: '/technician',       d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'settings',   label: 'Settings',    path: '/technician',       d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
]

/* ═══════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════ */
export default function MyJobsPage() {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()

  /* ── UI ── */
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeNav,   setActiveNav]   = useState('jobs')

  /* ── API data ── */
  const [jobs,    setJobs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  /* ── Filters ── */
  const [activeTab,  setActiveTab]  = useState('all')
  const [search,     setSearch]     = useState('')
  const [sortBy,     setSortBy]     = useState('date_asc')
  const [isSpinning, setIsSpinning] = useState(false)

  /* ── Auto-refresh ── */
  const [countdown, setCountdown] = useState(AUTO_REFRESH_SECS)

  /* ── Refs ── */
  const tickRef   = useRef(null)
  const isMounted = useRef(true)

  const userName     = displayName(user)
  const userInitials = initials(userName)

  /* ── FETCH ── */
  const fetchJobs = useCallback(async (silent = false) => {
    if (!silent) setError('')
    try {
      const res  = await api.get('/jobs/')
      if (!isMounted.current) return
      const all  = res.data?.results || res.data || []
      // Filter to only this technician's jobs
      const mine = all.filter(j =>
        !j.technician_id ||
        j.technician_id === user?.id ||
        j.assigned_technician === user?.id ||
        j.technician_name === userName
      )
      setJobs(mine.length > 0 ? mine : all)
    } catch (e) {
      if (!silent && isMounted.current)
        setError(e.response?.data?.error || 'Failed to load jobs.')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [user, userName])

  /* ── AUTO REFRESH ── */
  const resetTimer = useCallback(() => {
    clearInterval(tickRef.current)
    setCountdown(AUTO_REFRESH_SECS)
    tickRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { fetchJobs(true); return AUTO_REFRESH_SECS }
        return c - 1
      })
    }, 1000)
  }, [fetchJobs])

  useEffect(() => {
    isMounted.current = true
    fetchJobs().then(resetTimer)
    return () => {
      isMounted.current = false
      clearInterval(tickRef.current)
    }
  }, [fetchJobs, resetTimer])

  /* ── MANUAL REFRESH ── */
  const manualRefresh = () => {
    setIsSpinning(true)
    fetchJobs(true).then(() => {
      resetTimer()
      setTimeout(() => setIsSpinning(false), 550)
    })
  }

  /* ── NAVIGATE TO MAPS ── */
  const handleNavigate = (e, job) => {
    e.stopPropagation()
    const addr = job.site_address || job.address || job.customer_address || ''
    if (addr) window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`, '_blank')
  }

  /* ── LOGOUT ── */
  const handleLogout = async () => {
    clearInterval(tickRef.current)
    await logout()
    navigate('/login')
  }

  /* ── COMPUTED STATS ── */
  const total       = jobs.length
  const completed   = jobs.filter(j => ['completed', 'report_sent'].includes(j.status)).length
  const inProgress  = jobs.filter(j => j.status === 'in_progress').length
  const pending     = jobs.filter(j => ['scheduled', 'pending'].includes(j.status)).length
  const obsRecorded = jobs.filter(j => j.status === 'observations_recorded').length

  /* ── TAB COUNTS ── */
  const tabCount = (key) => {
    if (key === 'all') return jobs.length
    return jobs.filter(j => j.status === key).length
  }

  /* ── FILTERED + SEARCHED + SORTED JOBS ── */
  const filtered = jobs
    .filter(j => activeTab === 'all' || j.status === activeTab)
    .filter(j => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        (j.customer_name || '').toLowerCase().includes(q) ||
        (j.site_address  || j.address || '').toLowerCase().includes(q) ||
        (j.service_type  || '').toLowerCase().includes(q) ||
        String(j.id).includes(q)
      )
    })
    .sort((a, b) => {
      if (sortBy === 'date_asc')  return new Date(a.scheduled_datetime) - new Date(b.scheduled_datetime)
      if (sortBy === 'date_desc') return new Date(b.scheduled_datetime) - new Date(a.scheduled_datetime)
      if (sortBy === 'status')    return (a.status || '').localeCompare(b.status || '')
      return 0
    })

  /* ══════════════════════════════════════
     RENDER
  ══════════════════════════════════════ */
  return (
    <>
      <style>{S}</style>
      <div className="mj-root">

        {/* Mobile overlay */}
        <div
          className={`mj-overlay${sidebarOpen ? ' show' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* ── SIDEBAR ── */}
        <aside className={`mj-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="mj-sb-logo">
            <div className="mj-sb-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/></svg>
            </div>
            <span className="mj-sb-brand">PestPro</span>
          </div>

          <nav className="mj-sb-nav">
            {navItems.map(n => (
              <div
                key={n.id}
                className={`mj-sb-item${activeNav === n.id ? ' active' : ''}`}
                onClick={() => {
                  setActiveNav(n.id)
                  setSidebarOpen(false)
                  navigate(n.path)
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d={n.d}/>
                </svg>
                {n.label}
              </div>
            ))}
          </nav>

          <div className="mj-sb-user">
            <div className="mj-sb-avatar">{userInitials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mj-sb-uname">{userName}</div>
              <div className="mj-sb-urole">Technician</div>
            </div>
            <button className="mj-sb-logout" onClick={handleLogout} title="Logout">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div className="mj-main">

          {/* TOPBAR */}
          <div className="mj-topbar">
            <div className="mj-topbar-left">
              <button className="mj-hamburger" onClick={() => setSidebarOpen(o => !o)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              </button>
              <span className="mj-crumb">
                My Dashboard &nbsp;›&nbsp; <span>My Jobs</span>
              </span>
            </div>
            <div className="mj-topbar-right">
              <span className={`mj-ticker${countdown <= 10 ? ' soon' : ''}`}>
                ↻ in {countdown}s
              </span>
              <button
                className={`mj-refresh-btn${isSpinning ? ' spinning' : ''}`}
                onClick={manualRefresh}
              >
                <svg viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Refresh
              </button>
            </div>
          </div>

          {/* CONTENT */}
          <div className="mj-content">
            <div className="mj-page-title">My Jobs</div>
            <div className="mj-page-sub">
              All jobs assigned to you · {total} total
            </div>

            {error && <div className="mj-error">{error}</div>}

            {loading ? (
              <div className="mj-loading">
                <div className="mj-spinner"/>
                Loading your jobs…
              </div>
            ) : (
              <>
                {/* STATS */}
                <div className="mj-stats">
                  <div className="mj-stat">
                    <div className="mj-stat-label">Total Jobs</div>
                    <div className="mj-stat-val">{total}</div>
                    <div className="mj-stat-sub">All assigned</div>
                  </div>
                  <div className="mj-stat">
                    <div className="mj-stat-label">Completed</div>
                    <div className="mj-stat-val green">{completed}</div>
                    <div className="mj-stat-sub">
                      {total > 0 ? `${Math.round((completed / total) * 100)}% done` : '0% done'}
                    </div>
                  </div>
                  <div className="mj-stat">
                    <div className="mj-stat-label">In Progress</div>
                    <div className="mj-stat-val blue">{inProgress}</div>
                    <div className="mj-stat-sub">
                      {obsRecorded > 0 ? `+${obsRecorded} obs recorded` : 'Active now'}
                    </div>
                  </div>
                  <div className="mj-stat">
                    <div className="mj-stat-label">Pending</div>
                    <div className="mj-stat-val amber">{pending}</div>
                    <div className="mj-stat-sub">Awaiting start</div>
                  </div>
                </div>

                {/* FILTER TABS */}
                <div className="mj-tabs">
                  {FILTER_TABS.map(tab => (
                    <button
                      key={tab.key}
                      className={`mj-tab${activeTab === tab.key ? ' active' : ''}`}
                      onClick={() => setActiveTab(tab.key)}
                    >
                      {tab.label}
                      <span className="mj-tab-count">{tabCount(tab.key)}</span>
                    </button>
                  ))}
                </div>

                {/* SEARCH + SORT */}
                <div className="mj-controls">
                  <div className="mj-search-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    <input
                      className="mj-search"
                      placeholder="Search by customer, address, service type…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                  <select
                    className="mj-sort-select"
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                  >
                    <option value="date_asc">Date: Earliest First</option>
                    <option value="date_desc">Date: Latest First</option>
                    <option value="status">Sort by Status</option>
                  </select>
                </div>

                {/* JOBS HEADER */}
                <div className="mj-jobs-hdr">
                  <span className="mj-jobs-title">
                    {filtered.length} job{filtered.length !== 1 ? 's' : ''}
                    {activeTab !== 'all' ? ` · ${fmt(activeTab)}` : ''}
                    {search ? ` matching "${search}"` : ''}
                  </span>
                  <span className="mj-jobs-sort-lbl">
                    {sortBy === 'date_asc' ? 'Earliest First' : sortBy === 'date_desc' ? 'Latest First' : 'By Status'}
                  </span>
                </div>

                {/* JOB CARDS */}
                {filtered.length === 0 ? (
                  <div className="mj-empty">
                    <div className="mj-empty-icon">📋</div>
                    <div className="mj-empty-title">No jobs found</div>
                    <div className="mj-empty-sub">
                      {search
                        ? `No jobs match "${search}" — try a different search`
                        : activeTab !== 'all'
                        ? `No ${fmt(activeTab)} jobs at the moment`
                        : 'No jobs assigned yet'}
                    </div>
                  </div>
                ) : (
                  filtered.map((job, i) => {
                    const st  = STATUS_CONFIG[job.status] || { label: fmt(job.status), cls: 'pending' }
                    const svc = job.service_type
                      ? job.service_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                      : job.title || 'Service Job'
                    const addr = job.site_address || job.address || job.customer_address || '—'

                    return (
                      <div
                        key={job.id || i}
                        className="mj-job-card"
                        onClick={() => navigate(`/technician/jobs/${job.id}`)}
                      >
                        <div className="mj-job-num">{i + 1}</div>

                        <div className="mj-job-body">
                          <div className="mj-job-top">
                            <span className="mj-job-id">JOB #{job.id}</span>
                            <span className={`mj-badge ${st.cls}`}>{st.label}</span>
                          </div>
                          <div className="mj-job-name">
                            {svc}{job.customer_name ? ` — ${job.customer_name}` : ''}
                          </div>
                          <div className="mj-job-customer">
                            {job.customer_name || '—'}
                          </div>
                          <div className="mj-job-addr">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                            </svg>
                            {addr}
                          </div>
                          {job.scheduled_datetime && (
                            <div className="mj-job-time">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                              </svg>
                              {fmtDate(job.scheduled_datetime)} · {fmtTime(job.scheduled_datetime)}
                            </div>
                          )}
                        </div>

                        <div className="mj-job-actions" onClick={e => e.stopPropagation()}>
                          <button
                            className="mj-btn-nav"
                            onClick={e => handleNavigate(e, job)}
                            title="Open in Google Maps"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                            </svg>
                            Navigate
                          </button>
                          <button
                            className="mj-btn-view"
                            onClick={() => navigate(`/technician/jobs/${job.id}`)}
                          >
                            View Details
                          </button>
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