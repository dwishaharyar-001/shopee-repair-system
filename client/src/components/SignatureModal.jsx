import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, FileText, CheckCircle2, Trash2, Edit3, Image as ImageIcon } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const SignatureModal = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [signatureData, setSignatureData] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'draw'

  // Canvas state for drawing
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (isOpen && user?.signature_url) {
      setSignatureData(user.signature_url);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  // File Upload Handler (Image to Data URL)
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Harap pilih file gambar (PNG, JPG, WEBP, SVG).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Ukuran file maksimal 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSignatureData(event.target.result);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  // Canvas Drawing Handlers
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
    ctx.strokeStyle = '#0f172a'; // slate-900
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

  const handleSave = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const res = await api.post('/auth/signature', {
        signature_url: signatureData || null
      });

      if (res.data && res.data.success) {
        if (onSuccess) onSuccess(res.data.message);
        onClose();
        window.location.reload();
      } else {
        setError(res.data.message || 'Gagal menyimpan tanda tangan.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan tanda tangan Coordinator.');
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
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md">
              ✍️
            </div>
            <div>
              <h3 className="font-bold text-base">Tanda Tangan Digital ({user?.role === 'QA_Liaison' ? 'QC Shopee' : user?.role})</h3>
              <p className="text-xs text-slate-400">Upload / Buat tanda tangan digital untuk Sign-off BAST</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
              {error}
            </div>
          )}

          {/* Mode Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'upload' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Gambar TTD</span>
            </button>
            <button
              onClick={() => setActiveTab('draw')}
              className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'draw' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Gambar di Layar (Canvas)</span>
            </button>
          </div>

          {/* Tab 1: Upload File */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <label className="block border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50 hover:bg-blue-50/50">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/svg+xml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="font-bold text-xs text-slate-800 block">Klik untuk memilih file Tanda Tangan</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Format PNG (transparan disarankan), JPG, WEBP (Max 2MB)</span>
              </label>
            </div>
          )}

          {/* Tab 2: Canvas Draw */}
          {activeTab === 'draw' && (
            <div className="space-y-2 text-center">
              <div className="border-2 border-slate-300 rounded-2xl overflow-hidden bg-slate-50 relative">
                <canvas
                  ref={canvasRef}
                  width={420}
                  height={160}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-40 cursor-crosshair touch-none"
                />
                <span className="absolute bottom-2 left-3 text-[10px] text-slate-400 font-mono">Goreskan tanda tangan di atas</span>
              </div>
              <button
                type="button"
                onClick={clearCanvas}
                className="text-xs text-rose-600 hover:underline font-semibold flex items-center justify-center space-x-1 mx-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bersihkan Kanvas</span>
              </button>
            </div>
          )}

          {/* Signature Preview Box */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Preview Tanda Tangan Digital:</span>
            {signatureData ? (
              <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-center h-28 relative">
                <img
                  src={signatureData}
                  alt="Signature Preview"
                  className="max-h-24 max-w-full object-contain"
                />
                <button
                  type="button"
                  onClick={() => setSignatureData('')}
                  className="absolute top-2 right-2 p-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                  title="Hapus Tanda Tangan"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="bg-slate-100 border border-dashed border-slate-300 rounded-xl p-6 text-center text-slate-400 text-xs italic">
                Belum ada tanda tangan terpilih.
              </div>
            )}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center space-x-1.5 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Memproses...' : 'Simpan Tanda Tangan'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignatureModal;
