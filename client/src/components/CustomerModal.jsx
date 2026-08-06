import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, Phone, Mail, User, CheckCircle2, AlertCircle, RefreshCw, Search } from 'lucide-react';
import { deviceService } from '../services/deviceService';

const CustomerModal = ({ isOpen, onClose }) => {
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Form State
  const [formData, setFormData] = useState({ name: '', phone: '', contact_email: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
    }
  }, [isOpen]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await deviceService.getCustomers();
      if (res.success) {
        setCustomers(res.data);
      }
    } catch (err) {
      console.error('Fetch customers error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || formData.name.trim() === '') {
      setError('Nama customer/klien wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await deviceService.createCustomer(formData);
      if (res.success) {
        setToastMessage(res.message);
        setTimeout(() => setToastMessage(''), 3000);
        setFormData({ name: '', phone: '', contact_email: '' });
        fetchCustomers();
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menambahkan customer baru.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.customer_code && c.customer_code.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.contact_email && c.contact_email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-cyan-500 rounded-xl text-white">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Manajemen Customer / Klien Owner</h3>
              <p className="text-xs text-slate-400">Pendaftaran & Data Klien Pemilik Perangkat Service</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Toast Message */}
          {toastMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Form Create Customer */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            <h4 className="font-bold text-xs text-slate-800 flex items-center space-x-1.5 uppercase tracking-wider">
              <UserPlus className="w-4 h-4 text-cyan-600" />
              <span>Form Registrasi Customer Baru</span>
            </h4>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Customer / Klien <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Contoh: PT Shopee Indonesia"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  No. WhatsApp / HP
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Contoh: 081234567890"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Alamat Email
                </label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                  placeholder="Contoh: info@shopee.co.id"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-cyan-600/20 disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {isSubmitting ? (
                    <span>Menyimpan...</span>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Tambah Customer</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Customer Table List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-800">Daftar Customer Terdaftar ({customers.length})</h4>
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama, kode, WhatsApp..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-slate-400">
                <div className="w-6 h-6 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-xs">Memuat daftar customer...</p>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <p className="text-xs font-semibold">Tidak ada customer ditemukan.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase">
                    <tr>
                      <th className="py-2.5 px-4">Kode</th>
                      <th className="py-2.5 px-4">Nama Customer / Klien</th>
                      <th className="py-2.5 px-4">No. WhatsApp</th>
                      <th className="py-2.5 px-4">Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCustomers.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-bold text-cyan-600">{c.customer_code}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-800">👤 {c.name}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-700">{c.phone || '-'}</td>
                        <td className="py-2.5 px-4 text-slate-600">{c.contact_email || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerModal;
