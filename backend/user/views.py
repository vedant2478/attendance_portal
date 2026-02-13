import json
import pickle
import secrets
from datetime import date
from attendance.models import Attendance  
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Q, Count, F, Sum
from django.utils import timezone
from attendance.serializers import AttendanceSerializer 
from django.db import transaction
from .models import Employee, Department, User, LeaveRequest, Notification
from .serializers import (
    ApproverSerializer,
    EmployeeSerializer,
    EmployeeListSerializer,
    EmployeeCreateSerializer,
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserSerializer,
    LeaveRequestSerializer,
    LeaveRequestCreateSerializer,
    LeaveApprovalSerializer,
    LeaveRequestListSerializer,
    LeaveStatsSerializer,
    ApproverSerializer
)


def generate_token():
    """Generate a simple token (replace with JWT in production)"""
    return secrets.token_urlsafe(32)


# ==================== AUTHENTICATION VIEWSET ====================

class AuthViewSet(viewsets.GenericViewSet):
    """Authentication endpoints for register and login"""
    permission_classes = [AllowAny]
    serializer_class = UserSerializer
    
    @action(detail=False, methods=['post'])
    def register(self, request):
        """
        Register a new user
        POST /api/auth/register/
        Body: { "username", "email", "password", "confirm_password" }
        """
        serializer = UserRegistrationSerializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.save()
            token = generate_token()
            user_data = UserSerializer(user).data
            
            return Response({
                'message': 'User registered successfully',
                'token': token,
                'user': user_data
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def login(self, request):
        """
        Login user
        POST /api/auth/login/
        Body: { "username", "password" }
        """
        serializer = UserLoginSerializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.validated_data['user']
            user.last_login_date = timezone.now()
            user.save()
            
            token = generate_token()
            user_data = UserSerializer(user).data
            
            return Response({
                'message': 'Login successful',
                'token': token,
                'user': user_data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def logout(self, request):
        """
        Logout user
        POST /api/auth/logout/
        """
        return Response({
            'message': 'Logout successful'
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        Get current user info
        GET /api/auth/me/
        """
        return Response({
            'message': 'User info endpoint - implement with JWT'
        }, status=status.HTTP_200_OK)


# ==================== EMPLOYEE VIEWSET ====================

class EmployeeViewSet(viewsets.ModelViewSet):
    """CRUD operations for employees"""
    queryset = Employee.objects.select_related('dept', 'user').filter(
        deleted_at__isnull=True
    ).order_by('-created_at')
    permission_classes = [AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['first_name', 'last_name', 'email', 'employee_code', 'mobile_number', 'dept__dept_name']
    ordering_fields = ['created_at', 'first_name', 'last_name', 'employee_code']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """Use different serializers for different actions"""
        if self.action == 'list':
            return EmployeeListSerializer
        return EmployeeSerializer
    
    def get_queryset(self):
        """Custom filtering"""
        queryset = super().get_queryset()
        
        dept_id = self.request.query_params.get('dept')
        if dept_id:
            queryset = queryset.filter(dept_id=dept_id)
        
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=int(is_active))
        
        include_expired = self.request.query_params.get('include_expired')
        if include_expired != 'true':
            today = timezone.now()
            queryset = queryset.filter(
                Q(validity_to__isnull=True) | Q(validity_to__gte=today)
            )
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Create a new employee with validation"""
        serializer = EmployeeCreateSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                with transaction.atomic():
                    employee = serializer.save()
                    
                return Response({
                    'success': True,
                    'message': 'Employee created successfully',
                    'data': EmployeeSerializer(employee).data
                }, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({
                    'success': False,
                    'error': f'Failed to create employee: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    def update(self, request, *args, **kwargs):
        """Update an existing employee"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = EmployeeCreateSerializer(instance, data=request.data, partial=partial)
        
        if serializer.is_valid():
            try:
                with transaction.atomic():
                    employee = serializer.save()
                    
                return Response({
                    'success': True,
                    'message': 'Employee updated successfully',
                    'data': EmployeeSerializer(employee).data
                }, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({
                    'success': False,
                    'error': f'Failed to update employee: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    def destroy(self, request, *args, **kwargs):
        """Soft delete instead of hard delete"""
        instance = self.get_object()
        instance.deleted_at = timezone.now()
        instance.is_active = 0
        instance.save()
        return Response({
            'success': True,
            'message': 'Employee deleted successfully'
        }, status=status.HTTP_200_OK)
    
    # ==================== DROPDOWN DATA ENDPOINT ====================
    
    @action(detail=False, methods=['get'])
    def dropdown_data(self, request):
        """
        Get dropdown data for employee form
        GET /api/employees/dropdown_data/
        GET /api/employees/dropdown_data/?employee_id=5 (for editing)
        """
        departments = Department.objects.filter(
            deleted_at__isnull=True
        ).order_by('dept_name')
        
        dept_data = [{
            'id': dept.id,
            'dept_name': dept.dept_name,
            'location': dept.location,
            'manager_name': dept.manager_name,
            'contact_number': dept.contact_number
        } for dept in departments]
        
        employee_id = request.query_params.get('employee_id')
        current_user_id = None
        
        if employee_id:
            try:
                employee = Employee.objects.get(id=employee_id, deleted_at__isnull=True)
                current_user_id = employee.user_id if employee.user else None
            except Employee.DoesNotExist:
                pass
        
        linked_user_ids = Employee.objects.filter(
            deleted_at__isnull=True,
            user__isnull=False
        ).values_list('user_id', flat=True)
        
        users_query = User.objects.filter(
            is_active=1,
            deleted_at__isnull=True
        ).select_related('role')
        
        if current_user_id:
            users_query = users_query.filter(
                Q(id=current_user_id) | ~Q(id__in=linked_user_ids)
            )
        else:
            users_query = users_query.exclude(id__in=linked_user_ids)
        
        users = users_query.order_by('username')
        
        user_data = [{
            'id': user.id,
            'username': user.username,
            'email': user.email if user.email else '',
            'role': user.role.role_name if user.role else 'No Role',
            'role_id': user.role.id if user.role else None,
            'is_current': user.id == current_user_id if current_user_id else False
        } for user in users]
        
        return Response({
            'success': True,
            'data': {
                'departments': dept_data,
                'users': user_data
            },
            'counts': {
                'departments': len(dept_data),
                'available_users': len(user_data),
                'total_users': User.objects.filter(is_active=1, deleted_at__isnull=True).count(),
                'linked_users': len(linked_user_ids)
            }
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'])
    def check_user_available(self, request, pk=None):
        """Check if a user is available for linking"""
        try:
            user = User.objects.get(pk=pk, is_active=1, deleted_at__isnull=True)
        except User.DoesNotExist:
            return Response({
                'success': False,
                'available': False,
                'error': 'User not found or inactive'
            }, status=status.HTTP_404_NOT_FOUND)
        
        existing_link = Employee.objects.filter(
            user=user,
            deleted_at__isnull=True
        ).first()
        
        if existing_link:
            return Response({
                'success': True,
                'available': False,
                'message': f'User already linked to employee: {existing_link.first_name} {existing_link.last_name}',
                'linked_employee': {
                    'id': existing_link.id,
                    'name': f'{existing_link.first_name} {existing_link.last_name}',
                    'employee_code': existing_link.employee_code
                }
            })
        
        return Response({
            'success': True,
            'available': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email
            }
        })
    
    # ==================== EMPLOYEE STATUS ENDPOINTS ====================
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get only active employees"""
        active_employees = self.get_queryset().filter(is_active=1)
        serializer = EmployeeListSerializer(active_employees, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_department(self, request):
        """Get employees grouped by department"""
        dept_id = request.query_params.get('dept_id')
        if not dept_id:
            return Response(
                {'error': 'dept_id parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        employees = self.get_queryset().filter(dept_id=dept_id)
        serializer = EmployeeListSerializer(employees, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get employee statistics"""
        queryset = Employee.objects.filter(deleted_at__isnull=True)
        
        stats = {
            'total_employees': queryset.count(),
            'active_employees': queryset.filter(is_active=1).count(),
            'inactive_employees': queryset.filter(is_active=0).count(),
            'by_department': list(
                queryset.values('dept__dept_name')
                .annotate(count=Count('id'))
                .order_by('-count')
            ),
        }
        
        return Response(stats)
    
    @action(detail=True, methods=['patch'])
    def activate(self, request, pk=None):
        """Activate employee"""
        employee = self.get_object()
        employee.is_active = 1
        employee.deleted_at = None
        employee.save()
        serializer = self.get_serializer(employee)
        return Response({
            'success': True,
            'message': 'Employee activated successfully',
            'data': serializer.data
        })
    
    @action(detail=True, methods=['patch'])
    def deactivate(self, request, pk=None):
        """Deactivate employee"""
        employee = self.get_object()
        employee.is_active = 0
        employee.save()
        serializer = self.get_serializer(employee)
        return Response({
            'success': True,
            'message': 'Employee deactivated successfully',
            'data': serializer.data
        })
    
    # ==================== DEPARTMENT ENDPOINTS ====================
    
    @action(detail=False, methods=['get'])
    def with_dept_raw(self, request):
        """Get employees with raw department data"""
        employees = self.get_queryset().values(
            'id',
            'first_name',
            'last_name',
            'email',
            'employee_code',
            'mobile_number',
            'dept__dept_name',
            'dept__location',
            'dept__manager_name',
            'is_active',
            'validity_from',
            'validity_to',
            'created_at'
        )
        
        return Response(list(employees))
    
    @action(detail=False, methods=['get'])
    def with_dept_annotated(self, request):
        """Get employees with annotated department name"""
        employees = self.get_queryset().annotate(
            department_name=F('dept__dept_name'),
            department_location=F('dept__location'),
            department_manager=F('dept__manager_name')
        ).values(
            'id',
            'first_name',
            'last_name',
            'email',
            'employee_code',
            'mobile_number',
            'department_name',
            'department_location',
            'department_manager',
            'is_active',
            'validity_from',
            'validity_to'
        )
        
        return Response(list(employees))
    
    @action(detail=False, methods=['get'])
    def grouped_by_dept(self, request):
        """Get employees grouped by department with full details"""
        departments = Department.objects.filter(
            deleted_at__isnull=True
        ).prefetch_related('employee_set')
        
        result = []
        for dept in departments:
            employees = dept.employee_set.filter(
                deleted_at__isnull=True,
                is_active=1
            )
            
            result.append({
                'dept_id': dept.id,
                'dept_name': dept.dept_name,
                'location': dept.location,
                'manager_name': dept.manager_name,
                'contact_number': dept.contact_number,
                'employee_count': employees.count(),
                'employees': [{
                    'id': emp.id,
                    'full_name': f"{emp.first_name} {emp.last_name}",
                    'first_name': emp.first_name,
                    'last_name': emp.last_name,
                    'email': emp.email,
                    'employee_code': emp.employee_code,
                    'mobile_number': emp.mobile_number,
                    'is_active': emp.is_active
                } for emp in employees]
            })
        
        return Response(result)
    
    @action(detail=False, methods=['get'])
    def search_by_dept(self, request):
        """Search employees by department name"""
        dept_name = request.query_params.get('dept_name')
        if not dept_name:
            return Response(
                {'error': 'dept_name parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        employees = self.get_queryset().filter(
            dept__dept_name__icontains=dept_name
        )
        
        serializer = EmployeeListSerializer(employees, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def dept_summary(self, request):
        """Get summary of employees with department names"""
        employees = self.get_queryset().select_related('dept').values(
            'id',
            'first_name',
            'last_name',
            'employee_code',
            'dept__dept_name'
        )
        
        summary = [
            {
                'id': emp['id'],
                'name': f"{emp['first_name']} {emp['last_name']}",
                'employee_code': emp['employee_code'],
                'department': emp['dept__dept_name'] or 'No Department'
            }
            for emp in employees
        ]
        
        return Response(summary)
    
    @action(detail=True, methods=['get'])
    def with_dept_details(self, request, pk=None):
        """Get single employee with full department details"""
        employee = self.get_object()
        
        data = {
            'id': employee.id,
            'first_name': employee.first_name,
            'last_name': employee.last_name,
            'full_name': f"{employee.first_name} {employee.last_name}",
            'email': employee.email,
            'mobile_number': employee.mobile_number,
            'employee_code': employee.employee_code,
            'is_active': employee.is_active,
            'department': None
        }
        
        if employee.dept:
            data['department'] = {
                'id': employee.dept.id,
                'dept_name': employee.dept.dept_name,
                'location': employee.dept.location,
                'manager_name': employee.dept.manager_name,
                'contact_number': employee.dept.contact_number
            }
        
        return Response(data)
    
    # ==================== FACE ENCODING ENDPOINTS ====================
    
    @action(detail=False, methods=['post'])
    def update_face_encoding(self, request):
        """Update face encoding - stores as BLOB using pickle"""
        employee_code = request.data.get('employee_code')
        face_encoding = request.data.get('face_encoding')
        
        if not employee_code:
            return Response({
                'success': False,
                'error': 'employee_code is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not face_encoding:
            return Response({
                'success': False,
                'error': 'face_encoding is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not isinstance(face_encoding, list):
            return Response({
                'success': False,
                'error': 'face_encoding must be an array'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if len(face_encoding) not in [128, 512]:
            return Response({
                'success': False,
                'error': f'face_encoding must have 128 or 512 values, got {len(face_encoding)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            employee = Employee.objects.get(
                employee_code=employee_code,
                deleted_at__isnull=True
            )
        except Employee.DoesNotExist:
            return Response({
                'success': False,
                'error': f'Employee with code {employee_code} not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        try:
            encoding_bytes = pickle.dumps(face_encoding)
            employee.face_encoding = encoding_bytes
            employee.save()
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Failed to save face encoding: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'success': True,
            'message': 'Face encoding updated successfully',
            'employee_id': employee.id,
            'employee_code': employee.employee_code,
            'employee_name': f"{employee.first_name} {employee.last_name}",
            'encoding_length': len(face_encoding),
            'storage_size_bytes': len(encoding_bytes)
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['patch'])
    def upload_face_encoding(self, request, pk=None):
        """Update face encoding by employee ID"""
        employee = self.get_object()
        face_encoding = request.data.get('face_encoding')
        
        if not face_encoding:
            return Response({
                'success': False,
                'error': 'face_encoding is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not isinstance(face_encoding, list):
            return Response({
                'success': False,
                'error': 'face_encoding must be an array'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if len(face_encoding) not in [128, 512]:
            return Response({
                'success': False,
                'error': f'face_encoding must have 128 or 512 values'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            encoding_bytes = pickle.dumps(face_encoding)
            employee.face_encoding = encoding_bytes
            employee.save()
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Failed to save: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'success': True,
            'message': 'Face encoding uploaded successfully',
            'employee_id': employee.id,
            'employee_code': employee.employee_code,
            'encoding_length': len(face_encoding),
            'storage_size_bytes': len(encoding_bytes)
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'])
    def get_face_encoding(self, request, pk=None):
        """Get face encoding for employee"""
        employee = self.get_object()
        
        if not employee.face_encoding:
            return Response({
                'success': False,
                'error': 'No face encoding found for this employee'
            }, status=status.HTTP_404_NOT_FOUND)
        
        try:
            encoding_list = pickle.loads(bytes(employee.face_encoding))
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Failed to decode face encoding: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'success': True,
            'employee_id': employee.id,
            'employee_code': employee.employee_code,
            'employee_name': f"{employee.first_name} {employee.last_name}",
            'face_encoding': encoding_list,
            'encoding_length': len(encoding_list)
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def with_face_encodings(self, request):
        """Get all employees who have face encodings"""
        employees = self.get_queryset().filter(
            face_encoding__isnull=False,
            is_active=1
        ).exclude(face_encoding=b'')
        
        result = []
        for emp in employees:
            try:
                encoding = pickle.loads(bytes(emp.face_encoding)) if emp.face_encoding else None
                result.append({
                    'id': emp.id,
                    'employee_code': emp.employee_code,
                    'name': f"{emp.first_name} {emp.last_name}",
                    'email': emp.email,
                    'has_encoding': bool(encoding),
                    'encoding_length': len(encoding) if encoding else 0
                })
            except:
                continue
        
        return Response({
            'success': True,
            'count': len(result),
            'employees': result
        })
    
    @action(detail=False, methods=['get'])
    def without_face_encodings(self, request):
        """Get employees without face encodings"""
        employees = self.get_queryset().filter(
            Q(face_encoding__isnull=True) | Q(face_encoding=b''),
            is_active=1
        )
        
        result = [{
            'id': emp.id,
            'employee_code': emp.employee_code,
            'name': f"{emp.first_name} {emp.last_name}",
            'email': emp.email,
            'department': emp.dept.dept_name if emp.dept else None
        } for emp in employees]
        
        return Response({
            'success': True,
            'count': len(result),
            'employees': result
        })
    
    @action(detail=True, methods=['delete'])
    def delete_face_encoding(self, request, pk=None):
        """Delete face encoding for employee"""
        employee = self.get_object()
        
        if not employee.face_encoding:
            return Response({
                'success': False,
                'error': 'No face encoding found for this employee'
            }, status=status.HTTP_404_NOT_FOUND)
        
        employee.face_encoding = None
        employee.save()
        
        return Response({
            'success': True,
            'message': 'Face encoding deleted successfully',
            'employee_id': employee.id,
            'employee_code': employee.employee_code
        }, status=status.HTTP_200_OK)
    
    # ==================== ATTENDANCE DATA ENDPOINT ====================
    
    @action(detail=False, methods=['get'])
    def get_attendance_data_by_id(self, request):
        """Get employee data and attendance records by user ID"""
        user_id = request.query_params.get('user_id')
        
        if not user_id:
            return Response({
                'success': False,
                'error': 'user_id parameter is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            employee = Employee.objects.select_related('dept', 'user').get(
                user__id=user_id,
                deleted_at__isnull=True
            )
        except Employee.DoesNotExist:
            return Response({
                'success': False,
                'error': f'No employee found for user ID {user_id}'
            }, status=status.HTTP_404_NOT_FOUND)
        
        attendance_records = Attendance.objects.filter(
            employee=employee
        ).select_related('shift').order_by('-date')
        
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        status_filter = request.query_params.get('status')
        
        if start_date:
            attendance_records = attendance_records.filter(date__gte=start_date)
        if end_date:
            attendance_records = attendance_records.filter(date__lte=end_date)
        if status_filter:
            attendance_records = attendance_records.filter(status=status_filter)
        
        employee_serializer = self.get_serializer(employee)
        attendance_serializer = AttendanceSerializer(attendance_records, many=True)
        
        user_data = {
            'id': employee.user.id,
            'username': employee.user.username,
            'email': employee.user.email if employee.user.email else None,
            'role_name': employee.user.role.role_name if employee.user.role else None,
        }
        
        return Response({
            'success': True,
            'user': user_data,
            'employee': employee_serializer.data,
            'attendance_records': attendance_serializer.data,
            'total_attendance_count': attendance_records.count()
        }, status=status.HTTP_200_OK)


# ==================== LEAVE REQUEST VIEWSET ====================


from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Q, Count, Sum
from django.utils import timezone
from django.db import transaction
from .models import LeaveRequest, User, Employee, Notification
from .serializers import (
    LeaveRequestSerializer,
    LeaveRequestCreateSerializer,
    LeaveRequestListSerializer,
    LeaveApprovalSerializer,
    ApproverSerializer,
)


class LeaveRequestViewSet(viewsets.ModelViewSet):
    """ViewSet for leave request management"""
    permission_classes = [AllowAny]  # Change to IsAuthenticated in production
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return LeaveRequestCreateSerializer
        elif self.action == 'list':
            return LeaveRequestListSerializer
        elif self.action == 'approve_reject':
            return LeaveApprovalSerializer
        return LeaveRequestSerializer
    
    def get_queryset(self):
        """Filter leave requests based on user role"""
        user_id = self.request.query_params.get('user_id')
        
        if not user_id:
            # Return all leaves if no user_id specified (for list endpoint)
            return LeaveRequest.objects.filter(
                deleted_at__isnull=True
            ).select_related(
                'user', 'employee', 'approver', 'approved_by'
            ).order_by('-created_at')
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return LeaveRequest.objects.none()
        
        queryset = LeaveRequest.objects.filter(deleted_at__isnull=True).select_related(
            'user', 'employee', 'approver', 'approved_by'
        )
        
        # If user is HR/Admin/Manager, show leaves they need to approve + their own
        if user.role and user.role.role_name.lower() in ['admin', 'hr', 'manager']:
            queryset = queryset.filter(
                Q(user=user) | Q(approver=user)
            )
        else:
            # Regular employees only see their own leaves
            queryset = queryset.filter(user=user)
        
        return queryset.order_by('-created_at')
    
    def list(self, request, *args, **kwargs):
        """
        List all leave requests
        GET /api/leave-requests/
        GET /api/leave-requests/?user_id=5
        """
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'count': queryset.count(),
            'results': serializer.data
        }, status=status.HTTP_200_OK)
    
    def retrieve(self, request, *args, **kwargs):
        """
        Get single leave request details
        GET /api/leave-requests/{id}/
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        """
        Apply for leave
        POST /api/leave-requests/
        Body: {
            "user": 5,
            "leave_type": "casual",
            "from_date": "2026-02-20",
            "to_date": "2026-02-22",
            "reason": "Family function",
            "approver": 1
        }
        """
        serializer = LeaveRequestCreateSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                with transaction.atomic():
                    leave_request = serializer.save()
                    
                return Response({
                    'success': True,
                    'message': 'Leave request submitted successfully',
                    'data': LeaveRequestSerializer(leave_request).data
                }, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({
                    'success': False,
                    'error': f'Failed to create leave request: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], url_path='approve_reject')
    def approve_reject(self, request, pk=None):
        """
        Approve or reject a leave request (No authentication required)
        POST /api/leave-requests/{id}/approve_reject/
        Body: {
            "action": "approve" or "reject",
            "comments": "optional comments",
            "rejection_reason": "required if rejecting"
        }
        """
        print("\n" + "="*60)
        print("🔔 APPROVE_REJECT ENDPOINT CALLED")
        print("="*60)
        print(f"PK: {pk}")
        print(f"Request Data: {request.data}")
        print("="*60 + "\n")
        
        try:
            leave_request = self.get_object()
            print(f"✓ Leave request found: ID={leave_request.id}, Status={leave_request.status}")
        except LeaveRequest.DoesNotExist:
            print(f"✗ Leave request with ID={pk} not found")
            return Response({
                'success': False,
                'error': 'Leave request not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Validate action
        action_type = request.data.get('action')
        if action_type not in ['approve', 'reject']:
            return Response({
                'success': False,
                'error': 'Invalid action. Must be "approve" or "reject"'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if already processed
        if leave_request.status != 'pending':
            return Response({
                'success': False,
                'error': f'Leave request is already {leave_request.status}',
                'current_status': leave_request.status
            }, status=status.HTTP_400_BAD_REQUEST)
        
        comments = request.data.get('comments', '').strip()
        
        try:
            with transaction.atomic():
                if action_type == 'approve':
                    # Simple approval without user tracking
                    leave_request.status = 'approved'
                    leave_request.approved_date = timezone.now()
                    leave_request.comments = comments
                    leave_request.save()
                    
                    print(f"✅ Leave request {leave_request.id} APPROVED")
                    
                    # Try to create notification (non-critical)
                    try:
                        if leave_request.user:
                            Notification.objects.create(
                                user=leave_request.user,
                                title='Leave Request Approved ✓',
                                body=f'Your {leave_request.get_leave_type_display()} leave from {leave_request.from_date} to {leave_request.to_date} has been approved',
                                page='/my-leaves'
                            )
                    except Exception as notif_error:
                        print(f"⚠️ Failed to create notification: {notif_error}")
                    
                    return Response({
                        'success': True,
                        'message': 'Leave request approved successfully',
                        'data': LeaveRequestSerializer(leave_request).data
                    }, status=status.HTTP_200_OK)
                
                else:  # reject
                    rejection_reason = request.data.get('rejection_reason', '').strip()
                    
                    if not rejection_reason:
                        return Response({
                            'success': False,
                            'error': 'Rejection reason is required when rejecting'
                        }, status=status.HTTP_400_BAD_REQUEST)
                    
                    # Simple rejection without user tracking
                    leave_request.status = 'rejected'
                    leave_request.approved_date = timezone.now()
                    leave_request.rejection_reason = rejection_reason
                    leave_request.comments = comments
                    leave_request.save()
                    
                    print(f"❌ Leave request {leave_request.id} REJECTED")
                    
                    # Try to create notification (non-critical)
                    try:
                        if leave_request.user:
                            Notification.objects.create(
                                user=leave_request.user,
                                title='Leave Request Rejected ✗',
                                body=f'Your {leave_request.get_leave_type_display()} leave has been rejected. Reason: {rejection_reason}',
                                page='/my-leaves'
                            )
                    except Exception as notif_error:
                        print(f"⚠️ Failed to create notification: {notif_error}")
                    
                    return Response({
                        'success': True,
                        'message': 'Leave request rejected',
                        'data': LeaveRequestSerializer(leave_request).data
                    }, status=status.HTTP_200_OK)
        
        except Exception as e:
            print(f"💥 Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({
                'success': False,
                'error': f'Failed to process leave request: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def my_leaves(self, request):
        """
        Get current user's leave requests
        GET /api/leave-requests/my_leaves/?user_id=5
        """
        user_id = request.query_params.get('user_id')
        
        if not user_id:
            return Response({
                'success': False,
                'error': 'user_id parameter is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(id=user_id, is_active=1, deleted_at__isnull=True)
        except User.DoesNotExist:
            return Response({
                'success': False,
                'error': 'User not found or inactive'
            }, status=status.HTTP_404_NOT_FOUND)
        
        leaves = LeaveRequest.objects.filter(
            user=user,
            deleted_at__isnull=True
        ).select_related('approver', 'approved_by', 'employee').order_by('-created_at')
        
        serializer = LeaveRequestSerializer(leaves, many=True)
        return Response({
            'success': True,
            'count': leaves.count(),
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def pending_approvals(self, request):
        """
        Get leave requests pending approval by current user
        GET /api/leave-requests/pending_approvals/?user_id=1
        """
        user_id = request.query_params.get('user_id')
        
        if not user_id:
            return Response({
                'success': False,
                'error': 'user_id parameter is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(id=user_id, is_active=1, deleted_at__isnull=True)
        except User.DoesNotExist:
            return Response({
                'success': False,
                'error': 'User not found or inactive'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user has approver role
        if not user.role or user.role.role_name.lower() not in ['admin', 'hr', 'manager']:
            return Response({
                'success': False,
                'error': 'User does not have approval permissions',
                'user_role': user.role.role_name if user.role else None
            }, status=status.HTTP_403_FORBIDDEN)
        
        pending = LeaveRequest.objects.filter(
            approver=user,
            status='pending',
            deleted_at__isnull=True
        ).select_related('user', 'employee').order_by('-created_at')
        
        serializer = LeaveRequestSerializer(pending, many=True)
        return Response({
            'success': True,
            'count': pending.count(),
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get leave statistics for a user
        GET /api/leave-requests/stats/?user_id=5
        """
        user_id = request.query_params.get('user_id')
        
        if not user_id:
            return Response({
                'success': False,
                'error': 'user_id parameter is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(id=user_id, is_active=1, deleted_at__isnull=True)
        except User.DoesNotExist:
            return Response({
                'success': False,
                'error': 'User not found or inactive'
            }, status=status.HTTP_404_NOT_FOUND)
        
        leaves = LeaveRequest.objects.filter(user=user, deleted_at__isnull=True)
        
        stats = {
            'total_leaves': leaves.count(),
            'pending_leaves': leaves.filter(status='pending').count(),
            'approved_leaves': leaves.filter(status='approved').count(),
            'rejected_leaves': leaves.filter(status='rejected').count(),
            'cancelled_leaves': leaves.filter(status='cancelled').count(),
            'total_days_approved': leaves.filter(status='approved').aggregate(
                total=Sum('total_days')
            )['total'] or 0,
            'total_days_pending': leaves.filter(status='pending').aggregate(
                total=Sum('total_days')
            )['total'] or 0,
            'by_leave_type': list(
                leaves.values('leave_type')
                .annotate(
                    count=Count('id'), 
                    days=Sum('total_days'),
                    approved=Count('id', filter=Q(status='approved')),
                    pending=Count('id', filter=Q(status='pending')),
                    rejected=Count('id', filter=Q(status='rejected'))
                )
                .order_by('-count')
            )
        }
        
        return Response({
            'success': True,
            'user_id': user.id,
            'username': user.username,
            'data': stats
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['delete'])
    def cancel(self, request, pk=None):
        """
        Cancel a pending leave request
        DELETE /api/leave-requests/{id}/cancel/
        """
        leave_request = self.get_object()
        
        # Check if user is the owner (optional check)
        user_id = request.query_params.get('user_id') or request.data.get('user_id')
        if user_id:
            try:
                user = User.objects.get(id=user_id)
                if leave_request.user != user:
                    return Response({
                        'success': False,
                        'error': 'You can only cancel your own leave requests'
                    }, status=status.HTTP_403_FORBIDDEN)
            except User.DoesNotExist:
                pass
        
        if leave_request.status != 'pending':
            return Response({
                'success': False,
                'error': 'Only pending leave requests can be cancelled',
                'current_status': leave_request.status
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            with transaction.atomic():
                leave_request.status = 'cancelled'
                leave_request.save()
                
                # Notify approver (non-critical)
                try:
                    if leave_request.approver:
                        Notification.objects.create(
                            user=leave_request.approver,
                            title='Leave Request Cancelled',
                            body=f'{leave_request.user.username} has cancelled their {leave_request.get_leave_type_display()} leave request',
                            page='/leave-requests'
                        )
                except Exception as notif_error:
                    print(f"⚠️ Failed to create notification: {notif_error}")
                
                return Response({
                    'success': True,
                    'message': 'Leave request cancelled successfully',
                    'data': LeaveRequestSerializer(leave_request).data
                }, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Failed to cancel leave request: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def approvers_list(self, request):
        """
        Get list of users who can approve leaves (Admin, HR, Manager)
        GET /api/leave-requests/approvers_list/
        """
        try:
            # Get approvers with role_name in ['admin', 'hr', 'manager']
            approvers = User.objects.filter(
                is_active=1,
                deleted_at__isnull=True
            ).filter(
                Q(role__role_name__iexact='admin') |
                Q(role__role_name__iexact='hr') |
                Q(role__role_name__iexact='manager')
            ).select_related('role').distinct().order_by('username')
            
            if not approvers.exists():
                return Response({
                    'success': False,
                    'message': 'No approvers found in the system',
                    'count': 0,
                    'data': []
                }, status=status.HTTP_404_NOT_FOUND)
            
            serializer = ApproverSerializer(approvers, many=True)
            
            return Response({
                'success': True,
                'message': f'{approvers.count()} approvers found',
                'count': approvers.count(),
                'data': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({
                'success': False,
                'error': f'An error occurred: {str(e)}',
                'count': 0,
                'data': []
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
