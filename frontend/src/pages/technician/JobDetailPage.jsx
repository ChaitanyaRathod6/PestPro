import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const fmt = (s = '') =>
  s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */
const S = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --green:#1a6b3c; --green-dark:#1a4d2e; --green-light:#edf6f1;
  --ink:#1a2e1a; --muted:#7a8c7a; --pale:#a0b0a0;
  --border:#e8ebe8; --bg:#f0f2f0; --white:#fff;
  --red:#e74c3c; --amber:#e6a817; --blue:#3b82f6;
  --sidebar-w:220px;
}

.jd-root { font-family:'DM Serif Display',serif; min-height:100vh; background:var(--bg); display:flex; }

/* ── SIDEBAR ── */
.jd-sidebar { width:var(--sidebar-w); background:var(--white); border-right:1px solid var(--border); display:flex; flex-direction:column; min-height:100vh; position:fixed; top:0; left:0; bottom:0; z-index:200; transition:transform .25s; overflow-y:auto; }
.jd-sb-logo { padding:16px 20px; display:flex; align-items:center; gap:8px; border-bottom:1px solid var(--border); flex-shrink:0; }
.jd-sb-icon { width:28px; height:28px; background:var(--green); border-radius:6px; display:flex; align-items:center; justify-content:center; }
.jd-sb-icon svg { width:15px; height:15px; fill:white; }
.jd-sb-brand { font-size:16px; color:var(--ink); }
.jd-sb-nav { padding:12px 10px; flex:1; }
.jd-sb-item { display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:10px; cursor:pointer; margin-bottom:2px; color:var(--muted); font-size:13.5px; transition:background .15s,color .15s; white-space:nowrap; }
.jd-sb-item:hover { background:var(--bg); color:var(--ink); }
.jd-sb-item.active { background:var(--green-light); color:var(--green); }
.jd-sb-item svg { width:16px; height:16px; flex-shrink:0; }
.jd-sb-user { padding:14px 16px; border-top:1px solid var(--border); display:flex; align-items:center; gap:10px; flex-shrink:0; }
.jd-sb-avatar { width:32px; height:32px; background:var(--green); border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:12px; flex-shrink:0; }
.jd-sb-uname { font-size:13px; color:var(--ink); line-height:1.2; }
.jd-sb-urole { font-size:11px; color:var(--pale); }
.jd-sb-logout { background:none; border:none; cursor:pointer; color:var(--pale); padding:4px; border-radius:6px; display:flex; align-items:center; justify-content:center; transition:color .15s,background .15s; flex-shrink:0; margin-left:auto; }
.jd-sb-logout:hover { color:var(--red); background:#fde8e8; }
.jd-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:150; }
.jd-overlay.show { display:block; }

/* ── MAIN ── */
.jd-main { flex:1; margin-left:var(--sidebar-w); display:flex; flex-direction:column; min-height:100vh; }

