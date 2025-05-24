import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../services/api';

// User type
interface User {
  id: number;
  username: string;
  name: string;
  role: 'admin' | 'manager' | 'cashier';
}

// Auth context type
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      
      if (storedUser && token) {
        try {
          // First try to parse the stored user
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser); // Set user immediately from localStorage
          
          // Then validate token is still valid by fetching profile
          // Use a timeout to prevent immediate logout if network is slow
          setTimeout(async () => {
            try {
              const response = await authApi.getProfile();
              // Update user data with fresh data from server
              setUser(response.data.user);
            } catch (err) {
              console.warn('Token validation failed, but keeping session active:', err);
              // We don't log out here to prevent refresh issues
              // The API requests will eventually fail if token is truly invalid
            }
          }, 1000);
        } catch (err) {
          console.error('Error parsing stored user data:', err);
          // Clear invalid user data
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      }
      
      setLoading(false);
    };
    
    initAuth();
  }, []);

  // Login function
  const login = async (username: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authApi.login({ username, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      setUser(user);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Failed to login. Please check your credentials.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;