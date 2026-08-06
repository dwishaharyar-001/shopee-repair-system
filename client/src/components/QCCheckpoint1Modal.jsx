import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, ShieldCheck, AlertCircle } from 'lucide-react';
import { qcService } from '../services/qcService';

const QCCheckpoint1Modal = ({ isOpen, onClose, order, onSuccess }) => {
  const [tests, setTests] = useState({
    power_test: 'Pass',
    display_test: 'Pass',
    keyboard_test: 'Pass',
    storage_test: 'Pass',
    thermal_test: 'Pass'
  });

  const [overallResult, setOverallResult] = useState('Passed');
  const [failureReason, setFailureReason] = useState('');
  const [reworkNotes, setReworkNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !order) return null;

  const handleTestChange = (testName, value) => {
    const updated = { ...tests, [testName]: value };
    setTests(updated);

    // Auto set overall result to Rejected if any test fails
    const hasFail = Object.values(updated).includes('Fail');
    if (hasFail) {
      setOverallResult('Rejected');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (overallResult === 'Rejected' && !failureReason) {
      setError('Harap isi alasan penolakan (Failure Reason) jika QC ditolak.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        service_order_id: order.id,
        ...tests,
        overall_result: overallResult,
        failure_reason: overallResult === 'Rejected' ? failureReason : null,
        rework_notes: reworkNotes
      };

      const res = await qcService.submitQC1(payload);
      if (res.success) {
        onSuccess(res.message);
        onClose();
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan hasil QC1.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const testItems = [
    { key: 'power_test', label: 'Power & Charging Delivery', desc: 'Uji pengisian daya baterai & adaptor 65W/100W' },
    { key: 'display_test', label: 'Display & LCD Quality', desc: 'Uji pixel mati (dead pixel), backlight bleed & flickering' },
    { key: 'keyboard_test', label: 'Keyboard & Trackpad Input', desc: 'Uji semua tombol fisik & gesture multi-touch' },
    { key: 'storage_test', label: 'Storage & Drive Health', desc: 'Uji S.M.A.R.T SSD/HDD & kecepatan baca/tulis' },
    { key: 'thermal_test', label: 'Thermal & Stress Load', desc: 'Uji suhu prosessor & putaran fan saat full load 100%' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500 rounded-xl text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Audit QC Checkpoint 1 (Arisa)</h3>
              <p className="text-xs text-slate-400">Pemeriksaan Kualitas Hardware & Pengujian Komponen Fisik</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Unit Info Box */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between text-xs">
            <div>
              <span className="font-mono text-cyan-600 font-bold">{order.service_id}</span>
              <h4 className="font-bold text-slate-800 text-sm mt-0.5">{order.device?.brand} {order.device?.model}</h4>
              <p className="text-slate-500 font-mono text-[11px]">SN: {order.device?.serial_number}</p>
            </div>
            <div className="text-right">
              <span className="text-slate-400">Teknisi:</span>
              <div className="font-semibold text-emerald-700">{order.assignedTechnician?.user?.full_name || 'Unassigned'}</div>
            </div>
          </div>

          {/* Criteria Checklist */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Kriteria Pengujian Hardware</h4>
            {testItems.map((item) => (
              <div key={item.key} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <div>
                  <div className="font-semibold text-xs text-slate-800">{item.label}</div>
                  <div className="text-[11px] text-slate-400">{item.desc}</div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleTestChange(item.key, 'Pass')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                      tests[item.key] === 'Pass'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>PASS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTestChange(item.key, 'Fail')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                      tests[item.key] === 'Fail'
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>FAIL</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Overall Decision Selector */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Keputusan Akhir Audit QC1:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOverallResult('Passed')}
                className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 border transition-all ${
                  overallResult === 'Passed'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>APPROVE (Lulus ke QC2 Shopee)</span>
              </button>

              <button
                type="button"
                onClick={() => setOverallResult('Rejected')}
                className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 border transition-all ${
                  overallResult === 'Rejected'
                    ? 'bg-red-600 text-white border-red-600 shadow-md ring-2 ring-red-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <XCircle className="w-4 h-4" />
                <span>REJECT (Kembalikan ke Teknisi SLA 48h)</span>
              </button>
            </div>
          </div>

          {/* Failure Reason Input (if rejected) */}
          {overallResult === 'Rejected' && (
            <div>
              <label className="block text-xs font-semibold text-red-600 mb-1">
                Alasan Penolakan / Defect Found <span className="text-red-500">*</span>
              </label>
              <textarea
                rows="2"
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value)}
                placeholder="Tuliskan secara spesifik bagian komponen yang gagal dan harus diperbaiki ulang..."
                className="w-full bg-red-50/50 border border-red-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                required
              ></textarea>
            </div>
          )}

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
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Memproses...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Simpan Hasil Audit QC1</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QCCheckpoint1Modal;
