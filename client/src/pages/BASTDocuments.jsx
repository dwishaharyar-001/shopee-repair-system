import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  FileText, 
  Printer, 
  Calendar, 
  Filter, 
  CheckCircle2, 
  User, 
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  PackageCheck,
  PackageX,
  Send,
  AlertCircle,
  Clock
} from 'lucide-react';
import api from '../services/api';
import { bastService } from '../services/bastService';
import { useAuth } from '../context/AuthContext';
import SEABastVerificationModal from '../components/SEABastVerificationModal';
import SignatureModal from '../components/SignatureModal';

const BASTDocuments = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialType = searchParams.get('type') || '1';

  // Sub-menu state: '1' (Shopee->Arisa), '2' (Arisa->Shopee), '3' (Used Spare Parts)
  const [bastType, setBastType] = useState(initialType);
  const [bastNo, setBastNo] = useState(`BAST/SHP-ARS/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/001`);

  // Date Filters
  const [intakeDate, setIntakeDate] = useState(new Date().toISOString().slice(0, 10));
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  // User Dropdowns & Signatures
  const [allUsers, setAllUsers] = useState([]);
  const [firstPartyPicId, setFirstPartyPicId] = useState('');
  const [firstPartyTitle, setFirstPartyTitle] = useState('');
  const [firstPartyLocation, setFirstPartyLocation] = useState('Shopee Warehouse / Workshop Central');

  const [secondPartyPicId, setSecondPartyPicId] = useState('');
  const [secondPartyTitle, setSecondPartyTitle] = useState('');
  const [secondPartyLocation, setSecondPartyLocation] = useState('Arisa Computer Service Center');

  const { user } = useAuth();

  // Data State
  const [reportItems, setReportItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // BAST Workflow State & Verification Modals
  const [currentBastRecord, setCurrentBastRecord] = useState(null);
  const [isSeaVerificationOpen, setIsSeaVerificationOpen] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isSubmittingBast, setIsSubmittingBast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [bastType, intakeDate, startDate, endDate]);

  const handleTabChange = (type) => {
    setBastType(type);
    setSearchParams({ type });
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/menu/users');
      if (res.data && res.data.success) {
        setAllUsers(res.data.data);
      }
    } catch (err) {
      console.error('Fetch users error:', err);
    }
  };

  // Filter PIC options based on role and BAST process type
  const picClientUsers = allUsers.filter(u => 
    u.role === 'QA_Liaison' || u.qc_affiliation === 'Client' || u.role === 'Admin'
  );

  const picArisaUsers = allUsers.filter(u => 
    u.role === 'Coordinator' || u.role === 'Technician' || u.role === 'Admin'
  );

  // Set default PIC selections when sub-menu tab changes
  useEffect(() => {
    if (bastType === '1') {
      // Client -> Arisa: First Party = Client, Second Party = Arisa
      if (picClientUsers.length > 0) {
        setFirstPartyPicId(picClientUsers[0].id);
        setFirstPartyTitle('Asset PIC - Client');
        setFirstPartySignature(picClientUsers[0].signature_url || '');
      }
      if (picArisaUsers.length > 0) {
        setSecondPartyPicId(picArisaUsers[0].id);
        setSecondPartyTitle('Arisa Computer Team');
        setSecondPartySignature(picArisaUsers[0].signature_url || '');
      }
    } else {
      // Arisa -> Client / Used Parts: First Party = Arisa, Second Party = Client
      if (picArisaUsers.length > 0) {
        setFirstPartyPicId(picArisaUsers[0].id);
        setFirstPartyTitle('Arisa Computer Team');
        setFirstPartySignature(picArisaUsers[0].signature_url || '');
      }
      if (picClientUsers.length > 0) {
        setSecondPartyPicId(picClientUsers[0].id);
        setSecondPartyTitle('Asset PIC - Client');
        setSecondPartySignature(picClientUsers[0].signature_url || '');
      }
    }
  }, [bastType, allUsers]);

  const fetchReportData = async () => {
    setIsLoading(true);
    setError('');
    try {
      let endpoint = '';
      let params = {};

      if (bastType === '1') {
        endpoint = '/reports/bast-report/intake-daily';
        params = { date: intakeDate };
      } else if (bastType === '2') {
        endpoint = '/reports/bast-report/completed-weekly';
        params = { startDate, endDate };
      } else if (bastType === '3') {
        endpoint = '/reports/bast-report/used-parts-weekly';
        params = { startDate, endDate };
      }

      const res = await api.get(endpoint, { params });
      if (res.data && res.data.success) {
        setReportItems(res.data.data.items || []);
      }
    } catch (err) {
      console.error('Fetch BAST report error:', err);
      setError('Gagal memuat data laporan BAST.');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if BAST document already exists in DB for this date/no
  useEffect(() => {
    if (bastType === '1') {
      fetchActiveBastRecord();
    } else {
      setCurrentBastRecord(null);
    }
  }, [bastType, intakeDate]);

  const fetchActiveBastRecord = async () => {
    try {
      const res = await bastService.getBastHistory({ bast_type: '1' });
      if (res.success && res.data) {
        const match = res.data.find(b => b.intake_date === intakeDate || b.bast_number === bastNo);
        setCurrentBastRecord(match || null);
      }
    } catch (e) {
      console.warn('Fetch active BAST record error:', e);
    }
  };

  const handleSubmitBastToSea = async (overrideSignature = null) => {
    if (!reportItems || reportItems.length === 0) {
      setError('Tidak ada data unit intake harian yang dapat dikirim ke BAST.');
      return;
    }

    const signatureString = (typeof overrideSignature === 'string' && overrideSignature.trim()) 
      ? overrideSignature 
      : (typeof firstPartySignature === 'string' && firstPartySignature.trim()) 
      ? firstPartySignature 
      : null;

    if (!signatureString) {
      setIsSignatureModalOpen(true);
      return;
    }

    setIsSubmittingBast(true);
    setError('');

    try {
      // Map service order IDs from reportItems
      const serviceOrderIds = reportItems
        .map(i => i.id || i.service_order_id)
        .filter(Boolean);

      const res = await bastService.createBast({
        bast_number: bastNo,
        bast_type: '1',
        intake_date: intakeDate,
        service_order_ids: serviceOrderIds,
        first_party_title: firstPartyTitle || 'Arisa Computer Team',
        first_party_signature: signatureString
      });

      if (res && res.success) {
        showToast(`Dokumen BAST '${res.data.bast_number}' berhasil dibuat dan dikirim ke QC SEA!`);
        setCurrentBastRecord(res.data);
        fetchReportData();
      } else {
        const errorDetail = res?.message || res?.error || 'Gagal merespons data BAST';
        setError(`Gagal mengirim BAST: ${errorDetail}`);
      }
    } catch (err) {
      console.error('Submit BAST error:', err);
      const serverMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Error koneksi server';
      setError(`Gagal membuat dan mengirim BAST ke QC SEA: ${serverMsg}`);
    } finally {
      setIsSubmittingBast(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Find selected PIC user objects for signatures
  const firstPartyUser = allUsers.find(u => String(u.id) === String(firstPartyPicId));
  const secondPartyUser = allUsers.find(u => String(u.id) === String(secondPartyPicId));

  const firstPartySignature = firstPartyUser?.signature_url || null;
  const secondPartySignature = secondPartyUser?.signature_url || null;

  // Date formatted strings
  const targetDateObj = bastType === '1' ? new Date(intakeDate) : new Date(endDate);
  const dateDay = targetDateObj.toLocaleDateString('id-ID', { weekday: 'long' });
  const dateNum = targetDateObj.getDate();
  const monthName = targetDateObj.toLocaleDateString('id-ID', { month: 'long' });
  const yearNum = targetDateObj.getFullYear();

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 text-xs flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Banner (Hidden during printing) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl print:hidden">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-2xl shadow-lg shadow-orange-500/20 text-white">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-extrabold tracking-tight">Dokumen BAST Handover Certificate</h1>
              {currentBastRecord && (
                <span className={`px-2.5 py-0.5 rounded-full font-mono text-xs font-bold border ${
                  currentBastRecord.status === 'Approved_SEA' 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : currentBastRecord.status === 'Revision_Requested'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  Status: {currentBastRecord.status === 'Submitted_to_SEA' ? 'Menunggu QC SEA' : currentBastRecord.status}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Generate dokumen BAST Intake Harian Arisa ➔ Shopee & Verifikasi Persetujuan QC SEA
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Submit BAST to SEA (Coordinator Arisa) */}
          {bastType === '1' && (
            <button
              onClick={() => handleSubmitBastToSea()}
              disabled={isSubmittingBast}
              className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 border border-orange-400 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmittingBast ? 'Mengirim...' : 'Submit & Sign BAST ke QC SEA'}</span>
            </button>
          )}

          {/* Verifikasi BAST (QC SEA) */}
          {currentBastRecord && (user?.role === 'QA_Liaison' || user?.role === 'Admin' || user?.qc_affiliation === 'Shopee') && (
            <button
              onClick={() => setIsSeaVerificationOpen(true)}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 border border-purple-500"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Verifikasi BAST (QC SEA)</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 border border-emerald-500"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Save PDF BAST</span>
          </button>
        </div>
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-semibold flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-800 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* SUB-MENU NAV TABS (Pemisahan 3 Sub-Menu Sesuai Peruntukan Proses) */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {/* Sub-Menu 1 */}
          <button
            onClick={() => handleTabChange('1')}
            className={`p-4 rounded-xl transition-all text-left flex items-start space-x-3 border ${
              bastType === '1'
                ? 'bg-orange-50 border-orange-300 ring-2 ring-orange-500/20'
                : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100'
            }`}
          >
            <div className={`p-2.5 rounded-lg ${bastType === '1' ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className={`text-xs font-bold uppercase tracking-wider ${bastType === '1' ? 'text-orange-950' : 'text-slate-700'}`}>
                  1. Handover Client ➔ Arisa
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Akumulasi Device Intake Per Hari (`Handover Client to Arisa.pdf`)</p>
            </div>
          </button>

          {/* Sub-Menu 2 */}
          <button
            onClick={() => handleTabChange('2')}
            className={`p-4 rounded-xl transition-all text-left flex items-start space-x-3 border ${
              bastType === '2'
                ? 'bg-cyan-50 border-cyan-300 ring-2 ring-cyan-500/20'
                : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100'
            }`}
          >
            <div className={`p-2.5 rounded-lg ${bastType === '2' ? 'bg-cyan-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className={`text-xs font-bold uppercase tracking-wider ${bastType === '2' ? 'text-cyan-950' : 'text-slate-700'}`}>
                  2. Handover Arisa ➔ Client
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Akumulasi Unit Return Selesai Perbaikan Pekanan (`Handover Arisa to Client.pdf`)</p>
            </div>
          </button>

          {/* Sub-Menu 3 */}
          <button
            onClick={() => handleTabChange('3')}
            className={`p-4 rounded-xl transition-all text-left flex items-start space-x-3 border ${
              bastType === '3'
                ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20'
                : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100'
            }`}
          >
            <div className={`p-2.5 rounded-lg ${bastType === '3' ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
              <PackageX className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className={`text-xs font-bold uppercase tracking-wider ${bastType === '3' ? 'text-rose-950' : 'text-slate-700'}`}>
                  3. Handover Used Spare Part
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Akumulasi Part Rusak Hasil Perbaikan Pekanan (`Handover used Sparepart.pdf`)</p>
            </div>
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS & HEADER PARAMETERS FORM (Hidden during printing) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs print:hidden">
        <h3 className="font-bold text-sm text-slate-800 flex items-center space-x-2 border-b border-slate-100 pb-2">
          <span>⚙️ Pengaturan Header & Parameter Dokumen ({bastType === '1' ? 'Daily Intake' : bastType === '2' ? 'Weekly Return' : 'Weekly Used Parts'})</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* BAST Number */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nomor Dokumen BAST:</label>
            <input
              type="text"
              value={bastNo}
              onChange={(e) => setBastNo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Date Filters */}
          {bastType === '1' ? (
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tanggal Intake (Harian):</label>
              <input
                type="date"
                value={intakeDate}
                onChange={(e) => setIntakeDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tanggal Mulai (Start Date):</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tanggal Akhir (End Date):</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </>
          )}

          {/* Refresh Button */}
          <div className="flex items-end">
            <button
              onClick={fetchReportData}
              className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Muat Ulang Data</span>
            </button>
          </div>
        </div>

        {/* PIC Selectors & Titles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
          {/* FIRST PARTY */}
          <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200/80 space-y-2">
            <span className="font-bold text-blue-950 uppercase tracking-wider text-[11px] block">
              FIRST PARTY (Handing Over) — {bastType === '1' ? 'PIC Shopee' : 'PIC Arisa Computer'}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Nama PIC:</label>
                <select
                  value={firstPartyPicId}
                  onChange={(e) => setFirstPartyPicId(e.target.value)}
                  className="w-full bg-white border border-blue-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                >
                  <option value="">-- Pilih PIC First Party --</option>
                  {(bastType === '1' ? picShopeeUsers : picArisaUsers).map(u => (
                    <option key={u.id} value={u.id}>
                      👤 {u.full_name} ({u.role}{u.qc_affiliation ? ` - ${u.qc_affiliation}` : ''})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Jabatan / Position:</label>
                <input
                  type="text"
                  value={firstPartyTitle}
                  onChange={(e) => setFirstPartyTitle(e.target.value)}
                  className="w-full bg-white border border-blue-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* SECOND PARTY */}
          <div className="p-3.5 bg-orange-50/50 rounded-xl border border-orange-200/80 space-y-2">
            <span className="font-bold text-orange-950 uppercase tracking-wider text-[11px] block">
              SECOND PARTY (Receiving) — {bastType === '1' ? 'PIC Arisa Computer' : 'PIC Shopee'}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Nama PIC:</label>
                <select
                  value={secondPartyPicId}
                  onChange={(e) => setSecondPartyPicId(e.target.value)}
                  className="w-full bg-white border border-orange-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                >
                  <option value="">-- Pilih PIC Second Party --</option>
                  {(bastType === '1' ? picArisaUsers : picShopeeUsers).map(u => (
                    <option key={u.id} value={u.id}>
                      👤 {u.full_name} ({u.role}{u.qc_affiliation ? ` - ${u.qc_affiliation}` : ''})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Jabatan / Position:</label>
                <input
                  type="text"
                  value={secondPartyTitle}
                  onChange={(e) => setSecondPartyTitle(e.target.value)}
                  className="w-full bg-white border border-orange-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PRINTABLE OFFICIAL BAST SHEET CONTAINER */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-8 sm:p-12 space-y-6 text-slate-900 font-sans print:p-6 print:text-black print:border-none print:shadow-none print:my-0">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-semibold">Memuat dokumen sertifikat BAST...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs text-center">
            {error}
          </div>
        ) : (
          <>
            {/* Header Company & Certificate Title */}
            <div className="text-center space-y-1 pb-4 border-b-2 border-slate-900">
              <h2 className="text-xl font-bold tracking-tight uppercase text-blue-900">ARISA COMPUTER</h2>
              <p className="text-xs text-slate-500 italic">Laptop Repair Service Partner</p>
              <h1 className="text-lg font-black uppercase text-slate-900 pt-2 tracking-wide">
                HANDOVER CERTIFICATE (BAST)
              </h1>
              <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider">
                {bastType === '1' 
                  ? 'UNIT HANDOVER FOR REPAIR WORK (SHOPEE → ARISA COMPUTER)' 
                  : bastType === '2' 
                  ? 'UNIT RETURN HANDOVER (ARISA COMPUTER → SHOPEE)' 
                  : 'HANDOVER OF USED SPARE PARTS'}
              </h3>
              <p className="text-xs font-mono font-bold text-slate-800 pt-1">
                BAST No.: <span className="border-b border-slate-800 px-3">{bastNo}</span>
              </p>
            </div>

            {/* Statement Description */}
            <p className="text-xs leading-relaxed text-slate-800">
              On this day, <span className="font-semibold underline">{dateDay}</span> date <span className="font-semibold underline">{dateNum}</span> month <span className="font-semibold underline">{monthName}</span> year <span className="font-semibold underline">{yearNum}</span>, the undersigned parties have carried out the handover of {bastType === '3' ? 'used/old spare parts resulting from component replacement during laptop unit repair' : 'laptop units'} {bastType === '1' ? 'from Shopee to Arisa Computer, to be worked on at the Shopee workshop' : 'from Arisa Computer to Shopee'}, with the following details:
            </p>

            {/* FIRST PARTY & SECOND PARTY DETAILS */}
            <div className="space-y-4 text-xs">
              {/* FIRST PARTY */}
              <div className="space-y-1">
                <h4 className="font-bold uppercase tracking-wider text-slate-900">FIRST PARTY (Handing Over)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pl-4">
                  <div>
                    <span className="font-semibold text-slate-600 block">Name :</span>
                    <span className="font-bold text-slate-900">{firstPartyUser?.full_name || '___________________________'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600 block">
                      {bastType === '1' ? 'Position / Asset PIC :' : 'Position / Arisa Computer Team :'}
                    </span>
                    <span className="font-bold text-slate-900">{firstPartyTitle || (bastType === '1' ? 'Asset PIC - Shopee' : 'Arisa Computer Team')}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600 block">
                      {bastType === '1' ? 'Shopee Location :' : 'Work Location :'}
                    </span>
                    <span className="font-bold text-slate-900">{firstPartyLocation}</span>
                  </div>
                </div>
              </div>

              {/* SECOND PARTY */}
              <div className="space-y-1">
                <h4 className="font-bold uppercase tracking-wider text-slate-900">SECOND PARTY (Receiving)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pl-4">
                  <div>
                    <span className="font-semibold text-slate-600 block">Name :</span>
                    <span className="font-bold text-slate-900">{secondPartyUser?.full_name || '___________________________'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600 block">
                      {bastType === '1' ? 'Position / Arisa Computer Team :' : 'Position / Asset PIC :'}
                    </span>
                    <span className="font-bold text-slate-900">{secondPartyTitle || (bastType === '1' ? 'Arisa Computer Team' : 'Asset PIC - Shopee')}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600 block">
                      {bastType === '1' ? 'Work Location :' : 'Shopee Location :'}
                    </span>
                    <span className="font-bold text-slate-900">{secondPartyLocation}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* TABLE DATA DETAILS */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                {bastType === '1' ? 'Unit Details Handed Over' : bastType === '2' ? 'Returned Unit Details' : 'Used Spare Parts Details'}
                {bastType !== '1' && <span className="font-normal text-slate-500 font-mono text-[11px] lowercase"> (periode: {startDate} s/d {endDate})</span>}
              </h4>

              <table className="w-full text-left text-xs border-collapse border border-slate-300 print:border-black">
                <thead>
                  <tr className="bg-slate-800 text-white font-bold uppercase print:bg-slate-200 print:text-black">
                    <th className="py-2 px-3 border border-slate-300 text-center w-12">No</th>
                    {bastType === '1' ? (
                      <>
                        <th className="py-2 px-3 border border-slate-300">Asset ID</th>
                        <th className="py-2 px-3 border border-slate-300">Asset Tag</th>
                        <th className="py-2 px-3 border border-slate-300">Brand & Model</th>
                        <th className="py-2 px-3 border border-slate-300">Initial Physical Condition</th>
                        <th className="py-2 px-3 border border-slate-300">Accessories (Charger/Bag/etc.)</th>
                      </>
                    ) : bastType === '2' ? (
                      <>
                        <th className="py-2 px-3 border border-slate-300">Asset ID</th>
                        <th className="py-2 px-3 border border-slate-300">Service Order ID</th>
                        <th className="py-2 px-3 border border-slate-300">Repair Type</th>
                        <th className="py-2 px-3 border border-slate-300">Final Status</th>
                        <th className="py-2 px-3 border border-slate-300 text-center">QC Result</th>
                      </>
                    ) : (
                      <>
                        <th className="py-2 px-3 border border-slate-300">Asset ID</th>
                        <th className="py-2 px-3 border border-slate-300">Spare Part Name</th>
                        <th className="py-2 px-3 border border-slate-300 text-center">Quantity</th>
                        <th className="py-2 px-3 border border-slate-300">Condition</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 print:divide-slate-400">
                  {reportItems.length > 0 ? (
                    reportItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 border border-slate-300 text-center font-mono">{idx + 1}</td>
                        {bastType === '1' ? (
                          <>
                            <td className="py-2 px-3 border border-slate-300 font-mono font-bold text-blue-900">{item.asset_id}</td>
                            <td className="py-2 px-3 border border-slate-300 font-mono">{item.asset_tag}</td>
                            <td className="py-2 px-3 border border-slate-300 font-semibold">{item.brand_model}</td>
                            <td className="py-2 px-3 border border-slate-300 text-slate-700">{item.initial_physical_condition}</td>
                            <td className="py-2 px-3 border border-slate-300 text-slate-700">{item.accessories}</td>
                          </>
                        ) : bastType === '2' ? (
                          <>
                            <td className="py-2 px-3 border border-slate-300 font-mono font-bold text-blue-900">{item.asset_id}</td>
                            <td className="py-2 px-3 border border-slate-300 font-mono text-orange-700 font-bold">{item.service_id}</td>
                            <td className="py-2 px-3 border border-slate-300">{item.repair_type}</td>
                            <td className="py-2 px-3 border border-slate-300 font-semibold text-emerald-800">{item.final_status}</td>
                            <td className="py-2 px-3 border border-slate-300 text-center font-bold text-emerald-700">{item.qc_result}</td>
                          </>
                        ) : (
                          <>
                            <td className="py-2 px-3 border border-slate-300 font-mono font-bold text-blue-900">{item.asset_id}</td>
                            <td className="py-2 px-3 border border-slate-300 font-semibold text-slate-800">{item.spare_part_name}</td>
                            <td className="py-2 px-3 border border-slate-300 text-center font-mono font-bold">{item.quantity}</td>
                            <td className="py-2 px-3 border border-slate-300 text-rose-800 font-medium">{item.condition}</td>
                          </>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={bastType === '1' ? "6" : bastType === '2' ? "6" : "5"} className="py-4 px-3 text-center text-slate-400 italic border border-slate-300">
                        Tidak ada data {bastType === '1' ? 'intake harian' : bastType === '2' ? 'pengembalian unit' : 'spare part rusak'} terdaftar pada filter ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Notes / Additional Remarks Box */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1 text-[11px] text-slate-700 print:bg-white print:border-slate-300">
              <span className="font-bold text-slate-900 block mb-1">Notes / Additional Remarks:</span>
              {bastType === '1' ? (
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Physical condition & completeness have been jointly verified before the unit is handed over for work at the Shopee workshop.</li>
                  <li>Detailed condition of each component (per unit) is recorded in the Attachment - Unit Physical Condition Checklist, 'Condition Upon Receipt' section.</li>
                  <li>This document serves as official evidence that responsibility for the unit's repair has transferred to Arisa Computer.</li>
                </ul>
              ) : bastType === '2' ? (
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Final Status options: Repaired / No Repair Needed / Cannot Be Repaired (Write-off).</li>
                  <li>The unit has passed Quality Control (QC) and its physical condition & completeness have been re-verified before being handed over.</li>
                  <li>Detailed condition of each component (per unit) is recorded in the Attachment - Unit Physical Condition Checklist, 'Condition Upon Return' section.</li>
                  <li>Before/after photo documentation and detailed reports are attached separately per the Asset List.</li>
                </ul>
              ) : (
                <ul className="list-disc list-inside space-y-0.5">
                  <li>The used spare parts handed over are the result of component replacement during repair and are not used/retained by Arisa Computer.</li>
                  <li>The quantity and type of spare parts have been verified against the Asset List prior to handover.</li>
                </ul>
              )}
            </div>

            {/* Good Faith Statement & SIGN-OFF BOXES WITH DIGITAL SIGNATURES */}
            <div className="pt-2 space-y-4 text-xs">
              <p className="text-[11px] text-slate-700 italic">
                This Handover Certificate is made in good faith and signed by both parties without coercion from any party, to be used as appropriate.
              </p>

              <div className="grid grid-cols-2 gap-8 border border-slate-300 rounded-xl overflow-hidden print:border-black">
                {/* FIRST PARTY SIGN BOX */}
                <div className="p-4 text-center space-y-2 border-r border-slate-300 print:border-black flex flex-col justify-between h-44">
                  <div>
                    <h5 className="font-bold uppercase tracking-wider text-slate-900">FIRST PARTY</h5>
                    <p className="text-[11px] text-slate-500 italic font-serif">
                      {bastType === '1' ? 'Asset PIC - Shopee' : 'Arisa Computer Team'}
                    </p>
                  </div>

                  {/* DIGITAL SIGNATURE IMAGE RENDER */}
                  <div className="h-16 flex items-center justify-center px-4">
                    {firstPartySignature ? (
                      <img
                        src={firstPartySignature}
                        alt="Tanda Tangan First Party"
                        className="max-h-14 max-w-full object-contain mx-auto"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400 italic border border-dashed border-slate-300 rounded px-3 py-1">
                        (Belum Ada Tanda Tangan)
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="font-mono text-slate-900 font-bold">
                      ( <span className="underline px-2">{firstPartyUser?.full_name || 'Name & Signature'}</span> )
                    </p>
                    <span className="text-[10px] text-slate-500 font-mono">Name & Signature</span>
                  </div>
                </div>

                {/* SECOND PARTY SIGN BOX */}
                <div className="p-4 text-center space-y-2 flex flex-col justify-between h-44">
                  <div>
                    <h5 className="font-bold uppercase tracking-wider text-slate-900">SECOND PARTY</h5>
                    <p className="text-[11px] text-slate-500 italic font-serif">
                      {bastType === '1' ? 'Arisa Computer Team' : 'Asset PIC - Shopee'}
                    </p>
                  </div>

                  {/* DIGITAL SIGNATURE IMAGE RENDER */}
                  <div className="h-16 flex items-center justify-center px-4">
                    {secondPartySignature ? (
                      <img
                        src={secondPartySignature}
                        alt="Tanda Tangan Second Party"
                        className="max-h-14 max-w-full object-contain mx-auto"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400 italic border border-dashed border-slate-300 rounded px-3 py-1">
                        (Belum Ada Tanda Tangan)
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="font-mono text-slate-900 font-bold">
                      ( <span className="underline px-2">{secondPartyUser?.full_name || 'Name & Signature'}</span> )
                    </p>
                    <span className="text-[10px] text-slate-500 font-mono">Name & Signature</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* BAST Verification & Signature Modals */}
      <SEABastVerificationModal
        isOpen={isSeaVerificationOpen}
        onClose={() => setIsSeaVerificationOpen(false)}
        bastId={currentBastRecord?.id}
        onSuccess={(msg) => {
          showToast(msg);
          fetchActiveBastRecord();
          fetchReportData();
        }}
      />

      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSuccess={async (msg, sigUrl) => {
          showToast(msg);
          await fetchUsers();
          handleSubmitBastToSea(sigUrl);
        }}
      />
    </div>
  );
};

export default BASTDocuments;
