import secrets 
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Q, Count, Avg, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from datetime import date, datetime, timedelta, time as dt_time
from .models import Attendance, AttendanceLog, Shift, Device
from user.models import Employee, Department
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




# ==================== DEPARTMENT ATTENDANCE APIS ====================



@api_view(['GET'])
@permission_classes([AllowAny])
def attendance_by_department(request):
    """
    Get attendance statistics grouped by department
    GET /api/attendance/by-department/
    Query Parameters:
    - start_date: YYYY-MM-DD format (optional)
    - end_date: YYYY-MM-DD format (optional)
    - status: filter by status (optional)
    """
    try:
        # Get query parameters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        status_filter = request.query_params.get('status')


        # Build base queryset
        attendance_qs = Attendance.objects.all()


        # Apply date filters
        if start_date:
            attendance_qs = attendance_qs.filter(date__gte=start_date)
        if end_date:
            attendance_qs = attendance_qs.filter(date__lte=end_date)
        if status_filter:
            attendance_qs = attendance_qs.filter(status=status_filter)


        # Get all departments
        departments = Department.objects.all()


        department_stats = []


        for dept in departments:
            # Get employees in this department
            dept_employees = Employee.objects.filter(dept=dept, is_active=1)
            employee_ids = list(dept_employees.values_list('id', flat=True))


            if not employee_ids:
                # Skip departments with no employees
                continue


            # Get attendance records for this department
            dept_attendance = attendance_qs.filter(employee__in=employee_ids)


            # Count different statuses
            total_records = dept_attendance.count()
            present_count = dept_attendance.filter(status='present').count()
            absent_count = dept_attendance.filter(status='absent').count()
            late_count = dept_attendance.filter(status='late').count()
            on_leave_count = dept_attendance.filter(status='on_leave').count()


            # Calculate attendance rate
            attendance_rate = round((present_count / total_records * 100), 2) if total_records > 0 else 0


            # Calculate average hours and overtime
            avg_hours = dept_attendance.aggregate(
                avg_hours=Coalesce(Avg('total_hours'), 0.0)
            )['avg_hours']

            total_overtime = dept_attendance.aggregate(
                total_ot=Coalesce(Sum('overtime'), 0.0)
            )['total_ot']


            department_stats.append({
                'department_id': dept.id,
                'department_name': dept.dept_name,
                'location': dept.location if hasattr(dept, 'location') else None,
                'total_employees': dept_employees.count(),
                'total_records': total_records,
                'present_count': present_count,
                'absent_count': absent_count,
                'late_count': late_count,
                'on_leave_count': on_leave_count,
                'attendance_rate': attendance_rate,
                'average_hours': round(avg_hours or 0, 2),
                'total_overtime': round(total_overtime or 0, 2),
            })


        # Sort by attendance rate descending
        department_stats.sort(key=lambda x: x['attendance_rate'], reverse=True)


        return Response({
            'success': True,
            'count': len(department_stats),
            'data': department_stats,
            'filters': {
                'start_date': start_date,
                'end_date': end_date,
                'status': status_filter,
            }
        }, status=status.HTTP_200_OK)


    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



@api_view(['GET'])
@permission_classes([AllowAny])
def department_attendance_summary(request):
    """
    Get a quick summary of attendance by department for today or a specific date
    GET /api/attendance/department-summary/
    Query Parameters:
    - date: YYYY-MM-DD format (default: today)
    """
    try:
        # Get date parameter or use today
        date_param = request.query_params.get('date')
        if date_param:
            target_date = datetime.strptime(date_param, '%Y-%m-%d').date()
        else:
            target_date = date.today()


        # Get all departments
        departments = Department.objects.all()


        summary_data = []


        for dept in departments:
            # Get active employees in this department
            dept_employees = Employee.objects.filter(dept=dept, is_active=1)
            total_employees = dept_employees.count()


            if total_employees == 0:
                continue


            # Get today's attendance for this department
            employee_ids = list(dept_employees.values_list('id', flat=True))
            dept_attendance = Attendance.objects.filter(
                employee__in=employee_ids,
                date=target_date
            )


            # Count statuses
            present = dept_attendance.filter(status='present').count()
            late = dept_attendance.filter(status='late').count()
            on_leave = dept_attendance.filter(status='on_leave').count()

            # ✅ Calculate absent: Total employees - (Present + Late + On Leave)
            absent = max(0, total_employees - (present + late + on_leave))

            # Calculate attendance rate for today (excluding on leave)
            working_employees = total_employees - on_leave
            attendance_rate = round(((present + late) / working_employees * 100), 2) if working_employees > 0 else 0


            summary_data.append({
                'department_id': dept.id,
                'department_name': dept.dept_name,
                'total_employees': total_employees,
                'present': present,
                'absent': absent,  # ✅ Calculated properly
                'late': late,
                'on_leave': on_leave,
                'attendance_rate': attendance_rate,
            })


        return Response({
            'success': True,
            'date': str(target_date),
            'total_departments': len(summary_data),
            'data': summary_data,
        }, status=status.HTTP_200_OK)


    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



