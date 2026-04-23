from django.urls import path
from . import views

urlpatterns = [

    # ─── PDF Reports ────────────────────────────────────────────────
    path('reports/',
         views.PDFReportListView.as_view(),
         name='report-list'),

    path('reports/<int:pk>/',
         views.PDFReportDetailView.as_view(),
         name='report-detail'),

    path('reports/job/<int:job_id>/',
         views.PDFReportByJobView.as_view(),
         name='report-by-job'),

    path('reports/job/<int:job_id>/regenerate/',
         views.PDFRegenerateView.as_view(),
         name='report-regenerate'),

    path('reports/download/',
         views.PDFDownloadView.as_view(),
         name='report-download'),

    # ─── Email Logs ─────────────────────────────────────────────────
    path('emails/',
         views.EmailLogListView.as_view(),
         name='email-log-list'),

    path('emails/<int:pk>/',
         views.EmailLogDetailView.as_view(),
         name='email-log-detail'),

    path('emails/stats/',
         views.EmailLogStatsView.as_view(),
         name='email-log-stats'),
]