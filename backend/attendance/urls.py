from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AttendanceViewSet, sign_in_attendance, sign_out_attendance


router = DefaultRouter()
router.register(r'attendance', AttendanceViewSet, basename='attendance')


urlpatterns = [
    # Put custom endpoints BEFORE router.urls
    path('attendance/sign-in/', sign_in_attendance, name='attendance-sign-in'),
    path('attendance/sign-out/', sign_out_attendance, name='attendance-sign-out'),
    
    # Router URLs come last
    path('', include(router.urls)),
]
