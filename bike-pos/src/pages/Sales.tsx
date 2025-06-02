import React, { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  InputGroup,
  Modal,
  Row,
  Spinner,
  Table,
  Toast,
  ToastContainer
} from 'react-bootstrap';
import {
  ArrowRepeat,
  Bag,
  CheckCircleFill,
  Funnel,
  Printer,
  Search
} from 'react-bootstrap-icons';
import { useAuth } from '../contexts/AuthContext'; // Add this import
import { salesApi } from '../services/api';

// Define Sales types
interface SaleItem {
  id?: string;
  _id?: string;
  product: {
    _id: string;
    name: string;
    barcode?: string;
    sku?: string;
  };
  quantity: number;
  price: number;
  discount: number;
  subtotal?: number;
  unitPrice?: number;
  Product?: {
    id?: string;
    name: string;
    barcode?: string;
  };
  // Add these fields for manual items
  isManual?: boolean;
  name?: string;
}

interface Sale {
  id: string; // Changed from number to string
  _id?: string; // Added to handle MongoDB _id
  invoiceNumber: string;
  date: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  customerName: string | null;
  customerPhone: string | null;
  notes: string | null;
  status: 'completed' | 'returned' | 'cancelled';
  cashier?: {  // Mark cashier as optional
    id: string;
    username: string;
  };
  user?: {  // Add user property as an alternative
    name: string;
    username: string;
  };
  SaleItems?: SaleItem[];
  createdAt: string;
}

// Define Receipt data structure (add after the Sale interface)
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

