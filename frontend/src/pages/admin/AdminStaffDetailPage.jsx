import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

const displayName = (user) => {
  if (!user) return 'Admin'
  return user.full_name || user.name || (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : null) || user.first_name || user.username || 'Admin'
}
const initials = (name = '') => {
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return (parts[0]?.[0] || 'A').toUpperCase()
}
const fmt = (s = '') => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
const fmtDate = (dt) => { if (!dt) return '—'; return new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }
const fmtDateTime = (dt) => { if (!dt) return '—'; return new Date(dt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }

const AUTO_REFRESH_SECS = 30

const STATUS_CONFIG = {
  scheduled:             { label: 'Scheduled',     cls: 'pending'    },
  in_progress:           { label: 'In Progress',   cls: 'inprogress' },
  observations_recorded: { label: 'Obs. Recorded', cls: 'obs'        },
  completed:             { label: 'Completed',     cls: 'done'       },
  report_sent:           { label: 'Report Sent',   cls: 'done'       },
  cancelled:             { label: 'Cancelled',     cls: 'cancelled'  },
}

const navItems = [
  { id: 'dashboard',   label: 'Dashboard',   path: '/dashboard',             d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'jobs',        label: 'All Jobs',    path: '/dashboard/jobs',        d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'customers',   label: 'Customers',   path: '/dashboard/customers',   d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'technicians', label: 'Technicians', path: '/dashboard/technicians', d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { id: 'reports',     label: 'Reports',     path: '/dashboard/reports',     d: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'alerts',      label: 'Smart Alerts',path: '/dashboard/alerts',      d: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { id: 'settings',    label: 'Settings',    path: '/dashboard/settings',    d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
]

const S = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{--green:#1a6b3c;--green-dark:#1a4d2e;--green-light:#edf6f1;--ink:#1a2e1a;--muted:#7a8c7a;--pale:#a0b0a0;--border:#e8ebe8;--bg:#f0f2f0;--white:#fff;--red:#e74c3c;--amber:#e6a817;--blue:#3b82f6;--sidebar-w:220px;}
.atd-root{font-family:'DM Serif Display',serif;min-height:100vh;background:var(--bg);display:flex;}

/* ── SIDEBAR ── */
.atd-sidebar{width:var(--sidebar-w);background:var(--white);border-right:1px solid var(--border);display:flex;flex-direction:column;min-height:100vh;position:fixed;top:0;left:0;bottom:0;z-index:200;overflow-y:auto;transition:transform .25s ease;}
.atd-sb-logo{padding:16px 20px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border);}
.atd-sb-icon{width:28px;height:28px;background:var(--green);border-radius:6px;display:flex;align-items:center;justify-content:center;}
.atd-sb-icon svg{width:15px;height:15px;fill:white;}
.atd-sb-brand{font-size:16px;color:var(--ink);}
.atd-sb-nav{padding:12px 10px;flex:1;}
.atd-sb-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;cursor:pointer;margin-bottom:2px;color:var(--muted);font-size:13.5px;transition:background .15s,color .15s;white-space:nowrap;}
.atd-sb-item:hover{background:var(--bg);color:var(--ink);}
.atd-sb-item.active{background:var(--green-light);color:var(--green);}
.atd-sb-item svg{width:16px;height:16px;flex-shrink:0;}
.atd-sb-user{padding:14px 16px;border-top:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-shrink:0;}
.atd-sb-avatar{width:32px;height:32px;background:var(--green);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;flex-shrink:0;}
.atd-sb-uname{font-size:13px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.atd-sb-urole{font-size:11px;color:var(--pale);}
.atd-sb-logout{background:none;border:none;cursor:pointer;color:var(--pale);padding:4px;border-radius:6px;display:flex;align-items:center;margin-left:auto;transition:color .15s,background .15s;}
.atd-sb-logout:hover{color:var(--red);background:#fde8e8;}
.atd-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:150;}
.atd-overlay.show{display:block;}
.atd-hamburger{display:none;background:none;border:none;cursor:pointer;padding:4px;border-radius:6px;color:var(--ink);}
.atd-hamburger svg{width:20px;height:20px;}

/* ── MAIN ── */
.atd-main{flex:1;margin-left:var(--sidebar-w);display:flex;flex-direction:column;min-height:100vh;}
.atd-topbar{background:var(--white);border-bottom:1px solid var(--border);padding:0 24px;height:52px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;flex-shrink:0;gap:12px;}
.atd-topbar-left{display:flex;align-items:center;gap:10px;}
.atd-back-btn{background:none;border:1.5px solid var(--border);border-radius:9px;padding:7px 14px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;color:var(--ink);display:flex;align-items:center;gap:6px;transition:background .15s;}
.atd-back-btn:hover{background:var(--bg);}
.atd-crumb{font-size:13px;color:var(--pale);}
.atd-crumb span{color:var(--ink);}
.atd-topbar-right{display:flex;align-items:center;gap:10px;}
.atd-ticker{font-size:12px;color:var(--pale);white-space:nowrap;}
.atd-ticker.soon{color:var(--green);}
.atd-refresh-btn{background:var(--bg);color:var(--ink);border:1.5px solid var(--border);border-radius:9px;padding:7px 14px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;transition:background .15s;}
.atd-refresh-btn:hover{background:#e2e8e2;}
.atd-refresh-btn svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2;}
.atd-refresh-btn.spinning svg{animation:atdSpin .55s linear;}
@keyframes atdSpin{to{transform:rotate(360deg);}}
.atd-edit-btn{background:var(--green);color:#fff;border:none;border-radius:9px;padding:7px 16px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;transition:background .15s;}
.atd-edit-btn:hover{background:var(--green-dark);}
.atd-edit-btn svg{width:14px;height:14px;stroke:white;fill:none;stroke-width:2;}

/* ── CONTENT ── */
.atd-content{padding:22px 24px 40px;flex:1;}
.atd-loading{display:flex;align-items:center;justify-content:center;padding:80px;color:var(--pale);font-size:14px;gap:10px;}
.atd-spinner{width:20px;height:20px;border:2px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:atdSpinner .8s linear infinite;}
@keyframes atdSpinner{to{transform:rotate(360deg);}}
.atd-error{background:#fde8e8;color:var(--red);padding:12px 16px;border-radius:10px;font-size:13px;margin-bottom:16px;}

/* ── HERO ── */
.atd-hero{background:var(--white);border-radius:16px;padding:24px 28px;box-shadow:0 2px 12px rgba(0,0,0,.05);margin-bottom:18px;display:flex;align-items:center;gap:20px;flex-wrap:wrap;}
.atd-hero-av{width:64px;height:64px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;flex-shrink:0;}
.atd-hero-av.inactive{background:#c8cfc8;}
.atd-hero-info{flex:1;min-width:0;}
.atd-hero-name{font-size:22px;color:var(--ink);margin-bottom:4px;}
.atd-hero-role{font-size:14px;color:var(--muted);margin-bottom:8px;}
.atd-hero-chips{display:flex;gap:8px;flex-wrap:wrap;}
.atd-chip{font-size:12px;padding:3px 12px;border-radius:20px;}
.atd-chip.active{background:var(--green-light);color:var(--green);}
.atd-chip.inactive{background:#f0f2f0;color:var(--muted);}
.atd-chip.role{background:#eff6ff;color:var(--blue);}
.atd-chip.supervisor{background:#f3e8ff;color:#7c3aed;}
.atd-hero-actions{display:flex;gap:10px;flex-wrap:wrap;}
.atd-hero-edit-btn{background:var(--green);color:#fff;border:none;border-radius:10px;padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;transition:background .15s;}
.atd-hero-edit-btn:hover{background:var(--green-dark);}
.atd-hero-toggle-btn{border:none;border-radius:10px;padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;transition:background .15s;}
.atd-hero-toggle-btn.deactivate{background:#fde8e8;color:var(--red);}
.atd-hero-toggle-btn.deactivate:hover{background:#f5c6c6;}
.atd-hero-toggle-btn.activate{background:#fff8ec;color:var(--amber);}
.atd-hero-toggle-btn.activate:hover{background:#fde8c0;}

/* ── STATS ── */
.atd-stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;}
.atd-mini-stat{background:var(--white);border-radius:12px;padding:14px 16px;box-shadow:0 1px 6px rgba(0,0,0,.05);}
.atd-mini-label{font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:var(--pale);margin-bottom:5px;}
.atd-mini-val{font-size:24px;color:var(--ink);letter-spacing:-1px;line-height:1;}
.atd-mini-val.green{color:var(--green);}
.atd-mini-val.blue{color:var(--blue);}
.atd-mini-val.amber{color:var(--amber);}
.atd-mini-sub{font-size:11px;color:var(--muted);margin-top:3px;}

/* ── GRID ── */
.atd-grid{display:grid;grid-template-columns:1fr 320px;gap:18px;align-items:start;}
.atd-card{background:var(--white);border-radius:16px;padding:22px;box-shadow:0 2px 12px rgba(0,0,0,.05);margin-bottom:16px;}
.atd-card:last-child{margin-bottom:0;}
.atd-card-title{font-size:10.5px;text-transform:uppercase;letter-spacing:.8px;color:var(--pale);margin-bottom:16px;display:flex;align-items:center;gap:6px;}
.atd-card-title svg{width:13px;height:13px;}

/* ── INFO GRID ── */
.atd-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;}
.atd-info-cell{padding:11px 0;border-bottom:1px solid #f5f7f5;}
.atd-info-cell:nth-last-child(-n+2){border-bottom:none;}
.atd-info-cell.full{grid-column:1/-1;}
.atd-info-label{font-size:10px;color:var(--pale);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;}
.atd-info-value{font-size:14px;color:var(--ink);}
.atd-info-value.muted{color:var(--muted);}
.atd-info-value a{color:var(--green);text-decoration:none;}
.atd-info-value a:hover{text-decoration:underline;}

/* ── JOB ROWS ── */
.atd-job-row{display:flex;align-items:center;gap:12px;padding:12px 8px;border-bottom:1px solid #f5f7f5;cursor:pointer;border-radius:8px;transition:background .12s;}
.atd-job-row:last-child{border-bottom:none;}
.atd-job-row:hover{background:var(--bg);}
.atd-job-row:hover .atd-job-name{color:var(--green);}
.atd-job-icon{width:34px;height:34px;border-radius:9px;background:var(--green-light);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.atd-job-icon svg{width:15px;height:15px;stroke:var(--green);fill:none;stroke-width:2;}
.atd-job-body{flex:1;min-width:0;}
.atd-job-name{font-size:13.5px;color:var(--ink);margin-bottom:2px;transition:color .15s;}
.atd-job-meta{font-size:11.5px;color:var(--pale);}
.atd-job-badge{font-size:11px;padding:3px 9px;border-radius:6px;flex-shrink:0;}
.atd-job-badge.pending{background:#fff8ec;color:var(--amber);}
.atd-job-badge.inprogress{background:var(--green-light);color:var(--green);}
.atd-job-badge.obs{background:#eff6ff;color:var(--blue);}
.atd-job-badge.done{background:#f0f2f0;color:var(--muted);}
.atd-job-badge.cancelled{background:#fde8e8;color:var(--red);}
.atd-no-jobs{text-align:center;padding:28px 20px;color:var(--pale);font-size:13px;line-height:1.7;}

/* ── PERFORMANCE BAR ── */
.atd-perf-row{display:flex;flex-direction:column;gap:4px;padding:10px 0;border-bottom:1px solid #f5f7f5;}
.atd-perf-row:last-child{border-bottom:none;}
.atd-perf-top{display:flex;justify-content:space-between;align-items:center;}
.atd-perf-label{font-size:13px;color:var(--ink);}
.atd-perf-pct{font-size:12px;color:var(--pale);}
.atd-perf-bar{height:6px;background:var(--bg);border-radius:3px;overflow:hidden;margin-top:4px;}
.atd-perf-fill{height:100%;border-radius:3px;background:var(--green);transition:width .4s ease;}

/* ── ACCOUNT INFO ── */
.atd-info-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f5f7f5;}
.atd-info-row:last-child{border-bottom:none;}
.atd-info-row-label{font-size:13.5px;color:var(--ink);}
.atd-info-row-val{font-size:12px;padding:3px 10px;border-radius:6px;}
.atd-info-row-val.yes{background:var(--green-light);color:var(--green);}
.atd-info-row-val.no{background:#f0f2f0;color:var(--muted);}
.atd-info-row-val.plain{font-size:13px;color:var(--muted);background:none;padding:0;}

/* ── MODAL ── */
.atd-modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;}
.atd-modal{background:var(--white);border-radius:16px;width:100%;max-width:480px;box-shadow:0 20px 60px rgba(0,0,0,.15);overflow:hidden;}
.atd-modal-hdr{padding:20px 24px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
.atd-modal-title{font-size:17px;color:var(--ink);}
.atd-modal-close{background:none;border:none;cursor:pointer;color:var(--pale);padding:4px;border-radius:6px;display:flex;align-items:center;}
.atd-modal-close:hover{color:var(--ink);}
.atd-modal-body{padding:20px 24px;}
.atd-modal-ftr{padding:16px 24px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:10px;}
.atd-field{margin-bottom:14px;}
.atd-field label{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:var(--pale);margin-bottom:6px;}
.atd-field input,.atd-field select{width:100%;border:1.5px solid var(--border);border-radius:10px;padding:10px 14px;font-family:'DM Serif Display',serif;font-size:13.5px;color:var(--ink);outline:none;background:var(--white);transition:border-color .2s;}
.atd-field input:focus,.atd-field select:focus{border-color:var(--green);}
.atd-field input.error{border-color:var(--red);}
.atd-field-err{font-size:11.5px;color:var(--red);margin-top:4px;}
.atd-field-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.atd-btn-cancel{background:var(--bg);color:var(--muted);border:1.5px solid var(--border);border-radius:9px;padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;}
.atd-btn-save{background:var(--green);color:#fff;border:none;border-radius:9px;padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;}
.atd-btn-save:hover{background:var(--green-dark);}
.atd-btn-save:disabled{opacity:.5;cursor:not-allowed;}
.atd-btn-danger{background:var(--red);color:#fff;border:none;border-radius:9px;padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;}
.atd-btn-amber{background:var(--amber);color:#fff;border:none;border-radius:9px;padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;}

/* ── TOAST ── */
.atd-toast{position:fixed;bottom:20px;right:20px;z-index:700;display:flex;align-items:center;gap:10px;padding:12px 18px;border-radius:10px;font-size:13px;box-shadow:0 4px 20px rgba(0,0,0,.15);animation:atdSlide .25s ease;}
@keyframes atdSlide{from{transform:translateY(20px);opacity:0;}to{transform:translateY(0);opacity:1;}}
.atd-toast.success{background:var(--green);color:#fff;}
.atd-toast.error{background:var(--red);color:#fff;}

/* ── RESPONSIVE ── */
@media(max-width:900px){.atd-grid{grid-template-columns:1fr;}.atd-stats-row{grid-template-columns:1fr 1fr;}}
@media(max-width:768px){.atd-sidebar{transform:translateX(-100%);}.atd-sidebar.open{transform:translateX(0);}.atd-main{margin-left:0;}.atd-hamburger{display:flex;}.atd-content{padding:14px 16px 32px;}.atd-info-grid{grid-template-columns:1fr;}.atd-info-cell:nth-last-child(-n+2){border-bottom:1px solid #f5f7f5;}.atd-info-cell:last-child{border-bottom:none;}.atd-field-row{grid-template-columns:1fr;}.atd-hero{gap:14px;}}
@media(max-width:480px){.atd-stats-row{grid-template-columns:1fr 1fr;}.atd-topbar{padding:0 14px;}}
`

export default function AdminTechnicianDetailPage() {
  const { id }           = useParams()
  const navigate         = useNavigate()
  const { user, logout } = useAuth()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isSpinning,  setIsSpinning]  = useState(false)
  const [tech,        setTech]        = useState(null)
  const [jobs,        setJobs]        = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [editModal,   setEditModal]   = useState(false)
  const [toggleModal, setToggleModal] = useState(false)
  const [toast,       setToast]       = useState(null)
  const [countdown,   setCountdown]   = useState(AUTO_REFRESH_SECS)

  const tickRef   = useRef(null)
  const isMounted = useRef(true)

  const userName     = displayName(user)
  const userInitials = initials(userName)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  /* ── FETCH DATA ── */
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setError('')
    try {
      // Fetch technician profile
      const techRes = await api.get(`/staff/${id}/`)
      if (!isMounted.current) return
      setTech(techRes.data)

      // Fetch jobs assigned to this technician
      let fetchedJobs = []
      try {
        const r = await api.get(`/jobs/technician/${id}/`)
        fetchedJobs = r.data?.results || r.data || []
      } catch {
        // fallback: fetch all jobs and filter client-side
        try {
          const r = await api.get('/jobs/')
          const all = r.data?.results || r.data || []
          const numId = parseInt(id)
          fetchedJobs = all.filter(j =>
            j.assigned_technician === numId ||
            String(j.assigned_technician) === String(id) ||
            j.technician_name === techRes.data?.first_name + ' ' + techRes.data?.last_name
          )
        } catch { /* silent */ }
      }

      if (!isMounted.current) return
      const data = fetchedJobs
setJobs(Array.isArray(data) ? data : data.results || [])
    } catch (e) {
      if (!silent && isMounted.current)
        setError(e.response?.status === 404 ? 'Technician not found.' : 'Failed to load technician details.')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [id])

  const resetTimer = useCallback(() => {
    clearInterval(tickRef.current)
    setCountdown(AUTO_REFRESH_SECS)
    tickRef.current = setInterval(() => {
      setCountdown(c => { if (c <= 1) { fetchData(true); return AUTO_REFRESH_SECS } return c - 1 })
    }, 1000)
  }, [fetchData])

  useEffect(() => {
    isMounted.current = true
    fetchData().then(resetTimer)
    return () => { isMounted.current = false; clearInterval(tickRef.current) }
  }, [fetchData, resetTimer])

  const manualRefresh = () => {
    setIsSpinning(true)
    fetchData(true).then(() => { resetTimer(); setTimeout(() => setIsSpinning(false), 550) })
  }

  /* ── EDIT TECHNICIAN ── */
  const handleEdit = async (form) => {
    try {
      const res = await api.patch(`/staff/${id}/`, form)
      setTech(res.data)
      setEditModal(false)
      showToast('Technician updated successfully.')
      resetTimer()
    } catch (e) {
      const data = e.response?.data
      showToast(typeof data === 'object' ? Object.values(data).flat().join(' ') : 'Failed to update.', 'error')
    }
  }

  /* ── TOGGLE ACTIVE ── */
  const handleToggle = async (newActive) => {
    try {
      const res = await api.patch(`/staff/${id}/`, { is_active: newActive })
      setTech(res.data)
      setToggleModal(false)
      showToast(`Technician ${newActive ? 'activated' : 'deactivated'} successfully.`)
      resetTimer()
    } catch {
      showToast('Failed to update status.', 'error')
    }
  }

  const handleLogout = async () => {
    clearInterval(tickRef.current)
    await logout()
    navigate('/login')
  }

  /* ── COMPUTED STATS ── */
  const totalJobs     = jobs.length
  const completedJobs = jobs.filter(j => ['completed', 'report_sent'].includes(j.status)).length
  const activeJobs    = jobs.filter(j => j.status === 'in_progress').length
  const scheduledJobs = jobs.filter(j => j.status === 'scheduled').length
  const completionRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0

  console.log("JOBS TYPE:", typeof jobs)
console.log("JOBS VALUE:", jobs)

  const techFullName = tech
    ? (tech.full_name || `${tech.first_name || ''} ${tech.last_name || ''}`.trim() || tech.username || `Technician #${id}`)
    : `Technician #${id}`

  const techInits = initials(techFullName)

  return (
    <>
      <style>{S}</style>
      <div className="atd-root">
        <div className={`atd-overlay${sidebarOpen ? ' show' : ''}`} onClick={() => setSidebarOpen(false)}/>

        {/* ── SIDEBAR ── */}
        <aside className={`atd-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="atd-sb-logo">
            <div className="atd-sb-icon"><svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/></svg></div>
            <span className="atd-sb-brand">PestPro</span>
          </div>
          <nav className="atd-sb-nav">
            {navItems.map(n => (
              <div key={n.id} className={`atd-sb-item${n.id === 'technicians' ? ' active' : ''}`}
                onClick={() => { setSidebarOpen(false); navigate(n.path) }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d={n.d}/>
                </svg>
                {n.label}
              </div>
            ))}
          </nav>
          <div className="atd-sb-user">
            <div className="atd-sb-avatar">{userInitials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="atd-sb-uname">{userName}</div>
              <div className="atd-sb-urole">Administrator</div>
            </div>
            <button className="atd-sb-logout" onClick={handleLogout} title="Logout">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div className="atd-main">
          <div className="atd-topbar">
            <div className="atd-topbar-left">
              <button className="atd-hamburger" onClick={() => setSidebarOpen(o => !o)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              </button>
              <button className="atd-back-btn" onClick={() => navigate('/dashboard/technicians')}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
                </svg>
                Back
              </button>
              <span className="atd-crumb">
                Technicians &nbsp;›&nbsp; <span>{techFullName}</span>
              </span>
            </div>
            <div className="atd-topbar-right">
              <span className={`atd-ticker${countdown <= 10 ? ' soon' : ''}`}>↻ in {countdown}s</span>
              <button className={`atd-refresh-btn${isSpinning ? ' spinning' : ''}`} onClick={manualRefresh}>
                <svg viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Refresh
              </button>
              {tech && (
                <button className="atd-edit-btn" onClick={() => setEditModal(true)}>
                  <svg viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                  Edit
                </button>
              )}
            </div>
          </div>

          <div className="atd-content">
            {error && <div className="atd-error">{error}</div>}
            {loading ? (
              <div className="atd-loading"><div className="atd-spinner"/>Loading technician…</div>
            ) : !tech ? null : (
              <>
                {/* ── HERO ── */}
                <div className="atd-hero">
                  <div className={`atd-hero-av${tech.is_active === false ? ' inactive' : ''}`}>
                    {techInits}
                  </div>
                  <div className="atd-hero-info">
                    <div className="atd-hero-name">{techFullName}</div>
                    <div className="atd-hero-role">@{tech.username}</div>
                    <div className="atd-hero-chips">
                      <span className={`atd-chip ${tech.is_active !== false ? 'active' : 'inactive'}`}>
                        {tech.is_active !== false ? '● Active' : '○ Inactive'}
                      </span>
                      <span className={`atd-chip ${tech.role === 'supervisor' ? 'supervisor' : 'role'}`}>
                        {fmt(tech.role || 'technician')}
                      </span>
                      <span className="atd-chip inactive">ID #{tech.id}</span>
                    </div>
                  </div>
                  <div className="atd-hero-actions">
                    <button className="atd-hero-edit-btn" onClick={() => setEditModal(true)}>
                      Edit Details
                    </button>
                    <button
                      className={`atd-hero-toggle-btn ${tech.is_active !== false ? 'deactivate' : 'activate'}`}
                      onClick={() => setToggleModal(true)}
                    >
                      {tech.is_active !== false ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>

                {/* ── STATS ── */}
                <div className="atd-stats-row">
                  <div className="atd-mini-stat">
                    <div className="atd-mini-label">Total Jobs</div>
                    <div className="atd-mini-val">{totalJobs}</div>
                    <div className="atd-mini-sub">All assigned</div>
                  </div>
                  <div className="atd-mini-stat">
                    <div className="atd-mini-label">Completed</div>
                    <div className="atd-mini-val green">{completedJobs}</div>
                    <div className="atd-mini-sub">{completionRate}% rate</div>
                  </div>
                  <div className="atd-mini-stat">
                    <div className="atd-mini-label">Active Now</div>
                    <div className={`atd-mini-val${activeJobs > 0 ? ' blue' : ''}`}>{activeJobs}</div>
                    <div className="atd-mini-sub">In progress</div>
                  </div>
                  <div className="atd-mini-stat">
                    <div className="atd-mini-label">Scheduled</div>
                    <div className={`atd-mini-val${scheduledJobs > 0 ? ' amber' : ''}`}>{scheduledJobs}</div>
                    <div className="atd-mini-sub">Upcoming</div>
                  </div>
                </div>

                {/* ── MAIN GRID ── */}
                <div className="atd-grid">

                  {/* LEFT */}
                  <div>
                    {/* Contact Details */}
                    <div className="atd-card">
                      <div className="atd-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                        </svg>
                        Contact Details
                      </div>
                      <div className="atd-info-grid">
                        <div className="atd-info-cell">
                          <div className="atd-info-label">First Name</div>
                          <div className="atd-info-value">{tech.first_name || '—'}</div>
                        </div>
                        <div className="atd-info-cell">
                          <div className="atd-info-label">Last Name</div>
                          <div className="atd-info-value">{tech.last_name || '—'}</div>
                        </div>
                        <div className="atd-info-cell full">
                          <div className="atd-info-label">Email</div>
                          <div className="atd-info-value">
                            <a href={`mailto:${tech.email}`}>{tech.email || '—'}</a>
                          </div>
                        </div>
                        <div className="atd-info-cell">
                          <div className="atd-info-label">Phone</div>
                          <div className="atd-info-value">
                            <a href={`tel:${tech.phone}`}>{tech.phone || '—'}</a>
                          </div>
                        </div>
                        <div className="atd-info-cell">
                          <div className="atd-info-label">Username</div>
                          <div className="atd-info-value muted">@{tech.username}</div>
                        </div>
                        <div className="atd-info-cell">
                          <div className="atd-info-label">Role</div>
                          <div className="atd-info-value muted">{fmt(tech.role || 'technician')}</div>
                        </div>
                        <div className="atd-info-cell">
                          <div className="atd-info-label">Joined</div>
                          <div className="atd-info-value muted">{fmtDate(tech.date_joined)}</div>
                        </div>
                        <div className="atd-info-cell">
                          <div className="atd-info-label">Status</div>
                          <div className="atd-info-value muted">{tech.is_active !== false ? 'Active' : 'Inactive'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Job History */}
                    <div className="atd-card">
                      <div className="atd-card-title" style={{ justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                          </svg>
                          Assigned Jobs
                        </span>
                        {totalJobs > 0 && (
                          <span style={{ background: 'var(--green-light)', color: 'var(--green)', borderRadius: 6, padding: '1px 8px', fontSize: 11 }}>
                            {totalJobs}
                          </span>
                        )}
                      </div>
                      {jobs.length === 0 ? (
                        <div className="atd-no-jobs">
                          No jobs assigned to this technician yet.<br/>
                          <span style={{ fontSize: 11, color: 'var(--pale)', fontStyle: 'italic' }}>
                            Assign jobs from the All Jobs page.
                          </span>
                        </div>
                      ) : (
                        [...jobs]
                          .sort((a, b) => new Date(b.scheduled_datetime || b.created_at || 0) - new Date(a.scheduled_datetime || a.created_at || 0))
                          .map(job => {
                            const st  = STATUS_CONFIG[job.status] || { label: fmt(job.status || 'Unknown'), cls: 'pending' }
                            const svc = job.service_type ? fmt(job.service_type) : job.title || 'Service Job'
                            return (
                              <div key={job.id} className="atd-job-row"
                                onClick={() => navigate(`/dashboard/jobs/${job.id}`)}>
                                <div className="atd-job-icon">
                                  <svg viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                                  </svg>
                                </div>
                                <div className="atd-job-body">
                                  <div className="atd-job-name">
                                    {svc}
                                    <span style={{ fontSize: 11, color: 'var(--pale)', marginLeft: 5 }}>#{job.id}</span>
                                  </div>
                                  <div className="atd-job-meta">
                                    {job.customer_name ? `${job.customer_name} · ` : ''}
                                    {fmtDateTime(job.scheduled_datetime || job.created_at)}
                                  </div>
                                </div>
                                <span className={`atd-job-badge ${st.cls}`}>{st.label}</span>
                              </div>
                            )
                          })
                      )}
                    </div>
                  </div>

                  {/* RIGHT */}
                  <div>
                    {/* Performance */}
                    <div className="atd-card">
                      <div className="atd-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                        </svg>
                        Performance
                      </div>
                      <div className="atd-perf-row">
                        <div className="atd-perf-top">
                          <span className="atd-perf-label">Completion Rate</span>
                          <span className="atd-perf-pct">{completionRate}%</span>
                        </div>
                        <div className="atd-perf-bar">
                          <div className="atd-perf-fill" style={{ width: `${completionRate}%` }}/>
                        </div>
                      </div>
                      <div className="atd-perf-row">
                        <div className="atd-perf-top">
                          <span className="atd-perf-label">Jobs Completed</span>
                          <span className="atd-perf-pct">{completedJobs}/{totalJobs}</span>
                        </div>
                        <div className="atd-perf-bar">
                          <div className="atd-perf-fill" style={{ width: totalJobs > 0 ? `${(completedJobs / totalJobs) * 100}%` : '0%', background: 'var(--green)' }}/>
                        </div>
                      </div>
                      <div className="atd-perf-row">
                        <div className="atd-perf-top">
                          <span className="atd-perf-label">Currently Active</span>
                          <span className="atd-perf-pct">{activeJobs} job{activeJobs !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="atd-perf-bar">
                          <div className="atd-perf-fill" style={{ width: totalJobs > 0 ? `${(activeJobs / totalJobs) * 100}%` : '0%', background: 'var(--blue)' }}/>
                        </div>
                      </div>
                    </div>

                    {/* Account Info */}
                    <div className="atd-card">
                      <div className="atd-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Account Info
                      </div>
                      <div className="atd-info-row">
                        <span className="atd-info-row-label">Staff ID</span>
                        <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>#{tech.id}</span>
                      </div>
                      <div className="atd-info-row">
                        <span className="atd-info-row-label">Role</span>
                        <span className={`atd-info-row-val ${tech.role === 'supervisor' ? 'yes' : 'plain'}`}>
                          {fmt(tech.role || 'technician')}
                        </span>
                      </div>
                      <div className="atd-info-row">
                        <span className="atd-info-row-label">Status</span>
                        <span className={`atd-info-row-val ${tech.is_active !== false ? 'yes' : 'no'}`}>
                          {tech.is_active !== false ? '✓ Active' : '✗ Inactive'}
                        </span>
                      </div>
                      <div className="atd-info-row">
                        <span className="atd-info-row-label">Joined</span>
                        <span className="atd-info-row-val plain">{fmtDate(tech.date_joined)}</span>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="atd-card">
                      <div className="atd-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                        </svg>
                        Quick Actions
                      </div>
                      <button
                        onClick={() => navigate('/dashboard/jobs?technician=' + id)}
                        style={{ width: '100%', background: 'var(--green-light)', color: 'var(--green)', border: 'none', borderRadius: 10, padding: '10px 14px', fontFamily: "'DM Serif Display', serif", fontSize: 13, cursor: 'pointer', textAlign: 'left', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                        </svg>
                        View All Assigned Jobs
                      </button>
                      <button
                        onClick={() => setEditModal(true)}
                        style={{ width: '100%', background: '#eff6ff', color: 'var(--blue)', border: 'none', borderRadius: 10, padding: '10px 14px', fontFamily: "'DM Serif Display', serif", fontSize: 13, cursor: 'pointer', textAlign: 'left', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                        Edit Profile
                      </button>
                      <button
                        onClick={() => setToggleModal(true)}
                        style={{ width: '100%', background: tech.is_active !== false ? '#fde8e8' : '#fff8ec', color: tech.is_active !== false ? 'var(--red)' : 'var(--amber)', border: 'none', borderRadius: 10, padding: '10px 14px', fontFamily: "'DM Serif Display', serif", fontSize: 13, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d={tech.is_active !== false ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"}/>
                        </svg>
                        {tech.is_active !== false ? 'Deactivate Account' : 'Activate Account'}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── MODALS ── */}
        {editModal && tech && (
          <EditModal tech={tech} onClose={() => setEditModal(false)} onSave={handleEdit}/>
        )}
        {toggleModal && tech && (
          <ToggleModal tech={tech} onClose={() => setToggleModal(false)} onConfirm={handleToggle}/>
        )}

        {/* ── TOAST ── */}
        {toast && (
          <div className={`atd-toast ${toast.type}`}>
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

/* ── EDIT MODAL ── */
function EditModal({ tech, onClose, onSave }) {
  const [form, setForm] = useState({
    first_name: tech.first_name || '',
    last_name:  tech.last_name  || '',
    email:      tech.email      || '',
    phone:      tech.phone      || '',
    role:       tech.role       || 'technician',
  })
  const [errors, setErrors]   = useState({})
  const [saving, setSaving]   = useState(false)

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  const validate = () => {
    const e = {}
    if (!form.first_name.trim()) e.first_name = 'First name is required.'
    if (!form.email.trim()) e.email = 'Email is required.'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email.'
    return e
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="atd-modal-bg" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="atd-modal">
        <div className="atd-modal-hdr">
          <span className="atd-modal-title">Edit Technician</span>
          <button className="atd-modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="atd-modal-body">
          <div className="atd-field-row">
            <div className="atd-field">
              <label>First Name *</label>
              <input className={errors.first_name ? 'error' : ''} value={form.first_name} onChange={e => set('first_name', e.target.value)}/>
              {errors.first_name && <div className="atd-field-err">{errors.first_name}</div>}
            </div>
            <div className="atd-field">
              <label>Last Name</label>
              <input value={form.last_name} onChange={e => set('last_name', e.target.value)}/>
            </div>
          </div>
          <div className="atd-field">
            <label>Email Address *</label>
            <input type="email" className={errors.email ? 'error' : ''} value={form.email} onChange={e => set('email', e.target.value)}/>
            {errors.email && <div className="atd-field-err">{errors.email}</div>}
          </div>
          <div className="atd-field">
            <label>Phone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="e.g. +91 98765 43210"/>
          </div>
          <div className="atd-field">
            <label>Role</label>
            <select value={form.role} onChange={e => set('role', e.target.value)}>
              <option value="technician">Technician</option>
              <option value="supervisor">Supervisor</option>
            </select>
          </div>
        </div>
        <div className="atd-modal-ftr">
          <button className="atd-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="atd-btn-save" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── TOGGLE MODAL ── */
function ToggleModal({ tech, onClose, onConfirm }) {
  const [saving, setSaving] = useState(false)
  const isActive = tech.is_active !== false
  const techName = tech.full_name || `${tech.first_name || ''} ${tech.last_name || ''}`.trim() || tech.username

  return (
    <div className="atd-modal-bg" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="atd-modal" style={{ maxWidth: 420 }}>
        <div className="atd-modal-hdr">
          <span className="atd-modal-title">{isActive ? 'Deactivate Technician' : 'Activate Technician'}</span>
          <button className="atd-modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="atd-modal-body" style={{ textAlign: 'center', paddingTop: 24 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', margin: '0 auto 16px', background: isActive ? '#fde8e8' : '#fff8ec', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isActive ? 'var(--red)' : 'var(--amber)'} strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d={isActive ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"}/>
            </svg>
          </div>
          <div style={{ fontSize: 16, color: 'var(--ink)', marginBottom: 8 }}>{techName}</div>
          <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6 }}>
            {isActive
              ? 'This technician will be marked inactive and will not appear in job assignment dropdowns.'
              : 'This technician will be reactivated and available for job assignments.'}
          </div>
        </div>
        <div className="atd-modal-ftr">
          <button className="atd-btn-cancel" onClick={onClose}>Cancel</button>
          {isActive
            ? <button className="atd-btn-danger" disabled={saving} onClick={async () => { setSaving(true); await onConfirm(false); setSaving(false) }}>
                {saving ? 'Deactivating…' : 'Deactivate'}
              </button>
            : <button className="atd-btn-amber" disabled={saving} onClick={async () => { setSaving(true); await onConfirm(true); setSaving(false) }}>
                {saving ? 'Activating…' : 'Activate'}
              </button>
          }
        </div>
      </div>
    </div>
  )
}