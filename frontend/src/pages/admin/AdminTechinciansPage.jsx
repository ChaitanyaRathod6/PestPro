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

const techName = (t) =>
  t.name ||
  (t.first_name && t.last_name ? `${t.first_name} ${t.last_name}` : null) ||
  t.first_name ||
  t.username ||
  '—'

const techInitials = (t) => {
  const n = techName(t)
  const parts = n.trim().split(' ').filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (parts[0]?.[0] || 'T').toUpperCase()
}

const getRole = (t) => {
  if (t.role) return t.role.toLowerCase()
  if (t.is_superuser) return 'admin'
  if (Array.isArray(t.groups) && t.groups.length > 0) {
    const g = t.groups[0]
    const groupName = (typeof g === 'string' ? g : g.name || '').toLowerCase()
    if (groupName.includes('supervisor')) return 'supervisor'
    if (groupName.includes('admin'))      return 'admin'
    if (groupName.includes('tech'))       return 'technician'
    return groupName
  }
  if (t.is_staff) return 'supervisor'
  return 'technician'
}

const getRoleLabel = (t) => {
  const r = getRole(t)
  if (r === 'supervisor') return 'Supervisor'
  if (r === 'admin')      return 'Admin'
  return 'Technician'
}

const getRoleBadgeClass = (t) => {
  const r = getRole(t)
  if (r === 'supervisor') return 'supervisor'
  if (r === 'admin')      return 'admin'
  return 'technician'
}

const isAdmin = (t) => getRole(t) === 'admin'

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
  --red:#e74c3c;--amber:#e6a817;--blue:#3b82f6;--purple:#7c3aed;
  --sidebar-w:220px;
}
.at-root{font-family:'DM Serif Display',serif;min-height:100vh;background:var(--bg);display:flex;}
.at-sidebar{width:var(--sidebar-w);background:var(--white);border-right:1px solid var(--border);
  display:flex;flex-direction:column;min-height:100vh;
  position:fixed;top:0;left:0;bottom:0;z-index:200;overflow-y:auto;transition:transform .25s ease;}
.at-sb-logo{padding:16px 20px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border);}
.at-sb-icon{width:28px;height:28px;background:var(--green);border-radius:6px;display:flex;align-items:center;justify-content:center;}
.at-sb-icon svg{width:15px;height:15px;fill:white;}
.at-sb-brand{font-size:16px;color:var(--ink);}
.at-sb-nav{padding:12px 10px;flex:1;}
.at-sb-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;
  cursor:pointer;margin-bottom:2px;color:var(--muted);font-size:13.5px;
  transition:background .15s,color .15s;white-space:nowrap;}
.at-sb-item:hover{background:var(--bg);color:var(--ink);}
.at-sb-item.active{background:var(--green-light);color:var(--green);}
.at-sb-item svg{width:16px;height:16px;flex-shrink:0;}
.at-sb-user{padding:14px 16px;border-top:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-shrink:0;}
.at-sb-avatar{width:32px;height:32px;background:var(--green);border-radius:50%;
  display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;flex-shrink:0;}
