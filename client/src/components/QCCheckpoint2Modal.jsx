import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, Award, AlertCircle } from 'lucide-react';
import { qcService } from '../services/qcService';

const QCCheckpoint2Modal = ({ isOpen, onClose, order, onSuccess }) => {
  const [tests, setTests] = useState({
    functional_test: 'Pass',
    physical_cosmetic_test: 'Pass',
    os_firmware_test: 'Pass'
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

    const hasFail = Object.values(updated).includes('Fail');
    if (hasFail) {
      setOverallResult('Rejected');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (overallResult === 'Rejected' && !failureReason) {
      setError('Harap isi alasan penolakan (Failure Reason) jika QC2 ditolak.');
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

      const res = await qcService.submitQC2(payload);
      if (res.success) {
        onSuccess(res.message);
        onClose();
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan hasil QC2.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const testItems = [
    { key: 'functional_test', label: 'End-to-End Functional Test', desc: 'Uji konektivitas WiFi, Bluetooth, Audio Speaker, Webcam & USB ports' },
    { key: 'physical_cosmetic_test', label: 'Physical & Cosmetic Inspection', desc: 'Uji kebersihan fisik unit, kelengkapan baut, stiker garansi & engsel' },
    { key: 'os_firmware_test', label: 'OS Build & Firmware Verification', desc: 'Verifikasi aktivasi Windows 11/macOS, driver terinstal & BIOS versi terbaru' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="p-1.5 sm:p-2 bg-purple-600 rounded-xl text-white">
              <Award className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">Audit QC Checkpoint 2 (Shopee Release)</h3>
              <p className="text-[10px] sm:text-xs text-slate-400">Verifikasi Akhir Kosmetik, Fungsionalitas & Approval Rilis</p>
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
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Unit Info Box */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
            <div>
              <span className="font-mono text-purple-600 font-bold">{order.service_id}</span>
              <h4 className="font-bold text-slate-800 text-sm mt-0.5">{order.device?.brand} {order.device?.model}</h4>
              <p className="text-slate-500 font-mono text-[11px]">SN: {order.device?.serial_number}</p>
            </div>
            <div className="sm:text-right border-t sm:border-t-0 pt-1 sm:pt-0">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Customer:</span>
              <div className="font-bold text-slate-900">{order.customer?.name}</div>
            </div>
          </div>

          {/* Criteria Checklist */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Kriteria Evaluasi Release Shopee</h4>
            {testItems.map((item) => (
              <div key={item.key} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200/80 gap-2">
                <div>
                  <div className="font-semibold text-xs text-slate-800">{item.label}</div>
                  <div className="text-[11px] text-slate-500 leading-tight">{item.desc}</div>
                </div>

                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 pt-1 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => handleTestChange(item.key, 'Pass')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1 ${
                      tests[item.key] === 'Pass'
                        ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-200'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>PASS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTestChange(item.key, 'Fail')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1 ${
                      tests[item.key] === 'Fail'
                        ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-200'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
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
          <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Keputusan Final Release Shopee:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setOverallResult('Passed')}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 border transition-all ${
                  overallResult === 'Passed'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>APPROVE RELEASE (Disetujui)</span>
              </button>

              <button
                type="button"
                onClick={() => setOverallResult('Rejected')}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 border transition-all ${
                  overallResult === 'Rejected'
                    ? 'bg-red-600 text-white border-red-600 shadow-md ring-2 ring-red-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <XCircle className="w-4 h-4 flex-shrink-0" />
                <span>REJECT (Rework 48h)</span>
              </button>
            </div>
          </div>

          {/* Failure Reason Input (if rejected) */}
          {overallResult === 'Rejected' && (
            <div>
              <label className="block text-xs font-semibold text-red-600 mb-1">
                Alasan Penolakan / Cosmetic Defect <span className="text-red-500">*</span>
              </label>
              <textarea
                rows="2"
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value)}
                placeholder="Tuliskan catatan kerusakan kosmetik atau fungsionalitas yang harus diperbaiki..."
                className="w-full bg-red-50/50 border border-red-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                required
              ></textarea>
            </div>
          )}

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
              className="w-full sm:w-auto px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-600/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Memproses...</span>
              ) : (
                <>
                  <Award className="w-4 h-4" />
                  <span>Simpan Decision QC2 Shopee</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QCCheckpoint2Modal;
