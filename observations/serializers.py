from rest_framework import serializers
from .models import (
    ServiceObservation,
    RodentObservation,
    FlyingInsectObservation,
    CockroachObservation,
    TermiteObservation,
    MosquitoObservation,
    GeneralObservation
)


# =============================================================================
# CHILD OBSERVATION SERIALIZERS
# Each pest type has its own serializer matching the data dictionary v2
# =============================================================================

class RodentObservationSerializer(serializers.ModelSerializer):
    """
    Bait box and rodent trap data (TABLE 5).
    SmartAlertEngine rules R-01, R-02, R-03 fire after saving this.
    """
    class Meta:
        model = RodentObservation
        fields = [
            'id', 'rodent_box_id', 'location_in_premises',
            'rats_found_count', 'bait_consumed', 'bait_replaced',
            'droppings_observed', 'gnaw_marks', 'activity_level',
            'photo_evidence', 'technician_remarks'
        ]

    def validate_rats_found_count(self, value):
        if value < 0:
            raise serializers.ValidationError(
                'Rats found count cannot be negative.'
            )
        return value

    def validate_activity_level(self, value):
        valid = ['none', 'low', 'medium', 'high']
        if value not in valid:
            raise serializers.ValidationError(
                f'Activity level must be one of: {", ".join(valid)}'
            )
        return value


class FlyingInsectObservationSerializer(serializers.ModelSerializer):
    """
    Flycatcher / EFK machine inspection data (TABLE 6).
    SmartAlertEngine rules R-04, R-05, R-06 fire after saving this.
    """
    class Meta:
        model = FlyingInsectObservation
        fields = [
            'id', 'flycatcher_machine_id', 'machine_location',
            'insects_trapped_count', 'insect_types_trapped',
            'glue_board_changed', 'glue_board_condition',
            'machine_functional', 'photo_evidence', 'technician_remarks'
        ]

    def validate_insects_trapped_count(self, value):
        if value < 0:
            raise serializers.ValidationError(
                'Insects trapped count cannot be negative.'
            )
        return value

    def validate_insect_types_trapped(self, value):
        valid_types = ['Flies', 'Mosquitoes', 'Moths', 'Wasps', 'Others']
        if not isinstance(value, list):
            raise serializers.ValidationError(
                'Insect types must be a list.'
            )
        for item in value:
            if item not in valid_types:
                raise serializers.ValidationError(
                    f'Invalid insect type: {item}. '
                    f'Must be one of: {", ".join(valid_types)}'
                )
        return value


class CockroachObservationSerializer(serializers.ModelSerializer):
    """
    Gel station checks and cockroach activity (TABLE 7).
    """
    class Meta:
        model = CockroachObservation
        fields = [
            'id', 'station_id', 'location_in_premises',
            'cockroaches_found', 'gel_applied', 'gel_consumed',
            'activity_level', 'infestation_area',
            'photo_evidence', 'technician_remarks'
        ]

    def validate_cockroaches_found(self, value):
        if value < 0:
            raise serializers.ValidationError(
                'Cockroaches found count cannot be negative.'
            )
        return value


class TermiteObservationSerializer(serializers.ModelSerializer):
    """
    Bait station checks, mud tubes, wood damage (TABLE 8).
    """
    class Meta:
        model = TermiteObservation
        fields = [
            'id', 'station_id', 'station_location',
            'termites_found', 'bait_consumed', 'bait_replaced',
            'mud_tubes_found', 'wood_damage_observed',
            'damage_severity', 'photo_evidence', 'technician_remarks'
        ]


class MosquitoObservationSerializer(serializers.ModelSerializer):
    """
    Fogging treatments, breeding sites, larval activity (TABLE 9).
    """
    class Meta:
        model = MosquitoObservation
        fields = [
            'id', 'treatment_area', 'fogging_done',
            'chemical_used', 'breeding_sites_found',
            'breeding_sites_eliminated', 'larval_activity',
            'adult_mosquito_density', 'photo_evidence',
            'technician_remarks'
        ]

    def validate(self, attrs):
        # Cannot eliminate more sites than found
        found = attrs.get('breeding_sites_found', 0)
        eliminated = attrs.get('breeding_sites_eliminated', 0)
        if eliminated > found:
            raise serializers.ValidationError(
                'Breeding sites eliminated cannot exceed breeding sites found.'
            )
        return attrs


