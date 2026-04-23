from django.db import models

# Create your models here.
import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
 
 
# =============================================================================
# TABLE 2 — USER (Staff)
# Extends Django AbstractUser. Handles Admin, Supervisor, Technician roles.
# =============================================================================
 
class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin',       'Admin'),
        ('supervisor',  'Supervisor'),
        ('technician',  'Technician'),
    ]
 
    # AbstractUser already provides: username, email, password,
    # first_name, last_name, is_active, date_joined
    email        = models.EmailField(max_length=254, unique=True)
    phone        = models.CharField(max_length=20, blank=True)
    role         = models.CharField(max_length=20, choices=ROLE_CHOICES)
    profile_photo = models.ImageField(
        upload_to='profiles/', blank=True, null=True,
        help_text="Stored in media/profiles/ (dev) or S3 key (production)"
    )
 
    def __str__(self):
        return f"{self.username} ({self.role})"
 
    class Meta:
        db_table = 'user'
        verbose_name = 'Staff User'
        verbose_name_plural = 'Staff Users'
 
 
# =============================================================================
# TABLE 1 — CUSTOMER
# Customer profiles. Portal access via OTP only (no password).
# Gap #4 fixed: emailOptIn + notification preference fields added.
# Fix #2 applied: latitude/longitude for heatmap.
# =============================================================================
 
class Customer(models.Model):
    GEOCODE_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('success', 'Success'),
        ('failed',  'Failed'),
    ]
 
    name         = models.CharField(max_length=200)
    email        = models.EmailField(max_length=254, unique=True)
    phone        = models.CharField(max_length=20)
    company_name = models.CharField(max_length=200, blank=True)
    address      = models.TextField()
    city         = models.CharField(max_length=100)
    is_active    = models.BooleanField(default=True)
 
    # Gap #4 — Notification preferences
    email_opt_in         = models.BooleanField(
        default=True,
        help_text="Master switch. FALSE = no system emails sent to this customer."
    )
    notify_on_job_start  = models.BooleanField(
        default=True,
        help_text="Send Job Started notification when technician begins."
    )
    notify_on_completion = models.BooleanField(
        default=True,
        help_text="Send completion email with PDF report."
    )
 
    # Fix #2 — Heatmap geocoding fields
    latitude       = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True,
        help_text="GPS latitude. Populated by Celery geocoding task."
    )
    longitude      = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True,
        help_text="GPS longitude. Populated by Celery geocoding task."
    )
    geocode_status = models.CharField(
        max_length=20, choices=GEOCODE_STATUS_CHOICES, default='pending'
    )
    geocoded_at    = models.DateTimeField(null=True, blank=True)
 
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
 
    def __str__(self):
        return f"{self.name} — {self.city}"
 
    class Meta:
        db_table = 'customer'
 
 
# =============================================================================
# TABLE 14 — CUSTOMEROTPTOKEN  [NEW in v2]
# Gap #1 fixed: OTP token table for customer portal login (UC-03).
# OTP codes hashed with SHA-256 before storage — never stored as plaintext.
# =============================================================================
 
class CustomerOTPToken(models.Model):
    customer_email = models.EmailField(
        max_length=254,
        help_text="NOT a FK — allows lookup even if customer record changes."
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='otp_tokens'
    )
    # Stores SHA-256 hash (64 chars), not the raw 6-digit code
    otp_code   = models.CharField(
        max_length=64,
        help_text="SHA-256 hash of the 6-digit OTP. Raw code never stored."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(
        help_text="Set to created_at + 10 minutes."
    )
    attempts   = models.PositiveSmallIntegerField(
        default=0,
        help_text="Failed verification attempts. Locked after 3."
    )
    is_used    = models.BooleanField(
        default=False,
        help_text="TRUE after successful verification. Prevents replay attacks."
    )
    ip_address = models.GenericIPAddressField(
        null=True, blank=True,
        help_text="IP address of the OTP request. For security audit."
    )
 
    def __str__(self):
        return f"OTP for {self.customer_email} — {'used' if self.is_used else 'active'}"
 
    class Meta:
        db_table = 'customer_otp_token'
    constraints = [
        models.CheckConstraint(
            condition=models.Q(attempts__lte=3),
            name='otp_max_attempts_3'
        ),
    ]