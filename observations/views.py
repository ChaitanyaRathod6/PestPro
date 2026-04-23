from django.shortcuts import render

# Create your views here.
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from alerts.engine import SmartAlertEngine
from .models import (
    ServiceObservation,
    RodentObservation,
    FlyingInsectObservation,
    CockroachObservation,
    TermiteObservation,
    MosquitoObservation,
    GeneralObservation
)
from .serializers import (
    ServiceObservationSerializer,
    RodentObservationSerializer,
    FlyingInsectObservationSerializer,
    CockroachObservationSerializer,
    TermiteObservationSerializer,
    MosquitoObservationSerializer,
    GeneralObservationSerializer
)
from jobs.models import ServiceJob
from accounts.views import IsAdminOrSupervisor


# =============================================================================
# CUSTOM PERMISSION — Technician only
# =============================================================================

class IsTechnician(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and \
               request.user.role == 'technician'


# =============================================================================
# OBSERVATION VIEWS
# =============================================================================

class ObservationListCreateView(APIView):
    """
    GET  — List all observations for a job
    POST — Record a new observation (UC-06, UC-07, UC-08)

    Only the assigned technician can record observations.
    Admin and Supervisor can view all observations.
    """

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsTechnician()]
        return [IsAuthenticated()]

    def get(self, request, job_id):
        # Verify job exists
        try:
            job = ServiceJob.objects.get(pk=job_id)
        except ServiceJob.DoesNotExist:
            return Response(
                {'error': 'Job not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Technician can only view observations for their own jobs
        if request.user.role == 'technician' and \
                job.assigned_technician != request.user:
            return Response(
                {'error': 'You do not have permission to view these observations.'},
                status=status.HTTP_403_FORBIDDEN
            )

        observations = ServiceObservation.objects.filter(job=job)
        serializer   = ServiceObservationSerializer(
            observations, many=True,
            context={'request': request}
        )
        return Response({
            'job_id':  job_id,
            'count':   observations.count(),
            'results': serializer.data
        })

    def post(self, request, job_id):
        # Verify job exists
        try:
            job = ServiceJob.objects.get(pk=job_id)
        except ServiceJob.DoesNotExist:
            return Response(
                {'error': 'Job not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Only assigned technician can record observations
        if job.assigned_technician != request.user:
            return Response(
                {'error': 'You are not assigned to this job.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Job must be in progress (API-02 test case)
        if job.status not in ['in_progress', 'observations_recorded']:
            return Response(
                {'error': 'Job is not in progress.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Inject job into request data
        data = request.data.copy()
        data['job'] = job_id

        serializer = ServiceObservationSerializer(
            data=data,
            context={'request': request}
        )
        if serializer.is_valid():
            observation = serializer.save()

            from alerts.engine import SmartAlertEngine
            SmartAlertEngine.run(observation)


            return Response(
                ServiceObservationSerializer(
                    observation,
                    context={'request': request}
                ).data,
                status=status.HTTP_201_CREATED
            )
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class ObservationDetailView(APIView):
    """
    GET — View a single observation with all child details.
    Admin, Supervisor can view any observation.
    Technician can only view observations from their own jobs.
    """
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        try:
            obs = ServiceObservation.objects.get(pk=pk)
            if user.role == 'technician' and \
                    obs.job.assigned_technician != user:
                return None, True
            return obs, False
        except ServiceObservation.DoesNotExist:
            return None, False

    def get(self, request, pk):
        obs, forbidden = self.get_object(pk, request.user)
        if forbidden:
            return Response(
                {'error': 'You do not have permission to view this observation.'},
                status=status.HTTP_403_FORBIDDEN
            )
        if not obs:
            return Response(
                {'error': 'Observation not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = ServiceObservationSerializer(
            obs,
            context={'request': request}
        )
        return Response(serializer.data)


class RodentObservationListView(APIView):
    """
    List all rodent observations across all jobs.
    Admin and Supervisor only.
    Used for SmartAlertEngine rule R-01 dashboard view.
    """
    permission_classes = [IsAdminOrSupervisor]

    def get(self, request):
        # Filter by job if provided
        job_id = request.query_params.get('job_id')
        if job_id:
            observations = RodentObservation.objects.filter(
                observation__job_id=job_id
            )
        else:
            observations = RodentObservation.objects.all()

        # Filter by activity level if provided
        activity = request.query_params.get('activity_level')
        if activity:
            observations = observations.filter(activity_level=activity)

        serializer = RodentObservationSerializer(
            observations, many=True,
            context={'request': request}
        )
        return Response({
            'count':   observations.count(),
            'results': serializer.data
        })


class FlyingInsectObservationListView(APIView):
    """
    List all flying insect observations.
    Admin and Supervisor only.
    Used for flycatcher machine trend charts on dashboard (UC-13).
    """
    permission_classes = [IsAdminOrSupervisor]

    def get(self, request):
        job_id = request.query_params.get('job_id')
        if job_id:
            observations = FlyingInsectObservation.objects.filter(
                observation__job_id=job_id
            )
        else:
            observations = FlyingInsectObservation.objects.all()

        # Filter non-functional machines
        non_functional = request.query_params.get('non_functional')
        if non_functional == 'true':
            observations = observations.filter(machine_functional=False)

        serializer = FlyingInsectObservationSerializer(
            observations, many=True,
            context={'request': request}
        )
        return Response({
            'count':   observations.count(),
            'results': serializer.data
        })


class CockroachObservationListView(APIView):
    """
    List all cockroach observations.
    Admin and Supervisor only.
    """
    permission_classes = [IsAdminOrSupervisor]

    def get(self, request):
        job_id = request.query_params.get('job_id')
        if job_id:
            observations = CockroachObservation.objects.filter(
                observation__job_id=job_id
            )
        else:
            observations = CockroachObservation.objects.all()

        serializer = CockroachObservationSerializer(
            observations, many=True,
            context={'request': request}
        )
        return Response({
            'count':   observations.count(),
            'results': serializer.data
        })


class TermiteObservationListView(APIView):
    """
    List all termite observations.
    Admin and Supervisor only.
    """
    permission_classes = [IsAdminOrSupervisor]

    def get(self, request):
        job_id = request.query_params.get('job_id')
        if job_id:
            observations = TermiteObservation.objects.filter(
                observation__job_id=job_id
            )
        else:
            observations = TermiteObservation.objects.all()

        # Filter by damage severity if provided
        severity = request.query_params.get('damage_severity')
        if severity:
            observations = observations.filter(damage_severity=severity)

        serializer = TermiteObservationSerializer(
            observations, many=True,
            context={'request': request}
        )
        return Response({
            'count':   observations.count(),
            'results': serializer.data
        })


class MosquitoObservationListView(APIView):
    """
    List all mosquito observations.
    Admin and Supervisor only.
    """
    permission_classes = [IsAdminOrSupervisor]

    def get(self, request):
        job_id = request.query_params.get('job_id')
        if job_id:
            observations = MosquitoObservation.objects.filter(
                observation__job_id=job_id
            )
        else:
            observations = MosquitoObservation.objects.all()

        serializer = MosquitoObservationSerializer(
            observations, many=True,
            context={'request': request}
        )
        return Response({
            'count':   observations.count(),
            'results': serializer.data
        })


class GeneralObservationListView(APIView):
    """
    List all general observations.
    Admin and Supervisor only.
    """
    permission_classes = [IsAdminOrSupervisor]

    def get(self, request):
        job_id = request.query_params.get('job_id')
        if job_id:
            observations = GeneralObservation.objects.filter(
                observation__job_id=job_id
            )
        else:
            observations = GeneralObservation.objects.all()

        # Filter by pest type if provided
        pest_type = request.query_params.get('pest_type')
        if pest_type:
            observations = observations.filter(
                pest_type_observed__icontains=pest_type
            )

        serializer = GeneralObservationSerializer(
            observations, many=True,
            context={'request': request}
        )
        return Response({
            'count':   observations.count(),
            'results': serializer.data
        })


class ObservationSummaryView(APIView):
    """
    Summary of all observations for a job.
    Used in job completion flow (UC-09) — technician reviews
    before signing off.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, job_id):
        try:
            job = ServiceJob.objects.get(pk=job_id)
        except ServiceJob.DoesNotExist:
            return Response(
                {'error': 'Job not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Technician can only view summary for their own job
        if request.user.role == 'technician' and \
                job.assigned_technician != request.user:
            return Response(
                {'error': 'You do not have permission to view this job.'},
                status=status.HTTP_403_FORBIDDEN
            )

        observations = ServiceObservation.objects.filter(job=job)

        # Build summary by category
        summary = {}
        for category in ['rodent', 'flying_insect', 'cockroach',
                         'termite', 'mosquito', 'general']:
            count = observations.filter(
                observation_category=category
            ).count()
            if count > 0:
                summary[category] = count

        return Response({
            'job_id':              job_id,
            'job_status':          job.status,
            'total_observations':  observations.count(),
            'by_category':         summary,
            'customer':            job.customer.name,
            'site_address':        job.site_address,
            'service_type':        job.service_type,
        })