import logging
logger = logging.getLogger(__name__)


def register_signals():
    from django.db.models.signals import post_save
    from django.dispatch import receiver
    from jobs.models import ServiceJob

    @receiver(post_save, sender=ServiceJob)
    def trigger_pdf_on_completion(sender, instance, created, **kwargs):
        # Only fire when job moves to 'completed'
        if instance.status != 'completed':
            return

        # Skip if a fresh PDF already exists
        try:
            from django.utils import timezone
            existing = instance.pdfreport
            if existing.report_file and existing.token_expires_at > timezone.now():
                logger.info(f"[PDF] Job {instance.pk} already has valid PDF — skipping")
                return
        except Exception:
            pass  # No PDF yet — proceed

        from .tasks import generate_pdf_report_task
        generate_pdf_report_task.delay(instance.pk)
        logger.info(f"[PDF] Queued generation for job {instance.pk}")