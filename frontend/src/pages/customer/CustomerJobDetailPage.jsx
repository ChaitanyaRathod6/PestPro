import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const fmtDate = (dt) => {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}
const fmtDateTime = (dt) => {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}
const fmt = (s = '') => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

const categoryEmoji = {
  rodent: '🐀', flying_insect: '🦟', cockroach: '🪳',
  termite: '🐛', mosquito: '🦟', general: '🔍'
}

const getObsSummary = (obs) => {
  const r = obs.rodent_detail
  const f = obs.flying_insect_detail
  const c = obs.cockroach_detail
  const t = obs.termite_detail
  const m = obs.mosquito_detail
  const g = obs.general_detail
  if (r) return `${r.location_in_premises} — Activity: ${r.activity_level}`
  if (f) return `${f.machine_location} — ${f.insects_trapped_count} insects found`
  if (c) return `${c.location_in_premises} — Activity: ${c.activity_level}`
  if (t) return `${t.station_location} — ${t.termites_found ? 'Termites detected' : 'Clear'}`
  if (m) return `${m.treatment_area} — Density: ${m.adult_mosquito_density}`
  if (g) return `${g.pest_type_observed} at ${g.location_in_premises}`
  return obs.notes || '—'
}

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */
const S = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

*,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --green: #1a6b3c;
  --green-dark: #1a4d2e;
  --green-light: #edf6f1;
  --green-mid: #d4ead9;
  --ink: #1a2e1a;
  --muted: #7a8c7a;
  --pale: #a0b0a0;
  --border: #e8ebe8;
  --bg: #f0f2f0;
  --white: #fff;
  --red: #e74c3c;
  --amber: #e6a817;
  --blue: #3b82f6;
  --sidebar-w: 220px;
}

body { font-family: 'DM Sans', sans-serif; }

.cjd-root {
  font-family: 'DM Sans', sans-serif;
  min-height: 100vh;
  background: var(--bg);
  display: flex;
}

