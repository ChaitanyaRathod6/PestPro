from django.shortcuts import render

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
        try:
            job = ServiceJob.objects.get(pk=job_id)
        except ServiceJob.DoesNotExist:
            return Response(
                {'error': 'Job not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if request.user.role == 'technician' and \
                job.assigned_technician != request.user:
            return Response(
                {'error': 'You do not have permission to view these observations.'},
                status=status.HTTP_403_FORBIDDEN
            )

        observations = ServiceObservation.objects.filter(job=job)
        serializer = ServiceObservationSerializer(
            observations, many=True,
            context={'request': request}
        )
        return Response({
            'job_id':  job_id,
            'count':   observations.count(),
            'results': serializer.data
        })

    def post(self, request, job_id):
        import json

        try:
            job = ServiceJob.objects.get(pk=job_id)
        except ServiceJob.DoesNotExist:
            return Response(
                {'error': 'Job not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if job.assigned_technician != request.user:
            return Response(
                {'error': 'You are not assigned to this job.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if job.status not in ['in_progress', 'observations_recorded']:
            return Response(
                {'error': 'Job is not in progress.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ✅ FIX — flatten QueryDict lists into plain values
        import json

        raw = request.data
        data = {}

        for key in raw:
            val = raw.getlist(key) if hasattr(raw, 'getlist') else [raw[key]]
    # If only one value in list, unwrap it
            data[key] = val[0] if len(val) == 1 else val

        data['job'] = job_id

# Parse any nested detail JSON strings
        detail_keys = [
            'rodent_detail', 'flying_insect_detail', 'cockroach_detail',
            'termite_detail', 'mosquito_detail', 'general_detail'
        ]
        for key in detail_keys:
             if key in data and isinstance(data[key], str):
                try:
                    data[key] = json.loads(data[key])
                except (json.JSONDecodeError, TypeError):
                    pass

# Inject photo into detail dict
        photo = request.FILES.get('photo_evidence')
        if photo:
            category = data.get('observation_category', '')
            detail_key_map = {
                'rodent':        'rodent_detail',
                'flying_insect': 'flying_insect_detail',
                'cockroach':     'cockroach_detail',
                'termite':       'termite_detail',
                'mosquito':      'mosquito_detail',
                'general':       'general_detail',
            }
        detail_key = detail_key_map.get(category)
        if detail_key and isinstance(data.get(detail_key), dict):
         data[detail_key]['photo_evidence'] = photo

        # FIX 1 — parse nested detail JSON strings from FormData
        detail_keys = [
            'rodent_detail', 'flying_insect_detail', 'cockroach_detail',
            'termite_detail', 'mosquito_detail', 'general_detail'
        ]
        for key in detail_keys:
            if key in data and isinstance(data[key], str):
                try:
                    data[key] = json.loads(data[key])
                except (json.JSONDecodeError, TypeError):
                    pass

        # FIX 2 — inject photo file into the correct detail dict
        photo = request.FILES.get('photo_evidence')
        if photo:
            category = data.get('observation_category', '')
            detail_key_map = {
                'rodent':        'rodent_detail',
                'flying_insect': 'flying_insect_detail',
                'cockroach':     'cockroach_detail',
                'termite':       'termite_detail',
                'mosquito':      'mosquito_detail',
                'general':       'general_detail',
            }
            detail_key = detail_key_map.get(category)
            if detail_key and isinstance(data.get(detail_key), dict):
                data[detail_key]['photo_evidence'] = photo

        # Map category aliases from frontend
        category_map = {
            'rodent':        'rodent',
            'flying_insect': 'flying_insect',
            'flying insect': 'flying_insect',
            'cockroach':     'cockroach',
            'termite':       'termite',
            'mosquito':      'mosquito',
            'general':       'general',
        }
        if 'observation_category' not in data or not data['observation_category']:
            for cat in ['rodent', 'flying_insect', 'cockroach', 'termite', 'mosquito', 'general']:
                if f'{cat}_detail' in data or cat in str(data).lower():
                    data['observation_category'] = cat
                    break
        else:
            data['observation_category'] = category_map.get(
                data['observation_category'].lower().replace(' ', '_'),
                data['observation_category']
            )


        print("=" * 60)
        print("DEBUG FINAL DATA:", dict(data))
        print("DEBUG rodent_detail:", data.get('rodent_detail'))
        print("DEBUG cockroach_detail:", data.get('cockroach_detail'))
        print("DEBUG category:", data.get('observation_category'))
        print("=" * 60)    

        serializer = ServiceObservationSerializer(
            data=data,
            context={'request': request}
        )
        if serializer.is_valid():
            observation = serializer.save()
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
    """
    permission_classes = [IsAdminOrSupervisor]

    def get(self, request):
        job_id = request.query_params.get('job_id')
        if job_id:
            observations = RodentObservation.objects.filter(
                observation__job_id=job_id
            )
        else:
            observations = RodentObservation.objects.all()

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
    Used in job completion flow (UC-09).
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

        if request.user.role == 'technician' and \
                job.assigned_technician != request.user:
            return Response(
                {'error': 'You do not have permission to view this job.'},
                status=status.HTTP_403_FORBIDDEN
            )

        observations = ServiceObservation.objects.filter(job=job)

        summary = {}
        for category in ['rodent', 'flying_insect', 'cockroach',
                         'termite', 'mosquito', 'general']:
            count = observations.filter(
                observation_category=category
            ).count()
            if count > 0:
                summary[category] = count

        return Response({
            'job_id':             job_id,
            'job_status':         job.status,
            'total_observations': observations.count(),
            'by_category':        summary,
            'customer':           job.customer.name,
            'site_address':       job.site_address,
            'service_type':       job.service_type,
        })
    

class ObservationPhotoUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, job_id, obs_id):
        try:
            obs = ServiceObservation.objects.get(
                id=obs_id,
                job_id=job_id,
                recorded_by=request.user
            )
        except ServiceObservation.DoesNotExist:
            return Response({'error': 'Observation not found.'}, status=404)

        photo = request.FILES.get('photo_evidence')
        if not photo:
            return Response({'error': 'No photo provided.'}, status=400)

        child_map = {
            'rodent':        'rodent_obs',
            'flying_insect': 'flyinginsect_obs',
            'cockroach':     'cockroach_obs',
            'termite':       'termite_obs',
            'mosquito':      'mosquito_obs',
            'general':       'general_obs',
        }
        related = child_map.get(obs.observation_category)
        if related:
            try:
                child = getattr(obs, related)
                child.photo_evidence = photo
                child.save()
            except Exception as e:
                return Response({'error': str(e)}, status=400)

        return Response({'status': 'photo uploaded'})    