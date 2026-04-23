from django.contrib import admin

#Register your models here.

from django.contrib import admin
from .models import ServiceJob

@admin.register(ServiceJob)
class ServiceJobAdmin(admin.ModelAdmin):
    list_display  = ['id', 'job_uuid', 'customer', 'assigned_technician',
                     'service_type', 'status', 'scheduled_datetime']
    list_filter   = ['status', 'service_type', 'created_by_role']
    search_fields = ['customer__name', 'site_address']
    readonly_fields = ['job_uuid', 'created_at', 'updated_at']