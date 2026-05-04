// import { useState, useEffect, useRef, useCallback } from 'react'
// import { useNavigate } from 'react-router-dom'
// import { useAuth } from '../../context/AuthContext'
// import api from '../../api/axios'

// /* ─────────────────────────────────────────────
//    HELPERS
// ───────────────────────────────────────────── */
// const displayName = (user) => {
//   if (!user) return 'Admin'
//   return (
//     user.full_name ||
//     user.name ||
//     (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : null) ||
//     user.first_name ||
//     user.username ||
//     'Admin'
//   )
// }
// const initials = (name = '') => {
//   const parts = name.trim().split(' ').filter(Boolean)
//   if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
//   return (parts[0]?.[0] || 'A').toUpperCase()
// }
// const fmtDateTime = (dt) => {
//   if (!dt) return '—'
//   return new Date(dt).toLocaleDateString('en-IN', {
//     day: 'numeric', month: 'short', year: 'numeric',
//     hour: '2-digit', minute: '2-digit',
//   })
// }
// const timeAgo = (dt) => {
//   if (!dt) return ''
//   const diff = Date.now() - new Date(dt).getTime()
//   const mins = Math.floor(diff / 60000)
//   if (mins < 1)  return 'Just now'
//   if (mins < 60) return `${mins}m ago`
//   const hrs = Math.floor(mins / 60)
//   if (hrs < 24)  return `${hrs}h ago`
//   const days = Math.floor(hrs / 24)
//   return `${days}d ago`
// }

// const AUTO_REFRESH_SECS = 30

// /* ─────────────────────────────────────────────
//    ALERT CONFIG
// ───────────────────────────────────────────── */
// const ALERT_TYPES = {
//   job_overdue:        { label: 'Job Overdue',        icon: 'clock',    color: 'red'    },
//   job_unassigned:     { label: 'Unassigned Job',     icon: 'user',     color: 'amber'  },
//   technician_idle:    { label: 'Technician Idle',    icon: 'wrench',   color: 'blue'   },
//   payment_pending:    { label: 'Payment Pending',    icon: 'dollar',   color: 'amber'  },
//   customer_complaint: { label: 'Customer Complaint', icon: 'warning',  color: 'red'    },
//   job_cancelled:      { label: 'Job Cancelled',      icon: 'cancel',   color: 'red'    },
//   revisit_due:        { label: 'Revisit Due',        icon: 'revisit',  color: 'purple' },
//   system:             { label: 'System',             icon: 'system',   color: 'muted'  },
// }

// const PRIORITY_CONFIG = {
//   high:   { label: 'High',   cls: 'high'   },
//   medium: { label: 'Medium', cls: 'medium' },
//   low:    { label: 'Low',    cls: 'low'    },
// }

// const FILTER_TABS = [
//   { key: 'all',      label: 'All Alerts'    },
//   { key: 'unread',   label: 'Unread'        },
//   { key: 'high',     label: 'High Priority' },
//   { key: 'resolved', label: 'Resolved'      },
// ]

