import uuid
import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone
from django.template.loader import render_to_string
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_pdf_report_task(self, job_id):
    try:
        from jobs.models import ServiceJob
        job = (
                ServiceJob.objects
                .select_related('customer', 'assigned_technician')
                .prefetch_related(
        'observations',
        'observations__rodent_detail',
        'observations__flying_insect_detail',
        'observations__cockroach_detail',
        'observations__termite_detail',
        'observations__mosquito_detail',
        'observations__general_detail',
        'smart_alerts',
    )
    .get(pk=job_id)
)
    except Exception as exc:
        logger.error(f"[PDF] Job {job_id} not found: {exc}")
        return

    try:
        from weasyprint import HTML as WeasyHTML

        html_string = render_to_string('reports/pdf_report.html', {
    'job':          job,
    'customer':     job.customer,
    'technician':   job.assigned_technician,
    'observations': job.observations.all(),
    'alerts':       job.smart_alerts.filter(is_resolved=False),
    'generated_at': timezone.now(),
})

        pdf_bytes = WeasyHTML(string=html_string).write_pdf()

        filename = f"reports/job_{job.job_uuid}.pdf"
        if default_storage.exists(filename):
            default_storage.delete(filename)
        saved_path = default_storage.save(filename, ContentFile(pdf_bytes))

        from .models import PDFReport
        PDFReport.objects.update_or_create(
            job=job,
            defaults={
                'report_file':        saved_path,
                'file_size_kb':       max(1, len(pdf_bytes) // 1024),
                'includes_signature': bool(job.signed_by),
                'download_token':     uuid.uuid4(),
                'token_expires_at':   timezone.now() + timedelta(days=7),
                'generated_by':       None,
            }
        )
        logger.info(f"[PDF] Generated for job {job_id}")

    except Exception as exc:
        logger.error(f"[PDF] Failed for job {job_id}: {exc}")
        raise self.retry(exc=exc)