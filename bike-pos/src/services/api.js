import axios from 'axios';

// Configure base API settings
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If 401 Unauthorized, clear local storage and redirect to login
    if (error.response && error.response.status === 401) {
      // Only redirect to login if not already on login page
      if (!window.location.pathname.includes('/login')) {
        console.log('Session expired, redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API endpoints for reports 
export const reportsApi = {
  // Get sales summary data for dashboard
  getSalesSummary: (params = {}) => {
    return api.get('/reports/sales/summary', { params });
  },
  
  // Get product sales report data
  getProductSalesReport: (params = {}) => {
    return api.get('/reports/sales/products', { params });
  },
  
  // Get inventory status report
  getInventoryReport: (params = {}) => {
    return api.get('/reports/inventory', { params });
  },

  // Get daily sales data
  getDailySales: (params = {}) => {
    return api.get('/reports/sales/daily', { params });
  }
};

// API endpoints for products
export const productsApi = {
  // Get all products with optional filtering
  getAll: (params = {}) => {
    return api.get('/products', { params });
  },
  
  // Get product by ID
  getById: (id) => {
    return api.get(`/products/${id}`);
  },
  
  // Create product
  create: (productData) => {
    return api.post('/products', productData);
  },
  
  // Update product
  update: (id, productData) => {
    return api.put(`/products/${id}`, productData);
  },
  
  // Delete product
  delete: (id) => {
    return api.delete(`/products/${id}`);
  },
  
  // Get low stock products
  getLowStock: (limit = 10) => {
    return api.get('/products', { params: { lowStock: true, limit } });
  }
};

// API endpoints for sales
export const salesApi = {
  // Get all sales with optional filtering
  getAll: (params = {}) => {
    return api.get('/sales', { params });
  },
  
  // Get sale by ID
  getById: (id) => {
    return api.get(`/sales/${id}`);
  },
  
  // Create new sale
  create: (saleData) => {
    return api.post('/sales', saleData);
  }
};

// Auth API
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/me'),
};

// Categories API
export const categoriesApi = {
  getAll: () => api.get('/categories'),
  getById: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

// Suppliers API (Missing in original file)
export const suppliersApi = {
  getAll: (params) => api.get('/suppliers', { params }),
  getById: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
};

// Print API
export const printApi = {
  printReceipt: (saleId) => api.get(`/print/receipt/${saleId}`),
  printInventory: (params) => api.get('/print/inventory', { params }),
  printBarcode: (productId) => api.get(`/print/barcode/${productId}`),
  generateBarcodes: (productIds, quantity = 1) => 
    api.post('/products/print-labels', { productIds, quantity }, { responseType: 'blob' })
};

export default api;
