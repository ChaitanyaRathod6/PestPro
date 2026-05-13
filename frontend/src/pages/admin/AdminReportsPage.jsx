import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import ServiceReport from './AdminReportDetailPage'

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
const fmtDateTime = (dt) => {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
const isExpired = (dt) => dt && new Date(dt) < new Date()

const AUTO_REFRESH_SECS = 30

/* ─────────────────────────────────────────────
   SERVICE TYPE CONFIG
───────────────────────────────────────────── */
const SERVICE_CONFIG = {
  mosquito:      { label: 'Mosquito',      color: 'blue',   abbr: 'MQ' },
  rodent:        { label: 'Rodent',        color: 'amber',  abbr: 'RD' },
  cockroach:     { label: 'Cockroach',     color: 'red',    abbr: 'CR' },
  termite:       { label: 'Termite',       color: 'orange', abbr: 'TM' },
  flying_insect: { label: 'Flying Insect', color: 'purple', abbr: 'FI' },
  general:       { label: 'General Pest',  color: 'green',  abbr: 'GP' },
  bed_bug:       { label: 'Bed Bug',       color: 'red',    abbr: 'BB' },
  ant:           { label: 'Ant',           color: 'amber',  abbr: 'AN' },
}

const getServiceCfg = (serviceType) => {
  if (!serviceType) return { label: 'General', color: 'green', abbr: 'GP' }
  const key = serviceType.toLowerCase().replace(/ /g, '_')
  return SERVICE_CONFIG[key] || {
    label: serviceType.charAt(0).toUpperCase() + serviceType.slice(1),
    color: 'green',
    abbr: serviceType.slice(0, 2).toUpperCase(),
  }
}

/* ─────────────────────────────────────────────
   EMAIL TYPE CONFIG
───────────────────────────────────────────── */
const EMAIL_TYPE_CONFIG = {
  otp_login:           { label: 'OTP Login',          color: 'blue'   },
  job_started:         { label: 'Job Started',         color: 'green'  },
  observation_update:  { label: 'Observation Update',  color: 'purple' },
  completion_report:   { label: 'Completion Report',   color: 'green'  },
  high_activity_alert: { label: 'High Activity Alert', color: 'red'    },
  maintenance_alert:   { label: 'Maintenance Alert',   color: 'amber'  },
}

const EMAIL_STATUS_CONFIG = {
  sent:     { label: 'Sent',     color: 'green' },
  failed:   { label: 'Failed',   color: 'red'   },
  pending:  { label: 'Pending',  color: 'amber' },
  retrying: { label: 'Retrying', color: 'blue'  },
}

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

const REPORT_SECTION_TABS = [
  { key: 'pdf',   label: 'PDF Reports' },
  { key: 'email', label: 'Email Logs'  },
  { key: 'stats', label: 'Email Stats' },
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
  --red:#e74c3c;--amber:#e6a817;--blue:#3b82f6;--purple:#7c3aed;--orange:#e6550d;
  --sidebar-w:220px;
}
.rp-root{font-family:'DM Serif Display',serif;min-height:100vh;background:var(--bg);display:flex;}

/* SIDEBAR */
.rp-sidebar{width:var(--sidebar-w);background:var(--white);border-right:1px solid var(--border);
  display:flex;flex-direction:column;min-height:100vh;
  position:fixed;top:0;left:0;bottom:0;z-index:200;overflow-y:auto;transition:transform .25s ease;}
.rp-sb-logo{padding:16px 20px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border);}
.rp-sb-icon{width:28px;height:28px;background:var(--green);border-radius:6px;display:flex;align-items:center;justify-content:center;}
.rp-sb-icon svg{width:15px;height:15px;fill:white;}
.rp-sb-brand{font-size:16px;color:var(--ink);}
.rp-sb-nav{padding:12px 10px;flex:1;}
.rp-sb-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;
  cursor:pointer;margin-bottom:2px;color:var(--muted);font-size:13.5px;
  transition:background .15s,color .15s;white-space:nowrap;}
.rp-sb-item:hover{background:var(--bg);color:var(--ink);}
.rp-sb-item.active{background:var(--green-light);color:var(--green);}
.rp-sb-item svg{width:16px;height:16px;flex-shrink:0;}
.rp-sb-user{padding:14px 16px;border-top:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-shrink:0;}
.rp-sb-avatar{width:32px;height:32px;background:var(--green);border-radius:50%;
  display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;flex-shrink:0;}
