"""
Django Management Command to Generate Attendance Data for January 2026
Fixed version - without is_active field for Shift model
"""

import random
from datetime import datetime, date, time, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import models
from attendance.models import Attendance, AttendanceLog, Shift, Device
from user.models import Employee


class Command(BaseCommand):
    help = 'Generate dummy attendance data for January 2026 (1-31)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('='*70))
        self.stdout.write(self.style.SUCCESS('🚀 GENERATING JANUARY 2026 ATTENDANCE DATA'))
        self.stdout.write(self.style.SUCCESS('='*70))
        
        # Get employees (IDs 1-10)
        employees = Employee.objects.filter(id__in=range(1, 11))
        if not employees.exists():
            self.stdout.write(self.style.ERROR('❌ No employees found with IDs 1-10'))
            return
        
        self.stdout.write(f'✅ Found {employees.count()} employees')
        
        # Get or create shift (removed is_active field)
        shift, created = Shift.objects.get_or_create(
            shift_name='Day Shift',
            defaults={
                'start_time': time(9, 0),
                'end_time': time(18, 0),
                'working_hours': 8.0,
                'grace_time': 15
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS('✅ Created shift: Day Shift'))
        else:
            self.stdout.write('✅ Using existing shift: Day Shift')
        
        # Get or create device (check if device_name exists, otherwise skip it)
        try:
            device, created = Device.objects.get_or_create(
                device_id='DEVICE001',
                defaults={
                    'device_name': 'Main Entrance Device',
                    'location': 'Mumbai Office - Main Gate'
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS('✅ Created device: DEVICE001'))
            else:
                self.stdout.write('✅ Using existing device: DEVICE001')
        except Exception as e:
            # If device creation fails, try without device_name
            try:
                device, created = Device.objects.get_or_create(
                    device_id='DEVICE001',
                    defaults={
                        'location': 'Mumbai Office - Main Gate'
                    }
                )
                if created:
                    self.stdout.write(self.style.SUCCESS('✅ Created device: DEVICE001'))
                else:
                    self.stdout.write('✅ Using existing device: DEVICE001')
            except:
                device = None
                self.stdout.write(self.style.WARNING('⚠️  Could not create device, proceeding without it'))
        
        # January 2026: 1st to 31st
        start_date = date(2026, 2, 7)
        end_date = date(2026, 2, 12)
        
        mumbai_lat = 19.0760
        mumbai_lng = 72.8777
        
        total_records = 0
        total_logs = 0
        
        current_date = start_date
        while current_date <= end_date:
            # Skip Sundays
            if current_date.weekday() == 6:
                self.stdout.write(f'  ⏭️  Skipping Sunday: {current_date}')
                current_date += timedelta(days=1)
                continue
            
            day_records = 0
            day_logs = 0
            
            for employee in employees:
                # Random attendance pattern
                rand = random.random()
                
                if rand < 0.05:  # 5% absent
                    continue
                elif rand < 0.10:  # 5% on leave
                    status = 'on_leave'
                    sign_in_time = None
                    sign_out_time = None
                elif rand < 0.20:  # 10% late
                    status = 'late'
                    sign_in_hour = random.randint(9, 10)
                    sign_in_minute = random.randint(16, 59) if sign_in_hour == 9 else random.randint(0, 30)
                    sign_in_time = time(sign_in_hour, sign_in_minute)
                    
                    sign_out_hour = random.randint(17, 19)
                    sign_out_minute = random.randint(0, 59)
                    sign_out_time = time(sign_out_hour, sign_out_minute)
                else:  # 80% present
                    status = 'present'
                    sign_in_hour = random.choice([8, 9])
                    sign_in_minute = random.randint(45, 59) if sign_in_hour == 8 else random.randint(0, 15)
                    sign_in_time = time(sign_in_hour, sign_in_minute)
                    
                    sign_out_hour = random.randint(17, 19)
                    sign_out_minute = random.randint(0, 59)
                    sign_out_time = time(sign_out_hour, sign_out_minute)
                
                # Calculate total hours
                total_hours = 0
                overtime = 0
                if sign_in_time and sign_out_time:
                    sign_in_dt = datetime.combine(current_date, sign_in_time)
                    sign_out_dt = datetime.combine(current_date, sign_out_time)
                    duration = (sign_out_dt - sign_in_dt).total_seconds() / 3600
                    total_hours = round(duration, 2)
                    if total_hours > 8:
                        overtime = round(total_hours - 8, 2)
                
                # Create or update Attendance record
                try:
                    attendance, created = Attendance.objects.update_or_create(
                        employee=employee,
                        date=current_date,
                        defaults={
                            'shift': shift,
                            'sign_in_time': sign_in_time,
                            'sign_out_time': sign_out_time,
                            'total_hours': total_hours,
                            'overtime': overtime,
                            'status': status
                        }
                    )
                    
                    if created:
                        day_records += 1
                        total_records += 1
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'    ❌ Error creating attendance for {employee}: {str(e)}'))
                    continue
                
                # Create AttendanceLog for sign-in
                if sign_in_time:
                    sign_in_datetime = datetime.combine(current_date, sign_in_time)
                    sign_in_timestamp = timezone.make_aware(sign_in_datetime)
                    
                    try:
                        log_defaults = {
                            'status': 'In',
                            'auth_mode': random.choice([1, 2, 3]),
                            'latitude': mumbai_lat + random.uniform(-0.01, 0.01),
                            'longitude': mumbai_lng + random.uniform(-0.01, 0.01),
                            'photo_path': f'/photos/{employee.employee_code}_{current_date}_in.jpg',
                            'is_posted': 1
                        }
                        
                        # Add device only if it exists
                        if device:
                            log_defaults['device'] = device
                        
                        AttendanceLog.objects.get_or_create(
                            employee=employee,
                            timestamp=sign_in_timestamp,
                            defaults=log_defaults
                        )
                        day_logs += 1
                        total_logs += 1
                    except Exception as e:
                        self.stdout.write(self.style.WARNING(f'    ⚠️  Could not create sign-in log: {str(e)}'))
                
                # Create AttendanceLog for sign-out
                if sign_out_time:
                    sign_out_datetime = datetime.combine(current_date, sign_out_time)
                    sign_out_timestamp = timezone.make_aware(sign_out_datetime)
                    
                    try:
                        log_defaults = {
                            'status': 'Out',
                            'auth_mode': random.choice([1, 2, 3]),
                            'latitude': mumbai_lat + random.uniform(-0.01, 0.01),
                            'longitude': mumbai_lng + random.uniform(-0.01, 0.01),
                            'photo_path': f'/photos/{employee.employee_code}_{current_date}_out.jpg',
                            'is_posted': 1
                        }
                        
                        # Add device only if it exists
                        if device:
                            log_defaults['device'] = device
                        
                        AttendanceLog.objects.get_or_create(
                            employee=employee,
                            timestamp=sign_out_timestamp,
                            defaults=log_defaults
                        )
                        day_logs += 1
                        total_logs += 1
                    except Exception as e:
                        self.stdout.write(self.style.WARNING(f'    ⚠️  Could not create sign-out log: {str(e)}'))
            
            self.stdout.write(
                f'  ✅ {current_date} ({current_date.strftime("%A")[:3]}): '
                f'{day_records} records, {day_logs} logs'
            )
            
            current_date += timedelta(days=1)
        
        self.stdout.write(self.style.SUCCESS('\n' + '='*70))
        self.stdout.write(self.style.SUCCESS(f'✅ Total records: {total_records}'))
        self.stdout.write(self.style.SUCCESS(f'✅ Total logs: {total_logs}'))
        self.stdout.write(self.style.SUCCESS('='*70))
