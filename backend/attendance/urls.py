from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AttendanceViewSet, 
    sign_in_attendance, 
    sign_out_attendance,
    attendance_by_department,
    department_attendance_summary,
    department_comparison
)

router = DefaultRouter()
router.register(r'attendance', AttendanceViewSet, basename='attendance')

urlpatterns = [
    # Put custom endpoints BEFORE router.urls
    path('attendance/sign-in/', sign_in_attendance, name='attendance-sign-in'),
    path('attendance/sign-out/', sign_out_attendance, name='attendance-sign-out'),
    
    # Department attendance endpoints
    path('attendance/by-department/', attendance_by_department, name='attendance-by-department'),
    path('attendance/department-summary/', department_attendance_summary, name='department-summary'),
    path('attendance/department-comparison/', department_comparison, name='department-comparison'),
    
    # Router URLs come last
    path('', include(router.urls)),
]
