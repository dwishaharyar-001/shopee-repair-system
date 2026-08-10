import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LayoutProvider } from './context/LayoutContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import HeaderNav from './components/HeaderNav';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';
import Repairs from './pages/Repairs';
import QC from './pages/QC';
import Parts from './pages/Parts';
import Reports from './pages/Reports';
import BASTDocuments from './pages/BASTDocuments';
import Admin from './pages/Admin';

const MainLayout = ({ children }) => {
  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden relative">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <HeaderNav />
        <main className="flex-1 overflow-y-auto p-2.5 sm:p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <LayoutProvider>
        <BrowserRouter>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes with Main Shell Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute menuKey="dashboard">
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/devices"
            element={
              <ProtectedRoute menuKey="devices">
                <MainLayout>
                  <Devices />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/repairs"
            element={
              <ProtectedRoute menuKey="repairs" allowedRoles={['Admin', 'Coordinator', 'Technician']}>
                <MainLayout>
                  <Repairs />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/qc"
            element={
              <ProtectedRoute menuKey="qc" allowedRoles={['Admin', 'Coordinator', 'QA_Liaison']}>
                <MainLayout>
                  <QC />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/parts"
            element={
              <ProtectedRoute menuKey="parts" allowedRoles={['Admin', 'Coordinator', 'Technician']}>
                <MainLayout>
                  <Parts />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute menuKey="reports" allowedRoles={['Admin', 'Coordinator', 'QA_Liaison']}>
                <MainLayout>
                  <Reports />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/bast-documents"
            element={
              <ProtectedRoute menuKey="reports" allowedRoles={['Admin', 'Coordinator', 'QA_Liaison']}>
                <MainLayout>
                  <BASTDocuments />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute menuKey="admin" allowedRoles={['Admin', 'Coordinator']}>
                <MainLayout>
                  <Admin />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </BrowserRouter>
      </LayoutProvider>
    </AuthProvider>
  );
}

export default App;
