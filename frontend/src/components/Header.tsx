import { Bell, Search, User, ChevronDown, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { authAPI } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getUserRole } from '@/utils/auth';

export function Header() {
  const navigate = useNavigate();
  const user = authAPI.getCurrentUser();
  const userRole = getUserRole();

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      toast.success('Logged out successfully');
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
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left Section - Welcome Message */}
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900">
            Welcome back, {user?.username || 'User'}!
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="hidden md:flex items-center relative">
            <Search className="absolute left-3 w-4 h-4 text-gray-400" />
            <Input 
              type="text" 
              placeholder="Search..." 
              className="w-64 pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5 text-gray-600" />
                <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs bg-red-500 hover:bg-red-500">
                  3
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-4 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">Notifications</p>
                <p className="text-xs text-gray-500 mt-1">You have 3 new notifications</p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <DropdownMenuItem className="flex flex-col items-start p-3 cursor-pointer">
                  <p className="text-sm font-medium text-gray-900">Leave Request</p>
                  <p className="text-xs text-gray-500 mt-1">Amit Patel requested leave for Jan 25</p>
                  <p className="text-xs text-gray-400 mt-1">2 hours ago</p>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start p-3 cursor-pointer">
                  <p className="text-sm font-medium text-gray-900">Late Arrival</p>
                  <p className="text-xs text-gray-500 mt-1">Vikram Singh arrived 15 minutes late</p>
                  <p className="text-xs text-gray-400 mt-1">5 hours ago</p>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start p-3 cursor-pointer">
                  <p className="text-sm font-medium text-gray-900">Device Offline</p>
                  <p className="text-xs text-gray-500 mt-1">Main Terminal is offline</p>
                  <p className="text-xs text-gray-400 mt-1">1 day ago</p>
                </DropdownMenuItem>
              </div>
              <div className="p-2 border-t border-gray-100">
                <Button variant="ghost" className="w-full text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                  View all notifications
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-3 pl-2 pr-3 hover:bg-gray-50">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md">
                  {getUserInitials()}
                </div>
                <div className="text-left hidden lg:block">
                  <p className="text-sm font-medium text-gray-900 leading-tight">
                    {user?.username || 'User'}
                  </p>
                  <Badge 
                    variant="secondary" 
                    className={`text-xs mt-1 ${getRoleBadgeColor(userRole)}`}
                  >
                    {userRole?.toUpperCase() || 'USER'}
                  </Badge>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 hidden lg:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <div className="flex items-center gap-3 py-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                    {getUserInitials()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {user?.username || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.email || 'user@example.com'}
                    </p>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs mt-1 ${getRoleBadgeColor(userRole)}`}
                    >
                      {userRole?.toUpperCase() || 'USER'}
                    </Badge>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => navigate('/settings')}
                className="cursor-pointer"
              >
                <User className="w-4 h-4 mr-2" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => navigate('/dashboard')}
                className="cursor-pointer"
              >
                <ChevronDown className="w-4 h-4 mr-2 rotate-90" />
                Dashboard
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleLogout}
                className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
