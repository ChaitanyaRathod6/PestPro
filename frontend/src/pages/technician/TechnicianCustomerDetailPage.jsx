import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
const fmt = (s = '') => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

const STATUS_COLOR = {
  completed:             'green',
  report_sent:           'green',
  in_progress:           'blue',
  observations_recorded: 'blue',
  scheduled:             'amber',
  cancelled:             'red',
}

const SERVICE_EMOJI = {
  rodent_control: '🐀', rodent: '🐀',
  flying_insect: '🦟',
  cockroach: '🪳',
  termite: '🐜',
  mosquito: '🦟',
  general: '🔍',
  bed_bug: '🐞',
  ant: '🐜',
}
const svcEmoji = (t) => SERVICE_EMOJI[t] || '🔧'

/* ─────────────────────────────────────────────
   NAV ITEMS
───────────────────────────────────────────── */
const navItems = [
  { id: 'dashboard',   label: 'Dashboard',   path: '/technician',             d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'jobs',        label: 'My Jobs',      path: '/technician/jobs',        d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'customers',   label: 'Customers',    path: '/technician/customers',   d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'performance', label: 'Performance',  path: '/technician/performance', d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'settings',    label: 'Settings',     path: '/technician/settings',    d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
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
.tc-root{font-family:'DM Serif Display',serif;min-height:100vh;background:var(--bg);display:flex;overflow-x:hidden;}
.tc-sidebar{width:var(--sidebar-w);background:var(--white);border-right:1px solid var(--border);
  display:flex;flex-direction:column;min-height:100vh;
  position:fixed;top:0;left:0;bottom:0;z-index:200;overflow-y:auto;transition:transform .25s ease;}
.tc-sb-logo{padding:16px 20px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border);}
.tc-sb-icon{width:28px;height:28px;background:var(--green);border-radius:6px;display:flex;align-items:center;justify-content:center;}
.tc-sb-icon svg{width:15px;height:15px;fill:white;}
.tc-sb-brand{font-size:16px;color:var(--ink);}
.tc-sb-nav{padding:12px 10px;flex:1;}
.tc-sb-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;
  cursor:pointer;margin-bottom:2px;color:var(--muted);font-size:13.5px;
  transition:background .15s,color .15s;white-space:nowrap;}
.tc-sb-item:hover{background:var(--bg);color:var(--ink);}
.tc-sb-item.active{background:var(--green-light);color:var(--green);}
.tc-sb-item svg{width:16px;height:16px;flex-shrink:0;}
.tc-sb-user{padding:14px 16px;border-top:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-shrink:0;}
.tc-sb-avatar{width:32px;height:32px;background:var(--green);border-radius:50%;
  display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;flex-shrink:0;}
