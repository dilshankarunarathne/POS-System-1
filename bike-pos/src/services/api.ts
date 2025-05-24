import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
  getAll: (params?: { 
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: number;
    supplierId?: number;
    lowStock?: boolean;
  }) => api.get('/products', { params }),
  
  getById: (id: number) => 
    api.get(`/products/${id}`),
  
  getByBarcode: (barcode: string) => 
    api.get(`/products/barcode/${barcode}`),
  
  create: (productData: any) => 
    api.post('/products', productData),
  
  update: (id: number, productData: any) => 
    api.put(`/products/${id}`, productData),
  
  delete: (id: number) => 
    api.delete(`/products/${id}`),
  
  updateStock: (id: number, stockData: { quantity: number; type: 'add' | 'subtract' }) =>
    api.patch(`/products/${id}/stock`, stockData),
};

// Categories API
export const categoriesApi = {
  getAll: () => 
    api.get('/categories'),
  
  getById: (id: number) => 
    api.get(`/categories/${id}`),
  
  create: (categoryData: { name: string; description?: string }) => 
    api.post('/categories', categoryData),
  
  update: (id: number, categoryData: { name?: string; description?: string; active?: boolean }) => 
    api.put(`/categories/${id}`, categoryData),
  
  delete: (id: number) => 
    api.delete(`/categories/${id}`),
};

// Suppliers API
export const suppliersApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string }) => 
    api.get('/suppliers', { params }),
  
  getById: (id: number) => 
    api.get(`/suppliers/${id}`),
  
  create: (supplierData: any) => 
    api.post('/suppliers', supplierData),
  
  update: (id: number, supplierData: any) => 
    api.put(`/suppliers/${id}`, supplierData),
  
  delete: (id: number) => 
    api.delete(`/suppliers/${id}`),
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
  
  create: (saleData: any) => 
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
  generateReceipt: (saleId: number) => 
    api.get(`/print/receipt/${saleId}`),
  
  generateProductLabel: (productId: number, quantity?: number) =>
    api.get(`/print/product-label/${productId}`, { params: { quantity } }),
  
  generateBarcodes: (productIds: number[]) =>
    api.post('/print/barcodes', { productIds }),
};

export default api; 