from django.db import models
from django.utils import timezone


class Device(models.Model):
    """Device model for attendance capture devices"""
    device_name = models.CharField(max_length=100)
    device_type = models.CharField(max_length=50, null=True, blank=True)
    ip_address = models.CharField(max_length=45, null=True, blank=True)
    mac_address = models.CharField(max_length=20, null=True, blank=True)
    location = models.CharField(max_length=100, null=True, blank=True)
    status = models.CharField(max_length=20, null=True, blank=True)
    last_heartbeat = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "devices"

    def __str__(self):
        return self.device_name


class AttendanceLog(models.Model):
    """Raw attendance logs from devices"""
    employee = models.ForeignKey(
        'user.Employee',  # reference to user app
        on_delete=models.CASCADE,
        db_column="employeeId"
    )
    timestamp = models.DateTimeField()
    status = models.CharField(max_length=10)  # In/Out
    auth_mode = models.SmallIntegerField(null=True, blank=True)
    device = models.ForeignKey(
        Device,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="deviceId"
    )
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    photo_path = models.CharField(max_length=255, null=True, blank=True)
    is_posted = models.SmallIntegerField(default=0)

    class Meta:
        db_table = "attendance_logs"


class Attendance(models.Model):
    """Processed daily attendance records"""
    employee = models.ForeignKey(
        'user.Employee',
        on_delete=models.CASCADE,
        db_column="employeeId"
    )
    date = models.DateField()
    shift = models.ForeignKey(
        'Shift',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="shiftId"
    )
    sign_in_time = models.TimeField(null=True, blank=True)
    sign_out_time = models.TimeField(null=True, blank=True)
    total_hours = models.FloatField(null=True, blank=True)
    overtime = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=20, null=True, blank=True)
    remarks = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "attendance"


class Shift(models.Model):
    """Shift timings"""
    shift_name = models.CharField(max_length=50, unique=True)
    start_time = models.TimeField()
    end_time = models.TimeField()
    grace_time = models.IntegerField(null=True, blank=True)  # in minutes
    working_hours = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "shifts"

    def __str__(self):
        return self.shift_name


class Holiday(models.Model):
    """Holiday calendar"""
    holiday_name = models.CharField(max_length=100)
    holiday_date = models.DateField(unique=True)
    description = models.TextField(null=True, blank=True)
    is_optional = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "holidays"

    def __str__(self):
        return f"{self.holiday_name} ({self.holiday_date})"


class Setting(models.Model):
    """System settings"""
    config_key = models.CharField(max_length=100, unique=True)
    config_value = models.TextField(null=True, blank=True)
    description = models.CharField(max_length=255, null=True, blank=True)
    category = models.CharField(max_length=50, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "settings"

    def __str__(self):
        return self.config_key
