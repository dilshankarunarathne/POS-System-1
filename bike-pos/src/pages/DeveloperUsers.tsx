import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Container,
  Form,
  Modal,
  Row,
  Table
} from 'react-bootstrap';
import { PencilSquare, Plus, Trash } from 'react-bootstrap-icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface Shop {
  _id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  active: boolean;
  createdAt: string;
}

interface User {
  _id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  shop?: Shop;
  shopId?: Shop | string; // Add this to handle both direct shopId or populated shopId object
  active: boolean;
}

const DeveloperUsers: React.FC = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Modal states
  const [showShopModal, setShowShopModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form states
  const [shopForm, setShopForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: ''
  });
  const [userForm, setUserForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'cashier',
    shopId: ''
  });

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [shopsRes, usersRes] = await Promise.all([
        api.get('/shops'),
        api.get('/users')
      ]);
      setShops(shopsRes.data);
      setUsers(usersRes.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Shop handlers
  const handleShopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingShop) {
        await api.put(`/shops/${editingShop._id}`, shopForm);
      } else {
        await api.post('/shops', shopForm);
      }
      setShowShopModal(false);
      setShopForm({
        name: '',
        address: '',
        phone: '',
        email: ''
      });
      setEditingShop(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error saving shop');
    }
  };

  const handleEditShop = (shop: Shop) => {
    setEditingShop(shop);
    setShopForm({
      name: shop.name,
      address: shop.address || '',
      phone: shop.phone || '',
      email: shop.email || ''
    });
    setShowShopModal(true);
  };

  const handleDeleteShop = async (shopId: string) => {
    if (!window.confirm('Are you sure you want to delete this shop?')) return;
    try {
      await api.delete(`/shops/${shopId}`);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error deleting shop');
    }
  };

  // User handlers
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser._id}`, userForm);
      } else {
        await api.post('/users', userForm);
      }
      setShowUserModal(false);
      setUserForm({
        name: '',
        username: '',
        email: '',
        password: '',
        role: 'cashier',
        shopId: ''
      });
      setEditingUser(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error saving user');
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserForm({
      name: user.name,
      username: user.username,
      email: user.email,
      password: '', // Don't set password when editing
      role: user.role,
      shopId: user.shop?._id || 
            (user.shopId && typeof user.shopId !== 'string' ? user.shopId._id : 
             (typeof user.shopId === 'string' ? user.shopId : ''))
    });
    setShowUserModal(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/users/${userId}`);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error deleting user');
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <Container fluid className="py-3">
      <h1 className="h3 mb-4">User Management</h1>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Shops Section */}
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Shops</h5>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingShop(null);
              setShopForm({
                name: '',
                address: '',
                phone: '',
                email: ''
              });
              setShowShopModal(true);
            }}
          >
            <Plus size={20} className="me-1" /> Add Shop
          </Button>
        </Card.Header>
        <Card.Body>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Name</th>
                <th>Address</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shops.map(shop => (
                <tr key={shop._id}>
                  <td>{shop.name}</td>
                  <td>{shop.address || '-'}</td>
                  <td>
                    {shop.phone && <div>📞 {shop.phone}</div>}
                    {shop.email && <div>✉️ {shop.email}</div>}
                    {!shop.phone && !shop.email && '-'}
                  </td>
                  <td>
                    <span className={`badge bg-${shop.active ? 'success' : 'danger'}`}>
                      {shop.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{new Date(shop.createdAt).toLocaleDateString()}</td>
                  <td>
                    <Button
                      variant="link"
                      className="p-0 me-2"
                      onClick={() => handleEditShop(shop)}
                    >
                      <PencilSquare size={18} />
                    </Button>
                    <Button
                      variant="link"
                      className="p-0 text-danger"
                      onClick={() => handleDeleteShop(shop._id)}
                    >
                      <Trash size={18} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Users Section */}
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Users</h5>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingUser(null);
              setUserForm({
                name: '',
                username: '',
                email: '',
                password: '',
                role: 'cashier',
                shopId: ''
              });
              setShowUserModal(true);
            }}
          >
            <Plus size={20} className="me-1" /> Add User
          </Button>
        </Card.Header>
        <Card.Body>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Shop</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user._id}>
                  <td>{user.name}</td>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className="text-capitalize">{user.role}</span>
                  </td>
                  <td>
                    {/* Handle both possible shop reference formats */}
                    {user.shop?.name || 
                    (user.shopId && typeof user.shopId !== 'string' ? user.shopId.name : '-')}
                  </td>
                  <td>
                    <span className={`badge bg-${user.active ? 'success' : 'danger'}`}>
                      {user.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <Button
                      variant="link"
                      className="p-0 me-2"
                      onClick={() => handleEditUser(user)}
                    >
                      <PencilSquare size={18} />
                    </Button>
                    <Button
                      variant="link"
                      className="p-0 text-danger"
                      onClick={() => handleDeleteUser(user._id)}
                    >
                      <Trash size={18} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Shop Modal */}
      <Modal show={showShopModal} onHide={() => setShowShopModal(false)}>
        <Form onSubmit={handleShopSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>{editingShop ? 'Edit Shop' : 'Add Shop'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Shop Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter shop name"
                value={shopForm.name}
                onChange={e => setShopForm({ ...shopForm, name: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Address</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter shop address"
                value={shopForm.address}
                onChange={e => setShopForm({ ...shopForm, address: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Phone</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter shop phone"
                value={shopForm.phone}
                onChange={e => setShopForm({ ...shopForm, phone: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                placeholder="Enter shop email"
                value={shopForm.email}
                onChange={e => setShopForm({ ...shopForm, email: e.target.value })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowShopModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingShop ? 'Update' : 'Create'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* User Modal */}
      <Modal show={showUserModal} onHide={() => setShowUserModal(false)}>
        <Form onSubmit={handleUserSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>{editingUser ? 'Edit User' : 'Add User'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row>
              <Col xs={12} className="mb-3">
                <Form.Group>
                  <Form.Label>Name</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter name"
                    value={userForm.name}
                    onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Username</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter username"
                    value={userForm.username}
                    onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="Enter email"
                    value={userForm.email}
                    onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Password {editingUser && '(leave blank to keep current)'}</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Enter password"
                    value={userForm.password}
                    onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                    required={!editingUser}
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Role</Form.Label>
                  <Form.Select
                    value={userForm.role}
                    onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                    required
                  >
                    <option value="cashier">Cashier</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                    <option value="developer">Developer</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} className="mb-3">
                <Form.Group>
                  <Form.Label>Shop</Form.Label>
                  <Form.Select
                    value={userForm.shopId}
                    onChange={e => setUserForm({ ...userForm, shopId: e.target.value })}
                  >
                    <option value="">Select a shop</option>
                    {shops.map(shop => (
                      <option key={shop._id} value={shop._id}>
                        {shop.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowUserModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingUser ? 'Update' : 'Create'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default DeveloperUsers;