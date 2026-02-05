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
import { attendanceAPI, employeeAPI, type Employee, type TrendData } from '@/services/api';
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
  const [reportType, setReportType] = useState<string>('attendance-summary');
  const [dateRange, setDateRange] = useState<string>('this-month');
  const [department, setDepartment] = useState<string>('all');
  const [exportFormat, setExportFormat] = useState<string>('pdf');
  
  const [departments] = useState<Department[]>(MOCK_DEPARTMENTS);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceTrend, setAttendanceTrend] = useState<TrendData[]>([]);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStat[]>([]);
  const [employeeReports, setEmployeeReports] = useState<EmployeeReport[]>([]);
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
  }, [dateRange, department]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch employees
      const employeeData = await employeeAPI.getActive();
      setEmployees(employeeData);

      // Fetch employee stats
      const empStats = await employeeAPI.getStats();

      // Fetch attendance trend
      const days = dateRange === 'this-week' ? 7 : 30;
      const trendData = await attendanceAPI.getTrend(days);
      setAttendanceTrend(trendData);

      // Fetch all attendance records for calculations
      const attendanceData = await attendanceAPI.getAll();
      const allRecords = attendanceData.results;

      // Calculate department-wise stats
      const deptStats: DepartmentStat[] = departments.map(dept => {
        const deptEmployees = employeeData.filter(emp => emp.dept === dept.id);
        const deptRecords = allRecords.filter(record => 
          deptEmployees.some(emp => emp.id === record.employee)
        );
        const presentRecords = deptRecords.filter(r => r.status === 'Present').length;
        const totalRecords = deptRecords.length;
        
        return {
          name: dept.dept_name,
          employees: deptEmployees.length,
          present: presentRecords,
          attendanceRate: totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0,
        };
      });
      setDepartmentStats(deptStats);

      // Calculate employee-wise reports
      const empReports: EmployeeReport[] = employeeData.slice(0, 10).map(emp => {
        const empRecords = allRecords.filter(r => r.employee === emp.id);
        const present = empRecords.filter(r => r.status === 'Present').length;
        const absent = empRecords.filter(r => r.status === 'Absent').length;
        const late = empRecords.filter(r => r.status === 'Late').length;
        const total = empRecords.length;
        
        const dept = departments.find(d => d.id === emp.dept);
        
        return {
          id: emp.id,
          name: emp.full_name,
          department: dept?.dept_name || 'N/A',
          daysPresent: present,
          daysAbsent: absent,
          lateDays: late,
          totalDays: total,
          attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
        };
      });
      setEmployeeReports(empReports);

      // Calculate summary stats
      const totalPresent = trendData.reduce((sum, day) => sum + day.present, 0);
      const totalRecordsCount = trendData.reduce((sum, day) => 
        sum + day.present + day.absent + day.late + day.on_leave, 0
      );
      const avgAttendance = totalRecordsCount > 0 
        ? Math.round((totalPresent / totalRecordsCount) * 100) 
        : 0;

      const totalOvertime = allRecords.reduce((sum, record) => 
        sum + (record.overtime || 0), 0
      );

      const leaveDays = allRecords.filter(r => r.status === 'On Leave').length;

      setSummaryStats({
        totalEmployees: empStats.active_employees,
        avgAttendance,
        totalOvertime: Math.round(totalOvertime),
        leaveDays,
      });

    } catch (err) {
      console.error('Error fetching report data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load report data');
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
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
          <h2 className="text-3xl font-bold text-gray-900">Reports</h2>
          <p className="text-gray-500 mt-1">Generate and download attendance reports</p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={handleDownload}
        >
          <Download className="w-4 h-4 mr-2" />
          Download Report
        </Button>
      </div>

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
                <SelectItem value="employee-attendance">Employee Attendance</SelectItem>
                <SelectItem value="department-analysis">Department Analysis</SelectItem>
                <SelectItem value="late-report">Late Report</SelectItem>
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
                Attendance Trend
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
                Department Attendance Rate
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Employees
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
              Average Attendance
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
              Total Overtime
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
              Leave Days
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
            Report Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-900">Employee</th>
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
