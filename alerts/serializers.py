from rest_framework import serializers
from django.utils import timezone
from .models import SmartAlert
from accounts.models import User


# =============================================================================
# SMART ALERT SERIALIZERS
# SmartAlertEngine creates alerts automatically via Django post_save signal.
# Admin and Supervisor can view and resolve alerts (UC-10).
# =============================================================================

class SmartAlertListSerializer(serializers.ModelSerializer):
    """
    Used for listing all alerts on the dashboard.
    Shows key fields only — priority badge, type, rule, status.
    """
    customer_name = serializers.CharField(
        source='job.customer.name', read_only=True
    )
    job_uuid = serializers.UUIDField(
        source='job.job_uuid', read_only=True
    )
    resolved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = SmartAlert
        fields = [
            'id', 'job_uuid', 'customer_name',
            'alert_type', 'pest_category', 'title',
            'priority', 'rule_triggered', 'is_resolved',
            'resolved_by_name', 'resolved_at', 'email_sent',
            'created_at'
        ]

    def get_resolved_by_name(self, obj):
        if obj.resolved_by:
            return f"{obj.resolved_by.first_name} {obj.resolved_by.last_name}".strip()
        return None


class SmartAlertDetailSerializer(serializers.ModelSerializer):
    """
    Full alert details — shown when Admin/Supervisor clicks on an alert.
    Includes full message, resolution notes, and linked observation.
    """
    customer_name    = serializers.CharField(
        source='job.customer.name', read_only=True
    )
    customer_email   = serializers.CharField(
        source='job.customer.email', read_only=True
    )
    job_uuid         = serializers.UUIDField(
        source='job.job_uuid', read_only=True
    )
    site_address     = serializers.CharField(
        source='job.site_address', read_only=True
    )
    resolved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = SmartAlert
        fields = [
            'id', 'job', 'job_uuid', 'customer_name',
            'customer_email', 'site_address',
            'observation', 'alert_type', 'pest_category',
            'title', 'message', 'rule_triggered', 'priority',
            'is_resolved', 'resolved_by', 'resolved_by_name',
            'resolution_notes', 'resolved_at',
            'email_sent', 'created_at'
        ]
        read_only_fields = [
            'id', 'job', 'job_uuid', 'customer_name',
            'customer_email', 'site_address', 'observation',
            'alert_type', 'pest_category', 'title', 'message',
            'rule_triggered', 'priority', 'email_sent', 'created_at',
            'resolved_by', 'resolved_by_name', 'resolved_at'
        ]

    def get_resolved_by_name(self, obj):
        if obj.resolved_by:
            return f"{obj.resolved_by.first_name} {obj.resolved_by.last_name}".strip()
        return None


class SmartAlertResolveSerializer(serializers.ModelSerializer):
    """
    Used by Admin/Supervisor to resolve an alert (UC-10).
    Only updates is_resolved, resolution_notes, resolved_by, resolved_at.
    """
    class Meta:
        model = SmartAlert
        fields = [
            'id', 'is_resolved',
            'resolution_notes', 'resolved_at'
        ]
        read_only_fields = ['id', 'resolved_at']

    def validate(self, attrs):
        # Cannot resolve an already resolved alert
        if self.instance.is_resolved:
            raise serializers.ValidationError(
                'This alert is already resolved.'
            )
        # Resolution notes are required when resolving
        if not attrs.get('resolution_notes'):
            raise serializers.ValidationError(
                {'resolution_notes': 'Resolution notes are required.'}
            )
        return attrs

    def update(self, instance, validated_data):
        instance.is_resolved     = True
        instance.resolution_notes = validated_data.get('resolution_notes', '')
        instance.resolved_by     = self.context['request'].user
        instance.resolved_at     = timezone.now()
        instance.save()
        return instance


class SmartAlertCreateSerializer(serializers.ModelSerializer):
    """
    Used internally by SmartAlertEngine to create alerts.
    Not exposed directly to API users — called via post_save signal.
    """
    class Meta:
        model = SmartAlert
        fields = [
            'job', 'observation', 'alert_type', 'pest_category',
            'title', 'message', 'rule_triggered', 'priority'
        ]