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
const fmtDate = (dt) => { if (!dt) return '\u2014'; return new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }
const fmtDateTime = (dt) => { if (!dt) return '\u2014'; return new Date(dt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }

const AUTO_REFRESH_SECS = 30
const STATUS_CONFIG = {
  scheduled:             { label: 'Scheduled',     cls: 'pending'    },
  in_progress:           { label: 'In Progress',   cls: 'inprogress' },
  observations_recorded: { label: 'Obs. Recorded', cls: 'obs'        },
  completed:             { label: 'Completed',     cls: 'done'       },
  report_sent:           { label: 'Report Sent',   cls: 'done'       },
  cancelled:             { label: 'Cancelled',     cls: 'cancelled'  },
}

// KEY FIX: fetchData now uses 3 strategies to find jobs for this customer
// 1. Query param: GET /jobs/?customer=ID
// 2. Client-side filter covering all Django REST response shapes
// 3. Name-based fallback

export default function AdminCustomerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isSpinning, setIsSpinning] = useState(false)
  const [customer, setCustomer] = useState(null)
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editModal, setEditModal] = useState(false)
  const [toggleModal, setToggleModal] = useState(false)
  const [toast, setToast] = useState(null)
  const [countdown, setCountdown] = useState(AUTO_REFRESH_SECS)
  const tickRef = useRef(null)
  const isMounted = useRef(true)

  const userName = displayName(user)
  const userInitials = initials(userName)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setError('')
    try {
      const numId = parseInt(id)
      const custRes = await api.get(`/customers/${id}/`)
      if (!isMounted.current) return
      const cust = custRes.data
      setCustomer(cust)

      // Strategy 1: try query param (Django supports ?customer=ID if filtered viewset)
      let fetchedJobs = []
      try {
  const r = await api.get(`/jobs/?customer=${id}`)
  fetchedJobs = r.data?.results || r.data || []
} catch {
  try {
    const r = await api.get('/jobs/')
    fetchedJobs = r.data?.results || r.data || []
  } catch {
    fetchedJobs = []
  }
}

      if (!isMounted.current) return

      // Strategy 2: client-side filter covering all possible DRF response shapes
      const filtered = fetchedJobs.filter(j => {
        if (j.customer === numId)                        return true  // integer FK
        if (j.customer_id === numId)                     return true  // explicit field
        if (j.customer?.id === numId)                    return true  // nested object
        if (String(j.customer) === String(id))           return true  // string FK
        if (String(j.customer_id) === String(id))        return true  // string ID
        if (cust.name && j.customer_name === cust.name)  return true  // name fallback
        return false
      })

      // Use filtered if we found matches, otherwise trust the query-param result
      setJobs(filtered)

    } catch (e) {
      if (!silent && isMounted.current)
        setError(e.response?.status === 404 ? 'Customer not found.' : 'Failed to load customer details.')
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

  const handleEdit = async (form) => {
    try {
      const res = await api.patch(`/customers/${id}/`, form)
      setCustomer(res.data); setEditModal(false); showToast('Customer updated successfully.'); resetTimer()
    } catch (e) {
      const data = e.response?.data
      showToast(typeof data === 'object' ? Object.values(data).flat().join(' ') : 'Failed to update.', 'error')
    }
  }

  const handleToggle = async (newActive) => {
    try {
      const res = await api.patch(`/customers/${id}/`, { is_active: newActive })
      setCustomer(res.data); setToggleModal(false)
      showToast(`Customer ${newActive ? 'activated' : 'deactivated'} successfully.`); resetTimer()
    } catch { showToast('Failed to update status.', 'error') }
  }

  const handleLogout = async () => { clearInterval(tickRef.current); await logout(); navigate('/login') }

  const totalJobs = jobs.length
  const completedJobs = jobs.filter(j => ['completed','report_sent'].includes(j.status)).length
  const activeJobs = jobs.filter(j => j.status === 'in_progress').length

  const custInits = (name = '') => {
    const parts = name.trim().split(' ').filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return (parts[0]?.[0] || 'C').toUpperCase()
  }

  const navItems = [
    { id: 'dashboard',   label: 'Dashboard',   path: '/dashboard',             d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'jobs',        label: 'All Jobs',     path: '/dashboard/jobs',        d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { id: 'customers',   label: 'Customers',    path: '/dashboard/customers',   d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { id: 'technicians', label: 'Technicians',  path: '/dashboard/technicians', d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { id: 'reports',     label: 'Reports',      path: '/dashboard/reports',     d: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'alerts',      label: 'Smart Alerts', path: '/dashboard/alerts',      d: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    { id: 'settings',    label: 'Settings',     path: '/dashboard/settings',    d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  ]

  // All styles preserved from original + job row hover fix
  const S = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{--green:#1a6b3c;--green-dark:#1a4d2e;--green-light:#edf6f1;--ink:#1a2e1a;--muted:#7a8c7a;--pale:#a0b0a0;--border:#e8ebe8;--bg:#f0f2f0;--white:#fff;--red:#e74c3c;--amber:#e6a817;--blue:#3b82f6;--sidebar-w:220px;}
.acd-root{font-family:'DM Serif Display',serif;min-height:100vh;background:var(--bg);display:flex;}
.acd-sidebar{width:var(--sidebar-w);background:var(--white);border-right:1px solid var(--border);display:flex;flex-direction:column;min-height:100vh;position:fixed;top:0;left:0;bottom:0;z-index:200;overflow-y:auto;transition:transform .25s ease;}
.acd-sb-logo{padding:16px 20px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border);}
.acd-sb-icon{width:28px;height:28px;background:var(--green);border-radius:6px;display:flex;align-items:center;justify-content:center;}
.acd-sb-icon svg{width:15px;height:15px;fill:white;}
.acd-sb-brand{font-size:16px;color:var(--ink);}
.acd-sb-nav{padding:12px 10px;flex:1;}
.acd-sb-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;cursor:pointer;margin-bottom:2px;color:var(--muted);font-size:13.5px;transition:background .15s,color .15s;white-space:nowrap;}
.acd-sb-item:hover{background:var(--bg);color:var(--ink);}
.acd-sb-item.active{background:var(--green-light);color:var(--green);}
.acd-sb-item svg{width:16px;height:16px;flex-shrink:0;}
.acd-sb-user{padding:14px 16px;border-top:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-shrink:0;}
.acd-sb-avatar{width:32px;height:32px;background:var(--green);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;flex-shrink:0;}
.acd-sb-uname{font-size:13px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.acd-sb-urole{font-size:11px;color:var(--pale);}
.acd-sb-logout{background:none;border:none;cursor:pointer;color:var(--pale);padding:4px;border-radius:6px;display:flex;align-items:center;margin-left:auto;transition:color .15s,background .15s;}
.acd-sb-logout:hover{color:var(--red);background:#fde8e8;}
.acd-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:150;}
.acd-overlay.show{display:block;}
.acd-hamburger{display:none;background:none;border:none;cursor:pointer;padding:4px;border-radius:6px;color:var(--ink);}
.acd-hamburger svg{width:20px;height:20px;}
.acd-main{flex:1;margin-left:var(--sidebar-w);display:flex;flex-direction:column;min-height:100vh;}
.acd-topbar{background:var(--white);border-bottom:1px solid var(--border);padding:0 24px;height:52px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;flex-shrink:0;gap:12px;}
.acd-topbar-left{display:flex;align-items:center;gap:10px;}
.acd-back-btn{background:none;border:1.5px solid var(--border);border-radius:9px;padding:7px 14px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;color:var(--ink);display:flex;align-items:center;gap:6px;transition:background .15s;}
.acd-back-btn:hover{background:var(--bg);}
.acd-crumb{font-size:13px;color:var(--pale);}
.acd-crumb span{color:var(--ink);}
.acd-topbar-right{display:flex;align-items:center;gap:10px;}
.acd-ticker{font-size:12px;color:var(--pale);white-space:nowrap;}
.acd-ticker.soon{color:var(--green);}
.acd-refresh-btn{background:var(--bg);color:var(--ink);border:1.5px solid var(--border);border-radius:9px;padding:7px 14px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;transition:background .15s;}
.acd-refresh-btn:hover{background:#e2e8e2;}
.acd-refresh-btn svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2;transition:transform .35s;}
.acd-refresh-btn.spinning svg{animation:acdSpin .55s linear;}
@keyframes acdSpin{to{transform:rotate(360deg);}}
.acd-edit-btn{background:var(--green);color:#fff;border:none;border-radius:9px;padding:7px 16px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;transition:background .15s;}
.acd-edit-btn:hover{background:var(--green-dark);}
.acd-edit-btn svg{width:14px;height:14px;stroke:white;fill:none;stroke-width:2;}
.acd-content{padding:22px 24px 40px;flex:1;}
.acd-loading{display:flex;align-items:center;justify-content:center;padding:80px;color:var(--pale);font-size:14px;gap:10px;}
.acd-spinner{width:20px;height:20px;border:2px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:acdSpinner .8s linear infinite;}
@keyframes acdSpinner{to{transform:rotate(360deg);}}
.acd-error{background:#fde8e8;color:var(--red);padding:12px 16px;border-radius:10px;font-size:13px;margin-bottom:16px;}
.acd-hero{background:var(--white);border-radius:16px;padding:24px 28px;box-shadow:0 2px 12px rgba(0,0,0,.05);margin-bottom:18px;display:flex;align-items:center;gap:20px;flex-wrap:wrap;}
.acd-hero-av{width:64px;height:64px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;flex-shrink:0;}
.acd-hero-av.inactive{background:#c8cfc8;}
.acd-hero-info{flex:1;min-width:0;}
.acd-hero-name{font-size:22px;color:var(--ink);margin-bottom:4px;}
.acd-hero-company{font-size:14px;color:var(--muted);margin-bottom:8px;}
.acd-hero-chips{display:flex;gap:8px;flex-wrap:wrap;}
.acd-chip{font-size:12px;padding:3px 12px;border-radius:20px;}
.acd-chip.active{background:var(--green-light);color:var(--green);}
.acd-chip.inactive{background:#f0f2f0;color:var(--muted);}
.acd-chip.opt-in{background:#eff6ff;color:var(--blue);}
.acd-hero-actions{display:flex;gap:10px;flex-wrap:wrap;}
.acd-hero-edit-btn{background:var(--green);color:#fff;border:none;border-radius:10px;padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;transition:background .15s;}
.acd-hero-edit-btn:hover{background:var(--green-dark);}
.acd-hero-toggle-btn{border:none;border-radius:10px;padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;transition:background .15s;}
.acd-hero-toggle-btn.deactivate{background:#fde8e8;color:var(--red);}
.acd-hero-toggle-btn.deactivate:hover{background:#f5c6c6;}
.acd-hero-toggle-btn.activate{background:#fff8ec;color:var(--amber);}
.acd-hero-toggle-btn.activate:hover{background:#fde8c0;}
.acd-grid{display:grid;grid-template-columns:1fr 320px;gap:18px;align-items:start;}
.acd-card{background:var(--white);border-radius:16px;padding:22px;box-shadow:0 2px 12px rgba(0,0,0,.05);margin-bottom:16px;}
.acd-card:last-child{margin-bottom:0;}
.acd-card-title{font-size:10.5px;text-transform:uppercase;letter-spacing:.8px;color:var(--pale);margin-bottom:16px;display:flex;align-items:center;gap:6px;}
.acd-card-title svg{width:13px;height:13px;}
.acd-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;}
.acd-info-cell{padding:11px 0;border-bottom:1px solid #f5f7f5;}
.acd-info-cell:nth-last-child(-n+2){border-bottom:none;}
.acd-info-cell.full{grid-column:1/-1;}
.acd-info-label{font-size:10px;color:var(--pale);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;}
.acd-info-value{font-size:14px;color:var(--ink);}
.acd-info-value.muted{color:var(--muted);}
.acd-info-value a{color:var(--green);text-decoration:none;}
.acd-info-value a:hover{text-decoration:underline;}
.acd-notif-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f5f7f5;}
.acd-notif-row:last-child{border-bottom:none;}
.acd-notif-label{font-size:13.5px;color:var(--ink);}
.acd-notif-val{font-size:12px;padding:3px 10px;border-radius:6px;}
.acd-notif-val.yes{background:var(--green-light);color:var(--green);}
.acd-notif-val.no{background:#f0f2f0;color:var(--muted);}
.acd-stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;}
.acd-mini-stat{background:var(--white);border-radius:12px;padding:14px 16px;box-shadow:0 1px 6px rgba(0,0,0,.05);}
.acd-mini-label{font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:var(--pale);margin-bottom:5px;}
.acd-mini-val{font-size:24px;color:var(--ink);letter-spacing:-1px;line-height:1;}
.acd-mini-val.green{color:var(--green);}
.acd-mini-val.blue{color:var(--blue);}
.acd-mini-sub{font-size:11px;color:var(--muted);margin-top:3px;}
.acd-job-row{display:flex;align-items:center;gap:12px;padding:12px 8px;border-bottom:1px solid #f5f7f5;cursor:pointer;border-radius:8px;transition:background .12s;}
.acd-job-row:last-child{border-bottom:none;}
.acd-job-row:hover{background:var(--bg);}
.acd-job-row:hover .acd-job-name{color:var(--green);}
.acd-job-icon{width:34px;height:34px;border-radius:9px;background:var(--green-light);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.acd-job-icon svg{width:15px;height:15px;stroke:var(--green);fill:none;stroke-width:2;}
.acd-job-body{flex:1;min-width:0;}
.acd-job-name{font-size:13.5px;color:var(--ink);margin-bottom:2px;transition:color .15s;}
.acd-job-meta{font-size:11.5px;color:var(--pale);}
.acd-job-badge{font-size:11px;padding:3px 9px;border-radius:6px;flex-shrink:0;}
.acd-job-badge.pending{background:#fff8ec;color:var(--amber);}
.acd-job-badge.inprogress{background:var(--green-light);color:var(--green);}
.acd-job-badge.obs{background:#eff6ff;color:var(--blue);}
.acd-job-badge.done{background:#f0f2f0;color:var(--muted);}
.acd-job-badge.cancelled{background:#fde8e8;color:var(--red);}
.acd-no-jobs{text-align:center;padding:28px 20px;color:var(--pale);font-size:13px;line-height:1.7;}
.acd-map-box{background:var(--bg);border-radius:12px;height:160px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--pale);font-size:13px;border:1.5px dashed var(--border);}
.acd-map-box svg{width:28px;height:28px;}
.acd-map-link{font-size:12px;color:var(--green);text-decoration:none;margin-top:4px;}
.acd-map-link:hover{text-decoration:underline;}
.acd-modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;}
.acd-modal{background:var(--white);border-radius:16px;width:100%;max-width:520px;box-shadow:0 20px 60px rgba(0,0,0,.15);overflow:hidden;}
.acd-modal-hdr{padding:20px 24px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
.acd-modal-title{font-size:17px;color:var(--ink);}
.acd-modal-close{background:none;border:none;cursor:pointer;color:var(--pale);padding:4px;border-radius:6px;display:flex;align-items:center;}
.acd-modal-close:hover{color:var(--ink);}
.acd-modal-body{padding:20px 24px;}
.acd-modal-ftr{padding:16px 24px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:10px;}
.acd-field{margin-bottom:14px;}
.acd-field label{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:var(--pale);margin-bottom:6px;}
.acd-field input,.acd-field select{width:100%;border:1.5px solid var(--border);border-radius:10px;padding:10px 14px;font-family:'DM Serif Display',serif;font-size:13.5px;color:var(--ink);outline:none;background:var(--white);transition:border-color .2s;}
.acd-field input:focus,.acd-field select:focus{border-color:var(--green);}
.acd-field input.error{border-color:var(--red);}
.acd-field-err{font-size:11.5px;color:var(--red);margin-top:4px;}
.acd-field-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.acd-field-check{display:flex;align-items:center;gap:8px;padding:7px 0;}
.acd-field-check input[type=checkbox]{width:16px;height:16px;accent-color:var(--green);cursor:pointer;}
.acd-field-check label{font-size:13px;color:var(--ink);cursor:pointer;}
.acd-btn-cancel{background:var(--bg);color:var(--muted);border:1.5px solid var(--border);border-radius:9px;padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;}
.acd-btn-save{background:var(--green);color:#fff;border:none;border-radius:9px;padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;}
.acd-btn-save:hover{background:var(--green-dark);}
.acd-btn-save:disabled{opacity:.5;cursor:not-allowed;}
.acd-btn-danger{background:var(--red);color:#fff;border:none;border-radius:9px;padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;}
.acd-btn-amber{background:var(--amber);color:#fff;border:none;border-radius:9px;padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;}
.acd-toast{position:fixed;bottom:20px;right:20px;z-index:700;display:flex;align-items:center;gap:10px;padding:12px 18px;border-radius:10px;font-size:13px;box-shadow:0 4px 20px rgba(0,0,0,.15);animation:acdSlide .25s ease;}
@keyframes acdSlide{from{transform:translateY(20px);opacity:0;}to{transform:translateY(0);opacity:1;}}
.acd-toast.success{background:var(--green);color:#fff;}
.acd-toast.error{background:var(--red);color:#fff;}
@media(max-width:900px){.acd-grid{grid-template-columns:1fr;}}
@media(max-width:768px){.acd-sidebar{transform:translateX(-100%);}.acd-sidebar.open{transform:translateX(0);}.acd-main{margin-left:0;}.acd-hamburger{display:flex;}.acd-content{padding:14px 16px 32px;}.acd-info-grid{grid-template-columns:1fr;}.acd-info-cell:nth-last-child(-n+2){border-bottom:1px solid #f5f7f5;}.acd-info-cell:last-child{border-bottom:none;}.acd-field-row{grid-template-columns:1fr;}.acd-hero{gap:14px;}.acd-stats-row{grid-template-columns:1fr 1fr;}}
@media(max-width:480px){.acd-stats-row{grid-template-columns:1fr;}.acd-topbar{padding:0 14px;}}
`

  return (
    <>
      <style>{S}</style>
      <div className="acd-root">
        <div className={`acd-overlay${sidebarOpen ? ' show' : ''}`} onClick={() => setSidebarOpen(false)}/>
        <aside className={`acd-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="acd-sb-logo">
            <div className="acd-sb-icon"><svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/></svg></div>
            <span className="acd-sb-brand">PestPro</span>
          </div>
          <nav className="acd-sb-nav">
            {navItems.map(n => (
              <div key={n.id} className={`acd-sb-item${n.id === 'customers' ? ' active' : ''}`} onClick={() => { setSidebarOpen(false); navigate(n.path) }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d={n.d}/></svg>
                {n.label}
              </div>
            ))}
          </nav>
          <div className="acd-sb-user">
            <div className="acd-sb-avatar">{userInitials}</div>
            <div style={{flex:1,minWidth:0}}><div className="acd-sb-uname">{userName}</div><div className="acd-sb-urole">Administrator</div></div>
            <button className="acd-sb-logout" onClick={handleLogout} title="Logout">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            </button>
          </div>
        </aside>

        <div className="acd-main">
          <div className="acd-topbar">
            <div className="acd-topbar-left">
              <button className="acd-hamburger" onClick={() => setSidebarOpen(o => !o)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
              </button>
              <button className="acd-back-btn" onClick={() => navigate('/dashboard/customers')}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                Back
              </button>
              <span className="acd-crumb">Customers &nbsp;&rsaquo;&nbsp; <span>{customer?.name || `Customer #${id}`}</span></span>
            </div>
            <div className="acd-topbar-right">
              <span className={`acd-ticker${countdown <= 10 ? ' soon' : ''}`}>&#8635; in {countdown}s</span>
              <button className={`acd-refresh-btn${isSpinning ? ' spinning' : ''}`} onClick={manualRefresh}>
                <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                Refresh
              </button>
              {customer && (
                <button className="acd-edit-btn" onClick={() => setEditModal(true)}>
                  <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  Edit
                </button>
              )}
            </div>
          </div>

          <div className="acd-content">
            {error && <div className="acd-error">{error}</div>}
            {loading ? (
              <div className="acd-loading"><div className="acd-spinner"/>Loading customer&hellip;</div>
            ) : !customer ? null : (
              <>
                <div className="acd-hero">
                  <div className={`acd-hero-av${customer.is_active ? '' : ' inactive'}`}>{custInits(customer.name)}</div>
                  <div className="acd-hero-info">
                    <div className="acd-hero-name">{customer.name}</div>
                    {customer.company_name && <div className="acd-hero-company">{customer.company_name}</div>}
                    <div className="acd-hero-chips">
                      <span className={`acd-chip ${customer.is_active ? 'active' : 'inactive'}`}>{customer.is_active ? '\u25CF Active' : '\u25CB Inactive'}</span>
                      {customer.email_opt_in && <span className="acd-chip opt-in">Email Opted-in</span>}
                      <span className="acd-chip inactive">ID #{customer.id}</span>
                    </div>
                  </div>
                  <div className="acd-hero-actions">
                    <button className="acd-hero-edit-btn" onClick={() => setEditModal(true)}>Edit Details</button>
                    <button className={`acd-hero-toggle-btn ${customer.is_active ? 'deactivate' : 'activate'}`} onClick={() => setToggleModal(true)}>
                      {customer.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>

                <div className="acd-stats-row">
                  <div className="acd-mini-stat"><div className="acd-mini-label">Total Jobs</div><div className="acd-mini-val">{totalJobs}</div><div className="acd-mini-sub">All time</div></div>
                  <div className="acd-mini-stat"><div className="acd-mini-label">Completed</div><div className="acd-mini-val green">{completedJobs}</div><div className="acd-mini-sub">{totalJobs > 0 ? `${Math.round((completedJobs/totalJobs)*100)}% done` : '0%'}</div></div>
                  <div className="acd-mini-stat"><div className="acd-mini-label">Active Now</div><div className={`acd-mini-val${activeJobs > 0 ? ' blue' : ''}`}>{activeJobs}</div><div className="acd-mini-sub">In progress</div></div>
                </div>

                <div className="acd-grid">
                  <div>
                    <div className="acd-card">
                      <div className="acd-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                        Contact Details
                      </div>
                      <div className="acd-info-grid">
                        <div className="acd-info-cell"><div className="acd-info-label">Full Name</div><div className="acd-info-value">{customer.name}</div></div>
                        <div className="acd-info-cell"><div className="acd-info-label">Phone</div><div className="acd-info-value"><a href={`tel:${customer.phone}`}>{customer.phone || '\u2014'}</a></div></div>
                        <div className="acd-info-cell full"><div className="acd-info-label">Email</div><div className="acd-info-value"><a href={`mailto:${customer.email}`}>{customer.email || '\u2014'}</a></div></div>
                        <div className="acd-info-cell"><div className="acd-info-label">Company</div><div className="acd-info-value muted">{customer.company_name || '\u2014'}</div></div>
                        <div className="acd-info-cell"><div className="acd-info-label">City</div><div className="acd-info-value muted">{customer.city || '\u2014'}</div></div>
                        <div className="acd-info-cell full"><div className="acd-info-label">Address</div><div className="acd-info-value muted">{customer.address || '\u2014'}</div></div>
                        <div className="acd-info-cell"><div className="acd-info-label">Customer Since</div><div className="acd-info-value muted">{fmtDate(customer.created_at)}</div></div>
                        <div className="acd-info-cell"><div className="acd-info-label">Last Updated</div><div className="acd-info-value muted">{fmtDate(customer.updated_at)}</div></div>
                      </div>
                    </div>

                    {/* JOB HISTORY — FIXED */}
                    <div className="acd-card">
                      <div className="acd-card-title" style={{justifyContent:'space-between',display:'flex',alignItems:'center'}}>
                        <span style={{display:'flex',alignItems:'center',gap:6}}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                          Job History
                        </span>
                        {totalJobs > 0 && <span style={{background:'var(--green-light)',color:'var(--green)',borderRadius:6,padding:'1px 8px',fontSize:11}}>{totalJobs}</span>}
                      </div>
                      {jobs.length === 0 ? (
                        <div className="acd-no-jobs">
                          No jobs found for this customer.<br/>
                          <span style={{fontSize:11,color:'var(--pale)',fontStyle:'italic'}}>
                            Tip: Hit Refresh if you recently created a job.
                          </span>
                        </div>
                      ) : (
                        [...jobs]
                          .sort((a,b) => new Date(b.scheduled_datetime||b.created_at||0) - new Date(a.scheduled_datetime||a.created_at||0))
                          .map(job => {
                            const st = STATUS_CONFIG[job.status] || { label: fmt(job.status||'Unknown'), cls: 'pending' }
                            const svc = job.service_type ? fmt(job.service_type) : job.title || 'Service Job'
                            const tech = job.technician_name || job.assigned_technician_name || ''
                            return (
                              <div key={job.id} className="acd-job-row" onClick={() => navigate(`/dashboard/jobs/${job.id}`)}>
                                <div className="acd-job-icon">
                                  <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                                </div>
                                <div className="acd-job-body">
                                  <div className="acd-job-name">{svc} <span style={{fontSize:11,color:'var(--pale)',marginLeft:5}}>#{job.id}</span></div>
                                  <div className="acd-job-meta">{fmtDateTime(job.scheduled_datetime||job.created_at)}{tech ? ` \u00b7 ${tech}` : ''}</div>
                                </div>
                                <span className={`acd-job-badge ${st.cls}`}>{st.label}</span>
                              </div>
                            )
                          })
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="acd-card">
                      <div className="acd-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        Location
                      </div>
                      {(customer.address||customer.city) ? (
                        <>
                          <div className="acd-map-box">
                            <svg viewBox="0 0 24 24" fill="none" stroke="var(--pale)" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
                            <span>{customer.address||customer.city}</span>
                            <a className="acd-map-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([customer.address,customer.city].filter(Boolean).join(', '))}`} target="_blank" rel="noreferrer">Open in Google Maps &rarr;</a>
                          </div>
                          <div style={{marginTop:14}}><div className="acd-info-label">Full Address</div><div className="acd-info-value muted" style={{marginTop:4,fontSize:13}}>{[customer.address,customer.city].filter(Boolean).join(', ')||'\u2014'}</div></div>
                        </>
                      ) : (
                        <div className="acd-map-box"><svg viewBox="0 0 24 24" fill="none" stroke="var(--pale)" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg><span style={{color:'var(--pale)',fontSize:13}}>No address on file</span></div>
                      )}
                      {customer.geocode_status && (
                        <div style={{marginTop:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <span style={{fontSize:12,color:'var(--pale)'}}>Geocode Status</span>
                          <span style={{fontSize:11,padding:'2px 9px',borderRadius:6,background:customer.geocode_status==='done'?'var(--green-light)':'#fff8ec',color:customer.geocode_status==='done'?'var(--green)':'var(--amber)'}}>{fmt(customer.geocode_status)}</span>
                        </div>
                      )}
                    </div>

                    <div className="acd-card">
                      <div className="acd-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                        Notifications
                      </div>
                      <div className="acd-notif-row"><span className="acd-notif-label">Email Opt-in</span><span className={`acd-notif-val ${customer.email_opt_in?'yes':'no'}`}>{customer.email_opt_in?'\u2713 Yes':'\u2717 No'}</span></div>
                      <div className="acd-notif-row"><span className="acd-notif-label">Notify on Job Start</span><span className={`acd-notif-val ${customer.notify_on_job_start?'yes':'no'}`}>{customer.notify_on_job_start?'\u2713 Yes':'\u2717 No'}</span></div>
                      <div className="acd-notif-row"><span className="acd-notif-label">Notify on Completion</span><span className={`acd-notif-val ${customer.notify_on_completion?'yes':'no'}`}>{customer.notify_on_completion?'\u2713 Yes':'\u2717 No'}</span></div>
                    </div>

                    <div className="acd-card">
                      <div className="acd-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        Account Info
                      </div>
                      <div className="acd-notif-row"><span className="acd-notif-label">Customer ID</span><span style={{fontSize:13,color:'var(--ink)',fontWeight:600}}>#{customer.id}</span></div>
                      <div className="acd-notif-row"><span className="acd-notif-label">Status</span><span className={`acd-notif-val ${customer.is_active?'yes':'no'}`}>{customer.is_active?'\u25CF Active':'\u25CB Inactive'}</span></div>
                      <div className="acd-notif-row"><span className="acd-notif-label">Member Since</span><span style={{fontSize:13,color:'var(--muted)'}}>{fmtDate(customer.created_at)}</span></div>
                      <div className="acd-notif-row"><span className="acd-notif-label">Last Updated</span><span style={{fontSize:13,color:'var(--muted)'}}>{fmtDate(customer.updated_at)}</span></div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {editModal && customer && <EditModal customer={customer} onClose={() => setEditModal(false)} onSave={handleEdit}/>}
        {toggleModal && customer && <ToggleModal customer={customer} onClose={() => setToggleModal(false)} onConfirm={handleToggle}/>}
        {toast && (
          <div className={`acd-toast ${toast.type}`}>
            {toast.type==='success'
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

function EditModal({ customer, onClose, onSave }) {
  const [form, setForm] = useState({ name: customer.name||'', email: customer.email||'', phone: customer.phone||'', company_name: customer.company_name||'', address: customer.address||'', city: customer.city||'', email_opt_in: customer.email_opt_in??true, notify_on_job_start: customer.notify_on_job_start??true, notify_on_completion: customer.notify_on_completion??true })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const set = (k,v) => { setForm(f=>({...f,[k]:v})); setErrors(e=>({...e,[k]:''})) }
  const validate = () => { const e={}; if(!form.name.trim()) e.name='Name is required.'; if(!form.email.trim()) e.email='Email is required.'; else if(!/\S+@\S+\.\S+/.test(form.email)) e.email='Enter a valid email.'; if(!form.phone.trim()) e.phone='Phone is required.'; return e }
  const handleSave = async () => { const e=validate(); if(Object.keys(e).length){setErrors(e);return} setSaving(true); await onSave(form); setSaving(false) }
  return (
    <div className="acd-modal-bg" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="acd-modal">
        <div className="acd-modal-hdr"><span className="acd-modal-title">Edit Customer</span><button className="acd-modal-close" onClick={onClose}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button></div>
        <div className="acd-modal-body">
          <div className="acd-field-row">
            <div className="acd-field"><label>Full Name *</label><input className={errors.name?'error':''} value={form.name} onChange={e=>set('name',e.target.value)}/>{errors.name&&<div className="acd-field-err">{errors.name}</div>}</div>
            <div className="acd-field"><label>Phone *</label><input className={errors.phone?'error':''} value={form.phone} onChange={e=>set('phone',e.target.value)}/>{errors.phone&&<div className="acd-field-err">{errors.phone}</div>}</div>
          </div>
          <div className="acd-field"><label>Email Address *</label><input type="email" className={errors.email?'error':''} value={form.email} onChange={e=>set('email',e.target.value)}/>{errors.email&&<div className="acd-field-err">{errors.email}</div>}</div>
          <div className="acd-field"><label>Company Name</label><input value={form.company_name} onChange={e=>set('company_name',e.target.value)} placeholder="Optional"/></div>
          <div className="acd-field"><label>Address</label><input value={form.address} onChange={e=>set('address',e.target.value)} placeholder="e.g. 123 Main Street"/></div>
          <div className="acd-field"><label>City</label><input value={form.city} onChange={e=>set('city',e.target.value)} placeholder="e.g. Ahmedabad"/></div>
          <div style={{borderTop:'1px solid var(--border)',paddingTop:14,marginTop:4}}>
            <div style={{fontSize:11,textTransform:'uppercase',letterSpacing:'.6px',color:'var(--pale)',marginBottom:10}}>Notification Preferences</div>
            <div className="acd-field-check"><input type="checkbox" id="eoi" checked={form.email_opt_in} onChange={e=>set('email_opt_in',e.target.checked)}/><label htmlFor="eoi">Email Opt-in</label></div>
            <div className="acd-field-check"><input type="checkbox" id="njs" checked={form.notify_on_job_start} onChange={e=>set('notify_on_job_start',e.target.checked)}/><label htmlFor="njs">Notify on Job Start</label></div>
            <div className="acd-field-check"><input type="checkbox" id="njc" checked={form.notify_on_completion} onChange={e=>set('notify_on_completion',e.target.checked)}/><label htmlFor="njc">Notify on Completion</label></div>
          </div>
        </div>
        <div className="acd-modal-ftr"><button className="acd-btn-cancel" onClick={onClose}>Cancel</button><button className="acd-btn-save" onClick={handleSave} disabled={saving}>{saving?'Saving\u2026':'Save Changes'}</button></div>
      </div>
    </div>
  )
}

function ToggleModal({ customer, onClose, onConfirm }) {
  const [saving, setSaving] = useState(false)
  const isActive = customer.is_active
  return (
    <div className="acd-modal-bg" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="acd-modal" style={{maxWidth:420}}>
        <div className="acd-modal-hdr"><span className="acd-modal-title">{isActive?'Deactivate Customer':'Activate Customer'}</span><button className="acd-modal-close" onClick={onClose}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button></div>
        <div className="acd-modal-body" style={{textAlign:'center',paddingTop:24}}>
          <div style={{width:52,height:52,borderRadius:'50%',margin:'0 auto 16px',background:isActive?'#fde8e8':'#fff8ec',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isActive?'var(--red)':'var(--amber)'} strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d={isActive?"M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636":"M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"}/></svg>
          </div>
          <div style={{fontSize:16,color:'var(--ink)',marginBottom:8}}>{customer.name}</div>
          <div style={{fontSize:13.5,color:'var(--muted)',lineHeight:1.6}}>{isActive?'This customer will be marked inactive and hidden from job assignments.':'This customer will be reactivated and available for job assignments.'}</div>
        </div>
        <div className="acd-modal-ftr">
          <button className="acd-btn-cancel" onClick={onClose}>Cancel</button>
          {isActive
            ? <button className="acd-btn-danger" disabled={saving} onClick={async()=>{setSaving(true);await onConfirm(false);setSaving(false)}}>{saving?'Deactivating\u2026':'Deactivate'}</button>
            : <button className="acd-btn-amber" disabled={saving} onClick={async()=>{setSaving(true);await onConfirm(true);setSaving(false)}}>{saving?'Activating\u2026':'Activate'}</button>
          }
        </div>
      </div>
    </div>
  )
}