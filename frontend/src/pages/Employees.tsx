import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  Edit,
  Trash2,
  UserX,
  UserCheck,
  AlertCircle,
  Loader2,
  Calendar
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { employeeAPI, attendanceAPI, type Employee } from '@/services/api';
import { toast } from 'sonner';

interface Department {
  id: number;
  dept_name: string;
  location?: string;
  manager_name?: string;
  contact_number?: string;
}

interface EmployeeFormData {
  first_name: string;
  last_name: string;
  email: string;
  mobile_number: string;
  employee_code: string;
  dept: number | null;
}

export function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [showTodayOnly, setShowTodayOnly] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<EmployeeFormData>({
    first_name: '',
    last_name: '',
    email: '',
    mobile_number: '',
    employee_code: '',
    dept: null,
  });

  // Fetch employees, departments, and today's attendance
  useEffect(() => {
    fetchEmployeesAndDepartments();
    fetchTodayAttendance();
  }, []);

  const fetchTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const attendanceData = await attendanceAPI.getAll({ date: today });
      
      // Create a set of employee IDs who have attendance today
      const employeeIds = new Set(
        attendanceData.results
          .filter(record => record.sign_in_time)
          .map(record => record.employee)
      );
      
      setTodayAttendance(employeeIds);
    } catch (err) {
      console.warn('Could not fetch today\'s attendance:', err);
    }
  };

  const fetchEmployeesAndDepartments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch employees with department names included
      const employeeData = await employeeAPI.getAll();
      setEmployees(employeeData.results);
      
      // Extract unique departments from employee data
      const deptMap = new Map<number, Department>();
      employeeData.results.forEach(emp => {
        if (emp.dept && emp.department_name) {
          deptMap.set(emp.dept, {
            id: emp.dept,
            dept_name: emp.department_name,
          });
        }
      });
      
      // Get full department stats for complete list
      try {
        const stats = await employeeAPI.getStats();
        stats.by_department.forEach(dept => {
          const existingDept = Array.from(deptMap.values()).find(
            d => d.dept_name === dept.dept__dept_name
          );
          if (!existingDept && dept.dept__dept_name) {
            const empWithDept = employeeData.results.find(
              e => e.department_name === dept.dept__dept_name
            );
            if (empWithDept?.dept) {
              deptMap.set(empWithDept.dept, {
                id: empWithDept.dept,
                dept_name: dept.dept__dept_name,
              });
            }
          }
        });
      } catch (err) {
        console.warn('Could not fetch department stats:', err);
      }
      
      setDepartments(Array.from(deptMap.values()).sort((a, b) => 
        a.dept_name.localeCompare(b.dept_name)
      ));
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await employeeAPI.getAll();
      setEmployees(data.results);
      await fetchTodayAttendance(); // Refresh attendance data
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError(err instanceof Error ? err.message : 'Failed to load employees');
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    const matchesSearch = 
      fullName.includes(searchTerm.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (emp.department_name && emp.department_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDepartment = 
      selectedDepartment === 'all' || 
      (emp.dept !== null && emp.dept === parseInt(selectedDepartment));
    
    const matchesToday = !showTodayOnly || todayAttendance.has(emp.id);
    
    return matchesSearch && matchesDepartment && matchesToday;
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleDepartmentChange = (value: string) => {
    setFormData(prev => ({ ...prev, dept: parseInt(value) }));
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      mobile_number: '',
      employee_code: '',
      dept: null,
    });
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.first_name || !formData.last_name || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      await employeeAPI.create({
        ...formData,
        is_active: 1,
      });
      
      toast.success('Employee added successfully');
      setIsAddDialogOpen(false);
      resetForm();
      fetchEmployees();
    } catch (err) {
      console.error('Error adding employee:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to add employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEmployee) return;

    try {
      setSubmitting(true);
      await employeeAPI.update(selectedEmployee.id, formData);
      
      toast.success('Employee updated successfully');
      setIsEditDialogOpen(false);
      setSelectedEmployee(null);
      resetForm();
      fetchEmployees();
    } catch (err) {
      console.error('Error updating employee:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email || '',
      mobile_number: employee.mobile_number || '',
      employee_code: employee.employee_code,
      dept: employee.dept,
    });
    setIsEditDialogOpen(true);
  };

  const handleToggleStatus = async (employee: Employee) => {
    try {
      if (employee.is_active === 1) {
        await employeeAPI.deactivate(employee.id);
        toast.success(`${employee.first_name} ${employee.last_name} has been deactivated`);
      } else {
        await employeeAPI.activate(employee.id);
        toast.success(`${employee.first_name} ${employee.last_name} has been activated`);
      }
      fetchEmployees();
    } catch (err) {
      console.error('Error toggling employee status:', err);
      toast.error('Failed to update employee status');
    }
  };

  const handleDeleteEmployee = async (employee: Employee) => {
    if (!confirm(`Are you sure you want to delete ${employee.first_name} ${employee.last_name}?`)) {
      return;
    }

    try {
      await employeeAPI.delete(employee.id);
      toast.success('Employee deleted successfully');
      fetchEmployees();
    } catch (err) {
      console.error('Error deleting employee:', err);
      toast.error('Failed to delete employee');
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-lg text-gray-600">Loading employees...</p>
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
            <p className="text-sm font-medium text-red-800">Error loading employees</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={fetchEmployeesAndDepartments}
            className="border-red-300 text-red-600 hover:bg-red-100"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Employees</h2>
          <p className="text-gray-500 mt-1">Manage your workforce and view employee details</p>
        </div>
        
        {/* Add Employee Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
              <DialogDescription>
                Add a new employee to the system. They will receive login credentials via email.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddEmployee} className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input 
                  id="first_name" 
                  placeholder="Enter first name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input 
                  id="last_name" 
                  placeholder="Enter last name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email *</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mobile_number">Mobile Number</Label>
                <Input 
                  id="mobile_number" 
                  placeholder="Enter mobile number"
                  value={formData.mobile_number}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="employee_code">Employee Code</Label>
                <Input 
                  id="employee_code" 
                  placeholder="Auto-generated if left empty"
                  value={formData.employee_code}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dept">Department</Label>
                <Select onValueChange={handleDepartmentChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.dept_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                type="submit" 
                className="mt-4 bg-blue-600 hover:bg-blue-700"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Employee'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditEmployee} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input 
                id="first_name" 
                placeholder="Enter first name"
                value={formData.first_name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input 
                id="last_name" 
                placeholder="Enter last name"
                value={formData.last_name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="Enter email address"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mobile_number">Mobile Number</Label>
              <Input 
                id="mobile_number" 
                placeholder="Enter mobile number"
                value={formData.mobile_number}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="employee_code">Employee Code</Label>
              <Input 
                id="employee_code" 
                placeholder="Employee code"
                value={formData.employee_code}
                onChange={handleInputChange}
                disabled
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dept">Department</Label>
              <Select 
                value={formData.dept?.toString()} 
                onValueChange={handleDepartmentChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.dept_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              type="submit" 
              className="mt-4 bg-blue-600 hover:bg-blue-700"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Employee'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium text-gray-900">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input 
                placeholder="Search by name, email, code or department..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by department" />
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
            <Button 
              variant={showTodayOnly ? "default" : "outline"}
              onClick={() => setShowTodayOnly(!showTodayOnly)}
              className={showTodayOnly ? "bg-blue-600 hover:bg-blue-700" : "border-gray-200"}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Today's Attendance
              {showTodayOnly && (
                <Badge variant="secondary" className="ml-2 bg-white text-blue-600">
                  {filteredEmployees.length}
                </Badge>
              )}
            </Button>
          </div>
          {showTodayOnly && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <p className="text-sm text-blue-800">
                Showing employees who signed in today ({todayAttendance.size} total)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium text-gray-900">
            Employee List ({filteredEmployees.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-12">
              <UserX className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {showTodayOnly ? 'No employees signed in today' : 'No employees found'}
              </p>
              {searchTerm && (
                <p className="text-sm text-gray-400 mt-2">
                  Try adjusting your search or filters
                </p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {employee.first_name[0]}{employee.last_name[0]}
                          </div>
                          {todayAttendance.has(employee.id) && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" title="Signed in today" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {employee.full_name}
                          </p>
                          <p className="text-xs text-gray-500">{employee.employee_code}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {employee.department_name || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-600">
                        <p>{employee.email || 'N/A'}</p>
                        <p className="text-gray-400">{employee.mobile_number || 'N/A'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={employee.is_active === 1 ? "default" : "secondary"}
                        className={
                          employee.is_active === 1 
                            ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                            : 'bg-red-100 text-red-800 hover:bg-red-100'
                        }
                      >
                        {employee.is_active === 1 ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditClick(employee)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(employee)}>
                            {employee.is_active === 1 ? (
                              <>
                                <UserX className="w-4 h-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-4 h-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDeleteEmployee(employee)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
