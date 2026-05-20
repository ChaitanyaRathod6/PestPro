import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
const API_BASE = "http://localhost:8000";
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

const getActivityLevel = (obs) =>
  obs.rodent_detail?.activity_level ||
  obs.cockroach_detail?.activity_level ||
  obs.mosquito_detail?.adult_mosquito_density ||
  obs.general_detail?.activity_level || null

const getObsSummary = (obs) => {
  const r = obs.rodent_detail, f = obs.flying_insect_detail, c = obs.cockroach_detail
  const t = obs.termite_detail, m = obs.mosquito_detail, g = obs.general_detail
  if (r) return `Box ${r.rodent_box_id} · ${r.rats_found_count} found · ${r.location_in_premises}`
  if (f) return `${f.machine_location} · ${f.insects_trapped_count} insects trapped`
  if (c) return `Station ${c.station_id} · ${c.cockroaches_found} found · ${c.location_in_premises}`
  if (t) return `${t.station_location} · ${t.termites_found ? 'Termites detected' : 'Clear'}`
  if (m) return `${m.treatment_area} · Density: ${m.adult_mosquito_density}`
  if (g) return `${g.pest_type_observed} · ${g.pest_count} found · ${g.location_in_premises}`
  return obs.notes || '—'
}

const AUTO_REFRESH = 30

