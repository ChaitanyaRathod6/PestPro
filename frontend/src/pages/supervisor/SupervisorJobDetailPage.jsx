import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

/* ─── HELPERS ─── */
const displayName = (user) => {
  if (!user) return 'Supervisor'
  return user.full_name || user.name ||
    (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : null) ||
    user.first_name || user.username || 'Supervisor'
}
const initials = (name = '') => {
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return (parts[0]?.[0] || 'S').toUpperCase()
}
const fmtDate = (dt) => {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
const fmtDateTime = (dt) => {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}
const cap = (s) => s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—'

const STATUS_COLOR = {
  completed: 'green', report_sent: 'green',
  in_progress: 'blue', scheduled: 'amber', cancelled: 'red',
}
const SERVICE_ABBR = {
  rodent: 'RD', cockroach: 'CR', termite: 'TM', mosquito: 'MQ',
  flying_insect: 'FI', general: 'GP', bed_bug: 'BB', ant: 'AN',
}
const SERVICE_COLOR = {
  rodent: 'amber', cockroach: 'red', termite: 'orange',
  mosquito: 'blue', flying_insect: 'purple', general: 'green',
  bed_bug: 'red', ant: 'amber',
}
const AVATAR_COLORS = ['#1a6b3c','#1a4e8c','#7b3fa0','#e6a817','#1a4d2e','#2d9e5c','#c0392b']
const AUTO_REFRESH = 30

/* ─── NAV ─── */
const navItems = [
  { id: 'dashboard', label: 'Dashboard',  path: '/supervisor',      d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'jobs',      label: 'All Jobs',   path: '/supervisor/jobs', d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'alerts',    label: 'Alerts',     path: '/dashboard/alerts',d: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { id: 'reports',   label: 'Reports',    path: '/dashboard/reports',d: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
]

/* ─── CSS ─── */
const S = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap' );
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --green:#1a6b3c;--green-dark:#1a4d2e;--green-light:#edf6f1;
  --ink:#1a2e1a;--muted:#7a8c7a;--pale:#a0b0a0;
  --border:#e8ebe8;--bg:#f0f2f0;--white:#fff;
  --red:#e74c3c;--amber:#e6a817;--blue:#3b82f6;--purple:#7c3aed;--orange:#e6550d;
  --sidebar-w:220px;
}
.sj-root{font-family:'DM Serif Display',serif;min-height:100vh;background:var(--bg);display:flex;}

/* SIDEBAR */
.sj-sidebar{width:var(--sidebar-w);background:var(--white);border-right:1px solid var(--border);
  display:flex;flex-direction:column;min-height:100vh;
  position:fixed;top:0;left:0;bottom:0;z-index:200;overflow-y:auto;transition:transform .25s ease;}
.sj-sb-logo{padding:16px 20px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border);}
.sj-sb-icon{width:28px;height:28px;background:var(--green);border-radius:6px;display:flex;align-items:center;justify-content:center;}
.sj-sb-icon svg{width:15px;height:15px;fill:white;}
.sj-sb-brand{font-size:16px;color:var(--ink);}
.sj-sb-nav{padding:12px 10px;flex:1;}
.sj-sb-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;
  cursor:pointer;margin-bottom:2px;color:var(--muted);font-size:13.5px;
  transition:background .15s,color .15s;white-space:nowrap;}
.sj-sb-item:hover{background:var(--bg);color:var(--ink);}
.sj-sb-item.active{background:var(--green-light);color:var(--green);}
.sj-sb-item svg{width:16px;height:16px;flex-shrink:0;}
.sj-sb-user{padding:14px 16px;border-top:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-shrink:0;}
.sj-sb-avatar{width:32px;height:32px;background:var(--green);border-radius:50%;
  display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;flex-shrink:0;}
