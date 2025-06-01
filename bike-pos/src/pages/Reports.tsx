import 'bootstrap/dist/css/bootstrap.min.css';
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
import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Container,
  Form,
  Nav,
  Row,
  Spinner,
  Table,
  Toast, ToastContainer
} from 'react-bootstrap';
import {
  BarChart,
  Download,
  FileEarmarkText,
  Printer
} from 'react-bootstrap-icons';
import { Bar, Line, Pie } from 'react-chartjs-2';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useAuth } from '../contexts/AuthContext';
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

const Reports = () => {
  const { user, getCurrentShop } = useAuth();
  const [activeTab, setActiveTab] = useState('sales');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Dates for filtering
  const [startDate, setStartDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Default to last 30 days
    return date;
  });
  const [endDate, setEndDate] = useState<Date>(new Date());
  
  // Sales summary data
  const [salesSummary, setSalesSummary] = useState<{ summary: any[], totals: any }>({ summary: [], totals: {} });
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');
  
  // Product sales data
  interface ProductSale {
    name: string;
    category: string;
    quantitySold: number;
    totalRevenue: number;
    profit: number;
    profitMargin: string;
  }
  
  const [productSales, setProductSales] = useState<ProductSale[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [topProductsLimit, setTopProductsLimit] = useState<number>(10);
  
  // Inventory data
  interface InventoryItem {
    name: string;
    category: string;
    quantity: number;
    reorderLevel: number;
    value: number;
    barcode?: string;
  }
  
  const [inventoryData, setInventoryData] = useState<{ inventory: InventoryItem[], summary: any }>({ inventory: [], summary: {} });
  const [showLowStock, setShowLowStock] = useState(false);
  
  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const currentShop = getCurrentShop();
        if (!currentShop) {
          setError('No shop selected');
          return;
        }
        
        const response = await categoriesApi.getAll({ shopId: currentShop._id });
        setCategories(response.data);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    
    fetchCategories();
  }, [getCurrentShop]);
  
  // Format date for API
  const formatDateForApi = (date: Date | null): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };
  
  // Fetch sales summary data
  const fetchSalesSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentShop = getCurrentShop();
      if (!currentShop) {
        if (user?.role !== 'developer') {
          setError('No shop selected. Please contact your administrator.');
        }
        setLoading(false);
        return;
      }
      
      const response = await reportsApi.getSalesSummary({
        startDate: formatDateForApi(startDate),
        endDate: formatDateForApi(endDate),
        groupBy,
        shopId: currentShop._id
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
      
      const currentShop = getCurrentShop();
      if (!currentShop) {
        if (user?.role !== 'developer') {
          setError('No shop selected. Please contact your administrator.');
        }
        setLoading(false);
        return;
      }
      
      const response = await reportsApi.getProductSalesReport({
        startDate: formatDateForApi(startDate),
        endDate: formatDateForApi(endDate),
        categoryId: categoryFilter,
        limit: topProductsLimit,
        shopId: currentShop._id
      });
      
      // Ensure response.data is an array before setting state
      if (Array.isArray(response.data)) {
        setProductSales(response.data);
      } else {
        console.error('Expected array for product sales data but got:', response.data);
        setProductSales([]);
        setError('Invalid data format received for product sales');
      }
      
    } catch (err) {
      console.error('Error fetching product sales:', err);
      setError('Failed to load product sales data');
      setProductSales([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch inventory data
  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentShop = getCurrentShop();
      if (!currentShop) {
        if (user?.role !== 'developer') {
          setError('No shop selected. Please contact your administrator.');
        }
        setLoading(false);
        return;
      }

      console.log('Fetching inventory data with params:', {
        lowStock: showLowStock,
        categoryId: categoryFilter, // Add categoryId to the params
        shopId: currentShop._id
      });
      
      const response = await reportsApi.getInventoryStatusReport({
        lowStock: showLowStock,
        categoryId: categoryFilter, // Include category filter in the request
        shopId: currentShop._id
      });
      
      console.log('Inventory data received:', response.data);
      
      // Improved handling of response data format
      if (!response.data) {
        setError('No data received from server');
        setInventoryData({ inventory: [], summary: {} });
      } 
      // Handle both possible response formats (array or object with inventory property)
      else if (Array.isArray(response.data)) {
        // If the response is a direct array, adapt it to expected format
        setInventoryData({ 
          inventory: response.data,
          summary: {
            totalProducts: response.data.length,
            totalItems: response.data.reduce((sum, item) => sum + item.quantity, 0),
            totalValue: response.data.reduce((sum, item) => sum + (item.value || 0), 0),
            lowStockItems: response.data.filter(item => item.quantity <= item.reorderLevel).length
          }
        });
      }
      else if (response.data.inventory || Array.isArray(response.data.inventory)) {
        // Standard expected format
        setInventoryData(response.data);
      }
      else {
        setError('Invalid inventory data format received from server');
        setInventoryData({ inventory: [], summary: {} });
      }
      
    } catch (err: any) {
      console.error('Error fetching inventory data:', err);
      setError(`Failed to load inventory data: ${err.message || 'Unknown error'}`);
      setInventoryData({ inventory: [], summary: {} });
    } finally {
      setLoading(false);
    }
  };
  
  // Generate PDF report
  const generatePdfReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentShop = getCurrentShop();
      if (!currentShop) {
        if (user?.role !== 'developer') {
          setError('No shop selected. Please contact your administrator.');
        }
        setLoading(false);
        return;
      }
      
      const response = await reportsApi.generateSalesReport({
        startDate: formatDateForApi(startDate),
        endDate: formatDateForApi(endDate),
        shopId: currentShop._id
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
    if (activeTab === 'sales') {
      fetchSalesSummary();
    } else if (activeTab === 'products') {
      fetchProductSales();
    } else if (activeTab === 'inventory') {
      fetchInventoryData();
    }
  }, [activeTab, startDate, endDate, groupBy, showLowStock]);
  
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
        data: salesSummary.summary.map((item) => parseFloat(item.total)),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
      },
    ],
  };
  
  // Prepare data for product sales chart
  const productSalesChartData = {
    labels: Array.isArray(productSales) ? productSales.map(item => item.name) : [],
    datasets: [
      {
        label: 'Quantity Sold',
        data: Array.isArray(productSales) ? productSales.map(item => item.quantitySold) : [],
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };
  
  // Prepare data for inventory category distribution chart
  const getInventoryCategoryData = () => {
    const categoryMap = new Map();
    
    inventoryData.inventory.forEach((item) => {
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
    <Container fluid className="py-4">
      <Row className="mb-4 align-items-center">
        <Col>
          <h2 className="mb-3">Reports</h2>
        </Col>
        <Col xs="auto">
          <Button 
            variant="primary"
            onClick={generatePdfReport}
            disabled={loading}
            className="d-flex align-items-center"
          >
            <Printer className="me-2" /> Generate PDF Report
          </Button>
        </Col>
      </Row>
      
      <Card className="mb-4">
        <Card.Header>
          <Nav variant="tabs" 
            activeKey={activeTab} 
            onSelect={(key) => key && setActiveTab(key)}
            className="flex-nowrap"
          >
            <Nav.Item>
              <Nav.Link eventKey="sales" className="d-flex align-items-center">
                <FileEarmarkText className="me-2" /> Sales Summary
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="products" className="d-flex align-items-center">
                <BarChart className="me-2" /> Product Sales
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="inventory" className="d-flex align-items-center">
                <Download className="me-2" /> Inventory Status
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </Card.Header>
        
        <Card.Body>
          {/* Date Range Selector */}
          <Row className="g-3 mb-4">
            <Col md={6} lg={3}>
              <Form.Group>
                <Form.Label>Start Date</Form.Label>
                <DatePicker
                  selected={startDate}
                  onChange={date => date && setStartDate(date)}
                  className="form-control"
                  dateFormat="MM/dd/yyyy"
                />
              </Form.Group>
            </Col>
            
            <Col md={6} lg={3}>
              <Form.Group>
                <Form.Label>End Date</Form.Label>
                <DatePicker
                  selected={endDate}
                  onChange={date => date && setEndDate(date)}
                  className="form-control"
                  dateFormat="MM/dd/yyyy"
                />
              </Form.Group>
            </Col>
            
            {activeTab === 'sales' && (
              <Col md={6} lg={3}>
                <Form.Group>
                  <Form.Label>Group By</Form.Label>
                  <Form.Select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value as 'day' | 'week' | 'month')}
                  >
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            )}
            
            {activeTab === 'products' && (
              <>
                <Col md={6} lg={3}>
                  <Form.Group>
                    <Form.Label>Category</Form.Label>
                    <Form.Select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                      <option value="">All Categories</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                
                <Col md={6} lg={3}>
                  <Form.Group>
                    <Form.Label>Top Products Limit</Form.Label>
                    <Form.Control
                      type="number"
                      value={topProductsLimit}
                      onChange={(e) => setTopProductsLimit(Math.max(1, parseInt(e.target.value) || 10))}
                      min={1}
                      max={100}
                    />
                  </Form.Group>
                </Col>
              </>
            )}
            
            {activeTab === 'inventory' && (
              <>
                <Col md={6} lg={3}>
                  <Form.Group>
                    <Form.Label>Category</Form.Label>
                    <Form.Select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                      <option value="">All Categories</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                
                <Col md={6} lg={3}>
                  <Form.Group>
                    <Form.Label>&nbsp;</Form.Label>
                    <div className="d-grid">
                      <Button
                        variant={showLowStock ? "warning" : "outline-primary"}
                        onClick={() => setShowLowStock(!showLowStock)}
                        className="w-100"
                      >
                        {showLowStock ? "All Stock" : "Low Stock Only"}
                      </Button>
                    </div>
                  </Form.Group>
                </Col>
              </>
            )}
          </Row>
          
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" role="status" variant="primary">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            </div>
          ) : (
            <>
              {/* Sales Summary Tab */}
              {activeTab === 'sales' && (
                <Row className="g-4">
                  <Col lg={8}>
                    <Card className="h-100">
                      <Card.Body>
                        <h5 className="card-title mb-3">Sales Trend</h5>
                        <hr className="mb-4" />
                        
                        {salesSummary.summary.length > 0 ? (
                          <div style={{ height: 400 }}>
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
                          </div>
                        ) : (
                          <div className="text-center d-flex justify-content-center align-items-center h-100">
                            <p className="text-muted">
                              No sales data available for the selected period
                            </p>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                  
                  <Col lg={4}>
                    <Card className="mb-4">
                      <Card.Body>
                        <h5 className="card-title mb-3">Summary</h5>
                        <hr className="mb-4" />
                        
                        <Table hover size="sm" responsive>
                          <tbody>
                            <tr>
                              <td>Date Range</td>
                              <td className="text-end">
                                {startDate?.toLocaleDateString()} - {endDate?.toLocaleDateString()}
                              </td>
                            </tr>
                            <tr>
                              <td>Total Sales</td>
                              <td className="text-end">
                                {salesSummary.totals?.totalSales || 0}
                              </td>
                            </tr>
                            <tr>
                              <td>Subtotal</td>
                              <td className="text-end">
                                Rs. {parseFloat(salesSummary.totals?.subtotal || 0).toFixed(2)}
                              </td>
                            </tr>
                            <tr>
                              <td>Discount</td>
                              <td className="text-end">
                                Rs. {parseFloat(salesSummary.totals?.discount || 0).toFixed(2)}
                              </td>
                            </tr>
                            <tr>
                              <td>Tax</td>
                              <td className="text-end">
                                Rs. {parseFloat(salesSummary.totals?.tax || 0).toFixed(2)}
                              </td>
                            </tr>
                            <tr>
                              <td className="fw-bold">Total Revenue</td>
                              <td className="text-end fw-bold">
                                Rs. {parseFloat(salesSummary.totals?.total || 0).toFixed(2)}
                              </td>
                            </tr>
                          </tbody>
                        </Table>
                      </Card.Body>
                    </Card>
                    
                    <Card>
                      <Card.Body>
                        <h5 className="card-title mb-3">Sales by Day</h5>
                        <hr className="mb-4" />
                        
                        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                          <Table hover size="sm" responsive>
                            <thead className="sticky-top bg-white">
                              <tr>
                                <th>Date</th>
                                <th className="text-end">Sales</th>
                                <th className="text-end">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {salesSummary.summary.length > 0 ? (
                                salesSummary.summary.map((item, index) => (
                                  <tr key={index}>
                                    <td>
                                      {groupBy === 'day'
                                        ? formatDate(item.date)
                                        : groupBy === 'week'
                                        ? `Week of ${formatDate(item.date)}`
                                        : new Date(item.date).toLocaleString('default', { month: 'long', year: 'numeric' })}
                                    </td>
                                    <td className="text-end">{item.totalSales}</td>
                                    <td className="text-end">Rs. {parseFloat(item.total).toFixed(2)}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={3} className="text-center">
                                    No data available
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </Table>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              )}
              
              {/* Product Sales Tab */}
              {activeTab === 'products' && (
                <Row className="g-4">
                  <Col lg={7}>
                    <Card className="h-100">
                      <Card.Body>
                        <h5 className="card-title mb-3">Top {topProductsLimit} Products by Sales</h5>
                        <hr className="mb-4" />
                        
                        {Array.isArray(productSales) && productSales.length > 0 ? (
                          <div style={{ height: 400 }}>
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
                          </div>
                        ) : (
                          <div className="text-center d-flex justify-content-center align-items-center h-100">
                            <p className="text-muted">
                              No product sales data available for the selected period
                            </p>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                  
                  <Col lg={5}>
                    <Card>
                      <Card.Body>
                        <h5 className="card-title mb-3">Product Sales Details</h5>
                        <hr className="mb-4" />
                        
                        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                          <Table hover size="sm" responsive>
                            <thead className="sticky-top bg-white">
                              <tr>
                                <th>Product</th>
                                <th>Category</th>
                                <th className="text-end">Quantity</th>
                                <th className="text-end">Revenue</th>
                                <th className="text-end">Profit</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Array.isArray(productSales) && productSales.length > 0 ? (
                                productSales.map((product, index) => (
                                  <tr key={index}>
                                    <td>{product.name}</td>
                                    <td>{product.category}</td>
                                    <td className="text-end">{product.quantitySold}</td>
                                    <td className="text-end">Rs. {product.totalRevenue}</td>
                                    <td className="text-end">
                                      Rs. {product.profit} ({product.profitMargin})
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={5} className="text-center">
                                    No data available
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </Table>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              )}
              
              {/* Inventory Status Tab */}
              {activeTab === 'inventory' && (
                <Row className="g-4">
                  <Col lg={5}>
                    <Card className="mb-4">
                      <Card.Body>
                        <h5 className="card-title mb-3">Inventory Summary</h5>
                        <hr className="mb-4" />
                        
                        <Row className="g-3 mb-4">
                          <Col sm={6}>
                            <Card className="h-100 bg-light">
                              <Card.Body className="text-center py-3">
                                <h3 className="text-primary mb-1">
                                  {inventoryData.summary?.totalProducts || 0}
                                </h3>
                                <p className="text-muted small mb-0">Total Products</p>
                              </Card.Body>
                            </Card>
                          </Col>
                          
                          <Col sm={6}>
                            <Card className="h-100 bg-light">
                              <Card.Body className="text-center py-3">
                                <h3 className="text-primary mb-1">
                                  {inventoryData.summary?.totalItems || 0}
                                </h3>
                                <p className="text-muted small mb-0">Total Items in Stock</p>
                              </Card.Body>
                            </Card>
                          </Col>
                          
                          <Col sm={6}>
                            <Card className="h-100 bg-light">
                              <Card.Body className="text-center py-3">
                                <h3 className="text-primary mb-1">
                                  Rs. {parseFloat(inventoryData.summary?.totalValue || 0).toFixed(2)}
                                </h3>
                                <p className="text-muted small mb-0">Total Inventory Value</p>
                              </Card.Body>
                            </Card>
                          </Col>
                          
                          <Col sm={6}>
                            <Card className="h-100 bg-light">
                              <Card.Body className="text-center py-3">
                                <h3 className="text-danger mb-1">
                                  {inventoryData.summary?.lowStockItems || 0}
                                </h3>
                                <p className="text-muted small mb-0">Low Stock Items</p>
                              </Card.Body>
                            </Card>
                          </Col>
                        </Row>
                        
                        {inventoryData.inventory.length > 0 && (
                          <div className="mt-4">
                            <h6 className="mb-3">Category Distribution</h6>
                            <div style={{ height: 300 }}>
                              <Pie
                                data={getInventoryCategoryData()}
                                options={{
                                  responsive: true,
                                  maintainAspectRatio: false,
                                  plugins: {
                                    legend: {
                                      position: 'right',
                                      labels: {
                                        boxWidth: 15,
                                        font: { size: 11 }
                                      }
                                    },
                                  },
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                  
                  <Col lg={7}>
                    <Card>
                      <Card.Body>
                        <h5 className="card-title mb-3">Inventory Details</h5>
                        <hr className="mb-4" />
                        
                        <div style={{ maxHeight: 600, overflowY: 'auto' }}>
                          <Table hover size="sm" responsive>
                            <thead className="sticky-top bg-white">
                              <tr>
                                <th>Product</th>
                                <th>Barcode</th>
                                <th>Category</th>
                                <th className="text-end">Stock</th>
                                <th className="text-end">Reorder Level</th>
                                <th className="text-end">Value</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {inventoryData.inventory.length > 0 ? (
                                inventoryData.inventory.map((item, index) => (
                                  <tr key={index}>
                                    <td>{item.name}</td>
                                    <td>{item.barcode}</td>
                                    <td>{item.category}</td>
                                    <td className="text-end">{item.quantity}</td>
                                    <td className="text-end">{item.reorderLevel}</td>
                                    <td className="text-end">Rs. {item.value}</td>
                                    <td>
                                      <span className={`badge ${item.quantity < item.reorderLevel ? 'bg-danger' : 'bg-success'}`}>
                                        {item.quantity < item.reorderLevel ? 'Low Stock' : 'In Stock'}
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={7} className="text-center">
                                    No data available
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </Table>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              )}
            </>
          )}
        </Card.Body>
      </Card>
      
      {/* Error and Success Messages */}
      <ToastContainer position="bottom-center" className="p-3">
        {error && (
          <Toast 
            onClose={() => setError(null)} 
            show={!!error} 
            delay={6000} 
            autohide 
            bg="danger"
          >
            <Toast.Header closeButton>
              <strong className="me-auto">Error</strong>
            </Toast.Header>
            <Toast.Body className="text-white">{error}</Toast.Body>
          </Toast>
        )}
        
        {successMessage && (
          <Toast 
            onClose={() => setSuccessMessage(null)} 
            show={!!successMessage} 
            delay={6000} 
            autohide 
            bg="success"
          >
            <Toast.Header closeButton>
              <strong className="me-auto">Success</strong>
            </Toast.Header>
            <Toast.Body className="text-white">{successMessage}</Toast.Body>
          </Toast>
        )}
      </ToastContainer>
    </Container>
  );
};

export default Reports;