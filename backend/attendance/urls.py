# from django.urls import path, include
# from rest_framework.routers import DefaultRouter
# from .views import (
#     create_vedant_attendance , signout_vedant_attendance # ✅ Import the function
# )

# router = DefaultRouter()
# # router.register(r'devices', DeviceViewSet, basename='device')
# # router.register(r'attendance-logs', AttendanceLogViewSet, basename='attendance-log')
# # router.register(r'attendance', AttendanceViewSet, basename='attendance')
# # router.register(r'shifts', ShiftViewSet, basename='shift')
# # router.register(r'holidays', HolidayViewSet, basename='holiday')
# # router.register(r'settings', SettingViewSet, basename='setting')

# urlpatterns = [
#     path('', include(router.urls)),
#     path('create-vedant-attendance/', create_vedant_attendance, name='create-vedant-attendance'),  # ✅ Add this
#     path('signout-vedant-attendance/', signout_vedant_attendance, name='signout-vedant-attendance')
# ]

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AttendanceViewSet

router = DefaultRouter()
router.register(r'attendance', AttendanceViewSet, basename='attendance')

urlpatterns = [
    path('api/', include(router.urls)),
]
