from rest_framework import serializers
from django.contrib.auth.hashers import make_password, check_password
from .models import Employee, Department, User, Role
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
        except User.objects.DoesNotExist:
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
            'is_active',
            'created_at',
        ]
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()
