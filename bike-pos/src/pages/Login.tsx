import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Container,
  Form,
  Row,
  Spinner
} from 'react-bootstrap';
import { Bicycle } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Login.css'; // We'll create this CSS file for additional styling

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const { login, user, error } = useAuth();
  const navigate = useNavigate();
  
  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);
  
  // Set error message from auth context
  useEffect(() => {
    if (error) {
      setErrorMessage(error);
    }
  }, [error]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Please enter both username and password');
      return;
    }
    
    try {
      setLoading(true);
      setErrorMessage(null);
      
      await login(username, password);
      
      // Navigate to dashboard on successful login
      navigate('/dashboard');
      
    } catch (err) {
      // Error is handled in auth context and passed via the error state
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="login-page">
      <div className="login-background"></div>
      <Container className="d-flex align-items-center justify-content-center min-vh-100">
        <Row className="justify-content-center w-100">
          <Col xs={12} md={10} lg={8} xl={6}>
            <Card className="login-card border-0">
              <Card.Body className="p-0">
                <Row className="g-0">
                  <Col md={5} className="login-brand-section d-none d-md-flex">
                    <div className="p-4 p-lg-5 h-100 d-flex flex-column justify-content-between">
                      <div className="logo-area text-white">
                        <Bicycle size={40} className="mb-3" />
                        <h2 className="brand-name">Bike POS</h2>
                        <p className="brand-tagline">Manage your bike shop with ease</p>
                      </div>
                      <div className="testimonial text-white-50">
                        <p className="mb-0 fst-italic">"Streamline your operations and boost sales with our comprehensive solution."</p>
                      </div>
                    </div>
                  </Col>
                  <Col md={7}>
                    <div className="login-form-section p-4 p-lg-5">
                      <div className="text-center mb-4 d-md-none">
                        <Bicycle size={36} className="text-primary mb-2" />
                        <h2 className="fw-bold">Bike POS</h2>
                      </div>
                      
                      <h3 className="fw-bold mb-4">Welcome Back!</h3>
                      
                      {errorMessage && (
                        <Alert variant="danger" className="mb-4 login-alert">
                          {errorMessage}
                        </Alert>
                      )}
                      
                      <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3" controlId="username">
                          <Form.Label className="fw-medium">Username</Form.Label>
                          <Form.Control
                            className="login-input"
                            type="text"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={loading}
                            required
                          />
                        </Form.Group>
                        
                        <Form.Group className="mb-4" controlId="password">
                          <Form.Label className="fw-medium">Password</Form.Label>
                          <Form.Control
                            className="login-input"
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            required
                          />
                        </Form.Group>
                        
                        <Button 
                          variant="primary" 
                          type="submit" 
                          className="w-100 py-2 login-button" 
                          disabled={loading}
                        >
                          {loading ? <Spinner animation="border" size="sm" /> : 'Sign In'}
                        </Button>
                      </Form>
                      
                      <div className="mt-4 demo-accounts">
                        <p className="text-muted small fw-medium">Demo Accounts:</p>
                        <div className="demo-grid">
                          <div className="demo-account">
                            <span className="demo-role">Admin</span>
                            <span className="demo-credentials">admin / password</span>
                          </div>
                          <div className="demo-account">
                            <span className="demo-role">Manager</span>
                            <span className="demo-credentials">manager / password</span>
                          </div>
                          <div className="demo-account">
                            <span className="demo-role">Cashier</span>
                            <span className="demo-credentials">cashier / password</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Login;