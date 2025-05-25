import {
  Add as AddIcon,
  Clear as ClearIcon,
  Delete as DeleteIcon,
  Remove as RemoveIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import QRScanner from '../components/QRScanner';
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
  
  // QR scanner state
  const [scanningMessage, setScanningMessage] = useState<string | null>(null);
  const [scanningProduct, setScanningProduct] = useState<Product | null>(null);
  
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
  
  // Add a new useEffect to ensure the QR scanner is always running when the component mounts
  useEffect(() => {
    // This ensures the camera is activated when the component mounts
    const activateCamera = () => {
      const qrScannerElement = document.querySelector('.qr-scanner-container video');
      if (qrScannerElement) {
        // If there's a start button in the QR scanner, simulate a click on it
        const startButton = document.querySelector('.qr-scanner-container button') as HTMLButtonElement;
        if (startButton) {
          startButton.click();
        }
      }
    };
    
    // Initial activation
    activateCamera();
    
    // Try again after a short delay (in case the elements aren't immediately ready)
    const timeoutId = setTimeout(activateCamera, 1000);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, []); // Empty dependency array means this runs once on mount
  
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
  
  // Handle successful QR scan
  const handleQRScanSuccess = async (qrData: any) => {
    try {
      setLoading(true);
      setScanningMessage(null);
      setScanningProduct(null);
      
      // Check if we have a barcode or id in the QR data
      if (!qrData.barcode && !qrData.id) {
        setScanningMessage('Invalid QR code data. Missing product identifier.');
        return;
      }
      
      let product;
      
      // Try to fetch product by barcode first if available
      if (qrData.barcode) {
        const response = await productsApi.getByBarcode(qrData.barcode);
        product = response.data;
      }
      
      // If no product found by barcode, try by ID
      if (!product && qrData.id) {
        const response = await productsApi.getById(qrData.id);
        product = response.data;
      }
      
      // Check if product exists
      if (!product) {
        setScanningMessage('Product not found. Please try again with a different code.');
        return;
      }
      
      // Check if product is in stock
      if (product.stockQuantity <= 0) {
        setScanningMessage('Product is out of stock.');
        return;
      }
      
      // Set the scanned product for display
      setScanningProduct(product);
      
      // Add product to cart
      addToCart(product);
      
      // Show success message
      setScanningMessage(`Added ${product.name} to cart! Scan another item.`);
      
    } catch (err) {
      console.error('Error processing QR code:', err);
      setScanningMessage('Error processing QR code. Please try again.');
    } finally {
      setLoading(false);
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
      <Box sx={{ width: '100%' }}>
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
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Stock</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {productsToRender.map(product => (
                  <TableRow
                    key={product.id}
                    sx={{
                      '&:hover': { bgcolor: 'action.hover' },
                      bgcolor: product.stockQuantity <= 0 ? 'rgba(0, 0, 0, 0.04)' : 'inherit',
                    }}
                  >
                    <TableCell component="th" scope="row">
                      {product.name}
                    </TableCell>
                    <TableCell>{product.Category?.name || 'Uncategorized'}</TableCell>
                    <TableCell align="right">Rs. {product.price.toFixed(2)}</TableCell>
                    <TableCell align="right">{product.stockQuantity}</TableCell>
                    <TableCell align="center">
                      <Button
                        variant="contained"
                        size="small"
                        disabled={product.stockQuantity <= 0}
                        onClick={() => {
                          if (product.stockQuantity > 0) {
                            addToCart(product);
                          } else {
                            setError('Product is out of stock.');
                          }
                        }}
                      >
                        Add
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
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
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* QR Scanner Section */}
      <Box
        sx={{
          width: { xs: '100%', md: '25%' },
          bgcolor: 'background.paper',
          p: 2,
          borderRight: '1px solid #ddd',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Typography variant="h6" sx={{ mb: 2 }}>
          QR Scanner
        </Typography>
        <Box sx={{ flex: 1, position: 'relative' }} className="qr-scanner-container">
          <QRScanner
            onScanSuccess={handleQRScanSuccess}
            onScanError={(error) => setScanningMessage(error)}
            autoStart={true} // Add autoStart property if your QRScanner component supports it
          />
          
        
        </Box>
      </Box>

      {/* Main Content Section */}
      <Box sx={{ flex: 1, p: 2, overflow: 'auto' }}>
        <Typography variant="h5" sx={{ mb: 3 }}>
          Point of Sale
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          {/* Left Side - Products */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 66.66%' } }}>
            {/* Product Search and Grid */}
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
                          <IconButton edge="end" onClick={() => setBarcodeInput('')}>
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
                        <IconButton edge="end" onClick={() => setSearchQuery('')}>
                          <ClearIcon />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  }}
                />
              </Box>
              {/* Products Grid */}
              <Box sx={{ mt: 2 }}>{renderProductGrid()}</Box>
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
              <Box sx={{ flex: 1, overflow: 'auto' }}>{renderCartItems()}</Box>
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
      </Box>
    </Box>
  );
};

export default POS;