.at-sb-uname{font-size:13px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.at-sb-urole{font-size:11px;color:var(--pale);}
.at-sb-logout{background:none;border:none;cursor:pointer;color:var(--pale);padding:4px;border-radius:6px;
  display:flex;align-items:center;margin-left:auto;transition:color .15s,background .15s;}
.at-sb-logout:hover{color:var(--red);background:#fde8e8;}
.at-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:150;}
.at-overlay.show{display:block;}
.at-hamburger{display:none;background:none;border:none;cursor:pointer;padding:4px;border-radius:6px;color:var(--ink);}
.at-hamburger svg{width:20px;height:20px;}
.at-main{flex:1;margin-left:var(--sidebar-w);display:flex;flex-direction:column;min-height:100vh;}
.at-topbar{background:var(--white);border-bottom:1px solid var(--border);
  padding:0 24px;height:52px;display:flex;align-items:center;
  justify-content:space-between;position:sticky;top:0;z-index:100;flex-shrink:0;gap:12px;}
.at-topbar-left{display:flex;align-items:center;gap:10px;}
.at-crumb{font-size:13px;color:var(--pale);}
.at-crumb span{color:var(--ink);}
.at-topbar-right{display:flex;align-items:center;gap:10px;}
.at-ticker{font-size:12px;color:var(--pale);white-space:nowrap;}
.at-ticker.soon{color:var(--green);}
.at-refresh-btn{background:var(--bg);color:var(--ink);border:1.5px solid var(--border);
  border-radius:9px;padding:7px 14px;font-family:'DM Serif Display',serif;font-size:13px;
  cursor:pointer;display:flex;align-items:center;gap:6px;transition:background .15s;}
.at-refresh-btn:hover{background:#e2e8e2;}
.at-refresh-btn svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2;transition:transform .35s;}
.at-refresh-btn.spinning svg{animation:atSpin .55s linear;}
@keyframes atSpin{to{transform:rotate(360deg);}}
.at-add-btn{background:var(--green);color:#fff;border:none;border-radius:9px;
  padding:7px 16px;font-family:'DM Serif Display',serif;font-size:13px;
  cursor:pointer;display:flex;align-items:center;gap:6px;transition:background .15s;white-space:nowrap;}
.at-add-btn:hover{background:var(--green-dark);}
.at-add-btn svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2.5;}
.at-content{padding:22px 24px;flex:1;}
.at-page-title{font-size:22px;color:var(--ink);margin-bottom:3px;}
.at-page-sub{font-size:13px;color:var(--pale);margin-bottom:20px;font-style:italic;}
.at-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px;}
.at-stat{background:var(--white);border-radius:14px;padding:16px 18px;box-shadow:0 1px 8px rgba(0,0,0,.05);}
.at-stat-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--pale);margin-bottom:6px;}
.at-stat-val{font-size:28px;color:var(--ink);letter-spacing:-1px;line-height:1;}
.at-stat-val.green{color:var(--green);}
.at-stat-val.red{color:var(--red);}
.at-stat-val.blue{color:var(--blue);}
.at-stat-val.purple{color:var(--purple);}
.at-stat-sub{font-size:11px;color:var(--muted);margin-top:4px;}
.at-tabs{display:flex;gap:6px;margin-bottom:18px;flex-wrap:wrap;}
.at-tab{padding:7px 16px;border-radius:20px;font-family:'DM Serif Display',serif;
  font-size:12.5px;cursor:pointer;border:1.5px solid var(--border);
  background:var(--white);color:var(--muted);transition:all .15s;white-space:nowrap;}
.at-tab:hover{border-color:var(--green);color:var(--green);}
.at-tab.active{background:var(--green);color:#fff;border-color:var(--green);}
.at-tab-count{background:rgba(255,255,255,.25);border-radius:10px;padding:1px 6px;font-size:11px;margin-left:5px;}
.at-tab:not(.active) .at-tab-count{background:var(--bg);color:var(--muted);}
.at-controls{display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap;}
.at-search-wrap{flex:1;min-width:200px;position:relative;}
.at-search-wrap svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);
  width:15px;height:15px;color:var(--pale);pointer-events:none;}
.at-search{width:100%;border:1.5px solid var(--border);border-radius:10px;
  padding:9px 14px 9px 36px;font-family:'DM Serif Display',serif;font-size:13px;
  color:var(--ink);outline:none;background:var(--white);transition:border-color .2s;}
.at-search:focus{border-color:var(--green);}
.at-sort-select{border:1.5px solid var(--border);border-radius:10px;
  padding:9px 14px;font-family:'DM Serif Display',serif;font-size:13px;
  color:var(--ink);outline:none;background:var(--white);cursor:pointer;min-width:180px;}
.at-sort-select:focus{border-color:var(--green);}
.at-list-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
.at-list-title{font-size:15px;color:var(--ink);}
.at-list-meta{font-size:12px;color:var(--pale);}
.at-card{background:var(--white);border-radius:14px;padding:18px 20px;
  margin-bottom:10px;display:flex;align-items:center;gap:16px;
  box-shadow:0 1px 6px rgba(0,0,0,.05);transition:box-shadow .15s,transform .15s;}
