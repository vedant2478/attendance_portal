from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmployeeViewSet, AuthViewSet


router = DefaultRouter()
router.register(r'employees', EmployeeViewSet, basename='employee')
router.register(r'auth', AuthViewSet, basename='auth')


urlpatterns = [
    path('', include(router.urls)),  
]
