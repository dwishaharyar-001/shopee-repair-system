import React, { useState, useEffect } from 'react';
import { X, Package, Edit, AlertCircle, MapPin } from 'lucide-react';
import { inventoryService } from '../services/inventoryService';
import api from '../services/api';

const EditPartModal = ({ isOpen, onClose, part, onSuccess }) => {
  const [branches, setBranches] = useState([]);
  const [formData, setFormData] = useState({
    part_number: '',
    name: '',
    category: 'Memory',
    branch_id: '',
    stock_quantity: 0,
    unit_cost: 0,
    min_stock_trigger: 5
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchBranches();
      if (part) {
        setFormData({
          part_number: part.part_number || '',
          name: part.name || '',
          category: part.category || 'Memory',
          branch_id: part.branch_id || (part.branch ? part.branch.id : ''),
          stock_quantity: part.stock_quantity !== undefined ? part.stock_quantity : 0,
          unit_cost: part.unit_cost !== undefined ? part.unit_cost : 0,
          min_stock_trigger: part.min_stock_trigger !== undefined ? part.min_stock_trigger : 5
        });
      }
    }
  }, [isOpen, part]);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      if (res.data && res.data.success) {
        setBranches(res.data.data);
      }
    } catch (err) {
      console.error('Fetch branches error:', err);
    }
  };

  if (!isOpen || !part) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.part_number || !formData.name || !formData.category) {
      setError('Mohon lengkapi Nomor Part, Nama, dan Kategori.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await inventoryService.updatePart(part.id, formData);
      if (res.success) {
        onSuccess(res.message);
        onClose();
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memperbarui data spare part.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white">
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Edit Data Spare Part</h3>
              <p className="text-xs text-slate-400">Pengubahan SKU Katalog & Stok Inventaris (Akses Admin)</p>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Branch Selection */}
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-orange-500" />
                <span>Lokasi Cabang Inventaris <span className="text-red-500">*</span></span>
              </label>
              <select
                name="branch_id"
                value={formData.branch_id}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    📍 [{b.code}] {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Part Number */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nomor Part (Part Code) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="part_number"
                value={formData.part_number}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-mono"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Kategori Part <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              >
                <option value="Memory">Memory (RAM)</option>
                <option value="Storage">Storage (SSD/HDD)</option>
                <option value="Display">Display & LCD Panel</option>
                <option value="Keyboard">Keyboard & Touchpad</option>
                <option value="Battery">Battery Unit</option>
                <option value="Thermal">Thermal & Fan</option>
                <option value="Power">Power Supply & Adapter</option>
                <option value="Motherboard">Motherboard & Board Component</option>
              </select>
            </div>

            {/* Name */}
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Nama Spare Part <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            {/* Stock Quantity */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Jumlah Stok Saat Ini (Unit)
              </label>
              <input
                type="number"
                name="stock_quantity"
                value={formData.stock_quantity}
                onChange={handleChange}
                min="0"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold"
              />
            </div>

            {/* Min Stock Trigger */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Min Stock Reorder Trigger
              </label>
              <input
                type="number"
                name="min_stock_trigger"
                value={formData.min_stock_trigger}
                onChange={handleChange}
                min="1"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold"
              />
            </div>

            {/* Unit Cost */}
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Estimasi Harga Satuan (Rp)
              </label>
              <input
                type="number"
                name="unit_cost"
                value={formData.unit_cost}
                onChange={handleChange}
                min="0"
                step="1000"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/20 disabled:opacity-50 flex items-center space-x-1.5"
            >
              {isSubmitting ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <Edit className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPartModal;
