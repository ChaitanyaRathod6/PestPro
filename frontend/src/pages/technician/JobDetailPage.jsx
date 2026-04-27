import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const displayName = (user) => {
  if (!user) return 'Technician'
  return user.name || user.full_name ||
    (user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : null) ||
    user.username || 'Technician'
}
const initials = (name = '') => {
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length-1][0]).toUpperCase()
  return (parts[0]?.[0] || 'T').toUpperCase()
}
const fmtDate = (dt) => {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })
}
const fmtDateTime = (dt) => {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-IN', {
    weekday:'short', day:'numeric', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit'
  })
}
const fmt = (s = '') => s.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase())

const categoryEmoji = {
  rodent:'🐀', flying_insect:'🦟', cockroach:'🪳',
  termite:'🐛', mosquito:'🦟', general:'🔍'
}

/* Get activity level from any obs child detail */
const getActivityLevel = (obs) => {
  return obs.rodent_detail?.activity_level ||
    obs.cockroach_detail?.activity_level ||
    obs.mosquito_detail?.adult_mosquito_density ||
    obs.general_detail?.activity_level ||
    null
}

/* Get key detail summary line per category */
const getObsSummary = (obs) => {
  const r = obs.rodent_detail
  const f = obs.flying_insect_detail
  const c = obs.cockroach_detail
  const t = obs.termite_detail
  const m = obs.mosquito_detail
  const g = obs.general_detail
  if (r) return `Box ${r.rodent_box_id} · ${r.rats_found_count} rats · ${r.location_in_premises}`
  if (f) return `Machine ${f.flycatcher_machine_id} · ${f.insects_trapped_count} trapped · ${f.machine_location}`
  if (c) return `Station ${c.station_id} · ${c.cockroaches_found} found · ${c.location_in_premises}`
  if (t) return `Station ${t.station_id} · ${t.termites_found ? 'Termites found' : 'Clear'} · ${t.station_location}`
  if (m) return `${m.treatment_area} · ${m.breeding_sites_found} sites · ${m.adult_mosquito_density} density`
  if (g) return `${g.pest_type_observed} · ${g.pest_count} found · ${g.location_in_premises}`
  return obs.notes || '—'
}

const AUTO_REFRESH = 30

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
.jd-root{font-family:'DM Serif Display',serif;min-height:100vh;background:var(--bg);display:flex;}

/* SIDEBAR */
.jd-sidebar{width:var(--sidebar-w);background:var(--white);border-right:1px solid var(--border);
  display:flex;flex-direction:column;min-height:100vh;
  position:fixed;top:0;left:0;bottom:0;z-index:200;overflow-y:auto;}
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
.jd-sb-user{padding:14px 16px;border-top:1px solid var(--border);display:flex;align-items:center;gap:10px;}
.jd-sb-avatar{width:32px;height:32px;background:var(--green);border-radius:50%;
  display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;flex-shrink:0;}
.jd-sb-uname{font-size:13px;color:var(--ink);}
.jd-sb-urole{font-size:11px;color:var(--pale);}
.jd-sb-logout{background:none;border:none;cursor:pointer;color:var(--pale);
  padding:4px;border-radius:6px;display:flex;align-items:center;margin-left:auto;
  transition:color .15s,background .15s;}
.jd-sb-logout:hover{color:var(--red);background:#fde8e8;}

/* MAIN */
.jd-main{flex:1;margin-left:var(--sidebar-w);display:flex;flex-direction:column;min-height:100vh;}

/* TOPBAR */
.jd-topbar{background:var(--white);border-bottom:1px solid var(--border);
  padding:0 24px;height:52px;
  display:flex;align-items:center;justify-content:space-between;
  position:sticky;top:0;z-index:100;flex-shrink:0;gap:12px;}
.jd-topbar-left{display:flex;align-items:center;gap:10px;}
.jd-back-btn{background:none;border:1.5px solid var(--border);border-radius:9px;
  padding:7px 14px;font-family:'DM Serif Display',serif;font-size:13px;
  cursor:pointer;color:var(--ink);display:flex;align-items:center;gap:6px;transition:background .15s;}
.jd-back-btn:hover{background:var(--bg);}
.jd-topbar-right{display:flex;align-items:center;gap:8px;}
.jd-ticker{font-size:11px;color:var(--pale);white-space:nowrap;}
.jd-ticker.soon{color:var(--green);}
.jd-crumb{font-size:13px;color:var(--pale);}
.jd-crumb span{color:var(--ink);}

/* HEADER */
.jd-header{padding:20px 24px 0;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;}
.jd-header-meta{font-size:11px;color:var(--pale);text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px;}
.jd-header-title{font-size:24px;color:var(--ink);margin-bottom:6px;}
.jd-status-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;
  border-radius:20px;font-size:12px;font-weight:600;}
