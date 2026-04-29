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

const AUTO_REFRESH_SECS = 30

const STATUS_CONFIG = {
  scheduled:             { label: 'Scheduled',     cls: 'pending'    },
  in_progress:           { label: 'In Progress',   cls: 'inprogress' },
  observations_recorded: { label: 'Obs. Recorded', cls: 'obs'        },
  completed:             { label: 'Completed',     cls: 'done'       },
  report_sent:           { label: 'Report Sent',   cls: 'done'       },
  cancelled:             { label: 'Cancelled',     cls: 'cancelled'  },
}

const ALL_STATUSES = ['scheduled', 'in_progress', 'observations_recorded', 'completed', 'report_sent', 'cancelled']

const FILTER_TABS = [
  { key: 'all',                   label: 'All'           },
  { key: 'scheduled',             label: 'Scheduled'     },
  { key: 'in_progress',           label: 'In Progress'   },
  { key: 'observations_recorded', label: 'Obs. Recorded' },
  { key: 'completed',             label: 'Completed'     },
  { key: 'cancelled',             label: 'Cancelled'     },
]

const SERVICE_TYPES = [
  'rodent_control', 'flying_insect', 'cockroach',
  'termite', 'mosquito', 'general', 'bed_bug',
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
.aj-root{font-family:'DM Serif Display',serif;min-height:100vh;background:var(--bg);display:flex;}

/* ── SIDEBAR ── */
.aj-sidebar{width:var(--sidebar-w);background:var(--white);border-right:1px solid var(--border);
  display:flex;flex-direction:column;min-height:100vh;
  position:fixed;top:0;left:0;bottom:0;z-index:200;overflow-y:auto;
  transition:transform .25s ease;}
.aj-sb-logo{padding:16px 20px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border);}
.aj-sb-icon{width:28px;height:28px;background:var(--green);border-radius:6px;
  display:flex;align-items:center;justify-content:center;}
.aj-sb-icon svg{width:15px;height:15px;fill:white;}
.aj-sb-brand{font-size:16px;color:var(--ink);}
.aj-sb-nav{padding:12px 10px;flex:1;}
.aj-sb-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;
  cursor:pointer;margin-bottom:2px;color:var(--muted);font-size:13.5px;
  transition:background .15s,color .15s;white-space:nowrap;}
.aj-sb-item:hover{background:var(--bg);color:var(--ink);}
.aj-sb-item.active{background:var(--green-light);color:var(--green);}
.aj-sb-item svg{width:16px;height:16px;flex-shrink:0;}
.aj-sb-user{padding:14px 16px;border-top:1px solid var(--border);
  display:flex;align-items:center;gap:10px;flex-shrink:0;}
.aj-sb-avatar{width:32px;height:32px;background:var(--green);border-radius:50%;
  display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;flex-shrink:0;}
.aj-sb-uname{font-size:13px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.aj-sb-urole{font-size:11px;color:var(--pale);}
.aj-sb-logout{background:none;border:none;cursor:pointer;color:var(--pale);
  padding:4px;border-radius:6px;display:flex;align-items:center;margin-left:auto;
  transition:color .15s,background .15s;}
.aj-sb-logout:hover{color:var(--red);background:#fde8e8;}

/* ── OVERLAY ── */
.aj-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:150;}
.aj-overlay.show{display:block;}

/* ── HAMBURGER ── */
.aj-hamburger{display:none;background:none;border:none;cursor:pointer;
  padding:4px;border-radius:6px;color:var(--ink);}
.aj-hamburger svg{width:20px;height:20px;}

/* ── MAIN ── */
.aj-main{flex:1;margin-left:var(--sidebar-w);display:flex;flex-direction:column;min-height:100vh;}

/* ── TOPBAR ── */
.aj-topbar{background:var(--white);border-bottom:1px solid var(--border);
  padding:0 24px;height:52px;display:flex;align-items:center;
  justify-content:space-between;position:sticky;top:0;z-index:100;flex-shrink:0;gap:12px;}
.aj-topbar-left{display:flex;align-items:center;gap:10px;}
.aj-crumb{font-size:13px;color:var(--pale);}
.aj-crumb span{color:var(--ink);}
.aj-topbar-right{display:flex;align-items:center;gap:10px;}
.aj-ticker{font-size:12px;color:var(--pale);white-space:nowrap;}
.aj-ticker.soon{color:var(--green);}
.aj-refresh-btn{background:var(--bg);color:var(--ink);border:1.5px solid var(--border);
  border-radius:9px;padding:7px 14px;font-family:'DM Serif Display',serif;font-size:13px;
  cursor:pointer;display:flex;align-items:center;gap:6px;transition:background .15s;}
.aj-refresh-btn:hover{background:#e2e8e2;}
.aj-refresh-btn svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2;
  transition:transform .35s;}
.aj-refresh-btn.spinning svg{animation:ajSpin .55s linear;}
@keyframes ajSpin{to{transform:rotate(360deg);}}
.aj-create-btn{background:var(--green);color:#fff;border:none;border-radius:9px;
  padding:7px 16px;font-family:'DM Serif Display',serif;font-size:13px;
  cursor:pointer;display:flex;align-items:center;gap:6px;transition:background .15s;white-space:nowrap;}
.aj-create-btn:hover{background:var(--green-dark);}
.aj-create-btn svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2.5;}

