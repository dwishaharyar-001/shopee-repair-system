import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('arisa_repair_user') || localStorage.getItem('shopee_repair_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('arisa_repair_token') || localStorage.getItem('shopee_repair_token') || null;
  });

  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = async () => {
    try {
      const res = await api.get('/menu/my-permissions');
      if (res.data && res.data.success) {
        const allowed = Array.isArray(res.data.data) 
          ? res.data.data 
          : (res.data.data?.menu_permissions || res.data.data?.allowedMenus || []);
        setPermissions(allowed);
      }
    } catch (err) {
      console.error('Failed to fetch user menu permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchPermissions();
    } else {
      setPermissions([]);
      setLoading(false);
    }
  }, [token]);

  const login = async (username, password) => {
    try {
      const res = await api.post('/auth/login', { username, password });
      if (res.data && res.data.success) {
        const { token: newToken, user: userData } = res.data.data;
        setToken(newToken);
        setUser(userData);
        localStorage.setItem('arisa_repair_token', newToken);
        localStorage.setItem('arisa_repair_user', JSON.stringify(userData));
        return { success: true };
      } else {
        return { success: false, message: res.data?.message || 'Login gagal.' };
      }
    } catch (err) {
      return { 
        success: false, 
        message: err.response?.data?.message || 'Gagal terhubung ke server.' 
      };
    }
  };

  const updateUserData = (userData, newToken = null) => {
    setUser(userData);
    if (newToken) {
      setToken(newToken);
      localStorage.setItem('arisa_repair_token', newToken);
    }
    localStorage.setItem('arisa_repair_user', JSON.stringify(userData));
  };

  const logout = () => {
    localStorage.removeItem('arisa_repair_token');
    localStorage.removeItem('arisa_repair_user');
    localStorage.removeItem('shopee_repair_token');
    localStorage.removeItem('shopee_repair_user');
    setToken(null);
    setUser(null);
    setPermissions([]);
  };

  const refreshPermissions = async () => {
    await fetchPermissions();
  };

  return (
    <AuthContext.Provider value={{ user, token, permissions, loading, login, logout, refreshPermissions }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider');
  }
  return context;
};
