from django.urls import path
from . import views

urlpatterns = [

    # ─── Observations per Job ───────────────────────────────────────
    path('jobs/<int:job_id>/observations/',
         views.ObservationListCreateView.as_view(),
         name='observation-list-create'),

    path('jobs/<int:job_id>/observations/summary/',
         views.ObservationSummaryView.as_view(),
         name='observation-summary'),

    # ─── Single Observation ─────────────────────────────────────────
    path('observations/<int:pk>/',
         views.ObservationDetailView.as_view(),
         name='observation-detail'),

    # ─── Observations by Type ───────────────────────────────────────
    path('observations/rodent/',
         views.RodentObservationListView.as_view(),
         name='rodent-observations'),

    path('observations/flying-insect/',
         views.FlyingInsectObservationListView.as_view(),
         name='flying-insect-observations'),

    path('observations/cockroach/',
         views.CockroachObservationListView.as_view(),
         name='cockroach-observations'),

    path('observations/termite/',
         views.TermiteObservationListView.as_view(),
         name='termite-observations'),

    path('observations/mosquito/',
         views.MosquitoObservationListView.as_view(),
         name='mosquito-observations'),

    path('observations/general/',
         views.GeneralObservationListView.as_view(),
         name='general-observations'),
]