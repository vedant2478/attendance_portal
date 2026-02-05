// const API_BASE_URL = 'http://localhost:8000/api';
const API_BASE_URL = 'http://192.168.1.83:8000/api';  // ✅ Replace with YOUR IP


// ==================== INTERFACES ====================

interface AttendanceRecord {
  id: number;
  employee: number;
  employee_name?: string;
  employee_code?: string;
  date: string;
  shift: number | null;
  shift_name?: string;
  sign_in_time: string | null;
  sign_out_time: string | null;
  total_hours: number | null;
  overtime: number | null;
  status: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

interface AttendanceStats {
  present: number;
  absent: number;
  late: number;
  on_leave: number;
  total_records: number;
}

interface TrendData {
  date: string;
  present: number;
  absent: number;
  late: number;
  on_leave: number;
}

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  mobile_number: string;
  employee_code: string;
  dept: number | null;
  department_name: string;
  photo_path: string | null;
  user: number | null;
  username: string;
  is_active: number;
  validity_from: string | null;
  validity_to: string | null;
  created_at: string;
  updated_at: string;
}

interface EmployeeStats {
  total_employees: number;
  active_employees: number;
  inactive_employees: number;
  by_department: Array<{ dept__dept_name: string; count: number }>;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

interface User {
  id: number;
  username: string;
  email: string;
  role: number;
  role_name: string;
  is_active: number;
  last_login_date: string | null;
  created_at: string;
}

interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
}

interface LoginData {
  username: string;
  password: string;
}


// ==================== HELPER FUNCTIONS ====================

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

const handleResponse = async (response: Response) => {
  if (response.status === 401) {
    // Token expired or invalid - redirect to login
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Authentication required');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || error.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};


// ==================== AUTHENTICATION API ====================

export const authAPI = {
  // Register new user
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/register/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    const result = await handleResponse(response);
    
    // Store token and user data
    if (result.token) {
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
    }
    
    return result;
  },

  // Login user
  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    const result = await handleResponse(response);
    
    // Store token and user data
    if (result.token) {
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
    }
    
    return result;
  },

  // Logout user
  logout: async (): Promise<void> => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout/`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } finally {
      // Clear local storage regardless of API response
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  // Get current user
  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('token');
  },
};


// ==================== ATTENDANCE API ====================

export const attendanceAPI = {
  // Get all attendance records
  getAll: async (params?: {
    employee?: number;
    date?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
    shift?: number;
    page?: number;
  }): Promise<PaginatedResponse<AttendanceRecord>> => {
    const queryString = params 
      ? '?' + new URLSearchParams(
          Object.entries(params)
            .filter(([_, value]) => value !== undefined && value !== null)
            .map(([key, value]) => [key, String(value)])
        ).toString() 
      : '';
    
    const response = await fetch(`${API_BASE_URL}/attendance/${queryString}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Get single attendance record
  getById: async (id: number): Promise<AttendanceRecord> => {
    const response = await fetch(`${API_BASE_URL}/attendance/${id}/`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Create attendance record
  create: async (data: Partial<AttendanceRecord>): Promise<AttendanceRecord> => {
    const response = await fetch(`${API_BASE_URL}/attendance/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Update attendance record
  update: async (id: number, data: Partial<AttendanceRecord>): Promise<AttendanceRecord> => {
    const response = await fetch(`${API_BASE_URL}/attendance/${id}/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Delete attendance record
  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/attendance/${id}/`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to delete attendance');
    }
  },

  // Get today's attendance stats
  getTodayStats: async (): Promise<AttendanceStats> => {
    const response = await fetch(`${API_BASE_URL}/attendance/today_stats/`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Get attendance trend
  getTrend: async (days: number = 7): Promise<TrendData[]> => {
    const response = await fetch(
      `${API_BASE_URL}/attendance/trend/?days=${days}`,
      {
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  // Get attendance by employee
  getByEmployee: async (employeeId: number): Promise<AttendanceRecord[]> => {
    const response = await fetch(
      `${API_BASE_URL}/attendance/by_employee/?employee_id=${employeeId}`,
      {
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },
};


// ==================== EMPLOYEE API ====================

export const employeeAPI = {
  // Get all employees
  getAll: async (params?: {
    dept?: number;
    is_active?: number;
    include_expired?: string;
    page?: number;
  }): Promise<PaginatedResponse<Employee>> => {
    const queryString = params 
      ? '?' + new URLSearchParams(
          Object.entries(params)
            .filter(([_, value]) => value !== undefined && value !== null)
            .map(([key, value]) => [key, String(value)])
        ).toString() 
      : '';
    
    const response = await fetch(`${API_BASE_URL}/employees/${queryString}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Get active employees only
  getActive: async (): Promise<Employee[]> => {
    const response = await fetch(`${API_BASE_URL}/employees/active/`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Get employee statistics
  getStats: async (): Promise<EmployeeStats> => {
    const response = await fetch(`${API_BASE_URL}/employees/stats/`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Get single employee
  getById: async (id: number): Promise<Employee> => {
    const response = await fetch(`${API_BASE_URL}/employees/${id}/`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Create employee
  create: async (data: Partial<Employee>): Promise<Employee> => {
    const response = await fetch(`${API_BASE_URL}/employees/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Update employee
  update: async (id: number, data: Partial<Employee>): Promise<Employee> => {
    const response = await fetch(`${API_BASE_URL}/employees/${id}/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Delete employee (soft delete)
  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/employees/${id}/`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to delete employee');
    }
  },

  // Activate employee
  activate: async (id: number): Promise<Employee> => {
    const response = await fetch(`${API_BASE_URL}/employees/${id}/activate/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Deactivate employee
  deactivate: async (id: number): Promise<Employee> => {
    const response = await fetch(`${API_BASE_URL}/employees/${id}/deactivate/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Get employees by department
  getByDepartment: async (deptId: number): Promise<Employee[]> => {
    const response = await fetch(
      `${API_BASE_URL}/employees/by_department/?dept_id=${deptId}`,
      {
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },
};


// ==================== EXPORTS ====================

export type { 
  AttendanceRecord, 
  AttendanceStats, 
  TrendData, 
  Employee, 
  EmployeeStats,
  PaginatedResponse,
  User,
  AuthResponse,
  RegisterData,
  LoginData,
};
