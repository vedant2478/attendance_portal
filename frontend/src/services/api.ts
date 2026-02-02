const API_BASE_URL = 'http://localhost:8000/api';

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

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

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
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return handleResponse(response);
  },

  // Get single attendance record
  getById: async (id: number): Promise<AttendanceRecord> => {
    const response = await fetch(`${API_BASE_URL}/attendance/${id}/`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return handleResponse(response);
  },

  // Create attendance record
  create: async (data: Partial<AttendanceRecord>): Promise<AttendanceRecord> => {
    const response = await fetch(`${API_BASE_URL}/attendance/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Update attendance record
  update: async (id: number, data: Partial<AttendanceRecord>): Promise<AttendanceRecord> => {
    const response = await fetch(`${API_BASE_URL}/attendance/${id}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Delete attendance record
  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/attendance/${id}/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to delete attendance');
    }
  },

  // Get today's attendance stats
  getTodayStats: async (): Promise<AttendanceStats> => {
    const response = await fetch(`${API_BASE_URL}/attendance/today_stats/`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return handleResponse(response);
  },

  // Get attendance trend
  getTrend: async (days: number = 7): Promise<TrendData[]> => {
    const response = await fetch(
      `${API_BASE_URL}/attendance/trend/?days=${days}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return handleResponse(response);
  },

  // Get attendance by employee
  getByEmployee: async (employeeId: number): Promise<AttendanceRecord[]> => {
    const response = await fetch(
      `${API_BASE_URL}/attendance/by_employee/?employee_id=${employeeId}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return handleResponse(response);
  },
};

export type { AttendanceRecord, AttendanceStats, TrendData };
