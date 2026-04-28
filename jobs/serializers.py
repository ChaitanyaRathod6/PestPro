from rest_framework import serializers
from django.utils import timezone
from .models import ServiceJob
from accounts.models import Customer, User


class ServiceJobCreateSerializer(serializers.ModelSerializer):
    """
    Used by Admin and Supervisor to create a new service job (UC-04).
    Both roles can create jobs — Gap #3 fix from Data Dictionary v2.
    """
    class Meta:
        model = ServiceJob
        fields = [
            'id', 'job_uuid', 'customer', 'assigned_technician',
            'site_address', 'service_type', 'scheduled_datetime',
            'customer_sign_required', 'completion_notes',
        ]
        read_only_fields = ['id', 'job_uuid']

    def validate_scheduled_datetime(self, value):
     return value 

    def validate_customer(self, value):
        if not value.is_active:
            raise serializers.ValidationError(
                'Cannot create a job for an inactive customer.'
            )
        return value

    def validate_assigned_technician(self, value):
        if value and value.role != 'technician':
            raise serializers.ValidationError(
                'Assigned user must have the technician role.'
            )
        return value

    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['created_by_role'] = request.user.role
        validated_data['status'] = 'scheduled'
        return super().create(validated_data)


class ServiceJobListSerializer(serializers.ModelSerializer):
    """
    Used for listing jobs — shows key fields only.
    Technicians only see their own jobs.
    Admin and Supervisor see all jobs.
    """
    customer_name = serializers.CharField(
        source='customer.name', read_only=True
    )
    technician_name = serializers.SerializerMethodField()

    class Meta:
        model = ServiceJob
        fields = [
            'id', 'job_uuid', 'customer_name', 'technician_name',
            'service_type', 'status', 'scheduled_datetime',
            'started_at', 'completed_at', 'is_report_sent'
        ]

    def get_technician_name(self, obj):
        if obj.assigned_technician:
            return f"{obj.assigned_technician.first_name} {obj.assigned_technician.last_name}".strip()
        return None


class ServiceJobDetailSerializer(serializers.ModelSerializer):
    """
    Full job details — used when viewing a single job.
    """
    customer_name    = serializers.CharField(source='customer.name', read_only=True)
    customer_email   = serializers.CharField(source='customer.email', read_only=True)
    technician_name  = serializers.SerializerMethodField()
    technician_email = serializers.CharField(
        source='assigned_technician.email', read_only=True
    )

    class Meta:
        model = ServiceJob
        fields = [
            'id', 'job_uuid',
            'customer', 'customer_name', 'customer_email',
            'assigned_technician', 'technician_name', 'technician_email',
            'created_by_role', 'site_address', 'service_type', 'status',
            'scheduled_datetime', 'started_at', 'completed_at',
            'signed_by', 'customer_sign_required', 'customer_signed_at',
            'completion_notes', 'is_report_sent',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'job_uuid', 'created_by_role', 'status',
            'started_at', 'completed_at', 'customer_signed_at',
            'is_report_sent', 'created_at', 'updated_at'
        ]

    def get_technician_name(self, obj):
        if obj.assigned_technician:
            return f"{obj.assigned_technician.first_name} {obj.assigned_technician.last_name}".strip()
        return None


class JobStartSerializer(serializers.ModelSerializer):
    """
    Used by Technician to start a job (UC-05).
    Only updates status and started_at timestamp.
    """
    class Meta:
        model = ServiceJob
        fields = ['id', 'status', 'started_at']
        read_only_fields = ['id', 'status', 'started_at']

    def validate(self, attrs):
        job = self.instance
        # Job must be in scheduled status to start
        if job.status != 'scheduled':
            raise serializers.ValidationError(
                'Only scheduled jobs can be started.'
            )
        # Only the assigned technician can start the job
        request = self.context.get('request')
        if job.assigned_technician != request.user:
            raise serializers.ValidationError(
                'You are not assigned to this job.'
            )
        return attrs

    def update(self, instance, validated_data):
        instance.status = 'in_progress'
        instance.started_at = timezone.now()
        instance.save()
        return instance


class JobCompleteSerializer(serializers.ModelSerializer):
    """
    Used by Technician to complete a job with digital sign-off (UC-09).
    Signature is required — PDF is auto-generated after this.
    """
    class Meta:
        model = ServiceJob
        fields = [
            'id', 'status', 'signed_by',
            'completion_notes', 'completed_at'
        ]
        read_only_fields = ['id', 'status', 'completed_at']

    def validate(self, attrs):
        job = self.instance

        # Job must be in_progress to complete
        if job.status not in ['in_progress', 'observations_recorded']:
            raise serializers.ValidationError(
                'Job must be in progress to complete.'
            )

        # Signature is required (PDF-03 test case)
        if not attrs.get('signed_by'):
            raise serializers.ValidationError(
                {'signed_by': 'Signature is required to complete this job.'}
            )

        # Only assigned technician can complete
        request = self.context.get('request')
        if job.assigned_technician != request.user:
            raise serializers.ValidationError(
                'You are not assigned to this job.'
            )
        return attrs

    def update(self, instance, validated_data):
        instance.status = 'completed'
        instance.completed_at = timezone.now()
        instance.signed_by = validated_data.get('signed_by', '')
        instance.completion_notes = validated_data.get('completion_notes', '')
        instance.save()
        return instance