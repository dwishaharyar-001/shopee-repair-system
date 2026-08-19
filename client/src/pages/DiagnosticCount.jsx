import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import {
  Calculator,
  Calendar,
  Building2,
  Download,
  Printer,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Laptop,
  Coins,
  Settings2,
  ShieldCheck,
  FileSpreadsheet,
  Layers,
  ArrowUpDown,
  Filter,
  Check,
  AlertCircle
} from 'lucide-react';

const DiagnosticCount = () => {
  // Date filter state (Default: awal bulan ini s/d hari ini)
  const todayStr = new Date().toISOString().slice(0, 10);
  const startOfMonthStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(startOfMonthStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deviceFilterTab, setDeviceFilterTab] = useState('diagnosed'); // 'all' | 'diagnosed' | 'pending'

  // Data states
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [reportData, setReportData] = useState({
    summary: {
      total_intake: 0,
      total_diagnosed: 0,
      total_pending: 0,
      total_billing_amount: 0,
      default_rate: 30000
    },
    branch_breakdown: [],
    devices: []
  });

  // Branch Rate Editor State
  const [isRateEditorOpen, setIsRateEditorOpen] = useState(false);
  const [editingRates, setEditingRates] = useState({});
  const [savingBranchId, setSavingBranchId] = useState(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Fetch branches
  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      if (res.data?.success) {
        setBranches(res.data.data);
        const rateMap = {};
        res.data.data.forEach(b => {
          rateMap[b.id] = b.diagnostic_fee !== undefined ? b.diagnostic_fee : 30000;
        });
        setEditingRates(rateMap);
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  };

  // Fetch report data
  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedBranch) params.append('branch_id', selectedBranch);

      const res = await api.get(`/reports/diagnostic-count?${params.toString()}`);
      if (res.data?.success) {
        setReportData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching diagnostic count report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, selectedBranch]);

  // Handle Quick Date Presets
  const setPresetDate = (type) => {
    const now = new Date();
    if (type === 'this_month') {
      setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (type === 'last_month') {
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(lastMonthStart.toISOString().slice(0, 10));
      setEndDate(lastMonthEnd.toISOString().slice(0, 10));
    } else if (type === 'all_time') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Save Branch Diagnostic Fee Rate
  const handleSaveRate = async (branchId) => {
    const newFee = editingRates[branchId];
    if (newFee === undefined || newFee < 0) return;

    setSavingBranchId(branchId);
    setSaveSuccessMsg('');
    try {
      const res = await api.put(`/branches/${branchId}/diagnostic-fee`, { diagnostic_fee: newFee });
      if (res.data?.success) {
        setSaveSuccessMsg(`Tarif cabang ${res.data.data.name} berhasil disimpan: Rp ${Number(newFee).toLocaleString('id-ID')}`);
        fetchReport();
        fetchBranches();
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error('Error updating branch diagnostic fee:', err);
      alert('Gagal menyimpan tarif cabang: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingBranchId(null);
    }
  };

  // Filtered devices list
  const filteredDevices = useMemo(() => {
    return reportData.devices.filter(device => {
      // Tab filter
      if (deviceFilterTab === 'diagnosed' && !device.is_diagnosed) return false;
      if (deviceFilterTab === 'pending' && device.is_diagnosed) return false;

      // Search term filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const sId = (device.service_id || '').toLowerCase();
        const sn = (device.serial_number || '').toLowerCase();
        const tag = (device.asset_tag || '').toLowerCase();
        const brand = (device.device_brand || '').toLowerCase();
        const model = (device.device_model || '').toLowerCase();
        const tech = (device.technician_name || '').toLowerCase();
        const branch = (device.branch_name || '').toLowerCase();

        return (
          sId.includes(query) ||
          sn.includes(query) ||
          tag.includes(query) ||
          brand.includes(query) ||
          model.includes(query) ||
          tech.includes(query) ||
          branch.includes(query)
        );
      }
      return true;
    });
  }, [reportData.devices, deviceFilterTab, searchTerm]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'No',
      'Service ID',
      'Brand & Model',
      'Serial Number',
      'Asset Tag',
      'Tipe Perangkat',
      'Lokasi Cabang',
      'Teknisi Pemeriksa',
      'Waktu Mulai Diagnostik',
      'Tanggal Intake',
      'Status Perangkat',
      'Status General Diagnostics',
      'Fee Charge (IDR)'
    ];

    const rows = filteredDevices.map((d, index) => [
      index + 1,
      `"${d.service_id}"`,
      `"${d.device_brand} ${d.device_model}"`,
      `"${d.serial_number}"`,
      `"${d.asset_tag}"`,
      `"${d.device_type}"`,
      `"${d.branch_name}"`,
      `"${d.technician_name}"`,
      `"${d.diagnostic_date ? new Date(d.diagnostic_date).toLocaleString('id-ID') : '-'}"`,
      `"${d.intake_date ? new Date(d.intake_date).toLocaleString('id-ID') : '-'}"`,
      `"${d.status}"`,
      `"${d.is_diagnosed ? 'SUDAH DIAGNOSTIK' : 'BELUM DIAGNOSTIK'}"`,
      d.fee_amount
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DTI_Arisa_Diagnostic_Billing_${startDate || 'all'}_to_${endDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Invoice / Rekap
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-start sm:items-center space-x-4 z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30 flex-shrink-0 ring-4 ring-cyan-500/10">
            <Calculator className="w-7 h-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Diagnostic Device Count & Billing
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-950/80 text-purple-300 border border-purple-800">
                <ShieldCheck className="w-3 h-3 inline mr-1" />
                Admin Only
              </span>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Acuan perhitungan & penagihan fee General Diagnostics dari <strong className="text-cyan-400">PT Data Treasure Indonesia</strong> ke <strong className="text-orange-400">PT Arisa</strong> (Rp 30.000 / unit).
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 z-10">
          <button
            type="button"
            onClick={() => setIsRateEditorOpen(!isRateEditorOpen)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 border ${
              isRateEditorOpen
                ? 'bg-cyan-600 text-white border-cyan-500'
                : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-slate-700'
            }`}
            title="Kelola Tarif Diagnostik per Cabang"
          >
            <Settings2 className="w-4 h-4" />
            <span>Kelola Tarif Cabang</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5"
            title="Unduh Rekap CSV Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Unduh CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5"
            title="Cetak Faktur Tagihan"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Faktur</span>
          </button>
        </div>
      </div>

      {/* Rate Editor Accordion (Admin Only) */}
      {isRateEditorOpen && (
        <div className="bg-slate-900/95 border-2 border-cyan-500/40 rounded-2xl p-5 shadow-2xl animate-fadeIn">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <Settings2 className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  Penyesuaian Tarif General Diagnostics per Cabang
                </h3>
                <p className="text-[11px] text-slate-400">
                  Ubah tarif fee penagihan per perangkat diagnostik khusus untuk masing-masing cabang (Default: Rp 30.000).
                </p>
              </div>
            </div>
            {saveSuccessMsg && (
              <div className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1.5 rounded-lg flex items-center space-x-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map(b => (
              <div
                key={b.id}
                className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">{b.name}</span>
                    <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-orange-300 font-bold">
                      {b.code}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 truncate">
                    {b.address || 'Alamat cabang'}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center space-x-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                      Rp
                    </span>
                    <input
                      type="number"
                      value={editingRates[b.id] !== undefined ? editingRates[b.id] : 30000}
                      onChange={(e) => setEditingRates({ ...editingRates, [b.id]: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs font-bold text-cyan-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono"
                      min="0"
                      step="1000"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={savingBranchId === b.id}
                    onClick={() => handleSaveRate(b.id)}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors flex items-center space-x-1"
                  >
                    {savingBranchId === b.id ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Simpan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-md space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Date Pickers */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>Periode:</span>
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
            />
            <span className="text-slate-500 font-bold">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
            />

            {/* Quick Preset Buttons */}
            <div className="flex items-center space-x-1 pl-1">
              <button
                type="button"
                onClick={() => setPresetDate('this_month')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-semibold border border-slate-700"
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => setPresetDate('last_month')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-semibold border border-slate-700"
              >
                Bulan Lalu
              </button>
              <button
                type="button"
                onClick={() => setPresetDate('all_time')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-semibold border border-slate-700"
              >
                Semua
              </button>
            </div>
          </div>

          {/* Branch Filter & Refresh */}
          <div className="flex items-center space-x-2.5 text-xs">
            <div className="flex items-center space-x-1.5">
              <Building2 className="w-4 h-4 text-orange-400" />
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="">🏢 Semua Cabang</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    [{b.code}] {b.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={fetchReport}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 4 Summary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Intake */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Device Intake</p>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Laptop className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-white mt-3 font-mono">
            {reportData.summary.total_intake.toLocaleString('id-ID')}
            <span className="text-xs text-slate-500 font-sans font-normal ml-1">unit</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Total unit masuk pada periode</p>
        </div>

        {/* Card 2: Selesai Diagnostik (Billable) */}
        <div className="bg-gradient-to-br from-cyan-950/40 to-slate-900 border border-cyan-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Selesai Diagnostik</p>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-cyan-300 mt-3 font-mono">
            {reportData.summary.total_diagnosed.toLocaleString('id-ID')}
            <span className="text-xs text-cyan-400/70 font-sans font-normal ml-1">unit tercharge</span>
          </h3>
          <p className="text-[11px] text-cyan-400/80 mt-1">Lolos fase General Diagnostics</p>
        </div>

        {/* Card 3: Total Tagihan Fee (IDR) */}
        <div className="bg-gradient-to-br from-orange-950/40 to-slate-900 border border-orange-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-orange-300 uppercase tracking-wider">Total Tagihan (DTI ➔ Arisa)</p>
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-orange-400 mt-3 font-mono">
            Rp {reportData.summary.total_billing_amount.toLocaleString('id-ID')}
          </h3>
          <p className="text-[11px] text-orange-400/80 mt-1">Akumulasi fee diagnosa per cabang</p>
        </div>

        {/* Card 4: Belum Diagnostik (Pending) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Belum Diagnostik</p>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-amber-300 mt-3 font-mono">
            {reportData.summary.total_pending.toLocaleString('id-ID')}
            <span className="text-xs text-slate-500 font-sans font-normal ml-1">unit pending</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Masih tahap intake / belum diperiksa</p>
        </div>
      </div>

      {/* Branch Breakdown Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Building2 className="w-5 h-5 text-orange-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Rekapitulasi Tagihan per Lokasi Cabang</h2>
              <p className="text-[11px] text-slate-400">Rincian unit selesai diagnostik dan total nilai tagihan per cabang</p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {reportData.branch_breakdown.length} Cabang Terdata
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">No</th>
                <th className="py-3 px-4">Nama Cabang</th>
                <th className="py-3 px-4">Kode</th>
                <th className="py-3 px-4 text-center">Total Intake</th>
                <th className="py-3 px-4 text-center text-cyan-400">Selesai Diagnostik (Billable)</th>
                <th className="py-3 px-4 text-center text-amber-400">Pending</th>
                <th className="py-3 px-4 text-right">Tarif per Unit (IDR)</th>
                <th className="py-3 px-4 text-right text-orange-400 font-bold">Total Tagihan (IDR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {reportData.branch_breakdown.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500 italic">
                    Tidak ada data cabang pada periode ini.
                  </td>
                </tr>
              ) : (
                reportData.branch_breakdown.map((b, idx) => (
                  <tr key={b.branch_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-white">{b.branch_name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-orange-300 font-mono text-[11px] font-bold">
                        {b.branch_code}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono">{b.total_intake}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-cyan-300 bg-cyan-950/20">
                      {b.total_diagnosed}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-amber-300">{b.total_pending}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-300">
                      Rp {Number(b.diagnostic_fee).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-orange-400 bg-orange-950/20">
                      Rp {Number(b.total_billing).toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {reportData.branch_breakdown.length > 0 && (
              <tfoot className="bg-slate-950 text-xs font-bold text-white border-t-2 border-slate-700">
                <tr>
                  <td colSpan="3" className="py-3 px-4 text-right uppercase tracking-wider">
                    Total Keseluruhan:
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-blue-300">
                    {reportData.summary.total_intake}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-cyan-300">
                    {reportData.summary.total_diagnosed}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-amber-300">
                    {reportData.summary.total_pending}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-400">Rata-rata</td>
                  <td className="py-3 px-4 text-right font-mono text-orange-400 text-sm">
                    Rp {reportData.summary.total_billing_amount.toLocaleString('id-ID')}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Detailed Devices Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Laptop className="w-4 h-4 text-cyan-400" />
              <span>Daftar Rincian Perangkat & Status Diagnostik</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Audit log individual seluruh unit intake untuk validasi penagihan fee
            </p>
          </div>

          {/* Filter Tabs & Search Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Tabs */}
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center space-x-1 text-xs">
              <button
                type="button"
                onClick={() => setDeviceFilterTab('diagnosed')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  deviceFilterTab === 'diagnosed'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Selesai Diagnosa ({reportData.summary.total_diagnosed})
              </button>
              <button
                type="button"
                onClick={() => setDeviceFilterTab('all')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  deviceFilterTab === 'all'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Semua ({reportData.summary.total_intake})
              </button>
              <button
                type="button"
                onClick={() => setDeviceFilterTab('pending')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  deviceFilterTab === 'pending'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Pending ({reportData.summary.total_pending})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari Service ID, SN, Tag..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-48 sm:w-60"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">No</th>
                <th className="py-3 px-4">Service ID</th>
                <th className="py-3 px-4">Perangkat & Model</th>
                <th className="py-3 px-4">Serial No / Asset Tag</th>
                <th className="py-3 px-4">Cabang</th>
                <th className="py-3 px-4">Teknisi</th>
                <th className="py-3 px-4">Waktu Diagnostik</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Fee Diagnostik</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-500 italic">
                    {loading ? 'Memuat data perangkat...' : 'Tidak ada data perangkat yang sesuai dengan filter.'}
                  </td>
                </tr>
              ) : (
                filteredDevices.map((d, index) => (
                  <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500">{index + 1}</td>
                    <td className="py-3 px-4 font-mono font-bold text-cyan-300">{d.service_id}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">
                        {d.device_brand} {d.device_model}
                      </div>
                      <span className="text-[10px] text-slate-400">{d.device_type}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">
                      <div className="text-slate-200">{d.serial_number}</div>
                      {d.asset_tag && d.asset_tag !== '-' && (
                        <div className="text-[10px] text-orange-400 font-bold">Tag: {d.asset_tag}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-300 font-semibold">{d.branch_name}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{d.technician_name}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {d.diagnostic_date ? new Date(d.diagnostic_date).toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {d.is_diagnosed ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                          ✓ Diagnostik Selesai
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                          ⏳ Pending Intake
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      {d.is_diagnosed ? (
                        <span className="text-orange-400">
                          Rp {Number(d.fee_amount).toLocaleString('id-ID')}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Menampilkan {filteredDevices.length} dari {reportData.devices.length} perangkat</span>
          <span className="font-mono font-bold text-orange-400">
            Total Charge Halaman: Rp {filteredDevices.reduce((acc, curr) => acc + curr.fee_amount, 0).toLocaleString('id-ID')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticCount;
