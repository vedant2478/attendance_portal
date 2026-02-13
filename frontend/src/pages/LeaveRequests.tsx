import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Check,
  X,
  Calendar,
  Clock,
  FileText,
  Loader2,
  AlertCircle,
  Eye,
  User as UserIcon
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';


interface LeaveRequest {
  id: number;
  user: number;
  user_name: string;
  user_email: string;
  employee: number | null;
  employee_name: string | null;
  employee_code: string | null;
  leave_type: string;
  leave_type_display: string;
  from_date: string;
  to_date: string;
  total_days: number;
  reason: string;
  status: string;
  status_display: string;
  approver: number | null;
  approver_name: string | null;
  approved_by: number | null;
  approved_by_name: string | null;
  approved_date: string | null;
  rejection_reason: string | null;
  attachment: string | null;
  comments: string | null;
  created_at: string;
  updated_at: string;
}


interface Approver {
  id: number;
  username: string;
  email: string;
  role: string;
  role_name: string;
  role_id: number;
}


type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';
type ViewMode = 'my-leaves' | 'pending-approvals';


interface LeaveFormData {
  leave_type: string;
  from_date: string;
  to_date: string;
  reason: string;
  approver: number | null;
}


export function LeaveRequests() {
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<LeaveRequest[]>([]);
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingApprovers, setLoadingApprovers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('my-leaves');
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isApproveRejectDialogOpen, setIsApproveRejectDialogOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [actionComments, setActionComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Form state
  const [formData, setFormData] = useState<LeaveFormData>({
    leave_type: '',
    from_date: '',
    to_date: '',
    reason: '',
    approver: null,
  });

  // Get current user from localStorage
  const getUserFromStorage = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return { id: 1, role_name: 'user', username: 'Guest' };

      const user = JSON.parse(userStr);
      return user;
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      return { id: 1, role_name: 'user', username: 'Guest' };
    }
  };

  const currentUser = getUserFromStorage();

  // Get role name
  const getUserRole = (): string => {
    if (currentUser.role_name) {
      return typeof currentUser.role_name === 'string' 
        ? currentUser.role_name.toLowerCase() 
        : 'user';
    }

    if (currentUser.role && typeof currentUser.role === 'object' && currentUser.role.role_name) {
      return currentUser.role.role_name.toLowerCase();
    }

    if (currentUser.role && typeof currentUser.role === 'string') {
      return currentUser.role.toLowerCase();
    }

    return 'user';
  };

  const userRole = getUserRole();
  const isApprover = ['admin', 'hr', 'manager'].includes(userRole);

  console.log('Current User:', currentUser);
  console.log('User Role:', userRole);
  console.log('Is Approver:', isApprover);

  useEffect(() => {
    fetchMyLeaves();
    if (isApprover) {
      fetchPendingApprovals();
    }
    fetchApprovers();
  }, []);

  // Set default view based on user role
  useEffect(() => {
    if (isApprover) {
      setViewMode('pending-approvals');
    } else {
      setViewMode('my-leaves');
    }
  }, [isApprover]);

  const fetchMyLeaves = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `http://127.0.0.1:8000/api/leave-requests/my_leaves/?user_id=${currentUser.id}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch leave requests');
      }

      const result = await response.json();

      if (result.success) {
        setMyLeaves(result.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching my leaves:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leave requests');
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingApprovals = async () => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/leave-requests/pending_approvals/?user_id=${currentUser.id}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch pending approvals');
      }

      const result = await response.json();

      if (result.success) {
        setPendingApprovals(result.data);
      }
    } catch (err) {
      console.error('Error fetching pending approvals:', err);
      toast.error('Failed to load pending approvals');
    }
  };

  const fetchApprovers = async () => {
    try {
      setLoadingApprovers(true);
      const response = await fetch(
        'http://127.0.0.1:8000/api/leave-requests/approvers_list/',
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch approvers');
      }

      const result = await response.json();

      if (result.success) {
        setApprovers(result.data);
        console.log('Approvers loaded:', result.data);
      } else {
        throw new Error(result.error || 'Failed to load approvers');
      }
    } catch (err) {
      console.error('Error fetching approvers:', err);
      toast.error('Failed to load approvers list');
    } finally {
      setLoadingApprovers(false);
    }
  };

  const getCurrentLeaveList = () => {
    if (!isApprover) {
      return myLeaves;
    }
    return viewMode === 'my-leaves' ? myLeaves : pendingApprovals;
  };

  const currentLeaveList = getCurrentLeaveList();

  const filteredRequests = currentLeaveList.filter(request => {
    const matchesSearch = 
      request.leave_type_display.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (request.user_name && request.user_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (request.employee_name && request.employee_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'rejected':
        return 'bg-red-100 text-red-800 hover:bg-red-100';
      case 'pending':
        return 'bg-amber-100 text-amber-800 hover:bg-amber-100';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      leave_type: '',
      from_date: '',
      to_date: '',
      reason: '',
      approver: null,
    });
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.leave_type || !formData.from_date || !formData.to_date || !formData.reason || !formData.approver) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate dates
    const fromDate = new Date(formData.from_date);
    const toDate = new Date(formData.to_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (fromDate < today) {
      toast.error('Start date cannot be in the past');
      return;
    }

    if (toDate < fromDate) {
      toast.error('End date must be after or equal to start date');
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch('http://127.0.0.1:8000/api/leave-requests/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: currentUser.id,
          leave_type: formData.leave_type,
          from_date: formData.from_date,
          to_date: formData.to_date,
          reason: formData.reason,
          approver: formData.approver,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(result.message || 'Leave request submitted successfully');
        setIsApplyDialogOpen(false);
        resetForm();
        fetchMyLeaves();
        if (isApprover) {
          fetchPendingApprovals();
        }
      } else {
        if (result.errors) {
          const errorMessages = Object.entries(result.errors)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('\n');
          toast.error(errorMessages);
        } else {
          toast.error(result.error || 'Failed to submit leave request');
        }
      }
    } catch (err) {
      console.error('Error submitting leave request:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetails = (request: LeaveRequest) => {
    setSelectedLeave(request);
    setIsViewDialogOpen(true);
  };

  const handleOpenApproveReject = (request: LeaveRequest, action: 'approve' | 'reject') => {
    setSelectedLeave(request);
    setActionType(action);
    setActionComments('');
    setRejectionReason('');
    setIsApproveRejectDialogOpen(true);
  };

  const handleApproveReject = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLeave) {
      toast.error('No leave request selected');
      return;
    }

    // Validation for rejection
    if (actionType === 'reject' && !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    // Confirm action
    const confirmMessage = actionType === 'approve' 
      ? `Are you sure you want to approve this ${selectedLeave.total_days}-day ${selectedLeave.leave_type_display} request from ${selectedLeave.employee_name || selectedLeave.user_name}?`
      : `Are you sure you want to reject this leave request?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setSubmitting(true);

      const requestBody: any = {
        approver_id: currentUser.id,
        action: actionType,
        comments: actionComments.trim(),
      };

      if (actionType === 'reject') {
        requestBody.rejection_reason = rejectionReason.trim();
      }

      console.log('Submitting approval/rejection:', {
        leaveId: selectedLeave.id,
        action: actionType,
        approverId: currentUser.id,
      });

      const response = await fetch(
        `http://127.0.0.1:8000/api/leave-requests/${selectedLeave.id}/approve_reject/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      const result = await response.json();
      console.log('Approval/Rejection response:', result);

      if (response.ok && result.success) {
        // Success - show detailed message
        const successMessage = actionType === 'approve'
          ? `✅ Leave request approved successfully for ${selectedLeave.employee_name || selectedLeave.user_name}`
          : `❌ Leave request rejected`;

        toast.success(successMessage);

        // Close dialog
        setIsApproveRejectDialogOpen(false);

        // Reset form
        setActionComments('');
        setRejectionReason('');
        setSelectedLeave(null);

        // Refresh both lists
        await Promise.all([
          fetchPendingApprovals(),
          fetchMyLeaves()
        ]);

      } else {
        // Handle specific error cases
        if (response.status === 403) {
          toast.error('⚠️ You are not authorized to approve/reject this leave request');
        } else if (response.status === 400 && result.error?.includes('already')) {
          toast.error(`⚠️ ${result.error}`);
        } else if (result.errors) {
          // Validation errors
          const errorMessages = Object.entries(result.errors)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('\n');
          toast.error('Validation Error: ' + errorMessages);
        } else {
          toast.error(result.error || `Failed to ${actionType} leave request`);
        }
      }
    } catch (err) {
      console.error(`Error ${actionType}ing leave request:`, err);
      toast.error(`Network Error: Failed to ${actionType} leave request. Please check your connection.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelLeave = async (leaveId: number) => {
    if (!confirm('Are you sure you want to cancel this leave request?')) {
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/leave-requests/${leaveId}/cancel/`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(result.message || 'Leave request cancelled successfully');
        fetchMyLeaves();
      } else {
        toast.error(result.error || 'Failed to cancel leave request');
      }
    } catch (err) {
      console.error('Error cancelling leave request:', err);
      toast.error('Failed to cancel leave request');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const refreshData = () => {
    fetchMyLeaves();
    if (isApprover) {
      fetchPendingApprovals();
    }
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
            onClick={refreshData}
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
          <p className="text-gray-500 mt-1">
            {isApprover 
              ? `Viewing: ${viewMode === 'pending-approvals' ? 'Pending Approvals from Team' : 'Your Leave Requests'}`
              : 'View and manage your leave applications'}
          </p>
        </div>

        <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Apply Leave
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
              <DialogDescription>
                Submit a new leave request for approval
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleApplyLeave} className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="leave_type">Leave Type *</Label>
                <Select value={formData.leave_type} onValueChange={(value) => handleSelectChange('leave_type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sick">🤒 Sick Leave</SelectItem>
                    <SelectItem value="casual">😊 Casual Leave</SelectItem>
                    <SelectItem value="annual">🌴 Annual Leave</SelectItem>
                    <SelectItem value="maternity">👶 Maternity Leave</SelectItem>
                    <SelectItem value="paternity">👨‍👦 Paternity Leave</SelectItem>
                    <SelectItem value="unpaid">💰 Unpaid Leave</SelectItem>
                    <SelectItem value="compensatory">⏰ Compensatory Off</SelectItem>
                    <SelectItem value="emergency">🚨 Emergency Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="from_date">From Date *</Label>
                  <Input 
                    id="from_date" 
                    type="date" 
                    value={formData.from_date}
                    onChange={handleInputChange}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="to_date">To Date *</Label>
                  <Input 
                    id="to_date" 
                    type="date" 
                    value={formData.to_date}
                    onChange={handleInputChange}
                    min={formData.from_date || new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="approver">Select Approver *</Label>
                {loadingApprovers ? (
                  <div className="flex items-center justify-center p-4 border rounded-md">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span className="text-sm text-gray-500">Loading approvers...</span>
                  </div>
                ) : approvers.length === 0 ? (
                  <div className="p-4 border border-amber-200 bg-amber-50 rounded-md">
                    <p className="text-sm text-amber-800">⚠️ No approvers available. Please contact administrator.</p>
                  </div>
                ) : (
                  <Select value={formData.approver?.toString() || ''} onValueChange={(value) => setFormData(prev => ({ ...prev, approver: parseInt(value) }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose who will approve your leave" />
                    </SelectTrigger>
                    <SelectContent>
                      {approvers.map(approver => (
                        <SelectItem key={approver.id} value={approver.id.toString()}>
                          <div className="flex items-center gap-2">
                            <UserIcon className="w-4 h-4" />
                            <span className="font-medium">{approver.username}</span>
                            <span className="text-xs text-gray-500">({approver.role_name})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {approvers.length > 0 && `${approvers.length} approver(s) available`}
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reason">Reason for Leave *</Label>
                <Textarea 
                  id="reason" 
                  placeholder="Please provide a detailed reason for your leave request..."
                  rows={4}
                  value={formData.reason}
                  onChange={handleInputChange}
                  required
                  maxLength={500}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500">
                  {formData.reason.length}/500 characters
                </p>
              </div>

              {/* Days calculation */}
              {formData.from_date && formData.to_date && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-800">
                    📅 Total Days: <strong>
                      {(() => {
                        const from = new Date(formData.from_date);
                        const to = new Date(formData.to_date);
                        const days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                        return days;
                      })()}
                    </strong> day(s)
                  </p>
                </div>
              )}

              <Button 
                type="submit" 
                className="mt-2 bg-blue-600 hover:bg-blue-700"
                disabled={submitting || approvers.length === 0}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting Request...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Submit Leave Request
                  </>
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">My Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-gray-900">{myLeaves.length}</span>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">
              {isApprover ? 'Pending Approvals' : 'My Pending'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-amber-600">
                {isApprover ? pendingApprovals.length : myLeaves.filter(r => r.status === 'pending').length}
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
                {myLeaves.filter(r => r.status === 'approved').length}
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
                {myLeaves.filter(r => r.status === 'rejected').length}
              </span>
              <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                <X className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Admins only */}
      {isApprover && (
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)} className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="pending-approvals">
              Pending Approvals ({pendingApprovals.length})
            </TabsTrigger>
            <TabsTrigger value="my-leaves">
              My Leaves ({myLeaves.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium text-gray-900">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input 
              placeholder="Search by leave type, employee, or reason..." 
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
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Leave Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium text-gray-900">
            {!isApprover 
              ? `My Leave Requests (${filteredRequests.length})`
              : viewMode === 'my-leaves' 
                ? `My Leave Requests (${filteredRequests.length})`
                : `Team Pending Approvals (${filteredRequests.length})`
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No leave requests found</p>
              <p className="text-sm text-gray-400 mt-2">
                {!isApprover || viewMode === 'my-leaves'
                  ? 'Click "Apply Leave" to submit a new request' 
                  : 'No pending approvals at the moment'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isApprover && viewMode === 'pending-approvals' && <TableHead>Employee</TableHead>}
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Days</TableHead>
                    {(!isApprover || viewMode === 'my-leaves') && <TableHead>Approver</TableHead>}
                    <TableHead>Status</TableHead>
                    <TableHead>Applied On</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id} className="hover:bg-gray-50">
                      {isApprover && viewMode === 'pending-approvals' && (
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                              {request.employee_name 
                                ? request.employee_name.split(' ').map(n => n[0]).join('').toUpperCase()
                                : request.user_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {request.employee_name || request.user_name}
                              </p>
                              <p className="text-xs text-gray-500">{request.employee_code || request.user_email}</p>
                            </div>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <span className="text-sm font-medium text-gray-900">{request.leave_type_display}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {formatDate(request.from_date)} - {formatDate(request.to_date)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{request.total_days} day(s)</span>
                      </TableCell>
                      {(!isApprover || viewMode === 'my-leaves') && (
                        <TableCell>
                          <span className="text-sm text-gray-600">{request.approver_name || 'Not assigned'}</span>
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge className={getStatusBadgeVariant(request.status)}>
                          {request.status_display}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {formatDate(request.created_at)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => handleViewDetails(request)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {isApprover && viewMode === 'pending-approvals' && request.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleOpenApproveReject(request, 'approve')}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleOpenApproveReject(request, 'reject')}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {(!isApprover || viewMode === 'my-leaves') && request.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleCancelLeave(request.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve/Reject Dialog - ENHANCED VERSION */}
      <Dialog open={isApproveRejectDialogOpen} onOpenChange={setIsApproveRejectDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'approve' ? (
                <>
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                  <span>Approve Leave Request</span>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <X className="w-5 h-5 text-red-600" />
                  </div>
                  <span>Reject Leave Request</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' 
                ? 'Review and approve this leave request' 
                : 'Provide a reason for rejecting this leave request'}
            </DialogDescription>
          </DialogHeader>
          {selectedLeave && (
            <form onSubmit={handleApproveReject} className="space-y-4 py-4">
              {/* Leave Request Summary */}
              <div className={`p-4 rounded-lg border-2 $"{
                actionType === 'approve' 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                      {selectedLeave.employee_name 
                        ? selectedLeave.employee_name.split(' ').map(n => n[0]).join('').toUpperCase()
                        : selectedLeave.user_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {selectedLeave.employee_name || selectedLeave.user_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {selectedLeave.employee_code || selectedLeave.user_email}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200">
                    <div>
                      <p className="text-xs text-gray-500">Leave Type</p>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedLeave.leave_type_display}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Duration</p>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedLeave.total_days} day(s)
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <p className="text-xs text-gray-500">Dates</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(selectedLeave.from_date)} → {formatDate(selectedLeave.to_date)}
                    </p>
                  </div>

                  <div className="pt-2">
                    <p className="text-xs text-gray-500 mb-1">Reason</p>
                    <div className="bg-white p-2 rounded text-sm text-gray-700 max-h-20 overflow-y-auto">
                      {selectedLeave.reason}
                    </div>
                  </div>
                </div>
              </div>

              {/* Rejection Reason (Required for Reject) */}
              {actionType === 'reject' && (
                <div className="grid gap-2">
                  <Label htmlFor="rejection_reason" className="flex items-center gap-1">
                    Rejection Reason <span className="text-red-500">*</span>
                  </Label>
                  <Textarea 
                    id="rejection_reason" 
                    placeholder="Please provide a clear reason for rejection (required)..."
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    required
                    className="resize-none"
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500">
                    {rejectionReason.length}/500 characters
                  </p>
                </div>
              )}

              {/* Optional Comments */}
              <div className="grid gap-2">
                <Label htmlFor="action_comments" className="flex items-center gap-1">
                  Additional Comments {actionType === 'approve' && '(Optional)'}
                </Label>
                <Textarea 
                  id="action_comments" 
                  placeholder={actionType === 'approve' 
                    ? "Add any additional notes (e.g., 'Have a great vacation!')..." 
                    : "Add any additional context or guidance..."
                  }
                  rows={2}
                  value={actionComments}
                  onChange={(e) => setActionComments(e.target.value)}
                  className="resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500">
                  {actionComments.length}/500 characters
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-2 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsApproveRejectDialogOpen(false);
                    setActionComments('');
                    setRejectionReason('');
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className={actionType === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                  }
                  disabled={submitting || (actionType === 'reject' && !rejectionReason.trim())}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {actionType === 'approve' ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Approve Leave
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4 mr-2" />
                          Reject Leave
                        </>
                      )}
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Leave Request Details</DialogTitle>
          </DialogHeader>
          {selectedLeave && (
            <div className="space-y-4 py-4">
              {isApprover && viewMode === 'pending-approvals' && (
                <div>
                  <Label className="text-sm text-gray-500">Employee</Label>
                  <p className="text-sm font-medium">{selectedLeave.employee_name || selectedLeave.user_name}</p>
                  <p className="text-xs text-gray-500">{selectedLeave.employee_code || selectedLeave.user_email}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500">Leave Type</Label>
                  <p className="text-sm font-medium">{selectedLeave.leave_type_display}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Status</Label>
                  <div className="mt-1">
                    <Badge className={getStatusBadgeVariant(selectedLeave.status)}>
                      {selectedLeave.status_display}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500">From Date</Label>
                  <p className="text-sm font-medium">{formatDate(selectedLeave.from_date)}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">To Date</Label>
                  <p className="text-sm font-medium">{formatDate(selectedLeave.to_date)}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm text-gray-500">Total Days</Label>
                <p className="text-sm font-medium">{selectedLeave.total_days} day(s)</p>
              </div>

              <div>
                <Label className="text-sm text-gray-500">Approver</Label>
                <p className="text-sm font-medium">{selectedLeave.approver_name || 'Not assigned'}</p>
              </div>

              <div>
                <Label className="text-sm text-gray-500">Reason</Label>
                <p className="text-sm text-gray-700 mt-1 bg-gray-50 p-3 rounded-md">{selectedLeave.reason}</p>
              </div>

              {selectedLeave.status === 'approved' && selectedLeave.approved_by_name && (
                <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                  <Label className="text-sm text-green-800 font-semibold">Approved By</Label>
                  <p className="text-sm font-medium text-green-900 mt-1">{selectedLeave.approved_by_name}</p>
                  {selectedLeave.approved_date && (
                    <p className="text-xs text-green-600 mt-1">on {formatDate(selectedLeave.approved_date)}</p>
                  )}
                  {selectedLeave.comments && (
                    <>
                      <Label className="text-sm text-green-800 mt-2 block">Comments</Label>
                      <p className="text-sm text-green-700 mt-1">{selectedLeave.comments}</p>
                    </>
                  )}
                </div>
              )}

              {selectedLeave.status === 'rejected' && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                  <Label className="text-sm text-red-800 font-semibold">Rejected By</Label>
                  <p className="text-sm font-medium text-red-900 mt-1">{selectedLeave.approved_by_name}</p>
                  {selectedLeave.approved_date && (
                    <p className="text-xs text-red-600 mt-1">on {formatDate(selectedLeave.approved_date)}</p>
                  )}
                  {selectedLeave.rejection_reason && (
                    <>
                      <Label className="text-sm text-red-800 mt-2 block">Rejection Reason</Label>
                      <p className="text-sm text-red-700 mt-1 bg-red-100 p-2 rounded">{selectedLeave.rejection_reason}</p>
                    </>
                  )}
                  {selectedLeave.comments && (
                    <>
                      <Label className="text-sm text-red-800 mt-2 block">Additional Comments</Label>
                      <p className="text-sm text-red-700 mt-1">{selectedLeave.comments}</p>
                    </>
                  )}
                </div>
              )}

              <div className="text-xs text-gray-500 pt-2 border-t">
                <p>Applied on: {formatDate(selectedLeave.created_at)}</p>
                {selectedLeave.updated_at !== selectedLeave.created_at && (
                  <p>Last updated: {formatDate(selectedLeave.updated_at)}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
