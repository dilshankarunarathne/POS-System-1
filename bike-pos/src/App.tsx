import 'bootstrap/dist/css/bootstrap.min.css';
import React from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import './App.css';
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
const ProtectedRoute = ({ children, role }: { children: React.ReactElement, role?: string }) => {
  const { user, loading } = useAuth();
  
  // If auth is still loading, show a loading indicator instead of redirecting
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
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

function App() {
  return (
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
            {/* <Route path="categories" element={<Categories />} />
            <Route path="suppliers" element={<Suppliers />} /> */}
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
  );
}

export default App;
