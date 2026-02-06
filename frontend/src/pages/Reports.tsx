import { useState, useEffect } from 'react';
import { 
  Download, 
  FileText, 
  Calendar,
  BarChart3,
  Users,
  Clock,
  UserCheck,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { 
  attendanceAPI, 
  employeeAPI, 
  authAPI, 
  type Employee, 
  type TrendData, 
  type AttendanceRecord,
  type DepartmentAttendanceStats 
} from '@/services/api';
import { toast } from 'sonner';

interface Department {
  id: number;
  dept_name: string;
  location?: string;
  manager_name?: string;
}

interface DepartmentStat {
  name: string;
  employees: number;
  present: number;
  attendanceRate: number;
}

interface EmployeeReport {
  id: number;
  name: string;
  department: string;
  daysPresent: number;
  daysAbsent: number;
  lateDays: number;
  totalDays: number;
  attendanceRate: number;
}

// Mock departments - replace when department API is ready
const MOCK_DEPARTMENTS: Department[] = [
  { id: 1, dept_name: 'Engineering', location: 'Building A' },
  { id: 2, dept_name: 'Human Resources', location: 'Building B' },
  { id: 3, dept_name: 'Sales', location: 'Building C' },
  { id: 4, dept_name: 'Marketing', location: 'Building D' },
  { id: 5, dept_name: 'Finance', location: 'Building E' },
];

export function Reports() {
  const currentUser = authAPI.getCurrentUser();
  const isAdmin = currentUser?.role === 2;

  const [reportType, setReportType] = useState<string>('attendance-summary');
  const [dateRange, setDateRange] = useState<string>('this-month');
  const [department, setDepartment] = useState<string>('all');
  const [exportFormat, setExportFormat] = useState<string>('pdf');
  
  const [departments] = useState<Department[]>(MOCK_DEPARTMENTS);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [attendanceTrend, setAttendanceTrend] = useState<TrendData[]>([]);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStat[]>([]);
  const [employeeReports, setEmployeeReports] = useState<EmployeeReport[]>([]);
  const [userAttendanceRecords, setUserAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Summary stats
  const [summaryStats, setSummaryStats] = useState({
    totalEmployees: 0,
    avgAttendance: 0,
    totalOvertime: 0,
    leaveDays: 0,
  });

  useEffect(() => {
    fetchReportData();
  }, [dateRange, department, isAdmin]);

  // Helper function to get date range
  const getDateRange = () => {
    const today = new Date();
    let startDate = '';
    let endDate = today.toISOString().split('T')[0];

    switch (dateRange) {
      case 'today':
        startDate = endDate;
        break;
      case 'this-week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        startDate = weekStart.toISOString().split('T')[0];
        break;
      case 'this-month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        startDate = monthStart.toISOString().split('T')[0];
        break;
      case 'last-month':
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        startDate = lastMonthStart.toISOString().split('T')[0];
        endDate = lastMonthEnd.toISOString().split('T')[0];
        break;
      case 'this-year':
        const yearStart = new Date(today.getFullYear(), 0, 1);
        startDate = yearStart.toISOString().split('T')[0];
        break;
      default:
        const defaultStart = new Date(today);
        defaultStart.setDate(today.getDate() - 30);
        startDate = defaultStart.toISOString().split('T')[0];
    }

    return { startDate, endDate };
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (isAdmin) {
        // ADMIN VIEW - Fetch all data
        await fetchAdminReports();
      } else {
        // USER VIEW - Fetch only user's data
        await fetchUserReports();
      }

    } catch (err) {
      console.error('Error fetching report data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load report data');
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminReports = async () => {
    const { startDate, endDate } = getDateRange();

    // Fetch employees
    const employeeData = await employeeAPI.getActive();
    setEmployees(employeeData);

    // Fetch employee stats
    const empStats = await employeeAPI.getStats();

    // Fetch attendance trend
    const days = dateRange === 'this-week' ? 7 : 30;
    const trendData = await attendanceAPI.getTrend(days);
    setAttendanceTrend(trendData);

    // ✅ Use new department attendance API
    const deptAttendanceResponse = await attendanceAPI.getByDepartment({
      start_date: startDate,
      end_date: endDate,
    });

    // Transform API response to match UI interface
    const deptStats: DepartmentStat[] = deptAttendanceResponse.data.map((dept: DepartmentAttendanceStats) => ({
      name: dept.department_name,
      employees: dept.total_employees,
      present: dept.present_count,
      attendanceRate: dept.attendance_rate,
    }));
    setDepartmentStats(deptStats);

    // Fetch all attendance records for employee reports
    const attendanceData = await attendanceAPI.getAll({
      start_date: startDate,
      end_date: endDate,
    });
    const allRecords = attendanceData.results;

    // Calculate employee-wise reports
    const empReports: EmployeeReport[] = employeeData.slice(0, 10).map(emp => {
      const empRecords = allRecords.filter(r => r.employee === emp.id);
      const present = empRecords.filter(r => r.status === 'present').length;
      const absent = empRecords.filter(r => r.status === 'absent').length;
      const late = empRecords.filter(r => r.status === 'late').length;
      const total = empRecords.length;
      
      const dept = departments.find(d => d.id === emp.dept);
      
      return {
        id: emp.id,
        name: emp.full_name,
        department: dept?.dept_name || emp.department_name,
        daysPresent: present,
        daysAbsent: absent,
        lateDays: late,
        totalDays: total,
        attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
      };
    });
    setEmployeeReports(empReports);

    // Calculate summary stats from department data
    const totalEmployees = deptAttendanceResponse.data.reduce(
      (sum: number, dept: DepartmentAttendanceStats) => sum + dept.total_employees, 
      0
    );
    const totalPresent = deptAttendanceResponse.data.reduce(
      (sum: number, dept: DepartmentAttendanceStats) => sum + dept.present_count, 
      0
    );
    const totalRecords = deptAttendanceResponse.data.reduce(
      (sum: number, dept: DepartmentAttendanceStats) => sum + dept.total_records, 
      0
    );
    const avgAttendance = totalRecords > 0 
      ? Math.round((totalPresent / totalRecords) * 100) 
      : 0;

    const totalOvertime = deptAttendanceResponse.data.reduce(
      (sum: number, dept: DepartmentAttendanceStats) => sum + dept.total_overtime, 
      0
    );

    const leaveDays = deptAttendanceResponse.data.reduce(
      (sum: number, dept: DepartmentAttendanceStats) => sum + dept.on_leave_count, 
      0
    );

    setSummaryStats({
      totalEmployees: empStats.active_employees,
      avgAttendance,
      totalOvertime: Math.round(totalOvertime),
      leaveDays,
    });
  };

  const fetchUserReports = async () => {
    if (!currentUser?.id) {
      throw new Error('User not logged in');
    }

    const { startDate, endDate } = getDateRange();

    // Fetch employee data and attendance for current user
    const userData = await employeeAPI.getAttendanceDataById(currentUser.id, {
      start_date: startDate,
      end_date: endDate,
    });
    
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

    // Get last 7 or 30 days of user's attendance for trend
    const days = dateRange === 'this-week' ? 7 : 30;
    const selectedRecords = records.slice(0, days).reverse();
    const userTrend: TrendData[] = selectedRecords.map(record => ({
      date: record.date,
      present: record.status === 'present' ? 1 : 0,
      absent: record.status === 'absent' ? 1 : 0,
      late: record.status === 'late' ? 1 : 0,
      on_leave: record.status === 'on_leave' ? 1 : 0,
    }));
    setAttendanceTrend(userTrend);

    // Set user's report as the only entry
    const dept = departments.find(d => d.id === userData.employee.dept);
    const userReport: EmployeeReport = {
      id: userData.employee.id,
      name: userData.employee.full_name,
      department: dept?.dept_name || userData.employee.department_name,
      daysPresent: presentDays,
      daysAbsent: absentDays,
      lateDays: lateDays,
      totalDays: totalDays,
      attendanceRate: attendanceRate,
    };
    setEmployeeReports([userReport]);

    // Calculate overtime for user
    const totalOvertime = records.reduce((sum, record) => 
      sum + (record.overtime || 0), 0
    );

    // Set summary stats for user
    setSummaryStats({
      totalEmployees: 1, // Only user
      avgAttendance: attendanceRate,
      totalOvertime: Math.round(totalOvertime),
      leaveDays: leaveDays,
    });

    // ✅ NEW: Fetch user's department attendance from API
    if (userData.employee.dept) {
      try {
        const deptAttendanceResponse = await attendanceAPI.getByDepartment({
          start_date: startDate,
          end_date: endDate,
        });

        // Find the user's department in the response
        const userDepartmentData = deptAttendanceResponse.data.find(
          (deptData: DepartmentAttendanceStats) => deptData.department_id === userData.employee.dept
        );

        if (userDepartmentData) {
          const userDeptStat: DepartmentStat = {
            name: userDepartmentData.department_name,
            employees: userDepartmentData.total_employees,
            present: userDepartmentData.present_count,
            attendanceRate: userDepartmentData.attendance_rate,
          };
          setDepartmentStats([userDeptStat]);
        } else {
          // Fallback if department not found in API response
          const userDeptStat: DepartmentStat = {
            name: dept?.dept_name || userData.employee.department_name,
            employees: 1,
            present: presentDays,
            attendanceRate: attendanceRate,
          };
          setDepartmentStats([userDeptStat]);
        }
      } catch (error) {
        console.error('Error fetching department stats:', error);
        // Fallback to user's own stats
        const userDeptStat: DepartmentStat = {
          name: dept?.dept_name || userData.employee.department_name,
          employees: 1,
          present: presentDays,
          attendanceRate: attendanceRate,
        };
        setDepartmentStats([userDeptStat]);
      }
    }
  };

  const handleDownload = () => {
    const reportName = reportType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    const rangeName = dateRange.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    toast.success(`Downloading ${reportName} report (${rangeName}) as ${exportFormat.toUpperCase()}...`);
    
    // In a real app, this would generate and download the actual report file
    console.log('Download Config:', {
      reportType,
      dateRange,
      department,
      format: exportFormat,
      isAdmin,
      userId: currentUser?.id,
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-lg text-gray-600">Loading report data...</p>
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
            <p className="text-sm font-medium text-red-800">Error loading reports</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={fetchReportData}
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
            {isAdmin ? 'Reports' : 'My Reports'}
          </h2>
          <p className="text-gray-500 mt-1">
            {isAdmin 
              ? 'Generate and download attendance reports' 
              : 'View and download your attendance reports'
            }
          </p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={handleDownload}
        >
          <Download className="w-4 h-4 mr-2" />
          Download Report
        </Button>
      </div>

      {/* User Info Card (Non-Admin Only) */}
      {!isAdmin && currentEmployee && (
        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-purple-600">
                  {getInitials(currentEmployee.full_name)}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold">{currentEmployee.full_name}</h3>
                <p className="text-purple-100">Employee Code: {currentEmployee.employee_code}</p>
                <p className="text-purple-100">{currentEmployee.department_name}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{summaryStats.avgAttendance}%</p>
                <p className="text-purple-100">Your Attendance Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium text-gray-900">Report Configuration</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="attendance-summary">Attendance Summary</SelectItem>
                <SelectItem value="employee-attendance">
                  {isAdmin ? 'Employee Attendance' : 'My Attendance'}
                </SelectItem>
                {isAdmin && (
                  <>
                    <SelectItem value="department-analysis">Department Analysis</SelectItem>
                    <SelectItem value="late-report">Late Report</SelectItem>
                  </>
                )}
                <SelectItem value="overtime-report">Overtime Report</SelectItem>
                <SelectItem value="leave-report">Leave Report</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date Range</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="this-year">This Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isAdmin && (
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.dept_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Format</Label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                {isAdmin ? 'Attendance Trend' : 'My Attendance Trend'}
              </CardTitle>
            </div>
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
                  <Line type="monotone" dataKey="present" stroke="#22c55e" strokeWidth={2} />
                  <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} />
                  <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Department Attendance Rate */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5" />
                {isAdmin ? 'Department Attendance Rate' : 'My Department Attendance'}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {departmentStats.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} unit="%" />
                    <Tooltip formatter={(value: number) => [`${value}%`, 'Attendance Rate']} />
                    <Bar dataKey="attendanceRate" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center">
                <div className="text-center">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No department data available</p>
                </div>
              </div>
            )}
            {!isAdmin && departmentStats.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Department Overview</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {departmentStats[0].employees} employees · {departmentStats[0].present} present
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">
                      {departmentStats[0].attendanceRate}%
                    </p>
                    <p className="text-xs text-gray-500">Attendance Rate</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Users className="w-4 h-4" />
              {isAdmin ? 'Total Employees' : 'Total Working Days'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-gray-900">{summaryStats.totalEmployees}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              {isAdmin ? 'Average Attendance' : 'My Attendance Rate'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-green-600">{summaryStats.avgAttendance}%</span>
            <p className="text-xs text-green-600 mt-1">For selected period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {isAdmin ? 'Total Overtime' : 'My Overtime'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-amber-600">{summaryStats.totalOvertime}h</span>
            <p className="text-xs text-amber-600 mt-1">For selected period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {isAdmin ? 'Leave Days' : 'My Leave Days'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-blue-600">{summaryStats.leaveDays}</span>
            <p className="text-xs text-blue-600 mt-1">For selected period</p>
          </CardContent>
        </Card>
      </div>

      {/* Report Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {isAdmin ? 'Report Preview' : 'My Attendance Report'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-900">
                    {isAdmin ? 'Employee' : 'Date Range'}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-900">Department</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-900">Days Present</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-900">Days Absent</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-900">Late Days</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-900">Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {employeeReports.map((report) => (
                  <tr key={report.id} className="border-b border-gray-100">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                          {getInitials(report.name)}
                        </div>
                        <span className="text-sm text-gray-900">{report.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{report.department}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">{report.daysPresent}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">{report.daysAbsent}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">{report.lateDays}</td>
                    <td className="py-3 px-4">
                      <span className={`text-sm font-medium ${
                        report.attendanceRate >= 90 ? 'text-green-600' : 
                        report.attendanceRate >= 80 ? 'text-amber-600' : 
                        'text-red-600'
                      }`}>
                        {report.attendanceRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {employeeReports.length === 0 && (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No data available for the selected period</p>
            </div>
          )}
          <div className="mt-4 flex justify-center">
            <Button variant="outline" className="border-gray-200" onClick={handleDownload}>
              Generate Full Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
