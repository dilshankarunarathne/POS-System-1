import {
    CheckCircle as CheckCircleIcon,
    Close as CloseIcon,
    FilterList as FilterListIcon,
    Print as PrintIcon,
    Refresh as RefreshIcon,
    Search as SearchIcon,
    ShoppingBag as ShoppingBagIcon,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    Grid,
    IconButton,
    InputAdornment,
    InputLabel,
    List,
    ListItem,
    ListItemText,
    MenuItem,
    Paper,
    Select,
    Snackbar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Toolbar,
    Tooltip,
    Typography,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import React, { useEffect, useState } from 'react';
import { printApi, salesApi } from '../services/api';

// Define Sales types
interface SaleItem {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
  Product: {
    id: number;
    name: string;
    barcode: string;
  };
}

interface Sale {
  id: number;
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
  cashier: {
    id: number;
    username: string;
  };
  SaleItems?: SaleItem[];
  createdAt: string;
}

const Sales: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
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
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };
  
  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
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
  const handleOpenDetailDialog = async (saleId: number) => {
    try {
      setLoading(true);
      
      const response = await salesApi.getById(saleId);
      setSelectedSale(response.data);
      setDetailDialogOpen(true);
      
    } catch (err) {
      console.error('Error fetching sale details:', err);
      setError('Failed to load sale details');
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
  
  // Generate and print receipt
  const handlePrintReceipt = async (saleId: number) => {
    try {
      const response = await printApi.generateReceipt(saleId);
      
      setReceiptUrl(response.data.downloadUrl);
      setReceiptDialogOpen(true);
      
    } catch (err) {
      console.error('Error generating receipt:', err);
      setError('Failed to generate receipt');
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };
  
  // Format payment method for display
  const formatPaymentMethod = (method: string) => {
    return method.replace('_', ' ').toUpperCase();
  };
  
  // Get status chip color
  const getStatusChipColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'returned':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };
  
  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Sales
        </Typography>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<ShoppingBagIcon />}
          onClick={() => window.location.href = '/pos'}
        >
          New Sale
        </Button>
      </Box>
      
      {/* Filters */}
      <Paper sx={{ mb: 4, p: 2 }}>
        <Toolbar sx={{ pl: { sm: 2 }, pr: { xs: 1, sm: 1 } }}>
          <Typography
            sx={{ flex: '1 1 100%' }}
            variant="h6"
            id="tableTitle"
            component="div"
          >
            Filters
          </Typography>
          
          <Tooltip title="Filter list">
            <IconButton>
              <FilterListIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
        
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={2}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={setStartDate}
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={setEndDate}
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel id="payment-method-filter-label">Payment Method</InputLabel>
                <Select
                  labelId="payment-method-filter-label"
                  id="payment-method-filter"
                  value={paymentMethodFilter}
                  label="Payment Method"
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                >
                  <MenuItem value="">All Methods</MenuItem>
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="credit_card">Credit Card</MenuItem>
                  <MenuItem value="debit_card">Debit Card</MenuItem>
                  <MenuItem value="mobile_payment">Mobile Payment</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel id="status-filter-label">Status</InputLabel>
                <Select
                  labelId="status-filter-label"
                  id="status-filter"
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="returned">Returned</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Search Invoice #"
                variant="outlined"
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleResetFilters}
              >
                Reset Filters
              </Button>
            </Grid>
          </Grid>
        </LocalizationProvider>
      </Paper>
      
      {/* Sales Table */}
      <Paper>
        <TableContainer>
          <Table sx={{ minWidth: 650 }} aria-label="sales table">
            <TableHead>
              <TableRow>
                <TableCell>Invoice #</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Payment Method</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                    No sales found
                  </TableCell>
                </TableRow>
              ) : (
                sales.map((sale) => (
                  <TableRow key={sale.id} hover onClick={() => handleOpenDetailDialog(sale.id)} sx={{ cursor: 'pointer' }}>
                    <TableCell>{sale.invoiceNumber}</TableCell>
                    <TableCell>{formatDate(sale.date)}</TableCell>
                    <TableCell>{sale.customerName || 'Walk-in Customer'}</TableCell>
                    <TableCell>{formatPaymentMethod(sale.paymentMethod)}</TableCell>
                    <TableCell>Rs. {sale.total.toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip
                        label={sale.status.toUpperCase()}
                        color={getStatusChipColor(sale.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrintReceipt(sale.id);
                        }}
                      >
                        <PrintIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalSales}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
      
      {/* Sale Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={handleCloseDetailDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Sale Details - {selectedSale?.invoiceNumber}
          <IconButton
            aria-label="close"
            onClick={handleCloseDetailDialog}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          {selectedSale && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Sale Information
                  </Typography>
                  
                  <Card variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Invoice Number
                          </Typography>
                          <Typography variant="body1">
                            {selectedSale.invoiceNumber}
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Date & Time
                          </Typography>
                          <Typography variant="body1">
                            {formatDate(selectedSale.date)}
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Cashier
                          </Typography>
                          <Typography variant="body1">
                            {selectedSale.cashier.username}
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Status
                          </Typography>
                          <Chip
                            label={selectedSale.status.toUpperCase()}
                            color={getStatusChipColor(selectedSale.status)}
                            size="small"
                          />
                        </Grid>
                        
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Payment Method
                          </Typography>
                          <Typography variant="body1">
                            {formatPaymentMethod(selectedSale.paymentMethod)}
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Customer
                          </Typography>
                          <Typography variant="body1">
                            {selectedSale.customerName || 'Walk-in Customer'}
                          </Typography>
                        </Grid>
                        
                        {selectedSale.customerPhone && (
                          <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary">
                              Customer Phone
                            </Typography>
                            <Typography variant="body1">
                              {selectedSale.customerPhone}
                            </Typography>
                          </Grid>
                        )}
                        
                        {selectedSale.notes && (
                          <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary">
                              Notes
                            </Typography>
                            <Typography variant="body1">
                              {selectedSale.notes}
                            </Typography>
                          </Grid>
                        )}
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Sale Summary
                  </Typography>
                  
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body1">Subtotal:</Typography>
                        <Typography variant="body1">Rs. {selectedSale.subtotal.toFixed(2)}</Typography>
                      </Box>
                      
                      {selectedSale.discount > 0 && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body1">Discount:</Typography>
                          <Typography variant="body1">Rs. {selectedSale.discount.toFixed(2)}</Typography>
                        </Box>
                      )}
                      
                      {selectedSale.tax > 0 && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body1">Tax:</Typography>
                          <Typography variant="body1">Rs. {selectedSale.tax.toFixed(2)}</Typography>
                        </Box>
                      )}
                      
                      <Divider sx={{ my: 1 }} />
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="h6">Total:</Typography>
                        <Typography variant="h6">Rs. {selectedSale.total.toFixed(2)}</Typography>
                      </Box>
                    </CardContent>
                  </Card>
                  
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                    <Button
                      variant="outlined"
                      startIcon={<PrintIcon />}
                      onClick={() => handlePrintReceipt(selectedSale.id)}
                    >
                      Print Receipt
                    </Button>
                    
                    {selectedSale.status === 'completed' && (
                      <Button
                        variant="outlined"
                        color="warning"
                        onClick={handleOpenReturnDialog}
                      >
                        Return Sale
                      </Button>
                    )}
                  </Box>
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Sale Items
                </Typography>
                
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Product</TableCell>
                        <TableCell align="right">Price</TableCell>
                        <TableCell align="right">Quantity</TableCell>
                        <TableCell align="right">Discount</TableCell>
                        <TableCell align="right">Subtotal</TableCell>
                      </TableRow>
                    </TableHead>
                    
                    <TableBody>
                      {selectedSale.SaleItems?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Typography variant="body2">{item.Product.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {item.Product.barcode}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">Rs. {item.unitPrice.toFixed(2)}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">
                            {item.discount > 0 ? `Rs. ${item.discount.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell align="right">Rs. {item.subtotal.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Return Dialog */}
      <Dialog
        open={returnDialogOpen}
        onClose={handleCloseReturnDialog}
      >
        <DialogTitle>Return Sale</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to return this sale? This will:
          </Typography>
          
          <List dense>
            <ListItem>
              <ListItemText primary="• Mark the sale as returned" />
            </ListItem>
            <ListItem>
              <ListItemText primary="• Add all sold items back to inventory" />
            </ListItem>
            <ListItem>
              <ListItemText primary="• This action cannot be undone" />
            </ListItem>
          </List>
          
          <TextField
            margin="dense"
            label="Return Reason"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReturnDialog}>Cancel</Button>
          <Button
            onClick={handleProcessReturn}
            color="warning"
            variant="contained"
            disabled={processingReturn || !returnReason.trim()}
            startIcon={processingReturn ? <CircularProgress size={20} /> : <CheckCircleIcon />}
          >
            {processingReturn ? 'Processing...' : 'Confirm Return'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Receipt Dialog */}
      <Dialog
        open={receiptDialogOpen}
        onClose={() => setReceiptDialogOpen(false)}
      >
        <DialogTitle>Receipt</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PrintIcon />}
              onClick={() => window.open(`http://localhost:5000${receiptUrl}`, '_blank')}
            >
              Open Receipt PDF
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReceiptDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Error and Success Messages */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error">
          {error}
        </Alert>
      </Snackbar>
      
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccessMessage(null)} severity="success">
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Sales; 