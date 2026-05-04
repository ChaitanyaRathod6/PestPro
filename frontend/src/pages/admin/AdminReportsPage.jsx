import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
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
const isExpired = (dt) => dt && new Date(dt) < new Date()

const AUTO_REFRESH_SECS = 30

/* ─────────────────────────────────────────────
   EMAIL TYPE CONFIG
───────────────────────────────────────────── */
const EMAIL_TYPE_CONFIG = {
  otp_login:           { label: 'OTP Login',           color: 'blue'   },
  job_started:         { label: 'Job Started',          color: 'green'  },
  observation_update:  { label: 'Observation Update',   color: 'purple' },
  completion_report:   { label: 'Completion Report',    color: 'green'  },
  high_activity_alert: { label: 'High Activity Alert',  color: 'red'    },
  maintenance_alert:   { label: 'Maintenance Alert',    color: 'amber'  },
}

const EMAIL_STATUS_CONFIG = {
  sent:     { label: 'Sent',     color: 'green'  },
  failed:   { label: 'Failed',   color: 'red'    },
  pending:  { label: 'Pending',  color: 'amber'  },
  retrying: { label: 'Retrying', color: 'blue'   },
}

const REPORT_TABS = [
  { key: 'pdf',   label: 'PDF Reports'  },
  { key: 'email', label: 'Email Logs'   },
  { key: 'stats', label: 'Email Stats'  },
]

/* ─────────────────────────────────────────────
   NAV ITEMS
───────────────────────────────────────────── */
const navItems = [
  { id: 'dashboard',   label: 'Dashboard',   path: '/dashboard',             d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'jobs',        label: 'All Jobs',     path: '/dashboard/jobs',        d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'customers',   label: 'Customers',    path: '/dashboard/customers',   d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'technicians', label: 'Technicians',  path: '/dashboard/technicians', d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { id: 'reports',     label: 'Reports',      path: '/dashboard/reports',     d: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'alerts',      label: 'Smart Alerts', path: '/dashboard/alerts',      d: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { id: 'settings',    label: 'Settings',     path: '/dashboard/settings',    d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
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
  --red:#e74c3c;--amber:#e6a817;--blue:#3b82f6;--purple:#7c3aed;
  --sidebar-w:220px;
}
.rp-root{font-family:'DM Serif Display',serif;min-height:100vh;background:var(--bg);display:flex;}

/* SIDEBAR */
.rp-sidebar{width:var(--sidebar-w);background:var(--white);border-right:1px solid var(--border);
  display:flex;flex-direction:column;min-height:100vh;
  position:fixed;top:0;left:0;bottom:0;z-index:200;overflow-y:auto;transition:transform .25s ease;}
.rp-sb-logo{padding:16px 20px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border);}
.rp-sb-icon{width:28px;height:28px;background:var(--green);border-radius:6px;display:flex;align-items:center;justify-content:center;}
.rp-sb-icon svg{width:15px;height:15px;fill:white;}
.rp-sb-brand{font-size:16px;color:var(--ink);}
.rp-sb-nav{padding:12px 10px;flex:1;}
.rp-sb-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;
  cursor:pointer;margin-bottom:2px;color:var(--muted);font-size:13.5px;
  transition:background .15s,color .15s;white-space:nowrap;}
.rp-sb-item:hover{background:var(--bg);color:var(--ink);}
.rp-sb-item.active{background:var(--green-light);color:var(--green);}
.rp-sb-item svg{width:16px;height:16px;flex-shrink:0;}
.rp-sb-user{padding:14px 16px;border-top:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-shrink:0;}
.rp-sb-avatar{width:32px;height:32px;background:var(--green);border-radius:50%;
  display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;flex-shrink:0;}
.rp-sb-uname{font-size:13px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.rp-sb-urole{font-size:11px;color:var(--pale);}
.rp-sb-logout{background:none;border:none;cursor:pointer;color:var(--pale);padding:4px;border-radius:6px;
  display:flex;align-items:center;margin-left:auto;transition:color .15s,background .15s;}
.rp-sb-logout:hover{color:var(--red);background:#fde8e8;}

/* OVERLAY + HAMBURGER */
.rp-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:150;}
.rp-overlay.show{display:block;}
.rp-hamburger{display:none;background:none;border:none;cursor:pointer;padding:4px;border-radius:6px;color:var(--ink);}
.rp-hamburger svg{width:20px;height:20px;}

/* MAIN */
.rp-main{flex:1;margin-left:var(--sidebar-w);display:flex;flex-direction:column;min-height:100vh;}

/* TOPBAR */
.rp-topbar{background:var(--white);border-bottom:1px solid var(--border);
  padding:0 24px;height:52px;display:flex;align-items:center;
  justify-content:space-between;position:sticky;top:0;z-index:100;flex-shrink:0;gap:12px;}
.rp-topbar-left{display:flex;align-items:center;gap:10px;}
.rp-crumb{font-size:13px;color:var(--pale);}
.rp-crumb span{color:var(--ink);}
.rp-topbar-right{display:flex;align-items:center;gap:10px;}
.rp-ticker{font-size:12px;color:var(--pale);white-space:nowrap;}
.rp-ticker.soon{color:var(--green);}
.rp-refresh-btn{background:var(--bg);color:var(--ink);border:1.5px solid var(--border);
  border-radius:9px;padding:7px 14px;font-family:'DM Serif Display',serif;font-size:13px;
  cursor:pointer;display:flex;align-items:center;gap:6px;transition:background .15s;}
.rp-refresh-btn:hover{background:#e2e8e2;}
.rp-refresh-btn svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2;transition:transform .35s;}
.rp-refresh-btn.spinning svg{animation:rpSpin .55s linear;}
@keyframes rpSpin{to{transform:rotate(360deg);}}

/* CONTENT */
.rp-content{padding:22px 24px;flex:1;}
.rp-page-title{font-size:22px;color:var(--ink);margin-bottom:3px;}
.rp-page-sub{font-size:13px;color:var(--pale);margin-bottom:20px;font-style:italic;}

/* STATS */
.rp-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px;}
.rp-stat{background:var(--white);border-radius:14px;padding:16px 18px;box-shadow:0 1px 8px rgba(0,0,0,.05);}
.rp-stat-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--pale);margin-bottom:6px;}
.rp-stat-val{font-size:28px;color:var(--ink);letter-spacing:-1px;line-height:1;}
.rp-stat-val.green{color:var(--green);}
.rp-stat-val.red{color:var(--red);}
.rp-stat-val.amber{color:var(--amber);}
.rp-stat-val.blue{color:var(--blue);}
.rp-stat-sub{font-size:11px;color:var(--muted);margin-top:4px;}