.jd-status-chip.scheduled{background:#fff8ec;color:var(--amber);}
.jd-status-chip.in_progress{background:var(--green-light);color:var(--green);}
.jd-status-chip.observations_recorded{background:#eff6ff;color:var(--blue);}
.jd-status-chip.completed,.jd-status-chip.report_sent{background:#f0f2f0;color:var(--muted);}
.jd-header-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}

/* ACTION BUTTONS */
.jd-complete-btn{background:var(--green);color:#fff;border:none;border-radius:9px;
  padding:9px 18px;font-family:'DM Serif Display',serif;font-size:13px;
  cursor:pointer;display:flex;align-items:center;gap:6px;transition:background .15s;}
.jd-complete-btn:hover{background:#155a32;}
.jd-complete-btn:disabled{opacity:.6;cursor:not-allowed;}
.jd-obs-btn{background:var(--amber);color:#fff;border:none;border-radius:9px;
  padding:9px 18px;font-family:'DM Serif Display',serif;font-size:13px;
  cursor:pointer;display:flex;align-items:center;gap:6px;transition:background .15s;}
.jd-obs-btn:hover{background:#c98a0f;}
.jd-nav-btn{background:var(--blue);color:#fff;border:none;border-radius:9px;
  padding:9px 18px;font-family:'DM Serif Display',serif;font-size:13px;
  cursor:pointer;display:flex;align-items:center;gap:6px;transition:background .15s;}
.jd-nav-btn:hover{background:#2563eb;}
.jd-start-btn{background:var(--green);color:#fff;border:none;border-radius:9px;
  padding:9px 18px;font-family:'DM Serif Display',serif;font-size:13px;
  cursor:pointer;display:flex;align-items:center;gap:6px;transition:background .15s;}
.jd-start-btn:hover{background:#155a32;}
.jd-start-btn:disabled,.jd-complete-btn:disabled{opacity:.6;cursor:not-allowed;}

/* CONTENT GRID */
.jd-content{padding:16px 24px 32px;display:grid;grid-template-columns:1fr 320px;gap:16px;align-items:start;}
.jd-col-left,.jd-col-right{display:flex;flex-direction:column;gap:14px;}

/* CARDS */
.jd-card{background:var(--white);border-radius:14px;padding:20px;box-shadow:0 2px 10px rgba(0,0,0,.05);}
.jd-card-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
.jd-card-title{font-size:10.5px;text-transform:uppercase;letter-spacing:.8px;color:var(--pale);display:flex;align-items:center;gap:6px;}
.jd-card-title svg{width:13px;height:13px;}

/* INFO GRID */
.jd-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;}
.jd-info-cell{padding:11px 0;border-bottom:1px solid #f5f7f5;}
.jd-info-cell:nth-last-child(-n+2){border-bottom:none;}
.jd-info-cell.full{grid-column:1/-1;}
.jd-info-label{font-size:10px;color:var(--pale);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;}
.jd-info-value{font-size:14px;color:var(--ink);}
.jd-info-value.muted{color:var(--muted);}

/* TIMELINE — job start/complete timestamps */
.jd-timeline{display:flex;flex-direction:column;gap:0;margin-top:4px;}
.jd-timeline-item{display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-bottom:1px solid #f5f7f5;}
.jd-timeline-item:last-child{border-bottom:none;}
.jd-timeline-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;margin-top:4px;}
.jd-timeline-dot.scheduled{background:var(--amber);}
.jd-timeline-dot.started{background:var(--blue);}
.jd-timeline-dot.completed{background:var(--green);}
.jd-timeline-dot.pending{background:#d1d5d1;}
.jd-timeline-label{font-size:12px;color:var(--muted);}
.jd-timeline-time{font-size:13px;color:var(--ink);margin-top:1px;}

/* OBSERVATIONS */
.jd-obs-list{display:flex;flex-direction:column;}
.jd-obs-item{border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:10px;}
.jd-obs-item:last-child{margin-bottom:0;}
.jd-obs-top{display:flex;align-items:center;gap:10px;margin-bottom:8px;}
.jd-obs-icon{width:36px;height:36px;border-radius:9px;background:var(--green-light);
  display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}
.jd-obs-body{flex:1;min-width:0;}
.jd-obs-title{font-size:13.5px;color:var(--ink);margin-bottom:2px;}
.jd-obs-meta{font-size:11px;color:var(--pale);}
.jd-obs-summary{font-size:12.5px;color:var(--muted);margin-top:6px;padding-top:8px;border-top:1px solid #f5f7f5;line-height:1.5;}
.jd-obs-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;}
.jd-obs-tag{font-size:11px;padding:2px 8px;border-radius:6px;background:var(--bg);color:var(--muted);}
.jd-obs-tag.yes{background:var(--green-light);color:var(--green);}
.jd-obs-tag.warn{background:#fff8ec;color:var(--amber);}
.jd-obs-tag.danger{background:#fde8e8;color:var(--red);}

/* Observation photo thumbnail */
.jd-obs-photo{width:100%;max-height:160px;object-fit:cover;border-radius:8px;margin-top:8px;cursor:pointer;}

/* Activity level badge */
.jd-level{font-size:11px;padding:2px 8px;border-radius:6px;flex-shrink:0;}
.jd-level.high{background:#fde8e8;color:var(--red);}
.jd-level.medium{background:#fff8ec;color:var(--amber);}
.jd-level.low{background:var(--green-light);color:var(--green);}
.jd-level.none{background:#f0f2f0;color:var(--muted);}

/* Add obs button */
.jd-add-btn{background:none;border:1px dashed #c8d0c8;border-radius:8px;
  padding:5px 12px;font-family:'DM Serif Display',serif;font-size:12px;
  cursor:pointer;color:var(--muted);transition:all .15s;}
.jd-add-btn:hover{border-color:var(--green);color:var(--green);background:var(--green-light);}

/* NOTES */
.jd-notes-text{font-size:13px;color:var(--muted);font-style:italic;line-height:1.6;}
.jd-notes-textarea{width:100%;border:1.5px solid var(--border);border-radius:9px;
  padding:10px 14px;font-family:'DM Serif Display',serif;font-size:13px;
  color:var(--ink);resize:vertical;min-height:90px;outline:none;transition:border-color .15s;}
.jd-notes-textarea:focus{border-color:var(--green);}
.jd-notes-actions{display:flex;gap:8px;margin-top:10px;}
.jd-save-btn{background:var(--green);color:#fff;border:none;border-radius:8px;
  padding:8px 18px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;}
.jd-save-btn:hover{background:#155a32;}
.jd-cancel-btn{background:none;border:1.5px solid var(--border);border-radius:8px;
  padding:7px 14px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;color:var(--muted);}
.jd-cancel-btn:hover{background:var(--bg);}

/* CUSTOMER */
.jd-customer-row{display:flex;align-items:center;gap:12px;margin-bottom:14px;}
.jd-customer-av{width:40px;height:40px;border-radius:50%;background:var(--green);
  display:flex;align-items:center;justify-content:center;color:#fff;font-size:15px;flex-shrink:0;}
.jd-customer-name{font-size:15px;color:var(--ink);}
.jd-customer-email{font-size:12px;color:var(--pale);margin-top:2px;}
.jd-maps-btn{width:100%;background:#eff6ff;color:var(--blue);border:none;
  border-radius:9px;padding:10px;font-family:'DM Serif Display',serif;font-size:13px;
  cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:background .15s;}
.jd-maps-btn:hover{background:#dbeafe;}

/* SIGNATURE */
.jd-sig-wrap{position:relative;border:1.5px solid var(--border);border-radius:10px;
  overflow:hidden;background:#fafbfa;margin-bottom:10px;}
#jd-sig-canvas{display:block;touch-action:none;cursor:crosshair;}
.jd-sig-hint{font-size:11px;color:var(--pale);margin-bottom:10px;}
.jd-sig-saved{font-size:12px;color:var(--green);margin-bottom:8px;display:flex;align-items:center;gap:5px;}
.jd-sig-btns{display:flex;gap:8px;}
.jd-sig-clear{background:none;border:1.5px solid var(--border);border-radius:8px;
  padding:8px 16px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;color:var(--muted);}
.jd-sig-save{background:var(--green);color:#fff;border:none;border-radius:8px;
  padding:8px 18px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;}
.jd-sig-save:hover{background:#155a32;}
.jd-sig-save:disabled{opacity:.6;cursor:not-allowed;}

/* SUMMARY */
.jd-summary-row{display:flex;justify-content:space-between;align-items:center;
  padding:9px 0;border-bottom:1px solid #f5f7f5;}
.jd-summary-row:last-child{border-bottom:none;}
.jd-summary-label{font-size:13px;color:var(--muted);}
.jd-summary-value{font-size:13.5px;color:var(--ink);font-weight:600;}
.jd-summary-value.green{color:var(--green);}
.jd-summary-value.red{color:var(--red);}

/* ── MODAL ── */
.jd-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:500;
  display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;}
.jd-modal{background:var(--white);border-radius:16px;padding:28px;width:100%;
  max-width:540px;box-shadow:0 8px 40px rgba(0,0,0,.18);max-height:90vh;overflow-y:auto;}
.jd-modal-title{font-size:18px;color:var(--ink);margin-bottom:4px;}
.jd-modal-sub{font-size:13px;color:var(--pale);margin-bottom:20px;}

/* Modal sections */
.jd-modal-section{background:var(--bg);border-radius:10px;padding:14px;margin-bottom:14px;}
.jd-modal-section-title{font-size:10px;text-transform:uppercase;letter-spacing:.8px;
  color:var(--pale);margin-bottom:12px;}

.jd-field{margin-bottom:14px;}
.jd-field:last-child{margin-bottom:0;}
.jd-field label{display:block;font-size:11px;text-transform:uppercase;
  letter-spacing:.6px;color:var(--pale);margin-bottom:6px;}
.jd-field select,.jd-field input,.jd-field textarea{
  width:100%;border:1.5px solid var(--border);border-radius:9px;
  padding:10px 14px;font-family:'DM Serif Display',serif;font-size:13px;
  color:var(--ink);outline:none;transition:border-color .15s;background:var(--white);}
.jd-field select:focus,.jd-field input:focus,.jd-field textarea:focus{border-color:var(--green);}
.jd-field textarea{resize:vertical;min-height:70px;}
.jd-field-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.jd-field-row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;}

/* Checkbox toggle */
.jd-checkbox-row{display:flex;align-items:center;gap:8px;padding:8px 0;}
.jd-checkbox-row input[type=checkbox]{width:16px;height:16px;accent-color:var(--green);cursor:pointer;}
.jd-checkbox-row label{font-size:13px;color:var(--ink);cursor:pointer;}

/* Multi-select chips for insect types */
.jd-chip-group{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;}
.jd-chip{padding:6px 12px;border-radius:20px;font-size:12px;cursor:pointer;
  border:1.5px solid var(--border);background:var(--white);color:var(--muted);
  font-family:'DM Serif Display',serif;transition:all .15s;}
.jd-chip.selected{background:var(--green-light);color:var(--green);border-color:var(--green);}

/* Photo upload */
.jd-photo-upload{border:2px dashed var(--border);border-radius:10px;padding:20px;
  text-align:center;cursor:pointer;transition:all .15s;}
.jd-photo-upload:hover{border-color:var(--green);background:var(--green-light);}
.jd-photo-upload input{display:none;}
.jd-photo-upload-label{font-size:13px;color:var(--muted);cursor:pointer;}
.jd-photo-upload-label svg{width:24px;height:24px;display:block;margin:0 auto 8px;color:var(--pale);}
.jd-photo-preview{width:100%;max-height:120px;object-fit:cover;border-radius:8px;margin-top:10px;}

.jd-modal-btns{display:flex;gap:10px;justify-content:flex-end;margin-top:20px;}
.jd-modal-cancel{background:none;border:1.5px solid var(--border);border-radius:9px;
  padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;color:var(--muted);}
.jd-modal-save{background:var(--green);color:#fff;border:none;border-radius:9px;
  padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;}
.jd-modal-save:hover{background:#155a32;}
.jd-modal-save:disabled{opacity:.6;cursor:not-allowed;}

/* TOAST */
.jd-toast{position:fixed;bottom:20px;right:20px;z-index:600;
  display:flex;align-items:center;gap:10px;padding:12px 18px;border-radius:10px;
  font-size:13px;box-shadow:0 4px 20px rgba(0,0,0,.15);animation:jdSlideIn .25s ease;}
@keyframes jdSlideIn{from{transform:translateY(20px);opacity:0;}to{transform:translateY(0);opacity:1;}}
.jd-toast.success{background:#1a6b3c;color:#fff;}
.jd-toast.error{background:#e74c3c;color:#fff;}

/* LOADING */
.jd-loading{display:flex;align-items:center;justify-content:center;
  padding:80px;color:var(--pale);font-size:14px;gap:10px;}
.jd-spinner{width:20px;height:20px;border:2px solid var(--border);
  border-top-color:var(--green);border-radius:50%;animation:jdSpin .8s linear infinite;}
@keyframes jdSpin{to{transform:rotate(360deg);}}

/* Photo lightbox */
.jd-lightbox{position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:700;
  display:flex;align-items:center;justify-content:center;padding:20px;cursor:pointer;}
.jd-lightbox img{max-width:100%;max-height:90vh;border-radius:8px;}

@media(max-width:900px){
  .jd-content{grid-template-columns:1fr;}
}
@media(max-width:768px){
  .jd-main{margin-left:0;}
  .jd-sidebar{display:none;}
  .jd-header{padding:16px;}
  .jd-content{padding:12px 16px 24px;}
  .jd-field-row,.jd-field-row3{grid-template-columns:1fr;}
}
`

/* ─────────────────────────────────────────────
   NAV ITEMS
───────────────────────────────────────────── */
const navItems = [
  {id:'dashboard',label:'Dashboard',  d:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'},
  {id:'jobs',     label:'My Jobs',    d:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'},
  {id:'route',    label:'Daily Route',d:'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7'},
  {id:'settings', label:'Settings',   d:'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z'},
]

/* ─────────────────────────────────────────────
   OBSERVATION CATEGORIES
───────────────────────────────────────────── */
const OBS_CATEGORIES = [
  {value:'rodent',        label:'Rodent 🐀'},
  {value:'flying_insect', label:'Flying Insect 🦟'},
  {value:'cockroach',     label:'Cockroach 🪳'},
  {value:'termite',       label:'Termite 🐛'},
  {value:'mosquito',      label:'Mosquito 🦟'},
  {value:'general',       label:'General 🔍'},
]

const INSECT_TYPES = ['Flies','Mosquitoes','Moths','Wasps','Others']
const ACTIVITY_LEVELS = ['none','low','medium','high']
const DAMAGE_SEVERITY = ['none','minor','moderate','severe']
const GLUE_CONDITION  = ['good','dirty','replaced']

/* ─────────────────────────────────────────────
   BUILD OBSERVATION PAYLOAD
   Matches your serializer's expected structure exactly
───────────────────────────────────────────── */
function buildObsPayload(form) {
  const base = {
    observation_category: form.category,
    notes: form.notes || '',
  }

  if (form.category === 'rodent') {
    return { ...base, rodent_detail: {
      rodent_box_id:        form.rodent_box_id || 'Box-A1',
      location_in_premises: form.location || '',
      rats_found_count:     parseInt(form.count) || 0,
      bait_consumed:        form.bait_consumed,
      bait_replaced:        form.bait_replaced,
      droppings_observed:   form.droppings_observed,
      gnaw_marks:           form.gnaw_marks,
      activity_level:       form.activity_level || 'low',
    }}
  }
  if (form.category === 'flying_insect') {
    return { ...base, flying_insect_detail: {
      flycatcher_machine_id: form.machine_id || 'FC-01',
      machine_location:      form.location || '',
      insects_trapped_count: parseInt(form.count) || 0,
      insect_types_trapped:  form.insect_types || ['Flies'],
      glue_board_changed:    form.glue_board_changed,
      glue_board_condition:  form.glue_board_condition || 'good',
      machine_functional:    form.machine_functional,
    }}
  }
  if (form.category === 'cockroach') {
    return { ...base, cockroach_detail: {
      station_id:           form.station_id || 'CG-01',
      location_in_premises: form.location || '',
      cockroaches_found:    parseInt(form.count) || 0,
      gel_applied:          form.gel_applied,
      gel_consumed:         form.gel_consumed,
      activity_level:       form.activity_level || 'low',
      infestation_area:     form.infestation_area || '',
    }}
  }
  if (form.category === 'termite') {
    return { ...base, termite_detail: {
      station_id:           form.station_id || 'TB-01',
      station_location:     form.location || '',
      termites_found:       form.termites_found,
      bait_consumed:        form.bait_consumed,
      bait_replaced:        form.bait_replaced,
      mud_tubes_found:      form.mud_tubes_found,
      wood_damage_observed: form.wood_damage_observed,
      damage_severity:      form.damage_severity || 'none',
    }}
  }
  if (form.category === 'mosquito') {
    return { ...base, mosquito_detail: {
      treatment_area:             form.location || '',
      fogging_done:               form.fogging_done,
      chemical_used:              form.chemical_used || '',
      breeding_sites_found:       parseInt(form.breeding_sites_found) || 0,
      breeding_sites_eliminated:  parseInt(form.breeding_sites_eliminated) || 0,
      larval_activity:            form.larval_activity,
      adult_mosquito_density:     form.activity_level || 'low',
    }}
  }
  // general
  return { ...base, general_detail: {
    pest_type_observed:   form.pest_type_observed || 'Other',
    location_in_premises: form.location || '',
    pest_count:           parseInt(form.count) || 0,
    treatment_applied:    form.treatment_applied,
    treatment_description:form.treatment_description || '',
    activity_level:       form.activity_level || 'low',
    recommended_action:   form.recommended_action || '',
  }}
}

/* ─────────────────────────────────────────────
   DEFAULT FORM STATE
───────────────────────────────────────────── */
const defaultForm = () => ({
  category: 'rodent',
  notes: '',
  location: '',
  count: '',
  activity_level: 'low',
  // rodent
  rodent_box_id: '', bait_consumed: false, bait_replaced: false,
  droppings_observed: false, gnaw_marks: false,
  // flying insect
  machine_id: '', insect_types: ['Flies'], glue_board_changed: false,
  glue_board_condition: 'good', machine_functional: true,
  // cockroach
  station_id: '', gel_applied: false, gel_consumed: false, infestation_area: '',
  // termite
  termites_found: false, mud_tubes_found: false,
  wood_damage_observed: false, damage_severity: 'none',
  // mosquito
  fogging_done: false, chemical_used: '', breeding_sites_found: '',
  breeding_sites_eliminated: '', larval_activity: false,
  // general
  pest_type_observed: '', treatment_applied: false,
  treatment_description: '', recommended_action: '',
  // photo
  photoFile: null, photoPreview: null,
})

/* ═══════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════ */
export default function JobDetailPage() {
  const { id }           = useParams()
  const navigate         = useNavigate()
  const { user, logout } = useAuth()
  const canvasRef        = useRef(null)
  const isDrawing        = useRef(false)
  const intervalRef      = useRef(null)
  const tickRef          = useRef(null)
  const isMounted        = useRef(true)
  const photoInputRef    = useRef(null)

  // Data
  const [job,          setJob]          = useState(null)
  const [observations, setObservations] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [active,       setActive]       = useState('jobs')

  // Auto-refresh
  const [countdown, setCountdown] = useState(AUTO_REFRESH)

  // Actions
  const [starting,     setStarting]     = useState(false)
  const [completing,   setCompleting]   = useState(false)
  const [savingNotes,  setSavingNotes]  = useState(false)
  const [savingSig,    setSavingSig]    = useState(false)
  const [sigSaved,     setSigSaved]     = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesVal,     setNotesVal]     = useState('')

  // Obs modal
  const [showObsModal, setShowObsModal] = useState(false)
  const [savingObs,    setSavingObs]    = useState(false)
  const [obsForm,      setObsForm]      = useState(defaultForm())

  // Lightbox for photo
  const [lightboxSrc, setLightboxSrc] = useState(null)

  // Toast
  const [toast, setToast] = useState(null)

  const userName     = displayName(user)
  const userInitials = initials(userName)

  const showToast = (msg, type='success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  /* ── FETCH ── */
  const fetchJob = useCallback(async (silent=false) => {
    if (!silent) setError('')
    try {
      const [jobRes, obsRes] = await Promise.all([
        api.get(`/jobs/${id}/`),
        api.get(`/jobs/${id}/observations/`),
      ])
      if (!isMounted.current) return
      setJob(jobRes.data)
      setObservations(obsRes.data?.results || obsRes.data || [])
      setNotesVal(jobRes.data?.completion_notes || '')
      setSigSaved(!!jobRes.data?.signed_by)
    } catch (e) {
      if (!silent && isMounted.current)
        setError(e.response?.data?.error || 'Failed to load job details.')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [id])

  /* ── AUTO REFRESH ── */
  const resetTimer = useCallback(() => {
    clearInterval(intervalRef.current)
    clearInterval(tickRef.current)
    setCountdown(AUTO_REFRESH)
    intervalRef.current = setInterval(() => { fetchJob(true); setCountdown(AUTO_REFRESH) }, AUTO_REFRESH * 1000)
    tickRef.current = setInterval(() => setCountdown(c => c <= 1 ? AUTO_REFRESH : c - 1), 1000)
  }, [fetchJob])

  useEffect(() => {
    isMounted.current = true
    fetchJob().then(resetTimer)
    return () => {
      isMounted.current = false
      clearInterval(intervalRef.current)
      clearInterval(tickRef.current)
    }
  }, [fetchJob, resetTimer])

  /* ── CANVAS SIGNATURE ── */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = '#1a2e1a'; ctx.lineWidth = 2; ctx.lineCap = 'round'
    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect()
      const src = e.touches ? e.touches[0] : e
      return { x: src.clientX - rect.left, y: src.clientY - rect.top }
    }
    const start = (e) => { e.preventDefault(); isDrawing.current = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y) }
    const draw  = (e) => { e.preventDefault(); if (!isDrawing.current) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke() }
    const end   = () => { isDrawing.current = false }
    canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', draw)
    canvas.addEventListener('mouseup', end);     canvas.addEventListener('mouseleave', end)
    canvas.addEventListener('touchstart', start, {passive:false})
    canvas.addEventListener('touchmove',  draw,  {passive:false})
    canvas.addEventListener('touchend',   end)
    return () => {
      canvas.removeEventListener('mousedown', start); canvas.removeEventListener('mousemove', draw)
      canvas.removeEventListener('mouseup',   end);   canvas.removeEventListener('mouseleave',end)
      canvas.removeEventListener('touchstart',start); canvas.removeEventListener('touchmove', draw)
      canvas.removeEventListener('touchend',  end)
    }
  }, [job])

  /* ── ACTIONS ── */
  const handleStart = async () => {
    setStarting(true)
    try {
      await api.post(`/jobs/${id}/start/`, {})
      showToast('Job started!'); fetchJob(true); resetTimer()
    } catch (e) { showToast(e.response?.data?.error || 'Could not start job.', 'error') }
    finally { setStarting(false) }
  }

  const handleComplete = async () => {
    const sig = canvasRef.current?.toDataURL('image/png')
    const blank = document.createElement('canvas')
    blank.width = canvasRef.current?.width; blank.height = canvasRef.current?.height
    if (!sig || sig === blank.toDataURL('image/png')) {
      showToast('Please add a customer signature before completing.', 'error'); return
    }
    setCompleting(true)
    try {
      await api.post(`/jobs/${id}/complete/`, { signed_by: sig, completion_notes: notesVal })
      showToast('Job completed! PDF report will be generated.'); fetchJob(true); resetTimer()
    } catch (e) { showToast(e.response?.data?.error || 'Could not complete job.', 'error') }
    finally { setCompleting(false) }
  }

  const handleNavigate = () => {
    const addr = job?.site_address || job?.address || ''
    if (!addr) { showToast('No address available.', 'error'); return }
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`, '_blank')
  }

  const handleSaveSignature = async () => {
    const canvas = canvasRef.current; if (!canvas) return
    const sig = canvas.toDataURL('image/png')
    const blank = document.createElement('canvas')
    blank.width = canvas.width; blank.height = canvas.height
    if (sig === blank.toDataURL('image/png')) { showToast('Please draw a signature first.', 'error'); return }
    setSavingSig(true)
    try {
      await api.post(`/jobs/${id}/signature/`, { signed_by: sig })
      setSigSaved(true); showToast('Signature saved!')
    } catch (e) { showToast(e.response?.data?.error || 'Could not save signature.', 'error') }
    finally { setSavingSig(false) }
  }

  const handleClearSignature = () => {
    const canvas = canvasRef.current; if (!canvas) return
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    setSigSaved(false)
  }

  const handleSaveNotes = async () => {
    setSavingNotes(true)
    try {
      await api.patch(`/jobs/${id}/`, { completion_notes: notesVal })
      setEditingNotes(false); showToast('Notes saved!'); fetchJob(true)
    } catch (e) { showToast(e.response?.data?.error || 'Could not save notes.', 'error') }
    finally { setSavingNotes(false) }
  }

  /* ── PHOTO SELECT ── */
  const handlePhotoSelect = (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setObsForm(f => ({...f, photoFile: file, photoPreview: ev.target.result}))
    reader.readAsDataURL(file)
  }

  /* ── SAVE OBSERVATION ── */
  const handleSaveObs = async () => {
  if (!obsForm.location && obsForm.category !== 'general') {
    showToast('Please enter a location / area.', 'error'); return
  }
  setSavingObs(true)
  try {
    const payload = buildObsPayload(obsForm)

    if (obsForm.photoFile) {
      const fd = new FormData()
      fd.append('observation_category', payload.observation_category)
      fd.append('notes', payload.notes || '')
      fd.append('job', id)

      // ✅ Send detail as JSON string — Django will parse it
      const detailKey = Object.keys(payload).find(k => k.endsWith('_detail'))
      if (detailKey) {
        fd.append(detailKey, JSON.stringify(payload[detailKey]))
      }

      // ✅ Photo goes separately — Django injects it into detail dict
      fd.append('photo_evidence', obsForm.photoFile)

      await api.post(`/jobs/${id}/observations/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    } else {
      // No photo — send clean JSON as before
      await api.post(`/jobs/${id}/observations/`, payload)
    }

    showToast('Observation recorded!')
    setShowObsModal(false)
    setObsForm(defaultForm())
    fetchJob(true)
  } catch (e) {
    const errData = e.response?.data
    const msg = typeof errData === 'object'
      ? JSON.stringify(errData)
      : (errData || 'Could not save observation.')
    showToast(msg, 'error')
  } finally {
    setSavingObs(false)
  }
}

  const handleLogout = async () => {
    clearInterval(intervalRef.current); clearInterval(tickRef.current)
    await logout(); navigate('/login')
  }

  /* Helpers */
  const setF = (key, val) => setObsForm(f => ({...f, [key]: val}))
  const toggleInsectType = (type) => {
    setObsForm(f => ({
      ...f,
      insect_types: f.insect_types.includes(type)
        ? f.insect_types.filter(t => t !== type)
        : [...f.insect_types, type]
    }))
  }

  const isActive = job?.status === 'in_progress' || job?.status === 'observations_recorded'

  /* ════════════════════════════════════════
     RENDER
  ════════════════════════════════════════ */
  return (
    <>
      <style>{S}</style>
      <div className="jd-root">

        {/* SIDEBAR */}
        <aside className="jd-sidebar">
          <div className="jd-sb-logo">
            <div className="jd-sb-icon"><svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/></svg></div>
            <span className="jd-sb-brand">PestPro</span>
          </div>
          <nav className="jd-sb-nav">
            {navItems.map(n => (
              <div key={n.id} className={`jd-sb-item${active===n.id?' active':''}`}
                onClick={() => { setActive(n.id); navigate(n.id==='jobs'?'/technician/jobs':'/technician') }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d={n.d}/>
                </svg>
                {n.label}
              </div>
            ))}
          </nav>
          <div className="jd-sb-user">
            <div className="jd-sb-avatar">{userInitials}</div>
            <div style={{flex:1,minWidth:0}}>
              <div className="jd-sb-uname" style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{userName}</div>
              <div className="jd-sb-urole">Technician</div>
            </div>
            <button className="jd-sb-logout" onClick={handleLogout} title="Logout">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <div className="jd-main">
          <div className="jd-topbar">
            <div className="jd-topbar-left">
              <button className="jd-back-btn" onClick={() => navigate(-1)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
                </svg>
                Back
              </button>
              <span className="jd-crumb">My Jobs &nbsp;›&nbsp; <span>Job #{id}</span></span>
            </div>
            <div className="jd-topbar-right">
              <span className={`jd-ticker${countdown<=10?' soon':''}`}>↻ in {countdown}s</span>
            </div>
          </div>

          {loading ? (
            <div className="jd-loading"><div className="jd-spinner"/>Loading job details…</div>
          ) : error ? (
            <div style={{padding:24}}><div style={{background:'#fde8e8',color:'#e74c3c',padding:14,borderRadius:10,fontSize:13}}>{error}</div></div>
          ) : !job ? null : (
            <>
              {/* HEADER */}
              <div className="jd-header">
                <div>
                  <div className="jd-header-meta">JOB #{job.id}{job.job_uuid ? ` · ${job.job_uuid.slice(0,8)}…` : ''}</div>
                  <div className="jd-header-title">
                    {fmt(job.service_type || 'Service Job')} — {job.customer_name}
                  </div>
                  <span className={`jd-status-chip ${job.status}`}>
                    <span style={{width:6,height:6,borderRadius:'50%',background:'currentColor'}}/>
                    {fmt(job.status)}
                  </span>
                </div>

                <div className="jd-header-actions">
                  {job.status === 'scheduled' && (
                    <button className="jd-start-btn" onClick={handleStart} disabled={starting}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M5 3l14 9-14 9V3z"/></svg>
                      {starting ? 'Starting…' : 'Start Job'}
                    </button>
                  )}
                  {isActive && (<>
                    <button className="jd-obs-btn" onClick={() => setShowObsModal(true)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                      </svg>
                      + Add Observation
                    </button>
                    <button className="jd-complete-btn" onClick={handleComplete} disabled={completing}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      {completing ? 'Completing…' : 'Complete Job'}
                    </button>
                  </>)}
                  <button className="jd-nav-btn" onClick={handleNavigate}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    Navigate
                  </button>
                </div>
              </div>

              {/* CONTENT GRID */}
              <div className="jd-content">

                {/* ── LEFT COLUMN ── */}
                <div className="jd-col-left">

                  {/* Job Details */}
                  <div className="jd-card">
                    <div className="jd-card-hdr">
                      <div className="jd-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                        </svg>
                        Job Details
                      </div>
                    </div>
                    <div className="jd-info-grid">
                      <div className="jd-info-cell">
                        <div className="jd-info-label">Service Type</div>
                        <div className="jd-info-value">{fmt(job.service_type || '—')}</div>
                      </div>
                      <div className="jd-info-cell">
                        <div className="jd-info-label">Status</div>
                        <div className="jd-info-value">{fmt(job.status)}</div>
                      </div>
                      <div className="jd-info-cell">
                        <div className="jd-info-label">Scheduled Date</div>
                        <div className="jd-info-value muted">
                          {job.scheduled_datetime ? fmtDate(job.scheduled_datetime) : '—'}
                        </div>
                      </div>
                      <div className="jd-info-cell">
                        <div className="jd-info-label">Scheduled Time</div>
                        <div className="jd-info-value muted">
                          {job.scheduled_datetime
                            ? new Date(job.scheduled_datetime).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})
                            : '—'}
                        </div>
                      </div>
                      <div className="jd-info-cell">
                        <div className="jd-info-label">Technician</div>
                        <div className="jd-info-value">{job.technician_name || userName}</div>
                      </div>
                      <div className="jd-info-cell">
                        <div className="jd-info-label">Job ID</div>
                        <div className="jd-info-value">#{job.id}</div>
                      </div>
                      <div className="jd-info-cell full">
                        <div className="jd-info-label">Site Address</div>
                        <div className="jd-info-value">{job.site_address || '—'}</div>
                      </div>
                    </div>
                  </div>

                  {/* ── JOB TIMELINE — started_at + completed_at ── */}
                  <div className="jd-card">
                    <div className="jd-card-hdr">
                      <div className="jd-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Job Timeline
                      </div>
                    </div>
                    <div className="jd-timeline">
                      {/* Scheduled */}
                      <div className="jd-timeline-item">
                        <div className="jd-timeline-dot scheduled"/>
                        <div>
                          <div className="jd-timeline-label">Scheduled</div>
                          <div className="jd-timeline-time">{fmtDateTime(job.scheduled_datetime)}</div>
                        </div>
                      </div>
                      {/* Started */}
                      <div className="jd-timeline-item">
                        <div className={`jd-timeline-dot ${job.started_at ? 'started' : 'pending'}`}/>
                        <div>
                          <div className="jd-timeline-label">Started</div>
                          <div className="jd-timeline-time">
                            {job.started_at ? fmtDateTime(job.started_at) : <span style={{color:'var(--pale)',fontStyle:'italic'}}>Not started yet</span>}
                          </div>
                        </div>
                      </div>
                      {/* Completed */}
                      <div className="jd-timeline-item">
                        <div className={`jd-timeline-dot ${job.completed_at ? 'completed' : 'pending'}`}/>
                        <div>
                          <div className="jd-timeline-label">Completed</div>
                          <div className="jd-timeline-time">
                            {job.completed_at ? fmtDateTime(job.completed_at) : <span style={{color:'var(--pale)',fontStyle:'italic'}}>Not completed yet</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── OBSERVATIONS ── */}
                  <div className="jd-card">
                    <div className="jd-card-hdr">
                      <div className="jd-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                        Observations
                        {observations.length > 0 && (
                          <span style={{background:'var(--green-light)',color:'var(--green)',borderRadius:6,padding:'1px 7px',fontSize:11,marginLeft:4}}>
                            {observations.length}
                          </span>
                        )}
                      </div>
                      {isActive && (
                        <button className="jd-add-btn" onClick={() => setShowObsModal(true)}>+ Add</button>
                      )}
                    </div>

                    {observations.length === 0 ? (
                      <div style={{textAlign:'center',padding:'20px 0',color:'var(--pale)',fontSize:13}}>
                        No observations recorded yet.
                      </div>
                    ) : (
                      <div className="jd-obs-list">
                        {observations.map(obs => {
                          const level = getActivityLevel(obs)
                          const summary = getObsSummary(obs)
                          const r = obs.rodent_detail
                          const f = obs.flying_insect_detail
                          const c = obs.cockroach_detail
                          const t = obs.termite_detail
                          const m = obs.mosquito_detail
                          const g = obs.general_detail
                          // find photo from whichever child has it
                          const photo = r?.photo_evidence || f?.photo_evidence || c?.photo_evidence ||
                            t?.photo_evidence || m?.photo_evidence || g?.photo_evidence || null

                          return (
                            <div key={obs.id} className="jd-obs-item">
                              <div className="jd-obs-top">
                                <div className="jd-obs-icon">
                                  {categoryEmoji[obs.observation_category] || '🔍'}
                                </div>
                                <div className="jd-obs-body">
                                  <div className="jd-obs-title">
                                    {fmt(obs.observation_category)} Observation
                                  </div>
                                  <div className="jd-obs-meta">
                                    {obs.recorded_by_name || 'Technician'} ·{' '}
                                    {new Date(obs.observation_time).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                                    {obs.notes ? ` · ${obs.notes}` : ''}
                                  </div>
                                </div>
                                {level && <span className={`jd-level ${level}`}>{level}</span>}
                              </div>

                              {/* Detail summary */}
                              <div className="jd-obs-summary">{summary}</div>

                              {/* Quick-read tags per category */}
                              <div className="jd-obs-tags">
                                {r && (<>
                                  {r.bait_consumed   && <span className="jd-obs-tag warn">Bait consumed</span>}
                                  {r.bait_replaced   && <span className="jd-obs-tag yes">Bait replaced</span>}
                                  {r.droppings_observed && <span className="jd-obs-tag warn">Droppings</span>}
                                  {r.gnaw_marks      && <span className="jd-obs-tag warn">Gnaw marks</span>}
                                </>)}
                                {f && (<>
                                  {!f.machine_functional && <span className="jd-obs-tag danger">Machine fault</span>}
                                  {f.glue_board_changed  && <span className="jd-obs-tag yes">Board changed</span>}
                                  {f.insect_types_trapped?.map(t => <span key={t} className="jd-obs-tag">{t}</span>)}
                                </>)}
                                {c && (<>
                                  {c.gel_applied  && <span className="jd-obs-tag yes">Gel applied</span>}
                                  {c.gel_consumed && <span className="jd-obs-tag warn">Gel consumed</span>}
                                </>)}
                                {t && (<>
                                  {t.termites_found       && <span className="jd-obs-tag danger">Termites found</span>}
                                  {t.mud_tubes_found      && <span className="jd-obs-tag warn">Mud tubes</span>}
                                  {t.wood_damage_observed && <span className="jd-obs-tag danger">Wood damage · {t.damage_severity}</span>}
                                  {t.bait_replaced        && <span className="jd-obs-tag yes">Bait replaced</span>}
                                </>)}
                                {m && (<>
                                  {m.fogging_done    && <span className="jd-obs-tag yes">Fogging done</span>}
                                  {m.larval_activity && <span className="jd-obs-tag warn">Larval activity</span>}
                                  {m.chemical_used   && <span className="jd-obs-tag">{m.chemical_used}</span>}
                                </>)}
                                {g && (<>
                                  {g.treatment_applied && <span className="jd-obs-tag yes">Treatment applied</span>}
                                  {g.recommended_action && <span className="jd-obs-tag warn">Action recommended</span>}
                                </>)}
                              </div>

                              {/* Photo evidence */}
                              {photo && (
                                <img
                                  src={photo}
                                  alt="Evidence"
                                  className="jd-obs-photo"
                                  onClick={() => setLightboxSrc(photo)}
                                />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Technician Notes */}
                  <div className="jd-card">
                    <div className="jd-card-hdr">
                      <div className="jd-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                        Technician Notes
                      </div>
                      {!editingNotes && (
                        <button className="jd-add-btn" onClick={() => setEditingNotes(true)}>Edit</button>
                      )}
                    </div>
                    {editingNotes ? (
                      <>
                        <textarea className="jd-notes-textarea" value={notesVal}
                          onChange={e => setNotesVal(e.target.value)} placeholder="Add your notes about this job…"/>
                        <div className="jd-notes-actions">
                          <button className="jd-cancel-btn" onClick={() => { setEditingNotes(false); setNotesVal(job.completion_notes || '') }}>Cancel</button>
                          <button className="jd-save-btn" onClick={handleSaveNotes} disabled={savingNotes}>
                            {savingNotes ? 'Saving…' : 'Save Notes'}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="jd-notes-text">{notesVal || 'No notes added yet.'}</div>
                    )}
                  </div>
                </div>

                {/* ── RIGHT COLUMN ── */}
                <div className="jd-col-right">

                  {/* Customer */}
                  <div className="jd-card">
                    <div className="jd-card-hdr">
                      <div className="jd-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                        </svg>
                        Customer
                      </div>
                    </div>
                    <div className="jd-customer-row">
                      <div className="jd-customer-av">{job.customer_name?.[0]?.toUpperCase() || 'C'}</div>
                      <div>
                        <div className="jd-customer-name">{job.customer_name}</div>
                        {job.customer_email && <div className="jd-customer-email">{job.customer_email}</div>}
                      </div>
                    </div>
                    <button className="jd-maps-btn" onClick={handleNavigate}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                      Open in Maps
                    </button>
                  </div>

                  {/* Signature */}
                  <div className="jd-card">
                    <div className="jd-card-hdr">
                      <div className="jd-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                        </svg>
                        Customer Signature
                      </div>
                    </div>
                    {sigSaved && (
                      <div className="jd-sig-saved">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Signature saved ✓
                      </div>
                    )}
                    <div className="jd-sig-wrap">
                      <canvas ref={canvasRef} id="jd-sig-canvas" width={280} height={120}/>
                    </div>
                    <div className="jd-sig-hint">Ask the customer to sign above</div>
                    <div className="jd-sig-btns">
                      <button className="jd-sig-clear" onClick={handleClearSignature}>Clear</button>
                      <button className="jd-sig-save" onClick={handleSaveSignature} disabled={savingSig}>
                        {savingSig ? 'Saving…' : 'Save Signature'}
                      </button>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="jd-card">
                    <div className="jd-card-hdr">
                      <div className="jd-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                        </svg>
                        Summary
                      </div>
                    </div>
                    <div className="jd-summary-row">
                      <span className="jd-summary-label">Observations</span>
                      <span className={`jd-summary-value${observations.length>0?' green':''}`}>{observations.length}</span>
                    </div>
                    <div className="jd-summary-row">
                      <span className="jd-summary-label">Signature</span>
                      <span className={`jd-summary-value${sigSaved?' green':' red'}`}>{sigSaved ? 'Saved ✓' : 'Not yet'}</span>
                    </div>
                    <div className="jd-summary-row">
                      <span className="jd-summary-label">Notes</span>
                      <span className={`jd-summary-value${notesVal?' green':''}`}>{notesVal ? 'Added' : 'None'}</span>
                    </div>
                    <div className="jd-summary-row">
                      <span className="jd-summary-label">Started</span>
                      <span className={`jd-summary-value${job.started_at?' green':''}`}>{job.started_at ? '✓' : '—'}</span>
                    </div>
                    <div className="jd-summary-row">
                      <span className="jd-summary-label">Completed</span>
                      <span className={`jd-summary-value${job.completed_at?' green':' red'}`}>{job.completed_at ? '✓' : 'Pending'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ══════════════════════════════════════
            OBSERVATION MODAL — full model fields
        ══════════════════════════════════════ */}
        {showObsModal && (
          <div className="jd-modal-overlay" onClick={e => { if(e.target===e.currentTarget) setShowObsModal(false) }}>
            <div className="jd-modal">
              <div className="jd-modal-title">Add Observation</div>
              <div className="jd-modal-sub">Record pest activity for Job #{id}</div>

              {/* Category */}
              <div className="jd-field">
                <label>Pest Category *</label>
                <select value={obsForm.category} onChange={e => setF('category', e.target.value)}>
                  {OBS_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              {/* ── RODENT FIELDS ── */}
              {obsForm.category === 'rodent' && (
                <div className="jd-modal-section">
                  <div className="jd-modal-section-title">Rodent Details</div>
                  <div className="jd-field-row">
                    <div className="jd-field">
                      <label>Box ID *</label>
                      <input placeholder="e.g. Box-A1" value={obsForm.rodent_box_id} onChange={e => setF('rodent_box_id', e.target.value)}/>
                    </div>
                    <div className="jd-field">
                      <label>Rats Found</label>
                      <input type="number" min="0" placeholder="0" value={obsForm.count} onChange={e => setF('count', e.target.value)}/>
                    </div>
                  </div>
                  <div className="jd-field">
                    <label>Location in Premises *</label>
                    <input placeholder="e.g. Kitchen corner, Near drain" value={obsForm.location} onChange={e => setF('location', e.target.value)}/>
                  </div>
                  <div className="jd-field">
                    <label>Activity Level</label>
                    <select value={obsForm.activity_level} onChange={e => setF('activity_level', e.target.value)}>
                      {ACTIVITY_LEVELS.map(l => <option key={l} value={l}>{fmt(l)}</option>)}
                    </select>
                  </div>
                  <div className="jd-checkbox-row"><input type="checkbox" id="bc" checked={obsForm.bait_consumed} onChange={e => setF('bait_consumed', e.target.checked)}/><label htmlFor="bc">Bait Consumed</label></div>
                  <div className="jd-checkbox-row"><input type="checkbox" id="br" checked={obsForm.bait_replaced} onChange={e => setF('bait_replaced', e.target.checked)}/><label htmlFor="br">Bait Replaced</label></div>
                  <div className="jd-checkbox-row"><input type="checkbox" id="dr" checked={obsForm.droppings_observed} onChange={e => setF('droppings_observed', e.target.checked)}/><label htmlFor="dr">Droppings Observed</label></div>
                  <div className="jd-checkbox-row"><input type="checkbox" id="gn" checked={obsForm.gnaw_marks} onChange={e => setF('gnaw_marks', e.target.checked)}/><label htmlFor="gn">Gnaw Marks</label></div>
                </div>
              )}

              {/* ── FLYING INSECT FIELDS ── */}
              {obsForm.category === 'flying_insect' && (
                <div className="jd-modal-section">
                  <div className="jd-modal-section-title">Flying Insect Details</div>
                  <div className="jd-field-row">
                    <div className="jd-field">
                      <label>Machine ID *</label>
                      <input placeholder="e.g. FC-01" value={obsForm.machine_id} onChange={e => setF('machine_id', e.target.value)}/>
                    </div>
                    <div className="jd-field">
                      <label>Insects Trapped</label>
                      <input type="number" min="0" placeholder="0" value={obsForm.count} onChange={e => setF('count', e.target.value)}/>
                    </div>
                  </div>
                  <div className="jd-field">
                    <label>Machine Location *</label>
                    <input placeholder="e.g. Near entrance, Reception" value={obsForm.location} onChange={e => setF('location', e.target.value)}/>
                  </div>
                  <div className="jd-field">
                    <label>Insect Types Trapped</label>
                    <div className="jd-chip-group">
                      {INSECT_TYPES.map(t => (
                        <button key={t} type="button" className={`jd-chip${obsForm.insect_types.includes(t)?' selected':''}`}
                          onClick={() => toggleInsectType(t)}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div className="jd-field">
                    <label>Glue Board Condition</label>
                    <select value={obsForm.glue_board_condition} onChange={e => setF('glue_board_condition', e.target.value)}>
                      {GLUE_CONDITION.map(g => <option key={g} value={g}>{fmt(g)}</option>)}
                    </select>
                  </div>
                  <div className="jd-checkbox-row"><input type="checkbox" id="gbc" checked={obsForm.glue_board_changed} onChange={e => setF('glue_board_changed', e.target.checked)}/><label htmlFor="gbc">Glue Board Changed</label></div>
                  <div className="jd-checkbox-row"><input type="checkbox" id="mf" checked={obsForm.machine_functional} onChange={e => setF('machine_functional', e.target.checked)}/><label htmlFor="mf">Machine Functional</label></div>
                </div>
              )}

              {/* ── COCKROACH FIELDS ── */}
              {obsForm.category === 'cockroach' && (
                <div className="jd-modal-section">
                  <div className="jd-modal-section-title">Cockroach Details</div>
                  <div className="jd-field-row">
                    <div className="jd-field">
                      <label>Station ID *</label>
                      <input placeholder="e.g. CG-01" value={obsForm.station_id} onChange={e => setF('station_id', e.target.value)}/>
                    </div>
                    <div className="jd-field">
                      <label>Cockroaches Found</label>
                      <input type="number" min="0" placeholder="0" value={obsForm.count} onChange={e => setF('count', e.target.value)}/>
                    </div>
                  </div>
                  <div className="jd-field">
                    <label>Location in Premises *</label>
                    <input placeholder="e.g. Under kitchen sink" value={obsForm.location} onChange={e => setF('location', e.target.value)}/>
                  </div>
                  <div className="jd-field">
                    <label>Infestation Area</label>
                    <input placeholder="e.g. Kitchen, Bathroom" value={obsForm.infestation_area} onChange={e => setF('infestation_area', e.target.value)}/>
                  </div>
                  <div className="jd-field">
                    <label>Activity Level</label>
                    <select value={obsForm.activity_level} onChange={e => setF('activity_level', e.target.value)}>
                      {ACTIVITY_LEVELS.map(l => <option key={l} value={l}>{fmt(l)}</option>)}
                    </select>
                  </div>
                  <div className="jd-checkbox-row"><input type="checkbox" id="ga" checked={obsForm.gel_applied} onChange={e => setF('gel_applied', e.target.checked)}/><label htmlFor="ga">Gel Applied</label></div>
                  <div className="jd-checkbox-row"><input type="checkbox" id="gc" checked={obsForm.gel_consumed} onChange={e => setF('gel_consumed', e.target.checked)}/><label htmlFor="gc">Gel Consumed</label></div>
                </div>
              )}

              {/* ── TERMITE FIELDS ── */}
              {obsForm.category === 'termite' && (
                <div className="jd-modal-section">
                  <div className="jd-modal-section-title">Termite Details</div>
                  <div className="jd-field-row">
                    <div className="jd-field">
                      <label>Station ID *</label>
                      <input placeholder="e.g. TB-01" value={obsForm.station_id} onChange={e => setF('station_id', e.target.value)}/>
                    </div>
                    <div className="jd-field">
                      <label>Damage Severity</label>
                      <select value={obsForm.damage_severity} onChange={e => setF('damage_severity', e.target.value)}>
                        {DAMAGE_SEVERITY.map(s => <option key={s} value={s}>{fmt(s)}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="jd-field">
                    <label>Station Location *</label>
                    <input placeholder="e.g. Garden wall, Wooden frame" value={obsForm.location} onChange={e => setF('location', e.target.value)}/>
                  </div>
                  <div className="jd-checkbox-row"><input type="checkbox" id="tf" checked={obsForm.termites_found} onChange={e => setF('termites_found', e.target.checked)}/><label htmlFor="tf">Termites Found</label></div>
                  <div className="jd-checkbox-row"><input type="checkbox" id="tbc" checked={obsForm.bait_consumed} onChange={e => setF('bait_consumed', e.target.checked)}/><label htmlFor="tbc">Bait Consumed</label></div>
                  <div className="jd-checkbox-row"><input type="checkbox" id="tbr" checked={obsForm.bait_replaced} onChange={e => setF('bait_replaced', e.target.checked)}/><label htmlFor="tbr">Bait Replaced</label></div>
                  <div className="jd-checkbox-row"><input type="checkbox" id="mt" checked={obsForm.mud_tubes_found} onChange={e => setF('mud_tubes_found', e.target.checked)}/><label htmlFor="mt">Mud Tubes Found</label></div>
                  <div className="jd-checkbox-row"><input type="checkbox" id="wd" checked={obsForm.wood_damage_observed} onChange={e => setF('wood_damage_observed', e.target.checked)}/><label htmlFor="wd">Wood Damage Observed</label></div>
                </div>
              )}

              {/* ── MOSQUITO FIELDS ── */}
              {obsForm.category === 'mosquito' && (
                <div className="jd-modal-section">
                  <div className="jd-modal-section-title">Mosquito Details</div>
                  <div className="jd-field">
                    <label>Treatment Area *</label>
                    <input placeholder="e.g. Garden, Drainage, Stairwell" value={obsForm.location} onChange={e => setF('location', e.target.value)}/>
                  </div>
                  <div className="jd-field">
                    <label>Adult Mosquito Density</label>
                    <select value={obsForm.activity_level} onChange={e => setF('activity_level', e.target.value)}>
                      {ACTIVITY_LEVELS.map(l => <option key={l} value={l}>{fmt(l)}</option>)}
                    </select>
                  </div>
                  <div className="jd-field-row">
                    <div className="jd-field">
                      <label>Breeding Sites Found</label>
                      <input type="number" min="0" placeholder="0" value={obsForm.breeding_sites_found} onChange={e => setF('breeding_sites_found', e.target.value)}/>
                    </div>
                    <div className="jd-field">
                      <label>Sites Eliminated</label>
                      <input type="number" min="0" placeholder="0" value={obsForm.breeding_sites_eliminated} onChange={e => setF('breeding_sites_eliminated', e.target.value)}/>
                    </div>
                  </div>
                  <div className="jd-field">
                    <label>Chemical Used</label>
                    <input placeholder="e.g. Deltamethrin" value={obsForm.chemical_used} onChange={e => setF('chemical_used', e.target.value)}/>
                  </div>
                  <div className="jd-checkbox-row"><input type="checkbox" id="fd" checked={obsForm.fogging_done} onChange={e => setF('fogging_done', e.target.checked)}/><label htmlFor="fd">Fogging Done</label></div>
                  <div className="jd-checkbox-row"><input type="checkbox" id="la" checked={obsForm.larval_activity} onChange={e => setF('larval_activity', e.target.checked)}/><label htmlFor="la">Larval Activity Observed</label></div>
                </div>
              )}

              {/* ── GENERAL FIELDS ── */}
              {obsForm.category === 'general' && (
                <div className="jd-modal-section">
                  <div className="jd-modal-section-title">General Pest Details</div>
                  <div className="jd-field-row">
                    <div className="jd-field">
                      <label>Pest Type *</label>
                      <input placeholder="e.g. Bed Bug, Ant, Bird" value={obsForm.pest_type_observed} onChange={e => setF('pest_type_observed', e.target.value)}/>
                    </div>
                    <div className="jd-field">
                      <label>Pest Count</label>
                      <input type="number" min="0" placeholder="0" value={obsForm.count} onChange={e => setF('count', e.target.value)}/>
                    </div>
                  </div>
                  <div className="jd-field">
                    <label>Location in Premises *</label>
                    <input placeholder="e.g. Master bedroom, Ceiling gap" value={obsForm.location} onChange={e => setF('location', e.target.value)}/>
                  </div>
                  <div className="jd-field">
                    <label>Activity Level</label>
                    <select value={obsForm.activity_level} onChange={e => setF('activity_level', e.target.value)}>
                      {ACTIVITY_LEVELS.map(l => <option key={l} value={l}>{fmt(l)}</option>)}
                    </select>
                  </div>
                  <div className="jd-field">
                    <label>Treatment Description</label>
                    <input placeholder="e.g. Spray, Trap placed, Gel applied" value={obsForm.treatment_description} onChange={e => setF('treatment_description', e.target.value)}/>
                  </div>
                  <div className="jd-field">
                    <label>Recommended Action</label>
                    <textarea placeholder="Follow-up recommendation…" value={obsForm.recommended_action} onChange={e => setF('recommended_action', e.target.value)}/>
                  </div>
                  <div className="jd-checkbox-row"><input type="checkbox" id="ta" checked={obsForm.treatment_applied} onChange={e => setF('treatment_applied', e.target.checked)}/><label htmlFor="ta">Treatment Applied</label></div>
                </div>
              )}

              {/* ── PHOTO UPLOAD (all categories) ── */}
              <div className="jd-modal-section">
                <div className="jd-modal-section-title">Photo Evidence</div>
                <div className="jd-photo-upload" onClick={() => photoInputRef.current?.click()}>
                  <input ref={photoInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoSelect}/>
                  <label className="jd-photo-upload-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    {obsForm.photoFile ? obsForm.photoFile.name : 'Tap to take photo or upload'}
                  </label>
                  {obsForm.photoPreview && (
                    <img src={obsForm.photoPreview} alt="Preview" className="jd-photo-preview"/>
                  )}
                </div>
              </div>

              {/* Notes — all categories */}
              <div className="jd-field">
                <label>Additional Notes</label>
                <textarea placeholder="Any extra observations…" value={obsForm.notes} onChange={e => setF('notes', e.target.value)}/>
              </div>

              <div className="jd-modal-btns">
                <button className="jd-modal-cancel" onClick={() => { setShowObsModal(false); setObsForm(defaultForm()) }}>Cancel</button>
                <button className="jd-modal-save" onClick={handleSaveObs} disabled={savingObs}>
                  {savingObs ? 'Saving…' : 'Save Observation'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TOAST */}
        {toast && (
          <div className={`jd-toast ${toast.type}`}>
            {toast.type === 'error'
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            }
            {toast.msg}
          </div>
        )}

        {/* PHOTO LIGHTBOX */}
        {lightboxSrc && (
          <div className="jd-lightbox" onClick={() => setLightboxSrc(null)}>
            <img src={lightboxSrc} alt="Evidence"/>
          </div>
        )}
      </div>
    </>
  )
}