import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";

function fmt(dateStr, opts = {}) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const date = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
  return opts.timeOnly ? time : opts.dateOnly ? date : `${date}, ${time}`;
}
function cap(str) {
  if (!str) return "—";
  return str.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
function yesNo(val) { return val ? "Yes" : "No"; }

const css = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --green:#1a6b3c;--green-dark:#1a4d2e;--green-light:#edf6f1;
  --ink:#1a2e1a;--muted:#7a8c7a;--pale:#a0b0a0;
  --border:#e8ebe8;--bg:#f0f2f0;--white:#fff;
  --red:#e74c3c;--amber:#e6a817;--blue:#3b82f6;
}
body{background:var(--bg);}
.rr-wrap{font-family:'DM Serif Display',serif;max-width:900px;margin:0 auto;padding:24px 16px 60px;}
.rr-back{display:inline-flex;align-items:center;gap:6px;background:var(--white);
  border:1.5px solid var(--border);border-radius:9px;padding:8px 16px;
  font-family:'DM Serif Display',serif;font-size:13px;color:var(--muted);
  cursor:pointer;margin-bottom:20px;transition:background .15s;}
.rr-back:hover{background:#e2e8e2;color:var(--ink);}
.rr-back svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;}
.rr-card{background:var(--white);border-radius:16px;box-shadow:0 2px 16px rgba(0,0,0,.07);overflow:hidden;margin-bottom:20px;}

/* HEADER */
.rr-header{background:var(--green);padding:28px 32px;display:flex;justify-content:space-between;align-items:flex-start;}
.rr-logo-row{display:flex;align-items:center;gap:10px;margin-bottom:6px;}
.rr-logo-box{width:34px;height:34px;background:rgba(255,255,255,.2);border-radius:8px;
  display:flex;align-items:center;justify-content:center;}
