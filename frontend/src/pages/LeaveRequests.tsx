import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter,
  Check,
  X,
  Calendar,
  Clock,
  FileText,
  Loader2,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { employeeAPI, type Employee } from '@/services/api';
import { toast } from 'sonner';

interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  status: string;
  createdAt?: string;
}

type StatusFilter = 'all' | 'Pending' | 'Approved' | 'Rejected';

// Mock leave requests - replace with API when ready
const MOCK_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: '1',
    employeeId: '1',
    leaveType: 'Sick Leave',
    fromDate: '2026-02-05',
    toDate: '2026-02-07',
    totalDays: 3,
    reason: 'Medical appointment',
    status: 'Pending',
    createdAt: '2026-02-03',
  },
  {
    id: '2',
    employeeId: '2',
    leaveType: 'Annual Leave',
    fromDate: '2026-02-10',
    toDate: '2026-02-14',
    totalDays: 5,
    reason: 'Family vacation',
    status: 'Approved',
    createdAt: '2026-02-01',
  },
  {
    id: '3',
    employeeId: '3',
    leaveType: 'Casual Leave',
    fromDate: '2026-02-06',
    toDate: '2026-02-06',
    totalDays: 1,
    reason: 'Personal work',
    status: 'Rejected',
    createdAt: '2026-02-02',
  },
];

export function LeaveRequests() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(MOCK_LEAVE_REQUESTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);

  // Fetch employees
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await employeeAPI.getActive();
      setEmployees(data);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError(err instanceof Error ? err.message : 'Failed to load employees');
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = leaveRequests.filter(request => {
    const employee = employees.find(emp => emp.id === Number(request.employeeId));
    const matchesSearch = employee && (
      employee.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employee_code.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === Number(employeeId));
    return employee ? employee.full_name : 'Unknown';
  };

  const getEmployeeCode = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === Number(employeeId));
    return employee?.employee_code || 'N/A';
  };

  const getEmployeeInitials = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === Number(employeeId));
    if (!employee) return '??';
    return `${employee.first_name[0]}${employee.last_name[0]}`.toUpperCase();
  };

  const getStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'Rejected':
        return 'bg-red-100 text-red-800 hover:bg-red-100';
      case 'Pending':
        return 'bg-amber-100 text-amber-800 hover:bg-amber-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  const handleApprove = (request: LeaveRequest) => {
    // Update the status locally (will be replaced with API call)
    setLeaveRequests(prev => 
      prev.map(req => req.id === request.id ? { ...req, status: 'Approved' } : req)
    );
    toast.success(`Leave request approved for ${getEmployeeName(request.employeeId)}`);
  };

  const handleReject = (request: LeaveRequest) => {
    // Update the status locally (will be replaced with API call)
    setLeaveRequests(prev => 
      prev.map(req => req.id === request.id ? { ...req, status: 'Rejected' } : req)
    );
    toast.error(`Leave request rejected for ${getEmployeeName(request.employeeId)}`);
  };

  const handleApplyLeave = () => {
    toast.success('Leave application submitted successfully');
    setIsApplyDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-lg text-gray-600">Loading leave requests...</p>
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
            onClick={fetchEmployees}
            className="border-red-300 text-red-600 hover:bg-red-100"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Leave Requests</h2>
          <p className="text-gray-500 mt-1">Manage and track employee leave requests</p>
        </div>
        <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Apply Leave
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
              <DialogDescription>
                Submit a new leave request for approval
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="leaveType">Leave Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sick">Sick Leave</SelectItem>
                    <SelectItem value="casual">Casual Leave</SelectItem>
                    <SelectItem value="annual">Annual Leave</SelectItem>
                    <SelectItem value="maternity">Maternity Leave</SelectItem>
                    <SelectItem value="paternity">Paternity Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="fromDate">From Date</Label>
                  <Input id="fromDate" type="date" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="toDate">To Date</Label>
                  <Input id="toDate" type="date" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea 
                  id="reason" 
                  placeholder="Enter reason for leave..."
                  rows={3}
                />
              </div>
              <Button 
                type="submit" 
                className="mt-4 bg-blue-600 hover:bg-blue-700"
                onClick={handleApplyLeave}
              >
                Submit Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-gray-900">{leaveRequests.length}</span>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-amber-600">
                {leaveRequests.filter(r => r.status === 'Pending').length}
              </span>
              <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-green-600">
                {leaveRequests.filter(r => r.status === 'Approved').length}
              </span>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-red-600">
                {leaveRequests.filter(r => r.status === 'Rejected').length}
              </span>
              <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                <X className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
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
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="border-gray-200">
            <Filter className="w-4 h-4 mr-2" />
            More Filters
          </Button>
        </CardContent>
      </Card>

      {/* Leave Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium text-gray-900">
            Leave Requests ({filteredRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No leave requests found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Date Range</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {getEmployeeInitials(request.employeeId)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{getEmployeeName(request.employeeId)}</p>
                          <p className="text-xs text-gray-500">{getEmployeeCode(request.employeeId)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">{request.leaveType}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {new Date(request.fromDate).toLocaleDateString()} - {new Date(request.toDate).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">{request.totalDays} day(s)</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeVariant(request.status)}>
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : '--'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {request.status === 'Pending' && (
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleApprove(request)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleReject(request)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