// /* ─────────────────────────────────────────────
//    STYLES
// ───────────────────────────────────────────── */
// const S = `
// @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap');
// *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
// :root{
//   --green:#1a6b3c;--green-dark:#1a4d2e;--green-light:#edf6f1;
//   --ink:#1a2e1a;--muted:#7a8c7a;--pale:#a0b0a0;
//   --border:#e8ebe8;--bg:#f0f2f0;--white:#fff;
//   --red:#e74c3c;--amber:#e6a817;--blue:#3b82f6;--purple:#7c3aed;
//   --sidebar-w:220px;
// }
// .al-root{font-family:'DM Serif Display',serif;min-height:100vh;background:var(--bg);display:flex;}
// .al-sidebar{width:var(--sidebar-w);background:var(--white);border-right:1px solid var(--border);
//   display:flex;flex-direction:column;min-height:100vh;
//   position:fixed;top:0;left:0;bottom:0;z-index:200;overflow-y:auto;transition:transform .25s ease;}
// .al-sb-logo{padding:16px 20px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border);}
// .al-sb-icon{width:28px;height:28px;background:var(--green);border-radius:6px;display:flex;align-items:center;justify-content:center;}
// .al-sb-icon svg{width:15px;height:15px;fill:white;}
// .al-sb-brand{font-size:16px;color:var(--ink);}
// .al-sb-nav{padding:12px 10px;flex:1;}
// .al-sb-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;
//   cursor:pointer;margin-bottom:2px;color:var(--muted);font-size:13.5px;
//   transition:background .15s,color .15s;white-space:nowrap;}
// .al-sb-item:hover{background:var(--bg);color:var(--ink);}
// .al-sb-item.active{background:var(--green-light);color:var(--green);}
// .al-sb-item svg{width:16px;height:16px;flex-shrink:0;}
// .al-sb-user{padding:14px 16px;border-top:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-shrink:0;}
// .al-sb-avatar{width:32px;height:32px;background:var(--green);border-radius:50%;
//   display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;flex-shrink:0;}
// .al-sb-uname{font-size:13px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
// .al-sb-urole{font-size:11px;color:var(--pale);}
// .al-sb-logout{background:none;border:none;cursor:pointer;color:var(--pale);padding:4px;border-radius:6px;
//   display:flex;align-items:center;margin-left:auto;transition:color .15s,background .15s;}
// .al-sb-logout:hover{color:var(--red);background:#fde8e8;}
// .al-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:150;}
// .al-overlay.show{display:block;}
// .al-hamburger{display:none;background:none;border:none;cursor:pointer;padding:4px;border-radius:6px;color:var(--ink);}
// .al-hamburger svg{width:20px;height:20px;}
// .al-main{flex:1;margin-left:var(--sidebar-w);display:flex;flex-direction:column;min-height:100vh;}
// .al-topbar{background:var(--white);border-bottom:1px solid var(--border);
//   padding:0 24px;height:52px;display:flex;align-items:center;
//   justify-content:space-between;position:sticky;top:0;z-index:100;flex-shrink:0;gap:12px;}
// .al-topbar-left{display:flex;align-items:center;gap:10px;}
// .al-crumb{font-size:13px;color:var(--pale);}
// .al-crumb span{color:var(--ink);}
// .al-topbar-right{display:flex;align-items:center;gap:10px;}
// .al-ticker{font-size:12px;color:var(--pale);white-space:nowrap;}
// .al-ticker.soon{color:var(--green);}
// .al-refresh-btn{background:var(--bg);color:var(--ink);border:1.5px solid var(--border);
//   border-radius:9px;padding:7px 14px;font-family:'DM Serif Display',serif;font-size:13px;
//   cursor:pointer;display:flex;align-items:center;gap:6px;transition:background .15s;}
// .al-refresh-btn:hover{background:#e2e8e2;}
// .al-refresh-btn svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2;transition:transform .35s;}
// .al-refresh-btn.spinning svg{animation:alSpin .55s linear;}
// @keyframes alSpin{to{transform:rotate(360deg);}}
// .al-mark-btn{background:var(--green-light);color:var(--green);border:1.5px solid transparent;border-radius:9px;
//   padding:7px 14px;font-family:'DM Serif Display',serif;font-size:13px;
//   cursor:pointer;display:flex;align-items:center;gap:6px;transition:background .15s;white-space:nowrap;}
// .al-mark-btn:hover{background:#d5eee3;}
// .al-mark-btn svg{width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2.5;}
// .al-content{padding:22px 24px;flex:1;}
// .al-page-title{font-size:22px;color:var(--ink);margin-bottom:3px;}
// .al-page-sub{font-size:13px;color:var(--pale);margin-bottom:20px;font-style:italic;}
// .al-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px;}
// .al-stat{background:var(--white);border-radius:14px;padding:16px 18px;box-shadow:0 1px 8px rgba(0,0,0,.05);}
// .al-stat-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--pale);margin-bottom:6px;}
// .al-stat-val{font-size:28px;color:var(--ink);letter-spacing:-1px;line-height:1;}
// .al-stat-val.red{color:var(--red);}
// .al-stat-val.amber{color:var(--amber);}
// .al-stat-val.green{color:var(--green);}
// .al-stat-val.blue{color:var(--blue);}
// .al-stat-sub{font-size:11px;color:var(--muted);margin-top:4px;}
// .al-tabs{display:flex;gap:6px;margin-bottom:18px;flex-wrap:wrap;}
// .al-tab{padding:7px 16px;border-radius:20px;font-family:'DM Serif Display',serif;
//   font-size:12.5px;cursor:pointer;border:1.5px solid var(--border);
//   background:var(--white);color:var(--muted);transition:all .15s;white-space:nowrap;}
// .al-tab:hover{border-color:var(--green);color:var(--green);}
// .al-tab.active{background:var(--green);color:#fff;border-color:var(--green);}
// .al-tab-count{background:rgba(255,255,255,.25);border-radius:10px;padding:1px 6px;font-size:11px;margin-left:5px;}
// .al-tab:not(.active) .al-tab-count{background:var(--bg);color:var(--muted);}
// .al-controls{display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap;}
// .al-search-wrap{flex:1;min-width:200px;position:relative;}
// .al-search-wrap svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);
//   width:15px;height:15px;color:var(--pale);pointer-events:none;}
// .al-search{width:100%;border:1.5px solid var(--border);border-radius:10px;
//   padding:9px 14px 9px 36px;font-family:'DM Serif Display',serif;font-size:13px;
//   color:var(--ink);outline:none;background:var(--white);transition:border-color .2s;}
// .al-search:focus{border-color:var(--green);}
// .al-sort-select{border:1.5px solid var(--border);border-radius:10px;
//   padding:9px 14px;font-family:'DM Serif Display',serif;font-size:13px;
//   color:var(--ink);outline:none;background:var(--white);cursor:pointer;min-width:180px;}
// .al-sort-select:focus{border-color:var(--green);}
// .al-list-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
// .al-list-title{font-size:15px;color:var(--ink);}
// .al-list-meta{font-size:12px;color:var(--pale);}
// .al-card{background:var(--white);border-radius:14px;padding:16px 20px;
//   margin-bottom:8px;display:flex;align-items:flex-start;gap:14px;
//   box-shadow:0 1px 6px rgba(0,0,0,.05);transition:box-shadow .15s,transform .15s;
//   cursor:pointer;position:relative;overflow:hidden;}
// .al-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.1);transform:translateY(-1px);}
// .al-card.unread{border-left:3px solid var(--green);}
// .al-card.unread-red{border-left:3px solid var(--red);}
// .al-card.unread-amber{border-left:3px solid var(--amber);}
// .al-card.unread-blue{border-left:3px solid var(--blue);}
// .al-card.unread-purple{border-left:3px solid var(--purple);}
// .al-card.resolved{opacity:.65;}
// .al-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
// .al-icon.red{background:#fde8e8;}
// .al-icon.amber{background:#fff8ec;}
// .al-icon.blue{background:#eff6ff;}
// .al-icon.green{background:var(--green-light);}
// .al-icon.purple{background:#ede9fe;}
// .al-icon.muted{background:var(--bg);}
// .al-icon svg{width:16px;height:16px;fill:none;stroke-width:2;}
// .al-icon.red svg{stroke:var(--red);}
// .al-icon.amber svg{stroke:var(--amber);}
// .al-icon.blue svg{stroke:var(--blue);}
// .al-icon.green svg{stroke:var(--green);}
// .al-icon.purple svg{stroke:var(--purple);}
// .al-icon.muted svg{stroke:var(--pale);}
// .al-body{flex:1;min-width:0;}
// .al-title-row{display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;}
// .al-title{font-size:14px;color:var(--ink);}
// .al-card.resolved .al-title{color:var(--muted);text-decoration:line-through;}
// .al-unread-dot{width:7px;height:7px;border-radius:50%;background:var(--green);flex-shrink:0;}
// .al-unread-dot.red{background:var(--red);}
// .al-unread-dot.amber{background:var(--amber);}
// .al-unread-dot.blue{background:var(--blue);}
// .al-unread-dot.purple{background:var(--purple);}
// .al-type-badge{font-size:10.5px;padding:2px 8px;border-radius:6px;font-family:'DM Serif Display',serif;}
// .al-type-badge.red{background:#fde8e8;color:var(--red);}
// .al-type-badge.amber{background:#fff8ec;color:var(--amber);}
// .al-type-badge.blue{background:#eff6ff;color:var(--blue);}
// .al-type-badge.green{background:var(--green-light);color:var(--green);}
// .al-type-badge.purple{background:#ede9fe;color:var(--purple);}
// .al-type-badge.muted{background:var(--bg);color:var(--muted);}
// .al-priority-badge{font-size:10.5px;padding:2px 8px;border-radius:6px;}
// .al-priority-badge.high{background:#fde8e8;color:var(--red);}
// .al-priority-badge.medium{background:#fff8ec;color:var(--amber);}
// .al-priority-badge.low{background:var(--bg);color:var(--muted);}
// .al-message{font-size:12.5px;color:var(--muted);margin-bottom:5px;line-height:1.5;}
// .al-meta-row{display:flex;gap:14px;flex-wrap:wrap;}
// .al-meta{font-size:11.5px;color:var(--pale);display:flex;align-items:center;gap:4px;}
// .al-meta svg{width:10px;height:10px;}
// .al-actions{display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0;}
// .al-time{font-size:11px;color:var(--pale);white-space:nowrap;}
// .al-btn-resolve{background:var(--green-light);color:var(--green);border:none;border-radius:7px;
//   padding:5px 12px;font-family:'DM Serif Display',serif;font-size:11.5px;cursor:pointer;
//   transition:background .15s;white-space:nowrap;}
// .al-btn-resolve:hover{background:#d5eee3;}
// .al-btn-unresolve{background:var(--bg);color:var(--muted);border:none;border-radius:7px;
//   padding:5px 12px;font-family:'DM Serif Display',serif;font-size:11.5px;cursor:pointer;
//   transition:background .15s;}
// .al-btn-unresolve:hover{background:#e2e8e2;}
// .al-btn-dismiss{background:none;border:none;cursor:pointer;color:var(--pale);padding:3px;border-radius:5px;
//   display:flex;align-items:center;transition:color .15s,background .15s;}
// .al-btn-dismiss:hover{color:var(--red);background:#fde8e8;}
// .al-empty{text-align:center;padding:60px 20px;}
// .al-empty-icon{font-size:40px;margin-bottom:12px;}
// .al-empty-title{font-size:18px;color:var(--ink);margin-bottom:6px;}
// .al-empty-sub{font-size:13px;color:var(--pale);}
// .al-loading{display:flex;align-items:center;justify-content:center;padding:60px;color:var(--pale);font-size:14px;gap:10px;}
// .al-spinner{width:20px;height:20px;border:2px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:alSpinner .8s linear infinite;}
// @keyframes alSpinner{to{transform:rotate(360deg);}}
// .al-error{background:#fde8e8;color:var(--red);padding:12px 16px;border-radius:10px;font-size:13px;margin-bottom:16px;}
// /* RESOLVE MODAL */
// .al-modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:500;
//   display:flex;align-items:center;justify-content:center;padding:20px;}
// .al-modal{background:var(--white);border-radius:16px;width:100%;max-width:460px;
//   box-shadow:0 20px 60px rgba(0,0,0,.15);overflow:hidden;}
// .al-modal-hdr{padding:20px 24px 16px;border-bottom:1px solid var(--border);
//   display:flex;align-items:center;justify-content:space-between;}
// .al-modal-title{font-size:17px;color:var(--ink);}
// .al-modal-close{background:none;border:none;cursor:pointer;color:var(--pale);
//   padding:4px;border-radius:6px;display:flex;align-items:center;transition:color .15s;}
// .al-modal-close:hover{color:var(--ink);}
// .al-modal-body{padding:20px 24px;}
// .al-modal-ftr{padding:16px 24px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:10px;}
// .al-modal-hint{background:var(--green-light);border-radius:10px;padding:10px 14px;
//   font-size:12.5px;color:var(--green);margin-bottom:16px;line-height:1.5;}
// .al-modal-label{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.6px;
//   color:var(--pale);margin-bottom:6px;}
// .al-modal-textarea{width:100%;border:1.5px solid var(--border);border-radius:10px;
//   padding:10px 14px;font-family:'DM Serif Display',serif;font-size:13.5px;
//   color:var(--ink);outline:none;background:var(--white);resize:vertical;
//   transition:border-color .2s;box-sizing:border-box;}
// .al-modal-textarea:focus{border-color:var(--green);}
// .al-modal-textarea.error{border-color:var(--red);}
// .al-modal-err{font-size:11.5px;color:var(--red);margin-top:4px;}
// .al-btn-cancel{background:var(--bg);color:var(--muted);border:1.5px solid var(--border);
//   border-radius:9px;padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;}
// .al-btn-cancel:hover{background:#e2e8e2;}
// .al-btn-confirm{background:var(--green);color:#fff;border:none;border-radius:9px;
//   padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;transition:background .15s;}
// .al-btn-confirm:hover{background:var(--green-dark);}
// .al-btn-confirm:disabled{opacity:.5;cursor:not-allowed;}
// /* TOAST */
// .al-toast{position:fixed;bottom:20px;right:20px;z-index:700;
//   display:flex;align-items:center;gap:10px;padding:12px 18px;border-radius:10px;
//   font-size:13px;box-shadow:0 4px 20px rgba(0,0,0,.15);animation:alSlideIn .25s ease;}
// @keyframes alSlideIn{from{transform:translateY(20px);opacity:0;}to{transform:translateY(0);opacity:1;}}
// .al-toast.success{background:var(--green);color:#fff;}
// .al-toast.error{background:var(--red);color:#fff;}
// /* RESPONSIVE */
// @media(max-width:900px){.al-stats{grid-template-columns:repeat(2,1fr);}}
// @media(max-width:768px){
//   .al-sidebar{transform:translateX(-100%);}
//   .al-sidebar.open{transform:translateX(0);}
//   .al-main{margin-left:0;}
//   .al-hamburger{display:flex;}
//   .al-card{flex-wrap:wrap;}
//   .al-actions{flex-direction:row;width:100%;justify-content:flex-end;}
//   .al-mark-btn span{display:none;}
// }
// @media(max-width:600px){
//   .al-stats{grid-template-columns:1fr 1fr;gap:10px;}
//   .al-content{padding:14px;}
//   .al-topbar{padding:0 14px;}
//   .al-stat-val{font-size:22px;}
// }
// `

