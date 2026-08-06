import React, { useEffect, useState } from 'react';
import { X, Printer, FileText, CheckCircle2, Shield, Laptop, Wrench, Download, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const BASTDocumentModal = ({ isOpen, onClose, orderId }) => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && orderId) {
      fetchBASTData();
    }
  }, [isOpen, orderId]);

  const fetchBASTData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.get(`/reports/bast/${orderId}`);
      if (res.data && res.data.success) {
        setData(res.data.data);
      } else {
        setError(res.data?.message || 'Gagal memuat dokumen BAST.');
      }
    } catch (err) {
      console.error('Fetch BAST error:', err);
      setError('Terjadi kesalahan saat memuat dokumen BAST.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const order = data?.order;
  const coordinator = data?.coordinator || (user?.role === 'Coordinator' ? user : null);

  // Preferred signature URL: coordinator signature -> logged in coordinator signature
  const signatureUrl = coordinator?.signature_url || (user?.role === 'Coordinator' ? user.signature_url : null);
  const coordinatorName = coordinator?.full_name || 'Coordinator Penanggung Jawab';

  // Calculate pricing summary
  const diagnosticsFee = 50000;
  const consumedParts = order?.consumedParts || [];
  const partsTotal = consumedParts.reduce((acc, curr) => acc + (parseFloat(curr.total_cost) || 0), 0);

  // Latest repair log notes & categories
  const latestLog = order?.repairLogs && order.repairLogs.length > 0
    ? [...order.repairLogs].sort((a, b) => b.id - a.id)[0]
    : null;

  let categories = [];
  if (latestLog?.repair_categories) {
    try {
      categories = typeof latestLog.repair_categories === 'string' ? JSON.parse(latestLog.repair_categories) : latestLog.repair_categories;
    } catch (e) {
      categories = [];
    }
  }

  const currentDateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'Long',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 print:shadow-none print:border-none print:w-full print:max-w-none print:my-0">
        
        {/* Top Control Header (Hidden when printing) */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white font-bold shadow-md">
              📄
            </div>
            <div>
              <h3 className="font-bold text-base">Dokumen Resmi BAST (Berita Acara Serah Terima)</h3>
              <p className="text-xs text-slate-400">Pratinjau & Cetak Dokumen Penyerahan Asset dengan Tanda Tangan Coordinator</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Download PDF BAST</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BAST Document Container (Printable Area) */}
        <div className="p-8 sm:p-12 space-y-6 text-slate-900 font-sans print:p-6 print:text-black">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-semibold">Memuat dokumen BAST...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs text-center">
              {error}
            </div>
          ) : (
            <>
              {/* Document Header */}
              <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-orange-600 text-white font-black text-xs px-2.5 py-1 rounded tracking-wider uppercase">
                      SHOPEE REPAIR
                    </span>
                    <span className="text-xs font-bold text-slate-500">Asset Management System</span>
                  </div>
                  <h1 className="text-xl font-black uppercase text-slate-900 mt-2 tracking-tight">
                    BERITA ACARA SERAH TERIMA (BAST)
                  </h1>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Nomor Dokumen: <span className="font-mono font-bold text-slate-900">BAST/{order?.service_id}/{new Date().getFullYear()}</span>
                  </p>
                </div>

                <div className="text-right text-xs">
                  <div className="font-bold text-slate-800">{order?.branch?.name || 'Cabang Shopee Central'}</div>
                  <div className="text-slate-500 text-[11px] max-w-xs mt-0.5">{order?.branch?.address || 'Pusat Service & Perbaikan Perangkat Shopee'}</div>
                  <div className="font-mono text-slate-600 text-[11px] mt-1">Tanggal: {currentDateStr}</div>
                </div>
              </div>

              {/* Information Grid: Customer & Device */}
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs print:bg-white print:border-slate-300">
                <div className="space-y-1.5">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">INFORMASI PELANGGAN / KLIEN:</span>
                  <div className="font-bold text-slate-900 text-sm">{order?.customer?.name}</div>
                  <div className="text-slate-600">Kode Klien: <span className="font-mono font-semibold text-slate-800">{order?.customer?.customer_code || '-'}</span></div>
                  <div className="text-slate-600">Email/Telp: <span className="font-medium text-slate-800">{order?.customer?.email || order?.customer?.phone || '-'}</span></div>
                </div>

                <div className="space-y-1.5 border-l border-slate-200 pl-6 print:border-slate-300">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">INFORMASI PERANGKAT & TIKET:</span>
                  <div className="font-bold text-slate-900 text-sm">{order?.device?.brand} {order?.device?.model}</div>
                  <div className="text-slate-600">Serial Number (SN): <span className="font-mono font-bold text-slate-900">{order?.device?.serial_number}</span></div>
                  <div className="text-slate-600">Tiket Service ID: <span className="font-mono font-bold text-orange-600">{order?.service_id}</span></div>
                  <div className="text-slate-600">Kategori Asset: <span className="font-semibold text-slate-800">{order?.device?.asset_type}</span></div>
                </div>
              </div>

              {/* Repair Summary & Fault Description */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">
                  1. Ringkasan Kerusakan & Tindakan Perbaikan
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-200 print:bg-white print:border-slate-300">
                    <span className="font-bold text-amber-900 block mb-1">Keluhan Kerusakan Awal:</span>
                    <p className="text-slate-700 leading-relaxed font-medium">{order?.fault_description || '-'}</p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 print:bg-white print:border-slate-300">
                    <span className="font-bold text-slate-900 block mb-1">Tindakan Perbaikan (Action Taken):</span>
                    <p className="text-slate-700 leading-relaxed font-medium">{latestLog?.action_taken || 'Perbaikan fungsional dan pengujian QC selesai.'}</p>
                  </div>
                </div>
              </div>

              {/* Consumed Spare Parts Table */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">
                  2. Rincian Penggantian Spare Part & Komponen
                </h3>

                <table className="w-full text-left text-xs border-collapse border border-slate-200 print:border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase print:bg-slate-50">
                      <th className="py-2 px-3 border-r border-slate-200">No.</th>
                      <th className="py-2 px-3 border-r border-slate-200">Part Number</th>
                      <th className="py-2 px-3 border-r border-slate-200">Nama Spare Part / Komponen</th>
                      <th className="py-2 px-3 text-center border-r border-slate-200">Qty</th>
                      <th className="py-2 px-3 text-right">Biaya (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {consumedParts.length > 0 ? (
                      consumedParts.map((item, idx) => (
                        <tr key={item.id}>
                          <td className="py-2 px-3 font-mono text-center border-r border-slate-200">{idx + 1}</td>
                          <td className="py-2 px-3 font-mono font-bold border-r border-slate-200">{item.part?.part_number}</td>
                          <td className="py-2 px-3 border-r border-slate-200">{item.part?.name}</td>
                          <td className="py-2 px-3 text-center font-mono border-r border-slate-200">{item.quantity}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold">
                            Rp {parseFloat(item.total_cost).toLocaleString('id-ID')}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="py-3 px-3 text-center text-slate-500 italic">
                          Tidak ada penggantian spare part (Perbaikan software / jasad karsa).
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Notice & Warranty statement */}
              <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl text-[11px] text-blue-900 leading-relaxed print:bg-white print:border-slate-300">
                <strong>Pernyataan & Garansi Perbaikan:</strong> Dengan ditandatanganinya Berita Acara Serah Terima (BAST) ini, pihak Pelanggan/Klien menyatakan telah memeriksa dan menerima unit perangkat dalam kondisi baik dan berfungsi normal sesuai hasil uji QC. Garansi perbaikan berlaku selama 30 hari kalender sejak tanggal serah terima.
              </div>

              {/* ========================================================================= */}
              {/* SIGN-OFF SECTION (CRITICAL: COORDINATOR SIGNATURE PLACED ABOVE NAME)      */}
              {/* ========================================================================= */}
              <div className="pt-6 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 text-center border-b border-slate-200 pb-2">
                  PERSETUJUAN & SERAH TERIMA (SIGN-OFF)
                </h3>

                <div className="grid grid-cols-3 gap-6 text-center text-xs pt-2">
                  {/* Column 1: Customer */}
                  <div className="flex flex-col justify-between h-44 border border-slate-200 rounded-xl p-3 print:border-slate-300">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                      Yang Menerima (Customer/Klien)
                    </span>
                    
                    {/* Empty box for physical customer signature */}
                    <div className="h-24 flex items-center justify-center text-slate-300 italic text-[10px]">
                      ( Tanda Tangan Customer )
                    </div>

                    <div className="border-t border-slate-300 pt-1.5 font-bold text-slate-900">
                      {order?.customer?.name || 'Customer'}
                    </div>
                  </div>

                  {/* Column 2: QA Inspector */}
                  <div className="flex flex-col justify-between h-44 border border-slate-200 rounded-xl p-3 print:border-slate-300">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                      Yang Memeriksa (QA Inspector)
                    </span>
                    
                    <div className="h-24 flex items-center justify-center text-emerald-700 font-bold text-xs flex-col space-y-1">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                      <span className="text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">VERIFIED QC PASSED</span>
                    </div>

                    <div className="border-t border-slate-300 pt-1.5 font-bold text-slate-900">
                      QA Inspector Shopee
                    </div>
                  </div>

                  {/* Column 3: Coordinator (SIGNATURE PLACED ABOVE NAME) */}
                  <div className="flex flex-col justify-between h-44 border border-blue-200 bg-blue-50/20 rounded-xl p-3 print:border-slate-300 print:bg-white">
                    <span className="font-bold text-blue-950 uppercase tracking-wider text-[10px] print:text-black">
                      Diserahkan Oleh (Coordinator)
                    </span>
                    
                    {/* SIGNATURE IMAGE PLACED ABOVE NAME */}
                    <div className="h-24 flex items-center justify-center px-2 relative">
                      {signatureUrl ? (
                        <img
                          src={signatureUrl}
                          alt={`Tanda Tangan ${coordinatorName}`}
                          className="max-h-20 max-w-full object-contain mx-auto"
                        />
                      ) : (
                        <div className="text-amber-700 text-[10px] italic border border-dashed border-amber-300 rounded p-2 bg-amber-50/60 print:border-slate-300">
                          (Belum Mengunggah TTD Coordinator)
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-300 pt-1.5 font-bold text-slate-900">
                      {coordinatorName}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer info (Hidden when printing) */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center text-xs print:hidden">
          <div className="text-slate-500">
            {signatureUrl ? (
              <span className="text-emerald-700 font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Tanda tangan Coordinator terpasang otomatis di atas nama.</span>
              </span>
            ) : (
              <span className="text-amber-700 font-semibold flex items-center space-x-1">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Coordinator belum mengunggah tanda tangan. Gunakan tombol 'Tanda Tangan' di navigasi atas.</span>
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Tutup Pratinjau
          </button>
        </div>
      </div>
    </div>
  );
};

export default BASTDocumentModal;
