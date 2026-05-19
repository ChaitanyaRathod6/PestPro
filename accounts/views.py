from django.shortcuts import render
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
import secrets
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
from rest_framework.decorators import api_view, authentication_classes, permission_classes

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
    """
    permission_classes = [AllowAny]
    authentication_classes = []

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
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserRegisterSerializer(
            data=request.data,
            context={'request': request}
        )
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                'message': f'Account created for {user.username}.',
                'user': UserProfileSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class StaffProfileView(APIView):
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
    permission_classes = [IsAdminOrSupervisor]
    serializer_class   = UserProfileSerializer

    def get_queryset(self):
        queryset = User.objects.all()
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        return queryset


class StaffDetailView(APIView):
    permission_classes = [IsAdmin]

    def get_object(self, pk):
        try:
            return User.objects.get(pk=pk)
        except User.DoesNotExist:
            return None

    def get(self, request, pk):
        user = self.get_object(pk)
        if not user:
            return Response(
                {'error': 'Staff member not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        return Response(UserProfileSerializer(user).data)

    def patch(self, request, pk):
        user = self.get_object(pk)
        if not user:
            return Response(
                {'error': 'Staff member not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = UserUpdateSerializer(
            user,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(UserProfileSerializer(user).data)
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


# =============================================================================
# CUSTOMER VIEWS
# =============================================================================

class CustomerListCreateView(APIView):
    permission_classes = [IsAdminOrSupervisor]

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


class CustomerPublicRegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        from .serializers import CustomerPublicRegisterSerializer
        serializer = CustomerPublicRegisterSerializer(data=request.data)
        if serializer.is_valid():
            customer = serializer.save()
            return Response(
                {'message': 'Customer account created.', 'customer': serializer.data},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CustomerDetailView(APIView):
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
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = OTPRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Normalize email
        email = serializer.validated_data['email'].lower().strip()

        generic_response = Response({
            'message': 'If this email is registered, a code has been sent.'
        }, status=status.HTTP_200_OK)

        try:
            customer = Customer.objects.get(email__iexact=email, is_active=True)
        except Customer.DoesNotExist:
            return generic_response

        # FIX: Deactivate ALL existing unused OTPs for this email (case-insensitive)
        CustomerOTPToken.objects.filter(
            customer_email__iexact=email,
            is_used=False
        ).update(is_used=True)

        # Generate a new 6-digit OTP
        otp_code   = str(random.randint(100000, 999999))
        otp_hashed = hashlib.sha256(otp_code.encode()).hexdigest()

        # Save hashed OTP to database
        CustomerOTPToken.objects.create(
            customer=customer,
            customer_email=email, # Save as normalized
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
            fail_silently=False
        )

        return generic_response


class CustomerOTPVerifyView(APIView):
    """
    Step 2 of customer portal login (UC-03).
    Verification logic is handled by OTPVerifySerializer.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        token = serializer.validated_data['token']
        token.is_used = True
        token.save()

        customer = token.customer

        # Generate a simple secure token and store it on the customer
        access_token = secrets.token_hex(32)
        customer.access_token = access_token
        customer.save()

        return Response({
            'message': 'Login successful.',
            'access_token': access_token,
            'customer': CustomerPortalSerializer(customer).data
        }, status=status.HTTP_200_OK)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def change_password(request):
    username = request.data.get('username')
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')

    if not all([username, old_password, new_password]):
        return Response({'error': 'All fields are required.'}, status=400)

    user = authenticate(request, username=username, password=old_password)
    if not user:
        return Response({'error': 'Incorrect username or current password.'}, status=400)

    if old_password == new_password:
        return Response({'error': 'New password must be different from current password.'}, status=400)

    user.set_password(new_password)
    user.save()
    return Response({'message': 'Password changed successfully.'}, status=200)