from django.shortcuts import render

# Create your views here.
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import ServiceJob
from .serializers import (
    ServiceJobCreateSerializer,
    ServiceJobListSerializer,
    ServiceJobDetailSerializer,
    JobStartSerializer,
    JobCompleteSerializer
)
from accounts.views import IsAdmin, IsAdminOrSupervisor


# =============================================================================
# CUSTOM PERMISSION — Technician only
# =============================================================================

class IsTechnician(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and \
               request.user.role == 'technician'


# =============================================================================
# JOB VIEWS
# =============================================================================

class ServiceJobListCreateView(APIView):
    """
    GET  — List all jobs (UC-04)
    POST — Create a new job (UC-04)

    Admin and Supervisor can create and see all jobs.
    Technician can only see their own assigned jobs.
    """

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminOrSupervisor()]
        return [IsAuthenticated()]

    def get(self, request):
        user = request.user

        # Technicians only see their own jobs (RBAC-04 test case)
        if user.role == 'technician':
            jobs = ServiceJob.objects.filter(
                assigned_technician=user
            )
        else:
            jobs = ServiceJob.objects.all()

        # Filter by status if provided
        status_filter = request.query_params.get('status')
        if status_filter:
            jobs = jobs.filter(status=status_filter)

        # Filter by date if provided
        date_filter = request.query_params.get('date')
        if date_filter:
            jobs = jobs.filter(
                scheduled_datetime__date=date_filter
            )

        # Filter by technician if provided (Admin/Supervisor only)
        technician_filter = request.query_params.get('technician_id')
        if technician_filter and user.role in ['admin', 'supervisor']:
            jobs = jobs.filter(
                assigned_technician_id=technician_filter
            )

        serializer = ServiceJobListSerializer(jobs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ServiceJobCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        if serializer.is_valid():
            job = serializer.save()
            return Response(
                ServiceJobDetailSerializer(job).data,
                status=status.HTTP_201_CREATED
            )
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class ServiceJobDetailView(APIView):
    """
    GET   — View full job details
    PATCH — Update job details (Admin/Supervisor only)
    """
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        try:
            job = ServiceJob.objects.get(pk=pk)
            # Technician can only view their own jobs (RBAC-10 test case)
            if user.role == 'technician' and job.assigned_technician != user:
                return None, True  # None=not found, True=forbidden
            return job, False
        except ServiceJob.DoesNotExist:
            return None, False

    def get(self, request, pk):
        job, forbidden = self.get_object(pk, request.user)
        if forbidden:
            return Response(
                {'error': 'You do not have permission to view this job.'},
                status=status.HTTP_403_FORBIDDEN
            )
        if not job:
            return Response(
                {'error': 'Job not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = ServiceJobDetailSerializer(job)
        return Response(serializer.data)

    def patch(self, request, pk):
        # Only Admin and Supervisor can update job details
        if request.user.role not in ['admin', 'supervisor']:
            return Response(
                {'error': 'Only Admin or Supervisor can update jobs.'},
                status=status.HTTP_403_FORBIDDEN
            )
        job, _ = self.get_object(pk, request.user)
        if not job:
            return Response(
                {'error': 'Job not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        # Cannot edit a completed job
        if job.status in ['completed', 'report_sent']:
            return Response(
                {'error': 'Cannot edit a completed job.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        serializer = ServiceJobDetailSerializer(
            job,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class JobStartView(APIView):
    """
    Technician starts a scheduled job (UC-05).
    Only the assigned technician can start the job.
    Updates status to in_progress and records started_at timestamp.
    """
    permission_classes = [IsTechnician]

    def post(self, request, pk):
        try:
            job = ServiceJob.objects.get(pk=pk)
        except ServiceJob.DoesNotExist:
            return Response(
                {'error': 'Job not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = JobStartSerializer(
            job,
            data=request.data,
            context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Job started successfully.',
                'job': ServiceJobDetailSerializer(job).data
            }, status=status.HTTP_200_OK)
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class JobCompleteView(APIView):
    """
    Technician completes a job with digital signature (UC-09).
    Signature is required — PDF auto-generated after completion.
    Updates status to completed and records completed_at timestamp.
    """
    permission_classes = [IsTechnician]

    def post(self, request, pk):
        try:
            job = ServiceJob.objects.get(pk=pk)
        except ServiceJob.DoesNotExist:
            return Response(
                {'error': 'Job not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check job is not already completed (API-03 test case)
        if job.status in ['completed', 'report_sent']:
            return Response(
                {'error': 'Job is already completed.'},
                status=status.HTTP_409_CONFLICT
            )

        serializer = JobCompleteSerializer(
            job,
            data=request.data,
            context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Job completed successfully. PDF report will be generated.',
                'job': ServiceJobDetailSerializer(job).data
            }, status=status.HTTP_200_OK)
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class JobsByCustomerView(APIView):
    """
    List all jobs for a specific customer.
    Admin and Supervisor only.
    """
    permission_classes = [IsAdminOrSupervisor]

    def get(self, request, customer_id):
        jobs = ServiceJob.objects.filter(
            customer_id=customer_id
        ).order_by('-scheduled_datetime')

        if not jobs.exists():
            return Response(
                {'message': 'No jobs found for this customer.'},
                status=status.HTTP_200_OK
            )
        serializer = ServiceJobListSerializer(jobs, many=True)
        return Response(serializer.data)


class JobsByTechnicianView(APIView):
    """
    List all jobs assigned to a specific technician.
    Admin and Supervisor only.
    """
    permission_classes = [IsAdminOrSupervisor]

    def get(self, request, technician_id):
        jobs = ServiceJob.objects.filter(
            assigned_technician_id=technician_id
        ).order_by('-scheduled_datetime')

        if not jobs.exists():
            return Response(
                {'message': 'No jobs found for this technician.'},
                status=status.HTTP_200_OK
            )
        serializer = ServiceJobListSerializer(jobs, many=True)
        return Response(serializer.data)


class TodayJobsView(APIView):
    """
    List all jobs scheduled for today.
    Technician sees only their own jobs.
    Admin and Supervisor see all jobs today.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.now().date()
        user  = request.user

        if user.role == 'technician':
            jobs = ServiceJob.objects.filter(
                assigned_technician=user,
                scheduled_datetime__date=today
            )
        else:
            jobs = ServiceJob.objects.filter(
                scheduled_datetime__date=today
            )

        serializer = ServiceJobListSerializer(jobs, many=True)
        return Response({
            'date': str(today),
            'count': jobs.count(),
            'jobs': serializer.data
        })


class JobHealthCheckView(APIView):
    """
    Health check endpoint — confirms API is running.
    GET /api/health/
    """
    permission_classes = []

    def get(self, request):
        from django.db import connection
        try:
            connection.ensure_connection()
            db_status = 'ok'
        except Exception:
            db_status = 'error'

        return Response({
            'status': 'ok',
            'db':     db_status,
        })