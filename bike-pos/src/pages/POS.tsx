import 'bootstrap/dist/css/bootstrap.min.css';
import React, { useEffect, useRef, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  InputGroup,
  ListGroup,
  Modal,
  Row,
  Spinner,
  Table
} from 'react-bootstrap';
// Fix icon imports
import {
  BsDash,
  BsPlus,
  BsSearch,
  BsTrash,
  BsX
} from 'react-icons/bs';
import QRScanner from '../components/QRScanner';
import { useAuth } from '../contexts/AuthContext';
import { productsApi, salesApi } from '../services/api'; // Add salesApi import

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

// Update CartItem type to handle manual items
interface CartItem {
  product?: Product; // Make product optional for manual items
  manualItem?: boolean; // Flag for manual items
  name?: string; // For manual items
  barcode?: string; // Optional barcode for manual items
  price?: number; // Price for manual items
  quantity: number;
  subtotal: number;
  discount: number;
}

// Payment method type
type PaymentMethod = 'cash' | 'credit_card' | 'debit_card' | 'mobile_payment' | 'other';

// Update Sale interface to completely separate manual and product items
interface Sale {
  items: Array<{
    productId?: number;
    quantity: number;
    price: number;
    discount?: number;
    isManual?: boolean; // Updated flag name for consistency with backend
    name?: string; // Name for manual items
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  customerName?: string;
  customerPhone?: string;
  user?: number;
}

// Define Receipt data structure
interface ReceiptData {
  id: string | number;
  invoiceNumber: string;
  date: string;
  customer: string;
  cashier: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
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
  const [manualDiscount, setManualDiscount] = useState<number>(0);
  
  // Checkout dialog state
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [processingSale, setProcessingSale] = useState(false);
  
  // Receipt dialog state
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [printingReceipt, setPrintingReceipt] = useState(false);
  
  // Receipt preview reference for direct printing
  const receiptPreviewRef = useRef<HTMLDivElement>(null);
  
  // QR scanner state
  const [scanningMessage, setScanningMessage] = useState<string | null>(null);
  const [scanningProduct, setScanningProduct] = useState<Product | null>(null);
  
  // Focus references
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  
  // Add a reference for the complete sale button
  const completeSaleButtonRef = useRef<HTMLButtonElement>(null);
  
  // Add a state to track temporary empty input values
  const [tempQuantities, setTempQuantities] = useState<{[key: number]: string}>({});

  // Add state for manual entry mode and form
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualItemName, setManualItemName] = useState('');
  const [manualItemPrice, setManualItemPrice] = useState('');
  const [manualItemQuantity, setManualItemQuantity] = useState('1');

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
  const cartTotal = cartSubtotal - cartDiscount - manualDiscount + cartTax;
  
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
      
      console.log("QR scan received:", qrData);
      
      // Verify we have usable data in the QR code
      if (!qrData) {
        setScanningMessage('Invalid QR data: Empty or null data received');
        return;
      }
      
      let product;
      let identifierType = '';
      
      // First try using barcode if available
      if (qrData.barcode) {
        identifierType = 'barcode';
        console.log("Trying to fetch by barcode:", qrData.barcode);
        try {
          const response = await productsApi.getByBarcode(qrData.barcode);
          if (response.data) {
            product = response.data;
            console.log("Product found by barcode:", product);
          }
        } catch (error) {
          console.warn("Barcode lookup failed:", error);
          // Continue to try other methods
        }
      }
      
      // If no product found by barcode, try by ID
      if (!product && qrData.id) {
        identifierType = 'id';
        console.log("Trying to fetch by ID:", qrData.id);
        try {
          const response = await productsApi.getById(qrData.id);
          if (response.data) {
            product = response.data;
            console.log("Product found by ID:", product);
          }
        } catch (error) {
          console.warn("ID lookup failed:", error);
        }
      }
      
      // If both methods failed, search by name as last resort
      if (!product && qrData.name) {
        identifierType = 'name';
        console.log("Trying to search by name:", qrData.name);
        // This would require implementing a search by name API
        try {
          // Use getAll with query params instead of a direct search method
          const response = await productsApi.getAll({ search: qrData.name });
          if (response.data && response.data.products && response.data.products.length > 0) {
            product = response.data.products[0]; // Take the first match
            console.log("Product found by name search:", product);
          }
        } catch (error) {
          console.warn("Name search failed:", error);
        }
      }
      
