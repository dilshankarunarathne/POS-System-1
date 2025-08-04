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
    Row,
    Spinner,
    Table,
    Toast,
    ToastContainer
} from 'react-bootstrap';
import {
    Envelope,
    Pencil,
    PlusLg,
    Search,
    Telephone,
    Trash
} from 'react-bootstrap-icons';
import { useNotification } from '../contexts/NotificationContext';
import { suppliersApi } from '../services/api';

// Update the Supplier interface to match MongoDB model
interface Supplier {
  _id: string; // MongoDB uses _id instead of id
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
  const { showSuccess, showError } = useNotification();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  
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
  
  // Filter suppliers when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSuppliers(suppliers);
      return;
    }
    
    const filtered = suppliers.filter(supplier => 
      supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.phone.includes(searchQuery)
    );
    
    setFilteredSuppliers(filtered);
  }, [searchQuery, suppliers]);
  
  // Fetch suppliers from API
  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await suppliersApi.getAll();
      setSuppliers(response.data);
      setFilteredSuppliers(response.data);
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching suppliers:', err);
      setError(err.response?.data?.message || 'Failed to load suppliers');
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
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSupplierForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Save supplier (create or update)
  const handleSaveSupplier = async () => {
    try {
      if (!supplierForm.name.trim()) {
        showError('Supplier name is required');
        return;
      }
      
      if (selectedSupplier) {
        // Update existing supplier
        await suppliersApi.update(selectedSupplier._id, supplierForm);
        showSuccess('Supplier updated successfully');
      } else {
        // Create new supplier
        await suppliersApi.create(supplierForm);
        showSuccess('Supplier created successfully');
      }
      
      handleCloseDialog();
      fetchSuppliers();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to save supplier');
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
      await suppliersApi.delete(selectedSupplier._id);
      setSuccessMessage('Supplier deleted successfully');
      handleCloseDeleteDialog();
      fetchSuppliers();
    } catch (err: any) {
      console.error('Error deleting supplier:', err);
      setError(err.response?.data?.message || 'Failed to delete supplier');
    }
  };
  
  // Render supplier card for mobile view
  const renderSupplierCard = (supplier: Supplier) => {
    return (
      <Card className="mb-3 shadow-sm" key={supplier._id}>
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start mb-2">
            <div>
              <h5 className="mb-1">{supplier.name}</h5>
              {supplier.contactPerson && (
                <p className="text-muted mb-1 small">Contact: {supplier.contactPerson}</p>
              )}
            </div>
            {!supplier.active && (
              <Badge bg="danger" text="white">Inactive</Badge>
            )}
          </div>
          
          <Row className="g-2 mb-3">
            {supplier.phone && (
              <Col xs={12}>
                <div className="d-flex align-items-center">
                  <Telephone className="me-2" size={14} />
                  <a href={`tel:${supplier.phone}`} className="text-decoration-none">
                    {supplier.phone}
                  </a>
                </div>
              </Col>
            )}
            
            {supplier.email && (
              <Col xs={12}>
                <div className="d-flex align-items-center">
                  <Envelope className="me-2" size={14} />
                  <a href={`mailto:${supplier.email}`} className="text-decoration-none text-truncate">
                    {supplier.email}
                  </a>
                </div>
              </Col>
            )}
            
            {supplier.address && (
              <Col xs={12}>
                <div className="small text-muted mt-1">
                  {supplier.address}
                </div>
              </Col>
            )}
          </Row>
          
          <div className="d-flex justify-content-end">
            <Button 
              variant="outline-primary" 
              size="sm" 
              className="me-2"
              onClick={() => handleOpenDialog(supplier)}
            >
              <Pencil size={16} /> Edit
            </Button>
            <Button 
              variant="outline-danger" 
              size="sm"
              onClick={() => handleOpenDeleteDialog(supplier)}
            >
              <Trash size={16} /> Delete
            </Button>
          </div>
        </Card.Body>
      </Card>
    );
  };
  
  return (
    <Container fluid className="px-4">
      <Row className="mb-4 align-items-center">
        <Col>
          <h2 className="mb-0">Suppliers</h2>
          <p className="text-muted mb-0">Manage your product suppliers</p>
        </Col>
        <Col xs="auto">
          <Button 
            variant="primary" 
            className="d-flex align-items-center" 
            onClick={() => handleOpenDialog()}
          >
            <PlusLg className="me-2" /> Add Supplier
          </Button>
        </Col>
      </Row>
      
      {/* Search Bar */}
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Row>
            <Col md={6} lg={4}>
              <InputGroup>
                <InputGroup.Text className="bg-light">
                  <Search size={16} />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Search suppliers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <Button 
                    variant="outline-secondary" 
                    onClick={() => setSearchQuery('')}
                  >
                    Clear
                  </Button>
                )}
              </InputGroup>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      
      {/* Mobile View - Card Layout */}
      <div className="d-md-none">
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <Card className="text-center p-4 shadow-sm">
            <Card.Body className="p-5">
              <p className="mb-0">No suppliers found</p>
            </Card.Body>
          </Card>
        ) : (
          filteredSuppliers.map(renderSupplierCard)
        )}
      </div>
      
      {/* Desktop View - Table Layout */}
      <div className="d-none d-md-block">
        <Card className="shadow-sm">
          <Card.Body className="p-0">
            <div className="table-responsive">
              <Table hover className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th className="border-0">Name</th>
                    <th className="border-0">Contact Person</th>
                    <th className="border-0">Contact Info</th>
                    <th className="border-0">Address</th>
                    <th className="border-0 text-end">Actions</th>
                  </tr>
                </thead>
                
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-5">
                        <Spinner animation="border" variant="primary" />
                      </td>
                    </tr>
                  ) : filteredSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-5">
                        <p className="mb-0 text-muted">No suppliers found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredSuppliers.map((supplier) => (
                      <tr key={supplier._id}>
                        <td className="ps-3">
                          <div className="fw-medium">{supplier.name}</div>
                          {!supplier.active && (
                            <Badge bg="danger" text="white" pill className="mt-1">Inactive</Badge>
                          )}
                        </td>
                        <td>{supplier.contactPerson || '—'}</td>
                        <td>
                          {supplier.phone && (
                            <div className="d-flex align-items-center mb-1">
                              <Telephone className="me-1" size={14} />
                              <a href={`tel:${supplier.phone}`} className="text-decoration-none">
                                {supplier.phone}
                              </a>
                            </div>
                          )}
                          {supplier.email && (
                            <div className="d-flex align-items-center">
                              <Envelope className="me-1" size={14} />
                              <a href={`mailto:${supplier.email}`} className="text-decoration-none">
                                {supplier.email}
                              </a>
                            </div>
                          )}
                          {!supplier.phone && !supplier.email && '—'}
                        </td>
                        <td>
                          <div className="text-truncate" style={{ maxWidth: '200px' }}>
                            {supplier.address || '—'}
                          </div>
                        </td>
                        <td className="text-end pe-3">
                          <Button 
                            variant="outline-primary" 
                            size="sm" 
                            className="me-2"
                            onClick={() => handleOpenDialog(supplier)}
                          >
                            <Pencil size={14} className="me-1" /> Edit
                          </Button>
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => handleOpenDeleteDialog(supplier)}
                          >
                            <Trash size={14} className="me-1" /> Delete
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      </div>
      
      {/* Add/Edit Supplier Modal */}
      <Modal 
        show={dialogOpen} 
        onHide={handleCloseDialog} 
        size="lg"
        centered
        backdrop="static"
      >
        <Modal.Header closeButton className="border-bottom-0 pb-0">
          <Modal.Title>
            {selectedSupplier ? 'Edit Supplier' : 'Add Supplier'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-0">
          <hr className="mt-0 mb-4" />
          <Form>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group controlId="supplierName" className="mb-3">
                  <Form.Label>Supplier Name <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={supplierForm.name}
                    onChange={handleFormChange}
                    required
                    placeholder="Enter supplier name"
                    autoFocus
                    className="border-primary"
                  />
                  <Form.Text className="text-muted">
                    Company or business name
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="contactPerson" className="mb-3">
                  <Form.Label>Contact Person</Form.Label>
                  <Form.Control
                    type="text"
                    name="contactPerson"
                    value={supplierForm.contactPerson}
                    onChange={handleFormChange}
                    placeholder="Primary contact name"
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group controlId="email" className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <InputGroup>
                    <InputGroup.Text><Envelope size={16} /></InputGroup.Text>
                    <Form.Control
                      type="email"
                      name="email"
                      value={supplierForm.email}
                      onChange={handleFormChange}
                      placeholder="Email address"
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="phone" className="mb-3">
                  <Form.Label>Phone</Form.Label>
                  <InputGroup>
                    <InputGroup.Text><Telephone size={16} /></InputGroup.Text>
                    <Form.Control
                      type="tel"
                      name="phone"
                      value={supplierForm.phone}
                      onChange={handleFormChange}
                      placeholder="Phone number"
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3" controlId="address">
              <Form.Label>Address</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="address"
                value={supplierForm.address}
                onChange={handleFormChange}
                placeholder="Business address"
              />
            </Form.Group>
            
            <Form.Group controlId="notes">
              <Form.Label>Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="notes"
                value={supplierForm.notes}
                onChange={handleFormChange}
                placeholder="Additional information about this supplier"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="border-top-0 pt-0">
          <hr className="w-100 mb-3" />
          <Button 
            variant="outline-secondary" 
            onClick={handleCloseDialog}
            className="px-4"
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSaveSupplier}
            className="px-4"
          >
            {selectedSupplier ? 'Update Supplier' : 'Add Supplier'}
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal 
        show={deleteDialogOpen} 
        onHide={handleCloseDeleteDialog}
        centered
      >
        <Modal.Header closeButton className="border-bottom-0">
          <Modal.Title>Delete Supplier</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <div className="d-flex justify-content-center mb-3">
            <div className="bg-danger bg-opacity-10 p-3 rounded-circle">
              <Trash size={28} className="text-danger" />
            </div>
          </div>
          <h5>Are you sure?</h5>
          <p>You are about to delete <strong>{selectedSupplier?.name}</strong></p>
          <p className="text-danger small">This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer className="border-top-0">
          <Button 
            variant="outline-secondary" 
            onClick={handleCloseDeleteDialog}
            className="px-4"
          >
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handleDeleteSupplier}
            className="px-4"
          >
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

export default Suppliers;