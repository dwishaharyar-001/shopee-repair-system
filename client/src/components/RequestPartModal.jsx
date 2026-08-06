import React, { useState, useEffect } from 'react';
import { X, Package, Plus, AlertTriangle, CheckCircle2, Search, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { repairService } from '../services/repairService';

const RequestPartModal = ({ isOpen, onClose, order, onSuccess }) => {
  const { user } = useAuth();
  const isHidePrices = user?.role === 'Technician' || user?.role === 'QA_Liaison';

  const [parts, setParts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPartId, setSelectedPartId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCatalog();
      setSearchTerm('');
    }
  }, [isOpen]);

  const fetchCatalog = async () => {
    try {
      const res = await repairService.getPartsCatalog();
      if (res.success) {
        setParts(res.data);
        if (res.data.length > 0) {
          const availableFirst = res.data.find(p => p.stock_quantity > 0) || res.data[0];
          setSelectedPartId(availableFirst.id);
        }
      }
    } catch (err) {
      console.error('Fetch parts catalog error:', err);
    }
  };

  if (!isOpen || !order) return null;

  // Filtered parts based on search term (matches Part Name, Part Number, Category)
  const filteredParts = parts.filter(p => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(term)) ||
      (p.part_number && p.part_number.toLowerCase().includes(term)) ||
      (p.category && p.category.toLowerCase().includes(term))
    );
  });

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
        setSearchTerm('');
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

          {/* Search Bar Input */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Cari & Pilih Spare Part Katalog <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari Nama Part, Part Number, Kategori..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Searchable Parts Selection List */}
          <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50 p-1">
            {filteredParts.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 italic">
                Spare part tidak ditemukan untuk kata kunci "{searchTerm}".
              </div>
            ) : (
              filteredParts.map(p => {
                const isSelected = String(p.id) === String(selectedPartId);
                const isOutOfStock = p.stock_quantity <= 0;

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      if (!isOutOfStock) setSelectedPartId(p.id);
                    }}
                    className={`p-2.5 rounded-lg text-xs transition-all flex items-center justify-between ${
                      isOutOfStock
                        ? 'opacity-40 bg-slate-100 cursor-not-allowed'
                        : isSelected
                        ? 'bg-cyan-50 border border-cyan-400 text-cyan-950 font-bold shadow-xs cursor-pointer'
                        : 'bg-white hover:bg-slate-100 text-slate-800 cursor-pointer'
                    }`}
                  >
                    <div className="space-y-0.5 pr-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900">{p.name}</span>
                        <span className="px-1.5 py-0.5 bg-slate-200 rounded text-[10px] font-mono text-slate-600">
                          {p.category}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        PN: {p.part_number} {!isHidePrices ? `| Rp ${parseInt(p.unit_cost).toLocaleString('id-ID')}` : ''}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {isOutOfStock ? (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold">
                          Stok Habis
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.stock_quantity <= p.min_stock_trigger ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          Stok: {p.stock_quantity}
                        </span>
                      )}

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Selected Part Details Summary Card */}
          {selectedPart && (
            <div className="bg-cyan-50/50 p-3.5 rounded-xl border border-cyan-200/80 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">Part Terpilih:</span>
                <span className="font-bold text-cyan-950">{selectedPart.name}</span>
              </div>
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
