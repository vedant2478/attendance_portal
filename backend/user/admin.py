from django.contrib import admin
from .models import Role, User, Department, Employee, DepartmentEmployee, AuditTrail


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('id', 'role_name', 'description', 'created_at', 'updated_at')
    search_fields = ('role_name', 'description')
    list_filter = ('created_at',)
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('role_name',)


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('id', 'username', 'email', 'role', 'is_active', 'last_login_date', 'created_at')
    search_fields = ('username', 'email', 'card_no')
    list_filter = ('is_active', 'role', 'created_at')
    readonly_fields = ('created_at', 'updated_at', 'last_login_date')
    fieldsets = (
        ('Basic Information', {
            'fields': ('username', 'email', 'password_hash', 'role', 'is_active')
        }),
        ('Authentication Methods', {
            'fields': ('pin_code', 'card_no')
            # Removed 'fp_template' - BinaryField is not editable in forms
        }),
        ('Timestamps', {
            'fields': ('last_login_date', 'created_at', 'updated_at', 'deleted_at')
        }),
    )
    ordering = ('-created_at',)
    
    # Exclude binary fields from the form
    exclude = ('fp_template',)


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'dept_name', 'location', 'manager_name', 'contact_number', 'created_at')
    search_fields = ('dept_name', 'manager_name', 'location')
    list_filter = ('created_at',)
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('dept_name',)


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_full_name', 'employee_code', 'email', 'dept', 'is_active', 'created_at')
    search_fields = ('first_name', 'last_name', 'email', 'employee_code', 'mobile_number')
    list_filter = ('is_active', 'dept', 'created_at')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Personal Information', {
            'fields': ('first_name', 'last_name', 'email', 'mobile_number')
        }),
        ('Employment Details', {
            'fields': ('employee_code', 'dept', 'user', 'is_active')
        }),
        ('Biometric Data', {
            'fields': ('photo_path',)
            # Removed 'face_encoding' - BinaryField is not editable in forms
        }),
        ('Validity Period', {
            'fields': ('validity_from', 'validity_to')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'deleted_at')
        }),
    )
    ordering = ('-created_at',)
    
    # Exclude binary fields from the form
    exclude = ('face_encoding',)
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"
    get_full_name.short_description = 'Full Name'


@admin.register(DepartmentEmployee)
class DepartmentEmployeeAdmin(admin.ModelAdmin):
    list_display = ('id', 'department', 'employee', 'get_employee_name')
    search_fields = ('department__dept_name', 'employee__first_name', 'employee__last_name')
    list_filter = ('department',)
    
    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"
    get_employee_name.short_description = 'Employee Name'


@admin.register(AuditTrail)
class AuditTrailAdmin(admin.ModelAdmin):
    list_display = ('id', 'timestamp', 'user', 'action_type', 'table_name', 'record_id', 'ip_address')
    search_fields = ('action_type', 'table_name', 'description', 'ip_address')
    list_filter = ('action_type', 'table_name', 'timestamp')
    readonly_fields = ('timestamp',)
    ordering = ('-timestamp',)
    date_hierarchy = 'timestamp'
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
