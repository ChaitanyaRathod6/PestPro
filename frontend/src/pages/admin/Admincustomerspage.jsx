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

const AUTO_REFRESH_SECS = 30

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
.ac-root{font-family:'DM Serif Display',serif;min-height:100vh;background:var(--bg);display:flex;}

/* ── SIDEBAR ── */
.ac-sidebar{width:var(--sidebar-w);background:var(--white);border-right:1px solid var(--border);
  display:flex;flex-direction:column;min-height:100vh;
  position:fixed;top:0;left:0;bottom:0;z-index:200;overflow-y:auto;
  transition:transform .25s ease;}
.ac-sb-logo{padding:16px 20px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border);}
.ac-sb-icon{width:28px;height:28px;background:var(--green);border-radius:6px;
  display:flex;align-items:center;justify-content:center;}
.ac-sb-icon svg{width:15px;height:15px;fill:white;}
.ac-sb-brand{font-size:16px;color:var(--ink);}
.ac-sb-nav{padding:12px 10px;flex:1;}
.ac-sb-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;
  cursor:pointer;margin-bottom:2px;color:var(--muted);font-size:13.5px;
  transition:background .15s,color .15s;white-space:nowrap;}
.ac-sb-item:hover{background:var(--bg);color:var(--ink);}
.ac-sb-item.active{background:var(--green-light);color:var(--green);}
.ac-sb-item svg{width:16px;height:16px;flex-shrink:0;}
.ac-sb-user{padding:14px 16px;border-top:1px solid var(--border);
  display:flex;align-items:center;gap:10px;flex-shrink:0;}
.ac-sb-avatar{width:32px;height:32px;background:var(--green);border-radius:50%;
  display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;flex-shrink:0;}
.ac-sb-uname{font-size:13px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ac-sb-urole{font-size:11px;color:var(--pale);}
.ac-sb-logout{background:none;border:none;cursor:pointer;color:var(--pale);
  padding:4px;border-radius:6px;display:flex;align-items:center;margin-left:auto;
  transition:color .15s,background .15s;}
.ac-sb-logout:hover{color:var(--red);background:#fde8e8;}

/* ── OVERLAY + HAMBURGER ── */
.ac-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:150;}
.ac-overlay.show{display:block;}
.ac-hamburger{display:none;background:none;border:none;cursor:pointer;padding:4px;border-radius:6px;color:var(--ink);}
.ac-hamburger svg{width:20px;height:20px;}

/* ── MAIN ── */
.ac-main{flex:1;margin-left:var(--sidebar-w);display:flex;flex-direction:column;min-height:100vh;}

/* ── TOPBAR ── */
.ac-topbar{background:var(--white);border-bottom:1px solid var(--border);
  padding:0 24px;height:52px;display:flex;align-items:center;
  justify-content:space-between;position:sticky;top:0;z-index:100;flex-shrink:0;gap:12px;}
.ac-topbar-left{display:flex;align-items:center;gap:10px;}
.ac-crumb{font-size:13px;color:var(--pale);}
.ac-crumb span{color:var(--ink);}
.ac-topbar-right{display:flex;align-items:center;gap:10px;}
.ac-ticker{font-size:12px;color:var(--pale);white-space:nowrap;}
.ac-ticker.soon{color:var(--green);}
.ac-refresh-btn{background:var(--bg);color:var(--ink);border:1.5px solid var(--border);
  border-radius:9px;padding:7px 14px;font-family:'DM Serif Display',serif;font-size:13px;
  cursor:pointer;display:flex;align-items:center;gap:6px;transition:background .15s;}
.ac-refresh-btn:hover{background:#e2e8e2;}
.ac-refresh-btn svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2;transition:transform .35s;}
.ac-refresh-btn.spinning svg{animation:acSpin .55s linear;}
@keyframes acSpin{to{transform:rotate(360deg);}}
.ac-add-btn{background:var(--green);color:#fff;border:none;border-radius:9px;
  padding:7px 16px;font-family:'DM Serif Display',serif;font-size:13px;
  cursor:pointer;display:flex;align-items:center;gap:6px;transition:background .15s;white-space:nowrap;}
.ac-add-btn:hover{background:var(--green-dark);}
.ac-add-btn svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2.5;}

/* ── CONTENT ── */
.ac-content{padding:22px 24px;flex:1;}
.ac-page-title{font-size:22px;color:var(--ink);margin-bottom:3px;}
.ac-page-sub{font-size:13px;color:var(--pale);margin-bottom:20px;font-style:italic;}

