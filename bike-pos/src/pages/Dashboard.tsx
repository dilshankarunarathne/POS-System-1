import {
    ArrowForward as ArrowForwardIcon,
    CalendarToday as CalendarIcon,
    Inventory as ProductsIcon,
    ShoppingCart,
    TrendingUp as TrendingUpIcon,
    Warning as WarningIcon,
} from '@mui/icons-material';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    CircularProgress,
    Divider,
    Grid,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Paper,
    Typography
} from '@mui/material';
import {
    ArcElement,
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Title,
    Tooltip
} from 'chart.js';
import React, { useEffect, useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';
import { productsApi, reportsApi } from '../services/api';

// Register ChartJS components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  ArcElement,
  BarElement
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salesData, setSalesData] = useState<any>({ summary: [], totals: {} });
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get dates for the last 7 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 6); // Last 7 days
        
        // Format dates for API
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        
        // Fetch sales data
        const salesResponse = await reportsApi.getSalesSummary({
          startDate: startDateStr,
          endDate: endDateStr,
          groupBy: 'day',
        });
        
        setSalesData(salesResponse.data);
        
        // Fetch low stock products
        const lowStockResponse = await productsApi.getAll({
          lowStock: true,
          limit: 5,
        });
        
        setLowStockProducts(lowStockResponse.data.products);
        
        // Fetch top selling products
        const topProductsResponse = await reportsApi.getProductSalesReport({
          startDate: startDateStr,
          endDate: endDateStr,
          limit: 5,
        });
        
        setTopProducts(topProductsResponse.data);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);
  
  // Prepare data for sales chart
  const salesChartData = {
    labels: salesData.summary.map((item: any) => {
      const date = new Date(item.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: 'Sales',
        data: salesData.summary.map((item: any) => item.total),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
      },
    ],
  };
  
  // Prepare data for product category chart
  const categoryChartData = {
    labels: topProducts.map(product => product.name),
    datasets: [
      {
        label: 'Units Sold',
        data: topProducts.map(product => product.quantitySold),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        
        <Box>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<ShoppingCart />}
            sx={{ mr: 2 }}
            onClick={() => navigate('/pos')}
          >
            New Sale
          </Button>
        </Box>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      ) : (
        <>
          {/* Quick Stats */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid xs={12} sm={6} md={3} item>
              <Paper
                elevation={2}
                sx={{
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  bgcolor: 'primary.light',
                  color: 'white',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Total Sales
                    </Typography>
                    <Typography variant="h4">
                      Rs. {salesData.totals?.total || '0.00'}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'primary.dark' }}>
                    <ShoppingCart />
                  </Avatar>
                </Box>
                <Typography variant="body2" sx={{ mt: 2 }}>
                  Last 7 days
                </Typography>
              </Paper>
            </Grid>
            
            <Grid xs={12} sm={6} md={3} item>
              <Paper
                elevation={2}
                sx={{
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  bgcolor: 'success.light',
                  color: 'white',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Transactions
                    </Typography>
                    <Typography variant="h4">
                      {salesData.totals?.totalSales || 0}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'success.dark' }}>
                    <CalendarIcon />
                  </Avatar>
                </Box>
                <Typography variant="body2" sx={{ mt: 2 }}>
                  Last 7 days
                </Typography>
              </Paper>
            </Grid>
            
            <Grid xs={12} sm={6} md={3} item>
              <Paper
                elevation={2}
                sx={{
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  bgcolor: 'warning.light',
                  color: 'white',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Low Stock
                    </Typography>
                    <Typography variant="h4">
                      {lowStockProducts.length}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'warning.dark' }}>
                    <WarningIcon />
                  </Avatar>
                </Box>
                <Typography variant="body2" sx={{ mt: 2 }}>
                  Items below reorder level
                </Typography>
              </Paper>
            </Grid>
            
            <Grid xs={12} sm={6} md={3} item>
              <Paper
                elevation={2}
                sx={{
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  bgcolor: 'secondary.light',
                  color: 'white',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Revenue Trend
                    </Typography>
                    <Typography variant="h4">
                      {salesData.summary.length > 1 ? 
                        (salesData.summary[salesData.summary.length - 1]?.total > 
                         salesData.summary[salesData.summary.length - 2]?.total 
                           ? '↑' : '↓') 
                        : '-'}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'secondary.dark' }}>
                    <TrendingUpIcon />
                  </Avatar>
                </Box>
                <Typography variant="body2" sx={{ mt: 2 }}>
                  Compared to previous day
                </Typography>
              </Paper>
            </Grid>
          </Grid>
          
          {/* Charts */}
          <Grid container spacing={3}>
            <Grid xs={12} md={8} item>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Sales Trend
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                {salesData.summary.length > 0 ? (
                  <Box sx={{ height: 300 }}>
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
                          },
                        },
                      }}
                    />
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                    <Typography variant="body1" color="text.secondary">
                      No sales data available
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
            
            <Grid xs={12} md={4} item>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Top Selling Products
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                {topProducts.length > 0 ? (
                  <Box sx={{ height: 300 }}>
                    <Bar
                      data={categoryChartData}
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
                          },
                        },
                      }}
                    />
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                    <Typography variant="body1" color="text.secondary">
                      No product data available
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
            
            <Grid xs={12} md={6} item>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Low Stock Items
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  {lowStockProducts.length > 0 ? (
                    <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                      {lowStockProducts.map((product) => (
                        <ListItem
                          key={product.id}
                          secondaryAction={
                            <Typography variant="body2" color="error">
                              {product.stockQuantity} / {product.reorderLevel}
                            </Typography>
                          }
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: 'warning.light' }}>
                              <ProductsIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={product.name}
                            secondary={product.Category ? product.Category.name : 'Uncategorized'}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <Typography variant="body1" color="text.secondary">
                        No low stock items
                      </Typography>
                    </Box>
                  )}
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => navigate('/products')}
                  >
                    View All Products
                  </Button>
                </CardActions>
              </Card>
            </Grid>
            
            <Grid xs={12} md={6} item>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Recent Sales
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<ShoppingCart />}
                      onClick={() => navigate('/pos')}
                      fullWidth
                      sx={{ py: 1.5 }}
                    >
                      Start New Sale
                    </Button>
                  </Box>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => navigate('/sales')}
                  >
                    View All Sales
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default Dashboard; 