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
    """
    Used to register a new staff member (UC-01).
    Supervisor and Technician roles only — Admin via createsuperuser.
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]
    )
    password2 = serializers.CharField(
        write_only=True,
        required=True,
        label='Confirm Password'
    )

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'password', 'password2',
            'first_name', 'last_name', 'phone', 'role'
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError(
                {'password': 'Passwords do not match.'}
            )
        return attrs

    def validate_role(self, value):
        if value not in ['supervisor', 'technician']:
            raise serializers.ValidationError(
                'Role must be either supervisor or technician.'
            )
        return value

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for displaying staff profile info.
    """
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name',
            'last_name', 'phone', 'role', 'profile_photo',
            'is_active', 'date_joined'
        ]
        read_only_fields = fields


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Used to update staff profile details (not password).
    """
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone', 'profile_photo']


# =============================================================================
# CUSTOMER SERIALIZERS
# =============================================================================

class CustomerSerializer(serializers.ModelSerializer):
    """
    Full customer serializer for Admin CRUD operations (UC-12).
    """
    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'email', 'phone', 'company_name',
            'address', 'city', 'is_active',
            'email_opt_in', 'notify_on_job_start', 'notify_on_completion',
            'latitude', 'longitude', 'geocode_status', 'geocoded_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'geocode_status', 'geocoded_at',
            'created_at', 'updated_at'
        ]

    def validate_email(self, value):
        if self.instance is None:
            if Customer.objects.filter(email=value).exists():
                raise serializers.ValidationError(
                    'A customer with this email already exists.'
                )
        return value


class CustomerPublicRegisterSerializer(serializers.ModelSerializer):
    """
    Public-facing customer registration serializer. Accepts a small
    subset of fields so customers can self-register from the frontend.
    """
    class Meta:
        model = Customer
        fields = ['id', 'name', 'email', 'phone', 'company_name']

    def create(self, validated_data):
        # Provide minimal defaults for required model fields so the
        # public endpoint can create a customer with partial data.
        validated_data.setdefault('address', '')
        validated_data.setdefault('city', '')
        return Customer.objects.create(**validated_data)


class CustomerPortalSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for customer portal — limited fields only.
    """
    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'email', 'phone',
            'company_name', 'address', 'city'
        ]
        read_only_fields = fields


# =============================================================================
# OTP SERIALIZERS
# =============================================================================

class OTPRequestSerializer(serializers.Serializer):
    """
    Step 1 of customer login (UC-03).
    """
    email = serializers.EmailField()

    def validate_email(self, value):
        return value


class OTPVerifySerializer(serializers.Serializer):
    """
    Step 2 of customer login (UC-03).
    """
    email    = serializers.EmailField()
    otp_code = serializers.CharField(
        min_length=6,
        max_length=6,
        help_text='6-digit OTP code sent to your email.'
    )

    def validate_otp_code(self, value):
        if not value.isdigit():
            raise serializers.ValidationError(
                'OTP must be a 6-digit number.'
            )
        return value

    def validate(self, attrs):
        email    = attrs.get('email')
        otp_code = attrs.get('otp_code')

        try:
            token = CustomerOTPToken.objects.filter(
                customer_email=email,
                is_used=False
            ).latest('created_at')
        except CustomerOTPToken.DoesNotExist:
            raise serializers.ValidationError(
                {'otp_code': 'Invalid OTP. Please request a new code.'}
            )

        if token.attempts >= 3:
            raise serializers.ValidationError(
                {'otp_code': 'Maximum attempts reached. Request a new OTP.'}
            )

        if timezone.now() > token.expires_at:
            raise serializers.ValidationError(
                {'otp_code': 'OTP has expired. Please request a new code.'}
            )

        if token.is_used:
            raise serializers.ValidationError(
                {'otp_code': 'OTP already used.'}
            )

        hashed_input = hashlib.sha256(otp_code.encode()).hexdigest()
        if token.otp_code != hashed_input:
            token.attempts += 1
            token.save()
            raise serializers.ValidationError(
                {'otp_code': 'Invalid OTP.'}
            )

        attrs['token'] = token
        return attrs
    
    