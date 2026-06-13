import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function SelectPrintProducts() {
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('eventId');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const eventData = await base44.entities.Event.list();
      const foundEvent = eventData.find(e => e.id === eventId);
      setEvent(foundEvent);

      const products = await base44.entities.PrintProduct.filter({ is_active: true }, "display_order");
      setAllProducts(products);

      setSelectedProducts(foundEvent.enabled_print_product_ids || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const handleToggleProduct = (productId) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Event.update(eventId, {
        enabled_print_product_ids: selectedProducts
      });
      navigate(createPageUrl(`ManageEvent?eventId=${eventId}`));
    } catch (error) {
      console.error('Error saving products:', error);
      alert('Failed to save product selection. Please try again.');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl(`ManageEvent?eventId=${eventId}`))}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Manage Event
        </Button>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Select Print Products
          </h1>
          <p className="text-gray-600">
            Choose which products your guests can order from the print shop for this event.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {allProducts.map(product => (
            <Card 
              key={product.id} 
              className={`cursor-pointer transition-all ${
                selectedProducts.includes(product.id) 
                  ? 'ring-2 ring-purple-500 shadow-lg' 
                  : 'hover:shadow-md'
              }`}
              onClick={() => handleToggleProduct(product.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={selectedProducts.includes(product.id)}
                    onCheckedChange={() => handleToggleProduct(product.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">{product.name}</h3>
                      <Badge variant="secondary">${product.base_price}+</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                    {product.mockup_image_url && (
                      <img 
                        src={product.mockup_image_url} 
                        alt={product.name}
                        className="w-full h-32 object-cover rounded-lg mt-2"
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-between items-center bg-white rounded-lg p-4 shadow">
          <div>
            <p className="text-sm text-gray-600">
              {selectedProducts.length} product(s) selected
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {saving ? 'Saving...' : 'Save Selection'}
          </Button>
        </div>
      </div>
    </div>
  );
}