import {
  Add as AddIcon,
  CreditCard as CardIcon,
  Payments as CashIcon,
  Clear as ClearIcon,
  Delete as DeleteIcon,
  Print as PrintIcon,
  ReceiptLong as ReceiptIcon,
  Remove as RemoveIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Paper,
  Snackbar,
  TextField,
  Typography
} from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { printApi, productsApi, salesApi } from '../services/api';

// Define Product type
interface Product {
  id: number;
  name: string;
  barcode: string;
  price: number;
  stockQuantity: number;
  image?: string;
  Category?: {
    id: number;
    name: string;
  };
}

// Define CartItem type
interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
  discount: number;
}

// Payment method type
type PaymentMethod = 'cash' | 'credit_card' | 'debit_card' | 'mobile_payment' | 'other';

interface Sale {
  items: {
    productId: number;
    quantity: number;
    price: number;
  }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  customerName?: string;
  customerPhone?: string;
}

const POS: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Checkout dialog state
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [processingSale, setProcessingSale] = useState(false);
  
  // Receipt dialog state
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState('');
  
  // Focus references
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  
  // Load products on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        const response = await productsApi.getAll();
        // Ensure we always have an array, even if response.data.products is undefined
        const productsData = response.data?.products || [];
        setProducts(productsData);
        setFilteredProducts(productsData);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load products. Please try again.');
        // Set empty arrays to prevent undefined errors
        setProducts([]);
        setFilteredProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };
    
    fetchProducts();
  }, []);
  
  // Filter products when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
      return;
    }
    
    const filtered = products.filter(product => 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode.includes(searchQuery)
    );
    
    setFilteredProducts(filtered);
  }, [searchQuery, products]);
  
  // Focus barcode input when component mounts
  useEffect(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);
  
  // Calculate cart totals
  const cartSubtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  const cartDiscount = cartItems.reduce((sum, item) => sum + item.discount, 0);
  const cartTax = 0; // We can implement tax calculation if needed
  const cartTotal = cartSubtotal - cartDiscount + cartTax;
  
  // Handle barcode scan/input
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!barcodeInput.trim()) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await productsApi.getByBarcode(barcodeInput);
      const product = response.data;
      
      // Check if product exists
      if (!product) {
        setError('Product not found. Please try again.');
        return;
      }
      
      // Check if product is in stock
      if (product.stockQuantity <= 0) {
        setError('Product is out of stock.');
        return;
      }
      
      // Add product to cart
      addToCart(product);
      
      // Clear barcode input
      setBarcodeInput('');
      
    } catch (err) {
      console.error('Error fetching product by barcode:', err);
      setError('Product not found or an error occurred.');
    } finally {
      setLoading(false);
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    }
  };
  
  // Add product to cart
  const addToCart = (product: Product) => {
    setCartItems(prevItems => {
      // Check if product is already in cart
      const existingItemIndex = prevItems.findIndex(
        item => item.product.id === product.id
      );
      
      if (existingItemIndex >= 0) {
        // Update quantity if already in cart
        const updatedItems = [...prevItems];
        const item = updatedItems[existingItemIndex];
        
        // Check if we have enough stock
        if (item.quantity >= product.stockQuantity) {
          setError('Cannot add more of this product. Stock limit reached.');
          return prevItems;
        }
        
        item.quantity += 1;
        item.subtotal = item.quantity * product.price;
        
        return updatedItems;
      } else {
        // Add new item to cart
        return [
          ...prevItems,
          {
            product,
            quantity: 1,
            subtotal: product.price,
            discount: 0,
          },
        ];
      }
    });
  };
  
  // Update cart item quantity
  const updateCartItemQuantity = (index: number, newQuantity: number) => {
    setCartItems(prevItems => {
      const updatedItems = [...prevItems];
      const item = updatedItems[index];
      
      // Check limits
      if (newQuantity <= 0) {
        // Remove item if quantity becomes 0
        updatedItems.splice(index, 1);
        return updatedItems;
      }
      
      if (newQuantity > item.product.stockQuantity) {
        setError('Cannot add more of this product. Stock limit reached.');
        return prevItems;
      }
      
      // Update quantity and subtotal
      item.quantity = newQuantity;
      item.subtotal = newQuantity * item.product.price;
      
      return updatedItems;
    });
  };
  
  // Remove item from cart
  const removeCartItem = (index: number) => {
    setCartItems(prevItems => {
      const updatedItems = [...prevItems];
      updatedItems.splice(index, 1);
      return updatedItems;
    });
  };
  
  // Clear cart
  const clearCart = () => {
    setCartItems([]);
  };
  
  // Open checkout dialog
  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      setError('Cart is empty. Please add items before checkout.');
      return;
    }
    
    try {
      const saleData: Sale = {
        items: cartItems.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price
        })),
        subtotal: cartSubtotal,
        discount: cartDiscount,
        tax: cartTax,
        total: cartTotal,
        paymentMethod,
        customerName,
        customerPhone
      };
      
      setProcessingSale(true);
      setError(null);
      
      // Create sale
      const response = await salesApi.create(saleData);
      
      // Generate receipt using the correct method
      const receiptResponse = await printApi.printReceipt(response.data.id);
      
      // Show success message
      setSuccessMessage('Sale completed successfully!');
      
      // Set receipt URL
      setReceiptUrl(receiptResponse.data.downloadUrl);
      
      // Close checkout dialog
      setCheckoutDialogOpen(false);
      
      // Open receipt dialog
      setReceiptDialogOpen(true);
      
      // Clear cart
      clearCart();
      
      // Reset checkout form
      setCustomerName('');
      setCustomerPhone('');
      setPaymentMethod('cash');
      
    } catch (err: any) {
      console.error('Error processing sale:', err);
      setError(err.response?.data?.message || 'Failed to process sale. Please try again.');
    } finally {
      setProcessingSale(false);
    }
  };
  
  // Render product grid
  const renderProductGrid = () => {
    // Ensure we have a valid array to work with
    const productsToRender = filteredProducts || [];
    
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {loadingProducts ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : productsToRender.length === 0 ? (
          <Box sx={{ width: '100%', textAlign: 'center', mt: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No products found. Try a different search.
            </Typography>
          </Box>
        ) : (
          productsToRender.map(product => (
            <Box 
              key={product.id}
              sx={{ 
                width: {
                  xs: 'calc(50% - 8px)',
                  sm: 'calc(33.33% - 10.67px)',
                  md: 'calc(25% - 12px)',
                  lg: 'calc(16.66% - 13.33px)'
                }
              }}
            >
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
                onClick={() => {
                  if (product.stockQuantity > 0) {
                    addToCart(product);
                  } else {
                    setError('Product is out of stock.');
                  }
                }}
              >
                <CardContent sx={{ p: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {product.stockQuantity <= 0 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        bgcolor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 1,
                      }}
                    >
                      <Typography variant="h6" color="white">
                        Out of Stock
                      </Typography>
                    </Box>
                  )}
                  
                  <Box sx={{ textAlign: 'center', mb: 1 }}>
                    {product.image ? (
                      <Box
                        component="img"
                        src={`http://localhost:5000${product.image}`}
                        alt={product.name}
                        sx={{ height: 60, maxWidth: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <Box
                        sx={{
                          height: 60,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'grey.200',
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          No Image
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  
                  <Typography variant="body2" component="div" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                    {product.name}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {product.Category?.name || 'Uncategorized'}
                  </Typography>
                  
                  <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Stock: {product.stockQuantity}
                    </Typography>
                    <Typography variant="body2" color="primary" fontWeight="bold">
                      Rs. {product.price.toFixed(2)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          ))
        )}
      </Box>
    );
  };
  
  // Render cart items
  const renderCartItems = () => {
    return (
      <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
        {cartItems.length === 0 ? (
          <ListItem>
            <ListItemText
              primary="Cart is empty"
              secondary="Scan or search for products to add"
              sx={{ textAlign: 'center', py: 4 }}
            />
          </ListItem>
        ) : (
          cartItems.map((item, index) => (
            <ListItem
              key={item.product.id}
              sx={{
                borderBottom: '1px solid #eee',
                py: 1,
              }}
            >
              <ListItemText
                primary={item.product.name}
                secondary={`Rs. ${item.product.price.toFixed(2)} x ${item.quantity}`}
                sx={{ pr: 8 }}
              />
              
              <ListItemSecondaryAction>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <IconButton
                    edge="end"
                    aria-label="decrease"
                    onClick={() => updateCartItemQuantity(index, item.quantity - 1)}
                    size="small"
                  >
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                  
                  <Typography variant="body2" sx={{ mx: 1, minWidth: 24, textAlign: 'center' }}>
                    {item.quantity}
                  </Typography>
                  
                  <IconButton
                    edge="end"
                    aria-label="increase"
                    onClick={() => updateCartItemQuantity(index, item.quantity + 1)}
                    size="small"
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                  
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => removeCartItem(index)}
                    sx={{ ml: 1 }}
                    size="small"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
                
                <Typography variant="body2" sx={{ mt: 1, textAlign: 'right', fontWeight: 'bold' }}>
                  Rs. {item.subtotal.toFixed(2)}
                </Typography>
              </ListItemSecondaryAction>
            </ListItem>
          ))
        )}
      </List>
    );
  };
  
  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Point of Sale
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        {/* Left Side - Products */}
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 66.66%' } }}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', mb: 2 }}>
              {/* Barcode Scanner Input */}
              <Box component="form" onSubmit={handleBarcodeSubmit} sx={{ mr: 2, flex: 1 }}>
                <TextField
                  fullWidth
                  label="Scan Barcode"
                  variant="outlined"
                  size="small"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  inputRef={barcodeInputRef}
                  disabled={loading}
                  InputProps={{
                    endAdornment: loading ? (
                      <InputAdornment position="end">
                        <CircularProgress size={20} />
                      </InputAdornment>
                    ) : barcodeInput ? (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          onClick={() => setBarcodeInput('')}
                        >
                          <ClearIcon />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  }}
                />
              </Box>
              
              {/* Product Search */}
              <TextField
                label="Search Products"
                variant="outlined"
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ flex: 1 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery ? (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        onClick={() => setSearchQuery('')}
                      >
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
              />
            </Box>
            
            {/* Products Grid */}
            <Box sx={{ mt: 2 }}>
              {renderProductGrid()}
            </Box>
          </Paper>
        </Box>
        
        {/* Right Side - Cart */}
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 33.33%' } }}>
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              Cart
            </Typography>
            
            <Divider sx={{ mb: 2 }} />
            
            {/* Cart Items */}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {renderCartItems()}
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            {/* Cart Summary */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1">Subtotal:</Typography>
                <Typography variant="body1">Rs. {cartSubtotal.toFixed(2)}</Typography>
              </Box>
              
              {cartDiscount > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1">Discount:</Typography>
                  <Typography variant="body1">Rs. {cartDiscount.toFixed(2)}</Typography>
                </Box>
              )}
              
              {cartTax > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1">Tax:</Typography>
                  <Typography variant="body1">Rs. {cartTax.toFixed(2)}</Typography>
                </Box>
              )}
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="h6">Total:</Typography>
                <Typography variant="h6">Rs. {cartTotal.toFixed(2)}</Typography>
              </Box>
            </Box>
            
            {/* Cart Actions */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                color="error"
                fullWidth
                onClick={clearCart}
                disabled={cartItems.length === 0}
              >
                Clear
              </Button>
              
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleCheckout}
                disabled={cartItems.length === 0}
              >
                Checkout
              </Button>
            </Box>
          </Paper>
        </Box>
      </Box>
      
      {/* Checkout Dialog */}
      <Dialog
        open={checkoutDialogOpen}
        onClose={() => !processingSale && setCheckoutDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Complete Sale</DialogTitle>
        
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="h6" gutterBottom>
              Sale Summary
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body1">Total Items:</Typography>
              <Typography variant="body1">{cartItems.reduce((sum, item) => sum + item.quantity, 0)}</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body1">Subtotal:</Typography>
              <Typography variant="body1">Rs. {cartSubtotal.toFixed(2)}</Typography>
            </Box>
            
            {cartDiscount > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1">Discount:</Typography>
                <Typography variant="body1">Rs. {cartDiscount.toFixed(2)}</Typography>
              </Box>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6">Total:</Typography>
              <Typography variant="h6">Rs. {cartTotal.toFixed(2)}</Typography>
            </Box>
            
            <Divider sx={{ mb: 3 }} />
            
            <Typography variant="h6" gutterBottom>
              Customer Information (Optional)
            </Typography>
            
            <TextField
              margin="dense"
              label="Customer Name"
              fullWidth
              variant="outlined"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              sx={{ mb: 2 }}
            />
            
            <TextField
              margin="dense"
              label="Customer Phone"
              fullWidth
              variant="outlined"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              sx={{ mb: 3 }}
            />
            
            <Typography variant="h6" gutterBottom>
              Payment Method
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              <Button
                variant={paymentMethod === 'cash' ? 'contained' : 'outlined'}
                color="primary"
                onClick={() => setPaymentMethod('cash')}
                startIcon={<CashIcon />}
              >
                Cash
              </Button>
              
              <Button
                variant={paymentMethod === 'credit_card' ? 'contained' : 'outlined'}
                color="primary"
                onClick={() => setPaymentMethod('credit_card')}
                startIcon={<CardIcon />}
              >
                Credit Card
              </Button>
              
              <Button
                variant={paymentMethod === 'debit_card' ? 'contained' : 'outlined'}
                color="primary"
                onClick={() => setPaymentMethod('debit_card')}
                startIcon={<CardIcon />}
              >
                Debit Card
              </Button>
              
              <Button
                variant={paymentMethod === 'mobile_payment' ? 'contained' : 'outlined'}
                color="primary"
                onClick={() => setPaymentMethod('mobile_payment')}
                startIcon={<CardIcon />}
              >
                Mobile Payment
              </Button>
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button
            onClick={() => setCheckoutDialogOpen(false)}
            disabled={processingSale}
          >
            Cancel
          </Button>
          
          <Button
            onClick={handleCheckout}
            variant="contained"
            color="primary"
            disabled={processingSale}
            startIcon={processingSale ? <CircularProgress size={20} /> : <ReceiptIcon />}
          >
            {processingSale ? 'Processing...' : 'Complete Sale'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Receipt Dialog */}
      <Dialog
        open={receiptDialogOpen}
        onClose={() => setReceiptDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Receipt Generated</DialogTitle>
        
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Sale has been completed successfully!
          </Typography>
          
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              my: 3,
            }}
          >
            <Button
              variant="contained"
              color="primary"
              startIcon={<PrintIcon />}
              onClick={() => {
                // Open receipt in new tab
                window.open(`http://localhost:5000${receiptUrl}`, '_blank');
              }}
            >
              Print Receipt
            </Button>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button
            onClick={() => setReceiptDialogOpen(false)}
            variant="contained"
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Error/Success Messages */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
      
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccessMessage(null)} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default POS;