/* SECTION TABS */
.rp-tabs{display:flex;gap:6px;margin-bottom:20px;flex-wrap:wrap;}
.rp-tab{padding:8px 20px;border-radius:20px;font-family:'DM Serif Display',serif;
  font-size:13px;cursor:pointer;border:1.5px solid var(--border);
  background:var(--white);color:var(--muted);transition:all .15s;white-space:nowrap;}
.rp-tab:hover{border-color:var(--green);color:var(--green);}
.rp-tab.active{background:var(--green);color:#fff;border-color:var(--green);}

/* CONTROLS */
.rp-controls{display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap;}
.rp-search-wrap{flex:1;min-width:200px;position:relative;}
.rp-search-wrap svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);
  width:15px;height:15px;color:var(--pale);pointer-events:none;}
.rp-search{width:100%;border:1.5px solid var(--border);border-radius:10px;
  padding:9px 14px 9px 36px;font-family:'DM Serif Display',serif;font-size:13px;
  color:var(--ink);outline:none;background:var(--white);transition:border-color .2s;}
.rp-search:focus{border-color:var(--green);}
.rp-filter-select{border:1.5px solid var(--border);border-radius:10px;
  padding:9px 14px;font-family:'DM Serif Display',serif;font-size:13px;
  color:var(--ink);outline:none;background:var(--white);cursor:pointer;min-width:160px;}
.rp-filter-select:focus{border-color:var(--green);}

/* LIST HDR */
.rp-list-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
.rp-list-title{font-size:15px;color:var(--ink);}
.rp-list-meta{font-size:12px;color:var(--pale);}

