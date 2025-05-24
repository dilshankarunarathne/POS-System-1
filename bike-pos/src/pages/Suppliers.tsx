import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Email as EmailIcon,
    Phone as PhoneIcon,
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
    Grid,
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
    Typography
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { suppliersApi } from '../services/api';

interface Supplier {
  id: number;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  active: boolean;
}

interface SupplierFormData {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
}

const Suppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState<SupplierFormData>({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  });
  
  // Fetch suppliers on component mount
  useEffect(() => {
    fetchSuppliers();
  }, []);
  
  // Fetch suppliers from API
  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await suppliersApi.getAll();
      setSuppliers(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      setError('Failed to load suppliers');
      setLoading(false);
    }
  };
  
  // Open supplier dialog for adding or editing
  const handleOpenDialog = (supplier: Supplier | null = null) => {
    if (supplier) {
      setSelectedSupplier(supplier);
      setSupplierForm({
        name: supplier.name,
        contactPerson: supplier.contactPerson || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        notes: supplier.notes || '',
      });
    } else {
      setSelectedSupplier(null);
      setSupplierForm({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        notes: '',
      });
    }
    setDialogOpen(true);
  };
  
  // Close supplier dialog
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedSupplier(null);
  };
  
  // Handle form input changes
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSupplierForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Save supplier (create or update)
  const handleSaveSupplier = async () => {
    try {
      if (!supplierForm.name.trim()) {
        setError('Supplier name is required');
        return;
      }
      
      if (selectedSupplier) {
        // Update existing supplier
        await suppliersApi.update(selectedSupplier.id, supplierForm);
        setSuccessMessage('Supplier updated successfully');
      } else {
        // Create new supplier
        await suppliersApi.create(supplierForm);
        setSuccessMessage('Supplier created successfully');
      }
      
      handleCloseDialog();
      fetchSuppliers();
    } catch (err) {
      console.error('Error saving supplier:', err);
      setError('Failed to save supplier');
    }
  };
  
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDeleteDialogOpen(true);
  };
  
  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedSupplier(null);
  };
  
  // Delete supplier
  const handleDeleteSupplier = async () => {
    if (!selectedSupplier) return;
    
    try {
      await suppliersApi.delete(selectedSupplier.id);
      setSuccessMessage('Supplier deleted successfully');
      handleCloseDeleteDialog();
      fetchSuppliers();
    } catch (err) {
      console.error('Error deleting supplier:', err);
      setError('Failed to delete supplier');
    }
  };
  
  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Suppliers
        </Typography>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Supplier
        </Button>
      </Box>
      
      <Paper>
        <TableContainer>
          <Table sx={{ minWidth: 650 }} aria-label="suppliers table">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Contact Person</TableCell>
                <TableCell>Contact Info</TableCell>
                <TableCell>Address</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                    No suppliers found
                  </TableCell>
                </TableRow>
              ) : (
                suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <Typography variant="body1" fontWeight="bold">
                        {supplier.name}
                      </Typography>
                      {!supplier.active && (
                        <Chip size="small" label="Inactive" color="error" variant="outlined" sx={{ mt: 1 }} />
                      )}
                    </TableCell>
                    <TableCell>{supplier.contactPerson || '—'}</TableCell>
                    <TableCell>
                      {supplier.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <PhoneIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                          <Typography variant="body2">{supplier.phone}</Typography>
                        </Box>
                      )}
                      {supplier.email && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <EmailIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                          <Typography variant="body2">{supplier.email}</Typography>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>{supplier.address || '—'}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleOpenDialog(supplier)}
                      >
                        <EditIcon />
                      </IconButton>
                      
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleOpenDeleteDialog(supplier)}
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
      
      {/* Add/Edit Supplier Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="md">
        <DialogTitle>
          {selectedSupplier ? 'Edit Supplier' : 'Add Supplier'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  autoFocus
                  name="name"
                  label="Supplier Name"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={supplierForm.name}
                  onChange={handleFormChange}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  name="contactPerson"
                  label="Contact Person"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={supplierForm.contactPerson}
                  onChange={handleFormChange}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  name="phone"
                  label="Phone Number"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={supplierForm.phone}
                  onChange={handleFormChange}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  name="email"
                  label="Email"
                  type="email"
                  fullWidth
                  variant="outlined"
                  value={supplierForm.email}
                  onChange={handleFormChange}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  name="address"
                  label="Address"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={supplierForm.address}
                  onChange={handleFormChange}
                  multiline
                  rows={2}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  name="notes"
                  label="Notes"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={supplierForm.notes}
                  onChange={handleFormChange}
                  multiline
                  rows={3}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveSupplier} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Delete Supplier</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the supplier: <strong>{selectedSupplier?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            This may affect products associated with this supplier.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleDeleteSupplier} color="error" variant="contained">
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

export default Suppliers; 