# auth/authentication.py (or jobs/authentication.py)
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from accounts.models import Customer  # adjust import
from rest_framework.permissions import BasePermission

class CustomerTokenAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization', '')
        print(f"AUTH HEADER: '{auth_header}'")  # add this
        if not auth_header.startswith('Token'):
            return None
        
        token = auth_header.split(' ')[1]
        print(f"TOKEN: '{token}'")
        
        try:
            customer = Customer.objects.get(access_token=token)
        except Customer.DoesNotExist:
            raise AuthenticationFailed('Invalid or expired token.')
        
        return (customer, token)
    
class IsCustomer(BasePermission):
    def has_permission(self, request, view):
        return request.user is not None      