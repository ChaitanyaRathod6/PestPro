import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const REFRESH_INTERVAL = 30 // seconds

const S = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --g:#1a6b3c; --gd:#1a4d2e; --gl:#edf6f1; --gl2:#d5ede2;
  --ink:#1a2e1a; --muted:#6b7f6b; --pale:#a0b0a0;
  --border:#e4e8e4; --bg:#f0f2f0; --white:#fff;
  --red:#c0392b; --redl:#fde8e8;
  --amber:#d68910; --amberl:#fff8ec;
  --blue:#2563eb; --bluel:#eff6ff;
  --shadow:0 1px 4px rgba(0,0,0,.07);
  --r:14px;
  --sidebar-w:210px;
}
.cd-root { font-family:'DM Serif Display',serif; min-height:100vh; background:var(--bg); display:flex; }

/* SIDEBAR */
.cd-sidebar { width:var(--sidebar-w); background:var(--white); border-right:1px solid var(--border);
  display:flex; flex-direction:column; min-height:100vh; position:fixed; top:0; left:0; bottom:0;
  z-index:200; transition:transform .25s ease; overflow-y:auto; }
.cd-sb-logo { padding:18px 16px; display:flex; align-items:center; gap:9px; border-bottom:1px solid var(--border); flex-shrink:0; }
.cd-sb-icon { width:30px; height:30px; background:var(--g); border-radius:8px; display:flex; align-items:center; justify-content:center; }
.cd-sb-icon svg { width:16px; height:16px; fill:#fff; }
.cd-sb-brand { font-size:17px; color:var(--ink); }
.cd-sb-nav { padding:12px 10px; flex:1; }
.cd-nav-item { display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:10px;
  cursor:pointer; color:var(--muted); font-size:13.5px; margin-bottom:2px; transition:all .15s; white-space:nowrap; }
.cd-nav-item:hover { background:var(--bg); color:var(--ink); }
.cd-nav-item.active { background:var(--gl); color:var(--g); }
.cd-nav-item svg { width:17px; height:17px; flex-shrink:0; }
.cd-sb-footer { padding:14px 14px 0; border-top:1px solid var(--border); flex-shrink:0; }
.cd-sb-user { display:flex; align-items:center; gap:10px; }
.cd-sb-av { width:34px; height:34px; background:var(--g); border-radius:50%;
  display:flex; align-items:center; justify-content:center; color:#fff; font-size:12px; flex-shrink:0; }
.cd-sb-name { font-size:13px; color:var(--ink); }
.cd-sb-role { font-size:11px; color:var(--pale); }
.cd-sb-logout { margin-left:auto; background:none; border:none; cursor:pointer; color:var(--pale);
  padding:4px; border-radius:6px; display:flex; align-items:center; transition:all .15s; }
.cd-sb-logout:hover { color:var(--red); background:var(--redl); }
.cd-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:150; }
.cd-overlay.show { display:block; }

/* MAIN */
.cd-main { flex:1; margin-left:var(--sidebar-w); display:flex; flex-direction:column; min-height:100vh; }
.cd-topbar { background:var(--white); border-bottom:1px solid var(--border); padding:0 24px; height:50px;
  display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:100; flex-shrink:0; gap:12px; }
.cd-topbar-left { display:flex; align-items:center; gap:10px; }
.cd-hamburger { display:none; background:none; border:none; cursor:pointer; padding:4px; border-radius:6px; color:var(--ink); }
.cd-hamburger svg { width:20px; height:20px; }
.cd-crumb { font-size:13px; color:var(--pale); }
.cd-crumb span { color:var(--ink); font-size:14px; }
.cd-topbar-right { display:flex; align-items:center; gap:8px; }
.cd-logout-btn { background:var(--bg); color:var(--ink); border:1.5px solid var(--border);
  border-radius:9px; padding:7px 14px; font-family:'DM Serif Display',serif; font-size:13px;
  cursor:pointer; display:flex; align-items:center; gap:6px; transition:all .15s; }
.cd-logout-btn:hover { background:var(--redl); color:var(--red); border-color:var(--red); }

/* AUTO-REFRESH INDICATOR */
.cd-refresh-indicator {
  display:flex; align-items:center; gap:7px; padding:5px 12px;
  background:var(--bg); border:1.5px solid var(--border); border-radius:9px;
  font-size:12px; color:var(--muted); transition:all .2s;
}
.cd-refresh-indicator.refreshing {
  background:var(--gl); border-color:var(--g); color:var(--g);
}
.cd-refresh-ring {
  width:16px; height:16px; position:relative; flex-shrink:0;
}
.cd-refresh-ring svg {
  width:16px; height:16px; transform:rotate(-90deg);
}
.cd-refresh-ring circle {
  fill:none; stroke:var(--border); stroke-width:2;
}
.cd-refresh-ring .cd-ring-progress {
  stroke:var(--g); stroke-linecap:round;
  transition:stroke-dashoffset .9s linear;
}
.cd-refresh-indicator.refreshing .cd-ring-progress {
  stroke:var(--g);
}
.cd-refresh-spin {
  width:14px; height:14px; border:2px solid var(--gl2);
  border-top-color:var(--g); border-radius:50%;
  animation:cdSpin .6s linear infinite; flex-shrink:0;
}
.cd-refresh-dot {
  width:7px; height:7px; border-radius:50%; background:var(--g);
  animation:cdPulse 2s ease infinite; flex-shrink:0;
}

/* CONTENT */
.cd-content { padding:22px 24px; flex:1; }

/* WELCOME */
.cd-welcome { background:linear-gradient(135deg,var(--gd),var(--g)); border-radius:var(--r);
  padding:22px 26px; color:#fff; display:flex; align-items:center; gap:20px; margin-bottom:20px; flex-wrap:wrap; }
.cd-welcome-av { width:56px; height:56px; border-radius:50%; background:rgba(255,255,255,.2);
  border:2px solid rgba(255,255,255,.4); display:flex; align-items:center; justify-content:center;
  font-size:20px; flex-shrink:0; }
.cd-welcome-info { flex:1; min-width:0; }
.cd-welcome-name { font-size:20px; margin-bottom:3px; }
.cd-welcome-sub { font-size:13px; opacity:.8; }
.cd-welcome-chips { display:flex; gap:8px; margin-top:10px; flex-wrap:wrap; }
.cd-w-chip { background:rgba(255,255,255,.15); border:1px solid rgba(255,255,255,.3);
  border-radius:20px; padding:4px 12px; font-size:12px; }
.cd-w-chip.ok { background:rgba(255,255,255,.25); }
.cd-welcome-badge { text-align:center; background:rgba(255,255,255,.12);
  border:1px solid rgba(255,255,255,.25); border-radius:12px; padding:14px 20px; flex-shrink:0; }
.cd-wb-val { font-size:26px; }
.cd-wb-lbl { font-size:11px; opacity:.75; margin-top:2px; }

/* STATS */
.cd-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:20px; }
.cd-stat { background:var(--white); border-radius:var(--r); padding:16px 18px; box-shadow:var(--shadow); }
.cd-stat-icon { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; margin-bottom:10px; }
.cd-stat-icon.green { background:var(--gl); }
.cd-stat-icon.amber { background:var(--amberl); }
.cd-stat-icon.blue { background:var(--bluel); }
.cd-stat-icon.red { background:var(--redl); }
.cd-stat-icon svg { width:18px; height:18px; }
.cd-stat-lbl { font-size:11px; text-transform:uppercase; letter-spacing:.7px; color:var(--pale); margin-bottom:5px; }
.cd-stat-val { font-size:30px; color:var(--ink); letter-spacing:-1px; line-height:1; }
.cd-stat-val.green { color:var(--g); }
.cd-stat-val.amber { color:var(--amber); }
.cd-stat-val.blue { color:var(--blue); }
.cd-stat-sub { font-size:12px; color:var(--muted); margin-top:4px; }
.cd-stat-badge { display:inline-flex; align-items:center; gap:4px; border-radius:6px; padding:2px 8px; font-size:11px; margin-top:6px; }
.cd-stat-badge.green { background:var(--gl); color:var(--g); }
.cd-stat-badge.amber { background:var(--amberl); color:var(--amber); }
.cd-stat-badge.blue { background:var(--bluel); color:var(--blue); }

/* LIVE BANNER */
.cd-live-banner { background:var(--white); border-radius:var(--r); padding:16px 20px;
  margin-bottom:20px; box-shadow:var(--shadow); display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
.cd-live-dot { width:10px; height:10px; border-radius:50%; background:#22c55e; flex-shrink:0;
  box-shadow:0 0 0 3px rgba(34,197,94,.2); animation:cdPulse 2s ease infinite; }
@keyframes cdPulse { 0%,100%{box-shadow:0 0 0 3px rgba(34,197,94,.2);} 50%{box-shadow:0 0 0 6px rgba(34,197,94,.1);} }
.cd-live-info { flex:1; min-width:0; }
.cd-live-title { font-size:14px; color:var(--ink); }
.cd-live-sub { font-size:12px; color:var(--muted); margin-top:2px; }
.cd-live-tech { display:flex; align-items:center; gap:8px; }
.cd-tech-av { width:32px; height:32px; border-radius:50%; background:var(--g); color:#fff;
  display:flex; align-items:center; justify-content:center; font-size:11px; flex-shrink:0; }
.cd-tech-name { font-size:13px; color:var(--ink); }
.cd-tech-role { font-size:11px; color:var(--pale); }
.cd-live-badge { background:#dcfce7; color:#15803d; border-radius:20px; padding:4px 12px;
  font-size:12px; display:flex; align-items:center; gap:5px; flex-shrink:0; }

/* MAIN ROW */
.cd-row { display:grid; grid-template-columns:1fr 310px; gap:16px; margin-bottom:20px; }
.cd-left-col { display:flex; flex-direction:column; gap:14px; }
.cd-right-col { display:flex; flex-direction:column; gap:14px; }

/* CARD */
.cd-card { background:var(--white); border-radius:var(--r); padding:20px 22px; box-shadow:var(--shadow); }
.cd-card-hdr { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; }
.cd-card-title { font-size:16px; color:var(--ink); }
.cd-card-sub { font-size:12px; color:var(--pale); margin-top:2px; }
.cd-view-all { background:none; border:none; font-family:'DM Serif Display',serif;
  font-size:12.5px; color:var(--g); cursor:pointer; transition:opacity .15s; }
.cd-view-all:hover { opacity:.7; }

/* TREATMENT ROW */
.cd-treat-row { display:flex; align-items:center; gap:12px; padding:11px 0; border-bottom:1px solid #f0f2f0; }
.cd-treat-row:last-child { border-bottom:none; }
.cd-treat-icon { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.cd-treat-info { flex:1; min-width:0; }
.cd-treat-name { font-size:13.5px; color:var(--ink); }
.cd-treat-meta { font-size:12px; color:var(--pale); margin-top:2px; }
.cd-job-tag { display:inline-block; padding:3px 10px; border-radius:6px; font-size:11.5px; }
.cd-job-tag.completed,.cd-job-tag.report_sent { background:var(--gl); color:var(--g); }
.cd-job-tag.in_progress { background:var(--bluel); color:var(--blue); }
.cd-job-tag.scheduled { background:var(--amberl); color:var(--amber); }
.cd-job-tag.cancelled { background:var(--redl); color:var(--red); }
.cd-treat-btn { background:var(--gl); color:var(--g); border:none; border-radius:8px;
  padding:5px 12px; font-family:'DM Serif Display',serif; font-size:12px; cursor:pointer; white-space:nowrap; transition:background .15s; }
.cd-treat-btn:hover { background:var(--gl2); }

/* CHART */
.cd-chart-wrap { height:80px; margin-top:8px; }
.cd-chart-bars { display:flex; align-items:flex-end; gap:6px; height:100%; }
.cd-bar-col { display:flex; flex-direction:column; align-items:center; gap:3px; flex:1; }
.cd-bar { border-radius:4px 4px 0 0; width:100%; background:var(--gl); transition:background .2s; }
.cd-bar.active { background:var(--g); }
.cd-bar-lbl { font-size:10px; color:var(--pale); }
.cd-chart-note { font-size:12px; color:var(--muted); margin-top:8px; }
.cd-chart-note span { color:var(--g); font-size:13px; }
/* ENHANCED CHART */
.cd-chart-wrap { height:120px; margin-top:12px; }
.cd-chart-bars { display:flex; align-items:flex-end; gap:8px; height:100%; padding-bottom:4px; }
.cd-bar-col { display:flex; flex-direction:column; align-items:center; gap:4px; flex:1; height:100%; justify-content:flex-end; }
.cd-bar-outer { width:100%; flex:1; display:flex; align-items:flex-end; }
.cd-bar {
  border-radius:6px 6px 0 0; width:100%;
  background:linear-gradient(180deg, var(--g) 0%, var(--gl2) 100%);
  transition: height .6s cubic-bezier(.4,0,.2,1);
  position:relative; min-height:3px;
}
.cd-bar.active {
  background:linear-gradient(180deg,#0f4a28 0%,var(--g) 100%);
  box-shadow:0 -2px 8px rgba(26,107,60,.35);
}
.cd-bar.zero { background:var(--border); border-radius:4px; opacity:.5; }
.cd-bar-count {
  font-size:11px; font-weight:600; color:var(--g);
  min-height:16px; display:flex; align-items:center; justify-content:center;
}
.cd-bar-count.zero { color:var(--pale); }
.cd-bar-lbl { font-size:10px; color:var(--pale); letter-spacing:.3px; }
.cd-bar-lbl.active { color:var(--g); font-size:11px; }
.cd-chart-footer {
  display:flex; justify-content:space-between; align-items:center;
  margin-top:14px; padding-top:10px; border-top:1px solid var(--border);
}
.cd-chart-note { font-size:12px; color:var(--muted); }
.cd-chart-note span { color:var(--g); }
.cd-chart-peak { font-size:11px; color:var(--pale); }

/* NEXT APPT */
.cd-appt-hdr { font-size:11px; text-transform:uppercase; letter-spacing:.7px; color:var(--pale); margin-bottom:12px; }
.cd-appt-card { background:var(--gl); border-radius:11px; padding:16px; }
.cd-appt-service { font-size:16px; color:var(--g); margin-bottom:6px; }
.cd-appt-row { display:flex; align-items:center; gap:6px; font-size:12.5px; color:var(--muted); margin-top:5px; }
.cd-appt-row svg { width:13px; height:13px; flex-shrink:0; stroke:var(--g); }
.cd-tech-strip { display:flex; align-items:center; gap:7px; margin-top:10px; padding-top:10px; border-top:1px solid rgba(26,107,60,.15); }
.cd-tech-strip-av { width:24px; height:24px; border-radius:50%; background:var(--g); color:#fff; font-size:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.cd-reschedule-btn { width:100%; margin-top:12px; background:none; border:1.5px solid var(--border);
  border-radius:9px; padding:8px; font-family:'DM Serif Display',serif; font-size:13px; color:var(--ink); cursor:pointer; transition:all .15s; }
.cd-reschedule-btn:hover { background:var(--bg); }
.cd-no-appt { text-align:center; padding:20px; color:var(--pale); font-size:13px; }
.cd-no-appt-icon { font-size:28px; margin-bottom:8px; }

/* ECO CARD */
.cd-eco-card { background:var(--gl); border-radius:var(--r); padding:20px 22px; box-shadow:var(--shadow); }
.cd-eco-top { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
.cd-eco-icon-wrap { width:38px; height:38px; background:var(--g); border-radius:10px; display:flex; align-items:center; justify-content:center; }
.cd-eco-title { font-size:14px; color:var(--g); }
.cd-eco-sub { font-size:11px; color:var(--muted); margin-top:2px; }
.cd-prog-bar { height:5px; background:rgba(26,107,60,.15); border-radius:3px; margin-top:6px; }
.cd-prog-fill { height:100%; border-radius:3px; background:var(--g); }
.cd-prog-note { font-size:12px; color:var(--muted); margin-top:4px; }
.cd-eco-btn { width:100%; margin-top:10px; background:var(--g); color:#fff; border:none;
  border-radius:9px; padding:9px; font-family:'DM Serif Display',serif; font-size:13px; cursor:pointer; transition:background .15s; }
.cd-eco-btn:hover { background:var(--gd); }

/* GREEN CTA */
.cd-cta { background:linear-gradient(135deg,var(--gd),var(--g)); border-radius:12px; padding:18px; color:#fff; }
.cd-cta-lbl { font-size:12px; opacity:.8; margin-bottom:6px; }
.cd-cta-val { font-size:18px; margin-bottom:5px; }
.cd-cta-sub { font-size:12px; opacity:.75; line-height:1.55; margin-bottom:14px; }
.cd-cta-btn { width:100%; background:rgba(255,255,255,.15); border:1px solid rgba(255,255,255,.3);
  color:#fff; border-radius:9px; padding:9px; font-family:'DM Serif Display',serif; font-size:13px; cursor:pointer; transition:background .15s; }
.cd-cta-btn:hover { background:rgba(255,255,255,.25); }

/* LOADING / ERROR / EMPTY */
.cd-loading { display:flex; align-items:center; justify-content:center; padding:60px; color:var(--pale); font-size:14px; gap:10px; }
.cd-spinner { width:20px; height:20px; border:2px solid var(--border); border-top-color:var(--g); border-radius:50%; animation:cdSpin .8s linear infinite; }
@keyframes cdSpin { to { transform:rotate(360deg); } }
.cd-error { background:var(--redl); color:var(--red); padding:11px 16px; border-radius:10px; font-size:13px; margin-bottom:16px; }
.cd-empty { text-align:center; padding:28px; color:var(--pale); font-size:13px; }
.cd-empty-icon { font-size:26px; margin-bottom:8px; }

/* REPORTS */
.cd-report-row { display:flex; align-items:center; gap:12px; padding:11px 0; border-bottom:1px solid #f0f2f0; }
.cd-report-row:last-child { border-bottom:none; }
.cd-report-icon { width:36px; height:36px; border-radius:10px; background:var(--gl); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.cd-report-icon svg { width:16px; height:16px; stroke:var(--g); fill:none; }
.cd-report-info { flex:1; min-width:0; }
.cd-report-name { font-size:13px; color:var(--ink); }
.cd-report-meta { font-size:12px; color:var(--pale); margin-top:2px; }
.cd-report-btn { background:var(--gl); color:var(--g); border:none; border-radius:8px;
  padding:6px 12px; font-family:'DM Serif Display',serif; font-size:12px; cursor:pointer; white-space:nowrap; transition:background .15s; }
.cd-report-btn:hover { background:var(--gl2); }

/* LAST UPDATED TOAST */
.cd-last-updated {
  font-size:11px; color:var(--pale); text-align:right;
  padding:6px 0 0; margin-bottom:14px;
}

/* RESPONSIVE */
@media(max-width:1100px) {
  .cd-stats { grid-template-columns:repeat(2,1fr); }
  .cd-row { grid-template-columns:1fr; }
}
@media(max-width:768px) {
  .cd-sidebar { transform:translateX(-100%); }
  .cd-sidebar.open { transform:translateX(0); }
  .cd-main { margin-left:0; }
  .cd-hamburger { display:flex; }
  .cd-crumb { display:none; }
}
@media(max-width:600px) {
  .cd-stats { grid-template-columns:1fr 1fr; gap:10px; }
  .cd-content { padding:16px; }
  .cd-topbar { padding:0 14px; }
  .cd-stat-val { font-size:22px; }
  .cd-welcome { padding:18px; }
  .cd-live-banner { flex-wrap:wrap; }
  .cd-refresh-indicator span { display:none; }
}
`

const navItems = [
  { id: 'dashboard', label: 'Dashboard',
    d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'jobs', label: 'My Jobs',
    d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'reports', label: 'My Reports',
    d: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'profile', label: 'My Profile',
    d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { id: 'support', label: 'Support',
    d: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z' },
]

const cap = (s) => s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—'

const fmtDate = (dt) => {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const fmtDateTime = (dt) => {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

const fmtTime = (dt) => {
  return new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const treatIcons = {
  default: { stroke: '#1a6b3c', bg: '#edf6f1',
    d: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
  rodent: { stroke: '#1a6b3c', bg: '#edf6f1',
    d: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  flying: { stroke: '#2563eb', bg: '#eff6ff',
    d: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
  eco: { stroke: '#1a6b3c', bg: '#edf6f1',
    d: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  termite: { stroke: '#d68910', bg: '#fff8ec',
    d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
}

const getTreatIcon = (serviceType) => {
  if (!serviceType) return treatIcons.default
  const s = serviceType.toLowerCase()
  if (s.includes('rodent')) return treatIcons.rodent
  if (s.includes('flying') || s.includes('insect')) return treatIcons.flying
  if (s.includes('eco') || s.includes('bio') || s.includes('shield')) return treatIcons.eco
  if (s.includes('termite') || s.includes('subterranean')) return treatIcons.termite
  return treatIcons.default
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function buildChartData(jobs) {
  const now = new Date()
  const counts = Array(6).fill(0)
  const labels = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    labels.push(MONTHS[d.getMonth()])
  }
  jobs.forEach(j => {
    if (!j.scheduled_datetime) return
    const jd = new Date(j.scheduled_datetime)
    const diffMonths = (now.getFullYear() - jd.getFullYear()) * 12 + (now.getMonth() - jd.getMonth())
    if (diffMonths >= 0 && diffMonths < 6) counts[5 - diffMonths]++
  })
  const max = Math.max(...counts, 1)
  return labels.map((lbl, i) => ({
    lbl,
    count: counts[i],
    pct: counts[i] === 0 ? 0 : Math.max(Math.round((counts[i] / max) * 100), 12), // ← 0 stays 0, non-zero min 12%
    isActive: i === 5
  }))
}

function IconSvg({ d, stroke = 'currentColor', size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

// ── NEW: Auto-refresh countdown ring in the topbar ──────────────────────────
function RefreshIndicator({ countdown, isRefreshing, onRefreshNow }) {
  const r = 6
  const circ = 2 * Math.PI * r
  const progress = circ - (countdown / REFRESH_INTERVAL) * circ

  return (
    <button
      className={`cd-refresh-indicator${isRefreshing ? ' refreshing' : ''}`}
      onClick={onRefreshNow}
      title={isRefreshing ? 'Refreshing…' : `Auto-refresh in ${countdown}s — click to refresh now`}
      style={{ cursor: 'pointer', fontFamily: "'DM Serif Display',serif" }}
    >
      {isRefreshing ? (
        <div className="cd-refresh-spin" />
      ) : (
        <div className="cd-refresh-ring">
          <svg viewBox="0 0 16 16">
            <circle cx="8" cy="8" r={r} strokeWidth="2" fill="none" stroke="var(--border)" />
            <circle
              className="cd-ring-progress"
              cx="8" cy="8" r={r}
              strokeWidth="2"
              fill="none"
              stroke="var(--g)"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={progress}
              style={{ transform: 'rotate(-90deg)', transformOrigin: '8px 8px' }}
            />
          </svg>
        </div>
      )}
      <span>{isRefreshing ? 'Refreshing…' : `${countdown}s`}</span>
    </button>
  )
}

function LiveBanner({ job }) {
  if (!job) return null
  const techName = job.technician_name || 'Technician'
  const initials = techName.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
  return (
    <div className="cd-live-banner">
      <div className="cd-live-dot" />
      <div className="cd-live-info">
        <div className="cd-live-title">{cap(job.service_type)} — In Progress</div>
        <div className="cd-live-sub">
          Job #{job.id} · {job.site_address || 'Service location'} · {fmtDate(job.scheduled_datetime)}
        </div>
      </div>
      <div className="cd-live-tech">
        <div className="cd-tech-av">{initials}</div>
        <div>
          <div className="cd-tech-name">{techName}</div>
          <div className="cd-tech-role">Lead Technician</div>
        </div>
      </div>
      <div className="cd-live-badge">
        <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="#22c55e"/></svg>
        Live
      </div>
    </div>
  )
}

function TreatmentRow({ job }) {
  const navigate = useNavigate()
  const icon = getTreatIcon(job.service_type)
  
  return (
    <div 
      className="cd-treat-row"
      onClick={() => navigate(`/customer/jobs/${job.id}`)}
      style={{ cursor: 'pointer' }}
    >
      <div className="cd-treat-icon" style={{ background: icon.bg }}>
        <IconSvg d={icon.d} stroke={icon.stroke} size={18} />
      </div>
      <div className="cd-treat-info">
        <div className="cd-treat-name">{cap(job.service_type)} Service</div>
        <div className="cd-treat-meta">Job #{job.id} · {fmtDate(job.scheduled_datetime)}{job.technician_name ? ` · ${job.technician_name}` : ''}</div>
      </div>
      <span className={`cd-job-tag ${job.status}`}>{cap(job.status)}</span>
      {job.report_url && (
        <a 
          href={job.report_url} 
          target="_blank" 
          rel="noreferrer"
          onClick={e => e.stopPropagation()}  // ← prevents row click when clicking report
        >
          <button className="cd-treat-btn">View Report</button>
        </a>
      )}
    </div>
  )
}

function ServiceChart({ jobs }) {
  const bars = buildChartData(jobs)
  const total = bars.reduce((s, b) => s + b.count, 0)
  const peakMonth = bars.reduce((a, b) => b.count > a.count ? b : a, bars[0])

  return (
    <div className="cd-card">
      <div className="cd-card-hdr">
        <div>
          <div className="cd-card-title">Service Activity</div>
          <div className="cd-card-sub">Last 6 months</div>
        </div>
        <div style={{
          background: 'var(--gl)', borderRadius: 8, padding: '4px 10px',
          fontSize: 12, color: 'var(--g)', display: 'flex', alignItems: 'center', gap: 5
        }}>
          <svg width="10" height="10" viewBox="0 0 10 10">
            <circle cx="5" cy="5" r="5" fill="var(--g)" opacity=".2"/>
            <circle cx="5" cy="5" r="3" fill="var(--g)"/>
          </svg>
          {total} total
        </div>
      </div>

      <div className="cd-chart-wrap">
        <div className="cd-chart-bars">
          {bars.map(b => (
            <div key={b.lbl} className="cd-bar-col">
              {/* Count above bar */}
              <div className={`cd-bar-count${b.count === 0 ? ' zero' : ''}`}>
                {b.count > 0 ? b.count : '·'}
              </div>

              {/* Bar wrapper for proportional height */}
              <div className="cd-bar-outer">
                <div
                  className={`cd-bar${b.isActive ? ' active' : ''}${b.count === 0 ? ' zero' : ''}`}
                  style={{ height: b.count === 0 ? '6px' : `${b.pct}%` }}
                >
                  {/* Shine effect on non-zero bars */}
                  {b.count > 0 && (
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0,
                      height: '40%', background: 'rgba(255,255,255,.15)',
                      borderRadius: '6px 6px 0 0'
                    }}/>
                  )}
                </div>
              </div>

              {/* Month label */}
              <div className={`cd-bar-lbl${b.isActive ? ' active' : ''}`}>
                {b.lbl}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="cd-chart-footer">
        <div className="cd-chart-note">
          <span>↑ {total}</span> services tracked · last 6 months
        </div>
        {peakMonth.count > 0 && (
          <div className="cd-chart-peak">
            Peak: {peakMonth.lbl} ({peakMonth.count})
          </div>
        )}
      </div>
    </div>
  )
}

function NextAppointment({ job, onReschedule }) {
  if (!job) {
    return (
      <div className="cd-card">
        <div className="cd-appt-hdr">Next Appointment</div>
        <div className="cd-no-appt">
          <div className="cd-no-appt-icon">📅</div>
          No upcoming appointments
        </div>
      </div>
    )
  }
  const techName = job.technician_name || ''
  const initials = techName ? techName.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) : '?'
  return (
    <div className="cd-card">
      <div className="cd-appt-hdr">Next Appointment</div>
      <div className="cd-appt-card">
        <div className="cd-appt-service">{cap(job.service_type)}</div>
        <div className="cd-appt-row">
          <IconSvg size={13} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          {fmtDateTime(job.scheduled_datetime)}
        </div>
        {job.site_address && (
          <div className="cd-appt-row">
            <IconSvg size={13} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            {job.site_address}
          </div>
        )}
        {techName && (
          <div className="cd-tech-strip">
            <div className="cd-tech-strip-av">{initials}</div>
            <span style={{ fontSize: '12.5px', color: 'var(--muted)' }}>{techName} · Lead Technician</span>
          </div>
        )}
      </div>
      <button className="cd-reschedule-btn" onClick={onReschedule}>  {/* ← added onClick */}
        Reschedule
      </button>
    </div>
  )
}

function EcoCard({ completedJobs, totalJobs }) {
  const pct = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0
  return (
    <div className="cd-eco-card">
      <div className="cd-eco-top">
        <div className="cd-eco-icon-wrap">
          <IconSvg size={18} stroke="#fff"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </div>
        <div>
          <div className="cd-eco-title">Eco-Safe Certified</div>
          <div className="cd-eco-sub">Chemical-free bio-shielding used</div>
        </div>
      </div>
      <div className="cd-prog-bar"><div className="cd-prog-fill" style={{ width: `${pct}%` }} /></div>
      <div className="cd-prog-note">{pct}% Carbon-free treatment badge</div>
      <button className="cd-eco-btn">↓ Download Certificate</button>
    </div>
  )
}

// ── Helper: extract array from any API response shape ───────────────────────
// Handles: plain array, { results: [] } (DRF pagination), { data: [] }, { jobs: [] }
function extractArray(raw, fallbackKeys = []) {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') {
    for (const key of ['results', 'data', ...fallbackKeys]) {
      if (Array.isArray(raw[key])) return raw[key]
    }
  }
  return []
}

// ── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function CustomerDashboard() {
  const navigate = useNavigate()
  const [active, setActive] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [jobs, setJobs] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [apiDebug, setApiDebug] = useState(null) // shows raw API info when zero results
  const [lastUpdated, setLastUpdated] = useState(null)
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL)
  const isMounted = useRef(true)
  const autoRefreshTimer = useRef(null)
  const countdownTimer = useRef(null)
  const [rescheduleJob, setRescheduleJob] = useState(null)
const [newDate, setNewDate] = useState('')
const [rescheduling, setRescheduling] = useState(false)

const handleReschedule = async () => {
  if (!newDate) return
  setRescheduling(true)
  try {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`/api/jobs/${rescheduleJob.id}/reschedule/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ scheduled_datetime: newDate }),
    })
    if (!res.ok) throw new Error('Failed to reschedule')
    setRescheduleJob(null)
    setNewDate('')
    await fetchData({ silent: true })
  } catch (err) {
    alert('Could not reschedule: ' + err.message)
  } finally {
    setRescheduling(false)
  }
}

  // FIX 1: Read customer once into a ref so it's stable across renders
  const customerRef = useRef((() => {
    try { return JSON.parse(localStorage.getItem('customer')) || {} }
    catch { return {} }
  })())
  const customer = customerRef.current

  const customerName = customer.name || customer.full_name ||
    `${customer.first_name || ''} ${customer.last_name || ''}`.trim() ||
    customer.email || 'Customer'

  const customerInitials = (() => {
    const parts = customerName.trim().split(' ').filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return (parts[0]?.[0] || 'C').toUpperCase()
  })()

  // ── Core fetch (used both on mount and by auto-refresh) ──────────────────
  const fetchData = useCallback(async ({ silent = false } = {}) => {
    const customerId = customerRef.current?.id

    // FIX 2: Catch missing customer ID early with a clear message
    if (!customerId) {
      if (isMounted.current) {
        setError('No customer ID found in session. Please log in again.')
        setLoading(false)
      }
      return
    }

    try {
      if (silent) setIsRefreshing(true)

      // FIX 3: Capture HTTP status codes so we can show meaningful errors
      const safeJson = async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} — ${res.url}`)
        return res.json()
      }

      const token = localStorage.getItem('access_token')

      const [jr, rr] = await Promise.all([
  fetch(`/api/jobs/customer/${customerId}/`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  }).then(safeJson),

  fetch(`/api/reports/?customer_id=${customerId}`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  }).then(safeJson).catch(() => []),  // ← reports failure won't block jobs
])

      if (!isMounted.current) return

      // FIX 4: extractArray handles all DRF response shapes
      const jobList = extractArray(jr, ['jobs'])
      const reportList = extractArray(rr, ['reports'])

      setJobs(jobList)
      setReports(reportList)
      setLastUpdated(new Date())
      setError('')

      // Debug info shown only when results are unexpectedly empty
      if (jobList.length === 0) {
        setApiDebug({
          customerId,
          jobsRawKeys: jr && typeof jr === 'object' ? Object.keys(jr) : typeof jr,
          jobsRawSample: JSON.stringify(jr)?.slice(0, 200),
        })
      } else {
        setApiDebug(null)
      }

    } catch (err) {
      if (isMounted.current) {
        setError(`Failed to load data: ${err.message}`)
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
        setIsRefreshing(false)
      }
    }
  }, []) // stable — reads from ref, no deps needed

  // ── Reset & start the 30-second countdown ───────────────────────────────
  const startCountdown = useCallback(() => {
    // Clear any existing timers
    clearInterval(autoRefreshTimer.current)
    clearInterval(countdownTimer.current)

    setCountdown(REFRESH_INTERVAL)

    // Tick the visible countdown every second
    let secs = REFRESH_INTERVAL
    countdownTimer.current = setInterval(() => {
      secs -= 1
      if (isMounted.current) setCountdown(secs)
    }, 1000)

    // Fire the actual fetch after 30 seconds
    autoRefreshTimer.current = setTimeout(async () => {
      // Only refresh when the tab is visible (saves unnecessary API calls)
      if (document.visibilityState === 'visible') {
        await fetchData({ silent: true })
      }
      if (isMounted.current) startCountdown() // restart the cycle
    }, REFRESH_INTERVAL * 1000)
  }, [fetchData])

  // ── Manual "refresh now" handler ─────────────────────────────────────────
  const handleRefreshNow = useCallback(async () => {
    await fetchData({ silent: true })
    startCountdown() // reset the 30s countdown after manual refresh
  }, [fetchData, startCountdown])

  // ── Mount / unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    isMounted.current = true
    if (!localStorage.getItem('customer')) { navigate('/customer-login'); return }

    fetchData().then(() => startCountdown())

    // Pause countdown when tab is hidden, resume when visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Tab came back into view — refresh immediately then restart cycle
        fetchData({ silent: true }).then(() => startCountdown())
      } else {
        // Tab hidden — pause timers
        clearTimeout(autoRefreshTimer.current)
        clearInterval(countdownTimer.current)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      isMounted.current = false
      clearTimeout(autoRefreshTimer.current)
      clearInterval(countdownTimer.current)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [fetchData, navigate, startCountdown])

  const handleLogout = () => {
    clearTimeout(autoRefreshTimer.current)
    clearInterval(countdownTimer.current)
    localStorage.removeItem('customer')
    navigate('/customer-login')
  }

  // Derived stats
  const totalJobs     = jobs.length
  const completedJobs = jobs.filter(j => ['completed', 'report_sent'].includes(j.status)).length
  const activeJobs    = jobs.filter(j => j.status === 'in_progress').length
  const scheduledJobs = jobs.filter(j => j.status === 'scheduled').length
  const completionPct = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0

  const nextJob = jobs
    .filter(j => j.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduled_datetime) - new Date(b.scheduled_datetime))[0]

  const activeJob = jobs.find(j => j.status === 'in_progress')

  const recentJobs = [...jobs]
    .sort((a, b) => new Date(b.scheduled_datetime) - new Date(a.scheduled_datetime))
    .slice(0, 5)

  const welcomeMsg = activeJobs > 0
    ? `You have ${activeJobs} active service in progress right now.`
    : scheduledJobs > 0
    ? 'Your next service is scheduled. We\'ll be there on time.'
    : 'All your services are up to date. Stay protected!'

  const nextJobLabel = nextJob
    ? `Next service: ${fmtDate(nextJob.scheduled_datetime)}`
    : 'No upcoming services'

  return (
    <>
      <style>{S}</style>
      <div className="cd-root">
        <div className={`cd-overlay${sidebarOpen ? ' show' : ''}`} onClick={() => setSidebarOpen(false)} />

        {/* SIDEBAR */}
        <aside className={`cd-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="cd-sb-logo">
            <div className="cd-sb-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z" /></svg>
            </div>
            <span className="cd-sb-brand">PestPro</span>
          </div>
          <nav className="cd-sb-nav">
            {navItems.map(n => (
              <div key={n.id}
                className={`cd-nav-item${active === n.id ? ' active' : ''}`}
                onClick={() => { setActive(n.id); setSidebarOpen(false) }}>
                <IconSvg d={n.d} />
                {n.label}
              </div>
            ))}
          </nav>
          <div className="cd-sb-footer">
            <div className="cd-sb-user">
              <div className="cd-sb-av">{customerInitials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="cd-sb-name">{customerName}</div>
                <div className="cd-sb-role">Customer</div>
              </div>
              <button className="cd-sb-logout" onClick={handleLogout} title="Logout">
                <IconSvg size={16} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <div className="cd-main">
          <div className="cd-topbar">
            <div className="cd-topbar-left">
              <button className="cd-hamburger" onClick={() => setSidebarOpen(o => !o)}>
                <IconSvg size={20} d="M4 6h16M4 12h16M4 18h16" />
              </button>
              <span className="cd-crumb">Customer &nbsp;›&nbsp; <span>{navItems.find(n => n.id === active)?.label || 'Dashboard'}</span></span>
            </div>
            <div className="cd-topbar-right">
              {/* ── Auto-refresh indicator (new) ── */}
              {!loading && (
                <RefreshIndicator
                  countdown={countdown}
                  isRefreshing={isRefreshing}
                  onRefreshNow={handleRefreshNow}
                />
              )}
              <button className="cd-logout-btn" onClick={handleLogout}>
                <IconSvg size={13} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                Logout
              </button>
            </div>
          </div>

          <div className="cd-content">
            {error && (
              <div className="cd-error">
                ⚠ {error}
                <div style={{ fontSize: '11px', marginTop: '6px', opacity: 0.8 }}>
                  Check that <code style={{background:'rgba(0,0,0,.08)',padding:'1px 4px',borderRadius:3}}>/api/jobs/by-customer/{customer.id}/</code> returns data for this customer.
                </div>
              </div>
            )}

            {loading ? (
              <div className="cd-loading"><div className="cd-spinner" />Loading your data…</div>
            ) : (
              <>
                {/* Last updated timestamp */}
                {lastUpdated && (
                  <div className="cd-last-updated">
                    Last updated: {fmtTime(lastUpdated)}
                  </div>
                )}

                {/* DEBUG PANEL — visible only when API returns 0 jobs; remove in production */}
                {apiDebug && (
                  <div style={{
                    background:'#fff8ec', border:'1.5px solid #d68910', borderRadius:'10px',
                    padding:'14px 18px', marginBottom:'16px', fontSize:'12.5px', color:'#7a4a00', lineHeight:1.7
                  }}>
                    <div style={{fontWeight:'bold', marginBottom:6}}>⚠ API returned 0 jobs for customer ID: <code style={{background:'rgba(0,0,0,.08)',padding:'1px 5px',borderRadius:3}}>{apiDebug.customerId}</code></div>
                    <div>Response keys received: <code style={{background:'rgba(0,0,0,.08)',padding:'1px 5px',borderRadius:3}}>{apiDebug.jobsRawKeys}</code></div>
                    <div style={{marginTop:4, wordBreak:'break-all', opacity:0.75}}>Raw sample: <code>{apiDebug.jobsRawSample}</code></div>
                    <div style={{marginTop:8, paddingTop:8, borderTop:'1px solid rgba(214,137,16,.25)'}}>
                      <strong>Common fixes to check:</strong><br/>
                      1. Open browser DevTools → Network tab → find the <code>/api/jobs/by-customer/…</code> call → check status &amp; response body<br/>
                      2. Confirm the <code>id</code> stored in localStorage matches the actual customer PK in the DB<br/>
                      3. If the API wraps data under a different key (e.g. <code>jobs</code>, <code>data</code>), update <code>extractArray()</code> at the top of this file<br/>
                      4. Check for 401/403 auth errors — add an <code>Authorization</code> header if your API requires a token
                    </div>
                  </div>
                )}

                {/* WELCOME */}
                <div className="cd-welcome">
                  <div className="cd-welcome-av">{customerInitials}</div>
                  <div className="cd-welcome-info">
                    <div className="cd-welcome-name">Welcome back, {customerName.split(' ')[0]} 👋</div>
                    <div className="cd-welcome-sub">{welcomeMsg}</div>
                    <div className="cd-welcome-chips">
                      <span className="cd-w-chip ok">✓ Premium Plan</span>
                      <span className="cd-w-chip">{nextJobLabel}</span>
                      <span className="cd-w-chip">Status: Active</span>
                    </div>
                  </div>
                  <div className="cd-welcome-badge">
                    <div className="cd-wb-val">{totalJobs > 0 ? `${completionPct}%` : '—'}</div>
                    <div className="cd-wb-lbl">Services Done</div>
                  </div>
                </div>

                {/* STATS */}
                <div className="cd-stats">
                  <div className="cd-stat">
                    <div className="cd-stat-icon green">
                      <IconSvg stroke="#1a6b3c" size={18} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </div>
                    <div className="cd-stat-lbl">Total Services</div>
                    <div className="cd-stat-val">{totalJobs}</div>
                    <div className="cd-stat-sub">All time</div>
                  </div>
                  <div className="cd-stat">
                    <div className="cd-stat-icon green">
                      <IconSvg stroke="#1a6b3c" size={18} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </div>
                    <div className="cd-stat-lbl">Completed</div>
                    <div className="cd-stat-val green">{completedJobs}</div>
                    <span className="cd-stat-badge green">
                      {totalJobs > 0 ? `${completionPct}% rate` : 'No services yet'}
                    </span>
                  </div>
                  <div className="cd-stat">
                    <div className="cd-stat-icon amber">
                      <IconSvg stroke="#d68910" size={18} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </div>
                    <div className="cd-stat-lbl">Scheduled</div>
                    <div className={`cd-stat-val${scheduledJobs > 0 ? ' amber' : ''}`}>{scheduledJobs}</div>
                    <span className={`cd-stat-badge${scheduledJobs > 0 ? ' amber' : ' green'}`}>
                      {scheduledJobs > 0 ? 'Upcoming' : 'None pending'}
                    </span>
                  </div>
                  <div className="cd-stat">
                    <div className="cd-stat-icon blue">
                      <IconSvg stroke="#2563eb" size={18} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </div>
                    <div className="cd-stat-lbl">Active Now</div>
                    <div className={`cd-stat-val${activeJobs > 0 ? ' blue' : ''}`}>{activeJobs}</div>
                    <span className={`cd-stat-badge${activeJobs > 0 ? ' blue' : ' green'}`}>
                      {activeJobs > 0 ? 'In progress' : 'All clear'}
                    </span>
                  </div>
                </div>

                {/* LIVE STATUS BANNER */}
                {activeJob && <LiveBanner job={activeJob} />}

                {/* MAIN ROW */}
                <div className="cd-row">
                  <div className="cd-left-col">
                    <div className="cd-card">
                      <div className="cd-card-hdr">
                        <div>
                          <div className="cd-card-title">Treatment History</div>
                          <div className="cd-card-sub">{recentJobs.length > 0 ? `Last ${recentJobs.length} services` : 'No services yet'}</div>
                        </div>
                        {totalJobs > 5 && <button className="cd-view-all">View All →</button>}
                      </div>
                      {recentJobs.length === 0 ? (
                        <div className="cd-empty">
                          <div className="cd-empty-icon">🛡️</div>
                          No services yet. Your history will appear here.
                        </div>
                      ) : (
                        recentJobs.map((job) => <TreatmentRow key={job.id} job={job} />)
                      )}
                    </div>
                    <ServiceChart jobs={jobs} />
                  </div>

                  <div className="cd-right-col">
                    <NextAppointment job={nextJob} onReschedule={() => setRescheduleJob(nextJob)} />
                    <EcoCard completedJobs={completedJobs} totalJobs={totalJobs} />
                    <div className="cd-cta">
                      <div className="cd-cta-lbl">Service Summary</div>
                      <div className="cd-cta-val">{completedJobs} Services Done</div>
                      <div className="cd-cta-sub">
                        {scheduledJobs} upcoming · {activeJobs} in progress · {reports.length} reports available
                      </div>
                      <button className="cd-cta-btn" onClick={handleRefreshNow}>
                        ↻ Refresh My Data
                      </button>
                    </div>
                  </div>
                </div>

                {/* REPORTS SECTION */}
                {reports.length > 0 && (
                  <div className="cd-card">
                    <div className="cd-card-hdr">
                      <div>
                        <div className="cd-card-title">My Reports</div>
                        <div className="cd-card-sub">{reports.length} PDF reports available</div>
                      </div>
                    </div>
                    {reports.slice(0, 5).map(report => (
                      <div key={report.id} className="cd-report-row">
                        <div className="cd-report-icon">
                          <svg viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="cd-report-info">
                          <div className="cd-report-name">
                            {cap(report.service_type || report.job?.service_type)} Report
                          </div>
                          <div className="cd-report-meta">
                            Job #{report.job_id || report.job?.id} · Generated {fmtDate(report.generated_at || report.created_at)}
                          </div>
                        </div>
                        {report.pdf_url && (
                          <a href={report.pdf_url} target="_blank" rel="noreferrer">
                            <button className="cd-report-btn">↓ Download</button>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        {/* RESCHEDULE MODAL */}
{rescheduleJob && (
  <div style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
  }}>
    <div style={{
      background: '#fff', borderRadius: 16, padding: 28, width: 340,
      fontFamily: "'DM Serif Display', serif", boxShadow: '0 8px 32px rgba(0,0,0,.18)'
    }}>
      <div style={{ fontSize: 17, color: 'var(--ink)', marginBottom: 6 }}>Reschedule Service</div>
      <div style={{ fontSize: 12, color: 'var(--pale)', marginBottom: 20 }}>
        Job #{rescheduleJob.id} · {cap(rescheduleJob.service_type)}
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>New Date & Time</div>
      <input
        type="datetime-local"
        value={newDate}
        onChange={e => setNewDate(e.target.value)}
        style={{
          width: '100%', padding: '9px 12px', borderRadius: 9,
          border: '1.5px solid var(--border)', fontFamily: "'DM Serif Display', serif",
          fontSize: 13, marginBottom: 18, outline: 'none'
        }}
      />
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => { setRescheduleJob(null); setNewDate('') }}
          style={{
            flex: 1, padding: '9px', borderRadius: 9, border: '1.5px solid var(--border)',
            background: 'none', cursor: 'pointer', fontFamily: "'DM Serif Display', serif", fontSize: 13
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleReschedule}
          disabled={!newDate || rescheduling}
          style={{
            flex: 1, padding: '9px', borderRadius: 9, border: 'none',
            background: newDate ? 'var(--g)' : 'var(--pale)', color: '#fff',
            cursor: newDate ? 'pointer' : 'not-allowed',
            fontFamily: "'DM Serif Display', serif", fontSize: 13
          }}
        >
          {rescheduling ? 'Saving…' : 'Confirm'}
        </button>
      </div>
    </div>
  </div>
)}
      </div>
    </>
  )
}