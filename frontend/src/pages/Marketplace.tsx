import React, { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useProductStore } from '../store/productStore';
import { ShoppingCart, Filter, X, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const Marketplace = () => {
  const { user } = useAuthStore();
  const { products, fetchProducts } = useProductStore();
  const { items, addItem, removeItem, updateQuantity, total, clearCart } = useCartStore();
  const [selectedCategory, setSelectedCategory] = React.useState('all');
  const [isCartOpen, setIsCartOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showDeliveryForm, setShowDeliveryForm] = React.useState(false);
  const [deliveryDetails, setDeliveryDetails] = React.useState({
    customer: '',
    address: '',
    scheduledDate: '',
    paymentMethod: 'card', // Default to card
    cardDetails: {
      cardNumber: '',
      expiryDate: '',
      cvv: ''
    }
  });

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Only show cart for regular users
  const showCart = user?.role === 'user';

  const categories = [
    { id: 'all', name: 'All Products' },
    { id: 'organic-food', name: 'Organic Food' },
    { id: 'handmade-crafts', name: 'Handmade Crafts' },
    { id: 'ethical-clothing', name: 'Ethical Clothing' }
  ];

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(product => product.category === selectedCategory);

  const handleAddToCart = (product: { id: string; name: string; category: string; price: number; image: string; description: string; quantity: number; farmerId: string; createdAt: string }) => {
    if (!showCart) {
      toast.error('Only animal farmers can add items to cart');
      return;
    }
    const productWithRequiredFields = {
      ...product,
      farmerId: 'defaultFarmerId', // Replace with actual farmerId
      createdAt: new Date().toISOString() // Replace with actual createdAt if available
    };
    addItem(productWithRequiredFields, 1);
    toast.success('Added to cart!');
  };

  const handleDeliveryFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDeliveryDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Removed initiateCheckout function - replaced with direct navigation to checkout page

  const handleCheckout = async () => {
    // Validate delivery form
    if (!deliveryDetails.customer || !deliveryDetails.address || !deliveryDetails.scheduledDate) {
      toast.error('Please fill in all delivery details');
      return;
    }
    if (deliveryDetails.paymentMethod === 'card') {
      if (!deliveryDetails.cardDetails.cardNumber ||
        !deliveryDetails.cardDetails.expiryDate ||
        !deliveryDetails.cardDetails.cvv) {
        toast.error('Please fill in all card details');
        return;
      }
    }

    setIsLoading(true);

    try {
      // First, place the order
      const orderData = {
        customerId: user?.id || '',
        items: items.map(item => ({
          productId: item.id,
          quantity: item.cartQuantity,
          price: item.price
        })),
        totalAmount: total(),
        paymentDetails: deliveryDetails.paymentMethod === 'card'
          ? {
            method: "Credit Card",
            cardNumber: deliveryDetails.cardDetails.cardNumber,
            expiryDate: deliveryDetails.cardDetails.expiryDate,
            cvv: deliveryDetails.cardDetails.cvv
          }
          : {
            method: "Cash on Delivery"
          }
      };

      // Create the order
      const orderResponse = await fetch('http://localhost:8000/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });

      if (!orderResponse.ok) {
        throw new Error('Failed to place order');
      }

      const orderResult = await orderResponse.json();
      const orderNumber = orderResult.id || orderResult.orderNumber || `ORD${Date.now()}`;

      // Then, create the delivery
      const deliveryData = {
        orderNumber: orderNumber,
        customer: deliveryDetails.customer,
        address: deliveryDetails.address,
        items: items.map(item => item.name).join(', '),
        scheduledDate: deliveryDetails.scheduledDate
      };

      const deliveryResponse = await fetch('http://localhost:8000/api/deliveries/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deliveryData)
      });

      if (!deliveryResponse.ok) {
        throw new Error('Order placed but delivery setup failed');
      }

      await deliveryResponse.json();

      // Clear the cart and reset forms
      clearCart();
      setShowDeliveryForm(false);
      setDeliveryDetails({
        customer: '',
        address: '',
        scheduledDate: '',
        paymentMethod: 'card',
        cardDetails: {
          cardNumber: '',
          expiryDate: '',
          cvv: ''
        }
      });

      setIsCartOpen(false);

      // Show success message
      toast.success('Order placed and delivery scheduled successfully!');
    } catch (error) {
      console.error('Checkout error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Something went wrong during checkout';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
        {showCart && (
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Cart ({items.length})
          </button>
        )}
      </div>

      <div className="flex items-center space-x-4 mb-6">
        <Filter className="w-5 h-5 text-gray-500" />
        <div className="flex space-x-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-md ${selectedCategory === category.id
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map(product => (
          <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <Link to={`/product/${product.id}`}>
              <img
                src={`http://localhost:8000${product.image}`}
                alt={product.name}
                className="w-full h-48 object-cover"
              />
            </Link>
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
              <p className="mt-1 text-gray-500">{product.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <span className="text-2xl font-bold text-gray-900">LKR{product.price}</span>
                  <span className="text-gray-500"></span>
                </div>
                {showCart && (
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add to Cart
                  </button>
                )}
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Available: {product.quantity}
              </p>
              {product.reviews && product.reviews.length > 0 && (
                <div className="mt-2 flex items-center">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${(product.averageRating || 0) >= star
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                          }`}
                      />
                    ))}
                  </div>
                  <span className="ml-1 text-sm text-gray-500">
                    ({product.reviews.length})
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Shopping Cart Sidebar */}
      {showCart && isCartOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-hidden">
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl flex flex-col">
            {/* Cart Header - Fixed at top */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="text-lg font-semibold">Shopping Cart</h2>
              <div className="flex items-center">
                <Link to="/orders" className="text-blue-600 hover:text-blue-800 mr-4 text-sm">
                  My Orders
                </Link>
                <button onClick={() => setIsCartOpen(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-4">
              {items.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Your cart is empty</p>
              ) : (
                <>
                  {/* Cart Items Section */}
                  <div className="mb-4">
                    {items.map(item => (
                      <div key={item.id} className="flex items-center py-4 border-b">
                        <img
                          src={`http://localhost:8000${item.image}`}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="ml-4 flex-1">
                          <h3 className="text-sm font-medium">{item.name}</h3>
                          <p className="text-sm text-gray-500">LKR{item.price}/kg</p>
                          <div className="flex items-center mt-2">
                            <button
                              onClick={() => updateQuantity(item.id, Math.max(0, item.cartQuantity - 1))}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              -
                            </button>
                            <span className="mx-2">{item.cartQuantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.cartQuantity + 1)}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Total Section */}
                  <div className="border-t border-gray-200 pt-4 mb-4">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total</span>
                      <span>LKR{total()}</span>
                    </div>
                  </div>

                  {/* Delivery Form Section */}
                  {showDeliveryForm && (
                    <div className="mt-4 pb-20">
                      <h3 className="font-medium mb-2">Delivery Details</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Full Name</label>
                          <input
                            type="text"
                            name="customer"
                            value={deliveryDetails.customer}
                            onChange={handleDeliveryFormChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Enter your full name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Delivery Address</label>
                          <textarea
                            name="address"
                            value={deliveryDetails.address}
                            onChange={handleDeliveryFormChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Enter your complete address"
                            rows={3}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Delivery Date & Time</label>
                          <input
                            type="datetime-local"
                            name="scheduledDate"
                            value={deliveryDetails.scheduledDate}
                            onChange={handleDeliveryFormChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Payment Method Selection */}
                      <div className="mt-3">
                        <label className="block text-sm text-gray-600 mb-1">Payment Method</label>
                        <div className="flex space-x-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="paymentMethod"
                              value="card"
                              checked={deliveryDetails.paymentMethod === 'card'}
                              onChange={() => setDeliveryDetails(prev => ({
                                ...prev,
                                paymentMethod: 'card'
                              }))}
                              className="mr-2"
                            />
                            Credit/Debit Card
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="paymentMethod"
                              value="cash"
                              checked={deliveryDetails.paymentMethod === 'cash'}
                              onChange={() => setDeliveryDetails(prev => ({
                                ...prev,
                                paymentMethod: 'cash'
                              }))}
                              className="mr-2"
                            />
                            Cash on Delivery
                          </label>
                        </div>
                      </div>

                      {/* Card Details (Show only if card payment is selected) */}
                      {deliveryDetails.paymentMethod === 'card' && (
                        <div className="mt-2 space-y-2 p-2 border border-gray-200 rounded-md">
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">Card Number</label>
                            <input
                              type="text"
                              name="cardNumber"
                              value={deliveryDetails.cardDetails.cardNumber}
                              onChange={(e) => setDeliveryDetails(prev => ({
                                ...prev,
                                cardDetails: {
                                  ...prev.cardDetails,
                                  cardNumber: e.target.value
                                }
                              }))}
                              className="w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="1234 5678 9012 3456"
                            />
                          </div>
                          <div className="flex space-x-3">
                            <div className="w-1/2">
                              <label className="block text-sm text-gray-600 mb-1">Expiry Date</label>
                              <input
                                type="text"
                                name="expiryDate"
                                value={deliveryDetails.cardDetails.expiryDate}
                                onChange={(e) => setDeliveryDetails(prev => ({
                                  ...prev,
                                  cardDetails: {
                                    ...prev.cardDetails,
                                    expiryDate: e.target.value
                                  }
                                }))}
                                className="w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="MM/YY"
                              />
                            </div>
                            <div className="w-1/2">
                              <label className="block text-sm text-gray-600 mb-1">CVV</label>
                              <input
                                type="text"
                                name="cvv"
                                value={deliveryDetails.cardDetails.cvv}
                                onChange={(e) => setDeliveryDetails(prev => ({
                                  ...prev,
                                  cardDetails: {
                                    ...prev.cardDetails,
                                    cvv: e.target.value
                                  }
                                }))}
                                className="w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="123"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Bottom Action Buttons - Fixed at bottom */}
            <div className="p-4 border-t border-gray-200 bg-white sticky bottom-0">
              {items.length > 0 && (
                <>
                  {showDeliveryForm ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setShowDeliveryForm(false)}
                        className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleCheckout}
                        disabled={isLoading}
                        className={`flex-1 px-4 py-2 ${isLoading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-md`}
                      >
                        {isLoading ? 'Processing...' : 'Place Order'}
                      </button>
                    </div>
                  ) : (
                    <>
                      <Link
                        to="/checkout"
                        className="w-full block text-center bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md"
                      >
                        Proceed to Checkout
                      </Link>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;