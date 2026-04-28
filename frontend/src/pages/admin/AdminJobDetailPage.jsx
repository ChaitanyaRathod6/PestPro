import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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

const fmt = (s = '') =>
  s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

const fmtDate = (dt) => {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

const fmtTime = (dt) => {
  if (!dt) return '—'
  return new Date(dt).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  })
}

const fmtDateTime = (dt) => {
  if (!dt) return '—'
  return `${fmtDate(dt)} · ${fmtTime(dt)}`
}

const STATUS_CONFIG = {
  scheduled:             { label: 'Scheduled',        cls: 'pending',    step: 0 },
  in_progress:           { label: 'In Progress',      cls: 'inprogress', step: 1 },
  observations_recorded: { label: 'Obs. Recorded',    cls: 'obs',        step: 2 },
  completed:             { label: 'Completed',         cls: 'done',       step: 3 },
  report_sent:           { label: 'Report Sent',       cls: 'done',       step: 4 },
  cancelled:             { label: 'Cancelled',         cls: 'cancelled',  step: -1 },
}

const ALL_STATUSES = [
  'scheduled', 'in_progress', 'observations_recorded',
  'completed', 'report_sent', 'cancelled'
]

const TIMELINE_STEPS = [
  { key: 'scheduled',             label: 'Scheduled' },
  { key: 'in_progress',           label: 'In Progress' },
  { key: 'observations_recorded', label: 'Obs. Recorded' },
  { key: 'completed',             label: 'Completed' },
  { key: 'report_sent',           label: 'Report Sent' },
]

