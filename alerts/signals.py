from django.db.models.signals import post_save
from django.dispatch import receiver
from observations.models import ServiceObservation
from .engine import SmartAlertEngine


@receiver(post_save, sender=ServiceObservation)
def run_smart_alert_engine(sender, instance, created, **kwargs):
    """
    Fires SmartAlertEngine after every observation is saved.
    Only runs on CREATE — not on updates.
    """
    if created:
        try:
            engine = SmartAlertEngine(instance)
            engine.run()
        except Exception as e:
            # Never let alert engine crash the observation save
            print(f'SmartAlertEngine error: {e}')