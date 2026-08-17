import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('shopee_repair_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('shopee_repair_token') || null;
  });

  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = async () => {
    try {
      const res = await api.get('/menu/my-permissions');
      if (res.data && res.data.success) {
        const allowed = Array.isArray(res.data.data) ? res.data.data : (res.data.data.allowedMenus || []);
        setPermissions(allowed);
      }
    } catch (err) {
      console.error('Gagal mengambil permission menu:', err);
    }
  };

  useEffect(() => {
    const verifySession = async () => {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.data && res.data.success) {
            setUser(res.data.data);
            localStorage.setItem('shopee_repair_user', JSON.stringify(res.data.data));
            await fetchPermissions();
          }
        } catch (err) {
          console.error('Verifikasi sesi gagal:', err);
          logout();
        }
      }
      setLoading(false);
    };

    verifySession();
  }, [token]);

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      if (response.data && response.data.success) {
        const { token: newToken, user: userData } = response.data.data;
        
        localStorage.setItem('shopee_repair_token', newToken);
        localStorage.setItem('shopee_repair_user', JSON.stringify(userData));
        
        setToken(newToken);
        setUser(userData);
        await fetchPermissions();
        return { success: true, message: response.data.message };
      }
      return { success: false, message: response.data.message || 'Login gagal.' };
    } catch (error) {
      const msg = error.response?.data?.message || 'Gagal menghubungkan ke server autentikasi.';
      return { success: false, message: msg };
    }
  };

  const logout = () => {
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
