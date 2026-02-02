import type { 
  Employee, 
  Department, 
  Shift, 
  Holiday, 
  Device, 
  AttendanceRecord, 
  AttendanceLog, 
  LeaveRequest, 
  User, 
  Role,
  DashboardStats,
  AttendanceTrend
} from '@/types';

export const roles: Role[] = [
  { id: 1, roleName: 'Admin', description: 'System Administrator', createdAt: '2024-01-01' },
  { id: 2, roleName: 'Manager', description: 'Department Manager', createdAt: '2024-01-01' },
  { id: 3, roleName: 'Employee', description: 'Regular Employee', createdAt: '2024-01-01' },
];

export const users: User[] = [
  { id: 1, username: 'admin', email: 'admin@company.com', roleId: 1, isActive: 1, createdAt: '2024-01-01' },
  { id: 2, username: 'rajesh.k', email: 'rajesh.kumar@company.com', roleId: 2, isActive: 1, createdAt: '2024-01-01' },
  { id: 3, username: 'priya.s', email: 'priya.sharma@company.com', roleId: 3, isActive: 1, createdAt: '2024-01-01' },
  { id: 4, username: 'amit.p', email: 'amit.patel@company.com', roleId: 3, isActive: 1, createdAt: '2024-01-01' },
  { id: 5, username: 'sneha.g', email: 'sneha.gupta@company.com', roleId: 3, isActive: 1, createdAt: '2024-01-01' },
  { id: 6, username: 'vikram.s', email: 'vikram.singh@company.com', roleId: 3, isActive: 1, createdAt: '2024-01-01' },
];

export const departments: Department[] = [
  { id: 1, deptName: 'Engineering', location: 'Building A, Floor 3', managerName: 'Rajesh Kumar', contactNumber: '+91-9876000001' },
  { id: 2, deptName: 'Marketing', location: 'Building B, Floor 2', managerName: 'Priya Sharma', contactNumber: '+91-9876000002' },
  { id: 3, deptName: 'Sales', location: 'Building A, Floor 1', managerName: 'Amit Patel', contactNumber: '+91-9876000003' },
  { id: 4, deptName: 'Human Resources', location: 'Building C, Floor 1', managerName: 'Sneha Gupta', contactNumber: '+91-9876000004' },
  { id: 5, deptName: 'Operations', location: 'Building A, Floor 2', managerName: 'Vikram Singh', contactNumber: '+91-9876000005' },
];

export const employees: Employee[] = [
  { 
    id: 1, 
    firstName: 'Rajesh', 
    lastName: 'Kumar', 
    email: 'rajesh.kumar@company.com', 
    mobileNumber: '+91-9876000001', 
    employeeCode: 'EMP001', 
    deptId: 1, 
    userId: 2, 
    isActive: 1,
    createdAt: '2024-01-01',
    photoPath: '/avatars/rajesh.jpg'
  },
  { 
    id: 2, 
    firstName: 'Priya', 
    lastName: 'Sharma', 
    email: 'priya.sharma@company.com', 
    mobileNumber: '+91-9876000002', 
    employeeCode: 'EMP002', 
    deptId: 2, 
    userId: 3, 
    isActive: 1,
    createdAt: '2024-01-01',
    photoPath: '/avatars/priya.jpg'
  },
  { 
    id: 3, 
    firstName: 'Amit', 
    lastName: 'Patel', 
    email: 'amit.patel@company.com', 
    mobileNumber: '+91-9876000003', 
    employeeCode: 'EMP003', 
    deptId: 3, 
    userId: 4, 
    isActive: 1,
    createdAt: '2024-01-01',
    photoPath: '/avatars/amit.jpg'
  },
  { 
    id: 4, 
    firstName: 'Sneha', 
    lastName: 'Gupta', 
    email: 'sneha.gupta@company.com', 
    mobileNumber: '+91-9876000004', 
    employeeCode: 'EMP004', 
    deptId: 4, 
    userId: 5, 
    isActive: 1,
    createdAt: '2024-01-01',
    photoPath: '/avatars/sneha.jpg'
  },
  { 
    id: 5, 
    firstName: 'Vikram', 
    lastName: 'Singh', 
    email: 'vikram.singh@company.com', 
    mobileNumber: '+91-9876000005', 
    employeeCode: 'EMP005', 
    deptId: 5, 
    userId: 6, 
    isActive: 1,
    createdAt: '2024-01-01',
    photoPath: '/avatars/vikram.jpg'
  },
];

export const shifts: Shift[] = [
  { id: 1, shiftName: 'Morning', startTime: '09:00', endTime: '18:00', graceTime: 15, workingHours: 8, createdAt: '2024-01-01' },
  { id: 2, shiftName: 'Afternoon', startTime: '14:00', endTime: '22:00', graceTime: 15, workingHours: 8, createdAt: '2024-01-01' },
  { id: 3, shiftName: 'Night', startTime: '22:00', endTime: '06:00', graceTime: 15, workingHours: 8, createdAt: '2024-01-01' },
];

