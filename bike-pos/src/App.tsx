import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Categories from './pages/Categories';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import POS from './pages/POS';
import Products from './pages/Products';
import Reports from './pages/Reports';
import Sales from './pages/Sales';
import Suppliers from './pages/Suppliers';

// Define protected route component
const ProtectedRoute = ({ children, role }: { children: JSX.Element, role?: string }) => {
  const { user, loading } = useAuth();
  
  // If auth is still loading, show nothing
  if (loading) {
    return null;
  }
  
  // If no user logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // If role is specified and user doesn't have required role, redirect to dashboard
  if (role && user.role !== role && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  
  // Otherwise render the protected component
  return children;
};

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="pos" element={<POS />} />
                <Route path="products" element={<Products />} />
                <Route path="categories" element={<Categories />} />
                <Route path="suppliers" element={<Suppliers />} />
                <Route path="sales" element={<Sales />} />
                <Route path="reports" element={
                  <ProtectedRoute role="manager">
                    <Reports />
                  </ProtectedRoute>
                } />
              </Route>
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
