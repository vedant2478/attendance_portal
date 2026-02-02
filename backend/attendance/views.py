from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from datetime import date, timedelta
from .models import Attendance
from .serializers import AttendanceSerializer

class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.all().select_related('employee', 'shift')
    serializer_class = AttendanceSerializer
    permission_classes = [AllowAny]
    ordering = ['-date', '-created_at']
    
    @action(detail=False, methods=['get'])
    def today_stats(self, request):
        """Get today's attendance statistics"""
        today = date.today()
        today_attendance = self.queryset.filter(date=today)
        
        stats = {
            'present': today_attendance.filter(status='Present').count(),
            'absent': today_attendance.filter(status='Absent').count(),
            'late': today_attendance.filter(status='Late').count(),
            'on_leave': today_attendance.filter(status='On Leave').count(),
            'total_records': today_attendance.count(),
        }
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def trend(self, request):
        """Get attendance trend for last N days"""
        days = int(request.query_params.get('days', 7))
        
        trend_data = []
        for i in range(days - 1, -1, -1):
            target_date = date.today() - timedelta(days=i)
            day_records = self.queryset.filter(date=target_date)
            
            trend_data.append({
                'date': target_date.isoformat(),
                'present': day_records.filter(status='Present').count(),
                'absent': day_records.filter(status='Absent').count(),
                'late': day_records.filter(status='Late').count(),
                'on_leave': day_records.filter(status='On Leave').count(),
            })
        
        return Response(trend_data)
