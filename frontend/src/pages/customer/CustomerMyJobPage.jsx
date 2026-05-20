import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'

const fmtDate = (dt) => {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

const fmtTime = (dt) => {
  if (!dt) return '—'
  return new Date(dt).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  })
}

const fmt = (s = '') =>
  s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

const extractArray = (data, keys = []) => {
  if (Array.isArray(data)) return data
  for (const k of keys) {
    if (data?.[k] && Array.isArray(data[k])) return data[k]
  }
  if (data?.results && Array.isArray(data.results)) return data.results
  return []
}

const AUTO_REFRESH = 30

const STATUS_CONFIG = {
  scheduled:             { label: 'Scheduled',        cls: 'scheduled',  icon: '📅' },
  in_progress:           { label: 'In Progress',      cls: 'inprogress', icon: '🔧' },
  observations_recorded: { label: 'Obs. Recorded',    cls: 'obs',        icon: '📋' },
  completed:             { label: 'Completed',        cls: 'completed',  icon: '✅' },
  report_sent:           { label: 'Report Ready',     cls: 'report',     icon: '📄' },
  cancelled:             { label: 'Cancelled',        cls: 'cancelled',  icon: '❌' },
}

const SERVICE_ICONS = {
  rodent_control: '🐀', flying_insect: '🦟', cockroach: '🪳',
  termite: '🐛', mosquito: '🦟', general: '🔍', bed_bug: '🪲',
}

const FILTER_TABS = [
  { key: 'all',                   label: 'All Jobs'      },
  { key: 'scheduled',             label: 'Scheduled'     },
  { key: 'in_progress',           label: 'In Progress'   },
  { key: 'observations_recorded', label: 'Obs. Recorded' },
  { key: 'completed',             label: 'Completed'     },
  { key: 'report_sent',           label: 'Report Ready'  },
]

const navItems = [
  { id: 'dashboard', label: 'Dashboard',  path: '/customer',         d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'jobs',      label: 'My Jobs',    path: '/customer/jobs',    d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'reports',   label: 'My Reports', path: '/customer/reports', d: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'profile',   label: 'My Profile', path: '/customer/profile', d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { id: 'support',   label: 'Support',    path: '/customer/support', d: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z' },
]

const S = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --green:#1a6b3c;--green-dark:#1a4d2e;--green-light:#edf6f1;--green-mid:#d4ead9;
  --ink:#1a2e1a;--muted:#7a8c7a;--pale:#a0b0a0;
  --border:#e8ebe8;--bg:#f0f2f0;--white:#fff;
  --red:#e74c3c;--amber:#e6a817;--blue:#3b82f6;
  --sidebar-w:220px;
}
body{font-family:'DM Serif Display',serif;}

.cj-root{font-family:'DM Serif Display',serif;min-height:100vh;background:var(--bg);display:flex;}

.cj-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:150;}
.cj-overlay.show{display:block;}