/* ── CONTENT ── */
.aj-content{padding:22px 24px;flex:1;}
.aj-page-title{font-size:22px;color:var(--ink);margin-bottom:3px;}
.aj-page-sub{font-size:13px;color:var(--pale);margin-bottom:20px;font-style:italic;}

/* ── STATS ── */
.aj-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-bottom:20px;}
.aj-stat{background:var(--white);border-radius:14px;padding:16px 18px;
  box-shadow:0 1px 8px rgba(0,0,0,.05);}
.aj-stat-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;
  color:var(--pale);margin-bottom:6px;}
.aj-stat-val{font-size:28px;color:var(--ink);letter-spacing:-1px;line-height:1;}
.aj-stat-val.green{color:var(--green);}
.aj-stat-val.amber{color:var(--amber);}
.aj-stat-val.red{color:var(--red);}
.aj-stat-val.blue{color:var(--blue);}
.aj-stat-val.purple{color:var(--purple);}
.aj-stat-sub{font-size:11px;color:var(--muted);margin-top:4px;}

/* ── FILTER TABS ── */
.aj-tabs{display:flex;gap:6px;margin-bottom:18px;flex-wrap:wrap;}
.aj-tab{padding:7px 16px;border-radius:20px;font-family:'DM Serif Display',serif;
  font-size:12.5px;cursor:pointer;border:1.5px solid var(--border);
  background:var(--white);color:var(--muted);transition:all .15s;white-space:nowrap;}
.aj-tab:hover{border-color:var(--green);color:var(--green);}
.aj-tab.active{background:var(--green);color:#fff;border-color:var(--green);}
.aj-tab-count{background:rgba(255,255,255,.25);border-radius:10px;
  padding:1px 6px;font-size:11px;margin-left:5px;}
.aj-tab:not(.active) .aj-tab-count{background:var(--bg);color:var(--muted);}

/* ── CONTROLS ── */
.aj-controls{display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap;}
.aj-search-wrap{flex:1;min-width:200px;position:relative;}
.aj-search-wrap svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);
  width:15px;height:15px;color:var(--pale);pointer-events:none;}
.aj-search{width:100%;border:1.5px solid var(--border);border-radius:10px;
  padding:9px 14px 9px 36px;font-family:'DM Serif Display',serif;font-size:13px;
  color:var(--ink);outline:none;background:var(--white);transition:border-color .2s;}
.aj-search:focus{border-color:var(--green);}
.aj-filter-select{border:1.5px solid var(--border);border-radius:10px;
  padding:9px 14px;font-family:'DM Serif Display',serif;font-size:13px;
  color:var(--ink);outline:none;background:var(--white);cursor:pointer;
  transition:border-color .2s;min-width:160px;}
.aj-filter-select:focus{border-color:var(--green);}

/* ── JOBS HEADER ── */
.aj-jobs-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
.aj-jobs-title{font-size:15px;color:var(--ink);}
.aj-jobs-sort-lbl{font-size:12px;color:var(--pale);}

/* ── JOB CARDS ── */
.aj-job-card{background:var(--white);border-radius:14px;padding:16px 20px;
  margin-bottom:10px;display:flex;align-items:flex-start;gap:16px;
  box-shadow:0 1px 6px rgba(0,0,0,.05);transition:box-shadow .15s,transform .15s;
  cursor:pointer;}
.aj-job-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.1);transform:translateY(-1px);}
.aj-job-num{width:36px;height:36px;border-radius:10px;background:var(--green-light);
  display:flex;align-items:center;justify-content:center;
  font-size:13px;color:var(--green);flex-shrink:0;margin-top:2px;}
