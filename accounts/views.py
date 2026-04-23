from django.shortcuts import render

# Create your views here.
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from datetime import timedelta
import hashlib
import random
from .models import User, Customer, CustomerOTPToken
from .serializers import (
    UserRegisterSerializer,
    UserProfileSerializer,
    UserUpdateSerializer,
    CustomerSerializer,
    CustomerPortalSerializer,
    OTPRequestSerializer,
    OTPVerifySerializer
)


# =============================================================================
# CUSTOM PERMISSIONS
# =============================================================================

class IsAdmin(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and \
               request.user.role == 'admin'


class IsAdminOrSupervisor(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and \
               request.user.role in ['admin', 'supervisor']


# =============================================================================
# STAFF AUTH VIEWS
# =============================================================================

class StaffLoginView(APIView):
    """
    Staff login with username and password (UC-02).
    Returns JWT access and refresh tokens.
    Admin, Supervisor, Technician all use this endpoint.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {'error': 'Username and password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(username=username, password=password)

        if not user:
            return Response(
                {'error': 'Invalid credentials.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            return Response(
                {'error': 'Account is suspended. Contact admin.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        return Response({
            'access':  str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id':       user.id,
                'username': user.username,
                'email':    user.email,
                'role':     user.role,
                'name':     f"{user.first_name} {user.last_name}".strip()
            }
        }, status=status.HTTP_200_OK)


class StaffLogoutView(APIView):
    """
    Logout by blacklisting the refresh token.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(
                {'message': 'Logged out successfully.'},
                status=status.HTTP_200_OK
            )
        except Exception:
            return Response(
                {'error': 'Invalid token.'},
                status=status.HTTP_400_BAD_REQUEST
            )


class StaffRegisterView(APIView):
    """
    Admin registers a new staff member (UC-01).
    Only Admin can access this endpoint.
    """
    permission_classes = [IsAdmin]

    def post(self, request):
        serializer = UserRegisterSerializer(
            data=request.data,
            context={'request': request}
        )
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                'message': f'Staff account created for {user.username}.',
                'user': UserProfileSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class StaffProfileView(APIView):
    """
    View and update own staff profile.
    Any authenticated staff member can access this.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserUpdateSerializer(
            request.user,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class StaffListView(generics.ListAPIView):
    """
    List all staff members.
    Admin only.
    """
    permission_classes = [IsAdmin]
    serializer_class   = UserProfileSerializer

    def get_queryset(self):
        queryset = User.objects.all()
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        return queryset


# =============================================================================
# CUSTOMER VIEWS
# =============================================================================

class CustomerListCreateView(APIView):
    """
    List all customers or create a new one (UC-12).
    Admin only.
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        customers  = Customer.objects.all()
        serializer = CustomerSerializer(customers, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = CustomerSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class CustomerDetailView(APIView):
    """
    Retrieve, update or deactivate a customer (UC-12).
    Admin only.
    """
    permission_classes = [IsAdmin]

    def get_object(self, pk):
        try:
            return Customer.objects.get(pk=pk)
        except Customer.DoesNotExist:
            return None

    def get(self, request, pk):
        customer = self.get_object(pk)
        if not customer:
            return Response(
                {'error': 'Customer not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = CustomerSerializer(customer)
        return Response(serializer.data)

    def patch(self, request, pk):
        customer = self.get_object(pk)
        if not customer:
            return Response(
                {'error': 'Customer not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = CustomerSerializer(
            customer,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    def delete(self, request, pk):
        customer = self.get_object(pk)
        if not customer:
            return Response(
                {'error': 'Customer not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        # Check for active jobs before deactivating
        active_jobs = customer.jobs.filter(
            status__in=['scheduled', 'in_progress']
        )
        if active_jobs.exists():
            return Response(
                {'error': 'Cannot deactivate customer with active jobs.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        customer.is_active = False
        customer.save()
        return Response(
            {'message': 'Customer deactivated successfully.'},
            status=status.HTTP_200_OK
        )


# =============================================================================
# CUSTOMER OTP VIEWS
# =============================================================================

class CustomerOTPRequestView(APIView):
    """
    Step 1 of customer portal login (UC-03).
    Customer submits email → system sends OTP.
    Always returns generic message to prevent account enumeration (OTP-06).
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = OTPRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        email = serializer.validated_data['email']

        # Generic response regardless of whether email exists (OTP-06)
        generic_response = Response({
            'message': 'If this email is registered, a code has been sent.'
        }, status=status.HTTP_200_OK)

        try:
            customer = Customer.objects.get(email=email, is_active=True)
        except Customer.DoesNotExist:
            return generic_response

        # Invalidate any existing unused OTPs for this email (OTP-07)
        CustomerOTPToken.objects.filter(
            customer_email=email,
            is_used=False
        ).update(is_used=True)

        # Generate a new 6-digit OTP
        otp_code   = str(random.randint(100000, 999999))
        otp_hashed = hashlib.sha256(otp_code.encode()).hexdigest()

        # Save hashed OTP to database (OTP-08 — never store plaintext)
        CustomerOTPToken.objects.create(
            customer=customer,
            customer_email=email,
            otp_code=otp_hashed,
            expires_at=timezone.now() + timedelta(minutes=10),
            ip_address=request.META.get('REMOTE_ADDR')
        )

        # Send OTP email
        send_mail(
            subject='Your PestPro Login Code',
            message=f'Your login code is: {otp_code}\n\nThis code expires in 10 minutes.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=True
        )

        return generic_response


class CustomerOTPVerifyView(APIView):
    """
    Step 2 of customer portal login (UC-03).
    Customer submits OTP → system returns session token.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        token = serializer.validated_data['token']

        # Mark OTP as used (prevents replay attacks — OTP-05)
        token.is_used = True
        token.save()

        customer = token.customer
        return Response({
            'message': 'Login successful.',
            'customer': CustomerPortalSerializer(customer).data
        }, status=status.HTTP_200_OK)