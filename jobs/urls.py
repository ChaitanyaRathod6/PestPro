from django.urls import path
from . import views

urlpatterns = [

    # ─── Health Check ───────────────────────────────────────────────
    path('health/', views.JobHealthCheckView.as_view(), name='health-check'),

    # ── PERFORMANCE — must be before jobs/<int:pk>/ ──────────────────
    path('performance/', views.TechnicianPerformanceView.as_view(), name='technician-performance'),

    # ─── Jobs ───────────────────────────────────────────────────────
    path('jobs/', views.ServiceJobListCreateView.as_view(), name='job-list-create'),
    path('jobs/<int:pk>/', views.ServiceJobDetailView.as_view(), name='job-detail'),
    path('jobs/<int:pk>/start/', views.JobStartView.as_view(), name='job-start'),
    path('jobs/<int:pk>/complete/', views.JobCompleteView.as_view(), name='job-complete'),
    path('jobs/today/', views.TodayJobsView.as_view(), name='jobs-today'),
    path('jobs/customer/<int:customer_id>/', views.JobsByCustomerView.as_view(), name='jobs-by-customer'),
    path('jobs/technician/<int:technician_id>/', views.JobsByTechnicianView.as_view(), name='jobs-by-technician'),

    path('supervisor/dashboard/', views.supervisor_dashboard_api, name='supervisor_api'),
    path('technician/dashboard/', views.technician_dashboard_api, name='technician-dashboard'),
    path('jobs/<int:pk>/signature/', views.JobSignatureView.as_view(), name='job-signature'),

    # Reassign technician
    path('jobs/<int:pk>/reassign/', views.JobReassignView.as_view(), name='job-reassign'),

    # Add supervisor note
    path('jobs/<int:pk>/notes/', views.JobNotesView.as_view(), name='job-notes'),

    path('staff/', views.StaffListView.as_view(), name='staff-list'),
]