// /* ─────────────────────────────────────────────
//    NAV ITEMS
// ───────────────────────────────────────────── */
// const navItems = [
//   { id: 'dashboard',   label: 'Dashboard',   path: '/dashboard',             d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
//   { id: 'jobs',        label: 'All Jobs',     path: '/dashboard/jobs',        d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
//   { id: 'customers',   label: 'Customers',    path: '/dashboard/customers',   d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
//   { id: 'technicians', label: 'Technicians',  path: '/dashboard/technicians', d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
//   { id: 'reports',     label: 'Reports',      path: '/dashboard/reports',     d: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
//   { id: 'alerts',      label: 'Smart Alerts', path: '/dashboard/alerts',      d: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
//   { id: 'settings',    label: 'Settings',     path: '/dashboard/settings',    d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
// ]

// /* ─────────────────────────────────────────────
//    ALERT ICON SVG
// ───────────────────────────────────────────── */
// function AlertIcon({ type }) {
//   const paths = {
//     clock:   'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
//     user:    'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
//     wrench:  'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
//     dollar:  'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
//     warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
//     cancel:  'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
//     revisit: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
//     system:  'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
//   }
//   const cfg = ALERT_TYPES[type] || ALERT_TYPES.system
//   const d = paths[cfg.icon] || paths.system
//   return (
//     <div className={`al-icon ${cfg.color}`}>
//       <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={d}/></svg>
//     </div>
//   )
// }

// /* ═══════════════════════════════════════════
//    MAIN COMPONENT
// ═══════════════════════════════════════════ */
// export default function AdminAlertsPage() {
//   const { user, logout } = useAuth()
//   const navigate         = useNavigate()

//   const [sidebarOpen, setSidebarOpen] = useState(false)
//   const [alerts,      setAlerts]      = useState([])
//   const [loading,     setLoading]     = useState(true)
//   const [error,       setError]       = useState('')
//   const [activeTab,   setActiveTab]   = useState('all')
//   const [search,      setSearch]      = useState('')
//   const [sortBy,      setSortBy]      = useState('newest')
//   const [isSpinning,  setIsSpinning]  = useState(false)
//   const [toast,       setToast]       = useState(null)
//   const [countdown,   setCountdown]   = useState(AUTO_REFRESH_SECS)

//   /* ── NEW: resolve modal state ── */
//   const [resolveModal, setResolveModal] = useState(null)  // holds the alert object
//   const [resolveNotes, setResolveNotes] = useState('')
//   const [notesError,   setNotesError]   = useState(false)
//   const [resolving,    setResolving]    = useState(false)

//   const tickRef   = useRef(null)
//   const isMounted = useRef(true)

//   const userName     = displayName(user)
//   const userInitials = initials(userName)

//   const showToast = (msg, type = 'success') => {
//     setToast({ msg, type })
//     setTimeout(() => isMounted.current && setToast(null), 3500)
//   }

//   /* ── FETCH ── */
//   const fetchAlerts = useCallback(async (silent = false) => {
//     if (!silent) setError('')
//     try {
//       const res = await api.get('/alerts/')
//       if (!isMounted.current) return
//       setAlerts(res.data?.results || res.data || [])
//     } catch (e) {
//       if (!silent && isMounted.current)
//         setError(e.response?.data?.detail || e.response?.data?.error || 'Failed to load alerts.')
//     } finally {
//       if (isMounted.current) setLoading(false)
//     }
//   }, [])

//   const resetTimer = useCallback(() => {
//     clearInterval(tickRef.current)
//     setCountdown(AUTO_REFRESH_SECS)
//     tickRef.current = setInterval(() => {
//       setCountdown(c => {
//         if (c <= 1) { fetchAlerts(true); return AUTO_REFRESH_SECS }
//         return c - 1
//       })
//     }, 1000)
//   }, [fetchAlerts])

//   useEffect(() => {
//     isMounted.current = true
//     fetchAlerts().then(resetTimer)
//     return () => { isMounted.current = false; clearInterval(tickRef.current) }
//   }, [fetchAlerts, resetTimer])

//   const manualRefresh = () => {
//     setIsSpinning(true)
//     fetchAlerts(true).then(() => {
//       resetTimer()
//       setTimeout(() => setIsSpinning(false), 550)
//     })
//   }

//   /* ── OPEN RESOLVE MODAL (replaces old handleResolve for unresolved alerts) ── */
//   const openResolveModal = (e, alert) => {
//     e.stopPropagation()
//     setResolveNotes('')
//     setNotesError(false)
//     setResolveModal(alert)
//   }

//   /* ── CONFIRM RESOLVE — sends resolution_notes in body ── */
//   const handleResolveConfirm = async () => {
//     if (!resolveNotes.trim()) { setNotesError(true); return }
//     setResolving(true)
//     try {
//       const res = await api.post(
//         `/alerts/${resolveModal.id}/resolve/`,
//         { resolution_notes: resolveNotes }
//       )
//       setAlerts(prev => prev.map(a => a.id === resolveModal.id ? res.data : a))
//       showToast('Alert resolved successfully.')
//       setResolveModal(null)
//     } catch (err) {
//       const data = err.response?.data
//       const msg = typeof data === 'object'
//         ? Object.values(data).flat().join(' ')
//         : 'Failed to resolve alert.'
//       showToast(msg, 'error')
//     } finally {
//       setResolving(false)
//     }
//   }

//   /* ── REOPEN (already-resolved alerts — no notes needed) ── */
//   const handleReopen = async (e, alert) => {
//     e.stopPropagation()
//     try {
//       const res = await api.patch(`/alerts/${alert.id}/`, { is_resolved: false })
//       setAlerts(prev => prev.map(a => a.id === alert.id ? res.data : a))
//       showToast('Alert reopened.')
//     } catch {
//       showToast('Failed to reopen alert.', 'error')
//     }
//   }

//   /* ── DISMISS ── */
//   const handleDismiss = async (e, id) => {
//     e.stopPropagation()
//     setAlerts(prev => prev.filter(a => a.id !== id))
//     showToast('Alert dismissed.')
//     try {
//       await api.delete(`/alerts/${id}/`)
//     } catch (err) {
//       if (err.response?.status === 404 || err.response?.status === 405) {
//         try { await api.post(`/alerts/${id}/resolve/`, { resolution_notes: 'Dismissed' }) } catch { fetchAlerts(true) }
//       } else {
//         fetchAlerts(true)
//         showToast('Failed to dismiss alert.', 'error')
//       }
//     }
//   }

//   /* ── MARK ALL READ ── */
//   const handleMarkAllRead = async () => {
//     const unreadAlerts = alerts.filter(a => !a.is_read && !a.is_resolved)
//     if (unreadAlerts.length === 0) return
//     setAlerts(prev => prev.map(a => (!a.is_read && !a.is_resolved) ? { ...a, is_read: true } : a))
//     showToast('All alerts marked as read.')
//     try {
//       await Promise.all(unreadAlerts.map(a => api.patch(`/alerts/${a.id}/`, { is_read: true })))
//     } catch {
//       fetchAlerts(true)
//       showToast('Some alerts could not be marked as read.', 'error')
//     }
//   }

//   const handleLogout = async () => {
//     clearInterval(tickRef.current)
//     await logout()
//     navigate('/login')
//   }

//   /* ── STATS ── */
//   const total    = alerts.length
//   const unread   = alerts.filter(a => !a.is_read && !a.is_resolved).length
//   const highPri  = alerts.filter(a => a.priority === 'high' && !a.is_resolved).length
//   const resolved = alerts.filter(a => a.is_resolved).length

//   const tabCount = (key) => {
//     if (key === 'all')      return total
//     if (key === 'unread')   return unread
//     if (key === 'high')     return highPri
//     if (key === 'resolved') return resolved
//     return 0
//   }

//   /* ── FILTER + SORT ── */
//   const filtered = alerts
//     .filter(a => {
//       if (activeTab === 'unread')   return !a.is_read && !a.is_resolved
//       if (activeTab === 'high')     return a.priority === 'high' && !a.is_resolved
//       if (activeTab === 'resolved') return a.is_resolved
//       return true
//     })
//     .filter(a => {
//       if (!search.trim()) return true
//       const q = search.toLowerCase()
//       return (
//         (a.title   || '').toLowerCase().includes(q) ||
//         (a.message || '').toLowerCase().includes(q) ||
//         (a.type    || '').toLowerCase().includes(q)
//       )
//     })
//     .sort((a, b) => {
//       if (sortBy === 'newest')   return new Date(b.created_at) - new Date(a.created_at)
//       if (sortBy === 'oldest')   return new Date(a.created_at) - new Date(b.created_at)
//       if (sortBy === 'priority') {
//         const order = { high: 0, medium: 1, low: 2 }
//         return (order[a.priority] ?? 1) - (order[b.priority] ?? 1)
//       }
//       return 0
//     })

