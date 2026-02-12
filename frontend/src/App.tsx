import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { Dashboard } from '@/pages/Dashboard';
import { Employees } from '@/pages/Employees';
import { Attendance } from '@/pages/Attendance';
import { LeaveRequests } from '@/pages/LeaveRequests';
import { Reports } from '@/pages/Reports';
import { Settings } from '@/pages/Settings';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { NotFound } from '@/pages/NotFound';
import { Unauthorized } from '@/pages/Unauthorized';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes with Layout */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          {/* All Authenticated Users - Dashboard, Leaves, Reports */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/leaves" element={<LeaveRequests />} />
          <Route path="/reports" element={<Reports />} />

          {/* Admin & Manager Only Routes */}
          <Route 
            path="/employees" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <Employees />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/attendance" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <Attendance />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <Settings />
              </ProtectedRoute>
            } 
          />
        </Route>

        {/* Redirect root to dashboard for all users */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Unauthorized Access Page */}
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* 404 Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      
      <Toaster position="top-right" />
    </BrowserRouter>
  );
}

export default App;
