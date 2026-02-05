import { useNavigate } from 'react-router-dom';
import { ShieldX, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-xl">
        <CardContent className="pt-12 pb-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
            <ShieldX className="w-10 h-10 text-red-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Access Denied
          </h1>
          
          <p className="text-gray-600 mb-2">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            This page is only available to administrators and managers. Please contact your administrator if you believe this is an error.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={() => navigate(-1)}
              variant="outline"
              className="border-gray-300"
            >
              Go Back
            </Button>
            <Button 
              onClick={() => navigate('/dashboard')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
