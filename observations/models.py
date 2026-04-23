from django.db import models

# Create your models here.



from django.db import models
from django.conf import settings
from jobs.models import ServiceJob
 
 
# =============================================================================
# ACTIVITY LEVEL CHOICES — shared across multiple observation tables
# CHECK constraint: none | low | medium | high
# =============================================================================
ACTIVITY_LEVEL_CHOICES = [
    ('none',   'None'),
    ('low',    'Low'),
    ('medium', 'Medium'),
    ('high',   'High'),
]
 
 
# =============================================================================
# TABLE 4 — SERVICEOBSERVATION (Base)
# Parent record for every observation. The observationCategory field
# determines which of the 6 child tables holds the detailed data.
# Child tables link back via OneToOneField.
# =============================================================================
 
class ServiceObservation(models.Model):
    CATEGORY_CHOICES = [
        ('rodent',         'Rodent'),
        ('flying_insect',  'Flying Insect'),
        ('cockroach',      'Cockroach'),
        ('mosquito',       'Mosquito'),
        ('termite',        'Termite'),
        ('general',        'General'),
    ]
 
    # CASCADE: deleting a job deletes all its observations
    job = models.ForeignKey(
        ServiceJob,
        on_delete=models.CASCADE,
        related_name='observations'
    )
    # PROTECT: cannot delete a technician who has recorded observations
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='recorded_observations'
    )
    observation_category = models.CharField(
        max_length=20, choices=CATEGORY_CHOICES,
        help_text="Determines which child table holds detailed data."
    )
    observation_time = models.DateTimeField(
        auto_now_add=True,
        help_text="Auto-set to exact timestamp of observation entry."
    )
    notes = models.TextField(blank=True)
 
    def __str__(self):
        return f"Obs #{self.id} — {self.observation_category} on Job #{self.job_id}"
 
    class Meta:
        db_table = 'service_observation'
 
 
# =============================================================================
# TABLE 5 — RODENTOBSERVATION
# Bait box and rodent trap data per visit.
# SmartAlertEngine rules R-01, R-02, R-03 fire on save of this model.
# =============================================================================
 
class RodentObservation(models.Model):
    # OneToOne + CASCADE: deleting the base observation deletes this child
    observation = models.OneToOneField(
        ServiceObservation,
        on_delete=models.CASCADE,
        related_name='rodent_detail'
    )
    rodent_box_id        = models.CharField(max_length=20, help_text="e.g. Box-A1")
    location_in_premises = models.CharField(max_length=200, help_text="e.g. Kitchen corner, Near drain")
    rats_found_count     = models.PositiveIntegerField(default=0)
    bait_consumed        = models.BooleanField(default=False)
    bait_replaced        = models.BooleanField(default=False)
    droppings_observed   = models.BooleanField(default=False)
    gnaw_marks           = models.BooleanField(default=False)
    activity_level       = models.CharField(
        max_length=10, choices=ACTIVITY_LEVEL_CHOICES
    )
    # Gap #5: S3 key in production, media/observations/ path in development
    photo_evidence       = models.ImageField(
        upload_to='observations/', blank=True, null=True,
        help_text="S3 key (production) or media/observations/ path (development)."
    )
    technician_remarks   = models.TextField(blank=True)
 
    def __str__(self):
        return f"Rodent — Box {self.rodent_box_id} (Rats: {self.rats_found_count})"
 
    class Meta:
        db_table = 'rodent_observation'
 
 
# =============================================================================
# TABLE 6 — FLYINGINSECTOBSERVATION
# Flycatcher / EFK machine inspection data.
# SmartAlertEngine rules R-04, R-05, R-06 fire on save of this model.
# =============================================================================
 
class FlyingInsectObservation(models.Model):
    GLUE_BOARD_CONDITION_CHOICES = [
        ('good',     'Good'),
        ('dirty',    'Dirty'),
        ('replaced', 'Replaced'),
    ]
 
    observation = models.OneToOneField(
        ServiceObservation,
        on_delete=models.CASCADE,
        related_name='flying_insect_detail'
    )
    flycatcher_machine_id = models.CharField(max_length=20, help_text="e.g. FC-01")
    machine_location      = models.CharField(max_length=200, help_text="e.g. Near entrance, Reception")
    insects_trapped_count = models.PositiveIntegerField(default=0)
    # JSON array: ["Flies", "Mosquitoes", "Moths", "Wasps", "Others"]
    insect_types_trapped  = models.JSONField(
        default=list,
        help_text="Array of insect types observed e.g. ['Flies', 'Moths']"
    )
    glue_board_changed    = models.BooleanField(default=False)
    glue_board_condition  = models.CharField(
        max_length=10, choices=GLUE_BOARD_CONDITION_CHOICES, blank=True
    )
    machine_functional    = models.BooleanField(
        default=True,
        help_text="R-06: If FALSE, triggers immediate Critical alert."
    )
    photo_evidence        = models.ImageField(
        upload_to='observations/', blank=True, null=True
    )
    technician_remarks    = models.TextField(blank=True)
 
    def __str__(self):
        return f"Flying Insect — Machine {self.flycatcher_machine_id} (Trapped: {self.insects_trapped_count})"
 
    class Meta:
        db_table = 'flying_insect_observation'
 
 
# =============================================================================
# TABLE 7 — COCKROACHOBSERVATION
# Gel station checks and cockroach activity levels.
# =============================================================================
 
