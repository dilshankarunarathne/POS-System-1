import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Paper,
    Snackbar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
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
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Categories
        </Typography>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Category
        </Button>
      </Box>
      
      <Paper>
        <TableContainer>
          <Table sx={{ minWidth: 650 }} aria-label="categories table">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Products</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                    No categories found
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>{category.name}</TableCell>
                    <TableCell>{category.description || '—'}</TableCell>
                    <TableCell>
                      {/* We could add product count here if the API supports it */}
                      —
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleOpenDialog(category)}
                      >
                        <EditIcon />
                      </IconButton>
                      
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleOpenDeleteDialog(category)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      
      {/* Add/Edit Category Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>
          {selectedCategory ? 'Edit Category' : 'Add Category'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ pt: 1 }}>
            <TextField
              autoFocus
              margin="dense"
              name="name"
              label="Category Name"
              type="text"
              fullWidth
              variant="outlined"
              value={categoryForm.name}
              onChange={handleFormChange}
              required
            />
            
            <TextField
              margin="dense"
              name="description"
              label="Description"
              type="text"
              fullWidth
              variant="outlined"
              value={categoryForm.description}
              onChange={handleFormChange}
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveCategory} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Delete Category</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the category: <strong>{selectedCategory?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            This may affect products assigned to this category.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleDeleteCategory} color="error" variant="contained">
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

export default Categories; 