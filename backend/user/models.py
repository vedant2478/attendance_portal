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
    """Employee model with biometric data"""
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
    biometric_encoding = models.BinaryField(
        null=True, 
        blank=True,
        help_text="Stores fingerprint or other biometric template data"
    )
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



class LeaveRequest(models.Model):
    """Leave request model for employee leave management"""
    
    # Leave Type Choices
    LEAVE_TYPE_CHOICES = [
        ('sick', 'Sick Leave'),
        ('casual', 'Casual Leave'),
        ('annual', 'Annual Leave'),
        ('maternity', 'Maternity Leave'),
        ('paternity', 'Paternity Leave'),
        ('unpaid', 'Unpaid Leave'),
        ('compensatory', 'Compensatory Off'),
        ('emergency', 'Emergency Leave'),
        ('other', 'Other'),
    ]
    
    # Status Choices
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]
    
    # Employee who is requesting leave
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='leave_requests',
        db_column='userId',
        help_text="User requesting the leave"
    )
    
    # Employee record (optional, for linking to employee details)
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='leave_requests',
        null=True,
        blank=True,
        db_column='employeeId',
        help_text="Employee record of the user"
    )
    
    # Leave details
    leave_type = models.CharField(
        max_length=20,
        choices=LEAVE_TYPE_CHOICES,
        default='casual',
        help_text="Type of leave being requested"
    )
    
    from_date = models.DateField(
        help_text="Start date of leave"
    )
    
    to_date = models.DateField(
        help_text="End date of leave"
    )
    
    total_days = models.IntegerField(
        null=True,
        blank=True,
        help_text="Total number of leave days (auto-calculated)"
    )
    
    reason = models.TextField(
        help_text="Reason for leave request"
    )
    
    # Approval workflow
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        help_text="Current status of leave request"
    )
    
    # User who will approve/reject (HR, Admin, or Manager)
    approver = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='leave_approvals',
        db_column='approverId',
        help_text="User who can approve/reject this request (HR/Admin/Manager)"
    )
    
    # Approval/Rejection details
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_leaves',
        db_column='approvedById',
        help_text="User who approved/rejected the request"
    )
    
    approved_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Date when request was approved/rejected"
    )
    
    rejection_reason = models.TextField(
        null=True,
        blank=True,
        help_text="Reason for rejection (if rejected)"
    )
    
    # Additional fields
    attachment = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Path to supporting document (medical certificate, etc.)"
    )
    
    comments = models.TextField(
        null=True,
        blank=True,
        help_text="Additional comments from approver"
    )
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)


    class Meta:
        db_table = "leave_requests"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['approver', 'status']),
            models.Index(fields=['from_date', 'to_date']),
        ]


    def __str__(self):
        return f"{self.user.username} - {self.leave_type} ({self.from_date} to {self.to_date})"
    
    def save(self, *args, **kwargs):
        """Auto-calculate total days before saving"""
        if self.from_date and self.to_date:
            delta = self.to_date - self.from_date
            self.total_days = delta.days + 1  # +1 to include both start and end dates
        super().save(*args, **kwargs)
    
    def approve(self, approved_by_user, comments=None):
        """Approve the leave request"""
        self.status = 'approved'
        self.approved_by = approved_by_user
        self.approved_date = timezone.now()
        if comments:
            self.comments = comments
        self.save()
    
    def reject(self, rejected_by_user, rejection_reason, comments=None):
        """Reject the leave request"""
        self.status = 'rejected'
        self.approved_by = rejected_by_user
        self.approved_date = timezone.now()
        self.rejection_reason = rejection_reason
        if comments:
            self.comments = comments
        self.save()
    
    def cancel(self):
        """Cancel the leave request"""
        if self.status == 'pending':
            self.status = 'cancelled'
            self.save()
            return True
        return False
    
    @property
    def is_pending(self):
        """Check if leave request is pending"""
        return self.status == 'pending'
    
    @property
    def is_approved(self):
        """Check if leave request is approved"""
        return self.status == 'approved'
    
    @property
    def is_rejected(self):
        """Check if leave request is rejected"""
        return self.status == 'rejected'



class Notification(models.Model):
    """Notification model for user alerts"""
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications",
        db_column="userId"
    )
    title = models.CharField(max_length=255)
    body = models.TextField()
    page = models.CharField(
        max_length=100, 
        null=True, 
        blank=True,
        help_text="Target page/route to navigate when notification is clicked"
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)


    class Meta:
        db_table = "notifications"
        ordering = ['-created_at']


    def __str__(self):
        return f"{self.title} - {self.user.username}"