/* ── STATS ── */
.ac-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px;}
.ac-stat{background:var(--white);border-radius:14px;padding:16px 18px;box-shadow:0 1px 8px rgba(0,0,0,.05);}
.ac-stat-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--pale);margin-bottom:6px;}
.ac-stat-val{font-size:28px;color:var(--ink);letter-spacing:-1px;line-height:1;}
.ac-stat-val.green{color:var(--green);}
.ac-stat-val.amber{color:var(--amber);}
.ac-stat-val.red{color:var(--red);}
.ac-stat-val.blue{color:var(--blue);}
.ac-stat-sub{font-size:11px;color:var(--muted);margin-top:4px;}

/* ── FILTER TABS ── */
.ac-tabs{display:flex;gap:6px;margin-bottom:18px;flex-wrap:wrap;}
.ac-tab{padding:7px 16px;border-radius:20px;font-family:'DM Serif Display',serif;
  font-size:12.5px;cursor:pointer;border:1.5px solid var(--border);
  background:var(--white);color:var(--muted);transition:all .15s;white-space:nowrap;}
.ac-tab:hover{border-color:var(--green);color:var(--green);}
.ac-tab.active{background:var(--green);color:#fff;border-color:var(--green);}
.ac-tab-count{background:rgba(255,255,255,.25);border-radius:10px;
  padding:1px 6px;font-size:11px;margin-left:5px;}
.ac-tab:not(.active) .ac-tab-count{background:var(--bg);color:var(--muted);}

/* ── CONTROLS ── */
.ac-controls{display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap;}
.ac-search-wrap{flex:1;min-width:200px;position:relative;}
.ac-search-wrap svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);
  width:15px;height:15px;color:var(--pale);pointer-events:none;}
.ac-search{width:100%;border:1.5px solid var(--border);border-radius:10px;
  padding:9px 14px 9px 36px;font-family:'DM Serif Display',serif;font-size:13px;
  color:var(--ink);outline:none;background:var(--white);transition:border-color .2s;}
.ac-search:focus{border-color:var(--green);}
.ac-sort-select{border:1.5px solid var(--border);border-radius:10px;
  padding:9px 14px;font-family:'DM Serif Display',serif;font-size:13px;
  color:var(--ink);outline:none;background:var(--white);cursor:pointer;min-width:180px;}
.ac-sort-select:focus{border-color:var(--green);}

/* ── LIST HEADER ── */
.ac-list-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
.ac-list-title{font-size:15px;color:var(--ink);}
.ac-list-meta{font-size:12px;color:var(--pale);}

/* ── CUSTOMER CARDS ── */
.ac-card{background:var(--white);border-radius:14px;padding:18px 20px;
  margin-bottom:10px;display:flex;align-items:center;gap:16px;
  box-shadow:0 1px 6px rgba(0,0,0,.05);transition:box-shadow .15s,transform .15s;}
.ac-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.1);transform:translateY(-1px);}
.ac-avatar{width:42px;height:42px;border-radius:50%;background:var(--green);
  display:flex;align-items:center;justify-content:center;color:#fff;
  font-size:15px;flex-shrink:0;}