.rr-logo-box svg{width:18px;height:18px;fill:white;}
.rr-company{font-size:20px;color:#fff;}
.rr-company-sub{font-size:11px;color:rgba(255,255,255,.7);}
.rr-header-right{text-align:right;}
.rr-report-title{font-size:24px;color:#fff;margin-bottom:6px;}
.rr-report-meta{font-size:11px;color:rgba(255,255,255,.75);line-height:2;}
.rr-report-meta span{color:#fff;}

/* STATUS CHIP */
.rr-chip{display:inline-flex;align-items:center;gap:5px;padding:3px 12px;border-radius:20px;font-size:11px;}
.rr-chip.completed,.rr-chip.report_sent{background:var(--green-light);color:var(--green);}
.rr-chip.in_progress{background:#eff6ff;color:var(--blue);}
.rr-chip.scheduled{background:#fff8ec;color:var(--amber);}
.rr-chip-dot{width:6px;height:6px;border-radius:50%;background:currentColor;}

/* SUMMARY GRID */
.rr-summary{padding:20px 32px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;border-bottom:1px solid var(--border);}
.rr-sum-cell{background:var(--bg);border-radius:10px;padding:12px 14px;}
.rr-sum-label{font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:var(--pale);margin-bottom:5px;}
.rr-sum-val{font-size:13.5px;color:var(--ink);}
.rr-sum-val.green{color:var(--green);}
.rr-sum-val.amber{color:var(--amber);}
.rr-sum-val.red{color:var(--red);}

/* SECTION */
.rr-section{padding:24px 32px;border-bottom:1px solid var(--border);}
.rr-section:last-child{border-bottom:none;}
.rr-section-title{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--pale);
  margin-bottom:16px;display:flex;align-items:center;gap:8px;}
.rr-section-title::after{content:'';flex:1;height:1px;background:var(--border);}

/* INFO ROWS */
.rr-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;}
.rr-info-row{display:flex;justify-content:space-between;align-items:flex-start;
  padding:9px 0;border-bottom:1px solid #f5f7f5;font-size:12.5px;gap:16px;}
.rr-info-row:last-child{border-bottom:none;}
.rr-info-row.full{grid-column:1/-1;}
.rr-info-label{color:var(--muted);flex-shrink:0;}
.rr-info-val{color:var(--ink);text-align:right;}

/* OBSERVATION CARD */
.rr-obs{border:1px solid var(--border);border-radius:12px;margin-bottom:14px;overflow:hidden;}
.rr-obs:last-child{margin-bottom:0;}
.rr-obs-head{background:var(--green);padding:12px 18px;display:flex;justify-content:space-between;align-items:center;}
.rr-obs-head-title{font-size:14px;color:#fff;}
.rr-obs-head-badge{font-size:10px;background:rgba(255,255,255,.2);color:#fff;padding:2px 10px;border-radius:20px;}
.rr-obs-body{padding:16px 18px;}
.rr-obs-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px;}
.rr-obs-field-label{font-size:9px;text-transform:uppercase;letter-spacing:.6px;color:var(--pale);margin-bottom:3px;}
.rr-obs-field-val{font-size:12.5px;color:var(--ink);}
.rr-obs-field-val.yes{color:var(--green);}
.rr-obs-field-val.no{color:var(--red);}
.rr-obs-field-val.warn{color:var(--amber);}
.rr-detail-box{background:var(--bg);border-radius:8px;padding:12px 14px;margin-top:10px;}
.rr-detail-title{font-size:9px;text-transform:uppercase;letter-spacing:.7px;color:var(--pale);margin-bottom:10px;}
.rr-detail-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;}
.rr-detail-row{font-size:12px;display:flex;justify-content:space-between;
  padding:6px 0;border-bottom:1px solid var(--border);}
.rr-detail-row:last-child{border-bottom:none;}
.rr-detail-key{color:var(--muted);}
.rr-detail-val{color:var(--ink);text-align:right;}
.rr-detail-val.yes{color:var(--green);}
.rr-detail-val.no{color:var(--red);}
.rr-obs-photo{width:100%;max-height:200px;object-fit:cover;border-radius:8px;margin-top:12px;cursor:pointer;}
.rr-obs-notes{background:#fff8ec;border-left:3px solid var(--amber);
  padding:10px 14px;border-radius:0 8px 8px 0;font-size:12px;color:var(--muted);
  margin-top:10px;line-height:1.6;}
.rr-severity{display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;}
.rr-severity.high,.rr-severity.severe{background:#fde8e8;color:var(--red);}
.rr-severity.medium,.rr-severity.moderate{background:#fff8ec;color:var(--amber);}
.rr-severity.low,.rr-severity.minor{background:var(--green-light);color:var(--green);}
.rr-severity.none{background:var(--bg);color:var(--muted);}

/* ALERTS */
.rr-alert{display:flex;align-items:flex-start;gap:12px;padding:12px 14px;
  border-radius:10px;background:#fff8ec;border-left:3px solid var(--amber);margin-bottom:8px;}
.rr-alert-dot{width:8px;height:8px;border-radius:50%;background:var(--amber);flex-shrink:0;margin-top:4px;}
.rr-alert-title{font-size:13px;color:var(--ink);margin-bottom:2px;}
.rr-alert-msg{font-size:12px;color:var(--muted);}
.rr-alert-type{font-size:10px;color:var(--amber);margin-left:auto;flex-shrink:0;}

/* SIGNATURE */
.rr-sig-box{border:1.5px solid var(--border);border-radius:12px;padding:20px 24px;
  display:flex;justify-content:space-between;align-items:center;gap:20px;}
.rr-sig-label{font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:var(--pale);margin-bottom:8px;}
.rr-sig-img{max-height:80px;max-width:280px;border:1px solid var(--border);
  border-radius:8px;padding:8px;background:#fafbfa;}
.rr-sig-verified{background:var(--green-light);color:var(--green);padding:8px 20px;
  border-radius:20px;font-size:12px;white-space:nowrap;}
.rr-sig-date{font-size:11px;color:var(--muted);margin-top:4px;}

/* DOWNLOAD */
.rr-download-bar{display:flex;align-items:center;justify-content:space-between;
  background:var(--green-light);border-radius:10px;padding:14px 18px;margin-bottom:8px;}
.rr-download-info{font-size:13px;color:var(--green);}
.rr-download-sub{font-size:11px;color:var(--muted);margin-top:2px;}
.rr-download-btn{background:var(--green);color:#fff;border:none;border-radius:8px;
  padding:9px 20px;font-family:'DM Serif Display',serif;font-size:13px;
  cursor:pointer;display:flex;align-items:center;gap:6px;text-decoration:none;}
.rr-download-btn:hover{background:#155a32;}
.rr-download-btn svg{width:14px;height:14px;stroke:#fff;fill:none;stroke-width:2;}

/* FOOTER */
.rr-footer{padding:20px 32px;display:flex;justify-content:space-between;
  align-items:center;background:var(--bg);}
.rr-footer-brand{font-size:14px;color:var(--green);margin-bottom:3px;}
.rr-footer-sub{font-size:11px;color:var(--pale);}
.rr-footer-right{text-align:right;font-size:11px;color:var(--pale);}

/* NO DATA */
.rr-empty{text-align:center;padding:24px;color:var(--pale);font-size:13px;
  font-style:italic;background:var(--bg);border-radius:10px;}

/* LOADING / ERROR */
.rr-loading{display:flex;align-items:center;justify-content:center;
  padding:80px;color:var(--pale);font-size:14px;gap:12px;}
.rr-spinner{width:22px;height:22px;border:2px solid var(--border);
  border-top-color:var(--green);border-radius:50%;animation:spin .8s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}
.rr-error{max-width:900px;margin:32px auto;background:#fde8e8;
  color:var(--red);padding:16px 20px;border-radius:12px;font-size:13px;}

/* LIGHTBOX */
.rr-lightbox{position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:900;
  display:flex;align-items:center;justify-content:center;padding:20px;cursor:pointer;}
.rr-lightbox img{max-width:100%;max-height:90vh;border-radius:8px;}

@media(max-width:700px){
  .rr-header{padding:20px;flex-direction:column;gap:16px;}
  .rr-header-right{text-align:left;}
  .rr-summary{grid-template-columns:1fr 1fr;padding:16px;}
  .rr-section{padding:16px;}
  .rr-obs-grid,.rr-detail-grid{grid-template-columns:1fr 1fr;}
  .rr-info-grid{grid-template-columns:1fr;}
}
@media print{
  .rr-back,.rr-download-bar{display:none!important;}
  body{background:white;}
}
`;

function SField({ label, value, cls }) {
  return (
    <div>
      <div className="rr-obs-field-label">{label}</div>
      <div className={`rr-obs-field-val ${cls || ""}`}>{value ?? "—"}</div>
    </div>
  );
}

function DRow({ label, value, cls }) {
  return (
    <div className="rr-detail-row">
      <span className="rr-detail-key">{label}</span>
      <span className={`rr-detail-val ${cls || ""}`}>{value ?? "—"}</span>
    </div>
  );
}

function ObsCard({ obs, index, onPhoto }) {
  const cat = obs.observation_category;
  const r = obs.rodent_detail;
  const f = obs.flying_insect_detail;
  const c = obs.cockroach_detail;
  const t = obs.termite_detail;
  const m = obs.mosquito_detail;
  const g = obs.general_detail;

  const photo = r?.photo_evidence || f?.photo_evidence ||
    c?.photo_evidence || t?.photo_evidence ||
    m?.photo_evidence || g?.photo_evidence;

  const remarks = r?.technician_remarks || f?.technician_remarks ||
    c?.technician_remarks || t?.technician_remarks ||
    m?.technician_remarks || g?.technician_remarks || obs.notes;

  return (
    <div className="rr-obs">
      <div className="rr-obs-head">
        <span className="rr-obs-head-title">
          Observation #{index + 1} — {cap(cat)}
          {obs.pest_type && obs.pest_type !== cap(cat) ? ` (${obs.pest_type})` : ""}
        </span>
        <span className="rr-obs-head-badge">
          <span className={`rr-severity ${obs.severity || "none"}`}>{cap(obs.severity) || "—"}</span>
        </span>
      </div>
      <div className="rr-obs-body">

        {/* Top summary row */}
        <div className="rr-obs-grid">
          <SField label="Area / Location" value={obs.area} />
          <SField label="Recorded At"
            value={obs.observation_time
              ? new Date(obs.observation_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
              : "—"} />
          <SField label="Recorded By" value={obs.recorded_by} />
        </div>

        {/* ── RODENT DETAIL ── */}
        {r && (
          <div className="rr-detail-box">
            <div className="rr-detail-title">Rodent Inspection Details</div>
            <DRow label="Box ID" value={r.rodent_box_id} />
            <DRow label="Location" value={r.location} />
            <DRow label="Rats Found" value={r.rats_found_count} />
            <DRow label="Activity Level" value={cap(r.activity_level)} />
            <DRow label="Bait Consumed" value={yesNo(r.bait_consumed)}
              cls={r.bait_consumed ? "warn" : "yes"} />
            <DRow label="Bait Replaced" value={yesNo(r.bait_replaced)}
              cls={r.bait_replaced ? "yes" : "no"} />
            <DRow label="Droppings Observed" value={yesNo(r.droppings_observed)}
              cls={r.droppings_observed ? "warn" : ""} />
            <DRow label="Gnaw Marks" value={yesNo(r.gnaw_marks)}
              cls={r.gnaw_marks ? "warn" : ""} />
          </div>
        )}

        {/* ── FLYING INSECT DETAIL ── */}
        {f && (
          <div className="rr-detail-box">
            <div className="rr-detail-title">Flying Insect Inspection Details</div>
            <DRow label="Machine ID" value={f.machine_id} />
            <DRow label="Machine Location" value={f.machine_location} />
            <DRow label="Insects Trapped" value={f.insect_count} />
            <DRow label="Insect Types"
              value={Array.isArray(f.insect_types) ? f.insect_types.join(", ") : f.insect_types} />
            <DRow label="Glue Board Changed" value={yesNo(f.glue_board_changed)}
              cls={f.glue_board_changed ? "yes" : "no"} />
            <DRow label="Glue Board Condition" value={cap(f.glue_board_condition)} />
            <DRow label="Machine Functional" value={yesNo(f.machine_functional)}
              cls={f.machine_functional ? "yes" : "no"} />
            <DRow label="Action Taken" value={f.action_taken} />
          </div>
        )}

        {/* ── COCKROACH DETAIL ── */}
        {c && (
          <div className="rr-detail-box">
            <div className="rr-detail-title">Cockroach Inspection Details</div>
            <DRow label="Station ID" value={c.station_id} />
            <DRow label="Location" value={c.location} />
            <DRow label="Cockroaches Found" value={c.cockroaches_found} />
            <DRow label="Activity Level" value={cap(c.infestation_level)} />
            <DRow label="Infestation Area" value={c.infestation_area} />
            <DRow label="Gel Applied" value={yesNo(c.gel_applied)}
              cls={c.gel_applied ? "yes" : ""} />
            <DRow label="Gel Consumed" value={yesNo(c.gel_consumed)}
              cls={c.gel_consumed ? "warn" : ""} />
          </div>
        )}

        {/* ── TERMITE DETAIL ── */}
        {t && (
          <div className="rr-detail-box">
            <div className="rr-detail-title">Termite Inspection Details</div>
            <DRow label="Station ID" value={t.station_id} />
            <DRow label="Location" value={t.station_location} />
            <DRow label="Termites Found" value={yesNo(t.termites_found)}
              cls={t.termites_found ? "no" : "yes"} />
            <DRow label="Mud Tubes Found" value={yesNo(t.mud_tubes_found)}
              cls={t.mud_tubes_found ? "warn" : ""} />
            <DRow label="Wood Damage" value={yesNo(t.wood_damage)}
              cls={t.wood_damage ? "no" : ""} />
            <DRow label="Damage Severity" value={cap(t.damage_severity)} />
            <DRow label="Bait Consumed" value={yesNo(t.bait_consumed)}
              cls={t.bait_consumed ? "warn" : ""} />
            <DRow label="Bait Replaced" value={yesNo(t.bait_replaced)}
              cls={t.bait_replaced ? "yes" : ""} />
          </div>
        )}

        {/* ── MOSQUITO DETAIL ── */}
        {m && (
          <div className="rr-detail-box">
            <div className="rr-detail-title">Mosquito Treatment Details</div>
            <DRow label="Treatment Area" value={m.treatment_area} />
            <DRow label="Adult Density" value={cap(m.adult_mosquito_density)} />
            <DRow label="Fogging Done" value={yesNo(m.fogging_done)}
              cls={m.fogging_done ? "yes" : ""} />
            <DRow label="Chemical Used" value={m.chemical_used || "—"} />
            <DRow label="Breeding Sites Found" value={m.breeding_sites_found} />
            <DRow label="Breeding Sites Eliminated" value={m.breeding_sites_eliminated} />
            <DRow label="Larval Activity" value={yesNo(m.larval_activity)}
              cls={m.larval_activity ? "warn" : ""} />
          </div>
        )}

        {/* ── GENERAL DETAIL ── */}
        {g && (
          <div className="rr-detail-box">
            <div className="rr-detail-title">General Pest Details</div>
            <DRow label="Pest Type" value={g.pest_type_observed} />
            <DRow label="Location" value={g.location} />
            <DRow label="Pest Count" value={g.pest_count} />
            <DRow label="Activity Level" value={cap(g.activity_level)} />
            <DRow label="Treatment Applied" value={yesNo(g.treatment_applied)}
              cls={g.treatment_applied ? "yes" : ""} />
            <DRow label="Treatment Description" value={g.treatment_description || "—"} />
            {g.recommended_action && (
              <DRow label="Recommended Action" value={g.recommended_action} />
            )}
          </div>
        )}

        {/* Remarks */}
        {remarks && (
          <div className="rr-obs-notes">
            <strong>Technician Remarks:</strong> {remarks}
          </div>
        )}

        {/* Photo */}
        {photo && (
          <img src={photo} alt="Evidence" className="rr-obs-photo"
            onClick={() => onPhoto(photo)} />
        )}
      </div>
    </div>
  );
}

export default function AdminReportDetailPage({ jobId: jobIdProp, onClose: onCloseProp }) {
  const { id }   = useParams();
  const navigate = useNavigate();

  const jobId  = jobIdProp ?? id;
  const onClose = onCloseProp ?? (() => navigate("/dashboard/reports"));

  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [lightbox,  setLightbox]  = useState(null);

  useEffect(() => {
    if (!jobId) { setError("No job ID provided."); setLoading(false); return; }
    setLoading(true); setError("");
    api.get(`/pdf/job/${jobId}/`)
      .then(res => setData(res.data?.data ?? res.data))
      .catch(err => setError(
        err.response?.data?.error || err.response?.data?.detail ||
        "Failed to load report. Please try again."
      ))
      .finally(() => setLoading(false));
  }, [jobId]);

  if (loading) return (
    <><style>{css}</style>
      <div className="rr-loading"><div className="rr-spinner"/>Loading report for Job #{jobId}…</div>
    </>
  );

  if (error || !data) return (
    <><style>{css}</style>
      <div className="rr-wrap">
        <button className="rr-back" onClick={onClose}>
          <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          Back to Reports
        </button>
        <div className="rr-error">{error || "No report data available."}</div>
      </div>
    </>
  );

  const { job, customer, technician, observations = [], alerts = [], report } = data;

  const customerName =
    customer?.name ||
    (customer?.first_name ? `${customer.first_name} ${customer.last_name || ""}`.trim() : null) ||
    customer?.username || "Unknown Customer";

  const techName = technician
    ? (technician.first_name
        ? `${technician.first_name} ${technician.last_name || ""}`.trim()
        : technician.username)
    : null;

  const statusColor =
    ["completed", "report_sent"].includes(job?.status) ? "completed"
    : job?.status === "in_progress" ? "in_progress"
    : "scheduled";

  const isBase64Sig = job?.signed_by?.startsWith("data:image");

  return (
    <><style>{css}</style>
      <div className="rr-wrap">

        {/* BACK */}
        <button className="rr-back" onClick={onClose}>
          <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          Back to Reports
        </button>

        <div className="rr-card">

          {/* ── HEADER ── */}
          <div className="rr-header">
            <div>
              <div className="rr-logo-row">
                <div className="rr-logo-box">
                  <svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/></svg>
                </div>
                <span className="rr-company">PestPro</span>
              </div>
              <div className="rr-company-sub">Professional Pest Control Services</div>
            </div>
            <div className="rr-header-right">
              <div className="rr-report-title">Service Report</div>
              <div className="rr-report-meta">
                Job ID &nbsp;<span>#{job?.id}</span><br/>
                Customer &nbsp;<span>{customerName}</span><br/>
                Generated &nbsp;<span>{new Date().toLocaleDateString("en-IN", {day:"2-digit",month:"short",year:"numeric"})}</span><br/>
                {job?.job_uuid && <>UUID &nbsp;<span style={{fontSize:10}}>{job.job_uuid}</span></>}
              </div>
            </div>
          </div>

          {/* ── JOB SUMMARY ── */}
          <div className="rr-summary">
            <div className="rr-sum-cell">
              <div className="rr-sum-label">Status</div>
              <div className={`rr-chip ${statusColor}`}>
                <span className="rr-chip-dot"/>
                {cap(job?.status)}
              </div>
            </div>
            <div className="rr-sum-cell">
              <div className="rr-sum-label">Service Type</div>
              <div className="rr-sum-val">{cap(job?.service_type)}</div>
            </div>
            <div className="rr-sum-cell">
              <div className="rr-sum-label">Customer</div>
              <div className="rr-sum-val">{customerName}</div>
            </div>
            <div className="rr-sum-cell">
              <div className="rr-sum-label">Scheduled</div>
              <div className="rr-sum-val muted" style={{color:"var(--muted)"}}>{fmt(job?.scheduled_datetime)}</div>
            </div>
            <div className="rr-sum-cell">
              <div className="rr-sum-label">Completed</div>
              <div className="rr-sum-val green">{fmt(job?.completed_at)}</div>
            </div>
            <div className="rr-sum-cell">
              <div className="rr-sum-label">Site Address</div>
              <div className="rr-sum-val muted" style={{color:"var(--muted)",fontSize:12}}>{job?.site_address || "—"}</div>
            </div>
          </div>

          {/* ── DOWNLOAD PDF ── */}
          {report?.report_file && (
            <div className="rr-section" style={{paddingBottom:16}}>
              <div className="rr-download-bar">
                <div>
                  <div className="rr-download-info">PDF Report Ready</div>
                  <div className="rr-download-sub">
                    {report.file_size_kb} KB ·
                    {report.is_expired
                      ? " Link expired — regenerate from Reports page"
                      : ` Expires ${fmt(report.token_expires_at, {dateOnly:true})}`}
                  </div>
                </div>
                {!report.is_expired && (
                  <a href={report.report_file} target="_blank" rel="noopener noreferrer"
                    className="rr-download-btn">
                    <svg viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                    </svg>
                    Download PDF
                  </a>
                )}
              </div>
            </div>
          )}

          {/* ── CUSTOMER DETAILS ── */}
          <div className="rr-section">
            <div className="rr-section-title">Customer Details</div>
            <div className="rr-info-grid">
              <div className="rr-info-row"><span className="rr-info-label">Full Name</span><span className="rr-info-val">{customerName}</span></div>
              <div className="rr-info-row"><span className="rr-info-label">Email</span><span className="rr-info-val">{customer?.email || "—"}</span></div>
              <div className="rr-info-row"><span className="rr-info-label">Phone</span><span className="rr-info-val">{customer?.phone || "—"}</span></div>
              <div className="rr-info-row"><span className="rr-info-label">Company</span><span className="rr-info-val">{customer?.company_name || "—"}</span></div>
              <div className="rr-info-row full"><span className="rr-info-label">Address</span>
                <span className="rr-info-val">
                  {customer?.address ? `${customer.address}${customer.city ? ", " + customer.city : ""}` : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* ── TECHNICIAN DETAILS ── */}
          <div className="rr-section">
            <div className="rr-section-title">Assigned Technician</div>
            {techName ? (
              <div className="rr-info-grid">
                <div className="rr-info-row"><span className="rr-info-label">Name</span><span className="rr-info-val">{techName}</span></div>
                <div className="rr-info-row"><span className="rr-info-label">Email</span><span className="rr-info-val">{technician?.email || "—"}</span></div>
                <div className="rr-info-row"><span className="rr-info-label">Phone</span><span className="rr-info-val">{technician?.phone || "—"}</span></div>
                <div className="rr-info-row"><span className="rr-info-label">Username</span><span className="rr-info-val">@{technician?.username}</span></div>
              </div>
            ) : (
              <div className="rr-empty">No technician assigned.</div>
            )}
          </div>

          {/* ── OBSERVATIONS ── */}
          <div className="rr-section">
            <div className="rr-section-title">
              Service Observations
              {observations.length > 0 && (
                <span style={{background:"var(--green-light)",color:"var(--green)",
                  borderRadius:6,padding:"1px 8px",fontSize:11,marginLeft:4}}>
                  {observations.length}
                </span>
              )}
            </div>
            {observations.length > 0
              ? observations.map((obs, i) => (
                  <ObsCard key={obs.id || i} obs={obs} index={i} onPhoto={setLightbox}/>
                ))
              : <div className="rr-empty">No observations recorded for this job.</div>
            }
          </div>

          {/* ── ACTIVE ALERTS ── */}
          {alerts.length > 0 && (
            <div className="rr-section">
              <div className="rr-section-title">Smart Alerts</div>
              {alerts.map((a, i) => (
                <div key={i} className="rr-alert">
                  <div className="rr-alert-dot"/>
                  <div>
                    <div className="rr-alert-title">{a.title}</div>
                    <div className="rr-alert-msg">{a.message}</div>
                  </div>
                  <div className="rr-alert-type">{cap(a.alert_type)} · {cap(a.priority)}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── DIGITAL SIGNATURE ── */}
          <div className="rr-section">
            <div className="rr-section-title">Digital Signature</div>
            {job?.signed_by ? (
              <div className="rr-sig-box">
                <div>
                  <div className="rr-sig-label">Customer / Technician Signature</div>
                  {isBase64Sig
                    ? <img src={job.signed_by} alt="Signature" className="rr-sig-img"/>
                    : <div style={{fontSize:14,color:"var(--ink)",fontStyle:"italic"}}>{job.signed_by}</div>
                  }
                  <div className="rr-sig-date">
                    Signed on {fmt(job.completed_at)}
                  </div>
                </div>
                <div className="rr-sig-verified">✓ Digitally Verified</div>
              </div>
            ) : (
              <div className="rr-empty">No digital signature recorded.</div>
            )}
          </div>

          {/* ── FOOTER ── */}
          <div className="rr-footer">
            <div>
              <div className="rr-footer-brand">PestPro</div>
              <div className="rr-footer-sub">Professional Pest Control Services<br/>System-generated report</div>
            </div>
            <div className="rr-footer-right">
              {customerName} · Job #{job?.id}<br/>
              {new Date().toLocaleDateString("en-IN", {day:"2-digit",month:"short",year:"numeric"})}<br/>
              {job?.job_uuid && <span style={{color:"var(--green)",fontSize:10}}>{job.job_uuid}</span>}
            </div>
          </div>

        </div>
      </div>

      {/* PHOTO LIGHTBOX */}
      {lightbox && (
        <div className="rr-lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Evidence"/>
        </div>
      )}
    </>
  );
}