const Sales: React.FC = () => {
  const { user } = useAuth(); // Add this to access user and shop information
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [printingReceipt, setPrintingReceipt] = useState(false); // Add this state
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalSales, setTotalSales] = useState(0);
  
  // Filter state
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sale detail dialog state
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [processingReturn, setProcessingReturn] = useState(false);
  
  // Receipt dialog state
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState('');
  
  // Fetch sales on component mount and when filters change
  useEffect(() => {
    fetchSales();
  }, [page, rowsPerPage, startDate, endDate, paymentMethodFilter, statusFilter, searchQuery]);
  
  // Format date for API
  const formatDateForApi = (date: Date | null) => {
    if (!date) return undefined;
    return date.toISOString().split('T')[0];
  };

  // Format date for HTML date input (YYYY-MM-DD)
  const formatDateForInput = (date: Date | null) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };
  
  // Convert string from date input to Date object
  const handleDateChange = (dateString: string, setter: React.Dispatch<React.SetStateAction<Date | null>>) => {
    if (!dateString) {
      setter(null);
      return;
    }
    setter(new Date(dateString));
  };
  
  // Fetch sales from API
  const fetchSales = async () => {
    try {
      setLoading(true);
      
      const response = await salesApi.getAll({
        page: page + 1,
        limit: rowsPerPage,
        startDate: formatDateForApi(startDate),
        endDate: formatDateForApi(endDate),
        paymentMethod: paymentMethodFilter,
        status: statusFilter,
      });
      
      setSales(response.data.sales);
      setTotalSales(response.data.totalSales);
      
    } catch (err) {
      console.error('Error fetching sales:', err);
      setError('Failed to load sales');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle page change
  const handleChangePage = (pageNumber: number) => {
    setPage(pageNumber);
  };
  
  // Handle rows per page change
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };
  
  // Reset filters
  const handleResetFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setPaymentMethodFilter('');
    setStatusFilter('');
    setSearchQuery('');
  };
  
  // Open sale detail dialog
  const handleOpenDetailDialog = async (saleId: string) => {
    try {
      // Ensure saleId is a valid string
      if (!saleId || typeof saleId !== 'string' || saleId.trim() === '') {
        console.error('Invalid sale ID detected:', saleId);
        setError(`Invalid sale ID: ${saleId}`);
        return;
      }
      
      setLoading(true);
      console.log('Fetching details for sale ID:', saleId, 'Type:', typeof saleId);
      const response = await salesApi.getById(saleId);
      
      console.log('API response:', response);
      
      if (!response.data) {
        console.error('No data received for sale ID:', saleId);
        throw new Error('Sale data not found');
      }
      
      // Check if we have a valid ID in the response
      if (!response.data.id && response.data._id) {
        console.log('Converting _id to id for frontend compatibility');
        response.data.id = response.data._id;
      }
      
      setSelectedSale(response.data);
      setDetailDialogOpen(true);
    } catch (err) {
      console.error('Error fetching sale details:', err);
      setError(`Failed to load sale details: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Close sale detail dialog
  const handleCloseDetailDialog = () => {
    setDetailDialogOpen(false);
    setSelectedSale(null);
  };
  
  // Open return dialog
  const handleOpenReturnDialog = () => {
    if (!selectedSale) return;
    
    setReturnReason('');
    setReturnDialogOpen(true);
  };
  
  // Close return dialog
  const handleCloseReturnDialog = () => {
    setReturnDialogOpen(false);
    setReturnReason('');
  };
  
  // Process sale return
  const handleProcessReturn = async () => {
    if (!selectedSale) return;
    
    try {
      setProcessingReturn(true);
      
      await salesApi.updateStatus(selectedSale.id, {
        status: 'returned',
        reason: returnReason,
      });
      
      setSuccessMessage('Sale returned successfully');
      handleCloseReturnDialog();
      handleCloseDetailDialog();
      fetchSales();
      
    } catch (err) {
      console.error('Error processing return:', err);
      setError('Failed to process return');
    } finally {
      setProcessingReturn(false);
    }
  };
  
  // Add this direct print receipt function
  const directPrintReceipt = async (sale: Sale) => {
    try {
      setPrintingReceipt(true);

      // Create a hidden iframe for printing
      const printIframe = document.createElement('iframe');
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = 'none';
      document.body.appendChild(printIframe);
      
      // Get the current shop from Auth context
      const currentShop = user?.shopId ? { name: user.shopId.name } : null;
      const shopName = currentShop?.name || "Bike Shop";
      const shopPhone = user?.shopId?.phone || "";
      const shopAddress = user?.shopId?.address || "";
      
      // Format items for receipt with improved handling of manual items
      const receiptItems = sale.SaleItems?.map(item => {
        const isManualItem = item.isManual || (!item.product && !item.Product);
        const productName = isManualItem 
          ? (item.name || 'Manual Item') 
          : (item.product?.name || item.Product?.name || 'Unknown Product');
        const unitPrice = item.price || item.unitPrice || 0;
        const itemDiscount = item.discount || 0;
        const subtotal = item.subtotal || (unitPrice * item.quantity);
        
        return {
          name: productName,
          quantity: item.quantity,
          price: unitPrice,
          discount: itemDiscount,
          total: subtotal - itemDiscount
        };
      }) || [];
      
      // Calculate total item discounts (separate from sale.discount)
      const totalItemDiscounts = receiptItems.reduce((sum, item) => sum + item.discount, 0);
      
      // Calculate total discount (item discounts + sale discount)
      const totalDiscount = totalItemDiscounts + sale.discount;
      
      // Generate receipt HTML content
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
                width: 72mm;      /* Slightly less than paper width to ensure proper printing */
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
                border-top: 1px dashed #000; 
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
                vertical-align: top; /* Align to top for multi-line text */
              }
              .item-name {
                word-wrap: break-word; /* Allow long words to break */
                word-break: break-word; /* Break words that are too long */
                white-space: normal; /* Allow text to wrap */
                max-width: 35mm; /* Set maximum width */
                padding-right: 4px; /* Add some spacing from price */
              }
              .discount-text {
                font-size: 10px;
                color: #555;
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
             
              /* Add extra space at the bottom for printer cutting */
              .paper-cut-space {
                height: 20mm;
              }
            </style>
            <script>
              // Auto-close print dialog after printing
              window.addEventListener('afterprint', function() {
                // Signal back to parent that printing is complete
                window.parent.postMessage('printComplete', '*');
              });
            </script>
          </head>
          <body>
            <div class="receipt">
              <div class="text-center">
                <h2 style="margin: 0px 0 4px 0; font-size: 18px;">${shopName}</h2>
                ${shopAddress ? `<p style="margin: 0px 0 4px 0; font-size: 12px;">${shopAddress}</p>` : ''}
                <h3 style="margin: 0px 0 4px 0; font-size: 16px;">RECEIPT</h3>
                <p style="margin: 3px 0; font-size: 11px;">${new Date(sale.date).toLocaleString()}</p>
                <p style="margin: 3px 0; font-size: 11px;">Invoice: ${sale.invoiceNumber}</p>
              </div>
              
              <hr />
              
              <div>
                <p style="margin: 2px 0; font-size: 11px;">Customer: ${sale.customerName || 'Walk-in Customer'}</p>
                <p style="margin: 2px 0; font-size: 11px;">Cashier: ${sale.user?.name || 'Unknown'}</p>
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
                  ${receiptItems.map(item => `
                    <tr class="item-row">
                      <td class="item-name">
                        ${item.name}
                      </td>
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
                  <span>Rs. ${sale.subtotal.toFixed(2)}</span>
                </div>
                ${totalDiscount > 0 ? `
                  <div class="summary-row">
                    <span>Discount:</span>
                    <span>-Rs. ${totalDiscount.toFixed(2)}</span>
                  </div>
                ` : ''}
               
                ${sale.tax > 0 ? `
                  <div class="summary-row">
                    <span>Tax:</span>
                    <span>Rs. ${sale.tax.toFixed(2)}</span>
                  </div>
                ` : ''}
                <div class="summary-row total-row">
                  <span>Total:</span>
                  <span>Rs. ${sale.total.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                  <span>Payment Method:</span>
                  <span>${sale.paymentMethod.replace('_', ' ').toUpperCase()}</span>
                </div>
              </div>
              
              <hr />
              
              <div class="text-center">
                <p style="margin: 2px 0;">Thank you for your purchase!</p>
                <p style="margin: 2px 0;">Please visit again</p>
                ${shopPhone ? `<p style="margin: 4px 0; font-size: 11px;">Contact us: ${shopPhone}</p>` : ''}
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
            
            // Print the iframe contents
            printIframe.contentWindow?.focus();
            printIframe.contentWindow?.print();
            
            // Set a timeout to remove the iframe after printing
            setTimeout(() => {
              document.body.removeChild(printIframe);
              setPrintingReceipt(false);
            }, 500);
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
  
  // Replace the existing handlePrintReceipt function with this updated version
  const handlePrintReceipt = async (saleId: string) => {
    try {
      setPrintingReceipt(true);
      
      // Fetch the complete sale data if we don't already have it
      let saleForPrinting: Sale;
      
      if (selectedSale && selectedSale.id === saleId) {
        saleForPrinting = selectedSale;
      } else {
        const response = await salesApi.getById(saleId);
        saleForPrinting = response.data;
      }
      
      // Print the receipt directly without showing the dialog
      directPrintReceipt(saleForPrinting);
      
    } catch (err) {
      console.error('Error generating receipt:', err);
      setError('Failed to generate receipt');
      setPrintingReceipt(false);
    }
  };
  
  // Generate and print receipt
  // const handlePrintReceipt = async (saleId: string) => {
  //   try {
  //     const response = await printApi.printReceipt(saleId);
      
  //     setReceiptUrl(response.data.downloadUrl);
  //     setReceiptDialogOpen(true);
      
  //   } catch (err) {
  //     console.error('Error generating receipt:', err);
  //     setError('Failed to generate receipt');
  //   }
  // };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };
  
  // Format payment method for display
  const formatPaymentMethod = (method: string) => {
    return method.replace('_', ' ').toUpperCase();
  };
  
  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'returned':
        return 'warning';
      case 'cancelled':
        return 'danger';
      default:
        return 'secondary';
    }
  };
  
  // Calculate pagination
  const totalPages = Math.ceil(totalSales / rowsPerPage);
  const paginationItems = [];
  
  for (let i = 0; i < totalPages; i++) {
    paginationItems.push(
      <li key={i} className={`page-item ${page === i ? 'active' : ''}`}>
        <button className="page-link" onClick={() => handleChangePage(i)}>
          {i + 1}
        </button>
      </li>
    );
  }
  
  return (
    <Container fluid className="px-4">
      <Row className="mb-4 align-items-center">
        <Col>
          <h2 className="mb-0">Sales</h2>
        </Col>
        <Col xs="auto">
          <Button 
            variant="primary" 
            href="/pos"
            className="d-flex align-items-center"
          >
            <Bag className="me-2" /> New Sale
          </Button>
        </Col>
      </Row>
      
      {/* Filters */}
      <Card className="mb-4 shadow-sm">
        <Card.Header className="bg-light d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Filters</h5>
          <Funnel />
        </Card.Header>
        <Card.Body>
          <Row className="g-3">
            <Col xs={12} md={6} lg={2}>
              <Form.Group>
                <Form.Label>Start Date</Form.Label>
                <Form.Control
                  type="date"
                  value={formatDateForInput(startDate)}
                  onChange={(e) => handleDateChange(e.target.value, setStartDate)}
                />
              </Form.Group>
            </Col>
            
            <Col xs={12} md={6} lg={2}>
              <Form.Group>
                <Form.Label>End Date</Form.Label>
                <Form.Control
                  type="date"
                  value={formatDateForInput(endDate)}
                  onChange={(e) => handleDateChange(e.target.value, setEndDate)}
                />
              </Form.Group>
            </Col>
            
            <Col xs={12} md={6} lg={2}>
              <Form.Select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
              >
                <option value="">All Payment Methods</option>
                <option value="cash">Cash</option>
                <option value="credit_card">Credit Card</option>
                <option value="debit_card">Debit Card</option>
                <option value="mobile_payment">Mobile Payment</option>
                <option value="other">Other</option>
              </Form.Select>
            </Col>
            
            <Col xs={12} md={6} lg={2}>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="returned">Returned</option>
                <option value="cancelled">Cancelled</option>
              </Form.Select>
            </Col>
            
            <Col xs={12} md={6} lg={2}>
              <InputGroup>
                <InputGroup.Text>
                  <Search size={16} />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Search Invoice #"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </InputGroup>
            </Col>
            
            <Col xs={12} md={6} lg={2}>
              <Button
                variant="outline-secondary"
                className="w-100 d-flex align-items-center justify-content-center"
                onClick={handleResetFilters}
              >
                <ArrowRepeat className="me-2" /> Reset
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      
      {/* Sales Table */}
      <Card className="shadow-sm">
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover>
              <thead className="table-light">
                <tr>
                  <th>Invoice #</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Payment Method</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4">
                      <Spinner animation="border" variant="primary" />
                    </td>
                  </tr>
                ) : sales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4">
                      No sales found
                    </td>
                  </tr>
                ) : (
                  sales.map((sale) => (
                    <tr 
                      key={sale.id} 
                      onClick={() => {
                        console.log('Row clicked with sale ID:', sale.id);
                        if (sale && sale.id) {
                          handleOpenDetailDialog(sale.id);
                        } else {
                          console.error('Sale ID is undefined');
                          setError('Cannot view details: Sale ID is undefined');
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>{sale.invoiceNumber}</td>
                      <td>{formatDate(sale.date)}</td>
                      <td>{sale.customerName || 'Walk-in Customer'}</td>
                      <td>{formatPaymentMethod(sale.paymentMethod)}</td>
                      <td>Rs. {sale.total.toFixed(2)}</td>
                      <td>
                        <Badge bg={getStatusBadgeVariant(sale.status)}>
                          {sale.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (sale.id) {
                              handlePrintReceipt(sale.id);
                            }
                          }}
                          disabled={printingReceipt}
                        >
                          {printingReceipt ? (
                            <Spinner animation="border" size="sm" />
                          ) : (
                            <Printer size={16} />
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
          
          {/* Pagination */}
          <div className="d-flex justify-content-between align-items-center p-3 border-top">
            <div>
              <Form.Select
                style={{ width: 'auto' }}
                value={rowsPerPage}
                onChange={handleChangeRowsPerPage}
              >
                {[5, 10, 25, 50].map(size => (
                  <option key={size} value={size}>
                    {size} rows
                  </option>
                ))}
              </Form.Select>
            </div>
            
            <nav>
              <ul className="pagination mb-0">
                <li className={`page-item ${page === 0 ? 'disabled' : ''}`}>
                  <button 
                    className="page-link" 
                    onClick={() => handleChangePage(page - 1)}
                    disabled={page === 0}
                  >
                    Previous
                  </button>
                </li>
                {paginationItems}
                <li className={`page-item ${page === totalPages - 1 ? 'disabled' : ''}`}>
                  <button 
                    className="page-link" 
                    onClick={() => handleChangePage(page + 1)}
                    disabled={page === totalPages - 1}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </Card.Body>
      </Card>
      
      {/* Sale Detail Modal */}
      <Modal 
        show={detailDialogOpen} 
        onHide={handleCloseDetailDialog}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Sale Details - {selectedSale?.invoiceNumber}
          </Modal.Title>
        </Modal.Header>
        
        <Modal.Body className="p-4">
          {selectedSale && (
            <>
              <Row className="mb-4">
                <Col md={6} className="mb-4 mb-md-0">
                  <h5 className="mb-3">Sale Information</h5>
                  <Card>
                    <Card.Body>
                      <Row className="g-3">
                        <Col xs={6}>
                          <p className="text-muted mb-1">Invoice Number</p>
                          <p className="mb-0">{selectedSale.invoiceNumber}</p>
                        </Col>
                        
                        <Col xs={6}>
                          <p className="text-muted mb-1">Date & Time</p>
                          <p className="mb-0">{formatDate(selectedSale.date)}</p>
                        </Col>
                        
                        <Col xs={6}>
                          <p className="text-muted mb-1">Cashier</p>
                          <p className="mb-0">
                            {selectedSale.cashier?.username || 
                             selectedSale.user?.username || 
                             selectedSale.user?.name || 
                             'Unknown'}
                          </p>
                        </Col>
                        
                        <Col xs={6}>
                          <p className="text-muted mb-1">Status</p>
                          <Badge bg={getStatusBadgeVariant(selectedSale.status)}>
                            {selectedSale.status.toUpperCase()}
                          </Badge>
                        </Col>
                        
                        <Col xs={6}>
                          <p className="text-muted mb-1">Payment Method</p>
                          <p className="mb-0">{formatPaymentMethod(selectedSale.paymentMethod)}</p>
                        </Col>
                        
                        <Col xs={6}>
                          <p className="text-muted mb-1">Customer</p>
                          <p className="mb-0">{selectedSale.customerName || 'Walk-in Customer'}</p>
                        </Col>
                        
                        {selectedSale.customerPhone && (
                          <Col xs={12}>
                            <p className="text-muted mb-1">Customer Phone</p>
                            <p className="mb-0">{selectedSale.customerPhone}</p>
                          </Col>
                        )}
                        
                        {selectedSale.notes && (
                          <Col xs={12}>
                            <p className="text-muted mb-1">Notes</p>
                            <p className="mb-0">{selectedSale.notes}</p>
                          </Col>
                        )}
                      </Row>
                    </Card.Body>
                  </Card>
                </Col>
                
                <Col md={6}>
                  <h5 className="mb-3">Sale Summary</h5>
                  <Card>
                    <Card.Body>
                      <div className="d-flex justify-content-between mb-2">
                        <p className="mb-0">Subtotal:</p>
                        <p className="mb-0">Rs. {selectedSale.subtotal.toFixed(2)}</p>
                      </div>
                      
                      {selectedSale.discount > 0 && (
                        <div className="d-flex justify-content-between mb-2">
                          <p className="mb-0">Discount:</p>
                          <p className="mb-0">Rs. {selectedSale.discount.toFixed(2)}</p>
                        </div>
                      )}
                      
                      {selectedSale.tax > 0 && (
                        <div className="d-flex justify-content-between mb-2">
                          <p className="mb-0">Tax:</p>
                          <p className="mb-0">Rs. {selectedSale.tax.toFixed(2)}</p>
                        </div>
                      )}
                      
                      <hr className="my-2" />
                      
                      <div className="d-flex justify-content-between">
                        <h5 className="mb-0">Total:</h5>
                        <h5 className="mb-0">Rs. {selectedSale.total.toFixed(2)}</h5>
                      </div>
                    </Card.Body>
                  </Card>
                  
                  <div className="d-flex mt-3 justify-content-between">
                    <Button 
                      variant="outline-primary" 
                      className="d-flex align-items-center"
                      onClick={() => handlePrintReceipt(selectedSale.id)}
                    >
                      <Printer className="me-2" /> Print Receipt
                    </Button>
                    
                    {selectedSale.status === 'completed' && (
                      <Button 
                        variant="outline-warning"
                        onClick={handleOpenReturnDialog}
                      >
                        Return Sale
                      </Button>
                    )}
                  </div>
                </Col>
              </Row>
              
              <h5 className="mb-3">Sale Items</h5>
              <Card>
                <div className="table-responsive">
                  <Table hover size="sm" className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Product</th>
                        <th className="text-end">Price</th>
                        <th className="text-end">Quantity</th>
                        <th className="text-end">Discount</th>
                        <th className="text-end">Subtotal</th>
                      </tr>
                    </thead>
                    
                    <tbody>
                      {selectedSale.SaleItems?.map((item: SaleItem, index) => {
                        // Calculate subtotal consistently
                        const subtotal = item.subtotal || (item.price * item.quantity);
                        
                        // Improved logic for detecting manual items and handling product names
                        const isManualItem = item.isManual || (!item.product && !item.Product);
                        
                        // Get the most reliable product name from all possible sources
                        const productName = isManualItem 
                          ? (item.name || 'Manual Item') 
                          : (item.product?.name || 
                             item.Product?.name || 
                             'Product Not Found');
                        
                        // Get the barcode with fallbacks
                        const productBarcode = isManualItem 
                          ? 'Manual Entry'
                          : (item.product?.barcode || 
                             item.Product?.barcode || 
                             item.product?.sku || 
                             '');
                        
                        return (
                          <tr key={item.id || item._id || index}>
                            <td>
                              <p className="mb-0">{productName}</p>
                              <small className="text-muted">{productBarcode}</small>
                            </td>
                            <td className="text-end">Rs. {item.price.toFixed(2)}</td>
                            <td className="text-end">{item.quantity}</td>
                            <td className="text-end">
                              {item.discount > 0 ? `Rs. ${item.discount.toFixed(2)}` : '-'}
                            </td>
                            <td className="text-end">Rs. {subtotal.toFixed(2)}</td>
                          </tr>
                        );
                      }) || (
                        <tr>
                          <td colSpan={5} className="text-center">No items found</td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              </Card>
            </>
          )}
        </Modal.Body>
      </Modal>
      
      {/* Return Dialog */}
      <Modal show={returnDialogOpen} onHide={handleCloseReturnDialog}>
        <Modal.Header closeButton>
          <Modal.Title>Return Sale</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to return this sale? This will:</p>
          
          <ul className="ps-4">
            <li>Mark the sale as returned</li>
            <li>Add all sold items back to inventory</li>
            <li>This action cannot be undone</li>
          </ul>
          
          <Form.Group className="mt-3">
            <Form.Label>Return Reason <span className="text-danger">*</span></Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              required
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseReturnDialog}>
            Cancel
          </Button>
          <Button
            variant="warning"
            disabled={processingReturn || !returnReason.trim()}
            onClick={handleProcessReturn}
            className="d-flex align-items-center"
          >
            {processingReturn ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Processing...
              </>
            ) : (
              <>
                <CheckCircleFill className="me-2" /> Confirm Return
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Receipt Dialog */}
      <Modal
        show={receiptDialogOpen}
        onHide={() => setReceiptDialogOpen(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>Receipt</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center py-4">
          <Button
            variant="primary"
            className="d-flex align-items-center mx-auto"
            onClick={() => window.open(`http://localhost:5000${receiptUrl}`, '_blank')}
          >
            <Printer className="me-2" /> Open Receipt PDF
          </Button>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setReceiptDialogOpen(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Toast notifications */}
      <ToastContainer position="bottom-end" className="p-3">
        {error && (
          <Toast 
            onClose={() => setError(null)} 
            show={!!error} 
            delay={6000} 
            autohide 
            bg="danger"
            className="text-white"
          >
            <Toast.Header>
              <strong className="me-auto">Error</strong>
            </Toast.Header>
            <Toast.Body>{error}</Toast.Body>
          </Toast>
        )}
        
        {successMessage && (
          <Toast 
            onClose={() => setSuccessMessage(null)} 
            show={!!successMessage} 
            delay={3000} 
            autohide
            bg="success"
            className="text-white"
          >
            <Toast.Header>
              <strong className="me-auto">Success</strong>
            </Toast.Header>
            <Toast.Body>{successMessage}</Toast.Body>
          </Toast>
        )}
      </ToastContainer>
    </Container>
  );
};

export default Sales;