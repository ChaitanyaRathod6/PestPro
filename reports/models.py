from django.db import models

# Create your models here.
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from jobs.models import ServiceJob
 
 
# =============================================================================
# TABLE 11 — PDFREPORT
# Metadata and file reference for every auto-generated PDF completion report.
# Auto-generated on job completion (UC-09). Can be manually triggered (UC-14).
# Gap #5: reportFile stores S3 key in production, media/reports/ path in dev.
# =============================================================================
 
def default_token_expiry():
    """Token expires 7 days from now."""
    return timezone.now() + timedelta(days=7)
 
 
class PDFReport(models.Model):
    # OneToOne: one PDF per job. CASCADE: PDF deleted when job is deleted.
    job = models.OneToOneField(
        ServiceJob,
        on_delete=models.CASCADE,
        related_name='pdf_report'
    )
    # Gap #5: stores S3 key (production) or relative media/ path (development)
    report_file = models.FileField(
        upload_to='reports/',
        help_text="S3 key (production) or media/reports/ path (development)."
    )
    generated_at = models.DateTimeField(auto_now_add=True)
 
    # SET NULL: report record survives if the generating user is deleted
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='generated_reports',
        help_text="Nullable for auto-generation on job completion."
    )
    file_size_kb        = models.PositiveIntegerField(default=0)
    includes_signature  = models.BooleanField(default=False)
 
    # Secure download token — UUID v4, unique
    download_token  = models.UUIDField(
        default=uuid.uuid4, unique=True,
        help_text="Secure UUID token for customer download link."
    )
    token_expires_at = models.DateTimeField(
        default=default_token_expiry,
        help_text="Default: 7 days after generation."
    )
 
    def __str__(self):
        return f"PDF Report — Job #{self.job_id} (Generated: {self.generated_at:%Y-%m-%d})"
 
    class Meta:
        db_table = 'pdf_report'
 
 
# =============================================================================
# TABLE 12 — EMAILLOG
# Full audit trail for every email sent by the system.
# Tracks Celery task ID, delivery status, and error details.
# Gap #1 update: emailType now includes 'otp_login'.
# =============================================================================
 
class EmailLog(models.Model):
 
    EMAIL_TYPE_CHOICES = [
        ('otp_login',           'OTP Login'),           # [NEW in v2]
        ('job_started',         'Job Started'),
        ('observation_update',  'Observation Update'),
        ('completion_report',   'Completion Report'),
        ('high_activity_alert', 'High Activity Alert'),
        ('maintenance_alert',   'Maintenance Alert'),
    ]
 
    STATUS_CHOICES = [
        ('pending',  'Pending'),
        ('sent',     'Sent'),
        ('failed',   'Failed'),
        ('retrying', 'Retrying'),
    ]
 
    # SET NULL: log record survives if the job is deleted (nullable for OTP emails)
    job = models.ForeignKey(
        ServiceJob,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='email_logs',
        help_text="Nullable for non-job emails (e.g. OTP login emails)."
    )
    recipient_email = models.EmailField(max_length=254)
    recipient_name  = models.CharField(max_length=200)
    subject         = models.CharField(max_length=300)
    email_type      = models.CharField(max_length=30, choices=EMAIL_TYPE_CHOICES)
    sent_at         = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp email was dispatched via Celery."
    )
    celery_task_id  = models.CharField(
        max_length=36, blank=True,
        help_text="Celery async task UUID for tracking."
    )
    status          = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default='pending'
    )
    error_message   = models.TextField(
        blank=True,
        help_text="Error details if delivery failed."
    )
    pdf_attached    = models.BooleanField(
        default=False,
        help_text="Whether a PDF was attached to this email."
    )
 
    def __str__(self):
        return f"Email [{self.email_type}] to {self.recipient_email} — {self.status}"
 
    class Meta:
        db_table = 'email_log'
        ordering = ['-sent_at']