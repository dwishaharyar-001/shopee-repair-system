import axios from 'axios';

const getBaseURL = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://127.0.0.1:3000/api';
    }
  }
  return '/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor Request: Sisipkan Bearer token JWT jika ada di localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('arisa_repair_token') || localStorage.getItem('shopee_repair_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers['bypass-tunnel-reminder'] = 'true';
    config.headers['ngrok-skip-browser-warning'] = 'true';
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor Response: Handle error 401 & 502/503 network gateway errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('arisa_repair_token');
      localStorage.removeItem('arisa_repair_user');
      localStorage.removeItem('shopee_repair_token');
      localStorage.removeItem('shopee_repair_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } else if (!error.response || (error.response.status >= 500 && error.response.status <= 504)) {
      if (!error.response?.data?.message) {
        if (!error.response) {
          error.message = 'Gagal terhubung ke jaringan server. Silakan periksa koneksi internet Anda.';
        } else {
          error.message = 'Server backend sedang dalam pemulihan otomatis. Silakan coba kembali dalam beberapa detik.';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
