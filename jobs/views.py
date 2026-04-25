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


from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required

@csrf_exempt
@login_required
def supervisor_dashboard_api(request):
    # 1. Fetch real technicians
    tech_users = User.objects.filter(role='technician')
    
    # 2. Get real count from DB
    total_open_jobs = ServiceJob.objects.filter(status='open').count()
    
    # DEBUG: Check your terminal to see this number!
    print(f"--- Dashboard Debug: Found {total_open_jobs} open jobs in database ---")

    technicians_data = []
    alerts_data = []
    
    for tech in tech_users:
        first_name = tech.first_name if tech.first_name else tech.username
        last_name = tech.last_name if tech.last_name else ""
        initials = (first_name[0] + (last_name[0] if last_name else "")).upper()
        
        # Determine status
        current_status = "active" if tech.is_active else "offline"

        technicians_data.append({
            "id": tech.id,
            "name": f"{first_name} {last_name}".strip(),
            "status": current_status,
            "initials": initials,
            "job": "Monitoring...", 
            "color": "#3b82f6",
            "lat": 23.0225,
            "lng": 72.5714
        })

        # ALERT LOGIC (Must be inside the for loop)
        if current_status == "offline":
            alerts_data.append({
                "id": f"alert-{tech.id}",
                "type": "error",
                "message": f"Technician {tech.username} is currently offline.",
                "time": "Just now"
            })

    return JsonResponse({
        "technicians": technicians_data,
        "alerts": alerts_data,
        "total_open_jobs": total_open_jobs, # This will now be the real number
    })


from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from .models import ServiceJob

@login_required # Ensures only the logged-in technician can see their data
def technician_dashboard_api(request):
    user = request.user
    
    # 1. Fetch only jobs assigned to THIS technician
    # (Assuming your ServiceJob model has a 'technician' foreign key)
    my_jobs = ServiceJob.objects.filter(technician=user)
    
    jobs_list = []
    for index, job in enumerate(my_jobs, start=1):
        # Determine status mapping for React component
        badge_cls = "pending"
        btn_text = "Navigate"
        
        if job.status == "in_progress":
            badge_cls = "inprogress"
            btn_text = "Complete"
        elif job.status == "completed":
            badge_cls = "done"
            btn_text = "View"

        jobs_list.append({
            "num": index,
            "label": f"Job #{job.id} · Today",
            "name": job.service_type, # e.g., 'Pest Control'
            "addr": job.address,
            "badge": job.status.replace('_', ' ').title(),
            "badgeCls": badge_cls,
            "btn": btn_text,
            "btnCls": "primary" if badge_cls == "inprogress" else "secondary"
        })

    # 2. Equipment Stats (This could eventually come from a 'Inventory' model)
    equip_stats = [
        {"label": "Chemical Supply", "pct": 78, "cls": ""},
        {"label": "Battery Level", "pct": 91, "cls": ""},
        {"label": "Spray Pressure", "pct": 55, "cls": "warn"},
        {"label": "Fuel Reserve", "pct": 22, "cls": "low"},
    ]

    return JsonResponse({
        "jobs": jobs_list,
        "equipment": equip_stats,
        "summary": {
            "total": my_jobs.count(),
            "completed": my_jobs.filter(status='completed').count(),
            "in_progress": my_jobs.filter(status='in_progress').count(),
            "pending": my_jobs.filter(status='pending').count(),
        }
    })    