.sj-sb-uname{font-size:13px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.sj-sb-urole{font-size:11px;color:var(--pale);}
.sj-sb-logout{background:none;border:none;cursor:pointer;color:var(--pale);padding:4px;border-radius:6px;
  display:flex;align-items:center;margin-left:auto;transition:color .15s,background .15s;}
.sj-sb-logout:hover{color:var(--red);background:#fde8e8;}
.sj-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:150;}
.sj-overlay.show{display:block;}

/* MAIN */
.sj-main{flex:1;margin-left:var(--sidebar-w);display:flex;flex-direction:column;min-height:100vh;}
.sj-topbar{background:var(--white);border-bottom:1px solid var(--border);
  padding:0 24px;height:52px;display:flex;align-items:center;
  justify-content:space-between;position:sticky;top:0;z-index:100;flex-shrink:0;gap:12px;}
.sj-topbar-left{display:flex;align-items:center;gap:10px;}
.sj-hamburger{display:none;background:none;border:none;cursor:pointer;padding:4px;border-radius:6px;color:var(--ink);}
.sj-hamburger svg{width:20px;height:20px;}
.sj-crumb{font-size:13px;color:var(--pale);}
.sj-crumb span{color:var(--ink);}
.sj-topbar-right{display:flex;align-items:center;gap:8px;}
.sj-ticker{font-size:12px;color:var(--pale);white-space:nowrap;}
.sj-ticker.soon{color:var(--green);}
.sj-refresh-btn{background:var(--bg);color:var(--ink);border:1.5px solid var(--border);
  border-radius:9px;padding:7px 14px;font-family:'DM Serif Display',serif;font-size:13px;
  cursor:pointer;display:flex;align-items:center;gap:6px;transition:background .15s;}
.sj-refresh-btn:hover{background:#e2e8e2;}
.sj-refresh-btn.spinning svg{animation:sjSpin .7s linear infinite;}
@keyframes sjSpin{to{transform:rotate(360deg);}}
.sj-refresh-btn svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2;}

/* CONTENT */
.sj-content{padding:22px 24px;flex:1;}
.sj-page-title{font-size:22px;color:var(--ink);margin-bottom:3px;}
.sj-page-sub{font-size:13px;color:var(--pale);margin-bottom:20px;}

/* STATS */
.sj-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-bottom:20px;}
.sj-stat{background:var(--white);border-radius:14px;padding:16px 18px;box-shadow:0 1px 8px rgba(0,0,0,.05);}
.sj-stat-label{font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:var(--pale);margin-bottom:6px;}
.sj-stat-val{font-size:26px;color:var(--ink);letter-spacing:-1px;line-height:1;}
.sj-stat-val.green{color:var(--green);}
.sj-stat-val.amber{color:var(--amber);}
.sj-stat-val.red{color:var(--red);}
.sj-stat-val.blue{color:var(--blue);}
.sj-stat-sub{font-size:11px;color:var(--muted);margin-top:4px;}

/* FILTERS */
.sj-filter-row{display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center;}
.sj-filter-tab{padding:6px 16px;border-radius:20px;font-family:'DM Serif Display',serif;
  font-size:12.5px;cursor:pointer;border:1.5px solid var(--border);
  background:var(--white);color:var(--muted);transition:all .15s;white-space:nowrap;}
.sj-filter-tab:hover{border-color:var(--green);color:var(--green);}
.sj-filter-tab.active{}
.sj-search-wrap{flex:1;min-width:200px;position:relative;}
.sj-search-wrap svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);
  width:14px;height:14px;color:var(--pale);pointer-events:none;}
.sj-search{width:100%;border:1.5px solid var(--border);border-radius:10px;
  padding:8px 14px 8px 34px;font-family:'DM Serif Display',serif;font-size:13px;
  color:var(--ink);outline:none;background:var(--white);transition:border-color .2s;}
.sj-search:focus{border-color:var(--green);}

/* LIST HDR */
.sj-list-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
.sj-list-title{font-size:15px;color:var(--ink);}
.sj-list-meta{font-size:12px;color:var(--pale);}

/* JOB CARD */
.sj-card{background:var(--white);border-radius:14px;padding:16px 20px;
  margin-bottom:8px;display:flex;align-items:center;gap:14px;
  box-shadow:0 1px 6px rgba(0,0,0,.05);transition:box-shadow .15s,transform .15s;cursor:pointer;}
