import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000 // Add timeout of 10 seconds for all requests
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
  id?: string | number;
  _id?: string;
  name: string;
  description?: string;
  price: number;
  cost?: number;
  costPrice?: number;
  barcode?: string;
  sku?: string;
  categoryId?: string;
  supplierId?: string;
  category?: { _id: string; name: string };
  supplier?: { _id: string; name: string };
  quantity?: number;
  stockQuantity?: number;
  reorderLevel?: number;
  minStock?: number;
  image?: string | File;
}

// Supplier interface
interface Supplier {
  id?: string | number;
  _id?: string;
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
  items: Array<{
    productId?: number;
    product?: number;
    quantity: number; 
    price: number;
    discount?: number;
    isManual?: boolean; // Add flag for manual items
    name?: string; // Add name for manual items
  }>;
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  paymentMethod: string;
  notes?: string;
  customerName?: string;
  customerPhone?: string;
  user?: number;
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
  getById: (id: string | number) => {
    return api.get(`/products/${id}`);
  },
  getByBarcode: (barcode: string) => 
    api.get(`/products/barcode/${barcode}`)
      .catch(error => {
        // Enhanced error handling specifically for barcode scanning
        if (error.code === 'ECONNABORTED') {
          throw new Error('Connection timeout. Server might be unavailable.');
        }
        if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
          throw new Error('Network error. Please check server connection.');
        }
        if (error.response) {
          // The server responded with an error status
          if (error.response.status === 404) {
            throw new Error(`Product with barcode ${barcode} not found`);
          }
          throw new Error(`Server error (${error.response.status}): ${error.response.data?.message || 'Unknown error'}`);
        }
        throw error;
      }),
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
  refresh: () => api.get('/products/refresh'),
  
  // Fix the checkExistingProducts method with better error handling
  checkExistingProducts: (productNames: string[]) => {
    console.log('Checking existing products with names:', productNames);
    return api.post('/products/check-existing', { productNames })
      .catch(error => {
        console.error('Error in checkExistingProducts:', error);
        if (error.response) {
          throw new Error(`Server error (${error.response.status}): ${error.response.data?.message || 'Unknown error checking products'}`);
        } else if (error.request) {
          throw new Error('No response received from server when checking existing products');
        } else {
          throw new Error(`Error checking products: ${error.message}`);
        }
      });
  },
};

// Categories API
export const categoriesApi = {
  getAll: (params?: { shopId?: string }) => api.get('/categories', { params }),
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
  
  getById: (id: string | number) => {
    // Enhanced validation - check for undefined, null, empty string
    if (id === undefined || id === null || id === '') {
      console.error('Invalid sale ID provided to salesApi.getById:', id);
      return Promise.reject(new Error('Sale ID is required and cannot be empty'));
    }
    
    // Convert numeric IDs to string
    const saleId = id.toString();
    
    return api.get(`/sales/${saleId}`)
      .catch(error => {
        console.error('Error fetching sale details:', error);
        if (error.response && error.response.status === 404) {
          throw new Error('Sale not found');
        } else if (error.response && error.response.status === 400) {
          throw new Error('Invalid sale ID format provided');
        }
        throw new Error(`Failed to load sale: ${error.response?.data?.message || error.message}`);
      });
  },
  
  create: (saleData: Sale) => {
    // Improved handling of manual and product items
    const formattedData = {
      ...saleData,
      items: saleData.items.map(item => {
        // Keep isManual flag and name for manual items
        if (item.isManual) {
          return {
            isManual: true,
            name: item.name || 'Manual Item',
            quantity: item.quantity,
            price: item.price,
            discount: item.discount || 0
          };
        } else {
          // For regular products, ensure we have the proper ID format
          return {
            product: item.productId || item.product,
            quantity: item.quantity,
            price: item.price,
            discount: item.discount || 0
          };
        }
      })
    };
    
    return api.post('/sales', formattedData)
      .catch(error => {
        console.error('Error creating sale:', error);
        throw new Error(`Failed to create sale: ${error.response?.data?.message || error.message}`);
      });
  },
  
  updateStatus: (id: number | string, statusData: { status: string; reason?: string }) =>
    api.patch(`/sales/${id}/status`, statusData),
};

