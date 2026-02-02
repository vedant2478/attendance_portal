import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Dashboard } from '@/pages/Dashboard';
import { Employees } from '@/pages/Employees';
import { Attendance } from '@/pages/Attendance';
import { LeaveRequests } from '@/pages/LeaveRequests';
import { Reports } from '@/pages/Reports';
import { Settings } from '@/pages/Settings';
import { Toaster } from '@/components/ui/sonner';
import type { Department, Employee, AttendanceRecord, LeaveRequest } from '@/types';
import { departments, employees, attendanceRecords, leaveRequests } from '@/data/mockData';

type Page = 'dashboard' | 'employees' | 'attendance' | 'leaves' | 'reports' | 'settings';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // App state that would come from API in real app
  const [departmentsData] = useState<Department[]>(departments);
  const [employeesData] = useState<Employee[]>(employees);
  const [attendanceData] = useState<AttendanceRecord[]>(attendanceRecords);
  const [leaveRequestsData] = useState<LeaveRequest[]>(leaveRequests);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard 
          employees={employeesData} 
          attendanceRecords={attendanceData}
          leaveRequests={leaveRequestsData}
        />;
      case 'employees':
        return <Employees 
          employees={employeesData} 
          departments={departmentsData} 
        />;
      case 'attendance':
        return <Attendance 
          attendanceRecords={attendanceData}
          employees={employeesData}
        />;
      case 'leaves':
        return <LeaveRequests 
          leaveRequests={leaveRequestsData}
          employees={employeesData}
        />;
      case 'reports':
        return <Reports 
          employees={employeesData}
          attendanceRecords={attendanceData}
          departments={departmentsData}
        />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard 
          employees={employeesData} 
          attendanceRecords={attendanceData}
          leaveRequests={leaveRequestsData}
        />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        currentPage={currentPage} 
        onPageChange={setCurrentPage}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          onMenuClick={() => setSidebarOpen(true)}
          pageTitle={currentPage.charAt(0).toUpperCase() + currentPage.slice(1)}
        />
        
        <main className="flex-1 overflow-y-auto">
          {renderPage()}
        </main>
      </div>
      
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
