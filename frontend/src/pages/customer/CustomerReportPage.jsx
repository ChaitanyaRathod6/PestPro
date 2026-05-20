import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

/* ─────────────────────────────────────────────
   CONFIG
───────────────────────────────────────────── */
const AUTO_REFRESH_SECS = 30

const apiFetch = async (path) => {
  const rawCustomer = localStorage.getItem('customer');
  const storedCustomer = JSON.parse(rawCustomer || '{}');
  
  const token = localStorage.getItem('access_token') 
    || storedCustomer.access_token 
    || storedCustomer.token 
    || storedCustomer.access;

  // FIXED: Django backend usually runs on 8000, 5173 is Vite frontend
  const API_BASE = "http://localhost:8000"; 

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Token ${token}` : '', 
      },
    } );

    if (!res.ok) {
      if (res.status === 401) {
        console.error("401 Unauthorized: The Token was rejected by Django.");
      }
      return []; 
    }

    return await res.json(); 
  } catch (error) {
    console.error("API Error:", error);
    return [];
  }
};

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const cap = (s) =>
  s ? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—'

const fmtDate = (dt) => {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}
const fmtDateTime = (dt) => {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
const getInitials = (name = '') => {
  const p = name.trim().split(' ').filter(Boolean)
  if (p.length >= 2) return (p[0][0] + p[p.length - 1][0]).toUpperCase()
  return (p[0]?.[0] || 'C').toUpperCase()
}

const Ico = ({ d, size = 18, stroke = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

/* ─────────────────────────────────────────────
   SERVICE TYPE CONFIG
───────────────────────────────────────────── */
const SVC_CFG = {
  mosquito:      { label: 'Mosquito',       color: 'blue',   abbr: 'MQ' },
  rodent:        { label: 'Rodent',         color: 'amber',  abbr: 'RD' },
  cockroach:     { label: 'Cockroach',      color: 'red',    abbr: 'CR' },
  termite:       { label: 'Termite',        color: 'orange', abbr: 'TM' },
  flying_insect: { label: 'Flying Insect',  color: 'purple', abbr: 'FI' },
  general:       { label: 'General Pest',   color: 'green',  abbr: 'GP' },
  bed_bug:       { label: 'Bed Bug',        color: 'red',    abbr: 'BB' },
  ant:           { label: 'Ant',            color: 'amber',  abbr: 'AN' },
}
const getSvcCfg = (serviceType) => {
  if (!serviceType) return { label: 'General', color: 'green', abbr: 'GP' }
  const key = serviceType.toLowerCase().replace(/ /g, '_')
  return SVC_CFG[key] || {
    label: cap(serviceType),
    color: 'green',
    abbr:  serviceType.slice(0, 2).toUpperCase(),
  }
}

/* ─────────────────────────────────────────────
   NAV
───────────────────────────────────────────── */
const NAV = [
  { id: 'dashboard', label: 'Dashboard' , d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'jobs',      label: 'My Jobs', path: '/customer/jobs',   d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'reports',   label: 'My Reports', path: '/customer/reports', d: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a２ ２ ０ ０１２－２ｈ５．５８６ａ１ １ ０ ０１．７０７．２９３ｌ５．４１４ ５．４１４ａ１ １ ０ ０１．２９３．７０７Ｖ１９ａ２ ２ ０ ０１－２ ２z' },
  { id: 'profile',   label: 'My Profile', path: '/customer/profile', d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { id: 'support',   label: 'Support',    path: '/customer/support', d: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z' },
]

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */
const S = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --g:#1a6b3c;--gd:#1a4d2e;--gl:#edf6f1;--gl2:#d5ede2;
  --ink:#1a2e1a;--muted:#6b7f6b;--pale:#a0b0a0;
  --border:#e4e8e4;--bg:#f0f2f0;--white:#fff;
  --red:#c0392b;--redl:#fde8e8;
  --amber:#d68910;--amberl:#fff8ec;
  --blue:#2563eb;--bluel:#eff6ff;
  --purple:#7c3aed;--purplel:#ede9fe;
  --orange:#c2410c;--orangel:#fff0eb;
  --shadow:0 1px 4px rgba(0,0,0,.07);
  --r:14px;--sidebar-w:210px;
}
.cr-root{font-family:'DM Serif Display',serif;min-height:100vh;background:var(--bg);display:flex;overflow-x:hidden;}

/* ── SIDEBAR ── */
.cr-sidebar{width:var(--sidebar-w);background:var(--white);border-right:1px solid var(--border);
  display:flex;flex-direction:column;min-height:100vh;
  position:fixed;top:0;left:0;bottom:0;z-index:200;overflow-y:auto;transition:transform .25s ease;}
.cr-sb-logo{padding:18px 16px;display:flex;align-items:center;gap:9px;border-bottom:1px solid var(--border);flex-shrink:0;}
.cr-sb-icon{width:30px;height:30px;background:var(--g);border-radius:8px;display:flex;align-items:center;justify-content:center;}
.cr-sb-icon svg{width:16px;height:16px;fill:#fff;}
.cr-sb-brand{font-size:17px;color:var(--ink);}
.cr-sb-nav{padding:12px 10px;flex:1;}
.cr-nav-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;
  cursor:pointer;color:var(--muted);font-size:13.5px;margin-bottom:2px;transition:all .15s;white-space:nowrap;}
.cr-nav-item:hover{background:var(--bg);color:var(--ink);}
.cr-nav-item.active{background:var(--gl);color:var(--g);}
.cr-nav-item svg{width:17px;height:17px;flex-shrink:0;}
.cr-sb-footer{padding:14px 14px 0;border-top:1px solid var(--border);flex-shrink:0;}
.cr-sb-user{display:flex;align-items:center;gap:10px;}
.cr-sb-av{width:34px;height:34px;background:var(--g);border-radius:50%;
  display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;flex-shrink:0;}
.cr-sb-name{font-size:13px;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cr-sb-role{font-size:11px;color:var(--pale);}
.cr-sb-logout{margin-left:auto;background:none;border:none;cursor:pointer;color:var(--pale);
  padding:4px;border-radius:6px;display:flex;align-items:center;transition:all .15s;flex-shrink:0;}
.cr-sb-logout:hover{color:var(--red);background:var(--redl);}
.cr-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:150;}
.cr-overlay.show{display:block;}

/* ── MAIN ── */
.cr-main{flex:1;margin-left:var(--sidebar-w);display:flex;flex-direction:column;min-height:100vh;max-width:calc(100vw - var(--sidebar-w));overflow-x:hidden;}
.cr-topbar{background:var(--white);border-bottom:1px solid var(--border);padding:0 24px;height:50px;
  display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;flex-shrink:0;gap:12px;}
.cr-topbar-left{display:flex;align-items:center;gap:10px;}
.cr-hamburger{display:none;background:none;border:none;cursor:pointer;padding:4px;border-radius:6px;color:var(--ink);}
.cr-hamburger svg{width:20px;height:20px;}
.cr-crumb{font-size:13px;color:var(--pale);}
.cr-crumb span{color:var(--ink);font-size:14px;}
.cr-crumb-link{color:var(--ink);cursor:pointer;font-size:14px;}
.cr-crumb-link:hover{color:var(--g);text-decoration:underline;}
.cr-topbar-right{display:flex;align-items:center;gap:10px;}
.cr-ticker{font-size:12px;color:var(--pale);white-space:nowrap;}
.cr-ticker.soon{color:var(--g);}
.cr-refresh-btn{background:var(--bg);color:var(--ink);border:1.5px solid var(--border);
  border-radius:9px;padding:7px 14px;font-family:'DM Serif Display',serif;font-size:13px;
  cursor:pointer;display:flex;align-items:center;gap:6px;transition:background .15s;}
.cr-refresh-btn:hover{background:#e2e8e2;}
.cr-refresh-btn svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2;}
.cr-refresh-btn.spinning svg{animation:cr-spin .8s linear infinite;}
@keyframes cr-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.cr-logout-btn{background:none;border:none;color:var(--pale);font-size:13px;cursor:pointer;display:flex;align-items:center;gap:5px;}
.cr-logout-btn:hover{color:var(--red);}

.cr-content{padding:24px;max-width:1100px;margin:0 auto;width:100%;flex:1;}
.cr-page-title{font-size:28px;color:var(--ink);margin-bottom:4px;}
.cr-page-sub{font-size:14px;color:var(--muted);margin-bottom:24px;}
.cr-error{background:var(--redl);color:var(--red);padding:12px 16px;border-radius:10px;font-size:14px;margin-bottom:20px;border:1px solid #f9d6d6;}

/* ── STATS ── */
.cr-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:30px;}
.cr-stat{background:var(--white);padding:18px;border-radius:var(--r);border:1px solid var(--border);box-shadow:var(--shadow);}
.cr-stat-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:12px;}
.cr-stat-icon.green{background:var(--gl);}
.cr-stat-icon.blue{background:var(--bluel);}
.cr-stat-icon.purple{background:var(--purplel);}
.cr-stat-icon.amber{background:var(--amberl);}
.cr-stat-lbl{font-size:12px;color:var(--pale);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;}
.cr-stat-val{font-size:22px;color:var(--ink);}
.cr-stat-val.blue{color:var(--blue);}
.cr-stat-val.purple{color:var(--purple);}
.cr-stat-val.amber{color:var(--amber);}
.cr-stat-sub{font-size:11px;color:var(--pale);margin-top:4px;}

/* ── FILTERS ── */
.cr-filter-wrap{margin-bottom:20px;overflow-x:auto;padding-bottom:4px;}
.cr-filter-tabs{display:flex;gap:8px;}
.cr-filter-tab{background:var(--white);border:1px solid var(--border);padding:8px 16px;border-radius:20px;
  font-size:13px;color:var(--muted);cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:8px;transition:all .2s;}
.cr-filter-tab:hover{border-color:var(--pale);color:var(--ink);}
.cr-filter-tab.active{background:var(--ink);color:var(--white);border-color:var(--ink);}
.cr-filter-tab.active.c-green{background:var(--g);border-color:var(--g);}
.cr-filter-tab.active.c-blue{background:var(--blue);border-color:var(--blue);}
.cr-filter-tab.active.c-red{background:var(--red);border-color:var(--red);}
.cr-filter-tab.active.c-amber{background:var(--amber);border-color:var(--amber);}
.cr-filter-tab.active.c-purple{background:var(--purple);border-color:var(--purple);}
.cr-filter-tab.active.c-orange{background:var(--orange);border-color:var(--orange);}
.cr-ftab-count{font-size:11px;opacity:.7;background:rgba(255,255,255,.2);padding:1px 6px;border-radius:10px;}
.cr-filter-tab:not(.active) .cr-ftab-count{background:var(--bg);color:var(--pale);}

.cr-controls{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;}
.cr-search-wrap{position:relative;flex:1;min-width:280px;}
.cr-search-wrap svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);width:16px;height:16px;color:var(--pale);}
.cr-search{width:100%;background:var(--white);border:1px solid var(--border);border-radius:10px;
  padding:10px 12px 10px 38px;font-family:inherit;font-size:14px;outline:none;transition:border .15s;}
.cr-search:focus{border-color:var(--g);box-shadow:0 0 0 3px var(--gl);}
.cr-sort-select{background:var(--white);border:1px solid var(--border);border-radius:10px;padding:0 12px;
  font-family:inherit;font-size:14px;outline:none;cursor:pointer;}

.cr-list-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding:0 4px;}
.cr-list-title{font-size:14px;color:var(--ink);}
.cr-list-meta{font-size:12px;color:var(--pale);}

/* ── CARDS ── */
.cr-card{background:var(--white);border:1px solid var(--border);border-radius:var(--r);padding:16px;
  display:flex;gap:16px;margin-bottom:12px;cursor:pointer;transition:all .2s;position:relative;overflow:hidden;}
.cr-card:hover{border-color:var(--g);box-shadow:0 4px 12px rgba(0,0,0,.05);transform:translateY(-1px);}
.cr-avatar{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;
  font-size:15px;font-weight:bold;flex-shrink:0;}
.cr-avatar.blue{background:var(--bluel);color:var(--blue);}
.cr-avatar.amber{background:var(--amberl);color:var(--amber);}
.cr-avatar.red{background:var(--redl);color:var(--red);}
.cr-avatar.green{background:var(--gl);color:var(--g);}
.cr-avatar.purple{background:var(--purplel);color:var(--purple);}
.cr-avatar.orange{background:var(--orangel);color:var(--orange);}

.cr-body{flex:1;min-width:0;}
.cr-name-row{display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;}
.cr-title{font-size:16px;color:var(--ink);}
.cr-job-id{font-size:13px;color:var(--pale);background:var(--bg);padding:1px 6px;border-radius:4px;}
.cr-badge{font-size:10px;text-transform:uppercase;letter-spacing:.4px;padding:2px 7px;border-radius:6px;font-weight:bold;}
.cr-badge.blue{background:var(--bluel);color:var(--blue);}
.cr-badge.amber{background:var(--amberl);color:var(--amber);}
.cr-badge.red{background:var(--redl);color:var(--red);}
.cr-badge.green{background:var(--gl);color:var(--g);}
.cr-badge.purple{background:var(--purplel);color:var(--purple);}
.cr-badge.muted{background:var(--bg);color:var(--pale);}

.cr-details{display:flex;gap:16px;margin-bottom:8px;flex-wrap:wrap;}
.cr-detail{display:flex;align-items:center;gap:5px;font-size:12px;color:var(--muted);}
.cr-detail svg{color:var(--pale);}
.cr-meta-row{display:flex;gap:16px;border-top:1px dashed var(--border);padding-top:8px;flex-wrap:wrap;}
.cr-meta{font-size:11px;color:var(--pale);}
.cr-meta span{color:var(--muted);}

.cr-actions{display:flex;flex-direction:column;gap:6px;justify-content:center;}
.cr-btn-view,.cr-btn-dl{border:1px solid var(--border);background:var(--white);padding:6px 12px;
  border-radius:8px;font-size:12px;font-family:inherit;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .15s;}
.cr-btn-view:hover{background:var(--gl);border-color:var(--g);color:var(--g);}
.cr-btn-dl:hover:not(:disabled){background:var(--bluel);border-color:var(--blue);color:var(--blue);}
.cr-btn-dl:disabled{opacity:.4;cursor:not-allowed;}

.cr-empty{background:var(--white);border:1px dashed var(--border);border-radius:var(--r);
  padding:60px 20px;text-align:center;color:var(--pale);}
.cr-empty-icon{font-size:40px;margin-bottom:12px;opacity:.5;}
.cr-empty-title{font-size:18px;color:var(--ink);margin-bottom:4px;}
.cr-empty-sub{font-size:14px;max-width:300px;margin:0 auto;}

.cr-loading{display:flex;align-items:center;justify-content:center;gap:12px;padding:100px 0;color:var(--muted);font-size:15px;}
.cr-spinner{width:20px;height:20px;border:2px solid var(--gl2);border-top-color:var(--g);border-radius:50%;animation:cr-spin .8s linear infinite;}

/* ── MODAL ── */
.cr-modal-bg{position:fixed;inset:0;background:rgba(26,46,26,.6);backdrop-filter:blur(3px);
  z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;}
.cr-modal{background:var(--white);width:100%;max-width:480px;border-radius:20px;
  box-shadow:0 20px 50px rgba(0,0,0,.2);display:flex;flex-direction:column;max-height:90vh;overflow:hidden;animation:cr-modal-in .3s ease-out;}
@keyframes cr-modal-in{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.cr-modal-head{padding:24px;border-bottom:1px solid var(--border);background:var(--gl);}
.cr-modal-head-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;}
.cr-modal-service{font-size:20px;color:var(--ink);}
.cr-modal-close{background:none;border:none;font-size:20px;color:var(--pale);cursor:pointer;padding:4px;line-height:1;}
.cr-modal-close:hover{color:var(--red);}
.cr-modal-job{font-size:13px;color:var(--g);font-weight:bold;letter-spacing:1px;}
.cr-modal-body{padding:24px;overflow-y:auto;display:flex;flex-direction:column;gap:18px;}
.cr-modal-row{display:flex;gap:14px;}
.cr-modal-icon{width:34px;height:34px;background:var(--bg);border-radius:10px;
  display:flex;align-items:center;justify-content:center;color:var(--pale);flex-shrink:0;}
.cr-modal-lbl{font-size:11px;color:var(--pale);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px;}
.cr-modal-val{font-size:14px;color:var(--ink);line-height:1.4;}
.cr-modal-foot{padding:20px 24px;border-top:1px solid var(--border);display:flex;gap:12px;}
.cr-modal-dl-btn{flex:1;background:var(--g);color:#fff;border:none;padding:12px;border-radius:12px;
  font-family:inherit;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;transition:all .2s;}
.cr-modal-dl-btn:hover{background:var(--gd);transform:translateY(-1px);box-shadow:0 4px 12px rgba(26,107,60,.3);}
.cr-modal-dl-btn.disabled{background:var(--bg);color:var(--pale);cursor:not-allowed;transform:none;box-shadow:none;}
.cr-modal-cancel{background:var(--white);color:var(--muted);border:1px solid var(--border);padding:12px 20px;
  border-radius:12px;font-family:inherit;font-size:14px;cursor:pointer;transition:all .2s;}
.cr-modal-cancel:hover{background:var(--bg);color:var(--ink);}

/* ── TOAST ── */
.cr-toast{position:fixed;bottom:24px;right:24px;background:var(--ink);color:#fff;padding:12px 20px;
  border-radius:12px;font-size:14px;display:flex;align-items:center;gap:10px;box-shadow:0 10px 30px rgba(0,0,0,.2);
  z-index:2000;animation:cr-toast-in .3s ease-out;}
@keyframes cr-toast-in{from{opacity:0;transform:translateX(50px)}to{opacity:1;transform:translateX(0)}}
.cr-toast.success{background:var(--g);}
.cr-toast.error{background:var(--red);}
.cr-toast.info{background:var(--blue);}

@media(max-width:768px){
  .cr-sidebar{transform:translateX(-100%);}
  .cr-sidebar.open{transform:translateX(0);}
  .cr-main{margin-left:0;max-width:100vw;}
  .cr-hamburger{display:block;}
  .cr-stats{grid-template-columns:1fr 1fr;}
}
`

/* ─────────────────────────────────────────────
   REPORT DETAIL MODAL
───────────────────────────────────────────── */
function ReportModal({ report, onClose }) {
  if (!report) return null
  const svcCfg  = getSvcCfg(report.service_type)
  const jobId   = report.job_id ?? report.job?.id ?? report.job
  const pdfUrl  = report.pdf_url || report.report_file || null
  const hasPdf  = Boolean(pdfUrl)

  return (
    <div className="cr-modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cr-modal">
        {/* HEAD */}
        <div className="cr-modal-head">
          <div className="cr-modal-head-top">
            <div className="cr-modal-service">{svcCfg.label} Service Report</div>
            <button className="cr-modal-close" onClick={onClose}>✕</button>
          </div>
          <div className="cr-modal-job">Job #{jobId}</div>
        </div>

        {/* BODY */}
        <div className="cr-modal-body">

          {/* Service Type */}
          <div className="cr-modal-row">
            <div className="cr-modal-icon">
              <Ico d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2"/>
            </div>
            <div>
              <div className="cr-modal-lbl">Service Type</div>
              <div className="cr-modal-val" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {svcCfg.label}
                <span className={`cr-badge ${svcCfg.color}`}>{svcCfg.abbr}</span>
              </div>
            </div>
          </div>

          {/* Date Generated */}
          <div className="cr-modal-row">
            <div className="cr-modal-icon">
              <Ico d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </div>
            <div>
              <div className="cr-modal-lbl">Report Generated</div>
              <div className="cr-modal-val">{fmtDateTime(report.generated_at || report.created_at)}</div>
            </div>
          </div>

          {/* Job Date */}
          {(report.job_date || report.scheduled_datetime || report.job?.scheduled_datetime) && (
            <div className="cr-modal-row">
              <div className="cr-modal-icon">
                <Ico d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </div>
              <div>
                <div className="cr-modal-lbl">Service Date</div>
                <div className="cr-modal-val">
                  {fmtDate(report.job_date || report.scheduled_datetime || report.job?.scheduled_datetime)}
                </div>
              </div>
            </div>
          )}

          {/* Technician */}
          {(report.technician_name || report.job?.technician_name) && (
            <div className="cr-modal-row">
              <div className="cr-modal-icon">
                <Ico d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </div>
              <div>
                <div className="cr-modal-lbl">Technician</div>
                <div className="cr-modal-val">{report.technician_name || report.job?.technician_name}</div>
              </div>
            </div>
          )}

          {/* Location */}
          {(report.site_address || report.job?.site_address) && (
            <div className="cr-modal-row">
              <div className="cr-modal-icon">
                <Ico d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              </div>
              <div>
                <div className="cr-modal-lbl">Service Location</div>
                <div className="cr-modal-val">{report.site_address || report.job?.site_address}</div>
              </div>
            </div>
          )}

          {/* File size */}
          {report.file_size_kb > 0 && (
            <div className="cr-modal-row">
              <div className="cr-modal-icon">
                <Ico d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </div>
              <div>
                <div className="cr-modal-lbl">File Size</div>
                <div className="cr-modal-val">{report.file_size_kb} KB</div>
              </div>
            </div>
          )}

          {/* Signature */}
          {report.includes_signature && (
            <div className="cr-modal-row">
              <div className="cr-modal-icon">
                <Ico d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </div>
              <div>
                <div className="cr-modal-lbl">Signature</div>
                <div className="cr-modal-val" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="cr-badge green">✓ Signed</span>
                  Customer signature on file
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {report.notes && (
            <div className="cr-modal-row">
              <div className="cr-modal-icon">
                <Ico d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </div>
              <div>
                <div className="cr-modal-lbl">Notes</div>
                <div className="cr-modal-val">{report.notes}</div>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="cr-modal-foot">
          {hasPdf ? (
            <a href={pdfUrl} target="_blank" rel="noreferrer" className="cr-modal-dl-btn">
              <Ico size={15} stroke="#fff" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              Download PDF
            </a>
          ) : (
            <div className="cr-modal-dl-btn disabled">
              <Ico size={15} stroke="currentColor" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              PDF Not Available
            </div>
          )}
          <button className="cr-modal-cancel" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   SIDEBAR
───────────────────────────────────────────── */
function Sidebar({ open, setOpen, customerInitials, customerName, onLogout, navigate }) {
  return (
    <aside className={`cr-sidebar${open ? ' open' : ''}`}>
      <div className="cr-sb-logo">
        <div className="cr-sb-icon">
          <svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/></svg>
        </div>
        <span className="cr-sb-brand">PestPro</span>
      </div>
      <nav className="cr-sb-nav">
        {NAV.map((n) => (
          <div key={n.id}
            className={`cr-nav-item${n.id === 'reports' ? ' active' : ''}`}
            onClick={() => {
              setOpen(false)
              if (n.id === 'dashboard') navigate('/customer')
              else if (n.id === 'reports') navigate('/customer/reports')
              else if (n.id === 'jobs') navigate('/customer/jobs')
              else if (n.id === 'profile') navigate('/customer/profile')
              else if (n.id === 'support') navigate('/customer/support')
            }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d={n.d} />
            </svg>
            {n.label}
          </div>
        ))}
      </nav>
      <div className="cr-sb-footer">
        <div className="cr-sb-user">
          <div className="cr-sb-av">{customerInitials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="cr-sb-name">{customerName}</div>
            <div className="cr-sb-role">Customer</div>
          </div>
          <button className="cr-sb-logout" onClick={onLogout} title="Logout">
            <Ico size={16} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </button>
        </div>
      </div>
    </aside>
  )
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function CustomerReportsPage() {
  const navigate  = useNavigate()
  const isMounted = useRef(true)
  const tickRef   = useRef(null)

  // ── state ──
  const [sidebarOpen,    setSidebarOpen]    = useState(false)
  const [reports,        setReports]        = useState([])
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState('')
  const [search,         setSearch]         = useState('')
  const [sortBy,         setSortBy]         = useState('date_desc')
  const [serviceFilter,  setServiceFilter]  = useState('all')
  const [viewingReport,  setViewingReport]  = useState(null)
  const [spinning,       setSpinning]       = useState(false)
  const [countdown,      setCountdown]      = useState(AUTO_REFRESH_SECS)
  const [toast,          setToast]          = useState(null)

  // ── customer ──
  const customer = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('customer')) || {} }
    catch { return {} }
  }, [])

  const customerName = (
    customer.name ||
    customer.full_name ||
    `${customer.first_name || ''} ${customer.last_name || ''}`.trim() ||
    customer.email ||
    'Customer'
  )
  const customerInitials = getInitials(customerName)

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => { if (isMounted.current) setToast(null) }, 3500)
  }, [])

  // ── fetch ──
    // ── fetch ──
  const fetchReports = useCallback(async (silent = false) => {
    const id = customer.id
    if (!id) return
    if (!silent) setError('')
    try {
      // FIXED URL based on your Dashboard logic:
      const data = await apiFetch(`/api/jobs/customer/${id}/jobs/` ) 
      
      if (!isMounted.current) return
      
      // We also need to handle the data extraction correctly
      const list = Array.isArray(data) ? data : (data.reports || data.results || [])
      setReports(list)
    } catch (e) {
      if (!isMounted.current) return
      if (!silent) setError('Could not load your reports. Please try again.')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [customer.id])


  // ── auto-refresh timer ──
  const resetTimer = useCallback(() => {
    clearInterval(tickRef.current)
    setCountdown(AUTO_REFRESH_SECS)
    tickRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { fetchReports(true); return AUTO_REFRESH_SECS }
        return c - 1
      })
    }, 1000)
  }, [fetchReports])

  // ── mount ──
  useEffect(() => {
    isMounted.current = true
    if (!localStorage.getItem('customer')) { navigate('/customer-login'); return }
    fetchReports(false).then(resetTimer)
    return () => {
      isMounted.current = false
      clearInterval(tickRef.current)
    }
  }, [fetchReports, resetTimer, navigate])

  // ── manual refresh ──
  const handleRefresh = () => {
    setSpinning(true)
    fetchReports(false).then(() => {
      resetTimer()
      showToast('Reports refreshed')
      setTimeout(() => setSpinning(false), 600)
    })
  }

  // ── logout ──
  const handleLogout = () => {
    clearInterval(tickRef.current)
    localStorage.removeItem('customer')
    navigate('/customer-login')
  }

  // ── download handler ──
  const handleDownload = (e, report) => {
    e.stopPropagation()
    const url = report.pdf_url || report.report_file
    if (url) {
      window.open(url, '_blank')
      showToast('Opening PDF…', 'info')
    } else {
      showToast('PDF not available yet for this report', 'error')
    }
  }

  // ── service type filter tabs ──
  const serviceTypes = useMemo(() => {
    const seen = new Set()
    reports.forEach((r) => {
      const raw = (r.service_type || '').toLowerCase().replace(/ /g, '_')
      if (raw) seen.add(raw)
    })
    return Array.from(seen).sort()
  }, [reports])

  const filterTabs = [
    { key: 'all', label: 'All Reports', color: 'green' },
    ...serviceTypes.map((key) => {
      const cfg = getSvcCfg(key)
      return { key, label: cfg.label, color: cfg.color }
    }),
  ]

  const countForTab = (key) => {
    if (key === 'all') return reports.length
    return reports.filter(
      (r) => (r.service_type || '').toLowerCase().replace(/ /g, '_') === key
    ).length
  }

  // ── filter + sort ──
  const filtered = reports
    .filter((r) => {
      if (serviceFilter !== 'all') {
        const raw = (r.service_type || '').toLowerCase().replace(/ /g, '_')
        if (raw !== serviceFilter) return false
      }
      if (!search.trim()) return true
      const q = search.toLowerCase()
      const jobId = String(r.job_id ?? r.job?.id ?? r.job ?? '')
      return (
        jobId.includes(q) ||
        (r.service_type || '').toLowerCase().includes(q) ||
        (r.notes        || '').toLowerCase().includes(q) ||
        fmtDate(r.generated_at || r.created_at).toLowerCase().includes(q)
      )
    })
    .sort((a, b) =>
      sortBy === 'date_asc'
        ? new Date(a.generated_at || a.created_at) - new Date(b.generated_at || b.created_at)
        : new Date(b.generated_at || b.created_at) - new Date(a.generated_at || a.created_at)
    )

  // ── stats ──
  const totalReports     = reports.length
  const withPdf          = reports.filter((r) => r.pdf_url || r.report_file).length
  const signed           = reports.filter((r) => r.includes_signature).length
  const recentThisMonth  = reports.filter((r) => {
    const d = new Date(r.generated_at || r.created_at)
    const n = new Date()
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
  }).length

  return (
    <>
      <style>{S}</style>
      <div className="cr-root">
        <div className={`cr-overlay${sidebarOpen ? ' show' : ''}`} onClick={() => setSidebarOpen(false)} />
        
        {viewingReport && (
          <ReportModal report={viewingReport} onClose={() => setViewingReport(null)} />
        )}

        <Sidebar
          open={sidebarOpen} setOpen={setSidebarOpen}
          customerInitials={customerInitials} customerName={customerName}
          onLogout={handleLogout} navigate={navigate}
        />

        <div className="cr-main">
          <div className="cr-topbar">
            <div className="cr-topbar-left">
              <button className="cr-hamburger" onClick={() => setSidebarOpen((o) => !o)}>
                <Ico size={20} d="M4 6h16M4 12h16M4 18h16" />
              </button>
              <span className="cr-crumb">
                <span className="cr-crumb-link" onClick={() => navigate('/customer-dashboard')}>Customer</span>
                &nbsp;›&nbsp; <span>My Reports</span>
              </span>
            </div>
            <div className="cr-topbar-right">
              <span className={`cr-ticker${countdown <= 10 ? ' soon' : ''}`}>↻ in {countdown}s</span>
              <button className={`cr-refresh-btn${spinning ? ' spinning' : ''}`} onClick={handleRefresh}>
                <svg viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Refresh
              </button>
              <button className="cr-logout-btn" onClick={handleLogout}>
                <Ico size={13} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                Logout
              </button>
            </div>
          </div>

          <div className="cr-content">
            <div className="cr-page-title">My Reports</div>
            <div className="cr-page-sub">
              Your pest control service reports · auto-refreshes every {AUTO_REFRESH_SECS}s
            </div>

            {error && <div className="cr-error">⚠ {error}</div>}

            {loading ? (
              <div className="cr-loading"><div className="cr-spinner" />Loading your reports…</div>
            ) : (
              <>
                <div className="cr-stats">
                  <div className="cr-stat">
                    <div className="cr-stat-icon green">
                      <Ico stroke="#1a6b3c" size={18}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </div>
                    <div className="cr-stat-lbl">Total Reports</div>
                    <div className="cr-stat-val">{totalReports}</div>
                    <div className="cr-stat-sub">All time</div>
                  </div>
                  <div className="cr-stat">
                    <div className="cr-stat-icon blue">
                      <Ico stroke="#2563eb" size={18}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                    </div>
                    <div className="cr-stat-lbl">PDFs Available</div>
                    <div className="cr-stat-val blue">{withPdf}</div>
                    <div className="cr-stat-sub">Ready to download</div>
                  </div>
                  <div className="cr-stat">
                    <div className="cr-stat-icon purple">
                      <Ico stroke="#7c3aed" size={18}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                    </div>
                    <div className="cr-stat-lbl">Signed Reports</div>
                    <div className="cr-stat-val purple">{signed}</div>
                    <div className="cr-stat-sub">With signature</div>
                  </div>
                  <div className="cr-stat">
                    <div className="cr-stat-icon amber">
                      <Ico stroke="#d68910" size={18}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </div>
                    <div className="cr-stat-lbl">This Month</div>
                    <div className="cr-stat-val amber">{recentThisMonth}</div>
                    <div className="cr-stat-sub">New this month</div>
                  </div>
                </div>

                {serviceTypes.length > 0 && (
                  <div className="cr-filter-wrap">
                    <div className="cr-filter-tabs">
                      {filterTabs.map((tab) => (
                        <button
                          key={tab.key}
                          className={`cr-filter-tab${serviceFilter === tab.key ? ` active c-${tab.color}` : ''}`}
                          onClick={() => setServiceFilter(tab.key)}>
                          {tab.label}
                          <span className="cr-ftab-count">{countForTab(tab.key)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="cr-controls">
                  <div className="cr-search-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    <input
                      className="cr-search"
                      placeholder="Search by service type, job ID, date…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <select className="cr-sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="date_desc">Newest First</option>
                    <option value="date_asc">Oldest First</option>
                  </select>
                </div>

                <div className="cr-list-hdr">
                  <span className="cr-list-title">
                    {filtered.length} report{filtered.length !== 1 ? 's' : ''}
                    {serviceFilter !== 'all' && ` · ${getSvcCfg(serviceFilter).label}`}
                    {search ? ` matching "${search}"` : ''}
                  </span>
                  <span className="cr-list-meta">
                    {sortBy === 'date_desc' ? 'Newest First' : 'Oldest First'}
                  </span>
                </div>

                {filtered.length === 0 ? (
                  <div className="cr-empty">
                    <div className="cr-empty-icon">📄</div>
                    <div className="cr-empty-title">No reports found</div>
                    <div className="cr-empty-sub">
                      {search
                        ? `No reports match "${search}"`
                        : serviceFilter !== 'all'
                        ? `No ${getSvcCfg(serviceFilter).label} reports yet.`
                        : 'Your service reports will appear here once a job is completed.'}
                    </div>
                  </div>
                ) : (
                  filtered.map((report) => {
                    const svcCfg = getSvcCfg(report.service_type)
                    const jobId  = report.job_id ?? report.job?.id ?? report.job
                    const hasPdf = Boolean(report.pdf_url || report.report_file)
                    const genAt  = report.generated_at || report.created_at
                    const svcDate= report.job_date || report.scheduled_datetime || report.job?.scheduled_datetime

                    return (
                      <div key={report.id} className="cr-card" onClick={() => setViewingReport(report)}>
                        <div className={`cr-avatar ${svcCfg.color}`}>{svcCfg.abbr}</div>
                        <div className="cr-body">
                          <div className="cr-name-row">
                            <span className="cr-title">{svcCfg.label} Service Report</span>
                            <span className="cr-job-id">Job #{jobId}</span>
                            <span className={`cr-badge ${svcCfg.color}`}>{svcCfg.label}</span>
                            {hasPdf
                              ? <span className="cr-badge green">✓ PDF Ready</span>
                              : <span className="cr-badge muted">No PDF yet</span>
                            }
                            {report.includes_signature && (
                              <span className="cr-badge purple">✓ Signed</span>
                            )}
                          </div>
                          <div className="cr-details">
                            {svcDate && (
                              <span className="cr-detail">
                                <Ico size={11} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                Service on {fmtDate(svcDate)}
                              </span>
                            )}
                            {(report.technician_name || report.job?.technician_name) && (
                              <span className="cr-detail">
                                <Ico size={11} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                {report.technician_name || report.job?.technician_name}
                              </span>
                            )}
                            {report.file_size_kb > 0 && (
                              <span className="cr-detail">
                                <Ico size={11} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                {report.file_size_kb} KB
                              </span>
                            )}
                          </div>
                          <div className="cr-meta-row">
                            <span className="cr-meta">
                              Generated <span>{fmtDateTime(genAt)}</span>
                            </span>
                            {(report.site_address || report.job?.site_address) && (
                              <span className="cr-meta">
                                Location <span>{report.site_address || report.job?.site_address}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="cr-actions">
                          <button
                            className="cr-btn-view"
                            onClick={(e) => { e.stopPropagation(); setViewingReport(report) }}>
                            <Ico size={13} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                            View
                          </button>
                          <button
                            className="cr-btn-dl"
                            disabled={!hasPdf}
                            onClick={(e) => handleDownload(e, report)}
                            title={hasPdf ? 'Download PDF' : 'PDF not available'}>
                            <Ico size={13} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                            PDF
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

        {toast && (
          <div className={`cr-toast ${toast.type}`}>
            {toast.type === 'success' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            )}
            {toast.type === 'error' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            )}
            {toast.type === 'info' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            )}
            {toast.msg}
          </div>
        )}
      </div>
    </>
  )
}