/* ── TOPBAR ── */
.jd-topbar { background:var(--white); border-bottom:1px solid var(--border); padding:0 24px; height:50px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:100; flex-shrink:0; gap:12px; }
.jd-topbar-left { display:flex; align-items:center; gap:10px; }
.jd-hamburger { display:none; background:none; border:none; cursor:pointer; padding:4px; border-radius:6px; color:var(--ink); }
.jd-hamburger svg { width:20px; height:20px; }
.jd-back-btn { display:flex; align-items:center; gap:6px; background:var(--bg); border:1.5px solid var(--border); border-radius:9px; padding:7px 14px; font-family:'DM Serif Display',serif; font-size:13px; color:var(--ink); cursor:pointer; transition:background .15s; }
.jd-back-btn:hover { background:#e8ebe8; }
.jd-back-btn svg { width:14px; height:14px; }
.jd-crumb { font-size:13px; color:var(--pale); }
.jd-crumb span { color:var(--ink); font-size:14px; }

/* ── CONTENT ── */
.jd-content { padding:24px; flex:1; max-width:1100px; width:100%; }

/* Loading / Error */
.jd-loading { display:flex; align-items:center; justify-content:center; padding:80px; color:var(--pale); font-size:14px; gap:10px; }
.jd-spinner { width:20px; height:20px; border:2px solid var(--border); border-top-color:var(--green); border-radius:50%; animation:jdSpin .8s linear infinite; }
@keyframes jdSpin { to { transform:rotate(360deg); } }
.jd-error { background:#fde8e8; color:var(--red); padding:14px 18px; border-radius:12px; font-size:13px; margin-bottom:18px; }

/* ── PAGE HEADER ── */
.jd-page-hdr { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:22px; gap:16px; flex-wrap:wrap; }
.jd-page-hdr-left { display:flex; flex-direction:column; gap:6px; }
.jd-job-id { font-size:12px; color:var(--pale); text-transform:uppercase; letter-spacing:.8px; }
.jd-job-title { font-size:24px; color:var(--ink); letter-spacing:-.5px; }
.jd-status-row { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }

/* Status badge */
.jd-status { font-size:12px; padding:4px 12px; border-radius:20px; }
.jd-status.scheduled   { background:#fff8ec; color:var(--amber); }
.jd-status.in_progress { background:var(--green-light); color:var(--green); }
.jd-status.completed   { background:#f0f2f0; color:var(--muted); }
.jd-status.report_sent { background:#f0f2f0; color:var(--muted); }
.jd-status.cancelled   { background:#fde8e8; color:var(--red); }

/* ── ACTION BUTTONS ── */
.jd-actions { display:flex; gap:10px; flex-wrap:wrap; }
.jd-btn { border:none; border-radius:10px; padding:10px 20px; font-family:'DM Serif Display',serif; font-size:13.5px; cursor:pointer; display:flex; align-items:center; gap:7px; transition:background .15s, transform .1s, opacity .15s; white-space:nowrap; }
.jd-btn:hover:not(:disabled) { transform:translateY(-1px); }
.jd-btn:disabled { opacity:.5; cursor:not-allowed; transform:none; }
.jd-btn svg { width:15px; height:15px; flex-shrink:0; }
.jd-btn-primary  { background:var(--green); color:#fff; }
.jd-btn-primary:hover:not(:disabled)  { background:#155a32; }
.jd-btn-danger   { background:var(--red); color:#fff; }
.jd-btn-danger:hover:not(:disabled)   { background:#c0392b; }
.jd-btn-amber    { background:var(--amber); color:#fff; }
.jd-btn-amber:hover:not(:disabled)    { background:#c98b00; }
.jd-btn-outline  { background:var(--white); color:var(--ink); border:1.5px solid var(--border); }
.jd-btn-outline:hover:not(:disabled)  { background:var(--bg); }
.jd-btn-blue     { background:var(--blue); color:#fff; }
.jd-btn-blue:hover:not(:disabled)     { background:#2563eb; }

/* Inline spinner for buttons */
.jd-btn-spinner { width:13px; height:13px; border:2px solid rgba(255,255,255,.4); border-top-color:#fff; border-radius:50%; animation:jdSpin .7s linear infinite; flex-shrink:0; }
.jd-btn-spinner.dark { border-color:rgba(0,0,0,.15); border-top-color:var(--ink); }

/* ── TWO-COL GRID ── */
.jd-grid { display:grid; grid-template-columns:1fr 340px; gap:18px; align-items:start; }

/* ── CARD ── */
.jd-card { background:var(--white); border-radius:16px; padding:22px; box-shadow:0 2px 12px rgba(0,0,0,.05); margin-bottom:16px; }
.jd-card:last-child { margin-bottom:0; }
.jd-card-title { font-size:11px; text-transform:uppercase; letter-spacing:.8px; color:var(--pale); margin-bottom:16px; display:flex; align-items:center; gap:8px; }
.jd-card-title svg { width:13px; height:13px; }

/* ── INFO ROWS ── */
.jd-info-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.jd-info-item { display:flex; flex-direction:column; gap:4px; }
.jd-info-label { font-size:10.5px; color:var(--pale); text-transform:uppercase; letter-spacing:.6px; }
.jd-info-val   { font-size:14px; color:var(--ink); line-height:1.4; }
.jd-info-val a { color:var(--green); text-decoration:none; }
.jd-info-val a:hover { text-decoration:underline; }

.jd-divider { height:1px; background:var(--border); margin:16px 0; }

/* ── CUSTOMER CARD ── */
.jd-customer-row  { display:flex; align-items:center; gap:12px; margin-bottom:14px; }
.jd-customer-av   { width:44px; height:44px; border-radius:50%; background:var(--green); display:flex; align-items:center; justify-content:center; color:#fff; font-size:18px; flex-shrink:0; }
.jd-customer-name { font-size:16px; color:var(--ink); }
.jd-customer-email{ font-size:12.5px; color:var(--muted); margin-top:2px; }
.jd-contact-btns  { display:flex; gap:8px; margin-top:12px; }
.jd-contact-btn   { flex:1; display:flex; align-items:center; justify-content:center; gap:6px; padding:9px; border-radius:10px; font-family:'DM Serif Display',serif; font-size:13px; cursor:pointer; border:1.5px solid var(--border); background:var(--white); color:var(--ink); transition:background .15s; text-decoration:none; }
.jd-contact-btn:hover { background:var(--bg); }
.jd-contact-btn svg { width:14px; height:14px; }
.jd-contact-btn.call { background:var(--green-light); color:var(--green); border-color:var(--green-light); }
.jd-contact-btn.maps { background:#eff6ff; color:var(--blue); border-color:#eff6ff; }

/* ── OBSERVATIONS ── */
.jd-obs-row  { display:flex; gap:12px; padding:12px 0; border-bottom:1px solid #f5f7f5; align-items:flex-start; }
.jd-obs-row:last-child { border-bottom:none; }
.jd-obs-dot  { width:8px; height:8px; border-radius:50%; background:var(--green); flex-shrink:0; margin-top:6px; }
.jd-obs-dot.warn     { background:var(--amber); }
.jd-obs-dot.critical { background:var(--red); }
.jd-obs-body { flex:1; }
.jd-obs-type { font-size:13.5px; color:var(--ink); margin-bottom:3px; }
.jd-obs-meta { font-size:11.5px; color:var(--pale); }
.jd-obs-note { font-size:12.5px; color:var(--muted); margin-top:4px; font-style:italic; }
.jd-empty-obs { text-align:center; padding:20px; color:var(--pale); font-size:13px; }

/* ── PAST VISITS ── */
.jd-visit-row  { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid #f5f7f5; }
.jd-visit-row:last-child { border-bottom:none; }
.jd-visit-date { font-size:12px; color:var(--pale); min-width:90px; }
.jd-visit-type { font-size:13.5px; color:var(--ink); flex:1; }
.jd-visit-badge { font-size:11px; padding:2px 9px; border-radius:6px; }
.jd-visit-badge.completed { background:var(--green-light); color:var(--green); }
.jd-visit-badge.cancelled { background:#fde8e8; color:var(--red); }

/* ── NOTES ── */
.jd-notes-text  { font-size:13.5px; color:var(--muted); line-height:1.7; white-space:pre-wrap; }
.jd-notes-input { width:100%; min-height:90px; background:var(--bg); border:1.5px solid var(--border); border-radius:10px; padding:12px; font-family:'DM Serif Display',serif; font-size:13.5px; color:var(--ink); outline:none; resize:vertical; transition:border-color .18s; }
.jd-notes-input:focus { border-color:var(--green); background:var(--white); }

/* ── SIGNATURE PAD ── */
.jd-sig-wrap   { border:1.5px solid var(--border); border-radius:12px; overflow:hidden; background:#fafbfa; }
.jd-sig-canvas { display:block; width:100%; height:160px; cursor:crosshair; touch-action:none; }
.jd-sig-actions { display:flex; gap:8px; margin-top:10px; }
.jd-sig-clear-btn { background:var(--bg); border:1.5px solid var(--border); border-radius:8px; padding:8px 16px; font-family:'DM Serif Display',serif; font-size:12.5px; cursor:pointer; color:var(--ink); transition:background .15s; }
.jd-sig-clear-btn:hover { background:#e8ebe8; }
.jd-sig-save-btn { background:var(--green); color:#fff; border:none; border-radius:8px; padding:8px 16px; font-family:'DM Serif Display',serif; font-size:12.5px; cursor:pointer; transition:background .15s; }
.jd-sig-save-btn:hover:not(:disabled) { background:#155a32; }
.jd-sig-save-btn:disabled { opacity:.5; cursor:not-allowed; }
.jd-sig-hint   { font-size:11.5px; color:var(--pale); margin-top:6px; }
.jd-sig-done   { display:flex; align-items:center; gap:6px; color:var(--green); font-size:13px; padding:10px 0; }
.jd-sig-done svg { width:16px; height:16px; }

/* ── MODAL ── */
.jd-modal-bg { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:500; display:flex; align-items:center; justify-content:center; padding:16px; }
.jd-modal { background:var(--white); border-radius:18px; padding:28px; width:100%; max-width:460px; box-shadow:0 8px 40px rgba(0,0,0,.18); }
.jd-modal-title { font-size:18px; color:var(--ink); margin-bottom:6px; }
.jd-modal-sub   { font-size:13px; color:var(--pale); margin-bottom:20px; }
.jd-modal-field { margin-bottom:14px; }
.jd-modal-label { font-size:12px; color:var(--muted); text-transform:uppercase; letter-spacing:.5px; margin-bottom:6px; display:block; }
.jd-modal-input    { width:100%; background:var(--bg); border:1.5px solid var(--border); border-radius:10px; padding:11px 14px; font-family:'DM Serif Display',serif; font-size:13.5px; color:var(--ink); outline:none; transition:border-color .18s; }
.jd-modal-input:focus { border-color:var(--green); background:var(--white); }
.jd-modal-select   { width:100%; background:var(--bg); border:1.5px solid var(--border); border-radius:10px; padding:11px 14px; font-family:'DM Serif Display',serif; font-size:13.5px; color:var(--ink); outline:none; appearance:none; }
.jd-modal-textarea { width:100%; min-height:80px; background:var(--bg); border:1.5px solid var(--border); border-radius:10px; padding:11px 14px; font-family:'DM Serif Display',serif; font-size:13.5px; color:var(--ink); outline:none; resize:vertical; }
.jd-modal-textarea:focus { border-color:var(--green); }
.jd-modal-actions { display:flex; gap:10px; margin-top:20px; }
.jd-modal-cancel { flex:1; background:var(--bg); border:1.5px solid var(--border); border-radius:10px; padding:11px; font-family:'DM Serif Display',serif; font-size:13.5px; cursor:pointer; color:var(--ink); }
.jd-modal-submit { flex:1; background:var(--green); color:#fff; border:none; border-radius:10px; padding:11px; font-family:'DM Serif Display',serif; font-size:13.5px; cursor:pointer; transition:background .15s; display:flex; align-items:center; justify-content:center; gap:8px; }
.jd-modal-submit:hover:not(:disabled) { background:#155a32; }
.jd-modal-submit:disabled { background:#6aab85; cursor:not-allowed; }

/* ── TOAST ── */
.jd-toast { position:fixed; bottom:24px; right:24px; background:var(--ink); color:#fff; border-radius:12px; padding:12px 20px; font-size:13.5px; z-index:999; display:flex; align-items:center; gap:8px; box-shadow:0 4px 20px rgba(0,0,0,.2); animation:jdSlideUp .25s ease; }
.jd-toast.success { background:var(--green); }
.jd-toast.error   { background:var(--red); }
@keyframes jdSlideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

/* ── RESPONSIVE ── */
@media(max-width:900px) {
  .jd-grid { grid-template-columns:1fr; }
}
@media(max-width:768px) {
  .jd-sidebar { transform:translateX(-100%); }
  .jd-sidebar.open { transform:translateX(0) !important; }
  .jd-main { margin-left:0 !important; }
  .jd-hamburger { display:flex; }
  .jd-crumb { display:none; }
  .jd-content { padding:16px; }
  .jd-info-grid { grid-template-columns:1fr; }
  .jd-actions { flex-direction:column; }
  .jd-btn { justify-content:center; }
}
`

/* ── NAV ITEMS ── */
const navItems = [
  { id:'dashboard', label:'Dashboard',   d:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id:'jobs',      label:'My Jobs',     d:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id:'route',     label:'Daily Route', d:'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
  { id:'perf',      label:'Performance', d:'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id:'customers', label:'Customers',   d:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { id:'settings',  label:'Settings',    d:'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
]

const PEST_CATEGORIES = ['rodent','flying_insect','cockroach','termite','mosquito','bed_bug','ant','general']
const SEVERITY_OPTS   = ['low','medium','high','critical']

/* ─────────────────────────────────────────────
   SIGNATURE HOOK
───────────────────────────────────────────── */
function useSignaturePad(canvasRef) {
  const drawing = useRef(false)
  const lastPt  = useRef(null)

  const getPos = (e, canvas) => {
    const r = canvas.getBoundingClientRect()
    const src = e.touches ? e.touches[0] : e
    return {
      x: (src.clientX - r.left) * (canvas.width / r.width),
      y: (src.clientY - r.top)  * (canvas.height / r.height),
    }
  }

  const start = useCallback((e) => {
    e.preventDefault()
    const canvas = canvasRef.current; if (!canvas) return
    drawing.current = true
    lastPt.current = getPos(e, canvas)
  }, [canvasRef])

  const move = useCallback((e) => {
    e.preventDefault()
    if (!drawing.current) return
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')
    const pt  = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPt.current.x, lastPt.current.y)
    ctx.lineTo(pt.x, pt.y)
    ctx.strokeStyle = '#1a2e1a'
    ctx.lineWidth   = 2.5
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    ctx.stroke()
    lastPt.current = pt
  }, [canvasRef])

  const end   = useCallback(() => { drawing.current = false }, [])

  const clear = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
  }, [canvasRef])

  const isEmpty = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return true
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
    return !data.some(v => v !== 0)
  }, [canvasRef])

  const toDataURL = useCallback(() =>
    canvasRef.current?.toDataURL('image/png'), [canvasRef])

  return { start, move, end, clear, isEmpty, toDataURL }
}

/* ═══════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════ */
export default function JobDetailPage() {
  const { id }   = useParams()
  const navigate  = useNavigate()
  const { user, logout } = useAuth()

  /* ── state ── */
  const [job,           setJob]           = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState('')
  const [sidebarOpen,   setSidebarOpen]   = useState(false)
  const [toast,         setToast]         = useState(null)

  /* per-action loading — prevents one button blocking all others */
  const [startLoading,    setStartLoading]    = useState(false)
  const [completeLoading, setCompleteLoading] = useState(false)
  const [notesLoading,    setNotesLoading]    = useState(false)
  const [sigLoading,      setSigLoading]      = useState(false)

  const [editNotes, setEditNotes] = useState(false)
  const [notesVal,  setNotesVal]  = useState('')
  const [sigSaved,  setSigSaved]  = useState(false)

  /* observation modal */
  const [obsModal,  setObsModal]  = useState(false)
  const [obsForm,   setObsForm]   = useState({ pest_category:'rodent', severity:'low', location:'', count:'', notes:'' })
  const [obsSaving, setObsSaving] = useState(false)

  /* signature */
  const canvasRef = useRef(null)
  const sig = useSignaturePad(canvasRef)

  /* ── user display ── */
  const userName = user?.full_name || (user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : null) || user?.first_name || user?.username || 'Technician'
  const userInitials = userName.split(' ').filter(Boolean).map(p => p[0]).join('').toUpperCase().slice(0, 2) || 'T'

  /* ── toast helper ── */
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  /* ── fetch job ── */
  const fetchJob = useCallback(async () => {
    setError('')
    try {
      const res = await api.get(`/jobs/${id}/`)
      setJob(res.data)
      setNotesVal(res.data.technician_notes || res.data.notes || '')
      if (res.data.customer_signature) setSigSaved(true)
    } catch (e) {
      if (e.response?.status === 404) setError('Job not found.')
      else setError('Failed to load job details. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchJob() }, [fetchJob])

  /* ── resize canvas correctly after layout ── */
  useEffect(() => {
    if (!job) return
    // Use rAF to wait for the canvas to be visible and sized
    const raf = requestAnimationFrame(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      if (rect.width > 0) {
        canvas.width  = rect.width
        canvas.height = rect.height || 160
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [job])

  /* ── status helpers ── */
  const st          = job?.status || ''
  const canStart    = st === 'scheduled'
  const canComplete = st === 'in_progress'
  const isDone      = ['completed', 'report_sent', 'cancelled'].includes(st)

  /* ── START JOB ── */
  const handleStart = async () => {
    setStartLoading(true)
    try {
      // Try dedicated endpoint first, fall back to PATCH status
      try {
        await api.patch(`/jobs/${id}/start/`, {})
      } catch {
        await api.patch(`/jobs/${id}/`, { status: 'in_progress' })
      }
      showToast('Job started successfully.')
      await fetchJob()
    } catch (e) {
      showToast(e.response?.data?.error || e.response?.data?.detail || 'Could not start job. Try again.', 'error')
    } finally {
      setStartLoading(false)
    }
  }

  /* ── COMPLETE JOB ── */
  const handleComplete = async () => {
    setCompleteLoading(true)
    try {
      // Save signature silently if drawn but not yet saved
      if (!sigSaved && canvasRef.current && !sig.isEmpty()) {
        try {
          await api.patch(`/jobs/${id}/`, { customer_signature: sig.toDataURL() })
          setSigSaved(true)
        } catch { /* non-blocking */ }
      }
      // Try dedicated endpoint first, fall back to PATCH status
      try {
        await api.patch(`/jobs/${id}/complete/`, {})
      } catch {
        await api.patch(`/jobs/${id}/`, { status: 'completed' })
      }
      showToast('Job marked as complete! 🎉')
      await fetchJob()
    } catch (e) {
      showToast(e.response?.data?.error || e.response?.data?.detail || 'Could not complete job. Try again.', 'error')
    } finally {
      setCompleteLoading(false)
    }
  }

  /* ── NAVIGATE ── */
  const handleNavigate = () => {
  const addr = job?.customer_address || job?.address || ''

  console.log('Address:', addr)

  if (!addr) {
    showToast('No address available for navigation.', 'error')
    return
  }

  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`
  
  window.location.href = url // 🔥 more reliable than window.open
}
  /* ── SAVE NOTES ── */
  const handleSaveNotes = async () => {
    setNotesLoading(true)
    try {
      await api.patch(`/jobs/${id}/`, { technician_notes: notesVal })
      setEditNotes(false)
      showToast('Notes saved.')
      await fetchJob()
    } catch (e) {
      showToast(e.response?.data?.error || 'Could not save notes.', 'error')
    } finally {
      setNotesLoading(false)
    }
  }

  /* ── SAVE SIGNATURE ── */
  const handleSaveSignature = async () => {
  if (sig.isEmpty()) {
    showToast('Please draw a signature first.', 'error')
    return
  }

  setSigLoading(true)

  try {
    const dataURL = sig.toDataURL()

    console.log('Signature length:', dataURL.length)

    const res = await api.patch(`/jobs/${id}/`, {
      customer_signature: dataURL,
    })

    console.log('Signature response:', res.data)

    setSigSaved(true)
    showToast('Signature saved.')

  } catch (e) {
    console.error('SIGNATURE ERROR:', e.response?.data || e.message)
    showToast(
      e.response?.data?.detail ||
      'Could not save signature.',
      'error'
    )
  } finally {
    setSigLoading(false)
  }
}

  /* ── CLEAR SIGNATURE ── */
  const handleClearSig = () => {
    sig.clear()
    setSigSaved(false)
  }

  /* ── SUBMIT OBSERVATION ── */
  const handleObsSubmit = async () => {
  if (!obsForm.location.trim()) {
    showToast('Please enter a location/area.', 'error')
    return
  }

  setObsSaving(true)

  try {
    const payload = {
      pest_category: obsForm.pest_category,
      severity: obsForm.severity,
      location: obsForm.location,
      count: Number(obsForm.count) || 0,
      notes: obsForm.notes,
     
    }

    console.log('Sending Observation:', payload)

    const res = await api.post(`/jobs/${id}/observations/`, payload)

    console.log('Response:', res.data)

    showToast('Observation recorded.')
    setObsModal(false)
    setObsForm({ pest_category:'rodent', severity:'low', location:'', count:'', notes:'' })
    await fetchJob()

  } catch (e) {
    console.error('OBS ERROR:', e.response?.data || e.message)
    showToast(
      e.response?.data?.detail ||
      JSON.stringify(e.response?.data) ||
      'Could not save observation.',
      'error'
    )
  } finally {
    setObsSaving(false)
  }
}

  /* ── LOGOUT ── */
  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  /* ── NAV ── */
  const handleNav = (navId) => {
    setSidebarOpen(false)
    if (navId === 'dashboard') navigate('/technician')
    else if (navId === 'jobs') navigate('/technician/jobs')
    else navigate('/technician')
  }

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
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
              <div
                key={n.id}
                className={`jd-sb-item${n.id === 'jobs' ? ' active' : ''}`}
                onClick={() => handleNav(n.id)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d={n.d}/>
                </svg>
                {n.label}
              </div>
            ))}
          </nav>
          <div className="jd-sb-user">
            <div className="jd-sb-avatar">{userInitials}</div>
            <div style={{flex:1, minWidth:0}}>
              <div className="jd-sb-uname" style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {userName}
              </div>
              <div className="jd-sb-urole">Technician</div>
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

          {/* Topbar */}
          <div className="jd-topbar">
            <div className="jd-topbar-left">
              <button className="jd-hamburger" onClick={() => setSidebarOpen(o => !o)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              </button>
              <button className="jd-back-btn" onClick={() => navigate(-1)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
                </svg>
                Back
              </button>
              <span className="jd-crumb">My Jobs &nbsp;›&nbsp; <span>Job #{id}</span></span>
            </div>
          </div>

          {/* Content */}
          <div className="jd-content">

            {error && <div className="jd-error">{error} <button onClick={fetchJob} style={{marginLeft:8,background:'none',border:'none',color:'var(--red)',cursor:'pointer',textDecoration:'underline',fontFamily:'inherit',fontSize:'inherit'}}>Retry</button></div>}

            {loading ? (
              <div className="jd-loading">
                <div className="jd-spinner"/>
                Loading job details…
              </div>
            ) : job ? (
              <>
                {/* ── PAGE HEADER ── */}
                <div className="jd-page-hdr">
                  <div className="jd-page-hdr-left">
                    <div className="jd-job-id">Job #{job.id} · {fmtDate(job.scheduled_date)}</div>
                    <div className="jd-job-title">
                      {fmt(job.service_type || job.title || 'Service Job')}
                      {job.customer_name ? ` — ${job.customer_name}` : ''}
                    </div>
                    <div className="jd-status-row">
                      <span className={`jd-status ${st}`}>{fmt(st)}</span>
                      {job.scheduled_time && (
                        <span style={{fontSize:12, color:'var(--pale)'}}>⏰ {job.scheduled_time}</span>
                      )}
                    </div>
                  </div>

                  {/* ── ACTION BUTTONS ── */}
                  <div className="jd-actions">
                    {canStart && (
                      <button
                        className="jd-btn jd-btn-primary"
                        onClick={handleStart}
                        disabled={startLoading}
                      >
                        {startLoading
                          ? <><div className="jd-btn-spinner"/>Starting…</>
                          : <><svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z"/></svg>Start Job</>
                        }
                      </button>
                    )}

                    {canComplete && (
                      <button
                        className="jd-btn jd-btn-primary"
                        onClick={handleComplete}
                        disabled={completeLoading}
                      >
                        {completeLoading
                          ? <><div className="jd-btn-spinner"/>Completing…</>
                          : <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Complete Job</>
                        }
                      </button>
                    )}

                    {!isDone && (
                      <button
                        className="jd-btn jd-btn-amber"
                        onClick={() => setObsModal(true)}
                        disabled={startLoading || completeLoading}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                        </svg>
                        Add Observation
                      </button>
                    )}

                    <button className="jd-btn jd-btn-blue" onClick={handleNavigate}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                      Navigate
                    </button>
                  </div>
                </div>

                {/* ── TWO-COL GRID ── */}
                <div className="jd-grid">

                  {/* ── LEFT COLUMN ── */}
                  <div>

                    {/* Job Details */}
                    <div className="jd-card">
                      <div className="jd-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                        </svg>
                        Job Details
                      </div>
                      <div className="jd-info-grid">
                        <div className="jd-info-item">
                          <span className="jd-info-label">Service Type</span>
                          <span className="jd-info-val">{fmt(job.service_type || '—')}</span>
                        </div>
                        <div className="jd-info-item">
                          <span className="jd-info-label">Status</span>
                          <span className="jd-info-val">{fmt(st)}</span>
                        </div>
                        <div className="jd-info-item">
                          <span className="jd-info-label">Scheduled Date</span>
                          <span className="jd-info-val">{fmtDate(job.scheduled_date)}</span>
                        </div>
                        <div className="jd-info-item">
                          <span className="jd-info-label">Scheduled Time</span>
                          <span className="jd-info-val">{job.scheduled_time || fmtTime(job.scheduled_date)}</span>
                        </div>
                        <div className="jd-info-item">
                          <span className="jd-info-label">Assigned Technician</span>
                          <span className="jd-info-val">{job.technician_name || userName}</span>
                        </div>
                        <div className="jd-info-item">
                          <span className="jd-info-label">Job ID</span>
                          <span className="jd-info-val">#{job.id}</span>
                        </div>
                        {job.property_type && (
                          <div className="jd-info-item">
                            <span className="jd-info-label">Property Type</span>
                            <span className="jd-info-val">{fmt(job.property_type)}</span>
                          </div>
                        )}
                        {job.contract_type && (
                          <div className="jd-info-item">
                            <span className="jd-info-label">Contract Type</span>
                            <span className="jd-info-val">{fmt(job.contract_type)}</span>
                          </div>
                        )}
                      </div>

                      {(job.address || job.customer_address) && (
                        <>
                          <div className="jd-divider"/>
                          <div className="jd-info-item">
                            <span className="jd-info-label">Service Address</span>
                            <span className="jd-info-val">
                              {job.address || job.customer_address}
                              <br/>
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address || job.customer_address)}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{fontSize:12.5}}
                              >
                                Open in Maps →
                              </a>
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Observations */}
                    <div className="jd-card">
                      <div className="jd-card-title" style={{justifyContent:'space-between'}}>
                        <span style={{display:'flex', alignItems:'center', gap:8}}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                          </svg>
                          Observations
                          {job.observations?.length > 0 && (
                            <span style={{background:'var(--green-light)',color:'var(--green)',borderRadius:6,padding:'1px 7px',fontSize:11}}>
                              {job.observations.length}
                            </span>
                          )}
                        </span>
                        {!isDone && (
                          <button
                            className="jd-btn jd-btn-outline"
                            style={{padding:'5px 12px', fontSize:12}}
                            onClick={() => setObsModal(true)}
                          >
                            + Add
                          </button>
                        )}
                      </div>

                      {!job.observations || job.observations.length === 0 ? (
                        <div className="jd-empty-obs">No observations recorded yet.</div>
                      ) : (
                        job.observations.map((obs, i) => (
                          <div className="jd-obs-row" key={obs.id || i}>
                            <div className={`jd-obs-dot ${obs.severity === 'critical' ? 'critical' : obs.severity === 'high' ? 'warn' : ''}`}/>
                            <div className="jd-obs-body">
                              <div className="jd-obs-type">
                                {fmt(obs.pest_category || obs.pest_type || 'Observation')}
                                {obs.count ? ` · ${obs.count} counted` : ''}
                                {obs.location ? ` · ${obs.location}` : ''}
                              </div>
                              <div className="jd-obs-meta">
                                Severity: {fmt(obs.severity || 'low')} · {fmtDate(obs.created_at || obs.recorded_at)}
                              </div>
                              {obs.notes && <div className="jd-obs-note">"{obs.notes}"</div>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Past Visits */}
                    {job.past_visits && job.past_visits.length > 0 && (
                      <div className="jd-card">
                        <div className="jd-card-title">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          Past Visits ({job.past_visits.length})
                        </div>
                        {job.past_visits.map((v, i) => (
                          <div className="jd-visit-row" key={v.id || i}>
                            <span className="jd-visit-date">{fmtDate(v.date || v.scheduled_date)}</span>
                            <span className="jd-visit-type">{fmt(v.service_type || 'Service')}</span>
                            <span className={`jd-visit-badge ${v.status}`}>{fmt(v.status)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Technician Notes */}
                    <div className="jd-card">
                      <div className="jd-card-title" style={{justifyContent:'space-between'}}>
                        <span style={{display:'flex', alignItems:'center', gap:8}}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                          Technician Notes
                        </span>
                        {!editNotes && !isDone && (
                          <button
                            className="jd-btn jd-btn-outline"
                            style={{padding:'5px 12px', fontSize:12}}
                            onClick={() => setEditNotes(true)}
                          >
                            Edit
                          </button>
                        )}
                      </div>

                      {editNotes ? (
                        <>
                          <textarea
                            className="jd-notes-input"
                            value={notesVal}
                            onChange={e => setNotesVal(e.target.value)}
                            placeholder="Add your notes about this job…"
                            autoFocus
                          />
                          <div style={{display:'flex', gap:8, marginTop:10}}>
                            <button
                              className="jd-btn jd-btn-outline"
                              style={{fontSize:13, padding:'8px 16px'}}
                              onClick={() => { setEditNotes(false); setNotesVal(job.technician_notes || job.notes || '') }}
                            >
                              Cancel
                            </button>
                            <button
                              className="jd-btn jd-btn-primary"
                              style={{fontSize:13, padding:'8px 20px'}}
                              onClick={handleSaveNotes}
                              disabled={notesLoading}
                            >
                              {notesLoading ? <><div className="jd-btn-spinner"/>Saving…</> : 'Save Notes'}
                            </button>
                          </div>
                        </>
                      ) : (
                        <p className="jd-notes-text">
                          {notesVal || <span style={{color:'var(--pale)', fontStyle:'italic'}}>No notes added yet.</span>}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* ── RIGHT COLUMN ── */}
                  <div>

                    {/* Customer Info */}
                    <div className="jd-card">
                      <div className="jd-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                        </svg>
                        Customer
                      </div>
                      <div className="jd-customer-row">
                        <div className="jd-customer-av">
                          {job.customer_name?.[0]?.toUpperCase() || 'C'}
                        </div>
                        <div>
                          <div className="jd-customer-name">{job.customer_name || 'Unknown'}</div>
                          <div className="jd-customer-email">{job.customer_email || '—'}</div>
                        </div>
                      </div>

                      <div className="jd-info-grid" style={{marginBottom:12}}>
                        {job.customer_phone && (
                          <div className="jd-info-item">
                            <span className="jd-info-label">Phone</span>
                            <span className="jd-info-val">{job.customer_phone}</span>
                          </div>
                        )}
                        {(job.address || job.customer_address) && (
                          <div className="jd-info-item" style={{gridColumn:'1/-1'}}>
                            <span className="jd-info-label">Address</span>
                            <span className="jd-info-val">{job.address || job.customer_address}</span>
                          </div>
                        )}
                      </div>

                      <div className="jd-contact-btns">
                        {job.customer_phone && (
                          <a className="jd-contact-btn call" href={`tel:${job.customer_phone}`}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                            </svg>
                            Call
                          </a>
                        )}
                        <button className="jd-contact-btn maps" onClick={handleNavigate}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                          </svg>
                          Maps
                        </button>
                      </div>
                    </div>

                    {/* Customer Signature */}
                    <div className="jd-card">
                      <div className="jd-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                        </svg>
                        Customer Signature
                      </div>

                      {sigSaved ? (
                        <div className="jd-sig-done">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                          </svg>
                          Signature captured
                          {!isDone && (
                            <button
                              onClick={handleClearSig}
                              style={{marginLeft:'auto',background:'none',border:'none',color:'var(--pale)',cursor:'pointer',fontSize:12,fontFamily:'inherit'}}
                            >
                              Re-sign
                            </button>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="jd-sig-wrap">
                            <canvas
                              ref={canvasRef}
                              className="jd-sig-canvas"
                              onMouseDown={sig.start}
                              onMouseMove={sig.move}
                              onMouseUp={sig.end}
                              onMouseLeave={sig.end}
                              onTouchStart={sig.start}
                              onTouchMove={sig.move}
                              onTouchEnd={sig.end}
                            />
                          </div>
                          <p className="jd-sig-hint">Ask the customer to sign above</p>
                          <div className="jd-sig-actions">
                            <button className="jd-sig-clear-btn" onClick={handleClearSig}>Clear</button>
                            <button
                              className="jd-sig-save-btn"
                              onClick={handleSaveSignature}
                              disabled={sigLoading}
                            >
                              {sigLoading ? 'Saving…' : 'Save Signature'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Job Summary */}
                    <div className="jd-card">
                      <div className="jd-card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                        </svg>
                        Summary
                      </div>
                      <div style={{display:'flex', flexDirection:'column', gap:10}}>
                        {[
                          { label:'Observations', val: job.observations?.length ?? 0 },
                          { label:'Past Visits',  val: job.past_visits?.length ?? 0 },
                          { label:'Signature',    val: sigSaved ? 'Captured ✓' : 'Not yet' },
                          { label:'Notes',        val: notesVal ? 'Added' : 'None' },
                        ].map(r => (
                          <div
                            key={r.label}
                            style={{display:'flex', justifyContent:'space-between', fontSize:13.5, borderBottom:'1px solid #f5f7f5', paddingBottom:8}}
                          >
                            <span style={{color:'var(--muted)'}}>{r.label}</span>
                            <span style={{color: String(r.val).includes('✓') ? 'var(--green)' : 'var(--ink)'}}>{r.val}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* ── OBSERVATION MODAL ── */}
        {obsModal && (
          <div
            className="jd-modal-bg"
            onClick={e => { if (e.target === e.currentTarget) setObsModal(false) }}
          >
            <div className="jd-modal">
              <div className="jd-modal-title">Add Observation</div>
              <div className="jd-modal-sub">Record pest activity for Job #{id}</div>

              <div className="jd-modal-field">
                <label className="jd-modal-label">Pest Category</label>
                <select
                  className="jd-modal-select"
                  value={obsForm.pest_category}
                  onChange={e => setObsForm(f => ({...f, pest_category: e.target.value}))}
                >
                  {PEST_CATEGORIES.map(c => <option key={c} value={c}>{fmt(c)}</option>)}
                </select>
              </div>

              <div className="jd-modal-field">
                <label className="jd-modal-label">Severity</label>
                <select
                  className="jd-modal-select"
                  value={obsForm.severity}
                  onChange={e => setObsForm(f => ({...f, severity: e.target.value}))}
                >
                  {SEVERITY_OPTS.map(s => <option key={s} value={s}>{fmt(s)}</option>)}
                </select>
              </div>

              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
                <div className="jd-modal-field">
                  <label className="jd-modal-label">Location / Area *</label>
                  <input
                    className="jd-modal-input"
                    placeholder="e.g. Kitchen"
                    value={obsForm.location}
                    onChange={e => setObsForm(f => ({...f, location: e.target.value}))}
                  />
                </div>
                <div className="jd-modal-field">
                  <label className="jd-modal-label">Count</label>
                  <input
                    className="jd-modal-input"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={obsForm.count}
                    onChange={e => setObsForm(f => ({...f, count: e.target.value}))}
                  />
                </div>
              </div>

              <div className="jd-modal-field">
                <label className="jd-modal-label">Notes</label>
                <textarea
                  className="jd-modal-textarea"
                  placeholder="Additional details…"
                  value={obsForm.notes}
                  onChange={e => setObsForm(f => ({...f, notes: e.target.value}))}
                />
              </div>

              <div className="jd-modal-actions">
                <button className="jd-modal-cancel" onClick={() => setObsModal(false)}>
                  Cancel
                </button>
                <button
                  className="jd-modal-submit"
                  onClick={handleObsSubmit}
                  disabled={obsSaving}
                >
                  {obsSaving
                    ? <><div className="jd-btn-spinner"/>Saving…</>
                    : 'Save Observation'
                  }
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TOAST ── */}
        {toast && (
          <div className={`jd-toast ${toast.type}`}>
            {toast.type === 'success'
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            }
            {toast.msg}
          </div>
        )}
      </div>
    </>
  )
}