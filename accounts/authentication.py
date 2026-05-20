print("=== accounts.authentication MODULE LOADED ===")
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .models import Customer
from rest_framework.permissions import BasePermission

class CustomerTokenAuthentication(BaseAuthentication):
    def authenticate(self, request):
        # Use request.META which is more reliable across different servers
        print("=== CustomerTokenAuthentication called ===")
        auth = request.META.get('HTTP_AUTHORIZATION', '')
        
        # DEBUG: This will print to your Django terminal
        print(f"--- BACKEND DEBUG ---")
        print(f"Full Authorization Header: '{auth}'")
        
        if not auth or not auth.startswith('Token '):
            print("Result: No 'Token' header found, skipping this auth class.")
            return None

        try:
            token = auth.split(' ', 1)[1]
            customer = Customer.objects.get(access_token=token, is_active=True)
            print(f"Result: Successfully authenticated Customer ID: {customer.id}")
            return (customer, token)
        except (IndexError, Customer.DoesNotExist):
            print(f"Result: Token found but no active customer matches.")
            raise AuthenticationFailed('Invalid or expired token')



class IsCustomer(BasePermission):
    def has_permission(self, request, view):
        return request.user is not None