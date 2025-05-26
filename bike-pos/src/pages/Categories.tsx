import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Container,
  Form,
  Modal,
  Row,
  Spinner,
  Table,
  Toast,
  ToastContainer
} from 'react-bootstrap';
import {
  PlusLg as AddIcon,
  Trash as DeleteIcon,
  PencilSquare as EditIcon
} from 'react-bootstrap-icons';
import { categoriesApi } from '../services/api';

interface Category {
  id: number;
  name: string;
  description: string;
  active: boolean;
}

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  
  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);
  
  // Fetch categories from API
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await categoriesApi.getAll();
      setCategories(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to load categories');
      setLoading(false);
    }
  };
  
  // Open category dialog for adding or editing
  const handleOpenDialog = (category: Category | null = null) => {
    if (category) {
      setSelectedCategory(category);
      setCategoryForm({
        name: category.name,
        description: category.description || '',
      });
    } else {
      setSelectedCategory(null);
      setCategoryForm({ name: '', description: '' });
    }
    setDialogOpen(true);
  };
  
  // Close category dialog
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedCategory(null);
    setCategoryForm({ name: '', description: '' });
  };
  
  // Handle form input changes
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCategoryForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Save category (create or update)
  const handleSaveCategory = async () => {
    try {
      if (!categoryForm.name.trim()) {
        setError('Category name is required');
        return;
      }
      
      if (selectedCategory) {
        // Update existing category
        await categoriesApi.update(selectedCategory.id, categoryForm);
        setSuccessMessage('Category updated successfully');
      } else {
        // Create new category
        await categoriesApi.create(categoryForm);
        setSuccessMessage('Category created successfully');
      }
      
      handleCloseDialog();
      fetchCategories();
    } catch (err) {
      console.error('Error saving category:', err);
      setError('Failed to save category');
    }
  };
  
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (category: Category) => {
    setSelectedCategory(category);
    setDeleteDialogOpen(true);
  };
  
  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedCategory(null);
  };
  
  // Delete category
  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;
    
    try {
      await categoriesApi.delete(selectedCategory.id);
      setSuccessMessage('Category deleted successfully');
      handleCloseDeleteDialog();
      fetchCategories();
    } catch (err) {
      console.error('Error deleting category:', err);
      setError('Failed to delete category');
    }
  };
  
  return (
    <Container fluid>
      <Row className="mb-4 align-items-center">
        <Col>
          <h4 className="mb-0">Categories</h4>
        </Col>
        <Col xs="auto">
          <Button 
            variant="primary" 
            className="d-flex align-items-center" 
            onClick={() => handleOpenDialog()}
          >
            <AddIcon className="me-2" /> Add Category
          </Button>
        </Col>
      </Row>
      
      <Card className="shadow-sm">
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0">
            <thead className="table-light">
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Products</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-4">
                    <Spinner animation="border" variant="primary" />
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-4">
                    No categories found
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr key={category.id}>
                    <td>{category.name}</td>
                    <td>{category.description || '—'}</td>
                    <td>—</td>
                    <td>
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        className="me-2"
                        onClick={() => handleOpenDialog(category)}
                      >
                        <EditIcon size={16} />
                      </Button>
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => handleOpenDeleteDialog(category)}
                      >
                        <DeleteIcon size={16} />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
      
      {/* Add/Edit Category Modal */}
      <Modal show={dialogOpen} onHide={handleCloseDialog}>
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedCategory ? 'Edit Category' : 'Add Category'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group controlId="categoryName" className="mb-3">
              <Form.Label>Category Name <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                required
              />
            </Form.Group>
            
            <Form.Group controlId="categoryDescription">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDialog}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveCategory}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal show={deleteDialogOpen} onHide={handleCloseDeleteDialog}>
        <Modal.Header closeButton>
          <Modal.Title>Delete Category</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete the category: <strong>{selectedCategory?.name}</strong>?</p>
          <p className="text-danger">This may affect products assigned to this category.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDeleteDialog}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteCategory}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Toast notifications */}
      <ToastContainer position="bottom-end" className="p-3">
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
            delay={3000} 
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

export default Categories;