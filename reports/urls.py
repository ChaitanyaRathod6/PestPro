from django.urls import path
from . import views

urlpatterns = [
    # These match what your React frontend calls:
    # /api/reports/pdf/
    # /api/reports/pdf/job/<id>/regenerate/
    # /api/reports/emails/
    # /api/reports/emails/stats/

    path('pdf/',                              views.PDFReportListView.as_view(),    name='report-list'),
    path('pdf/job/<int:job_id>/',             views.PDFReportByJobView.as_view(),   name='report-by-job'),
    path('pdf/job/<int:job_id>/regenerate/',  views.PDFRegenerateView.as_view(),    name='report-regenerate'),
    path('pdf/download/',                     views.PDFDownloadView.as_view(),      name='report-download'),
    path('pdf/<int:pk>/',                     views.PDFReportDetailView.as_view(),  name='report-detail'),

    # emails/stats/ MUST be before emails/<int:pk>/ — otherwise Django
    # tries to cast "stats" as an integer and returns 404
    path('emails/',                           views.EmailLogListView.as_view(),     name='email-log-list'),
    path('emails/stats/',                     views.EmailLogStatsView.as_view(),    name='email-log-stats'),
    path('emails/<int:pk>/',                  views.EmailLogDetailView.as_view(),   name='email-log-detail'),
]