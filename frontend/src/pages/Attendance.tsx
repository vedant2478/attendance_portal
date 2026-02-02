import { useState } from 'react';
import { 
  Calendar, 
  Search, 
  Filter,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AttendanceRecord, Employee } from '@/types';

interface AttendanceProps {
  attendanceRecords: AttendanceRecord[];
  employees: Employee[];
}

type ViewMode = 'records' | 'logs';

export function Attendance({ attendanceRecords, employees }: AttendanceProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('records');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const filteredRecords = attendanceRecords.filter(record => {
    const employee = employees.find(emp => emp.id === record.employeeId);
    const matchesSearch = employee && (
      employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesStatus = selectedStatus === 'all' || record.status === selectedStatus;
    const matchesDate = selectedDate === '' || record.date === selectedDate;
    return matchesSearch && matchesStatus && matchesDate;
  });

  const getEmployeeName = (employeeId: number) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown';
  };

  const getEmployeeCode = (employeeId: number) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee?.employeeCode || 'N/A';
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'Present':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'Absent':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'Late':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case 'On Leave':
        return <Calendar className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case 'Present':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'Absent':
        return 'bg-red-100 text-red-800 hover:bg-red-100';
      case 'Late':
        return 'bg-amber-100 text-amber-800 hover:bg-amber-100';
      case 'On Leave':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Attendance</h2>
          <p className="text-gray-500 mt-1">View and manage attendance records</p>
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <Button
            variant={viewMode === 'records' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('records')}
            className={viewMode === 'records' ? 'bg-white shadow-sm' : ''}
          >
            Records
          </Button>
          <Button
            variant={viewMode === 'logs' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('logs')}
            className={viewMode === 'logs' ? 'bg-white shadow-sm' : ''}
          >
            Logs
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium text-gray-900">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input 
              placeholder="Search employee..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Present">Present</SelectItem>
              <SelectItem value="Absent">Absent</SelectItem>
              <SelectItem value="Late">Late</SelectItem>
              <SelectItem value="On Leave">On Leave</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <Input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:w-48"
            />
          </div>
          <Button variant="outline" className="border-gray-200">
            <Filter className="w-4 h-4 mr-2" />
            More Filters
          </Button>
        </CardContent>
      </Card>

      {/* Attendance Records Table */}
      {viewMode === 'records' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium text-gray-900">
              Attendance Records ({filteredRecords.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Sign In</TableHead>
                  <TableHead>Sign Out</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>Overtime</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {getEmployeeName(record.employeeId).split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{getEmployeeName(record.employeeId)}</p>
                          <p className="text-xs text-gray-500">{getEmployeeCode(record.employeeId)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {record.signInTime ? record.signInTime.substring(0, 5) : '--:--'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {record.signOutTime ? record.signOutTime.substring(0, 5) : '--:--'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {record.totalHours ? `${record.totalHours}h` : '--'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {record.overtime ? `${record.overtime}h` : '--'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeVariant(record.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(record.status)}
                          {record.status}
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {record.remarks || '--'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Attendance Logs View */}
      {viewMode === 'logs' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium text-gray-900">
              Attendance Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Real-time attendance logs would be displayed here</p>
              <p className="text-sm text-gray-400 mt-2">Connected to biometric devices for live data</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
