import json
import pickle
import secrets
from datetime import date

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Q, Count, F
from django.utils import timezone

from .models import Employee, Department, User
from .serializers import (
    EmployeeSerializer,
    EmployeeListSerializer,
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserSerializer,
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
    
    def destroy(self, request, *args, **kwargs):
        """Soft delete instead of hard delete"""
        instance = self.get_object()
        instance.deleted_at = timezone.now()
        instance.is_active = 0
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    # ==================== EMPLOYEE STATUS ENDPOINTS ====================
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """
        Get only active employees
        GET /api/employees/active/
        """
        active_employees = self.get_queryset().filter(is_active=1)
        serializer = EmployeeListSerializer(active_employees, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_department(self, request):
        """
        Get employees grouped by department
        GET /api/employees/by_department/?dept_id=1
        """
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
        """
        Get employee statistics
        GET /api/employees/stats/
        """
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
        """
        Activate employee
        PATCH /api/employees/{id}/activate/
        """
        employee = self.get_object()
        employee.is_active = 1
        employee.deleted_at = None
        employee.save()
        serializer = self.get_serializer(employee)
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'])
    def deactivate(self, request, pk=None):
        """
        Deactivate employee
        PATCH /api/employees/{id}/deactivate/
        """
        employee = self.get_object()
        employee.is_active = 0
        employee.save()
        serializer = self.get_serializer(employee)
        return Response(serializer.data)
    
    # ==================== DEPARTMENT ENDPOINTS ====================
    
    @action(detail=False, methods=['get'])
    def with_dept_raw(self, request):
        """
        Get employees with raw department data
        GET /api/employees/with_dept_raw/
        """
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
        """
        Get employees with annotated department name
        GET /api/employees/with_dept_annotated/
        """
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
        """
        Get employees grouped by department with full details
        GET /api/employees/grouped_by_dept/
        """
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
        """
        Search employees by department name
        GET /api/employees/search_by_dept/?dept_name=IT
        """
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
        """
        Get summary of employees with department names
        GET /api/employees/dept_summary/
        """
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
        """
        Get single employee with full department details
        GET /api/employees/{id}/with_dept_details/
        """
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
        """
        Update face encoding - stores as BLOB using pickle
        POST /api/employees/update_face_encoding/
        Body: {
            "employee_code": "004",
            "face_encoding": [0.123, -0.456, ...]
        }
        """
        employee_code = request.data.get('employee_code')
        face_encoding = request.data.get('face_encoding')
        
        # Validation
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
        
        # Find employee
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
        
        # Convert to binary using pickle
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
        """
        Update face encoding by employee ID
        PATCH /api/employees/{id}/upload_face_encoding/
        Body: {
            "face_encoding": [0.123, -0.456, ...]
        }
        """
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
        """
        Get face encoding for employee
        GET /api/employees/{id}/get_face_encoding/
        """
        employee = self.get_object()
        
        if not employee.face_encoding:
            return Response({
                'success': False,
                'error': 'No face encoding found for this employee'
            }, status=status.HTTP_404_NOT_FOUND)
        
        try:
            # Unpickle from binary
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
        """
        Get all employees who have face encodings
        GET /api/employees/with_face_encodings/
        """
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
        """
        Get employees without face encodings
        GET /api/employees/without_face_encodings/
        """
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
        """
        Delete face encoding for employee
        DELETE /api/employees/{id}/delete_face_encoding/
        """
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