class CockroachObservation(models.Model):
    observation = models.OneToOneField(
        ServiceObservation,
        on_delete=models.CASCADE,
        related_name='cockroach_detail'
    )
    station_id           = models.CharField(max_length=20, help_text="e.g. CG-01")
    location_in_premises = models.CharField(max_length=200, help_text="e.g. Under kitchen sink")
    cockroaches_found    = models.PositiveIntegerField(default=0)
    gel_applied          = models.BooleanField(default=False)
    gel_consumed         = models.BooleanField(default=False)
    activity_level       = models.CharField(max_length=10, choices=ACTIVITY_LEVEL_CHOICES)
    infestation_area     = models.CharField(max_length=100, blank=True)
    photo_evidence       = models.ImageField(
        upload_to='observations/', blank=True, null=True
    )
    technician_remarks   = models.TextField(blank=True)
 
    def __str__(self):
        return f"Cockroach — Station {self.station_id} (Found: {self.cockroaches_found})"
 
    class Meta:
        db_table = 'cockroach_observation'
 
 
# =============================================================================
# TABLE 8 — TERMITEOBSERVATION
# Bait station checks, mud tube sightings, wood damage assessment.
# =============================================================================
 
class TermiteObservation(models.Model):
    DAMAGE_SEVERITY_CHOICES = [
        ('none',     'None'),
        ('minor',    'Minor'),
        ('moderate', 'Moderate'),
        ('severe',   'Severe'),
    ]
 
    observation = models.OneToOneField(
        ServiceObservation,
        on_delete=models.CASCADE,
        related_name='termite_detail'
    )
    station_id           = models.CharField(max_length=20, help_text="e.g. TB-01")
    station_location     = models.CharField(max_length=200)
    termites_found       = models.BooleanField(default=False)
    bait_consumed        = models.BooleanField(default=False)
    bait_replaced        = models.BooleanField(default=False)
    mud_tubes_found      = models.BooleanField(
        default=False,
        help_text="Subterranean termite evidence."
    )
    wood_damage_observed = models.BooleanField(default=False)
    damage_severity      = models.CharField(
        max_length=10, choices=DAMAGE_SEVERITY_CHOICES, default='none'
    )
    photo_evidence       = models.ImageField(
        upload_to='observations/', blank=True, null=True
    )
    technician_remarks   = models.TextField(blank=True)
 
    def __str__(self):
        return f"Termite — Station {self.station_id} (Damage: {self.damage_severity})"
 
    class Meta:
        db_table = 'termite_observation'
 
 
# =============================================================================
# TABLE 9 — MOSQUITOOBSERVATION
# Fogging treatments, breeding site inspections, larval activity.
# =============================================================================
 
class MosquitoObservation(models.Model):
    DENSITY_CHOICES = [
        ('none',   'None'),
        ('low',    'Low'),
        ('medium', 'Medium'),
        ('high',   'High'),
    ]
 
    observation = models.OneToOneField(
        ServiceObservation,
        on_delete=models.CASCADE,
        related_name='mosquito_detail'
    )
    treatment_area           = models.CharField(max_length=200, help_text="e.g. Garden, drainage, stairwell")
    fogging_done             = models.BooleanField(default=False)
    chemical_used            = models.CharField(max_length=100, blank=True)
    breeding_sites_found     = models.PositiveIntegerField(default=0)
    breeding_sites_eliminated = models.PositiveIntegerField(default=0)
    larval_activity          = models.BooleanField(default=False)
    adult_mosquito_density   = models.CharField(
        max_length=10, choices=DENSITY_CHOICES
    )
    photo_evidence           = models.ImageField(
        upload_to='observations/', blank=True, null=True
    )
    technician_remarks       = models.TextField(blank=True)
 
    def __str__(self):
        return f"Mosquito — {self.treatment_area} (Density: {self.adult_mosquito_density})"
 
    class Meta:
        db_table = 'mosquito_observation'
 
 
# =============================================================================
# TABLE 10 — GENERALOBSERVATION  [NEW in v2]
# Gap #2 fixed: handles miscellaneous pests (bed bugs, ants, birds, etc.)
# that do not fit into the five specific pest category tables.
# =============================================================================
 
class GeneralObservation(models.Model):
    observation = models.OneToOneField(
        ServiceObservation,
        on_delete=models.CASCADE,
        related_name='general_detail'
    )
    pest_type_observed     = models.CharField(
        max_length=100,
        help_text="e.g. Bed Bug, Ant, Bird, Silverfish, Lizard, Other"
    )
    location_in_premises   = models.CharField(
        max_length=200,
        help_text="e.g. Master bedroom, Ceiling gap"
    )
    pest_count             = models.PositiveIntegerField(
        default=0,
        help_text="Use 0 if uncountable."
    )
    treatment_applied      = models.BooleanField(default=False)
    treatment_description  = models.CharField(
        max_length=300, blank=True,
        help_text="e.g. Spray, Trap placed, Gel applied"
    )
    activity_level         = models.CharField(
        max_length=10, choices=ACTIVITY_LEVEL_CHOICES
    )
    recommended_action     = models.TextField(
        blank=True,
        help_text="Technician recommendation for follow-up."
    )
    photo_evidence         = models.ImageField(
        upload_to='observations/', blank=True, null=True
    )
    technician_remarks     = models.TextField(blank=True)
 
    def __str__(self):
        return f"General — {self.pest_type_observed} (Count: {self.pest_count})"
 
    class Meta:
        db_table = 'general_observation'