import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { XCircle, ShoppingCart } from 'lucide-react';

export default function PaymentCancel() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-lg mx-auto">
        <XCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Canceled</h1>
        <p className="text-gray-600 mb-8">
          Your purchase was not completed. You have not been charged.
        </p>
        
        <Link to={createPageUrl("Pricing")}>
          <Button size="lg" variant="outline" className="w-full gap-2">
            <ShoppingCart className="w-4 h-4" />
            View Pricing Plans
          </Button>
        </Link>
      </div>
    </div>
  );
}