class GeneralObservationSerializer(serializers.ModelSerializer):
    """
    Miscellaneous pest observations — bed bugs, ants, birds etc (TABLE 10).
    Gap #2 fix from Data Dictionary v2.
    """
    class Meta:
        model = GeneralObservation
        fields = [
            'id', 'pest_type_observed', 'location_in_premises',
            'pest_count', 'treatment_applied', 'treatment_description',
            'activity_level', 'recommended_action',
            'photo_evidence', 'technician_remarks'
        ]

    def validate_pest_count(self, value):
        if value < 0:
            raise serializers.ValidationError(
                'Pest count cannot be negative.'
            )
        return value


# =============================================================================
# BASE OBSERVATION SERIALIZER
# Handles ServiceObservation (TABLE 4) + nested child data in one API call.
# Technician submits one request with both base + child data together.
# =============================================================================

class ServiceObservationSerializer(serializers.ModelSerializer):
    """
    Main observation serializer used by Technician to record observations.
    Accepts nested child data based on observation_category.
    UC-06, UC-07, UC-08
    """
    # Nested child serializers — all optional, only one used per observation
    rodent_detail        = RodentObservationSerializer(required=False)
    flying_insect_detail = FlyingInsectObservationSerializer(required=False)
    cockroach_detail     = CockroachObservationSerializer(required=False)
    termite_detail       = TermiteObservationSerializer(required=False)
    mosquito_detail      = MosquitoObservationSerializer(required=False)
    general_detail       = GeneralObservationSerializer(required=False)

    # Display fields
    recorded_by_name = serializers.SerializerMethodField()
    job_id           = serializers.IntegerField(source='job.id', read_only=True)

    class Meta:
        model = ServiceObservation
        fields = [
            'id', 'job', 'job_id', 'recorded_by', 'recorded_by_name',
            'observation_category', 'observation_time', 'notes',
            'rodent_detail', 'flying_insect_detail', 'cockroach_detail',
            'termite_detail', 'mosquito_detail', 'general_detail'
        ]
        read_only_fields = ['id', 'observation_time', 'recorded_by']

    def get_recorded_by_name(self, obj):
        return f"{obj.recorded_by.first_name} {obj.recorded_by.last_name}".strip()

    def validate(self, attrs):
        category = attrs.get('observation_category')

        # Map each category to its detail field
        category_field_map = {
            'rodent':        'rodent_detail',
            'flying_insect': 'flying_insect_detail',
            'cockroach':     'cockroach_detail',
            'termite':       'termite_detail',
            'mosquito':      'mosquito_detail',
            'general':       'general_detail',
        }

        required_field = category_field_map.get(category)

        # Child detail data must be provided for the selected category
        if required_field and not attrs.get(required_field):
            raise serializers.ValidationError(
                {required_field: f'Detail data is required for {category} observation.'}
            )

        # Job must be in_progress to record observations (API-02 test case)
        job = attrs.get('job')
        if job and job.status not in ['in_progress', 'observations_recorded']:
            raise serializers.ValidationError(
                {'job': 'Job is not in progress.'}
            )

        return attrs

    def create(self, validated_data):
        # Extract child data before creating base observation
        rodent_data         = validated_data.pop('rodent_detail', None)
        flying_insect_data  = validated_data.pop('flying_insect_detail', None)
        cockroach_data      = validated_data.pop('cockroach_detail', None)
        termite_data        = validated_data.pop('termite_detail', None)
        mosquito_data       = validated_data.pop('mosquito_detail', None)
        general_data        = validated_data.pop('general_detail', None)

        # Set recorded_by from request user
        request = self.context.get('request')
        validated_data['recorded_by'] = request.user

        # Create the base observation record
        observation = ServiceObservation.objects.create(**validated_data)

        # Create the matching child record
        if rodent_data:
            RodentObservation.objects.create(
                observation=observation, **rodent_data
            )
        elif flying_insect_data:
            FlyingInsectObservation.objects.create(
                observation=observation, **flying_insect_data
            )
        elif cockroach_data:
            CockroachObservation.objects.create(
                observation=observation, **cockroach_data
            )
        elif termite_data:
            TermiteObservation.objects.create(
                observation=observation, **termite_data
            )
        elif mosquito_data:
            MosquitoObservation.objects.create(
                observation=observation, **mosquito_data
            )
        elif general_data:
            GeneralObservation.objects.create(
                observation=observation, **general_data
            )

        # Update job status to observations_recorded
        job = observation.job
        if job.status == 'in_progress':
            job.status = 'observations_recorded'
            job.save()

        return observation