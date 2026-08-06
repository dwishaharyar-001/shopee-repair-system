import React, { useState, useEffect } from 'react';
import { X, Package, Plus, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { repairService } from '../services/repairService';

const RequestPartModal = ({ isOpen, onClose, order, onSuccess }) => {
  const { user } = useAuth();
  const isHidePrices = user?.role === 'Technician' || user?.role === 'QA_Liaison';

  const [parts, setParts] = useState([]);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCatalog();
    }
  }, [isOpen]);

  const fetchCatalog = async () => {
    try {
      const res = await repairService.getPartsCatalog();
      if (res.success) {
        setParts(res.data);
        if (res.data.length > 0) {
          setSelectedPartId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error('Fetch parts catalog error:', err);
    }
  };

  if (!isOpen || !order) return null;

  const selectedPart = parts.find(p => String(p.id) === String(selectedPartId));
  const unitCost = selectedPart ? parseFloat(selectedPart.unit_cost) : 0;
  const totalCost = unitCost * quantity;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedPartId || quantity <= 0) {
      setError('Pilih spare part dan masukkan kuantitas yang valid.');
      return;
    }

    if (selectedPart && selectedPart.stock_quantity < quantity) {
      setError(`Stok tidak mencukupi! Sisa stok '${selectedPart.name}' hanya ${selectedPart.stock_quantity} unit.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await repairService.requestPart(order.id, selectedPartId, quantity);
      if (res.success) {
        onSuccess(res.message);
        onClose();
        setQuantity(1);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengambil spare part.');
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
            <div className="p-2 bg-cyan-500 rounded-xl text-white">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Permintaan Spare Part</h3>
              <p className="text-xs text-slate-400">Unit: {order.service_id} ({order.device?.brand} {order.device?.model})</p>
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
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Part Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pilih Spare Part Katalog <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedPartId}
              onChange={(e) => setSelectedPartId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              required
            >
              {parts.map(p => (
                <option key={p.id} value={p.id} disabled={p.stock_quantity <= 0}>
                  [{p.category}] {p.name} — Stok: {p.stock_quantity} {!isHidePrices ? `(Rp ${parseInt(p.unit_cost).toLocaleString('id-ID')})` : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedPart && (
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Nomor Part:</span>
                <span className="font-mono font-bold text-slate-800">{selectedPart.part_number}</span>
              </div>
              {!isHidePrices && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Harga Satuan:</span>
                  <span className="font-semibold text-slate-800">
                    Rp {parseInt(selectedPart.unit_cost).toLocaleString('id-ID')}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Sisa Stok Inventaris:</span>
                <span className={`font-bold ${selectedPart.stock_quantity <= selectedPart.min_stock_trigger ? 'text-red-600' : 'text-emerald-600'}`}>
                  {selectedPart.stock_quantity} Unit
                </span>
              </div>
            </div>
          )}

          {/* Quantity Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Jumlah Kuantitas (Quantity) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max={selectedPart ? selectedPart.stock_quantity : 99}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none font-bold"
              required
            />
          </div>

          {/* Total Cost Summary */}
          {!isHidePrices && (
            <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-600">Total Biaya Konsumsi:</span>
              <span className="text-base font-extrabold text-cyan-600 font-mono">
                Rp {totalCost.toLocaleString('id-ID')}
              </span>
            </div>
          )}

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
              disabled={isSubmitting || !selectedPart || selectedPart.stock_quantity <= 0}
              className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-cyan-600/20 transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Memproses...</span>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Tambahkan Part</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequestPartModal;