      // Check if product exists
      if (!product) {
        setScanningMessage(`Product not found. Could not find product with ${identifierType || 'provided data'}.`);
        return;
      }
      
      // Check if product is in stock
      if (product.stockQuantity <= 0) {
        setScanningMessage('Product is out of stock.');
        return;
      }
      
      // Set the scanned product for display
      setScanningProduct(product);
      
      // Directly add the product to cart instead of showing quantity modal
      addToCart(product);
      
      // Show success message
      setScanningMessage(`Added ${product.name} to cart!`);
      
    } catch (err) {
      console.error('Error processing QR code:', err);
      setScanningMessage('Error processing QR code. Please try again or enter the barcode manually.');
    } finally {
      setLoading(false);
    }
  };

  // Add product to cart
  const addToCart = (product: Product) => {
    console.log('addToCart called for:', product.name);
    
    // Use a function that receives the latest state to ensure we're working with the most current data
    setCartItems(prevItems => {
      console.log('Previous cart items:', prevItems.length);
      
      // Check if product is already in cart
      const existingItemIndex = prevItems.findIndex(
        item => item.product && item.product.id === product.id
      );
      
      if (existingItemIndex >= 0) {
        // Get the most up-to-date item from the current state
        const currentItem = prevItems[existingItemIndex];
        console.log('Product exists, current quantity:', currentItem.quantity);
        
        // Update quantity if already in cart
        const updatedItems = [...prevItems];
        
        // Check if we have enough stock
        if (currentItem.product && currentItem.quantity >= currentItem.product.stockQuantity) {
          setError('Cannot add more of this product. Stock limit reached.');
          return prevItems;
        }
        
        // Only increment by 1
        const newQuantity = currentItem.quantity + 1;
        updatedItems[existingItemIndex] = {
          ...currentItem,
          quantity: newQuantity,
          subtotal: newQuantity * (currentItem.product?.price || currentItem.price || 0)
        };
        
        console.log('New quantity:', newQuantity);
        return updatedItems;
      } else {
        console.log('Adding new product to cart');
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
      
      if (item.product && newQuantity > item.product.stockQuantity) {
        setError('Cannot add more of this product. Stock limit reached.');
        return prevItems;
      }
      
      // Update quantity and subtotal
      item.quantity = newQuantity;
      // Calculate subtotal based on whether it's a product or manual item
      item.subtotal = newQuantity * (item.product?.price || item.price || 0);
      
      return updatedItems;
    });
  };
  
  // Handle item discount change
  const handleItemDiscountChange = (index: number, discount: number) => {
    setCartItems(prevItems => {
      const updatedItems = [...prevItems];
      const item = updatedItems[index];
      
      // Ensure discount doesn't exceed item subtotal
      const maxDiscount = item.subtotal;
      const validDiscount = isNaN(discount) || discount < 0 ? 0 : 
                           discount > maxDiscount ? maxDiscount : discount;
      
      item.discount = validDiscount;
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
  
  // Handle checkout process
  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      setError('Cart is empty. Please add items before checkout.');
      return;
    }
    
    // Open checkout dialog
    setCheckoutDialogOpen(true);
  };
  
  // Add useEffect to handle keyboard events for the checkout dialog
  useEffect(() => {
    if (checkoutDialogOpen && !processingSale) {
      // Focus the complete sale button when the dialog opens
      setTimeout(() => {
        if (completeSaleButtonRef.current) {
          completeSaleButtonRef.current.focus();
        }
      }, 100);
      
      // Add event listener for Enter key
      const handleEnterKey = (event: KeyboardEvent) => {
        if (event.key === 'Enter' && !processingSale) {
          event.preventDefault();
          processSale();
        }
      };
      
      // Add the event listener
      window.addEventListener('keydown', handleEnterKey);
      
      // Clean up
      return () => {
        window.removeEventListener('keydown', handleEnterKey);
      };
    }
  }, [checkoutDialogOpen, processingSale]);
  
  // Process the sale after checkout confirmation
  const processSale = async () => {
    try {
      setProcessingSale(true);
      setError(null);
      
      // Prepare sale items by correctly separating manual and product items
      const saleItems = cartItems.map(item => {
        if (item.product) {
          // Regular product item
          return {
            productId: item.product.id,
            quantity: item.quantity,
            price: item.product.price,
            discount: item.discount || 0
          };
        } else {
          // Manual item - ensure we include isManual flag and name
          return {
            isManual: true,
            name: item.name || 'Manual Item',
            quantity: item.quantity,
            price: item.price || 0,
            discount: item.discount || 0
          };
        }
      });
      
      // Prepare sale data with proper structure matching backend model
      const sale: Sale = {
        items: saleItems,
        subtotal: cartSubtotal,
        discount: manualDiscount,
        tax: cartTax,
        total: cartTotal,
        paymentMethod,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        user: user?.id
      };
      
      console.log("Sending sale data:", JSON.stringify(sale)); // Add logging to debug
      
      // Use the salesApi endpoint
      const response = await salesApi.create(sale);
      
      // Handle successful sale
      if (response.data) {
        // Set receipt data for direct printing with better handling of manual items
        const receiptDataForPrint = {
          id: response.data._id || response.data.id,
          invoiceNumber: response.data.invoiceNumber || `INV-${Date.now()}`,
          date: new Date().toLocaleString(),
          customer: customerName || 'Walk-in Customer',
          cashier: user?.name || user?.username || 'Staff',
          items: cartItems.map(item => ({
            name: item.product ? item.product.name : (item.name || 'Manual Item'),
            quantity: item.quantity,
            price: item.product ? item.product.price : (item.price || 0),
            total: (item.quantity * (item.product ? item.product.price : (item.price || 0))) - item.discount
          })),
          subtotal: cartSubtotal,
          discount: cartDiscount + manualDiscount,
          tax: cartTax,
          total: cartTotal,
          paymentMethod: paymentMethod
        };
        
        // Close checkout dialog and reset state
        setCheckoutDialogOpen(false);
        setCartItems([]);
        setManualDiscount(0);
        setCustomerName('');
        setCustomerPhone('');
        setPaymentMethod('cash');
        
        setSuccessMessage('Sale completed successfully!');
        
        // Directly print receipt without showing the receipt dialog
        directPrintReceipt(receiptDataForPrint);
      }
    } catch (err: any) {
      console.error('Error processing sale:', err);
      console.error('Response data:', err?.response?.data); // Add more detailed error logging
      setError(`Failed to process sale: ${err?.response?.data?.message || err?.message || 'Unknown error'}`);
    } finally {
      setProcessingSale(false);
    }
  };

  // Direct print receipt function (bypasses the receipt preview dialog)
  const directPrintReceipt = async (receiptToPrint: ReceiptData) => {
    try {
      setPrintingReceipt(true);

      // Get the current shop from Auth context
      const currentShop = user?.shopId ? { name: user.shopId.name } : null;
      const shopName = currentShop?.name || "Bike Shop";

      // Create a hidden iframe for printing
      const printIframe = document.createElement('iframe');
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = 'none';
      document.body.appendChild(printIframe);
      
      // Ensure all items have valid properties before generating receipt HTML
      const safeItems = receiptToPrint.items.map(item => ({
        name: item.name || 'Unnamed Item',
        quantity: item.quantity || 1,
        price: typeof item.price === 'number' ? item.price : 0,
        total: typeof item.total === 'number' ? item.total : 0
      }));
      
      // Generate receipt HTML content specifically optimized for XP-365B 80mm thermal printer
      const receiptHtml = `
        <html>
          <head>
            <title>XP-365B Receipt</title>
            <style>
              @page { 
                size: 80mm auto;  /* XP-365B standard thermal paper width */
                margin: 0mm;      /* Remove browser margins */
              }
              body { 
                font-family: 'Arial', sans-serif; 
                font-size: 12px; 
                width: 72mm;      /* Slightly less than paper width to avoid cutoff */
                margin: 4mm;
                padding: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .receipt {
                width: 100%;
              }
              .text-center { 
                text-align: center; 
              }
              hr { 
                border: none; 
                border-top: 1px dashed #000; /* Dashed lines for easier tear-off */
                margin: 5px 0; 
              }
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 5px 0;
              }
              th {
                font-weight: bold;
                text-align: left;
                font-size: 11px;
              }
              .item-row td {
                font-size: 12px;
                padding: 2px 0;
              }
              .summary-row {
                display: flex;
                justify-content: space-between;
                margin: 2px 0;
                font-size: 12px;
              }
              .total-row {
                font-weight: bold;
                font-size: 14px;
                margin-top: 5px;
              }
              .store-info {
                font-size: 10px;
                margin-top: 10px;
              }
              /* Ensure text doesn't overflow the paper width */
              .truncate {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 38mm; /* XP-365B specific width adjustment */
              }
              /* Add spacing for thermal printer cut marks */
              .paper-cut-space {
                height: 15mm;
              }
            </style>
          </head>
          <body>
            <div class="receipt">
              <div class="text-center">
                <h2 style="margin: 0px 0 4px 0; font-size: 18px;">${shopName}</h2>
                <h3 style="margin: 0px 0 4px 0; font-size: 16px;">RECEIPT</h3>
                <p style="margin: 3px 0; font-size: 11px;">${receiptToPrint.date}</p>
                <p style="margin: 3px 0; font-size: 11px;">Invoice: ${receiptToPrint.invoiceNumber}</p>
              </div>
              
              <hr />
              
              <div>
                <p style="margin: 2px 0; font-size: 11px;">Customer: ${receiptToPrint.customer}</p>
                <p style="margin: 2px 0; font-size: 11px;">Cashier: ${receiptToPrint.cashier}</p>
              </div>
              
              <hr />
              
              <table>
                <thead>
                  <tr>
                    <th style="width: 40%;">Item</th>
                    <th style="width: 15%; text-align: center;">Qty</th>
                    <th style="width: 20%; text-align: right;">Price</th>
                    <th style="width: 25%; text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${safeItems.map(item => `
                    <tr class="item-row">
                      <td class="truncate">${item.name}</td>
                      <td style="text-align: center;">${item.quantity}</td>
                      <td style="text-align: right;">${item.price.toFixed(2)}</td>
                      <td style="text-align: right;">${item.total.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              
              <hr />
              
              <div>
                <div class="summary-row">
                  <span>Subtotal:</span>
                  <span>Rs. ${receiptToPrint.subtotal.toFixed(2)}</span>
                </div>
                ${receiptToPrint.discount > 0 ? `
                  <div class="summary-row">
                    <span>Discount:</span>
                    <span>Rs. ${receiptToPrint.discount.toFixed(2)}</span>
                  </div>
                ` : ''}
                ${receiptToPrint.tax > 0 ? `
                  <div class="summary-row">
                    <span>Tax:</span>
                    <span>Rs. ${receiptToPrint.tax.toFixed(2)}</span>
                  </div>
                ` : ''}
                <div class="summary-row total-row">
                  <span>Total:</span>
                  <span>Rs. ${receiptToPrint.total.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                  <span>Payment Method:</span>
                  <span>${receiptToPrint.paymentMethod.replace('_', ' ').toUpperCase()}</span>
                </div>
              </div>
              
              <hr />
              
              <div class="text-center">
                <p style="margin: 2px 0;">Thank you for your purchase!</p>
                <p style="margin: 2px 0;">Please visit again</p>
              </div>
              
              <!-- Add space for the paper cutter -->
              <div class="paper-cut-space"></div>
            </div>
          </body>
        </html>
      `;
      
      // Get iframe's document and write content
      const iframeDoc = printIframe.contentDocument || printIframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(receiptHtml);
        iframeDoc.close();

        // Trigger print once content is loaded
        const onIframeLoad = () => {
          try {
            // Remove event listener
            printIframe.removeEventListener('load', onIframeLoad);
            
            // Focus the iframe window and print
            printIframe.contentWindow?.focus();
            
            // Add a small delay to ensure styles are properly loaded
            setTimeout(() => {
              printIframe.contentWindow?.print();
              
              // Set a timeout to remove the iframe after printing
              setTimeout(() => {
                document.body.removeChild(printIframe);
                setPrintingReceipt(false);
              }, 500);
            }, 200);
          } catch (err) {
            console.error('Error during iframe print:', err);
            document.body.removeChild(printIframe);
            setPrintingReceipt(false);
          }
        };

        // Add load event listener
        printIframe.addEventListener('load', onIframeLoad);
      } else {
        throw new Error('Could not access iframe document');
      }
    } catch (err) {
      console.error('Error printing receipt:', err);
      setError('Failed to print receipt. Please try again.');
      setPrintingReceipt(false);
    }
  };
  
  // We can keep the handlePrintReceipt function for any manual receipt printing needs,
  // but we won't be using receiptDialogOpen in the main flow anymore
  
  // Remove or comment out the handleReceiptKeyPress function as we're not showing the dialog

  // Add a function to handle manual item submission
  const handleManualItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!manualItemName.trim()) {
      setError('Item name is required');
      return;
    }
    
    const price = parseFloat(manualItemPrice);
    if (isNaN(price) || price <= 0) {
      setError('Please enter a valid price');
      return;
    }
    
    const quantity = parseInt(manualItemQuantity, 10);
    if (isNaN(quantity) || quantity <= 0) {
      setError('Please enter a valid quantity');
      return;
    }
    
    // Create manual item and add to cart
    const newItem: CartItem = {
      manualItem: true,
      name: manualItemName.trim(),
      price: price,
      quantity: quantity,
      subtotal: price * quantity,
      discount: 0
    };
    
    setCartItems(prev => [...prev, newItem]);
    
    // Reset form
    setManualItemName('');
    setManualItemPrice('');
    setManualItemQuantity('1');
    setSuccessMessage('Manual item added to cart');
  };

  // Render product grid
  const renderProductGrid = () => {
    const productsToRender = filteredProducts || [];
    
    return (
      <div className="w-100">
        {loadingProducts ? (
          <div className="d-flex justify-content-center my-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        ) : productsToRender.length === 0 ? (
          <div className="text-center my-5">
            <p className="text-muted">No products found. Try a different search.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <Table hover size="sm" className="align-middle">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th className="text-end">Price</th>
                  <th className="text-end">Stock</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {productsToRender.map(product => (
                  <tr
                    key={product.id}
                    className={product.stockQuantity <= 0 ? 'table-secondary' : ''}
                  >
                    <td>{product.name}</td>
                    <td>{product.Category?.name || 'Uncategorized'}</td>
                    <td className="text-end">Rs. {product.price.toFixed(2)}</td>
                    <td className="text-end">
                      <Badge bg={product.stockQuantity > 10 ? "success" : 
                              product.stockQuantity > 0 ? "warning" : "danger"}>
                        {product.stockQuantity}
                      </Badge>
                    </td>
                    <td className="text-center">
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={product.stockQuantity <= 0}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          e.nativeEvent.stopImmediatePropagation();
                          if (product.stockQuantity > 0) {
                            // Directly add to cart instead of opening quantity modal
                            addToCart(product);
                          } else {
                            setError('Product is out of stock.');
                          }
                        }}
                      >
                        <>{BsPlus({ size: 16, className: "me-1" })}</>Add
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </div>
    );
  };
  
  // Render cart items
  const renderCartItems = () => {
    return (
      <ListGroup variant="flush" className="cart-items">
        {cartItems.length === 0 ? (
          <ListGroup.Item className="text-center py-4">
            <p className="text-muted mb-0">Cart is empty</p>
            <small>Scan or search for products to add</small>
          </ListGroup.Item>
        ) : (
          cartItems.map((item, index) => (
            <ListGroup.Item key={item.product?.id || `manual-${index}`} className="py-3">
              <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-2">
                <div>
                  <h6 className="mb-1">{item.product ? item.product.name : item.name}</h6>
                  <small className="text-muted">
                    Rs. {item.product ? item.product.price.toFixed(2) : item.price?.toFixed(2)} x {item.quantity}
                  </small>
                </div>
                
                <div className="d-flex align-items-center my-2 my-md-0">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="p-1"
                    onClick={() => updateCartItemQuantity(index, item.quantity - 1)}
                  >
                    <>{BsDash({ size: 16 })}</>
                  </Button>
                  <Form.Control
                    type="text"
                    min="1"
                    max={item.product?.stockQuantity || 9999}
                    className="mx-2"
                    value={tempQuantities[index] !== undefined ? tempQuantities[index] : item.quantity.toString()}
                    onChange={(e) => {
                      // Store the current input value in tempQuantities
                      const newTempQuantities = { ...tempQuantities };
                      newTempQuantities[index] = e.target.value;
                      setTempQuantities(newTempQuantities);
                      
                      // If the input is not empty, update the actual quantity
                      if (e.target.value !== '') {
                        const newValue = parseInt(e.target.value, 10);
                        if (!isNaN(newValue)) {
                          updateCartItemQuantity(index, newValue);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      // When the field loses focus, ensure it has a valid value
                      if (e.target.value === '' || isNaN(parseInt(e.target.value, 10))) {
                        // Reset to 1 as default if empty or invalid
                        updateCartItemQuantity(index, 1);
                      }
                      
                      // Clear the temporary value
                      const newTempQuantities = { ...tempQuantities };
                      delete newTempQuantities[index];
                      setTempQuantities(newTempQuantities);
                    }}
                    onKeyDown={(e) => {
                      // Handle Enter key
                      if (e.key === 'Enter') {
                        if (e.currentTarget.value === '' || isNaN(parseInt(e.currentTarget.value, 10))) {
                          updateCartItemQuantity(index, 1);
                        }
                        e.currentTarget.blur(); // Remove focus
                        
                        // Clear the temporary value
                        const newTempQuantities = { ...tempQuantities };
                        delete newTempQuantities[index];
                        setTempQuantities(newTempQuantities);
                      }
                    }}
                    style={{ width: '60px', textAlign: 'center', padding: '2px' }}
                  />
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="p-1"
                    onClick={() => updateCartItemQuantity(index, item.quantity + 1)}
                  >
                    <>{BsPlus({ size: 16 })}</>
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    className="ms-2 p-1"
                    onClick={() => removeCartItem(index)}
                  >
                    <>{BsTrash({ size: 16 })}</>
                  </Button>
                </div>
              </div>
              
              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                  <Form.Label className="mb-0 me-2">Discount:</Form.Label>
                  <InputGroup size="sm">
                    <InputGroup.Text>Rs.</InputGroup.Text>
                    <Form.Control
                      type="number"
                      value={item.discount}
                      onChange={(e) => handleItemDiscountChange(index, parseFloat(e.target.value))}
                      style={{ width: '80px' }}
                    />
                  </InputGroup>
                </div>
                <div className="text-end fw-bold">
                  Rs. {(item.subtotal - item.discount).toFixed(2)}
                </div>
              </div>
            </ListGroup.Item>
          ))
        )}
      </ListGroup>
    );
  };
  
  // Error Alert component
  const ErrorAlert = () => {
    return error ? (
      <div className="alert alert-danger alert-dismissible fade show mt-2" role="alert">
        {error}
        <button type="button" className="btn-close" onClick={() => setError(null)}></button>
      </div>
    ) : null;
  };

  // Success Alert component
  const SuccessAlert = () => {
    return successMessage ? (
      <div className="alert alert-success alert-dismissible fade show mt-2" role="alert">
        {successMessage}
        <button type="button" className="btn-close" onClick={() => setSuccessMessage(null)}></button>
      </div>
    ) : null;
  };
  
  return (
    <Container fluid className="vh-100 p-0">
      <Row className="h-100 g-0">
        {/* QR Scanner Section - Collapsed on mobile, visible on larger screens */}
        <Col lg={3} className="d-none d-lg-block h-100 border-end">
          <div className="d-flex flex-column h-100 p-3">
            <h5 className="mb-3">QR Scanner</h5>
            <div className="flex-grow-1 position-relative qr-scanner-container">
              <QRScanner
                onScanSuccess={handleQRScanSuccess}
                onScanError={(error) => setScanningMessage(error)}
                autoStart={true}
              />
            </div>
            {scanningMessage && (
              <div className="alert alert-info mt-3 mb-0">
                {scanningMessage}
              </div>
            )}
          </div>
        </Col>

        {/* Main Content Section */}
        <Col xs={12} lg={9} className="h-100 d-flex flex-column">
          <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
            <h4 className="m-0">Point of Sale</h4>
            
            {/* Mobile QR Button - Shows QR scanner in modal on small screens */}
            <Button 
              variant="outline-primary" 
              className="d-lg-none"
              onClick={() => {/* Code to open QR scanner modal */}}
            >
              Scan QR
            </Button>
          </div>
          
          <div className="p-3 flex-grow-1 overflow-auto">
            <Row>
              {/* Product Search and Grid Section */}
              <Col lg={8} className="mb-4 mb-lg-0">
                <Card className="shadow-sm mb-4">
                  <Card.Body>
                    <Row className="mb-3">
                      {/* Toggle between product search and manual entry */}
                      <Col md={6} className="mb-3 mb-md-0">
                        <div className="btn-group w-100">
                          <Button 
                            variant={isManualMode ? "outline-primary" : "primary"}
                            onClick={() => setIsManualMode(false)}
                            className="flex-grow-1"
                          >
                            Products
                          </Button>
                          <Button 
                            variant={isManualMode ? "primary" : "outline-primary"}
                            onClick={() => setIsManualMode(true)}
                            className="flex-grow-1"
                          >
                            Manual Entry
                          </Button>
                        </div>
                      </Col>
                      
                      {/* Product Search or Manual Entry Form */}
                      <Col md={6}>
                        {isManualMode ? (
                          <Form onSubmit={handleManualItemSubmit}>
                            <InputGroup className="mb-2">
                              <Form.Control
                                type="text"
                                placeholder="Item name"
                                value={manualItemName}
                                onChange={(e) => setManualItemName(e.target.value)}
                                required
                              />
                            </InputGroup>
                            <Row>
                              <Col xs={7}>
                                <InputGroup className="mb-2">
                                  <InputGroup.Text>Rs.</InputGroup.Text>
                                  <Form.Control
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="Price"
                                    value={manualItemPrice}
                                    onChange={(e) => setManualItemPrice(e.target.value)}
                                    required
                                  />
                                </InputGroup>
                              </Col>
                              <Col xs={5}>
                                <InputGroup className="mb-2">
                                  <Form.Control
                                    type="number"
                                    min="1"
                                    placeholder="Qty"
                                    value={manualItemQuantity}
                                    onChange={(e) => setManualItemQuantity(e.target.value)}
                                    required
                                  />
                                </InputGroup>
                              </Col>
                            </Row>
                            <Button type="submit" variant="success" className="w-100">
                              <>{BsPlus({ size: 16, className: "me-1" })}</>Add to Cart
                            </Button>
                          </Form>
                        ) : (
                          <InputGroup>
                            <InputGroup.Text>
                              <>{BsSearch({ size: 16 })}</>
                            </InputGroup.Text>
                            <Form.Control
                              type="text"
                              placeholder="Search Products"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                              <Button variant="outline-secondary" onClick={() => setSearchQuery('')}>
                                <>{BsX({ size: 16 })}</>
                              </Button>
                            )}
                          </InputGroup>
                        )}
                      </Col>
                    </Row>
                    
                    <ErrorAlert />
                    <SuccessAlert />
                    
                    {/* Products Grid or Manual Entry Instructions */}
                    {!isManualMode ? renderProductGrid() : (
                      <div className="text-center my-5 py-5">
                        <h5>Manual Item Entry Mode</h5>
                        <p className="text-muted">
                          Use the form above to add custom items to your cart.<br/>
                          These items will be included in the bill but won't affect inventory.
                        </p>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>

              {/* Cart Section */}
              <Col lg={4} className="d-flex flex-column h-100">
                <Card className="shadow-sm h-100 d-flex flex-column">
                  <Card.Header className="bg-primary text-white">
                    <h5 className="mb-0">Shopping Cart</h5>
                  </Card.Header>
                  <div className="flex-grow-1 overflow-auto">
                    {renderCartItems()}
                  </div>
                  <Card.Footer className="bg-white">
                    {/* Cart Summary */}
                    <div className="mb-3">
                      <div className="d-flex justify-content-between mb-2">
                        <span>Subtotal:</span>
                        <span>Rs. {cartSubtotal.toFixed(2)}</span>
                      </div>
                      
                      {cartDiscount > 0 && (
                        <div className="d-flex justify-content-between mb-2 text-danger">
                          <span>Item Discounts:</span>
                          <span>-Rs. {cartDiscount.toFixed(2)}</span>
                        </div>
                      )}
                      
                      <div className="d-flex justify-content-between mb-2 align-items-center">
                        <span>Additional Discount:</span>
                        <InputGroup size="sm" style={{ maxWidth: "140px" }}>
                          <InputGroup.Text>Rs.</InputGroup.Text>
                          <Form.Control
                            type="number"
                            value={manualDiscount}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              if (isNaN(value) || value < 0) {
                                setManualDiscount(0);
                              } else if (value > cartSubtotal - cartDiscount) {
                                setManualDiscount(cartSubtotal - cartDiscount);
                              } else {
                                setManualDiscount(value);
                              }
                            }}
                          />
                        </InputGroup>
                      </div>
                      
                      {(cartDiscount > 0 || manualDiscount > 0) && (
                        <div className="d-flex justify-content-between mb-2 text-primary">
                          <span>Total Discount:</span>
                          <span>-Rs. {(cartDiscount + manualDiscount).toFixed(2)}</span>
                        </div>
                      )}
                      
                      {cartTax > 0 && (
                        <div className="d-flex justify-content-between mb-2">
                          <span>Tax:</span>
                          <span>Rs. {cartTax.toFixed(2)}</span>
                        </div>
                      )}
                      
                      <div className="d-flex justify-content-between mt-3">
                        <h5 className="mb-0">Total:</h5>
                        <h5 className="mb-0">Rs. {cartTotal.toFixed(2)}</h5>
                      </div>
                    </div>
                    
                    {/* Cart Actions */}
                    <div className="d-grid gap-2 d-md-flex justify-content-md-between">
                      <Button
                        variant="outline-danger"
                        className="flex-fill"
                        onClick={clearCart}
                        disabled={cartItems.length === 0}
                      >
                        Clear Cart
                      </Button>
                      <Button
                        variant="success"
                        className="flex-fill"
                        onClick={handleCheckout}
                        disabled={cartItems.length === 0}
                      >
                        <>{BsPlus({ size: 16, className: "me-1" })}</>
                        Checkout
                      </Button>
                    </div>
                  </Card.Footer>
                </Card>
              </Col>
            </Row>
          </div>
        </Col>
      </Row>

      {/* Replace or modify the Receipt Preview Modal to be hidden by default 
         We'll keep it in the code but just not display it in the normal flow */}
      <Modal 
        show={false} // Always hidden by setting to false
        onHide={() => {}} 
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Receipt Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Receipt preview content removed as we're bypassing this step */}
        </Modal.Body>
      </Modal>
      
      {/* Checkout Modal */}
      <Modal
        show={checkoutDialogOpen}
        onHide={() => setCheckoutDialogOpen(false)}
        backdrop="static"
        keyboard={!processingSale}
        centered
      >
        <Modal.Header closeButton={!processingSale}>
          <Modal.Title>Complete Sale</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Customer Information */}
          <Form.Group className="mb-3">
            <Form.Label>Customer Name (Optional)</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter customer name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              disabled={processingSale}
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Customer Phone (Optional)</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter customer phone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              disabled={processingSale}
            />
          </Form.Group>
          
          {/* Payment Method */}
          <Form.Group className="mb-3">
            <Form.Label>Payment Method</Form.Label>
            <Form.Select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              disabled={processingSale}
            >
              <option value="cash">Cash</option>
              <option value="credit_card">Credit Card</option>
              <option value="debit_card">Debit Card</option>
              <option value="mobile_payment">Mobile Payment</option>
              <option value="other">Other</option>
            </Form.Select>
          </Form.Group>
          
          {/* Order Summary */}
          <div className="mt-4">
            <h6 className="mb-3">Order Summary</h6>
            <div className="d-flex justify-content-between mb-2">
              <span>Subtotal:</span>
              <span>Rs. {cartSubtotal.toFixed(2)}</span>
            </div>
            {cartDiscount > 0 && (
              <div className="d-flex justify-content-between mb-2 text-danger">
                <span>Item Discounts:</span>
                <span>-Rs. {cartDiscount.toFixed(2)}</span>
              </div>
            )}
            {manualDiscount > 0 && (
              <div className="d-flex justify-content-between mb-2 text-danger">
                <span>Additional Discount:</span>
                <span>-Rs. {manualDiscount.toFixed(2)}</span>
              </div>
            )}
            {cartTax > 0 && (
              <div className="d-flex justify-content-between mb-2">
                <span>Tax:</span>
                <span>Rs. {cartTax.toFixed(2)}</span>
              </div>
            )}
            <div className="d-flex justify-content-between mt-3 pt-2 border-top">
              <h5 className="mb-0">Total:</h5>
              <h5 className="mb-0">Rs. {cartTotal.toFixed(2)}</h5>
            </div>
          </div>
          
          {/* Error display */}
          {error && (
            <div className="alert alert-danger mt-3">
              {error}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setCheckoutDialogOpen(false)}
            disabled={processingSale}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={processSale}
            disabled={processingSale}
            ref={completeSaleButtonRef}
          >
            {processingSale ? (
              <><Spinner animation="border" size="sm" className="me-2" /> Processing...</>
            ) : (
              'Complete Sale'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default POS;