.rp-sb-uname{font-size:13px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.rp-sb-urole{font-size:11px;color:var(--pale);}
.rp-sb-logout{background:none;border:none;cursor:pointer;color:var(--pale);padding:4px;border-radius:6px;
  display:flex;align-items:center;margin-left:auto;transition:color .15s,background .15s;}
.rp-sb-logout:hover{color:var(--red);background:#fde8e8;}
.rp-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:150;}
.rp-overlay.show{display:block;}
.rp-hamburger{display:none;background:none;border:none;cursor:pointer;padding:4px;border-radius:6px;color:var(--ink);}
.rp-hamburger svg{width:20px;height:20px;}

/* MAIN */
.rp-main{flex:1;margin-left:var(--sidebar-w);display:flex;flex-direction:column;min-height:100vh;}
.rp-topbar{background:var(--white);border-bottom:1px solid var(--border);
  padding:0 24px;height:52px;display:flex;align-items:center;
  justify-content:space-between;position:sticky;top:0;z-index:100;flex-shrink:0;gap:12px;}
.rp-topbar-left{display:flex;align-items:center;gap:10px;}
.rp-crumb{font-size:13px;color:var(--pale);}
.rp-crumb span{color:var(--ink);}
.rp-crumb-link{color:var(--ink);cursor:pointer;}
.rp-crumb-link:hover{color:var(--green);text-decoration:underline;}
.rp-topbar-right{display:flex;align-items:center;gap:10px;}
.rp-ticker{font-size:12px;color:var(--pale);white-space:nowrap;}
.rp-ticker.soon{color:var(--green);}
.rp-refresh-btn{background:var(--bg);color:var(--ink);border:1.5px solid var(--border);
  border-radius:9px;padding:7px 14px;font-family:'DM Serif Display',serif;font-size:13px;
  cursor:pointer;display:flex;align-items:center;gap:6px;transition:background .15s;}
.rp-refresh-btn:hover{background:#e2e8e2;}
.rp-refresh-btn svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2;transition:transform .35s;}
.rp-refresh-btn.spinning svg{animation:rpSpin .55s linear;}
@keyframes rpSpin{to{transform:rotate(360deg);}}

/* CONTENT */
.rp-content{padding:22px 24px;flex:1;}
.rp-page-title{font-size:22px;color:var(--ink);margin-bottom:3px;}
.rp-page-sub{font-size:13px;color:var(--pale);margin-bottom:20px;font-style:italic;}

/* STATS */
.rp-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px;}
.rp-stat{background:var(--white);border-radius:14px;padding:16px 18px;box-shadow:0 1px 8px rgba(0,0,0,.05);}
.rp-stat-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--pale);margin-bottom:6px;}
.rp-stat-val{font-size:28px;color:var(--ink);letter-spacing:-1px;line-height:1;}
.rp-stat-val.green{color:var(--green);}
.rp-stat-val.red{color:var(--red);}
.rp-stat-val.amber{color:var(--amber);}
.rp-stat-val.blue{color:var(--blue);}
.rp-stat-sub{font-size:11px;color:var(--muted);margin-top:4px;}

/* SECTION TABS */
.rp-section-tabs{display:flex;gap:6px;margin-bottom:20px;flex-wrap:wrap;}
.rp-section-tab{padding:8px 20px;border-radius:20px;font-family:'DM Serif Display',serif;
  font-size:13px;cursor:pointer;border:1.5px solid var(--border);
  background:var(--white);color:var(--muted);transition:all .15s;white-space:nowrap;}
.rp-section-tab:hover{border-color:var(--green);color:var(--green);}
.rp-section-tab.active{background:var(--green);color:#fff;border-color:var(--green);}

/* FILTER TABS — service type tabs (scrollable row) */
.rp-tabs-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;margin-bottom:18px;padding-bottom:2px;}
.rp-tabs{display:flex;gap:6px;flex-wrap:nowrap;min-width:max-content;}
.rp-tab{padding:7px 16px;border-radius:20px;font-family:'DM Serif Display',serif;
  font-size:12.5px;cursor:pointer;border:1.5px solid var(--border);
  background:var(--white);color:var(--muted);transition:all .15s;white-space:nowrap;}
.rp-tab:hover{border-color:var(--green);color:var(--green);}
.rp-tab.active{background:var(--green);color:#fff;border-color:var(--green);}
.rp-tab-count{border-radius:10px;padding:1px 6px;font-size:11px;margin-left:5px;}
.rp-tab:not(.active) .rp-tab-count{background:var(--bg);color:var(--muted);}
.rp-tab.active .rp-tab-count{background:rgba(255,255,255,.25);}

/* Colored active tabs per service */
.rp-tab.active.tab-blue{background:var(--blue);border-color:var(--blue);}
.rp-tab.active.tab-amber{background:var(--amber);border-color:var(--amber);}
.rp-tab.active.tab-red{background:var(--red);border-color:var(--red);}
.rp-tab.active.tab-purple{background:var(--purple);border-color:var(--purple);}
.rp-tab.active.tab-orange{background:var(--orange);border-color:var(--orange);}
.rp-tab.active.tab-green{background:var(--green);border-color:var(--green);}

/* CONTROLS */
.rp-controls{display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap;}
.rp-search-wrap{flex:1;min-width:200px;position:relative;}
.rp-search-wrap svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);
  width:15px;height:15px;color:var(--pale);pointer-events:none;}
.rp-search{width:100%;border:1.5px solid var(--border);border-radius:10px;
  padding:9px 14px 9px 36px;font-family:'DM Serif Display',serif;font-size:13px;
  color:var(--ink);outline:none;background:var(--white);transition:border-color .2s;}
.rp-search:focus{border-color:var(--green);}
.rp-sort-select{border:1.5px solid var(--border);border-radius:10px;
  padding:9px 14px;font-family:'DM Serif Display',serif;font-size:13px;
  color:var(--ink);outline:none;background:var(--white);cursor:pointer;min-width:180px;}
.rp-sort-select:focus{border-color:var(--green);}

