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
  FaFileDownload,
  FaFileExcel,
  FaFileUpload,
  FaFilter,
  FaPencilAlt,
  FaPlus,
  FaPrint,
  FaSearch,
  FaTrash
} from 'react-icons/fa';
// Import xlsx library for Excel file processing
import * as XLSX from 'xlsx';

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
  
  // New states for bulk import
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importPreview, setImportPreview] = useState(false);
  // New states for tracking which products are new vs updates
  const [productUpdateMap, setProductUpdateMap] = useState<Record<string, { id: number, existing: boolean, currentStock: number }>>({});

  // Add new states for category management
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({
    id: '',
    name: '',
    description: ''
  });

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
  
  // State for print preview
  const [printPreviewUrl, setPrintPreviewUrl] = useState<string | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  
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

  const fetchCategories = async () => {
    try {
      const response = await categoriesApi.getAll();
      setCategories(response.data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to load categories');
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

  // Add these after the existing handleCloseProductForm function
  const handleOpenCategoryModal = () => {
    setCategoryModalOpen(true);
  };

  const handleCloseCategoryModal = () => {
    setCategoryModalOpen(false);
    setCategoryFormData({ id: '', name: '', description: '' });
  };

  const handleEditCategory = (category: any) => {
    setCategoryFormData({
      id: category._id,
      name: category.name,
      description: category.description || ''
    });
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await categoriesApi.delete(categoryId);
      setSuccessMessage('Category deleted successfully');
      fetchCategories();
    } catch (err) {
      console.error('Error deleting category:', err);
      setError('Failed to delete category');
    }
  };

  const handleSubmitCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (categoryFormData.id) {
        await categoriesApi.update(categoryFormData.id, categoryFormData);
        setSuccessMessage('Category updated successfully');
      } else {
        await categoriesApi.create(categoryFormData);
        setSuccessMessage('Category created successfully');
      }
      handleCloseCategoryModal();
      fetchCategories();
    } catch (err) {
      console.error('Error saving category:', err);
      setError('Failed to save category');
    }
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
  
  // Generate preview for printing labels
  const handleGeneratePreview = async () => {
    try {
      setPrintLoading(true);
      
      if (selectedProductIds.length === 0) {
        setError('No products selected for printing labels');
        return;
      }
      
      console.log('Sending request to preview barcodes for products:', selectedProductIds);
      
      const response = await printApi.generateBarcodes(selectedProductIds, printQuantity); // Use the API without a preview parameter
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      setPrintPreviewUrl(url);
      setShowPrintPreview(true);
      
    } catch (err: any) {
      console.error('Error generating preview:', err);
      
      if (err.response) {
        if (err.response.data instanceof Blob) {
          try {
            const text = await err.response.data.text();
            let errorMsg = 'Unknown error';
            try {
              const errorObj = JSON.parse(text);
              errorMsg = errorObj.message || 'Error generating preview';
            } catch (e) {
              errorMsg = text || 'Error generating preview';
            }
            setError(`Failed to generate preview: ${errorMsg}`);
          } catch (textErr) {
            setError(`Failed to generate preview: Server returned an error`);
          }
        } else {
          const errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
          setError(`Failed to generate preview: ${errorMessage}`);
        }
      } else if (err.request) {
        setError('Failed to generate preview: No response from server. Please check your network connection.');
      } else {
        setError(`Failed to generate preview: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setPrintLoading(false);
    }
  };
  
  // Print product labels - updated to directly show print dialog
  const handlePrintLabels = async () => {
    try {
      setPrintLoading(true);
      
      if (selectedProductIds.length === 0) {
        setError('No products selected for printing labels');
        return;
      }
      
      console.log('Sending request to generate barcodes for products:', selectedProductIds);
      
      const response = await printApi.generateBarcodes(selectedProductIds, printQuantity);
      
      // Ensure we received a PDF blob
      if (response.headers['content-type'] === 'application/pdf' || 
         (response.data instanceof Blob && response.data.type === 'application/pdf')) {
        
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        
        // Open in a new window and directly show print dialog
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
          // Wait for the PDF to load then trigger print dialog
          printWindow.onload = () => {
            setTimeout(() => {
              printWindow.print();
            }, 500);
          };
          
          setSuccessMessage(`${selectedProductIds.length} product labels sent to printer`);
        } else {
          // Fallback if popup is blocked
          alert('Please allow pop-ups to print the labels');
          
          // Create a download link as fallback
          const link = document.createElement('a');
          link.href = url;
          link.download = `product-labels-${Date.now()}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          setSuccessMessage(`${selectedProductIds.length} product labels downloaded`);
        }
        
        // Close the dialog and reset selected items
        setPrintDialogOpen(false);
        setSelectedProductIds([]);
        setPrintQuantity(1);
      } else {
        throw new Error('Received invalid response format from server');
      }
      
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
      // Clean up any URLs if necessary
      if (printPreviewUrl) {
        window.URL.revokeObjectURL(printPreviewUrl);
        setPrintPreviewUrl(null);
      }
    }
  };

  // Function to handle printing from preview
  const handlePrintFromPreview = () => {
    if (!printPreviewUrl) return;
    
    // Open in a new window for printing
    const printWindow = window.open(printPreviewUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
    } else {
      // Fallback if popup is blocked
      alert('Please allow pop-ups to print the labels');
    }
  };

  // Function to download PDF from preview
  const handleDownloadPdf = () => {
    if (!printPreviewUrl) return;
    
    // Create a download link
    const link = document.createElement('a');
    link.href = printPreviewUrl;
    link.download = `product-labels-${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Function to close the preview and clean up
  const handleClosePreview = () => {
    if (printPreviewUrl) {
      window.URL.revokeObjectURL(printPreviewUrl);
    }
    setPrintPreviewUrl(null);
    setShowPrintPreview(false);
    setSelectedProductIds([]);
    setPrintQuantity(1);
  };
  
  // Reset dialog when closing
  const handleClosePrintDialog = () => {
    setPrintDialogOpen(false);
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

  // Update downloadTemplate function
  const downloadTemplate = () => {
    const template = [
      {
        name: 'Sample Product',
        description: 'Product description',
        barcode: '', // Leave empty for auto-generation
        price: 1000,
        costPrice: 800,
        stockQuantity: 10,
        reorderLevel: 5,
        categoryName: categories.length > 0 ? categories[0].name : 'Category Name',
        supplierName: suppliers.length > 0 ? suppliers[0].name : 'Supplier Name',
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(template);

    // Add notes about categories
    const notes = [
      ['Notes:'],
      ['1. CategoryName: Use one of the following categories:'],
      ...categories.map(cat => [`   - ${cat.name}`]),
      ['2. For new products, stockQuantity is the initial stock'],
      ['3. For existing products (matching names), stockQuantity will be ADDED to current stock'],
    ];
    
    const notesWs = XLSX.utils.aoa_to_sheet(notes);

    // Add both sheets to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Products Template');
    XLSX.utils.book_append_sheet(wb, notesWs, 'Instructions');

    XLSX.writeFile(wb, 'product_import_template.xlsx');
  };

    // Function to handle file selection
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        setImportFile(files[0]);
        // Reset preview when new file is selected
        setImportPreview(false);
        setImportData([]);
      }
    };
  
    // Function to parse Excel file - improved to handle stock quantity addition
    const parseExcelFile = async () => {
      if (!importFile) return;
  
      setImportLoading(true);
      setError(null);
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          
          const worksheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[worksheetName];
          
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          if (jsonData.length === 0) {
            setError('The Excel file is empty or has no valid data');
            setImportLoading(false);
            return;
          }
          
          const requiredFields = ['name', 'price', 'stockQuantity'];
          const firstRow = jsonData[0] as any;
          
          const missingFields = requiredFields.filter(field => !(field in firstRow));
          if (missingFields.length > 0) {
            setError(`Missing required fields: ${missingFields.join(', ')}`);
            setImportLoading(false);
            return;
          }
  
          const importProductNames = jsonData.map((product: any) => product.name);
          
          if (importProductNames.length === 0) {
            setError('No valid products found in the import file');
            setImportLoading(false);
            return;
          }
          
          try {
            let existingProducts: any[] = [];
            
            try {
              console.log('Checking existing products via API for:', importProductNames.slice(0, 5), '...');
              const response = await productsApi.checkExistingProducts(importProductNames);
              existingProducts = response.data || [];
              console.log('API returned existing products:', existingProducts.length);
            } catch (apiError) {
              console.error('API error when checking existing products:', apiError);
              
              const refreshResponse = await productsApi.getAll({limit: 1000});
              const allProducts = refreshResponse.data?.products || [];
              
              const productNameMap = new Map();
              allProducts.forEach((product: any) => {
                productNameMap.set(product.name.toLowerCase(), {
                  id: product.id,
                  name: product.name,
                  stockQuantity: product.stockQuantity || 0
                });
              });
              
              existingProducts = importProductNames
                .map(name => {
                  const match = productNameMap.get(name.toLowerCase());
                  return match ? { 
                    id: match.id, 
                    name, 
                    stockQuantity: match.stockQuantity 
                  } : null;
                })
                .filter(Boolean);
              
              console.log('Found existing products from current data:', existingProducts.length);
            }
            
            // Create a mapping for quick lookup with current stock quantities
            const updateMap: Record<string, { id: number, existing: boolean, currentStock: number }> = {};
            existingProducts.forEach((product: any) => {
              if (product && product.name) {
                updateMap[product.name.toLowerCase()] = {
                  id: product.id,
                  existing: true,
                  currentStock: product.stockQuantity || 0
                };
              }
            });
            
            setProductUpdateMap(updateMap);
            
            // Enrich import data with update flags and calculate new stock quantities
            const enrichedData = jsonData.map((product: any) => {
              const normalizedName = product.name.toLowerCase();
              const existingProduct = updateMap[normalizedName];
              const isUpdate = existingProduct !== undefined;
              
              // For existing products, calculate the new total stock quantity
              let finalStockQuantity = parseInt(product.stockQuantity) || 0;
              let stockChange = 0;
              
              if (isUpdate) {
                const currentStock = existingProduct.currentStock;
                const importQuantity = parseInt(product.stockQuantity) || 0;
                finalStockQuantity = currentStock + importQuantity;
                stockChange = importQuantity;
              }
              
              return {
                ...product,
                _action: isUpdate ? 'UPDATE' : 'CREATE',
                _id: isUpdate ? existingProduct.id : null,
                _currentStock: isUpdate ? existingProduct.currentStock : 0,
                _importQuantity: parseInt(product.stockQuantity) || 0,
                _finalStock: finalStockQuantity,
                _stockChange: stockChange,
                stockQuantity: finalStockQuantity // This will be the final quantity sent to server
              };
            });
  
            setImportData(enrichedData);
            setImportPreview(true);
          } catch (error) {
            console.error('Error in product import process:', error);
            setError('Failed to process import data. Please try again or contact support.');
          } 
        } catch (error) {
          console.error('Error parsing Excel file:', error);
          setError('Failed to parse Excel file. Please make sure it\'s a valid Excel file.');
        } finally {
          setImportLoading(false);
        }
      };
      
      reader.readAsArrayBuffer(importFile);
    };
  
    // Function to submit imported data - improved to better handle updates
    const submitImportData = async () => {
      if (importData.length === 0) return;
      
      setImportLoading(true);
      
      try {
        let successCount = 0;
        let updateCount = 0;
        let failedCount = 0;
        
        // Process each product
        for (const product of importData) {
          try {
            const formDataToSend = new FormData();
            
            // Add all relevant fields to formData
            Object.keys(product).forEach(key => {
              // Skip internal fields that start with _
              if (!key.startsWith('_') && product[key] !== undefined && product[key] !== null && product[key] !== '') {
                formDataToSend.append(key, product[key].toString());
              }
            });
            
            if (product._action === 'UPDATE' && product._id) {
              console.log(`Updating existing product: ${product.name} (ID: ${product._id})`);
              await productsApi.update(product._id, formDataToSend);
              updateCount++;
            } else {
              console.log(`Creating new product: ${product.name}`);
              await productsApi.create(formDataToSend);
              successCount++;
            }
          } catch (err) {
            console.error(`Error processing product ${product.name}:`, err);
            failedCount++;
          }
        }
        
        // Show result message
        setSuccessMessage(`Import completed: ${successCount} products added, ${updateCount} updated, ${failedCount} failed`);
        
        // Close modal and refresh data
        setImportModalOpen(false);
        fetchProducts();
      } catch (err) {
        console.error('Import process error:', err);
        setError('Failed to complete the import process');
      } finally {
        setImportLoading(false);
        setImportFile(null);
        setImportData([]);
        setImportPreview(false);
        setProductUpdateMap({});
      }
    };
  

  // Reset import modal state
  const handleCloseImportModal = () => {
    setImportModalOpen(false);
    setImportFile(null);
    setImportData([]);
    setImportPreview(false);
    setProductUpdateMap({});
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
          
          <Button variant="info" onClick={handleOpenCategoryModal}>
            <>{FaPlus({ className: "me-1" })}</> Manage Categories
          </Button>
          
          <Button variant="success" onClick={() => setImportModalOpen(true)}>
            <>{FaFileExcel({ className: "me-1" })}</> Import Products
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
          <div className="table-responsive" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <Table hover className="mb-0">
              <thead className="sticky-top bg-white" style={{ zIndex: 10 }}>
                <tr>
                  <th style={{ width: '80px' }}></th>
                  <th>Name</th>                  
                  <th>Description</th>
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
                        <td>{product.description || 'No description'}</td>
                        <td>{product.category?.name || ''}</td>
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
      
      {/* Print Labels Modal - Simplified */}
      <Modal 
        show={printDialogOpen} 
        onHide={handleClosePrintDialog}
      >
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
          
          <div className="mt-4">
            <p className="text-muted">
              <small>
                When you click "Print Labels", your browser's print dialog will appear automatically.
                Make sure your label printer is selected in the print settings.
              </small>
            </p>
          </div>
        </Modal.Body>
        
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={handleClosePrintDialog}
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
                Processing...
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
                
                <Form.Group className="mb-3">
                  <Form.Label>Category</Form.Label>
                  <Form.Select
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleSelectChange}
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
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
      
      {/* Import Products Modal */}
      <Modal 
        show={importModalOpen} 
        onHide={handleCloseImportModal}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Import Products from Excel</Modal.Title>
        </Modal.Header>
        
        <Modal.Body>
          {!importPreview ? (
            <>
              <p>Upload an Excel file containing product data. The file should have the following columns:</p>
              <ul>
                <li><strong>name</strong> - Product name (required)</li>
                <li><strong>description</strong> - Product description</li>
                <li><strong>barcode</strong> - Product barcode (leave empty for auto-generation)</li>
                <li><strong>price</strong> - Selling price (required)</li>
                <li><strong>costPrice</strong> - Cost price</li>
                <li><strong>stockQuantity</strong> - For new products: initial stock. For existing products: quantity to ADD (required)</li>
                <li><strong>reorderLevel</strong> - Stock reorder level</li>
                <li><strong>categoryName</strong> - Category name</li>
                <li><strong>supplierName</strong> - Supplier name</li>
              </ul>
              
              <div className="alert alert-info">
                <strong>Note:</strong> For existing products (products with the same name), the stock quantity will be <strong>added</strong> to the current stock, not replaced.
              </div>

              <div className="d-flex justify-content-between mb-3">
                <Button 
                  variant="outline-primary" 
                  onClick={downloadTemplate}
                >
                  <>{FaFileDownload({ className: "me-1" })}</> Download Template
                </Button>
              </div>

              <Form.Group className="mb-3">
                <Form.Label>Excel File</Form.Label>
                <Form.Control
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                />
                <Form.Text className="text-muted">
                  Only Excel files (.xlsx, .xls) are accepted
                </Form.Text>
              </Form.Group>
            </>
          ) : (
            <>
              <div className="d-flex justify-content-between mb-3">
                <h5>Preview ({importData.length} products)</h5>
                <Button 
                  variant="link" 
                  onClick={() => {
                    setImportPreview(false);
                    setImportData([]);
                    setProductUpdateMap({});
                  }}
                >
                  Back to Upload
                </Button>
              </div>
              
              {/* Show summary of what will happen */}
              <div className="mb-3 p-3 bg-light rounded">
                <div className="mb-2">Import summary:</div>
                <Badge bg="success" className="me-2">
                  {importData.filter(p => p._action !== 'UPDATE').length} new products
                </Badge>
                <Badge bg="warning" text="dark" className="me-2">
                  {importData.filter(p => p._action === 'UPDATE').length} products to update
                </Badge>
                <div className="mt-2 text-muted small">
                  For existing products, the imported stock quantity will be <strong>added</strong> to the current stock.
                </div>
              </div>
              
              <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <Table hover size="sm">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Price</th>
                      <th>Stock Info</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importData.map((product, index) => (
                      <tr key={index} className={product._action === 'UPDATE' ? 'table-warning' : ''}>
                        <td>{index + 1}</td>
                        <td>{product.name}</td>
                        <td>Rs. {product.price}</td>
                        <td>
                          {product._action === 'UPDATE' ? (
                            <div>
                              <small className="text-muted">Current: {product._currentStock}</small><br/>
                              <small className="text-success">+{product._importQuantity}</small><br/>
                              <strong>Total: {product._finalStock}</strong>
                            </div>
                          ) : (
                            <span>{product.stockQuantity}</span>
                          )}
                        </td>
                        <td>
                          {product._action === 'UPDATE' ? (
                            <Badge bg="warning" text="dark">Update</Badge>
                          ) : (
                            <Badge bg="success">New</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </>
          )}
        </Modal.Body>
        
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseImportModal} disabled={importLoading}>
            Cancel
          </Button>
          
          {!importPreview ? (
            <Button 
              variant="primary" 
              onClick={parseExcelFile}
              disabled={!importFile || importLoading}
            >
              {importLoading ? (
                <>
                  <Spinner as="span" animation="border" size="sm" className="me-1" /> 
                  Parsing...
                </>
              ) : (
                <>
                  <>{FaFileUpload({ className: "me-1" })}</> Preview Import
                </>
              )}
            </Button>
          ) : (
            <Button 
              variant="success" 
              onClick={submitImportData}
              disabled={importLoading || importData.length === 0}
            >
              {importLoading ? (
                <>
                  <Spinner as="span" animation="border" size="sm" className="me-1" /> 
                  Importing...
                </>
              ) : (
                <>
                  Import {importData.length} Products
                </>
              )}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
      
      {/* Add Category Modal */}
      <Modal show={categoryModalOpen} onHide={handleCloseCategoryModal}>
        <Modal.Header closeButton>
          <Modal.Title>{categoryFormData.id ? 'Edit Category' : 'Add Category'}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form onSubmit={handleSubmitCategory}>
            <Form.Group className="mb-3">
              <Form.Label>Category Name</Form.Label>
              <Form.Control
                type="text"
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={categoryFormData.description}
                onChange={(e) => setCategoryFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </Form.Group>

            <Table responsive>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category._id}>
                    <td>{category.name}</td>
                    <td>{category.description}</td>
                    <td>
                      <Button
                        variant="link"
                        className="p-0 me-2"
                        onClick={() => handleEditCategory(category)}
                      >
                        <>{FaPencilAlt({})}</>
                      </Button>
                      <Button
                        variant="link"
                        className="p-0 text-danger"
                        onClick={() => handleDeleteCategory(category._id)}
                      >
                        <>{FaTrash({})}</>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseCategoryModal}>
            Close
          </Button>
          <Button variant="primary" onClick={handleSubmitCategory}>
            {categoryFormData.id ? 'Update' : 'Add'} Category
          </Button>
        </Modal.Footer>
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