// Reports API
export const reportsApi = {
  getSalesSummary: (params: { 
    startDate?: string; 
    endDate?: string; 
    groupBy?: 'day' | 'week' | 'month';
    shopId?: string;
  }) => api.get('/reports/sales/summary', { params }),
  
  getProductSalesReport: (params: { 
    startDate?: string;
    endDate?: string;
    categoryId?: string | number;
    limit?: number;
    shopId?: string;
  }) => api.get('/reports/sales/products', { params }),
  
  // Enhanced getProfitDistribution method with better error handling
  getProfitDistribution: (params: { 
    startDate?: string; 
    endDate?: string; 
    groupBy?: 'day' | 'week' | 'month';
    shopId?: string;
  }) => {
    console.log('Calling profit distribution API with params:', params);
    return api.get('/reports/sales/profit', { params })
      .catch(error => {
        console.error('Profit distribution API error:', error);
        if (error.response) {
          throw new Error(`Server error (${error.response.status}): ${error.response.data?.message || 'Unknown error'}`);
        } else if (error.request) {
          throw new Error('No response received from server when fetching profit data');
        } else {
          throw new Error(`Error fetching profit data: ${error.message}`);
        }
      });
  },
  
  // Ensure there's only one implementation for inventory status report
  getInventoryStatusReport: (params: { 
    lowStock?: boolean;   
    categoryId?: string;
    shopId: string;
  }) => {
    console.log('Calling inventory status API with params:', params);
    return api.get('/reports/inventory/status', { params });
  },
  
  // Fix the generateSalesReport function - correctly implement it
  generateSalesReport: (params: { 
    startDate?: string; 
    endDate?: string;
    shopId?: string;
  }) => {
    console.log('Calling generateSalesReport API with params:', params);
    return api.get('/reports/sales-report', { 
      params,
      responseType: 'blob' // Set response type to blob for direct file download
    })
    .then(response => {
      // Create a blob from the response data
      const blob = new Blob([response.data], { type: 'application/pdf' });
      
      // Create a link element to trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sales_report_${new Date().getTime()}.pdf`;
      
      // Append to body, click and remove
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      return { success: true, message: 'Report generated successfully' };
    })
    .catch(error => {
      console.error('Error generating sales report:', error);
      if (error.response) {
        throw new Error(`Server error (${error.response.status}): ${error.response.data?.message || 'Unknown error'}`);
      } else if (error.request) {
        throw new Error('No response received from server. Check server connection.');
      } else {
        throw new Error(`Request error: ${error.message}`);
      }
    });
  },
  
  getDailySales: (params: {
    startDate?: string;
    endDate?: string;
    shopId?: string;
  }) => api.get('/reports/sales/daily', { params }),
};

// Print API
export const printApi = {
  generateBarcodes: (productIds: number[], quantity: number) => {
    return api.post('/products/print-labels', { 
      productIds, 
      quantity 
    }, { 
      responseType: 'blob'  // Set response type to blob for direct file download
    });
  },
  printReceipt: (orderId: string | number) => 
    api.post(`/print/receipt/${orderId}`),
  
  // Add new methods for thermal printing
  printReceiptToThermal: (orderId: string | number) => 
    api.post(`/print/thermal/${orderId}`),
  
  getReceiptPdf: (orderId: string | number) => 
    api.get(`/print/receipt/${orderId}`, {
      responseType: 'blob'
    })
};

// Stats API
export const statsApi = {
  getDeveloperStats: () => api.get('/stats/developer'),
};

// Helper function to check server connectivity
export const checkServerConnectivity = () => {
  return api.get('/health-check')
    .then(() => true)
    .catch(() => false);
};

export default api;