import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  FileText, 
  BarChart3, 
  Settings,
  X,
  LogOut
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { authAPI } from '@/services/api';
import { getUserRole, hasAccess, type UserRole } from '@/utils/auth';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  path: string;
  roles: UserRole[];
}

const menuItems: MenuItem[] = [
  { 
    id: 'dashboard', 
    label: 'Dashboard', 
    icon: LayoutDashboard, 
    path: '/dashboard',
    roles: ['admin', 'manager', 'employee'] // All users
  },
  { 
    id: 'employees', 
    label: 'Employees', 
    icon: Users, 
    path: '/employees',
    roles: ['admin'] // Admin only
  },
  { 
    id: 'attendance', 
    label: 'Attendance', 
    icon: CalendarCheck, 
    path: '/attendance',
    roles: ['admin'] // Admin only
  },
  { 
    id: 'leaves', 
    label: 'Leave Requests', 
    icon: FileText, 
    path: '/leaves',
    roles: ['admin', 'manager', 'employee'] // All users
  },
  { 
    id: 'reports', 
    label: 'Reports', 
    icon: BarChart3, 
    path: '/reports',
    roles: ['admin', 'manager', 'employee'] // All users
  },
  { 
    id: 'settings', 
    label: 'Settings', 
    icon: Settings, 
    path: '/settings',
    roles: ['admin'] // Admin only
  },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = authAPI.getCurrentUser();
  const userRole = getUserRole();

  // Filter menu items based on user role
  const visibleMenuItems = menuItems.filter(item => hasAccess(item.roles));

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      toast.success('Logged out successfully!');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-100';
      case 'manager':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      case 'employee':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  const getUserInitials = () => {
    if (user?.username) {
      const names = user.username.split(' ');
      if (names.length >= 2) {
        return (names[0][0] + names[1][0]).toUpperCase();
      }
      return user.username.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <Link to="/dashboard" className="flex items-center gap-3" onClick={onClose}>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <CalendarCheck className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">AttendPro</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-1">
              {visibleMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <li key={item.id}>
                    <Link
                      to={item.path}
                      onClick={onClose}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                        isActive 
                          ? "bg-blue-50 text-blue-600 shadow-sm" 
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <Icon className={cn("w-5 h-5", isActive ? "text-blue-600" : "text-gray-400")} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer - User Info */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold shadow-sm">
                {getUserInitials()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.username || 'User'}
                </p>
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${getRoleBadgeColor(userRole)}`}
                >
                  {userRole?.toUpperCase() || 'USER'}
                </Badge>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                onClick={handleLogout}
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
