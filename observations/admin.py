from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import (ServiceObservation, RodentObservation,
    FlyingInsectObservation, CockroachObservation,
    TermiteObservation, MosquitoObservation, GeneralObservation)

admin.site.register(ServiceObservation)
admin.site.register(RodentObservation)
admin.site.register(FlyingInsectObservation)
admin.site.register(CockroachObservation)
admin.site.register(TermiteObservation)
admin.site.register(MosquitoObservation)
admin.site.register(GeneralObservation)