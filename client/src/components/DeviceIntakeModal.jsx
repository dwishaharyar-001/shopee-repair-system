import React, { useState, useEffect } from 'react';
import { X, Laptop, UserCheck, AlertCircle, CheckCircle2, MapPin, UserPlus, Phone, Mail, User, Search } from 'lucide-react';
import { deviceService } from '../services/deviceService';
import api from '../services/api';

const DeviceIntakeModal = ({ isOpen, onClose, onSuccess }) => {
  const [customers, setCustomers] = useState([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [branches, setBranches] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Quick Customer Add Modal State
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', contact_email: '' });
  const [customerError, setCustomerError] = useState('');
  const [customerSubmitting, setCustomerSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    customer_id: '',
    branch_id: '',
    serial_number: '',
    brand: '',
    model: '',
    asset_type: 'Type A',
    fault_description: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchDropdowns();
      setCustomerSearchTerm('');
    }
  }, [isOpen]);

  // Filtered customers based on search term (name, code, phone, email)
  const filteredCustomers = customers.filter(c => {
    if (!customerSearchTerm.trim()) return true;
    const term = customerSearchTerm.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(term)) ||
      (c.customer_code && c.customer_code.toLowerCase().includes(term)) ||
      (c.phone && c.phone.toLowerCase().includes(term)) ||
      (c.contact_email && c.contact_email.toLowerCase().includes(term))
    );
  });

  const selectedCustomerObj = customers.find(c => String(c.id) === String(formData.customer_id));

  const fetchDropdowns = async () => {
    try {
      // 1. Customers
      const custRes = await deviceService.getCustomers();
      if (custRes.success) {
        setCustomers(custRes.data);
        if (custRes.data.length > 0) {
          setFormData(prev => ({ ...prev, customer_id: prev.customer_id || custRes.data[0].id }));
        }
      }

      // 2. Branches
      const branchRes = await api.get('/branches');
      if (branchRes.data && branchRes.data.success) {
        setBranches(branchRes.data.data);
        if (branchRes.data.data.length > 0) {
          setFormData(prev => ({ ...prev, branch_id: prev.branch_id || branchRes.data.data[0].id }));
        }
      }

      // 3. Technicians
      const usersRes = await api.get('/auth/users');
      if (usersRes.data && usersRes.data.success) {
        const techList = usersRes.data.data
          .filter(u => u.role === 'Technician' && u.is_active && u.branch_id && (u.technicianProfile || u.technician))
          .map(u => {
            const prof = u.technicianProfile || u.technician || {};
            return {
              ...u,
              technicianProfile: prof,
              technician: prof
            };
          });
        setTechnicians(techList);
      }
    } catch (err) {
      console.error('Fetch dropdown error:', err);
    }
  };

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const selectedBranch = branches.find(b => String(b.id) === String(formData.branch_id));
  const branchPrefixCode = selectedBranch ? selectedBranch.code.toUpperCase() : 'SVC';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.customer_id || !formData.serial_number || !formData.brand || !formData.model || !formData.fault_description) {
      setError('Harap isi semua field wajib!');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await deviceService.createIntake(formData);
      if (res.success) {
        onSuccess(res.message);
        onClose();
        // Reset form
        setFormData({
          customer_id: customers.length > 0 ? customers[0].id : '',
          branch_id: branches.length > 0 ? branches[0].id : '',
          serial_number: '',
          brand: '',
          model: '',
          asset_type: 'Type A',
          fault_description: '',
          notes: ''
        });
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mendaftarkan intake perangkat baru.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Customer Creation Handler
  const handleCreateCustomerSubmit = async (e) => {
    e.preventDefault();
    setCustomerError('');

    if (!customerForm.name || customerForm.name.trim() === '') {
      setCustomerError('Nama Customer / Klien wajib diisi.');
      return;
    }

    setCustomerSubmitting(true);
    try {
      const res = await deviceService.createCustomer(customerForm);
      if (res.success) {
        const newCust = res.data;
        setCustomers(prev => [...prev, newCust]);
        setFormData(prev => ({ ...prev, customer_id: newCust.id }));
        setIsAddCustomerOpen(false);
        setCustomerForm({ name: '', phone: '', contact_email: '' });
      } else {
        setCustomerError(res.message);
      }
    } catch (err) {
      setCustomerError(err.response?.data?.message || 'Gagal mendaftarkan customer baru.');
    } finally {
      setCustomerSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-500 rounded-xl text-white">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Intake Perangkat Baru</h3>
              <p className="text-xs text-slate-400">Registrasi Master DeviceID & Tiket ServiceID Per Cabang</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Branch Selection */}
            <div className="sm:col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <MapPin className="w-4 h-4 text-orange-500" />
                  <span>Lokasi Cabang Service <span className="text-red-500">*</span></span>
                </span>
                <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-[11px] font-mono font-bold">
                  Prefix Kode Tiket: {branchPrefixCode}-2026-XXXX
                </span>
              </label>
              <select
                name="branch_id"
                value={formData.branch_id}
                onChange={handleChange}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                required
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    📍 [{b.code}] {b.name} ({b.address || 'Tanpa alamat'})
                  </option>
                ))}
              </select>
            </div>

            {/* Customer Select with Search Bar & Quick Add Button */}
            <div className="sm:col-span-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Cari & Pilih Klien / Customer Owner <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(true)}
                  className="text-xs font-bold text-cyan-600 hover:text-cyan-700 flex items-center space-x-1 hover:underline"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Tambah Customer Baru</span>
                </button>
              </div>

              {/* Customer Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={customerSearchTerm}
                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                  placeholder="Cari Nama Customer, Kode Klien, WA/HP, atau Email..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
                {customerSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setCustomerSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Searchable Customer List */}
              <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50 p-1">
                {filteredCustomers.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400 italic">
                    Customer tidak ditemukan untuk kata kunci "{customerSearchTerm}".
                  </div>
                ) : (
                  filteredCustomers.map(c => {
                    const isSelected = String(c.id) === String(formData.customer_id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => setFormData(prev => ({ ...prev, customer_id: c.id }))}
                        className={`p-2 rounded-lg text-xs transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-50 border border-cyan-400 text-cyan-950 font-bold shadow-xs'
                            : 'bg-white hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900">👤 {c.name}</span>
                            <span className="px-1.5 py-0.5 bg-slate-200 rounded text-[10px] font-mono text-slate-600">
                              {c.customer_code}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {c.phone ? `WA: ${c.phone}` : ''} {c.phone && c.contact_email ? '|' : ''} {c.contact_email ? `Email: ${c.contact_email}` : ''}
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-cyan-600 text-white flex items-center justify-center">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Selected Customer Card Preview */}
              {selectedCustomerObj && (
                <div className="bg-cyan-50/60 p-2.5 rounded-xl border border-cyan-200 text-xs flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-cyan-800 font-bold uppercase block">Klien Terpilih:</span>
                    <div className="font-bold text-cyan-950">
                      👤 {selectedCustomerObj.name} <span className="font-mono text-[11px] font-semibold text-cyan-700">({selectedCustomerObj.customer_code})</span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-cyan-100 text-cyan-800 font-bold px-2 py-0.5 rounded border border-cyan-300">
                    OK Terpilih
                  </span>
                </div>
              )}
            </div>

            {/* Serial Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Serial Number (S/N) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="serial_number"
                value={formData.serial_number}
                onChange={handleChange}
                placeholder="Contoh: SN-DELL-998811"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none uppercase font-mono"
                required
              />
            </div>

            {/* Asset Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipe Aset
              </label>
              <select
                name="asset_type"
                value={formData.asset_type}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              >
                <option value="Type A">Type A (Standard Corporate)</option>
                <option value="Type B">Type B (VIP / Executive)</option>
                <option value="Type C">Type C (High Performance / Workstation)</option>
              </select>
            </div>

            {/* Brand */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Merek / Brand <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                placeholder="Contoh: Dell, Lenovo, Apple"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                required
              />
            </div>

            {/* Model */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Model Perangkat <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="model"
                value={formData.model}
                onChange={handleChange}
                placeholder="Contoh: Latitude 5420, ThinkPad T14"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                required
              />
            </div>

            {/* Fault Description */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Deskripsi Kerusakan / Gejala Keluhan <span className="text-red-500">*</span>
              </label>
              <textarea
                name="fault_description"
                value={formData.fault_description}
                onChange={handleChange}
                rows="2"
                placeholder="Jelaskan kendala perangkat (misal: Layar mati total, tidak bisa charging, dsb)..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                required
              ></textarea>
            </div>

          </div>

          {/* Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-semibold rounded-xl shadow-md shadow-orange-500/20 disabled:opacity-50 flex items-center space-x-1.5"
            >
              {isSubmitting ? (
                <span>Memproses Intake...</span>
              ) : (
                <>
                  <Laptop className="w-4 h-4" />
                  <span>Proses Intake Perangkat</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Quick Add Customer Modal */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-cyan-400" />
                <h4 className="font-bold text-sm">Tambah Customer / Klien Baru</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCustomerOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomerSubmit} className="p-5 space-y-4">
              {customerError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span>{customerError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                  <User className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Nama Lengkap Customer / Klien <span className="text-red-500">*</span></span>
                </label>
                <input
                  type="text"
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Contoh: PT Corporate Client / Budi Santoso"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>No. WhatsApp / Telepon</span>
                </label>
                <input
                  type="text"
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Contoh: 081234567890"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  <span>Alamat Email</span>
                </label>
                <input
                  type="email"
                  value={customerForm.contact_email}
                  onChange={(e) => setCustomerForm(prev => ({ ...prev, contact_email: e.target.value }))}
                  placeholder="Contoh: contact@client.co.id"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={customerSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-cyan-600/20 disabled:opacity-50"
                >
                  {customerSubmitting ? 'Simpan...' : 'Simpan Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceIntakeModal;
