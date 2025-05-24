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
    Card,
    CardMedia,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    Grid,
    IconButton,
    InputAdornment,
    InputLabel,
    MenuItem,
    Paper,
    Select,
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
    Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { categoriesApi, printApi, productsApi, suppliersApi } from '../services/api';

const Products: React.FC = () => {
  // State for products data
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
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
        
        setCategories(categoriesResponse.data);
        setSuppliers(suppliersResponse.data);
      } catch (err) {
        console.error('Error fetching categories and suppliers:', err);
        setError('Failed to load categories and suppliers');
      }
    };
    
    fetchData();
  }, []);
  
  // Fetch products with filters and pagination
  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      const response = await productsApi.getAll({
        page: page + 1,
        limit: rowsPerPage,
        search: searchQuery,
        category: categoryFilter,
        supplier: supplierFilter,
        lowStock: showLowStock,
      });
      
      setProducts(response.data.products);
      setTotalProducts(response.data.totalProducts);
      
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
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
      const response = await printApi.generateLabels({
        productIds: selectedProductIds,
        quantity: printQuantity,
      });
      
      // Open the PDF in a new tab
      window.open(`http://localhost:5000${response.data.downloadUrl}`, '_blank');
      
      setSuccessMessage('Labels generated successfully');
      setPrintDialogOpen(false);
      setSelectedProductIds([]);
      setPrintQuantity(1);
    } catch (err) {
      console.error('Error generating labels:', err);
      setError('Failed to generate labels');
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
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
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
          </Grid>
          
          <Grid item xs={12} sm={3}>
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
          
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="supplier-filter-label">Supplier</InputLabel>
              <Select
                labelId="supplier-filter-label"
                id="supplier-filter"
                value={supplierFilter}
                label="Supplier"
                onChange={(e) => setSupplierFilter(e.target.value)}
              >
                <MenuItem value="">All Suppliers</MenuItem>
                {suppliers.map((supplier) => (
                  <MenuItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={2}>
            <Button
              fullWidth
              variant={showLowStock ? "contained" : "outlined"}
              color={showLowStock ? "warning" : "primary"}
              onClick={() => setShowLowStock(!showLowStock)}
            >
              {showLowStock ? "All Stock" : "Low Stock"}
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Products Table */}
      <Paper>
        <TableContainer>
          <Table sx={{ minWidth: 650 }} aria-label="products table">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox"></TableCell>
                <TableCell>Image</TableCell>
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
                  <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => {
                  const isLowStock = product.stockQuantity <= product.reorderLevel;
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
                      
                      <TableCell>
                        {product.image ? (
                          <Card sx={{ width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CardMedia
                              component="img"
                              sx={{ height: 50, objectFit: 'contain' }}
                              image={`http://localhost:5000${product.image}`}
                              alt={product.name}
                            />
                          </Card>
                        ) : (
                          <Box sx={{ width: 60, height: 60, bgcolor: 'grey.200', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography variant="caption" color="text.secondary">No Image</Typography>
                          </Box>
                        )}
                      </TableCell>
                      
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.barcode}</TableCell>
                      <TableCell>{product.Category ? product.Category.name : 'Uncategorized'}</TableCell>
                      <TableCell>Rs. {product.price.toFixed(2)}</TableCell>
                      
                      <TableCell>
                        <Chip
                          label={`${product.stockQuantity} units`}
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
          <Button onClick={() => setPrintDialogOpen(false)}>Cancel</Button>
          <Button onClick={handlePrintLabels} variant="contained" color="primary">
            Print Labels
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