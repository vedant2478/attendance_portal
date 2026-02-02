// Database types matching the provided database structure

export interface User {
  id: number;
  username: string;
  email?: string;
  passwordHash?: string;
  pinCode?: string;
  cardNo?: string;
  fpTemplate?: Uint8Array;
  roleId?: number;
  isActive?: number;
  lastLoginDate?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
  role?: Role;
}

export interface Role {
  id: number;
  roleName: string;
  permissions?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  mobileNumber?: string;
  employeeCode: string;
  deptId?: number;
  photoPath?: string;
  faceEncoding?: Uint8Array;
  userId?: number;
  isActive?: number;
  validityFrom?: string;
  validityTo?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
  department?: Department;
  user?: User;
}

export interface Department {
  id: number;
  deptName: string;
  location?: string;
  managerName?: string;
  contactNumber?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
  employees?: Employee[];
}

export interface Shift {
  id: number;
  shiftName: string;
  startTime: string;
  endTime: string;
  graceTime?: number;
  workingHours?: number;
  createdAt?: string;
}

export interface Holiday {
  id: number;
  holidayName: string;
  holidayDate: string;
  description?: string;
  isOptional?: boolean;
  createdAt?: string;
}

export interface Device {
  id: number;
  deviceName: string;
  deviceType?: string;
  ipAddress?: string;
  macAddress?: string;
  location?: string;
  status?: string;
  lastHeartbeat?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AttendanceRecord {
  id: number;
  employeeId: number;
  date: string;
  signInTime?: string;
  signOutTime?: string;
  totalHours?: number;
  overtime?: number;
  status?: string;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
  employee?: Employee;
}

export interface AttendanceLog {
  id: number;
  employeeId: number;
  timestamp: string;
  status: string;
  authMode?: number;
  deviceId?: number;
  latitude?: number;
  longitude?: number;
  photoPath?: string;
  isPosted?: number;
  employee?: Employee;
  device?: Device;
}

export interface LeaveRequest {
  id: number;
  employeeId: number;
  leaveType: string;
  fromDate: string;
  toDate: string;
  totalDays?: number;
  reason?: string;
  status?: string;
  approvedBy?: number;
  approvedAt?: string;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
  employee?: Employee;
  approver?: User;
}

export interface Notification {
  id: number;
  employeeId?: number;
  message: string;
  notificationType?: string;
  sentStatus?: string;
  timestamp?: string;
  sentAt?: string;
  errorMessage?: string;
  employee?: Employee;
}

export interface AuditTrail {
  id: number;
  timestamp: string;
  userId?: number;
  actionType: string;
  tableName?: string;
  recordId?: number;
  description?: string;
  ipAddress?: string;
  user?: User;
}

export interface Settings {
  id: number;
  configKey: string;
  configValue?: string;
  description?: string;
  category?: string;
  updatedAt?: string;
}

// UI Types
export interface AttendanceStatus {
  present: number;
  absent: number;
  late: number;
  onLeave: number;
}

export interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  onLeaveToday: number;
  attendanceRate: number;
}

export interface AttendanceTrend {
  date: string;
  present: number;
  absent: number;
  late: number;
}

export type AttendanceStatusType = 'Present' | 'Absent' | 'Late' | 'On Leave' | 'Half Day';

export interface AuthMode {
  value: number;
  label: string;
  icon: string;
}