/* ─────────────────────────────────────────────
   NAV ITEMS
───────────────────────────────────────────── */
const navItems = [
  { id: 'dashboard',   label: 'Dashboard',   path: '/dashboard',             d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'jobs',        label: 'All Jobs',    path: '/dashboard/jobs',        d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'customers',   label: 'Customers',   path: '/dashboard/customers',   d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'technicians', label: 'Technicians', path: '/dashboard/technicians', d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { id: 'reports',     label: 'Reports',     path: '/dashboard/reports',     d: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'alerts',      label: 'Smart Alerts',path: '/dashboard/alerts',      d: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { id: 'settings',    label: 'Settings',    path: '/dashboard/settings',    d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
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
.jd-root{font-family:'DM Serif Display',serif;min-height:100vh;background:var(--bg);display:flex;}

/* ── SIDEBAR ── */
.jd-sidebar{width:var(--sidebar-w);background:var(--white);border-right:1px solid var(--border);
  display:flex;flex-direction:column;min-height:100vh;
  position:fixed;top:0;left:0;bottom:0;z-index:200;overflow-y:auto;
  transition:transform .25s ease;}
.jd-sb-logo{padding:16px 20px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border);}
.jd-sb-icon{width:28px;height:28px;background:var(--green);border-radius:6px;
  display:flex;align-items:center;justify-content:center;}
.jd-sb-icon svg{width:15px;height:15px;fill:white;}
.jd-sb-brand{font-size:16px;color:var(--ink);}
.jd-sb-nav{padding:12px 10px;flex:1;}
.jd-sb-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;
  cursor:pointer;margin-bottom:2px;color:var(--muted);font-size:13.5px;
  transition:background .15s,color .15s;white-space:nowrap;}
.jd-sb-item:hover{background:var(--bg);color:var(--ink);}
.jd-sb-item.active{background:var(--green-light);color:var(--green);}
.jd-sb-item svg{width:16px;height:16px;flex-shrink:0;}
.jd-sb-user{padding:14px 16px;border-top:1px solid var(--border);
  display:flex;align-items:center;gap:10px;flex-shrink:0;}
.jd-sb-avatar{width:32px;height:32px;background:var(--green);border-radius:50%;
  display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;flex-shrink:0;}
.jd-sb-uname{font-size:13px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.jd-sb-urole{font-size:11px;color:var(--pale);}
.jd-sb-logout{background:none;border:none;cursor:pointer;color:var(--pale);
  padding:4px;border-radius:6px;display:flex;align-items:center;margin-left:auto;
  transition:color .15s,background .15s;}
.jd-sb-logout:hover{color:var(--red);background:#fde8e8;}

/* ── OVERLAY ── */
.jd-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:150;}
.jd-overlay.show{display:block;}
.jd-hamburger{display:none;background:none;border:none;cursor:pointer;
  padding:4px;border-radius:6px;color:var(--ink);}
.jd-hamburger svg{width:20px;height:20px;}

/* ── MAIN ── */
.jd-main{flex:1;margin-left:var(--sidebar-w);display:flex;flex-direction:column;min-height:100vh;}

/* ── TOPBAR ── */
.jd-topbar{background:var(--white);border-bottom:1px solid var(--border);
  padding:0 24px;height:52px;display:flex;align-items:center;
  justify-content:space-between;position:sticky;top:0;z-index:100;flex-shrink:0;gap:12px;}
.jd-topbar-left{display:flex;align-items:center;gap:10px;}
.jd-back-btn{background:var(--bg);border:1.5px solid var(--border);border-radius:8px;
  padding:6px 12px;font-family:'DM Serif Display',serif;font-size:12.5px;
  color:var(--muted);cursor:pointer;display:flex;align-items:center;gap:6px;
  transition:background .15s,color .15s;}
.jd-back-btn:hover{background:#e2e8e2;color:var(--ink);}
.jd-back-btn svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;}
.jd-crumb{font-size:13px;color:var(--pale);}
.jd-crumb span{color:var(--ink);}
.jd-topbar-right{display:flex;align-items:center;gap:10px;}

/* ── CONTENT ── */
.jd-content{padding:22px 24px;flex:1;}

/* ── LOADING / ERROR ── */
.jd-loading{display:flex;align-items:center;justify-content:center;
  padding:80px;color:var(--pale);font-size:14px;gap:10px;}
.jd-spinner{width:20px;height:20px;border:2px solid var(--border);
  border-top-color:var(--green);border-radius:50%;animation:jdSpin .8s linear infinite;}
@keyframes jdSpin{to{transform:rotate(360deg);}}
.jd-error{background:#fde8e8;color:var(--red);padding:14px 18px;
  border-radius:12px;font-size:13px;margin-bottom:16px;}

/* ── PAGE HEADER ── */
.jd-page-header{display:flex;align-items:flex-start;justify-content:space-between;
  margin-bottom:22px;gap:16px;flex-wrap:wrap;}
.jd-page-header-left{}
.jd-job-title{font-size:24px;color:var(--ink);margin-bottom:4px;}
.jd-job-meta-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.jd-job-id-tag{font-size:11px;color:var(--pale);text-transform:uppercase;letter-spacing:.8px;
  background:var(--bg);padding:3px 10px;border-radius:6px;border:1px solid var(--border);}
.jd-badge{font-size:12px;padding:4px 14px;border-radius:6px;white-space:nowrap;}
.jd-badge.pending{background:#fff8ec;color:var(--amber);}
.jd-badge.inprogress{background:var(--green-light);color:var(--green);}
.jd-badge.obs{background:#eff6ff;color:var(--blue);}
.jd-badge.done{background:#f0f2f0;color:var(--muted);}
.jd-badge.cancelled{background:#fde8e8;color:var(--red);}
.jd-page-header-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}

/* ── ACTION BUTTONS ── */
.jd-btn{border:none;border-radius:9px;padding:8px 18px;
  font-family:'DM Serif Display',serif;font-size:13px;
  cursor:pointer;display:flex;align-items:center;gap:6px;
  transition:background .15s;white-space:nowrap;}
.jd-btn svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;}
.jd-btn-primary{background:var(--green);color:#fff;}
.jd-btn-primary:hover{background:var(--green-dark);}
.jd-btn-secondary{background:var(--bg);color:var(--ink);border:1.5px solid var(--border);}
.jd-btn-secondary:hover{background:#e2e8e2;}
.jd-btn-amber{background:#fff8ec;color:var(--amber);}
.jd-btn-amber:hover{background:#fde8c0;}
.jd-btn-blue{background:#eff6ff;color:var(--blue);}
.jd-btn-blue:hover{background:#dbeafe;}
.jd-btn-danger{background:#fde8e8;color:var(--red);}
.jd-btn-danger:hover{background:#f5c6c6;}
.jd-btn:disabled{opacity:.5;cursor:not-allowed;}

/* ── GRID LAYOUT ── */
.jd-grid{display:grid;grid-template-columns:1fr 340px;gap:18px;align-items:start;}
.jd-grid-left{display:flex;flex-direction:column;gap:18px;}
.jd-grid-right{display:flex;flex-direction:column;gap:18px;}

/* ── CARDS ── */
.jd-card{background:var(--white);border-radius:16px;
  box-shadow:0 1px 8px rgba(0,0,0,.05);overflow:hidden;}
.jd-card-header{padding:16px 20px;border-bottom:1px solid var(--border);
  display:flex;align-items:center;justify-content:space-between;}
.jd-card-title{font-size:14px;color:var(--ink);display:flex;align-items:center;gap:8px;}
.jd-card-title svg{width:15px;height:15px;stroke:var(--green);fill:none;stroke-width:2;flex-shrink:0;}
.jd-card-body{padding:18px 20px;}

/* ── INFO ROWS ── */
.jd-info-row{display:flex;align-items:flex-start;gap:10px;padding:9px 0;
  border-bottom:1px solid var(--border);}
.jd-info-row:last-child{border-bottom:none;}
.jd-info-label{font-size:11px;text-transform:uppercase;letter-spacing:.8px;
  color:var(--pale);min-width:130px;flex-shrink:0;padding-top:2px;}
.jd-info-value{font-size:13.5px;color:var(--ink);flex:1;}
.jd-info-value.muted{color:var(--muted);}

/* ── TIMELINE ── */
.jd-timeline{padding:20px 20px 16px;}
.jd-timeline-steps{display:flex;align-items:center;gap:0;position:relative;}
.jd-tl-step{display:flex;flex-direction:column;align-items:center;flex:1;position:relative;}
.jd-tl-dot{width:28px;height:28px;border-radius:50%;border:2px solid var(--border);
  background:var(--white);display:flex;align-items:center;justify-content:center;
  z-index:2;transition:all .2s;}
.jd-tl-dot.done{background:var(--green);border-color:var(--green);}
.jd-tl-dot.done svg{width:12px;height:12px;stroke:#fff;fill:none;stroke-width:2.5;}
.jd-tl-dot.active{background:var(--white);border-color:var(--green);
  box-shadow:0 0 0 4px var(--green-light);}
.jd-tl-dot.active::after{content:'';width:10px;height:10px;border-radius:50%;
  background:var(--green);position:absolute;}
.jd-tl-line{position:absolute;top:14px;left:50%;right:-50%;height:2px;
  background:var(--border);z-index:1;}
.jd-tl-line.done{background:var(--green);}
.jd-tl-step:last-child .jd-tl-line{display:none;}
.jd-tl-label{font-size:10.5px;color:var(--pale);margin-top:7px;text-align:center;white-space:nowrap;}
.jd-tl-label.active{color:var(--green);}
.jd-tl-label.done{color:var(--muted);}
.jd-cancelled-banner{background:#fde8e8;border-radius:10px;padding:10px 14px;
  display:flex;align-items:center;gap:8px;font-size:13px;color:var(--red);margin-top:12px;}
.jd-cancelled-banner svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;flex-shrink:0;}

/* ── OBSERVATIONS ── */
.jd-obs-list{display:flex;flex-direction:column;gap:12px;}
.jd-obs-card{border:1.5px solid var(--border);border-radius:12px;overflow:hidden;}
.jd-obs-header{padding:10px 14px;background:var(--bg);display:flex;
  align-items:center;justify-content:space-between;}
.jd-obs-cat{font-size:12px;color:var(--ink);display:flex;align-items:center;gap:6px;}
.jd-obs-cat-dot{width:8px;height:8px;border-radius:50%;background:var(--green);}
.jd-obs-time{font-size:11px;color:var(--pale);}
.jd-obs-body{padding:12px 14px;}
.jd-obs-field{display:flex;align-items:flex-start;gap:8px;margin-bottom:7px;font-size:12.5px;}
.jd-obs-field:last-child{margin-bottom:0;}
.jd-obs-field-label{color:var(--pale);min-width:140px;flex-shrink:0;}
.jd-obs-field-val{color:var(--ink);}
.jd-obs-notes{font-size:12.5px;color:var(--muted);margin-top:8px;padding-top:8px;
  border-top:1px solid var(--border);font-style:italic;}
.jd-activity-badge{display:inline-block;padding:2px 10px;border-radius:4px;font-size:11px;}
.jd-activity-badge.none{background:#f0f2f0;color:var(--muted);}
.jd-activity-badge.low{background:#edf6f1;color:var(--green);}
.jd-activity-badge.medium{background:#fff8ec;color:var(--amber);}
.jd-activity-badge.high{background:#fde8e8;color:var(--red);}
.jd-obs-empty{text-align:center;padding:32px;color:var(--pale);font-size:13px;}
.jd-obs-empty-icon{font-size:28px;margin-bottom:8px;}

/* ── SIGNATURE ── */
.jd-signature-box{background:var(--bg);border-radius:10px;padding:14px 16px;
  font-size:13px;color:var(--ink);word-break:break-all;}
.jd-signature-label{font-size:11px;color:var(--pale);margin-bottom:5px;
  text-transform:uppercase;letter-spacing:.7px;}

/* ── PDF SECTION ── */
.jd-pdf-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
.jd-pdf-icon{width:40px;height:40px;background:#fde8e8;border-radius:10px;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.jd-pdf-icon svg{width:20px;height:20px;stroke:var(--red);fill:none;stroke-width:1.5;}
.jd-pdf-info{flex:1;}
.jd-pdf-name{font-size:13px;color:var(--ink);}
.jd-pdf-sub{font-size:11px;color:var(--pale);}
.jd-pdf-not-ready{font-size:13px;color:var(--pale);font-style:italic;}

/* ── QUICK EDIT SELECTS ── */
.jd-quick-select{width:100%;border:1.5px solid var(--border);border-radius:9px;
  padding:9px 12px;font-family:'DM Serif Display',serif;font-size:13px;
  color:var(--ink);outline:none;background:var(--white);cursor:pointer;
  transition:border-color .2s;margin-bottom:10px;}
.jd-quick-select:focus{border-color:var(--green);}
.jd-save-row{display:flex;justify-content:flex-end;gap:8px;}

/* ── MODAL ── */
.jd-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:500;
  display:flex;align-items:center;justify-content:center;padding:20px;}
.jd-modal{background:var(--white);border-radius:16px;width:100%;max-width:420px;
  box-shadow:0 20px 60px rgba(0,0,0,.15);overflow:hidden;}
.jd-modal-header{padding:18px 22px 14px;border-bottom:1px solid var(--border);
  display:flex;align-items:center;justify-content:space-between;}
.jd-modal-title{font-size:16px;color:var(--ink);}
.jd-modal-close{background:none;border:none;cursor:pointer;color:var(--pale);
  padding:4px;border-radius:6px;display:flex;align-items:center;}
.jd-modal-close:hover{color:var(--ink);}
.jd-modal-body{padding:18px 22px;}
.jd-modal-footer{padding:14px 22px;border-top:1px solid var(--border);
  display:flex;justify-content:flex-end;gap:10px;}
.jd-modal-label{font-size:12px;color:var(--muted);margin-bottom:6px;display:block;}
.jd-modal-select{width:100%;border:1.5px solid var(--border);border-radius:10px;
  padding:10px 14px;font-family:'DM Serif Display',serif;font-size:13.5px;
  color:var(--ink);outline:none;background:var(--white);cursor:pointer;margin-bottom:14px;
  transition:border-color .2s;}
.jd-modal-select:focus{border-color:var(--green);}
.jd-delete-icon{width:48px;height:48px;background:#fde8e8;border-radius:50%;
  display:flex;align-items:center;justify-content:center;margin:0 auto 12px;}
.jd-delete-icon svg{width:22px;height:22px;stroke:var(--red);fill:none;stroke-width:2;}
.jd-delete-text{text-align:center;font-size:13.5px;color:var(--muted);line-height:1.6;}
.jd-delete-name{font-size:15px;color:var(--ink);text-align:center;margin-bottom:6px;}
.jd-btn-cancel{background:var(--bg);color:var(--muted);border:1.5px solid var(--border);
  border-radius:9px;padding:8px 18px;font-family:'DM Serif Display',serif;font-size:13px;
  cursor:pointer;}
.jd-btn-cancel:hover{background:#e2e8e2;}
.jd-btn-confirm{background:var(--green);color:#fff;border:none;border-radius:9px;
  padding:8px 18px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;}
.jd-btn-confirm:hover{background:var(--green-dark);}
.jd-btn-confirm:disabled{opacity:.5;cursor:not-allowed;}
.jd-btn-danger-modal{background:var(--red);color:#fff;border:none;border-radius:9px;
  padding:8px 18px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;}
.jd-btn-danger-modal:hover{background:#c0392b;}

/* ── RESPONSIVE ── */
@media(max-width:1024px){
  .jd-grid{grid-template-columns:1fr;}
  .jd-grid-right{order:-1;}
}
@media(max-width:768px){
  .jd-sidebar{transform:translateX(-100%);}
  .jd-sidebar.open{transform:translateX(0);}
  .jd-main{margin-left:0;}
  .jd-hamburger{display:flex;}
  .jd-content{padding:14px;}
  .jd-topbar{padding:0 14px;}
}
`

/* ─────────────────────────────────────────────
   OBSERVATION DETAIL RENDERER
───────────────────────────────────────────── */
function ObsDetail({ obs }) {
  const r = obs.rodent_detail
  const f = obs.flying_insect_detail
  const c = obs.cockroach_detail
  const t = obs.termite_detail
  const m = obs.mosquito_detail
  const g = obs.general_detail

  const ActivityBadge = ({ level }) => (
    <span className={`jd-activity-badge ${level || 'none'}`}>{fmt(level || 'none')}</span>
  )

  const BoolVal = ({ v }) => (
    <span style={{ color: v ? 'var(--green)' : 'var(--pale)' }}>{v ? 'Yes' : 'No'}</span>
  )

  if (r) return (
    <div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Box ID</span><span className="jd-obs-field-val">{r.rodent_box_id}</span></div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Location</span><span className="jd-obs-field-val">{r.location_in_premises}</span></div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Rats Found</span><span className="jd-obs-field-val">{r.rats_found_count}</span></div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Activity Level</span><span className="jd-obs-field-val"><ActivityBadge level={r.activity_level}/></span></div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Bait Consumed</span><span className="jd-obs-field-val"><BoolVal v={r.bait_consumed}/></span></div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Bait Replaced</span><span className="jd-obs-field-val"><BoolVal v={r.bait_replaced}/></span></div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Droppings</span><span className="jd-obs-field-val"><BoolVal v={r.droppings_observed}/></span></div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Gnaw Marks</span><span className="jd-obs-field-val"><BoolVal v={r.gnaw_marks}/></span></div>
      {r.technician_remarks && <div className="jd-obs-notes">"{r.technician_remarks}"</div>}
    </div>
  )

  if (f) return (
    <div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Machine ID</span><span className="jd-obs-field-val">{f.flycatcher_machine_id}</span></div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Location</span><span className="jd-obs-field-val">{f.machine_location}</span></div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Insects Trapped</span><span className="jd-obs-field-val">{f.insects_trapped_count}</span></div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Insect Types</span><span className="jd-obs-field-val">{(f.insect_types_trapped || []).join(', ') || '—'}</span></div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Glue Board Changed</span><span className="jd-obs-field-val"><BoolVal v={f.glue_board_changed}/></span></div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Glue Board Condition</span><span className="jd-obs-field-val">{fmt(f.glue_board_condition) || '—'}</span></div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Machine Functional</span><span className="jd-obs-field-val"><BoolVal v={f.machine_functional}/></span></div>
      {f.technician_remarks && <div className="jd-obs-notes">"{f.technician_remarks}"</div>}
    </div>
  )

  if (c) return (
    <div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Station ID</span><span className="jd-obs-field-val">{c.station_id}</span></div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Location</span><span className="jd-obs-field-val">{c.location_in_premises}</span></div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Cockroaches Found</span><span className="jd-obs-field-val">{c.cockroaches_found}</span></div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Activity Level</span><span className="jd-obs-field-val"><ActivityBadge level={c.activity_level}/></span></div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Gel Applied</span><span className="jd-obs-field-val"><BoolVal v={c.gel_applied}/></span></div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Gel Consumed</span><span className="jd-obs-field-val"><BoolVal v={c.gel_consumed}/></span></div>
      {c.infestation_area && <div className="jd-obs-field"><span className="jd-obs-field-label">Infestation Area</span><span className="jd-obs-field-val">{c.infestation_area}</span></div>}
      {c.technician_remarks && <div className="jd-obs-notes">"{c.technician_remarks}"</div>}
    </div>
  )

  if (t) return (
    <div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Station ID</span><span className="jd-obs-field-val">{t.station_id}</span></div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Location</span><span className="jd-obs-field-val">{t.station_location}</span></div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Termites Found</span><span className="jd-obs-field-val"><BoolVal v={t.termites_found}/></span></div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Mud Tubes Found</span><span className="jd-obs-field-val"><BoolVal v={t.mud_tubes_found}/></span></div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Wood Damage</span><span className="jd-obs-field-val"><BoolVal v={t.wood_damage_observed}/></span></div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Damage Severity</span><span className="jd-obs-field-val"><ActivityBadge level={t.damage_severity}/></span></div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Bait Consumed</span><span className="jd-obs-field-val"><BoolVal v={t.bait_consumed}/></span></div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Bait Replaced</span><span className="jd-obs-field-val"><BoolVal v={t.bait_replaced}/></span></div>
      {t.technician_remarks && <div className="jd-obs-notes">"{t.technician_remarks}"</div>}
    </div>
  )

  if (m) return (
    <div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Treatment Area</span><span className="jd-obs-field-val">{m.treatment_area}</span></div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Fogging Done</span><span className="jd-obs-field-val"><BoolVal v={m.fogging_done}/></span></div>
      {m.chemical_used && <div className="jd-obs-field"><span className="jd-obs-field-label">Chemical Used</span><span className="jd-obs-field-val">{m.chemical_used}</span></div>}
      <div className="jd-obs-field"><span className="jd-obs-field-label">Breeding Sites Found</span><span className="jd-obs-field-val">{m.breeding_sites_found}</span></div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Sites Eliminated</span><span className="jd-obs-field-val">{m.breeding_sites_eliminated}</span></div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Larval Activity</span><span className="jd-obs-field-val"><BoolVal v={m.larval_activity}/></span></div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Mosquito Density</span><span className="jd-obs-field-val"><ActivityBadge level={m.adult_mosquito_density}/></span></div>
      {m.technician_remarks && <div className="jd-obs-notes">"{m.technician_remarks}"</div>}
    </div>
  )

  if (g) return (
    <div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Pest Type</span><span className="jd-obs-field-val">{g.pest_type_observed}</span></div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Location</span><span className="jd-obs-field-val">{g.location_in_premises}</span></div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Pest Count</span><span className="jd-obs-field-val">{g.pest_count}</span></div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Activity Level</span><span className="jd-obs-field-val"><ActivityBadge level={g.activity_level}/></span></div>
      <div className="jd-obs-field"><span className="jd-obs-field-label">Treatment Applied</span><span className="jd-obs-field-val"><BoolVal v={g.treatment_applied}/></span></div>
      {g.treatment_description && <div className="jd-obs-field"><span className="jd-obs-field-label">Treatment</span><span className="jd-obs-field-val">{g.treatment_description}</span></div>}
      {g.recommended_action && <div className="jd-obs-field"><span className="jd-obs-field-label">Recommendation</span><span className="jd-obs-field-val">{g.recommended_action}</span></div>}
      {g.technician_remarks && <div className="jd-obs-notes">"{g.technician_remarks}"</div>}
    </div>
  )

  return <div style={{ fontSize: 12.5, color: 'var(--pale)' }}>No detail data available.</div>
}

/* ─────────────────────────────────────────────
   MODALS
───────────────────────────────────────────── */
function StatusModal({ job, onClose, onSave }) {
  const [selected, setSelected] = useState(job.status)
  const [saving, setSaving] = useState(false)
  const handleSave = async () => {
    setSaving(true); await onSave(selected); setSaving(false)
  }
  return (
    <div className="jd-modal-backdrop" onClick={onClose}>
      <div className="jd-modal" onClick={e => e.stopPropagation()}>
        <div className="jd-modal-header">
          <span className="jd-modal-title">Change Job Status</span>
          <button className="jd-modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="jd-modal-body">
          <label className="jd-modal-label">New Status</label>
          <select className="jd-modal-select" value={selected} onChange={e => setSelected(e.target.value)}>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{fmt(s)}</option>)}
          </select>
          <p style={{ fontSize: 12, color: 'var(--pale)' }}>
            Status changes made here override the technician's current progress.
          </p>
        </div>
        <div className="jd-modal-footer">
          <button className="jd-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="jd-btn-confirm" onClick={handleSave} disabled={saving || selected === job.status}>
            {saving ? 'Saving…' : 'Update Status'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AssignModal({ job, technicians, onClose, onSave }) {
  const [selected, setSelected] = useState(job.assigned_technician || '')
  const [saving, setSaving] = useState(false)
  const handleSave = async () => {
    setSaving(true); await onSave(selected); setSaving(false)
  }
  return (
    <div className="jd-modal-backdrop" onClick={onClose}>
      <div className="jd-modal" onClick={e => e.stopPropagation()}>
        <div className="jd-modal-header">
          <span className="jd-modal-title">Assign Technician</span>
          <button className="jd-modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="jd-modal-body">
          <label className="jd-modal-label">Select Technician</label>
          <select className="jd-modal-select" value={selected} onChange={e => setSelected(e.target.value)}>
            <option value="">— Unassigned —</option>
            {technicians.map(t => (
              <option key={t.id} value={t.id}>
                {t.full_name || `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.username}
              </option>
            ))}
          </select>
        </div>
        <div className="jd-modal-footer">
          <button className="jd-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="jd-btn-confirm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Assignment'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteModal({ job, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false)
  const handleConfirm = async () => {
    setDeleting(true); await onConfirm(); setDeleting(false)
  }
  return (
    <div className="jd-modal-backdrop" onClick={onClose}>
      <div className="jd-modal" onClick={e => e.stopPropagation()}>
        <div className="jd-modal-header">
          <span className="jd-modal-title">Delete Job</span>
          <button className="jd-modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="jd-modal-body" style={{ textAlign: 'center', paddingTop: 20 }}>
          <div className="jd-delete-icon">
            <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </div>
          <div className="jd-delete-name">Job #{job.id} — {job.customer_name || 'Unknown'}</div>
          <div className="jd-delete-text">
            This job will be permanently deleted. All linked observations, reports, and email logs will also be removed.
          </div>
        </div>
        <div className="jd-modal-footer">
          <button className="jd-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="jd-btn-danger-modal" onClick={handleConfirm} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete Job'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
export default function AdminJobDetailPage() {
  const { id }           = useParams()
  const { user, logout } = useAuth()
  const navigate         = useNavigate()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [job,         setJob]         = useState(null)
  const [observations,setObservations]= useState([])
  const [technicians, setTechnicians] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [saving,      setSaving]      = useState(false)

  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const isMounted = useRef(true)
  const userName     = displayName(user)
  const userInitials = initials(userName)

  /* ── FETCH JOB ── */
  const fetchJob = useCallback(async () => {
    try {
      const res = await api.get(`/jobs/${id}/`)
      if (!isMounted.current) return
      setJob(res.data)
    } catch (e) {
      if (isMounted.current)
        setError(e.response?.data?.error || 'Failed to load job.')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [id])

  /* ── FETCH OBSERVATIONS ── */
  const fetchObservations = useCallback(async () => {
    try {
      const res = await api.get(`/observations/?job=${id}`)
      if (!isMounted.current) return
      setObservations(res.data?.results || res.data || [])
    } catch {
      // observations endpoint may not exist yet — silently ignore
    }
  }, [id])

  /* ── FETCH TECHNICIANS ── */
  const fetchTechnicians = useCallback(async () => {
    try {
      const res = await api.get('/staff/?role=technician')
      if (!isMounted.current) return
      setTechnicians(res.data?.results || res.data || [])
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    isMounted.current = true
    Promise.all([fetchJob(), fetchObservations(), fetchTechnicians()])
    return () => { isMounted.current = false }
  }, [fetchJob, fetchObservations, fetchTechnicians])

  /* ── CHANGE STATUS ── */
  const handleStatusSave = async (status) => {
    try {
      const res = await api.patch(`/jobs/${id}/`, { status })
      setJob(res.data)
    } catch (e) {
      alert('Error: ' + JSON.stringify(e.response?.data))
    }
    setShowStatusModal(false)
  }

  /* ── ASSIGN TECHNICIAN ── */
  const handleAssignSave = async (techId) => {
    try {
      const res = await api.patch(`/jobs/${id}/`, {
        assigned_technician: techId ? parseInt(techId) : null
      })
      setJob(res.data)
    } catch (e) {
      alert('Error: ' + JSON.stringify(e.response?.data))
    }
    setShowAssignModal(false)
  }

  /* ── DELETE ── */
  const handleDelete = async () => {
    try {
      await api.delete(`/jobs/${id}/`)
      navigate('/dashboard/jobs')
    } catch (e) {
      alert('Delete failed: ' + JSON.stringify(e.response?.data))
    }
    setShowDeleteModal(false)
  }

  /* ── LOGOUT ── */
  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  /* ── TIMELINE ── */
  const TimelineBar = ({ status }) => {
    if (status === 'cancelled') {
      return (
        <div className="jd-cancelled-banner">
          <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          This job was cancelled.
        </div>
      )
    }
    const currentStep = STATUS_CONFIG[status]?.step ?? 0
    return (
      <div className="jd-timeline-steps">
        {TIMELINE_STEPS.map((step, i) => {
          const stepNum = STATUS_CONFIG[step.key]?.step ?? i
          const isDone   = stepNum < currentStep
          const isActive = stepNum === currentStep
          return (
            <div key={step.key} className="jd-tl-step">
              <div className={`jd-tl-line${isDone ? ' done' : ''}`}/>
              <div className={`jd-tl-dot${isDone ? ' done' : isActive ? ' active' : ''}`}>
                {isDone && (
                  <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                )}
              </div>
              <div className={`jd-tl-label${isDone ? ' done' : isActive ? ' active' : ''}`}>
                {step.label}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  /* ── RENDER ── */
  if (loading) return (
    <>
      <style>{S}</style>
      <div className="jd-root">
        <div className="jd-main" style={{ marginLeft: 0 }}>
          <div className="jd-loading"><div className="jd-spinner"/>Loading job…</div>
        </div>
      </div>
    </>
  )

  if (error || !job) return (
    <>
      <style>{S}</style>
      <div className="jd-root">
        <div className="jd-main" style={{ marginLeft: 0 }}>
          <div className="jd-content">
            <div className="jd-error">{error || 'Job not found.'}</div>
            <button className="jd-btn jd-btn-secondary" onClick={() => navigate('/dashboard/jobs')}>
              ← Back to Jobs
            </button>
          </div>
        </div>
      </div>
    </>
  )

  const st  = STATUS_CONFIG[job.status] || { label: fmt(job.status), cls: 'pending' }
  const svc = job.service_type ? fmt(job.service_type) : 'Service Job'

  return (
    <>
      <style>{S}</style>
      <div className="jd-root">

        {/* Overlay */}
        <div className={`jd-overlay${sidebarOpen ? ' show' : ''}`} onClick={() => setSidebarOpen(false)}/>

        {/* ── SIDEBAR ── */}
        <aside className={`jd-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="jd-sb-logo">
            <div className="jd-sb-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/></svg>
            </div>
            <span className="jd-sb-brand">PestPro</span>
          </div>
          <nav className="jd-sb-nav">
            {navItems.map(n => (
              <div key={n.id} className={`jd-sb-item${n.id === 'jobs' ? ' active' : ''}`}
                onClick={() => { setSidebarOpen(false); navigate(n.path) }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d={n.d}/>
                </svg>
                {n.label}
              </div>
            ))}
          </nav>
          <div className="jd-sb-user">
            <div className="jd-sb-avatar">{userInitials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="jd-sb-uname">{userName}</div>
              <div className="jd-sb-urole">Administrator</div>
            </div>
            <button className="jd-sb-logout" onClick={handleLogout} title="Logout">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div className="jd-main">

          {/* TOPBAR */}
          <div className="jd-topbar">
            <div className="jd-topbar-left">
              <button className="jd-hamburger" onClick={() => setSidebarOpen(o => !o)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              </button>
              <button className="jd-back-btn" onClick={() => navigate('/dashboard/jobs')}>
                <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                Back
              </button>
              <span className="jd-crumb">
                Admin &nbsp;›&nbsp; All Jobs &nbsp;›&nbsp; <span>Job #{job.id}</span>
              </span>
            </div>
          </div>

          {/* CONTENT */}
          <div className="jd-content">

            {/* PAGE HEADER */}
            <div className="jd-page-header">
              <div className="jd-page-header-left">
                <div className="jd-job-title">{svc} — {job.customer_name || '—'}</div>
                <div className="jd-job-meta-row">
                  <span className="jd-job-id-tag">JOB #{job.id}</span>
                  <span className={`jd-badge ${st.cls}`}>{st.label}</span>
                </div>
              </div>
              <div className="jd-page-header-right">
                <button className="jd-btn jd-btn-blue" onClick={() => setShowAssignModal(true)}>
                  <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
                  Assign
                </button>
                <button className="jd-btn jd-btn-amber" onClick={() => setShowStatusModal(true)}>
                  <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  Status
                </button>
                {job.is_report_sent && (
                  <button className="jd-btn jd-btn-secondary"
                    onClick={() => window.open(`/api/jobs/${id}/report/`, '_blank')}>
                    <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    PDF Report
                  </button>
                )}
                <button className="jd-btn jd-btn-danger" onClick={() => setShowDeleteModal(true)}>
                  <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  Delete
                </button>
              </div>
            </div>

            {/* MAIN GRID */}
            <div className="jd-grid">

              {/* LEFT COLUMN */}
              <div className="jd-grid-left">

                {/* STATUS TIMELINE */}
                <div className="jd-card">
                  <div className="jd-card-header">
                    <span className="jd-card-title">
                      <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                      Job Progress
                    </span>
                  </div>
                  <div className="jd-timeline">
                    <TimelineBar status={job.status}/>
                  </div>
                </div>

                {/* JOB DETAILS */}
                <div className="jd-card">
                  <div className="jd-card-header">
                    <span className="jd-card-title">
                      <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      Job Details
                    </span>
                  </div>
                  <div className="jd-card-body">
                    <div className="jd-info-row">
                      <span className="jd-info-label">Service Type</span>
                      <span className="jd-info-value">{svc}</span>
                    </div>
                    <div className="jd-info-row">
                      <span className="jd-info-label">Site Address</span>
                      <span className="jd-info-value">{job.site_address || <span className="muted">—</span>}</span>
                    </div>
                    <div className="jd-info-row">
                      <span className="jd-info-label">Scheduled</span>
                      <span className="jd-info-value">{fmtDateTime(job.scheduled_datetime)}</span>
                    </div>
                    <div className="jd-info-row">
                      <span className="jd-info-label">Started At</span>
                      <span className="jd-info-value">{fmtDateTime(job.started_at)}</span>
                    </div>
                    <div className="jd-info-row">
                      <span className="jd-info-label">Completed At</span>
                      <span className="jd-info-value">{fmtDateTime(job.completed_at)}</span>
                    </div>
                    <div className="jd-info-row">
                      <span className="jd-info-label">Created By</span>
                      <span className="jd-info-value">{fmt(job.created_by_role || '—')}</span>
                    </div>
                    <div className="jd-info-row">
                      <span className="jd-info-label">Sign Required</span>
                      <span className="jd-info-value">{job.customer_sign_required ? 'Yes' : 'No'}</span>
                    </div>
                    {job.completion_notes && (
                      <div className="jd-info-row">
                        <span className="jd-info-label">Completion Notes</span>
                        <span className="jd-info-value">{job.completion_notes}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* OBSERVATIONS */}
                <div className="jd-card">
                  <div className="jd-card-header">
                    <span className="jd-card-title">
                      <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      Observations
                      {observations.length > 0 && (
                        <span style={{ fontSize: 11, background: 'var(--green-light)', color: 'var(--green)',
                          padding: '2px 8px', borderRadius: 10, marginLeft: 4 }}>
                          {observations.length}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="jd-card-body">
                    {observations.length === 0 ? (
                      <div className="jd-obs-empty">
                        <div className="jd-obs-empty-icon">🔍</div>
                        No observations recorded yet.
                      </div>
                    ) : (
                      <div className="jd-obs-list">
                        {observations.map((obs, i) => (
                          <div key={obs.id || i} className="jd-obs-card">
                            <div className="jd-obs-header">
                              <span className="jd-obs-cat">
                                <span className="jd-obs-cat-dot"/>
                                {fmt(obs.observation_category)} Observation
                              </span>
                              <span className="jd-obs-time">
                                {fmtDateTime(obs.observation_time)}
                                {obs.recorded_by_name ? ` · ${obs.recorded_by_name}` : ''}
                              </span>
                            </div>
                            <div className="jd-obs-body">
                              <ObsDetail obs={obs}/>
                              {obs.notes && (
                                <div className="jd-obs-notes" style={{ marginTop: 8 }}>
                                  Notes: {obs.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* SIGNATURE */}
                {job.signed_by && (
                  <div className="jd-card">
                    <div className="jd-card-header">
                      <span className="jd-card-title">
                        <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                        Digital Signature
                      </span>
                    </div>
                    <div className="jd-card-body">
                      <div className="jd-signature-label">Signed by Technician</div>
                      <div className="jd-signature-box">{job.signed_by}</div>
                      {job.customer_signed_at && (
                        <div style={{ fontSize: 11, color: 'var(--pale)', marginTop: 8 }}>
                          Signed at {fmtDateTime(job.customer_signed_at)}
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* RIGHT COLUMN */}
              <div className="jd-grid-right">

                {/* CUSTOMER INFO */}
                <div className="jd-card">
                  <div className="jd-card-header">
                    <span className="jd-card-title">
                      <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                      Customer
                    </span>
                  </div>
                  <div className="jd-card-body">
                    <div className="jd-info-row">
                      <span className="jd-info-label">Name</span>
                      <span className="jd-info-value">{job.customer_name || '—'}</span>
                    </div>
                    <div className="jd-info-row">
                      <span className="jd-info-label">Email</span>
                      <span className="jd-info-value">{job.customer_email || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* TECHNICIAN INFO */}
                <div className="jd-card">
                  <div className="jd-card-header">
                    <span className="jd-card-title">
                      <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                      Technician
                    </span>
                    <button className="jd-btn jd-btn-blue" style={{ padding: '4px 10px', fontSize: 11.5 }}
                      onClick={() => setShowAssignModal(true)}>
                      Reassign
                    </button>
                  </div>
                  <div className="jd-card-body">
                    {job.technician_name ? (
                      <>
                        <div className="jd-info-row">
                          <span className="jd-info-label">Name</span>
                          <span className="jd-info-value">{job.technician_name}</span>
                        </div>
                        <div className="jd-info-row">
                          <span className="jd-info-label">Email</span>
                          <span className="jd-info-value">{job.technician_email || '—'}</span>
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 13, color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>⚠</span> Not assigned yet
                      </div>
                    )}
                  </div>
                </div>

                {/* PDF REPORT */}
                <div className="jd-card">
                  <div className="jd-card-header">
                    <span className="jd-card-title">
                      <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                      PDF Report
                    </span>
                  </div>
                  <div className="jd-card-body">
                    {job.is_report_sent ? (
                      <div className="jd-pdf-row">
                        <div className="jd-pdf-icon">
                          <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                        </div>
                        <div className="jd-pdf-info">
                          <div className="jd-pdf-name">Job_{job.id}_Report.pdf</div>
                          <div className="jd-pdf-sub">Report sent to customer</div>
                        </div>
                        <button className="jd-btn jd-btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}
                          onClick={() => window.open(`/api/jobs/${id}/report/`, '_blank')}>
                          <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                          Download
                        </button>
                      </div>
                    ) : (
                      <div className="jd-pdf-not-ready">
                        Report not generated yet. Complete the job to generate the PDF.
                      </div>
                    )}
                  </div>
                </div>

                {/* JOB META */}
                <div className="jd-card">
                  <div className="jd-card-header">
                    <span className="jd-card-title">
                      <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      Timestamps
                    </span>
                  </div>
                  <div className="jd-card-body">
                    <div className="jd-info-row">
                      <span className="jd-info-label">Created</span>
                      <span className="jd-info-value">{fmtDateTime(job.created_at)}</span>
                    </div>
                    <div className="jd-info-row">
                      <span className="jd-info-label">Last Updated</span>
                      <span className="jd-info-value">{fmtDateTime(job.updated_at)}</span>
                    </div>
                    <div className="jd-info-row">
                      <span className="jd-info-label">Job UUID</span>
                      <span className="jd-info-value" style={{ fontSize: 11, color: 'var(--pale)', wordBreak: 'break-all' }}>
                        {job.job_uuid}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}
      {showStatusModal && (
        <StatusModal job={job} onClose={() => setShowStatusModal(false)} onSave={handleStatusSave}/>
      )}
      {showAssignModal && (
        <AssignModal job={job} technicians={technicians}
          onClose={() => setShowAssignModal(false)} onSave={handleAssignSave}/>
      )}
      {showDeleteModal && (
        <DeleteModal job={job} onClose={() => setShowDeleteModal(false)} onConfirm={handleDelete}/>
      )}
    </>
  )
}