.tc-sb-uname{font-size:13px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.tc-sb-urole{font-size:11px;color:var(--pale);}
.tc-sb-logout{background:none;border:none;cursor:pointer;color:var(--pale);padding:4px;border-radius:6px;
  display:flex;align-items:center;margin-left:auto;transition:color .15s,background .15s;}
.tc-sb-logout:hover{color:var(--red);background:#fde8e8;}
.tc-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:150;}
.tc-overlay.show{display:block;}
.tc-hamburger{display:none;background:none;border:none;cursor:pointer;padding:4px;border-radius:6px;color:var(--ink);}
.tc-hamburger svg{width:20px;height:20px;}
.tc-main{flex:1;margin-left:var(--sidebar-w);display:flex;flex-direction:column;min-height:100vh;}
.tc-topbar{background:var(--white);border-bottom:1px solid var(--border);
  padding:0 24px;height:52px;display:flex;align-items:center;
  justify-content:space-between;position:sticky;top:0;z-index:100;flex-shrink:0;gap:12px;}
.tc-topbar-left{display:flex;align-items:center;gap:10px;}
.tc-back-btn{background:none;border:1.5px solid var(--border);border-radius:9px;
  padding:7px 14px;font-family:'DM Serif Display',serif;font-size:13px;
  cursor:pointer;color:var(--muted);display:flex;align-items:center;gap:6px;transition:background .15s;}
.tc-back-btn:hover{background:var(--bg);color:var(--ink);}
.tc-back-btn svg{width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2;}
.tc-crumb{font-size:13px;color:var(--pale);}
.tc-crumb span{color:var(--ink);}
.tc-crumb-link{color:var(--ink);cursor:pointer;transition:color .15s;}
.tc-crumb-link:hover{color:var(--green);text-decoration:underline;}
.tc-topbar-right{display:flex;align-items:center;gap:10px;}
.tc-ticker{font-size:12px;color:var(--pale);white-space:nowrap;}
.tc-ticker.soon{color:var(--green);}
.tc-refresh-btn{background:var(--bg);color:var(--ink);border:1.5px solid var(--border);
  border-radius:9px;padding:7px 14px;font-family:'DM Serif Display',serif;font-size:13px;
  cursor:pointer;display:flex;align-items:center;gap:6px;transition:background .15s;}
.tc-refresh-btn:hover{background:#e2e8e2;}
.tc-refresh-btn svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2;transition:transform .35s;}
.tc-refresh-btn.spinning svg{animation:tcSpin .55s linear;}
@keyframes tcSpin{to{transform:rotate(360deg);}}
.tc-content{padding:22px 24px;flex:1;}
.tc-detail-grid{display:grid;grid-template-columns:1fr 320px;gap:16px;align-items:start;}
.tc-col-left,.tc-col-right{display:flex;flex-direction:column;gap:14px;}
.tc-dcard{background:var(--white);border-radius:14px;padding:20px;box-shadow:0 2px 10px rgba(0,0,0,.05);}
.tc-dcard-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
.tc-dcard-title{font-size:10.5px;text-transform:uppercase;letter-spacing:.8px;color:var(--pale);
  display:flex;align-items:center;gap:6px;}
.tc-dcard-title svg{width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2;}
.tc-hero{background:linear-gradient(135deg,var(--green-dark),var(--green));
  border-radius:14px;padding:24px;color:#fff;display:flex;align-items:center;gap:18px;flex-wrap:wrap;margin-bottom:16px;}
.tc-hero-avatar{width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,.2);
  display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff;flex-shrink:0;}
.tc-hero-name{font-size:20px;margin-bottom:4px;}
.tc-hero-company{font-size:13px;opacity:.8;margin-bottom:8px;}
.tc-hero-chips{display:flex;gap:8px;flex-wrap:wrap;}
.tc-hero-chip{background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);
  border-radius:20px;padding:4px 12px;font-size:12px;color:#fff;}
.tc-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;}
.tc-info-cell{padding:11px 0;border-bottom:1px solid #f5f7f5;}
.tc-info-cell:nth-last-child(-n+2){border-bottom:none;}
.tc-info-cell.full{grid-column:1/-1;}
.tc-info-label{font-size:10px;color:var(--pale);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;}
.tc-info-value{font-size:14px;color:var(--ink);}
.tc-info-value.muted{color:var(--muted);}
.tc-maps-btn{width:100%;background:#eff6ff;color:var(--blue);border:none;
  border-radius:9px;padding:10px;font-family:'DM Serif Display',serif;font-size:13px;
  cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:background .15s;}
.tc-maps-btn:hover{background:#dbeafe;}
.tc-maps-btn svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;}
.tc-summary-row{display:flex;justify-content:space-between;align-items:center;
  padding:9px 0;border-bottom:1px solid #f5f7f5;}
.tc-summary-row:last-child{border-bottom:none;}
.tc-summary-label{font-size:13px;color:var(--muted);}
.tc-summary-val{font-size:13.5px;color:var(--ink);}
.tc-summary-val.green{color:var(--green);}
.tc-summary-val.amber{color:var(--amber);}
.tc-loading{display:flex;align-items:center;justify-content:center;padding:60px;color:var(--pale);font-size:14px;gap:10px;}
.tc-spinner{width:20px;height:20px;border:2px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:tcSpin .8s linear infinite;}
@keyframes tcSpin2{to{transform:rotate(360deg);}}
.tc-error{background:#fde8e8;color:var(--red);padding:12px 16px;border-radius:10px;font-size:13px;margin-bottom:16px;}
.tcd-timeline{position:relative;padding-left:22px;}
.tcd-timeline::before{content:'';position:absolute;left:7px;top:8px;bottom:8px;
  width:2px;background:var(--border);border-radius:2px;}
.tcd-trow{position:relative;display:flex;align-items:center;gap:12px;
  padding:10px 0;border-bottom:1px solid #f5f7f5;cursor:pointer;}
.tcd-trow:last-child{border-bottom:none;}
.tcd-trow:hover .tcd-jname{color:var(--green);}
.tcd-tdot{position:absolute;left:-18px;width:10px;height:10px;
  border-radius:50%;border:2px solid var(--white);flex-shrink:0;}
.tcd-tdot.green{background:var(--green);}
.tcd-tdot.blue{background:var(--blue);}
.tcd-tdot.amber{background:var(--amber);}
.tcd-tdot.red{background:var(--red);}
.tcd-jav{width:36px;height:36px;border-radius:9px;background:var(--green-light);
  display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;}
.tcd-jinfo{flex:1;min-width:0;}
.tcd-jname{font-size:13.5px;color:var(--ink);transition:color .15s;}
.tcd-jmeta{font-size:11.5px;color:var(--pale);margin-top:2px;}
.tcd-jtag{font-size:11px;padding:2px 9px;border-radius:20px;flex-shrink:0;}
.tcd-jtag.green{background:var(--green-light);color:var(--green);}
.tcd-jtag.blue{background:#eff6ff;color:var(--blue);}
.tcd-jtag.amber{background:#fff8ec;color:var(--amber);}
.tcd-jtag.red{background:#fde8e8;color:var(--red);}
.tcd-ring-wrap{display:flex;align-items:center;gap:14px;margin-bottom:14px;}
.tcd-ring-pct{font-size:20px;color:var(--green);}
.tcd-ring-label{font-size:12px;color:var(--muted);margin-top:4px;}
.tcd-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}
.tcd-chip{background:var(--green-light);color:var(--green);border-radius:20px;padding:4px 11px;font-size:11.5px;}
@media(max-width:900px){.tc-detail-grid{grid-template-columns:1fr;}}
@media(max-width:768px){
  .tc-sidebar{transform:translateX(-100%);}
  .tc-sidebar.open{transform:translateX(0);box-shadow:4px 0 20px rgba(0,0,0,.15);}
  .tc-main{margin-left:0;}
  .tc-hamburger{display:flex;}
  .tc-info-grid{grid-template-columns:1fr;}
}
@media(max-width:600px){
  .tc-content{padding:12px;}
  .tc-topbar{padding:0 12px;}
  .tc-ticker{display:none;}
}
`

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export default function TechnicianCustomerDetailPage() {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()
  const { id }           = useParams()
  const customerId       = parseInt(id)

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [customer,    setCustomer]    = useState(null)   // built from jobs data
  const [jobs,        setJobs]        = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [countdown,   setCountdown]   = useState(30)
  const [spinning,    setSpinning]    = useState(false)

  const isMounted = useRef(true)
  const tickRef   = useRef(null)

  const userName     = displayName(user)
  const userInitials = initials(userName)

  /* ─────────────────────────────────────────
     FIX: Don't call /customers/:id (403).
     Instead fetch /jobs/ — which technicians
     CAN access — and build the customer object
     from the job fields (customer_name, etc.).
  ───────────────────────────────────────── */
  const fetchAll = useCallback(async (silent = false) => {
  if (!silent) setError('')
  try {
    const res = await api.get('/jobs/')
    if (!isMounted.current) return

    const allJobs = res.data?.results || res.data || []

    const myJobs = allJobs
      .filter(j => (j.customer ?? j.customer_id) === customerId)
      .sort((a, b) => new Date(b.scheduled_datetime) - new Date(a.scheduled_datetime))

    if (myJobs.length === 0) {
      setError('No jobs found for this customer, or you do not have access.')
      setLoading(false)
      return
    }

    setJobs(myJobs)

    // ── Fetch real customer data directly ──
    try {
      const custRes = await api.get(`/customers/${customerId}/`)
      if (isMounted.current && custRes.data) {
        setCustomer({
          id:           customerId,
          name:         custRes.data.name || custRes.data.full_name || `Customer #${customerId}`,
          email:        custRes.data.email || '',
          phone:        custRes.data.phone || custRes.data.phone_number || '',
          company_name: custRes.data.company_name || custRes.data.company || '',
          address:      custRes.data.address || myJobs[0]?.site_address || '',
          city:         custRes.data.city || '',
        })
      }
    } catch {
      // ── Fallback: build from job fields if customer API fails ──
      const built = {
        id:           customerId,
        name:         myJobs[0]?.customer_name || `Customer #${customerId}`,
        email:        myJobs[0]?.customer_email || '',
        phone:        myJobs[0]?.customer_phone || '',
        company_name: myJobs[0]?.customer_company || '',
        address:      myJobs[0]?.site_address || '',
        city:         myJobs[0]?.site_city || '',
      }
      myJobs.forEach(j => {
        if (!built.email        && j.customer_email)   built.email        = j.customer_email
        if (!built.phone        && j.customer_phone)   built.phone        = j.customer_phone
        if (!built.company_name && j.customer_company) built.company_name = j.customer_company
      })
      if (isMounted.current) setCustomer(built)
    }

  } catch (e) {
    if (!silent && isMounted.current)
      setError(e.response?.data?.error || 'Failed to load customer details.')
  } finally {
    if (isMounted.current) setLoading(false)
  }
}, [customerId])

  /* ── auto-refresh ── */
  const resetTimer = useCallback(() => {
    clearInterval(tickRef.current)
    setCountdown(30)
    tickRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { fetchAll(true); return 30 }
        return c - 1
      })
    }, 1000)
  }, [fetchAll])

  useEffect(() => {
    isMounted.current = true
    fetchAll().then(resetTimer)
    return () => { isMounted.current = false; clearInterval(tickRef.current) }
  }, [fetchAll, resetTimer])

  const manualRefresh = () => {
    setSpinning(true)
    fetchAll(true).then(() => {
      resetTimer()
      setTimeout(() => setSpinning(false), 550)
    })
  }

  const handleLogout = async () => {
    clearInterval(tickRef.current)
    await logout()
    navigate('/login')
  }

  const handleMaps = () => {
    if (!customer) return
    const addr = `${customer.address || ''} ${customer.city || ''}`.trim()
    if (addr) window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`, '_blank')
  }

  /* ── derived stats ── */
  const completedJobs  = jobs.filter(j => ['completed', 'report_sent'].includes(j.status))
  const activeJobs     = jobs.filter(j => ['in_progress', 'observations_recorded', 'scheduled'].includes(j.status))
  const lastService    = jobs.length > 0 ? jobs[0].scheduled_datetime : null
  const nextScheduled  = activeJobs.find(j => j.status === 'scheduled')

  const pct  = jobs.length > 0 ? Math.round((completedJobs.length / jobs.length) * 100) : 0
  const r    = 26
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  const typeCounts = {}
  jobs.forEach(j => {
    const t = j.service_type || 'general'
    typeCounts[t] = (typeCounts[t] || 0) + 1
  })

  const custInit = customer ? initials(customer.name || customer.company_name || 'C') : 'C'

  return (
    <>
      <style>{S}</style>
      <div className="tc-root">
        <div className={`tc-overlay${sidebarOpen ? ' show' : ''}`} onClick={() => setSidebarOpen(false)}/>

        {/* SIDEBAR */}
        <aside className={`tc-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="tc-sb-logo">
            <div className="tc-sb-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/></svg>
            </div>
            <span className="tc-sb-brand">PestPro</span>
          </div>
          <nav className="tc-sb-nav">
            {navItems.map(n => (
              <div key={n.id}
                className={`tc-sb-item${n.id === 'customers' ? ' active' : ''}`}
                onClick={() => { setSidebarOpen(false); navigate(n.path) }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d={n.d}/>
                </svg>
                {n.label}
              </div>
            ))}
          </nav>
          <div className="tc-sb-user">
            <div className="tc-sb-avatar">{userInitials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="tc-sb-uname">{userName}</div>
              <div className="tc-sb-urole">Technician</div>
            </div>
            <button className="tc-sb-logout" type="button" onClick={handleLogout} title="Logout">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <div className="tc-main">
          <div className="tc-topbar">
            <div className="tc-topbar-left">
              <button className="tc-hamburger" type="button" onClick={() => setSidebarOpen(o => !o)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              </button>
              <button className="tc-back-btn" type="button" onClick={() => navigate('/technician/customers')}>
                <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                Back
              </button>
              <span className="tc-crumb">
                <span className="tc-crumb-link" onClick={() => navigate('/technician/customers')}>Customers</span>
                &nbsp;›&nbsp;
                <span>{customer?.name || `Customer #${customerId}`}</span>
              </span>
            </div>
            <div className="tc-topbar-right">
              <span className={`tc-ticker${countdown <= 10 ? ' soon' : ''}`}>↻ in {countdown}s</span>
              <button className={`tc-refresh-btn${spinning ? ' spinning' : ''}`}
                type="button" onClick={manualRefresh}>
                <svg viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Refresh
              </button>
            </div>
          </div>

          <div className="tc-content">
            {loading ? (
              <div className="tc-loading"><div className="tc-spinner"/>Loading customer details…</div>
            ) : error ? (
              <div className="tc-error">{error}</div>
            ) : !customer ? null : (
              <>
                {/* ── HERO ── */}
                <div className="tc-hero">
                  <div className="tc-hero-avatar">{custInit}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="tc-hero-name">{customer.name}</div>
                    {customer.company_name && (
                      <div className="tc-hero-company">{customer.company_name}</div>
                    )}
                    <div className="tc-hero-chips">
                      <div className="tc-hero-chip">📋 {jobs.length} Job{jobs.length !== 1 ? 's' : ''}</div>
                      <div className="tc-hero-chip">✓ {completedJobs.length} Completed</div>
                      {activeJobs.length > 0 && (
                        <div className="tc-hero-chip">⚡ {activeJobs.length} Active</div>
                      )}
                      {lastService && (
                        <div className="tc-hero-chip">🗓 Last: {fmtDate(lastService)}</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="tc-detail-grid">
                  {/* ── LEFT ── */}
                  <div className="tc-col-left">

                    {/* Contact Info */}
                    <div className="tc-dcard">
                      <div className="tc-dcard-hdr">
                        <div className="tc-dcard-title">
                          <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round"
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                          Contact Information
                        </div>
                      </div>
                      <div className="tc-info-grid">
                        <div className="tc-info-cell">
                          <div className="tc-info-label">Full Name</div>
                          <div className="tc-info-value">{customer.name || '—'}</div>
                        </div>
                        <div className="tc-info-cell">
                          <div className="tc-info-label">Company</div>
                          <div className="tc-info-value muted">{customer.company_name || '—'}</div>
                        </div>
                        <div className="tc-info-cell">
                          <div className="tc-info-label">Phone</div>
                          <div className="tc-info-value">
                            {customer.phone
                              ? <a href={`tel:${customer.phone}`} style={{ color: 'var(--ink)', textDecoration: 'none' }}>{customer.phone}</a>
                              : '—'}
                          </div>
                        </div>
                        <div className="tc-info-cell">
                          <div className="tc-info-label">Email</div>
                          <div className="tc-info-value" style={{ fontSize: 13, wordBreak: 'break-all' }}>
                            {customer.email || '—'}
                          </div>
                        </div>
                        <div className="tc-info-cell full">
                          <div className="tc-info-label">Site Address</div>
                          <div className="tc-info-value">
                            {customer.address || '—'}{customer.city ? `, ${customer.city}` : ''}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Services Performed */}
                    {jobs.length > 0 && (
                      <div className="tc-dcard">
                        <div className="tc-dcard-hdr">
                          <div className="tc-dcard-title">
                            <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round"
                              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                            Services Performed
                          </div>
                        </div>
                        <div className="tcd-ring-wrap">
                          <svg width="68" height="68" viewBox="0 0 68 68">
                            <circle cx="34" cy="34" r={r} fill="none" stroke="var(--border)" strokeWidth="6"/>
                            <circle cx="34" cy="34" r={r} fill="none" stroke="var(--green)" strokeWidth="6"
                              strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                              transform="rotate(-90 34 34)"/>
                            <text x="34" y="39" textAnchor="middle"
                              style={{ fontSize: 13, fill: 'var(--ink)', fontFamily: "'DM Serif Display',serif" }}>
                              {pct}%
                            </text>
                          </svg>
                          <div>
                            <div className="tcd-ring-pct">{completedJobs.length}/{jobs.length}</div>
                            <div className="tcd-ring-label">jobs completed at this site</div>
                          </div>
                        </div>
                        <div className="tcd-chips">
                          {Object.entries(typeCounts).map(([type, count]) => (
                            <span key={type} className="tcd-chip">
                              {svcEmoji(type)} {fmt(type)} × {count}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Job Timeline */}
                    <div className="tc-dcard">
                      <div className="tc-dcard-hdr">
                        <div className="tc-dcard-title">
                          <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round"
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                          Your Job History at This Site
                          <span style={{ background: 'var(--green-light)', color: 'var(--green)', borderRadius: 6, padding: '1px 7px', fontSize: 11 }}>
                            {jobs.length}
                          </span>
                        </div>
                      </div>
                      {jobs.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--pale)', fontSize: 13 }}>
                          No jobs at this site yet.
                        </div>
                      ) : (
                        <div className="tcd-timeline">
                          {jobs.map(job => {
                            const color = STATUS_COLOR[job.status] || 'amber'
                            return (
                              <div key={job.id} className="tcd-trow"
                                onClick={() => navigate(`/technician/jobs/${job.id}`)}>
                                <div className={`tcd-tdot ${color}`}/>
                                <div className="tcd-jav">{svcEmoji(job.service_type)}</div>
                                <div className="tcd-jinfo">
                                  <div className="tcd-jname">Job #{job.id} — {fmt(job.service_type || 'Service')}</div>
                                  <div className="tcd-jmeta">{fmtDateTime(job.scheduled_datetime)}</div>
                                </div>
                                <span className={`tcd-jtag ${color}`}>{fmt(job.status)}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── RIGHT ── */}
                  <div className="tc-col-right">

                    {/* Site Location */}
                    <div className="tc-dcard">
                      <div className="tc-dcard-hdr">
                        <div className="tc-dcard-title">
                          <svg viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round"
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                          </svg>
                          Site Location
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>
                        {customer.address || '—'}{customer.city ? `, ${customer.city}` : ''}
                      </div>
                      <button className="tc-maps-btn" onClick={handleMaps}>
                        <svg viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round"
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                        Open in Google Maps
                      </button>
                    </div>

                    {/* Quick Contact */}
                    {(customer.phone || customer.email) && (
                      <div className="tc-dcard">
                        <div className="tc-dcard-hdr">
                          <div className="tc-dcard-title">
                            <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round"
                              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                            Quick Contact
                          </div>
                        </div>
                        {customer.phone && (
                          <a href={`tel:${customer.phone}`} style={{ textDecoration: 'none' }}>
                            <button style={{
                              width: '100%', background: 'var(--green-light)', color: 'var(--green)',
                              border: 'none', borderRadius: 9, padding: 10,
                              fontFamily: "'DM Serif Display',serif", fontSize: 13, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              gap: 6, marginBottom: 8,
                            }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round"
                                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                              </svg>
                              Call {customer.phone}
                            </button>
                          </a>
                        )}
                        {customer.email && (
                          <a href={`mailto:${customer.email}`} style={{ textDecoration: 'none' }}>
                            <button style={{
                              width: '100%', background: 'var(--bg)', color: 'var(--muted)',
                              border: '1.5px solid var(--border)', borderRadius: 9, padding: 10,
                              fontFamily: "'DM Serif Display',serif", fontSize: 13, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round"
                                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                              </svg>
                              Send Email
                            </button>
                          </a>
                        )}
                      </div>
                    )}

                    {/* My Summary */}
                    <div className="tc-dcard">
                      <div className="tc-dcard-hdr">
                        <div className="tc-dcard-title">
                          <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round"
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                          My Summary
                        </div>
                      </div>
                      {[
                        { label: 'Total Jobs',         val: jobs.length,          color: '' },
                        { label: 'Completed',          val: completedJobs.length, color: 'green' },
                        { label: 'Active / Scheduled', val: activeJobs.length,    color: activeJobs.length > 0 ? 'amber' : '' },
                        { label: 'Completion Rate',    val: jobs.length > 0 ? `${pct}%` : '—', color: 'green' },
                        { label: 'Last Service',       val: lastService ? fmtDate(lastService) : '—', color: '', small: true },
                        { label: 'First Service',      val: jobs.length > 0 ? fmtDate(jobs[jobs.length - 1].scheduled_datetime) : '—', color: '', small: true },
                      ].map(row => (
                        <div key={row.label} className="tc-summary-row">
                          <span className="tc-summary-label">{row.label}</span>
                          <span className={`tc-summary-val ${row.color}`} style={row.small ? { fontSize: 12 } : {}}>
                            {row.val}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Upcoming Visit */}
                    {nextScheduled && (
                      <div className="tc-dcard" style={{
                        background: 'linear-gradient(135deg,#fff8ec,#fffdf5)',
                        border: '1.5px solid var(--amber)',
                      }}>
                        <div className="tc-dcard-hdr">
                          <div className="tc-dcard-title" style={{ color: 'var(--amber)' }}>
                            <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round"
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                            Upcoming Visit
                          </div>
                        </div>
                        <div style={{ fontSize: 14, color: 'var(--ink)', marginBottom: 4 }}>
                          {fmt(nextScheduled.service_type || 'Service')}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                          {fmtDateTime(nextScheduled.scheduled_datetime)}
                        </div>
                        <button onClick={() => navigate(`/technician/jobs/${nextScheduled.id}`)} style={{
                          marginTop: 10, width: '100%', background: 'var(--amber)',
                          color: '#fff', border: 'none', borderRadius: 9, padding: 9,
                          fontFamily: "'DM Serif Display',serif", fontSize: 13, cursor: 'pointer',
                        }}>
                          View Job →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}