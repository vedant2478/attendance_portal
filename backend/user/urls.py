from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmployeeViewSet, AuthViewSet, LeaveRequestViewSet

router = DefaultRouter()
router.register(r'employees', EmployeeViewSet, basename='employee')
router.register(r'auth', AuthViewSet, basename='auth')
router.register(r'leave-requests', LeaveRequestViewSet, basename='leave-request')

# DEBUG: Print all registered routes
print("\n" + "="*50)
print("Registered API Routes:")
print("="*50)
for url in router.urls:
    print(f"  {url.pattern}")
print("="*50 + "\n")

urlpatterns = [
    path('', include(router.urls)),  
]
