const express = require('express')
const router = express.Router()
const { PrismaClient } = require('@prisma/client')
const { createPDFReport } = require('../services/reportService')
const path = require('path')
const fs = require('fs')

const prisma = new PrismaClient()

// GET /api/reports/pdf/  — list all PDF reports (what your frontend calls)
router.get('/pdf', async (req, res) => {
  try {
    const reports = await prisma.pDFReport.findMany({
      orderBy: { generatedAt: 'desc' },
      include: {
        job: {
          select: { jobId: true, customer: { select: { name: true } } }
        },
        generatedBy: {
          select: { firstName: true, lastName: true }
        }
      }
    })

    const formatted = reports.map(r => ({
      id:                r.reportId,
      job_id:            r.jobId,
      report_file:       r.reportFile
                           ? `${req.protocol}://${req.get('host')}/${r.reportFile}`
                           : null,
      generated_at:      r.generatedAt,
      generated_by_name: r.generatedBy
                           ? `${r.generatedBy.firstName} ${r.generatedBy.lastName}`
                           : 'Auto',
      file_size_kb:      r.fileSizeKb,
      includes_signature: r.includesSignature,
      download_token:    r.downloadToken,
      token_expires_at:  r.tokenExpiresAt,
    }))

    return res.json({ count: formatted.length, results: formatted })
  } catch (err) {
    console.error('[Reports] List error:', err)
    return res.status(500).json({ error: 'Failed to load PDF reports.' })
  }
})

// POST /api/reports/pdf/job/:jobId/regenerate/  — manual regen
router.post('/pdf/job/:jobId/regenerate', async (req, res) => {
  const jobId = parseInt(req.params.jobId)
  try {
    // Fire and forget — returns immediately, PDF generates in background
    createPDFReport(jobId).catch(err => {
      console.error(`[PDF] Regen failed for job ${jobId}:`, err)
    })

    const existing = await prisma.pDFReport.findUnique({ where: { jobId } })
    return res.json({
      message: 'PDF regeneration queued. Refresh in a few seconds.',
      report:  existing,
    })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to queue regeneration.' })
  }
})

// GET /api/reports/emails/  — email logs
router.get('/emails', async (req, res) => {
  try {
    const where = {}
    if (req.query.status) where.status = req.query.status

    const logs = await prisma.emailLog.findMany({
      where,
      orderBy: { sentAt: 'desc' },
    })

    const formatted = logs.map(e => ({
      id:              e.emailLogId,
      job_id:          e.jobId,
      recipient_email: e.recipientEmail,
      recipient_name:  e.recipientName,
      subject:         e.subject,
      email_type:      e.emailType,
      sent_at:         e.sentAt,
      status:          e.status,
      error_message:   e.errorMessage,
      pdf_attached:    e.pdfAttached,
    }))

    return res.json({ count: formatted.length, results: formatted })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load email logs.' })
  }
})

// GET /api/reports/emails/stats/
router.get('/emails/stats', async (req, res) => {
  try {
    const [total, sent, failed, pending, retrying, byType] = await Promise.all([
      prisma.emailLog.count(),
      prisma.emailLog.count({ where: { status: 'sent' } }),
      prisma.emailLog.count({ where: { status: 'failed' } }),
      prisma.emailLog.count({ where: { status: 'pending' } }),
      prisma.emailLog.count({ where: { status: 'retrying' } }),
      prisma.emailLog.groupBy({ by: ['emailType'], _count: { emailType: true } }),
    ])

    const by_type = {}
    byType.forEach(row => { by_type[row.emailType] = row._count.emailType })

    return res.json({ total, sent, failed, pending, retrying, by_type })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load stats.' })
  }
})

// GET /api/reports/download?token=xxx  — customer secure download
router.get('/download', async (req, res) => {
  const { token } = req.query
  if (!token) return res.status(400).json({ error: 'Token required.' })

  const report = await prisma.pDFReport.findUnique({
    where: { downloadToken: token }
  })
  if (!report) return res.status(404).json({ error: 'Invalid token.' })
  if (new Date() > report.tokenExpiresAt) {
    return res.status(403).json({ error: 'Download link has expired.' })
  }

  const filepath = path.join(__dirname, '../../', report.reportFile)
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'PDF file not found.' })
  }

  return res.download(filepath)
})

module.exports = router