import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const displayName = (user) => {
  if (!user) return 'Admin'
  return user.full_name || user.name ||
    (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : null) ||
    user.first_name || user.username || 'Admin'
}
const initials = (name = '') => {
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return (parts[0]?.[0] || 'A').toUpperCase()
}
const fmt = (s = '') => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
const fmtDate = (dt) => {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
const fmtDateTime = (dt) => {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

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
  if (r) return `Box ${r.rodent_box_id} · ${r.rats_found_count} rats · ${r.location_in_premises}`
  if (f) return `Machine ${f.flycatcher_machine_id} · ${f.insects_trapped_count} trapped · ${f.machine_location}`
  if (c) return `Station ${c.station_id} · ${c.cockroaches_found} found · ${c.location_in_premises}`
  if (t) return `Station ${t.station_id} · ${t.termites_found ? 'Termites found' : 'Clear'} · ${t.station_location}`
  if (m) return `${m.treatment_area} · ${m.breeding_sites_found} sites · ${m.adult_mosquito_density} density`
  if (g) return `${g.pest_type_observed} · ${g.pest_count} found · ${g.location_in_premises}`
  return obs.notes || '—'
}

const AUTO_REFRESH = 30
const ALL_STATUSES = ['scheduled', 'in_progress', 'observations_recorded', 'completed', 'report_sent', 'cancelled']
const OBS_CATEGORIES = [
  { value: 'rodent', label: 'Rodent 🐀' },
  { value: 'flying_insect', label: 'Flying Insect 🦟' },
  { value: 'cockroach', label: 'Cockroach 🪳' },
  { value: 'termite', label: 'Termite 🐛' },
  { value: 'mosquito', label: 'Mosquito 🦟' },
  { value: 'general', label: 'General 🔍' },
]
const INSECT_TYPES = ['Flies', 'Mosquitoes', 'Moths', 'Wasps', 'Others']
const ACTIVITY_LEVELS = ['none', 'low', 'medium', 'high']
const DAMAGE_SEVERITY = ['none', 'minor', 'moderate', 'severe']
const GLUE_CONDITION = ['good', 'dirty', 'replaced']

/* ─────────────────────────────────────────────
   NAV ITEMS
───────────────────────────────────────────── */
const navItems = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'jobs', label: 'All Jobs', path: '/dashboard/jobs', d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'customers', label: 'Customers', path: '/dashboard/customers', d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'technicians', label: 'Technicians', path: '/dashboard/technicians', d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { id: 'reports', label: 'Reports', path: '/dashboard/reports', d: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'alerts', label: 'Smart Alerts', path: '/dashboard/alerts', d: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { id: 'settings', label: 'Settings', path: '/dashboard/settings', d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
]

/* ─────────────────────────────────────────────
   BUILD OBSERVATION PAYLOAD
───────────────────────────────────────────── */
function buildObsPayload(form) {
  const base = { observation_category: form.category, notes: form.notes || '' }
  if (form.category === 'rodent') return { ...base, rodent_detail: { rodent_box_id: form.rodent_box_id || 'Box-A1', location_in_premises: form.location || '', rats_found_count: parseInt(form.count) || 0, bait_consumed: form.bait_consumed, bait_replaced: form.bait_replaced, droppings_observed: form.droppings_observed, gnaw_marks: form.gnaw_marks, activity_level: form.activity_level || 'low' } }
  if (form.category === 'flying_insect') return { ...base, flying_insect_detail: { flycatcher_machine_id: form.machine_id || 'FC-01', machine_location: form.location || '', insects_trapped_count: parseInt(form.count) || 0, insect_types_trapped: form.insect_types || ['Flies'], glue_board_changed: form.glue_board_changed, glue_board_condition: form.glue_board_condition || 'good', machine_functional: form.machine_functional } }
  if (form.category === 'cockroach') return { ...base, cockroach_detail: { station_id: form.station_id || 'CG-01', location_in_premises: form.location || '', cockroaches_found: parseInt(form.count) || 0, gel_applied: form.gel_applied, gel_consumed: form.gel_consumed, activity_level: form.activity_level || 'low', infestation_area: form.infestation_area || '' } }
  if (form.category === 'termite') return { ...base, termite_detail: { station_id: form.station_id || 'TB-01', station_location: form.location || '', termites_found: form.termites_found, bait_consumed: form.bait_consumed, bait_replaced: form.bait_replaced, mud_tubes_found: form.mud_tubes_found, wood_damage_observed: form.wood_damage_observed, damage_severity: form.damage_severity || 'none' } }
  if (form.category === 'mosquito') return { ...base, mosquito_detail: { treatment_area: form.location || '', fogging_done: form.fogging_done, chemical_used: form.chemical_used || '', breeding_sites_found: parseInt(form.breeding_sites_found) || 0, breeding_sites_eliminated: parseInt(form.breeding_sites_eliminated) || 0, larval_activity: form.larval_activity, adult_mosquito_density: form.activity_level || 'low' } }
  return { ...base, general_detail: { pest_type_observed: form.pest_type_observed || 'Other', location_in_premises: form.location || '', pest_count: parseInt(form.count) || 0, treatment_applied: form.treatment_applied, treatment_description: form.treatment_description || '', activity_level: form.activity_level || 'low', recommended_action: form.recommended_action || '' } }
}

const defaultForm = () => ({
  category: 'rodent', notes: '', location: '', count: '', activity_level: 'low',
  rodent_box_id: '', bait_consumed: false, bait_replaced: false, droppings_observed: false, gnaw_marks: false,
  machine_id: '', insect_types: ['Flies'], glue_board_changed: false, glue_board_condition: 'good', machine_functional: true,
  station_id: '', gel_applied: false, gel_consumed: false, infestation_area: '',
  termites_found: false, mud_tubes_found: false, wood_damage_observed: false, damage_severity: 'none',
  fogging_done: false, chemical_used: '', breeding_sites_found: '', breeding_sites_eliminated: '', larval_activity: false,
  pest_type_observed: '', treatment_applied: false, treatment_description: '', recommended_action: '',
  photoFile: null, photoPreview: null,
})

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
.ajd-root{font-family:'DM Serif Display',serif;min-height:100vh;background:var(--bg);display:flex;}

/* SIDEBAR */
.ajd-sidebar{width:var(--sidebar-w);background:var(--white);border-right:1px solid var(--border);
  display:flex;flex-direction:column;min-height:100vh;
  position:fixed;top:0;left:0;bottom:0;z-index:200;overflow-y:auto;transition:transform .25s ease;}
.ajd-sb-logo{padding:16px 20px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border);}
.ajd-sb-icon{width:28px;height:28px;background:var(--green);border-radius:6px;display:flex;align-items:center;justify-content:center;}
.ajd-sb-icon svg{width:15px;height:15px;fill:white;}
.ajd-sb-brand{font-size:16px;color:var(--ink);}
.ajd-sb-nav{padding:12px 10px;flex:1;}
.ajd-sb-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;cursor:pointer;margin-bottom:2px;color:var(--muted);font-size:13.5px;transition:background .15s,color .15s;white-space:nowrap;}
.ajd-sb-item:hover{background:var(--bg);color:var(--ink);}
.ajd-sb-item.active{background:var(--green-light);color:var(--green);}
.ajd-sb-item svg{width:16px;height:16px;flex-shrink:0;}
.ajd-sb-user{padding:14px 16px;border-top:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-shrink:0;}
.ajd-sb-avatar{width:32px;height:32px;background:var(--green);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;flex-shrink:0;}
.ajd-sb-uname{font-size:13px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ajd-sb-urole{font-size:11px;color:var(--pale);}
.ajd-sb-logout{background:none;border:none;cursor:pointer;color:var(--pale);padding:4px;border-radius:6px;display:flex;align-items:center;margin-left:auto;transition:color .15s,background .15s;}
.ajd-sb-logout:hover{color:var(--red);background:#fde8e8;}
.ajd-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:150;}
.ajd-overlay.show{display:block;}
.ajd-hamburger{display:none;background:none;border:none;cursor:pointer;padding:4px;border-radius:6px;color:var(--ink);}
.ajd-hamburger svg{width:20px;height:20px;}

/* MAIN */
.ajd-main{flex:1;margin-left:var(--sidebar-w);display:flex;flex-direction:column;min-height:100vh;}

/* TOPBAR */
.ajd-topbar{background:var(--white);border-bottom:1px solid var(--border);padding:0 24px;height:52px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;flex-shrink:0;gap:12px;}
.ajd-topbar-left{display:flex;align-items:center;gap:10px;}
.ajd-back-btn{background:none;border:1.5px solid var(--border);border-radius:9px;padding:7px 14px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;color:var(--ink);display:flex;align-items:center;gap:6px;transition:background .15s;}
.ajd-back-btn:hover{background:var(--bg);}
.ajd-topbar-right{display:flex;align-items:center;gap:8px;}
.ajd-ticker{font-size:11px;color:var(--pale);white-space:nowrap;}
.ajd-ticker.soon{color:var(--green);}
.ajd-crumb{font-size:13px;color:var(--pale);}
.ajd-crumb span{color:var(--ink);}

/* HEADER */
.ajd-header{padding:20px 24px 0;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;}
.ajd-header-meta{font-size:11px;color:var(--pale);text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px;}
.ajd-header-title{font-size:24px;color:var(--ink);margin-bottom:6px;}
.ajd-status-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;font-size:12px;}
.ajd-status-chip.scheduled{background:#fff8ec;color:var(--amber);}
.ajd-status-chip.in_progress{background:var(--green-light);color:var(--green);}
.ajd-status-chip.observations_recorded{background:#eff6ff;color:var(--blue);}
.ajd-status-chip.completed,.ajd-status-chip.report_sent{background:#f0f2f0;color:var(--muted);}
.ajd-status-chip.cancelled{background:#fde8e8;color:var(--red);}
.ajd-header-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}

/* ACTION BUTTONS */
.ajd-btn{border:none;border-radius:9px;padding:9px 18px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;transition:background .15s;white-space:nowrap;}
.ajd-btn svg{width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2;}
.ajd-btn-green{background:var(--green);color:#fff;}
.ajd-btn-green:hover{background:var(--green-dark);}
.ajd-btn-amber{background:#fff8ec;color:var(--amber);}
.ajd-btn-amber:hover{background:#fde8c0;}
.ajd-btn-blue{background:#eff6ff;color:var(--blue);}
.ajd-btn-blue:hover{background:#dbeafe;}
.ajd-btn-danger{background:#fde8e8;color:var(--red);}
.ajd-btn-danger:hover{background:#f5c6c6;}
.ajd-btn-secondary{background:var(--bg);color:var(--ink);border:1.5px solid var(--border);}
.ajd-btn-secondary:hover{background:#e2e8e2;}
.ajd-btn:disabled{opacity:.6;cursor:not-allowed;}

/* CONTENT GRID */
.ajd-content{padding:16px 24px 32px;display:grid;grid-template-columns:1fr 320px;gap:16px;align-items:start;}
.ajd-col-left,.ajd-col-right{display:flex;flex-direction:column;gap:14px;}

/* CARDS */
.ajd-card{background:var(--white);border-radius:14px;padding:20px;box-shadow:0 2px 10px rgba(0,0,0,.05);}
.ajd-card-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
.ajd-card-title{font-size:10.5px;text-transform:uppercase;letter-spacing:.8px;color:var(--pale);display:flex;align-items:center;gap:6px;}
.ajd-card-title svg{width:13px;height:13px;}

/* INFO GRID */
.ajd-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;}
.ajd-info-cell{padding:11px 0;border-bottom:1px solid #f5f7f5;}
.ajd-info-cell:nth-last-child(-n+2){border-bottom:none;}
.ajd-info-cell.full{grid-column:1/-1;}
.ajd-info-label{font-size:10px;color:var(--pale);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;}
.ajd-info-value{font-size:14px;color:var(--ink);}
.ajd-info-value.muted{color:var(--muted);}

/* TIMELINE */
.ajd-timeline{display:flex;flex-direction:column;gap:0;margin-top:4px;}
.ajd-timeline-item{display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-bottom:1px solid #f5f7f5;}
.ajd-timeline-item:last-child{border-bottom:none;}
.ajd-timeline-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;margin-top:4px;}
.ajd-timeline-dot.scheduled{background:var(--amber);}
.ajd-timeline-dot.started{background:var(--blue);}
.ajd-timeline-dot.completed{background:var(--green);}
.ajd-timeline-dot.pending{background:#d1d5d1;}
.ajd-timeline-label{font-size:12px;color:var(--muted);}
.ajd-timeline-time{font-size:13px;color:var(--ink);margin-top:1px;}

/* OBSERVATIONS */
.ajd-obs-list{display:flex;flex-direction:column;}
.ajd-obs-item{border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:10px;}
.ajd-obs-item:last-child{margin-bottom:0;}
.ajd-obs-top{display:flex;align-items:center;gap:10px;margin-bottom:8px;}
.ajd-obs-icon{width:36px;height:36px;border-radius:9px;background:var(--green-light);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}
.ajd-obs-body{flex:1;min-width:0;}
.ajd-obs-title{font-size:13.5px;color:var(--ink);margin-bottom:2px;}
.ajd-obs-meta{font-size:11px;color:var(--pale);}
.ajd-obs-summary{font-size:12.5px;color:var(--muted);margin-top:6px;padding-top:8px;border-top:1px solid #f5f7f5;line-height:1.5;}
.ajd-obs-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;}
.ajd-obs-tag{font-size:11px;padding:2px 8px;border-radius:6px;background:var(--bg);color:var(--muted);}
.ajd-obs-tag.yes{background:var(--green-light);color:var(--green);}
.ajd-obs-tag.warn{background:#fff8ec;color:var(--amber);}
.ajd-obs-tag.danger{background:#fde8e8;color:var(--red);}
.ajd-obs-photo{width:100%;max-height:160px;object-fit:cover;border-radius:8px;margin-top:8px;cursor:pointer;}
.ajd-level{font-size:11px;padding:2px 8px;border-radius:6px;flex-shrink:0;}
.ajd-level.high{background:#fde8e8;color:var(--red);}
.ajd-level.medium{background:#fff8ec;color:var(--amber);}
.ajd-level.low{background:var(--green-light);color:var(--green);}
.ajd-level.none{background:#f0f2f0;color:var(--muted);}
.ajd-add-btn{background:none;border:1px dashed #c8d0c8;border-radius:8px;padding:5px 12px;font-family:'DM Serif Display',serif;font-size:12px;cursor:pointer;color:var(--muted);transition:all .15s;}
.ajd-add-btn:hover{border-color:var(--green);color:var(--green);background:var(--green-light);}

/* NOTES */
.ajd-notes-text{font-size:13px;color:var(--muted);font-style:italic;line-height:1.6;}
.ajd-notes-textarea{width:100%;border:1.5px solid var(--border);border-radius:9px;padding:10px 14px;font-family:'DM Serif Display',serif;font-size:13px;color:var(--ink);resize:vertical;min-height:90px;outline:none;transition:border-color .15s;}
.ajd-notes-textarea:focus{border-color:var(--green);}
.ajd-notes-actions{display:flex;gap:8px;margin-top:10px;}
.ajd-save-btn{background:var(--green);color:#fff;border:none;border-radius:8px;padding:8px 18px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;}
.ajd-save-btn:hover{background:#155a32;}
.ajd-cancel-btn{background:none;border:1.5px solid var(--border);border-radius:8px;padding:7px 14px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;color:var(--muted);}
.ajd-cancel-btn:hover{background:var(--bg);}

/* CUSTOMER */
.ajd-customer-row{display:flex;align-items:center;gap:12px;margin-bottom:14px;}
.ajd-customer-av{width:40px;height:40px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center;color:#fff;font-size:15px;flex-shrink:0;}
.ajd-customer-name{font-size:15px;color:var(--ink);}
.ajd-customer-email{font-size:12px;color:var(--pale);margin-top:2px;}
.ajd-maps-btn{width:100%;background:#eff6ff;color:var(--blue);border:none;border-radius:9px;padding:10px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:background .15s;}
.ajd-maps-btn:hover{background:#dbeafe;}

/* SIGNATURE */
.ajd-sig-wrap{position:relative;border:1.5px solid var(--border);border-radius:10px;overflow:hidden;background:#fafbfa;margin-bottom:10px;}
#ajd-sig-canvas{display:block;touch-action:none;cursor:crosshair;}
.ajd-sig-hint{font-size:11px;color:var(--pale);margin-bottom:10px;}
.ajd-sig-saved{font-size:12px;color:var(--green);margin-bottom:8px;display:flex;align-items:center;gap:5px;}
.ajd-sig-btns{display:flex;gap:8px;}
.ajd-sig-clear{background:none;border:1.5px solid var(--border);border-radius:8px;padding:8px 16px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;color:var(--muted);}
.ajd-sig-save{background:var(--green);color:#fff;border:none;border-radius:8px;padding:8px 18px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;}
.ajd-sig-save:hover{background:#155a32;}
.ajd-sig-save:disabled{opacity:.6;cursor:not-allowed;}

/* SUMMARY */
.ajd-summary-row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid #f5f7f5;}
.ajd-summary-row:last-child{border-bottom:none;}
.ajd-summary-label{font-size:13px;color:var(--muted);}
.ajd-summary-value{font-size:13.5px;color:var(--ink);}
.ajd-summary-value.green{color:var(--green);}
.ajd-summary-value.red{color:var(--red);}

/* MODAL */
.ajd-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;}
.ajd-modal{background:var(--white);border-radius:16px;padding:28px;width:100%;max-width:540px;box-shadow:0 8px 40px rgba(0,0,0,.18);max-height:90vh;overflow-y:auto;}
.ajd-modal-sm{max-width:420px;}
.ajd-modal-title{font-size:18px;color:var(--ink);margin-bottom:4px;}
.ajd-modal-sub{font-size:13px;color:var(--pale);margin-bottom:20px;}
.ajd-modal-section{background:var(--bg);border-radius:10px;padding:14px;margin-bottom:14px;}
.ajd-modal-section-title{font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:var(--pale);margin-bottom:12px;}
.ajd-field{margin-bottom:14px;}
.ajd-field:last-child{margin-bottom:0;}
.ajd-field label{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:var(--pale);margin-bottom:6px;}
.ajd-field select,.ajd-field input,.ajd-field textarea{width:100%;border:1.5px solid var(--border);border-radius:9px;padding:10px 14px;font-family:'DM Serif Display',serif;font-size:13px;color:var(--ink);outline:none;transition:border-color .15s;background:var(--white);}
.ajd-field select:focus,.ajd-field input:focus,.ajd-field textarea:focus{border-color:var(--green);}
.ajd-field textarea{resize:vertical;min-height:70px;}
.ajd-field-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.ajd-checkbox-row{display:flex;align-items:center;gap:8px;padding:8px 0;}
.ajd-checkbox-row input[type=checkbox]{width:16px;height:16px;accent-color:var(--green);cursor:pointer;}
.ajd-checkbox-row label{font-size:13px;color:var(--ink);cursor:pointer;}
.ajd-chip-group{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;}
.ajd-chip{padding:6px 12px;border-radius:20px;font-size:12px;cursor:pointer;border:1.5px solid var(--border);background:var(--white);color:var(--muted);font-family:'DM Serif Display',serif;transition:all .15s;}
.ajd-chip.selected{background:var(--green-light);color:var(--green);border-color:var(--green);}
.ajd-photo-upload{border:2px dashed var(--border);border-radius:10px;padding:20px;text-align:center;cursor:pointer;transition:all .15s;}
.ajd-photo-upload:hover{border-color:var(--green);background:var(--green-light);}
.ajd-photo-upload input{display:none;}
.ajd-photo-upload-label{font-size:13px;color:var(--muted);cursor:pointer;}
.ajd-photo-upload-label svg{width:24px;height:24px;display:block;margin:0 auto 8px;color:var(--pale);}
.ajd-photo-preview{width:100%;max-height:120px;object-fit:cover;border-radius:8px;margin-top:10px;}
.ajd-modal-btns{display:flex;gap:10px;justify-content:flex-end;margin-top:20px;}
.ajd-modal-cancel{background:none;border:1.5px solid var(--border);border-radius:9px;padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;color:var(--muted);}
.ajd-modal-save{background:var(--green);color:#fff;border:none;border-radius:9px;padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;}
.ajd-modal-save:hover{background:var(--green-dark);}
.ajd-modal-save:disabled{opacity:.6;cursor:not-allowed;}
.ajd-modal-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;}
.ajd-modal-close{background:none;border:none;cursor:pointer;color:var(--pale);padding:4px;border-radius:6px;display:flex;align-items:center;}
.ajd-modal-close:hover{color:var(--ink);}
.ajd-modal-label{font-size:12px;color:var(--muted);margin-bottom:6px;display:block;}
.ajd-modal-select{width:100%;border:1.5px solid var(--border);border-radius:10px;padding:10px 14px;font-family:'DM Serif Display',serif;font-size:13.5px;color:var(--ink);outline:none;background:var(--white);cursor:pointer;margin-bottom:14px;transition:border-color .2s;}
.ajd-modal-select:focus{border-color:var(--green);}
.ajd-modal-ftr{display:flex;justify-content:flex-end;gap:10px;margin-top:20px;}
.ajd-btn-confirm{background:var(--green);color:#fff;border:none;border-radius:9px;padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;}
.ajd-btn-confirm:disabled{opacity:.5;cursor:not-allowed;}
.ajd-btn-danger-modal{background:var(--red);color:#fff;border:none;border-radius:9px;padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;}
.ajd-btn-danger-modal:hover{background:#c0392b;}
.ajd-delete-icon{width:48px;height:48px;background:#fde8e8;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;}
.ajd-delete-icon svg{width:22px;height:22px;stroke:var(--red);fill:none;stroke-width:2;}
.ajd-delete-text{text-align:center;font-size:13.5px;color:var(--muted);line-height:1.6;}
.ajd-delete-name{font-size:15px;color:var(--ink);text-align:center;margin-bottom:6px;}

/* TOAST */
.ajd-toast{position:fixed;bottom:20px;right:20px;z-index:600;display:flex;align-items:center;gap:10px;padding:12px 18px;border-radius:10px;font-size:13px;box-shadow:0 4px 20px rgba(0,0,0,.15);animation:ajdSlideIn .25s ease;}
@keyframes ajdSlideIn{from{transform:translateY(20px);opacity:0;}to{transform:translateY(0);opacity:1;}}
.ajd-toast.success{background:#1a6b3c;color:#fff;}
.ajd-toast.error{background:#e74c3c;color:#fff;}

/* LOADING */
.ajd-loading{display:flex;align-items:center;justify-content:center;padding:80px;color:var(--pale);font-size:14px;gap:10px;}
.ajd-spinner{width:20px;height:20px;border:2px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:ajdSpin .8s linear infinite;}
@keyframes ajdSpin{to{transform:rotate(360deg);}}

/* LIGHTBOX */
.ajd-lightbox{position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:700;display:flex;align-items:center;justify-content:center;padding:20px;cursor:pointer;}
.ajd-lightbox img{max-width:100%;max-height:90vh;border-radius:8px;}

/* PDF */
.ajd-pdf-not-ready{font-size:13px;color:var(--pale);font-style:italic;}
.ajd-pdf-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
.ajd-pdf-icon{width:40px;height:40px;background:#fde8e8;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.ajd-pdf-icon svg{width:20px;height:20px;stroke:var(--red);fill:none;stroke-width:1.5;}
.ajd-pdf-info{flex:1;}
.ajd-pdf-name{font-size:13px;color:var(--ink);}
.ajd-pdf-sub{font-size:11px;color:var(--pale);}

@media(max-width:900px){.ajd-content{grid-template-columns:1fr;}}
@media(max-width:768px){
  .ajd-sidebar{transform:translateX(-100%);}
  .ajd-sidebar.open{transform:translateX(0);}
  .ajd-main{margin-left:0;}
  .ajd-hamburger{display:flex;}
  .ajd-content{padding:12px 16px 24px;}
  .ajd-field-row{grid-template-columns:1fr;}
}
`

/* ─────────────────────────────────────────────
   ADMIN MODALS (Status / Assign / Delete)
───────────────────────────────────────────── */
function StatusModal({ job, onClose, onSave }) {
  const [selected, setSelected] = useState(job.status)
  const [saving, setSaving] = useState(false)
  return (
    <div className="ajd-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ajd-modal ajd-modal-sm">
        <div className="ajd-modal-hdr">
          <span style={{ fontSize: 17, color: 'var(--ink)' }}>Change Job Status</span>
          <button className="ajd-modal-close" onClick={onClose}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
        <label className="ajd-modal-label">New Status</label>
        <select className="ajd-modal-select" value={selected} onChange={e => setSelected(e.target.value)}>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{fmt(s)}</option>)}
        </select>
        <p style={{ fontSize: 12, color: 'var(--pale)', marginBottom: 16 }}>Status changes made here override the technician's current progress.</p>
        <div className="ajd-modal-ftr">
          <button className="ajd-modal-cancel" onClick={onClose}>Cancel</button>
          <button className="ajd-btn-confirm" disabled={saving || selected === job.status}
            onClick={async () => { setSaving(true); await onSave(selected); setSaving(false) }}>
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
  return (
    <div className="ajd-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ajd-modal ajd-modal-sm">
        <div className="ajd-modal-hdr">
          <span style={{ fontSize: 17, color: 'var(--ink)' }}>Assign Technician</span>
          <button className="ajd-modal-close" onClick={onClose}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
        <label className="ajd-modal-label">Select Technician</label>
        <select className="ajd-modal-select" value={selected} onChange={e => setSelected(e.target.value)}>
          <option value="">— Unassigned —</option>
          {technicians.map(t => (
            <option key={t.id} value={t.id}>
              {t.full_name || `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.username}
            </option>
          ))}
        </select>
        <div className="ajd-modal-ftr">
          <button className="ajd-modal-cancel" onClick={onClose}>Cancel</button>
          <button className="ajd-btn-confirm" disabled={saving}
            onClick={async () => { setSaving(true); await onSave(selected); setSaving(false) }}>
            {saving ? 'Saving…' : 'Save Assignment'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteModal({ job, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false)
  return (
    <div className="ajd-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ajd-modal ajd-modal-sm">
        <div className="ajd-modal-hdr">
          <span style={{ fontSize: 17, color: 'var(--ink)' }}>Delete Job</span>
          <button className="ajd-modal-close" onClick={onClose}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
        <div style={{ textAlign: 'center', paddingTop: 8 }}>
          <div className="ajd-delete-icon"><svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></div>
          <div className="ajd-delete-name">Job #{job.id} — {job.customer_name || 'Unknown'}</div>
          <div className="ajd-delete-text">This job will be permanently deleted. All linked observations, reports, and email logs will also be removed.</div>
        </div>
        <div className="ajd-modal-ftr">
          <button className="ajd-modal-cancel" onClick={onClose}>Cancel</button>
          <button className="ajd-btn-danger-modal" disabled={deleting}
            onClick={async () => { setDeleting(true); await onConfirm(); setDeleting(false) }}>
            {deleting ? 'Deleting…' : 'Delete Job'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export default function AdminJobDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const canvasRef = useRef(null)
  const isDrawing = useRef(false)
  const intervalRef = useRef(null)
  const tickRef = useRef(null)
  const isMounted = useRef(true)
  const photoInputRef = useRef(null)

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [job, setJob] = useState(null)
  const [observations, setObservations] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(AUTO_REFRESH)

  const [savingNotes, setSavingNotes] = useState(false)
  const [savingSig, setSavingSig] = useState(false)
  const [sigSaved, setSigSaved] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesVal, setNotesVal] = useState('')

  const [showObsModal, setShowObsModal] = useState(false)
  const [savingObs, setSavingObs] = useState(false)
  const [obsForm, setObsForm] = useState(defaultForm())
  const [lightboxSrc, setLightboxSrc] = useState(null)

  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const [toast, setToast] = useState(null)

  const userName = displayName(user)
  const userInitials = initials(userName)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  /* ── FETCH ── */
  const fetchJob = useCallback(async (silent = false) => {
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

  const fetchTechnicians = useCallback(async () => {
    try {
      const res = await api.get('/staff/?role=technician')
      if (isMounted.current) setTechnicians(res.data?.results || res.data || [])
    } catch { }
  }, [])

  const resetTimer = useCallback(() => {
    clearInterval(intervalRef.current); clearInterval(tickRef.current)
    setCountdown(AUTO_REFRESH)
    intervalRef.current = setInterval(() => { fetchJob(true); setCountdown(AUTO_REFRESH) }, AUTO_REFRESH * 1000)
    tickRef.current = setInterval(() => setCountdown(c => c <= 1 ? AUTO_REFRESH : c - 1), 1000)
  }, [fetchJob])

  useEffect(() => {
    isMounted.current = true
    Promise.all([fetchJob(), fetchTechnicians()]).then(resetTimer)
    return () => { isMounted.current = false; clearInterval(intervalRef.current); clearInterval(tickRef.current) }
  }, [fetchJob, fetchTechnicians, resetTimer])

  /* ── CANVAS SIGNATURE ── */
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = '#1a2e1a'; ctx.lineWidth = 2; ctx.lineCap = 'round'
    const getPos = (e) => { const rect = canvas.getBoundingClientRect(); const src = e.touches ? e.touches[0] : e; return { x: src.clientX - rect.left, y: src.clientY - rect.top } }
    const start = (e) => { e.preventDefault(); isDrawing.current = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y) }
    const draw = (e) => { e.preventDefault(); if (!isDrawing.current) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke() }
    const end = () => { isDrawing.current = false }
    canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', draw)
    canvas.addEventListener('mouseup', end); canvas.addEventListener('mouseleave', end)
    canvas.addEventListener('touchstart', start, { passive: false })
    canvas.addEventListener('touchmove', draw, { passive: false })
    canvas.addEventListener('touchend', end)
    return () => {
      canvas.removeEventListener('mousedown', start); canvas.removeEventListener('mousemove', draw)
      canvas.removeEventListener('mouseup', end); canvas.removeEventListener('mouseleave', end)
      canvas.removeEventListener('touchstart', start); canvas.removeEventListener('touchmove', draw)
      canvas.removeEventListener('touchend', end)
    }
  }, [job])

  /* ── ADMIN ACTIONS ── */
  const handleStatusSave = async (status) => {
    try { const res = await api.patch(`/jobs/${id}/`, { status }); setJob(res.data); showToast('Status updated.') }
    catch (e) { showToast(JSON.stringify(e.response?.data) || 'Failed.', 'error') }
    setShowStatusModal(false)
  }

  const handleAssignSave = async (techId) => {
    try { const res = await api.patch(`/jobs/${id}/`, { assigned_technician: techId ? parseInt(techId) : null }); setJob(res.data); showToast('Technician assigned.') }
    catch (e) { showToast(JSON.stringify(e.response?.data) || 'Failed.', 'error') }
    setShowAssignModal(false)
  }

  const handleDelete = async () => {
    try { await api.delete(`/jobs/${id}/`); navigate('/dashboard/jobs') }
    catch (e) { showToast('Delete failed.', 'error') }
    setShowDeleteModal(false)
  }

  /* ── SIGNATURE ── */
  const handleSaveSignature = async () => {
    const canvas = canvasRef.current; if (!canvas) return
    const sig = canvas.toDataURL('image/png')
    const blank = document.createElement('canvas'); blank.width = canvas.width; blank.height = canvas.height
    if (sig === blank.toDataURL('image/png')) { showToast('Please draw a signature first.', 'error'); return }
    setSavingSig(true)
    try { await api.post(`/jobs/${id}/signature/`, { signed_by: sig }); setSigSaved(true); showToast('Signature saved!') }
    catch (e) { showToast(e.response?.data?.error || 'Could not save signature.', 'error') }
    finally { setSavingSig(false) }
  }

  const handleClearSignature = () => {
    const canvas = canvasRef.current; if (!canvas) return
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    setSigSaved(false)
  }

  /* ── NOTES ── */
  const handleSaveNotes = async () => {
    setSavingNotes(true)
    try { await api.patch(`/jobs/${id}/`, { completion_notes: notesVal }); setEditingNotes(false); showToast('Notes saved!'); fetchJob(true) }
    catch (e) { showToast(e.response?.data?.error || 'Could not save notes.', 'error') }
    finally { setSavingNotes(false) }
  }

  /* ── NAVIGATE ── */
  const handleNavigate = () => {
    const addr = job?.site_address || ''
    if (!addr) { showToast('No address available.', 'error'); return }
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`, '_blank')
  }

  /* ── PHOTO SELECT ── */
  const handlePhotoSelect = (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setObsForm(f => ({ ...f, photoFile: file, photoPreview: ev.target.result }))
    reader.readAsDataURL(file)
  }

  /* ── SAVE OBSERVATION ── */
  const handleSaveObs = async () => {
    if (!obsForm.location && obsForm.category !== 'general') { showToast('Please enter a location.', 'error'); return }
    setSavingObs(true)
    try {
      const payload = buildObsPayload(obsForm)
      if (obsForm.photoFile) {
        const fd = new FormData()
        fd.append('observation_category', payload.observation_category)
        fd.append('notes', payload.notes || '')
        fd.append('job', id)
        const detailKey = Object.keys(payload).find(k => k.endsWith('_detail'))
        if (detailKey) fd.append(detailKey, JSON.stringify(payload[detailKey]))
        fd.append('photo_evidence', obsForm.photoFile)
        await api.post(`/jobs/${id}/observations/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      } else {
        await api.post(`/jobs/${id}/observations/`, payload)
      }
      showToast('Observation recorded!'); setShowObsModal(false); setObsForm(defaultForm()); fetchJob(true)
    } catch (e) {
      const errData = e.response?.data
      showToast(typeof errData === 'object' ? JSON.stringify(errData) : (errData || 'Could not save.'), 'error')
    } finally { setSavingObs(false) }
  }

  const handleLogout = async () => {
    clearInterval(intervalRef.current); clearInterval(tickRef.current)
    await logout(); navigate('/login')
  }

  const setF = (key, val) => setObsForm(f => ({ ...f, [key]: val }))
  const toggleInsectType = (type) => setObsForm(f => ({ ...f, insect_types: f.insect_types.includes(type) ? f.insect_types.filter(t => t !== type) : [...f.insect_types, type] }))
  const isActive = job?.status === 'in_progress' || job?.status === 'observations_recorded'

  /* ── RENDER LOADING / ERROR ── */
  if (loading) return (
    <>
      <style>{S}</style>
      <div className="ajd-root"><div style={{ flex: 1, marginLeft: 'var(--sidebar-w)' }}>
        <div className="ajd-loading"><div className="ajd-spinner" />Loading job…</div>
      </div></div>
    </>
  )

  if (error || !job) return (
    <>
      <style>{S}</style>
      <div className="ajd-root"><div style={{ flex: 1, marginLeft: 'var(--sidebar-w)', padding: 24 }}>
        <div style={{ background: '#fde8e8', color: 'var(--red)', padding: 14, borderRadius: 10, fontSize: 13, marginBottom: 16 }}>{error || 'Job not found.'}</div>
        <button className="ajd-btn ajd-btn-secondary" onClick={() => navigate('/dashboard/jobs')}>← Back to Jobs</button>
      </div></div>
    </>
  )

  return (
    <>
      <style>{S}</style>
      <div className="ajd-root">
        <div className={`ajd-overlay${sidebarOpen ? ' show' : ''}`} onClick={() => setSidebarOpen(false)} />

        {/* SIDEBAR */}
        <aside className={`ajd-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="ajd-sb-logo">
            <div className="ajd-sb-icon"><svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z" /></svg></div>
            <span className="ajd-sb-brand">PestPro</span>
          </div>
          <nav className="ajd-sb-nav">
            {navItems.map(n => (
              <div key={n.id} className={`ajd-sb-item${n.id === 'jobs' ? ' active' : ''}`} onClick={() => { setSidebarOpen(false); navigate(n.path) }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d={n.d} /></svg>
                {n.label}
              </div>
            ))}
          </nav>
          <div className="ajd-sb-user">
            <div className="ajd-sb-avatar">{userInitials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="ajd-sb-uname">{userName}</div>
              <div className="ajd-sb-urole">Administrator</div>
            </div>
            <button className="ajd-sb-logout" onClick={handleLogout} title="Logout">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <div className="ajd-main">
          {/* TOPBAR */}
          <div className="ajd-topbar">
            <div className="ajd-topbar-left">
              <button className="ajd-hamburger" onClick={() => setSidebarOpen(o => !o)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              <button className="ajd-back-btn" onClick={() => navigate('/dashboard/jobs')}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>
              <span className="ajd-crumb">All Jobs &nbsp;›&nbsp; <span>Job #{job.id}</span></span>
            </div>
            <div className="ajd-topbar-right">
              <span className={`ajd-ticker${countdown <= 10 ? ' soon' : ''}`}>↻ in {countdown}s</span>
            </div>
          </div>

          {/* HEADER */}
          <div className="ajd-header">
            <div>
              <div className="ajd-header-meta">JOB #{job.id}{job.job_uuid ? ` · ${job.job_uuid.slice(0, 8)}…` : ''}</div>
              <div className="ajd-header-title">{fmt(job.service_type || 'Service Job')} — {job.customer_name}</div>
              <span className={`ajd-status-chip ${job.status}`}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                {fmt(job.status)}
              </span>
            </div>
            <div className="ajd-header-actions">
              {isActive && (
                <button className="ajd-btn ajd-btn-green" onClick={() => setShowObsModal(true)}>
                  <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  Add Observation
                </button>
              )}
              <button className="ajd-btn ajd-btn-blue" onClick={() => setShowAssignModal(true)}>
                <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                Assign
              </button>
              <button className="ajd-btn ajd-btn-amber" onClick={() => setShowStatusModal(true)}>
                <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Status
              </button>
              <button className="ajd-btn ajd-btn-danger" onClick={() => setShowDeleteModal(true)}>
                <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Delete
              </button>
            </div>
          </div>

          {/* CONTENT GRID */}
          <div className="ajd-content">

            {/* LEFT COLUMN */}
            <div className="ajd-col-left">

              {/* Job Details */}
              <div className="ajd-card">
                <div className="ajd-card-hdr">
                  <div className="ajd-card-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    Job Details
                  </div>
                </div>
                <div className="ajd-info-grid">
                  <div className="ajd-info-cell"><div className="ajd-info-label">Service Type</div><div className="ajd-info-value">{fmt(job.service_type || '—')}</div></div>
                  <div className="ajd-info-cell"><div className="ajd-info-label">Status</div><div className="ajd-info-value">{fmt(job.status)}</div></div>
                  <div className="ajd-info-cell"><div className="ajd-info-label">Scheduled Date</div><div className="ajd-info-value muted">{job.scheduled_datetime ? fmtDate(job.scheduled_datetime) : '—'}</div></div>
                  <div className="ajd-info-cell"><div className="ajd-info-label">Scheduled Time</div><div className="ajd-info-value muted">{job.scheduled_datetime ? new Date(job.scheduled_datetime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</div></div>
                  <div className="ajd-info-cell"><div className="ajd-info-label">Technician</div><div className="ajd-info-value">{job.technician_name || <span style={{ color: 'var(--amber)' }}>⚠ Unassigned</span>}</div></div>
                  <div className="ajd-info-cell"><div className="ajd-info-label">Job ID</div><div className="ajd-info-value">#{job.id}</div></div>
                  <div className="ajd-info-cell full"><div className="ajd-info-label">Site Address</div><div className="ajd-info-value">{job.site_address || '—'}</div></div>
                  {job.completion_notes && <div className="ajd-info-cell full"><div className="ajd-info-label">Completion Notes</div><div className="ajd-info-value muted">{job.completion_notes}</div></div>}
                </div>
              </div>

              {/* Job Timeline */}
              <div className="ajd-card">
                <div className="ajd-card-hdr">
                  <div className="ajd-card-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Job Timeline
                  </div>
                </div>
                <div className="ajd-timeline">
                  <div className="ajd-timeline-item">
                    <div className="ajd-timeline-dot scheduled" />
                    <div><div className="ajd-timeline-label">Scheduled</div><div className="ajd-timeline-time">{fmtDateTime(job.scheduled_datetime)}</div></div>
                  </div>
                  <div className="ajd-timeline-item">
                    <div className={`ajd-timeline-dot ${job.started_at ? 'started' : 'pending'}`} />
                    <div><div className="ajd-timeline-label">Started</div><div className="ajd-timeline-time">{job.started_at ? fmtDateTime(job.started_at) : <span style={{ color: 'var(--pale)', fontStyle: 'italic' }}>Not started yet</span>}</div></div>
                  </div>
                  <div className="ajd-timeline-item">
                    <div className={`ajd-timeline-dot ${job.completed_at ? 'completed' : 'pending'}`} />
                    <div><div className="ajd-timeline-label">Completed</div><div className="ajd-timeline-time">{job.completed_at ? fmtDateTime(job.completed_at) : <span style={{ color: 'var(--pale)', fontStyle: 'italic' }}>Not completed yet</span>}</div></div>
                  </div>
                </div>
              </div>

              {/* Observations */}
              <div className="ajd-card">
                <div className="ajd-card-hdr">
                  <div className="ajd-card-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    Observations
                    {observations.length > 0 && <span style={{ background: 'var(--green-light)', color: 'var(--green)', borderRadius: 6, padding: '1px 7px', fontSize: 11, marginLeft: 4 }}>{observations.length}</span>}
                  </div>
                  {isActive && <button className="ajd-add-btn" onClick={() => setShowObsModal(true)}>+ Add</button>}
                </div>
                {observations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--pale)', fontSize: 13 }}>No observations recorded yet.</div>
                ) : (
                  <div className="ajd-obs-list">
                    {observations.map(obs => {
                      const level = getActivityLevel(obs)
                      const summary = getObsSummary(obs)
                      const r = obs.rodent_detail, f = obs.flying_insect_detail, c = obs.cockroach_detail
                      const t = obs.termite_detail, m = obs.mosquito_detail, g = obs.general_detail
                      const photo = r?.photo_evidence || f?.photo_evidence || c?.photo_evidence || t?.photo_evidence || m?.photo_evidence || g?.photo_evidence || null
                      return (
                        <div key={obs.id} className="ajd-obs-item">
                          <div className="ajd-obs-top">
                            <div className="ajd-obs-icon">{categoryEmoji[obs.observation_category] || '🔍'}</div>
                            <div className="ajd-obs-body">
                              <div className="ajd-obs-title">{fmt(obs.observation_category)} Observation</div>
                              <div className="ajd-obs-meta">{obs.recorded_by_name || 'Technician'} · {new Date(obs.observation_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}{obs.notes ? ` · ${obs.notes}` : ''}</div>
                            </div>
                            {level && <span className={`ajd-level ${level}`}>{level}</span>}
                          </div>
                          <div className="ajd-obs-summary">{summary}</div>
                          <div className="ajd-obs-tags">
                            {r && (<>{r.bait_consumed && <span className="ajd-obs-tag warn">Bait consumed</span>}{r.bait_replaced && <span className="ajd-obs-tag yes">Bait replaced</span>}{r.droppings_observed && <span className="ajd-obs-tag warn">Droppings</span>}{r.gnaw_marks && <span className="ajd-obs-tag warn">Gnaw marks</span>}</>)}
                            {f && (<>{!f.machine_functional && <span className="ajd-obs-tag danger">Machine fault</span>}{f.glue_board_changed && <span className="ajd-obs-tag yes">Board changed</span>}{f.insect_types_trapped?.map(it => <span key={it} className="ajd-obs-tag">{it}</span>)}</>)}
                            {c && (<>{c.gel_applied && <span className="ajd-obs-tag yes">Gel applied</span>}{c.gel_consumed && <span className="ajd-obs-tag warn">Gel consumed</span>}</>)}
                            {t && (<>{t.termites_found && <span className="ajd-obs-tag danger">Termites found</span>}{t.mud_tubes_found && <span className="ajd-obs-tag warn">Mud tubes</span>}{t.wood_damage_observed && <span className="ajd-obs-tag danger">Wood damage · {t.damage_severity}</span>}{t.bait_replaced && <span className="ajd-obs-tag yes">Bait replaced</span>}</>)}
                            {m && (<>{m.fogging_done && <span className="ajd-obs-tag yes">Fogging done</span>}{m.larval_activity && <span className="ajd-obs-tag warn">Larval activity</span>}{m.chemical_used && <span className="ajd-obs-tag">{m.chemical_used}</span>}</>)}
                            {g && (<>{g.treatment_applied && <span className="ajd-obs-tag yes">Treatment applied</span>}{g.recommended_action && <span className="ajd-obs-tag warn">Action recommended</span>}</>)}
                          </div>
                          {photo && <img src={photo} alt="Evidence" className="ajd-obs-photo" onClick={() => setLightboxSrc(photo)} />}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Technician Notes */}
              <div className="ajd-card">
                <div className="ajd-card-hdr">
                  <div className="ajd-card-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Technician Notes
                  </div>
                  {!editingNotes && <button className="ajd-add-btn" onClick={() => setEditingNotes(true)}>Edit</button>}
                </div>
                {editingNotes ? (
                  <>
                    <textarea className="ajd-notes-textarea" value={notesVal} onChange={e => setNotesVal(e.target.value)} placeholder="Add notes about this job…" />
                    <div className="ajd-notes-actions">
                      <button className="ajd-cancel-btn" onClick={() => { setEditingNotes(false); setNotesVal(job.completion_notes || '') }}>Cancel</button>
                      <button className="ajd-save-btn" onClick={handleSaveNotes} disabled={savingNotes}>{savingNotes ? 'Saving…' : 'Save Notes'}</button>
                    </div>
                  </>
                ) : (
                  <div className="ajd-notes-text">{notesVal || 'No notes added yet.'}</div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="ajd-col-right">

              {/* Customer */}
              <div className="ajd-card">
                <div className="ajd-card-hdr">
                  <div className="ajd-card-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    Customer
                  </div>
                </div>
                <div className="ajd-customer-row">
                  <div className="ajd-customer-av">{job.customer_name?.[0]?.toUpperCase() || 'C'}</div>
                  <div>
                    <div className="ajd-customer-name">{job.customer_name}</div>
                    {job.customer_email && <div className="ajd-customer-email">{job.customer_email}</div>}
                  </div>
                </div>
                <button className="ajd-maps-btn" onClick={handleNavigate}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Open in Maps
                </button>
              </div>

              {/* Signature */}
              <div className="ajd-card">
                <div className="ajd-card-hdr">
                  <div className="ajd-card-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    Customer Signature
                  </div>
                </div>
                {sigSaved && <div className="ajd-sig-saved"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Signature saved ✓</div>}
                <div className="ajd-sig-wrap"><canvas ref={canvasRef} id="ajd-sig-canvas" width={280} height={120} /></div>
                <div className="ajd-sig-hint">Ask the customer to sign above</div>
                <div className="ajd-sig-btns">
                  <button className="ajd-sig-clear" onClick={handleClearSignature}>Clear</button>
                  <button className="ajd-sig-save" onClick={handleSaveSignature} disabled={savingSig}>{savingSig ? 'Saving…' : 'Save Signature'}</button>
                </div>
              </div>

              {/* PDF Report */}
              <div className="ajd-card">
                <div className="ajd-card-hdr">
                  <div className="ajd-card-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    PDF Report
                  </div>
                </div>
                {job.is_report_sent ? (
                  <div className="ajd-pdf-row">
                    <div className="ajd-pdf-icon"><svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg></div>
                    <div className="ajd-pdf-info"><div className="ajd-pdf-name">Job_{job.id}_Report.pdf</div><div className="ajd-pdf-sub">Report sent to customer</div></div>
                    <button className="ajd-btn ajd-btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => window.open(`/api/jobs/${id}/report/`, '_blank')}>Download</button>
                  </div>
                ) : (
                  <div className="ajd-pdf-not-ready">Report not generated yet. Complete the job to generate the PDF.</div>
                )}
              </div>

              {/* Summary */}
              <div className="ajd-card">
                <div className="ajd-card-hdr">
                  <div className="ajd-card-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    Summary
                  </div>
                </div>
                <div className="ajd-summary-row"><span className="ajd-summary-label">Observations</span><span className={`ajd-summary-value${observations.length > 0 ? ' green' : ''}`}>{observations.length}</span></div>
                <div className="ajd-summary-row"><span className="ajd-summary-label">Signature</span><span className={`ajd-summary-value${sigSaved ? ' green' : ' red'}`}>{sigSaved ? 'Saved ✓' : 'Not yet'}</span></div>
                <div className="ajd-summary-row"><span className="ajd-summary-label">Notes</span><span className={`ajd-summary-value${notesVal ? ' green' : ''}`}>{notesVal ? 'Added' : 'None'}</span></div>
                <div className="ajd-summary-row"><span className="ajd-summary-label">Started</span><span className={`ajd-summary-value${job.started_at ? ' green' : ''}`}>{job.started_at ? '✓' : '—'}</span></div>
                <div className="ajd-summary-row"><span className="ajd-summary-label">Completed</span><span className={`ajd-summary-value${job.completed_at ? ' green' : ' red'}`}>{job.completed_at ? '✓' : 'Pending'}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* ── OBSERVATION MODAL ── */}
        {showObsModal && (
          <div className="ajd-modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowObsModal(false); setObsForm(defaultForm()) } }}>
            <div className="ajd-modal">
              <div className="ajd-modal-title">Add Observation</div>
              <div className="ajd-modal-sub">Record pest activity for Job #{id}</div>

              <div className="ajd-field">
                <label>Pest Category *</label>
                <select value={obsForm.category} onChange={e => setF('category', e.target.value)}>
                  {OBS_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              {obsForm.category === 'rodent' && (
                <div className="ajd-modal-section">
                  <div className="ajd-modal-section-title">Rodent Details</div>
                  <div className="ajd-field-row">
                    <div className="ajd-field"><label>Box ID *</label><input placeholder="e.g. Box-A1" value={obsForm.rodent_box_id} onChange={e => setF('rodent_box_id', e.target.value)} /></div>
                    <div className="ajd-field"><label>Rats Found</label><input type="number" min="0" placeholder="0" value={obsForm.count} onChange={e => setF('count', e.target.value)} /></div>
                  </div>
                  <div className="ajd-field"><label>Location in Premises *</label><input placeholder="e.g. Kitchen corner" value={obsForm.location} onChange={e => setF('location', e.target.value)} /></div>
                  <div className="ajd-field"><label>Activity Level</label><select value={obsForm.activity_level} onChange={e => setF('activity_level', e.target.value)}>{ACTIVITY_LEVELS.map(l => <option key={l} value={l}>{fmt(l)}</option>)}</select></div>
                  <div className="ajd-checkbox-row"><input type="checkbox" id="r_bc" checked={obsForm.bait_consumed} onChange={e => setF('bait_consumed', e.target.checked)} /><label htmlFor="r_bc">Bait Consumed</label></div>
                  <div className="ajd-checkbox-row"><input type="checkbox" id="r_br" checked={obsForm.bait_replaced} onChange={e => setF('bait_replaced', e.target.checked)} /><label htmlFor="r_br">Bait Replaced</label></div>
                  <div className="ajd-checkbox-row"><input type="checkbox" id="r_dr" checked={obsForm.droppings_observed} onChange={e => setF('droppings_observed', e.target.checked)} /><label htmlFor="r_dr">Droppings Observed</label></div>
                  <div className="ajd-checkbox-row"><input type="checkbox" id="r_gn" checked={obsForm.gnaw_marks} onChange={e => setF('gnaw_marks', e.target.checked)} /><label htmlFor="r_gn">Gnaw Marks</label></div>
                </div>
              )}

              {obsForm.category === 'flying_insect' && (
                <div className="ajd-modal-section">
                  <div className="ajd-modal-section-title">Flying Insect Details</div>
                  <div className="ajd-field-row">
                    <div className="ajd-field"><label>Machine ID *</label><input placeholder="e.g. FC-01" value={obsForm.machine_id} onChange={e => setF('machine_id', e.target.value)} /></div>
                    <div className="ajd-field"><label>Insects Trapped</label><input type="number" min="0" placeholder="0" value={obsForm.count} onChange={e => setF('count', e.target.value)} /></div>
                  </div>
                  <div className="ajd-field"><label>Machine Location *</label><input placeholder="e.g. Near entrance" value={obsForm.location} onChange={e => setF('location', e.target.value)} /></div>
                  <div className="ajd-field"><label>Insect Types Trapped</label><div className="ajd-chip-group">{INSECT_TYPES.map(t => <button key={t} type="button" className={`ajd-chip${obsForm.insect_types.includes(t) ? ' selected' : ''}`} onClick={() => toggleInsectType(t)}>{t}</button>)}</div></div>
                  <div className="ajd-field"><label>Glue Board Condition</label><select value={obsForm.glue_board_condition} onChange={e => setF('glue_board_condition', e.target.value)}>{GLUE_CONDITION.map(g => <option key={g} value={g}>{fmt(g)}</option>)}</select></div>
                  <div className="ajd-checkbox-row"><input type="checkbox" id="f_gbc" checked={obsForm.glue_board_changed} onChange={e => setF('glue_board_changed', e.target.checked)} /><label htmlFor="f_gbc">Glue Board Changed</label></div>
                  <div className="ajd-checkbox-row"><input type="checkbox" id="f_mf" checked={obsForm.machine_functional} onChange={e => setF('machine_functional', e.target.checked)} /><label htmlFor="f_mf">Machine Functional</label></div>
                </div>
              )}

              {obsForm.category === 'cockroach' && (
                <div className="ajd-modal-section">
                  <div className="ajd-modal-section-title">Cockroach Details</div>
                  <div className="ajd-field-row">
                    <div className="ajd-field"><label>Station ID *</label><input placeholder="e.g. CG-01" value={obsForm.station_id} onChange={e => setF('station_id', e.target.value)} /></div>
                    <div className="ajd-field"><label>Cockroaches Found</label><input type="number" min="0" placeholder="0" value={obsForm.count} onChange={e => setF('count', e.target.value)} /></div>
                  </div>
                  <div className="ajd-field"><label>Location in Premises *</label><input placeholder="e.g. Under kitchen sink" value={obsForm.location} onChange={e => setF('location', e.target.value)} /></div>
                  <div className="ajd-field"><label>Infestation Area</label><input placeholder="e.g. Kitchen, Bathroom" value={obsForm.infestation_area} onChange={e => setF('infestation_area', e.target.value)} /></div>
                  <div className="ajd-field"><label>Activity Level</label><select value={obsForm.activity_level} onChange={e => setF('activity_level', e.target.value)}>{ACTIVITY_LEVELS.map(l => <option key={l} value={l}>{fmt(l)}</option>)}</select></div>
                  <div className="ajd-checkbox-row"><input type="checkbox" id="c_ga" checked={obsForm.gel_applied} onChange={e => setF('gel_applied', e.target.checked)} /><label htmlFor="c_ga">Gel Applied</label></div>
                  <div className="ajd-checkbox-row"><input type="checkbox" id="c_gc" checked={obsForm.gel_consumed} onChange={e => setF('gel_consumed', e.target.checked)} /><label htmlFor="c_gc">Gel Consumed</label></div>
                </div>
              )}

              {obsForm.category === 'termite' && (
                <div className="ajd-modal-section">
                  <div className="ajd-modal-section-title">Termite Details</div>
                  <div className="ajd-field-row">
                    <div className="ajd-field"><label>Station ID *</label><input placeholder="e.g. TB-01" value={obsForm.station_id} onChange={e => setF('station_id', e.target.value)} /></div>
                    <div className="ajd-field"><label>Damage Severity</label><select value={obsForm.damage_severity} onChange={e => setF('damage_severity', e.target.value)}>{DAMAGE_SEVERITY.map(s => <option key={s} value={s}>{fmt(s)}</option>)}</select></div>
                  </div>
                  <div className="ajd-field"><label>Station Location *</label><input placeholder="e.g. Garden wall, Wooden frame" value={obsForm.location} onChange={e => setF('location', e.target.value)} /></div>
                  <div className="ajd-checkbox-row"><input type="checkbox" id="t_tf" checked={obsForm.termites_found} onChange={e => setF('termites_found', e.target.checked)} /><label htmlFor="t_tf">Termites Found</label></div>
                  <div className="ajd-checkbox-row"><input type="checkbox" id="t_bc" checked={obsForm.bait_consumed} onChange={e => setF('bait_consumed', e.target.checked)} /><label htmlFor="t_bc">Bait Consumed</label></div>
                  <div className="ajd-checkbox-row"><input type="checkbox" id="t_br" checked={obsForm.bait_replaced} onChange={e => setF('bait_replaced', e.target.checked)} /><label htmlFor="t_br">Bait Replaced</label></div>
                  <div className="ajd-checkbox-row"><input type="checkbox" id="t_mt" checked={obsForm.mud_tubes_found} onChange={e => setF('mud_tubes_found', e.target.checked)} /><label htmlFor="t_mt">Mud Tubes Found</label></div>
                  <div className="ajd-checkbox-row"><input type="checkbox" id="t_wd" checked={obsForm.wood_damage_observed} onChange={e => setF('wood_damage_observed', e.target.checked)} /><label htmlFor="t_wd">Wood Damage Observed</label></div>
                </div>
              )}

              {obsForm.category === 'mosquito' && (
                <div className="ajd-modal-section">
                  <div className="ajd-modal-section-title">Mosquito Details</div>
                  <div className="ajd-field"><label>Treatment Area *</label><input placeholder="e.g. Garden, Drainage" value={obsForm.location} onChange={e => setF('location', e.target.value)} /></div>
                  <div className="ajd-field"><label>Adult Mosquito Density</label><select value={obsForm.activity_level} onChange={e => setF('activity_level', e.target.value)}>{ACTIVITY_LEVELS.map(l => <option key={l} value={l}>{fmt(l)}</option>)}</select></div>
                  <div className="ajd-field-row">
                    <div className="ajd-field"><label>Breeding Sites Found</label><input type="number" min="0" placeholder="0" value={obsForm.breeding_sites_found} onChange={e => setF('breeding_sites_found', e.target.value)} /></div>
                    <div className="ajd-field"><label>Sites Eliminated</label><input type="number" min="0" placeholder="0" value={obsForm.breeding_sites_eliminated} onChange={e => setF('breeding_sites_eliminated', e.target.value)} /></div>
                  </div>
                  <div className="ajd-field"><label>Chemical Used</label><input placeholder="e.g. Deltamethrin" value={obsForm.chemical_used} onChange={e => setF('chemical_used', e.target.value)} /></div>
                  <div className="ajd-checkbox-row"><input type="checkbox" id="m_fd" checked={obsForm.fogging_done} onChange={e => setF('fogging_done', e.target.checked)} /><label htmlFor="m_fd">Fogging Done</label></div>
                  <div className="ajd-checkbox-row"><input type="checkbox" id="m_la" checked={obsForm.larval_activity} onChange={e => setF('larval_activity', e.target.checked)} /><label htmlFor="m_la">Larval Activity Observed</label></div>
                </div>
              )}

              {obsForm.category === 'general' && (
                <div className="ajd-modal-section">
                  <div className="ajd-modal-section-title">General Pest Details</div>
                  <div className="ajd-field-row">
                    <div className="ajd-field"><label>Pest Type *</label><input placeholder="e.g. Bed Bug, Ant, Bird" value={obsForm.pest_type_observed} onChange={e => setF('pest_type_observed', e.target.value)} /></div>
                    <div className="ajd-field"><label>Pest Count</label><input type="number" min="0" placeholder="0" value={obsForm.count} onChange={e => setF('count', e.target.value)} /></div>
                  </div>
                  <div className="ajd-field"><label>Location in Premises *</label><input placeholder="e.g. Master bedroom" value={obsForm.location} onChange={e => setF('location', e.target.value)} /></div>
                  <div className="ajd-field"><label>Activity Level</label><select value={obsForm.activity_level} onChange={e => setF('activity_level', e.target.value)}>{ACTIVITY_LEVELS.map(l => <option key={l} value={l}>{fmt(l)}</option>)}</select></div>
                  <div className="ajd-field"><label>Treatment Description</label><input placeholder="e.g. Spray, Trap placed" value={obsForm.treatment_description} onChange={e => setF('treatment_description', e.target.value)} /></div>
                  <div className="ajd-field"><label>Recommended Action</label><textarea placeholder="Follow-up recommendation…" value={obsForm.recommended_action} onChange={e => setF('recommended_action', e.target.value)} /></div>
                  <div className="ajd-checkbox-row"><input type="checkbox" id="g_ta" checked={obsForm.treatment_applied} onChange={e => setF('treatment_applied', e.target.checked)} /><label htmlFor="g_ta">Treatment Applied</label></div>
                </div>
              )}

              <div className="ajd-modal-section">
                <div className="ajd-modal-section-title">Photo Evidence</div>
                <div className="ajd-photo-upload" onClick={() => photoInputRef.current?.click()}>
                  <input ref={photoInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoSelect} />
                  <label className="ajd-photo-upload-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {obsForm.photoFile ? obsForm.photoFile.name : 'Tap to take photo or upload'}
                  </label>
                  {obsForm.photoPreview && <img src={obsForm.photoPreview} alt="Preview" className="ajd-photo-preview" />}
                </div>
              </div>

              <div className="ajd-field">
                <label>Additional Notes</label>
                <textarea placeholder="Any extra observations…" value={obsForm.notes} onChange={e => setF('notes', e.target.value)} />
              </div>

              <div className="ajd-modal-btns">
                <button className="ajd-modal-cancel" onClick={() => { setShowObsModal(false); setObsForm(defaultForm()) }}>Cancel</button>
                <button className="ajd-modal-save" onClick={handleSaveObs} disabled={savingObs}>{savingObs ? 'Saving…' : 'Save Observation'}</button>
              </div>
            </div>
          </div>
        )}

        {/* ADMIN MODALS */}
        {showStatusModal && <StatusModal job={job} onClose={() => setShowStatusModal(false)} onSave={handleStatusSave} />}
        {showAssignModal && <AssignModal job={job} technicians={technicians} onClose={() => setShowAssignModal(false)} onSave={handleAssignSave} />}
        {showDeleteModal && <DeleteModal job={job} onClose={() => setShowDeleteModal(false)} onConfirm={handleDelete} />}

        {/* TOAST */}
        {toast && (
          <div className={`ajd-toast ${toast.type}`}>
            {toast.type === 'error'
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            }
            {toast.msg}
          </div>
        )}

        {/* LIGHTBOX */}
        {lightboxSrc && (
          <div className="ajd-lightbox" onClick={() => setLightboxSrc(null)}>
            <img src={lightboxSrc} alt="Evidence" />
          </div>
        )}
      </div>
    </>
  )
}