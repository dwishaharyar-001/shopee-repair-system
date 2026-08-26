import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  AlertTriangle, 
  Calculator, 
  Wrench, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  FileText,
  DollarSign,
  Package,
  Layers,
  ArrowRight
} from 'lucide-react';
import { diagnosticService } from '../services/diagnosticService';

const HARVEST_REASONS = [
  'Kebutuhan Sparepart Terlalu Banyak & Biaya Melebihi Limit Budget',
  'Motherboard Rusak Parah / Short Circuit Total',
  'Layar / Panel & Body Hancur Tidak Layak Servis',
  'Komponen Utama Obsolete / Part Tidak Ditemukan',
  'Lainnya (Tuliskan di Catatan Feedback)'
];

const SEABudgetApprovalModal = ({ isOpen, onClose, order, onSuccess }) => {
  const [decision, setDecision] = useState('Full_Approve'); // 'Full_Approve', 'Partial_Approve', 'Not_Approve_Harvest', 'Revision_Requested'
  const [approvedPartIds, setApprovedPartIds] = useState([]);
  const [harvestReason, setHarvestReason] = useState(HARVEST_REASONS[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const items = order?.diagnosticPlanItems || [];

  useEffect(() => {
    if (order && items.length > 0) {
      // By default select all part IDs for Full Approve
      setApprovedPartIds(items.map(i => i.id));
    } else {
      setApprovedPartIds([]);
    }
    setDecision('Full_Approve');
    setNotes('');
    setError('');
  }, [order]);

  if (!isOpen || !order) return null;

  const togglePartApproval = (itemId) => {
    if (approvedPartIds.includes(itemId)) {
      setApprovedPartIds(approvedPartIds.filter(id => id !== itemId));
    } else {
      setApprovedPartIds([...approvedPartIds, itemId]);
    }
  };

  // Recalculate estimated part cost based on current checked item selection
  const calculatedPartCost = items
    .filter(i => decision === 'Full_Approve' || approvedPartIds.includes(i.id))
    .reduce((sum, i) => sum + (parseFloat(i.total_cost) || 0), 0);

  const estimatedServiceCost = parseFloat(order.estimated_service_cost) || 0;
  const totalApprovedBudget = calculatedPartCost + estimatedServiceCost;

  const handleSubmit = async () => {
    if (decision === 'Revision_Requested' && !notes.trim()) {
      setError('Harap masukkan catatan penjelasan alasan permintaan revisi.');
      return;
    }

    if (decision === 'Not_Approve_Harvest' && !harvestReason.trim()) {
      setError('Harap tentukan alasan kanibalisasi / perbaikan ditolak.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        overall_decision: decision,
        approved_item_ids: decision === 'Partial_Approve' ? approvedPartIds : items.map(i => i.id),
        harvest_reason: decision === 'Not_Approve_Harvest' ? harvestReason : null,
        notes: notes
      };

      const res = await diagnosticService.processSeaApproval(order.id, payload);

      if (res && res.success) {
        if (onSuccess) onSuccess(res.message);
        onClose();
      } else {
        setError(res?.message || 'Gagal memproses keputusan approval budget.');
      }
    } catch (err) {
      console.error('Submit budget approval error:', err);
      setError(err.response?.data?.message || err.message || 'Terjadi kesalahan saat menyimpan keputusan approval.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-2xl shadow-lg text-white">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-lg tracking-tight">Verifikasi Rencana Perbaikan & Budget — QC Client</h3>
                <span className="px-2.5 py-0.5 rounded-md font-mono text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {order.service_id}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Persetujuan Anggaran Biaya & Opsi Kanibalisasi sebelum Phase Service Perbaikan Dimulai
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 font-semibold flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Unit & Technician Meta */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Perangkat & Serial Number:</span>
              <div className="font-bold text-slate-900 mt-0.5">{order.device?.brand} {order.device?.model}</div>
              <div className="font-mono text-slate-600 text-[11px]">{order.device?.serial_number}</div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer & Cabang:</span>
              <div className="font-bold text-slate-800 mt-0.5">{order.customer?.name || '-'}</div>
              <div className="text-slate-600">{order.branch?.name || '-'}</div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Teknisi Pengaju (Phase Diagnostics):</span>
              <div className="font-bold text-emerald-800 mt-0.5">{order.assignedTechnician?.user?.full_name || 'Teknisi Arisa'}</div>
              <div className="text-[10px] text-slate-500 font-mono">
                Diajukan: {order.diagnostic_submitted_at ? new Date(order.diagnostic_submitted_at).toLocaleString('id-ID') : '-'}
              </div>
            </div>
          </div>

          {/* Diagnostic Findings & Explanation */}
          <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200 space-y-2">
            <h4 className="font-bold text-amber-900 flex items-center space-x-1.5">
              <FileText className="w-4 h-4 text-amber-600" />
              <span>Hasil General Diagnostics & Penjelasan Kerusakan (Teknisi):</span>
            </h4>
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed font-medium bg-white p-3 rounded-xl border border-amber-200/60">
              {order.notes || order.fault_description || 'Belum ada catatan diagnosa.'}
            </p>
          </div>

          {/* Requested Spare Parts Table with Itemized Checkbox Toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center space-x-1.5">
                <Package className="w-4 h-4 text-purple-600" />
                <span>Rencana Kebutuhan Sparepart (Itemized Approval):</span>
              </h4>
              <span className="text-[11px] text-slate-500 font-semibold">
                Centang part yang disetujui untuk opsi <strong className="text-amber-600">Partial Approve</strong>
              </span>
            </div>

            {items.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-400">
                Tidak ada kebutuhan sparepart fisik yang diajukan (Perbaikan kategori service saja).
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                      <th className="py-2.5 px-3 text-center">Setujui Part</th>
                      <th className="py-2.5 px-3">Nama Sparepart</th>
                      <th className="py-2.5 px-3">Part Number</th>
                      <th className="py-2.5 px-3 text-center">Jumlah Qty</th>
                      <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                      <th className="py-2.5 px-3 text-right">Total Estimasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => {
                      const isChecked = decision === 'Full_Approve' || approvedPartIds.includes(item.id);
                      return (
                        <tr key={item.id} className={`transition-colors ${isChecked ? 'bg-emerald-50/40' : 'bg-rose-50/30'}`}>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={approvedPartIds.includes(item.id)}
                              onChange={() => {
                                setDecision('Partial_Approve');
                                togglePartApproval(item.id);
                              }}
                              disabled={decision === 'Full_Approve' || decision === 'Not_Approve_Harvest'}
                              className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {item.part?.name || 'Sparepart Khusus'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">
                            {item.part?.part_number || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                            {item.quantity} Unit
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                            Rp {parseFloat(item.unit_cost || 0).toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-900">
                            Rp {parseFloat(item.total_cost || 0).toLocaleString('id-ID')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Automatic Budget Calculation Box */}
          <div className="bg-gradient-to-r from-purple-900 to-slate-900 text-white p-5 rounded-2xl shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-purple-800 pb-2">
              <span className="text-xs font-bold text-purple-200 uppercase tracking-wider flex items-center space-x-1.5">
                <Calculator className="w-4 h-4 text-amber-400" />
                <span>Kalkulasi Rencana Anggaran Biaya (RAB):</span>
              </span>
              <span className="text-[11px] font-mono text-purple-300">Cabang: {order.branch?.name}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                <span className="text-[10px] text-purple-200 block">Estimasi Biaya Sparepart:</span>
                <span className="text-lg font-mono font-extrabold text-amber-300 mt-1 block">
                  Rp {calculatedPartCost.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                <span className="text-[10px] text-purple-200 block">Biaya Service (BranchCategoryPrice):</span>
                <span className="text-lg font-mono font-extrabold text-cyan-300 mt-1 block">
                  Rp {estimatedServiceCost.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 p-3 rounded-xl border border-amber-400/40">
                <span className="text-[10px] text-amber-200 block font-bold">TOTAL DISAPPROVED/APPROVED BUDGET:</span>
                <span className="text-xl font-mono font-black text-emerald-400 mt-1 block">
                  Rp {totalApprovedBudget.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          {/* QC SEA Decision Selection (4 Options) */}
          <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Opsi Keputusan Verification & Budget Approval QC Client:</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option A: Full Approve */}
              <button
                type="button"
                onClick={() => {
                  setDecision('Full_Approve');
                  setApprovedPartIds(items.map(i => i.id));
                }}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start space-x-3 ${
                  decision === 'Full_Approve'
                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-md ring-2 ring-emerald-400'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs">A. Full Approve</div>
                  <div className="text-[10px] opacity-90 mt-0.5">Setujui seluruh rincian sparepart & biaya service perbaikan.</div>
                </div>
              </button>

              {/* Option B: Partial Approve */}
              <button
                type="button"
                onClick={() => setDecision('Partial_Approve')}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start space-x-3 ${
                  decision === 'Partial_Approve'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-400'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs">B. Partial Approve</div>
                  <div className="text-[10px] opacity-90 mt-0.5">Setujui sparepart tertentu saja (centang pada tabel di atas).</div>
                </div>
              </button>

              {/* Option C: Fully Not Approve (Kanibalisasi) */}
              <button
                type="button"
                onClick={() => setDecision('Not_Approve_Harvest')}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start space-x-3 ${
                  decision === 'Not_Approve_Harvest'
                    ? 'bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-400'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs">C. Fully Not Approve (Kanibalisasi)</div>
                  <div className="text-[10px] opacity-90 mt-0.5">Device ditolak perbaikan & dijadikan bahan kanibalisasi.</div>
                </div>
              </button>

              {/* Option D: Request Revision */}
              <button
                type="button"
                onClick={() => setDecision('Revision_Requested')}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start space-x-3 ${
                  decision === 'Revision_Requested'
                    ? 'bg-purple-600 text-white border-purple-700 shadow-md ring-2 ring-purple-400'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <RefreshCw className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs">D. Minta Revisi Rencana Kerja</div>
                  <div className="text-[10px] opacity-90 mt-0.5">Kembalikan ke Teknisi untuk revisi diagnosa / pilihan part.</div>
                </div>
              </button>
            </div>

            {/* Dropdown Alasan Kanibalisasi (Jika Option C) */}
            {decision === 'Not_Approve_Harvest' && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                <label className="block font-bold text-rose-900 text-xs">
                  Pilih Alasan Kanibalisasi / Fully Not Approve:
                </label>
                <select
                  value={harvestReason}
                  onChange={(e) => setHarvestReason(e.target.value)}
                  className="w-full p-2.5 bg-white border border-rose-300 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  {HARVEST_REASONS.map((reason, idx) => (
                    <option key={idx} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Notes Input */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 text-xs">
                Catatan Feedback & Instruksi QC Client (Opsional / Wajib jika revisi):
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tuliskan masukan, alasan penolakan part tertentu, atau instruksi kerja untuk Teknisi..."
                rows={3}
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`px-6 py-2.5 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-2 disabled:opacity-50 ${
              decision === 'Full_Approve'
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                : decision === 'Partial_Approve'
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                : decision === 'Not_Approve_Harvest'
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                : 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              {isSubmitting
                ? 'Memproses Keputusan...'
                : decision === 'Full_Approve'
                ? 'Approve Full Budget & Unlock Service'
                : decision === 'Partial_Approve'
                ? 'Approve Partial Budget & Unlock Service'
                : decision === 'Not_Approve_Harvest'
                ? 'Proses Kanibalisasi (Harvested)'
                : 'Kirim Instruksi Revisi ke Teknisi'}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default SEABudgetApprovalModal;