/* ── SIDEBAR ── */
.cjd-sidebar {
  width: var(--sidebar-w);
  background: var(--white);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  position: fixed;
  top: 0; left: 0; bottom: 0;
  z-index: 200;
  overflow-y: auto;
}
.cjd-sb-logo {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--border);
}
.cjd-sb-icon {
  width: 28px; height: 28px;
  background: var(--green);
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
}
.cjd-sb-icon svg { width: 15px; height: 15px; fill: white; }
.cjd-sb-brand {
  font-family: 'DM Serif Display', serif;
  font-size: 16px; color: var(--ink);
}
.cjd-sb-nav { padding: 12px 10px; flex: 1; }
.cjd-sb-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; border-radius: 10px;
  cursor: pointer; margin-bottom: 2px;
  color: var(--muted);
  font-size: 13.5px;
  font-family: 'DM Serif Display', serif;
  transition: background .15s, color .15s;
  white-space: nowrap;
  text-decoration: none;
}
.cjd-sb-item:hover { background: var(--bg); color: var(--ink); }
.cjd-sb-item.active { background: var(--green-light); color: var(--green); }
.cjd-sb-item svg { width: 16px; height: 16px; flex-shrink: 0; }
.cjd-sb-user {
  padding: 14px 16px;
  border-top: 1px solid var(--border);
  display: flex; align-items: center; gap: 10px;
}
.cjd-sb-avatar {
  width: 32px; height: 32px;
  background: var(--green); border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 12px; flex-shrink: 0;
  font-family: 'DM Serif Display', serif;
}
.cjd-sb-uname { font-size: 13px; color: var(--ink); font-family: 'DM Serif Display', serif; }
.cjd-sb-urole { font-size: 11px; color: var(--pale); }
.cjd-sb-logout {
  background: none; border: none; cursor: pointer;
  color: var(--pale); padding: 4px; border-radius: 6px;
  display: flex; align-items: center; margin-left: auto;
  transition: color .15s, background .15s;
}
.cjd-sb-logout:hover { color: var(--red); background: #fde8e8; }

/* ── MAIN ── */
.cjd-main {
  flex: 1;
  margin-left: var(--sidebar-w);
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* ── TOPBAR ── */
.cjd-topbar {
  background: var(--white);
  border-bottom: 1px solid var(--border);
  padding: 0 24px; height: 52px;
  display: flex; align-items: center; justify-content: space-between;
  position: sticky; top: 0; z-index: 100; flex-shrink: 0;
}
.cjd-back-btn {
  background: none; border: 1.5px solid var(--border);
  border-radius: 9px; padding: 7px 14px;
  font-family: 'DM Serif Display', serif; font-size: 13px;
  cursor: pointer; color: var(--ink);
  display: flex; align-items: center; gap: 6px;
  transition: background .15s;
}
.cjd-back-btn:hover { background: var(--bg); }
.cjd-crumb { font-size: 13px; color: var(--pale); font-family: 'DM Serif Display', serif; }
.cjd-crumb span { color: var(--ink); }

/* ── STATUS BANNER ── */
.cjd-banner {
  margin: 20px 24px 0;
  border-radius: 16px;
  padding: 22px 28px;
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 16px;
  background: linear-gradient(135deg, var(--green-dark) 0%, var(--green) 100%);
  color: #fff;
  position: relative;
  overflow: hidden;
}
.cjd-banner::after {
  content: '';
  position: absolute;
  right: -30px; top: -30px;
  width: 160px; height: 160px;
  border-radius: 50%;
  background: rgba(255,255,255,0.05);
}
.cjd-banner-meta {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .8px;
  opacity: .7;
  margin-bottom: 4px;
  font-family: 'DM Serif Display', serif;
}
.cjd-banner-title {
  font-family: 'DM Serif Display', serif;
  font-size: 22px;
  margin-bottom: 8px;
}
.cjd-status-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 12px; border-radius: 20px;
  font-size: 12px; font-weight: 600;
  font-family: 'DM Serif Display', serif;
}
.cjd-status-chip.scheduled { background: #fff8ec; color: var(--amber); }
.cjd-status-chip.in_progress { background: rgba(255,255,255,0.2); color: #fff; border: 1px solid rgba(255,255,255,0.3); }
.cjd-status-chip.observations_recorded { background: #eff6ff; color: var(--blue); }
.cjd-status-chip.completed,
.cjd-status-chip.report_sent { background: rgba(255,255,255,0.15); color: #fff; }
.cjd-banner-right { text-align: right; }
.cjd-banner-date { font-size: 13px; opacity: .8; font-family: 'DM Serif Display', serif; }
.cjd-banner-date strong { font-size: 16px; display: block; opacity: 1; margin-bottom: 2px; }

/* ── CONTENT ── */
.cjd-content {
  padding: 16px 24px 32px;
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 16px;
  align-items: start;
}
.cjd-col { display: flex; flex-direction: column; gap: 14px; }

/* ── CARDS ── */
.cjd-card {
  background: var(--white);
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,.05);
}
.cjd-card-hdr {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px;
}
.cjd-card-title {
  font-family: 'DM Serif Display', serif;
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: .8px;
  color: var(--pale);
  display: flex; align-items: center; gap: 6px;
}
.cjd-card-title svg { width: 13px; height: 13px; }

/* ── INFO GRID ── */
.cjd-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
}
.cjd-info-cell {
  padding: 11px 0;
  border-bottom: 1px solid #f5f7f5;
}
.cjd-info-cell:nth-last-child(-n+2) { border-bottom: none; }
.cjd-info-cell.full { grid-column: 1 / -1; }
.cjd-info-label {
  font-size: 10px; color: var(--pale);
  text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px;
}
.cjd-info-value {
  font-size: 14px; color: var(--ink);
  font-family: 'DM Serif Display', serif;
}
.cjd-info-value.muted { color: var(--muted); font-family: 'DM Sans', sans-serif; }

/* ── TIMELINE ── */
.cjd-timeline { display: flex; flex-direction: column; }
.cjd-tl-item {
  display: flex; gap: 14px; align-items: flex-start;
  padding: 12px 0;
  border-bottom: 1px solid #f5f7f5;
}
.cjd-tl-item:last-child { border-bottom: none; }
.cjd-tl-left {
  display: flex; flex-direction: column; align-items: center; gap: 0;
  flex-shrink: 0;
}
.cjd-tl-dot {
  width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0;
}
.cjd-tl-dot.done { background: var(--green); }
.cjd-tl-dot.active { background: var(--amber); }
.cjd-tl-dot.pending { background: #d1d5d1; }
.cjd-tl-label {
  font-size: 12px; color: var(--muted);
  font-family: 'DM Serif Display', serif;
  margin-bottom: 2px;
}
.cjd-tl-time {
  font-size: 13px; color: var(--ink);
  font-family: 'DM Serif Display', serif;
}
.cjd-tl-pending {
  font-size: 13px; color: var(--pale); font-style: italic;
  font-family: 'DM Sans', sans-serif;
}

/* ── OBSERVATIONS ── */
.cjd-obs-item {
  border: 1px solid var(--border);
  border-radius: 12px; padding: 14px;
  margin-bottom: 10px;
}
.cjd-obs-item:last-child { margin-bottom: 0; }
.cjd-obs-top { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.cjd-obs-icon {
  width: 38px; height: 38px; border-radius: 10px;
  background: var(--green-light);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; flex-shrink: 0;
}
.cjd-obs-cat {
  font-family: 'DM Serif Display', serif;
  font-size: 14px; color: var(--ink); margin-bottom: 2px;
}
.cjd-obs-time { font-size: 11px; color: var(--pale); }
.cjd-obs-summary {
  font-size: 13px; color: var(--muted);
  line-height: 1.5; margin-bottom: 8px;
  padding-top: 8px; border-top: 1px solid #f5f7f5;
  font-family: 'DM Sans', sans-serif;
}
.cjd-obs-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.cjd-obs-tag {
  font-size: 11px; padding: 3px 9px; border-radius: 6px;
  background: var(--bg); color: var(--muted);
  font-family: 'DM Sans', sans-serif;
}
.cjd-obs-tag.yes { background: var(--green-light); color: var(--green); }
.cjd-obs-tag.warn { background: #fff8ec; color: var(--amber); }
.cjd-obs-empty {
  text-align: center; padding: 24px 0;
  color: var(--pale); font-size: 13px;
  font-family: 'DM Serif Display', serif;
}

/* ── REPORT CARD ── */
.cjd-report-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 0; border-bottom: 1px solid #f5f7f5;
}
.cjd-report-item:last-child { border-bottom: none; }
.cjd-report-left { display: flex; align-items: center; gap: 10px; }
.cjd-report-icon {
  width: 36px; height: 36px; border-radius: 9px;
  background: #fde8e8; color: var(--red);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.cjd-report-icon svg { width: 16px; height: 16px; }
.cjd-report-name {
  font-size: 13.5px; color: var(--ink);
  font-family: 'DM Serif Display', serif;
  margin-bottom: 2px;
}
.cjd-report-date { font-size: 11px; color: var(--pale); }
.cjd-dl-btn {
  background: var(--green); color: #fff; border: none;
  border-radius: 8px; padding: 8px 14px;
  font-family: 'DM Serif Display', serif; font-size: 12px;
  cursor: pointer; display: flex; align-items: center; gap: 5px;
  transition: background .15s;
  text-decoration: none;
}
.cjd-dl-btn:hover { background: var(--green-dark); }
.cjd-dl-btn svg { width: 12px; height: 12px; }
.cjd-no-report {
  text-align: center; padding: 20px 0;
  color: var(--pale); font-size: 13px;
  font-family: 'DM Serif Display', serif;
}
.cjd-no-report-icon { font-size: 28px; margin-bottom: 6px; }

/* ── TECHNICIAN CARD ── */
.cjd-tech-row {
  display: flex; align-items: center; gap: 12px;
}
.cjd-tech-av {
  width: 44px; height: 44px; border-radius: 50%;
  background: var(--green);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 16px; flex-shrink: 0;
  font-family: 'DM Serif Display', serif;
}
.cjd-tech-name {
  font-family: 'DM Serif Display', serif;
  font-size: 15px; color: var(--ink);
}
.cjd-tech-role { font-size: 12px; color: var(--pale); margin-top: 2px; }

/* ── SUMMARY ROW ── */
.cjd-sum-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 9px 0; border-bottom: 1px solid #f5f7f5;
}
.cjd-sum-row:last-child { border-bottom: none; }
.cjd-sum-label { font-size: 13px; color: var(--muted); font-family: 'DM Sans', sans-serif; }
.cjd-sum-val { font-size: 13.5px; color: var(--ink); font-family: 'DM Serif Display', serif; }
.cjd-sum-val.green { color: var(--green); }
.cjd-sum-val.amber { color: var(--amber); }
.cjd-sum-val.red { color: var(--red); }

/* ── MAPS BTN ── */
.cjd-maps-btn {
  width: 100%; background: #eff6ff; color: var(--blue); border: none;
  border-radius: 9px; padding: 10px;
  font-family: 'DM Serif Display', serif; font-size: 13px;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  gap: 6px; transition: background .15s; margin-top: 12px;
}
.cjd-maps-btn:hover { background: #dbeafe; }

/* ── LOADING / ERROR ── */
.cjd-loading {
  display: flex; align-items: center; justify-content: center;
  padding: 80px; color: var(--pale); font-size: 14px; gap: 10px;
  font-family: 'DM Serif Display', serif;
}
.cjd-spinner {
  width: 20px; height: 20px;
  border: 2px solid var(--border); border-top-color: var(--green);
  border-radius: 50%; animation: cjdSpin .8s linear infinite;
}
@keyframes cjdSpin { to { transform: rotate(360deg); } }

/* ── TOAST ── */
.cjd-toast {
  position: fixed; bottom: 20px; right: 20px; z-index: 600;
  display: flex; align-items: center; gap: 10px;
  padding: 12px 18px; border-radius: 10px;
  font-size: 13px; box-shadow: 0 4px 20px rgba(0,0,0,.15);
  animation: cjdSlide .25s ease;
  font-family: 'DM Serif Display', serif;
}
@keyframes cjdSlide { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.cjd-toast.success { background: var(--green); color: #fff; }
.cjd-toast.error { background: var(--red); color: #fff; }

/* ── SUPPORT BOX ── */
.cjd-support-box {
  background: var(--green-light);
  border: 1px solid var(--green-mid);
  border-radius: 12px; padding: 16px;
  text-align: center;
}
.cjd-support-title {
  font-family: 'DM Serif Display', serif;
  font-size: 14px; color: var(--green); margin-bottom: 4px;
}
.cjd-support-text { font-size: 12px; color: var(--muted); margin-bottom: 12px; }
.cjd-support-btn {
  background: var(--green); color: #fff; border: none;
  border-radius: 8px; padding: 9px 18px;
  font-family: 'DM Serif Display', serif; font-size: 13px;
  cursor: pointer; transition: background .15s;
}
.cjd-support-btn:hover { background: var(--green-dark); }

@media (max-width: 900px) {
  .cjd-content { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .cjd-main { margin-left: 0; }
  .cjd-sidebar { display: none; }
  .cjd-content { padding: 12px 16px 24px; }
}
`

/* ─────────────────────────────────────────────
   NAV ITEMS
───────────────────────────────────────────── */
const navItems = [
  { id: 'dashboard', label: 'Dashboard', path: '/customer', d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'jobs',      label: 'My Jobs',   path: '/customer/jobs', d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'reports',   label: 'My Reports',path: '/customer/reports', d: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'profile',   label: 'My Profile', path: '/customer/profile', d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { id: 'support',   label: 'Support',    path: '/customer/support', d: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z' },
]

/* ═══════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════ */
export default function CustomerJobDetail() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const isMounted = useRef(true)

  const [job,          setJob]          = useState(null)
  const [observations, setObservations] = useState([])
  const [reports,      setReports]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [toast,        setToast]        = useState(null)

  // Get customer from localStorage
  // At the top of the component, for display/render use
const customer     = JSON.parse(localStorage.getItem('customer') || '{}')
const customerName = customer.name || customer.full_name || 'Customer'
const customerId   = customer.id
const accessToken  = localStorage.getItem('access_token') || ''  // ← add this back
  

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchData = useCallback(async () => {
    const accessToken = localStorage.getItem('access_token') || ''
  const customer    = JSON.parse(localStorage.getItem('customer') || '{}')
  const customerId  = customer.id

  if (!accessToken || !customerId) {
    setError('Session expired. Please log in again.')
    setLoading(false)
    return
  }
    try {
      const headers = { Authorization: `Bearer ${accessToken}` }

      const [jobRes, obsRes, reportRes] = await Promise.all([
        fetch(`/api/jobs/customer/${customerId}/`, { headers })
          .then(r => r.json()),
        fetch(`/api/jobs/${id}/observations/`, { headers })
          .then(r => r.json()).catch(() => []),
        fetch(`/api/reports/customer/?customer_id=${customerId}`, { headers })
          .then(r => r.json()).catch(() => ({ results: [] })),
      ])

      if (!isMounted.current) return

      // jobRes is a list — find the one matching our id
      const jobs = Array.isArray(jobRes) ? jobRes : (jobRes.results || [])
      const found = jobs.find(j => String(j.id) === String(id))
      if (!found) { setError('Job not found.'); setLoading(false); return }

      setJob(found)
      setObservations(obsRes?.results || obsRes || [])

      // Filter reports for this job
      const allReports = reportRes?.results || []
      setReports(allReports.filter(r => String(r.job) === String(id) || String(r.job_id) === String(id)))
    } catch (e) {
      if (isMounted.current) setError('Failed to load job details.')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [id, customerId, accessToken])

  useEffect(() => {
  const token      = localStorage.getItem('access_token')
  const customer   = JSON.parse(localStorage.getItem('customer') || '{}')

  if (!token || !customer.id) {
    navigate('/customer/login')
    return
  }

  isMounted.current = true
  fetchData()
  return () => { isMounted.current = false }
}, [fetchData, navigate])

  const handleLogout = () => {
  localStorage.removeItem('customer')
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')  // if you have one
  navigate('/customer/login')
}

  const handleNavigate = () => {
    const addr = job?.site_address || job?.address || ''
    if (!addr) { showToast('No address available.', 'error'); return }
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`, '_blank')
  }

  const techName = job?.technician_name || 'Your Technician'
  const techInitial = techName[0]?.toUpperCase() || 'T'

  /* ────── STATUS HELPERS ────── */
  const statusLabel = {
    scheduled: '📅 Scheduled',
    in_progress: '🔧 In Progress',
    observations_recorded: '📋 Observations Recorded',
    completed: '✅ Completed',
    report_sent: '📄 Report Sent',
  }

  /* ════════════════════════════════════════
     RENDER
  ════════════════════════════════════════ */
  return (
    <>
      <style>{S}</style>
      <div className="cjd-root">

        {/* SIDEBAR */}
        <aside className="cjd-sidebar">
          <div className="cjd-sb-logo">
            <div className="cjd-sb-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/></svg>
            </div>
            <span className="cjd-sb-brand">PestPro</span>
          </div>

          <nav className="cjd-sb-nav">
            {navItems.map(n => (
              <Link
                key={n.id}
                to={n.path}
                className={`cjd-sb-item${n.id === 'jobs' ? ' active' : ''}`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d={n.d}/>
                </svg>
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="cjd-sb-user">
            <div className="cjd-sb-avatar">{customerName[0]?.toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="cjd-sb-uname" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {customerName}
              </div>
              <div className="cjd-sb-urole">Customer</div>
            </div>
            <button className="cjd-sb-logout" onClick={handleLogout} title="Logout">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <div className="cjd-main">

          {/* TOPBAR */}
          <div className="cjd-topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button className="cjd-back-btn" onClick={() => navigate('/customer/jobs')}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
                </svg>
                Back
              </button>
              <span className="cjd-crumb">My Jobs &nbsp;›&nbsp; <span>Job #{id}</span></span>
            </div>
          </div>

          {loading ? (
            <div className="cjd-loading"><div className="cjd-spinner"/>Loading job details…</div>
          ) : error ? (
            <div style={{ padding: 24 }}>
              <div style={{ background: '#fde8e8', color: '#e74c3c', padding: 14, borderRadius: 10, fontSize: 13 }}>{error}</div>
            </div>
          ) : !job ? null : (
            <>
              {/* BANNER */}
              <div className="cjd-banner">
                <div>
                  <div className="cjd-banner-meta">Job #{job.id}</div>
                  <div className="cjd-banner-title">{fmt(job.service_type || 'Service Job')}</div>
                  <span className={`cjd-status-chip ${job.status}`}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }}/>
                    {statusLabel[job.status] || fmt(job.status)}
                  </span>
                </div>
                <div className="cjd-banner-right">
                  <div className="cjd-banner-date">
                    <strong>{fmtDate(job.scheduled_datetime)}</strong>
                    {job.scheduled_datetime &&
                      new Date(job.scheduled_datetime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                    }
                  </div>
                </div>
              </div>

              {/* CONTENT GRID */}
              <div className="cjd-content">

                {/* ── LEFT ── */}
                <div className="cjd-col">

                  {/* Service Details */}
                  <div className="cjd-card">
                    <div className="cjd-card-hdr">
                      <div className="cjd-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                        </svg>
                        Service Details
                      </div>
                    </div>
                    <div className="cjd-info-grid">
                      <div className="cjd-info-cell">
                        <div className="cjd-info-label">Service Type</div>
                        <div className="cjd-info-value">{fmt(job.service_type || '—')}</div>
                      </div>
                      <div className="cjd-info-cell">
                        <div className="cjd-info-label">Status</div>
                        <div className="cjd-info-value">{fmt(job.status)}</div>
                      </div>
                      <div className="cjd-info-cell">
                        <div className="cjd-info-label">Scheduled Date</div>
                        <div className="cjd-info-value muted">{fmtDate(job.scheduled_datetime)}</div>
                      </div>
                      <div className="cjd-info-cell">
                        <div className="cjd-info-label">Scheduled Time</div>
                        <div className="cjd-info-value muted">
                          {job.scheduled_datetime
                            ? new Date(job.scheduled_datetime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </div>
                      </div>
                      <div className="cjd-info-cell full">
                        <div className="cjd-info-label">Service Address</div>
                        <div className="cjd-info-value">{job.site_address || '—'}</div>
                      </div>
                    </div>
                    <button className="cjd-maps-btn" onClick={handleNavigate}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                      View on Google Maps
                    </button>
                  </div>

                  {/* Service Timeline */}
                  <div className="cjd-card">
                    <div className="cjd-card-hdr">
                      <div className="cjd-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Service Timeline
                      </div>
                    </div>
                    <div className="cjd-timeline">
                      <div className="cjd-tl-item">
                        <div className="cjd-tl-dot done" style={{ marginTop: 3 }}/>
                        <div>
                          <div className="cjd-tl-label">Scheduled</div>
                          <div className="cjd-tl-time">{fmtDateTime(job.scheduled_datetime)}</div>
                        </div>
                      </div>
                      <div className="cjd-tl-item">
                        <div className={`cjd-tl-dot ${job.started_at ? 'done' : 'pending'}`} style={{ marginTop: 3 }}/>
                        <div>
                          <div className="cjd-tl-label">Technician Arrived</div>
                          {job.started_at
                            ? <div className="cjd-tl-time">{fmtDateTime(job.started_at)}</div>
                            : <div className="cjd-tl-pending">Not yet started</div>
                          }
                        </div>
                      </div>
                      <div className="cjd-tl-item">
                        <div className={`cjd-tl-dot ${job.completed_at ? 'done' : 'pending'}`} style={{ marginTop: 3 }}/>
                        <div>
                          <div className="cjd-tl-label">Service Completed</div>
                          {job.completed_at
                            ? <div className="cjd-tl-time">{fmtDateTime(job.completed_at)}</div>
                            : <div className="cjd-tl-pending">Pending</div>
                          }
                        </div>
                      </div>
                      <div className="cjd-tl-item">
                        <div className={`cjd-tl-dot ${reports.length > 0 ? 'done' : 'pending'}`} style={{ marginTop: 3 }}/>
                        <div>
                          <div className="cjd-tl-label">Report Available</div>
                          {reports.length > 0
                            ? <div className="cjd-tl-time">Report ready to download</div>
                            : <div className="cjd-tl-pending">Generated after completion</div>
                          }
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Treatment Observations */}
                  <div className="cjd-card">
                    <div className="cjd-card-hdr">
                      <div className="cjd-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                        Treatment Observations
                        {observations.length > 0 && (
                          <span style={{ background: 'var(--green-light)', color: 'var(--green)', borderRadius: 6, padding: '1px 7px', fontSize: 11, marginLeft: 4 }}>
                            {observations.length}
                          </span>
                        )}
                      </div>
                    </div>

                    {observations.length === 0 ? (
                      <div className="cjd-obs-empty">
                        No observations recorded yet.
                        {job.status === 'scheduled' && <div style={{ marginTop: 4, fontSize: 12 }}>They'll appear once the technician starts the service.</div>}
                      </div>
                    ) : (
                      observations.map(obs => {
                        const r = obs.rodent_detail
                        const f = obs.flying_insect_detail
                        const c = obs.cockroach_detail
                        const t = obs.termite_detail
                        const m = obs.mosquito_detail
                        const g = obs.general_detail
                        return (
                          <div key={obs.id} className="cjd-obs-item">
                            <div className="cjd-obs-top">
                              <div className="cjd-obs-icon">{categoryEmoji[obs.observation_category] || '🔍'}</div>
                              <div>
                                <div className="cjd-obs-cat">{fmt(obs.observation_category)} Treatment</div>
                                <div className="cjd-obs-time">
                                  {new Date(obs.observation_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>
                            <div className="cjd-obs-summary">{getObsSummary(obs)}</div>
                            <div className="cjd-obs-tags">
                              {r?.bait_replaced && <span className="cjd-obs-tag yes">Bait replaced</span>}
                              {r?.activity_level && <span className="cjd-obs-tag">{r.activity_level} activity</span>}
                              {f?.glue_board_changed && <span className="cjd-obs-tag yes">Board changed</span>}
                              {c?.gel_applied && <span className="cjd-obs-tag yes">Gel applied</span>}
                              {t?.termites_found && <span className="cjd-obs-tag warn">Termites found</span>}
                              {t?.bait_replaced && <span className="cjd-obs-tag yes">Bait replaced</span>}
                              {m?.fogging_done && <span className="cjd-obs-tag yes">Fogging done</span>}
                              {g?.treatment_applied && <span className="cjd-obs-tag yes">Treatment applied</span>}
                              {obs.notes && <span className="cjd-obs-tag">{obs.notes}</span>}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  {/* Reports */}
                  <div className="cjd-card">
                    <div className="cjd-card-hdr">
                      <div className="cjd-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                        </svg>
                        Service Reports
                      </div>
                    </div>

                    {reports.length === 0 ? (
                      <div className="cjd-no-report">
                        <div className="cjd-no-report-icon">📄</div>
                        {job.status === 'completed' || job.status === 'report_sent'
                          ? 'Report is being generated. Check back soon.'
                          : 'Report will be available after service completion.'}
                      </div>
                    ) : (
                      reports.map(r => (
                        <div key={r.id} className="cjd-report-item">
                          <div className="cjd-report-left">
                            <div className="cjd-report-icon">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                              </svg>
                            </div>
                            <div>
                              <div className="cjd-report-name">Service Report</div>
                              <div className="cjd-report-date">{fmtDate(r.generated_at)}</div>
                            </div>
                          </div>
                          {r.pdf_url && (
                            <a href={r.pdf_url} target="_blank" rel="noreferrer" className="cjd-dl-btn">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                              </svg>
                              Download
                            </a>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* ── RIGHT ── */}
                <div className="cjd-col">

                  {/* Technician */}
                  <div className="cjd-card">
                    <div className="cjd-card-hdr">
                      <div className="cjd-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                        </svg>
                        Your Technician
                      </div>
                    </div>
                    <div className="cjd-tech-row">
                      <div className="cjd-tech-av">{techInitial}</div>
                      <div>
                        <div className="cjd-tech-name">{techName}</div>
                        <div className="cjd-tech-role">Certified Pest Control Technician</div>
                      </div>
                    </div>
                  </div>

                  {/* Service Summary */}
                  <div className="cjd-card">
                    <div className="cjd-card-hdr">
                      <div className="cjd-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                        </svg>
                        Service Summary
                      </div>
                    </div>
                    <div className="cjd-sum-row">
                      <span className="cjd-sum-label">Observations</span>
                      <span className={`cjd-sum-val${observations.length > 0 ? ' green' : ''}`}>{observations.length}</span>
                    </div>
                    <div className="cjd-sum-row">
                      <span className="cjd-sum-label">Reports</span>
                      <span className={`cjd-sum-val${reports.length > 0 ? ' green' : ''}`}>{reports.length}</span>
                    </div>
                    <div className="cjd-sum-row">
                      <span className="cjd-sum-label">Started</span>
                      <span className={`cjd-sum-val${job.started_at ? ' green' : ''}`}>
                        {job.started_at ? '✓ Yes' : '—'}
                      </span>
                    </div>
                    <div className="cjd-sum-row">
                      <span className="cjd-sum-label">Completed</span>
                      <span className={`cjd-sum-val${job.completed_at ? ' green' : ' amber'}`}>
                        {job.completed_at ? '✓ Done' : 'Pending'}
                      </span>
                    </div>
                    <div className="cjd-sum-row">
                      <span className="cjd-sum-label">Report</span>
                      <span className={`cjd-sum-val${reports.length > 0 ? ' green' : ' amber'}`}>
                        {reports.length > 0 ? '✓ Ready' : 'Pending'}
                      </span>
                    </div>
                  </div>

                  {/* Support */}
                  <div className="cjd-support-box">
                    <div className="cjd-support-title">Need Help?</div>
                    <div className="cjd-support-text">
                      Have a question about this service? Our support team is here for you.
                    </div>
                    <button className="cjd-support-btn" onClick={() => navigate('/customer/support')}>
                      Contact Support
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* TOAST */}
        {toast && (
          <div className={`cjd-toast ${toast.type}`}>
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