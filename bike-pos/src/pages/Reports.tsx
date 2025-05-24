import {
    BarChart as BarChartIcon,
    Download as DownloadIcon,
    Print as PrintIcon,
    Summarize as SummarizeIcon
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Divider,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Snackbar,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    TextField,
    Typography
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import {
    ArcElement,
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Tooltip as ChartTooltip,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Title,
} from 'chart.js';
import React, { useEffect, useState } from 'react';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { categoriesApi, reportsApi } from '../services/api';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend
);

// Define tab panel interface
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Tab panel component
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`report-tabpanel-${index}`}
      aria-labelledby={`report-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Dates for filtering
  const [startDate, setStartDate] = useState<Date | null>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Default to last 30 days
    return date;
  });
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  
  // Sales summary data
  const [salesSummary, setSalesSummary] = useState<any>({ summary: [], totals: {} });
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');
  
  // Product sales data
  const [productSales, setProductSales] = useState<any[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [topProductsLimit, setTopProductsLimit] = useState(10);
  
  // Inventory data
  const [inventoryData, setInventoryData] = useState<any>({ inventory: [], summary: {} });
  const [showLowStock, setShowLowStock] = useState(false);
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoriesApi.getAll();
        setCategories(response.data);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    
    fetchCategories();
  }, []);
  
  // Format date for API
  const formatDateForApi = (date: Date | null) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };
  
  // Fetch sales summary data
  const fetchSalesSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await reportsApi.getSalesSummary({
        startDate: formatDateForApi(startDate),
        endDate: formatDateForApi(endDate),
        groupBy,
      });
      
      setSalesSummary(response.data);
      
    } catch (err) {
      console.error('Error fetching sales summary:', err);
      setError('Failed to load sales summary data');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch product sales data
  const fetchProductSales = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await reportsApi.getProductSalesReport({
        startDate: formatDateForApi(startDate),
        endDate: formatDateForApi(endDate),
        categoryId: categoryFilter,
        limit: topProductsLimit,
      });
      
      setProductSales(response.data);
      
    } catch (err) {
      console.error('Error fetching product sales:', err);
      setError('Failed to load product sales data');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch inventory data
  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await reportsApi.getInventoryStatusReport({
        lowStock: showLowStock,
        categoryId: categoryFilter,
      });
      
      setInventoryData(response.data);
      
    } catch (err) {
      console.error('Error fetching inventory data:', err);
      setError('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };
  
  // Generate PDF report
  const generatePdfReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await reportsApi.generateSalesReport({
        startDate: formatDateForApi(startDate),
        endDate: formatDateForApi(endDate),
      });
      
      // Open PDF in new tab
      window.open(`http://localhost:5000${response.data.downloadUrl}`, '_blank');
      
      setSuccessMessage('Sales report generated successfully');
      
    } catch (err) {
      console.error('Error generating PDF report:', err);
      setError('Failed to generate PDF report');
    } finally {
      setLoading(false);
    }
  };
  
  // Load data when tab changes or filters change
  useEffect(() => {
    if (activeTab === 0) {
      fetchSalesSummary();
    } else if (activeTab === 1) {
      fetchProductSales();
    } else if (activeTab === 2) {
      fetchInventoryData();
    }
  }, [activeTab, startDate, endDate, groupBy, categoryFilter, topProductsLimit, showLowStock]);
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  // Prepare data for sales chart
  const salesChartData = {
    labels: salesSummary.summary.map((item: any) => {
      if (groupBy === 'day') {
        return formatDate(item.date);
      } else if (groupBy === 'week') {
        return `Week of ${formatDate(item.date)}`;
      } else {
        return new Date(item.date).toLocaleString('default', { month: 'long', year: 'numeric' });
      }
    }),
    datasets: [
      {
        label: 'Sales',
        data: salesSummary.summary.map((item: any) => parseFloat(item.total)),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
      },
    ],
  };
  
  // Prepare data for product sales chart
  const productSalesChartData = {
    labels: productSales.map(item => item.name),
    datasets: [
      {
        label: 'Quantity Sold',
        data: productSales.map(item => item.quantitySold),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };
  
  // Prepare data for inventory category distribution chart
  const getInventoryCategoryData = () => {
    const categoryMap = new Map();
    
    inventoryData.inventory.forEach((item: any) => {
      const category = item.category || 'Uncategorized';
      if (categoryMap.has(category)) {
        categoryMap.set(category, categoryMap.get(category) + 1);
      } else {
        categoryMap.set(category, 1);
      }
    });
    
    return {
      labels: Array.from(categoryMap.keys()),
      datasets: [
        {
          data: Array.from(categoryMap.values()),
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)',
            'rgba(255, 159, 64, 0.6)',
            'rgba(199, 199, 199, 0.6)',
          ],
          borderWidth: 1,
        },
      ],
    };
  };
  
  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Reports
        </Typography>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<PrintIcon />}
          onClick={generatePdfReport}
          disabled={loading}
        >
          Generate PDF Report
        </Button>
      </Box>
      
      <Paper sx={{ mb: 4 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Sales Summary" icon={<SummarizeIcon />} iconPosition="start" />
          <Tab label="Product Sales" icon={<BarChartIcon />} iconPosition="start" />
          <Tab label="Inventory Status" icon={<DownloadIcon />} iconPosition="start" />
        </Tabs>
        
        {/* Date Range Selector */}
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={setStartDate}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />
              </Grid>
              
              <Grid item xs={12} md={3}>
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={setEndDate}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />
              </Grid>
              
              {activeTab === 0 && (
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="group-by-label">Group By</InputLabel>
                    <Select
                      labelId="group-by-label"
                      id="group-by"
                      value={groupBy}
                      label="Group By"
                      onChange={(e) => setGroupBy(e.target.value as 'day' | 'week' | 'month')}
                    >
                      <MenuItem value="day">Day</MenuItem>
                      <MenuItem value="week">Week</MenuItem>
                      <MenuItem value="month">Month</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
              
              {activeTab === 1 && (
                <>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="category-filter-label">Category</InputLabel>
                      <Select
                        labelId="category-filter-label"
                        id="category-filter"
                        value={categoryFilter}
                        label="Category"
                        onChange={(e) => setCategoryFilter(e.target.value)}
                      >
                        <MenuItem value="">All Categories</MenuItem>
                        {categories.map((category) => (
                          <MenuItem key={category.id} value={category.id}>
                            {category.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Top Products Limit"
                      type="number"
                      size="small"
                      value={topProductsLimit}
                      onChange={(e) => setTopProductsLimit(Math.max(1, parseInt(e.target.value) || 10))}
                      InputProps={{ inputProps: { min: 1, max: 100 } }}
                    />
                  </Grid>
                </>
              )}
              
              {activeTab === 2 && (
                <>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="category-filter-label">Category</InputLabel>
                      <Select
                        labelId="category-filter-label"
                        id="category-filter"
                        value={categoryFilter}
                        label="Category"
                        onChange={(e) => setCategoryFilter(e.target.value)}
                      >
                        <MenuItem value="">All Categories</MenuItem>
                        {categories.map((category) => (
                          <MenuItem key={category.id} value={category.id}>
                            {category.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={3}>
                    <Button
                      fullWidth
                      variant={showLowStock ? "contained" : "outlined"}
                      color={showLowStock ? "warning" : "primary"}
                      onClick={() => setShowLowStock(!showLowStock)}
                    >
                      {showLowStock ? "All Stock" : "Low Stock Only"}
                    </Button>
                  </Grid>
                </>
              )}
            </Grid>
          </LocalizationProvider>
        </Box>
      </Paper>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Sales Summary Tab */}
          <TabPanel value={activeTab} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Sales Trend
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  {salesSummary.summary.length > 0 ? (
                    <Box sx={{ height: 400 }}>
                      <Line
                        data={salesChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'top',
                            },
                            title: {
                              display: false,
                            },
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              title: {
                                display: true,
                                text: 'Sales Amount (Rs.)'
                              }
                            },
                          },
                        }}
                      />
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                      <Typography variant="body1" color="text.secondary">
                        No sales data available for the selected period
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Summary
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell>Date Range</TableCell>
                          <TableCell align="right">
                            {startDate?.toLocaleDateString()} - {endDate?.toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Total Sales</TableCell>
                          <TableCell align="right">
                            {salesSummary.totals?.totalSales || 0}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Subtotal</TableCell>
                          <TableCell align="right">
                            Rs. {parseFloat(salesSummary.totals?.subtotal || 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Discount</TableCell>
                          <TableCell align="right">
                            Rs. {parseFloat(salesSummary.totals?.discount || 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Tax</TableCell>
                          <TableCell align="right">
                            Rs. {parseFloat(salesSummary.totals?.tax || 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>Total Revenue</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                            Rs. {parseFloat(salesSummary.totals?.total || 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
                
                <Paper sx={{ p: 3, mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Sales by Day
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell align="right">Sales</TableCell>
                          <TableCell align="right">Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {salesSummary.summary.length > 0 ? (
                          salesSummary.summary.map((item: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell>
                                {groupBy === 'day'
                                  ? formatDate(item.date)
                                  : groupBy === 'week'
                                  ? `Week of ${formatDate(item.date)}`
                                  : new Date(item.date).toLocaleString('default', { month: 'long', year: 'numeric' })}
                              </TableCell>
                              <TableCell align="right">{item.totalSales}</TableCell>
                              <TableCell align="right">Rs. {parseFloat(item.total).toFixed(2)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} align="center">
                              No data available
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>
          
          {/* Product Sales Tab */}
          <TabPanel value={activeTab} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Top {topProductsLimit} Products by Sales
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  {productSales.length > 0 ? (
                    <Box sx={{ height: 400 }}>
                      <Bar
                        data={productSalesChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false,
                            },
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              title: {
                                display: true,
                                text: 'Quantity Sold'
                              }
                            },
                            x: {
                              ticks: {
                                maxRotation: 45,
                                minRotation: 45
                              }
                            }
                          },
                        }}
                      />
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                      <Typography variant="body1" color="text.secondary">
                        No product sales data available for the selected period
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Product Sales Details
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Product</TableCell>
                          <TableCell>Category</TableCell>
                          <TableCell align="right">Quantity</TableCell>
                          <TableCell align="right">Revenue</TableCell>
                          <TableCell align="right">Profit</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {productSales.length > 0 ? (
                          productSales.map((product, index) => (
                            <TableRow key={index}>
                              <TableCell>{product.name}</TableCell>
                              <TableCell>{product.category}</TableCell>
                              <TableCell align="right">{product.quantitySold}</TableCell>
                              <TableCell align="right">Rs. {product.totalRevenue}</TableCell>
                              <TableCell align="right">
                                Rs. {product.profit} ({product.profitMargin})
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} align="center">
                              No data available
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>
          
          {/* Inventory Status Tab */}
          <TabPanel value={activeTab} index={2}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Inventory Summary
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="h4" align="center" color="primary" gutterBottom>
                        {inventoryData.summary?.totalProducts || 0}
                      </Typography>
                      <Typography variant="body2" align="center" color="text.secondary">
                        Total Products
                      </Typography>
                    </CardContent>
                  </Card>
                  
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="h4" align="center" color="primary" gutterBottom>
                        {inventoryData.summary?.totalItems || 0}
                      </Typography>
                      <Typography variant="body2" align="center" color="text.secondary">
                        Total Items in Stock
                      </Typography>
                    </CardContent>
                  </Card>
                  
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="h4" align="center" color="primary" gutterBottom>
                        Rs. {parseFloat(inventoryData.summary?.totalValue || 0).toFixed(2)}
                      </Typography>
                      <Typography variant="body2" align="center" color="text.secondary">
                        Total Inventory Value
                      </Typography>
                    </CardContent>
                  </Card>
                  
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="h4" align="center" color="error" gutterBottom>
                        {inventoryData.summary?.lowStockItems || 0}
                      </Typography>
                      <Typography variant="body2" align="center" color="text.secondary">
                        Low Stock Items
                      </Typography>
                    </CardContent>
                  </Card>
                  
                  {inventoryData.inventory.length > 0 && (
                    <Box sx={{ mt: 3, height: 300 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Category Distribution
                      </Typography>
                      <Pie
                        data={getInventoryCategoryData()}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'right',
                            },
                          },
                        }}
                      />
                    </Box>
                  )}
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={8}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Inventory Details
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <TableContainer sx={{ maxHeight: 600 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Product</TableCell>
                          <TableCell>Barcode</TableCell>
                          <TableCell>Category</TableCell>
                          <TableCell align="right">Stock</TableCell>
                          <TableCell align="right">Reorder Level</TableCell>
                          <TableCell align="right">Value</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {inventoryData.inventory.length > 0 ? (
                          inventoryData.inventory.map((item: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell>{item.barcode}</TableCell>
                              <TableCell>{item.category}</TableCell>
                              <TableCell align="right">{item.stockQuantity}</TableCell>
                              <TableCell align="right">{item.reorderLevel}</TableCell>
                              <TableCell align="right">Rs. {item.value}</TableCell>
                              <TableCell>
                                <Typography
                                  variant="body2"
                                  color={item.stockStatus === 'Low' ? 'error' : 'success.main'}
                                >
                                  {item.stockStatus}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} align="center">
                              No data available
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>
        </>
      )}
      
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

export default Reports; 