const puppeteer = require('puppeteer')
const path = require('path')
const fs = require('fs')

// Make sure the reports folder exists
const REPORTS_DIR = path.join(__dirname, '../../media/reports')
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true })

async function generateJobPDF(job) {
  const html = buildReportHTML(job)

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '2cm', bottom: '2cm', left: '2cm', right: '2cm' },
      printBackground: true,
    })
    return pdfBuffer
  } finally {
    await browser.close()
  }
}

function buildReportHTML(job) {
  const observations = job.serviceObservations || []
  const alerts = job.smartAlerts?.filter(a => !a.isResolved) || []

  const obsRows = observations.map(obs => `
    <tr>
      <td>${capitalize(obs.observationCategory)}</td>
      <td>${formatDate(obs.observationTime)}</td>
      <td>${obs.notes || '—'}</td>
    </tr>
  `).join('')

  const alertRows = alerts.map(a => `
    <tr>
      <td class="priority-${a.priority}">${a.priority.toUpperCase()}</td>
      <td>${a.alertType}</td>
      <td>${a.title}</td>
    </tr>
  `).join('')

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8"/>
    <style>
      @page { margin: 0; }
      body { font-family: Arial, sans-serif; font-size: 13px; color: #1a2e1a; padding: 2cm; }
      h1   { color: #1a6b3c; font-size: 20px; margin-bottom: 4px; }
      h2   { color: #1a4d2e; font-size: 14px; margin: 20px 0 6px;
             border-bottom: 1px solid #e8ebe8; padding-bottom: 4px; }
      .meta { font-size: 12px; color: #7a8c7a; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
      th    { background: #edf6f1; color: #1a6b3c; text-align: left;
              padding: 7px 10px; font-size: 11px; text-transform: uppercase; }
      td    { padding: 7px 10px; border-bottom: 1px solid #e8ebe8; font-size: 12px; }
      .priority-critical { color: #7c3aed; font-weight: bold; }
      .priority-high     { color: #e74c3c; font-weight: bold; }
      .priority-medium   { color: #e6a817; }
      .priority-low      { color: #3b82f6; }
      .sig-block { margin-top: 30px; border-top: 1px solid #e8ebe8; padding-top: 14px; }
      .footer    { margin-top: 40px; font-size: 10px; color: #a0b0a0; text-align: center; }
    </style>
  </head>
  <body>
    <h1>PestPro — Service Completion Report</h1>
    <div class="meta">Generated ${new Date().toLocaleString('en-IN')} &nbsp;·&nbsp; Confidential</div>

    <h2>Job Details</h2>
    <table>
      <tr><th>Field</th><th>Value</th></tr>
      <tr><td>Job ID</td>       <td>#${job.jobId}</td></tr>
      <tr><td>Customer</td>     <td>${job.customer?.name || '—'}</td></tr>
      <tr><td>Site Address</td> <td>${job.siteAddress || '—'}</td></tr>
      <tr><td>Service Type</td> <td>${capitalize(job.serviceType || '')}</td></tr>
      <tr><td>Technician</td>   <td>${job.assignedTechnician?.firstName || ''} ${job.assignedTechnician?.lastName || ''}</td></tr>
      <tr><td>Scheduled</td>    <td>${formatDate(job.scheduledDatetime)}</td></tr>
      <tr><td>Completed</td>    <td>${formatDate(job.completedAt)}</td></tr>
    </table>

    ${job.completionNotes ? `<h2>Technician Notes</h2><p>${job.completionNotes}</p>` : ''}

    <h2>Observations</h2>
    ${observations.length ? `
      <table>
        <tr><th>Category</th><th>Time</th><th>Notes</th></tr>
        ${obsRows}
      </table>
    ` : '<p style="color:#7a8c7a;">No observations recorded.</p>'}

    ${alerts.length ? `
      <h2>Open Smart Alerts</h2>
      <table>
        <tr><th>Priority</th><th>Type</th><th>Alert</th></tr>
        ${alertRows}
      </table>
    ` : ''}

    ${job.signedBy ? `
      <div class="sig-block">
        <h2>Technician Signature</h2>
        <img src="${job.signedBy}" style="max-height:70px; border:1px solid #e8ebe8; padding:6px;" />
        <p style="font-size:11px; color:#7a8c7a; margin-top:4px;">
          Signed by ${job.assignedTechnician?.firstName || ''} on ${formatDate(job.completedAt)}
        </p>
      </div>
    ` : ''}

    <div class="footer">PestPro Service Management · Job #${job.jobId} · ${new Date().toLocaleDateString('en-IN')}</div>
  </body>
  </html>`
}

const capitalize = s => s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : ''
const formatDate = d => d ? new Date(d).toLocaleString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'

module.exports = { generateJobPDF }