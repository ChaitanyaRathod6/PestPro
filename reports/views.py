from django.shortcuts import render

# Create your views here.
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from django.http import FileResponse
from .models import PDFReport, EmailLog
from .serializers import (
    PDFReportSerializer,
    PDFReportDownloadSerializer,
    EmailLogSerializer,
    EmailLogListSerializer
)
from jobs.models import ServiceJob
from accounts.views import IsAdminOrSupervisor


# =============================================================================
# PDF REPORT VIEWS
# =============================================================================

class PDFReportListView(APIView):
    """
    List all PDF reports.
    Admin and Supervisor only (RBAC-07).
    """
    permission_classes = [IsAdminOrSupervisor]

    def get(self, request):
        reports = PDFReport.objects.all().order_by('-generated_at')

        # Filter by job if provided
        job_id = request.query_params.get('job_id')
        if job_id:
            reports = reports.filter(job_id=job_id)

        serializer = PDFReportSerializer(
            reports, many=True,
            context={'request': request}
        )
        return Response({
            'count':   reports.count(),
            'results': serializer.data
        })


class PDFReportDetailView(APIView):
    """
    View a single PDF report details.
    Admin and Supervisor only.
    """
    permission_classes = [IsAdminOrSupervisor]

    def get(self, request, pk):
        try:
            report = PDFReport.objects.get(pk=pk)
        except PDFReport.DoesNotExist:
            return Response(
                {'error': 'Report not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = PDFReportSerializer(
            report,
            context={'request': request}
        )
        return Response(serializer.data)


class PDFReportByJobView(APIView):
    """
    Get the PDF report for a specific job.
    Admin and Supervisor only (UC-14).
    """
    permission_classes = [IsAdminOrSupervisor]

    def get(self, request, job_id):
        try:
            report = PDFReport.objects.get(job_id=job_id)
        except PDFReport.DoesNotExist:
            return Response(
                {'error': 'No PDF report found for this job.'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = PDFReportSerializer(
            report,
            context={'request': request}
        )
        return Response(serializer.data)


class PDFDownloadView(APIView):
    """
    Customer downloads PDF via secure token link (UC-11).
    No authentication required — token IS the authentication.
    PDF-04: Valid token → 200, file served.
    PDF-05: Expired token → 403.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        token = request.query_params.get('token')

        if not token:
            return Response(
                {'error': 'Download token is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            report = PDFReport.objects.get(download_token=token)
        except PDFReport.DoesNotExist:
            return Response(
                {'error': 'Invalid download token.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check token expiry (PDF-05 test case)
        if timezone.now() > report.token_expires_at:
            return Response(
                {'error': 'Download link has expired.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = PDFReportDownloadSerializer(report)
        return Response(serializer.data)


class PDFRegenerateView(APIView):
    """
    Admin or Supervisor manually regenerates a PDF report (UC-14).
    Creates a new download token and updates the report file.
    PDF-07: New PDF created, existing PDFReport updated.
    """
    permission_classes = [IsAdminOrSupervisor]

    def post(self, request, job_id):
        try:
            job = ServiceJob.objects.get(pk=job_id)
        except ServiceJob.DoesNotExist:
            return Response(
                {'error': 'Job not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Job must be completed to generate PDF
        if job.status not in ['completed', 'report_sent']:
            return Response(
                {'error': 'Job must be completed before generating PDF.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get or create PDF report record
        report, created = PDFReport.objects.get_or_create(
            job=job,
            defaults={'generated_by': request.user}
        )

        if not created:
            # Regenerate — update generated_by and reset token
            import uuid
            from datetime import timedelta
            report.generated_by      = request.user
            report.download_token    = uuid.uuid4()
            report.token_expires_at  = timezone.now() + timedelta(days=7)
            report.save()

        return Response({
            'message': 'PDF report regenerated successfully.',
            'report':  PDFReportSerializer(
                report,
                context={'request': request}
            ).data
        }, status=status.HTTP_200_OK)


# =============================================================================
# EMAIL LOG VIEWS
# =============================================================================

class EmailLogListView(APIView):
    """
    List all email logs.
    Admin only — full audit trail.
    """
    permission_classes = [IsAdminOrSupervisor]

    def get(self, request):
        logs = EmailLog.objects.all().order_by('-sent_at')

        # Filter by status
        email_status = request.query_params.get('status')
        if email_status:
            logs = logs.filter(status=email_status)

        # Filter by email type
        email_type = request.query_params.get('email_type')
        if email_type:
            logs = logs.filter(email_type=email_type)

        # Filter by job
        job_id = request.query_params.get('job_id')
        if job_id:
            logs = logs.filter(job_id=job_id)

        # Filter failed emails only
        failed_only = request.query_params.get('failed_only')
        if failed_only == 'true':
            logs = logs.filter(status='failed')

        serializer = EmailLogListSerializer(logs, many=True)
        return Response({
            'count':   logs.count(),
            'results': serializer.data
        })


class EmailLogDetailView(APIView):
    """
    Full details of a single email log entry.
    Admin only.
    """
    permission_classes = [IsAdminOrSupervisor]

    def get(self, request, pk):
        try:
            log = EmailLog.objects.get(pk=pk)
        except EmailLog.DoesNotExist:
            return Response(
                {'error': 'Email log not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = EmailLogSerializer(log)
        return Response(serializer.data)


class EmailLogStatsView(APIView):
    """
    Email delivery statistics for admin monitoring.
    Shows counts by status and type.
    """
    permission_classes = [IsAdminOrSupervisor]

    def get(self, request):
        logs = EmailLog.objects.all()
        return Response({
            'total':    logs.count(),
            'sent':     logs.filter(status='sent').count(),
            'failed':   logs.filter(status='failed').count(),
            'pending':  logs.filter(status='pending').count(),
            'retrying': logs.filter(status='retrying').count(),
            'by_type': {
                'otp_login':           logs.filter(email_type='otp_login').count(),
                'job_started':         logs.filter(email_type='job_started').count(),
                'observation_update':  logs.filter(email_type='observation_update').count(),
                'completion_report':   logs.filter(email_type='completion_report').count(),
                'high_activity_alert': logs.filter(email_type='high_activity_alert').count(),
                'maintenance_alert':   logs.filter(email_type='maintenance_alert').count(),
            }
        })