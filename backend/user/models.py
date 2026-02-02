from django.db import models
from django.utils import timezone


class Role(models.Model):
    """Role model for user permissions"""
    role_name = models.CharField(max_length=50, unique=True)
    permissions = models.TextField(null=True, blank=True)
    description = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "roles"

    def __str__(self):
        return self.role_name


class User(models.Model):
    """User model for authentication"""
    username = models.CharField(max_length=50, unique=True)
    email = models.EmailField(max_length=100, unique=True, null=True, blank=True)
    password_hash = models.CharField(max_length=255, null=True, blank=True)
    pin_code = models.CharField(max_length=10, null=True, blank=True)
    card_no = models.CharField(max_length=50, null=True, blank=True)
    fp_template = models.BinaryField(null=True, blank=True)
    role = models.ForeignKey(
        Role,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="roleId"
    )
    is_active = models.SmallIntegerField(default=1)
    last_login_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "users"

    def __str__(self):
        return self.username


class Department(models.Model):
    """Department model"""
    dept_name = models.CharField(max_length=100, unique=True)
    location = models.CharField(max_length=100, null=True, blank=True)
    manager_name = models.CharField(max_length=100, null=True, blank=True)
    contact_number = models.CharField(max_length=20, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "departments"

    def __str__(self):
        return self.dept_name


class Employee(models.Model):
    """Employee model with face recognition data"""
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    email = models.EmailField(max_length=100, unique=True, null=True, blank=True)
    mobile_number = models.CharField(max_length=20, null=True, blank=True)
    employee_code = models.CharField(max_length=50, unique=True, null=True, blank=True)
    dept = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="deptId"
    )
    photo_path = models.CharField(max_length=255, null=True, blank=True)
    face_encoding = models.BinaryField(null=True, blank=True)
    user = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="userId"
    )
    is_active = models.SmallIntegerField(default=1)
    validity_from = models.DateTimeField(null=True, blank=True)
    validity_to = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "employees"

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class DepartmentEmployee(models.Model):
    """Many-to-many relationship between departments and employees"""
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        db_column="department_id"
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        db_column="employee_id"
    )

    class Meta:
        db_table = "department_employees"


class AuditTrail(models.Model):
    """Audit trail for tracking user actions"""
    timestamp = models.DateTimeField()
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="userId"
    )
    action_type = models.CharField(max_length=50)
    table_name = models.CharField(max_length=50, null=True, blank=True)
    record_id = models.IntegerField(null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    ip_address = models.CharField(max_length=45, null=True, blank=True)

    class Meta:
        db_table = "audit_trail"
