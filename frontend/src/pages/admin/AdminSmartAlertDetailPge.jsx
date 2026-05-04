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
const fmtRelative = (dt) => {
  if (!dt) return '—'
  const diff = Date.now() - new Date(dt).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24) return `${hrs}h ago`
  if (days < 7) return `${days}d ago`
  return fmtDate(dt)
}

const AUTO_REFRESH_SECS = 30

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', cls: 'critical', color: '#e74c3c', bg: '#fde8e8' },
  high:     { label: 'High',     cls: 'high',     color: '#e6550d', bg: '#fff0eb' },
  medium:   { label: 'Medium',   cls: 'medium',   color: '#e6a817', bg: '#fff8ec' },
  low:      { label: 'Low',      cls: 'low',      color: '#3b82f6', bg: '#eff6ff' },
  info:     { label: 'Info',     cls: 'info',     color: '#7a8c7a', bg: '#f0f2f0' },
}

const STATUS_CONFIG = {
  active:       { label: 'Active',       cls: 'active'    },
  acknowledged: { label: 'Acknowledged', cls: 'ack'       },
  resolved:     { label: 'Resolved',     cls: 'resolved'  },
  dismissed:    { label: 'Dismissed',    cls: 'dismissed' },
  snoozed:      { label: 'Snoozed',      cls: 'snoozed'   },
}

const ALERT_TYPE_ICONS = {
  overdue_job:        'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  technician_idle:    'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  customer_complaint: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  low_inventory:      'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  missed_appointment: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  payment_overdue:    'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  chemical_expiry:    'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
  route_inefficiency: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
  default:            'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
}

