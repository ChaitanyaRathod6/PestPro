from django.shortcuts import render

# Create your views here.
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated,AllowAny
from django.utils import timezone
from .models import ServiceJob
from accounts.models import Customer, User
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

            # ── PDF GENERATION TRIGGER ──────────────────────────
            try:
                from reports.tasks import generate_pdf_report_task
                generate_pdf_report_task.delay(job.pk)
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f'[PDF] Failed to queue for job {job.pk}: {e}')
            # ────────────────────────────────────────────────────

            return Response({
                'message': 'Job completed successfully. PDF report will be generated.',
                'job': ServiceJobDetailSerializer(job).data
            }, status=status.HTTP_200_OK)
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


from jobs.serializers import ServiceJobListSerializer

class JobsByCustomerView(generics.ListAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = ServiceJobListSerializer  # ← updated

    def get_queryset(self):
        customer_id = self.kwargs['customer_id']
        auth_header = self.request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '').strip()
        try:
            customer = Customer.objects.get(id=customer_id, access_token=token)
        except Customer.DoesNotExist:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Invalid or expired token.')
        return ServiceJob.objects.filter(customer_id=customer_id)


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
    

from django.utils import timezone
from datetime import timedelta
from django.db.models import Avg, Count, Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

class TechnicianPerformanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tech   = request.user
        period = request.query_params.get('period', 'month')
        now    = timezone.now()

        if period == 'week':
            start = now - timedelta(days=7)
        elif period == 'custom':
            start_str = request.query_params.get('start')
            start = timezone.datetime.fromisoformat(start_str) if start_str else now - timedelta(days=30)
        else:
            start = now - timedelta(days=30)

        all_jobs       = ServiceJob.objects.filter(assigned_technician=tech, scheduled_datetime__gte=start)
        completed_jobs = all_jobs.filter(status__in=['completed', 'report_sent'])
        total_cnt      = all_jobs.count()
        completed_cnt  = completed_jobs.count()

        on_time_cnt = 0
        durations   = []
        for job in completed_jobs:
            if job.completed_at and job.scheduled_datetime:
                if job.completed_at <= job.scheduled_datetime:
                    on_time_cnt += 1
            if job.completed_at and job.started_at:
                durations.append((job.completed_at - job.started_at).total_seconds() / 60)

        on_time_rate = round((on_time_cnt / completed_cnt * 100) if completed_cnt else 0, 1)
        avg_mins     = round(sum(durations) / len(durations)) if durations else None

        obs_count    = sum(job.observations.count()   for job in all_jobs)
        alerts_count = sum(job.smart_alerts.count()   for job in all_jobs)

        recent_jobs = list(
            all_jobs.order_by('-scheduled_datetime')[:5].values(
                'id', 'status', 'service_type',
                'scheduled_datetime', 'completed_at', 'site_address'
            )
        )

        return Response({
            'period':                period,
            'total_jobs':            total_cnt,
            'completed_jobs':        completed_cnt,
            'on_time_rate':          on_time_rate,
            'avg_completion_min':    avg_mins,
            'observations_recorded': obs_count,
            'alerts_triggered':      alerts_count,
            'recent_jobs':           recent_jobs,
        })
    


class JobReassignView(APIView):
    permission_classes = [IsAdminOrSupervisor]

    def patch(self, request, pk):
        try:
            job = ServiceJob.objects.get(pk=pk)
        except ServiceJob.DoesNotExist:
            return Response({'error': 'Job not found.'}, status=404)

        technician_id = request.data.get('technician_id')
        if not technician_id:
            return Response({'error': 'technician_id is required.'}, status=400)

        # FIX — use get_user_model instead of direct import
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            tech = User.objects.get(pk=technician_id, role='technician')
        except User.DoesNotExist:
            return Response({'error': 'Technician not found.'}, status=404)

        job.assigned_technician = tech
        job.save(update_fields=['assigned_technician'])
        return Response({
            'message': 'Technician reassigned successfully.',
            'job_id': job.id,
            'technician_name': tech.get_full_name() or tech.username,
        })


class JobNotesView(APIView):
    permission_classes = [IsAdminOrSupervisor]

    def patch(self, request, pk):
        try:
            job = ServiceJob.objects.get(pk=pk)
        except ServiceJob.DoesNotExist:
            return Response({'error': 'Job not found.'}, status=404)

        notes = request.data.get('completion_notes', '')
        job.completion_notes = notes
        job.save(update_fields=['completion_notes'])
        return Response({'message': 'Notes saved.', 'completion_notes': notes})  


class StaffListView(APIView):
    permission_classes = [IsAdminOrSupervisor]

    def get(self, request):
        from accounts.models import CustomUser
        technicians = CustomUser.objects.filter(role='technician', is_active=True)
        data = [
            {
                'id': t.id,
                'name': t.get_full_name() or t.username,
                'username': t.username,
            }
            for t in technicians
        ]
        return Response(data) 


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def staff_detail_stats(request, staff_id):
    """
    Returns job stats for any staff member.
    Supervisor  → jobs they CREATED
    Technician  → jobs ASSIGNED to them
    """
    from accounts.models import User
    try:
        staff = User.objects.get(pk=staff_id)
    except User.DoesNotExist:
        return Response({'error': 'Staff not found.'}, status=404)

    if staff.role == 'supervisor':
        jobs = ServiceJob.objects.filter(created_by=staff)
    else:
        jobs = ServiceJob.objects.filter(assigned_technician=staff)

    total     = jobs.count()
    completed = jobs.filter(status__in=['completed', 'report_sent']).count()
    active    = jobs.filter(status='in_progress').count()
    scheduled = jobs.filter(status='scheduled').count()

    recent = jobs.order_by('-scheduled_datetime')[:5]
    recent_data = ServiceJobListSerializer(recent, many=True).data

    return Response({
        'total_jobs':      total,
        'completed_jobs':  completed,
        'active_jobs':     active,
        'scheduled_jobs':  scheduled,
        'completion_rate': round((completed / total * 100)) if total > 0 else 0,
        'recent_jobs':     recent_data,
        'role':            staff.role,
    })        


from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import ServiceJob  # adjust import if needed
from jobs.authentication import CustomerTokenAuthentication

class JobObservationsView(APIView):
    authentication_classes = [CustomerTokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            job = ServiceJob.objects.get(pk=pk)
        except ServiceJob.DoesNotExist:
            return Response({'error': 'Job not found'}, status=404)
        
        # Replace with your actual observations field/related model
        observations = job.observations  # e.g. a TextField or related model
        return Response({'observations': observations})

    def post(self, request, pk):
        try:
            job = ServiceJob.objects.get(pk=pk)
        except ServiceJob.DoesNotExist:
            return Response({'error': 'Job not found'}, status=404)
        
        # Save observation logic here
        return Response({'status': 'saved'})
    

class CustomerReportView(APIView):
    authentication_classes = [CustomerTokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        customer_id = request.query_params.get('customer_id')
        if not customer_id:
            return Response({'error': 'customer_id required'}, status=400)
        
        # Your report logic here
        return Response({'customer_id': customer_id, 'report': []})