//   /* ── CARD BORDER CLASS ── */
//   const cardBorderCls = (alert) => {
//     if (alert.is_resolved || alert.is_read) return ''
//     const cfg = ALERT_TYPES[alert.type] || ALERT_TYPES.system
//     return `unread-${cfg.color}`
//   }

//   return (
//     <>
//       <style>{S}</style>
//       <div className="al-root">

//         <div className={`al-overlay${sidebarOpen ? ' show' : ''}`} onClick={() => setSidebarOpen(false)}/>

//         {/* SIDEBAR */}
//         <aside className={`al-sidebar${sidebarOpen ? ' open' : ''}`}>
//           <div className="al-sb-logo">
//             <div className="al-sb-icon">
//               <svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/></svg>
//             </div>
//             <span className="al-sb-brand">PestPro</span>
//           </div>
//           <nav className="al-sb-nav">
//             {navItems.map(n => (
//               <div key={n.id}
//                 className={`al-sb-item${n.id === 'alerts' ? ' active' : ''}`}
//                 onClick={() => { setSidebarOpen(false); navigate(n.path) }}
//               >
//                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                   <path strokeLinecap="round" strokeLinejoin="round" d={n.d}/>
//                 </svg>
//                 {n.label}
//               </div>
//             ))}
//           </nav>
//           <div className="al-sb-user">
//             <div className="al-sb-avatar">{userInitials}</div>
//             <div style={{flex:1,minWidth:0}}>
//               <div className="al-sb-uname">{userName}</div>
//               <div className="al-sb-urole">Administrator</div>
//             </div>
//             <button className="al-sb-logout" type="button" onClick={handleLogout} title="Logout">
//               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                 <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
//               </svg>
//             </button>
//           </div>
//         </aside>

//         {/* MAIN */}
//         <div className="al-main">
//           <div className="al-topbar">
//             <div className="al-topbar-left">
//               <button className="al-hamburger" type="button" onClick={() => setSidebarOpen(o => !o)}>
//                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                   <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
//                 </svg>
//               </button>
//               <span className="al-crumb">Admin &nbsp;›&nbsp; <span>Smart Alerts</span></span>
//             </div>
//             <div className="al-topbar-right">
//               <span className={`al-ticker${countdown <= 10 ? ' soon' : ''}`}>↻ in {countdown}s</span>
//               <button className={`al-refresh-btn${isSpinning ? ' spinning' : ''}`} type="button" onClick={manualRefresh}>
//                 <svg viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round"
//                     d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
//                 </svg>
//                 Refresh
//               </button>
//               {unread > 0 && (
//                 <button className="al-mark-btn" type="button" onClick={handleMarkAllRead}>
//                   <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
//                   <span>Mark All Read</span>
//                 </button>
//               )}
//             </div>
//           </div>

//           <div className="al-content">
//             <div className="al-page-title">Smart Alerts</div>
//             <div className="al-page-sub">System notifications &amp; operational warnings · auto-refreshes every {AUTO_REFRESH_SECS}s</div>

//             {error && <div className="al-error">{error}</div>}

//             {loading ? (
//               <div className="al-loading"><div className="al-spinner"/>Loading alerts…</div>
//             ) : (
//               <>
//                 {/* STATS */}
//                 <div className="al-stats">
//                   <div className="al-stat">
//                     <div className="al-stat-label">Total Alerts</div>
//                     <div className="al-stat-val">{total}</div>
//                     <div className="al-stat-sub">All time</div>
//                   </div>
//                   <div className="al-stat">
//                     <div className="al-stat-label">Unread</div>
//                     <div className={`al-stat-val${unread > 0 ? ' red' : ' green'}`}>{unread}</div>
//                     <div className="al-stat-sub">{unread > 0 ? 'Needs attention' : 'All caught up'}</div>
//                   </div>
//                   <div className="al-stat">
//                     <div className="al-stat-label">High Priority</div>
//                     <div className={`al-stat-val${highPri > 0 ? ' amber' : ' green'}`}>{highPri}</div>
//                     <div className="al-stat-sub">Active &amp; unresolved</div>
//                   </div>
//                   <div className="al-stat">
//                     <div className="al-stat-label">Resolved</div>
//                     <div className="al-stat-val blue">{resolved}</div>
//                     <div className="al-stat-sub">
//                       {total > 0 ? `${Math.round((resolved / total) * 100)}% of total` : '0%'}
//                     </div>
//                   </div>
//                 </div>

//                 {/* TABS */}
//                 <div className="al-tabs">
//                   {FILTER_TABS.map(tab => (
//                     <button key={tab.key} type="button"
//                       className={`al-tab${activeTab === tab.key ? ' active' : ''}`}
//                       onClick={() => setActiveTab(tab.key)}
//                     >
//                       {tab.label}
//                       <span className="al-tab-count">{tabCount(tab.key)}</span>
//                     </button>
//                   ))}
//                 </div>

//                 {/* CONTROLS */}
//                 <div className="al-controls">
//                   <div className="al-search-wrap">
//                     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                       <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
//                     </svg>
//                     <input className="al-search"
//                       placeholder="Search alerts by title, message, type…"
//                       value={search} onChange={e => setSearch(e.target.value)}
//                     />
//                   </div>
//                   <select className="al-sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
//                     <option value="newest">Newest First</option>
//                     <option value="oldest">Oldest First</option>
//                     <option value="priority">By Priority</option>
//                   </select>
//                 </div>

//                 {/* LIST HEADER */}
//                 <div className="al-list-hdr">
//                   <span className="al-list-title">
//                     {filtered.length} alert{filtered.length !== 1 ? 's' : ''}
//                     {search ? ` matching "${search}"` : ''}
//                   </span>
//                   <span className="al-list-meta">
//                     {sortBy === 'newest' ? 'Newest First' : sortBy === 'oldest' ? 'Oldest First' : 'By Priority'}
//                   </span>
//                 </div>

//                 {/* ALERT CARDS */}
//                 {filtered.length === 0 ? (
//                   <div className="al-empty">
//                     <div className="al-empty-icon">
//                       {activeTab === 'resolved' ? '✅' : activeTab === 'unread' ? '📭' : '🔔'}
//                     </div>
//                     <div className="al-empty-title">
//                       {activeTab === 'unread' ? 'All caught up!' : activeTab === 'resolved' ? 'No resolved alerts' : 'No alerts found'}
//                     </div>
//                     <div className="al-empty-sub">
//                       {search
//                         ? `No alerts match "${search}"`
//                         : activeTab === 'unread'
//                         ? 'No unread alerts — everything looks good.'
//                         : activeTab === 'high'
//                         ? 'No high priority alerts at the moment.'
//                         : activeTab === 'resolved'
//                         ? 'No alerts have been resolved yet.'
//                         : 'No alerts in the system yet.'}
//                     </div>
//                   </div>
//                 ) : (
//                   filtered.map(alert => {
//                     const cfg = ALERT_TYPES[alert.type] || ALERT_TYPES.system
//                     const pri = PRIORITY_CONFIG[alert.priority] || PRIORITY_CONFIG.medium
//                     const borderCls = cardBorderCls(alert)
//                     return (
//                       <div
//                         key={alert.id}
//                         className={`al-card ${borderCls} ${alert.is_resolved ? 'resolved' : ''}`}
//                         onClick={() => {
//   if (!alert.is_read) {
//     api.patch(`/alerts/${alert.id}/`, { is_read: true }).then(res => {
//       setAlerts(prev => prev.map(a => a.id === alert.id ? res.data : a))
//     }).catch(() => {})
//   }
//   navigate(`/dashboard/alerts/${alert.id}`)
// }}
//                       >
//                         <AlertIcon type={alert.type} />

//                         <div className="al-body">
//                           <div className="al-title-row">
//                             {!alert.is_read && !alert.is_resolved && (
//                               <span className={`al-unread-dot ${cfg.color}`}/>
//                             )}
//                             <span className="al-title">{alert.title || cfg.label}</span>
//                             <span className={`al-type-badge ${cfg.color}`}>{cfg.label}</span>
//                             <span className={`al-priority-badge ${pri.cls}`}>{pri.label}</span>
//                             {alert.is_resolved && (
//                               <span style={{fontSize:10.5,padding:'2px 8px',borderRadius:6,background:'var(--green-light)',color:'var(--green)'}}>
//                                 ✓ Resolved
//                               </span>
//                             )}
//                           </div>
//                           <div className="al-message">{alert.message || 'No details provided.'}</div>
//                           <div className="al-meta-row">
//                             <span className="al-meta">
//                               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                                 <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
//                               </svg>
//                               {fmtDateTime(alert.created_at)}
//                             </span>
//                             {alert.customer_name && (
//                               <span className="al-meta">
//                                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                                   <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
//                                 </svg>
//                                 {alert.customer_name}
//                               </span>
//                             )}
//                             {alert.job_id && (
//                               <span className="al-meta">
//                                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                                   <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
//                                 </svg>
//                                 Job #{alert.job_id}
//                               </span>
//                             )}
//                           </div>
//                         </div>

