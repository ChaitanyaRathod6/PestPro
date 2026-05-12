const { PrismaClient } = require('@prisma/client')
const { generateJobPDF } = require('./pdfService')
const { v4: uuidv4 } = require('uuid')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()
const REPORTS_DIR = path.join(__dirname, '../../media/reports')

async function createPDFReport(jobId) {
  // Fetch the full job with all relations
  const job = await prisma.serviceJob.findUnique({
    where: { jobId },
    include: {
      customer: true,
      assignedTechnician: true,
      serviceObservations: {
        include: {
          rodentObservation: true,
          flyingInsectObservation: true,
          cockroachObservation: true,
          termiteObservation: true,
          mosquitoObservation: true,
          generalObservation: true,
        }
      },
      smartAlerts: true,
    }
  })

  if (!job) throw new Error(`Job ${jobId} not found`)
  if (!['completed', 'report_sent'].includes(job.status)) {
    throw new Error(`Job ${jobId} is not completed yet`)
  }

  // Generate PDF buffer
  const pdfBuffer = await generateJobPDF(job)

  // Save file to disk
  const filename = `job_${job.jobUuid}.pdf`
  const filepath = path.join(REPORTS_DIR, filename)
  fs.writeFileSync(filepath, pdfBuffer)

  const fileSizeKb = Math.max(1, Math.round(pdfBuffer.length / 1024))
  const downloadToken = uuidv4()
  const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  // Upsert PDFReport record in DB
  const report = await prisma.pDFReport.upsert({
    where: { jobId },
    create: {
      jobId,
      reportFile: `media/reports/${filename}`,
      fileSizeKb,
      includesSignature: !!job.signedBy,
      downloadToken,
      tokenExpiresAt,
    },
    update: {
      reportFile:        `media/reports/${filename}`,
      fileSizeKb,
      includesSignature: !!job.signedBy,
      downloadToken,
      tokenExpiresAt,
      generatedAt:       new Date(),
    }
  })

  return report
}

module.exports = { createPDFReport }