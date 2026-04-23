from django.db import models

# Create your models here.
import uuid
from django.db import models
from django.conf import settings
from accounts.models import Customer
 
 
# =============================================================================
# TABLE 3 — SERVICEJOB
# Core job lifecycle model. Full lifecycle: scheduled → in_progress →
# observations_recorded → completed → report_sent
# Gap #3 fixed: both Admin AND Supervisor can create jobs (not Admin only).
# =============================================================================
 
class ServiceJob(models.Model):
 
    SERVICE_TYPE_CHOICES = [
        ('rodent_control',  'Rodent Control'),
        ('flying_insect',   'Flying Insect'),
        ('cockroach',       'Cockroach'),
        ('termite',         'Termite'),
        ('mosquito',        'Mosquito'),
        ('general',         'General'),
        ('bed_bug',         'Bed Bug'),
    ]
 
    STATUS_CHOICES = [
        ('scheduled',              'Scheduled'),
        ('in_progress',            'In Progress'),
        ('observations_recorded',  'Observations Recorded'),
        ('completed',              'Completed'),
        ('report_sent',            'Report Sent'),
    ]
 
    CREATED_BY_ROLE_CHOICES = [
        ('admin',      'Admin'),
        ('supervisor', 'Supervisor'),
    ]
 
    # UUID for public-facing references (never expose raw integer PK to frontend)
    job_uuid = models.UUIDField(
        default=uuid.uuid4, unique=True, editable=False,
        help_text="Public-facing unique job identifier. Auto-generated."
    )
 
    # FK — PROTECT prevents deleting a customer who has jobs
    customer = models.ForeignKey(
        Customer,
        on_delete=models.PROTECT,
        related_name='jobs'
    )
 
    # FK — SET NULL: job record survives if technician account is deleted
    assigned_technician = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='assigned_jobs',
        limit_choices_to={'role': 'technician'}
    )
 
    # Gap #3 audit field — who created this job
    created_by_role = models.CharField(
        max_length=20,
        choices=CREATED_BY_ROLE_CHOICES,
        help_text="Role of the user who created this job. Stored for audit."
    )
 
    site_address  = models.TextField()
    service_type  = models.CharField(max_length=30, choices=SERVICE_TYPE_CHOICES)
    status        = models.CharField(
        max_length=30, choices=STATUS_CHOICES, default='scheduled'
    )
 
    scheduled_datetime = models.DateTimeField()
    started_at         = models.DateTimeField(null=True, blank=True)
    completed_at       = models.DateTimeField(null=True, blank=True)
 
    # Technician digital signature — base64 PNG data URI
    signed_by              = models.TextField(blank=True)
    customer_sign_required = models.BooleanField(default=False)
    customer_signed_at     = models.DateTimeField(null=True, blank=True)
 
    completion_notes = models.TextField(blank=True)
    is_report_sent   = models.BooleanField(default=False)
 
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
 
    def __str__(self):
        return f"Job #{self.id} — {self.customer.name} ({self.service_type}) [{self.status}]"
 
    class Meta:
        db_table = 'service_job'
        ordering = ['-scheduled_datetime']