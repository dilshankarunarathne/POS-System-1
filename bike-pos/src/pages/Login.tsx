import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import {
    Alert,
    Avatar,
    Box,
    Button,
    CircularProgress,
    Container,
    Paper,
    Snackbar,
    TextField,
    Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '70vh',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
            <LockOutlinedIcon />
          </Avatar>
          
          <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
            Bike POS Login
          </Typography>
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Demo Accounts:
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary" component="div">
                  Admin: admin / password
                </Typography>
                <Typography variant="caption" color="text.secondary" component="div">
                  Manager: manager / password
                </Typography>
                <Typography variant="caption" color="text.secondary" component="div">
                  Cashier: cashier / password
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>
      
      {/* Error Message Snackbar */}
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={() => setErrorMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setErrorMessage(null)} severity="error" sx={{ width: '100%' }}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Login; 