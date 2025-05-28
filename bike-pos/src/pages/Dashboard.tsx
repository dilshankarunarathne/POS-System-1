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
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  ProgressBar,
  Row,
  Spinner,
  Table
} from 'react-bootstrap';
import {
  Award,
  BoxSeam,
  Calendar,
  Cart,
  CurrencyDollar,
  GraphUp
} from 'react-bootstrap-icons';
import { Bar, Line } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
  const { user, getCurrentShop } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salesData, setSalesData] = useState<any>({ 
    summary: [], 
    totals: {
      total: 0,
      subtotal: 0,
      tax: 0,
      discount: 0,
      totalSales: 0,
      totalItems: 0,
      averageSale: 0
    } 
  });
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [dailySales, setDailySales] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const currentShop = getCurrentShop();
        if (!currentShop) {
          setError('No shop selected');
          return;
        }
        
        // Get dates for the last 7 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 6); // Last 7 days
        
        // Format dates for API
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        
        // Fetch sales summary data
        const salesResponse = await reportsApi.getSalesSummary({
          startDate: startDateStr,
          endDate: endDateStr,
          shopId: currentShop._id
        });
        
        // Fetch daily sales data
        const dailyResponse = await reportsApi.getDailySales({
          startDate: startDateStr,
          endDate: endDateStr,
          shopId: currentShop._id
        });
        
        if (Array.isArray(dailyResponse.data)) {
          setDailySales(dailyResponse.data);
        } else {
          console.warn('Daily sales data is not an array:', dailyResponse.data);
          setDailySales([]);
        }
        
        // Process sales data
        const salesResponseData = salesResponse.data || {};
        setSalesData({
          summary: Array.isArray(salesResponseData.summary) ? salesResponseData.summary : [],
          totals: salesResponseData.totals || {
            total: 0,
            subtotal: 0,
            tax: 0,
            discount: 0,
            totalSales: 0,
            totalItems: 0,
            averageSale: 0
          }
        });
        
        // Fetch low stock products
        const lowStockResponse = await productsApi.getAll({ 
          limit: 100,
          shopId: currentShop._id
        });
        
        // Filter products with low stock
        const lowStockData = lowStockResponse.data?.products?.filter(
          (product: any) => product.quantity <= (product.lowStockThreshold || 10)
        ).slice(0, 5) || [];
        setLowStockProducts(Array.isArray(lowStockData) ? 
          lowStockData.map(product => ({
            id: product._id,
            name: product.name,
            category: product.category?.name || 'Uncategorized',
            stock: product.quantity,
            stockThreshold: product.lowStockThreshold || 10,
          })) : []);
        
        // Fetch top selling products
        const topProductsResponse = await reportsApi.getProductSalesReport({
          startDate: startDateStr,
          endDate: endDateStr,
          shopId: currentShop._id
        });
        
        const topProductsData = topProductsResponse.data?.products || [];
        if (Array.isArray(topProductsData)) {
          // Map the data to match our expected structure
          setTopProducts(topProductsData.slice(0, 5).map(product => ({
            id: product._id,
            name: product.productName || 'Unknown Product',
            quantitySold: product.totalQuantity || 0,
            revenue: product.totalRevenue || 0
          })));
        } else {
          console.warn('Top products data is not an array');
          setTopProducts([]);
        }
      } catch (err: any) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to load dashboard data. ' + (err.message || 'Please try again later.'));
        // Set empty default values to prevent map errors
        setSalesData({ summary: [], totals: {
          total: 0,
          subtotal: 0,
          tax: 0,
          discount: 0,
          totalSales: 0,
          totalItems: 0,
          averageSale: 0
        } });
        setLowStockProducts([]);
        setTopProducts([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [getCurrentShop]);
  
  // Prepare data for sales chart
  const salesChartData = {
    labels: dailySales.map(day => {
      const date = new Date(day.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: 'Revenue',
        data: dailySales.map(day => day.revenue),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
      },
      {
        label: 'Transactions',
        data: dailySales.map(day => day.transactions),
        borderColor: 'rgba(255, 159, 64, 1)',
        backgroundColor: 'rgba(255, 159, 64, 0.2)',
        tension: 0.4,
        yAxisID: 'y1',
      }
    ],
  };
  
  // Options for sales chart with dual Y axis
  const salesChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Revenue'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      y1: {
        beginAtZero: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Transactions'
        },
        grid: {
          display: false
        }
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0)'
        }
      }
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.dataset.label === 'Revenue' 
                ? `Rs. ${context.parsed.y}` 
                : context.parsed.y;
            }
            return label;
          }
        }
      }
    }
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
    <Container fluid className="dashboard-container py-4 px-3 px-md-4">
      <Row className="mb-4 align-items-center">
        <Col>
          <h4 className="fw-bold mb-0">Dashboard</h4>
          <p className="text-muted mb-0">Overview of your store performance</p>
        </Col>
        <Col xs="auto">
          <Button 
            variant="primary" 
            size="lg"
            className="d-flex align-items-center shadow-sm"
            onClick={() => navigate('/pos')}
          >
            <Cart className="me-2" /> New Sale
          </Button>
        </Col>
      </Row>
      
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading dashboard data...</p>
        </div>
      ) : error ? (
        <Alert variant="danger" className="mb-4 shadow-sm">
          <Alert.Heading>Error Loading Data</Alert.Heading>
          <p className="mb-0">{error}</p>
        </Alert>
      ) : (
        <>
          {/* Quick Stats */}
          <Row className="g-4 mb-4">
            {/* Total Sales Revenue */}
            <Col lg={3} md={6} sm={6} xs={12}>
              <Card className="h-100 shadow-sm border-0 stat-card">
                <Card.Body className="p-3">
                  <div className="d-flex justify-content-between">
                    <div>
                      <Card.Title as="h6" className="text-muted mb-1">Total Revenue</Card.Title>
                      <h3 className="mb-0 fw-bold">Rs. {salesData.totals?.total?.toLocaleString() || '0.00'}</h3>
                      <Badge bg="success" className="mt-2">Last 7 days</Badge>
                    </div>
                    <div className="rounded-circle d-flex align-items-center justify-content-center stat-icon-bg primary-icon">
                      <CurrencyDollar size={22} />
                    </div>
                  </div>
                  {dailySales.length > 1 && 
                    <div className="mt-3">
                      <small className={
                        dailySales[dailySales.length-1]?.revenue > dailySales[dailySales.length-2]?.revenue 
                          ? "text-success" : "text-danger"
                      }>
                        <GraphUp className="me-1" /> 
                        {dailySales[dailySales.length-2]?.revenue > 0 
                          ? (((dailySales[dailySales.length-1]?.revenue / dailySales[dailySales.length-2]?.revenue) - 1) * 100).toFixed(1)
                          : '0'}% vs previous day
                      </small>
                    </div>
                  }
                </Card.Body>
              </Card>
            </Col>
            
            {/* Total Transactions */}
            <Col lg={3} md={6} sm={6} xs={12}>
              <Card className="h-100 shadow-sm border-0 stat-card">
                <Card.Body className="p-3">
                  <div className="d-flex justify-content-between">
                    <div>
                      <Card.Title as="h6" className="text-muted mb-1">Transactions</Card.Title>
                      <h3 className="mb-0 fw-bold">{salesData.totals?.totalSales?.toLocaleString() || 0}</h3>
                      <Badge bg="info" className="mt-2">Last 7 days</Badge>
                    </div>
                    <div className="rounded-circle d-flex align-items-center justify-content-center stat-icon-bg success-icon">
                      <Calendar size={22} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <small className="text-muted">
                      Average: {Math.round(salesData.totals?.totalSales / 7) || 0} per day
                    </small>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            
            {/* Average Sale Value */}
            <Col lg={3} md={6} sm={6} xs={12}>
              <Card className="h-100 shadow-sm border-0 stat-card">
                <Card.Body className="p-3">
                  <div className="d-flex justify-content-between">
                    <div>
                      <Card.Title as="h6" className="text-muted mb-1">Avg Sale Value</Card.Title>
                      <h3 className="mb-0 fw-bold">
                        Rs. {salesData.totals?.averageSale?.toLocaleString() || '0.00'}
                      </h3>
                      <Badge bg="warning" className="mt-2">Last 7 days</Badge>
                    </div>
                    <div className="rounded-circle d-flex align-items-center justify-content-center stat-icon-bg warning-icon">
                      <Award size={22} />
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            
            {/* Low Stock Items */}
            <Col lg={3} md={6} sm={6} xs={12}>
              <Card className="h-100 shadow-sm border-0 stat-card">
                <Card.Body className="p-3">
                  <div className="d-flex justify-content-between">
                    <div>
                      <Card.Title as="h6" className="text-muted mb-1">Low Stock Items</Card.Title>
                      <h3 className="mb-0 fw-bold">{lowStockProducts.length}</h3>
                      <Badge bg="danger" className="mt-2">Needs attention</Badge>
                    </div>
                    <div className="rounded-circle d-flex align-items-center justify-content-center stat-icon-bg danger-icon">
                      <BoxSeam size={22} />
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          {/* Charts */}
          <Row className="mb-4 g-4">
            {/* Sales Trend Chart */}
            <Col lg={8} md={12}>
              <Card className="h-100 shadow-sm border-0">
                <Card.Body className="p-4">
                  <Card.Title as="h5" className="mb-3">Sales Trend</Card.Title>
                  
                  {dailySales.length > 0 ? (
                    <div style={{ height: '350px' }}>
                      <Line
                        data={salesChartData}
                        options={salesChartOptions}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-5">
                      <p className="text-muted">No sales data available for the selected period</p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
            
            {/* Top Selling Products Chart */}
            <Col lg={4} md={12}>
              <Card className="h-100 shadow-sm border-0">
                <Card.Body className="p-4">
                  <Card.Title as="h5" className="mb-3">Top Selling Products</Card.Title>
                  
                  {topProducts.length > 0 ? (
                    <div style={{ height: '350px' }}>
                      <Bar
                        data={categoryChartData}
                        options={{
                          indexAxis: 'y',
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false,
                            },
                            tooltip: {
                              callbacks: {
                                label: function(context) {
                                  return `Sold: ${context.raw} units`;
                                },
                                afterLabel: function(context) {
                                  const product = topProducts[context.dataIndex];
                                  return `Revenue: Rs. ${product.revenue.toLocaleString()}`;
                                }
                              }
                            }
                          },
                          scales: {
                            x: {
                              beginAtZero: true,
                              grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                              }
                            },
                            y: {
                              grid: {
                                display: false
                              }
                            }
                          },
                        }}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-5">
                      <p className="text-muted">No product sales data available</p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          {/* Additional Dashboard Content */}
          <Row className="g-4">
            {/* Low Stock Products */}
            <Col lg={6} md={12}>
              <Card className="h-100 shadow-sm border-0">
                <Card.Body className="p-4">
                  <Card.Title as="h5" className="mb-3">Low Stock Alert</Card.Title>
                  
                  {lowStockProducts.length > 0 ? (
                    <div className="table-responsive">
                      <Table hover className="mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Product</th>
                            <th>Category</th>
                            <th>Stock</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lowStockProducts.map((product) => (
                            <tr key={product.id}>
                              <td>{product.name}</td>
                              <td>{product.category}</td>
                              <td>{product.stock}</td>
                              <td>
                                <ProgressBar 
                                  now={product.stock / product.stockThreshold * 100} 
                                  variant={product.stock <= product.stockThreshold / 2 ? "danger" : "warning"}
                                  style={{ height: "8px" }}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-5">
                      <p className="text-muted">No low stock products</p>
                    </div>
                  )}
                </Card.Body>
                <Card.Footer className="bg-white border-0 pt-0">
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    onClick={() => navigate('/inventory')}
                  >
                    View All Inventory
                  </Button>
                </Card.Footer>
              </Card>
            </Col>
            
            {/* Recent Sales */}
            <Col lg={6} md={12}>
              <Card className="h-100 shadow-sm border-0">
                <Card.Body className="p-4">
                  <Card.Title as="h5" className="mb-3">Recent Sales Summary</Card.Title>
                  
                  {dailySales.length > 0 ? (
                    <div className="table-responsive">
                      <Table hover className="mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Date</th>
                            <th>Sales</th>
                            <th>Revenue</th>
                            <th>Items Sold</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...dailySales]
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .slice(0, 5)
                            .map((day, idx) => (
                              <tr key={idx}>
                                <td>{new Date(day.date).toLocaleDateString('en-US', { 
                                  weekday: 'short', month: 'short', day: 'numeric' 
                                })}</td>
                                <td>{day.transactions}</td>
                                <td>Rs. {day.revenue.toLocaleString()}</td>
                                <td>{day.items}</td>
                              </tr>
                            ))}
                        </tbody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-5">
                      <p className="text-muted">No recent sales data</p>
                    </div>
                  )}
                </Card.Body>
                <Card.Footer className="bg-white border-0 pt-0">
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    onClick={() => navigate('/sales')}
                  >
                    View All Sales
                  </Button>
                </Card.Footer>
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* Add CSS for stat card icons */}
      <style>{`
        .dashboard-container {
          background-color: #f8f9fa;
          max-width: 100%;
          width: 100%;
        }
        
        .stat-card {
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 0.5rem 1rem rgba(0,0,0,0.15) !important;
        }
        
        .stat-icon-bg {
          width: 48px;
          height: 48px;
        }
        
        .primary-icon {
          background-color: rgba(13, 110, 253, 0.1);
          color: #0d6efd;
        }
        
        .success-icon {
          background-color: rgba(25, 135, 84, 0.1);
          color: #198754;
        }
        
        .warning-icon {
          background-color: rgba(255, 193, 7, 0.1);
          color: #ffc107;
        }
        
        .danger-icon {
          background-color: rgba(220, 53, 69, 0.1);
          color: #dc3545;
        }
      `}</style>
    </Container>
  );
};

export default Dashboard;