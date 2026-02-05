import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  Calendar, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { attendanceAPI, employeeAPI, authAPI, type TrendData, type Employee, type AttendanceRecord } from '@/services/api';

interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  status: string;
}

const PIE_COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6'];

interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  onLeaveToday: number;
  attendanceRate: number;
}

interface UserAttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  leaveDays: number;
  attendanceRate: number;
}

export function Dashboard() {
  const navigate = useNavigate();
  const currentUser = authAPI.getCurrentUser();
  
  // ✅ CORRECTED: Role 2 = Admin, any other role = Normal User
  const isAdmin = currentUser?.role === 2;
  
  // ✅ Redirect to login if no user
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);
  
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    onLeaveToday: 0,
    attendanceRate: 0,
  });
  
  const [animatedStats, setAnimatedStats] = useState<DashboardStats>({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    onLeaveToday: 0,
    attendanceRate: 0,
  });

  // User-specific data
  const [userAttendanceStats, setUserAttendanceStats] = useState<UserAttendanceStats>({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    leaveDays: 0,
    attendanceRate: 0,
  });

  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [userAtteindanceRecords, setUserAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceTrend, setAttendanceTrend] = useState<TrendData[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data from API
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentUser) {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // ✅ FIXED: Check role explicitly - Role 2 is Admin
        if (currentUser.role === 2) {
          // ADMIN VIEW (role 2) - Fetch all data
          await fetchAdminDashboard();
        } else {
          // USER VIEW (role !== 2) - Fetch only user's own data
          await fetchUserDashboard();
        }

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
        
        // Fallback to default values
        setStats({
          totalEmployees: 0,
          presentToday: 0,
          absentToday: 0,
          lateToday: 0,
          onLeaveToday: 0,
          attendanceRate: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    
    // Refresh data every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [currentUser?.id, currentUser?.role]);

  // Fetch admin dashboard data
  const fetchAdminDashboard = async () => {
    try {
      // Fetch employees from API
      const employeeData = await employeeAPI.getActive();
      setEmployees(employeeData);

      // Fetch employee statistics
      const empStats = await employeeAPI.getStats();

      // Fetch today's attendance stats
      const todayStats = await attendanceAPI.getTodayStats();
      
      // Fetch trend data
      const trendData = await attendanceAPI.getTrend(7);
      setAttendanceTrend(trendData);

      // Fetch recent attendance (last 5 records)
      const recentData = await attendanceAPI.getAll();
      const recent = recentData.results.slice(0, 5).map(record => ({
        id: record.id,
        employeeId: record.employee,
        employeeName: record.employee_name || 'Unknown',
        employeeCode: record.employee_code || 'N/A',
        date: record.date,
        status: record.status || 'Unknown',
        signInTime: record.sign_in_time,
        signOutTime: record.sign_out_time,
        totalHours: record.total_hours,
      }));
      setRecentAttendance(recent);

      // Calculate stats using real data
      const totalEmployees = empStats.active_employees;
      const attendanceRate = totalEmployees > 0 
        ? Math.round((todayStats.present / totalEmployees) * 100) 
        : 0;

      setStats({
        totalEmployees,
        presentToday: todayStats.present,
        absentToday: todayStats.absent,
        lateToday: todayStats.late,
        onLeaveToday: todayStats.on_leave,
        attendanceRate,
      });
    } catch (err) {
      console.error('Error in fetchAdminDashboard:', err);
      throw err;
    }
  };

  // Fetch user-specific dashboard data
  const fetchUserDashboard = async () => {
    if (!currentUser?.id) {
      throw new Error('User not logged in');
    }

    try {
      // Fetch employee data and attendance for current user
      const userData = await employeeAPI.getAttendanceDataById(currentUser.id);
      
      if (!userData.success) {
        throw new Error('Failed to fetch user data');
      }
      
      setCurrentEmployee(userData.employee);
      setUserAttendanceRecords(userData.attendance_records);

      // Calculate user attendance statistics
      const records = userData.attendance_records;
      const totalDays = records.length;
      const presentDays = records.filter(r => r.status === 'present').length;
      const absentDays = records.filter(r => r.status === 'absent').length;
      const lateDays = records.filter(r => r.status === 'late').length;
      const leaveDays = records.filter(r => r.status === 'on_leave').length;
      const attendanceRate = totalDays > 0 
        ? Math.round((presentDays / totalDays) * 100) 
        : 0;

      setUserAttendanceStats({
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        leaveDays,
        attendanceRate,
      });

      // Get last 7 days of user's attendance for trend
      const last7Days = records.slice(0, 7).reverse();
      const userTrend: TrendData[] = last7Days.map(record => ({
        date: record.date,
        present: record.status === 'present' ? 1 : 0,
        absent: record.status === 'absent' ? 1 : 0,
        late: record.status === 'late' ? 1 : 0,
        on_leave: record.status === 'on_leave' ? 1 : 0,
      }));
      setAttendanceTrend(userTrend);

      // Set recent attendance for user view
      const recent = records.slice(0, 5).map(record => ({
        id: record.id,
        employeeId: record.employee,
        employeeName: userData.employee.full_name,
        employeeCode: userData.employee.employee_code,
        date: record.date,
        status: record.status || 'Unknown',
        signInTime: record.sign_in_time,
        signOutTime: record.sign_out_time,
        totalHours: record.total_hours,
      }));
      setRecentAttendance(recent);

      // For user view, show their stats
      setStats({
        totalEmployees: 1,
        presentToday: records[0]?.status === 'present' ? 1 : 0,
        absentToday: records[0]?.status === 'absent' ? 1 : 0,
        lateToday: records[0]?.status === 'late' ? 1 : 0,
        onLeaveToday: records[0]?.status === 'on_leave' ? 1 : 0,
        attendanceRate: attendanceRate,
      });
    } catch (err) {
      console.error('Error in fetchUserDashboard:', err);
      throw err;
    }
  };

  // Animate stats on mount or when stats change
  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const stepDuration = duration / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      const easeOut = 1 - Math.pow(1 - progress, 3);

      if (isAdmin) {
        setAnimatedStats({
          totalEmployees: Math.round(stats.totalEmployees * easeOut),
          presentToday: Math.round(stats.presentToday * easeOut),
          absentToday: Math.round(stats.absentToday * easeOut),
          lateToday: Math.round(stats.lateToday * easeOut),
          onLeaveToday: Math.round(stats.onLeaveToday * easeOut),
          attendanceRate: Math.round(stats.attendanceRate * easeOut),
        });
      } else {
        // For user view, animate user stats
        setAnimatedStats({
          totalEmployees: Math.round(userAttendanceStats.totalDays * easeOut),
          presentToday: Math.round(userAttendanceStats.presentDays * easeOut),
          absentToday: Math.round(userAttendanceStats.absentDays * easeOut),
          lateToday: Math.round(userAttendanceStats.lateDays * easeOut),
          onLeaveToday: Math.round(userAttendanceStats.leaveDays * easeOut),
          attendanceRate: Math.round(userAttendanceStats.attendanceRate * easeOut),
        });
      }

      if (currentStep >= steps) {
        clearInterval(interval);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [stats, userAttendanceStats, isAdmin]);

  const pieData = isAdmin ? [
    { name: 'Present', value: stats.presentToday },
    { name: 'Absent', value: stats.absentToday },
    { name: 'Late', value: stats.lateToday },
    { name: 'On Leave', value: stats.onLeaveToday },
  ] : [
    { name: 'Present', value: userAttendanceStats.presentDays },
    { name: 'Absent', value: userAttendanceStats.absentDays },
    { name: 'Late', value: userAttendanceStats.lateDays },
    { name: 'On Leave', value: userAttendanceStats.leaveDays },
  ];

  const pendingLeaves = leaveRequests.filter(req => req.status === 'Pending');

  // Helper function to get employee by ID
  const getEmployeeById = (employeeId: string | number) => {
    return employees.find(emp => emp.id === Number(employeeId));
  };

  // Helper function to get initials
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading dashboard...</p>
          <p className="mt-2 text-sm text-gray-500">
            {isAdmin ? 'Loading admin view...' : 'Loading your personalized dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  // If no user, don't render
  if (!currentUser) {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Error loading data</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="border-red-300 text-red-600 hover:bg-red-100"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            {isAdmin ? 'Admin Dashboard' : 'My Dashboard'}
          </h2>
          <p className="text-gray-500 mt-1">
            {isAdmin 
              ? "Welcome back! Here's what's happening today." 
              : `Welcome back, ${currentEmployee?.full_name || currentUser?.username}!`
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-gray-200">
            <Calendar className="w-4 h-4 mr-2" />
            Today, {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </Button>
        </div>
      </div>

      {/* User Info Card (Non-Admin Only) */}
      {!isAdmin && currentEmployee && (
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-blue-600">
                  {getInitials(currentEmployee.first_name, currentEmployee.last_name)}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold">{currentEmployee.full_name}</h3>
                <p className="text-blue-100">Employee Code: {currentEmployee.employee_code}</p>
                <p className="text-blue-100">{currentEmployee.department_name}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{userAttendanceStats.attendanceRate}%</p>
                <p className="text-blue-100">Attendance Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">
              {isAdmin ? 'Total Employees' : 'Total Working Days'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-gray-900">{animatedStats.totalEmployees}</span>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">
              {isAdmin ? 'Present Today' : 'Present Days'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-green-600">{animatedStats.presentToday}</span>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-1 mt-2">
                <ArrowUpRight className="w-4 h-4 text-green-500" />
                <span className="text-xs text-green-600">+5% from yesterday</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">
              {isAdmin ? 'Absent Today' : 'Absent Days'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-red-600">{animatedStats.absentToday}</span>
              <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                <UserX className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">
              {isAdmin ? 'Late Arrivals' : 'Late Days'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-amber-600">{animatedStats.lateToday}</span>
              <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-1 mt-2">
                <ArrowDownRight className="w-4 h-4 text-red-500" />
                <span className="text-xs text-red-600">-2% from yesterday</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">
              {isAdmin ? 'On Leave' : 'Leave Days'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-blue-600">{animatedStats.onLeaveToday}</span>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Attendance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-gray-900">{animatedStats.attendanceRate}%</span>
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2">
              <ArrowUpRight className="w-4 h-4 text-green-500" />
              <span className="text-xs text-green-600">+3% this week</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              {isAdmin ? 'Attendance Trend (Last 7 Days)' : 'My Attendance Trend (Last 7 Days)'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      value, 
                      name === 'present' ? 'Present' : 
                      name === 'absent' ? 'Absent' : 
                      name === 'late' ? 'Late' : 'On Leave'
                    ]}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="present" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="absent" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="late" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              {isAdmin ? "Today's Status" : 'My Attendance Overview'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, isAdmin ? 'Employees' : 'Days']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {pieData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: PIE_COLORS[index] }}
                  />
                  <span className="text-sm text-gray-600">{entry.name}</span>
                  <span className="text-sm font-medium text-gray-900 ml-auto">{entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Pending Leaves */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Attendance */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-900">
                {isAdmin ? 'Recent Attendance' : 'My Recent Attendance'}
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-blue-600"
                onClick={() => navigate('/attendance')}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAttendance.length > 0 ? (
                recentAttendance.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {record.employeeName.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{record.employeeName}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={record.status === 'present' ? 'default' : 'secondary'}
                        className={
                          record.status === 'present' ? 'bg-green-100 text-green-800 hover:bg-green-100' :
                          record.status === 'late' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' :
                          record.status === 'on_leave' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' :
                          'bg-red-100 text-red-800 hover:bg-red-100'
                        }
                      >
                        {record.status}
                      </Badge>
                      <div className="text-right">
                        <p className="text-sm text-gray-900">
                          {record.signInTime ? record.signInTime.substring(0, 5) : '--:--'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {record.signOutTime ? record.signOutTime.substring(0, 5) : '--:--'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No recent attendance records</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Leave Requests (Admin Only) OR User Stats Summary */}
        {isAdmin ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900">Pending Leave Requests</CardTitle>
                <Badge variant="secondary">{pendingLeaves.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {pendingLeaves.length > 0 ? (
                <div className="space-y-3">
                  {pendingLeaves.slice(0, 5).map((request) => {
                    const employee = getEmployeeById(request.employeeId);
                    return (
                      <div key={request.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                              {employee ? getInitials(employee.first_name, employee.last_name) : '??'}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {employee ? employee.full_name : 'Unknown'}
                              </p>
                              <p className="text-xs text-gray-500">{request.leaveType}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                            Pending
                          </Badge>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-sm">
                          <span className="text-gray-500">
                            {new Date(request.fromDate).toLocaleDateString()} - {new Date(request.toDate).toLocaleDateString()}
                          </span>
                          <span className="text-gray-500">{request.totalDays} day(s)</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{request.reason}</p>
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700">
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1">
                            Reject
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No pending leave requests</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">My Attendance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <UserCheck className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Present Days</p>
                      <p className="text-xs text-gray-500">Total days attended</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-green-600">{userAttendanceStats.presentDays}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <UserX className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Absent Days</p>
                      <p className="text-xs text-gray-500">Total days absent</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-red-600">{userAttendanceStats.absentDays}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Late Arrivals</p>
                      <p className="text-xs text-gray-500">Total late days</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-amber-600">{userAttendanceStats.lateDays}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Attendance Rate</p>
                      <p className="text-xs text-gray-500">Your overall rate</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-purple-600">{userAttendanceStats.attendanceRate}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
