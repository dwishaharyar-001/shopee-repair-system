import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  AlertTriangle, 
  FileText, 
  Edit3, 
  Upload, 
  Trash2, 
  RefreshCw,
  PackageCheck,
  UserCheck
} from 'lucide-react';
import { bastService } from '../services/bastService';
import { useAuth } from '../context/AuthContext';

const SEABastVerificationModal = ({ isOpen, onClose, bastId, onSuccess }) => {
  const { user } = useAuth();
  const [bastData, setBastData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [itemStates, setItemStates] = useState({});
  const [overallDecision, setOverallDecision] = useState('Approved');
  const [secondPartyTitle, setSecondPartyTitle] = useState('Asset PIC / QC Liaison - Shopee');
  const [signatureData, setSignatureData] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');

  // Signature Tab (upload | draw)
  const [sigTab, setSigTab] = useState('user');
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (isOpen && bastId) {
      fetchBastDetails();
    }
  }, [isOpen, bastId]);

  useEffect(() => {
    if (user?.signature_url) {
      setSignatureData(user.signature_url);
    }
  }, [user]);

  const fetchBastDetails = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await bastService.getBastById(bastId);
      if (res.success && res.data) {
        setBastData(res.data);
        
        // Initialize per-item state
        const initialItemState = {};
        (res.data.items || []).forEach(item => {
          initialItemState[item.id] = {
            verification_status: item.verification_status || 'Approved',
            verification_notes: item.verification_notes || ''
          };
        });
        setItemStates(initialItemState);
        setNotes(res.data.notes || '');
      } else {
        setError('Gagal memuat detail BAST.');
      }
    } catch (err) {
      console.error('Fetch BAST detail error:', err);
      setError('Gagal memuat dokumen BAST.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleItemStatusChange = (itemId, status) => {
    setItemStates(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        verification_status: status
      }
    }));
  };

  const handleItemNotesChange = (itemId, text) => {
    setItemStates(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        verification_notes: text
      }
    }));
  };

  // Canvas Handlers
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(
      (e.clientX || e.touches[0].clientX) - rect.left,
      (e.clientY || e.touches[0].clientY) - rect.top
    );
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineTo(
      (e.clientX || e.touches[0]?.clientX) - rect.left,
      (e.clientY || e.touches[0]?.clientY) - rect.top
    );
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (canvas) {
        setSignatureData(canvas.toDataURL('image/png'));
      }
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setSignatureData('');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Harap upload gambar valid (PNG/JPG).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setSignatureData(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitVerification = async () => {
    if (overallDecision === 'Revision_Requested' && !rejectionReason.trim()) {
      setError('Harap masukkan alasan revisi / penolakan BAST.');
      return;
    }

    const effectiveSig = signatureData || user?.signature_url || null;

    setIsSubmitting(true);
    setError('');

    try {
      const formattedItems = Object.keys(itemStates).map(id => ({
        id: parseInt(id),
        verification_status: itemStates[id].verification_status,
        verification_notes: itemStates[id].verification_notes
      }));

      const res = await bastService.verifyBastBySea(bastId, {
        items: formattedItems,
        overall_decision: overallDecision,
        second_party_title: secondPartyTitle || 'Asset PIC / QC Liaison - Shopee',
        second_party_signature: effectiveSig,
        rejection_reason: rejectionReason,
        notes
      });

      if (res && res.success) {
        if (onSuccess) onSuccess(res.message);
        onClose();
      } else {
        setError(res?.message || 'Gagal memproses verifikasi BAST.');
      }
    } catch (err) {
      console.error('Submit verification error:', err);
      setError(err.response?.data?.message || err.message || 'Terjadi kesalahan sistem saat memproses verifikasi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-2xl shadow-lg text-white">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-lg tracking-tight">Verifikasi BAST Intake Harian — QC SEA</h3>
                {bastData && (
                  <span className="px-2.5 py-0.5 rounded-md font-mono text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {bastData.bast_number}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Audit list perangkat dari Coordinator Arisa sebelum unlock distribusi ke Teknisi
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
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-semibold">Memuat data dokumen BAST...</p>
            </div>
          ) : error && !bastData ? (
            <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs text-center">
              {error}
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* BAST Meta Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dokumen & Tanggal Intake:</span>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">{bastData?.bast_number}</div>
                  <div className="text-slate-600">{bastData?.intake_date || '-'}</div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">FIRST PARTY (Coordinator Arisa):</span>
                  <div className="font-bold text-slate-900 mt-0.5">{bastData?.firstPartyUser?.full_name || 'Coordinator Arisa'}</div>
                  <div className="text-slate-500 font-mono">{bastData?.first_party_title}</div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status Saat Ini:</span>
                  <span className="inline-block mt-0.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    {bastData?.status}
                  </span>
                </div>
              </div>

              {/* ITEM-BY-ITEM VERIFICATION TABLE */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 flex items-center space-x-2">
                    <PackageCheck className="w-4 h-4 text-purple-600" />
                    <span>Daftar Perangkat untuk Diverifikasi (Per Item List)</span>
                  </h4>
                  <span className="text-[11px] font-bold text-slate-500 font-mono">
                    Total: {bastData?.items?.length || 0} Unit
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-800 text-white font-bold uppercase text-[11px]">
                        <th className="py-3 px-3.5 text-center w-10">No</th>
                        <th className="py-3 px-3.5">Asset ID & Tiket SvcID</th>
                        <th className="py-3 px-3.5">Perangkat & SN</th>
                        <th className="py-3 px-3.5">Kondisi Awal & Kelengkapan</th>
                        <th className="py-3 px-3.5 text-center w-44">Status QC SEA</th>
                        <th className="py-3 px-3.5">Catatan Verifikasi QC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(bastData?.items || []).map((item, idx) => {
                        const currentStatus = itemStates[item.id]?.verification_status || 'Approved';
                        const currentNotes = itemStates[item.id]?.verification_notes || '';

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3.5 text-center font-mono font-bold text-slate-500">{idx + 1}</td>
                            
                            <td className="py-3 px-3.5 font-mono">
                              <div className="font-bold text-blue-900">{item.serviceOrder?.device?.device_id || '-'}</div>
                              <div className="text-[10px] text-orange-600 font-bold">{item.serviceOrder?.service_id}</div>
                            </td>

                            <td className="py-3 px-3.5">
                              <div className="font-bold text-slate-800">
                                {item.serviceOrder?.device?.brand} {item.serviceOrder?.device?.model}
                              </div>
                              <div className="text-[10px] font-mono text-slate-500">
                                SN: {item.serviceOrder?.device?.serial_number}
                              </div>
                            </td>

                            <td className="py-3 px-3.5 text-slate-700">
                              <div className="font-medium text-slate-800">{item.initial_physical_condition || 'Good Condition'}</div>
                              <div className="text-[10px] text-slate-400 italic">Accessory: {item.accessories || '-'}</div>
                            </td>

                            {/* Verification Toggle */}
                            <td className="py-3 px-3.5 text-center">
                              <div className="flex items-center justify-center space-x-1 bg-slate-100 p-1 rounded-xl">
                                <button
                                  type="button"
                                  onClick={() => handleItemStatusChange(item.id, 'Approved')}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center space-x-1 ${
                                    currentStatus === 'Approved'
                                      ? 'bg-emerald-600 text-white shadow-sm'
                                      : 'text-slate-500 hover:text-slate-800'
                                  }`}
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Lolos</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleItemStatusChange(item.id, 'Rejected')}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center space-x-1 ${
                                    currentStatus === 'Rejected'
                                      ? 'bg-rose-600 text-white shadow-sm'
                                      : 'text-slate-500 hover:text-slate-800'
                                  }`}
                                >
                                  <XCircle className="w-3 h-3" />
                                  <span>Tolak</span>
                                </button>
                              </div>
                            </td>

                            {/* Item Notes */}
                            <td className="py-3 px-3.5">
                              <input
                                type="text"
                                value={currentNotes}
                                onChange={(e) => handleItemNotesChange(item.id, e.target.value)}
                                placeholder="Catatan fisik / perbedaan info (opsional)..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* OVERALL DECISION & SIGN-OFF SECTION */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 flex items-center space-x-2">
                  <UserCheck className="w-4 h-4 text-purple-600" />
                  <span>Keputusan Akhir & Sign-Off TTD Digital (Second Party - QC SEA)</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Decision Selector */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-700">Pilih Status Persetujuan Dokumen BAST:</label>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setOverallDecision('Approved')}
                        className={`p-3 rounded-xl border transition-all text-left space-y-1 ${
                          overallDecision === 'Approved'
                            ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                            : 'bg-white border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 text-emerald-800 font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Approve BAST (Full)</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight">
                          Semua info cocok. Unlock tombol distribusi ke Teknisi untuk Arisa.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setOverallDecision('Revision_Requested')}
                        className={`p-3 rounded-xl border transition-all text-left space-y-1 ${
                          overallDecision === 'Revision_Requested'
                            ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-500/20'
                            : 'bg-white border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 text-rose-800 font-bold text-xs">
                          <XCircle className="w-4 h-4 text-rose-600" />
                          <span>Minta Revisi BAST</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight">
                          Kembalikan BAST ke Coordinator Arisa untuk perbaikan/koreksi data.
                        </p>
                      </button>
                    </div>

                    {overallDecision === 'Revision_Requested' && (
                      <div className="space-y-1 pt-1">
                        <label className="block text-[11px] font-bold text-rose-800">Alasan Revisi / Penolakan (Wajib):</label>
                        <textarea
                          rows={2}
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Jelaskan ketidaksesuaian data/kondisi unit..."
                          className="w-full bg-white border border-rose-300 rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Jabatan / Position Second Party:</label>
                      <input
                        type="text"
                        value={secondPartyTitle}
                        onChange={(e) => setSecondPartyTitle(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Signature Capture Box */}
                  <div className="space-y-2 bg-white p-3.5 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700">Tanda Tangan Digital Account QC SEA:</span>
                      <div className="flex items-center space-x-1 text-[10px] font-bold text-slate-500">
                        <button
                          type="button"
                          onClick={() => setSigTab('user')}
                          className={`px-2 py-0.5 rounded ${sigTab === 'user' ? 'bg-purple-100 text-purple-800 font-bold' : ''}`}
                        >
                          Profile TTD
                        </button>
                        <button
                          type="button"
                          onClick={() => setSigTab('draw')}
                          className={`px-2 py-0.5 rounded ${sigTab === 'draw' ? 'bg-purple-100 text-purple-800 font-bold' : ''}`}
                        >
                          Gambar
                        </button>
                        <button
                          type="button"
                          onClick={() => setSigTab('upload')}
                          className={`px-2 py-0.5 rounded ${sigTab === 'upload' ? 'bg-purple-100 text-purple-800 font-bold' : ''}`}
                        >
                          Upload
                        </button>
                      </div>
                    </div>

                    {sigTab === 'draw' ? (
                      <div className="border border-slate-300 rounded-xl overflow-hidden bg-slate-50 relative">
                        <canvas
                          ref={canvasRef}
                          width={340}
                          height={120}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                          className="w-full h-28 cursor-crosshair touch-none"
                        />
                        <button
                          type="button"
                          onClick={clearCanvas}
                          className="absolute bottom-1 right-2 text-[10px] text-rose-600 font-bold hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                    ) : sigTab === 'upload' ? (
                      <label className="block border border-dashed border-slate-300 hover:border-purple-500 rounded-xl p-4 text-center cursor-pointer bg-slate-50">
                        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                        <Upload className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                        <span className="text-[11px] font-bold text-slate-700 block">Pilih Gambar TTD (PNG)</span>
                      </label>
                    ) : (
                      <div className="h-28 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-center p-2">
                        {signatureData ? (
                          <img src={signatureData} alt="Signature SEA" className="max-h-24 max-w-full object-contain" />
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Belum ada TTD profile tersimpan.</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <div className="flex-1 text-xs font-semibold text-rose-600">
            {error && (
              <div className="flex items-center space-x-1.5 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors"
            >
              Batal
            </button>

          <button
            type="button"
            onClick={handleSubmitVerification}
            disabled={isSubmitting || isLoading}
            className={`px-6 py-2.5 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-2 disabled:opacity-50 ${
              overallDecision === 'Approved'
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              {isSubmitting
                ? 'Memproses...'
                : overallDecision === 'Approved'
                ? 'Approve BAST & Unlock Distribusi'
                : 'Kirim Permintaan Revisi BAST'}
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
  );
};

export default SEABastVerificationModal;