.ac-avatar.inactive{background:#d1d5d1;}
.ac-body{flex:1;min-width:0;}
.ac-name-row{display:flex;align-items:center;gap:8px;margin-bottom:3px;flex-wrap:wrap;}
.ac-name{font-size:15px;color:var(--ink);}
.ac-company{font-size:12px;color:var(--muted);font-style:italic;}
.ac-active-badge{font-size:11px;padding:2px 9px;border-radius:20px;}
.ac-active-badge.active{background:var(--green-light);color:var(--green);}
.ac-active-badge.inactive{background:#f0f2f0;color:var(--muted);}
.ac-details{display:flex;gap:18px;flex-wrap:wrap;margin-top:4px;}
.ac-detail{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--muted);}
.ac-detail svg{width:11px;height:11px;flex-shrink:0;}
.ac-meta-row{display:flex;gap:12px;margin-top:5px;flex-wrap:wrap;}
.ac-meta{font-size:11.5px;color:var(--pale);}
.ac-meta span{color:var(--muted);}
.ac-actions{display:flex;align-items:center;gap:8px;flex-shrink:0;flex-wrap:wrap;}

/* ── ACTION BUTTONS ── */
.ac-btn-edit{background:var(--green-light);color:var(--green);border:none;border-radius:8px;
  padding:7px 14px;font-family:'DM Serif Display',serif;font-size:12.5px;
  cursor:pointer;transition:background .15s;white-space:nowrap;}
.ac-btn-edit:hover{background:#d5eee3;}
.ac-btn-toggle{border:none;border-radius:8px;
  padding:7px 14px;font-family:'DM Serif Display',serif;font-size:12.5px;
  cursor:pointer;transition:background .15s;white-space:nowrap;}
.ac-btn-toggle.deactivate{background:#fde8e8;color:var(--red);}
.ac-btn-toggle.deactivate:hover{background:#f5c6c6;}
.ac-btn-toggle.activate{background:#fff8ec;color:var(--amber);}
.ac-btn-toggle.activate:hover{background:#fde8c0;}

/* ── EMPTY / LOADING / ERROR ── */
.ac-empty{text-align:center;padding:60px 20px;}
.ac-empty-icon{font-size:40px;margin-bottom:12px;}
.ac-empty-title{font-size:18px;color:var(--ink);margin-bottom:6px;}
.ac-empty-sub{font-size:13px;color:var(--pale);}
.ac-loading{display:flex;align-items:center;justify-content:center;padding:60px;color:var(--pale);font-size:14px;gap:10px;}
.ac-spinner{width:20px;height:20px;border:2px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:acSpinner .8s linear infinite;}
@keyframes acSpinner{to{transform:rotate(360deg);}}
.ac-error{background:#fde8e8;color:var(--red);padding:12px 16px;border-radius:10px;font-size:13px;margin-bottom:16px;}

/* ── MODAL ── */
.ac-modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:500;
  display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;}
.ac-modal{background:var(--white);border-radius:16px;width:100%;max-width:520px;
  box-shadow:0 20px 60px rgba(0,0,0,.15);overflow:hidden;}
.ac-modal-hdr{padding:20px 24px 16px;border-bottom:1px solid var(--border);
  display:flex;align-items:center;justify-content:space-between;}
.ac-modal-title{font-size:17px;color:var(--ink);}
.ac-modal-close{background:none;border:none;cursor:pointer;color:var(--pale);
  padding:4px;border-radius:6px;display:flex;align-items:center;transition:color .15s;}
.ac-modal-close:hover{color:var(--ink);}
.ac-modal-body{padding:20px 24px;}
.ac-modal-ftr{padding:16px 24px;border-top:1px solid var(--border);
  display:flex;justify-content:flex-end;gap:10px;}

/* Modal form fields */
.ac-field{margin-bottom:14px;}
.ac-field label{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.6px;
  color:var(--pale);margin-bottom:6px;}
.ac-field input,.ac-field select,.ac-field textarea{
  width:100%;border:1.5px solid var(--border);border-radius:10px;
  padding:10px 14px;font-family:'DM Serif Display',serif;font-size:13.5px;
  color:var(--ink);outline:none;background:var(--white);transition:border-color .2s;}
.ac-field input:focus,.ac-field select:focus,.ac-field textarea:focus{border-color:var(--green);}
.ac-field input.error{border-color:var(--red);}
.ac-field-err{font-size:11.5px;color:var(--red);margin-top:4px;}
.ac-field-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.ac-field-check{display:flex;align-items:center;gap:8px;padding:8px 0;}
.ac-field-check input[type=checkbox]{width:16px;height:16px;accent-color:var(--green);cursor:pointer;}
.ac-field-check label{font-size:13px;color:var(--ink);cursor:pointer;}

/* Modal buttons */
.ac-btn-cancel{background:var(--bg);color:var(--muted);border:1.5px solid var(--border);
  border-radius:9px;padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;}
.ac-btn-cancel:hover{background:#e2e8e2;}
.ac-btn-save{background:var(--green);color:#fff;border:none;border-radius:9px;
  padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;}
.ac-btn-save:hover{background:var(--green-dark);}
.ac-btn-save:disabled{opacity:.5;cursor:not-allowed;}

/* Toggle confirm modal */
.ac-confirm-icon{width:52px;height:52px;border-radius:50%;display:flex;align-items:center;
  justify-content:center;margin:0 auto 14px;}
.ac-confirm-icon.deactivate{background:#fde8e8;}
.ac-confirm-icon.activate{background:#fff8ec;}
.ac-confirm-icon svg{width:24px;height:24px;fill:none;stroke-width:2;}
.ac-confirm-text{text-align:center;font-size:13.5px;color:var(--muted);line-height:1.6;margin-bottom:4px;}
.ac-confirm-name{font-size:16px;color:var(--ink);text-align:center;margin-bottom:8px;}
.ac-btn-deactivate{background:var(--red);color:#fff;border:none;border-radius:9px;
  padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;}
.ac-btn-deactivate:hover{background:#c0392b;}
.ac-btn-activate{background:var(--amber);color:#fff;border:none;border-radius:9px;
  padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;}
.ac-btn-activate:hover{background:#c98b00;}

/* Toast */
.ac-toast{position:fixed;bottom:20px;right:20px;z-index:700;
  display:flex;align-items:center;gap:10px;padding:12px 18px;border-radius:10px;
  font-size:13px;box-shadow:0 4px 20px rgba(0,0,0,.15);animation:acSlideIn .25s ease;}
@keyframes acSlideIn{from{transform:translateY(20px);opacity:0;}to{transform:translateY(0);opacity:1;}}
.ac-toast.success{background:var(--green);color:#fff;}
.ac-toast.error{background:var(--red);color:#fff;}

/* ── RESPONSIVE ── */
@media(max-width:900px){.ac-stats{grid-template-columns:repeat(2,1fr);}}
@media(max-width:768px){
  .ac-sidebar{transform:translateX(-100%);}
  .ac-sidebar.open{transform:translateX(0);}
  .ac-main{margin-left:0;}
  .ac-hamburger{display:flex;}
  .ac-card{flex-wrap:wrap;}
  .ac-actions{width:100%;justify-content:flex-end;}
  .ac-add-btn span{display:none;}
}
@media(max-width:600px){
  .ac-stats{grid-template-columns:1fr 1fr;gap:10px;}
  .ac-content{padding:14px;}
  .ac-topbar{padding:0 14px;}
  .ac-stat-val{font-size:22px;}
  .ac-field-row{grid-template-columns:1fr;}
}
`

/* ─────────────────────────────────────────────
   NAV ITEMS  (admin sidebar — matches AdminJobsPage)
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

const FILTER_TABS = [
  { key: 'all',      label: 'All'      },
  { key: 'active',   label: 'Active'   },
  { key: 'inactive', label: 'Inactive' },
]

/* ─────────────────────────────────────────────
   EMPTY FORM
───────────────────────────────────────────── */
const emptyForm = () => ({
  name: '', email: '', phone: '', company_name: '',
  address: '', city: '',
  email_opt_in: true, notify_on_job_start: true, notify_on_completion: true,
})

/* ─────────────────────────────────────────────
   ADD / EDIT MODAL
───────────────────────────────────────────── */
function CustomerModal({ customer, onClose, onSave }) {
  const isEdit = !!customer
  const [form, setForm]     = useState(isEdit ? {
    name:                 customer.name            || '',
    email:                customer.email           || '',
    phone:                customer.phone           || '',
    company_name:         customer.company_name    || '',
    address:              customer.address         || '',
    city:                 customer.city            || '',
    email_opt_in:         customer.email_opt_in         ?? true,
    notify_on_job_start:  customer.notify_on_job_start  ?? true,
    notify_on_completion: customer.notify_on_completion ?? true,
  } : emptyForm())
  const [errors,  setErrors]  = useState({})
  const [saving,  setSaving]  = useState(false)

  const set = (k, v) => { setForm(f => ({...f, [k]: v})); setErrors(e => ({...e, [k]: ''})) }

  const validate = () => {
    const e = {}
    if (!form.name.trim())  e.name  = 'Name is required.'
    if (!form.email.trim()) e.email = 'Email is required.'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email.'
    if (!form.phone.trim()) e.phone = 'Phone is required.'
    return e
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    await onSave(form, customer?.id)
    setSaving(false)
  }

  return (
    <div className="ac-modal-bg" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ac-modal">
        <div className="ac-modal-hdr">
          <span className="ac-modal-title">{isEdit ? 'Edit Customer' : 'Add New Customer'}</span>
          <button className="ac-modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="ac-modal-body">
          {/* Name + Phone */}
          <div className="ac-field-row">
            <div className="ac-field">
              <label>Full Name *</label>
              <input className={errors.name ? 'error' : ''} placeholder="e.g. Raj Patel"
                value={form.name} onChange={e => set('name', e.target.value)}/>
              {errors.name && <div className="ac-field-err">{errors.name}</div>}
            </div>
            <div className="ac-field">
              <label>Phone *</label>
              <input className={errors.phone ? 'error' : ''} placeholder="e.g. 9876543210"
                value={form.phone} onChange={e => set('phone', e.target.value)}/>
              {errors.phone && <div className="ac-field-err">{errors.phone}</div>}
            </div>
          </div>

          {/* Email */}
          <div className="ac-field">
            <label>Email Address *</label>
            <input type="email" className={errors.email ? 'error' : ''} placeholder="e.g. raj@example.com"
              value={form.email} onChange={e => set('email', e.target.value)}/>
            {errors.email && <div className="ac-field-err">{errors.email}</div>}
          </div>

          {/* Company */}
          <div className="ac-field">
            <label>Company Name</label>
            <input placeholder="e.g. ABC Pest Solutions (optional)"
              value={form.company_name} onChange={e => set('company_name', e.target.value)}/>
          </div>

          {/* Address + City */}
          <div className="ac-field">
            <label>Address</label>
            <input placeholder="e.g. 123 Main Street, Navrangpura"
              value={form.address} onChange={e => set('address', e.target.value)}/>
          </div>
          <div className="ac-field">
            <label>City</label>
            <input placeholder="e.g. Ahmedabad"
              value={form.city} onChange={e => set('city', e.target.value)}/>
          </div>

          {/* Notification preferences */}
          <div style={{borderTop:'1px solid var(--border)',paddingTop:14,marginTop:4}}>
            <div style={{fontSize:11,textTransform:'uppercase',letterSpacing:'.6px',color:'var(--pale)',marginBottom:10}}>
              Notification Preferences
            </div>
            <div className="ac-field-check">
              <input type="checkbox" id="eoi" checked={form.email_opt_in}
                onChange={e => set('email_opt_in', e.target.checked)}/>
              <label htmlFor="eoi">Email Opt-in</label>
            </div>
            <div className="ac-field-check">
              <input type="checkbox" id="njs" checked={form.notify_on_job_start}
                onChange={e => set('notify_on_job_start', e.target.checked)}/>
              <label htmlFor="njs">Notify on Job Start</label>
            </div>
            <div className="ac-field-check">
              <input type="checkbox" id="njc" checked={form.notify_on_completion}
                onChange={e => set('notify_on_completion', e.target.checked)}/>
              <label htmlFor="njc">Notify on Completion</label>
            </div>
          </div>
        </div>

        <div className="ac-modal-ftr">
          <button className="ac-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="ac-btn-save" onClick={handleSave} disabled={saving}>
            {saving ? (isEdit ? 'Saving…' : 'Adding…') : (isEdit ? 'Save Changes' : 'Add Customer')}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   TOGGLE ACTIVE MODAL
───────────────────────────────────────────── */
function ToggleModal({ customer, onClose, onConfirm }) {
  const [saving, setSaving] = useState(false)
  const isActive = customer.is_active

  const handleConfirm = async () => {
    setSaving(true)
    await onConfirm(customer.id, !isActive)
    setSaving(false)
  }

  return (
    <div className="ac-modal-bg" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ac-modal" style={{maxWidth:420}}>
        <div className="ac-modal-hdr">
          <span className="ac-modal-title">{isActive ? 'Deactivate Customer' : 'Activate Customer'}</span>
          <button className="ac-modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="ac-modal-body" style={{paddingTop:24,textAlign:'center'}}>
          <div className={`ac-confirm-icon ${isActive ? 'deactivate' : 'activate'}`}>
            <svg viewBox="0 0 24 24" stroke={isActive ? 'var(--red)' : 'var(--amber)'}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d={isActive
                  ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                  : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"}
              />
            </svg>
          </div>
          <div className="ac-confirm-name">{customer.name}</div>
          <div className="ac-confirm-text">
            {isActive
              ? 'This customer will be marked inactive and will not appear in active job assignments.'
              : 'This customer will be reactivated and will appear in job assignments again.'}
          </div>
        </div>
        <div className="ac-modal-ftr">
          <button className="ac-btn-cancel" onClick={onClose}>Cancel</button>
          {isActive
            ? <button className="ac-btn-deactivate" onClick={handleConfirm} disabled={saving}>{saving ? 'Deactivating…' : 'Deactivate'}</button>
            : <button className="ac-btn-activate"   onClick={handleConfirm} disabled={saving}>{saving ? 'Activating…'   : 'Activate'}</button>
          }
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export default function AdminCustomersPage() {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()

  /* ── UI ── */
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeNav,   setActiveNav]   = useState('customers')

  /* ── API data ── */
  const [customers, setCustomers] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')

  /* ── Filters ── */
  const [activeTab,  setActiveTab]  = useState('all')
  const [search,     setSearch]     = useState('')
  const [sortBy,     setSortBy]     = useState('name_asc')
  const [isSpinning, setIsSpinning] = useState(false)

  /* ── Modals ── */
  const [addModal,    setAddModal]    = useState(false)
  const [editModal,   setEditModal]   = useState(null)   // customer object
  const [toggleModal, setToggleModal] = useState(null)   // customer object

  /* ── Toast ── */
  const [toast, setToast] = useState(null)

  /* ── Auto-refresh ── */
  const [countdown, setCountdown] = useState(AUTO_REFRESH_SECS)
  const tickRef   = useRef(null)
  const isMounted = useRef(true)

  const userName     = displayName(user)
  const userInitials = initials(userName)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  /* ── FETCH customers ── */
  const fetchCustomers = useCallback(async (silent = false) => {
    if (!silent) setError('')
    try {
      /* GET /api/customers/ — returns array directly per your API response */
      const res = await api.get('/customers/')
      if (!isMounted.current) return
      setCustomers(res.data?.results || res.data || [])
    } catch (e) {
      if (!silent && isMounted.current)
        setError(e.response?.data?.error || 'Failed to load customers.')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [])

  /* ── AUTO REFRESH ── */
  const resetTimer = useCallback(() => {
    clearInterval(tickRef.current)
    setCountdown(AUTO_REFRESH_SECS)
    tickRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { fetchCustomers(true); return AUTO_REFRESH_SECS }
        return c - 1
      })
    }, 1000)
  }, [fetchCustomers])

  useEffect(() => {
    isMounted.current = true
    fetchCustomers().then(resetTimer)
    return () => {
      isMounted.current = false
      clearInterval(tickRef.current)
    }
  }, [fetchCustomers, resetTimer])

  /* ── MANUAL REFRESH ── */
  const manualRefresh = () => {
    setIsSpinning(true)
    fetchCustomers(true).then(() => {
      resetTimer()
      setTimeout(() => setIsSpinning(false), 550)
    })
  }

  /* ── ADD CUSTOMER ── POST /api/customers/ ── */
  const handleAdd = async (form) => {
    try {
      const res = await api.post('/customers/', form)
      setCustomers(prev => [res.data, ...prev])
      setAddModal(false)
      showToast('Customer added successfully.')
      resetTimer()
    } catch (e) {
      const data = e.response?.data
      const msg = typeof data === 'object'
        ? Object.values(data).flat().join(' ')
        : 'Failed to add customer.'
      showToast(msg, 'error')
    }
  }

  /* ── EDIT CUSTOMER ── PATCH /api/customers/{id}/ ── */
  const handleEdit = async (form, id) => {
    try {
      const res = await api.patch(`/customers/${id}/`, form)
      setCustomers(prev => prev.map(c => c.id === id ? res.data : c))
      setEditModal(null)
      showToast('Customer updated successfully.')
      resetTimer()
    } catch (e) {
      const data = e.response?.data
      const msg = typeof data === 'object'
        ? Object.values(data).flat().join(' ')
        : 'Failed to update customer.'
      showToast(msg, 'error')
    }
  }

  /* ── TOGGLE ACTIVE ── PATCH /api/customers/{id}/ ── */
  const handleToggle = async (id, newActive) => {
    try {
      const res = await api.patch(`/customers/${id}/`, { is_active: newActive })
      setCustomers(prev => prev.map(c => c.id === id ? res.data : c))
      setToggleModal(null)
      showToast(`Customer ${newActive ? 'activated' : 'deactivated'} successfully.`)
      resetTimer()
    } catch {
      showToast('Failed to update customer status.', 'error')
    }
  }

  /* ── LOGOUT ── */
  const handleLogout = async () => {
    clearInterval(tickRef.current)
    await logout()
    navigate('/login')
  }

  /* ── COMPUTED STATS ── */
  const total    = customers.length
  const active   = customers.filter(c => c.is_active).length
  const inactive = customers.filter(c => !c.is_active).length
  // "New this month" — joined in current calendar month
  const thisMonth = customers.filter(c => {
    if (!c.created_at) return false
    const d = new Date(c.created_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  /* ── TAB COUNT ── */
  const tabCount = (key) => {
    if (key === 'all')      return total
    if (key === 'active')   return active
    if (key === 'inactive') return inactive
    return 0
  }

  /* ── FILTERED + SORTED LIST ── */
  const filtered = customers
    .filter(c => {
      if (activeTab === 'active')   return c.is_active
      if (activeTab === 'inactive') return !c.is_active
      return true
    })
    .filter(c => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        (c.name         || '').toLowerCase().includes(q) ||
        (c.email        || '').toLowerCase().includes(q) ||
        (c.company_name || '').toLowerCase().includes(q) ||
        (c.city         || '').toLowerCase().includes(q) ||
        (c.phone        || '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      if (sortBy === 'name_asc')   return (a.name || '').localeCompare(b.name || '')
      if (sortBy === 'name_desc')  return (b.name || '').localeCompare(a.name || '')
      if (sortBy === 'date_desc')  return new Date(b.created_at) - new Date(a.created_at)
      if (sortBy === 'date_asc')   return new Date(a.created_at) - new Date(b.created_at)
      return 0
    })

  /* ── AVATAR INITIALS for customer card ── */
  const custInitials = (name = '') => {
    const parts = name.trim().split(' ').filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return (parts[0]?.[0] || 'C').toUpperCase()
  }

  /* ══════════════════════════════════════
     RENDER
  ══════════════════════════════════════ */
  return (
    <>
      <style>{S}</style>
      <div className="ac-root">

        {/* Mobile overlay */}
        <div className={`ac-overlay${sidebarOpen ? ' show' : ''}`} onClick={() => setSidebarOpen(false)}/>

        {/* ── SIDEBAR ── */}
        <aside className={`ac-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="ac-sb-logo">
            <div className="ac-sb-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/></svg>
            </div>
            <span className="ac-sb-brand">PestPro</span>
          </div>

          <nav className="ac-sb-nav">
            {navItems.map(n => (
              <div key={n.id}
                className={`ac-sb-item${activeNav === n.id ? ' active' : ''}`}
                onClick={() => { setActiveNav(n.id); setSidebarOpen(false); navigate(n.path) }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d={n.d}/>
                </svg>
                {n.label}
              </div>
            ))}
          </nav>

          <div className="ac-sb-user">
            <div className="ac-sb-avatar">{userInitials}</div>
            <div style={{flex:1,minWidth:0}}>
              <div className="ac-sb-uname">{userName}</div>
              <div className="ac-sb-urole">Administrator</div>
            </div>
            <button className="ac-sb-logout" onClick={handleLogout} title="Logout">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div className="ac-main">

          {/* TOPBAR */}
          <div className="ac-topbar">
            <div className="ac-topbar-left">
              <button className="ac-hamburger" onClick={() => setSidebarOpen(o => !o)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              </button>
              <span className="ac-crumb">Admin &nbsp;›&nbsp; <span>Customers</span></span>
            </div>
            <div className="ac-topbar-right">
              <span className={`ac-ticker${countdown <= 10 ? ' soon' : ''}`}>↻ in {countdown}s</span>
              <button className={`ac-refresh-btn${isSpinning ? ' spinning' : ''}`} onClick={manualRefresh}>
                <svg viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Refresh
              </button>
              <button className="ac-add-btn" onClick={() => setAddModal(true)}>
                <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                <span>Add Customer</span>
              </button>
            </div>
          </div>

          {/* CONTENT */}
          <div className="ac-content">
            <div className="ac-page-title">Customers</div>
            <div className="ac-page-sub">All registered customers · auto-refreshes every {AUTO_REFRESH_SECS}s</div>

            {error && <div className="ac-error">{error}</div>}

            {loading ? (
              <div className="ac-loading"><div className="ac-spinner"/>Loading customers…</div>
            ) : (
              <>
                {/* STATS */}
                <div className="ac-stats">
                  <div className="ac-stat">
                    <div className="ac-stat-label">Total Customers</div>
                    <div className="ac-stat-val">{total}</div>
                    <div className="ac-stat-sub">All time</div>
                  </div>
                  <div className="ac-stat">
                    <div className="ac-stat-label">Active</div>
                    <div className="ac-stat-val green">{active}</div>
                    <div className="ac-stat-sub">
                      {total > 0 ? `${Math.round((active / total) * 100)}% of total` : '0%'}
                    </div>
                  </div>
                  <div className="ac-stat">
                    <div className="ac-stat-label">Inactive</div>
                    <div className="ac-stat-val red">{inactive}</div>
                    <div className="ac-stat-sub">Deactivated</div>
                  </div>
                  <div className="ac-stat">
                    <div className="ac-stat-label">New This Month</div>
                    <div className="ac-stat-val blue">{thisMonth}</div>
                    <div className="ac-stat-sub">Added recently</div>
                  </div>
                </div>

                {/* FILTER TABS */}
                <div className="ac-tabs">
                  {FILTER_TABS.map(tab => (
                    <button key={tab.key}
                      className={`ac-tab${activeTab === tab.key ? ' active' : ''}`}
                      onClick={() => setActiveTab(tab.key)}
                    >
                      {tab.label}
                      <span className="ac-tab-count">{tabCount(tab.key)}</span>
                    </button>
                  ))}
                </div>

                {/* SEARCH + SORT */}
                <div className="ac-controls">
                  <div className="ac-search-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    <input className="ac-search"
                      placeholder="Search by name, email, company, city, phone…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                  <select className="ac-sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                    <option value="name_asc">Name: A → Z</option>
                    <option value="name_desc">Name: Z → A</option>
                    <option value="date_desc">Newest First</option>
                    <option value="date_asc">Oldest First</option>
                  </select>
                </div>

                {/* LIST HEADER */}
                <div className="ac-list-hdr">
                  <span className="ac-list-title">
                    {filtered.length} customer{filtered.length !== 1 ? 's' : ''}
                    {activeTab !== 'all' ? ` · ${activeTab}` : ''}
                    {search ? ` matching "${search}"` : ''}
                  </span>
                  <span className="ac-list-meta">
                    {sortBy === 'name_asc' ? 'A → Z' : sortBy === 'name_desc' ? 'Z → A' : sortBy === 'date_desc' ? 'Newest First' : 'Oldest First'}
                  </span>
                </div>

                {/* CUSTOMER CARDS */}
                {filtered.length === 0 ? (
                  <div className="ac-empty">
                    <div className="ac-empty-icon">👥</div>
                    <div className="ac-empty-title">No customers found</div>
                    <div className="ac-empty-sub">
                      {search
                        ? `No customers match "${search}"`
                        : activeTab !== 'all'
                        ? `No ${activeTab} customers`
                        : 'No customers added yet — click "Add Customer" to get started'}
                    </div>
                  </div>
                ) : (
                  filtered.map(c => (
                    <div key={c.id} className="ac-card">
                      {/* Avatar */}
                      <div className={`ac-avatar${c.is_active ? '' : ' inactive'}`}>
                        {custInitials(c.name)}
                      </div>

                      {/* Body */}
                      <div className="ac-body">
                        <div className="ac-name-row">
                          <span className="ac-name">{c.name}</span>
                          {c.company_name && <span className="ac-company">· {c.company_name}</span>}
                          <span className={`ac-active-badge ${c.is_active ? 'active' : 'inactive'}`}>
                            {c.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        <div className="ac-details">
                          {/* Email */}
                          <span className="ac-detail">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                            </svg>
                            {c.email || '—'}
                          </span>
                          {/* Phone */}
                          <span className="ac-detail">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                            </svg>
                            {c.phone || '—'}
                          </span>
                          {/* City */}
                          {c.city && (
                            <span className="ac-detail">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                              </svg>
                              {c.city}
                            </span>
                          )}
                        </div>

                        {/* Address + join date */}
                        <div className="ac-meta-row">
                          {c.address && <span className="ac-meta">{c.address}</span>}
                          <span className="ac-meta">Joined <span>{fmtDate(c.created_at)}</span></span>
                          {/* Notification flags */}
                          {c.email_opt_in && <span className="ac-meta" style={{color:'var(--green)'}}>✓ Email</span>}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="ac-actions">
                        <button className="ac-btn-edit" onClick={() => setEditModal(c)}>Edit</button>
                        <button
                          className={`ac-btn-toggle ${c.is_active ? 'deactivate' : 'activate'}`}
                          onClick={() => setToggleModal(c)}
                        >
                          {c.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>

        {/* ── MODALS ── */}
        {addModal && (
          <CustomerModal onClose={() => setAddModal(false)} onSave={handleAdd}/>
        )}
        {editModal && (
          <CustomerModal customer={editModal} onClose={() => setEditModal(null)} onSave={handleEdit}/>
        )}
        {toggleModal && (
          <ToggleModal customer={toggleModal} onClose={() => setToggleModal(null)} onConfirm={handleToggle}/>
        )}

        {/* ── TOAST ── */}
        {toast && (
          <div className={`ac-toast ${toast.type}`}>
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