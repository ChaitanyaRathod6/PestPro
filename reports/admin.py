from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import PDFReport, EmailLog

@admin.register(PDFReport)
class PDFReportAdmin(admin.ModelAdmin):
    list_display  = ['job', 'generated_at', 'file_size_kb',
                     'includes_signature', 'token_expires_at']
    readonly_fields = ['download_token', 'generated_at']

@admin.register(EmailLog)
class EmailLogAdmin(admin.ModelAdmin):
    list_display  = ['recipient_email', 'email_type', 'status',
                     'pdf_attached', 'sent_at']
    list_filter   = ['status', 'email_type']
    search_fields = ['recipient_email', 'subject']