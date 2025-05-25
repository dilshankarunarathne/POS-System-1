import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
});

// Add request interceptor to add auth token
api.interceptors.request.use((config) => {
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

// Create axios instance
const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Auth API
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/me'),
};

// Products API
export const productsApi = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),

  // Get product by barcode
  getByBarcode: async (barcode) => {
    try {
      const response = await axiosInstance.get(`/products/barcode/${barcode}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching product by barcode:', error);
      throw error;
    }
  },
};

// Categories API
export const categoriesApi = {
  getAll: () => api.get('/categories'),
  getById: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

// Sales API
export const salesApi = {
  getAll: (params) => api.get('/sales', { params }),
  getById: (id) => api.get(`/sales/${id}`),
  create: (data) => api.post('/sales', data),
  updateStatus: (id, data) => api.patch(`/sales/${id}/status`, data),
};

// Reports API
export const reportsApi = {
  getSalesSummary: (params) => api.get('/reports/sales/summary', { params }),
  getProductSalesReport: (params) => api.get('/reports/sales/products', { params }),
  getInventoryStatusReport: (params) => api.get('/reports/inventory', { params }),
  generateSalesReport: (params) => api.get('/reports/sales/pdf', { params }),
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
