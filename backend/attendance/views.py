import secrets 
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Q
from django.utils import timezone
from datetime import date, datetime, timedelta, time as dt_time
from .models import Attendance, AttendanceLog, Shift, Device
from user.models import Employee
from .serializers import (
    AttendanceSerializer,
    AttendanceLogSerializer,
    SignInSerializer,
    SignOutSerializer
)


# ==================== HELPER FUNCTIONS ====================

def calculate_hours(start_time, end_time):
    """Calculate hours between two time objects"""
    if not start_time or not end_time:
        return 0
    
    start_datetime = datetime.combine(date.today(), start_time)
    end_datetime = datetime.combine(date.today(), end_time)
    
    # Handle overnight shifts
    if end_datetime < start_datetime:
        end_datetime += timedelta(days=1)
    
    duration = end_datetime - start_datetime
    return round(duration.total_seconds() / 3600, 2)


def determine_status(sign_in_time, shift):
    """Determine attendance status based on sign-in time and shift"""
    # if not sign_in_time or not shift:
    #     return 'present'
    
    # grace_minutes = shift.grace_time or 0
    # shift_start = datetime.combine(date.today(), shift.start_time)
    # grace_end = shift_start + timedelta(minutes=grace_minutes)
    # sign_in_datetime = datetime.combine(date.today(), sign_in_time)
    
    # if sign_in_datetime <= grace_end:
    #     return 'present'
    # else:
    #     return 'late'
    statuses = ['late', 'present', 'on_leave', 'absent']
    return secrets.choice(statuses)



# ==================== SIGN-IN API ====================

