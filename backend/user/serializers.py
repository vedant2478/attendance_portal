from rest_framework import serializers
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Employee, Department, User, Role, LeaveRequest, Notification
import base64



# ==================== AUTHENTICATION SERIALIZERS ====================


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'confirm_password']
    
    def validate_username(self, value):
        """Validate username"""
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists")
        if len(value) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters")
        if not value.replace('_', '').isalnum():
            raise serializers.ValidationError("Username can only contain letters, numbers, and underscores")
        return value
    
    def validate_email(self, value):
        """Validate email"""
        if not value:
            raise serializers.ValidationError("Email is required")
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists")
        return value
    
    def validate_password(self, value):
        """Validate password strength"""
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters")
        
        has_upper = any(c.isupper() for c in value)
        has_lower = any(c.islower() for c in value)
        has_digit = any(c.isdigit() for c in value)
        
        if not (has_upper and has_lower and has_digit):
            raise serializers.ValidationError(
                "Password must contain uppercase, lowercase, and number"
            )
        return value
    
    def validate(self, data):
        """Validate password match"""
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match"})
        return data
    
    def create(self, validated_data):
        """Create user with hashed password"""
        validated_data.pop('confirm_password')
        
        # Hash the password
        validated_data['password_hash'] = make_password(validated_data.pop('password'))
        
        # Set default values
        validated_data['is_active'] = 1
        
        # Assign default role (create if doesn't exist)
        default_role, _ = Role.objects.get_or_create(
            role_name='User',
            defaults={'description': 'Default user role'}
        )
        validated_data['role'] = default_role
        
        user = User.objects.create(**validated_data)
        return user



class UserLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        """Validate credentials"""
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            raise serializers.ValidationError("Username and password are required")
        
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid username or password")
        
        # Check if user is active
        if user.is_active != 1:
            raise serializers.ValidationError("Account is inactive. Please contact administrator.")
        
        # Verify password
        if not user.password_hash or not check_password(password, user.password_hash):
            raise serializers.ValidationError("Invalid username or password")
        
        data['user'] = user
        return data



class UserSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source='role.role_name', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 
            'username', 
            'email', 
            'role', 
            'role_name', 
            'is_active', 
            'last_login_date', 
            'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'last_login_date']



# ==================== DEPARTMENT SERIALIZER ====================


class DepartmentSerializer(serializers.ModelSerializer):
    """Nested serializer for Department"""
    class Meta:
        model = Department
        fields = '__all__'



# ==================== EMPLOYEE SERIALIZERS ====================


