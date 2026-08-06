import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles, menuKey }) => {
  const { user, permissions, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium">Memuat Sesi Shopee Asset Repair System...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check dynamic menuKey permission if menuKey is provided
  if (menuKey && permissions && permissions.length > 0) {
    if (!permissions.includes(menuKey)) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100 p-6">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-red-100 p-6 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
              !
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Akses Ditolak</h2>
            <p className="text-slate-600 text-sm mb-6">
              Peran Anda (<span className="font-semibold text-slate-800">{user.role}</span>) tidak memiliki izin untuk mengakses fitur menu ini.
            </p>
            <a
              href="/"
              className="inline-flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg text-sm transition-colors"
            >
              Kembali ke Dashboard
            </a>
          </div>
        </div>
      );
    }
  } else if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Fallback role check
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100 p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-red-100 p-6 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
            !
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Akses Ditolak</h2>
          <p className="text-slate-600 text-sm mb-6">
            Peran Anda (<span className="font-semibold text-slate-800">{user.role}</span>) tidak memiliki hak akses untuk membuka halaman ini.
          </p>
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg text-sm transition-colors"
          >
            Kembali ke Dashboard
          </a>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
