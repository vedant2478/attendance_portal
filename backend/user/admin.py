from django.contrib import admin
from .models import Role, User, Department, Employee, Notification


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
