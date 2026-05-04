from django.shortcuts import render

# Create your views here.
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import SmartAlert
from .serializers import (
    SmartAlertListSerializer,
    SmartAlertDetailSerializer,
    SmartAlertResolveSerializer,
    SmartAlertCreateSerializer
)
from accounts.views import IsAdminOrSupervisor


# =============================================================================
# SMART ALERT VIEWS
# =============================================================================

class SmartAlertListView(APIView):
    """
    List all smart alerts (UC-10).
    Admin and Supervisor only — Technicians have no alert dashboard.
    Supports filter by priority, pest_category, is_resolved, customer.
    RBAC-05: Technician gets 403.
    """
    permission_classes = [IsAdminOrSupervisor]

    def get(self, request):
        alerts = SmartAlert.objects.all()

        # Filter by priority
        priority = request.query_params.get('priority')
        if priority:
            alerts = alerts.filter(priority=priority)

        # Filter by pest category
        pest_category = request.query_params.get('pest_category')
        if pest_category:
            alerts = alerts.filter(pest_category=pest_category)

        # Filter by resolved status
        is_resolved = request.query_params.get('is_resolved')
        if is_resolved is not None:
            alerts = alerts.filter(
                is_resolved=is_resolved.lower() == 'true'
            )

        # Filter by alert type
        alert_type = request.query_params.get('alert_type')
        if alert_type:
            alerts = alerts.filter(alert_type=alert_type)

        # Filter by customer
        customer_id = request.query_params.get('customer_id')
        if customer_id:
            alerts = alerts.filter(job__customer_id=customer_id)

        serializer = SmartAlertListSerializer(alerts, many=True)
        return Response({
            'count':   alerts.count(),
            'results': serializer.data
        })


class SmartAlertDetailView(APIView):
    permission_classes = [IsAdminOrSupervisor]

    def get_object(self, pk):
        try:
            return SmartAlert.objects.get(pk=pk)
        except SmartAlert.DoesNotExist:
            return None

    def get(self, request, pk):
        alert = self.get_object(pk)
        if not alert:
            return Response({'error': 'Alert not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = SmartAlertDetailSerializer(alert)
        return Response(serializer.data)

    def patch(self, request, pk):
        alert = self.get_object(pk)
        if not alert:
            return Response({'error': 'Alert not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = SmartAlertDetailSerializer(alert, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SmartAlertResolveView(APIView):
    """
    Resolve or reopen a smart alert.
    POST → resolve it
    PATCH → reopen it (set is_resolved=False)
    Admin and Supervisor only.
    """
    permission_classes = [IsAdminOrSupervisor]

    def post(self, request, pk):
        """Resolve the alert."""
        try:
            alert = SmartAlert.objects.get(pk=pk)
        except SmartAlert.DoesNotExist:
            return Response(
                {'error': 'Alert not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if alert.is_resolved:
            return Response(
                {'error': 'This alert is already resolved.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = SmartAlertResolveSerializer(
            alert,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        if serializer.is_valid():
            alert = serializer.save()          # ← use returned instance, not stale `alert`
            return Response(
                SmartAlertDetailSerializer(alert).data,   # ← return flat object, not nested
                status=status.HTTP_200_OK
            )
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    def patch(self, request, pk):
        """Reopen a resolved alert."""
        try:
            alert = SmartAlert.objects.get(pk=pk)
        except SmartAlert.DoesNotExist:
            return Response(
                {'error': 'Alert not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not alert.is_resolved:
            return Response(
                {'error': 'This alert is not resolved.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        alert.is_resolved   = False
        alert.resolved_by   = None
        alert.resolved_at   = None
        alert.is_read       = False
        alert.save()

        return Response(
            SmartAlertDetailSerializer(alert).data,
            status=status.HTTP_200_OK
        )


class SmartAlertByJobView(APIView):
    """
    List all alerts for a specific job.
    Admin and Supervisor only.
    """
    permission_classes = [IsAdminOrSupervisor]

    def get(self, request, job_id):
        alerts = SmartAlert.objects.filter(job_id=job_id)
        if not alerts.exists():
            return Response(
                {'message': 'No alerts found for this job.'},
                status=status.HTTP_200_OK
            )
        serializer = SmartAlertListSerializer(alerts, many=True)
        return Response({
            'job_id':  job_id,
            'count':   alerts.count(),
            'results': serializer.data
        })


class SmartAlertStatsView(APIView):
    """
    Alert statistics for the admin dashboard (UC-13).
    Returns counts by priority and resolution status.
    Admin and Supervisor only.
    """
    permission_classes = [IsAdminOrSupervisor]

    def get(self, request):
        total      = SmartAlert.objects.count()
        unresolved = SmartAlert.objects.filter(is_resolved=False)

        return Response({
            'total_alerts':      total,
            'unresolved_total':  unresolved.count(),
            'critical':  unresolved.filter(priority='critical').count(),
            'high':      unresolved.filter(priority='high').count(),
            'medium':    unresolved.filter(priority='medium').count(),
            'low':       unresolved.filter(priority='low').count(),
            'by_category': {
                'rodent':        unresolved.filter(pest_category='rodent').count(),
                'flying_insect': unresolved.filter(pest_category='flying_insect').count(),
                'cockroach':     unresolved.filter(pest_category='cockroach').count(),
                'termite':       unresolved.filter(pest_category='termite').count(),
                'mosquito':      unresolved.filter(pest_category='mosquito').count(),
                'general':       unresolved.filter(pest_category='general').count(),
            }
        })