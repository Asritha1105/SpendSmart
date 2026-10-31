
import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const saveUser = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Fetch latest user settings from backend
        const res = await api.get('/auth/me');
        saveUser(res.data.user);
      } catch (error) {
        console.error('Auth initialization error:', error);

        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', {
      email,
      password
    });

    localStorage.setItem('token', res.data.token);
    saveUser(res.data.user);

    return res.data;
  };

  const register = async (name, email, password, preferences = {}) => {
    const res = await api.post('/auth/register', {
      name,
      email,
      password,
      country: preferences.country || 'IN',
      currency: preferences.currency || 'INR',
      locale: preferences.locale || 'en-IN'
    });

    localStorage.setItem('token', res.data.token);
    saveUser(res.data.user);

    return res.data;
  };

  // Update user details globally after Settings changes
  const updateUser = (updatedData) => {
    if (!user) return;

    const updatedUser = {
      ...user,
      ...updatedData
    };

    saveUser(updatedUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    setUser(null);
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        updateUser,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return ctx;
}
