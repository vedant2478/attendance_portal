import { useState } from 'react';
import { 
  Download, 
  FileText, 
  Calendar,
  BarChart3,
  Users,
  Clock,
  UserCheck
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
import type { Employee, AttendanceRecord, Department } from '@/types';
import { attendanceTrend } from '@/data/mockData';

interface ReportsProps {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  departments: Department[];
}

export function Reports({ employees, attendanceRecords, departments }: ReportsProps) {
  const [reportType, setReportType] = useState<string>('attendance-summary');
  const [dateRange, setDateRange] = useState<string>('this-month');
  const [department, setDepartment] = useState<string>('all');

  // Calculate department-wise attendance
  const departmentStats = departments.map(dept => {
    const deptEmployees = employees.filter(emp => emp.deptId === dept.id);
    const deptRecords = attendanceRecords.filter(record => 
      deptEmployees.some(emp => emp.id === record.employeeId)
    );
    const presentRecords = deptRecords.filter(r => r.status === 'Present').length;
    const totalRecords = deptRecords.length;
    
    return {
      name: dept.deptName,
      employees: deptEmployees.length,
      present: presentRecords,
      attendanceRate: totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0,
    };
  });

  const handleDownload = () => {
    // In a real app, this would generate and download a report
    alert('Report download functionality would be implemented here');
  };

  return (
    <div className="p-6 space-y-6">
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
                    {dept.deptName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Format</Label>
            <Select defaultValue="pdf">
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
                      name === 'absent' ? 'Absent' : 'Late'
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
            <span className="text-3xl font-bold text-gray-900">{employees.length}</span>
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
            <span className="text-3xl font-bold text-green-600">87%</span>
            <p className="text-xs text-green-600 mt-1">+3% from last month</p>
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
            <span className="text-3xl font-bold text-amber-600">142h</span>
            <p className="text-xs text-amber-600 mt-1">This month</p>
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
            <span className="text-3xl font-bold text-blue-600">24</span>
            <p className="text-xs text-blue-600 mt-1">Approved this month</p>
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
                {employees.slice(0, 5).map((employee) => {
                  const dept = departments.find(d => d.id === employee.deptId);
                  const empRecords = attendanceRecords.filter(r => r.employeeId === employee.id);
                  const present = empRecords.filter(r => r.status === 'Present').length;
                  const absent = empRecords.filter(r => r.status === 'Absent').length;
                  const late = empRecords.filter(r => r.status === 'Late').length;
                  const total = empRecords.length;
                  const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;
                  
                  return (
                    <tr key={employee.id} className="border-b border-gray-100">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                            {employee.firstName[0]}{employee.lastName[0]}
                          </div>
                          <span className="text-sm text-gray-900">{employee.firstName} {employee.lastName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{dept?.deptName || 'N/A'}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{present}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{absent}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{late}</td>
                      <td className="py-3 px-4">
                        <span className={`text-sm font-medium ${
                          attendanceRate >= 90 ? 'text-green-600' : 
                          attendanceRate >= 80 ? 'text-amber-600' : 
                          'text-red-600'
                        }`}>
                          {attendanceRate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-center">
            <Button variant="outline" className="border-gray-200">
              Generate Full Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