//                         <div className="al-actions" onClick={e => e.stopPropagation()}>
//                           <span className="al-time">{timeAgo(alert.created_at)}</span>
//                           {/* ── Resolve button now opens modal; Reopen calls handleReopen directly ── */}
//                           <button
//                             className={alert.is_resolved ? 'al-btn-unresolve' : 'al-btn-resolve'}
//                             type="button"
//                             onClick={e => alert.is_resolved ? handleReopen(e, alert) : openResolveModal(e, alert)}
//                           >
//                             {alert.is_resolved ? 'Reopen' : 'Resolve'}
//                           </button>
//                           <button className="al-btn-dismiss" type="button" onClick={e => handleDismiss(e, alert.id)} title="Dismiss">
//                             <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                               <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
//                             </svg>
//                           </button>
//                         </div>
//                       </div>
//                     )
//                   })
//                 )}
//               </>
//             )}
//           </div>
//         </div>

//         {/* ── RESOLVE MODAL ── */}
//         {resolveModal && (
//           <div className="al-modal-bg" onClick={e => { if (e.target === e.currentTarget) setResolveModal(null) }}>
//             <div className="al-modal">
//               <div className="al-modal-hdr">
//                 <span className="al-modal-title">Resolve Alert</span>
//                 <button className="al-modal-close" type="button" onClick={() => setResolveModal(null)}>
//                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                     <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
//                   </svg>
//                 </button>
//               </div>
//               <div className="al-modal-body">
//                 <div className="al-modal-hint">
//                   <strong>{resolveModal.title || ALERT_TYPES[resolveModal.type]?.label || 'Alert'}</strong>
//                   {resolveModal.message ? ` — ${resolveModal.message}` : ''}
//                 </div>
//                 <label className="al-modal-label">Resolution Notes *</label>
//                 <textarea
//                   className={`al-modal-textarea${notesError ? ' error' : ''}`}
//                   rows={4}
//                   placeholder="Describe what action was taken to resolve this alert…"
//                   value={resolveNotes}
//                   onChange={e => { setResolveNotes(e.target.value); setNotesError(false) }}
//                 />
//                 {notesError && (
//                   <div className="al-modal-err">Resolution notes are required.</div>
//                 )}
//               </div>
//               <div className="al-modal-ftr">
//                 <button className="al-btn-cancel" type="button" onClick={() => setResolveModal(null)}>Cancel</button>
//                 <button
//                   className="al-btn-confirm"
//                   type="button"
//                   onClick={handleResolveConfirm}
//                   disabled={resolving}
//                 >
//                   {resolving ? 'Resolving…' : 'Mark as Resolved'}
//                 </button>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* TOAST */}
//         {toast && (
//           <div className={`al-toast ${toast.type}`}>
//             {toast.type === 'success'
//               ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
//               : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
//             }
//             {toast.msg}
//           </div>
//         )}
//       </div>
//     </>
//   )
// }



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
const fmtDateTime = (dt) => {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
const timeAgo = (dt) => {
  if (!dt) return ''
  const diff = Date.now() - new Date(dt).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

const AUTO_REFRESH_SECS = 30

/* ─────────────────────────────────────────────
   ALERT CONFIG
───────────────────────────────────────────── */
const ALERT_TYPES = {
  job_overdue:        { label: 'Job Overdue',        icon: 'clock',    color: 'red'    },
  job_unassigned:     { label: 'Unassigned Job',     icon: 'user',     color: 'amber'  },
  technician_idle:    { label: 'Technician Idle',    icon: 'wrench',   color: 'blue'   },
  payment_pending:    { label: 'Payment Pending',    icon: 'dollar',   color: 'amber'  },
  customer_complaint: { label: 'Customer Complaint', icon: 'warning',  color: 'red'    },
  job_cancelled:      { label: 'Job Cancelled',      icon: 'cancel',   color: 'red'    },
  revisit_due:        { label: 'Revisit Due',        icon: 'revisit',  color: 'purple' },
  system:             { label: 'System',             icon: 'system',   color: 'muted'  },
}

const PRIORITY_CONFIG = {
  high:   { label: 'High',   cls: 'high'   },
  medium: { label: 'Medium', cls: 'medium' },
  low:    { label: 'Low',    cls: 'low'    },
}

const FILTER_TABS = [
  { key: 'all',      label: 'All Alerts'    },
  { key: 'unread',   label: 'Unread'        },
  { key: 'high',     label: 'High Priority' },
  { key: 'resolved', label: 'Resolved'      },
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
.al-root{font-family:'DM Serif Display',serif;min-height:100vh;background:var(--bg);display:flex;}
.al-sidebar{width:var(--sidebar-w);background:var(--white);border-right:1px solid var(--border);
  display:flex;flex-direction:column;min-height:100vh;
  position:fixed;top:0;left:0;bottom:0;z-index:200;overflow-y:auto;transition:transform .25s ease;}
.al-sb-logo{padding:16px 20px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border);}
.al-sb-icon{width:28px;height:28px;background:var(--green);border-radius:6px;display:flex;align-items:center;justify-content:center;}
.al-sb-icon svg{width:15px;height:15px;fill:white;}
.al-sb-brand{font-size:16px;color:var(--ink);}
.al-sb-nav{padding:12px 10px;flex:1;}
.al-sb-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;
  cursor:pointer;margin-bottom:2px;color:var(--muted);font-size:13.5px;
  transition:background .15s,color .15s;white-space:nowrap;}
.al-sb-item:hover{background:var(--bg);color:var(--ink);}
.al-sb-item.active{background:var(--green-light);color:var(--green);}
.al-sb-item svg{width:16px;height:16px;flex-shrink:0;}
.al-sb-user{padding:14px 16px;border-top:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-shrink:0;}
.al-sb-avatar{width:32px;height:32px;background:var(--green);border-radius:50%;
  display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;flex-shrink:0;}
.al-sb-uname{font-size:13px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.al-sb-urole{font-size:11px;color:var(--pale);}
.al-sb-logout{background:none;border:none;cursor:pointer;color:var(--pale);padding:4px;border-radius:6px;
  display:flex;align-items:center;margin-left:auto;transition:color .15s,background .15s;}
.al-sb-logout:hover{color:var(--red);background:#fde8e8;}
.al-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:150;}
.al-overlay.show{display:block;}
.al-hamburger{display:none;background:none;border:none;cursor:pointer;padding:4px;border-radius:6px;color:var(--ink);}
.al-hamburger svg{width:20px;height:20px;}
.al-main{flex:1;margin-left:var(--sidebar-w);display:flex;flex-direction:column;min-height:100vh;}
.al-topbar{background:var(--white);border-bottom:1px solid var(--border);
  padding:0 24px;height:52px;display:flex;align-items:center;
  justify-content:space-between;position:sticky;top:0;z-index:100;flex-shrink:0;gap:12px;}
.al-topbar-left{display:flex;align-items:center;gap:10px;}
.al-crumb{font-size:13px;color:var(--pale);}
.al-crumb span{color:var(--ink);}
.al-topbar-right{display:flex;align-items:center;gap:10px;}
.al-ticker{font-size:12px;color:var(--pale);white-space:nowrap;}
.al-ticker.soon{color:var(--green);}
.al-refresh-btn{background:var(--bg);color:var(--ink);border:1.5px solid var(--border);
  border-radius:9px;padding:7px 14px;font-family:'DM Serif Display',serif;font-size:13px;
  cursor:pointer;display:flex;align-items:center;gap:6px;transition:background .15s;}
.al-refresh-btn:hover{background:#e2e8e2;}
.al-refresh-btn svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2;transition:transform .35s;}
.al-refresh-btn.spinning svg{animation:alSpin .55s linear;}
@keyframes alSpin{to{transform:rotate(360deg);}}
.al-mark-btn{background:var(--green-light);color:var(--green);border:1.5px solid transparent;border-radius:9px;
  padding:7px 14px;font-family:'DM Serif Display',serif;font-size:13px;
  cursor:pointer;display:flex;align-items:center;gap:6px;transition:background .15s;white-space:nowrap;}
.al-mark-btn:hover{background:#d5eee3;}
.al-mark-btn svg{width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2.5;}
.al-content{padding:22px 24px;flex:1;}
.al-page-title{font-size:22px;color:var(--ink);margin-bottom:3px;}
.al-page-sub{font-size:13px;color:var(--pale);margin-bottom:20px;font-style:italic;}
.al-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px;}
.al-stat{background:var(--white);border-radius:14px;padding:16px 18px;box-shadow:0 1px 8px rgba(0,0,0,.05);}
.al-stat-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--pale);margin-bottom:6px;}
.al-stat-val{font-size:28px;color:var(--ink);letter-spacing:-1px;line-height:1;}
.al-stat-val.red{color:var(--red);}
.al-stat-val.amber{color:var(--amber);}
.al-stat-val.green{color:var(--green);}
.al-stat-val.blue{color:var(--blue);}
.al-stat-sub{font-size:11px;color:var(--muted);margin-top:4px;}
.al-tabs{display:flex;gap:6px;margin-bottom:18px;flex-wrap:wrap;}
.al-tab{padding:7px 16px;border-radius:20px;font-family:'DM Serif Display',serif;
  font-size:12.5px;cursor:pointer;border:1.5px solid var(--border);
  background:var(--white);color:var(--muted);transition:all .15s;white-space:nowrap;}