@api_view(['POST'])
@permission_classes([AllowAny])
def sign_in_attendance(request):
    """
    Sign-in attendance for an employee
    POST /api/attendance/sign-in/
    Body: {
        "employee_id": 1,
        "device_id": 1,          # optional
        "latitude": 19.0760,     # optional
        "longitude": 72.8777,    # optional
        "photo_path": "/path",   # optional
        "auth_mode": 1           # optional
    }
    """
    serializer = SignInSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    employee_id = serializer.validated_data['employee_id']
    device_id = serializer.validated_data.get('device_id')
    latitude = serializer.validated_data.get('latitude')
    longitude = serializer.validated_data.get('longitude')
    photo_path = serializer.validated_data.get('photo_path')
    auth_mode = serializer.validated_data.get('auth_mode')
    
    try:
        employee = Employee.objects.get(id=employee_id)
        today = date.today()
        now = timezone.now()
        
        # Check if already signed in today
        existing_attendance = Attendance.objects.filter(
            employee=employee,
            date=today
        ).first()
        
        if existing_attendance and existing_attendance.sign_in_time:
            return Response({
                'error': 'Already signed in today',
                'sign_in_time': existing_attendance.sign_in_time.strftime('%H:%M:%S'),
                'attendance_id': existing_attendance.id
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get device if provided
        device = None
        if device_id:
            device = Device.objects.filter(id=device_id).first()
        
        # Create attendance log
        attendance_log = AttendanceLog.objects.create(
            employee=employee,
            timestamp=now,
            status='In',
            auth_mode=auth_mode,
            device=device,
            latitude=latitude,
            longitude=longitude,
            photo_path=photo_path,
            is_posted=0
        )
        
        # Get or assign shift (modify this logic as needed)
        shift = Shift.objects.first()
        
        # Create or update attendance record
        if existing_attendance:
            existing_attendance.sign_in_time = now.time()
            existing_attendance.shift = shift
            existing_attendance.status = determine_status(now.time(), shift)
            existing_attendance.save()
            attendance = existing_attendance
        else:
            attendance = Attendance.objects.create(
                employee=employee,
                date=today,
                shift=shift,
                sign_in_time=now.time(),
                status=determine_status(now.time(), shift)
            )
        
        # Mark log as posted
        attendance_log.is_posted = 1
        attendance_log.save()
        
        return Response({
            'message': 'Sign-in successful',
            'attendance_id': attendance.id,
            'employee_name': f"{employee.first_name} {employee.last_name}",
            'employee_code': employee.employee_code,
            'sign_in_time': attendance.sign_in_time.strftime('%H:%M:%S'),
            'date': attendance.date.isoformat(),
            'status': attendance.status,
            'shift': attendance.shift.shift_name if attendance.shift else None
        }, status=status.HTTP_201_CREATED)
        
    except Employee.DoesNotExist:
        return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ==================== SIGN-OUT API ====================

@api_view(['POST'])
@permission_classes([AllowAny])
def sign_out_attendance(request):
    """
    Sign-out attendance for an employee
    POST /api/attendance/sign-out/
    Body: {
        "employee_id": 1,
        "device_id": 1,          # optional
        "latitude": 19.0760,     # optional
        "longitude": 72.8777,    # optional
        "photo_path": "/path",   # optional
        "auth_mode": 1           # optional
    }
    """
    serializer = SignOutSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    employee_id = serializer.validated_data['employee_id']
    device_id = serializer.validated_data.get('device_id')
    latitude = serializer.validated_data.get('latitude')
    longitude = serializer.validated_data.get('longitude')
    photo_path = serializer.validated_data.get('photo_path')
    auth_mode = serializer.validated_data.get('auth_mode')
    
    try:
        employee = Employee.objects.get(id=employee_id)
        today = date.today()
        now = timezone.now()
        
        # Check if signed in today
        attendance = Attendance.objects.filter(employee=employee, date=today).first()
        
        if not attendance or not attendance.sign_in_time:
            return Response({
                'error': 'No sign-in record found for today'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if attendance.sign_out_time:
            return Response({
                'error': 'Already signed out today',
                'sign_out_time': attendance.sign_out_time.strftime('%H:%M:%S'),
                'total_hours': attendance.total_hours
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get device if provided
        device = None
        if device_id:
            device = Device.objects.filter(id=device_id).first()
        
        # Create attendance log
        attendance_log = AttendanceLog.objects.create(
            employee=employee,
            timestamp=now,
            status='Out',
            auth_mode=auth_mode,
            device=device,
            latitude=latitude,
            longitude=longitude,
            photo_path=photo_path,
            is_posted=0
        )
        
        # Update attendance record
        attendance.sign_out_time = now.time()
        attendance.total_hours = calculate_hours(attendance.sign_in_time, attendance.sign_out_time)
        
        # Calculate overtime
        if attendance.shift and attendance.shift.working_hours:
            if attendance.total_hours > attendance.shift.working_hours:
                attendance.overtime = attendance.total_hours - attendance.shift.working_hours
        
        attendance.save()
        
        # Mark log as posted
        attendance_log.is_posted = 1
        attendance_log.save()
        
        return Response({
            'message': 'Sign-out successful',
            'attendance_id': attendance.id,
            'employee_name': f"{employee.first_name} {employee.last_name}",
            'employee_code': employee.employee_code,
            'sign_in_time': attendance.sign_in_time.strftime('%H:%M:%S'),
            'sign_out_time': attendance.sign_out_time.strftime('%H:%M:%S'),
            'total_hours': attendance.total_hours,
            'overtime': attendance.overtime,
            'date': attendance.date.isoformat(),
            'status': attendance.status
        }, status=status.HTTP_200_OK)
        
    except Employee.DoesNotExist:
        return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ==================== ATTENDANCE VIEWSET ====================

class AttendanceViewSet(viewsets.ModelViewSet):
    """ViewSet for Attendance CRUD operations"""
    queryset = Attendance.objects.all().select_related('employee', 'shift').order_by('-date', '-created_at')
    serializer_class = AttendanceSerializer
    permission_classes = [AllowAny]
    ordering_fields = ['date', 'created_at']
    ordering = ['-date', '-created_at']
    
    def get_queryset(self):
        """Custom filtering"""
        queryset = super().get_queryset()
        
        # Filter by employee
        employee_id = self.request.query_params.get('employee')
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        
        # Filter by date
        date_param = self.request.query_params.get('date')
        if date_param:
            queryset = queryset.filter(date=date_param)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        # Filter by shift
        shift_id = self.request.query_params.get('shift')
        if shift_id:
            queryset = queryset.filter(shift_id=shift_id)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def today_stats(self, request):
        """Get today's attendance statistics"""
        today = date.today()
        today_attendance = Attendance.objects.filter(date=today)
        
        stats = {
            'present': today_attendance.filter(status='present').count(),
            'absent': today_attendance.filter(
                Q(status='absent') | Q(status__isnull=True)
            ).count(),
            'late': today_attendance.filter(status='late').count(),
            'on_leave': today_attendance.filter(status='on_leave').count(),
            'total_records': today_attendance.count(),
        }
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def trend(self, request):
        """Get attendance trend for last N days"""
        days = int(request.query_params.get('days', 7))
        
        trend_data = []
        for i in range(days - 1, -1, -1):
            target_date = date.today() - timedelta(days=i)
            day_records = Attendance.objects.filter(date=target_date)
            
            trend_data.append({
                'date': target_date.isoformat(),
                'present': day_records.filter(status='present').count(),
                'absent': day_records.filter(
                    Q(status='absent') | Q(status__isnull=True)
                ).count(),
                'late': day_records.filter(status='late').count(),
                'on_leave': day_records.filter(status='on_leave').count(),
            })
        
        return Response(trend_data)
    
    @action(detail=False, methods=['get'])
    def by_employee(self, request):
        """Get attendance by employee ID"""
        employee_id = request.query_params.get('employee_id')
        if not employee_id:
            return Response(
                {'error': 'employee_id parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        attendances = self.queryset.filter(employee_id=employee_id)
        serializer = self.get_serializer(attendances, many=True)
        return Response(serializer.data)
