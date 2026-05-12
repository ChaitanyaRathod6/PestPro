import { useState } from "react";

// ─── Sample Data (replace with real props/API data) ───────────────────────────
const DEMO_DATA = {
  job: {
    id: 1042,
    job_uuid: "a3f2c1d4-8b7e-4a2f-9c1e-3d5f6b8e0a2c",
    status: "completed",
    service_type: "termite",
    scheduled_datetime: "2025-05-10T09:00:00",
    completed_at: "2025-05-10T11:30:00",
    location: "Block B, Sector 12, Vadodara",
    notes: "Customer requested extra attention to kitchen and bathroom areas.",
    signed_by: "Rajesh Mehta",
    signed_at: "2025-05-10T11:45:00",
  },
  customer: {
    name: "Priya Sharma",
    email: "priya.sharma@email.com",
    phone: "+91 98765 43210",
    company_name: "Sharma Residency",
    address: "12, Rose Garden Society",
    city: "Vadodara",
  },
  technician: {
    first_name: "Amit",
    last_name: "Patel",
    email: "amit.patel@pestpro.com",
    phone: "+91 91234 56789",
    username: "amit.patel",
  },
  observations: [
    {
      pest_type: "Termite",
      observation_type: "Infestation",
      area: "Kitchen & Walls",
      severity: "High",
      treatment: "Chemical Injection",
      chemical_used: "Chlorpyrifos 20 EC",
      quantity: "2.5 Litres",
      recorded_at: "2025-05-10T10:15:00",
      notes: "Heavy activity found near skirting boards and door frames.",
      termite_detail: {
        drilling_done: true,
        chemical_injected: true,
        affected_area: "80 sq ft",
      },
    },
    {
      pest_type: "Cockroach",
      observation_type: "Preventive",
      area: "Bathroom",
      severity: "Low",
      treatment: "Gel Baiting",
      chemical_used: "Fipronil Gel",
      quantity: "3 Syringes",
      recorded_at: "2025-05-10T11:00:00",
      notes: "Gel applied under sink and behind commode.",
      cockroach_detail: {
        gel_applied: true,
        spray_used: false,
        infestation_level: "Low",
      },
    },
  ],
  alerts: [
    { message: "Follow-up visit recommended within 30 days.", alert_type: "Reminder" },
  ],
};

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

// ─── CSS (injected via style tag in head) ─────────────────────────────────────
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
    .report-root { padding:20px; }
    .no-print { display:none !important; }
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
export default function ServiceReport({ data = DEMO_DATA }) {
  const { job, customer, technician, observations, alerts } = data;

  const statusColor =
    job.status === "completed" || job.status === "report_sent"
      ? "green"
      : job.status === "cancelled"
      ? "red"
      : "amber";

  const generatedAt = new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  }) + ", " + new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });

  return (
    <>
      <style>{css}</style>
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
              Job ID &nbsp;<span>#{job.id}</span><br />
              Generated &nbsp;<span>{generatedAt}</span><br />
              Report UUID &nbsp;<span>{job.job_uuid}</span>
            </div>
          </div>
        </div>

        {/* ── JOB SUMMARY ── */}
        <SectionTitle>Job Summary</SectionTitle>
        <div className="meta-grid">
          <MetaCell label="Status" value={title(job.status)} color={statusColor} />
          <MetaCell label="Service Type" value={title(job.service_type)} />
          <MetaCell label="Job UUID" value={job.job_uuid} color="muted" small />
          <MetaCell label="Scheduled Date" value={fmt(job.scheduled_datetime)} color="muted" />
          <MetaCell label="Completed At" value={fmt(job.completed_at)} color="muted" />
          <MetaCell label="Location" value={job.location} color="muted" />
        </div>

        {job.notes && (
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
            { label: "Full Name", value: customer.name },
            { label: "Email Address", value: customer.email },
            { label: "Phone", value: customer.phone },
            customer.company_name && { label: "Company", value: customer.company_name },
            customer.address && {
              label: "Address",
              value: `${customer.address}${customer.city ? ", " + customer.city : ""}`,
            },
          ]}
        />

        {/* ── TECHNICIAN DETAILS ── */}
        <SectionTitle>Assigned Technician</SectionTitle>
        {technician ? (
          <InfoCard
            title="Technician Information"
            rows={[
              {
                label: "Name",
                value: technician.first_name
                  ? `${technician.first_name} ${technician.last_name}`
                  : technician.username,
              },
              { label: "Email", value: technician.email },
              { label: "Phone", value: technician.phone },
              { label: "Username", value: `@${technician.username}` },
            ]}
          />
        ) : (
          <div className="no-data">No technician assigned to this job.</div>
        )}

        {/* ── SERVICE OBSERVATIONS ── */}
        <SectionTitle>Service Observations</SectionTitle>
        {observations && observations.length > 0 ? (
          observations.map((obs, i) => (
            <ObservationCard key={i} obs={obs} index={i} />
          ))
        ) : (
          <div className="no-data">No observations recorded for this job.</div>
        )}

        {/* ── ACTIVE ALERTS ── */}
        {alerts && alerts.length > 0 && (
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
        {job.signed_by ? (
          <div className="signature-box">
            <div>
              <div className="signature-label">Signed By</div>
              <div className="signature-name">{job.signed_by}</div>
              <div className="signature-date">
                {fmt(job.signed_at || job.completed_at)}
              </div>
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
            Job #{job.id} &nbsp;·&nbsp; {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}<br />
            Report generated by PestPro System<br />
            <span style={{ color: "var(--green)" }}>{job.job_uuid}</span>
          </div>
        </div>

      </div>
    </>
  );
}