class EmployeeSerializer(serializers.ModelSerializer):
    # Read-only fields for displaying related data
    department_name = serializers.CharField(source='dept.dept_name', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    full_name = serializers.SerializerMethodField()
    
    # Nested serializers (optional - for detailed view)
    dept_details = DepartmentSerializer(source='dept', read_only=True)
    
    # Handle binary fields
    face_encoding_base64 = serializers.SerializerMethodField()
    biometric_encoding_base64 = serializers.SerializerMethodField()
    
    class Meta:
        model = Employee
        fields = [
            'id',
            'first_name',
            'last_name',
            'full_name',
            'email',
            'mobile_number',
            'employee_code',
            'dept',
            'department_name',
            'dept_details',
            'photo_path',
            'face_encoding_base64',
            'biometric_encoding_base64',
            'user',
            'username',
            'is_active',
            'validity_from',
            'validity_to',
            'created_at',
            'updated_at',
            'deleted_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'full_name']
    
    def get_full_name(self, obj):
        """Get employee full name"""
        return f"{obj.first_name} {obj.last_name}".strip()
    
    def get_face_encoding_base64(self, obj):
        """Convert binary face encoding to base64 for JSON response"""
        if obj.face_encoding:
            try:
                return base64.b64encode(obj.face_encoding).decode('utf-8')
            except Exception:
                return None
        return None
    
    def get_biometric_encoding_base64(self, obj):
        """Convert binary biometric encoding to base64 for JSON response"""
        if obj.biometric_encoding:
            try:
                return base64.b64encode(obj.biometric_encoding).decode('utf-8')
            except Exception:
                return None
        return None
    
    def validate_email(self, value):
        """Validate email uniqueness"""
        if value:
            employee_id = self.instance.id if self.instance else None
            if Employee.objects.filter(email=value).exclude(id=employee_id).exists():
                raise serializers.ValidationError("Employee with this email already exists.")
        return value
    
    def validate_employee_code(self, value):
        """Validate employee code uniqueness"""
        if value:
            employee_id = self.instance.id if self.instance else None
            if Employee.objects.filter(employee_code=value).exclude(id=employee_id).exists():
                raise serializers.ValidationError("Employee with this code already exists.")
        return value
    
    def validate(self, data):
        """Cross-field validation"""
        validity_from = data.get('validity_from')
        validity_to = data.get('validity_to')
        
        if validity_from and validity_to:
            if validity_to <= validity_from:
                raise serializers.ValidationError({
                    'validity_to': 'Validity end date must be after start date.'
                })
        
        return data



class EmployeeListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views"""
    department_name = serializers.CharField(source='dept.dept_name', read_only=True)
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Employee
        fields = [
            'id',
            'first_name',
            'last_name',
            'full_name',
            'email',
            'mobile_number',
            'employee_code',
            'dept',
            'department_name',
            'user',
            'is_active',
            'created_at',
        ]
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()


class EmployeeCreateSerializer(serializers.ModelSerializer):
    """Serializer specifically for creating new employees"""
    
    class Meta:
        model = Employee
        fields = [
            'first_name',
            'last_name',
            'email',
            'mobile_number',
            'employee_code',
            'dept',
            'user',
            'photo_path',
            'is_active',
            'validity_from',
            'validity_to',
        ]
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'email': {'required': True},
            'mobile_number': {'required': True},
            'employee_code': {'required': True},
            'dept': {'required': True},
        }
    
    def validate_email(self, value):
        """Validate email uniqueness"""
        if Employee.objects.filter(email=value, deleted_at__isnull=True).exists():
            raise serializers.ValidationError("Employee with this email already exists.")
        return value
    
    def validate_employee_code(self, value):
        """Validate employee code uniqueness"""
        if Employee.objects.filter(employee_code=value, deleted_at__isnull=True).exists():
            raise serializers.ValidationError("Employee with this code already exists.")
        return value
    
    def validate_dept(self, value):
        """Validate that department exists and is active"""
        if value and value.deleted_at is not None:
            raise serializers.ValidationError("Selected department is not active.")
        return value
    
    def validate_user(self, value):
        """Validate that user exists, is active, and not linked to another employee"""
        if value:
            if value.is_active != 1:
                raise serializers.ValidationError("Selected user is not active.")
            
            # Check if user is already linked to another employee
            existing = Employee.objects.filter(user=value, deleted_at__isnull=True)
            if self.instance:
                existing = existing.exclude(id=self.instance.id)
            
            if existing.exists():
                raise serializers.ValidationError("This user is already linked to another employee.")
        return value
    
    def validate(self, data):
        """Cross-field validation"""
        validity_from = data.get('validity_from')
        validity_to = data.get('validity_to')
        
        if validity_from and validity_to:
            if validity_to <= validity_from:
                raise serializers.ValidationError({
                    'validity_to': 'Validity end date must be after start date.'
                })
        
        return data
    
    def to_representation(self, instance):
        """Return detailed representation after creation"""
        return EmployeeSerializer(instance).data



# ==================== LEAVE REQUEST SERIALIZERS ====================

class LeaveRequestSerializer(serializers.ModelSerializer):
    """Serializer for viewing leave requests"""
    user_name = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    employee_name = serializers.SerializerMethodField(read_only=True)
    employee_code = serializers.CharField(source='employee.employee_code', read_only=True, allow_null=True)
    approver_name = serializers.CharField(source='approver.username', read_only=True, allow_null=True)
    approved_by_name = serializers.CharField(source='approved_by.username', read_only=True, allow_null=True)
    leave_type_display = serializers.CharField(source='get_leave_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = LeaveRequest
        fields = [
            'id',
            'user',
            'user_name',
            'user_email',
            'employee',
            'employee_name',
            'employee_code',
            'leave_type',
            'leave_type_display',
            'from_date',
            'to_date',
            'total_days',
            'reason',
            'status',
            'status_display',
            'approver',
            'approver_name',
            'approved_by',
            'approved_by_name',
            'approved_date',
            'rejection_reason',
            'attachment',
            'comments',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id', 
            'total_days', 
            'status', 
            'approved_by', 
            'approved_date', 
            'rejection_reason',
            'comments',
            'created_at', 
            'updated_at'
        ]
    
    def get_employee_name(self, obj):
        """Get full employee name"""
        if obj.employee:
            return f"{obj.employee.first_name} {obj.employee.last_name}"
        return None


class LeaveRequestCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/applying for leave"""
    
    class Meta:
        model = LeaveRequest
        fields = [
            'user',
            'leave_type',
            'from_date',
            'to_date',
            'reason',
            'approver',
            'attachment',
        ]
    
    def validate_from_date(self, value):
        """Validate that from_date is not in the past"""
        today = timezone.now().date()
        if value < today:
            raise serializers.ValidationError("Leave cannot be applied for past dates")
        return value
    
    def validate(self, data):
        """Cross-field validation"""
        from_date = data.get('from_date')
        to_date = data.get('to_date')
        user = data.get('user')
        approver = data.get('approver')
        
        # Validate date range
        if from_date and to_date:
            if to_date < from_date:
                raise serializers.ValidationError({
                    'to_date': 'End date must be after or equal to start date'
                })
            
            # Check if date range is too long (optional - max 30 days)
            delta = to_date - from_date
            if delta.days > 30:
                raise serializers.ValidationError({
                    'to_date': 'Leave period cannot exceed 30 days. Please split into multiple requests.'
                })
        
        # Validate user exists and is active
        if user:
            if user.is_active != 1:
                raise serializers.ValidationError({
                    'user': 'User account is inactive'
                })
        
        # Validate approver exists and is active
        if approver:
            if approver.is_active != 1:
                raise serializers.ValidationError({
                    'approver': 'Selected approver is inactive'
                })
            
            # Check if approver has appropriate role (HR, Admin, Manager)
            if approver.role:
                allowed_roles = ['admin', 'hr', 'manager']
                if approver.role.role_name.lower() not in allowed_roles:
                    raise serializers.ValidationError({
                        'approver': 'Selected user does not have approval permissions. Must be Admin, HR, or Manager.'
                    })
            else:
                raise serializers.ValidationError({
                    'approver': 'Selected approver has no role assigned'
                })
        
        # Check for overlapping leave requests
        if from_date and to_date and user:
            overlapping = LeaveRequest.objects.filter(
                user=user,
                status__in=['pending', 'approved'],
                deleted_at__isnull=True
            ).filter(
                from_date__lte=to_date,
                to_date__gte=from_date
            )
            
            if self.instance:
                overlapping = overlapping.exclude(id=self.instance.id)
            
            if overlapping.exists():
                raise serializers.ValidationError(
                    'You already have a leave request for overlapping dates'
                )
        
        return data
    
    def create(self, validated_data):
        """Create leave request with default status as pending"""
        # Auto-link employee if exists
        user = validated_data.get('user')
        try:
            employee = Employee.objects.get(user=user, deleted_at__isnull=True)
            validated_data['employee'] = employee
        except Employee.DoesNotExist:
            pass
        
        # Set default status
        validated_data['status'] = 'pending'
        
        leave_request = LeaveRequest.objects.create(**validated_data)
        
        # Create notification for approver
        if leave_request.approver:
            try:
                Notification.objects.create(
                    user=leave_request.approver,
                    title='New Leave Request',
                    body=f'{user.username} has requested {leave_request.get_leave_type_display()} from {leave_request.from_date} to {leave_request.to_date}',
                    page='/leave-requests'
                )
            except Exception as e:
                # Don't fail the request if notification creation fails
                print(f"Warning: Failed to create notification: {str(e)}")
        
        return leave_request
    
    def to_representation(self, instance):
        """Return detailed representation after creation"""
        return LeaveRequestSerializer(instance).data


class LeaveApprovalSerializer(serializers.Serializer):
    """Serializer for approving/rejecting leave requests"""
    action = serializers.ChoiceField(
        choices=['approve', 'reject'], 
        required=True,
        help_text="Action to perform: 'approve' or 'reject'"
    )
    comments = serializers.CharField(
        required=False, 
        allow_blank=True,
        max_length=500,
        help_text="Optional comments from approver"
    )
    rejection_reason = serializers.CharField(
        required=False, 
        allow_blank=True,
        max_length=500,
        help_text="Required if action is 'reject'"
    )
    
    def validate(self, data):
        """Validate that rejection_reason is provided when rejecting"""
        action = data.get('action')
        rejection_reason = data.get('rejection_reason', '').strip()
        
        # If rejecting, rejection_reason is required
        if action == 'reject' and not rejection_reason:
            raise serializers.ValidationError({
                'rejection_reason': 'Rejection reason is required when rejecting a leave request'
            })
        
        return data


class LeaveRequestListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing leave requests"""
    user_name = serializers.CharField(source='user.username', read_only=True)
    employee_name = serializers.SerializerMethodField(read_only=True)
    leave_type_display = serializers.CharField(source='get_leave_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    approver_name = serializers.CharField(source='approver.username', read_only=True, allow_null=True)
    
    class Meta:
        model = LeaveRequest
        fields = [
            'id',
            'user',
            'user_name',
            'employee_name',
            'leave_type',
            'leave_type_display',
            'from_date',
            'to_date',
            'total_days',
            'status',
            'status_display',
            'approver',
            'approver_name',
            'created_at',
        ]
    
    def get_employee_name(self, obj):
        """Get full employee name"""
        if obj.employee:
            return f"{obj.employee.first_name} {obj.employee.last_name}"
        return None


class LeaveStatsSerializer(serializers.Serializer):
    """Serializer for leave statistics"""
    total_leaves = serializers.IntegerField()
    pending_leaves = serializers.IntegerField()
    approved_leaves = serializers.IntegerField()
    rejected_leaves = serializers.IntegerField()
    cancelled_leaves = serializers.IntegerField()
    total_days_approved = serializers.IntegerField()
    total_days_pending = serializers.IntegerField()
    by_leave_type = serializers.ListField()


class ApproverSerializer(serializers.ModelSerializer):
    """Serializer for listing approvers (Admin, HR, Manager)"""
    role = serializers.SerializerMethodField()
    role_id = serializers.IntegerField(source='role.id', read_only=True)
    role_name = serializers.CharField(source='role.role_name', read_only=True)
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 
            'username', 
            'email',
            'full_name',
            'role', 
            'role_id', 
            'role_name',
            'is_active',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_role(self, obj):
        """Get role name as a simple string"""
        if hasattr(obj, 'role') and obj.role:
            return obj.role.role_name
        return None
    
    def get_full_name(self, obj):
        """Get full name from linked employee or return username"""
        try:
            # Check if user has linked employee
            if hasattr(obj, 'employee') and obj.employee:
                full_name = f"{obj.employee.first_name} {obj.employee.last_name}".strip()
                if full_name:
                    return full_name
        except Exception:
            pass
        return obj.username
