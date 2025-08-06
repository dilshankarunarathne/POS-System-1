import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Container,
  Form,
  InputGroup,
  Row,
  Spinner
} from 'react-bootstrap';
import { CashStack, Eye, EyeSlash } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import '../styles/Login.css'; // We'll create this CSS file for additional styling

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, user, error } = useAuth();
  const { showError, showSuccess } = useNotification();
  const navigate = useNavigate();
  const shownErrorRef = useRef<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      showSuccess('Login successful!');
      // Check role and navigate accordingly
      if (user.role === 'developer') {
        navigate('/developer/dashboard');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate, showSuccess]);

  // Set error message from auth context - fix recursive issue
  useEffect(() => {
    if (error && error !== shownErrorRef.current) {
      showError(error);
      shownErrorRef.current = error;
    } else if (!error) {
      // Clear the error when auth context clears it
      shownErrorRef.current = null;
    }
  }, [error, showError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      const errorMsg = 'Please enter both username and password';
      if (errorMsg !== shownErrorRef.current) {
        showError(errorMsg);
        shownErrorRef.current = errorMsg;
      }
      return;
    }

    try {
      setLoading(true);
      shownErrorRef.current = null; // Reset error tracking

      await login(username, password);

    } catch (err) {
      // Error is handled in auth context and passed via the error state
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="login-page">
      <div className="login-background"></div>
      <Container className="d-flex align-items-center justify-content-center min-vh-100">
        <Row className="justify-content-center w-100">
          <Col xs={12} md={12} lg={10} xl={8}>
            <Card className="login-card border-0">
              <Card.Body className="p-0">
                <Row className="g-0">
                  <Col md={6} className="login-brand-section d-none d-md-flex">
                    <div className="p-4 p-lg-5 h-100 d-flex flex-column justify-content-between">
                      <div className="logo-area text-white">
                        <CashStack size={40} className="mb-3" />
                        <h2 className="brand-name">POS System</h2>
                        <p className="brand-tagline">Streamline your business operations</p>
                      </div>
                      <div className="testimonial text-white-50">
                        <p className="mb-0 fst-italic">"Efficiently manage sales, inventory, and customer data with our comprehensive POS solution."</p>
                      </div>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="login-form-section p-4 p-lg-5">
                      <div className="text-center mb-4 d-md-none">
                        <CashStack size={36} className="text-primary mb-2" />
                        <h2 className="fw-bold">POS System</h2>
                      </div>

                      <h3 className="fw-bold mb-4">Welcome Back!</h3>

                      

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
                          <InputGroup>
                            <Form.Control
                              className="login-input"
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter your password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              disabled={loading}
                              required
                            />
                            <Button
                              variant="outline-secondary"
                              onClick={togglePasswordVisibility}
                              disabled={loading}
                              className="border-start-0"
                              type="button"
                            >
                              {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                            </Button>
                          </InputGroup>
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