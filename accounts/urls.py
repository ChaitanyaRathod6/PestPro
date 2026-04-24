from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [

    # ─── Staff Authentication ───────────────────────────────────────
    path('auth/login/',
         views.StaffLoginView.as_view(),
         name='staff-login'),

    path('auth/logout/',
         views.StaffLogoutView.as_view(),
         name='staff-logout'),

    path('auth/refresh/',
         TokenRefreshView.as_view(),
         name='token-refresh'),

    # ─── Staff Management ───────────────────────────────────────────
    path('staff/',
         views.StaffListView.as_view(),
         name='staff-list'),

    path('staff/register/',
         views.StaffRegisterView.as_view(),
         name='staff-register'),

    path('staff/profile/',
         views.StaffProfileView.as_view(),
         name='staff-profile'),

    # ─── Customer Management ────────────────────────────────────────
    path('customers/',
         views.CustomerListCreateView.as_view(),
         name='customer-list-create'),

    path('customers/<int:pk>/',
         views.CustomerDetailView.as_view(),
         name='customer-detail'),

    # ─── Customer OTP Login ─────────────────────────────────────────
    path('auth/customer/request-otp/',
         views.CustomerOTPRequestView.as_view(),
         name='customer-request-otp'),

    path('auth/customer/verify-otp/',
         views.CustomerOTPVerifyView.as_view(),
         name='customer-verify-otp'),

    # Public customer registration (website signup)
    path('auth/customer/register/',
         views.CustomerPublicRegisterView.as_view(),
         name='customer-register-public'),
]