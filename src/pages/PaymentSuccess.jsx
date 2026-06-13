import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { CheckCircle, Home } from 'lucide-react';

export default function PaymentSuccess() {
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setSessionId(urlParams.get('session_id'));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <div className="text-center p-8 bg-white rounded-xl shadow-2xl max-w-lg mx-auto">
        <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-8">
          Thank you for your purchase. Your credits should be added to your account shortly.
        </p>
        
        <div className="p-4 bg-gray-100 rounded-lg text-sm text-gray-500 mb-8">
          <strong>Transaction ID:</strong> {sessionId || 'Loading...'}
        </div>

        <Link to={createPageUrl("Home")}>
          <Button size="lg" className="w-full gap-2">
            <Home className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}