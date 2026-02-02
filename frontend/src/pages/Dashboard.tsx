import { useState, useEffect } from 'react';
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
import type { Employee, AttendanceRecord, LeaveRequest } from '@/types';
import { attendanceAPI, type TrendData } from '@/services/api';

interface DashboardProps {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
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

export function Dashboard({ employees, leaveRequests }: DashboardProps) {
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

  const [attendanceTrend, setAttendanceTrend] = useState<TrendData[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch attendance data from API
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch today's stats
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

        // Calculate stats
        const totalEmployees = employees.length || 100; // Fallback if employees not loaded
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
        console.error('Error fetching dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
        
        // Fallback to mock data
        setStats({
          totalEmployees: employees.length || 100,
          presentToday: 85,
          absentToday: 10,
          lateToday: 5,
          onLeaveToday: 8,
          attendanceRate: 85,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    
    // Refresh data every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [employees]);

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

      setAnimatedStats({
        totalEmployees: Math.round(stats.totalEmployees * easeOut),
        presentToday: Math.round(stats.presentToday * easeOut),
        absentToday: Math.round(stats.absentToday * easeOut),
        lateToday: Math.round(stats.lateToday * easeOut),
        onLeaveToday: Math.round(stats.onLeaveToday * easeOut),
        attendanceRate: Math.round(stats.attendanceRate * easeOut),
      });

      if (currentStep >= steps) {
        clearInterval(interval);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [stats]);

  const pieData = [
    { name: 'Present', value: stats.presentToday },
    { name: 'Absent', value: stats.absentToday },
    { name: 'Late', value: stats.lateToday },
    { name: 'On Leave', value: stats.onLeaveToday },
  ];

  const pendingLeaves = leaveRequests.filter(req => req.status === 'Pending');

  // Loading state
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
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
          <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-500 mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-gray-200">
            <Calendar className="w-4 h-4 mr-2" />
            Today, {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Total Employees</CardTitle>
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
            <CardTitle className="text-sm font-medium text-gray-500">Present Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-green-600">{animatedStats.presentToday}</span>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2">
              <ArrowUpRight className="w-4 h-4 text-green-500" />
              <span className="text-xs text-green-600">+5% from yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Absent Today</CardTitle>
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
            <CardTitle className="text-sm font-medium text-gray-500">Late Arrivals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-amber-600">{animatedStats.lateToday}</span>
              <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2">
              <ArrowDownRight className="w-4 h-4 text-red-500" />
              <span className="text-xs text-red-600">-2% from yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">On Leave</CardTitle>
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
            <CardTitle className="text-lg font-semibold text-gray-900">Attendance Trend (Last 7 Days)</CardTitle>
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

        {/* Today's Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Today's Status</CardTitle>
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
                  <Tooltip formatter={(value: number) => [value, 'Employees']} />
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
              <CardTitle className="text-lg font-semibold text-gray-900">Recent Attendance</CardTitle>
              <Button variant="ghost" size="sm" className="text-blue-600">View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAttendance.length > 0 ? (
                recentAttendance.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {record.employeeName.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{record.employeeName}</p>
                        <p className="text-xs text-gray-500">{record.employeeCode}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={record.status === 'Present' ? 'default' : 'secondary'}
                        className={
                          record.status === 'Present' ? 'bg-green-100 text-green-800 hover:bg-green-100' :
                          record.status === 'Late' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' :
                          record.status === 'On Leave' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' :
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

        {/* Pending Leave Requests */}
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
                  const employee = employees.find(emp => emp.id === request.employeeId);
                  return (
                    <div key={request.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {employee ? `${employee.firstName[0]}${employee.lastName[0]}` : '??'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown'}
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
      </div>
    </div>
  );
}
