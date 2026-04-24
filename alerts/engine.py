from django.db.models import Count
from .models import SmartAlert
from observations.models import (
    RodentObservation,
    FlyingInsectObservation,
    ServiceObservation
)


# =============================================================================
# SMARTALERTENGINE
# Fires automatically after every observation save via Django post_save signal.
# Rules R-01 through R-07 as defined in Features v2 Section 7.
# =============================================================================

class SmartAlertEngine:

    def __init__(self, observation):
        self.observation = observation
        self.job         = observation.job
        self.customer    = observation.job.customer
        self.category    = observation.observation_category

    def run(self):
        """
        Entry point — runs all relevant rules based on observation category.
        Called from post_save signal after every observation is saved.
        """
        if self.category == 'rodent':
            self._run_rodent_rules()
        elif self.category == 'flying_insect':
            self._run_flying_insect_rules()
        # R-07 runs for all categories
        self._run_general_rules()

    # =========================================================================
    # RODENT RULES
    # =========================================================================

    def _run_rodent_rules(self):
        """Run R-01, R-02, R-03 for rodent observations."""
        try:
            rodent_obs = self.observation.rodent_detail
        except RodentObservation.DoesNotExist:
            return

        self._rule_r01(rodent_obs)
        self._rule_r02(rodent_obs)
        self._rule_r03()

    def _rule_r01(self, rodent_obs):
        """
        R-01: Rats >= 3 in same box for 2 consecutive visits.
        Priority: HIGH
        SAE-01-PASS, SAE-01-FAIL, SAE-01-EDGE test cases.
        """
        if rodent_obs.rats_found_count < 3:
            return

        # Get last 2 observations for this box at this customer site
        previous_obs = RodentObservation.objects.filter(
            observation__job__customer=self.customer,
            rodent_box_id=rodent_obs.rodent_box_id,
        ).exclude(
            observation=self.observation
        ).order_by('-observation__observation_time')[:1]

        if not previous_obs.exists():
            return

        prev = previous_obs.first()

        # Check rats >= 3 on previous visit too (SAE-01-PASS)
        if prev.rats_found_count >= 3:
            # Check consecutive visits — no other visit in between
            prev_job_date = prev.observation.job.scheduled_datetime
            curr_job_date = self.job.scheduled_datetime

            # Get any jobs between these two dates for same customer
            jobs_between = self.customer.jobs.filter(
                scheduled_datetime__gt=prev_job_date,
                scheduled_datetime__lt=curr_job_date
            ).count()

            # SAE-01-EDGE: must be consecutive (no jobs in between)
            if jobs_between > 0:
                return

            self._create_alert(
                alert_type='warning',
                priority='high',
                rule='R-01',
                title=f'High Rodent Activity — Box {rodent_obs.rodent_box_id}',
                message=(
                    f'Box {rodent_obs.rodent_box_id} at '
                    f'{rodent_obs.location_in_premises} has recorded '
                    f'{rodent_obs.rats_found_count} rats for 2 consecutive visits. '
                    f'Recommend upgrading bait or increasing visit frequency.'
                )
            )

    def _rule_r02(self, rodent_obs):
        """
        R-02: Bait consumed but NOT replaced in same visit.
        Priority: MEDIUM
        SAE-02-PASS, SAE-02-FAIL test cases.
        """
        # SAE-02-PASS: consumed=True AND replaced=False
        if rodent_obs.bait_consumed and not rodent_obs.bait_replaced:
            self._create_alert(
                alert_type='warning',
                priority='medium',
                rule='R-02',
                title=f'Bait Not Replaced — Box {rodent_obs.rodent_box_id}',
                message=(
                    f'Bait was consumed at Box {rodent_obs.rodent_box_id} '
                    f'but was not replaced during this visit. '
                    f'Please schedule a follow-up to replenish bait.'
                )
            )

    def _rule_r03(self):
        """
        R-03: HIGH activity across 3+ boxes in same job.
        Priority: CRITICAL
        SAE-03-PASS, SAE-03-FAIL test cases.
        """
        high_activity_count = RodentObservation.objects.filter(
            observation__job=self.job,
            activity_level='high'
        ).count()

        # SAE-03-PASS: 3 or more boxes with HIGH activity
        if high_activity_count >= 3:
            # Only create once per job — check if R-03 alert already exists
            already_exists = SmartAlert.objects.filter(
                job=self.job,
                rule_triggered='R-03'
            ).exists()

            if not already_exists:
                self._create_alert(
                    alert_type='urgent',
                    priority='critical',
                    rule='R-03',
                    title='Critical Rodent Infestation Detected',
                    message=(
                        f'{high_activity_count} rodent boxes show HIGH activity '
                        f'at {self.customer.name} — {self.job.site_address}. '
                        f'Immediate intervention required. '
                        f'Recommend emergency service visit.'
                    )
                )

    # =========================================================================
    # FLYING INSECT RULES
    # =========================================================================

    def _run_flying_insect_rules(self):
        """Run R-04, R-05, R-06 for flying insect observations."""
        try:
            fi_obs = self.observation.flying_insect_detail
        except FlyingInsectObservation.DoesNotExist:
            return

        self._rule_r04(fi_obs)
        self._rule_r05(fi_obs)
        self._rule_r06(fi_obs)

    def _rule_r04(self, fi_obs):
        """
        R-04: Insects trapped > 50 on glue board.
        Priority: MEDIUM
        SAE-04-PASS, SAE-04-EDGE (exactly 50 should NOT fire) test cases.
        """
        # SAE-04-EDGE: strictly GREATER than 50 — not equal
        if fi_obs.insects_trapped_count > 50:
            self._create_alert(
                alert_type='recommendation',
                priority='medium',
                rule='R-04',
                title=f'High Insect Count — Machine {fi_obs.flycatcher_machine_id}',
                message=(
                    f'Machine {fi_obs.flycatcher_machine_id} at '
                    f'{fi_obs.machine_location} has trapped '
                    f'{fi_obs.insects_trapped_count} insects. '
                    f'Recommend upgrading to a higher wattage UV light.'
                )
            )

    def _rule_r05(self, fi_obs):
        """
        R-05: Glue board NOT changed for 3+ consecutive visits.
        Priority: MEDIUM — Maintenance alert.
        SAE-05-PASS test case.
        """
        # Count consecutive visits where glue board was NOT changed
        unchanged_count = FlyingInsectObservation.objects.filter(
            observation__job__customer=self.customer,
            flycatcher_machine_id=fi_obs.flycatcher_machine_id,
            glue_board_changed=False
        ).count()

        if unchanged_count >= 3:
            # Only create once — check if R-05 alert already exists
            already_exists = SmartAlert.objects.filter(
                job=self.job,
                rule_triggered='R-05'
            ).exists()

            if not already_exists:
                self._create_alert(
                    alert_type='maintenance',
                    priority='medium',
                    rule='R-05',
                    title=f'Glue Board Overdue — Machine {fi_obs.flycatcher_machine_id}',
                    message=(
                        f'Glue board on Machine {fi_obs.flycatcher_machine_id} '
                        f'has not been changed for {unchanged_count} consecutive visits. '
                        f'Immediate replacement required.'
                    )
                )

    def _rule_r06(self, fi_obs):
        """
        R-06: Machine non-functional.
        Priority: CRITICAL — Immediate alert.
        SAE-06-PASS test case.
        """
        if not fi_obs.machine_functional:
            self._create_alert(
                alert_type='urgent',
                priority='critical',
                rule='R-06',
                title=f'Machine Non-Functional — {fi_obs.flycatcher_machine_id}',
                message=(
                    f'Flycatcher machine {fi_obs.flycatcher_machine_id} at '
                    f'{fi_obs.machine_location} is non-functional. '
                    f'Immediate repair or replacement required.'
                )
            )

    # =========================================================================
    # GENERAL RULES
    # =========================================================================

    def _run_general_rules(self):
        """Run R-07 — applies to all pest categories."""
        self._rule_r07()

    def _rule_r07(self):
        """
        R-07: HIGH+ pest activity for 3 consecutive months at same site.
        Priority: HIGH — Service frequency recommendation.
        SAE-07-PASS test case.
        """
        from django.utils import timezone
        from datetime import timedelta

        # Get alerts from last 3 months for this customer
        three_months_ago = timezone.now() - timedelta(days=90)

        high_alerts = SmartAlert.objects.filter(
            job__customer=self.customer,
            priority__in=['high', 'critical'],
            created_at__gte=three_months_ago
        )

        if high_alerts.count() >= 3:
            # Check alerts span 3 different months
            months = high_alerts.dates('created_at', 'month')
            if len(list(months)) >= 3:
                # Only create once per customer — check if R-07 exists recently
                already_exists = SmartAlert.objects.filter(
                    job__customer=self.customer,
                    rule_triggered='R-07',
                    created_at__gte=three_months_ago
                ).exists()

                if not already_exists:
                    self._create_alert(
                        alert_type='recommendation',
                        priority='high',
                        rule='R-07',
                        title='Recommend Increased Service Frequency',
                        message=(
                            f'Customer {self.customer.name} has had high pest '
                            f'activity for 3 consecutive months. '
                            f'Recommend increasing service visits from monthly '
                            f'to fortnightly.'
                        )
                    )

    # =========================================================================
    # HELPER
    # =========================================================================

    def _create_alert(self, alert_type, priority, rule, title, message):
        """
        Creates a SmartAlert record.
        Called by all rule methods above.
        """
        SmartAlert.objects.create(
            job=self.job,
            observation=self.observation,
            alert_type=alert_type,
            pest_category=self.category,
            title=title,
            message=message,
            rule_triggered=rule,
            priority=priority,
            email_sent=False
        )

    def _rule_r02(self, rodent_obs):
        """
        R-02: Bait consumed but NOT replaced in same visit.
        """
        print(f'R-02 check: bait_consumed={rodent_obs.bait_consumed} bait_replaced={rodent_obs.bait_replaced}')
    
        if rodent_obs.bait_consumed and not rodent_obs.bait_replaced:
            print('R-02 TRIGGERED — creating alert')
            self._create_alert(
                alert_type='warning',
                priority='medium',
                rule='R-02',
                title=f'Bait Not Replaced — Box {rodent_obs.rodent_box_id}',
                message=(
                    f'Bait was consumed at Box {rodent_obs.rodent_box_id} '
                    f'but was not replaced during this visit. '
                    f'Please schedule a follow-up to replenish bait.'
                    )
                )
            
        else:
            print('R-02 NOT triggered')    

    def _run_rodent_rules(self):
        print(f'Running rodent rules for observation {self.observation.id}')
        try:
            rodent_obs = self.observation.rodent_detail
            print(f'Rodent detail found: {rodent_obs}')
        except RodentObservation.DoesNotExist:
            print('ERROR: No rodent detail found for this observation')
            return

        self._rule_r01(rodent_obs)
        self._rule_r02(rodent_obs)
        self._rule_r03()        


    def _create_alert(self, alert_type, priority, rule, title, message):
        print(f'Creating alert: rule={rule} priority={priority} title={title}')
        alert = SmartAlert.objects.create(
            job=self.job,
            observation=self.observation,
            alert_type=alert_type,
            pest_category=self.category,
            title=title,
            message=message,
            rule_triggered=rule,
            priority=priority,
            email_sent=False
        )
        print(f'Alert created with id={alert.id}')    