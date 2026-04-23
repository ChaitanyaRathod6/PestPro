from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import SmartAlert

@admin.register(SmartAlert)
class SmartAlertAdmin(admin.ModelAdmin):
    list_display  = ['title', 'priority', 'alert_type', 'pest_category',
                     'rule_triggered', 'is_resolved', 'created_at']
    list_filter   = ['priority', 'alert_type', 'is_resolved', 'pest_category']
    search_fields = ['title', 'rule_triggered']
    readonly_fields = ['created_at']