.at-card-clickable{cursor:pointer;}
.at-card-clickable:hover{box-shadow:0 4px 16px rgba(0,0,0,.1);transform:translateY(-1px);}
.at-avatar{width:42px;height:42px;border-radius:50%;background:var(--green);
  display:flex;align-items:center;justify-content:center;color:#fff;font-size:15px;flex-shrink:0;}
.at-avatar.inactive{background:#d1d5d1;}
.at-avatar.supervisor{background:var(--purple);}
.at-body{flex:1;min-width:0;}
.at-name-row{display:flex;align-items:center;gap:8px;margin-bottom:3px;flex-wrap:wrap;}
.at-name{font-size:15px;color:var(--ink);}
.at-username{font-size:12px;color:var(--muted);font-style:italic;}
.at-active-badge{font-size:11px;padding:2px 9px;border-radius:20px;}
.at-active-badge.active{background:var(--green-light);color:var(--green);}
.at-active-badge.inactive{background:#f0f2f0;color:var(--muted);}
.at-role-badge{font-size:11px;padding:2px 9px;border-radius:20px;}
.at-role-badge.technician{background:#ede9fe;color:#5b21b6;}
.at-role-badge.supervisor{background:#fde8ff;color:#7c3aed;}
.at-role-badge.admin{background:#fde8e8;color:var(--red);}
.at-details{display:flex;gap:18px;flex-wrap:wrap;margin-top:4px;}
.at-detail{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--muted);}
.at-detail svg{width:11px;height:11px;flex-shrink:0;}
.at-meta-row{display:flex;gap:12px;margin-top:5px;flex-wrap:wrap;}
.at-meta{font-size:11.5px;color:var(--pale);}
.at-meta span{color:var(--muted);}
.at-actions{display:flex;align-items:center;gap:8px;flex-shrink:0;flex-wrap:wrap;}
.at-btn-edit{background:var(--green-light);color:var(--green);border:none;border-radius:8px;
  padding:7px 14px;font-family:'DM Serif Display',serif;font-size:12.5px;cursor:pointer;
  transition:background .15s;white-space:nowrap;position:relative;z-index:2;}
.at-btn-edit:hover{background:#d5eee3;}
.at-btn-toggle{border:none;border-radius:8px;padding:7px 14px;font-family:'DM Serif Display',serif;
  font-size:12.5px;cursor:pointer;transition:background .15s;white-space:nowrap;position:relative;z-index:2;}
.at-btn-toggle.deactivate{background:#fde8e8;color:var(--red);}
.at-btn-toggle.deactivate:hover{background:#f5c6c6;}
.at-btn-toggle.activate{background:#fff8ec;color:var(--amber);}
.at-btn-toggle.activate:hover{background:#fde8c0;}
.at-empty{text-align:center;padding:60px 20px;}
.at-empty-icon{font-size:40px;margin-bottom:12px;}
.at-empty-title{font-size:18px;color:var(--ink);margin-bottom:6px;}
.at-empty-sub{font-size:13px;color:var(--pale);}
.at-loading{display:flex;align-items:center;justify-content:center;padding:60px;color:var(--pale);font-size:14px;gap:10px;}
.at-spinner{width:20px;height:20px;border:2px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:atSpinner .8s linear infinite;}
@keyframes atSpinner{to{transform:rotate(360deg);}}
.at-error{background:#fde8e8;color:var(--red);padding:12px 16px;border-radius:10px;font-size:13px;margin-bottom:16px;}
.at-modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:500;
  display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;}
.at-modal{background:var(--white);border-radius:16px;width:100%;max-width:520px;
  box-shadow:0 20px 60px rgba(0,0,0,.15);overflow:hidden;}
.at-modal-hdr{padding:20px 24px 16px;border-bottom:1px solid var(--border);
  display:flex;align-items:center;justify-content:space-between;}
.at-modal-title{font-size:17px;color:var(--ink);}
.at-modal-close{background:none;border:none;cursor:pointer;color:var(--pale);
  padding:4px;border-radius:6px;display:flex;align-items:center;transition:color .15s;}
.at-modal-close:hover{color:var(--ink);}
.at-modal-body{padding:20px 24px;}
.at-modal-ftr{padding:16px 24px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:10px;}
.at-field{margin-bottom:14px;}
.at-field label{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:var(--pale);margin-bottom:6px;}
.at-field input,.at-field select{width:100%;border:1.5px solid var(--border);border-radius:10px;
  padding:10px 14px;font-family:'DM Serif Display',serif;font-size:13.5px;
  color:var(--ink);outline:none;background:var(--white);transition:border-color .2s;}
.at-field input:focus,.at-field select:focus{border-color:var(--green);}
.at-field input.error,.at-field select.error{border-color:var(--red);}
.at-field-err{font-size:11.5px;color:var(--red);margin-top:4px;}
.at-field-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.at-pw-notice{background:var(--green-light);border-radius:10px;padding:10px 14px;margin-top:2px;font-size:12px;color:var(--green);}
.at-btn-cancel{background:var(--bg);color:var(--muted);border:1.5px solid var(--border);
  border-radius:9px;padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;}
.at-btn-cancel:hover{background:#e2e8e2;}
.at-btn-save{background:var(--green);color:#fff;border:none;border-radius:9px;
  padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;}
.at-btn-save:hover{background:var(--green-dark);}
.at-btn-save:disabled{opacity:.5;cursor:not-allowed;}
.at-confirm-icon{width:52px;height:52px;border-radius:50%;display:flex;align-items:center;
  justify-content:center;margin:0 auto 14px;}
.at-confirm-icon.deactivate{background:#fde8e8;}
.at-confirm-icon.activate{background:#fff8ec;}
.at-confirm-icon svg{width:24px;height:24px;fill:none;stroke-width:2;}
.at-confirm-text{text-align:center;font-size:13.5px;color:var(--muted);line-height:1.6;margin-bottom:4px;}
.at-confirm-name{font-size:16px;color:var(--ink);text-align:center;margin-bottom:8px;}
.at-btn-deactivate{background:var(--red);color:#fff;border:none;border-radius:9px;
  padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;}
.at-btn-deactivate:hover{background:#c0392b;}
.at-btn-activate{background:var(--amber);color:#fff;border:none;border-radius:9px;
  padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;}
.at-btn-activate:hover{background:#c98b00;}
.at-toast{position:fixed;bottom:20px;right:20px;z-index:700;
  display:flex;align-items:center;gap:10px;padding:12px 18px;border-radius:10px;
  font-size:13px;box-shadow:0 4px 20px rgba(0,0,0,.15);animation:atSlideIn .25s ease;}
@keyframes atSlideIn{from{transform:translateY(20px);opacity:0;}to{transform:translateY(0);opacity:1;}}
.at-toast.success{background:var(--green);color:#fff;}
.at-toast.error{background:var(--red);color:#fff;}
@media(max-width:900px){.at-stats{grid-template-columns:repeat(2,1fr);}}
@media(max-width:768px){
  .at-sidebar{transform:translateX(-100%);}
  .at-sidebar.open{transform:translateX(0);}
  .at-main{margin-left:0;}
  .at-hamburger{display:flex;}
  .at-card{flex-wrap:wrap;}
  .at-actions{width:100%;justify-content:flex-end;}
  .at-add-btn span{display:none;}
}
@media(max-width:600px){
  .at-stats{grid-template-columns:1fr 1fr;gap:10px;}
  .at-content{padding:14px;}
  .at-topbar{padding:0 14px;}
  .at-stat-val{font-size:22px;}
  .at-field-row{grid-template-columns:1fr;}
}
`

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

const FILTER_TABS = [
  { key: 'all',        label: 'All Staff'   },
  { key: 'technician', label: 'Technicians' },
  { key: 'supervisor', label: 'Supervisors' },
  { key: 'inactive',   label: 'Inactive'    },
]

/* ─────────────────────────────────────────────
   ADD / EDIT MODAL
───────────────────────────────────────────── */
function TechnicianModal({ technician, onClose, onSave }) {
  const isEdit = !!technician
  const [form, setForm] = useState(() => isEdit ? {
    username:   technician.username   || '',
    first_name: technician.first_name || '',
    last_name:  technician.last_name  || '',
    email:      technician.email      || '',
    phone:      technician.phone      || '',
    role:       getRole(technician) === 'supervisor' ? 'supervisor' : 'technician',
  } : { username: '', first_name: '', last_name: '', email: '', phone: '', role: 'technician' })
  const [errors,   setErrors]  = useState({})
  const [saving,   setSaving]  = useState(false)
  const [apiError, setApiError] = useState('')

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: '' }))
    setApiError('')
  }

  const validate = () => {
    const e = {}
    if (!form.username.trim())   e.username   = 'Username is required.'
    else if (!/^[\w.@+-]+$/.test(form.username)) e.username = 'Only letters, numbers, and @/./+/-/_ allowed.'
    if (!form.first_name.trim()) e.first_name = 'First name is required.'
    if (!form.last_name.trim())  e.last_name  = 'Last name is required.'
    if (!form.email.trim())      e.email      = 'Email is required.'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email.'
    if (!form.phone.trim())      e.phone      = 'Phone is required.'
    return e
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    setApiError('')
    try {
      await onSave(form, technician?.id)
    } catch (err) {
      const data = err?.response?.data
      const msg = data
        ? (typeof data === 'string' ? data : Object.values(data).flat().join(' '))
        : 'Something went wrong. Please try again.'
      setApiError(msg)
      setSaving(false)
    }
  }

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="at-modal-bg" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="at-modal" onMouseDown={e => e.stopPropagation()}>
        <div className="at-modal-hdr">
          <span className="at-modal-title">{isEdit ? 'Edit Staff Member' : 'Add New Staff Member'}</span>
          <button className="at-modal-close" type="button" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="at-modal-body">
          {apiError && <div className="at-error" style={{marginBottom:14}}>{apiError}</div>}

          <div className="at-field">
            <label>Username *</label>
            <input
              className={errors.username ? 'error' : ''}
              placeholder="e.g. suresh_patel"
              value={form.username}
              onChange={e => set('username', e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              autoComplete="off"
            />
            {errors.username && <div className="at-field-err">{errors.username}</div>}
          </div>

          <div className="at-field-row">
            <div className="at-field">
              <label>First Name *</label>
              <input
                className={errors.first_name ? 'error' : ''}
                placeholder="e.g. Suresh"
                value={form.first_name}
                onChange={e => set('first_name', e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              />
              {errors.first_name && <div className="at-field-err">{errors.first_name}</div>}
            </div>
            <div className="at-field">
              <label>Last Name *</label>
              <input
                className={errors.last_name ? 'error' : ''}
                placeholder="e.g. Patel"
                value={form.last_name}
                onChange={e => set('last_name', e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              />
              {errors.last_name && <div className="at-field-err">{errors.last_name}</div>}
            </div>
          </div>

          <div className="at-field-row">
            <div className="at-field">
              <label>Email Address *</label>
              <input
                type="email"
                className={errors.email ? 'error' : ''}
                placeholder="e.g. suresh@pestpro.in"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              />
              {errors.email && <div className="at-field-err">{errors.email}</div>}
            </div>
            <div className="at-field">
              <label>Phone *</label>
              <input
                className={errors.phone ? 'error' : ''}
                placeholder="e.g. 9876543210"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              />
              {errors.phone && <div className="at-field-err">{errors.phone}</div>}
            </div>
          </div>

          <div className="at-field">
            <label>Role *</label>
            <select value={form.role} onChange={e => set('role', e.target.value)}>
              <option value="technician">Technician</option>
              <option value="supervisor">Supervisor</option>
            </select>
          </div>

          {!isEdit && (
            <div className="at-pw-notice">
              🔑 Default password <strong>ChangeMe@123</strong> will be set. Staff should reset it on first login.
            </div>
          )}
        </div>
        <div className="at-modal-ftr">
          <button className="at-btn-cancel" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="at-btn-save" type="button" onClick={handleSave} disabled={saving}>
            {saving
              ? (isEdit ? 'Saving…' : 'Adding…')
              : (isEdit ? 'Save Changes' : 'Add Staff Member')}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   TOGGLE ACTIVE MODAL
───────────────────────────────────────────── */
function ToggleModal({ technician, onClose, onConfirm }) {
  const [saving,   setSaving]  = useState(false)
  const [apiError, setApiError] = useState('')
  const isActive = technician.is_active

  const handleConfirm = async () => {
    setSaving(true)
    setApiError('')
    try {
      await onConfirm(technician.id, !isActive)
    } catch (err) {
      setApiError('Failed to update status. Please try again.')
      setSaving(false)
    }
  }

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="at-modal-bg" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="at-modal" style={{maxWidth:420}} onMouseDown={e => e.stopPropagation()}>
        <div className="at-modal-hdr">
          <span className="at-modal-title">
            {isActive ? 'Deactivate Staff Member' : 'Activate Staff Member'}
          </span>
          <button className="at-modal-close" type="button" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="at-modal-body" style={{paddingTop:24,textAlign:'center'}}>
          {apiError && <div className="at-error" style={{marginBottom:14,textAlign:'left'}}>{apiError}</div>}
          <div className={`at-confirm-icon ${isActive ? 'deactivate' : 'activate'}`}>
            <svg viewBox="0 0 24 24" stroke={isActive ? 'var(--red)' : 'var(--amber)'}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d={isActive
                  ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                  : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"}/>
            </svg>
          </div>
          <div className="at-confirm-name">{techName(technician)}</div>
          <div className="at-confirm-text">
            {isActive
              ? `This ${getRoleLabel(technician).toLowerCase()} will be marked inactive and cannot be assigned to new jobs.`
              : `This ${getRoleLabel(technician).toLowerCase()} will be reactivated and can be assigned to jobs again.`}
          </div>
        </div>
        <div className="at-modal-ftr">
          <button className="at-btn-cancel" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          {isActive
            ? <button className="at-btn-deactivate" type="button" onClick={handleConfirm} disabled={saving}>
                {saving ? 'Deactivating…' : 'Deactivate'}
              </button>
            : <button className="at-btn-activate" type="button" onClick={handleConfirm} disabled={saving}>
                {saving ? 'Activating…' : 'Activate'}
              </button>
          }
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export default function AdminTechniciansPage() {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeNav,   setActiveNav]   = useState('technicians')
  const [allStaff,    setAllStaff]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [activeTab,   setActiveTab]   = useState('all')
  const [search,      setSearch]      = useState('')
  const [sortBy,      setSortBy]      = useState('name_asc')
  const [isSpinning,  setIsSpinning]  = useState(false)
  const [addModal,    setAddModal]    = useState(false)
  const [editModal,   setEditModal]   = useState(null)
  const [toggleModal, setToggleModal] = useState(null)
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

  const fetchTechnicians = useCallback(async (silent = false) => {
    if (!silent) setError('')
    try {
      const res = await api.get('/staff/')
      if (!isMounted.current) return
      const data = res.data?.results || res.data || []
      setAllStaff(data.filter(t => !isAdmin(t)))
    } catch (e) {
      if (!silent && isMounted.current)
        setError(e.response?.data?.detail || e.response?.data?.error || 'Failed to load staff.')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [])

  const resetTimer = useCallback(() => {
    clearInterval(tickRef.current)
    setCountdown(AUTO_REFRESH_SECS)
    tickRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { fetchTechnicians(true); return AUTO_REFRESH_SECS }
        return c - 1
      })
    }, 1000)
  }, [fetchTechnicians])

  useEffect(() => {
    isMounted.current = true
    fetchTechnicians().then(resetTimer)
    return () => { isMounted.current = false; clearInterval(tickRef.current) }
  }, [fetchTechnicians, resetTimer])

  const manualRefresh = () => {
    setIsSpinning(true)
    fetchTechnicians(true).then(() => {
      resetTimer()
      setTimeout(() => setIsSpinning(false), 550)
    })
  }

  /* ── ADD ── */
  const handleAdd = async (form) => {
  const payload = {
    ...form,
    password: "ChangeMe@123",
    password2: "ChangeMe@123"   // ✅ add this
  }

  try {
    const res = await api.post('/staff/register/', payload)

    if (isMounted.current) {
      setAllStaff(prev => [res.data, ...prev].filter(t => !isAdmin(t)))
      setAddModal(false)
      showToast('Staff member added successfully.')
      resetTimer()
    }
  } catch (err) {
    console.log("FULL ERROR:", err.response)
    console.log("DATA:", err.response?.data)
  }
}

  /* ── EDIT ── */
  const handleEdit = async (form, id) => {
    const res = await api.patch(`/staff/${id}/`, form)
    if (isMounted.current) {
      setAllStaff(prev => prev.map(t => t.id === id ? res.data : t).filter(t => !isAdmin(t)))
      setEditModal(null)
      showToast('Staff member updated successfully.')
      resetTimer()
    }
  }

  /* ── TOGGLE ACTIVE ── */
  const handleToggle = async (id, newActive) => {
    const res = await api.patch(`/staff/${id}/`, { is_active: newActive })
    if (isMounted.current) {
      setAllStaff(prev => prev.map(t => t.id === id ? res.data : t).filter(t => !isAdmin(t)))
      setToggleModal(null)
      showToast(`Staff member ${newActive ? 'activated' : 'deactivated'} successfully.`)
      resetTimer()
    }
  }

  const handleLogout = async () => {
    clearInterval(tickRef.current)
    await logout()
    navigate('/login')
  }

  /* ── STATS ── */
  const technicians = allStaff.filter(t => getRole(t) === 'technician')
  const supervisors = allStaff.filter(t => getRole(t) === 'supervisor')
  const activeCount = allStaff.filter(t => t.is_active).length
  const thisMonth   = allStaff.filter(t => {
    if (!t.date_joined) return false
    const d = new Date(t.date_joined), now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const tabCount = (key) => {
    if (key === 'all')        return allStaff.length
    if (key === 'technician') return technicians.length
    if (key === 'supervisor') return supervisors.length
    if (key === 'inactive')   return allStaff.filter(t => !t.is_active).length
    return 0
  }

  const filtered = allStaff
    .filter(t => {
      if (activeTab === 'technician') return getRole(t) === 'technician'
      if (activeTab === 'supervisor') return getRole(t) === 'supervisor'
      if (activeTab === 'inactive')   return !t.is_active
      return true
    })
    .filter(t => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        techName(t).toLowerCase().includes(q) ||
        (t.email    || '').toLowerCase().includes(q) ||
        (t.phone    || '').toLowerCase().includes(q) ||
        (t.username || '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      if (sortBy === 'name_asc')  return techName(a).localeCompare(techName(b))
      if (sortBy === 'name_desc') return techName(b).localeCompare(techName(a))
      if (sortBy === 'date_desc') return new Date(b.date_joined) - new Date(a.date_joined)
      if (sortBy === 'date_asc')  return new Date(a.date_joined) - new Date(b.date_joined)
      return 0
    })

  const handleCardClick = (e, id) => {
    if (e.target.closest('button')) return
    navigate(`/dashboard/technicians/${id}`)
  }

  const tabLabel = FILTER_TABS.find(t => t.key === activeTab)?.label || ''

  return (
    <>
      <style>{S}</style>
      <div className="at-root">

        <div className={`at-overlay${sidebarOpen ? ' show' : ''}`} onClick={() => setSidebarOpen(false)}/>

        {/* SIDEBAR */}
        <aside className={`at-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="at-sb-logo">
            <div className="at-sb-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/></svg>
            </div>
            <span className="at-sb-brand">PestPro</span>
          </div>
          <nav className="at-sb-nav">
            {navItems.map(n => (
              <div key={n.id}
                className={`at-sb-item${activeNav === n.id ? ' active' : ''}`}
                onClick={() => { setActiveNav(n.id); setSidebarOpen(false); navigate(n.path) }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d={n.d}/>
                </svg>
                {n.label}
              </div>
            ))}
          </nav>
          <div className="at-sb-user">
            <div className="at-sb-avatar">{userInitials}</div>
            <div style={{flex:1,minWidth:0}}>
              <div className="at-sb-uname">{userName}</div>
              <div className="at-sb-urole">Administrator</div>
            </div>
            <button className="at-sb-logout" type="button" onClick={handleLogout} title="Logout">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <div className="at-main">
          <div className="at-topbar">
            <div className="at-topbar-left">
              <button className="at-hamburger" type="button" onClick={() => setSidebarOpen(o => !o)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              </button>
              <span className="at-crumb">Admin &nbsp;›&nbsp; <span>Staff</span></span>
            </div>
            <div className="at-topbar-right">
              <span className={`at-ticker${countdown <= 10 ? ' soon' : ''}`}>↻ in {countdown}s</span>
              <button className={`at-refresh-btn${isSpinning ? ' spinning' : ''}`} type="button" onClick={manualRefresh}>
                <svg viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Refresh
              </button>
              <button className="at-add-btn" type="button" onClick={() => setAddModal(true)}>
                <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                <span>Add Staff</span>
              </button>
            </div>
          </div>

          <div className="at-content">
            <div className="at-page-title">Staff Management</div>
            <div className="at-page-sub">Technicians &amp; supervisors · auto-refreshes every {AUTO_REFRESH_SECS}s</div>

            {error && <div className="at-error">{error}</div>}

            {loading ? (
              <div className="at-loading"><div className="at-spinner"/>Loading staff…</div>
            ) : (
              <>
                <div className="at-stats">
                  <div className="at-stat">
                    <div className="at-stat-label">Technicians</div>
                    <div className="at-stat-val green">{technicians.length}</div>
                    <div className="at-stat-sub">{technicians.filter(t => t.is_active).length} active</div>
                  </div>
                  <div className="at-stat">
                    <div className="at-stat-label">Supervisors</div>
                    <div className="at-stat-val purple">{supervisors.length}</div>
                    <div className="at-stat-sub">{supervisors.filter(t => t.is_active).length} active</div>
                  </div>
                  <div className="at-stat">
                    <div className="at-stat-label">Active Staff</div>
                    <div className="at-stat-val blue">{activeCount}</div>
                    <div className="at-stat-sub">{allStaff.length > 0 ? `${Math.round((activeCount / allStaff.length) * 100)}% of total` : '0%'}</div>
                  </div>
                  <div className="at-stat">
                    <div className="at-stat-label">Joined This Month</div>
                    <div className="at-stat-val">{thisMonth}</div>
                    <div className="at-stat-sub">New additions</div>
                  </div>
                </div>

                <div className="at-tabs">
                  {FILTER_TABS.map(tab => (
                    <button key={tab.key} type="button"
                      className={`at-tab${activeTab === tab.key ? ' active' : ''}`}
                      onClick={() => setActiveTab(tab.key)}
                    >
                      {tab.label}
                      <span className="at-tab-count">{tabCount(tab.key)}</span>
                    </button>
                  ))}
                </div>

                <div className="at-controls">
                  <div className="at-search-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    <input className="at-search"
                      placeholder="Search by name, email, phone, username…"
                      value={search} onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                  <select className="at-sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                    <option value="name_asc">Name: A → Z</option>
                    <option value="name_desc">Name: Z → A</option>
                    <option value="date_desc">Newest First</option>
                    <option value="date_asc">Oldest First</option>
                  </select>
                </div>

                <div className="at-list-hdr">
                  <span className="at-list-title">
                    {filtered.length} {activeTab === 'all' ? 'staff member' : activeTab}{filtered.length !== 1 ? 's' : ''}
                    {search ? ` matching "${search}"` : ''}
                  </span>
                  <span className="at-list-meta">
                    {sortBy === 'name_asc' ? 'A → Z' : sortBy === 'name_desc' ? 'Z → A' : sortBy === 'date_desc' ? 'Newest First' : 'Oldest First'}
                  </span>
                </div>

                {filtered.length === 0 ? (
                  <div className="at-empty">
                    <div className="at-empty-icon">🔧</div>
                    <div className="at-empty-title">No staff found</div>
                    <div className="at-empty-sub">
                      {search
                        ? `No staff match "${search}"`
                        : activeTab !== 'all' ? `No ${tabLabel.toLowerCase()} found`
                        : 'No staff yet — click "Add Staff" to get started'}
                    </div>
                  </div>
                ) : (
                  filtered.map(t => {
                    const role      = getRole(t)
                    const roleLabel = getRoleLabel(t)
                    const roleBadge = getRoleBadgeClass(t)
                    const avatarCls = !t.is_active ? 'inactive' : role === 'supervisor' ? 'supervisor' : ''
                    return (
                      <div
                        key={t.id}
                        className="at-card at-card-clickable"
                        onClick={e => handleCardClick(e, t.id)}
                      >
                        <div className={`at-avatar${avatarCls ? ` ${avatarCls}` : ''}`}>
                          {techInitials(t)}
                        </div>
                        <div className="at-body">
                          <div className="at-name-row">
                            <span className="at-name">{techName(t)}</span>
                            {t.username && <span className="at-username">@{t.username}</span>}
                            <span className={`at-role-badge ${roleBadge}`}>{roleLabel}</span>
                            <span className={`at-active-badge ${t.is_active ? 'active' : 'inactive'}`}>
                              {t.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="at-details">
                            <span className="at-detail">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                              </svg>
                              {t.email || '—'}
                            </span>
                            <span className="at-detail">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                              </svg>
                              {t.phone || '—'}
                            </span>
                          </div>
                          <div className="at-meta-row">
                            <span className="at-meta">Joined <span>{fmtDate(t.date_joined)}</span></span>
                          </div>
                        </div>
                        <div className="at-actions">
                          <button
                            className="at-btn-edit"
                            type="button"
                            onClick={e => { e.stopPropagation(); setEditModal(t) }}
                          >
                            Edit
                          </button>
                          <button
                            className={`at-btn-toggle ${t.is_active ? 'deactivate' : 'activate'}`}
                            type="button"
                            onClick={e => { e.stopPropagation(); setToggleModal(t) }}
                          >
                            {t.is_active ? 'Deactivate' : 'Activate'}
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

        {/* MODALS */}
        {addModal && (
          <TechnicianModal
            onClose={() => setAddModal(false)}
            onSave={handleAdd}
          />
        )}
        {editModal && (
          <TechnicianModal
            key={editModal.id}
            technician={editModal}
            onClose={() => setEditModal(null)}
            onSave={handleEdit}
          />
        )}
        {toggleModal && (
          <ToggleModal
            key={toggleModal.id}
            technician={toggleModal}
            onClose={() => setToggleModal(null)}
            onConfirm={handleToggle}
          />
        )}

        {toast && (
          <div className={`at-toast ${toast.type}`}>
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