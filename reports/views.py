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
    permission_classes = [IsAdminOrSupervisor]

    def get(self, request):
        reports = PDFReport.objects.select_related(
            'job',
            'job__customer',        # ← needed for customer_name, customer_email
            'generated_by',
        ).order_by('-generated_at')

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
    Get full report detail for a specific job.
    Returns nested job, customer, technician, observations, alerts.
    Matches AdminReportDetailPage frontend structure exactly.
    """
    permission_classes = [IsAdminOrSupervisor]

    def get(self, request, job_id):
        # Get the job with all related data in one query
        try:
            job = ServiceJob.objects.select_related(
    'customer',
    'assigned_technician',
).prefetch_related(
    'observations__rodent_detail',
    'observations__flying_insect_detail',
    'observations__cockroach_detail',
    'observations__termite_detail',
    'observations__mosquito_detail',
    'observations__general_detail',
    'smart_alerts',
).get(pk=job_id)
        except ServiceJob.DoesNotExist:
            return Response(
                {'error': 'Job not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get PDF report if it exists
        try:
            report = PDFReport.objects.get(job=job)
            report_data = {
                'id':               report.id,
                'report_file':      request.build_absolute_uri(report.report_file.url)
                                    if report.report_file else None,
                'generated_at':     report.generated_at,
                'download_token':   str(report.download_token),
                'token_expires_at': report.token_expires_at,
                'file_size_kb':     report.file_size_kb,
                'includes_signature': report.includes_signature,
                'is_expired':       timezone.now() > report.token_expires_at,
            }
        except PDFReport.DoesNotExist:
            report_data = None

        # Build customer data
        customer = job.customer
        customer_data = {
            'name':         customer.name         if customer else None,
            'email':        customer.email        if customer else None,
            'phone':        customer.phone        if customer else None,
            'company_name': customer.company_name if customer else None,
            'address':      customer.address      if customer else None,
            'city':         customer.city         if customer else None,
        } if customer else None

        # Build technician data
        tech = job.assigned_technician
        technician_data = {
            'first_name': tech.first_name if tech else None,
            'last_name':  tech.last_name  if tech else None,
            'email':      tech.email      if tech else None,
            'phone':      tech.phone      if tech else None,
            'username':   tech.username   if tech else None,
        } if tech else None

       # Build observations list
        observations_data = []
        for obs in job.observations.all():
            obs_entry = {
                'id':                   obs.id,
                'observation_category': obs.observation_category,
                'observation_type':     obs.observation_category,
                'observation_time':     obs.observation_time,
                'notes':                obs.notes,
                'recorded_at':          obs.observation_time,
                'recorded_by':          obs.recorded_by.get_full_name() or obs.recorded_by.username,
            }

            if obs.observation_category == 'rodent':
                try:
                    r = obs.rodent_detail
                    obs_entry.update({
                        'pest_type': 'Rodent',
                        'area':      r.location_in_premises,
                        'severity':  r.activity_level,
                        'rodent_detail': {
                            'rodent_box_id':        r.rodent_box_id,
                            'location':             r.location_in_premises,
                            'rats_found_count':     r.rats_found_count,
                            'bait_consumed':        r.bait_consumed,
                            'bait_replaced':        r.bait_replaced,
                            'droppings_observed':   r.droppings_observed,
                            'gnaw_marks':           r.gnaw_marks,
                            'activity_level':       r.activity_level,
                            'bait_stations_placed': r.rodent_box_id,
                            'traps_set':            r.rats_found_count,
                            'technician_remarks':   r.technician_remarks,
                            'photo_evidence':       request.build_absolute_uri(r.photo_evidence.url)
                                                    if r.photo_evidence else None,
                        }
                    })
                except Exception:
                    pass

            elif obs.observation_category == 'flying_insect':
                try:
                    f = obs.flying_insect_detail
                    obs_entry.update({
                        'pest_type': 'Flying Insect',
                        'area':      f.machine_location,
                        'severity':  'high' if f.insects_trapped_count > 50 else 'medium'
                                     if f.insects_trapped_count > 20 else 'low',
                        'flying_insect_detail': {
                            'machine_id':           f.flycatcher_machine_id,
                            'machine_location':     f.machine_location,
                            'device_type':          f.flycatcher_machine_id,
                            'insect_count':         f.insects_trapped_count,
                            'insect_types':         f.insect_types_trapped,
                            'action_taken':         'Glue board replaced' if f.glue_board_changed else 'Inspected only',
                            'glue_board_changed':   f.glue_board_changed,
                            'glue_board_condition': f.glue_board_condition,
                            'machine_functional':   f.machine_functional,
                            'technician_remarks':   f.technician_remarks,
                            'photo_evidence':       request.build_absolute_uri(f.photo_evidence.url)
                                                    if f.photo_evidence else None,
                        }
                    })
                except Exception:
                    pass

            elif obs.observation_category == 'cockroach':
                try:
                    c = obs.cockroach_detail
                    obs_entry.update({
                        'pest_type': 'Cockroach',
                        'area':      c.location_in_premises,
                        'severity':  c.activity_level,
                        'cockroach_detail': {
                            'station_id':         c.station_id,
                            'location':           c.location_in_premises,
                            'cockroaches_found':  c.cockroaches_found,
                            'gel_applied':        c.gel_applied,
                            'gel_consumed':       c.gel_consumed,
                            'spray_used':         False,
                            'infestation_level':  c.activity_level,
                            'infestation_area':   c.infestation_area,
                            'technician_remarks': c.technician_remarks,
                            'photo_evidence':     request.build_absolute_uri(c.photo_evidence.url)
                                                  if c.photo_evidence else None,
                        }
                    })
                except Exception:
                    pass

            elif obs.observation_category == 'termite':
                try:
                    t = obs.termite_detail
                    obs_entry.update({
                        'pest_type': 'Termite',
                        'area':      t.station_location,
                        'severity':  t.damage_severity,
                        'termite_detail': {
                            'station_id':         t.station_id,
                            'station_location':   t.station_location,
                            'termites_found':     t.termites_found,
                            'bait_consumed':      t.bait_consumed,
                            'bait_replaced':      t.bait_replaced,
                            'mud_tubes_found':    t.mud_tubes_found,
                            'wood_damage':        t.wood_damage_observed,
                            'damage_severity':    t.damage_severity,
                            'drilling_done':      t.mud_tubes_found,
                            'chemical_injected':  t.bait_replaced,
                            'affected_area':      t.station_location,
                            'technician_remarks': t.technician_remarks,
                            'photo_evidence':     request.build_absolute_uri(t.photo_evidence.url)
                                                  if t.photo_evidence else None,
                        }
                    })
                except Exception:
                    pass

            elif obs.observation_category == 'mosquito':
                try:
                    m = obs.mosquito_detail
                    obs_entry.update({
                        'pest_type': 'Mosquito',
                        'area':      m.treatment_area,
                        'severity':  m.adult_mosquito_density,
                        'mosquito_detail': {
                            'treatment_area':            m.treatment_area,
                            'fogging_done':              m.fogging_done,
                            'chemical_used':             m.chemical_used,
                            'breeding_sites_found':      m.breeding_sites_found,
                            'breeding_sites_eliminated': m.breeding_sites_eliminated,
                            'larval_activity':           m.larval_activity,
                            'adult_mosquito_density':    m.adult_mosquito_density,
                            'larvicide_applied':         m.larval_activity,
                            'technician_remarks':        m.technician_remarks,
                            'photo_evidence':            request.build_absolute_uri(m.photo_evidence.url)
                                                         if m.photo_evidence else None,
                        }
                    })
                except Exception:
                    pass

            elif obs.observation_category == 'general':
                try:
                    g = obs.general_detail
                    obs_entry.update({
                        'pest_type': g.pest_type_observed,
                        'area':      g.location_in_premises,
                        'severity':  g.activity_level,
                        'general_detail': {
                            'pest_type_observed':    g.pest_type_observed,
                            'location':              g.location_in_premises,
                            'pest_count':            g.pest_count,
                            'treatment_applied':     g.treatment_applied,
                            'treatment_description': g.treatment_description,
                            'activity_level':        g.activity_level,
                            'recommended_action':    g.recommended_action,
                            'description':           g.recommended_action or g.treatment_description,
                            'technician_remarks':    g.technician_remarks,
                            'photo_evidence':        request.build_absolute_uri(g.photo_evidence.url)
                                                     if g.photo_evidence else None,
                        }
                    })
                except Exception:
                    pass

            observations_data.append(obs_entry)  # ← inside the for loop
        # Build alerts list
        alerts_data = []
        for alert in job.smart_alerts.filter(is_resolved=False):
            alerts_data.append({
                'id':         alert.id,
                'title':      alert.title,
                'message':    alert.message,
                'alert_type': alert.alert_type,
                'priority':   alert.priority,
                'created_at': alert.created_at,
            })

        # Final response — matches frontend destructuring exactly
        return Response({
            'job': {
                'id':                 job.id,
                'job_uuid':           str(job.job_uuid),
                'status':             job.status,
                'service_type':       job.service_type,
                'site_address':       job.site_address,
                'scheduled_datetime': job.scheduled_datetime,
                'started_at':         job.started_at,
                'completed_at':       job.completed_at,
                'signed_by':          job.signed_by,
                'completion_notes':   job.completion_notes,
                'location':           job.site_address,
                'notes':              job.completion_notes,
            },
            'customer':     customer_data,
            'technician':   technician_data,
            'observations': observations_data,
            'alerts':       alerts_data,
            'report':       report_data,
        })


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
    permission_classes = [IsAdminOrSupervisor]

    def post(self, request, job_id):
        try:
            job = ServiceJob.objects.get(pk=job_id)
        except ServiceJob.DoesNotExist:
            return Response({'error': 'Job not found.'}, status=status.HTTP_404_NOT_FOUND)

        if job.status not in ['completed', 'report_sent']:
            return Response(
                {'error': 'Job must be completed before generating a PDF.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Queue the actual Celery task — this is what was missing before
        from .tasks import generate_pdf_report_task
        generate_pdf_report_task.delay(job_id)

        # Return the current report if it exists
        try:
            report = PDFReport.objects.get(job=job)
            report_data = PDFReportSerializer(report, context={'request': request}).data
        except PDFReport.DoesNotExist:
            report_data = None

        return Response({
            'message': 'PDF regeneration queued. Refresh in a few seconds.',
            'report':  report_data,
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