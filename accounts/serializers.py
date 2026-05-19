from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from datetime import timedelta
import hashlib
import random
from .models import User, Customer, CustomerOTPToken


# =============================================================================
# USER SERIALIZERS
# =============================================================================

class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True, label='Confirm Password')

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'password2', 'first_name', 'last_name', 'phone', 'role']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return attrs

    def validate_role(self, value):
        if value not in ['supervisor', 'technician']:
            raise serializers.ValidationError('Role must be either supervisor or technician.')
        return value

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'phone', 'role', 'profile_photo', 'is_active', 'date_joined']
        read_only_fields = fields


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone', 'profile_photo',"email", "role","is_active"]


# =============================================================================
# CUSTOMER SERIALIZERS
# =============================================================================

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'email', 'phone', 'company_name',
            'address', 'city', 'is_active',
            'email_opt_in', 'notify_on_job_start', 'notify_on_completion',
            'latitude', 'longitude', 'geocode_status', 'geocoded_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['geocode_status', 'geocoded_at', 'created_at', 'updated_at']

    def validate_email(self, value):
        normalized_email = value.lower().strip()
        if self.instance is None:
            if Customer.objects.filter(email__iexact=normalized_email).exists():
                raise serializers.ValidationError('A customer with this email already exists.')
        return normalized_email


class CustomerPublicRegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ['id', 'name', 'email', 'phone', 'company_name']

    def validate_email(self, value):
        return value.lower().strip()

    def create(self, validated_data):
        validated_data.setdefault('address', '')
        validated_data.setdefault('city', '')
        return Customer.objects.create(**validated_data)


class CustomerPortalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ['id', 'name', 'email', 'phone', 'company_name', 'address', 'city']
        read_only_fields = fields


# =============================================================================
# OTP SERIALIZERS
# =============================================================================

class OTPRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.lower().strip()


class OTPVerifySerializer(serializers.Serializer):
    email    = serializers.EmailField()
    otp_code = serializers.CharField(min_length=6, max_length=6)

    def validate_email(self, value):
        return value.lower().strip()

    def validate_otp_code(self, value):
        # FIX: Strip any hidden spaces from the OTP code
        clean_value = value.strip()
        if not clean_value.isdigit():
            raise serializers.ValidationError('OTP must be a 6-digit number.')
        return clean_value

    def validate(self, attrs):
        email    = attrs.get('email')
        otp_code = attrs.get('otp_code')

        # FIX: Search for ANY valid, unused token for this email that hasn't expired
        # This is more robust than just checking the 'latest' one.
        token = CustomerOTPToken.objects.filter(
            customer_email__iexact=email,
            is_used=False,
            expires_at__gt=timezone.now(),
            attempts__lt=3
        ).order_by('-created_at').first()

        if not token:
            raise serializers.ValidationError(
                {'otp_code': 'Invalid OTP or code expired. Please request a new one.'}
            )

        # Hash the input and compare
        hashed_input = hashlib.sha256(otp_code.encode()).hexdigest()
        if token.otp_code != hashed_input:
            token.attempts += 1
            token.save()
            raise serializers.ValidationError({'otp_code': 'Invalid OTP.'})

        attrs['token'] = token
        return attrs
    
    