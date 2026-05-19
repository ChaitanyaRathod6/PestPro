# auth/authentication.py (or jobs/authentication.py)
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from accounts.models import Customer  # adjust import

class CustomerTokenAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header.split(' ')[1]
        
        try:
            customer = Customer.objects.get(access_token=token)
        except Customer.DoesNotExist:
            raise AuthenticationFailed('Invalid or expired token.')
        
        return (customer, token)