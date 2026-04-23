from django.contrib import admin

# Register your models here.
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Customer, CustomerOTPToken
 
 
@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display  = ['username', 'email', 'role', 'phone', 'is_active']
    list_filter   = ['role', 'is_active']
    search_fields = ['username', 'email', 'first_name', 'last_name']
       # Fields shown when EDITING an existing user
    fieldsets = (
        ('Login Info', {
            'fields': ('username', 'password')
        }),
        ('Personal Info', {
            'fields': ('first_name', 'last_name', 'email', 'phone', 'profile_photo')
        }),
        ('PestPro Role', {
            'fields': ('role',)
        }),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        ('Important Dates', {
            'fields': ('last_login', 'date_joined')
        }),
    )

    # Fields shown when ADDING a new user
    add_fieldsets = (
        ('Login Info', {
            'classes': ('wide',),
            'fields': ('username', 'password1', 'password2'),
        }),
        ('Personal Info', {
            'classes': ('wide',),
            'fields': ('first_name', 'last_name', 'email', 'phone'),
        }),
        ('PestPro Role', {
            'classes': ('wide',),
            'fields': ('role',),
        }),
    )
 
 
@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display  = ['name', 'email', 'city', 'is_active', 'geocode_status',
                     'email_opt_in', 'created_at']
    list_filter   = ['is_active', 'geocode_status', 'city', 'email_opt_in']
    search_fields = ['name', 'email', 'company_name', 'city']
    readonly_fields = ['geocoded_at', 'created_at', 'updated_at']
 
 
@admin.register(CustomerOTPToken)
class CustomerOTPTokenAdmin(admin.ModelAdmin):
    list_display  = ['customer_email', 'is_used', 'attempts', 'expires_at', 'created_at']
    list_filter   = ['is_used']
    search_fields = ['customer_email']
    readonly_fields = ['created_at']