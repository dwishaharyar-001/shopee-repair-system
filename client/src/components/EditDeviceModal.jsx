import React, { useState, useEffect } from 'react';
import { X, Edit, Laptop, AlertCircle, CheckCircle2, MapPin, Search, User, Wrench } from 'lucide-react';
import { deviceService } from '../services/deviceService';
import api from '../services/api';

const EditDeviceModal = ({ isOpen, onClose, order, onSuccess }) => {
  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    customer_id: '',
    branch_id: '',
    serial_number: '',
    brand: '',
    model: '',
    asset_type: 'Type A',
    fault_description: '',
    assigned_technician_id: '',
    status: 'Intake',
    notes: ''
  });

  useEffect(() => {
    if (isOpen && order) {
      fetchDropdowns();
      setFormData({
        customer_id: order.customer_id || order.customer?.id || '',
        branch_id: order.branch_id || order.branch?.id || '',
        serial_number: order.device?.serial_number || '',
        brand: order.device?.brand || '',
        model: order.device?.model || '',
        asset_type: order.device?.asset_type || 'Type A',
        fault_description: order.fault_description || '',
        assigned_technician_id: order.assigned_technician_id || order.assignedTechnician?.id || '',
        status: order.status || 'Intake',
        notes: order.notes || ''
      });
      setError('');
    }
  }, [isOpen, order]);

  const fetchDropdowns = async () => {
    try {
      const custRes = await deviceService.getCustomers();
      if (custRes.success) setCustomers(custRes.data);

      const branchRes = await api.get('/branches');
      if (branchRes.data && branchRes.data.success) setBranches(branchRes.data.data);

      const usersRes = await api.get('/auth/users');
      if (usersRes.data && usersRes.data.success) {
        const techList = usersRes.data.data
          .filter(u => u.role === 'Technician' && u.is_active)
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

  if (!isOpen || !order) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.serial_number || !formData.brand || !formData.model || !formData.fault_description) {
      setError('Harap isi Serial Number, Brand, Model, dan Deskripsi Kerusakan.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await deviceService.updateServiceOrder(order.id, formData);
      if (res.success) {
        onSuccess(res.message || 'Perubahan informasi perangkat berhasil disimpan.');
        onClose();
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan perubahan informasi perangkat.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="p-1.5 sm:p-2 bg-amber-500 rounded-xl text-white">
              <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  {order.service_id}
                </span>
                <span className="font-mono text-xs text-cyan-400 font-bold bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20">
                  {order.device?.device_id}
                </span>
              </div>
              <h3 className="font-bold text-sm sm:text-base text-slate-100 mt-0.5">
                Edit Informasi Device Intake
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Customer Owner Selection */}
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Pemilik / Customer Client <span className="text-red-500">*</span>
              </label>
              <select
                name="customer_id"
                value={formData.customer_id}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                required
              >
                <option value="">-- Pilih Customer / Klien --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    👤 {c.name} ({c.customer_code}) {c.phone ? `| WA: ${c.phone}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Branch Location */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-orange-500" />
                <span>Lokasi Cabang Service</span>
              </label>
              <select
                name="branch_id"
                value={formData.branch_id}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                <option value="">-- Tanpa Cabang Khusus --</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    📍 [{b.code}] {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Order */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Status Order Service
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="Intake">Intake (Pendaftaran Baru)</option>
                <option value="Teknisi Assigned">Teknisi Assigned (Telah Ditugaskan)</option>
                <option value="In Repair">In Repair (Dalam Pengerjaan)</option>
                <option value="QC1 Pending">QC1 Pending (Audit Arisa)</option>
                <option value="Rework">Rework (Perbaikan Ulang 48h)</option>
                <option value="QC2 Pending">QC2 Pending (Audit Final)</option>
                <option value="Released">Released (Selesai & Diserahkan)</option>
              </select>
            </div>

            {/* Serial Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Serial Number (S/N) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="serial_number"
                value={formData.serial_number}
                onChange={handleChange}
                placeholder="Contoh: SN-DELL-998811"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none uppercase"
                required
              />
            </div>

            {/* Asset Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tipe / Kategori Aset
              </label>
              <select
                name="asset_type"
                value={formData.asset_type}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="Type A">Type A (Standard Corporate Laptop)</option>
                <option value="Type B">Type B (VIP / Executive Laptop)</option>
                <option value="Type C">Type C (High Performance Workstation)</option>
                <option value="Type D">Type D (Storage / Server)</option>
                <option value="Type E">Type E (Networking Peripheral)</option>
              </select>
            </div>

            {/* Brand */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Merek / Brand <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                placeholder="Contoh: Dell, Lenovo, Apple"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                required
              />
            </div>

            {/* Model */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Model Perangkat <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="model"
                value={formData.model}
                onChange={handleChange}
                placeholder="Contoh: Latitude 5420, ThinkPad T14"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                required
              />
            </div>

            {/* Assigned Technician */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center space-x-1">
                  <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Teknisi Penanggung Jawab</span>
                </span>
                {order?.bast_status === 'Approved_SEA' || order?.bast_status === 'Verified_By_SEA' ? (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-300">
                    ✓ BAST Terverifikasi SEA (Distribusi Terbuka)
                  </span>
                ) : (
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-300">
                    🔒 Terkunci (Menunggu Verifikasi BAST SEA)
                  </span>
                )}
              </label>

              {(order?.bast_status !== 'Approved_SEA' && order?.bast_status !== 'Verified_By_SEA') && (
                <div className="mb-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] font-medium">
                  <strong>Catatan Workflow:</strong> Unit ini harus masuk dokumen BAST (Client → Arisa) dan diverifikasi oleh QC Client terlebih dahulu sebelum dapat didistribusikan ke Teknisi.
                </div>
              )}

              <select
                name="assigned_technician_id"
                value={formData.assigned_technician_id}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">-- Belum Ditugaskan (Unassigned) --</option>
                {technicians
                  .filter(t => t.is_active)
                  .map(t => {
                    const prof = t.technicianProfile || t.technician || {};
                    const skill = prof.skill_level ? ` - ${prof.skill_level}` : '';
                    const empCode = prof.employee_code || `TECH-${String(t.id).padStart(3, '0')}`;
                    const targetVal = prof.id || t.id;
                    return (
                      <option key={targetVal} value={targetVal}>
                        🛠️ {t.full_name} ({empCode}{skill})
                      </option>
                    );
                  })}
              </select>
            </div>

            {/* Fault Description */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Deskripsi Kerusakan / Keluhan Awal <span className="text-red-500">*</span>
              </label>
              <textarea
                name="fault_description"
                value={formData.fault_description}
                onChange={handleChange}
                rows="2"
                placeholder="Tuliskan kendala kerusakan perangkat..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                required
              ></textarea>
            </div>

            {/* Additional Notes */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Catatan Tambahan Intake (Opsional)
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="2"
                placeholder="Catatan kelengkapan fisik, charger, dus, kelengkapan baut..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              ></textarea>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors text-center"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Menyimpan Perubahan...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Perubahan Device</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditDeviceModal;