/* LIST HDR */
.rp-list-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
.rp-list-title{font-size:15px;color:var(--ink);}
.rp-list-meta{font-size:12px;color:var(--pale);}

/* REPORT CARD */
.rp-card{background:var(--white);border-radius:14px;padding:18px 20px;
  margin-bottom:10px;display:flex;align-items:center;gap:16px;
  box-shadow:0 1px 6px rgba(0,0,0,.05);transition:box-shadow .15s,transform .15s;}
.rp-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.1);transform:translateY(-1px);}
.rp-avatar{width:42px;height:42px;border-radius:50%;background:var(--green);
  display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:600;flex-shrink:0;}
.rp-avatar.blue{background:var(--blue);}
.rp-avatar.amber{background:var(--amber);}
.rp-avatar.red{background:var(--red);}
.rp-avatar.purple{background:var(--purple);}
.rp-avatar.orange{background:var(--orange);}
.rp-avatar.green{background:var(--green);}
.rp-avatar.expired{background:#d1d5d1;}
.rp-body{flex:1;min-width:0;}
.rp-name-row{display:flex;align-items:center;gap:8px;margin-bottom:3px;flex-wrap:wrap;}
.rp-name{font-size:15px;color:var(--ink);}
.rp-job-id{font-size:12px;color:var(--muted);font-style:italic;}
.rp-badge{font-size:11px;padding:2px 9px;border-radius:20px;}
.rp-badge.green{background:var(--green-light);color:var(--green);}
.rp-badge.red{background:#fde8e8;color:var(--red);}
.rp-badge.amber{background:#fff8ec;color:var(--amber);}
.rp-badge.blue{background:#eff6ff;color:var(--blue);}
.rp-badge.purple{background:#ede9fe;color:var(--purple);}
.rp-badge.orange{background:#fff0eb;color:var(--orange);}
.rp-badge.muted{background:var(--bg);color:var(--muted);}
.rp-service-badge{font-size:11px;padding:2px 9px;border-radius:20px;}
.rp-service-badge.blue{background:#eff6ff;color:var(--blue);}
.rp-service-badge.amber{background:#fff8ec;color:var(--amber);}
.rp-service-badge.red{background:#fde8e8;color:var(--red);}
.rp-service-badge.purple{background:#ede9fe;color:var(--purple);}
.rp-service-badge.orange{background:#fff0eb;color:var(--orange);}
.rp-service-badge.green{background:var(--green-light);color:var(--green);}
.rp-details{display:flex;gap:18px;flex-wrap:wrap;margin-top:4px;}
.rp-detail{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--muted);}
.rp-detail svg{width:11px;height:11px;flex-shrink:0;}
.rp-meta-row{display:flex;gap:12px;margin-top:5px;flex-wrap:wrap;}
.rp-meta{font-size:11.5px;color:var(--pale);}
.rp-meta span{color:var(--muted);}
.rp-actions{display:flex;align-items:center;gap:8px;flex-shrink:0;flex-wrap:wrap;}
.rp-btn-view{background:var(--green-light);color:var(--green);border:none;border-radius:8px;
  padding:7px 14px;font-family:'DM Serif Display',serif;font-size:12.5px;cursor:pointer;
  transition:background .15s;white-space:nowrap;display:flex;align-items:center;gap:5px;}
.rp-btn-view:hover{background:#d5eee3;}
.rp-btn-view svg{width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2;}
.rp-btn-download{background:var(--bg);color:var(--muted);border:1.5px solid var(--border);
  border-radius:8px;padding:7px 14px;font-family:'DM Serif Display',serif;font-size:12.5px;
  cursor:pointer;transition:background .15s;white-space:nowrap;text-decoration:none;
  display:flex;align-items:center;gap:5px;}
.rp-btn-download:hover{background:#e2e8e2;color:var(--ink);}
.rp-btn-download svg{width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2;}
.rp-btn-regen{border:none;border-radius:8px;padding:7px 14px;font-family:'DM Serif Display',serif;
  font-size:12.5px;cursor:pointer;transition:background .15s;white-space:nowrap;
  background:#fff8ec;color:var(--amber);}
.rp-btn-regen:hover{background:#fde8c0;}
.rp-btn-regen:disabled{opacity:.5;cursor:not-allowed;}

/* EMAIL CARD */
.rp-email-card{background:var(--white);border-radius:14px;padding:16px 20px;
  margin-bottom:8px;display:flex;align-items:center;gap:14px;
  box-shadow:0 1px 6px rgba(0,0,0,.05);transition:box-shadow .15s;}
.rp-email-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.1);}
.rp-email-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.rp-email-icon.green{background:var(--green-light);}
.rp-email-icon.green svg{stroke:var(--green);}
.rp-email-icon.red{background:#fde8e8;}
.rp-email-icon.red svg{stroke:var(--red);}
.rp-email-icon.amber{background:#fff8ec;}
.rp-email-icon.amber svg{stroke:var(--amber);}
.rp-email-icon.blue{background:#eff6ff;}
.rp-email-icon.blue svg{stroke:var(--blue);}
.rp-email-icon svg{width:16px;height:16px;fill:none;stroke-width:2;}
.rp-email-body{flex:1;min-width:0;}
.rp-email-title-row{display:flex;align-items:center;gap:8px;margin-bottom:3px;flex-wrap:wrap;}
.rp-email-to{font-size:14px;color:var(--ink);}
.rp-email-subject{font-size:12px;color:var(--muted);margin-bottom:4px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.rp-email-meta{display:flex;gap:14px;flex-wrap:wrap;}
.rp-email-detail{font-size:11.5px;color:var(--pale);display:flex;align-items:center;gap:3px;}
.rp-email-detail svg{width:10px;height:10px;}

/* STATS PANEL */
.rp-stats-panel{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.rp-stats-section{background:var(--white);border-radius:14px;padding:20px 22px;
  box-shadow:0 1px 8px rgba(0,0,0,.05);}
.rp-stats-section-title{font-size:10px;text-transform:uppercase;letter-spacing:1px;
  color:var(--pale);margin-bottom:16px;}
.rp-stat-row{display:flex;align-items:center;justify-content:space-between;
  padding:9px 0;border-bottom:1px solid var(--border);}
.rp-stat-row:last-child{border-bottom:none;}
.rp-stat-row-label{font-size:13px;color:var(--muted);}
.rp-stat-row-val{font-size:18px;color:var(--ink);letter-spacing:-.5px;}
.rp-stat-row-val.green{color:var(--green);}
.rp-stat-row-val.red{color:var(--red);}
.rp-stat-row-val.amber{color:var(--amber);}
.rp-stat-row-val.blue{color:var(--blue);}
.rp-stat-row-val.purple{color:var(--purple);}

/* EMPTY / LOADING / ERROR */
.rp-empty{text-align:center;padding:60px 20px;}
.rp-empty-icon{font-size:40px;margin-bottom:12px;}
.rp-empty-title{font-size:18px;color:var(--ink);margin-bottom:6px;}
.rp-empty-sub{font-size:13px;color:var(--pale);}
.rp-loading{display:flex;align-items:center;justify-content:center;padding:60px;color:var(--pale);font-size:14px;gap:10px;}
.rp-spinner{width:20px;height:20px;border:2px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:rpSpinner .8s linear infinite;}
@keyframes rpSpinner{to{transform:rotate(360deg);}}
.rp-error{background:#fde8e8;color:var(--red);padding:12px 16px;border-radius:10px;font-size:13px;margin-bottom:16px;}

/* TOAST */
.rp-toast{position:fixed;bottom:20px;right:20px;z-index:700;
  display:flex;align-items:center;gap:10px;padding:12px 18px;border-radius:10px;
  font-size:13px;box-shadow:0 4px 20px rgba(0,0,0,.15);animation:rpSlideIn .25s ease;}
@keyframes rpSlideIn{from{transform:translateY(20px);opacity:0;}to{transform:translateY(0);opacity:1;}}
.rp-toast.success{background:var(--green);color:#fff;}
.rp-toast.error{background:var(--red);color:#fff;}

/* RESPONSIVE */
@media(max-width:900px){.rp-stats{grid-template-columns:repeat(2,1fr);}.rp-stats-panel{grid-template-columns:1fr;}}
@media(max-width:768px){
  .rp-sidebar{transform:translateX(-100%);}
  .rp-sidebar.open{transform:translateX(0);}
  .rp-main{margin-left:0;}
  .rp-hamburger{display:flex;}
  .rp-card{flex-wrap:wrap;}
  .rp-actions{width:100%;justify-content:flex-end;}
}
@media(max-width:600px){
  .rp-stats{grid-template-columns:1fr 1fr;gap:10px;}
  .rp-content{padding:14px;}
  .rp-topbar{padding:0 14px;}
  .rp-stat-val{font-size:22px;}
}
`

/* ═══════════════════════════════════════════
   SIDEBAR (shared between list + detail views)
═══════════════════════════════════════════ */
function Sidebar({ sidebarOpen, setSidebarOpen, userInitials, userName, handleLogout, navigate }) {
  return (
    <aside className={`rp-sidebar${sidebarOpen ? ' open' : ''}`}>
      <div className="rp-sb-logo">
        <div className="rp-sb-icon">
          <svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/></svg>
        </div>
        <span className="rp-sb-brand">PestPro</span>
      </div>
      <nav className="rp-sb-nav">
        {navItems.map(n => (
          <div key={n.id} className={`rp-sb-item${n.id === 'reports' ? ' active' : ''}`}
            onClick={() => { setSidebarOpen(false); navigate(n.path) }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d={n.d}/>
            </svg>
            {n.label}
          </div>
        ))}
      </nav>
      <div className="rp-sb-user">
        <div className="rp-sb-avatar">{userInitials}</div>
        <div style={{flex:1,minWidth:0}}>
          <div className="rp-sb-uname">{userName}</div>
          <div className="rp-sb-urole">Administrator</div>
        </div>
        <button className="rp-sb-logout" type="button" onClick={handleLogout} title="Logout">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
        </button>
      </div>
    </aside>
  )
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export default function AdminReportsPage() {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()

  const [sidebarOpen,  setSidebarOpen]  = useState(false)
  const [sectionTab,   setSectionTab]   = useState('pdf')   // pdf | email | stats
  const [serviceFilter, setServiceFilter] = useState('all') // 'all' | any service type key
  const [viewingJobId, setViewingJobId] = useState(null)

  /* PDF state */
  const [reports,     setReports]     = useState([])
  const [reportsLoad, setReportsLoad] = useState(true)
  const [reportsErr,  setReportsErr]  = useState('')
  const [regenId,     setRegenId]     = useState(null)
  const [pdfSearch,   setPdfSearch]   = useState('')
  const [sortBy,      setSortBy]      = useState('date_desc')

  /* Email state */
  const [emails,      setEmails]      = useState([])
  const [emailsLoad,  setEmailsLoad]  = useState(true)
  const [emailsErr,   setEmailsErr]   = useState('')
  const [emailFilter, setEmailFilter] = useState('all')
  const [emailSearch, setEmailSearch] = useState('')

  /* Stats state */
  const [stats,     setStats]     = useState(null)
  const [statsLoad, setStatsLoad] = useState(true)

  /* Shared */
  const [isSpinning, setIsSpinning] = useState(false)
  const [toast,      setToast]      = useState(null)
  const [countdown,  setCountdown]  = useState(AUTO_REFRESH_SECS)

  const tickRef   = useRef(null)
  const isMounted = useRef(true)

  const userName     = displayName(user)
  const userInitials = initials(userName)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => isMounted.current && setToast(null), 3500)
  }

  /* ── FETCH PDF REPORTS ── */
  const fetchReports = useCallback(async (silent = false) => {
    if (!silent) setReportsErr('')
    try {
      const res = await api.get('/pdf/')
      if (!isMounted.current) return
      const list = res.data?.results ?? res.data ?? []
      setReports(Array.isArray(list) ? list : [])
    } catch (e) {
      if (!silent && isMounted.current)
        setReportsErr(e.response?.data?.error || 'Failed to load PDF reports.')
    } finally {
      if (isMounted.current) setReportsLoad(false)
    }
  }, [])

  /* ── FETCH EMAIL LOGS ── */
  const fetchEmails = useCallback(async (silent = false) => {
    if (!silent) setEmailsErr('')
    try {
      const params = {}
      if (emailFilter !== 'all') params.status = emailFilter
      const res = await api.get('/emails/', { params })
      if (!isMounted.current) return
      const list = res.data?.results ?? res.data ?? []
      setEmails(Array.isArray(list) ? list : [])
    } catch (e) {
      if (!silent && isMounted.current)
        setEmailsErr(e.response?.data?.error || 'Failed to load email logs.')
    } finally {
      if (isMounted.current) setEmailsLoad(false)
    }
  }, [emailFilter])

  /* ── FETCH EMAIL STATS ── */
  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/emails/stats/')
      if (isMounted.current) setStats(res.data)
    } catch { /* fail silently */ } finally {
      if (isMounted.current) setStatsLoad(false)
    }
  }, [])

  /* ── AUTO REFRESH ── */
  const resetTimer = useCallback(() => {
    clearInterval(tickRef.current)
    setCountdown(AUTO_REFRESH_SECS)
    tickRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { fetchReports(true); fetchEmails(true); fetchStats(); return AUTO_REFRESH_SECS }
        return c - 1
      })
    }, 1000)
  }, [fetchReports, fetchEmails, fetchStats])

  useEffect(() => {
    isMounted.current = true
    Promise.all([fetchReports(), fetchEmails(), fetchStats()]).then(resetTimer)
    return () => { isMounted.current = false; clearInterval(tickRef.current) }
  }, [fetchReports, fetchEmails, fetchStats, resetTimer])

  useEffect(() => { fetchEmails(true) }, [emailFilter, fetchEmails])

  const manualRefresh = () => {
    setIsSpinning(true)
    Promise.all([fetchReports(true), fetchEmails(true), fetchStats()]).then(() => {
      resetTimer()
      setTimeout(() => setIsSpinning(false), 550)
    })
  }

  /* ── REGENERATE PDF ── */
  const handleRegen = async (jobId) => {
    setRegenId(jobId)
    try {
      await api.post(`/pdf/${jobId}/regenerate/`)
      showToast('PDF regeneration queued. Refresh in a few seconds.')
      setTimeout(() => fetchReports(true), 3000)
    } catch (e) {
      showToast(e.response?.data?.error || 'Failed to regenerate report.', 'error')
    } finally {
      setRegenId(null)
    }
  }

  const handleLogout = async () => {
    clearInterval(tickRef.current)
    await logout()
    navigate('/login')
  }

  /* ── SERVICE TYPES — hardcoded from DB + auto-discovered from loaded reports ──
     The hardcoded list covers all known service types so tabs always appear.
     Any unknown type found in the reports data is added automatically.         */
  const ALL_SERVICE_KEYS = [
    'mosquito', 'rodent', 'cockroach', 'termite',
    'flying_insect', 'general', 'bed_bug', 'ant',
  ]

  const serviceTypes = useMemo(() => {
    // Start with all known types from SERVICE_CONFIG
    const seen = new Set(ALL_SERVICE_KEYS)
    // Also add any unknown types found in the actual reports (future-proofing)
    reports.forEach(r => {
      const raw = (r.service_type || r.job_service_type || '').toLowerCase().replace(/ /g, '_')
      if (raw) seen.add(raw)
    })
    return Array.from(seen).sort()
  }, [reports])

  /* Build filter tab list: All + one per service type */
  const filterTabs = [
    { key: 'all', label: 'All Reports', color: 'green' },
    ...serviceTypes.map(key => {
      const cfg = getServiceCfg(key)
      return { key, label: cfg.label, color: cfg.color }
    }),
  ]

  /* ── COUNTS per tab (0 is fine — tab still shows) ── */
  const countForTab = (key) => {
    if (key === 'all') return reports.length
    return reports.filter(r => {
      const raw = (r.service_type || r.job_service_type || '').toLowerCase().replace(/ /g, '_')
      return raw === key
    }).length
  }

  /* ── STATS ── */
  const totalPdfs    = reports.length
  const validCount   = reports.filter(r => !isExpired(r.token_expires_at)).length
  const expiredCount = reports.filter(r =>  isExpired(r.token_expires_at)).length

  /* ── FILTER + SORT ── */
  const filtered = reports
    .filter(r => {
      // Service type filter
      if (serviceFilter !== 'all') {
        const raw = (r.service_type || r.job_service_type || '').toLowerCase().replace(/ /g, '_')
        if (raw !== serviceFilter) return false
      }
      // Search
      if (!pdfSearch.trim()) return true
      const q = pdfSearch.toLowerCase()
      return (
        String(r.job_id || r.job || '').includes(q) ||
        (r.customer_name     || '').toLowerCase().includes(q) ||
        (r.customer_email    || '').toLowerCase().includes(q) ||
        (r.generated_by_name || '').toLowerCase().includes(q) ||
        (r.job_uuid          || '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      if (sortBy === 'date_asc')  return new Date(a.generated_at) - new Date(b.generated_at)
      return new Date(b.generated_at) - new Date(a.generated_at) // date_desc default
    })

  const filteredEmails = emails.filter(e => {
    if (!emailSearch.trim()) return true
    const q = emailSearch.toLowerCase()
    return (
      (e.recipient_email || '').toLowerCase().includes(q) ||
      (e.recipient_name  || '').toLowerCase().includes(q) ||
      (e.subject         || '').toLowerCase().includes(q) ||
      (e.email_type      || '').toLowerCase().includes(q)
    )
  })

  const typeColor = (t) => EMAIL_TYPE_CONFIG[t]?.color || 'muted'
  const typeLabel = (t) => EMAIL_TYPE_CONFIG[t]?.label || t

  /* ── DETAIL VIEW ── */
  if (viewingJobId !== null) {
    return (
      <>
        <style>{S}</style>
        <div className="rp-root">
          <div className={`rp-overlay${sidebarOpen ? ' show' : ''}`} onClick={() => setSidebarOpen(false)}/>
          <Sidebar {...{ sidebarOpen, setSidebarOpen, userInitials, userName, handleLogout, navigate }}/>
          <div className="rp-main">
            <div className="rp-topbar">
              <div className="rp-topbar-left">
                <button className="rp-hamburger" type="button" onClick={() => setSidebarOpen(o => !o)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
                  </svg>
                </button>
                <span className="rp-crumb">
                  Admin &nbsp;›&nbsp;
                  <span className="rp-crumb-link" onClick={() => setViewingJobId(null)}>Reports</span>
                  &nbsp;›&nbsp; <span>Job #{viewingJobId}</span>
                </span>
              </div>
            </div>
            <div className="rp-content" style={{padding:'16px 24px'}}>
              <ServiceReport jobId={viewingJobId} onClose={() => setViewingJobId(null)}/>
            </div>
          </div>
        </div>
      </>
    )
  }

  /* ── LIST VIEW ── */
  return (
    <>
      <style>{S}</style>
      <div className="rp-root">

        <div className={`rp-overlay${sidebarOpen ? ' show' : ''}`} onClick={() => setSidebarOpen(false)}/>
        <Sidebar {...{ sidebarOpen, setSidebarOpen, userInitials, userName, handleLogout, navigate }}/>

        <div className="rp-main">
          <div className="rp-topbar">
            <div className="rp-topbar-left">
              <button className="rp-hamburger" type="button" onClick={() => setSidebarOpen(o => !o)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              </button>
              <span className="rp-crumb">Admin &nbsp;›&nbsp; <span>Reports</span></span>
            </div>
            <div className="rp-topbar-right">
              <span className={`rp-ticker${countdown <= 10 ? ' soon' : ''}`}>↻ in {countdown}s</span>
              <button className={`rp-refresh-btn${isSpinning ? ' spinning' : ''}`} type="button" onClick={manualRefresh}>
                <svg viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Refresh
              </button>
            </div>
          </div>

          <div className="rp-content">
            <div className="rp-page-title">Reports</div>
            <div className="rp-page-sub">PDF completion reports &amp; email delivery logs · auto-refreshes every {AUTO_REFRESH_SECS}s</div>

            {/* STATS */}
            <div className="rp-stats">
              <div className="rp-stat">
                <div className="rp-stat-label">Total PDF Reports</div>
                <div className="rp-stat-val">{totalPdfs}</div>
                <div className="rp-stat-sub">All jobs</div>
              </div>
              <div className="rp-stat">
                <div className="rp-stat-label">Valid Links</div>
                <div className="rp-stat-val green">{validCount}</div>
                <div className="rp-stat-sub">Token not expired</div>
              </div>
              <div className="rp-stat">
                <div className="rp-stat-label">Expired Links</div>
                <div className="rp-stat-val red">{expiredCount}</div>
                <div className="rp-stat-sub">Need regeneration</div>
              </div>
              <div className="rp-stat">
                <div className="rp-stat-label">Emails Sent</div>
                <div className="rp-stat-val blue">{stats?.sent ?? '—'}</div>
                <div className="rp-stat-sub">{stats ? `${stats.failed} failed` : 'Loading…'}</div>
              </div>
            </div>

            {/* SECTION TABS */}
            <div className="rp-section-tabs">
              {REPORT_SECTION_TABS.map(t => (
                <button key={t.key} type="button"
                  className={`rp-section-tab${sectionTab === t.key ? ' active' : ''}`}
                  onClick={() => setSectionTab(t.key)}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ══ PDF REPORTS ══ */}
            {sectionTab === 'pdf' && (
              <>
                {reportsErr && <div className="rp-error">{reportsErr}</div>}

                {/* ── SERVICE TYPE FILTER TABS (built from DB data) ── */}
                <div className="rp-tabs-wrap">
                  <div className="rp-tabs">
                    {filterTabs.map(tab => (
                      <button key={tab.key} type="button"
                        className={`rp-tab${serviceFilter === tab.key ? ` active tab-${tab.color}` : ''}`}
                        onClick={() => setServiceFilter(tab.key)}>
                        {tab.label}
                        <span className="rp-tab-count">{countForTab(tab.key)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* CONTROLS — search + sort (only Newest/Oldest) */}
                <div className="rp-controls">
                  <div className="rp-search-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    <input className="rp-search"
                      placeholder="Search by customer name, email, job…"
                      value={pdfSearch} onChange={e => setPdfSearch(e.target.value)}
                    />
                  </div>
                  <select className="rp-sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                    <option value="date_desc">Newest First</option>
                    <option value="date_asc">Oldest First</option>
                  </select>
                </div>

                {/* LIST HEADER */}
                <div className="rp-list-hdr">
                  <span className="rp-list-title">
                    {filtered.length} report{filtered.length !== 1 ? 's' : ''}
                    {serviceFilter !== 'all' && ` · ${getServiceCfg(serviceFilter).label}`}
                    {pdfSearch ? ` matching "${pdfSearch}"` : ''}
                  </span>
                  <span className="rp-list-meta">{sortBy === 'date_desc' ? 'Newest First' : 'Oldest First'}</span>
                </div>

                {reportsLoad ? (
                  <div className="rp-loading"><div className="rp-spinner"/>Loading reports…</div>
                ) : filtered.length === 0 ? (
                  <div className="rp-empty">
                    <div className="rp-empty-icon">📄</div>
                    <div className="rp-empty-title">No reports found</div>
                    <div className="rp-empty-sub">
                      {pdfSearch
                        ? `No reports match "${pdfSearch}"`
                        : serviceFilter !== 'all'
                        ? `No ${getServiceCfg(serviceFilter).label} reports found.`
                        : 'Reports are generated automatically when a job is completed.'}
                    </div>
                  </div>
                ) : (
                  filtered.map(r => {
                    const expired   = isExpired(r.token_expires_at)
                    const jobId     = r.job_id ?? r.job
                    const custName  = r.customer_name || r.customer?.name || ''
                    const custEmail = r.customer_email || ''
                    const svcType   = r.service_type || r.job_service_type || ''
                    const svcCfg    = getServiceCfg(svcType)
                    const avatarCls = expired ? 'expired' : svcCfg.color

                    return (
                      <div key={r.id} className="rp-card">
                        <div className={`rp-avatar ${avatarCls}`}>{svcCfg.abbr}</div>

                        <div className="rp-body">
                          <div className="rp-name-row">
                            <span className="rp-name">{custName || `Job #${jobId}`}</span>
                            {custName && <span className="rp-job-id">Job #{jobId}</span>}
                            <span className={`rp-service-badge ${svcCfg.color}`}>{svcCfg.label}</span>
                            <span className={`rp-badge ${expired ? 'red' : 'green'}`}>
                              {expired ? 'Link Expired' : 'Link Valid'}
                            </span>
                            {r.includes_signature && <span className="rp-badge green">✓ Signed</span>}
                          </div>
                          <div className="rp-details">
                            {custEmail && (
                              <span className="rp-detail">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                                </svg>
                                {custEmail}
                              </span>
                            )}
                            {r.file_size_kb > 0 && (
                              <span className="rp-detail">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                </svg>
                                {r.file_size_kb} KB
                              </span>
                            )}
                          </div>
                          <div className="rp-meta-row">
                            <span className="rp-meta">Generated <span>{fmtDateTime(r.generated_at)}</span></span>
                            <span className="rp-meta">Expires <span>{fmtDate(r.token_expires_at)}</span></span>
                            {r.generated_by_name && (
                              <span className="rp-meta">By <span>{r.generated_by_name}</span></span>
                            )}
                          </div>
                        </div>

                        <div className="rp-actions">
                          <button className="rp-btn-view" type="button" onClick={() => setViewingJobId(jobId)}>
                            <svg viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round"
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                            </svg>
                            View
                          </button>
                          {r.report_file && !expired && (
                            <a href={r.report_file} target="_blank" rel="noopener noreferrer" className="rp-btn-download">
                              <svg viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round"
                                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                              </svg>
                              PDF
                            </a>
                          )}
                          <button className="rp-btn-regen" type="button"
                            onClick={() => handleRegen(jobId)} disabled={regenId === jobId}>
                            {regenId === jobId ? 'Queuing…' : 'Regenerate'}
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </>
            )}

            {/* ══ EMAIL LOGS ══ */}
            {sectionTab === 'email' && (
              <>
                {emailsErr && <div className="rp-error">{emailsErr}</div>}
                <div className="rp-controls">
                  <div className="rp-search-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    <input className="rp-search"
                      placeholder="Search by recipient, subject, type…"
                      value={emailSearch} onChange={e => setEmailSearch(e.target.value)}
                    />
                  </div>
                  <select className="rp-sort-select" value={emailFilter} onChange={e => setEmailFilter(e.target.value)}>
                    <option value="all">All Statuses</option>
                    <option value="sent">Sent</option>
                    <option value="failed">Failed</option>
                    <option value="pending">Pending</option>
                    <option value="retrying">Retrying</option>
                  </select>
                </div>
                <div className="rp-list-hdr">
                  <span className="rp-list-title">{filteredEmails.length} email{filteredEmails.length !== 1 ? 's' : ''}</span>
                  <span className="rp-list-meta">Newest First</span>
                </div>
                {emailsLoad ? (
                  <div className="rp-loading"><div className="rp-spinner"/>Loading email logs…</div>
                ) : filteredEmails.length === 0 ? (
                  <div className="rp-empty">
                    <div className="rp-empty-icon">📧</div>
                    <div className="rp-empty-title">No email logs found</div>
                    <div className="rp-empty-sub">
                      {emailFilter !== 'all' ? `No ${emailFilter} emails found.` : 'No emails sent yet.'}
                    </div>
                  </div>
                ) : (
                  filteredEmails.map(e => {
                    const sc = EMAIL_STATUS_CONFIG[e.status]?.color || 'muted'
                    const tc = typeColor(e.email_type)
                    return (
                      <div key={e.id} className="rp-email-card">
                        <div className={`rp-email-icon ${sc}`}>
                          <svg viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round"
                              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                          </svg>
                        </div>
                        <div className="rp-email-body">
                          <div className="rp-email-title-row">
                            <span className="rp-email-to">{e.recipient_name || e.recipient_email}</span>
                            <span className={`rp-badge ${sc}`}>{EMAIL_STATUS_CONFIG[e.status]?.label || e.status}</span>
                            <span className={`rp-badge ${tc}`}>{typeLabel(e.email_type)}</span>
                            {e.pdf_attached && <span className="rp-badge muted">📎 PDF</span>}
                          </div>
                          <div className="rp-email-subject">{e.subject || '—'}</div>
                          <div className="rp-email-meta">
                            <span className="rp-email-detail">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                              </svg>
                              {e.recipient_email}
                            </span>
                            <span className="rp-email-detail">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                              </svg>
                              {fmtDateTime(e.sent_at)}
                            </span>
                            {e.job_id && <span className="rp-email-detail">Job #{e.job_id}</span>}
                            {e.error_message && (
                              <span style={{fontSize:11.5,color:'var(--red)'}}>⚠ {e.error_message}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </>
            )}

            {/* ══ EMAIL STATS ══ */}
            {sectionTab === 'stats' && (
              <>
                {statsLoad ? (
                  <div className="rp-loading"><div className="rp-spinner"/>Loading stats…</div>
                ) : !stats ? (
                  <div className="rp-empty">
                    <div className="rp-empty-icon">📊</div>
                    <div className="rp-empty-title">Stats unavailable</div>
                    <div className="rp-empty-sub">Could not load email statistics.</div>
                  </div>
                ) : (
                  <div className="rp-stats-panel">
                    <div className="rp-stats-section">
                      <div className="rp-stats-section-title">Delivery Status</div>
                      {[
                        { label: 'Total Emails', val: stats.total,    color: ''      },
                        { label: 'Sent',         val: stats.sent,     color: 'green' },
                        { label: 'Failed',       val: stats.failed,   color: 'red'   },
                        { label: 'Pending',      val: stats.pending,  color: 'amber' },
                        { label: 'Retrying',     val: stats.retrying, color: 'blue'  },
                      ].map(row => (
                        <div key={row.label} className="rp-stat-row">
                          <span className="rp-stat-row-label">{row.label}</span>
                          <span className={`rp-stat-row-val ${row.color}`}>{row.val}</span>
                        </div>
                      ))}
                      {stats.total > 0 && (
                        <div className="rp-stat-row">
                          <span className="rp-stat-row-label">Success Rate</span>
                          <span className="rp-stat-row-val green">
                            {Math.round((stats.sent / stats.total) * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="rp-stats-section">
                      <div className="rp-stats-section-title">By Email Type</div>
                      {stats.by_type && Object.entries(stats.by_type).map(([key, count]) => (
                        <div key={key} className="rp-stat-row">
                          <span className="rp-stat-row-label">{typeLabel(key)}</span>
                          <span className={`rp-stat-row-val ${typeColor(key)}`}>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* TOAST */}
        {toast && (
          <div className={`rp-toast ${toast.type}`}>
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