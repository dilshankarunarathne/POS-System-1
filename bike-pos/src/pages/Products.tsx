import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  FilterList as FilterListIcon,
  Print as PrintIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
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
  Typography
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { categoriesApi, printApi, productsApi, suppliersApi } from '../services/api';

const Products: React.FC = () => {
  // State for products data
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // Add loading state for print operation
  const [printLoading, setPrintLoading] = useState(false);
  
  // State for pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalProducts, setTotalProducts] = useState(0);
  
  // State for filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  
  // State for dialogs
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [printQuantity, setPrintQuantity] = useState(1);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    barcode: '',
    price: '',
    costPrice: '',
    stockQuantity: '',
    reorderLevel: '',
    categoryId: '',
    supplierId: '',
    // Add direct text input fields for category and supplier
    categoryName: '',
    supplierName: '',
    image: null as File | null,
    imageUrl: '',
  });
  
  // Fetch products on component mount and when filters change
  useEffect(() => {
    fetchProducts();
  }, [page, rowsPerPage, searchQuery, categoryFilter, supplierFilter, showLowStock]);
  
  // Fetch categories and suppliers on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesResponse, suppliersResponse] = await Promise.all([
          categoriesApi.getAll(),
          suppliersApi.getAll(),
        ]);
        
        setCategories(categoriesResponse.data || []);
        setSuppliers(suppliersResponse.data || []);
      } catch (err) {
        console.error('Error fetching categories and suppliers:', err);
        setError('Failed to load categories and suppliers');
        setCategories([]);
        setSuppliers([]);
      }
    };
    
    fetchData();
  }, []);
  
  // Reset form data when selected product changes
  useEffect(() => {
    if (selectedProduct) {
      setFormData({
        name: selectedProduct.name || '',
        description: selectedProduct.description || '',
        barcode: selectedProduct.barcode || '',
        price: selectedProduct.price?.toString() || '',
        costPrice: selectedProduct.costPrice?.toString() || '',
        stockQuantity: selectedProduct.stockQuantity?.toString() || '',
        reorderLevel: selectedProduct.reorderLevel?.toString() || '',
        categoryId: selectedProduct.categoryId?.toString() || selectedProduct.category?.id?.toString() || '',
        supplierId: selectedProduct.supplierId?.toString() || selectedProduct.supplier?.id?.toString() || '',
        // Set category and supplier name fields from product data
        categoryName: selectedProduct.category?.name || '',
        supplierName: selectedProduct.supplier?.name || '',
        image: null,
        imageUrl: selectedProduct.image ? `http://localhost:5000${selectedProduct.image}` : '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        barcode: '',
        price: '',
        costPrice: '',
        stockQuantity: '0',
        reorderLevel: '0',
        categoryId: '',
        supplierId: '',
        categoryName: '',
        supplierName: '',
        image: null,
        imageUrl: '',
      });
    }
  }, [selectedProduct]);
  
  // Fetch products with filters and pagination
  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      const response = await productsApi.getAll({
        page: page + 1,
        limit: rowsPerPage,
        search: searchQuery,
        category: categoryFilter || undefined,
        supplier: supplierFilter || undefined,
        lowStock: showLowStock,
      });
      
      // Ensure products is always an array even if the response is undefined
      setProducts(response.data?.products || []);
      setTotalProducts(response.data?.pagination?.total || 0);
      
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
      setProducts([]);
      setTotalProducts(0);
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
  
  // Open product form for adding or editing
  const handleOpenProductForm = (product: any = null) => {
    setSelectedProduct(product);
    setProductFormOpen(true);
  };
  
  // Close product form
  const handleCloseProductForm = () => {
    setProductFormOpen(false);
    setSelectedProduct(null);
  };
  
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (product: any) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  };
  
  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedProduct(null);
  };
  
  // Delete product
  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;
    
    try {
      await productsApi.delete(selectedProduct.id);
      
      setSuccessMessage('Product deleted successfully');
      handleCloseDeleteDialog();
      fetchProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
      setError('Failed to delete product');
    }
  };
  
  // Toggle product selection for printing labels
  const toggleProductSelection = (productId: number) => {
    setSelectedProductIds(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };
  
  // Open print labels dialog
  const handleOpenPrintDialog = () => {
    if (selectedProductIds.length === 0) {
      setError('Please select at least one product');
      return;
    }
    
    setPrintDialogOpen(true);
  };
  
  // Print product labels
  const handlePrintLabels = async () => {
    try {
      setPrintLoading(true);
      
      if (selectedProductIds.length === 0) {
        setError('No products selected for printing labels');
        return;
      }
      
      console.log('Sending request to generate barcodes for products:', selectedProductIds);
      
      // Generate barcodes for all selected products
      const response = await printApi.generateBarcodes(selectedProductIds, printQuantity);
      
      // Create a download link for the blob data
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Create an anchor element and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `product-labels-${Date.now()}.pdf`;
      
      // Append to the document, click and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      window.URL.revokeObjectURL(url);
      
      setSuccessMessage(`${selectedProductIds.length} product labels generated successfully`);
      setPrintDialogOpen(false);
      setSelectedProductIds([]);
      setPrintQuantity(1);
      
    } catch (err: any) {
      console.error('Error generating labels:', err);
      
      // Provide more detailed error information
      if (err.response) {
        // Server responded with an error status code
        if (err.response.data instanceof Blob) {
          // Try to read the error message from the blob
          try {
            const text = await err.response.data.text();
            let errorMsg = 'Unknown error';
            try {
              const errorObj = JSON.parse(text);
              errorMsg = errorObj.message || 'Error generating labels';
            } catch (e) {
              errorMsg = text || 'Error generating labels';
            }
            setError(`Failed to generate labels: ${errorMsg}`);
          } catch (textErr) {
            setError(`Failed to generate labels: Server returned an error`);
          }
        } else {
          const errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
          setError(`Failed to generate labels: ${errorMessage}`);
        }
      } else if (err.request) {
        // Request was made but no response received
        setError('Failed to generate labels: No response from server. Please check your network connection.');
      } else {
        // Error in request setup
        setError(`Failed to generate labels: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setPrintLoading(false);
    }
  };
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle select field changes (FIXED)
  const handleSelectChange = (event: SelectChangeEvent<string>) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name as string]: value }));
  };
  
  // Handle filter select changes (FIXED)
  const handleFilterSelectChange = (event: SelectChangeEvent<string>, filterType: 'category' | 'supplier') => {
    const value = event.target.value;
    if (filterType === 'category') {
      setCategoryFilter(value);
    } else {
      setSupplierFilter(value);
    }
  };
  
  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData(prev => ({
        ...prev,
        image: file,
        imageUrl: URL.createObjectURL(file),
      }));
    }
  };
  
  // Submit form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const formDataToSend = new FormData();
      
      // Add all text fields
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      
      // Only add barcode if provided (otherwise backend will auto-generate)
      if (formData.barcode) {
        formDataToSend.append('barcode', formData.barcode);
      }
      
      formDataToSend.append('price', formData.price);
      
      if (formData.costPrice) {
        formDataToSend.append('costPrice', formData.costPrice);
      }
      
      formDataToSend.append('stockQuantity', formData.stockQuantity);
      
      if (formData.reorderLevel) {
        formDataToSend.append('reorderLevel', formData.reorderLevel);
      }
      
      // Category and supplier handling - prioritize direct input
      if (formData.categoryName) {
        formDataToSend.append('categoryName', formData.categoryName);
      } else if (formData.categoryId) {
        formDataToSend.append('categoryId', formData.categoryId);
      }
      
      if (formData.supplierName) {
        formDataToSend.append('supplierName', formData.supplierName);
      } else if (formData.supplierId) {
        formDataToSend.append('supplierId', formData.supplierId);
      }
      
      // Add image if available
      if (formData.image) {
        formDataToSend.append('image', formData.image);
      }
      
      if (selectedProduct) {
        // Update existing product
        await productsApi.update(selectedProduct.id, formDataToSend);
        setSuccessMessage('Product updated successfully');
      } else {
        // Create new product
        await productsApi.create(formDataToSend);
        setSuccessMessage('Product created successfully');
      }
      
      // Close form and refresh product list
      handleCloseProductForm();
      fetchProducts();
    } catch (err) {
      console.error('Error submitting product:', err);
      setError('Failed to save product');
    }
  };
  
  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Products
        </Typography>
        
        <Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenProductForm()}
            sx={{ ml: 1 }}
          >
            Add Product
          </Button>
          
          {selectedProductIds.length > 0 && (
            <Button
              variant="outlined"
              startIcon={<PrintIcon />}
              onClick={handleOpenPrintDialog}
              sx={{ ml: 1 }}
            >
              Print Labels ({selectedProductIds.length})
            </Button>
          )}
        </Box>
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
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <Box sx={{ width: { xs: '100%', sm: '33.33%' } }}>
            <TextField
              fullWidth
              label="Search Products"
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
          </Box>
          
          <Box sx={{ width: { xs: '100%', sm: '25%' } }}>
            <FormControl fullWidth size="small">
              <InputLabel id="category-filter-label">Category</InputLabel>
              <Select
                labelId="category-filter-label"
                id="category-filter"
                value={categoryFilter}
                label="Category"
                onChange={(e) => handleFilterSelectChange(e, 'category')}
              >
                <MenuItem value="">All Categories</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id?.toString() || ''}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ width: { xs: '100%', sm: '25%' } }}>
            <FormControl fullWidth size="small">
              <InputLabel id="supplier-filter-label">Supplier</InputLabel>
              <Select
                labelId="supplier-filter-label"
                id="supplier-filter"
                value={supplierFilter}
                label="Supplier"
                onChange={(e) => handleFilterSelectChange(e, 'supplier')}
              >
                <MenuItem value="">All Suppliers</MenuItem>
                {suppliers.map((supplier) => (
                  <MenuItem key={supplier.id} value={supplier.id?.toString() || ''}>
                    {supplier.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ width: { xs: '100%', sm: '16.66%' } }}>
            <Button
              fullWidth
              variant={showLowStock ? "contained" : "outlined"}
              color={showLowStock ? "warning" : "primary"}
              onClick={() => setShowLowStock(!showLowStock)}
            >
              {showLowStock ? "All Stock" : "Low Stock"}
            </Button>
          </Box>
        </Box>
      </Paper>
      
      {/* Products Table */}
      <Paper>
        <TableContainer>
          <Table sx={{ minWidth: 650 }} aria-label="products table">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox"></TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Barcode</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Stock</TableCell>
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
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => {
                  // Add null checks for all properties that might be undefined
                  const isLowStock = (product.stockQuantity || 0) <= (product.reorderLevel || 0);
                  const isSelected = selectedProductIds.includes(product.id);
                  
                  return (
                    <TableRow
                      key={product.id}
                      hover
                      selected={isSelected}
                      onClick={() => toggleProductSelection(product.id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell padding="checkbox">
                        <Chip
                          size="small"
                          label={isSelected ? "Selected" : "Select"}
                          color={isSelected ? "primary" : "default"}
                          variant={isSelected ? "filled" : "outlined"}
                        />
                      </TableCell>
                      
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.barcode}</TableCell>
                      <TableCell>{product.category ? product.category.name : 'Uncategorized'}</TableCell>
                      <TableCell>Rs. {(product.price || 0).toFixed(2)}</TableCell>
                      
                      <TableCell>
                        <Chip
                          label={`${product.stockQuantity || 0} units`}
                          color={isLowStock ? 'error' : 'success'}
                          variant={isLowStock ? 'outlined' : 'filled'}
                          size="small"
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Box sx={{ display: 'flex' }}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenProductForm(product);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                          
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDeleteDialog(product);
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={totalProducts}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
      
      {/* Print Labels Dialog */}
      <Dialog open={printDialogOpen} onClose={() => setPrintDialogOpen(false)}>
        <DialogTitle>Print Product Labels</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" gutterBottom>
              You are about to print labels for {selectedProductIds.length} selected products.
            </Typography>
            
            <TextField
              fullWidth
              type="number"
              label="Quantity per product"
              value={printQuantity}
              onChange={(e) => setPrintQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              margin="normal"
              InputProps={{ inputProps: { min: 1 } }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setPrintDialogOpen(false)}
            disabled={printLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handlePrintLabels} 
            variant="contained" 
            color="primary"
            disabled={printLoading}
            startIcon={printLoading ? <CircularProgress size={20} /> : <PrintIcon />}
          >
            {printLoading ? 'Generating...' : 'Print Labels'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Delete Product</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the product: <strong>{selectedProduct?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleDeleteProduct} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Product Form Dialog */}
      <Dialog 
        open={productFormOpen} 
        onClose={handleCloseProductForm}
        fullWidth
        maxWidth="md"
      >
        <form onSubmit={handleSubmitForm}>
          <DialogTitle>
            {selectedProduct ? 'Edit Product' : 'Add New Product'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mt: 2 }}>
              <Box sx={{ flex: 1 }}>
                <TextField
                  fullWidth
                  label="Product Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  margin="normal"
                />
                
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  multiline
                  rows={3}
                  margin="normal"
                />
                
                <TextField
                  fullWidth
                  label="Barcode"
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleInputChange}
                  margin="normal"
                  helperText="Leave empty to auto-generate a unique barcode"
                />
                
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <TextField
                    fullWidth
                    label="Category"
                    name="categoryName"
                    value={formData.categoryName}
                    onChange={handleInputChange}
                    margin="normal"
                  />
                  
                  <TextField
                    fullWidth
                    label="Supplier"
                    name="supplierName"
                    value={formData.supplierName}
                    onChange={handleInputChange}
                    margin="normal"
                  />
                </Box>
              </Box>
              
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Price"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                    margin="normal"
                    inputProps={{ min: 0, step: 0.01 }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
                    }}
                  />
                  
                  <TextField
                    fullWidth
                    type="number"
                    label="Cost Price"
                    name="costPrice"
                    value={formData.costPrice}
                    onChange={handleInputChange}
                    margin="normal"
                    inputProps={{ min: 0, step: 0.01 }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
                    }}
                  />
                </Box>
                
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Stock Quantity"
                    name="stockQuantity"
                    value={formData.stockQuantity}
                    onChange={handleInputChange}
                    required
                    margin="normal"
                    inputProps={{ min: 0 }}
                  />
                  
                  <TextField
                    fullWidth
                    type="number"
                    label="Reorder Level"
                    name="reorderLevel"
                    value={formData.reorderLevel}
                    onChange={handleInputChange}
                    margin="normal"
                    inputProps={{ min: 0 }}
                  />
                </Box>
                
                {/* Product image section removed */}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseProductForm}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              {selectedProduct ? 'Update' : 'Create'} Product
            </Button>
          </DialogActions>
        </form>
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

export default Products;