/* ─────────────────────────────────────────────
   NAV ITEMS
───────────────────────────────────────────── */
const navItems = [
  { id: 'dashboard', label: 'Dashboard',  path: '/customer',          d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'jobs',      label: 'My Jobs',    path: '/customer/jobs',     d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'reports',   label: 'My Reports', path: '/customer/reports',  d: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'profile',   label: 'My Profile', path: '/customer/profile',  d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { id: 'support',   label: 'Support',    path: '/customer/support',  d: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z' },
]

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */
const S = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

:root{
  --green:#1a6b3c;
  --green-dark:#1a4d2e;
  --green-light:#edf6f1;
  --green-mid:#d4ead9;
  --ink:#1a2e1a;
  --muted:#7a8c7a;
  --pale:#a0b0a0;
  --border:#e8ebe8;
  --bg:#f0f2f0;
  --white:#fff;
  --red:#e74c3c;
  --amber:#e6a817;
  --blue:#3b82f6;
  --sidebar-w:220px;
}

body{font-family:'DM Serif Display',serif;}

.cjd-root{font-family:'DM Serif Display',serif;min-height:100vh;background:var(--bg);display:flex;}

/* ── OVERLAY (mobile) ── */
.cjd-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:150;}
.cjd-overlay.show{display:block;}

/* ── SIDEBAR ── */
.cjd-sidebar{
  width:var(--sidebar-w);background:var(--white);
  border-right:1px solid var(--border);
  display:flex;flex-direction:column;min-height:100vh;
  position:fixed;top:0;left:0;bottom:0;z-index:200;
  overflow-y:auto;transition:transform .25s ease;
}
.cjd-sb-logo{padding:16px 20px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border);}
.cjd-sb-icon{width:28px;height:28px;background:var(--green);border-radius:6px;display:flex;align-items:center;justify-content:center;}
.cjd-sb-icon svg{width:15px;height:15px;fill:white;}
.cjd-sb-brand{font-family:'DM Serif Display',serif;font-size:16px;color:var(--ink);}
.cjd-sb-nav{padding:12px 10px;flex:1;}
.cjd-sb-item{
  display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;
  cursor:pointer;margin-bottom:2px;color:var(--muted);font-size:13.5px;
  font-family:'DM Serif Display',serif;transition:background .15s,color .15s;
  white-space:nowrap;text-decoration:none;
}
.cjd-sb-item:hover{background:var(--bg);color:var(--ink);}
.cjd-sb-item.active{background:var(--green-light);color:var(--green);}
.cjd-sb-item svg{width:16px;height:16px;flex-shrink:0;}
.cjd-sb-user{padding:14px 16px;border-top:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-shrink:0;}
.cjd-sb-avatar{width:32px;height:32px;background:var(--green);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;flex-shrink:0;font-family:'DM Serif Display',serif;}
.cjd-sb-uname{font-size:13px;color:var(--ink);font-family:'DM Serif Display',serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cjd-sb-urole{font-size:11px;color:var(--pale);}
.cjd-sb-logout{background:none;border:none;cursor:pointer;color:var(--pale);padding:4px;border-radius:6px;display:flex;align-items:center;margin-left:auto;transition:color .15s,background .15s;}
.cjd-sb-logout:hover{color:var(--red);background:#fde8e8;}

/* ── MAIN ── */
.cjd-main{flex:1;margin-left:var(--sidebar-w);display:flex;flex-direction:column;min-height:100vh;}

/* ── TOPBAR ── */
.cjd-topbar{background:var(--white);border-bottom:1px solid var(--border);padding:0 24px;height:52px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;flex-shrink:0;gap:12px;}
.cjd-topbar-left{display:flex;align-items:center;gap:10px;}
.cjd-topbar-right{display:flex;align-items:center;gap:8px;}
.cjd-hamburger{display:none;background:none;border:none;cursor:pointer;padding:4px;border-radius:6px;color:var(--ink);}
.cjd-hamburger svg{width:20px;height:20px;}
.cjd-back-btn{background:none;border:1.5px solid var(--border);border-radius:9px;padding:7px 14px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;color:var(--ink);display:flex;align-items:center;gap:6px;transition:background .15s;}
.cjd-back-btn:hover{background:var(--bg);}
.cjd-crumb{font-size:13px;color:var(--pale);font-family:'DM Serif Display',serif;}
.cjd-crumb span{color:var(--ink);}
.cjd-ticker{font-size:11px;color:var(--pale);white-space:nowrap;font-family:'DM Sans',sans-serif;}
.cjd-ticker.soon{color:var(--green);font-weight:600;}

/* ── BANNER ── */
.cjd-banner{
  margin:20px 24px 0;border-radius:18px;padding:24px 30px;
  display:flex;align-items:center;justify-content:space-between;
  flex-wrap:wrap;gap:16px;
  background:linear-gradient(135deg,var(--green-dark) 0%,var(--green) 100%);
  color:#fff;position:relative;overflow:hidden;
}
.cjd-banner::before{
  content:'';position:absolute;right:-50px;top:-50px;
  width:220px;height:220px;border-radius:50%;
  background:rgba(255,255,255,.04);
}
.cjd-banner::after{
  content:'';position:absolute;right:60px;bottom:-80px;
  width:160px;height:160px;border-radius:50%;
  background:rgba(255,255,255,.03);
}
.cjd-banner-left{}
.cjd-banner-meta{font-size:11px;text-transform:uppercase;letter-spacing:.9px;opacity:.65;margin-bottom:5px;font-family:'DM Serif Display',serif;}
.cjd-banner-title{font-family:'DM Serif Display',serif;font-size:24px;margin-bottom:10px;line-height:1.2;}
.cjd-banner-chips{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.cjd-status-pill{display:inline-flex;align-items:center;gap:5px;padding:4px 13px;border-radius:20px;font-size:12px;font-family:'DM Serif Display',serif;font-weight:600;}
.cjd-status-pill.scheduled{background:#fff8ec;color:var(--amber);}
.cjd-status-pill.in_progress{background:rgba(255,255,255,.2);color:#fff;border:1px solid rgba(255,255,255,.35);}
.cjd-status-pill.observations_recorded{background:#eff6ff;color:var(--blue);}
.cjd-status-pill.completed,.cjd-status-pill.report_sent{background:rgba(255,255,255,.15);color:#fff;}
.cjd-banner-id{font-size:12px;opacity:.7;font-family:'DM Sans',sans-serif;background:rgba(255,255,255,.1);padding:3px 10px;border-radius:8px;}
.cjd-banner-right{text-align:right;flex-shrink:0;}
.cjd-banner-date-label{font-size:11px;opacity:.6;font-family:'DM Sans',sans-serif;margin-bottom:3px;}
.cjd-banner-date-val{font-family:'DM Serif Display',serif;font-size:17px;margin-bottom:2px;}
.cjd-banner-time{font-size:13px;opacity:.75;font-family:'DM Sans',sans-serif;}

/* ── CONTENT GRID ── */
.cjd-content{padding:18px 24px 36px;display:grid;grid-template-columns:1fr 300px;gap:16px;align-items:start;}
.cjd-col{display:flex;flex-direction:column;gap:14px;}

/* ── CARDS ── */
.cjd-card{background:var(--white);border-radius:14px;padding:20px;box-shadow:0 2px 12px rgba(0,0,0,.05);}
.cjd-card-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
.cjd-card-title{font-family:'DM Serif Display',serif;font-size:10.5px;text-transform:uppercase;letter-spacing:.8px;color:var(--pale);display:flex;align-items:center;gap:6px;}
.cjd-card-title svg{width:13px;height:13px;}
.cjd-badge{background:var(--green-light);color:var(--green);border-radius:6px;padding:1px 8px;font-size:11px;font-family:'DM Sans',sans-serif;}

/* ── INFO GRID ── */
.cjd-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;}
.cjd-info-cell{padding:11px 0;border-bottom:1px solid #f5f7f5;}
.cjd-info-cell:nth-last-child(-n+2){border-bottom:none;}
.cjd-info-cell.full{grid-column:1/-1;}
.cjd-info-label{font-size:10px;color:var(--pale);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;}
.cjd-info-value{font-size:14px;color:var(--ink);font-family:'DM Serif Display',serif;}
.cjd-info-value.muted{color:var(--muted);font-family:'DM Sans',sans-serif;font-size:13.5px;}

/* ── MAPS BTN ── */
.cjd-maps-btn{width:100%;background:#eff6ff;color:var(--blue);border:none;border-radius:10px;padding:11px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;transition:background .15s;margin-top:14px;}
.cjd-maps-btn:hover{background:#dbeafe;}

/* ── TIMELINE ── */
.cjd-tl{display:flex;flex-direction:column;}
.cjd-tl-row{display:flex;gap:14px;padding:11px 0;border-bottom:1px solid #f5f7f5;}
.cjd-tl-row:last-child{border-bottom:none;}
.cjd-tl-dot-wrap{display:flex;flex-direction:column;align-items:center;flex-shrink:0;padding-top:3px;}
.cjd-tl-dot{width:11px;height:11px;border-radius:50%;flex-shrink:0;}
.cjd-tl-dot.done{background:var(--green);}
.cjd-tl-dot.pending{background:#d1d5d1;}
.cjd-tl-dot.active{background:var(--amber);}
.cjd-tl-body{flex:1;}
.cjd-tl-label{font-size:12px;color:var(--muted);font-family:'DM Serif Display',serif;margin-bottom:2px;}
.cjd-tl-time{font-size:13px;color:var(--ink);font-family:'DM Serif Display',serif;}
.cjd-tl-pending{font-size:13px;color:var(--pale);font-style:italic;font-family:'DM Sans',sans-serif;}

/* ── OBSERVATIONS ── */
.cjd-obs-item{border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:10px;}
.cjd-obs-item:last-child{margin-bottom:0;}
.cjd-obs-top{display:flex;align-items:center;gap:10px;margin-bottom:8px;}
.cjd-obs-icon{width:38px;height:38px;border-radius:10px;background:var(--green-light);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}
.cjd-obs-body{flex:1;min-width:0;}
.cjd-obs-cat{font-family:'DM Serif Display',serif;font-size:14px;color:var(--ink);margin-bottom:2px;}
.cjd-obs-meta{font-size:11px;color:var(--pale);}
.cjd-obs-level{font-size:11px;padding:2px 9px;border-radius:6px;flex-shrink:0;font-family:'DM Sans',sans-serif;}
.cjd-obs-level.high{background:#fde8e8;color:var(--red);}
.cjd-obs-level.medium{background:#fff8ec;color:var(--amber);}
.cjd-obs-level.low{background:var(--green-light);color:var(--green);}
.cjd-obs-level.none{background:#f0f2f0;color:var(--muted);}
.cjd-obs-summary{font-size:13px;color:var(--muted);line-height:1.5;margin-bottom:8px;padding-top:8px;border-top:1px solid #f5f7f5;font-family:'DM Serif Display',serif;}
.cjd-obs-tags{display:flex;gap:6px;flex-wrap:wrap;}
.cjd-obs-tag{font-size:11px;padding:3px 9px;border-radius:6px;background:var(--bg);color:var(--muted);font-family:'DM Serif Display',serif;}
.cjd-obs-tag.yes{background:var(--green-light);color:var(--green);}
.cjd-obs-tag.warn{background:#fff8ec;color:var(--amber);}
.cjd-obs-tag.danger{background:#fde8e8;color:var(--red);}
.cjd-obs-photo{width:100%;max-height:180px;object-fit:cover;border-radius:9px;margin-top:10px;cursor:pointer;transition:opacity .15s;}
.cjd-obs-photo:hover{opacity:.9;}
.cjd-obs-empty{text-align:center;padding:28px 0;color:var(--pale);font-size:13px;font-family:'DM Serif Display',serif;}
.cjd-obs-empty p{font-size:12px;color:var(--pale);font-family:'DM Sans',sans-serif;margin-top:4px;}

/* ── REPORTS ── */
.cjd-report-row{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid #f5f7f5;}
.cjd-report-row:last-child{border-bottom:none;}
.cjd-report-left{display:flex;align-items:center;gap:10px;}
.cjd-report-icon{width:36px;height:36px;border-radius:9px;background:#fde8e8;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.cjd-report-icon svg{width:16px;height:16px;stroke:var(--red);fill:none;}
.cjd-report-name{font-size:13.5px;color:var(--ink);font-family:'DM Serif Display',serif;margin-bottom:2px;}
.cjd-report-date{font-size:11px;color:var(--pale);}
.cjd-dl-btn{background:var(--green);color:#fff;border:none;border-radius:8px;padding:8px 14px;font-family:'DM Serif Display',serif;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:5px;transition:background .15s;text-decoration:none;white-space:nowrap;}
.cjd-dl-btn:hover{background:var(--green-dark);}
.cjd-dl-btn svg{width:12px;height:12px;stroke:white;fill:none;}
.cjd-no-report{text-align:center;padding:20px 0;}
.cjd-no-report-icon{font-size:30px;margin-bottom:6px;}
.cjd-no-report p{font-size:13px;color:var(--pale);font-family:'DM Serif Display',serif;}
.cjd-no-report small{font-size:12px;color:var(--pale);font-family:'DM Sans',sans-serif;}

/* ── TECH CARD ── */
.cjd-tech-row{display:flex;align-items:center;gap:12px;padding:4px 0;}
.cjd-tech-av{width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,var(--green-dark),var(--green));display:flex;align-items:center;justify-content:center;color:#fff;font-size:17px;flex-shrink:0;font-family:'DM Serif Display',serif;box-shadow:0 2px 8px rgba(26,107,60,.25);}
.cjd-tech-name{font-family:'DM Serif Display',serif;font-size:15px;color:var(--ink);}
.cjd-tech-role{font-size:12px;color:var(--pale);margin-top:2px;}
.cjd-cert-badge{display:inline-flex;align-items:center;gap:5px;background:var(--green-light);border:1px solid var(--green-mid);color:var(--green);border-radius:8px;padding:5px 10px;font-size:11.5px;font-family:'DM Serif Display',serif;margin-top:12px;width:100%;justify-content:center;}

/* ── SUMMARY ROWS ── */
.cjd-sum-row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid #f5f7f5;}
.cjd-sum-row:last-child{border-bottom:none;}
.cjd-sum-label{font-size:13px;color:var(--muted);font-family:'DM Serif Display',serif;}
.cjd-sum-val{font-size:13.5px;color:var(--ink);font-family:'DM Serif Display',serif;}
.cjd-sum-val.green{color:var(--green);}
.cjd-sum-val.amber{color:var(--amber);}
.cjd-sum-val.red{color:var(--red);}

/* ── SUPPORT BOX ── */
.cjd-support{background:linear-gradient(135deg,var(--green-light),#f5fbf7);border:1px solid var(--green-mid);border-radius:14px;padding:18px;text-align:center;}
.cjd-support-icon{font-size:24px;margin-bottom:6px;}
.cjd-support-title{font-family:'DM Serif Display',serif;font-size:14px;color:var(--green);margin-bottom:4px;}
.cjd-support-text{font-size:12px;color:var(--muted);margin-bottom:14px;line-height:1.5;font-family:'DM Sans',sans-serif;}
.cjd-support-btn{background:var(--green);color:#fff;border:none;border-radius:9px;padding:10px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;transition:background .15s;width:100%;}
.cjd-support-btn:hover{background:var(--green-dark);}

/* ── NOTES (read-only) ── */
.cjd-notes-text{font-size:13px;color:var(--muted);font-style:italic;line-height:1.7;font-family:'DM Sans',sans-serif;padding:2px 0;}

/* ── LOADING / ERROR ── */
.cjd-loading{display:flex;align-items:center;justify-content:center;padding:80px;color:var(--pale);font-size:14px;gap:10px;font-family:'DM Serif Display',serif;}
.cjd-spinner{width:20px;height:20px;border:2px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:cjdSpin .8s linear infinite;}
@keyframes cjdSpin{to{transform:rotate(360deg);}}

/* ── TOAST ── */
.cjd-toast{position:fixed;bottom:20px;right:20px;z-index:600;display:flex;align-items:center;gap:10px;padding:12px 18px;border-radius:10px;font-size:13px;box-shadow:0 4px 20px rgba(0,0,0,.15);animation:cjdSlide .25s ease;font-family:'DM Serif Display',serif;}
@keyframes cjdSlide{from{transform:translateY(20px);opacity:0;}to{transform:translateY(0);opacity:1;}}
.cjd-toast.success{background:var(--green);color:#fff;}
.cjd-toast.error{background:var(--red);color:#fff;}

/* ── LIGHTBOX ── */
.cjd-lightbox{position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:700;display:flex;align-items:center;justify-content:center;padding:20px;cursor:pointer;}
.cjd-lightbox img{max-width:100%;max-height:90vh;border-radius:10px;box-shadow:0 8px 40px rgba(0,0,0,.4);}

/* ── EMPTY STATE ── */
.cjd-err{background:#fde8e8;color:var(--red);padding:14px;border-radius:10px;font-size:13px;font-family:'DM Sans',sans-serif;}

@media(max-width:960px){.cjd-content{grid-template-columns:1fr;}}
@media(max-width:768px){
  .cjd-main{margin-left:0;}
  .cjd-sidebar{transform:translateX(-100%);}
  .cjd-sidebar.open{transform:translateX(0);}
  .cjd-hamburger{display:flex;}
  .cjd-content{padding:12px 16px 28px;}
  .cjd-banner{margin:12px 16px 0;padding:18px 20px;}
  .cjd-banner-title{font-size:19px;}
}
`

/* ═══════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════ */
export default function CustomerJobDetail() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const isMounted = useRef(true)
  const intervalRef = useRef(null)
  const tickRef     = useRef(null)

  const [job,          setJob]          = useState(null)
  const [observations, setObservations] = useState([])
  const [reports,      setReports]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [countdown,    setCountdown]    = useState(AUTO_REFRESH)
  const [toast,        setToast]        = useState(null)
  const [lightbox,     setLightbox]     = useState(null)
  const [sidebarOpen,  setSidebarOpen]  = useState(false)

  const customer     = JSON.parse(localStorage.getItem('customer') || '{}')
  const customerName = customer.name || customer.full_name || 'Customer'
  const customerId   = customer.id

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  /* ── FETCH ── */
    const fetchData = useCallback(async (silent = false) => {
    // 1. Get Customer and Token (with fallbacks)
    const cust = JSON.parse(localStorage.getItem('customer') || '{}')
    const cid  = cust.id
    const token = localStorage.getItem('access_token') || cust.token || cust.access_token || ''

    if (!token || !cid) { 
      setError('Session expired. Please log in again.'); 
      setLoading(false); 
      return 
    }

    try {
      if (!silent) setLoading(true)
      
      // 2. Use 'Token' prefix as required by your Django backend
      const headers = { 
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json'
      }

      // 3. Use the "Customer-Namespaced" URLs (same as your Dashboard)
     const [jobRes, obsRes, reportRes] = await Promise.all([
  fetch(`${API_BASE}/api/jobs/${id}/`, { headers }).then(r => r.ok ? r.json() : null),
  fetch(`${API_BASE}/api/observations/?job=${id}`, { headers }).then(r => r.ok ? r.json() : []),
  fetch(`${API_BASE}/api/customer/${cid}/`, { headers }).then(r => r.ok ? r.json() : { results: [] })
])

console.log('token:', token)
console.log('id:', id)

      if (!isMounted.current) return

      // 4. Handle the results
      if (!jobRes) {
        setError('Job details not found.');
        return;
      }
      setJob(jobRes)

      const obsArr = obsRes?.results || obsRes || []
      setObservations(Array.isArray(obsArr) ? obsArr : [])

      const allRep = reportRes?.results || (Array.isArray(reportRes) ? reportRes : [])
      setReports(allRep)

      setError('')
    } catch (err) {
      console.error("Fetch Error:", err)
      if (isMounted.current && !silent) setError('Failed to load job details.')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [id])
// Function ends here correctly


  /* ── AUTO REFRESH ── */
  const resetTimer = useCallback(() => {
    clearInterval(intervalRef.current); clearInterval(tickRef.current)
    setCountdown(AUTO_REFRESH)
    intervalRef.current = setInterval(() => { fetchData(true); setCountdown(AUTO_REFRESH) }, AUTO_REFRESH * 1000)
    tickRef.current = setInterval(() => setCountdown(c => c <= 1 ? AUTO_REFRESH : c - 1), 1000)
  }, [fetchData])

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const cust  = JSON.parse(localStorage.getItem('customer') || '{}')
    if (!token || !cust.id) { navigate('/customer/login'); return }
    isMounted.current = true
    fetchData().then(resetTimer)
    return () => {
      isMounted.current = false
      clearInterval(intervalRef.current)
      clearInterval(tickRef.current)
    }
  }, [fetchData, resetTimer, navigate])

  const handleLogout = () => {
    clearInterval(intervalRef.current); clearInterval(tickRef.current)
    localStorage.removeItem('customer')
    localStorage.removeItem('access_token')
    navigate('/customer/login')
  }

  const handleNavigate = () => {
    const addr = job?.site_address || job?.address || ''
    if (!addr) { showToast('No address available.', 'error'); return }
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`, '_blank')
  }

  const techName    = job?.technician_name || 'Your Technician'
  const techInitial = techName[0]?.toUpperCase() || 'T'

  const statusLabel = {
    scheduled:             '📅 Scheduled',
    in_progress:           '🔧 In Progress',
    observations_recorded: '📋 Observations Recorded',
    completed:             '✅ Completed',
    report_sent:           '📄 Report Sent',
  }

  /* ════════════════════════════════════════
     RENDER
  ════════════════════════════════════════ */
  return (
    <>
      <style>{S}</style>
      <div className="cjd-root">

        {/* Mobile overlay */}
        <div className={`cjd-overlay${sidebarOpen ? ' show' : ''}`} onClick={() => setSidebarOpen(false)}/>

        {/* ── SIDEBAR ── */}
        <aside className={`cjd-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="cjd-sb-logo">
            <div className="cjd-sb-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/></svg>
            </div>
            <span className="cjd-sb-brand">PestPro</span>
          </div>
          <nav className="cjd-sb-nav">
            {navItems.map(n => (
              <Link key={n.id} to={n.path}
                className={`cjd-sb-item${n.id === 'jobs' ? ' active' : ''}`}
                onClick={() => setSidebarOpen(false)}
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
            <div style={{ flex:1, minWidth:0 }}>
              <div className="cjd-sb-uname">{customerName}</div>
              <div className="cjd-sb-urole">Customer</div>
            </div>
            <button className="cjd-sb-logout" onClick={handleLogout} title="Logout">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div className="cjd-main">

          {/* TOPBAR */}
          <div className="cjd-topbar">
            <div className="cjd-topbar-left">
              <button className="cjd-hamburger" onClick={() => setSidebarOpen(o => !o)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              </button>
              <button className="cjd-back-btn" onClick={() => navigate('/customer/jobs')}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
                </svg>
                Back
              </button>
              <span className="cjd-crumb">My Jobs &nbsp;›&nbsp; <span>Job #{id}</span></span>
            </div>
            <div className="cjd-topbar-right">
              <span className={`cjd-ticker${countdown <= 8 ? ' soon' : ''}`}>↻ {countdown}s</span>
            </div>
          </div>

          {loading ? (
            <div className="cjd-loading"><div className="cjd-spinner"/>Loading job details…</div>
          ) : error ? (
            <div style={{ padding: 24 }}><div className="cjd-err">{error}</div></div>
          ) : !job ? null : (
            <>
              {/* ── BANNER ── */}
              <div className="cjd-banner">
                <div className="cjd-banner-left">
                  <div className="cjd-banner-meta">Service Job</div>
                  <div className="cjd-banner-title">{fmt(job.service_type || 'Service')}</div>
                  <div className="cjd-banner-chips">
                    <span className={`cjd-status-pill ${job.status}`}>
                      <span style={{ width:6, height:6, borderRadius:'50%', background:'currentColor' }}/>
                      {statusLabel[job.status] || fmt(job.status)}
                    </span>
                    <span className="cjd-banner-id">#{job.id}</span>
                  </div>
                </div>
                <div className="cjd-banner-right">
                  <div className="cjd-banner-date-label">Scheduled</div>
                  <div className="cjd-banner-date-val">{fmtDate(job.scheduled_datetime)}</div>
                  {job.scheduled_datetime && (
                    <div className="cjd-banner-time">
                      {new Date(job.scheduled_datetime).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
                    </div>
                  )}
                </div>
              </div>

              {/* ── CONTENT GRID ── */}
              <div className="cjd-content">

                {/* LEFT COL */}
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
                            ? new Date(job.scheduled_datetime).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })
                            : '—'}
                        </div>
                      </div>
                      <div className="cjd-info-cell">
                        <div className="cjd-info-label">Technician</div>
                        <div className="cjd-info-value">{job.technician_name || '—'}</div>
                      </div>
                      <div className="cjd-info-cell">
                        <div className="cjd-info-label">Job ID</div>
                        <div className="cjd-info-value">#{job.id}</div>
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

                  {/* Timeline */}
                  <div className="cjd-card">
                    <div className="cjd-card-hdr">
                      <div className="cjd-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Service Timeline
                      </div>
                    </div>
                    <div className="cjd-tl">
                      <div className="cjd-tl-row">
                        <div className="cjd-tl-dot-wrap"><div className="cjd-tl-dot done"/></div>
                        <div className="cjd-tl-body">
                          <div className="cjd-tl-label">Scheduled</div>
                          <div className="cjd-tl-time">{fmtDateTime(job.scheduled_datetime)}</div>
                        </div>
                      </div>
                      <div className="cjd-tl-row">
                        <div className="cjd-tl-dot-wrap"><div className={`cjd-tl-dot ${job.started_at ? 'done' : 'pending'}`}/></div>
                        <div className="cjd-tl-body">
                          <div className="cjd-tl-label">Technician Arrived</div>
                          {job.started_at
                            ? <div className="cjd-tl-time">{fmtDateTime(job.started_at)}</div>
                            : <div className="cjd-tl-pending">Not yet started</div>}
                        </div>
                      </div>
                      <div className="cjd-tl-row">
                        <div className="cjd-tl-dot-wrap"><div className={`cjd-tl-dot ${job.completed_at ? 'done' : 'pending'}`}/></div>
                        <div className="cjd-tl-body">
                          <div className="cjd-tl-label">Service Completed</div>
                          {job.completed_at
                            ? <div className="cjd-tl-time">{fmtDateTime(job.completed_at)}</div>
                            : <div className="cjd-tl-pending">Pending</div>}
                        </div>
                      </div>
                      <div className="cjd-tl-row">
                        <div className="cjd-tl-dot-wrap"><div className={`cjd-tl-dot ${reports.length > 0 ? 'done' : 'pending'}`}/></div>
                        <div className="cjd-tl-body">
                          <div className="cjd-tl-label">Report Ready</div>
                          {reports.length > 0
                            ? <div className="cjd-tl-time">Your report is ready to download</div>
                            : <div className="cjd-tl-pending">Generated after service completion</div>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Observations */}
                  <div className="cjd-card">
                    <div className="cjd-card-hdr">
                      <div className="cjd-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                        Treatment Observations
                        {observations.length > 0 && <span className="cjd-badge">{observations.length}</span>}
                      </div>
                    </div>
                    {observations.length === 0 ? (
                      <div className="cjd-obs-empty">
                        No observations recorded yet.
                        {job.status === 'scheduled' && <p>They'll appear once the technician starts the service.</p>}
                      </div>
                    ) : observations.map(obs => {
                      const level   = getActivityLevel(obs)
                      const summary = getObsSummary(obs)
                      const r = obs.rodent_detail, f = obs.flying_insect_detail
                      const c = obs.cockroach_detail, t = obs.termite_detail
                      const m = obs.mosquito_detail,  g = obs.general_detail
                      const photo = r?.photo_evidence || f?.photo_evidence || c?.photo_evidence ||
                        t?.photo_evidence || m?.photo_evidence || g?.photo_evidence || null
                      return (
                        <div key={obs.id} className="cjd-obs-item">
                          <div className="cjd-obs-top">
                            <div className="cjd-obs-icon">{categoryEmoji[obs.observation_category] || '🔍'}</div>
                            <div className="cjd-obs-body">
                              <div className="cjd-obs-cat">{fmt(obs.observation_category)} Treatment</div>
                              <div className="cjd-obs-meta">
                                {obs.recorded_by_name || 'Technician'} ·{' '}
                                {new Date(obs.observation_time).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
                                {obs.notes ? ` · ${obs.notes}` : ''}
                              </div>
                            </div>
                            {level && <span className={`cjd-obs-level ${level}`}>{level}</span>}
                          </div>
                          <div className="cjd-obs-summary">{summary}</div>
                          <div className="cjd-obs-tags">
                            {r?.bait_replaced        && <span className="cjd-obs-tag yes">Bait replaced</span>}
                            {r?.bait_consumed        && <span className="cjd-obs-tag warn">Bait consumed</span>}
                            {r?.droppings_observed   && <span className="cjd-obs-tag warn">Droppings found</span>}
                            {r?.gnaw_marks           && <span className="cjd-obs-tag warn">Gnaw marks</span>}
                            {f?.glue_board_changed   && <span className="cjd-obs-tag yes">Board changed</span>}
                            {f && !f.machine_functional && <span className="cjd-obs-tag danger">Machine fault</span>}
                            {f?.insect_types_trapped?.map(it => <span key={it} className="cjd-obs-tag">{it}</span>)}
                            {c?.gel_applied          && <span className="cjd-obs-tag yes">Gel applied</span>}
                            {c?.gel_consumed         && <span className="cjd-obs-tag warn">Gel consumed</span>}
                            {t?.termites_found       && <span className="cjd-obs-tag danger">Termites found</span>}
                            {t?.mud_tubes_found      && <span className="cjd-obs-tag warn">Mud tubes</span>}
                            {t?.bait_replaced        && <span className="cjd-obs-tag yes">Bait replaced</span>}
                            {t?.wood_damage_observed && <span className="cjd-obs-tag danger">Wood damage</span>}
                            {m?.fogging_done         && <span className="cjd-obs-tag yes">Fogging done</span>}
                            {m?.larval_activity      && <span className="cjd-obs-tag warn">Larval activity</span>}
                            {m?.chemical_used        && <span className="cjd-obs-tag">{m.chemical_used}</span>}
                            {g?.treatment_applied    && <span className="cjd-obs-tag yes">Treatment applied</span>}
                            {g?.recommended_action   && <span className="cjd-obs-tag warn">Follow-up needed</span>}
                          </div>
                          {photo && (
                            <img src={photo} alt="Evidence" className="cjd-obs-photo"
                              onClick={() => setLightbox(photo)}/>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Reports */}
                  <div className="cjd-card">
                    <div className="cjd-card-hdr">
                      <div className="cjd-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                        </svg>
                        Service Reports
                        {reports.length > 0 && <span className="cjd-badge">{reports.length}</span>}
                      </div>
                    </div>
                    {reports.length === 0 ? (
                      <div className="cjd-no-report">
                        <div className="cjd-no-report-icon">📄</div>
                        <p>{job.status === 'completed' || job.status === 'report_sent'
                          ? 'Your report is being generated.' : 'Report available after service completion.'}</p>
                        <small>Check back after the technician completes the visit.</small>
                      </div>
                    ) : reports.map(r => (
                      <div key={r.id} className="cjd-report-row">
                        <div className="cjd-report-left">
                          <div className="cjd-report-icon">
                            <svg viewBox="0 0 24 24" strokeWidth="1.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                            </svg>
                          </div>
                          <div>
                            <div className="cjd-report-name">Service Report</div>
                            <div className="cjd-report-date">{fmtDate(r.generated_at || r.created_at)}</div>
                          </div>
                        </div>
                        {r.pdf_url && (
                          <a href={r.pdf_url} target="_blank" rel="noreferrer" className="cjd-dl-btn">
                            <svg viewBox="0 0 24 24" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                            </svg>
                            Download PDF
                          </a>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Technician Notes (read-only for customer) */}
                  {job.completion_notes && (
                    <div className="cjd-card">
                      <div className="cjd-card-hdr">
                        <div className="cjd-card-title">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                          Technician Notes
                        </div>
                      </div>
                      <div className="cjd-notes-text">{job.completion_notes}</div>
                    </div>
                  )}
                </div>

                {/* RIGHT COL */}
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
                    <div className="cjd-cert-badge">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                      </svg>
                      Eco-Safe Certified · PestPro Verified
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
                      <span className="cjd-sum-label">Arrived</span>
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
                    <div className="cjd-sum-row">
                      <span className="cjd-sum-label">Notes</span>
                      <span className={`cjd-sum-val${job.completion_notes ? ' green' : ''}`}>
                        {job.completion_notes ? '✓ Added' : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Support */}
                  <div className="cjd-support">
                    <div className="cjd-support-icon">💬</div>
                    <div className="cjd-support-title">Need Help?</div>
                    <div className="cjd-support-text">
                      Have a question about this service visit? Our support team is available to assist you.
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

        {/* LIGHTBOX */}
        {lightbox && (
          <div className="cjd-lightbox" onClick={() => setLightbox(null)}>
            <img src={lightbox} alt="Evidence"/>
          </div>
        )}
      </div>
    </>
  )
}