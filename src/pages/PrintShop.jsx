
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, ShoppingCart, Package } from 'lucide-react'; // Added Package icon

// Removed the hardcoded PRODUCTS array. Products will now be fetched dynamically.
// const PRODUCTS = [...]

import { motion } from 'framer-motion';

export default function PrintShop() {
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [products, setProducts] = useState([]); // New state for dynamic products
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [orderForm, setOrderForm] = useState({
    size: '',
    quantity: 1,
    customization_text: '',
    shipping_address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: 'USA'
    }
  });
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [userEvents, setUserEvents] = useState([]); // New state for user's events

  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('eventId');

  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);

      // If no eventId, load user's events with print service enabled
      if (!eventId) {
        const allEvents = await base44.entities.Event.list();
        const eventsWithPrint = allEvents.filter(e => 
          e.print_service_enabled === true && 
          (e.host_email === user.email || (e.co_hosts && e.co_hosts.includes(user.email)))
        );
        setUserEvents(eventsWithPrint);
        setLoading(false);
        return; // Stop execution here for this case
      }

      // If eventId exists, load that specific event
      // This part ensures that `allEvents` is fetched only once if eventId is present
      const allEvents = await base44.entities.Event.list();
      const foundEvent = allEvents.find(e => e.id === eventId);
      
      console.log('[PrintShop] Found event:', foundEvent);
      console.log('[PrintShop] Print service enabled:', foundEvent?.print_service_enabled);
      
      setEvent(foundEvent);

      if (foundEvent) {
        const photoData = await base44.entities.Photo.filter({ event_id: eventId });
        setPhotos(photoData);

        // Load products dynamically from base44
        const allPrintProducts = await base44.entities.PrintProduct.filter({ is_active: true }, "display_order");
        
        console.log('[PrintShop] All active products:', allPrintProducts);
        console.log('[PrintShop] Event enabled product IDs:', foundEvent.enabled_print_product_ids);
        
        // Filter by enabled products if event has restrictions
        if (foundEvent.enabled_print_product_ids && foundEvent.enabled_print_product_ids.length > 0) {
          const enabledProducts = allPrintProducts.filter(p => 
            foundEvent.enabled_print_product_ids.includes(p.id)
          );
          console.log('[PrintShop] Filtered enabled products:', enabledProducts);
          setProducts(enabledProducts);
        } else {
          // If no specific products enabled, show all active products
          console.log('[PrintShop] Using all active products');
          setProducts(allPrintProducts);
        }
      }
    } catch (error) {
      console.error('[PrintShop] Error loading data:', error);
    }
    setLoading(false); // Ensure loading is false when data fetching is complete or an error occurs
  };

  const handlePhotoSelect = (photoId) => {
    setSelectedPhotos(prev => 
      prev.includes(photoId) 
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    // Set initial size to the first available size_name from the product's sizes array
    // Use undefined if no sizes available, so Select shows placeholder
    const firstSize = product.sizes?.find(s => s.size_name && s.size_name.trim() !== '')?.size_name;
    setOrderForm({ ...orderForm, size: firstSize || undefined });
    setShowOrderDialog(true);
  };

  const calculateTotal = () => {
    if (!selectedProduct) return 0;
    
    let price = selectedProduct.base_price || 0;
    
    // Add upcharge for selected size
    const selectedSize = selectedProduct.sizes?.find(s => s.size_name === orderForm.size);
    if (selectedSize) {
      price += selectedSize.upcharge_amount || 0;
    }
    
    return (price * orderForm.quantity).toFixed(2);
  };

  const handleSubmitOrder = async () => {
    if (selectedPhotos.length === 0) {
      alert('Please go back and select at least one photo from the left panel before ordering.');
      return;
    }
    if (!orderForm.size) {
      alert('Please select a size for your product.');
      return;
    }
    if (!orderForm.quantity || orderForm.quantity < 1) {
      alert('Quantity must be at least 1.');
      return;
    }

    try {
      await base44.entities.PrintOrder.create({
        event_id: eventId,
        user_email: currentUser.email,
        user_name: currentUser.full_name,
        product_type: selectedProduct.id,
        photo_ids: selectedPhotos,
        quantity: orderForm.quantity,
        size: orderForm.size,
        customization_text: orderForm.customization_text,
        total_price: parseFloat(calculateTotal()),
        shipping_address: orderForm.shipping_address,
        status: 'pending'
      });

      alert('Order placed successfully! You will receive a confirmation email shortly.');
      setShowOrderDialog(false);
      setSelectedPhotos([]);
      setOrderForm({
        size: '',
        quantity: 1,
        customization_text: '',
        shipping_address: { street: '', city: '', state: '', zip: '', country: 'USA' }
      });
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // If no eventId, show event selection page
  if (!eventId) {
    return (
      <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Print Shop
            </h1>
            <p className="text-lg text-gray-600">Select an event to order prints</p>
          </motion.div>

          {userEvents.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <h3 className="text-xl font-semibold mb-2">No Events with Print Service</h3>
                <p className="text-gray-600 mb-6">
                  You don't have any events with the print service enabled.
                </p>
                <Button onClick={() => navigate(createPageUrl('Home'))}>
                  Go to My Events
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {userEvents.map(evt => (
                <motion.div
                  key={evt.id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => navigate(createPageUrl(`PrintShop?eventId=${evt.id}`))}
                  className="cursor-pointer"
                >
                  <Card className="hover:shadow-xl transition-shadow">
                    <div 
                      className="h-32 bg-gradient-to-br flex items-center justify-center text-white text-lg font-bold"
                      style={{ background: evt.cover_image_url ? 'none' : `linear-gradient(135deg, ${evt.theme_color} 0%, ${evt.theme_color}99 100%)` }}
                    >
                      {evt.cover_image_url ? (
                        <img src={evt.cover_image_url} alt={evt.name} className="w-full h-full object-cover opacity-80" />
                      ) : (
                        evt.name // Fallback to event name if no cover image
                      )}
                    </div>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-2">{evt.name}</h3>
                      <p className="text-gray-600 text-sm mb-4">{evt.description}</p>
                      <Badge className="bg-purple-600">Print Service Enabled</Badge>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Rest of the code - with eventId
  if (!event) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto text-center py-20">
          <h2 className="text-2xl font-bold mb-4">Event Not Found</h2>
          <p className="text-gray-600 mb-6">The event you're looking for doesn't exist.</p>
          <Button onClick={() => navigate(createPageUrl('PrintShop'))}>
            Back to Print Shop
          </Button>
        </div>
      </div>
    );
  }

  if (!event.print_service_enabled) { 
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto text-center py-20">
          <h2 className="text-2xl font-bold mb-4">Print Shop Not Available</h2>
          <p className="text-gray-600 mb-6">Photo printing is not enabled for this event.</p>
          <Button onClick={() => navigate(createPageUrl(`EventGallery?eventId=${eventId}`))}>
            Back to Gallery
          </Button>
        </div>
      </div>
    );
  }

  // Add debug info if no products are found
  if (products.length === 0) {
    return (
      <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
        <div className="max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl(`EventGallery?eventId=${eventId}`))}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Gallery
          </Button>

          <div className="text-center py-20">
            <Package className="w-20 h-20 mx-auto mb-6 text-gray-400" />
            <h2 className="text-2xl font-bold mb-4">No Products Available</h2>
            <p className="text-gray-600 mb-6">
              There are no print products configured for this event yet.
            </p>
            {(event.host_email === currentUser?.email || event.co_hosts?.includes(currentUser?.email)) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto">
                <p className="text-blue-800 mb-4">
                  <strong>Host Tip:</strong> Products need to be added by an admin in the Admin Dashboard under the "Products" tab.
                </p>
                <Button onClick={() => navigate(createPageUrl('AdminDashboard'))} variant="outline">
                  Go to Admin Dashboard
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl(`EventGallery?eventId=${eventId}`))}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Gallery
        </Button>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Print Shop
          </h1>
          <p className="text-lg text-gray-600">Turn your memories into keepsakes</p>
        </motion.div>

        {selectedPhotos.length === 0 && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800 font-semibold">
              👈 <strong>Step 1:</strong> Select photos from the left panel first, then choose a product!
            </p>
          </div>
        )}

        {selectedPhotos.length > 0 && (
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-6 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">✓ {selectedPhotos.length} photo(s) selected - Now choose a product!</span>
            </div>
            <Button variant="outline" onClick={() => setSelectedPhotos([])} className="border-green-300 hover:bg-green-100">
              Clear Selection
            </Button>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div>
            <h2 className="text-2xl font-bold mb-4">Step 1: Select Photos</h2>
            <div className="grid grid-cols-3 gap-3 max-h-[600px] overflow-y-auto bg-white p-4 rounded-lg border-2 border-purple-200">
              {photos.length === 0 ? (
                <div className="col-span-3 text-center py-8 text-gray-500">
                  No photos available for this event
                </div>
              ) : (
                photos.map(photo => (
                  <div
                    key={photo.id}
                    onClick={() => handlePhotoSelect(photo.id)}
                    className={`relative cursor-pointer transition-all rounded-lg ${
                      selectedPhotos.includes(photo.id)
                        ? 'ring-4 ring-purple-500 scale-95'
                        : 'hover:scale-105 hover:ring-2 hover:ring-purple-300'
                    }`}
                  >
                    <img
                      src={photo.image_url}
                      alt={photo.caption}
                      className="w-full aspect-square object-cover rounded-lg"
                    />
                    {selectedPhotos.includes(photo.id) && (
                      <div className="absolute inset-0 bg-purple-600/20 rounded-lg flex items-center justify-center">
                        <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                          ✓
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">Step 2: Choose Product</h2>
            {selectedPhotos.length === 0 && (
              <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500 mb-4">
                <p className="font-medium">Select at least one photo to continue</p>
              </div>
            )}
            <div className={`grid gap-4 ${selectedPhotos.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
              {products.map(product => (
                <motion.div key={product.id} whileHover={{ scale: selectedPhotos.length > 0 ? 1.02 : 1 }}>
                  <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => selectedPhotos.length > 0 && handleProductSelect(product)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                            {product.mockup_image_url ? (
                              <img src={product.mockup_image_url} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-8 h-8 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{product.name}</h3>
                            <p className="text-sm text-gray-600">{product.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-purple-600">${product.base_price}+</p>
                          <Badge variant="outline">{product.sizes?.length || 0} sizes</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Complete Your Order</DialogTitle>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                    {selectedProduct.mockup_image_url ? (
                      <img src={selectedProduct.mockup_image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{selectedProduct.name}</h3>
                    <p className="text-sm text-gray-600">{selectedPhotos.length} photo(s) selected</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-purple-600">${selectedProduct.base_price}</p>
              </div>

              <div>
                <Label>Size</Label>
                <Select value={orderForm.size || undefined} onValueChange={(value) => setOrderForm({...orderForm, size: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a size" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedProduct.sizes && selectedProduct.sizes
                      .filter(size => size.size_name && size.size_name.trim() !== '')
                      .map(size => (
                        <SelectItem key={size.size_name} value={size.size_name}>
                          {size.size_name} {size.upcharge_amount > 0 ? `(+$${size.upcharge_amount.toFixed(2)})` : ''}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={orderForm.quantity}
                  onChange={(e) => setOrderForm({...orderForm, quantity: parseInt(e.target.value) || 1})}
                />
              </div>

              <div>
                <Label>Custom Text (optional)</Label>
                <Input
                  value={orderForm.customization_text}
                  onChange={(e) => setOrderForm({...orderForm, customization_text: e.target.value})}
                  placeholder="Add custom text to your product"
                />
              </div>

              <div className="space-y-3">
                <Label>Shipping Address</Label>
                <Input
                  placeholder="Street Address"
                  value={orderForm.shipping_address.street}
                  onChange={(e) => setOrderForm({
                    ...orderForm,
                    shipping_address: {...orderForm.shipping_address, street: e.target.value}
                  })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="City"
                    value={orderForm.shipping_address.city}
                    onChange={(e) => setOrderForm({
                      ...orderForm,
                      shipping_address: {...orderForm.shipping_address, city: e.target.value}
                    })}
                  />
                  <Input
                    placeholder="State"
                    value={orderForm.shipping_address.state}
                    onChange={(e) => setOrderForm({
                      ...orderForm,
                      shipping_address: {...orderForm.shipping_address, state: e.target.value}
                    })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="ZIP Code"
                    value={orderForm.shipping_address.zip}
                    onChange={(e) => setOrderForm({
                      ...orderForm,
                      shipping_address: {...orderForm.shipping_address, zip: e.target.value}
                    })}
                  />
                  <Input
                    placeholder="Country"
                    value={orderForm.shipping_address.country}
                    onChange={(e) => setOrderForm({
                      ...orderForm,
                      shipping_address: {...orderForm.shipping_address, country: e.target.value}
                    })}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-3xl font-bold text-purple-600">${calculateTotal()}</span>
                </div>
                <Button onClick={handleSubmitOrder} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg h-12">
                  Place Order
                </Button>
                <p className="text-xs text-gray-500 text-center mt-2">
                  You will be redirected to payment after confirming your order
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
