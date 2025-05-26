import React, { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  InputGroup,
  Modal,
  Pagination,
  Row,
  Spinner,
  Table,
  Toast, ToastContainer
} from 'react-bootstrap';
import { categoriesApi, printApi, productsApi, suppliersApi } from '../services/api';
// Fix icon imports
import {
  FaFilter,
  FaPencilAlt,
  FaPlus,
  FaPrint,
  FaSearch,
  FaTrash
} from 'react-icons/fa';

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
  const handleChangePage = (pageNumber: number) => {
    setPage(pageNumber);
  };
  
  // Handle rows per page change
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
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
      
      const response = await printApi.generateBarcodes(selectedProductIds, printQuantity);
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `product-labels-${Date.now()}.pdf`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
      
      setSuccessMessage(`${selectedProductIds.length} product labels generated successfully`);
      setPrintDialogOpen(false);
      setSelectedProductIds([]);
      setPrintQuantity(1);
      
    } catch (err: any) {
      console.error('Error generating labels:', err);
      
      if (err.response) {
        if (err.response.data instanceof Blob) {
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
        setError('Failed to generate labels: No response from server. Please check your network connection.');
      } else {
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
  
  // Handle select field changes
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle filter select changes
  const handleFilterSelectChange = (e: React.ChangeEvent<HTMLSelectElement>, filterType: 'category' | 'supplier') => {
    const value = e.target.value;
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
      
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      
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
      
      if (formData.image) {
        formDataToSend.append('image', formData.image);
      }
      
      if (selectedProduct) {
        await productsApi.update(selectedProduct.id, formDataToSend);
        setSuccessMessage('Product updated successfully');
      } else {
        await productsApi.create(formDataToSend);
        setSuccessMessage('Product created successfully');
      }
      
      handleCloseProductForm();
      fetchProducts();
    } catch (err) {
      console.error('Error submitting product:', err);
      setError('Failed to save product');
    }
  };
  
  // Calculate pagination items
  const paginationItems = () => {
    const totalPages = Math.ceil(totalProducts / rowsPerPage);
    let items = [];
    
    for (let number = 0; number < totalPages; number++) {
      items.push(
        <Pagination.Item key={number} active={number === page} onClick={() => handleChangePage(number)}>
          {number + 1}
        </Pagination.Item>
      );
    }
    
    return items;
  };

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4 align-items-center">
        <Col>
          <h4>Products</h4>
        </Col>
        
        <Col xs="auto" className="d-flex gap-2">
          <Button variant="primary" onClick={() => handleOpenProductForm()}>
            <>{FaPlus({ className: "me-1" })}</> Add Product
          </Button>
          
          {selectedProductIds.length > 0 && (
            <Button variant="outline-primary" onClick={handleOpenPrintDialog}>
              <>{FaPrint({ className: "me-1" })}</> Print Labels ({selectedProductIds.length})
            </Button>
          )}
        </Col>
      </Row>
      
      {/* Filters */}
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0">Filters</h6>
          <Button variant="link" className="p-0">
            <>{FaFilter({})}</>
          </Button>
        </Card.Header>
        
        <Card.Body>
          <Row className="g-3">
            <Col xs={12} md={4}>
              <InputGroup>
                <InputGroup.Text>
                  <>{FaSearch({})}</>
                </InputGroup.Text>
                <Form.Control
                  placeholder="Search Products"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </InputGroup>
            </Col>
            
            <Col xs={12} sm={6} md={3}>
              <Form.Select
                value={categoryFilter}
                onChange={(e) => handleFilterSelectChange(e, 'category')}
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id?.toString() || ''}>
                    {category.name}
                  </option>
                ))}
              </Form.Select>
            </Col>
            
            <Col xs={12} sm={6} md={3}>
              <Form.Select
                value={supplierFilter}
                onChange={(e) => handleFilterSelectChange(e, 'supplier')}
              >
                <option value="">All Suppliers</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id?.toString() || ''}>
                    {supplier.name}
                  </option>
                ))}
              </Form.Select>
            </Col>
            
            <Col xs={12} sm={6} md={2}>
              <Button
                variant={showLowStock ? "warning" : "outline-warning"}
                className="w-100"
                onClick={() => setShowLowStock(!showLowStock)}
              >
                {showLowStock ? "All Stock" : "Low Stock"}
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      
      {/* Products Table */}
      <Card>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover>
              <thead>
                <tr>
                  <th style={{ width: '80px' }}></th>
                  <th>Name</th>
                  <th>Barcode</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>
              
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4">
                      <Spinner animation="border" />
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4">
                      No products found
                    </td>
                  </tr>
                ) : (
                  products.map((product) => {
                    const isLowStock = (product.stockQuantity || 0) <= (product.reorderLevel || 0);
                    const isSelected = selectedProductIds.includes(product.id);
                    
                    return (
                      <tr 
                        key={product.id}
                        onClick={() => toggleProductSelection(product.id)}
                        className={isSelected ? "table-primary" : ""}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <Badge 
                            bg={isSelected ? "primary" : "light"} 
                            text={isSelected ? "white" : "dark"}
                          >
                            {isSelected ? "Selected" : "Select"}
                          </Badge>
                        </td>
                        
                        <td>{product.name}</td>
                        <td>{product.barcode}</td>
                        <td>{product.category ? product.category.name : 'Uncategorized'}</td>
                        <td>Rs. {(product.price || 0).toFixed(2)}</td>
                        
                        <td>
                          <Badge 
                            bg={isLowStock ? "danger" : "success"}
                          >
                            {product.stockQuantity || 0} units
                          </Badge>
                        </td>
                        
                        <td>
                          <Button 
                            variant="link" 
                            className="p-1 me-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenProductForm(product);
                            }}
                          >
                            <>{FaPencilAlt({})}</>
                          </Button>
                          
                          <Button 
                            variant="link" 
                            className="p-1 text-danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDeleteDialog(product);
                            }}
                          >
                            <>{FaTrash({})}</>
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>
          
          <div className="d-flex justify-content-between align-items-center p-3 flex-wrap">
            <div className="d-flex align-items-center mb-2 mb-sm-0">
              <span className="me-2">Rows per page:</span>
              <Form.Select 
                style={{ width: '80px' }}
                value={rowsPerPage.toString()}
                onChange={handleChangeRowsPerPage}
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="25">25</option>
              </Form.Select>
            </div>
            
            <div>
              <span className="me-3">
                {page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, totalProducts)} of {totalProducts}
              </span>
              <Pagination className="d-inline-flex mb-0">
                <Pagination.Prev 
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                />
                {paginationItems()}
                <Pagination.Next
                  onClick={() => setPage(Math.min(Math.ceil(totalProducts / rowsPerPage) - 1, page + 1))}
                  disabled={page >= Math.ceil(totalProducts / rowsPerPage) - 1}
                />
              </Pagination>
            </div>
          </div>
        </Card.Body>
      </Card>
      
      {/* Print Labels Modal */}
      <Modal show={printDialogOpen} onHide={() => setPrintDialogOpen(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Print Product Labels</Modal.Title>
        </Modal.Header>
        
        <Modal.Body>
          <p>
            You are about to print labels for {selectedProductIds.length} selected products.
          </p>
          
          <Form.Group className="mt-3">
            <Form.Label>Quantity per product</Form.Label>
            <Form.Control
              type="number"
              value={printQuantity}
              onChange={(e) => setPrintQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
            />
          </Form.Group>
        </Modal.Body>
        
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setPrintDialogOpen(false)}
            disabled={printLoading}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handlePrintLabels}
            disabled={printLoading}
          >
            {printLoading ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-1" /> 
                Generating...
              </>
            ) : (
              <>
                <>{FaPrint({ className: "me-1" })}</> Print Labels
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal show={deleteDialogOpen} onHide={handleCloseDeleteDialog}>
        <Modal.Header closeButton>
          <Modal.Title>Delete Product</Modal.Title>
        </Modal.Header>
        
        <Modal.Body>
          <p>
            Are you sure you want to delete the product: <strong>{selectedProduct?.name}</strong>?
          </p>
          <p className="text-danger">This action cannot be undone.</p>
        </Modal.Body>
        
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDeleteDialog}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteProduct}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Product Form Modal */}
      <Modal 
        show={productFormOpen} 
        onHide={handleCloseProductForm}
        size="lg"
      >
        <form onSubmit={handleSubmitForm}>
          <Modal.Header closeButton>
            <Modal.Title>
              {selectedProduct ? 'Edit Product' : 'Add New Product'}
            </Modal.Title>
          </Modal.Header>
          
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Product Name</Form.Label>
                  <Form.Control
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                  />
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Barcode</Form.Label>
                  <Form.Control
                    name="barcode"
                    value={formData.barcode}
                    onChange={handleInputChange}
                  />
                  <Form.Text className="text-muted">
                    Leave empty to auto-generate a unique barcode
                  </Form.Text>
                </Form.Group>
                
                <Row>
                  <Col>
                    <Form.Group className="mb-3">
                      <Form.Label>Category</Form.Label>
                      <Form.Control
                        name="categoryName"
                        value={formData.categoryName}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col>
                    <Form.Group className="mb-3">
                      <Form.Label>Supplier</Form.Label>
                      <Form.Control
                        name="supplierName"
                        value={formData.supplierName}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Col>
              
              <Col md={6}>
                <Row>
                  <Col>
                    <Form.Group className="mb-3">
                      <Form.Label>Price</Form.Label>
                      <InputGroup>
                        <InputGroup.Text>Rs.</InputGroup.Text>
                        <Form.Control
                          type="number"
                          name="price"
                          value={formData.price}
                          onChange={handleInputChange}
                          required
                          min="0"
                          step="0.01"
                        />
                      </InputGroup>
                    </Form.Group>
                  </Col>
                  <Col>
                    <Form.Group className="mb-3">
                      <Form.Label>Cost Price</Form.Label>
                      <InputGroup>
                        <InputGroup.Text>Rs.</InputGroup.Text>
                        <Form.Control
                          type="number"
                          name="costPrice"
                          value={formData.costPrice}
                          onChange={handleInputChange}
                          min="0"
                          step="0.01"
                        />
                      </InputGroup>
                    </Form.Group>
                  </Col>
                </Row>
                
                <Row>
                  <Col>
                    <Form.Group className="mb-3">
                      <Form.Label>Stock Quantity</Form.Label>
                      <Form.Control
                        type="number"
                        name="stockQuantity"
                        value={formData.stockQuantity}
                        onChange={handleInputChange}
                        required
                        min="0"
                      />
                    </Form.Group>
                  </Col>
                  <Col>
                    <Form.Group className="mb-3">
                      <Form.Label>Reorder Level</Form.Label>
                      <Form.Control
                        type="number"
                        name="reorderLevel"
                        value={formData.reorderLevel}
                        onChange={handleInputChange}
                        min="0"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Col>
            </Row>
          </Modal.Body>
          
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseProductForm}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {selectedProduct ? 'Update' : 'Create'} Product
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
      
      {/* Toasts for notifications */}
      <ToastContainer position="bottom-center" className="p-3">
        {error && (
          <Toast 
            onClose={() => setError(null)} 
            show={!!error} 
            delay={6000} 
            autohide 
            bg="danger"
            className="text-white"
          >
            <Toast.Header>
              <strong className="me-auto">Error</strong>
            </Toast.Header>
            <Toast.Body>{error}</Toast.Body>
          </Toast>
        )}
        
        {successMessage && (
          <Toast 
            onClose={() => setSuccessMessage(null)} 
            show={!!successMessage} 
            delay={6000} 
            autohide 
            bg="success"
            className="text-white"
          >
            <Toast.Header>
              <strong className="me-auto">Success</strong>
            </Toast.Header>
            <Toast.Body>{successMessage}</Toast.Body>
          </Toast>
        )}
      </ToastContainer>
    </Container>
  );
};

export default Products;