@api_view(['GET'])
@permission_classes([AllowAny])
def department_comparison(request):
    """
    Compare attendance rates across departments over a time period
    GET /api/attendance/department-comparison/
    Query Parameters:
    - days: number of days to analyze (default: 30)
    """
    try:
        days = int(request.query_params.get('days', 30))
        end_date = date.today()
        start_date = end_date - timedelta(days=days)


        departments = Department.objects.all()
        comparison_data = []


        for dept in departments:
            dept_employees = Employee.objects.filter(dept=dept, is_active=1)
            employee_ids = list(dept_employees.values_list('id', flat=True))


            if not employee_ids:
                continue


            dept_attendance = Attendance.objects.filter(
                employee__in=employee_ids,
                date__gte=start_date,
                date__lte=end_date
            )


            total_records = dept_attendance.count()
            present_count = dept_attendance.filter(status='present').count()

            attendance_rate = round((present_count / total_records * 100), 2) if total_records > 0 else 0


            # Calculate trend (compare first half vs second half)
            mid_date = start_date + timedelta(days=days//2)

            first_half = dept_attendance.filter(date__lt=mid_date)
            first_half_total = first_half.count()
            first_half_present = first_half.filter(status='present').count()
            first_half_rate = round((first_half_present / first_half_total * 100), 2) if first_half_total > 0 else 0

            second_half = dept_attendance.filter(date__gte=mid_date)
            second_half_total = second_half.count()
            second_half_present = second_half.filter(status='present').count()
            second_half_rate = round((second_half_present / second_half_total * 100), 2) if second_half_total > 0 else 0

            trend = round(second_half_rate - first_half_rate, 2)


            comparison_data.append({
                'department_id': dept.id,
                'department_name': dept.dept_name,
                'total_employees': dept_employees.count(),
                'attendance_rate': attendance_rate,
                'total_records': total_records,
                'present_count': present_count,
                'trend': trend,
                'trend_direction': 'up' if trend > 0 else 'down' if trend < 0 else 'stable',
            })


        # Sort by attendance rate
        comparison_data.sort(key=lambda x: x['attendance_rate'], reverse=True)


        return Response({
            'success': True,
            'period': {
                'start_date': str(start_date),
                'end_date': str(end_date),
                'days': days,
            },
            'data': comparison_data,
        }, status=status.HTTP_200_OK)


    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




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
        """
        Get today's attendance statistics
        ✅ CORRECTED: Calculates absent as Total Active Employees - (Present + Late + On Leave)
        """
        today = date.today()

        # ✅ Get all active employees from Employee table
        total_active_employees = Employee.objects.filter(is_active=1).count()

        # Get today's attendance records
        today_attendance = Attendance.objects.filter(date=today)

        # Count different statuses
        present_count = today_attendance.filter(status__in=['present', 'late']).count()
        late_count = today_attendance.filter(status='late').count()
        on_leave_count = today_attendance.filter(status='on_leave').count()

        # ✅ CORRECTED: Calculate absent as Total - (Present + Late + On Leave)
        absent_count = max(0, total_active_employees - (present_count + late_count + on_leave_count))

        # Calculate attendance rate (excluding employees on leave)
        working_employees = total_active_employees - on_leave_count
        attendance_rate = round(((present_count + late_count) / working_employees * 100), 2) if working_employees > 0 else 0

        stats = {
            'total_employees': total_active_employees,
            'present': present_count,
            'absent': absent_count,  # ✅ Calculated from total employees
            'late': late_count,
            'on_leave': on_leave_count,
            'attendance_rate': attendance_rate,
            'total_marked': today_attendance.count(),
            'breakdown': f'{total_active_employees} total = {present_count} present + {late_count} late + {on_leave_count} on leave + {absent_count} absent'
        }

        return Response(stats)

    @action(detail=False, methods=['get'])
    def trend(self, request):
        """
        Get attendance trend for last N days
        ✅ CORRECTED: Calculates absent using total active employees
        """
        days = int(request.query_params.get('days', 7))

        # ✅ Get total active employees for calculation
        total_active_employees = Employee.objects.filter(is_active=1).count()

        trend_data = []
        for i in range(days - 1, -1, -1):
            target_date = date.today() - timedelta(days=i)
            day_records = Attendance.objects.filter(date=target_date)

            present_count = day_records.filter(status='present').count()
            late_count = day_records.filter(status='late').count()
            on_leave_count = day_records.filter(status='on_leave').count()

            # ✅ Calculate absent properly
            absent_count = max(0, total_active_employees - (present_count + late_count + on_leave_count))

            trend_data.append({
                'date': target_date.isoformat(),
                'present': present_count,
                'absent': absent_count,  # ✅ Calculated from total employees
                'late': late_count,
                'on_leave': on_leave_count,
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