/* PDF REPORT CARD */
.rp-card{background:var(--white);border-radius:14px;padding:18px 20px;
  margin-bottom:10px;display:flex;align-items:center;gap:16px;
  box-shadow:0 1px 6px rgba(0,0,0,.05);transition:box-shadow .15s,transform .15s;}
.rp-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.1);transform:translateY(-1px);}
.rp-card-icon{width:42px;height:42px;border-radius:12px;background:#fde8e8;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.rp-card-icon svg{width:20px;height:20px;stroke:var(--red);fill:none;stroke-width:1.8;}
.rp-card-icon.valid{background:var(--green-light);}
.rp-card-icon.valid svg{stroke:var(--green);}
.rp-card-body{flex:1;min-width:0;}
.rp-card-title{font-size:14.5px;color:var(--ink);margin-bottom:3px;}
.rp-card-meta{display:flex;gap:16px;flex-wrap:wrap;margin-top:4px;}
.rp-card-detail{font-size:12px;color:var(--muted);display:flex;align-items:center;gap:4px;}
.rp-card-detail svg{width:11px;height:11px;flex-shrink:0;}
.rp-badge{font-size:10.5px;padding:2px 9px;border-radius:6px;white-space:nowrap;}
.rp-badge.green{background:var(--green-light);color:var(--green);}
.rp-badge.red{background:#fde8e8;color:var(--red);}
.rp-badge.amber{background:#fff8ec;color:var(--amber);}
.rp-badge.blue{background:#eff6ff;color:var(--blue);}
.rp-badge.purple{background:#ede9fe;color:var(--purple);}
.rp-badge.muted{background:var(--bg);color:var(--muted);}
.rp-card-actions{display:flex;align-items:center;gap:8px;flex-shrink:0;flex-wrap:wrap;}
.rp-btn-download{background:var(--green-light);color:var(--green);border:none;border-radius:8px;
  padding:7px 14px;font-family:'DM Serif Display',serif;font-size:12.5px;
  cursor:pointer;transition:background .15s;display:flex;align-items:center;gap:5px;white-space:nowrap;}
.rp-btn-download:hover{background:#d5eee3;}
.rp-btn-download svg{width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2;}
.rp-btn-regen{background:#fff8ec;color:var(--amber);border:none;border-radius:8px;
  padding:7px 14px;font-family:'DM Serif Display',serif;font-size:12.5px;
  cursor:pointer;transition:background .15s;white-space:nowrap;}
.rp-btn-regen:hover{background:#fde8c0;}
.rp-btn-regen:disabled{opacity:.5;cursor:not-allowed;}

/* EMAIL LOG CARD */
.rp-email-card{background:var(--white);border-radius:14px;padding:16px 20px;
  margin-bottom:8px;display:flex;align-items:center;gap:14px;
  box-shadow:0 1px 6px rgba(0,0,0,.05);transition:box-shadow .15s;}
.rp-email-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.1);}
.rp-email-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.rp-email-icon.green{background:var(--green-light);}
.rp-email-icon.green svg{stroke:var(--green);}
.rp-email-icon.red{background:#fde8e8;}
.rp-email-icon.red svg{stroke:var(--red);}
.rp-email-icon.amber{background:#fff8ec;}
.rp-email-icon.amber svg{stroke:var(--amber);}
.rp-email-icon.blue{background:#eff6ff;}
.rp-email-icon.blue svg{stroke:var(--blue);}
.rp-email-icon svg{width:16px;height:16px;fill:none;stroke-width:2;}
.rp-email-body{flex:1;min-width:0;}
.rp-email-title-row{display:flex;align-items:center;gap:8px;margin-bottom:3px;flex-wrap:wrap;}
.rp-email-to{font-size:14px;color:var(--ink);}
.rp-email-subject{font-size:12px;color:var(--muted);margin-bottom:4px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.rp-email-meta{display:flex;gap:14px;flex-wrap:wrap;}
.rp-email-detail{font-size:11.5px;color:var(--pale);display:flex;align-items:center;gap:3px;}
.rp-email-detail svg{width:10px;height:10px;}

/* STATS PANEL */
.rp-stats-panel{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.rp-stats-section{background:var(--white);border-radius:14px;padding:20px 22px;
  box-shadow:0 1px 8px rgba(0,0,0,.05);}
.rp-stats-section-title{font-size:13px;text-transform:uppercase;letter-spacing:.8px;
  color:var(--pale);margin-bottom:16px;}
.rp-stat-row{display:flex;align-items:center;justify-content:space-between;
  padding:9px 0;border-bottom:1px solid var(--border);}
.rp-stat-row:last-child{border-bottom:none;}
.rp-stat-row-label{font-size:13px;color:var(--muted);}
.rp-stat-row-val{font-size:18px;color:var(--ink);letter-spacing:-.5px;}
.rp-stat-row-val.green{color:var(--green);}
.rp-stat-row-val.red{color:var(--red);}
.rp-stat-row-val.amber{color:var(--amber);}
.rp-stat-row-val.blue{color:var(--blue);}
.rp-stat-row-val.purple{color:var(--purple);}

/* EMPTY / LOADING / ERROR */
.rp-empty{text-align:center;padding:60px 20px;}
.rp-empty-icon{font-size:40px;margin-bottom:12px;}
.rp-empty-title{font-size:18px;color:var(--ink);margin-bottom:6px;}
.rp-empty-sub{font-size:13px;color:var(--pale);}
.rp-loading{display:flex;align-items:center;justify-content:center;padding:60px;color:var(--pale);font-size:14px;gap:10px;}
.rp-spinner{width:20px;height:20px;border:2px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:rpSpinner .8s linear infinite;}
@keyframes rpSpinner{to{transform:rotate(360deg);}}
.rp-error{background:#fde8e8;color:var(--red);padding:12px 16px;border-radius:10px;font-size:13px;margin-bottom:16px;}

/* TOAST */
.rp-toast{position:fixed;bottom:20px;right:20px;z-index:700;
  display:flex;align-items:center;gap:10px;padding:12px 18px;border-radius:10px;
  font-size:13px;box-shadow:0 4px 20px rgba(0,0,0,.15);animation:rpSlideIn .25s ease;}
@keyframes rpSlideIn{from{transform:translateY(20px);opacity:0;}to{transform:translateY(0);opacity:1;}}
.rp-toast.success{background:var(--green);color:#fff;}
.rp-toast.error{background:var(--red);color:#fff;}

/* RESPONSIVE */
@media(max-width:900px){.rp-stats{grid-template-columns:repeat(2,1fr);}.rp-stats-panel{grid-template-columns:1fr;}}
@media(max-width:768px){
  .rp-sidebar{transform:translateX(-100%);}
  .rp-sidebar.open{transform:translateX(0);}
  .rp-main{margin-left:0;}
  .rp-hamburger{display:flex;}
  .rp-card{flex-wrap:wrap;}
  .rp-card-actions{width:100%;justify-content:flex-end;}
}
@media(max-width:600px){
  .rp-stats{grid-template-columns:1fr 1fr;gap:10px;}
  .rp-content{padding:14px;}
  .rp-topbar{padding:0 14px;}
  .rp-stat-val{font-size:22px;}
}
`

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export default function AdminReportsPage() {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab,   setActiveTab]   = useState('pdf')

  /* PDF state */
  const [reports,     setReports]     = useState([])
  const [reportsLoad, setReportsLoad] = useState(true)
  const [reportsErr,  setReportsErr]  = useState('')
  const [regenId,     setRegenId]     = useState(null)

  /* Email log state */
  const [emails,      setEmails]      = useState([])
  const [emailsLoad,  setEmailsLoad]  = useState(true)
  const [emailsErr,   setEmailsErr]   = useState('')
  const [emailFilter, setEmailFilter] = useState('all')  // all | sent | failed | pending | retrying
  const [emailSearch, setEmailSearch] = useState('')

  /* Email stats state */
  const [stats,       setStats]       = useState(null)
  const [statsLoad,   setStatsLoad]   = useState(true)

  /* PDF search */
  const [pdfSearch,   setPdfSearch]   = useState('')

  /* Shared */
  const [isSpinning,  setIsSpinning]  = useState(false)
  const [toast,       setToast]       = useState(null)
  const [countdown,   setCountdown]   = useState(AUTO_REFRESH_SECS)

  const tickRef   = useRef(null)
  const isMounted = useRef(true)

  const userName     = displayName(user)
  const userInitials = initials(userName)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => isMounted.current && setToast(null), 3500)
  }

  /* ── FETCH PDF REPORTS ── */
  const fetchReports = useCallback(async (silent = false) => {
    if (!silent) setReportsErr('')
    try {
      const res = await api.get('/reports/pdf/')
      if (!isMounted.current) return
      setReports(res.data?.results || res.data || [])
    } catch (e) {
      if (!silent && isMounted.current)
        setReportsErr(e.response?.data?.error || 'Failed to load PDF reports.')
    } finally {
      if (isMounted.current) setReportsLoad(false)
    }
  }, [])

  /* ── FETCH EMAIL LOGS ── */
  const fetchEmails = useCallback(async (silent = false) => {
    if (!silent) setEmailsErr('')
    try {
      const params = {}
      if (emailFilter !== 'all') params.status = emailFilter
      const res = await api.get('/reports/emails/', { params })
      if (!isMounted.current) return
      setEmails(res.data?.results || res.data || [])
    } catch (e) {
      if (!silent && isMounted.current)
        setEmailsErr(e.response?.data?.error || 'Failed to load email logs.')
    } finally {
      if (isMounted.current) setEmailsLoad(false)
    }
  }, [emailFilter])

  /* ── FETCH EMAIL STATS ── */
  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/reports/emails/stats/')
      if (isMounted.current) setStats(res.data)
    } catch {
      // stats are optional — fail silently
    } finally {
      if (isMounted.current) setStatsLoad(false)
    }
  }, [])

  /* ── AUTO REFRESH ── */
  const resetTimer = useCallback(() => {
    clearInterval(tickRef.current)
    setCountdown(AUTO_REFRESH_SECS)
    tickRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          fetchReports(true)
          fetchEmails(true)
          fetchStats()
          return AUTO_REFRESH_SECS
        }
        return c - 1
      })
    }, 1000)
  }, [fetchReports, fetchEmails, fetchStats])

  useEffect(() => {
    isMounted.current = true
    Promise.all([fetchReports(), fetchEmails(), fetchStats()]).then(resetTimer)
    return () => { isMounted.current = false; clearInterval(tickRef.current) }
  }, [fetchReports, fetchEmails, fetchStats, resetTimer])

  /* re-fetch emails when filter changes */
  useEffect(() => {
    fetchEmails(true)
  }, [emailFilter, fetchEmails])

  const manualRefresh = () => {
    setIsSpinning(true)
    Promise.all([fetchReports(true), fetchEmails(true), fetchStats()]).then(() => {
      resetTimer()
      setTimeout(() => setIsSpinning(false), 550)
    })
  }

  /* ── REGENERATE PDF ── */
  const handleRegen = async (jobId) => {
    setRegenId(jobId)
    try {
      const res = await api.post(`/reports/pdf/${jobId}/regenerate/`)
      const updated = res.data?.report || res.data
      setReports(prev => prev.map(r => r.job === jobId || r.job_id === jobId ? { ...r, ...updated } : r))
      showToast('PDF report regenerated successfully.')
      fetchReports(true)
    } catch (e) {
      const msg = e.response?.data?.error || 'Failed to regenerate report.'
      showToast(msg, 'error')
    } finally {
      setRegenId(null)
    }
  }

  const handleLogout = async () => {
    clearInterval(tickRef.current)
    await logout()
    navigate('/login')
  }

  /* ── COMPUTED ── */
  const totalPdfs    = reports.length
  const validTokens  = reports.filter(r => !isExpired(r.token_expires_at)).length
  const expiredTokens = reports.filter(r => isExpired(r.token_expires_at)).length

  const filteredReports = reports.filter(r => {
    if (!pdfSearch.trim()) return true
    const q = pdfSearch.toLowerCase()
    return (
      String(r.job_id || r.job || '').includes(q) ||
      (r.generated_by_name || '').toLowerCase().includes(q)
    )
  })

  const filteredEmails = emails.filter(e => {
    if (!emailSearch.trim()) return true
    const q = emailSearch.toLowerCase()
    return (
      (e.recipient_email || '').toLowerCase().includes(q) ||
      (e.recipient_name  || '').toLowerCase().includes(q) ||
      (e.subject         || '').toLowerCase().includes(q) ||
      (e.email_type      || '').toLowerCase().includes(q)
    )
  })

  /* ── EMAIL STATUS COLOR ── */
  const statusColor = (s) => EMAIL_STATUS_CONFIG[s]?.color || 'muted'
  const typeColor   = (t) => EMAIL_TYPE_CONFIG[t]?.color   || 'muted'
  const typeLabel   = (t) => EMAIL_TYPE_CONFIG[t]?.label   || t

  return (
    <>
      <style>{S}</style>
      <div className="rp-root">

        <div className={`rp-overlay${sidebarOpen ? ' show' : ''}`} onClick={() => setSidebarOpen(false)}/>

        {/* SIDEBAR */}
        <aside className={`rp-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="rp-sb-logo">
            <div className="rp-sb-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/></svg>
            </div>
            <span className="rp-sb-brand">PestPro</span>
          </div>
          <nav className="rp-sb-nav">
            {navItems.map(n => (
              <div key={n.id}
                className={`rp-sb-item${n.id === 'reports' ? ' active' : ''}`}
                onClick={() => { setSidebarOpen(false); navigate(n.path) }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d={n.d}/>
                </svg>
                {n.label}
              </div>
            ))}
          </nav>
          <div className="rp-sb-user">
            <div className="rp-sb-avatar">{userInitials}</div>
            <div style={{flex:1,minWidth:0}}>
              <div className="rp-sb-uname">{userName}</div>
              <div className="rp-sb-urole">Administrator</div>
            </div>
            <button className="rp-sb-logout" type="button" onClick={handleLogout} title="Logout">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <div className="rp-main">

          {/* TOPBAR */}
          <div className="rp-topbar">
            <div className="rp-topbar-left">
              <button className="rp-hamburger" type="button" onClick={() => setSidebarOpen(o => !o)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              </button>
              <span className="rp-crumb">Admin &nbsp;›&nbsp; <span>Reports</span></span>
            </div>
            <div className="rp-topbar-right">
              <span className={`rp-ticker${countdown <= 10 ? ' soon' : ''}`}>↻ in {countdown}s</span>
              <button className={`rp-refresh-btn${isSpinning ? ' spinning' : ''}`} type="button" onClick={manualRefresh}>
                <svg viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Refresh
              </button>
            </div>
          </div>

          {/* CONTENT */}
          <div className="rp-content">
            <div className="rp-page-title">Reports</div>
            <div className="rp-page-sub">PDF completion reports &amp; email delivery logs · auto-refreshes every {AUTO_REFRESH_SECS}s</div>

            {/* TOP STATS */}
            <div className="rp-stats">
              <div className="rp-stat">
                <div className="rp-stat-label">Total PDF Reports</div>
                <div className="rp-stat-val">{totalPdfs}</div>
                <div className="rp-stat-sub">All jobs</div>
              </div>
              <div className="rp-stat">
                <div className="rp-stat-label">Valid Download Links</div>
                <div className="rp-stat-val green">{validTokens}</div>
                <div className="rp-stat-sub">Token not expired</div>
              </div>
              <div className="rp-stat">
                <div className="rp-stat-label">Expired Links</div>
                <div className="rp-stat-val red">{expiredTokens}</div>
                <div className="rp-stat-sub">Need regeneration</div>
              </div>
              <div className="rp-stat">
                <div className="rp-stat-label">Emails Sent</div>
                <div className="rp-stat-val blue">{stats?.sent ?? '—'}</div>
                <div className="rp-stat-sub">
                  {stats ? `${stats.failed} failed` : 'Loading…'}
                </div>
              </div>
            </div>

            {/* SECTION TABS */}
            <div className="rp-tabs">
              {REPORT_TABS.map(t => (
                <button key={t.key} type="button"
                  className={`rp-tab${activeTab === t.key ? ' active' : ''}`}
                  onClick={() => setActiveTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* ══ PDF REPORTS TAB ══ */}
            {activeTab === 'pdf' && (
              <>
                {reportsErr && <div className="rp-error">{reportsErr}</div>}

                <div className="rp-controls">
                  <div className="rp-search-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    <input className="rp-search"
                      placeholder="Search by job ID or generated by…"
                      value={pdfSearch} onChange={e => setPdfSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="rp-list-hdr">
                  <span className="rp-list-title">{filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}</span>
                  <span className="rp-list-meta">Newest First</span>
                </div>

                {reportsLoad ? (
                  <div className="rp-loading"><div className="rp-spinner"/>Loading reports…</div>
                ) : filteredReports.length === 0 ? (
                  <div className="rp-empty">
                    <div className="rp-empty-icon">📄</div>
                    <div className="rp-empty-title">No PDF reports found</div>
                    <div className="rp-empty-sub">Reports are generated automatically when a job is completed.</div>
                  </div>
                ) : (
                  filteredReports.map(r => {
                    const expired = isExpired(r.token_expires_at)
                    const jobId   = r.job_id || r.job
                    return (
                      <div key={r.id} className="rp-card">
                        {/* Icon */}
                        <div className={`rp-card-icon${expired ? '' : ' valid'}`}>
                          <svg viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round"
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                          </svg>
                        </div>

                        {/* Body */}
                        <div className="rp-card-body">
                          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3,flexWrap:'wrap'}}>
                            <span className="rp-card-title">Job #{jobId} — PDF Report</span>
                            <span className={`rp-badge ${expired ? 'red' : 'green'}`}>
                              {expired ? 'Link Expired' : 'Link Valid'}
                            </span>
                            {r.includes_signature && (
                              <span className="rp-badge green">✓ Signed</span>
                            )}
                          </div>
                          <div className="rp-card-meta">
                            <span className="rp-card-detail">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                              </svg>
                              Generated {fmtDateTime(r.generated_at)}
                            </span>
                            {r.file_size_kb > 0 && (
                              <span className="rp-card-detail">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
                                </svg>
                                {r.file_size_kb} KB
                              </span>
                            )}
                            <span className="rp-card-detail">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                              </svg>
                              Expires {fmtDate(r.token_expires_at)}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="rp-card-actions">
                          {r.report_file && (
                            <a
                              href={r.report_file}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{textDecoration:'none'}}
                            >
                              <button className="rp-btn-download" type="button">
                                <svg viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                </svg>
                                Download
                              </button>
                            </a>
                          )}
                          <button
                            className="rp-btn-regen"
                            type="button"
                            onClick={() => handleRegen(jobId)}
                            disabled={regenId === jobId}
                          >
                            {regenId === jobId ? 'Regenerating…' : 'Regenerate'}
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </>
            )}

            {/* ══ EMAIL LOGS TAB ══ */}
            {activeTab === 'email' && (
              <>
                {emailsErr && <div className="rp-error">{emailsErr}</div>}

                <div className="rp-controls">
                  <div className="rp-search-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    <input className="rp-search"
                      placeholder="Search by recipient, subject, type…"
                      value={emailSearch} onChange={e => setEmailSearch(e.target.value)}
                    />
                  </div>
                  <select className="rp-filter-select" value={emailFilter} onChange={e => setEmailFilter(e.target.value)}>
                    <option value="all">All Statuses</option>
                    <option value="sent">Sent</option>
                    <option value="failed">Failed</option>
                    <option value="pending">Pending</option>
                    <option value="retrying">Retrying</option>
                  </select>
                </div>

                <div className="rp-list-hdr">
                  <span className="rp-list-title">{filteredEmails.length} email{filteredEmails.length !== 1 ? 's' : ''}</span>
                  <span className="rp-list-meta">Newest First</span>
                </div>

                {emailsLoad ? (
                  <div className="rp-loading"><div className="rp-spinner"/>Loading email logs…</div>
                ) : filteredEmails.length === 0 ? (
                  <div className="rp-empty">
                    <div className="rp-empty-icon">📧</div>
                    <div className="rp-empty-title">No email logs found</div>
                    <div className="rp-empty-sub">
                      {emailFilter !== 'all' ? `No ${emailFilter} emails found.` : 'No emails have been sent yet.'}
                    </div>
                  </div>
                ) : (
                  filteredEmails.map(e => {
                    const sc = statusColor(e.status)
                    const tc = typeColor(e.email_type)
                    return (
                      <div key={e.id} className="rp-email-card">
                        {/* Icon */}
                        <div className={`rp-email-icon ${sc}`}>
                          <svg viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round"
                              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                          </svg>
                        </div>

                        {/* Body */}
                        <div className="rp-email-body">
                          <div className="rp-email-title-row">
                            <span className="rp-email-to">{e.recipient_name || e.recipient_email}</span>
                            <span className={`rp-badge ${sc}`}>
                              {EMAIL_STATUS_CONFIG[e.status]?.label || e.status}
                            </span>
                            <span className={`rp-badge ${tc}`}>{typeLabel(e.email_type)}</span>
                            {e.pdf_attached && <span className="rp-badge muted">📎 PDF</span>}
                          </div>
                          <div className="rp-email-subject">{e.subject || '—'}</div>
                          <div className="rp-email-meta">
                            <span className="rp-email-detail">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                              </svg>
                              {e.recipient_email}
                            </span>
                            <span className="rp-email-detail">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                              </svg>
                              {fmtDateTime(e.sent_at)}
                            </span>
                            {e.job_id && (
                              <span className="rp-email-detail">Job #{e.job_id}</span>
                            )}
                            {e.error_message && (
                              <span style={{fontSize:11.5,color:'var(--red)'}}>⚠ {e.error_message}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </>
            )}

            {/* ══ EMAIL STATS TAB ══ */}
            {activeTab === 'stats' && (
              <>
                {statsLoad ? (
                  <div className="rp-loading"><div className="rp-spinner"/>Loading stats…</div>
                ) : !stats ? (
                  <div className="rp-empty">
                    <div className="rp-empty-icon">📊</div>
                    <div className="rp-empty-title">Stats unavailable</div>
                    <div className="rp-empty-sub">Could not load email statistics.</div>
                  </div>
                ) : (
                  <div className="rp-stats-panel">
                    {/* Delivery status */}
                    <div className="rp-stats-section">
                      <div className="rp-stats-section-title">Delivery Status</div>
                      <div className="rp-stat-row">
                        <span className="rp-stat-row-label">Total Emails</span>
                        <span className="rp-stat-row-val">{stats.total}</span>
                      </div>
                      <div className="rp-stat-row">
                        <span className="rp-stat-row-label">Sent</span>
                        <span className="rp-stat-row-val green">{stats.sent}</span>
                      </div>
                      <div className="rp-stat-row">
                        <span className="rp-stat-row-label">Failed</span>
                        <span className="rp-stat-row-val red">{stats.failed}</span>
                      </div>
                      <div className="rp-stat-row">
                        <span className="rp-stat-row-label">Pending</span>
                        <span className="rp-stat-row-val amber">{stats.pending}</span>
                      </div>
                      <div className="rp-stat-row">
                        <span className="rp-stat-row-label">Retrying</span>
                        <span className="rp-stat-row-val blue">{stats.retrying}</span>
                      </div>
                      {stats.total > 0 && (
                        <div className="rp-stat-row">
                          <span className="rp-stat-row-label">Success Rate</span>
                          <span className="rp-stat-row-val green">
                            {Math.round((stats.sent / stats.total) * 100)}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* By type */}
                    <div className="rp-stats-section">
                      <div className="rp-stats-section-title">By Email Type</div>
                      {stats.by_type && Object.entries(stats.by_type).map(([key, count]) => (
                        <div key={key} className="rp-stat-row">
                          <span className="rp-stat-row-label">{typeLabel(key)}</span>
                          <span className={`rp-stat-row-val ${typeColor(key)}`}>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* TOAST */}
        {toast && (
          <div className={`rp-toast ${toast.type}`}>
            {toast.type === 'success'
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            }
            {toast.msg}
          </div>
        )}
      </div>
    </>
  )
}