export const holidays: Holiday[] = [
  { id: 1, holidayName: 'New Year', holidayDate: '2025-01-01', description: 'New Year celebration', isOptional: false, createdAt: '2024-01-01' },
  { id: 2, holidayName: 'Republic Day', holidayDate: '2025-01-26', description: 'Republic Day', isOptional: false, createdAt: '2024-01-01' },
  { id: 3, holidayName: 'Independence Day', holidayDate: '2025-08-15', description: 'Independence Day', isOptional: false, createdAt: '2024-01-01' },
  { id: 4, holidayName: 'Christmas', holidayDate: '2025-12-25', description: 'Christmas Day', isOptional: false, createdAt: '2024-01-01' },
];

export const devices: Device[] = [
  { 
    id: 1, 
    deviceName: 'Main Terminal', 
    deviceType: 'Face Recognition', 
    ipAddress: '127.0.0.1', 
    location: 'Main Entrance', 
    status: 'Active', 
    lastHeartbeat: '2025-01-22 11:47:40',
    createdAt: '2024-01-01'
  },
];

export const attendanceRecords: AttendanceRecord[] = [
  { 
    id: 1, 
    employeeId: 1, 
    date: '2025-01-22', 
    signInTime: '09:05:00', 
    signOutTime: '18:30:00', 
    totalHours: 9.5, 
    overtime: 1.5,
    status: 'Present',
    createdAt: '2025-01-22'
  },
  { 
    id: 2, 
    employeeId: 2, 
    date: '2025-01-22', 
    signInTime: '09:10:00', 
    signOutTime: '18:15:00', 
    totalHours: 9.0, 
    overtime: 1.0,
    status: 'Present',
    createdAt: '2025-01-22'
  },
  { 
    id: 3, 
    employeeId: 3, 
    date: '2025-01-22', 
    signInTime: '08:55:00', 
    signOutTime: '18:00:00', 
    totalHours: 9.0, 
    overtime: 1.0,
    status: 'Present',
    createdAt: '2025-01-22'
  },
  { 
    id: 4, 
    employeeId: 4, 
    date: '2025-01-22', 
    status: 'On Leave',
    createdAt: '2025-01-22'
  },
  { 
    id: 5, 
    employeeId: 5, 
    date: '2025-01-22', 
    signInTime: '09:25:00', 
    signOutTime: '18:45:00', 
    totalHours: 9.0, 
    overtime: 1.0,
    status: 'Late',
    remarks: '15 minutes late',
    createdAt: '2025-01-22'
  },
];

export const attendanceLogs: AttendanceLog[] = [
  { 
    id: 1, 
    employeeId: 1, 
    timestamp: '2025-01-22 09:05:00', 
    status: 'In', 
    authMode: 1, 
    deviceId: 1, 
    isPosted: 1 
  },
  { 
    id: 2, 
    employeeId: 1, 
    timestamp: '2025-01-22 18:30:00', 
    status: 'Out', 
    authMode: 1, 
    deviceId: 1, 
    isPosted: 1 
  },
  { 
    id: 3, 
    employeeId: 2, 
    timestamp: '2025-01-22 09:10:00', 
    status: 'In', 
    authMode: 1, 
    deviceId: 1, 
    isPosted: 1 
  },
  { 
    id: 4, 
    employeeId: 2, 
    timestamp: '2025-01-22 18:15:00', 
    status: 'Out', 
    authMode: 1, 
    deviceId: 1, 
    isPosted: 1 
  },
];

export const leaveRequests: LeaveRequest[] = [
  { 
    id: 1, 
    employeeId: 4, 
    leaveType: 'Sick Leave', 
    fromDate: '2025-01-22', 
    toDate: '2025-01-23', 
    totalDays: 2, 
    reason: 'Medical appointment', 
    status: 'Approved',
    approvedBy: 1,
    approvedAt: '2025-01-21',
    createdAt: '2025-01-21'
  },
  { 
    id: 2, 
    employeeId: 1, 
    leaveType: 'Casual Leave', 
    fromDate: '2025-01-25', 
    toDate: '2025-01-25', 
    totalDays: 1, 
    reason: 'Personal work', 
    status: 'Pending',
    createdAt: '2025-01-20'
  },
];

export const dashboardStats: DashboardStats = {
  totalEmployees: 5,
  presentToday: 3,
  absentToday: 0,
  lateToday: 1,
  onLeaveToday: 1,
  attendanceRate: 80,
};

export const attendanceTrend: AttendanceTrend[] = [
  { date: '2025-01-17', present: 4, absent: 0, late: 1 },
  { date: '2025-01-18', present: 5, absent: 0, late: 0 },
  { date: '2025-01-19', present: 4, absent: 1, late: 0 },
  { date: '2025-01-20', present: 5, absent: 0, late: 0 },
  { date: '2025-01-21', present: 4, absent: 0, late: 1 },
  { date: '2025-01-22', present: 3, absent: 0, late: 1 },
];

export const authModes = [
  { value: 1, label: 'Face Recognition', icon: 'Face' },
  { value: 2, label: 'Fingerprint', icon: 'Fingerprint' },
  { value: 3, label: 'RFID Card', icon: 'CreditCard' },
  { value: 4, label: 'PIN Code', icon: 'Key' },
];