.al-tab:hover{border-color:var(--green);color:var(--green);}
.al-tab.active{background:var(--green);color:#fff;border-color:var(--green);}
.al-tab-count{background:rgba(255,255,255,.25);border-radius:10px;padding:1px 6px;font-size:11px;margin-left:5px;}
.al-tab:not(.active) .al-tab-count{background:var(--bg);color:var(--muted);}
.al-controls{display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap;}
.al-search-wrap{flex:1;min-width:200px;position:relative;}
.al-search-wrap svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);
  width:15px;height:15px;color:var(--pale);pointer-events:none;}
.al-search{width:100%;border:1.5px solid var(--border);border-radius:10px;
  padding:9px 14px 9px 36px;font-family:'DM Serif Display',serif;font-size:13px;
  color:var(--ink);outline:none;background:var(--white);transition:border-color .2s;}
.al-search:focus{border-color:var(--green);}
.al-sort-select{border:1.5px solid var(--border);border-radius:10px;
  padding:9px 14px;font-family:'DM Serif Display',serif;font-size:13px;
  color:var(--ink);outline:none;background:var(--white);cursor:pointer;min-width:180px;}
.al-sort-select:focus{border-color:var(--green);}
.al-list-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
.al-list-title{font-size:15px;color:var(--ink);}
.al-list-meta{font-size:12px;color:var(--pale);}
.al-card{background:var(--white);border-radius:14px;padding:16px 20px;
  margin-bottom:8px;display:flex;align-items:flex-start;gap:14px;
  box-shadow:0 1px 6px rgba(0,0,0,.05);transition:box-shadow .15s,transform .15s;
  cursor:pointer;position:relative;overflow:hidden;}
