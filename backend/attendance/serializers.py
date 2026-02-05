from rest_framework import serializers
from .models import Attendance, AttendanceLog, Shift, Device
from user.models import Employee
from django.utils import timezone
from datetime import datetime, time


class AttendanceLogSerializer(serializers.ModelSerializer):
    """Serializer for AttendanceLog model"""
    employee_name = serializers.SerializerMethodField()
    employee_code = serializers.CharField(source='employee.employee_code', read_only=True)
    device_name = serializers.CharField(source='device.device_name', read_only=True)
    
    class Meta:
        model = AttendanceLog
        fields = '__all__'
        read_only_fields = ['timestamp', 'is_posted']
    
    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"


class AttendanceSerializer(serializers.ModelSerializer):
    """Serializer for Attendance model"""
    employee_name = serializers.SerializerMethodField()
    employee_code = serializers.CharField(source='employee.employee_code', read_only=True)
    shift_name = serializers.CharField(source='shift.shift_name', read_only=True)
    
    class Meta:
        model = Attendance
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'total_hours', 'overtime']
    
    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"
    
    def validate(self, data):
        """Custom validation"""
        if data.get('sign_out_time') and data.get('sign_in_time'):
            if data['sign_out_time'] <= data['sign_in_time']:
                raise serializers.ValidationError(
                    "Sign out time must be after sign in time"
                )
        return data


class SignInSerializer(serializers.Serializer):
    """Serializer for sign-in request"""
    employee_id = serializers.IntegerField()
    device_id = serializers.IntegerField(required=False, allow_null=True)
    latitude = serializers.FloatField(required=False, allow_null=True)
    longitude = serializers.FloatField(required=False, allow_null=True)
    photo_path = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=255)
    auth_mode = serializers.IntegerField(required=False, allow_null=True)
    
    def validate_employee_id(self, value):
        """Validate employee exists and is active"""
        try:
            employee = Employee.objects.get(id=value, is_active=1)
        except Employee.DoesNotExist:
            raise serializers.ValidationError("Employee not found or inactive")
        return value
    
    def validate_device_id(self, value):
        """Validate device exists if provided"""
        if value is not None:
            if not Device.objects.filter(id=value).exists():
                raise serializers.ValidationError("Device not found")
        return value


class SignOutSerializer(serializers.Serializer):
    """Serializer for sign-out request"""
    employee_id = serializers.IntegerField()
    device_id = serializers.IntegerField(required=False, allow_null=True)
    latitude = serializers.FloatField(required=False, allow_null=True)
    longitude = serializers.FloatField(required=False, allow_null=True)
    photo_path = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=255)
    auth_mode = serializers.IntegerField(required=False, allow_null=True)
    
    def validate_employee_id(self, value):
        """Validate employee exists and is active"""
        try:
            employee = Employee.objects.get(id=value, is_active=1)
        except Employee.DoesNotExist:
            raise serializers.ValidationError("Employee not found or inactive")
        return value
    
    def validate_device_id(self, value):
        """Validate device exists if provided"""
        if value is not None:
            if not Device.objects.filter(id=value).exists():
                raise serializers.ValidationError("Device not found")
        return value


class ShiftSerializer(serializers.ModelSerializer):
    """Serializer for Shift model"""
    class Meta:
        model = Shift
        fields = '__all__'
        read_only_fields = ['created_at']


class DeviceSerializer(serializers.ModelSerializer):
    """Serializer for Device model"""
    class Meta:
        model = Device
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
