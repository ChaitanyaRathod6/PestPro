from django.urls import path
from . import views

urlpatterns = [

    # ─── Alerts ─────────────────────────────────────────────────────
    path('alerts/',
         views.SmartAlertListView.as_view(),
         name='alert-list'),

    path('alerts/stats/',
         views.SmartAlertStatsView.as_view(),
         name='alert-stats'),

    path('alerts/<int:pk>/',
         views.SmartAlertDetailView.as_view(),
         name='alert-detail'),

    path('alerts/<int:pk>/resolve/',
         views.SmartAlertResolveView.as_view(),
         name='alert-resolve'),

    path('alerts/job/<int:job_id>/',
         views.SmartAlertByJobView.as_view(),
         name='alerts-by-job'),
]