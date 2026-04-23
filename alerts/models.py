from django.db import models

# Create your models here.
from django.db import models
from django.conf import settings
from jobs.models import ServiceJob
from observations.models import ServiceObservation
 
 
# =============================================================================
# TABLE 13 — SMARTALERT
# Proactive alerts created by SmartAlertEngine after every observation save.
# Triggered via Django post_save signal on ServiceObservation.
# Rules R-01 through R-07 defined in Features v2 Section 7.
# =============================================================================
 
class SmartAlert(models.Model):
 
    ALERT_TYPE_CHOICES = [
        ('recommendation', 'Recommendation'),
        ('warning',        'Warning'),
        ('urgent',         'Urgent'),
        ('maintenance',    'Maintenance'),
        ('info',           'Info'),
    ]
 
    PEST_CATEGORY_CHOICES = [
        ('rodent',        'Rodent'),
        ('flying_insect', 'Flying Insect'),
        ('cockroach',     'Cockroach'),
        ('termite',       'Termite'),
        ('mosquito',      'Mosquito'),
        ('general',       'General'),
    ]
 
    PRIORITY_CHOICES = [
        ('low',      'Low'),
        ('medium',   'Medium'),
        ('high',     'High'),
        ('critical', 'Critical'),
    ]
 
    # CASCADE: alert deleted when its parent job is deleted
    job = models.ForeignKey(
        ServiceJob,
        on_delete=models.CASCADE,
        related_name='smart_alerts'
    )
    # SET NULL: alert record survives even if source observation is deleted
    observation = models.ForeignKey(
        ServiceObservation,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='smart_alerts'
    )
 
    alert_type    = models.CharField(max_length=20, choices=ALERT_TYPE_CHOICES)
    pest_category = models.CharField(max_length=20, choices=PEST_CATEGORY_CHOICES)
    title         = models.CharField(max_length=300)
    message       = models.TextField(help_text="Full alert message with specific recommendations.")
    rule_triggered = models.CharField(
        max_length=100,
        help_text="Which SmartAlertEngine rule fired e.g. R-01, R-03, R-06"
    )
    priority      = models.CharField(
        max_length=10, choices=PRIORITY_CHOICES, default='medium'
    )
 
    # Resolution tracking
    is_resolved      = models.BooleanField(default=False)
    resolved_by      = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='resolved_alerts'
    )
    resolution_notes = models.TextField(
        blank=True,
        help_text="Notes entered by supervisor/admin when resolving. [NEW v2]"
    )
    resolved_at      = models.DateTimeField(null=True, blank=True)
 
    email_sent = models.BooleanField(
        default=False,
        help_text="Was this alert also emailed to admin/supervisor."
    )
    created_at = models.DateTimeField(auto_now_add=True)
 
    def __str__(self):
        return f"[{self.priority.upper()}] {self.title} — Rule {self.rule_triggered}"
 
    class Meta:
        db_table = 'smart_alert'
        ordering = ['-created_at']