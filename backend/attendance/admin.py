from django.contrib import admin
from .models import Device, AttendanceLog, Attendance, Shift, Holiday, Setting


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ('id', 'device_name', 'device_type', 'ip_address', 'location', 'status', 'last_heartbeat')
    search_fields = ('device_name', 'device_type', 'ip_address', 'mac_address', 'location')
    list_filter = ('device_type', 'status', 'created_at')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Device Information', {
            'fields': ('device_name', 'device_type', 'location', 'status')
        }),
        ('Network Details', {
            'fields': ('ip_address', 'mac_address')
        }),
        ('Status', {
            'fields': ('last_heartbeat', 'created_at', 'updated_at')
        }),
    )
    ordering = ('device_name',)


@admin.register(AttendanceLog)
class AttendanceLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'employee', 'get_employee_name', 'timestamp', 'status', 'device', 'is_posted')
    search_fields = ('employee__first_name', 'employee__last_name', 'employee__employee_code')
    list_filter = ('status', 'is_posted', 'auth_mode', 'device', 'timestamp')
    readonly_fields = ('timestamp',)
    date_hierarchy = 'timestamp'
    ordering = ('-timestamp',)
    
    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"
    get_employee_name.short_description = 'Employee Name'


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('id', 'employee', 'get_employee_name', 'date', 'shift', 'sign_in_time', 'sign_out_time', 'total_hours', 'status')
    search_fields = ('employee__first_name', 'employee__last_name', 'employee__employee_code')
    list_filter = ('status', 'shift', 'date', 'created_at')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Employee & Date', {
            'fields': ('employee', 'date', 'shift')
        }),
        ('Timing', {
            'fields': ('sign_in_time', 'sign_out_time', 'total_hours', 'overtime')
        }),
        ('Status & Remarks', {
            'fields': ('status', 'remarks')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    date_hierarchy = 'date'
    ordering = ('-date', 'employee')
    
    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"
    get_employee_name.short_description = 'Employee Name'


@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ('id', 'shift_name', 'start_time', 'end_time', 'grace_time', 'working_hours', 'created_at')
    search_fields = ('shift_name',)
    list_filter = ('created_at',)
    readonly_fields = ('created_at',)
    ordering = ('shift_name',)


@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display = ('id', 'holiday_name', 'holiday_date', 'is_optional', 'created_at')
    search_fields = ('holiday_name', 'description')
    list_filter = ('is_optional', 'holiday_date', 'created_at')
    readonly_fields = ('created_at',)
    date_hierarchy = 'holiday_date'
    ordering = ('-holiday_date',)


@admin.register(Setting)
class SettingAdmin(admin.ModelAdmin):
    list_display = ('id', 'config_key', 'config_value', 'category', 'updated_at')
    search_fields = ('config_key', 'config_value', 'description')
    list_filter = ('category', 'updated_at')
    readonly_fields = ('updated_at',)
    fieldsets = (
        ('Configuration', {
            'fields': ('config_key', 'config_value', 'category')
        }),
        ('Description', {
            'fields': ('description',)
        }),
        ('Timestamp', {
            'fields': ('updated_at',)
        }),
    )
    ordering = ('category', 'config_key')
