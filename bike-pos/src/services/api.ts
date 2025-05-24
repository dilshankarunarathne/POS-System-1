import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle token expiration
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Product interface
interface Product {
  id?: number;
  name: string;
  description?: string;
  price: number;
  cost: number;
  barcode?: string;
  sku?: string;
  categoryId?: number;
  supplierId?: number;
  quantity: number;
  minStock?: number;
  image?: string | File;
}

// Supplier interface
interface Supplier {
  id?: number;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

// Sale interface
interface Sale {
  id?: number;
  customerId?: number;
  items: Array<{productId: number; quantity: number; price: number}>;
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  paymentMethod: string;
  notes?: string;
}

// Auth API
export const authApi = {
  login: (credentials: { username: string; password: string }) => 
    api.post('/auth/login', credentials),
  
  register: (userData: { username: string; password: string; name: string; role: string }) =>
    api.post('/auth/register', userData),
  
  getProfile: () => 
    api.get('/auth/profile'),
};

// Products API
export const productsApi = {
  getAll: (params = {}) => api.get('/products', { params }),
  getById: (id: string | number) => api.get(`/products/${id}`),
  getByBarcode: (barcode: string) => api.get(`/products/barcode/${barcode}`),
  create: (data: FormData) => {
    // Use multipart/form-data for file uploads
    return api.post('/products', data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  update: (id: string | number, data: FormData) => {
    // Use multipart/form-data for file uploads
    return api.put(`/products/${id}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  delete: (id: string | number) => api.delete(`/products/${id}`),
  updateStock: (id: string | number, quantity: number) => api.patch(`/products/${id}/stock`, { quantity }),
  getLatest: (limit = 10) => api.get('/products/latest', { params: { limit } }),
  refresh: () => api.get('/products/refresh')
};

// Categories API
export const categoriesApi = {
  getAll: () => api.get('/categories'),
  getById: (id: string | number) => api.get(`/categories/${id}`),
  create: (data: any) => api.post('/categories', data),
  update: (id: string | number, data: any) => api.put(`/categories/${id}`, data),
  delete: (id: string | number) => api.delete(`/categories/${id}`)
};

// Suppliers API
export const suppliersApi = {
  getAll: () => api.get('/suppliers'),
  getById: (id: string | number) => api.get(`/suppliers/${id}`),
  create: (data: any) => api.post('/suppliers', data),
  update: (id: string | number, data: any) => api.put(`/suppliers/${id}`, data),
  delete: (id: string | number) => api.delete(`/suppliers/${id}`)
};

// Sales API
export const salesApi = {
  getAll: (params?: { 
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    paymentMethod?: string;
    status?: string;
  }) => api.get('/sales', { params }),
  
  getById: (id: number) => 
    api.get(`/sales/${id}`),
  
  create: (saleData: Sale) => 
    api.post('/sales', saleData),
  
  updateStatus: (id: number, statusData: { status: string; reason?: string }) =>
    api.patch(`/sales/${id}/status`, statusData),
};

// Reports API
export const reportsApi = {
  getSalesSummary: (params: { startDate?: string; endDate?: string; groupBy?: 'day' | 'week' | 'month' }) =>
    api.get('/reports/sales-summary', { params }),
  
  getProductSalesReport: (params: { 
    startDate?: string;
    endDate?: string;
    categoryId?: string | number;
    limit?: number;
  }) => api.get('/reports/product-sales', { params }),
  
  getInventoryStatusReport: (params: { lowStock?: boolean; categoryId?: string | number }) =>
    api.get('/reports/inventory-status', { params }),
  
  generateSalesReport: (params: { startDate?: string; endDate?: string }) =>
    api.get('/reports/generate-sales-report', { params }),
};

// Print API
export const printApi = {
  generateBarcodes: (productIds: number[], quantity = 1) => 
    api.post('/print/barcodes', { productIds, quantity }),
  printReceipt: (orderId: string | number) => 
    api.post(`/print/receipt/${orderId}`)
};

export default api;