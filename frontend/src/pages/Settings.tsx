import { useState } from 'react';
import { 
  Save, 
  Bell, 
  Shield, 
  Clock,
  Building,
  CreditCard,
  Fingerprint,
  Key
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export function Settings() {
  const [settings, setSettings] = useState({
    companyName: 'TechCorp Solutions',
    companyEmail: 'hr@techcorp.com',
    companyPhone: '+1 (555) 123-4567',
    attendanceMethod: 'biometric',
    graceTime: 15,
    workingHours: 8,
    overtimeEnabled: true,
    notificationsEnabled: true,
    emailNotifications: true,
    smsNotifications: false,
    autoSignOut: false,
    locationTracking: true,
  });

  const handleSave = () => {
    toast.success('Settings saved successfully');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-500 mt-1">Configure your attendance system settings</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-gray-100 p-1">
          <TabsTrigger value="general" className="px-6">General</TabsTrigger>
          <TabsTrigger value="attendance" className="px-6">Attendance</TabsTrigger>
          <TabsTrigger value="notifications" className="px-6">Notifications</TabsTrigger>
          <TabsTrigger value="devices" className="px-6">Devices</TabsTrigger>
          <TabsTrigger value="security" className="px-6">Security</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <Building className="w-5 h-5" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input 
                    id="companyName" 
                    value={settings.companyName}
                    onChange={(e) => setSettings({...settings, companyName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyEmail">Company Email</Label>
                  <Input 
                    id="companyEmail" 
                    type="email"
                    value={settings.companyEmail}
                    onChange={(e) => setSettings({...settings, companyEmail: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyPhone">Company Phone</Label>
                <Input 
                  id="companyPhone" 
                  value={settings.companyPhone}
                  onChange={(e) => setSettings({...settings, companyPhone: e.target.value})}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Settings */}
        <TabsContent value="attendance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Attendance Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="attendanceMethod">Primary Attendance Method</Label>
                <Select 
                  value={settings.attendanceMethod} 
                  onValueChange={(value) => setSettings({...settings, attendanceMethod: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="biometric">
                      <div className="flex items-center gap-2">
                        <Fingerprint className="w-4 h-4" />
                        Biometric
                      </div>
                    </SelectItem>
                    <SelectItem value="rfid">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        RFID Card
                      </div>
                    </SelectItem>
                    <SelectItem value="pin">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4" />
                        PIN Code
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="graceTime">Grace Time (minutes)</Label>
                  <Input 
                    id="graceTime" 
                    type="number"
                    value={settings.graceTime}
                    onChange={(e) => setSettings({...settings, graceTime: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workingHours">Working Hours per Day</Label>
                  <Input 
                    id="workingHours" 
                    type="number"
                    value={settings.workingHours}
                    onChange={(e) => setSettings({...settings, workingHours: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Overtime Tracking</Label>
                    <p className="text-sm text-gray-500">Enable automatic overtime calculation</p>
                  </div>
                  <Switch 
                    checked={settings.overtimeEnabled}
                    onCheckedChange={(checked) => setSettings({...settings, overtimeEnabled: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Auto Sign-Out</Label>
                    <p className="text-sm text-gray-500">Automatically sign out employees at end of shift</p>
                  </div>
                  <Switch 
                    checked={settings.autoSignOut}
                    onCheckedChange={(checked) => setSettings({...settings, autoSignOut: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Location Tracking</Label>
                    <p className="text-sm text-gray-500">Track employee location during clock-in/out</p>
                  </div>
                  <Switch 
                    checked={settings.locationTracking}
                    onCheckedChange={(checked) => setSettings({...settings, locationTracking: checked})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Enable Notifications</Label>
                  <p className="text-sm text-gray-500">Receive notifications for attendance events</p>
                </div>
                <Switch 
                  checked={settings.notificationsEnabled}
                  onCheckedChange={(checked) => setSettings({...settings, notificationsEnabled: checked})}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Email Notifications</Label>
                  <p className="text-sm text-gray-500">Send notifications via email</p>
                </div>
                <Switch 
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => setSettings({...settings, emailNotifications: checked})}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">SMS Notifications</Label>
                  <p className="text-sm text-gray-500">Send notifications via SMS</p>
                </div>
                <Switch 
                  checked={settings.smsNotifications}
                  onCheckedChange={(checked) => setSettings({...settings, smsNotifications: checked})}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Device Settings */}
        <TabsContent value="devices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <Fingerprint className="w-5 h-5" />
                Connected Devices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Fingerprint className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Main Terminal</p>
                      <p className="text-sm text-gray-500">Face Recognition • Main Entrance</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600">Online</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">RFID Reader</p>
                      <p className="text-sm text-gray-500">RFID Card • Back Entrance</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-sm text-red-600">Offline</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full border-gray-200">
                  Add New Device
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Session Timeout</Label>
                <Select defaultValue="30">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Two-Factor Authentication</Label>
                  <p className="text-sm text-gray-500">Require 2FA for admin accounts</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">IP Whitelisting</Label>
                  <p className="text-sm text-gray-500">Restrict access to specific IP addresses</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={handleSave}
        >
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