.aj-job-body{flex:1;min-width:0;}
.aj-job-top{display:flex;align-items:center;gap:8px;margin-bottom:5px;flex-wrap:wrap;}
.aj-job-id{font-size:10px;color:var(--pale);text-transform:uppercase;letter-spacing:.6px;}
.aj-job-name{font-size:15px;color:var(--ink);margin-bottom:2px;}
.aj-job-meta{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:4px;}
.aj-job-customer{font-size:13px;color:var(--muted);display:flex;align-items:center;gap:4px;}
.aj-job-customer svg{width:11px;height:11px;flex-shrink:0;}
.aj-job-tech{font-size:12px;color:var(--blue);display:flex;align-items:center;gap:4px;
  background:#eff6ff;padding:3px 8px;border-radius:6px;}
.aj-job-tech svg{width:11px;height:11px;flex-shrink:0;}
.aj-job-tech.unassigned{color:var(--amber);background:#fff8ec;}
.aj-job-addr{font-size:12px;color:var(--pale);display:flex;align-items:center;gap:4px;margin-bottom:3px;}
.aj-job-addr svg{width:11px;height:11px;flex-shrink:0;}
.aj-job-time{font-size:12px;color:var(--muted);display:flex;align-items:center;gap:4px;}
.aj-job-time svg{width:11px;height:11px;flex-shrink:0;}
.aj-job-actions{display:flex;align-items:center;gap:8px;flex-shrink:0;flex-wrap:wrap;margin-top:2px;}

/* ── STATUS BADGES ── */
.aj-badge{font-size:11.5px;padding:4px 12px;border-radius:6px;white-space:nowrap;flex-shrink:0;}
.aj-badge.pending{background:#fff8ec;color:var(--amber);}
.aj-badge.inprogress{background:var(--green-light);color:var(--green);}
.aj-badge.obs{background:#eff6ff;color:var(--blue);}
.aj-badge.done{background:#f0f2f0;color:var(--muted);}
.aj-badge.cancelled{background:#fde8e8;color:var(--red);}

/* ── ACTION BUTTONS ── */
.aj-btn-assign{background:#eff6ff;color:var(--blue);border:none;border-radius:8px;
  padding:7px 14px;font-family:'DM Serif Display',serif;font-size:12.5px;
  cursor:pointer;display:flex;align-items:center;gap:5px;transition:background .15s;white-space:nowrap;}
.aj-btn-assign:hover{background:#dbeafe;}
.aj-btn-assign svg{width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2;}
.aj-btn-status{background:#fff8ec;color:var(--amber);border:none;border-radius:8px;
  padding:7px 14px;font-family:'DM Serif Display',serif;font-size:12.5px;
  cursor:pointer;display:flex;align-items:center;gap:5px;transition:background .15s;white-space:nowrap;}
.aj-btn-status:hover{background:#fde8c0;}
.aj-btn-status svg{width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2;}
.aj-btn-view{background:var(--green);color:#fff;border:none;border-radius:8px;
  padding:7px 14px;font-family:'DM Serif Display',serif;font-size:12.5px;
  cursor:pointer;transition:background .15s;white-space:nowrap;}
.aj-btn-view:hover{background:#155a32;}
.aj-btn-delete{background:#fde8e8;color:var(--red);border:none;border-radius:8px;
  padding:7px 10px;font-family:'DM Serif Display',serif;font-size:12.5px;
  cursor:pointer;display:flex;align-items:center;transition:background .15s;}
.aj-btn-delete:hover{background:#f5c6c6;}
.aj-btn-delete svg{width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2;}

/* ── EMPTY STATE ── */
.aj-empty{text-align:center;padding:60px 20px;}
.aj-empty-icon{font-size:40px;margin-bottom:12px;}
.aj-empty-title{font-size:18px;color:var(--ink);margin-bottom:6px;}
.aj-empty-sub{font-size:13px;color:var(--pale);}

/* ── LOADING ── */
.aj-loading{display:flex;align-items:center;justify-content:center;
  padding:60px;color:var(--pale);font-size:14px;gap:10px;}
.aj-spinner{width:20px;height:20px;border:2px solid var(--border);
  border-top-color:var(--green);border-radius:50%;animation:ajSpinner .8s linear infinite;}
@keyframes ajSpinner{to{transform:rotate(360deg);}}

/* ── ERROR ── */
.aj-error{background:#fde8e8;color:var(--red);padding:12px 16px;
  border-radius:10px;font-size:13px;margin-bottom:16px;}

/* ══════════════════
   MODAL BASE
══════════════════ */
.aj-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:500;
  display:flex;align-items:center;justify-content:center;padding:20px;}
.aj-modal{background:var(--white);border-radius:16px;width:100%;max-width:480px;
  box-shadow:0 20px 60px rgba(0,0,0,.15);overflow:hidden;}
.aj-modal-header{padding:20px 24px 16px;border-bottom:1px solid var(--border);
  display:flex;align-items:center;justify-content:space-between;}
.aj-modal-title{font-size:17px;color:var(--ink);}
.aj-modal-close{background:none;border:none;cursor:pointer;color:var(--pale);
  padding:4px;border-radius:6px;display:flex;align-items:center;transition:color .15s;}
.aj-modal-close:hover{color:var(--ink);}
.aj-modal-body{padding:20px 24px;}
.aj-modal-footer{padding:16px 24px;border-top:1px solid var(--border);
  display:flex;justify-content:flex-end;gap:10px;}
.aj-modal-label{font-size:12px;color:var(--muted);margin-bottom:6px;display:block;}
.aj-modal-select{width:100%;border:1.5px solid var(--border);border-radius:10px;
  padding:10px 14px;font-family:'DM Serif Display',serif;font-size:13.5px;
  color:var(--ink);outline:none;background:var(--white);cursor:pointer;margin-bottom:14px;
  transition:border-color .2s;}
.aj-modal-select:focus{border-color:var(--green);}
.aj-modal-input{width:100%;border:1.5px solid var(--border);border-radius:10px;
  padding:10px 14px;font-family:'DM Serif Display',serif;font-size:13.5px;
  color:var(--ink);outline:none;background:var(--white);margin-bottom:14px;
  transition:border-color .2s;}
.aj-modal-input:focus{border-color:var(--green);}
.aj-modal-textarea{width:100%;border:1.5px solid var(--border);border-radius:10px;
  padding:10px 14px;font-family:'DM Serif Display',serif;font-size:13.5px;
  color:var(--ink);outline:none;background:var(--white);margin-bottom:14px;
  resize:vertical;min-height:80px;transition:border-color .2s;}
.aj-modal-textarea:focus{border-color:var(--green);}
.aj-modal-hint{font-size:12px;color:var(--pale);margin-top:-10px;margin-bottom:14px;}
.aj-btn-cancel{background:var(--bg);color:var(--muted);border:1.5px solid var(--border);
  border-radius:9px;padding:8px 20px;font-family:'DM Serif Display',serif;font-size:13px;
  cursor:pointer;transition:background .15s;}
.aj-btn-cancel:hover{background:#e2e8e2;}
.aj-btn-confirm{background:var(--green);color:#fff;border:none;border-radius:9px;
  padding:8px 20px;font-family:'DM Serif Display',serif;font-size:13px;
  cursor:pointer;transition:background .15s;}
.aj-btn-confirm:hover{background:var(--green-dark);}
.aj-btn-confirm:disabled{opacity:.5;cursor:not-allowed;}
.aj-btn-danger{background:var(--red);color:#fff;border:none;border-radius:9px;
  padding:8px 20px;font-family:'DM Serif Display',serif;font-size:13px;
  cursor:pointer;transition:background .15s;}
.aj-btn-danger:hover{background:#c0392b;}

/* Delete confirm */
.aj-delete-icon{width:52px;height:52px;background:#fde8e8;border-radius:50%;
  display:flex;align-items:center;justify-content:center;margin:0 auto 14px;}
.aj-delete-icon svg{width:24px;height:24px;stroke:var(--red);fill:none;stroke-width:2;}
.aj-delete-text{text-align:center;font-size:14px;color:var(--muted);line-height:1.6;}
.aj-delete-name{font-size:16px;color:var(--ink);text-align:center;margin-bottom:6px;}

/* Create Job form */
.aj-form-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.aj-form-col{display:flex;flex-direction:column;}

/* ── RESPONSIVE ── */
@media(max-width:1100px){
  .aj-stats{grid-template-columns:repeat(3,1fr);}
}
@media(max-width:900px){
  .aj-stats{grid-template-columns:repeat(2,1fr);}
}
@media(max-width:768px){
  .aj-sidebar{transform:translateX(-100%);}
  .aj-sidebar.open{transform:translateX(0);}
  .aj-main{margin-left:0;}
  .aj-hamburger{display:flex;}
  .aj-job-card{flex-wrap:wrap;}
  .aj-job-actions{width:100%;justify-content:flex-end;}
  .aj-create-btn span{display:none;}
  .aj-form-row{grid-template-columns:1fr;}
}
@media(max-width:600px){
  .aj-stats{grid-template-columns:1fr 1fr;gap:10px;}
  .aj-content{padding:14px;}
  .aj-topbar{padding:0 14px;}
  .aj-stat-val{font-size:22px;}
}
`

/* ─────────────────────────────────────────────
   NAV ITEMS  (admin sidebar)
───────────────────────────────────────────── */
const navItems = [
  { id: 'dashboard',    label: 'Dashboard',     path: '/dashboard',             d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'jobs',         label: 'All Jobs',       path: '/dashboard/jobs',        d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'customers',    label: 'Customers',      path: '/dashboard/customers',   d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'technicians',  label: 'Technicians',    path: '/dashboard/technicians', d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { id: 'reports',      label: 'Reports',        path: '/dashboard/reports',     d: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'alerts',       label: 'Smart Alerts',   path: '/dashboard/alerts',      d: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { id: 'settings',     label: 'Settings',       path: '/dashboard/settings',    d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1。724 0 00-1。065-2。572c-1。756-.426-1。756-２。9２４ ０-３。３５a１。７２４ １。７２４ ０ ００１。０６６-２。５７３c-.９４-１。５４３ .８２６-３。３１ ２。３７-２。３７ .９９６ .６０８ ２。２９６ .０７ ２。５７２-１。０６５z M１５１２a３３０１１ -６０１１６ａ３ａ３ａ０ｚ' },
]

/* ═══════════════════════════════════════════
   MODALS
═══════════════════════════════════════════ */

/* ── Assign Technician Modal ── */
function AssignModal({ job, technicians, onClose, onSave }) {
  const [selected, setSelected] = useState(
    job.assigned_technician || job.technician_id || ''
  )
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onSave(job.id, selected)
    setSaving(false)
  }

  return (
    <div className="aj-modal-backdrop" onClick={onClose}>
      <div className="aj-modal" onClick={e => e.stopPropagation()}>
        <div className="aj-modal-header">
          <span className="aj-modal-title">Assign Technician</span>
          <button className="aj-modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="aj-modal-body">
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
            Job <strong style={{ color: 'var(--ink)' }}>#{job.id}</strong> —{' '}
            {job.service_type ? fmt(job.service_type) : 'Service Job'}
            {job.customer_name ? ` · ${job.customer_name}` : ''}
          </div>
          <label className="aj-modal-label">Select Technician</label>
          <select
            className="aj-modal-select"
            value={selected}
            onChange={e => setSelected(e.target.value)}
          >
            <option value="">— Unassigned —</option>
            {technicians.map(t => (
              <option key={t.id} value={t.id}>
                {t.full_name || `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.username}
              </option>
            ))}
          </select>
        </div>
        <div className="aj-modal-footer">
          <button className="aj-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="aj-btn-confirm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Assignment'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Change Status Modal ── */
function StatusModal({ job, onClose, onSave }) {
  const [selected, setSelected] = useState(job.status || 'scheduled')
  const [saving, setSaving]     = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onSave(job.id, selected)
    setSaving(false)
  }

  return (
    <div className="aj-modal-backdrop" onClick={onClose}>
      <div className="aj-modal" onClick={e => e.stopPropagation()}>
        <div className="aj-modal-header">
          <span className="aj-modal-title">Change Job Status</span>
          <button className="aj-modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="aj-modal-body">
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
            Job <strong style={{ color: 'var(--ink)' }}>#{job.id}</strong> —{' '}
            {job.customer_name || 'Unknown Customer'}
          </div>
          <label className="aj-modal-label">New Status</label>
          <select
            className="aj-modal-select"
            value={selected}
            onChange={e => setSelected(e.target.value)}
          >
            {ALL_STATUSES.map(s => (
              <option key={s} value={s}>{fmt(s)}</option>
            ))}
          </select>
          <p className="aj-modal-hint">
            Note: Status changes made here override the technician's current progress.
          </p>
        </div>
        <div className="aj-modal-footer">
          <button className="aj-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="aj-btn-confirm" onClick={handleSave} disabled={saving || selected === job.status}>
            {saving ? 'Saving…' : 'Update Status'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Delete Confirm Modal ── */
function DeleteModal({ job, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false)

  const handleConfirm = async () => {
    setDeleting(true)
    await onConfirm(job.id)
    setDeleting(false)
  }

  const svc = job.service_type
    ? fmt(job.service_type)
    : job.title || 'Service Job'

  return (
    <div className="aj-modal-backdrop" onClick={onClose}>
      <div className="aj-modal" onClick={e => e.stopPropagation()}>
        <div className="aj-modal-header">
          <span className="aj-modal-title">Delete Job</span>
          <button className="aj-modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="aj-modal-body" style={{ textAlign: 'center', paddingTop: 24 }}>
          <div className="aj-delete-icon">
            <svg viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </div>
          <div className="aj-delete-name">{svc} — {job.customer_name || 'Unknown'}</div>
          <div className="aj-delete-text">
            Job <strong>#{job.id}</strong> will be permanently deleted. This cannot be undone.
            All linked observations, reports, and email logs will also be removed.
          </div>
        </div>
        <div className="aj-modal-footer">
          <button className="aj-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="aj-btn-danger" onClick={handleConfirm} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete Job'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Create Job Modal ── */
function CreateModal({ customers, technicians, onClose, onSave }) {
  const [form, setForm] = useState({
    customer:           '',
    service_type:       '',
    assigned_technician: '',
    site_address:       '',
    scheduled_datetime: '',
    notes:              '',
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const isValid = form.customer && form.service_type && form.scheduled_datetime

  const handleSave = async () => {
    if (!isValid) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="aj-modal-backdrop" onClick={onClose}>
      <div className="aj-modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="aj-modal-header">
          <span className="aj-modal-title">Create New Job</span>
          <button className="aj-modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="aj-modal-body">
          <div className="aj-form-row">
            <div className="aj-form-col">
              <label className="aj-modal-label">Customer *</label>
              <select className="aj-modal-select" value={form.customer} onChange={e => set('customer', e.target.value)}>
                <option value="">— Select Customer —</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name || c.company_name || `Customer #${c.id}`}</option>
                ))}
              </select>
            </div>
            <div className="aj-form-col">
              <label className="aj-modal-label">Service Type *</label>
              <select className="aj-modal-select" value={form.service_type} onChange={e => set('service_type', e.target.value)}>
                <option value="">— Select Type —</option>
                {SERVICE_TYPES.map(s => (
                  <option key={s} value={s}>{fmt(s)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="aj-form-row">
            <div className="aj-form-col">
              <label className="aj-modal-label">Assign Technician</label>
              <select className="aj-modal-select" value={form.assigned_technician} onChange={e => set('assigned_technician', e.target.value)}>
                <option value="">— Unassigned —</option>
                {technicians.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.full_name || `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.username}
                  </option>
                ))}
              </select>
            </div>
            <div className="aj-form-col">
              <label className="aj-modal-label">Scheduled Date & Time *</label>
              <input
                type="datetime-local"
                className="aj-modal-input"
                value={form.scheduled_datetime}
                onChange={e => set('scheduled_datetime', e.target.value)}
              />
            </div>
          </div>
          <label className="aj-modal-label">Site Address</label>
          <input
            className="aj-modal-input"
            placeholder="e.g. 12 Park St, Vadodara"
            value={form.site_address}
            onChange={e => set('site_address', e.target.value)}
          />
          <label className="aj-modal-label">Notes (optional)</label>
          <textarea
            className="aj-modal-textarea"
            placeholder="Any instructions for the technician…"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
          />
        </div>
        <div className="aj-modal-footer">
          <button className="aj-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="aj-btn-confirm" onClick={handleSave} disabled={!isValid || saving}>
            {saving ? 'Creating…' : 'Create Job'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export default function AdminJobsPage() {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()

  /* ── UI ── */
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeNav,   setActiveNav]   = useState('jobs')

  /* ── API data ── */
  const [jobs,        setJobs]        = useState([])
  const [technicians, setTechnicians] = useState([])
  const [customers,   setCustomers]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')

  /* ── Filters ── */
  const [activeTab,    setActiveTab]    = useState('all')
  const [search,       setSearch]       = useState('')
  const [sortBy,       setSortBy]       = useState('date_asc')
  const [filterTech,   setFilterTech]   = useState('')
  const [isSpinning,   setIsSpinning]   = useState(false)

  /* ── Modals ── */
  const [assignModal, setAssignModal] = useState(null)   // job object
  const [statusModal, setStatusModal] = useState(null)   // job object
  const [deleteModal, setDeleteModal] = useState(null)   // job object
  const [createModal, setCreateModal] = useState(false)

  /* ── Auto-refresh ── */
  const [countdown, setCountdown] = useState(AUTO_REFRESH_SECS)
  const tickRef   = useRef(null)
  const isMounted = useRef(true)

  const userName     = displayName(user)
  const userInitials = initials(userName)

  /* ── FETCH JOBS ── */
  const fetchJobs = useCallback(async (silent = false) => {
    if (!silent) setError('')
    try {
      const res = await api.get('/jobs/')
      if (!isMounted.current) return
      setJobs(res.data?.results || res.data || [])
    } catch (e) {
      if (!silent && isMounted.current)
        setError(e.response?.data?.error || 'Failed to load jobs.')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [])

  /* ── FETCH TECHNICIANS + CUSTOMERS ── */
// REPLACE WITH:
const fetchSupportData = useCallback(async () => {
  try {
    const [techRes, custRes] = await Promise.all([
      api.get('/staff/?role=technician'),   // ✅ correct endpoint
      api.get('/customers/')                // ✅ correct endpoint
    ])
    if (!isMounted.current) return
    const techs = techRes.data?.results || techRes.data || []
    const custs = custRes.data?.results  || custRes.data  || []
    console.log('[techs]', techs)
    console.log('[custs]', custs)
    setTechnicians(Array.isArray(techs) ? techs : [])
    setCustomers(Array.isArray(custs) ? custs : [])
  } catch (e) {
    console.error('[fetchSupportData]', e.response?.status, e.response?.data || e.message)
  }
}, [])
  /* ── AUTO REFRESH ── */
  const resetTimer = useCallback(() => {
    clearInterval(tickRef.current)
    setCountdown(AUTO_REFRESH_SECS)
    tickRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { fetchJobs(true); return AUTO_REFRESH_SECS }
        return c - 1
      })
    }, 1000)
  }, [fetchJobs])

  useEffect(() => {
    isMounted.current = true
    Promise.all([fetchJobs(), fetchSupportData()]).then(resetTimer)
    return () => {
      isMounted.current = false
      clearInterval(tickRef.current)
    }
  }, [fetchJobs, fetchSupportData, resetTimer])

  /* ── MANUAL REFRESH ── */
  const manualRefresh = () => {
    setIsSpinning(true)
    fetchJobs(true).then(() => {
      resetTimer()
      setTimeout(() => setIsSpinning(false), 550)
    })
  }

  /* ── LOGOUT ── */
  const handleLogout = async () => {
    clearInterval(tickRef.current)
    await logout()
    navigate('/login')
  }

  /* ── ASSIGN TECHNICIAN ── */
  const handleAssignSave = async (jobId, techId) => {
    try {
      await api.patch(`/jobs/${jobId}/`, { assigned_technician: techId || null })
      setJobs(prev => prev.map(j =>
        j.id === jobId ? { ...j, assigned_technician: techId || null } : j
      ))
    } catch { /* handle error */ }
    setAssignModal(null)
  }

  /* ── CHANGE STATUS ── */
  const handleStatusSave = async (jobId, status) => {
    try {
      await api.patch(`/jobs/${jobId}/`, { status })
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status } : j))
    } catch { /* handle error */ }
    setStatusModal(null)
  }

  /* ── DELETE JOB ── */
  const handleDeleteConfirm = async (jobId) => {
    try {
      await api.delete(`/jobs/${jobId}/`)
      setJobs(prev => prev.filter(j => j.id !== jobId))
    } catch { /* handle error */ }
    setDeleteModal(null)
  }

  /* ── CREATE JOB ── */
  const handleCreateSave = async (form) => {
  try {
    const payload = {
      customer:            parseInt(form.customer),
      service_type:        form.service_type,
      assigned_technician: form.assigned_technician ? parseInt(form.assigned_technician) : null,
      site_address:        form.site_address || '',
      scheduled_datetime: form.scheduled_datetime + ':00',// ✅ proper ISO format
      completion_notes:    form.notes || '',
    }
    console.log('[createJob] payload:', payload)
    const res = await api.post('/jobs/', payload)
    setJobs(prev => [res.data, ...prev])
    setCreateModal(false)   // ✅ only close on success
  } catch (e) {
  console.error('[createJob] error:', e.response?.status, e.response?.data)
  alert('Error: ' + JSON.stringify(e.response?.data, null, 2))  // must be here
}
}
console.log('[job sample]', jobs[0])

  /* ── COMPUTED STATS ── */
  const total      = jobs.length
  const completed  = jobs.filter(j => ['completed', 'report_sent'].includes(j.status)).length
  const inProgress = jobs.filter(j => j.status === 'in_progress').length
  const pending    = jobs.filter(j => ['scheduled'].includes(j.status)).length
  const unassigned = jobs.filter(j => !j.assigned_technician).length

  /* ── TAB COUNTS ── */
  const tabCount = (key) => {
    if (key === 'all') return jobs.length
    return jobs.filter(j => j.status === key).length
  }

  /* ── TECH DISPLAY NAME ── */
  const techName = (job) => {
    if (job.technician_name) return job.technician_name
    if (job.assigned_technician || job.technician_id) {
      const id = job.assigned_technician || job.technician_id
      const t  = technicians.find(t => t.id === id)
      if (t) return t.full_name || `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.username
      return `Tech #${id}`
    }
    return null
  }

  /* ── FILTERED + SORTED JOBS ── */
  const filtered = jobs
    .filter(j => activeTab === 'all' || j.status === activeTab)
    .filter(j => {
  if (!filterTech) return true
  return String(j.assigned_technician) === filterTech
})
    .filter(j => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        (j.customer_name  || '').toLowerCase().includes(q) ||
        (j.site_address   || j.address || '').toLowerCase().includes(q) ||
        (j.service_type   || '').toLowerCase().includes(q) ||
        (techName(j)      || '').toLowerCase().includes(q) ||
        String(j.id).includes(q)
      )
    })
    .sort((a, b) => {
      if (sortBy === 'date_asc')   return new Date(a.scheduled_datetime) - new Date(b.scheduled_datetime)
      if (sortBy === 'date_desc')  return new Date(b.scheduled_datetime) - new Date(a.scheduled_datetime)
      if (sortBy === 'status')     return (a.status || '').localeCompare(b.status || '')
      if (sortBy === 'technician') return (techName(a) || 'zzz').localeCompare(techName(b) || 'zzz')
      return 0
    })

  /* ══════════════════════════════════════
     RENDER
  ══════════════════════════════════════ */
  return (
    <>
      <style>{S}</style>
      <div className="aj-root">

        {/* Mobile overlay */}
        <div className={`aj-overlay${sidebarOpen ? ' show' : ''}`} onClick={() => setSidebarOpen(false)} />

        {/* ── SIDEBAR ── */}
        <aside className={`aj-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="aj-sb-logo">
            <div className="aj-sb-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/></svg>
            </div>
            <span className="aj-sb-brand">PestPro</span>
          </div>

          <nav className="aj-sb-nav">
            {navItems.map(n => (
              <div
                key={n.id}
                className={`aj-sb-item${activeNav === n.id ? ' active' : ''}`}
                onClick={() => { setActiveNav(n.id); setSidebarOpen(false); navigate(n.path) }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d={n.d}/>
                </svg>
                {n.label}
              </div>
            ))}
          </nav>

          <div className="aj-sb-user">
            <div className="aj-sb-avatar">{userInitials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="aj-sb-uname">{userName}</div>
              <div className="aj-sb-urole">Administrator</div>
            </div>
            <button className="aj-sb-logout" onClick={handleLogout} title="Logout">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div className="aj-main">

          {/* TOPBAR */}
          <div className="aj-topbar">
            <div className="aj-topbar-left">
              <button className="aj-hamburger" onClick={() => setSidebarOpen(o => !o)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              </button>
              <span className="aj-crumb">
                Admin &nbsp;›&nbsp; <span>All Jobs</span>
              </span>
            </div>
            <div className="aj-topbar-right">
              <span className={`aj-ticker${countdown <= 10 ? ' soon' : ''}`}>
                ↻ in {countdown}s
              </span>
              <button
                className={`aj-refresh-btn${isSpinning ? ' spinning' : ''}`}
                onClick={manualRefresh}
              >
                <svg viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Refresh
              </button>
              <button className="aj-create-btn" onClick={() => setCreateModal(true)}>
                <svg viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                </svg>
                <span>Create Job</span>
              </button>
            </div>
          </div>

          {/* CONTENT */}
          <div className="aj-content">
            <div className="aj-page-title">All Jobs</div>
            <div className="aj-page-sub">
              Complete job list across all technicians · {total} total
            </div>

            {error && <div className="aj-error">{error}</div>}

            {loading ? (
              <div className="aj-loading">
                <div className="aj-spinner"/>
                Loading jobs…
              </div>
            ) : (
              <>
                {/* STATS */}
                <div className="aj-stats">
                  <div className="aj-stat">
                    <div className="aj-stat-label">Total Jobs</div>
                    <div className="aj-stat-val">{total}</div>
                    <div className="aj-stat-sub">All time</div>
                  </div>
                  <div className="aj-stat">
                    <div className="aj-stat-label">Completed</div>
                    <div className="aj-stat-val green">{completed}</div>
                    <div className="aj-stat-sub">
                      {total > 0 ? `${Math.round((completed / total) * 100)}% done` : '0%'}
                    </div>
                  </div>
                  <div className="aj-stat">
                    <div className="aj-stat-label">In Progress</div>
                    <div className="aj-stat-val blue">{inProgress}</div>
                    <div className="aj-stat-sub">Active now</div>
                  </div>
                  <div className="aj-stat">
                    <div className="aj-stat-label">Scheduled</div>
                    <div className="aj-stat-val amber">{pending}</div>
                    <div className="aj-stat-sub">Awaiting start</div>
                  </div>
                  <div className="aj-stat">
                    <div className="aj-stat-label">Unassigned</div>
                    <div className="aj-stat-val red">{unassigned}</div>
                    <div className="aj-stat-sub">Need technician</div>
                  </div>
                </div>

                {/* FILTER TABS */}
                <div className="aj-tabs">
                  {FILTER_TABS.map(tab => (
                    <button
                      key={tab.key}
                      className={`aj-tab${activeTab === tab.key ? ' active' : ''}`}
                      onClick={() => setActiveTab(tab.key)}
                    >
                      {tab.label}
                      <span className="aj-tab-count">{tabCount(tab.key)}</span>
                    </button>
                  ))}
                </div>

                {/* SEARCH + FILTERS */}
                <div className="aj-controls">
                  <div className="aj-search-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    <input
                      className="aj-search"
                      placeholder="Search by customer, technician, address, service type…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>

                  {technicians.length > 0 && (
                    <select
                      className="aj-filter-select"
                      value={filterTech}
                      onChange={e => setFilterTech(e.target.value)}
                    >
                      <option value="">All Technicians</option>
                      {technicians.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.full_name || `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.username}
                        </option>
                      ))}
                    </select>
                  )}

                  <select
                    className="aj-filter-select"
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    style={{ minWidth: 180 }}
                  >
                    <option value="date_asc">Date: Earliest First</option>
                    <option value="date_desc">Date: Latest First</option>
                    <option value="status">Sort by Status</option>
                    <option value="technician">Sort by Technician</option>
                  </select>
                </div>

                {/* JOBS HEADER */}
                <div className="aj-jobs-hdr">
                  <span className="aj-jobs-title">
                    {filtered.length} job{filtered.length !== 1 ? 's' : ''}
                    {activeTab !== 'all' ? ` · ${fmt(activeTab)}` : ''}
                    {filterTech ? ' · filtered by technician' : ''}
                    {search ? ` matching "${search}"` : ''}
                  </span>
                  <span className="aj-jobs-sort-lbl">
                    {sortBy === 'date_asc' ? 'Earliest First'
                      : sortBy === 'date_desc' ? 'Latest First'
                      : sortBy === 'technician' ? 'By Technician'
                      : 'By Status'}
                  </span>
                </div>

                {/* JOB CARDS */}
                {filtered.length === 0 ? (
                  <div className="aj-empty">
                    <div className="aj-empty-icon">📋</div>
                    <div className="aj-empty-title">No jobs found</div>
                    <div className="aj-empty-sub">
                      {search
                        ? `No jobs match "${search}"`
                        : activeTab !== 'all'
                        ? `No ${fmt(activeTab)} jobs at the moment`
                        : 'No jobs created yet'}
                    </div>
                  </div>
                ) : (
                  filtered.map((job, i) => {
                    const st   = STATUS_CONFIG[job.status] || { label: fmt(job.status), cls: 'pending' }
                    const svc  = job.service_type
                      ? fmt(job.service_type)
                      : job.title || 'Service Job'
                    const addr = job.site_address || job.address || job.customer_address || '—'
                    const tech = techName(job)

                    return (
                      <div
                        key={job.id || i}
                        className="aj-job-card"
                        onClick={() => navigate(`/dashboard/jobs/${job.id}`)}
                      >
                        <div className="aj-job-num">{i + 1}</div>

                        <div className="aj-job-body">
                          <div className="aj-job-top">
                            <span className="aj-job-id">JOB #{job.id}</span>
                            <span className={`aj-badge ${st.cls}`}>{st.label}</span>
                          </div>
                          <div className="aj-job-name">
                            {svc}{job.customer_name ? ` — ${job.customer_name}` : ''}
                          </div>
                          <div className="aj-job-meta">
                            {job.customer_name && (
                              <span className="aj-job-customer">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                </svg>
                                {job.customer_name}
                              </span>
                            )}
                            <span className={`aj-job-tech${!tech ? ' unassigned' : ''}`}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                              </svg>
                              {tech || 'Unassigned'}
                            </span>
                          </div>
                          <div className="aj-job-addr">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                            </svg>
                            {addr}
                          </div>
                          {job.scheduled_datetime && (
                            <div className="aj-job-time">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                              </svg>
                              {fmtDate(job.scheduled_datetime)} · {fmtTime(job.scheduled_datetime)}
                            </div>
                          )}
                        </div>

                        <div className="aj-job-actions" onClick={e => e.stopPropagation()}>
                          <button
                            className="aj-btn-assign"
                            onClick={() => setAssignModal(job)}
                            title="Assign / Reassign Technician"
                          >
                            <svg viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                            </svg>
                            Assign
                          </button>
                          <button
                            className="aj-btn-status"
                            onClick={() => setStatusModal(job)}
                            title="Change Status"
                          >
                            <svg viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                            </svg>
                            Status
                          </button>
                          <button
                            className="aj-btn-view"
                            onClick={() => navigate(`/dashboard/jobs/${job.id}`)}
                          >
                            View
                          </button>
                          <button
                            className="aj-btn-delete"
                            onClick={() => setDeleteModal(job)}
                            title="Delete Job"
                          >
                            <svg viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
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
      </div>

      {/* ── MODALS ── */}
      {assignModal && (
        <AssignModal
          job={assignModal}
          technicians={technicians}
          onClose={() => setAssignModal(null)}
          onSave={handleAssignSave}
        />
      )}
      {statusModal && (
        <StatusModal
          job={statusModal}
          onClose={() => setStatusModal(null)}
          onSave={handleStatusSave}
        />
      )}
      {deleteModal && (
        <DeleteModal
          job={deleteModal}
          onClose={() => setDeleteModal(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
      {createModal && (
        <CreateModal
          customers={customers}
          technicians={technicians}
          onClose={() => setCreateModal(false)}
          onSave={handleCreateSave}
        />
      )}
    </>
  )
}