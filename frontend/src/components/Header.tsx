import { Menu, Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface HeaderProps {
  onMenuClick: () => void;
  pageTitle: string;
}

export function Header({ onMenuClick, pageTitle }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          <h1 className="text-2xl font-semibold text-gray-900">{pageTitle}</h1>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="hidden md:flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-400" />
            <Input 
              type="text" 
              placeholder="Search..." 
              className="w-64 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5 text-gray-600" />
                <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs bg-red-500">
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
                <Button variant="ghost" className="w-full text-sm text-blue-600 hover:text-blue-700">
                  View all notifications
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              JD
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
