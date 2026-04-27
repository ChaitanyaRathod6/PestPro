from django.shortcuts import render

# Create your views here.
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import ServiceJob
from accounts.models import User
from .serializers import (
    ServiceJobCreateSerializer,
    ServiceJobListSerializer,
    ServiceJobDetailSerializer,
    JobStartSerializer,
    JobCompleteSerializer
)
from accounts.views import IsAdmin, IsAdminOrSupervisor
import datetime 
today = datetime.date.today()
from django.utils import timezone
today = timezone.localdate() 


# =============================================================================
# CUSTOM PERMISSION — Technician only
# =============================================================================

class IsTechnician(IsAuthenticated):
    def has_permission(self, request, view):
        return (
            super().has_permission(request, view) and
            request.user.role == 'technician'
        )


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


from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def supervisor_dashboard_api(request):

    tech_users = User.objects.filter(role='technician', is_active=True)

    open_jobs      = ServiceJob.objects.filter(status__in=['scheduled','in_progress']).count()
    active_jobs    = ServiceJob.objects.filter(status='in_progress').count()
    scheduled_jobs = ServiceJob.objects.filter(status='scheduled').count()
    completed_jobs = ServiceJob.objects.filter(status__in=['completed','report_sent']).count()
    total_observations = ServiceObservation.objects.count()

    active_technicians = ServiceJob.objects.filter(
        status='in_progress'
    ).values('assigned_technician').distinct().count()

    technicians_data = []
    for tech in tech_users:
        first_name = tech.first_name or tech.username
        last_name  = tech.last_name or ''
        ini        = (first_name[0] + (last_name[0] if last_name else '')).upper()

        active_job = ServiceJob.objects.filter(
            assigned_technician=tech,
            status='in_progress'
        ).first()

        technicians_data.append({
            'id':       tech.id,
            'name':     f'{first_name} {last_name}'.strip(),
            'status':   'active' if active_job else 'idle',
            'initials': ini,
            'job':      active_job.service_type.replace('_',' ').title() if active_job else 'No active job',
            'color':    '#1a6b3c' if active_job else '#e6a817',
        })

    return Response({
        'technicians':        technicians_data,
        'total_open_jobs':    open_jobs,
        'active_jobs':        active_jobs,
        'scheduled_jobs':     scheduled_jobs,
        'completed_jobs':     completed_jobs,
        'total_observations': total_observations,
        'active_technicians': active_technicians,
    })

from django.http import JsonResponse

from django.utils import timezone          # ← ADD THIS
from jobs.models import ServiceJob
from observations.models import (
    RodentObservation, MosquitoObservation,
    FlyingInsectObservation, GeneralObservation,
    ServiceObservation, TermiteObservation,
    CockroachObservation
)
from django.contrib.auth import get_user_model

User = get_user_model()


from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def technician_dashboard_api(request):
    user = request.user

    # ✅ FIXED — define today FIRST at the top
    today = timezone.localdate()                    # IST date, not UTC
    today_str = today.strftime('%A, %d %b')

    # ✅ FIXED — now 'today' exists when filter runs
    my_jobs = ServiceJob.objects.filter(
        assigned_technician=user,
        scheduled_datetime__date=today
    ).order_by('scheduled_datetime')

    jobs_list = []
    for index, job in enumerate(my_jobs, start=1):
        jobs_list.append({
            'id':             job.id,
            'num':            index,
            'status':         job.status,
            'service_type':   job.service_type,
            'customer_name':  job.customer.name if job.customer else '',
            'address':        job.site_address,
            'scheduled_date': str(job.scheduled_datetime.date()) if job.scheduled_datetime else '',
        })

    # Dynamic equipment from observations
    bait_replaced_count = RodentObservation.objects.filter(
        observation__recorded_by=user,
        bait_replaced=True
    ).count()

    fogging_count = MosquitoObservation.objects.filter(
        observation__recorded_by=user,
        fogging_done=True
    ).count()

    chemical_pct = max(5,  100 - (bait_replaced_count * 8) - (fogging_count * 12))
    battery_pct  = max(10, 100 - (my_jobs.count() * 3))
    pressure_pct = max(5,  100 - (bait_replaced_count * 5) - (fogging_count * 8))
    fuel_pct     = max(5,  100 - (my_jobs.count() * 6))

    def get_cls(pct):
        if pct < 30: return 'low'
        if pct < 60: return 'warn'
        return ''

    equip_stats = [
        {'label': 'Chemical Supply', 'pct': chemical_pct, 'cls': get_cls(chemical_pct)},
        {'label': 'Battery Level',   'pct': battery_pct,  'cls': get_cls(battery_pct)},
        {'label': 'Spray Pressure',  'pct': pressure_pct, 'cls': get_cls(pressure_pct)},
        {'label': 'Fuel Reserve',    'pct': fuel_pct,     'cls': get_cls(fuel_pct)},
    ]

    low_count = sum(1 for e in equip_stats if e['pct'] < 60)

    remaining       = my_jobs.exclude(status__in=['completed', 'report_sent', 'cancelled']).count()
    total           = my_jobs.count()
    completed_count = my_jobs.filter(status__in=['completed', 'report_sent']).count()
    in_progress_count = my_jobs.filter(status='in_progress').count()

    return JsonResponse({
        'jobs':           jobs_list,
        'equipment':      equip_stats,
        'today_date':     today_str,
        'remaining_jobs': remaining,
        'summary': {
            'total':       total,
            'completed':   completed_count,
            'in_progress': in_progress_count,
            'remaining':   remaining,
            'equip_low':   low_count,
            'equip_total': len(equip_stats),
        }
    })


class JobSignatureView(APIView):
    """Save technician/customer signature on a job."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            job = ServiceJob.objects.get(pk=pk)
        except ServiceJob.DoesNotExist:
            return Response({'error': 'Job not found.'}, status=404)

        signature = request.data.get('signed_by')
        if not signature:
            return Response({'error': 'Signature data is required.'}, status=400)

        job.signed_by = signature
        job.save()
        return Response({'message': 'Signature saved successfully.'})