.cj-sidebar{
  width:var(--sidebar-w);background:var(--white);border-right:1px solid var(--border);
  display:flex;flex-direction:column;min-height:100vh;
  position:fixed;top:0;left:0;bottom:0;z-index:200;overflow-y:auto;
  transition:transform .25s ease;
}
.cj-sb-logo{padding:16px 20px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border);}
.cj-sb-icon{width:28px;height:28px;background:var(--green);border-radius:6px;display:flex;align-items:center;justify-content:center;}
.cj-sb-icon svg{width:15px;height:15px;fill:white;}
.cj-sb-brand{font-size:16px;color:var(--ink);}
.cj-sb-nav{padding:12px 10px;flex:1;}
.cj-sb-item{
  display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;
  cursor:pointer;margin-bottom:2px;color:var(--muted);font-size:13.5px;
  transition:background .15s,color .15s;white-space:nowrap;text-decoration:none;
}
.cj-sb-item:hover{background:var(--bg);color:var(--ink);}
.cj-sb-item.active{background:var(--green-light);color:var(--green);}
.cj-sb-item svg{width:16px;height:16px;flex-shrink:0;}
.cj-sb-user{padding:14px 16px;border-top:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-shrink:0;}
.cj-sb-avatar{width:32px;height:32px;background:var(--green);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;flex-shrink:0;}
.cj-sb-uname{font-size:13px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cj-sb-urole{font-size:11px;color:var(--pale);}
.cj-sb-logout{background:none;border:none;cursor:pointer;color:var(--pale);padding:4px;border-radius:6px;display:flex;align-items:center;margin-left:auto;transition:color .15s,background .15s;}
.cj-sb-logout:hover{color:var(--red);background:#fde8e8;}

.cj-main{flex:1;margin-left:var(--sidebar-w);display:flex;flex-direction:column;min-height:100vh;}

.cj-topbar{background:var(--white);border-bottom:1px solid var(--border);padding:0 24px;height:52px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;flex-shrink:0;gap:12px;}
.cj-topbar-left{display:flex;align-items:center;gap:10px;}
.cj-topbar-right{display:flex;align-items:center;gap:10px;}
.cj-hamburger{display:none;background:none;border:none;cursor:pointer;padding:4px;border-radius:6px;color:var(--ink);}
.cj-hamburger svg{width:20px;height:20px;}
.cj-crumb{font-size:13px;color:var(--pale);}
.cj-crumb span{color:var(--ink);}
.cj-ticker{font-size:11px;color:var(--pale);white-space:nowrap;}
.cj-ticker.soon{color:var(--green);font-weight:600;}
.cj-refresh-btn{background:var(--bg);color:var(--ink);border:1.5px solid var(--border);border-radius:9px;padding:6px 13px;font-family:'DM Serif Display',serif;font-size:12.5px;cursor:pointer;display:flex;align-items:center;gap:5px;transition:background .15s;}
.cj-refresh-btn:hover{background:#e2e8e2;}
.cj-refresh-btn svg{width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2;transition:transform .35s;}
.cj-refresh-btn.spinning svg{animation:cjSpin .55s linear;}
@keyframes cjSpin{to{transform:rotate(360deg);}}

.cj-content{padding:22px 24px 40px;}

/* ── HERO BANNER ── */
.cj-hero{
  background:linear-gradient(135deg,var(--green-dark) 0%,var(--green) 100%);
  border-radius:18px;padding:24px 28px;margin-bottom:20px;
  display:flex;align-items:center;justify-content:space-between;
  gap:16px;flex-wrap:wrap;position:relative;overflow:hidden;color:#fff;
}
.cj-hero::before{content:'';position:absolute;right:-40px;top:-40px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.04);}
.cj-hero::after{content:'';position:absolute;right:80px;bottom:-70px;width:130px;height:130px;border-radius:50%;background:rgba(255,255,255,.03);}
.cj-hero-left{}
.cj-hero-greeting{font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:.65;margin-bottom:5px;}
.cj-hero-title{font-size:22px;margin-bottom:4px;line-height:1.2;}
.cj-hero-sub{font-size:13px;opacity:.75;}
.cj-hero-right{text-align:right;flex-shrink:0;}
.cj-hero-stat-label{font-size:11px;opacity:.6;margin-bottom:2px;}
.cj-hero-stat-val{font-size:32px;line-height:1;letter-spacing:-1px;}
.cj-hero-stat-sub{font-size:12px;opacity:.7;margin-top:2px;}

/* ── STATS GRID ── */
.cj-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;}
.cj-stat{background:var(--white);border-radius:14px;padding:14px 16px;box-shadow:0 1px 6px rgba(0,0,0,.05);}
.cj-stat-label{font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:var(--pale);margin-bottom:6px;}
.cj-stat-val{font-size:26px;color:var(--ink);letter-spacing:-1px;line-height:1;}
.cj-stat-val.green{color:var(--green);}
.cj-stat-val.amber{color:var(--amber);}
.cj-stat-val.blue{color:var(--blue);}
.cj-stat-val.red{color:var(--red);}
.cj-stat-sub{font-size:11px;color:var(--muted);margin-top:4px;}

/* ── FILTER TABS ── */
.cj-tabs{display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;}
.cj-tab{padding:7px 16px;border-radius:20px;font-family:'DM Serif Display',serif;font-size:12.5px;cursor:pointer;border:1.5px solid var(--border);background:var(--white);color:var(--muted);transition:all .15s;white-space:nowrap;}
.cj-tab:hover{border-color:var(--green);color:var(--green);}
.cj-tab.active{background:var(--green);color:#fff;border-color:var(--green);}
.cj-tab-count{background:rgba(255,255,255,.25);border-radius:10px;padding:1px 6px;font-size:11px;margin-left:5px;}
.cj-tab:not(.active) .cj-tab-count{background:var(--bg);color:var(--muted);}

/* ── CONTROLS ── */
.cj-controls{display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;}
.cj-search-wrap{flex:1;min-width:180px;position:relative;}
.cj-search-wrap svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);width:14px;height:14px;color:var(--pale);pointer-events:none;stroke:currentColor;fill:none;stroke-width:2;}
.cj-search{width:100%;border:1.5px solid var(--border);border-radius:10px;padding:9px 14px 9px 34px;font-family:'DM Serif Display',serif;font-size:13px;color:var(--ink);outline:none;background:var(--white);transition:border-color .2s;}
.cj-search:focus{border-color:var(--green);}
.cj-search::placeholder{color:var(--pale);}
.cj-sort-select{border:1.5px solid var(--border);border-radius:10px;padding:9px 14px;font-family:'DM Serif Display',serif;font-size:13px;color:var(--ink);outline:none;background:var(--white);cursor:pointer;transition:border-color .2s;min-width:170px;}
.cj-sort-select:focus{border-color:var(--green);}

