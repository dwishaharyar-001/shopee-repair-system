import React, { useState, useEffect } from 'react';
import { X, RefreshCw, AlertCircle, CheckCircle2, Laptop } from 'lucide-react';
import { inventoryService } from '../services/inventoryService';
import { deviceService } from '../services/deviceService';

const HarvestPartModal = ({ isOpen, onClose, onSuccess }) => {
  const [devices, setDevices] = useState([]);
  const [parts, setParts] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [selectedPartId, setSelectedPartId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState('Tested Good');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchDropdowns();
    }
  }, [isOpen]);

  const fetchDropdowns = async () => {
    try {
      const devRes = await deviceService.getMasterDevices();
      if (devRes.success) {
        setDevices(devRes.data);
        if (devRes.data.length > 0) setSelectedDeviceId(devRes.data[0].id);
      }

      const partsRes = await inventoryService.getInventoryParts();
      if (partsRes.success) {
        setParts(partsRes.data);
        if (partsRes.data.length > 0) setSelectedPartId(partsRes.data[0].id);
      }
    } catch (err) {
      console.error('Fetch harvest dropdown error:', err);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedDeviceId || !selectedPartId || quantity <= 0) {
      setError('Pilih perangkat sumber, spare part, dan jumlah kuantitas yang valid.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        source_device_id: selectedDeviceId,
        part_id: selectedPartId,
        quantity: parseInt(quantity),
        condition,
        notes
      };

      const res = await inventoryService.harvestPart(payload);
      if (res.success) {
        onSuccess(res.message);
        onClose();
        setQuantity(1);
        setNotes('');
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memproses pemananen part.');
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
            <div className="p-2 bg-emerald-500 rounded-xl text-white">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Pemanenan Spare Part (Harvesting)</h3>
              <p className="text-xs text-slate-400">Pengambilan Komponen dari Perangkat Rusak / Kanibal</p>
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

          <div className="space-y-4 text-xs">
            {/* Source Device */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Perangkat Sumber Kanibal <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              >
                {devices.map(d => (
                  <option key={d.id} value={d.id}>
                    [{d.device_id}] {d.brand} {d.model} — SN: {d.serial_number} ({d.customer?.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Target Part */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Spare Part Dipanen <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedPartId}
                onChange={(e) => setSelectedPartId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              >
                {parts.map(p => (
                  <option key={p.id} value={p.id}>
                    [{p.category}] {p.name} (Stok Saat Ini: {p.stock_quantity})
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity & Condition */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Jumlah Panen (Quantity) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Kondisi Komponen
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="Tested Good">Tested Good (100% Bagus)</option>
                  <option value="Minor Wear">Minor Wear (Bekas Pakai Layak)</option>
                  <option value="Refurbished">Refurbished</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Catatan Pemanenan
              </label>
              <textarea
                rows="2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tuliskan catatan alasan kanibal perangkat..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              ></textarea>
            </div>
          </div>

          {/* Footer Buttons */}
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Memproses...</span>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Simpan & Tambah Stok</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HarvestPartModal;
