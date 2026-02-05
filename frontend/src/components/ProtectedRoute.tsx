import { Navigate, useLocation } from 'react-router-dom';
import { getUserRole, type UserRole } from '@/utils/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const isAuthenticated = localStorage.getItem('token');

  // Check authentication first
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If no specific roles are required, allow any authenticated user
  if (!allowedRoles || allowedRoles.length === 0) {
    return <>{children}</>;
  }

  // Check if user has required role
  const userRole = getUserRole();
  if (!userRole || !allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