export default function AdminAlertDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isSpinning, setIsSpinning] = useState(false)
  const [alert, setAlert] = useState(null)
  const [relatedJob, setRelatedJob] = useState(null)
  const [relatedCustomer, setRelatedCustomer] = useState(null)
  const [relatedTechnician, setRelatedTechnician] = useState(null)
  const [relatedCompany, setRelatedCompany] = useState(null)   // ← NEW: company
  const [allAlerts, setAllAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editModal, setEditModal] = useState(false)
  const [actionModal, setActionModal] = useState(null)
  const [toast, setToast] = useState(null)
  const [countdown, setCountdown] = useState(AUTO_REFRESH_SECS)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
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
      const alertRes = await api.get(`/alerts/${id}/`)
      if (!isMounted.current) return
      const alertData = alertRes.data
      setAlert(alertData)

      const fetches = []

      // Job
      if (alertData.job || alertData.job_id) {
        const jobId = alertData.job?.id || alertData.job_id || alertData.job
        fetches.push(
          api.get(`/jobs/${jobId}/`).then(r => { if (isMounted.current) setRelatedJob(r.data) }).catch(() => setRelatedJob(null))
        )
      } else {
        setRelatedJob(null)
      }

      // Customer
      if (alertData.customer || alertData.customer_id) {
        const custId = alertData.customer?.id || alertData.customer_id || alertData.customer
        fetches.push(
          api.get(`/customers/${custId}/`).then(r => {
            if (!isMounted.current) return
            setRelatedCustomer(r.data)
            // Try to fetch company from customer's company field
            const companyId = r.data.company?.id || r.data.company_id || r.data.company
            if (companyId) {
              api.get(`/companies/${companyId}/`).then(c => {
                if (isMounted.current) setRelatedCompany(c.data)
              }).catch(() => {})
            } else if (r.data.company_name) {
              // Some APIs embed the name directly
              setRelatedCompany({ name: r.data.company_name })
            }
          }).catch(() => setRelatedCustomer(null))
        )
      } else {
        setRelatedCustomer(null)
      }

      // Technician
      if (alertData.technician || alertData.technician_id) {
        const techId = alertData.technician?.id || alertData.technician_id || alertData.technician
        fetches.push(
          api.get(`/technicians/${techId}/`).then(r => { if (isMounted.current) setRelatedTechnician(r.data) }).catch(() => setRelatedTechnician(null))
        )
      } else {
        setRelatedTechnician(null)
      }

      // Company directly on alert (e.g. alert.company or alert.company_id)
      if (alertData.company || alertData.company_id) {
        const compId = alertData.company?.id || alertData.company_id || alertData.company
        if (typeof compId === 'object') {
          setRelatedCompany(compId) // already nested object
        } else {
          fetches.push(
            api.get(`/companies/${compId}/`).then(r => { if (isMounted.current) setRelatedCompany(r.data) }).catch(() => {})
          )
        }
      } else if (alertData.company_name) {
        setRelatedCompany({ name: alertData.company_name })
      }

      // Similar alerts
      fetches.push(
        api.get(`/alerts/?alert_type=${alertData.alert_type}&limit=5`).then(r => {
          if (!isMounted.current) return
          const list = r.data?.results || r.data || []
          setAllAlerts(list.filter(a => String(a.id) !== String(id)).slice(0, 4))
        }).catch(() => {})
      )

      await Promise.all(fetches)
    } catch (e) {
      if (!silent && isMounted.current)
        setError(e.response?.status === 404 ? 'Alert not found.' : 'Failed to load alert details.')
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

  // ─── FIX 1: handleStatusAction — robustly patches and refreshes state ────
  const handleStatusAction = async (newStatus, extra = {}) => {
    try {
      const payload = { status: newStatus, ...extra }
      if (newStatus === 'acknowledged' && !payload.acknowledged_at) {
        payload.acknowledged_at = new Date().toISOString()
      }
      if (newStatus === 'resolved' && !payload.resolved_at) {
        payload.resolved_at = new Date().toISOString()
      }
      const res = await api.patch(`/alerts/${id}/`, payload)
      if (isMounted.current) {
        setAlert(res.data)          // update local state immediately
        setActionModal(null)        // close modal
        showToast(`Alert marked as ${fmt(newStatus)}.`)
        resetTimer()
        // Also do a silent full fetch to sync all related data
        fetchData(true)
      }
    } catch (e) {
      const data = e.response?.data
      const msg = typeof data === 'object' ? Object.values(data).flat().join(' ') : 'Failed to update alert.'
      showToast(msg, 'error')
      // Don't close modal on error so user can retry
    }
  }

  const handleAddNote = async () => {
    if (!noteText.trim()) return
    setSavingNote(true)
    try {
      try {
        await api.post(`/alerts/${id}/notes/`, { content: noteText.trim() })
      } catch {
        const currentNotes = alert.notes || ''
        const timestamp = new Date().toLocaleString('en-IN')
        await api.patch(`/alerts/${id}/`, {
          notes: `${currentNotes}${currentNotes ? '\n' : ''}[${timestamp}] ${noteText.trim()}`
        })
      }
      setNoteText('')
      showToast('Note added.')
      fetchData(true)
    } catch {
      showToast('Failed to add note.', 'error')
    } finally {
      setSavingNote(false)
    }
  }

  // ─── FIX 2: handleEdit — update state AND re-fetch to sync everything ────
  const handleEdit = async (form) => {
    try {
      const res = await api.patch(`/alerts/${id}/`, form)
      if (isMounted.current) {
        setAlert(res.data)          // immediate UI update
        setEditModal(false)
        showToast('Alert updated successfully.')
        resetTimer()
        fetchData(true)             // full re-fetch to sync derived fields
      }
    } catch (e) {
      const data = e.response?.data
      const msg = typeof data === 'object' ? Object.values(data).flat().join(' ') : 'Failed to update.'
      showToast(msg, 'error')
      throw e                       // re-throw so EditModal can clear its saving state
    }
  }

  const handleLogout = async () => { clearInterval(tickRef.current); await logout(); navigate('/login') }

  const severity = alert ? (SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info) : SEVERITY_CONFIG.info
  const statusCfg = alert ? (STATUS_CONFIG[alert.status] || { label: fmt(alert.status || 'Unknown'), cls: 'dismissed' }) : STATUS_CONFIG.active
  const alertTypeIcon = alert ? (ALERT_TYPE_ICONS[alert.alert_type] || ALERT_TYPE_ICONS.default) : ALERT_TYPE_ICONS.default

  const navItems = [
    { id: 'dashboard',   label: 'Dashboard',   path: '/dashboard',             d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'jobs',        label: 'All Jobs',     path: '/dashboard/jobs',        d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { id: 'customers',   label: 'Customers',    path: '/dashboard/customers',   d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { id: 'technicians', label: 'Technicians',  path: '/dashboard/technicians', d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { id: 'reports',     label: 'Reports',      path: '/dashboard/reports',     d: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'alerts',      label: 'Smart Alerts', path: '/dashboard/alerts',      d: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    { id: 'settings',    label: 'Settings',     path: '/dashboard/settings',    d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  ]

  const S = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{--green:#1a6b3c;--green-dark:#1a4d2e;--green-light:#edf6f1;--ink:#1a2e1a;--muted:#7a8c7a;--pale:#a0b0a0;--border:#e8ebe8;--bg:#f0f2f0;--white:#fff;--red:#e74c3c;--amber:#e6a817;--blue:#3b82f6;--orange:#e6550d;--sidebar-w:220px;}
.aad-root{font-family:'DM Serif Display',serif;min-height:100vh;background:var(--bg);display:flex;}
.aad-sidebar{width:var(--sidebar-w);background:var(--white);border-right:1px solid var(--border);display:flex;flex-direction:column;min-height:100vh;position:fixed;top:0;left:0;bottom:0;z-index:200;overflow-y:auto;transition:transform .25s ease;}
.aad-sb-logo{padding:16px 20px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border);}
.aad-sb-icon{width:28px;height:28px;background:var(--green);border-radius:6px;display:flex;align-items:center;justify-content:center;}
.aad-sb-icon svg{width:15px;height:15px;fill:white;}
.aad-sb-brand{font-size:16px;color:var(--ink);}
.aad-sb-nav{padding:12px 10px;flex:1;}
.aad-sb-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;cursor:pointer;margin-bottom:2px;color:var(--muted);font-size:13.5px;transition:background .15s,color .15s;white-space:nowrap;}
.aad-sb-item:hover{background:var(--bg);color:var(--ink);}
.aad-sb-item.active{background:var(--green-light);color:var(--green);}
.aad-sb-item svg{width:16px;height:16px;flex-shrink:0;}
.aad-sb-user{padding:14px 16px;border-top:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-shrink:0;}
.aad-sb-avatar{width:32px;height:32px;background:var(--green);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;flex-shrink:0;}
.aad-sb-uname{font-size:13px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.aad-sb-urole{font-size:11px;color:var(--pale);}
.aad-sb-logout{background:none;border:none;cursor:pointer;color:var(--pale);padding:4px;border-radius:6px;display:flex;align-items:center;margin-left:auto;transition:color .15s,background .15s;}
.aad-sb-logout:hover{color:var(--red);background:#fde8e8;}
.aad-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:150;}
.aad-overlay.show{display:block;}
.aad-hamburger{display:none;background:none;border:none;cursor:pointer;padding:4px;border-radius:6px;color:var(--ink);}
.aad-hamburger svg{width:20px;height:20px;}
.aad-main{flex:1;margin-left:var(--sidebar-w);display:flex;flex-direction:column;min-height:100vh;}
.aad-topbar{background:var(--white);border-bottom:1px solid var(--border);padding:0 24px;height:52px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;flex-shrink:0;gap:12px;}
.aad-topbar-left{display:flex;align-items:center;gap:10px;}
.aad-back-btn{background:none;border:1.5px solid var(--border);border-radius:9px;padding:7px 14px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;color:var(--ink);display:flex;align-items:center;gap:6px;transition:background .15s;}
.aad-back-btn:hover{background:var(--bg);}
.aad-crumb{font-size:13px;color:var(--pale);}
.aad-crumb span{color:var(--ink);}
.aad-topbar-right{display:flex;align-items:center;gap:10px;}
.aad-ticker{font-size:12px;color:var(--pale);white-space:nowrap;}
.aad-ticker.soon{color:var(--green);}
.aad-refresh-btn{background:var(--bg);color:var(--ink);border:1.5px solid var(--border);border-radius:9px;padding:7px 14px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;transition:background .15s;}
.aad-refresh-btn:hover{background:#e2e8e2;}
.aad-refresh-btn svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2;transition:transform .35s;}
.aad-refresh-btn.spinning svg{animation:aadSpin .55s linear;}
@keyframes aadSpin{to{transform:rotate(360deg);}}
.aad-edit-btn{background:var(--green);color:#fff;border:none;border-radius:9px;padding:7px 16px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;transition:background .15s;}
.aad-edit-btn:hover{background:var(--green-dark);}
.aad-edit-btn svg{width:14px;height:14px;stroke:white;fill:none;stroke-width:2;}
.aad-content{padding:22px 24px 40px;flex:1;}
.aad-loading{display:flex;align-items:center;justify-content:center;padding:80px;color:var(--pale);font-size:14px;gap:10px;}
.aad-spinner{width:20px;height:20px;border:2px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:aadSpinner .8s linear infinite;}
@keyframes aadSpinner{to{transform:rotate(360deg);}}
.aad-error{background:#fde8e8;color:var(--red);padding:12px 16px;border-radius:10px;font-size:13px;margin-bottom:16px;}
.aad-hero{background:var(--white);border-radius:16px;padding:24px 28px;box-shadow:0 2px 12px rgba(0,0,0,.05);margin-bottom:18px;}
.aad-hero-top{display:flex;align-items:flex-start;gap:18px;flex-wrap:wrap;}
.aad-hero-icon{width:58px;height:58px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.aad-hero-icon svg{width:26px;height:26px;fill:none;stroke-width:1.8;}
.aad-hero-info{flex:1;min-width:0;}
.aad-hero-title{font-size:20px;color:var(--ink);margin-bottom:4px;line-height:1.3;}
.aad-hero-type{font-size:13px;color:var(--muted);margin-bottom:10px;}
.aad-hero-chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:0;}
.aad-chip{font-size:12px;padding:3px 12px;border-radius:20px;}
.aad-chip.active{background:var(--green-light);color:var(--green);}
.aad-chip.inactive{background:#f0f2f0;color:var(--muted);}
.aad-chip.sev-critical{background:#fde8e8;color:var(--red);}
.aad-chip.sev-high{background:#fff0eb;color:var(--orange);}
.aad-chip.sev-medium{background:#fff8ec;color:var(--amber);}
.aad-chip.sev-low{background:#eff6ff;color:var(--blue);}
.aad-chip.sev-info{background:#f0f2f0;color:var(--muted);}
.aad-chip.st-active{background:#fde8e8;color:var(--red);}
.aad-chip.st-ack{background:#fff8ec;color:var(--amber);}
.aad-chip.st-resolved{background:var(--green-light);color:var(--green);}
.aad-chip.st-dismissed{background:#f0f2f0;color:var(--muted);}
.aad-chip.st-snoozed{background:#eff6ff;color:var(--blue);}
.aad-hero-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;padding-top:16px;border-top:1px solid var(--border);}
.aad-action-btn{border:none;border-radius:10px;padding:9px 18px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;transition:background .15s,opacity .15s;display:flex;align-items:center;gap:6px;}
.aad-action-btn svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2;}
.aad-action-btn.ack{background:#fff8ec;color:var(--amber);}
.aad-action-btn.ack:hover{background:#fde8c0;}
.aad-action-btn.resolve{background:var(--green-light);color:var(--green);}
.aad-action-btn.resolve:hover{background:#d4eddf;}
.aad-action-btn.snooze{background:#eff6ff;color:var(--blue);}
.aad-action-btn.snooze:hover{background:#dbeafe;}
.aad-action-btn.dismiss{background:#fde8e8;color:var(--red);}
.aad-action-btn.dismiss:hover{background:#f5c6c6;}
.aad-action-btn.reopen{background:#fff8ec;color:var(--amber);}
.aad-action-btn.reopen:hover{background:#fde8c0;}
.aad-action-btn:disabled{opacity:.45;cursor:not-allowed;}
.aad-pulse{animation:aadPulse 2s ease-in-out infinite;}
@keyframes aadPulse{0%,100%{box-shadow:0 0 0 0 rgba(231,76,60,.25);}50%{box-shadow:0 0 0 8px rgba(231,76,60,0);}}
.aad-stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px;}
.aad-mini-stat{background:var(--white);border-radius:12px;padding:14px 16px;box-shadow:0 1px 6px rgba(0,0,0,.05);}
.aad-mini-label{font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:var(--pale);margin-bottom:5px;}
.aad-mini-val{font-size:22px;color:var(--ink);letter-spacing:-1px;line-height:1;}
.aad-mini-val.green{color:var(--green);}
.aad-mini-val.red{color:var(--red);}
.aad-mini-val.amber{color:var(--amber);}
.aad-mini-val.blue{color:var(--blue);}
.aad-mini-sub{font-size:11px;color:var(--muted);margin-top:3px;}
.aad-grid{display:grid;grid-template-columns:1fr 320px;gap:18px;align-items:start;}
.aad-card{background:var(--white);border-radius:16px;padding:22px;box-shadow:0 2px 12px rgba(0,0,0,.05);margin-bottom:16px;}
.aad-card:last-child{margin-bottom:0;}
.aad-card-title{font-size:10.5px;text-transform:uppercase;letter-spacing:.8px;color:var(--pale);margin-bottom:16px;display:flex;align-items:center;gap:6px;}
.aad-card-title svg{width:13px;height:13px;}
.aad-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;}
.aad-info-cell{padding:11px 0;border-bottom:1px solid #f5f7f5;}
.aad-info-cell:nth-last-child(-n+2){border-bottom:none;}
.aad-info-cell.full{grid-column:1/-1;}
.aad-info-label{font-size:10px;color:var(--pale);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;}
.aad-info-value{font-size:14px;color:var(--ink);}
.aad-info-value.muted{color:var(--muted);}
.aad-info-value a{color:var(--green);text-decoration:none;}
.aad-info-value a:hover{text-decoration:underline;}
.aad-message-box{background:var(--bg);border-radius:12px;padding:16px 18px;font-size:14px;color:var(--ink);line-height:1.7;border-left:3px solid var(--green);}
/* Company banner */
.aad-company-banner{background:linear-gradient(135deg,var(--green-light) 0%,#fff 100%);border:1.5px solid #c8e6d5;border-radius:14px;padding:16px 20px;display:flex;align-items:center;gap:14px;margin-bottom:18px;}
.aad-company-logo{width:44px;height:44px;border-radius:10px;background:var(--green);display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;flex-shrink:0;}
.aad-company-info{flex:1;min-width:0;}
.aad-company-label{font-size:10px;text-transform:uppercase;letter-spacing:.7px;color:var(--pale);margin-bottom:3px;}
.aad-company-name{font-size:16px;color:var(--ink);}
.aad-company-meta{font-size:12px;color:var(--muted);margin-top:2px;}
.aad-entity-row{display:flex;align-items:center;gap:12px;padding:12px 10px;border-radius:10px;border:1.5px solid var(--border);cursor:pointer;transition:background .12s,border-color .12s;margin-bottom:10px;}
.aad-entity-row:last-child{margin-bottom:0;}
.aad-entity-row:hover{background:var(--bg);border-color:var(--green);}
.aad-entity-icon{width:36px;height:36px;border-radius:9px;background:var(--green-light);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.aad-entity-icon svg{width:16px;height:16px;stroke:var(--green);fill:none;stroke-width:2;}
.aad-entity-body{flex:1;min-width:0;}
.aad-entity-name{font-size:13.5px;color:var(--ink);margin-bottom:2px;}
.aad-entity-meta{font-size:11.5px;color:var(--pale);}
.aad-entity-arrow{color:var(--pale);}
.aad-entity-arrow svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;}
.aad-notes-list{margin-bottom:14px;}
.aad-note-item{padding:10px 14px;background:var(--bg);border-radius:10px;margin-bottom:8px;font-size:13px;color:var(--ink);line-height:1.6;border-left:2px solid var(--border);}
.aad-note-item:last-child{margin-bottom:0;}
.aad-note-meta{font-size:10.5px;color:var(--pale);margin-bottom:4px;}
.aad-note-add{display:flex;gap:8px;margin-top:2px;}
.aad-note-input{flex:1;border:1.5px solid var(--border);border-radius:10px;padding:9px 14px;font-family:'DM Serif Display',serif;font-size:13px;color:var(--ink);outline:none;background:var(--white);transition:border-color .2s;resize:none;}
.aad-note-input:focus{border-color:var(--green);}
.aad-note-submit{background:var(--green);color:#fff;border:none;border-radius:10px;padding:9px 16px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;white-space:nowrap;transition:background .15s;}
.aad-note-submit:hover{background:var(--green-dark);}
.aad-note-submit:disabled{opacity:.5;cursor:not-allowed;}
.aad-alert-row{display:flex;align-items:center;gap:10px;padding:10px 8px;border-bottom:1px solid #f5f7f5;cursor:pointer;border-radius:8px;transition:background .12s;}
.aad-alert-row:last-child{border-bottom:none;}
.aad-alert-row:hover{background:var(--bg);}
.aad-alert-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.aad-alert-body{flex:1;min-width:0;}
.aad-alert-name{font-size:13px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:1px;}
.aad-alert-meta{font-size:11px;color:var(--pale);}
.aad-alert-badge{font-size:10.5px;padding:2px 8px;border-radius:5px;flex-shrink:0;}
.aad-alert-badge.active{background:#fde8e8;color:var(--red);}
.aad-alert-badge.ack{background:#fff8ec;color:var(--amber);}
.aad-alert-badge.resolved{background:var(--green-light);color:var(--green);}
.aad-alert-badge.dismissed{background:#f0f2f0;color:var(--muted);}
.aad-alert-badge.snoozed{background:#eff6ff;color:var(--blue);}
.aad-no-data{text-align:center;padding:22px 16px;color:var(--pale);font-size:13px;line-height:1.7;}
.aad-timeline{padding:0;list-style:none;}
.aad-tl-item{display:flex;gap:12px;padding-bottom:18px;position:relative;}
.aad-tl-item:last-child{padding-bottom:0;}
.aad-tl-item:not(:last-child)::before{content:'';position:absolute;left:11px;top:24px;bottom:0;width:1.5px;background:var(--border);}
.aad-tl-dot{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;}
.aad-tl-dot svg{width:12px;height:12px;fill:none;stroke:white;stroke-width:2.5;}
.aad-tl-body{flex:1;}
.aad-tl-label{font-size:13.5px;color:var(--ink);margin-bottom:2px;}
.aad-tl-time{font-size:11px;color:var(--pale);}
.aad-notif-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f5f7f5;}
.aad-notif-row:last-child{border-bottom:none;}
.aad-notif-label{font-size:13.5px;color:var(--ink);}
.aad-notif-val{font-size:12px;padding:3px 10px;border-radius:6px;}
.aad-notif-val.yes{background:var(--green-light);color:var(--green);}
.aad-notif-val.no{background:#f0f2f0;color:var(--muted);}
.aad-notif-val.warn{background:#fff8ec;color:var(--amber);}
.aad-modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;}
.aad-modal{background:var(--white);border-radius:16px;width:100%;max-width:520px;box-shadow:0 20px 60px rgba(0,0,0,.15);overflow:hidden;}
.aad-modal-hdr{padding:20px 24px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
.aad-modal-title{font-size:17px;color:var(--ink);}
.aad-modal-close{background:none;border:none;cursor:pointer;color:var(--pale);padding:4px;border-radius:6px;display:flex;align-items:center;}
.aad-modal-close:hover{color:var(--ink);}
.aad-modal-body{padding:20px 24px;}
.aad-modal-ftr{padding:16px 24px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:10px;}
.aad-field{margin-bottom:14px;}
.aad-field label{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:var(--pale);margin-bottom:6px;}
.aad-field input,.aad-field select,.aad-field textarea{width:100%;border:1.5px solid var(--border);border-radius:10px;padding:10px 14px;font-family:'DM Serif Display',serif;font-size:13.5px;color:var(--ink);outline:none;background:var(--white);transition:border-color .2s;}
.aad-field input:focus,.aad-field select:focus,.aad-field textarea:focus{border-color:var(--green);}
.aad-field textarea{resize:vertical;min-height:80px;}
.aad-field-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.aad-btn-cancel{background:var(--bg);color:var(--muted);border:1.5px solid var(--border);border-radius:9px;padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;}
.aad-btn-save{background:var(--green);color:#fff;border:none;border-radius:9px;padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;}
.aad-btn-save:hover{background:var(--green-dark);}
.aad-btn-save:disabled{opacity:.5;cursor:not-allowed;}
.aad-btn-danger{background:var(--red);color:#fff;border:none;border-radius:9px;padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;}
.aad-btn-amber{background:var(--amber);color:#fff;border:none;border-radius:9px;padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;}
.aad-btn-blue{background:var(--blue);color:#fff;border:none;border-radius:9px;padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;}
.aad-toast{position:fixed;bottom:20px;right:20px;z-index:700;display:flex;align-items:center;gap:10px;padding:12px 18px;border-radius:10px;font-size:13px;box-shadow:0 4px 20px rgba(0,0,0,.15);animation:aadSlide .25s ease;}
@keyframes aadSlide{from{transform:translateY(20px);opacity:0;}to{transform:translateY(0);opacity:1;}}
.aad-toast.success{background:var(--green);color:#fff;}
.aad-toast.error{background:var(--red);color:#fff;}
@media(max-width:900px){.aad-grid{grid-template-columns:1fr;}.aad-stats-row{grid-template-columns:repeat(2,1fr);}}
@media(max-width:768px){.aad-sidebar{transform:translateX(-100%);}.aad-sidebar.open{transform:translateX(0);}.aad-main{margin-left:0;}.aad-hamburger{display:flex;}.aad-content{padding:14px 16px 32px;}.aad-info-grid{grid-template-columns:1fr;}.aad-info-cell:nth-last-child(-n+2){border-bottom:1px solid #f5f7f5;}.aad-info-cell:last-child{border-bottom:none;}.aad-field-row{grid-template-columns:1fr;}}
@media(max-width:480px){.aad-stats-row{grid-template-columns:1fr;}.aad-topbar{padding:0 14px;}}
`

  const buildTimeline = (a) => {
    if (!a) return []
    const items = []
    if (a.created_at) items.push({ label: 'Alert Created', time: a.created_at, color: '#e74c3c', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' })
    if (a.acknowledged_at) items.push({ label: 'Acknowledged', time: a.acknowledged_at, color: '#e6a817', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' })
    if (a.snoozed_until) items.push({ label: 'Snoozed', time: a.snoozed_until, color: '#3b82f6', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' })
    if (a.resolved_at) items.push({ label: 'Resolved', time: a.resolved_at, color: '#1a6b3c', icon: 'M5 13l4 4L19 7' })
    return items.sort((x, y) => new Date(x.time) - new Date(y.time))
  }

  const timeline = buildTimeline(alert)
  const isResolved = alert?.status === 'resolved' || alert?.status === 'dismissed'

  // Company display name helper
  const companyName = relatedCompany?.name || relatedCompany?.company_name
    || alert?.company_name || relatedCustomer?.company_name || null

  return (
    <>
      <style>{S}</style>
      <div className="aad-root">
        <div className={`aad-overlay${sidebarOpen ? ' show' : ''}`} onClick={() => setSidebarOpen(false)}/>
        <aside className={`aad-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="aad-sb-logo">
            <div className="aad-sb-icon"><svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/></svg></div>
            <span className="aad-sb-brand">PestPro</span>
          </div>
          <nav className="aad-sb-nav">
            {navItems.map(n => (
              <div key={n.id} className={`aad-sb-item${n.id === 'alerts' ? ' active' : ''}`} onClick={() => { setSidebarOpen(false); navigate(n.path) }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d={n.d}/></svg>
                {n.label}
              </div>
            ))}
          </nav>
          <div className="aad-sb-user">
            <div className="aad-sb-avatar">{userInitials}</div>
            <div style={{flex:1,minWidth:0}}><div className="aad-sb-uname">{userName}</div><div className="aad-sb-urole">Administrator</div></div>
            <button className="aad-sb-logout" onClick={handleLogout} title="Logout">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            </button>
          </div>
        </aside>

        <div className="aad-main">
          <div className="aad-topbar">
            <div className="aad-topbar-left">
              <button className="aad-hamburger" onClick={() => setSidebarOpen(o => !o)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
              </button>
              <button className="aad-back-btn" onClick={() => navigate('/dashboard/alerts')}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                Back
              </button>
              <span className="aad-crumb">Smart Alerts &nbsp;›&nbsp; <span>{alert ? fmt(alert.alert_type || 'Alert') : `Alert #${id}`}</span></span>
            </div>
            <div className="aad-topbar-right">
              <span className={`aad-ticker${countdown <= 10 ? ' soon' : ''}`}>&#8635; in {countdown}s</span>
              <button className={`aad-refresh-btn${isSpinning ? ' spinning' : ''}`} onClick={manualRefresh}>
                <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                Refresh
              </button>
              {alert && (
                <button className="aad-edit-btn" onClick={() => setEditModal(true)}>
                  <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  Edit
                </button>
              )}
            </div>
          </div>

          <div className="aad-content">
            {error && <div className="aad-error">{error}</div>}
            {loading ? (
              <div className="aad-loading"><div className="aad-spinner"/>Loading alert&hellip;</div>
            ) : !alert ? null : (
              <>
                {/* ── Company Banner ── */}
                {companyName && (
                  <div className="aad-company-banner">
                    <div className="aad-company-logo">
                      {companyName.charAt(0).toUpperCase()}
                    </div>
                    <div className="aad-company-info">
                      <div className="aad-company-label">Company</div>
                      <div className="aad-company-name">{companyName}</div>
                      {(relatedCompany?.phone || relatedCompany?.email) && (
                        <div className="aad-company-meta">
                          {relatedCompany.phone || ''}{relatedCompany.phone && relatedCompany.email ? ' · ' : ''}{relatedCompany.email || ''}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Hero */}
                <div className="aad-hero">
                  <div className="aad-hero-top">
                    <div
                      className={`aad-hero-icon${alert.status === 'active' && alert.severity === 'critical' ? ' aad-pulse' : ''}`}
                      style={{ background: severity.bg }}
                    >
                      <svg viewBox="0 0 24 24" style={{ stroke: severity.color }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={alertTypeIcon}/>
                      </svg>
                    </div>
                    <div className="aad-hero-info">
                      <div className="aad-hero-title">{alert.title || fmt(alert.alert_type || 'Smart Alert')}</div>
                      <div className="aad-hero-type">
                        {fmt(alert.alert_type || 'Alert')} &nbsp;·&nbsp; Alert #{alert.id}
                        {companyName && <> &nbsp;·&nbsp; <span style={{color:'var(--green)'}}>{companyName}</span></>}
                      </div>
                      <div className="aad-hero-chips">
                        <span className={`aad-chip sev-${severity.cls}`}>⬤ {severity.label}</span>
                        <span className={`aad-chip st-${statusCfg.cls}`}>{statusCfg.label}</span>
                        {alert.auto_generated && <span className="aad-chip inactive">Auto-generated</span>}
                        {alert.is_recurring && <span className="aad-chip sev-medium">Recurring</span>}
                      </div>
                    </div>
                    <div style={{fontSize:12,color:'var(--pale)',textAlign:'right',flexShrink:0,whiteSpace:'nowrap'}}>
                      <div style={{marginBottom:3}}>Created {fmtRelative(alert.created_at)}</div>
                      <div style={{fontSize:11}}>{fmtDateTime(alert.created_at)}</div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="aad-hero-actions">
                    {alert.status !== 'acknowledged' && !isResolved && (
                      <button className="aad-action-btn ack" onClick={() => setActionModal('acknowledge')}>
                        <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        Acknowledge
                      </button>
                    )}
                    {!isResolved && (
                      <button className="aad-action-btn resolve" onClick={() => setActionModal('resolve')}>
                        <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                        Mark Resolved
                      </button>
                    )}
                    {!isResolved && (
                      <button className="aad-action-btn snooze" onClick={() => setActionModal('snooze')}>
                        <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        Snooze
                      </button>
                    )}
                    {!isResolved && (
                      <button className="aad-action-btn dismiss" onClick={() => setActionModal('dismiss')}>
                        <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                        Dismiss
                      </button>
                    )}
                    {isResolved && (
                      <button className="aad-action-btn reopen" onClick={() => handleStatusAction('active')}>
                        <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                        Reopen Alert
                      </button>
                    )}
                  </div>
                </div>

                {/* Stats row */}
                <div className="aad-stats-row">
                  <div className="aad-mini-stat">
                    <div className="aad-mini-label">Severity</div>
                    <div className={`aad-mini-val`} style={{fontSize:16,paddingTop:4,color:severity.color}}>{severity.label}</div>
                    <div className="aad-mini-sub">{fmt(alert.alert_type || '—')}</div>
                  </div>
                  <div className="aad-mini-stat">
                    <div className="aad-mini-label">Status</div>
                    <div className="aad-mini-val" style={{fontSize:16,paddingTop:4,color: isResolved ? 'var(--green)' : alert.status === 'active' ? 'var(--red)' : 'var(--amber)'}}>{statusCfg.label}</div>
                    <div className="aad-mini-sub">Current state</div>
                  </div>
                  <div className="aad-mini-stat">
                    <div className="aad-mini-label">Age</div>
                    <div className="aad-mini-val" style={{fontSize:16,paddingTop:4}}>{fmtRelative(alert.created_at)}</div>
                    <div className="aad-mini-sub">{fmtDate(alert.created_at)}</div>
                  </div>
                  <div className="aad-mini-stat">
                    <div className="aad-mini-label">Priority</div>
                    <div className={`aad-mini-val${alert.priority > 7 ? ' red' : alert.priority > 4 ? ' amber' : ' green'}`}>{alert.priority || '—'}<span style={{fontSize:12,color:'var(--pale)',fontWeight:400}}>/10</span></div>
                    <div className="aad-mini-sub">{alert.priority > 7 ? 'Urgent' : alert.priority > 4 ? 'Moderate' : 'Low'}</div>
                  </div>
                </div>

                <div className="aad-grid">
                  {/* Left column */}
                  <div>
                    {/* Alert Details */}
                    <div className="aad-card">
                      <div className="aad-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        Alert Details
                      </div>
                      {(alert.message || alert.description) && (
                        <div className="aad-message-box" style={{marginBottom:16}}>
                          {alert.message || alert.description}
                        </div>
                      )}
                      <div className="aad-info-grid">
                        <div className="aad-info-cell"><div className="aad-info-label">Alert Type</div><div className="aad-info-value">{fmt(alert.alert_type || '—')}</div></div>
                        <div className="aad-info-cell"><div className="aad-info-label">Severity</div><div className="aad-info-value" style={{color: severity.color}}>{severity.label}</div></div>
                        <div className="aad-info-cell"><div className="aad-info-label">Priority Score</div><div className="aad-info-value">{alert.priority ?? '—'}</div></div>
                        <div className="aad-info-cell"><div className="aad-info-label">Source</div><div className="aad-info-value muted">{fmt(alert.source || alert.triggered_by || 'System')}</div></div>
                        {companyName && (
                          <div className="aad-info-cell"><div className="aad-info-label">Company</div><div className="aad-info-value" style={{color:'var(--green)'}}>{companyName}</div></div>
                        )}
                        <div className="aad-info-cell"><div className="aad-info-label">Created At</div><div className="aad-info-value muted">{fmtDateTime(alert.created_at)}</div></div>
                        <div className="aad-info-cell"><div className="aad-info-label">Last Updated</div><div className="aad-info-value muted">{fmtDateTime(alert.updated_at)}</div></div>
                        {alert.snoozed_until && (
                          <div className="aad-info-cell"><div className="aad-info-label">Snoozed Until</div><div className="aad-info-value muted">{fmtDateTime(alert.snoozed_until)}</div></div>
                        )}
                        {alert.resolved_at && (
                          <div className="aad-info-cell"><div className="aad-info-label">Resolved At</div><div className="aad-info-value muted">{fmtDateTime(alert.resolved_at)}</div></div>
                        )}
                        {alert.rule_name && (
                          <div className="aad-info-cell full"><div className="aad-info-label">Triggered By Rule</div><div className="aad-info-value muted">{alert.rule_name}</div></div>
                        )}
                        {alert.threshold_value != null && (
                          <div className="aad-info-cell"><div className="aad-info-label">Threshold</div><div className="aad-info-value muted">{alert.threshold_value}</div></div>
                        )}
                        {alert.actual_value != null && (
                          <div className="aad-info-cell"><div className="aad-info-label">Actual Value</div><div className="aad-info-value" style={{color:severity.color}}>{alert.actual_value}</div></div>
                        )}
                      </div>
                    </div>

                    {/* Related Entities */}
                    {(relatedJob || relatedCustomer || relatedTechnician) && (
                      <div className="aad-card">
                        <div className="aad-card-title">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                          Related Entities
                        </div>
                        {relatedCustomer && (
                          <div className="aad-entity-row" onClick={() => navigate(`/dashboard/customers/${relatedCustomer.id}`)}>
                            <div className="aad-entity-icon">
                              <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                            </div>
                            <div className="aad-entity-body">
                              <div className="aad-entity-name">{relatedCustomer.name}</div>
                              <div className="aad-entity-meta">Customer · {relatedCustomer.phone || relatedCustomer.email || `ID #${relatedCustomer.id}`}</div>
                            </div>
                            <div className="aad-entity-arrow"><svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg></div>
                          </div>
                        )}
                        {relatedJob && (
                          <div className="aad-entity-row" onClick={() => navigate(`/dashboard/jobs/${relatedJob.id}`)}>
                            <div className="aad-entity-icon">
                              <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                            </div>
                            <div className="aad-entity-body">
                              <div className="aad-entity-name">{fmt(relatedJob.service_type || relatedJob.title || 'Service Job')} <span style={{fontSize:11,color:'var(--pale)'}}>#{relatedJob.id}</span></div>
                              <div className="aad-entity-meta">Job · {fmtDate(relatedJob.scheduled_datetime || relatedJob.created_at)} · {fmt(relatedJob.status || '—')}</div>
                            </div>
                            <div className="aad-entity-arrow"><svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg></div>
                          </div>
                        )}
                        {relatedTechnician && (
                          <div className="aad-entity-row" onClick={() => navigate(`/dashboard/technicians/${relatedTechnician.id}`)}>
                            <div className="aad-entity-icon">
                              <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                            </div>
                            <div className="aad-entity-body">
                              <div className="aad-entity-name">{relatedTechnician.name || relatedTechnician.full_name || `Technician #${relatedTechnician.id}`}</div>
                              <div className="aad-entity-meta">Technician · {relatedTechnician.phone || relatedTechnician.email || fmt(relatedTechnician.status || '—')}</div>
                            </div>
                            <div className="aad-entity-arrow"><svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg></div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    <div className="aad-card">
                      <div className="aad-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        Notes &amp; Actions
                      </div>
                      <div className="aad-notes-list">
                        {Array.isArray(alert.notes) && alert.notes.length > 0 ? (
                          alert.notes.map((n, i) => (
                            <div key={i} className="aad-note-item">
                              <div className="aad-note-meta">{n.created_by || 'Admin'} · {fmtDateTime(n.created_at)}</div>
                              {n.content || n.text || String(n)}
                            </div>
                          ))
                        ) : typeof alert.notes === 'string' && alert.notes ? (
                          alert.notes.split('\n').filter(Boolean).map((line, i) => (
                            <div key={i} className="aad-note-item">{line}</div>
                          ))
                        ) : alert.resolution_notes ? (
                          <div className="aad-note-item">
                            <div className="aad-note-meta">Resolution Note</div>
                            {alert.resolution_notes}
                          </div>
                        ) : (
                          <div className="aad-no-data" style={{padding:'14px 0',textAlign:'left'}}>No notes yet.</div>
                        )}
                      </div>
                      <div className="aad-note-add">
                        <textarea
                          className="aad-note-input"
                          placeholder="Add a note or action taken…"
                          rows={2}
                          value={noteText}
                          onChange={e => setNoteText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleAddNote() }}
                        />
                        <button className="aad-note-submit" onClick={handleAddNote} disabled={savingNote || !noteText.trim()}>
                          {savingNote ? 'Saving…' : 'Add'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right column */}
                  <div>
                    <div className="aad-card">
                      <div className="aad-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        Status Timeline
                      </div>
                      {timeline.length === 0 ? (
                        <div className="aad-no-data">No timeline data available.</div>
                      ) : (
                        <ul className="aad-timeline">
                          {timeline.map((item, i) => (
                            <li key={i} className="aad-tl-item">
                              <div className="aad-tl-dot" style={{background: item.color}}>
                                <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={item.icon}/></svg>
                              </div>
                              <div className="aad-tl-body">
                                <div className="aad-tl-label">{item.label}</div>
                                <div className="aad-tl-time">{fmtDateTime(item.time)}</div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="aad-card">
                      <div className="aad-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        Alert Config
                      </div>
                      <div className="aad-notif-row"><span className="aad-notif-label">Auto-generated</span><span className={`aad-notif-val ${alert.auto_generated ? 'yes' : 'no'}`}>{alert.auto_generated ? '✓ Yes' : '✗ No'}</span></div>
                      <div className="aad-notif-row"><span className="aad-notif-label">Recurring</span><span className={`aad-notif-val ${alert.is_recurring ? 'warn' : 'no'}`}>{alert.is_recurring ? '⟳ Yes' : '✗ No'}</span></div>
                      <div className="aad-notif-row"><span className="aad-notif-label">Notify Admin</span><span className={`aad-notif-val ${alert.notify_admin !== false ? 'yes' : 'no'}`}>{alert.notify_admin !== false ? '✓ Yes' : '✗ No'}</span></div>
                      <div className="aad-notif-row"><span className="aad-notif-label">Send Email</span><span className={`aad-notif-val ${alert.send_email ? 'yes' : 'no'}`}>{alert.send_email ? '✓ Yes' : '✗ No'}</span></div>
                      <div className="aad-notif-row"><span className="aad-notif-label">Send SMS</span><span className={`aad-notif-val ${alert.send_sms ? 'yes' : 'no'}`}>{alert.send_sms ? '✓ Yes' : '✗ No'}</span></div>
                    </div>

                    <div className="aad-card">
                      <div className="aad-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        Record Info
                      </div>
                      <div className="aad-notif-row"><span className="aad-notif-label">Alert ID</span><span style={{fontSize:13,color:'var(--ink)',fontWeight:600}}>#{alert.id}</span></div>
                      <div className="aad-notif-row"><span className="aad-notif-label">Status</span><span className={`aad-notif-val st-${statusCfg.cls}`}>{statusCfg.label}</span></div>
                      <div className="aad-notif-row"><span className="aad-notif-label">Severity</span><span style={{fontSize:13,color:severity.color}}>{severity.label}</span></div>
                      {companyName && <div className="aad-notif-row"><span className="aad-notif-label">Company</span><span style={{fontSize:13,color:'var(--green)'}}>{companyName}</span></div>}
                      <div className="aad-notif-row"><span className="aad-notif-label">Created</span><span style={{fontSize:13,color:'var(--muted)'}}>{fmtDate(alert.created_at)}</span></div>
                      <div className="aad-notif-row"><span className="aad-notif-label">Last Updated</span><span style={{fontSize:13,color:'var(--muted)'}}>{fmtDate(alert.updated_at)}</span></div>
                    </div>

                    {allAlerts.length > 0 && (
                      <div className="aad-card">
                        <div className="aad-card-title">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                          Similar Alerts
                        </div>
                        {allAlerts.map(a => {
                          const sc = STATUS_CONFIG[a.status] || { label: fmt(a.status || ''), cls: 'dismissed' }
                          const sv = SEVERITY_CONFIG[a.severity] || SEVERITY_CONFIG.info
                          return (
                            <div key={a.id} className="aad-alert-row" onClick={() => navigate(`/dashboard/alerts/${a.id}`)}>
                              <div className="aad-alert-dot" style={{background: sv.color}}/>
                              <div className="aad-alert-body">
                                <div className="aad-alert-name">{a.title || fmt(a.alert_type || 'Alert')} <span style={{fontSize:10.5,color:'var(--pale)'}}>#{a.id}</span></div>
                                <div className="aad-alert-meta">{fmtRelative(a.created_at)}</div>
                              </div>
                              <span className={`aad-alert-badge ${sc.cls}`}>{sc.label}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {actionModal && alert && (
          <ActionModal
            type={actionModal}
            alert={alert}
            onClose={() => setActionModal(null)}
            onConfirm={handleStatusAction}
          />
        )}
        {editModal && alert && (
          <EditAlertModal
            alert={alert}
            onClose={() => setEditModal(false)}
            onSave={handleEdit}
          />
        )}

        {toast && (
          <div className={`aad-toast ${toast.type}`}>
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

// ─── Action Modal ─────────────────────────────────────────────────────────────
function ActionModal({ type, alert, onClose, onConfirm }) {
  const [saving, setSaving] = useState(false)
  const [snoozeHours, setSnoozeHours] = useState(4)
  const [resolutionNote, setResolutionNote] = useState('')

  const configs = {
    acknowledge: {
      title: 'Acknowledge Alert',
      icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
      iconColor: '#e6a817', iconBg: '#fff8ec',
      desc: 'Acknowledge this alert to indicate you are aware and working on it.',
      btnLabel: 'Acknowledge', btnClass: 'aad-btn-amber',
    },
    resolve: {
      title: 'Resolve Alert',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      iconColor: '#1a6b3c', iconBg: '#edf6f1',
      desc: 'Mark this alert as resolved. You can add a resolution note.',
      btnLabel: 'Mark Resolved', btnClass: 'aad-btn-save',
    },
    snooze: {
      title: 'Snooze Alert',
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      iconColor: '#3b82f6', iconBg: '#eff6ff',
      desc: 'Temporarily silence this alert for a set number of hours.',
      btnLabel: 'Snooze', btnClass: 'aad-btn-blue',
    },
    dismiss: {
      title: 'Dismiss Alert',
      icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
      iconColor: '#e74c3c', iconBg: '#fde8e8',
      desc: 'Dismiss this alert. It will be archived and no longer shown as active.',
      btnLabel: 'Dismiss', btnClass: 'aad-btn-danger',
    },
  }

  const cfg = configs[type]
  if (!cfg) return null

  // ─── FIX 3: build payload here, call onConfirm, handle errors ────────────
  const handleConfirm = async () => {
    setSaving(true)
    try {
      let extra = {}
      if (type === 'acknowledge') extra = { acknowledged_at: new Date().toISOString() }
      if (type === 'resolve')     extra = { resolved_at: new Date().toISOString(), resolution_notes: resolutionNote }
      if (type === 'snooze')      extra = { snoozed_until: new Date(Date.now() + snoozeHours * 3600000).toISOString() }
      // onConfirm handles setAlert + modal close on success, toast on error
      await onConfirm(
        type === 'acknowledge' ? 'acknowledged'
        : type === 'resolve'  ? 'resolved'
        : type === 'snooze'   ? 'snoozed'
        : 'dismissed',
        extra
      )
      // If onConfirm threw, we stay in the modal (error toast shown by parent)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="aad-modal-bg" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="aad-modal" style={{ maxWidth: 440 }}>
        <div className="aad-modal-hdr">
          <span className="aad-modal-title">{cfg.title}</span>
          <button className="aad-modal-close" onClick={onClose} disabled={saving}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="aad-modal-body" style={{ textAlign: 'center', paddingTop: 24 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', margin: '0 auto 14px', background: cfg.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={cfg.iconColor} strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d={cfg.icon}/></svg>
          </div>
          <div style={{ fontSize: 15, color: 'var(--ink)', marginBottom: 6 }}>{alert.title || fmt(alert.alert_type || 'Alert')}</div>
          <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 18 }}>{cfg.desc}</div>

          {type === 'snooze' && (
            <div className="aad-field" style={{ textAlign: 'left' }}>
              <label>Snooze Duration</label>
              <select value={snoozeHours} onChange={e => setSnoozeHours(Number(e.target.value))}>
                <option value={1}>1 hour</option>
                <option value={2}>2 hours</option>
                <option value={4}>4 hours</option>
                <option value={8}>8 hours</option>
                <option value={24}>24 hours</option>
                <option value={48}>48 hours</option>
              </select>
            </div>
          )}

          {type === 'resolve' && (
            <div className="aad-field" style={{ textAlign: 'left' }}>
              <label>Resolution Note (optional)</label>
              <textarea
                value={resolutionNote}
                onChange={e => setResolutionNote(e.target.value)}
                placeholder="Describe how this was resolved…"
                rows={3}
              />
            </div>
          )}
        </div>
        <div className="aad-modal-ftr">
          <button className="aad-btn-cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button className={cfg.btnClass} disabled={saving} onClick={handleConfirm}>
            {saving ? 'Saving…' : cfg.btnLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Alert Modal ─────────────────────────────────────────────────────────
function EditAlertModal({ alert, onClose, onSave }) {
  // ─── FIX 4: initialise form fresh from alert prop every open ─────────────
  const [form, setForm] = useState(() => ({
    title:        alert.title || '',
    severity:     alert.severity || 'medium',
    priority:     alert.priority ?? 5,
    status:       alert.status || 'active',
    notify_admin: alert.notify_admin ?? true,
    send_email:   alert.send_email ?? false,
    send_sms:     alert.send_sms ?? false,
    is_recurring: alert.is_recurring ?? false,
  }))
  const [saving, setSaving] = useState(false)
  const [localError, setLocalError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    setLocalError('')
    try {
      await onSave(form)
      // onSave closes modal on success; if it throws we show error below
    } catch (e) {
      const data = e?.response?.data
      setLocalError(typeof data === 'object' ? Object.values(data).flat().join(' ') : 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="aad-modal-bg" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="aad-modal">
        <div className="aad-modal-hdr">
          <span className="aad-modal-title">Edit Alert</span>
          <button className="aad-modal-close" onClick={onClose} disabled={saving}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="aad-modal-body">
          {/* ─── FIX 5: inline error so user sees exactly what failed ───── */}
          {localError && (
            <div style={{background:'#fde8e8',color:'#e74c3c',padding:'10px 14px',borderRadius:10,fontSize:13,marginBottom:14}}>
              {localError}
            </div>
          )}
          <div className="aad-field">
            <label>Alert Title</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Alert title…"/>
          </div>
          <div className="aad-field-row">
            <div className="aad-field">
              <label>Severity</label>
              <select value={form.severity} onChange={e => set('severity', e.target.value)}>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="info">Info</option>
              </select>
            </div>
            <div className="aad-field">
              <label>Priority (1–10)</label>
              <input type="number" min={1} max={10} value={form.priority} onChange={e => set('priority', Number(e.target.value))}/>
            </div>
          </div>
          <div className="aad-field">
            <label>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
              <option value="snoozed">Snoozed</option>
            </select>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 4 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.6px', color: 'var(--pale)', marginBottom: 10 }}>Notification Settings</div>
            {[
              ['notify_admin', 'Notify Admin'],
              ['send_email',   'Send Email Notification'],
              ['send_sms',     'Send SMS Notification'],
              ['is_recurring', 'Mark as Recurring'],
            ].map(([key, label]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0' }}>
                <input type="checkbox" id={`edit_${key}`} checked={!!form[key]} onChange={e => set(key, e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--green)', cursor: 'pointer' }}/>
                <label htmlFor={`edit_${key}`} style={{ fontSize: 13, color: 'var(--ink)', cursor: 'pointer' }}>{label}</label>
              </div>
            ))}
          </div>
        </div>
        <div className="aad-modal-ftr">
          <button className="aad-btn-cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="aad-btn-save" disabled={saving} onClick={handleSave}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}