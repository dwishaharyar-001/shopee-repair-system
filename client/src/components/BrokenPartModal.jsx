import React, { useState } from 'react';
import { X, AlertOctagon, Plus, AlertTriangle } from 'lucide-react';
import { repairService } from '../services/repairService';

const REPAIR_CATEGORIES = [
  'Physical Condition (Casing dan Engsel)',
  'Display (Layar dan Touchscreen)',
  'Storage & Power (Baterai dan HDD/SSD)',
  'Input Device (Keyboard dan Touchpad)',
  'Connectivity Port (Port USB, Port Jack Audio, Port HDMI, Port Charger)',
  'Audio Visual (Speaker, Microphone, dan Kamera)',
  'Wireless Connectivity (Bluetooth dan WiFi)',
  'Lainnya / Komponen Motherboard'
];

const BrokenPartModal = ({ isOpen, onClose, order, onSuccess }) => {
  const [categoryName, setCategoryName] = useState(REPAIR_CATEGORIES[0]);
  const [serialNumber, setSerialNumber] = useState('');
  const [damageReason, setDamageReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !order) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!categoryName || !damageReason.trim()) {
      setError('Kategori spare part dan deskripsi alasan rusaknya wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await repairService.addBrokenPart(order.id, {
        category_name: categoryName,
        serial_number: serialNumber.trim(),
        damage_reason: damageReason.trim()
      });

      if (res.success) {
        onSuccess(res.message);
        onClose();
        setSerialNumber('');
        setDamageReason('');
      } else {
        setError(res.message || 'Gagal menyimpan catatan spare part rusak.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan catatan spare part rusak.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-rose-950 text-white px-6 py-4 flex items-center justify-between border-b border-rose-900">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-rose-600 rounded-xl text-white">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Pencatatan Spare Part Rusak / Defektif</h3>
              <p className="text-xs text-rose-300">
                Unit Ticket: <span className="font-mono font-bold text-white">{order.service_id}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-rose-400 hover:text-white rounded-lg hover:bg-rose-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Linked Asset ID Banner */}
        <div className="bg-rose-50 px-6 py-3 border-b border-rose-100 flex items-center justify-between text-xs">
          <span className="font-bold text-rose-900 flex items-center space-x-1.5">
            <span>🔗 Terhubung ke Asset ID:</span>
            <span className="font-mono bg-white px-2 py-0.5 rounded border border-rose-300 text-rose-700">
              {order.device?.device_id || 'ASSET-ID'}
            </span>
          </span>
          <span className="text-rose-700 text-[11px]">
            {order.device?.brand} {order.device?.model}
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Kategori Spare Part */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kategori Spare Part Rusak <span className="text-red-500">*</span>
            </label>
            <select
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              required
            >
              {REPAIR_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Serial Number Spare Part */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Serial Number Spare Part Rusak (Opsional)
            </label>
            <input
              type="text"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="Contoh: SN-DISP-2026-9901 / Not Available"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          {/* Deskripsi Alasan Rusak */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Deskripsi Alasan Rusaknya Spare Part <span className="text-red-500">*</span>
            </label>
            <textarea
              rows="3"
              value={damageReason}
              onChange={(e) => setDamageReason(e.target.value)}
              placeholder="Tuliskan penyebab/kondisi kerusakan (contoh: Layar retak garis hijau, IC power short tegangan, keyboard beberapa tombol macet)..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              required
            ></textarea>
          </div>

          {/* Action Buttons */}
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
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-rose-600/20 transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Simpan Catatan Spare Part Rusak</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BrokenPartModal;