.al-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.1);transform:translateY(-1px);}
.al-card.unread{border-left:3px solid var(--green);}
.al-card.unread-red{border-left:3px solid var(--red);}
.al-card.unread-amber{border-left:3px solid var(--amber);}
.al-card.unread-blue{border-left:3px solid var(--blue);}
.al-card.unread-purple{border-left:3px solid var(--purple);}
.al-card.resolved{opacity:.65;}
.al-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.al-icon.red{background:#fde8e8;}
.al-icon.amber{background:#fff8ec;}
.al-icon.blue{background:#eff6ff;}
.al-icon.green{background:var(--green-light);}
.al-icon.purple{background:#ede9fe;}
.al-icon.muted{background:var(--bg);}
.al-icon svg{width:16px;height:16px;fill:none;stroke-width:2;}
.al-icon.red svg{stroke:var(--red);}
.al-icon.amber svg{stroke:var(--amber);}
.al-icon.blue svg{stroke:var(--blue);}
.al-icon.green svg{stroke:var(--green);}
.al-icon.purple svg{stroke:var(--purple);}
.al-icon.muted svg{stroke:var(--pale);}
.al-body{flex:1;min-width:0;}
.al-title-row{display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;}
.al-title{font-size:14px;color:var(--ink);}
.al-card.resolved .al-title{color:var(--muted);text-decoration:line-through;}
.al-unread-dot{width:7px;height:7px;border-radius:50%;background:var(--green);flex-shrink:0;}
.al-unread-dot.red{background:var(--red);}
.al-unread-dot.amber{background:var(--amber);}
.al-unread-dot.blue{background:var(--blue);}
.al-unread-dot.purple{background:var(--purple);}
.al-type-badge{font-size:10.5px;padding:2px 8px;border-radius:6px;font-family:'DM Serif Display',serif;}
.al-type-badge.red{background:#fde8e8;color:var(--red);}
.al-type-badge.amber{background:#fff8ec;color:var(--amber);}
.al-type-badge.blue{background:#eff6ff;color:var(--blue);}
.al-type-badge.green{background:var(--green-light);color:var(--green);}
.al-type-badge.purple{background:#ede9fe;color:var(--purple);}
.al-type-badge.muted{background:var(--bg);color:var(--muted);}
.al-priority-badge{font-size:10.5px;padding:2px 8px;border-radius:6px;}
.al-priority-badge.high{background:#fde8e8;color:var(--red);}
.al-priority-badge.medium{background:#fff8ec;color:var(--amber);}
.al-priority-badge.low{background:var(--bg);color:var(--muted);}
.al-message{font-size:12.5px;color:var(--muted);margin-bottom:5px;line-height:1.5;}
.al-meta-row{display:flex;gap:14px;flex-wrap:wrap;}
.al-meta{font-size:11.5px;color:var(--pale);display:flex;align-items:center;gap:4px;}
.al-meta svg{width:10px;height:10px;}
.al-actions{display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0;}
.al-time{font-size:11px;color:var(--pale);white-space:nowrap;}
.al-btn-resolve{background:var(--green-light);color:var(--green);border:none;border-radius:7px;
  padding:5px 12px;font-family:'DM Serif Display',serif;font-size:11.5px;cursor:pointer;
  transition:background .15s;white-space:nowrap;}
.al-btn-resolve:hover{background:#d5eee3;}
.al-btn-unresolve{background:var(--bg);color:var(--muted);border:none;border-radius:7px;
  padding:5px 12px;font-family:'DM Serif Display',serif;font-size:11.5px;cursor:pointer;
  transition:background .15s;}
.al-btn-unresolve:hover{background:#e2e8e2;}
.al-btn-dismiss{background:none;border:none;cursor:pointer;color:var(--pale);padding:3px;border-radius:5px;
  display:flex;align-items:center;transition:color .15s,background .15s;}
.al-btn-dismiss:hover{color:var(--red);background:#fde8e8;}
.al-empty{text-align:center;padding:60px 20px;}
.al-empty-icon{font-size:40px;margin-bottom:12px;}
.al-empty-title{font-size:18px;color:var(--ink);margin-bottom:6px;}
.al-empty-sub{font-size:13px;color:var(--pale);}
.al-loading{display:flex;align-items:center;justify-content:center;padding:60px;color:var(--pale);font-size:14px;gap:10px;}
.al-spinner{width:20px;height:20px;border:2px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:alSpinner .8s linear infinite;}
@keyframes alSpinner{to{transform:rotate(360deg);}}
.al-error{background:#fde8e8;color:var(--red);padding:12px 16px;border-radius:10px;font-size:13px;margin-bottom:16px;}
/* RESOLVE MODAL */
.al-modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:500;
  display:flex;align-items:center;justify-content:center;padding:20px;}
.al-modal{background:var(--white);border-radius:16px;width:100%;max-width:460px;
  box-shadow:0 20px 60px rgba(0,0,0,.15);overflow:hidden;}
.al-modal-hdr{padding:20px 24px 16px;border-bottom:1px solid var(--border);
  display:flex;align-items:center;justify-content:space-between;}
.al-modal-title{font-size:17px;color:var(--ink);}
.al-modal-close{background:none;border:none;cursor:pointer;color:var(--pale);
  padding:4px;border-radius:6px;display:flex;align-items:center;transition:color .15s;}
.al-modal-close:hover{color:var(--ink);}
.al-modal-body{padding:20px 24px;}
.al-modal-ftr{padding:16px 24px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:10px;}
.al-modal-hint{background:var(--green-light);border-radius:10px;padding:10px 14px;
  font-size:12.5px;color:var(--green);margin-bottom:16px;line-height:1.5;}
.al-modal-label{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.6px;
  color:var(--pale);margin-bottom:6px;}
.al-modal-textarea{width:100%;border:1.5px solid var(--border);border-radius:10px;
  padding:10px 14px;font-family:'DM Serif Display',serif;font-size:13.5px;
  color:var(--ink);outline:none;background:var(--white);resize:vertical;
  transition:border-color .2s;box-sizing:border-box;}
.al-modal-textarea:focus{border-color:var(--green);}
.al-modal-textarea.error{border-color:var(--red);}
.al-modal-err{font-size:11.5px;color:var(--red);margin-top:4px;}
.al-btn-cancel{background:var(--bg);color:var(--muted);border:1.5px solid var(--border);
  border-radius:9px;padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;}
.al-btn-cancel:hover{background:#e2e8e2;}
.al-btn-confirm{background:var(--green);color:#fff;border:none;border-radius:9px;
  padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;transition:background .15s;}
.al-btn-confirm:hover{background:var(--green-dark);}
.al-btn-confirm:disabled{opacity:.5;cursor:not-allowed;}
/* TOAST */
.al-toast{position:fixed;bottom:20px;right:20px;z-index:700;
  display:flex;align-items:center;gap:10px;padding:12px 18px;border-radius:10px;
  font-size:13px;box-shadow:0 4px 20px rgba(0,0,0,.15);animation:alSlideIn .25s ease;}
@keyframes alSlideIn{from{transform:translateY(20px);opacity:0;}to{transform:translateY(0);opacity:1;}}
.al-toast.success{background:var(--green);color:#fff;}
.al-toast.error{background:var(--red);color:#fff;}
/* RESPONSIVE */
@media(max-width:900px){.al-stats{grid-template-columns:repeat(2,1fr);}}
@media(max-width:768px){
  .al-sidebar{transform:translateX(-100%);}
  .al-sidebar.open{transform:translateX(0);}
  .al-main{margin-left:0;}
  .al-hamburger{display:flex;}
  .al-card{flex-wrap:wrap;}
  .al-actions{flex-direction:row;width:100%;justify-content:flex-end;}
  .al-mark-btn span{display:none;}
}
@media(max-width:600px){
  .al-stats{grid-template-columns:1fr 1fr;gap:10px;}
  .al-content{padding:14px;}
  .al-topbar{padding:0 14px;}
  .al-stat-val{font-size:22px;}
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

/* ─────────────────────────────────────────────
   ALERT ICON SVG
───────────────────────────────────────────── */
function AlertIcon({ type }) {
  const paths = {
    clock:   'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    user:    'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    wrench:  'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    dollar:  'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    cancel:  'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
    revisit: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
    system:  'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  }
  const cfg = ALERT_TYPES[type] || ALERT_TYPES.system
  const d = paths[cfg.icon] || paths.system
  return (
    <div className={`al-icon ${cfg.color}`}>
      <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={d}/></svg>
    </div>
  )
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export default function AdminAlertsPage() {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [alerts,      setAlerts]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [activeTab,   setActiveTab]   = useState('all')
  const [search,      setSearch]      = useState('')
  const [sortBy,      setSortBy]      = useState('newest')
  const [isSpinning,  setIsSpinning]  = useState(false)
  const [toast,       setToast]       = useState(null)
  const [countdown,   setCountdown]   = useState(AUTO_REFRESH_SECS)

  /* ── NEW: resolve modal state ── */
  const [resolveModal, setResolveModal] = useState(null)  // holds the alert object
  const [resolveNotes, setResolveNotes] = useState('')
  const [notesError,   setNotesError]   = useState(false)
  const [resolving,    setResolving]    = useState(false)

  const tickRef   = useRef(null)
  const isMounted = useRef(true)

  const userName     = displayName(user)
  const userInitials = initials(userName)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => isMounted.current && setToast(null), 3500)
  }

  /* ── FETCH ── */
  const fetchAlerts = useCallback(async (silent = false) => {
    if (!silent) setError('')
    try {
      const res = await api.get('/alerts/')
      if (!isMounted.current) return
      setAlerts(res.data?.results || res.data || [])
    } catch (e) {
      if (!silent && isMounted.current)
        setError(e.response?.data?.detail || e.response?.data?.error || 'Failed to load alerts.')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [])

  const resetTimer = useCallback(() => {
    clearInterval(tickRef.current)
    setCountdown(AUTO_REFRESH_SECS)
    tickRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { fetchAlerts(true); return AUTO_REFRESH_SECS }
        return c - 1
      })
    }, 1000)
  }, [fetchAlerts])

  useEffect(() => {
    isMounted.current = true
    fetchAlerts().then(resetTimer)
    return () => { isMounted.current = false; clearInterval(tickRef.current) }
  }, [fetchAlerts, resetTimer])

  const manualRefresh = () => {
    setIsSpinning(true)
    fetchAlerts(true).then(() => {
      resetTimer()
      setTimeout(() => setIsSpinning(false), 550)
    })
  }

  /* ── OPEN RESOLVE MODAL (replaces old handleResolve for unresolved alerts) ── */
  const openResolveModal = (e, alert) => {
    e.stopPropagation()
    setResolveNotes('')
    setNotesError(false)
    setResolveModal(alert)
  }

  /* ── CONFIRM RESOLVE — sends resolution_notes in body ── */
  const handleResolveConfirm = async () => {
    if (!resolveNotes.trim()) { setNotesError(true); return }
    setResolving(true)
    try {
      const res = await api.post(
        `/alerts/${resolveModal.id}/resolve/`,
        { resolution_notes: resolveNotes }
      )
      setAlerts(prev => prev.map(a => a.id === resolveModal.id ? res.data : a))
      showToast('Alert resolved successfully.')
      setResolveModal(null)
    } catch (err) {
      const data = err.response?.data
      const msg = typeof data === 'object'
        ? Object.values(data).flat().join(' ')
        : 'Failed to resolve alert.'
      showToast(msg, 'error')
    } finally {
      setResolving(false)
    }
  }

  /* ── REOPEN (already-resolved alerts — no notes needed) ── */
  const handleReopen = async (e, alert) => {
    e.stopPropagation()
    try {
      const res = await api.patch(`/alerts/${alert.id}/`, { is_resolved: false })
      setAlerts(prev => prev.map(a => a.id === alert.id ? res.data : a))
      showToast('Alert reopened.')
    } catch {
      showToast('Failed to reopen alert.', 'error')
    }
  }

  /* ── DISMISS ── */
  const handleDismiss = async (e, id) => {
    e.stopPropagation()
    setAlerts(prev => prev.filter(a => a.id !== id))
    showToast('Alert dismissed.')
    try {
      await api.delete(`/alerts/${id}/`)
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 405) {
        try { await api.post(`/alerts/${id}/resolve/`, { resolution_notes: 'Dismissed' }) } catch { fetchAlerts(true) }
      } else {
        fetchAlerts(true)
        showToast('Failed to dismiss alert.', 'error')
      }
    }
  }

  /* ── MARK ALL READ ── */
  const handleMarkAllRead = async () => {
    const unreadAlerts = alerts.filter(a => !a.is_read && !a.is_resolved)
    if (unreadAlerts.length === 0) return
    setAlerts(prev => prev.map(a => (!a.is_read && !a.is_resolved) ? { ...a, is_read: true } : a))
    showToast('All alerts marked as read.')
    try {
      await Promise.all(unreadAlerts.map(a => api.patch(`/alerts/${a.id}/`, { is_read: true })))
    } catch {
      fetchAlerts(true)
      showToast('Some alerts could not be marked as read.', 'error')
    }
  }

  const handleLogout = async () => {
    clearInterval(tickRef.current)
    await logout()
    navigate('/login')
  }

  /* ── STATS ── */
  const total    = alerts.length
  const unread   = alerts.filter(a => !a.is_read && !a.is_resolved).length
  const highPri  = alerts.filter(a => a.priority === 'high' && !a.is_resolved).length
  const resolved = alerts.filter(a => a.is_resolved).length

  const tabCount = (key) => {
    if (key === 'all')      return total
    if (key === 'unread')   return unread
    if (key === 'high')     return highPri
    if (key === 'resolved') return resolved
    return 0
  }

  /* ── FILTER + SORT ── */
  const filtered = alerts
    .filter(a => {
      if (activeTab === 'unread')   return !a.is_read && !a.is_resolved
      if (activeTab === 'high')     return a.priority === 'high' && !a.is_resolved
      if (activeTab === 'resolved') return a.is_resolved
      return true
    })
    .filter(a => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        (a.title   || '').toLowerCase().includes(q) ||
        (a.message || '').toLowerCase().includes(q) ||
        (a.type    || '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      if (sortBy === 'newest')   return new Date(b.created_at) - new Date(a.created_at)
      if (sortBy === 'oldest')   return new Date(a.created_at) - new Date(b.created_at)
      if (sortBy === 'priority') {
        const order = { high: 0, medium: 1, low: 2 }
        return (order[a.priority] ?? 1) - (order[b.priority] ?? 1)
      }
      return 0
    })

  /* ── CARD BORDER CLASS ── */
  const cardBorderCls = (alert) => {
    if (alert.is_resolved || alert.is_read) return ''
    const cfg = ALERT_TYPES[alert.type] || ALERT_TYPES.system
    return `unread-${cfg.color}`
  }

  return (
    <>
      <style>{S}</style>
      <div className="al-root">

        <div className={`al-overlay${sidebarOpen ? ' show' : ''}`} onClick={() => setSidebarOpen(false)}/>

        {/* SIDEBAR */}
        <aside className={`al-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="al-sb-logo">
            <div className="al-sb-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/></svg>
            </div>
            <span className="al-sb-brand">PestPro</span>
          </div>
          <nav className="al-sb-nav">
            {navItems.map(n => (
              <div key={n.id}
                className={`al-sb-item${n.id === 'alerts' ? ' active' : ''}`}
                onClick={() => { setSidebarOpen(false); navigate(n.path) }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d={n.d}/>
                </svg>
                {n.label}
              </div>
            ))}
          </nav>
          <div className="al-sb-user">
            <div className="al-sb-avatar">{userInitials}</div>
            <div style={{flex:1,minWidth:0}}>
              <div className="al-sb-uname">{userName}</div>
              <div className="al-sb-urole">Administrator</div>
            </div>
            <button className="al-sb-logout" type="button" onClick={handleLogout} title="Logout">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <div className="al-main">
          <div className="al-topbar">
            <div className="al-topbar-left">
              <button className="al-hamburger" type="button" onClick={() => setSidebarOpen(o => !o)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              </button>
              <span className="al-crumb">Admin &nbsp;›&nbsp; <span>Smart Alerts</span></span>
            </div>
            <div className="al-topbar-right">
              <span className={`al-ticker${countdown <= 10 ? ' soon' : ''}`}>↻ in {countdown}s</span>
              <button className={`al-refresh-btn${isSpinning ? ' spinning' : ''}`} type="button" onClick={manualRefresh}>
                <svg viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Refresh
              </button>
              {unread > 0 && (
                <button className="al-mark-btn" type="button" onClick={handleMarkAllRead}>
                  <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                  <span>Mark All Read</span>
                </button>
              )}
            </div>
          </div>

          <div className="al-content">
            <div className="al-page-title">Smart Alerts</div>
            <div className="al-page-sub">System notifications &amp; operational warnings · auto-refreshes every {AUTO_REFRESH_SECS}s</div>

            {error && <div className="al-error">{error}</div>}

            {loading ? (
              <div className="al-loading"><div className="al-spinner"/>Loading alerts…</div>
            ) : (
              <>
                {/* STATS */}
                <div className="al-stats">
                  <div className="al-stat">
                    <div className="al-stat-label">Total Alerts</div>
                    <div className="al-stat-val">{total}</div>
                    <div className="al-stat-sub">All time</div>
                  </div>
                  <div className="al-stat">
                    <div className="al-stat-label">Unread</div>
                    <div className={`al-stat-val${unread > 0 ? ' red' : ' green'}`}>{unread}</div>
                    <div className="al-stat-sub">{unread > 0 ? 'Needs attention' : 'All caught up'}</div>
                  </div>
                  <div className="al-stat">
                    <div className="al-stat-label">High Priority</div>
                    <div className={`al-stat-val${highPri > 0 ? ' amber' : ' green'}`}>{highPri}</div>
                    <div className="al-stat-sub">Active &amp; unresolved</div>
                  </div>
                  <div className="al-stat">
                    <div className="al-stat-label">Resolved</div>
                    <div className="al-stat-val blue">{resolved}</div>
                    <div className="al-stat-sub">
                      {total > 0 ? `${Math.round((resolved / total) * 100)}% of total` : '0%'}
                    </div>
                  </div>
                </div>

                {/* TABS */}
                <div className="al-tabs">
                  {FILTER_TABS.map(tab => (
                    <button key={tab.key} type="button"
                      className={`al-tab${activeTab === tab.key ? ' active' : ''}`}
                      onClick={() => setActiveTab(tab.key)}
                    >
                      {tab.label}
                      <span className="al-tab-count">{tabCount(tab.key)}</span>
                    </button>
                  ))}
                </div>

                {/* CONTROLS */}
                <div className="al-controls">
                  <div className="al-search-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    <input className="al-search"
                      placeholder="Search alerts by title, message, type…"
                      value={search} onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                  <select className="al-sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="priority">By Priority</option>
                  </select>
                </div>

                {/* LIST HEADER */}
                <div className="al-list-hdr">
                  <span className="al-list-title">
                    {filtered.length} alert{filtered.length !== 1 ? 's' : ''}
                    {search ? ` matching "${search}"` : ''}
                  </span>
                  <span className="al-list-meta">
                    {sortBy === 'newest' ? 'Newest First' : sortBy === 'oldest' ? 'Oldest First' : 'By Priority'}
                  </span>
                </div>

                {/* ALERT CARDS */}
                {filtered.length === 0 ? (
                  <div className="al-empty">
                    <div className="al-empty-icon">
                      {activeTab === 'resolved' ? '✅' : activeTab === 'unread' ? '📭' : '🔔'}
                    </div>
                    <div className="al-empty-title">
                      {activeTab === 'unread' ? 'All caught up!' : activeTab === 'resolved' ? 'No resolved alerts' : 'No alerts found'}
                    </div>
                    <div className="al-empty-sub">
                      {search
                        ? `No alerts match "${search}"`
                        : activeTab === 'unread'
                        ? 'No unread alerts — everything looks good.'
                        : activeTab === 'high'
                        ? 'No high priority alerts at the moment.'
                        : activeTab === 'resolved'
                        ? 'No alerts have been resolved yet.'
                        : 'No alerts in the system yet.'}
                    </div>
                  </div>
                ) : (
                  filtered.map(alert => {
                    const cfg = ALERT_TYPES[alert.type] || ALERT_TYPES.system
                    const pri = PRIORITY_CONFIG[alert.priority] || PRIORITY_CONFIG.medium
                    const borderCls = cardBorderCls(alert)
                    return (
                      <div
                        key={alert.id}
                        className={`al-card ${borderCls} ${alert.is_resolved ? 'resolved' : ''}`}
                         onClick={() => {
  if (!alert.is_read) {
    api.patch(`/alerts/${alert.id}/`, { is_read: true }).then(res => {
      setAlerts(prev => prev.map(a => a.id === alert.id ? res.data : a))
    }).catch(() => {})
  }
  navigate(`/dashboard/alerts/${alert.id}`)
}}
                      >
                        <AlertIcon type={alert.type} />

                        <div className="al-body">
                          <div className="al-title-row">
                            {!alert.is_read && !alert.is_resolved && (
                              <span className={`al-unread-dot ${cfg.color}`}/>
                            )}
                            <span className="al-title">{alert.title || cfg.label}</span>
                            <span className={`al-type-badge ${cfg.color}`}>{cfg.label}</span>
                            <span className={`al-priority-badge ${pri.cls}`}>{pri.label}</span>
                            {alert.is_resolved && (
                              <span style={{fontSize:10.5,padding:'2px 8px',borderRadius:6,background:'var(--green-light)',color:'var(--green)'}}>
                                ✓ Resolved
                              </span>
                            )}
                          </div>
                          <div className="al-message">{alert.message || 'No details provided.'}</div>
                          <div className="al-meta-row">
                            <span className="al-meta">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                              </svg>
                              {fmtDateTime(alert.created_at)}
                            </span>
                            {alert.customer_name && (
                              <span className="al-meta">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                </svg>
                                {alert.customer_name}
                              </span>
                            )}
                            {alert.job_id && (
                              <span className="al-meta">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                                </svg>
                                Job #{alert.job_id}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="al-actions" onClick={e => e.stopPropagation()}>
                          <span className="al-time">{timeAgo(alert.created_at)}</span>
                          {/* ── Resolve button now opens modal; Reopen calls handleReopen directly ── */}
                          <button
                            className={alert.is_resolved ? 'al-btn-unresolve' : 'al-btn-resolve'}
                            type="button"
                            onClick={e => alert.is_resolved ? handleReopen(e, alert) : openResolveModal(e, alert)}
                          >
                            {alert.is_resolved ? 'Reopen' : 'Resolve'}
                          </button>
                          <button className="al-btn-dismiss" type="button" onClick={e => handleDismiss(e, alert.id)} title="Dismiss">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
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

        {/* ── RESOLVE MODAL ── */}
        {resolveModal && (
          <div className="al-modal-bg" onClick={e => { if (e.target === e.currentTarget) setResolveModal(null) }}>
            <div className="al-modal">
              <div className="al-modal-hdr">
                <span className="al-modal-title">Resolve Alert</span>
                <button className="al-modal-close" type="button" onClick={() => setResolveModal(null)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <div className="al-modal-body">
                <div className="al-modal-hint">
                  <strong>{resolveModal.title || ALERT_TYPES[resolveModal.type]?.label || 'Alert'}</strong>
                  {resolveModal.message ? ` — ${resolveModal.message}` : ''}
                </div>
                <label className="al-modal-label">Resolution Notes *</label>
                <textarea
                  className={`al-modal-textarea${notesError ? ' error' : ''}`}
                  rows={4}
                  placeholder="Describe what action was taken to resolve this alert…"
                  value={resolveNotes}
                  onChange={e => { setResolveNotes(e.target.value); setNotesError(false) }}
                />
                {notesError && (
                  <div className="al-modal-err">Resolution notes are required.</div>
                )}
              </div>
              <div className="al-modal-ftr">
                <button className="al-btn-cancel" type="button" onClick={() => setResolveModal(null)}>Cancel</button>
                <button
                  className="al-btn-confirm"
                  type="button"
                  onClick={handleResolveConfirm}
                  disabled={resolving}
                >
                  {resolving ? 'Resolving…' : 'Mark as Resolved'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TOAST */}
        {toast && (
          <div className={`al-toast ${toast.type}`}>
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