/* ── JOBS LIST HEADER ── */
.cj-list-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
.cj-list-title{font-size:14px;color:var(--ink);}
.cj-list-sub{font-size:12px;color:var(--pale);}

/* ── JOB CARD ── */
.cj-job-card{
  background:var(--white);border-radius:16px;padding:18px 20px;
  margin-bottom:10px;display:flex;align-items:flex-start;gap:16px;
  box-shadow:0 1px 6px rgba(0,0,0,.05);
  transition:box-shadow .15s,transform .15s;cursor:pointer;
  border:1.5px solid transparent;
}
.cj-job-card:hover{box-shadow:0 6px 20px rgba(0,0,0,.1);transform:translateY(-2px);border-color:var(--green-mid);}
.cj-job-icon{width:44px;height:44px;border-radius:12px;background:var(--green-light);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;margin-top:2px;}
.cj-job-body{flex:1;min-width:0;}
.cj-job-top{display:flex;align-items:center;gap:8px;margin-bottom:5px;flex-wrap:wrap;}
.cj-job-id{font-size:10px;color:var(--pale);text-transform:uppercase;letter-spacing:.6px;}
.cj-job-name{font-size:15px;color:var(--ink);margin-bottom:4px;}
.cj-job-meta{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:5px;}
.cj-job-tech{font-size:12px;color:var(--blue);display:flex;align-items:center;gap:4px;background:#eff6ff;padding:3px 9px;border-radius:6px;}
.cj-job-tech svg{width:11px;height:11px;flex-shrink:0;}
.cj-job-tech.none{color:var(--amber);background:#fff8ec;}
.cj-job-info{font-size:12px;color:var(--pale);display:flex;align-items:center;gap:4px;}
.cj-job-info svg{width:11px;height:11px;flex-shrink:0;stroke:currentColor;fill:none;stroke-width:2;}
.cj-job-progress{margin-top:10px;}
.cj-progress-label{font-size:11px;color:var(--pale);margin-bottom:5px;display:flex;justify-content:space-between;}
.cj-progress-bar{height:4px;background:var(--border);border-radius:4px;overflow:hidden;}
.cj-progress-fill{height:100%;border-radius:4px;background:var(--green);transition:width .4s ease;}
.cj-progress-fill.amber{background:var(--amber);}
.cj-progress-fill.blue{background:var(--blue);}
.cj-job-right{display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0;}
.cj-job-date{text-align:right;}
.cj-job-date-val{font-size:13px;color:var(--ink);}
.cj-job-date-time{font-size:11px;color:var(--pale);margin-top:2px;}
.cj-view-btn{background:var(--green);color:#fff;border:none;border-radius:9px;padding:8px 16px;font-family:'DM Serif Display',serif;font-size:12.5px;cursor:pointer;transition:background .15s;white-space:nowrap;}
.cj-view-btn:hover{background:var(--green-dark);}
.cj-report-badge{background:#eff6ff;color:var(--blue);border-radius:6px;padding:3px 9px;font-size:11px;display:flex;align-items:center;gap:4px;}
.cj-report-badge svg{width:11px;height:11px;stroke:currentColor;fill:none;stroke-width:2;}

/* ── STATUS PILLS ── */
.cj-status{display:inline-flex;align-items:center;gap:5px;padding:4px 11px;border-radius:20px;font-size:11.5px;font-weight:600;}
.cj-status-dot{width:6px;height:6px;border-radius:50%;background:currentColor;flex-shrink:0;}
.cj-status.scheduled{background:#fff8ec;color:var(--amber);}
.cj-status.inprogress{background:var(--green-light);color:var(--green);}
.cj-status.obs{background:#eff6ff;color:var(--blue);}
.cj-status.completed{background:#f0f2f0;color:var(--muted);}
.cj-status.report{background:#eff6ff;color:var(--blue);}
.cj-status.cancelled{background:#fde8e8;color:var(--red);}

/* ── EMPTY STATE ── */
.cj-empty{text-align:center;padding:60px 20px;}
.cj-empty-icon{font-size:44px;margin-bottom:14px;}
.cj-empty-title{font-size:18px;color:var(--ink);margin-bottom:6px;}
.cj-empty-sub{font-size:13px;color:var(--pale);}

/* ── LOADING ── */
.cj-loading{display:flex;align-items:center;justify-content:center;padding:70px;color:var(--pale);font-size:14px;gap:10px;}
.cj-spinner{width:20px;height:20px;border:2px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:cjSpinner .8s linear infinite;}
@keyframes cjSpinner{to{transform:rotate(360deg);}}

/* ── ERROR ── */
.cj-error{background:#fde8e8;color:var(--red);padding:12px 16px;border-radius:10px;font-size:13px;margin-bottom:16px;}

/* ── TOAST ── */
.cj-toast{position:fixed;bottom:20px;right:20px;z-index:600;display:flex;align-items:center;gap:10px;padding:12px 18px;border-radius:10px;font-size:13px;box-shadow:0 4px 20px rgba(0,0,0,.15);animation:cjSlide .25s ease;}
@keyframes cjSlide{from{transform:translateY(20px);opacity:0;}to{transform:translateY(0);opacity:1;}}
.cj-toast.success{background:var(--green);color:#fff;}
.cj-toast.error{background:var(--red);color:#fff;}

@media(max-width:960px){.cj-stats{grid-template-columns:repeat(2,1fr);}}
@media(max-width:768px){
  .cj-main{margin-left:0;}
  .cj-sidebar{transform:translateX(-100%);}
  .cj-sidebar.open{transform:translateX(0);}
  .cj-hamburger{display:flex;}
  .cj-content{padding:14px 16px 32px;}
  .cj-job-card{flex-wrap:wrap;}
  .cj-job-right{flex-direction:row;align-items:center;width:100%;justify-content:space-between;}
}
@media(max-width:540px){
  .cj-stats{grid-template-columns:1fr 1fr;gap:10px;}
  .cj-hero{padding:18px 20px;}
  .cj-hero-title{font-size:18px;}
}
`

const getProgress = (status) => {
  const map = {
    scheduled: { pct: 15, cls: 'amber', label: 'Awaiting technician' },
    in_progress: { pct: 50, cls: 'blue', label: 'Service in progress' },
    observations_recorded: { pct: 75, cls: '', label: 'Observations recorded' },
    completed: { pct: 90, cls: '', label: 'Service completed' },
    report_sent: { pct: 100, cls: '', label: 'Report ready' },
    cancelled: { pct: 0, cls: 'amber', label: 'Cancelled' },
  }
  return map[status] || { pct: 0, cls: '', label: '' }
}

export default function CustomerJobsPage() {
  const navigate = useNavigate()

  const [jobs,        setJobs]        = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [activeTab,   setActiveTab]   = useState('all')
  const [search,      setSearch]      = useState('')
  const [sortBy,      setSortBy]      = useState('date_desc')
  const [countdown,   setCountdown]   = useState(AUTO_REFRESH)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isSpinning,  setIsSpinning]  = useState(false)
  const [toast,       setToast]       = useState(null)

  const isMounted  = useRef(true)
  const tickRef    = useRef(null)
  const intervalRef = useRef(null)

  const customer     = JSON.parse(localStorage.getItem('customer') || '{}')
  const customerName = customer.name || customer.full_name || 'Customer'
  const customerId   = customer.id

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchJobs = useCallback(async (silent = false) => {
    const token = localStorage.getItem('access_token') || ''
    const cust  = JSON.parse(localStorage.getItem('customer') || '{}')
    const cid   = cust.id

    if (!token || !cid) {
      setError('Session expired. Please log in again.')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/jobs/customer/${customerId}/jobs/`, {
  headers: {
    'Content-Type': 'application/json',
    // 1. Changed Bearer to Token
    // 2. Added /jobs/ at the end of the URL
    'Authorization': `Token ${token}`, 
  },
});

      if (!isMounted.current) return
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      const jobList = extractArray(data, ['jobs'])
      setJobs(jobList)
      if (!silent) setError('')
    } catch (e) {
      if (isMounted.current && !silent)
        setError('Failed to load jobs. Please try again.')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [])

  const resetTimer = useCallback(() => {
    clearInterval(intervalRef.current)
    clearInterval(tickRef.current)
    setCountdown(AUTO_REFRESH)
    intervalRef.current = setInterval(() => {
      fetchJobs(true)
      setCountdown(AUTO_REFRESH)
    }, AUTO_REFRESH * 1000)
    tickRef.current = setInterval(() =>
      setCountdown(c => c <= 1 ? AUTO_REFRESH : c - 1), 1000)
  }, [fetchJobs])

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const cust  = JSON.parse(localStorage.getItem('customer') || '{}')
    if (!token || !cust.id) { navigate('/customer/login'); return }
    isMounted.current = true
    fetchJobs().then(resetTimer)
    return () => {
      isMounted.current = false
      clearInterval(intervalRef.current)
      clearInterval(tickRef.current)
    }
  }, [fetchJobs, resetTimer, navigate])

  const handleLogout = () => {
    clearInterval(intervalRef.current)
    clearInterval(tickRef.current)
    localStorage.removeItem('customer')
    localStorage.removeItem('access_token')
    navigate('/customer/login')
  }

  const handleManualRefresh = () => {
    setIsSpinning(true)
    fetchJobs(true).then(() => {
      resetTimer()
      setTimeout(() => setIsSpinning(false), 550)
      showToast('Jobs refreshed')
    })
  }

  const total      = jobs.length
  const completed  = jobs.filter(j => ['completed', 'report_sent'].includes(j.status)).length
  const active     = jobs.filter(j => ['in_progress', 'observations_recorded'].includes(j.status)).length
  const scheduled  = jobs.filter(j => j.status === 'scheduled').length
  const reports    = jobs.filter(j => j.status === 'report_sent').length

  const tabCount = (key) =>
    key === 'all' ? jobs.length : jobs.filter(j => j.status === key).length

  const filtered = jobs
    .filter(j => activeTab === 'all' || j.status === activeTab)
    .filter(j => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        (j.service_type      || '').toLowerCase().includes(q) ||
        (j.site_address      || '').toLowerCase().includes(q) ||
        (j.technician_name   || '').toLowerCase().includes(q) ||
        String(j.id).includes(q)
      )
    })
    .sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.scheduled_datetime) - new Date(a.scheduled_datetime)
      if (sortBy === 'date_asc')  return new Date(a.scheduled_datetime) - new Date(b.scheduled_datetime)
      if (sortBy === 'status')    return (a.status || '').localeCompare(b.status || '')
      return 0
    })

  return (
    <>
      <style>{S}</style>
      <div className="cj-root">

        <div className={`cj-overlay${sidebarOpen ? ' show' : ''}`} onClick={() => setSidebarOpen(false)}/>

        {/* SIDEBAR */}
        <aside className={`cj-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="cj-sb-logo">
            <div className="cj-sb-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/></svg>
            </div>
            <span className="cj-sb-brand">PestPro</span>
          </div>
          <nav className="cj-sb-nav">
            {navItems.map(n => (
              <Link
                key={n.id}
                to={n.path}
                className={`cj-sb-item${n.id === 'jobs' ? ' active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d={n.d}/>
                </svg>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="cj-sb-user">
            <div className="cj-sb-avatar">{customerName[0]?.toUpperCase()}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div className="cj-sb-uname">{customerName}</div>
              <div className="cj-sb-urole">Customer</div>
            </div>
            <button className="cj-sb-logout" onClick={handleLogout} title="Logout">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <div className="cj-main">

          {/* TOPBAR */}
          <div className="cj-topbar">
            <div className="cj-topbar-left">
              <button className="cj-hamburger" onClick={() => setSidebarOpen(o => !o)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              </button>
              <span className="cj-crumb">Customer Portal &nbsp;›&nbsp; <span>My Jobs</span></span>
            </div>
            <div className="cj-topbar-right">
              <span className={`cj-ticker${countdown <= 8 ? ' soon' : ''}`}>↻ {countdown}s</span>
              <button
                className={`cj-refresh-btn${isSpinning ? ' spinning' : ''}`}
                onClick={handleManualRefresh}
              >
                <svg viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Refresh
              </button>
            </div>
          </div>

          {/* CONTENT */}
          <div className="cj-content">

            {/* HERO */}
            <div className="cj-hero">
              <div className="cj-hero-left">
                <div className="cj-hero-greeting">Welcome back</div>
                <div className="cj-hero-title">{customerName}'s Service History</div>
                <div className="cj-hero-sub">Track all your pest control visits in one place</div>
              </div>
              <div className="cj-hero-right">
                <div className="cj-hero-stat-label">Total Jobs</div>
                <div className="cj-hero-stat-val">{total}</div>
                <div className="cj-hero-stat-sub">{completed} completed</div>
              </div>
            </div>

            {/* STATS */}
            <div className="cj-stats">
              <div className="cj-stat">
                <div className="cj-stat-label">Completed</div>
                <div className="cj-stat-val green">{completed}</div>
                <div className="cj-stat-sub">{total > 0 ? `${Math.round(completed/total*100)}% done` : '0% done'}</div>
              </div>
              <div className="cj-stat">
                <div className="cj-stat-label">Active Now</div>
                <div className="cj-stat-val blue">{active}</div>
                <div className="cj-stat-sub">In progress</div>
              </div>
              <div className="cj-stat">
                <div className="cj-stat-label">Scheduled</div>
                <div className="cj-stat-val amber">{scheduled}</div>
                <div className="cj-stat-sub">Upcoming visits</div>
              </div>
              <div className="cj-stat">
                <div className="cj-stat-label">Reports Ready</div>
                <div className="cj-stat-val">{reports}</div>
                <div className="cj-stat-sub">Available to download</div>
              </div>
            </div>

            {error && <div className="cj-error">{error}</div>}

            {loading ? (
              <div className="cj-loading"><div className="cj-spinner"/>Loading your jobs…</div>
            ) : (
              <>
                {/* TABS */}
                <div className="cj-tabs">
                  {FILTER_TABS.map(tab => (
                    <button
                      key={tab.key}
                      className={`cj-tab${activeTab === tab.key ? ' active' : ''}`}
                      onClick={() => setActiveTab(tab.key)}
                    >
                      {tab.label}
                      <span className="cj-tab-count">{tabCount(tab.key)}</span>
                    </button>
                  ))}
                </div>

                {/* CONTROLS */}
                <div className="cj-controls">
                  <div className="cj-search-wrap">
                    <svg viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    <input
                      className="cj-search"
                      placeholder="Search by service, address, technician…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                  <select
                    className="cj-sort-select"
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                  >
                    <option value="date_desc">Latest First</option>
                    <option value="date_asc">Earliest First</option>
                    <option value="status">Sort by Status</option>
                  </select>
                </div>

                {/* LIST HEADER */}
                <div className="cj-list-hdr">
                  <span className="cj-list-title">
                    {filtered.length} job{filtered.length !== 1 ? 's' : ''}
                    {activeTab !== 'all' ? ` · ${FILTER_TABS.find(t=>t.key===activeTab)?.label}` : ''}
                    {search ? ` matching "${search}"` : ''}
                  </span>
                  <span className="cj-list-sub">
                    {sortBy === 'date_desc' ? 'Latest first' : sortBy === 'date_asc' ? 'Earliest first' : 'By status'}
                  </span>
                </div>

                {/* JOB CARDS */}
                {filtered.length === 0 ? (
                  <div className="cj-empty">
                    <div className="cj-empty-icon">📋</div>
                    <div className="cj-empty-title">
                      {search ? `No jobs match "${search}"` : activeTab !== 'all' ? `No ${FILTER_TABS.find(t=>t.key===activeTab)?.label} jobs` : 'No jobs yet'}
                    </div>
                    <div className="cj-empty-sub">
                      {activeTab !== 'all' ? 'Try switching to "All Jobs" to see everything' : 'Your service visits will appear here once scheduled'}
                    </div>
                  </div>
                ) : filtered.map((job, i) => {
                  const st      = STATUS_CONFIG[job.status] || { label: fmt(job.status), cls: 'scheduled', icon: '🔍' }
                  const svcIcon = SERVICE_ICONS[job.service_type] || '🔍'
                  const svc     = fmt(job.service_type || 'Service')
                  const addr    = job.site_address || '—'
                  const tech    = job.technician_name || null
                  const prog    = getProgress(job.status)
                  const hasReport = job.status === 'report_sent'

                  return (
                    <div
                      key={job.id || i}
                      className="cj-job-card"
                      onClick={() => navigate(`/customer/jobs/${job.id}`)}
                    >
                      <div className="cj-job-icon">{svcIcon}</div>

                      <div className="cj-job-body">
                        <div className="cj-job-top">
                          <span className="cj-job-id">Job #{job.id}</span>
                          <span className={`cj-status ${st.cls}`}>
                            <span className="cj-status-dot"/>
                            {st.label}
                          </span>
                          {hasReport && (
                            <span className="cj-report-badge">
                              <svg viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                              </svg>
                              Report Ready
                            </span>
                          )}
                        </div>

                        <div className="cj-job-name">{svc}</div>

                        <div className="cj-job-meta">
                          <span className={`cj-job-tech${!tech ? ' none' : ''}`}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                            </svg>
                            {tech || 'Technician TBA'}
                          </span>
                          <span className="cj-job-info">
                            <svg viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                            </svg>
                            {addr.length > 40 ? addr.slice(0, 40) + '…' : addr}
                          </span>
                        </div>

                        {prog.pct > 0 && (
                          <div className="cj-job-progress">
                            <div className="cj-progress-label">
                              <span>{prog.label}</span>
                              <span>{prog.pct}%</span>
                            </div>
                            <div className="cj-progress-bar">
                              <div className={`cj-progress-fill ${prog.cls}`} style={{ width: `${prog.pct}%` }}/>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="cj-job-right">
                        {job.scheduled_datetime && (
                          <div className="cj-job-date">
                            <div className="cj-job-date-val">{fmtDate(job.scheduled_datetime)}</div>
                            <div className="cj-job-date-time">{fmtTime(job.scheduled_datetime)}</div>
                          </div>
                        )}
                        <button
                          className="cj-view-btn"
                          onClick={e => { e.stopPropagation(); navigate(`/customer/jobs/${job.id}`) }}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </div>

        {toast && (
          <div className={`cj-toast ${toast.type}`}>
            {toast.type === 'error'
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            }
            {toast.msg}
          </div>
        )}
      </div>
    </>
  )
}