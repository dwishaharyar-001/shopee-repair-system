import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
    'bypass-tunnel-reminder': 'true',
    'ngrok-skip-browser-warning': 'true'
  }
});

// Interceptor Request: Sisipkan Bearer token JWT jika ada di localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('shopee_repair_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers['bypass-tunnel-reminder'] = 'true';
    config.headers['ngrok-skip-browser-warning'] = 'true';
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor Response: Handle error 401 (token expired/invalid)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Hapus token dan redirect ke login jika sesi hangus
      localStorage.removeItem('shopee_repair_token');
      localStorage.removeItem('shopee_repair_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
