// REPLACE with these:
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(dateStr, opts = {}) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const date = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", ...opts });
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
  return opts.timeOnly ? time : opts.dateOnly ? date : `${date}, ${time}`;
}
function title(str) {
  if (!str) return "—";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --green:       #1a6b3c;
    --green-dark:  #1a4d2e;
    --green-light: #edf6f1;
    --ink:         #1a2e1a;
    --muted:       #7a8c7a;
    --pale:        #a0b0a0;
    --border:      #e8ebe8;
    --bg:          #f0f2f0;
    --white:       #fff;
    --red:         #e74c3c;
    --amber:       #e6a817;
    --blue:        #3b82f6;
  }

  .report-root {
    font-family: 'DM Serif Display', serif;
    font-size: 13px;
    color: var(--ink);
    background: var(--white);
    padding: 36px 44px;
    line-height: 1.5;
    max-width: 860px;
    margin: 0 auto;
  }

  /* BACK BUTTON */
  .report-back-bar { max-width:860px; margin: 0 auto 16px; }
  .report-back-btn {
    background: var(--bg); border: 1.5px solid var(--border); border-radius: 9px;
    padding: 8px 16px; font-family: 'DM Serif Display', serif; font-size: 13px;
    color: var(--muted); cursor: pointer; display: inline-flex; align-items: center;
    gap: 6px; transition: background .15s, color .15s;
  }
  .report-back-btn:hover { background: #e2e8e2; color: var(--ink); }
  .report-back-btn svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2; }

  /* LOADING / ERROR */
  .report-loading { display: flex; align-items: center; justify-content: center; padding: 80px 20px; color: var(--pale); font-size: 14px; gap: 12px; }
  .report-spinner { width: 22px; height: 22px; border: 2px solid var(--border); border-top-color: var(--green); border-radius: 50%; animation: reportSpin .8s linear infinite; }
  @keyframes reportSpin { to { transform: rotate(360deg); } }
  .report-error-box { max-width: 860px; margin: 32px auto; background: #fde8e8; color: var(--red); padding: 16px 20px; border-radius: 12px; font-size: 13px; }

  /* HEADER */
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; padding-bottom:20px; border-bottom:2px solid var(--green); }
  .logo-row { display:flex; align-items:center; gap:10px; margin-bottom:6px; }
  .logo-box { width:32px; height:32px; background:var(--green); border-radius:8px; display:flex; align-items:center; justify-content:center; }
  .logo-box svg { width:18px; height:18px; fill:white; }
  .company-name { font-size:20px; color:var(--ink); }
  .company-sub { font-size:11px; color:var(--muted); margin-top:2px; }
  .header-right { text-align:right; }
  .report-title { font-size:22px; color:var(--green); margin-bottom:4px; }
  .report-meta { font-size:11px; color:var(--pale); line-height:1.8; }
  .report-meta span { color:var(--muted); }

  /* SECTION TITLE */
  .section-title { font-size:10px; text-transform:uppercase; letter-spacing:1px; color:var(--pale); margin-bottom:10px; margin-top:24px; display:flex; align-items:center; gap:8px; }
  .section-title::after { content:''; flex:1; height:1px; background:var(--border); }

  /* META GRID */
  .meta-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:8px; }
  .meta-cell { background:var(--bg); border-radius:10px; padding:10px 14px; }
  .meta-label { font-size:9px; text-transform:uppercase; letter-spacing:.7px; color:var(--pale); margin-bottom:4px; }
  .meta-value { font-size:13px; color:var(--ink); }
  .meta-value.muted { color:var(--muted); }
  .meta-value.green { color:var(--green); }
  .meta-value.amber { color:var(--amber); }
  .meta-value.red   { color:var(--red); }
  .meta-value.small { font-size:10px; }

  /* INFO CARD */
  .info-card { border:1px solid var(--border); border-radius:12px; overflow:hidden; margin-bottom:14px; }
  .info-card-header { background:var(--green-light); padding:10px 16px; font-size:11px; color:var(--green); text-transform:uppercase; letter-spacing:.7px; }
  .info-card-body { padding:14px 16px; }
  .info-row { display:flex; justify-content:space-between; align-items:center; padding:7px 0; border-bottom:1px solid var(--border); font-size:12.5px; }
  .info-row:last-child { border-bottom:none; }
  .info-row-label { color:var(--muted); }
  .info-row-val { color:var(--ink); text-align:right; }

  /* OBS CARD */
  .obs-card { border:1px solid var(--border); border-radius:12px; margin-bottom:12px; overflow:hidden; }
  .obs-header { background:var(--green); color:white; padding:10px 16px; display:flex; justify-content:space-between; align-items:center; }
  .obs-header-title { font-size:13px; }
  .obs-header-badge { font-size:10px; background:rgba(255,255,255,.2); padding:2px 10px; border-radius:20px; }
  .obs-body { padding:14px 16px; }
  .obs-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:10px; }
  .obs-field-label { font-size:9px; text-transform:uppercase; letter-spacing:.6px; color:var(--pale); margin-bottom:3px; }
  .obs-field-val { font-size:12.5px; color:var(--ink); }
  .obs-notes { background:var(--bg); border-radius:8px; padding:10px 14px; font-size:12px; color:var(--muted); line-height:1.6; margin-top:8px; margin-bottom:8px; }
  .obs-notes-label { font-size:9px; text-transform:uppercase; letter-spacing:.6px; color:var(--pale); margin-bottom:4px; }

  /* SIGNATURE */
  .signature-box { border:1.5px solid var(--border); border-radius:12px; padding:18px 20px; display:flex; justify-content:space-between; align-items:center; margin-top:8px; }
  .signature-label { font-size:10px; text-transform:uppercase; letter-spacing:.7px; color:var(--pale); margin-bottom:6px; }
  .signature-name { font-size:16px; color:var(--ink); font-style:italic; margin-bottom:3px; }
  .signature-date { font-size:11px; color:var(--muted); }
  .signature-verified { background:var(--green-light); color:var(--green); padding:6px 16px; border-radius:20px; font-size:12px; }

  /* ALERT */
  .alert-row { display:flex; align-items:center; gap:12px; padding:10px 14px; border-radius:10px; background:#fff8ec; border-left:3px solid var(--amber); margin-bottom:8px; font-size:12.5px; }
  .alert-dot { width:8px; height:8px; border-radius:50%; background:var(--amber); flex-shrink:0; }
  .alert-text { color:var(--ink); flex:1; }
  .alert-type { font-size:10px; color:var(--amber); }

  /* NO DATA */
  .no-data { text-align:center; padding:24px; color:var(--pale); font-size:13px; font-style:italic; background:var(--bg); border-radius:10px; }

  /* FOOTER */
  .footer { margin-top:36px; padding-top:16px; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; }
  .footer-left, .footer-right { font-size:11px; color:var(--pale); line-height:1.8; }
  .footer-right { text-align:right; }
  .footer-brand { font-size:13px; color:var(--green); margin-bottom:2px; }

  /* PRINT */
  @media print {
    .report-back-bar { display: none !important; }
    .report-root { padding:20px; }
  }
`;

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionTitle({ children }) {
  return <div className="section-title">{children}</div>;
}

function MetaCell({ label, value, color, small }) {
  return (
    <div className="meta-cell">
      <div className="meta-label">{label}</div>
      <div className={`meta-value ${color || ""} ${small ? "small" : ""}`}>{value || "—"}</div>
    </div>
  );
}

function InfoCard({ title: cardTitle, rows }) {
  return (
    <div className="info-card">
      <div className="info-card-header">{cardTitle}</div>
      <div className="info-card-body">
        {rows.filter(Boolean).map((row, i) => (
          <div className="info-row" key={i}>
            <span className="info-row-label">{row.label}</span>
            <span className="info-row-val">{row.value || "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ObsNotes({ label, children }) {
  return (
    <div className="obs-notes">
      <div className="obs-notes-label">{label}</div>
      {children}
    </div>
  );
}

function ObservationCard({ obs, index }) {
  return (
    <div className="obs-card">
      <div className="obs-header">
        <span className="obs-header-title">
          Observation #{index + 1}{obs.pest_type ? ` — ${obs.pest_type}` : ""}
        </span>
        <span className="obs-header-badge">{title(obs.observation_type) || "General"}</span>
      </div>
      <div className="obs-body">
        <div className="obs-grid">
          {[
            { label: "Area / Location", val: obs.area },
            { label: "Severity", val: title(obs.severity) },
            { label: "Treatment Used", val: obs.treatment },
            { label: "Chemical / Product", val: obs.chemical_used },
            { label: "Quantity Used", val: obs.quantity },
            { label: "Recorded At", val: fmt(obs.recorded_at) },
          ].map((f, i) => (
            <div key={i}>
              <div className="obs-field-label">{f.label}</div>
              <div className="obs-field-val">{f.val || "—"}</div>
            </div>
          ))}
        </div>

        {obs.rodent_detail && (
          <ObsNotes label="Rodent Details">
            Bait stations placed: {obs.rodent_detail.bait_stations_placed || "—"} &nbsp;·&nbsp;
            Traps set: {obs.rodent_detail.traps_set || "—"} &nbsp;·&nbsp;
            Activity level: {title(obs.rodent_detail.activity_level)}
          </ObsNotes>
        )}
        {obs.flying_insect_detail && (
          <ObsNotes label="Flying Insect Details">
            Device type: {obs.flying_insect_detail.device_type || "—"} &nbsp;·&nbsp;
            Count: {obs.flying_insect_detail.insect_count || "—"} &nbsp;·&nbsp;
            Action: {title(obs.flying_insect_detail.action_taken)}
          </ObsNotes>
        )}
        {obs.cockroach_detail && (
          <ObsNotes label="Cockroach Details">
            Gel applied: {obs.cockroach_detail.gel_applied ? "Yes" : "No"} &nbsp;·&nbsp;
            Spray used: {obs.cockroach_detail.spray_used ? "Yes" : "No"} &nbsp;·&nbsp;
            Infestation level: {title(obs.cockroach_detail.infestation_level)}
          </ObsNotes>
        )}
        {obs.termite_detail && (
          <ObsNotes label="Termite Details">
            Drilling done: {obs.termite_detail.drilling_done ? "Yes" : "No"} &nbsp;·&nbsp;
            Chemical injected: {obs.termite_detail.chemical_injected ? "Yes" : "No"} &nbsp;·&nbsp;
            Affected area: {obs.termite_detail.affected_area || "—"}
          </ObsNotes>
        )}
        {obs.mosquito_detail && (
          <ObsNotes label="Mosquito Details">
            Fogging done: {obs.mosquito_detail.fogging_done ? "Yes" : "No"} &nbsp;·&nbsp;
            Larvicide applied: {obs.mosquito_detail.larvicide_applied ? "Yes" : "No"} &nbsp;·&nbsp;
            Breeding sites found: {obs.mosquito_detail.breeding_sites_found ?? "0"}
          </ObsNotes>
        )}
        {obs.general_detail && (
          <ObsNotes label="General Details">
            {obs.general_detail.description || "No additional details."}
          </ObsNotes>
        )}
        {obs.notes && (
          <ObsNotes label="Technician Notes">{obs.notes}</ObsNotes>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
// FIX: Accept jobId + onClose props. When jobId is provided, fetch real data
//      from the API instead of using hardcoded DEMO_DATA.
// TO this:
export default function AdminReportDetailPage({ jobId: jobIdProp, onClose: onCloseProp }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const jobId = jobIdProp ?? id;
  const onClose = onCloseProp ?? (() => navigate("/dashboard/reports"));

  console.log("jobId =", jobId);

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
  if (!jobId) {
    setError("No job ID provided.");
    setLoading(false);
    return;
  }

  setLoading(true);
  setError("");

  api.get(`/pdf/job/${jobId}/`)   // ← only this line changes
    .then(res => {
      const payload = res.data?.data ?? res.data;
      setData(payload);
    })
    .catch(err => {
      const msg = err.response?.data?.error
        || err.response?.data?.detail
        || "Failed to load report. Please try again.";
      setError(msg);
    })
    .finally(() => setLoading(false));
}, [jobId]);

  // ── Loading state ──
  if (loading) {
    return (
      <>
        <style>{css}</style>
        <div className="report-loading">
          <div className="report-spinner" />
          Loading report for Job #{jobId}…
        </div>
      </>
    );
  }

  // ── Error state ──
  if (error || !data) {
    return (
      <>
        <style>{css}</style>
        {onClose && (
          <div className="report-back-bar">
            <button className="report-back-btn" type="button" onClick={onClose}>
              <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
              Back to Reports
            </button>
          </div>
        )}
        <div className="report-error-box">{error || "No report data available."}</div>
      </>
    );
  }

  // ── Destructure real API data ──
  // FIX: customer name, technician name, observations etc. all come from the
  //      real API response instead of the hardcoded DEMO_DATA object.
  const { job, customer, technician, observations = [], alerts = [] } = data;

  // FIX: Build the customer's display name from whatever fields your API returns.
  const customerName =
    customer?.name ||
    (customer?.first_name
      ? `${customer.first_name} ${customer.last_name || ""}`.trim()
      : null) ||
    customer?.username ||
    "Unknown Customer";

  const techName = technician
    ? (technician.first_name
        ? `${technician.first_name} ${technician.last_name || ""}`.trim()
        : technician.username)
    : null;

  const statusColor =
    job?.status === "completed" || job?.status === "report_sent"
      ? "green"
      : job?.status === "cancelled"
      ? "red"
      : "amber";

  const generatedAt =
    new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
    ", " +
    new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });

  return (
    <>
      <style>{css}</style>

      {/* FIX: Back button so the user can return to the list without a page reload */}
      {onClose && (
        <div className="report-back-bar">
          <button className="report-back-btn" type="button" onClick={onClose}>
            <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
            Back to Reports
          </button>
        </div>
      )}

      <div className="report-root">

        {/* ── HEADER ── */}
        <div className="header">
          <div>
            <div className="logo-row">
              <div className="logo-box">
                <svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/></svg>
              </div>
              <span className="company-name">PestPro</span>
            </div>
            <div className="company-sub">Professional Pest Control Services</div>
          </div>
          <div className="header-right">
            <div className="report-title">Service Report</div>
            <div className="report-meta">
              {/* FIX: Show real job ID and UUID from API */}
              Job ID &nbsp;<span>#{job?.id}</span><br />
              {/* FIX: Show the real customer name prominently */}
              Customer &nbsp;<span>{customerName}</span><br />
              Generated &nbsp;<span>{generatedAt}</span><br />
              {job?.job_uuid && <>Report UUID &nbsp;<span>{job.job_uuid}</span></>}
            </div>
          </div>
        </div>

        {/* ── JOB SUMMARY ── */}
        <SectionTitle>Job Summary</SectionTitle>
        <div className="meta-grid">
          <MetaCell label="Status"         value={title(job?.status)}       color={statusColor} />
          <MetaCell label="Service Type"   value={title(job?.service_type)} />
          {/* FIX: Show customer name in the summary grid as well */}
          <MetaCell label="Customer"       value={customerName}             color="muted" />
          <MetaCell label="Scheduled Date" value={fmt(job?.scheduled_datetime)} color="muted" />
          <MetaCell label="Completed At"   value={fmt(job?.completed_at)}   color="muted" />
          <MetaCell label="Location"       value={job?.location}            color="muted" />
        </div>

        {job?.notes && (
          <div className="obs-notes" style={{ marginBottom: 8 }}>
            <div className="obs-notes-label">Job Notes</div>
            {job.notes}
          </div>
        )}

        {/* ── CUSTOMER DETAILS ── */}
        <SectionTitle>Customer Details</SectionTitle>
        <InfoCard
          title="Contact Information"
          rows={[
            // FIX: Use the normalised customerName so it always shows a real name
            { label: "Full Name",     value: customerName },
            { label: "Email Address", value: customer?.email },
            { label: "Phone",         value: customer?.phone },
            customer?.company_name && { label: "Company", value: customer.company_name },
            customer?.address && {
              label: "Address",
              value: `${customer.address}${customer.city ? ", " + customer.city : ""}`,
            },
          ]}
        />

        {/* ── TECHNICIAN DETAILS ── */}
        <SectionTitle>Assigned Technician</SectionTitle>
        {techName ? (
          <InfoCard
            title="Technician Information"
            rows={[
              { label: "Name",     value: techName },
              { label: "Email",    value: technician?.email },
              { label: "Phone",    value: technician?.phone },
              { label: "Username", value: technician?.username ? `@${technician.username}` : "—" },
            ]}
          />
        ) : (
          <div className="no-data">No technician assigned to this job.</div>
        )}

        {/* ── SERVICE OBSERVATIONS ── */}
        <SectionTitle>Service Observations</SectionTitle>
        {observations.length > 0 ? (
          observations.map((obs, i) => (
            <ObservationCard key={i} obs={obs} index={i} />
          ))
        ) : (
          <div className="no-data">No observations recorded for this job.</div>
        )}

        {/* ── ACTIVE ALERTS ── */}
        {alerts.length > 0 && (
          <>
            <SectionTitle>Active Alerts</SectionTitle>
            {alerts.map((alert, i) => (
              <div className="alert-row" key={i}>
                <div className="alert-dot" />
                <div className="alert-text">{alert.message || alert.title || "Alert"}</div>
                <div className="alert-type">{title(alert.alert_type)}</div>
              </div>
            ))}
          </>
        )}

        {/* ── DIGITAL SIGNATURE ── */}
        <SectionTitle>Digital Signature</SectionTitle>
        {job?.signed_by ? (
          <div className="signature-box">
            <div>
              <div className="signature-label">Signed By</div>
              <div className="signature-name">{job.signed_by}</div>
              <div className="signature-date">{fmt(job.signed_at || job.completed_at)}</div>
            </div>
            <div>
              <div className="signature-verified">✓ Digitally Verified</div>
            </div>
          </div>
        ) : (
          <div className="no-data">No digital signature recorded.</div>
        )}

        {/* ── FOOTER ── */}
        <div className="footer">
          <div className="footer-left">
            <div className="footer-brand">PestPro</div>
            Professional Pest Control Services<br />
            This is a system-generated report.
          </div>
          <div className="footer-right">
            {/* FIX: Show real customer name in footer too */}
            {customerName} &nbsp;·&nbsp; Job #{job?.id}<br />
            {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}<br />
            {job?.job_uuid && <span style={{ color: "var(--green)" }}>{job.job_uuid}</span>}
          </div>
        </div>

      </div>
    </>
  );
}