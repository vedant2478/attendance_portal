from rest_framework import serializers
from .models import Attendance

class AttendanceSerializer(serializers.ModelSerializer):
    """Serializer for Attendance model"""
    employee_name = serializers.CharField(source='employee.user.username', read_only=True)
    shift_name = serializers.CharField(source='shift.name', read_only=True)
    
    class Meta:
        model = Attendance
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
    
    def validate(self, data):
        """Custom validation"""
        if data.get('sign_out_time') and data.get('sign_in_time'):
            if data['sign_out_time'] <= data['sign_in_time']:
                raise serializers.ValidationError(
                    "Sign out time must be after sign in time"
                )
        return data