.sj-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.1);transform:translateY(-1px);}
.sj-avatar{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;
  justify-content:center;color:#fff;font-size:12px;font-weight:600;flex-shrink:0;}
.sj-body{flex:1;min-width:0;}
.sj-name-row{display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;}
.sj-name{font-size:14.5px;color:var(--ink);}
.sj-job-id{font-size:12px;color:var(--muted);font-style:italic;}
.sj-badge{font-size:11px;padding:2px 9px;border-radius:20px;}
.sj-badge.green{background:var(--green-light);color:var(--green);}
.sj-badge.amber{background:#fff8ec;color:var(--amber);}
.sj-badge.red{background:#fde8e8;color:var(--red);}
.sj-badge.blue{background:#eff6ff;color:var(--blue);}
.sj-badge.purple{background:#ede9fe;color:var(--purple);}
.sj-badge.orange{background:#fff0eb;color:var(--orange);}
.sj-badge.muted{background:var(--bg);color:var(--muted);}
.sj-details{display:flex;gap:16px;flex-wrap:wrap;margin-top:3px;}
.sj-detail{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--muted);}
.sj-detail svg{width:11px;height:11px;flex-shrink:0;}
.sj-actions{display:flex;align-items:center;gap:8px;flex-shrink:0;}
.sj-btn-view{background:var(--green-light);color:var(--green);border:none;border-radius:8px;
  padding:7px 14px;font-family:'DM Serif Display',serif;font-size:12.5px;cursor:pointer;
  transition:background .15s;white-space:nowrap;display:flex;align-items:center;gap:5px;z-index:2;position:relative;}
.sj-btn-view:hover{background:#d5eee3;}
.sj-btn-view svg{width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2;}

/* LOADING / EMPTY / ERROR */
.sj-loading{display:flex;align-items:center;justify-content:center;padding:60px;color:var(--pale);font-size:14px;gap:10px;}
.sj-spinner{width:20px;height:20px;border:2px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:sjSpin .8s linear infinite;}
.sj-empty{text-align:center;padding:60px 20px;}
.sj-empty-icon{font-size:40px;margin-bottom:12px;}
.sj-empty-title{font-size:18px;color:var(--ink);margin-bottom:6px;}
.sj-empty-sub{font-size:13px;color:var(--pale);}
.sj-error{background:#fde8e8;color:var(--red);padding:12px 16px;border-radius:10px;font-size:13px;margin-bottom:16px;}

/* DRAWER */
.sj-drawer-bg{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:400;display:flex;justify-content:flex-end;}
.sj-drawer{width:520px;max-width:100vw;background:var(--white);height:100vh;overflow-y:auto;
  display:flex;flex-direction:column;box-shadow:-4px 0 30px rgba(0,0,0,.15);}
.sj-drawer-hdr{padding:20px 24px;border-bottom:1px solid var(--border);
  display:flex;align-items:center;justify-content:space-between;flex-shrink:0;position:sticky;top:0;background:var(--white);z-index:1;}
.sj-drawer-title{font-size:18px;color:var(--ink);}
.sj-drawer-close{background:none;border:none;cursor:pointer;color:var(--pale);padding:4px;border-radius:6px;
  display:flex;align-items:center;transition:color .15s;}
.sj-drawer-close:hover{color:var(--red);}
.sj-drawer-body{padding:20px 24px;flex:1;}

/* DRAWER SECTIONS */
.sj-dsec{margin-bottom:22px;}
.sj-dsec-title{font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:var(--pale);
  margin-bottom:12px;display:flex;align-items:center;gap:8px;}
.sj-dsec-title::after{content:'';flex:1;height:1px;background:var(--border);}
.sj-drow{display:flex;justify-content:space-between;align-items:flex-start;
  padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;}
.sj-drow:last-child{border-bottom:none;}
.sj-drow-label{color:var(--muted);flex-shrink:0;margin-right:12px;}
.sj-drow-val{color:var(--ink);text-align:right;word-break:break-word;}

/* TIMELINE */
.sj-timeline{display:flex;flex-direction:column;gap:0;}
.sj-tl-item{display:flex;gap:12px;align-items:flex-start;}
.sj-tl-dot-col{display:flex;flex-direction:column;align-items:center;flex-shrink:0;width:20px;}
.sj-tl-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;margin-top:4px;}
.sj-tl-dot.green{background:var(--green);}
.sj-tl-dot.amber{background:var(--amber);}
.sj-tl-dot.blue{background:var(--blue);}
.sj-tl-dot.pale{background:var(--border);}
.sj-tl-line{width:2px;background:var(--border);flex:1;min-height:20px;margin-top:2px;}
.sj-tl-content{flex:1;padding-bottom:16px;}
.sj-tl-label{font-size:12px;color:var(--muted);}
.sj-tl-val{font-size:13px;color:var(--ink);margin-top:2px;}

/* REASSIGN */
.sj-reassign-wrap{display:flex;gap:8px;align-items:center;}
.sj-select{flex:1;border:1.5px solid var(--border);border-radius:9px;
  padding:8px 12px;font-family:'DM Serif Display',serif;font-size:13px;
  color:var(--ink);outline:none;background:var(--white);cursor:pointer;transition:border-color .2s;}
.sj-select:focus{border-color:var(--green);}
.sj-btn-save{background:var(--green);color:#fff;border:none;border-radius:9px;
  padding:8px 16px;font-family:'DM Serif Display',serif;font-size:13px;
  cursor:pointer;transition:background .15s;white-space:nowrap;}
.sj-btn-save:hover{background:var(--green-dark);}
.sj-btn-save:disabled{opacity:.5;cursor:not-allowed;}

/* NOTES */
.sj-textarea{width:100%;border:1.5px solid var(--border);border-radius:9px;
  padding:10px 14px;font-family:'DM Serif Display',serif;font-size:13px;
  color:var(--ink);outline:none;background:var(--white);resize:vertical;
  transition:border-color .2s;min-height:90px;}
.sj-textarea:focus{border-color:var(--green);}
.sj-notes-actions{display:flex;justify-content:flex-end;margin-top:8px;}

/* STATUS CHIP */
.sj-chip{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:12px;}
.sj-chip.green{background:var(--green-light);color:var(--green);}
.sj-chip.amber{background:#fff8ec;color:var(--amber);}
.sj-chip.red{background:#fde8e8;color:var(--red);}
.sj-chip.blue{background:#eff6ff;color:var(--blue);}
.sj-chip-dot{width:6px;height:6px;border-radius:50%;background:currentColor;flex-shrink:0;}

/* TOAST */
.sj-toast{position:fixed;bottom:20px;right:20px;z-index:700;
  display:flex;align-items:center;gap:10px;padding:12px 18px;border-radius:10px;
  font-size:13px;box-shadow:0 4px 20px rgba(0,0,0,.15);animation:sjSlide .25s ease;}
@keyframes sjSlide{from{transform:translateY(20px);opacity:0;}to{transform:translateY(0);opacity:1;}}
.sj-toast.success{background:var(--green);color:#fff;}
.sj-toast.error{background:var(--red);color:#fff;}

/* RESPONSIVE */
@media(max-width:1100px){.sj-stats{grid-template-columns:repeat(3,1fr);}}
@media(max-width:768px){
  .sj-sidebar{transform:translateX(-100%);}
  .sj-sidebar.open{transform:translateX(0);}
  .sj-main{margin-left:0;}
  .sj-hamburger{display:flex;}
  .sj-drawer{width:100vw;}
  .sj-stats{grid-template-columns:repeat(2,1fr);}
}
@media(max-width:600px){
  .sj-stats{grid-template-columns:1fr 1fr;gap:10px;}
  .sj-content{padding:14px;}
  .sj-topbar{padding:0 14px;}
  .sj-card{flex-wrap:wrap;gap:10px;}
  .sj-actions{width:100%;}
}
`

const STATUS_TABS = [
  { key: 'all',         label: 'All Jobs',    color: '#1a6b3c' },
  { key: 'scheduled',   label: 'Scheduled',   color: '#e6a817' },
  { key: 'in_progress', label: 'In Progress', color: '#3b82f6' },
  { key: 'completed',   label: 'Completed',   color: '#1a6b3c' },
  { key: 'cancelled',   label: 'Cancelled',   color: '#e74c3c' },
]

export default function SupervisorJobsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [jobs,        setJobs]        = useState([])
  const [staff,       setStaff]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [statusTab,   setStatusTab]   = useState('all')
  const [search,      setSearch]      = useState('')
  const [spinning,    setSpinning]    = useState(false)
  const [countdown,   setCountdown]   = useState(AUTO_REFRESH)
  const [toast,       setToast]       = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [customers, setCustomers] = useState([])
  const [customerAccess, setCustomerAccess] = useState(true)
  const [createForm, setCreateForm] = useState({
    customer: '', service_type: '', scheduled_datetime: '',
    site_address: '', assigned_technician: '',
  })

  // Drawer state
  const [selectedJob,    setSelectedJob]    = useState(null)
  const [reassignId,     setReassignId]     = useState('')
  const [reassigning,    setReassigning]    = useState(false)
  const [notes,          setNotes]          = useState('')
  const [savingNotes,    setSavingNotes]    = useState(false)

  const tickRef   = useRef(null)
  const isMounted = useRef(true)

  const userName     = displayName(user)
  const userInitials = initials(userName)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => isMounted.current && setToast(null), 3000)
  }

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setError('')
    try {
      const fetchJobs = async () => {
        try {
          const res = await api.get('/jobs/')
          if (isMounted.current) setJobs(res.data?.results ?? res.data ?? [])
        } catch (e) {
          console.error('Jobs fetch failed', e)
          if (!silent) setError('Failed to load jobs. Please check your connection.')
        }
      }

      const fetchStaff = async () => {
        try {
          const res = await api.get('/staff/?role=technician')
          if (isMounted.current) setStaff(res.data?.results ?? res.data ?? [])
        } catch (e) {
          console.error('Staff fetch failed', e)
        }
      }

      const fetchCustomers = async () => {
        try {
          const res = await api.get('/customers/')
          if (isMounted.current) {
            setCustomers(res.data?.results ?? res.data ?? [])
            setCustomerAccess(true)
          }
        } catch (e) {
          console.error('Customers fetch failed', e)
          if (e.response?.status === 403) {
            if (isMounted.current) setCustomerAccess(false)
          }
        }
      }

      await Promise.all([fetchJobs(), fetchStaff(), fetchCustomers()])
    } catch (e) {
      if (!silent && isMounted.current)
        setError('An unexpected error occurred while loading data.')
    } finally {
      if (isMounted.current) { setLoading(false); setSpinning(false) }
    }
  }, [])

  const resetTimer = useCallback(() => {
    clearInterval(tickRef.current)
    setCountdown(AUTO_REFRESH)
    tickRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { fetchAll(true); return AUTO_REFRESH }
        return c - 1
      })
    }, 1000)
  }, [fetchAll])

  useEffect(() => {
    isMounted.current = true
    fetchAll().then(resetTimer)
    return () => { isMounted.current = false; clearInterval(tickRef.current) }
  }, [fetchAll, resetTimer])

  const handleRefresh = () => {
    setSpinning(true)
    fetchAll(true).then(resetTimer)
  }

  const handleLogout = async () => {
    clearInterval(tickRef.current)
    await logout()
    navigate('/login')
  }

  const openDrawer = async (job) => {
    setSelectedJob(job)
    setReassignId(job.assigned_technician || '')
    setNotes(job.completion_notes || '')

    try {
      const res = await api.get(`/jobs/${job.id}/`)
      setSelectedJob(res.data)
      setNotes(res.data.completion_notes || '')
    } catch {
      // fallback
    }
  }

  const closeDrawer = () => setSelectedJob(null)

  const handleReassign = async () => {
    if (!reassignId) return
    setReassigning(true)
    try {
      const res = await api.patch(`/jobs/${selectedJob.id}/reassign/`, { technician_id: Number(reassignId) })
      const techName = staff.find(s => s.id === Number(reassignId))?.name || res.data.technician_name
      setJobs(prev => prev.map(j => j.id === selectedJob.id
        ? { ...j, assigned_technician: Number(reassignId), technician_name: techName }
        : j
      ))
      setSelectedJob(prev => ({ ...prev, technician_name: techName, assigned_technician: Number(reassignId) }))
      showToast('Technician reassigned successfully.')
    } catch (e) {
      showToast(e.response?.data?.error || 'Failed to reassign.', 'error')
    } finally {
      setReassigning(false)
    }
  }

  const handleSaveNotes = async () => {
    setSavingNotes(true)
    try {
      await api.patch(`/jobs/${selectedJob.id}/notes/`, { completion_notes: notes })
      setJobs(prev => prev.map(j => j.id === selectedJob.id ? { ...j, completion_notes: notes } : j))
      setSelectedJob(prev => ({ ...prev, completion_notes: notes }))
      showToast('Notes saved.')
    } catch {
      showToast('Failed to save notes.', 'error')
    } finally {
      setSavingNotes(false)
    }
  }

  const handleCreateJob = async () => {
    if (!createForm.customer || !createForm.service_type || !createForm.scheduled_datetime) {
      showToast('Customer, service type and scheduled date are required.', 'error')
      return
    }
    setCreating(true)
    try {
      const payload = {
        customer: Number(createForm.customer),
        service_type: createForm.service_type,
        scheduled_datetime: createForm.scheduled_datetime,
        site_address: createForm.site_address || '',
        ...(createForm.assigned_technician && { assigned_technician: Number(createForm.assigned_technician) }),
      }
      const res = await api.post('/jobs/', payload)
      setJobs(prev => [res.data, ...prev])
      setShowCreateModal(false)
      setCreateForm({ customer: '', service_type: '', scheduled_datetime: '', site_address: '', assigned_technician: '' })
      showToast('Job created successfully.')
    } catch (e) {
      showToast(e.response?.data?.error || JSON.stringify(e.response?.data) || 'Failed to create job.', 'error')
    } finally {
      setCreating(false)
    }
  }

  const total       = jobs.length
  const active      = jobs.filter(j => j.status === 'in_progress').length
  const scheduled   = jobs.filter(j => j.status === 'scheduled').length
  const completed   = jobs.filter(j => ['completed','report_sent'].includes(j.status)).length
  const unassigned  = jobs.filter(j => !j.technician_name || j.technician_name === 'Unassigned').length

  const filtered = jobs
    .filter(j => {
      if (statusTab === 'all') return true
      if (statusTab === 'completed') return ['completed','report_sent'].includes(j.status)
      return j.status === statusTab
    })
    .filter(j => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        String(j.id).includes(q) ||
        (j.customer_name    || '').toLowerCase().includes(q) ||
        (j.technician_name  || '').toLowerCase().includes(q) ||
        (j.service_type     || '').toLowerCase().includes(q) ||
        (j.site_address     || '').toLowerCase().includes(q)
      )
    })

  const svcKey = (j) => (j.service_type || 'general').toLowerCase().replace(/ /g, '_')

  const tabCount = (key) => {
    if (key === 'all') return jobs.length
    if (key === 'completed') return jobs.filter(j => ['completed','report_sent'].includes(j.status)).length
    return jobs.filter(j => j.status === key).length
  }

  return (
    <>
      <style>{S}</style>
      <div className="sj-root">
        <div className={`sj-overlay${sidebarOpen ? ' show' : ''}`} onClick={() => setSidebarOpen(false)}/>

        <aside className={`sj-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="sj-sb-logo">
            <div className="sj-sb-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/></svg>
            </div>
            <span className="sj-sb-brand">PestPro</span>
          </div>
          <nav className="sj-sb-nav">
            {navItems.map(n => (
              <div key={n.id}
                className={`sj-sb-item${n.id === 'jobs' ? ' active' : ''}`}
                onClick={() => { setSidebarOpen(false); navigate(n.path) }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d={n.d}/>
                </svg>
                {n.label}
              </div>
            ))}
          </nav>
          <div className="sj-sb-user">
            <div className="sj-sb-avatar">{userInitials}</div>
            <div style={{flex:1,minWidth:0}}>
              <div className="sj-sb-uname" style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{userName}</div>
              <div className="sj-sb-urole">Supervisor</div>
            </div>
            <button className="sj-sb-logout" onClick={handleLogout} title="Logout">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
        </aside>

        <div className="sj-main">
          <div className="sj-topbar">
            <div className="sj-topbar-left">
              <button className="sj-hamburger" onClick={() => setSidebarOpen(o => !o)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              </button>
              <span className="sj-crumb">Supervisor &nbsp;›&nbsp; <span>All Jobs</span></span>
            </div>
            <div className="sj-topbar-right">
              <span className={`sj-ticker${countdown <= 10 ? ' soon' : ''}`}>↻ in {countdown}s</span>
              <button className={`sj-refresh-btn${spinning ? ' spinning' : ''}`} onClick={handleRefresh}>
                <svg viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Refresh
              </button>
              <button onClick={() => setShowCreateModal(true)} style={{
                background:'var(--green)',color:'#fff',border:'none',borderRadius:9,
                padding:'7px 16px',fontFamily:"'DM Serif Display',serif",fontSize:13,
                cursor:'pointer',display:'flex',alignItems:'center',gap:6,transition:'background .15s',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                </svg>
                Create Job
              </button>
            </div>
          </div>

          <div className="sj-content">
            <div className="sj-page-title">All Jobs</div>
            <div className="sj-page-sub">Manage, reassign and annotate jobs across your team</div>

            {error && <div className="sj-error">{error}</div>}

            <div className="sj-stats">
              <div className="sj-stat">
                <div className="sj-stat-label">Total Jobs</div>
                <div className="sj-stat-val">{total}</div>
                <div className="sj-stat-sub">All statuses</div>
              </div>
              <div className="sj-stat">
                <div className="sj-stat-label">In Progress</div>
                <div className={`sj-stat-val${active > 0 ? ' blue' : ''}`}>{active}</div>
                <div className="sj-stat-sub">Currently active</div>
              </div>
              <div className="sj-stat">
                <div className="sj-stat-label">Scheduled</div>
                <div className={`sj-stat-val${scheduled > 0 ? ' amber' : ''}`}>{scheduled}</div>
                <div className="sj-stat-sub">Pending start</div>
              </div>
              <div className="sj-stat">
                <div className="sj-stat-label">Completed</div>
                <div className="sj-stat-val green">{completed}</div>
                <div className="sj-stat-sub">
                  {total > 0 ? `${Math.round(completed/total*100)}% rate` : '0%'}
                </div>
              </div>
              <div className="sj-stat">
                <div className="sj-stat-label">Unassigned</div>
                <div className={`sj-stat-val${unassigned > 0 ? ' red' : ' green'}`}>{unassigned}</div>
                <div className="sj-stat-sub">{unassigned > 0 ? 'Need assignment' : 'All assigned ✓'}</div>
              </div>
            </div>

            <div className="sj-filter-row">
              {STATUS_TABS.map(tab => {
                const count = tabCount(tab.key)
                const isActive = statusTab === tab.key
                return (
                  <button key={tab.key} type="button"
                    onClick={() => setStatusTab(tab.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 14px', borderRadius: 20,
                      fontFamily: "'DM Serif Display', serif", fontSize: 13,
                      cursor: 'pointer', whiteSpace: 'nowrap',
                      border: isActive ? 'none' : '1.5px solid var(--border)',
                      background: isActive ? tab.color : 'var(--white)',
                      color: isActive ? '#fff' : 'var(--muted)',
                      transition: 'all .15s',
                    }}>
                    {tab.label}
                    <span style={{
                      background: isActive ? 'rgba(255,255,255,0.3)' : 'var(--bg)',
                      color: isActive ? '#fff' : 'var(--muted)',
                      borderRadius: 20, padding: '1px 7px', fontSize: 11,
                    }}>
                      {count}
                    </span>
                  </button>
                )
              })}
              <div className="sj-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <input className="sj-search"
                  placeholder="Search by customer, technician, service, address…"
                  value={search} onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="sj-list-hdr">
              <span className="sj-list-title">
                {filtered.length} job{filtered.length !== 1 ? 's' : ''}
                {statusTab !== 'all' && ` · ${STATUS_TABS.find(t => t.key === statusTab)?.label}`}
                {search && ` matching "${search}"`}
              </span>
              <span className="sj-list-meta">Click any job to view details & manage</span>
            </div>

            {loading ? (
              <div className="sj-loading"><div className="sj-spinner"/>Loading jobs…</div>
            ) : filtered.length === 0 ? (
              <div className="sj-empty">
                <div className="sj-empty-icon">📋</div>
                <div className="sj-empty-title">No jobs found</div>
                <div className="sj-empty-sub">
                  {search ? `No jobs match "${search}"` : 'No jobs in this category yet.'}
                </div>
              </div>
            ) : filtered.map((job, i) => {
              const key    = svcKey(job)
              const abbr   = SERVICE_ABBR[key] || key.slice(0,2).toUpperCase()
              const sColor = SERVICE_COLOR[key] || 'green'
              const stColor = STATUS_COLOR[job.status] || 'muted'

              return (
                <div key={job.id} className="sj-card" onClick={() => openDrawer(job)}>
                  <div className="sj-avatar" style={{background: AVATAR_COLORS[i % AVATAR_COLORS.length]}}>
                    {abbr}
                  </div>

                  <div className="sj-body">
                    <div className="sj-name-row">
                      <span className="sj-name">{job.customer_name || 'Unknown Customer'}</span>
                      <span className="sj-job-id">Job #{job.id}</span>
                      <span className={`sj-badge ${sColor}`}>{cap(job.service_type)}</span>
                      <span className={`sj-badge ${stColor}`}>{cap(job.status)}</span>
                      {(!job.technician_name || job.technician_name === 'Unassigned') && (
                        <span className="sj-badge red">⚠ Unassigned</span>
                      )}
                    </div>
                    <div className="sj-details">
                      {job.technician_name && (
                        <span className="sj-detail">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                          </svg>
                          {job.technician_name}
                        </span>
                      )}
                      {job.site_address && (
                        <span className="sj-detail">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                          </svg>
                          {job.site_address}
                        </span>
                      )}
                      <span className="sj-detail">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                        {fmtDate(job.scheduled_datetime)}
                      </span>
                    </div>
                  </div>

                  <div className="sj-actions" onClick={e => e.stopPropagation()}>
                    <button className="sj-btn-view" type="button" onClick={() => openDrawer(job)}>
                      <svg viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                      </svg>
                      Manage
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {selectedJob && (
          <div className="sj-drawer-bg" onClick={e => { if (e.target === e.currentTarget) closeDrawer() }}>
            <div className="sj-drawer">
              <div className="sj-drawer-hdr">
                <div>
                  <div className="sj-drawer-title">Job #{selectedJob.id}</div>
                  <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>{selectedJob.customer_name}</div>
                </div>
                <button className="sj-drawer-close" onClick={closeDrawer}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <div className="sj-drawer-body">
                <div className="sj-dsec">
                  <div className="sj-dsec-title">Job Status</div>
                  <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                    <div className={`sj-chip ${STATUS_COLOR[selectedJob.status] || 'muted'}`}>
                      <span className="sj-chip-dot"/>
                      {cap(selectedJob.status)}
                    </div>
                    <span style={{fontSize:12,color:'var(--muted)'}}>
                      {cap(selectedJob.service_type)} · Job UUID: {selectedJob.job_uuid?.slice(0,8)}…
                    </span>
                  </div>
                </div>

                <div className="sj-dsec">
                  <div className="sj-dsec-title">Customer Details</div>
                  <div className="sj-drow">
                    <span className="sj-drow-label">Name</span>
                    <span className="sj-drow-val">{selectedJob.customer_name || '—'}</span>
                  </div>
                  <div className="sj-drow">
                    <span className="sj-drow-label">Site Address</span>
                    <span className="sj-drow-val">{selectedJob.site_address || '—'}</span>
                  </div>
                </div>

                <div className="sj-dsec">
                  <div className="sj-dsec-title">Job Timeline</div>
                  <div className="sj-timeline">
                    {[
                      { label: 'Scheduled', val: fmtDateTime(selectedJob.scheduled_datetime), dot: 'amber', show: true },
                      { label: 'Started',   val: fmtDateTime(selectedJob.started_at),          dot: 'blue',  show: !!selectedJob.started_at },
                      { label: 'Completed', val: fmtDateTime(selectedJob.completed_at),        dot: 'green', show: !!selectedJob.completed_at },
                    ].map((item, i, arr) => (
                      <div key={i} className="sj-tl-item">
                        <div className="sj-tl-dot-col">
                          <div className={`sj-tl-dot ${item.show ? item.dot : 'pale'}`}/>
                          {i < arr.length - 1 && <div className="sj-tl-line"/>}
                        </div>
                        <div className="sj-tl-content">
                          <div className="sj-tl-label">{item.label}</div>
                          <div className="sj-tl-val" style={{color: item.show ? 'var(--ink)' : 'var(--pale)'}}>
                            {item.show ? item.val : 'Not yet'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="sj-dsec">
                  <div className="sj-dsec-title">Assigned Technician</div>
                  <div style={{fontSize:13,color:'var(--muted)',marginBottom:10}}>
                    Currently: <strong style={{color:'var(--ink)'}}>
                      {selectedJob.technician_name || 'Unassigned'}
                    </strong>
                  </div>
                  <div className="sj-reassign-wrap">
                    <select className="sj-select" value={reassignId}
                      onChange={e => setReassignId(e.target.value)}>
                      <option value="">Select technician…</option>
                      {staff.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name || `${t.first_name} ${t.last_name}`.trim() || t.username}
                        </option>
                      ))}
                    </select>
                    <button className="sj-btn-save" onClick={handleReassign}
                      disabled={reassigning || !reassignId}>
                      {reassigning ? 'Saving…' : 'Reassign'}
                    </button>
                  </div>
                </div>

                <div className="sj-dsec">
                  <div className="sj-dsec-title">Observations</div>
                  <div className="sj-drow">
                    <span className="sj-drow-label">Observations recorded</span>
                    <span className="sj-drow-val" style={{color:'var(--green)',fontWeight:600}}>
                      {selectedJob.observations_count ?? selectedJob.observation_count ?? '—'}
                    </span>
                  </div>
                  {selectedJob.completion_notes && (
                    <div style={{fontSize:12.5,color:'var(--muted)',marginTop:8,background:'var(--bg)',
                      borderRadius:8,padding:'10px 12px',lineHeight:1.5}}>
                      {selectedJob.completion_notes}
                    </div>
                  )}
                </div>

                <div className="sj-dsec">
                  <div className="sj-dsec-title">Supervisor Notes</div>
                  <textarea className="sj-textarea"
                    placeholder="Add notes about this job — actions taken, follow-ups required, observations…"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                  <div className="sj-notes-actions">
                    <button className="sj-btn-save" onClick={handleSaveNotes} disabled={savingNotes}>
                      {savingNotes ? 'Saving…' : 'Save Notes'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CREATE JOB MODAL */}
        {showCreateModal && (
          <div className="sj-drawer-bg" onClick={e => { if (e.target === e.currentTarget) setShowCreateModal(false) }}>
            <div className="sj-drawer" style={{width: 460}}>
              <div className="sj-drawer-hdr">
                <div className="sj-drawer-title">Create New Job</div>
                <button className="sj-drawer-close" onClick={() => setShowCreateModal(false)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <div className="sj-drawer-body">
                <div className="sj-dsec">
                  <div className="sj-dsec-title">Customer</div>
                  {!customerAccess ? (
                    <div style={{fontSize: 12, color: 'var(--red)', background: '#fde8e8', padding: 10, borderRadius: 8}}>
                      ⚠ You do not have permission to view the customer list. Please contact an admin to create jobs.
                    </div>
                  ) : (
                    <select className="sj-select" style={{width: '100%'}}
                      value={createForm.customer}
                      onChange={e => setCreateForm({...createForm, customer: e.target.value})}>
                      <option value="">Select customer…</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name || c.full_name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="sj-dsec">
                  <div className="sj-dsec-title">Service Type</div>
                  <select className="sj-select" style={{width: '100%'}}
                    value={createForm.service_type}
                    onChange={e => setCreateForm({...createForm, service_type: e.target.value})}>
                    <option value="">Select service…</option>
                    {Object.keys(SERVICE_ABBR).map(k => (
                      <option key={k} value={k}>{cap(k)}</option>
                    ))}
                  </select>
                </div>
                <div className="sj-dsec">
                  <div className="sj-dsec-title">Scheduled Date & Time</div>
                  <input type="datetime-local" className="sj-select" style={{width: '100%'}}
                    value={createForm.scheduled_datetime}
                    onChange={e => setCreateForm({...createForm, scheduled_datetime: e.target.value})}
                  />
                </div>
                <div className="sj-dsec">
                  <div className="sj-dsec-title">Site Address (Optional)</div>
                  <input type="text" className="sj-select" style={{width: '100%'}}
                    placeholder="Enter address if different from customer profile"
                    value={createForm.site_address}
                    onChange={e => setCreateForm({...createForm, site_address: e.target.value})}
                  />
                </div>
                <div className="sj-dsec">
                  <div className="sj-dsec-title">Assign Technician (Optional)</div>
                  <select className="sj-select" style={{width: '100%'}}
                    value={createForm.assigned_technician}
                    onChange={e => setCreateForm({...createForm, assigned_technician: e.target.value})}>
                    <option value="">Unassigned</option>
                    {staff.map(t => (
                      <option key={t.id} value={t.id}>{t.name || t.username}</option>
                    ))}
                  </select>
                </div>
                <div style={{marginTop: 30}}>
                  <button className="sj-btn-save" style={{width: '100%', padding: 12}}
                    onClick={handleCreateJob} disabled={creating || !customerAccess}>
                    {creating ? 'Creating…' : 'Create Job'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className={`sj-toast ${toast.type}`}>
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