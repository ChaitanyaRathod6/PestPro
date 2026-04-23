from rest_framework import serializers
from django.utils import timezone
from .models import PDFReport, EmailLog


# =============================================================================
# PDF REPORT SERIALIZERS
# PDF auto-generated on job completion (UC-09).
# Admin/Supervisor can manually regenerate (UC-14).
# Gap #5: reportFile stores S3 key in production, media/reports/ in dev.
# =============================================================================

class PDFReportSerializer(serializers.ModelSerializer):
    """
    Full PDF report details.
    Used by Admin/Supervisor (UC-14).
    """
    job_uuid         = serializers.UUIDField(
        source='job.job_uuid', read_only=True
    )
    customer_name    = serializers.CharField(
        source='job.customer.name', read_only=True
    )
    customer_email   = serializers.CharField(
        source='job.customer.email', read_only=True
    )
    generated_by_name = serializers.SerializerMethodField()
    is_expired        = serializers.SerializerMethodField()

    class Meta:
        model = PDFReport
        fields = [
            'id', 'job', 'job_uuid', 'customer_name', 'customer_email',
            'report_file', 'generated_at', 'generated_by',
            'generated_by_name', 'file_size_kb', 'includes_signature',
            'download_token', 'token_expires_at', 'is_expired'
        ]
        read_only_fields = [
            'id', 'job_uuid', 'customer_name', 'customer_email',
            'generated_at', 'download_token', 'is_expired'
        ]

    def get_generated_by_name(self, obj):
        if obj.generated_by:
            return f"{obj.generated_by.first_name} {obj.generated_by.last_name}".strip()
        return 'Auto-generated'

    def get_is_expired(self, obj):
        # Check if the secure download token has expired (PDF-05 test case)
        return timezone.now() > obj.token_expires_at


class PDFReportDownloadSerializer(serializers.ModelSerializer):
    """
    Used by Customer Portal to download PDF via secure token (UC-11).
    Validates token and expiry before serving the file.
    """
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = PDFReport
        fields = [
            'id', 'report_file', 'download_token',
            'token_expires_at', 'is_expired'
        ]
        read_only_fields = fields

    def get_is_expired(self, obj):
        return timezone.now() > obj.token_expires_at

    def validate(self, attrs):
        # Check token expiry (PDF-05 test case)
        if timezone.now() > self.instance.token_expires_at:
            raise serializers.ValidationError(
                'Download link has expired. Please contact support.'
            )
        return attrs


# =============================================================================
# EMAIL LOG SERIALIZERS
# Full audit trail for every email sent by the system (TABLE 12).
# =============================================================================

class EmailLogSerializer(serializers.ModelSerializer):
    """
    Full email log details.
    Used by Admin to monitor email delivery and resend failed emails.
    """
    job_uuid = serializers.SerializerMethodField()

    class Meta:
        model = EmailLog
        fields = [
            'id', 'job', 'job_uuid', 'recipient_email',
            'recipient_name', 'subject', 'email_type',
            'sent_at', 'celery_task_id', 'status',
            'error_message', 'pdf_attached'
        ]
        read_only_fields = fields

    def get_job_uuid(self, obj):
        if obj.job:
            return str(obj.job.job_uuid)
        return None


class EmailLogListSerializer(serializers.ModelSerializer):
    """
    Compact email log for list view.
    Shows key fields only — recipient, type, status, timestamp.
    """
    class Meta:
        model = EmailLog
        fields = [
            'id', 'recipient_email', 'email_type',
            'status', 'pdf_attached', 'sent_at'
        ]
        read_only_fields = fields