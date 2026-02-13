from django.contrib import admin
from .models import LeaveRequest, Role, User, Department, Employee, Notification


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
    search_fields = ('username', 'email')
    list_filter = ('is_active', 'role', 'created_at')
    readonly_fields = ('created_at', 'updated_at', 'last_login_date')
    fieldsets = (
        ('Basic Information', {
            'fields': ('username', 'email', 'password_hash', 'role', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('last_login_date', 'created_at', 'updated_at', 'deleted_at')
        }),
    )
    ordering = ('-created_at',)


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
            'fields': ('photo_path',),
            'classes': ('collapse',)
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
    exclude = ('face_encoding', 'biometric_encoding')
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"
    get_full_name.short_description = 'Full Name'


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'user', 'page', 'is_read', 'created_at')
    search_fields = ('title', 'body', 'user__username')
    list_filter = ('is_read', 'created_at', 'page')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Notification Content', {
            'fields': ('user', 'title', 'body', 'page')
        }),
        ('Status', {
            'fields': ('is_read',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    # Actions for bulk operations
    actions = ['mark_as_read', 'mark_as_unread']
    
    def mark_as_read(self, request, queryset):
        updated = queryset.update(is_read=True)
        self.message_user(request, f'{updated} notification(s) marked as read.')
    mark_as_read.short_description = 'Mark selected as read'
    
    def mark_as_unread(self, request, queryset):
        updated = queryset.update(is_read=False)
        self.message_user(request, f'{updated} notification(s) marked as unread.')
    mark_as_unread.short_description = 'Mark selected as unread'


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    """Admin interface for Leave Requests"""
    
    # List display columns
    list_display = [
        'id',
        'user_display',
        'employee_display',
        'leave_type_badge',
        'from_date',
        'to_date',
        'total_days',
        'status_badge',
        'approver_display',
        'created_at',
    ]
    
    # Filters in sidebar
    list_filter = [
        'status',
        'leave_type',
        'from_date',
        'to_date',
        'created_at',
    ]
    
    # Search fields
    search_fields = [
        'user__username',
        'user__email',
        'employee__first_name',
        'employee__last_name',
        'employee__employee_code',
        'reason',
    ]
    
    # Read-only fields
    readonly_fields = [
        'id',
        'total_days',
        'created_at',
        'updated_at',
        'deleted_at',
    ]
    
    # Fieldsets for detail view
    fieldsets = (
        ('Employee Information', {
            'fields': ('user', 'employee')
        }),
        ('Leave Details', {
            'fields': ('leave_type', 'from_date', 'to_date', 'total_days', 'reason', 'attachment')
        }),
        ('Approval Information', {
            'fields': ('status', 'approver', 'approved_by', 'approved_date', 'rejection_reason', 'comments')
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at', 'deleted_at'),
            'classes': ('collapse',)
        }),
    )
    
    # Ordering
    ordering = ['-created_at']
    
    # Items per page
    list_per_page = 25
    
    # Date hierarchy
    date_hierarchy = 'created_at'
    
    # Custom display methods
    def user_display(self, obj):
        """Display user with link"""
        if obj.user:
            return f"{obj.user.username} ({obj.user.email})"
        return "-"
    user_display.short_description = "User"
    
    def employee_display(self, obj):
        """Display employee name and code"""
        if obj.employee:
            return f"{obj.employee.first_name} {obj.employee.last_name} ({obj.employee.employee_code})"
        return "-"
    employee_display.short_description = "Employee"
    
    def leave_type_badge(self, obj):
        """Display leave type with color badge"""
        colors = {
            'sick': '🤒',
            'casual': '😊',
            'annual': '🌴',
            'maternity': '👶',
            'paternity': '👨‍👦',
            'unpaid': '💰',
            'compensatory': '⏰',
            'emergency': '🚨',
        }
        icon = colors.get(obj.leave_type, '📄')
        return f"{icon} {obj.get_leave_type_display()}"
    leave_type_badge.short_description = "Leave Type"
    
    def status_badge(self, obj):
        """Display status with color badge"""
        badges = {
            'pending': '🟡 Pending',
            'approved': '✅ Approved',
            'rejected': '❌ Rejected',
            'cancelled': '⚫ Cancelled',
        }
        return badges.get(obj.status, obj.status)
    status_badge.short_description = "Status"
    
    def approver_display(self, obj):
        """Display approver name"""
        if obj.approver:
            return obj.approver.username
        return "-"
    approver_display.short_description = "Approver"
    
    # Custom actions
    actions = ['approve_selected', 'reject_selected', 'cancel_selected']
    
    def approve_selected(self, request, queryset):
        """Bulk approve leave requests"""
        pending = queryset.filter(status='pending')
        count = pending.update(
            status='approved',
            approved_by=request.user if hasattr(request, 'user') else None,
            approved_date=timezone.now()
        )
        self.message_user(request, f'{count} leave request(s) approved successfully.')
    approve_selected.short_description = "✅ Approve selected leave requests"
    
    def reject_selected(self, request, queryset):
        """Bulk reject leave requests"""
        pending = queryset.filter(status='pending')
        count = pending.update(
            status='rejected',
            approved_by=request.user if hasattr(request, 'user') else None,
            approved_date=timezone.now(),
            rejection_reason='Bulk rejected by admin'
        )
        self.message_user(request, f'{count} leave request(s) rejected.')
    reject_selected.short_description = "❌ Reject selected leave requests"
    
    def cancel_selected(self, request, queryset):
        """Bulk cancel leave requests"""
        pending = queryset.filter(status='pending')
        count = pending.update(status='cancelled')
        self.message_user(request, f'{count} leave request(s) cancelled.')
    cancel_selected.short_description = "⚫ Cancel selected leave requests"
