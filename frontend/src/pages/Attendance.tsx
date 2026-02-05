import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Search, 
  Filter,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw
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
import { attendanceAPI, employeeAPI, type AttendanceRecord, type Employee } from '@/services/api';
import { toast } from 'sonner';

type ViewMode = 'records' | 'logs';

export function Attendance() {
  const [viewMode, setViewMode] = useState<ViewMode>('records');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Fetch data from API
  useEffect(() => {
    fetchData();
  }, [selectedDate, selectedStatus]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch employees
      const employeeData = await employeeAPI.getActive();
      setEmployees(employeeData);

      // Build attendance query params
      const params: any = {};
      if (selectedDate) {
        params.date = selectedDate;
      }
      if (selectedStatus !== 'all') {
        params.status = selectedStatus;
      }

      // Fetch attendance records
      const attendanceData = await attendanceAPI.getAll(params);
      setAttendanceRecords(attendanceData.results);

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load attendance data');
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = attendanceRecords.filter(record => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      record.employee_name?.toLowerCase().includes(searchLower) ||
      record.employee_code?.toLowerCase().includes(searchLower)
    );
  });

  const getEmployeeName = (employeeId: number) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? employee.full_name : 'Unknown';
  };

  const getEmployeeCode = (employeeId: number) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee?.employee_code || 'N/A';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getStatusIcon = (status?: string | null) => {
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

  const getStatusBadgeVariant = (status?: string | null) => {
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

  const formatTime = (time: string | null) => {
    if (!time) return '--:--';
    return time.substring(0, 5);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatHours = (hours: number | null) => {
    if (!hours) return '--';
    return `${hours.toFixed(1)}h`;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-lg text-gray-600">Loading attendance data...</p>
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
            <p className="text-sm font-medium text-red-800">Error loading attendance</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={fetchData}
            className="border-red-300 text-red-600 hover:bg-red-100"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Attendance</h2>
          <p className="text-gray-500 mt-1">View and manage attendance records</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="border-gray-200"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>

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
              placeholder="Search employee by name or code..." 
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
            {filteredRecords.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No attendance records found</p>
                <p className="text-sm text-gray-400 mt-2">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
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
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                              {record.employee_name 
                                ? getInitials(record.employee_name)
                                : getInitials(getEmployeeName(record.employee))
                              }
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {record.employee_name || getEmployeeName(record.employee)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {record.employee_code || getEmployeeCode(record.employee)}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {formatDate(record.date)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {formatTime(record.sign_in_time)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {formatTime(record.sign_out_time)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {formatHours(record.total_hours)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {formatHours(record.overtime)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeVariant(record.status)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(record.status)}
                              {record.status || 'Unknown'}
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
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Attendance Logs View */}
      {viewMode === 'logs' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium text-gray-900">
              Real-time Attendance Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Real-time attendance logs would be displayed here</p>
              <p className="text-sm text-gray-400 mt-2">Connected to biometric devices for live data</p>
              <Button className="mt-6 bg-blue-600 hover:bg-blue-700">
                <Clock className="w-4 h-4 mr-2" />
                View Live Feed
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
