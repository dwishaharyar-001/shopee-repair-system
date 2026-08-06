import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  BarChart3, 
  Users, 
  CheckCircle2, 
  Clock, 
  Wrench, 
  AlertCircle, 
  RefreshCw, 
  MapPin, 
  Search, 
  Laptop, 
  Layers, 
  TrendingUp, 
  ShieldAlert, 
  Filter,
  CheckCircle,
  Hourglass
} from 'lucide-react';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('technicians'); // 'technicians' | 'devices'
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');

  // 1. Technician Report State
  const [techReport, setTechReport] = useState({
    summary: { totalTechs: 0, totalDoneTasks: 0, totalActiveTasks: 0 },
    technicians: []
  });
  const [techLoading, setTechLoading] = useState(true);

  // 2. Device Task Report State
  const [deviceReport, setDeviceReport] = useState({
    summary: {
      totalDevices: 0,
      doneCount: 0,
      totalBelumDikerjakan: 0,
      inProgressCount: 0,
      pendingCount: 0,
      qcPendingCount: 0,
      donePercentage: 0,
      belumDikerjakanPercentage: 0
    },
    orders: []
  });
  const [deviceLoading, setDeviceLoading] = useState(true);
  const [deviceStatusFilter, setDeviceStatusFilter] = useState('all'); // 'all' | 'done' | 'pending'
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchTechReport();
    fetchDeviceReport();
  }, [selectedBranch]);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      if (res.data && res.data.success) {
        setBranches(res.data.data);
      }
    } catch (err) {
      console.error('Fetch branches error:', err);
    }
  };

  const fetchTechReport = async () => {
    setTechLoading(true);
    try {
      const params = selectedBranch ? { branch_id: selectedBranch } : {};
      const res = await api.get('/reports/technicians-task', { params });
      if (res.data && res.data.success) {
        setTechReport(res.data.data);
      }
    } catch (err) {
      console.error('Fetch technician report error:', err);
    } finally {
      setTechLoading(false);
    }
  };

  const fetchDeviceReport = async () => {
    setDeviceLoading(true);
    try {
      const params = {};
      if (selectedBranch) params.branch_id = selectedBranch;
      const res = await api.get('/reports/devices-task', { params });
      if (res.data && res.data.success) {
        setDeviceReport(res.data.data);
      }
    } catch (err) {
      console.error('Fetch device report error:', err);
    } finally {
      setDeviceLoading(false);
    }
  };

  // Helper for Workload Badge
  const getWorkloadBadge = (status) => {
    switch (status) {
      case 'Free':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
      case 'Optimal':
        return 'bg-blue-100 text-blue-800 border-blue-300 font-bold';
      case 'Overloaded':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Helper for Device Status Badge
  const getDeviceStatusBadge = (status, isDone) => {
    if (isDone) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-extrabold shadow-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>DONE ({status})</span>
        </span>
      );
    }
    if (status === 'In Repair') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-300 text-xs font-bold">
          <Wrench className="w-3.5 h-3.5 text-cyan-600" />
          <span>Sedang Dikerjakan</span>
        </span>
      );
    }
    if (status.includes('QC')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-300 text-xs font-bold">
          <Clock className="w-3.5 h-3.5 text-purple-600" />
          <span>QC Checkpoint</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold">
        <Hourglass className="w-3.5 h-3.5 text-amber-600" />
        <span>Menunggu Pengerjaan</span>
      </span>
    );
  };

  // Filtered orders list for search & status tab
  const filteredOrders = deviceReport.orders.filter(order => {
    if (deviceStatusFilter === 'done' && !order.is_done) return false;
    if (deviceStatusFilter === 'pending' && order.is_done) return false;

    if (search) {
      const query = search.toLowerCase();
      return (
        order.service_id.toLowerCase().includes(query) ||
        order.brand_model.toLowerCase().includes(query) ||
        order.serial_number.toLowerCase().includes(query) ||
        order.customer_name.toLowerCase().includes(query) ||
        order.technician_name.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-700/50">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30 flex-shrink-0">
            <BarChart3 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Laporan KPI & Status Pengerjaan Device</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Monitoring beban kerja teknisi dan rekapitulasi perbaikan perangkat yang sudah & belum dikerjakan.
            </p>
          </div>
        </div>

        {/* Global Branch Filter & Refresh */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="bg-orange-950/80 border border-orange-500/50 rounded-xl px-4 py-2.5 text-xs font-bold text-orange-200 focus:ring-2 focus:ring-orange-400 focus:outline-none shadow-inner"
          >
            <option value="">🏢 Semua Lokasi Cabang</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>📍 [{b.code}] {b.name}</option>
            ))}
          </select>

          <button
            onClick={() => { fetchTechReport(); fetchDeviceReport(); }}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 border border-slate-700 transition-colors"
            title="Refresh Data Laporan"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex border-b border-slate-200 text-xs font-semibold text-slate-500 space-x-6">
        <button
          onClick={() => setActiveTab('technicians')}
          className={`pb-3 transition-colors flex items-center space-x-2 border-b-2 ${
            activeTab === 'technicians'
              ? 'border-cyan-600 text-cyan-600 font-bold'
              : 'border-transparent hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Status Task Per Teknisi ({techReport.summary.totalTechs})</span>
        </button>

        <button
          onClick={() => setActiveTab('devices')}
          className={`pb-3 transition-colors flex items-center space-x-2 border-b-2 ${
            activeTab === 'devices'
              ? 'border-cyan-600 text-cyan-600 font-bold'
              : 'border-transparent hover:text-slate-800'
          }`}
        >
          <Laptop className="w-4 h-4" />
          <span>Rekap Perangkat Done vs Belum Dikerjakan ({deviceReport.summary.totalDevices})</span>
        </button>
      </div>

      {/* TAB 1: Status Task Per Teknisi */}
      {activeTab === 'technicians' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Teknisi Bertugas</span>
                <div className="text-2xl font-extrabold text-slate-800">{techReport.summary.totalTechs} Personel</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Task Selesai (Done)</span>
                <div className="text-2xl font-extrabold text-emerald-700">{techReport.summary.totalDoneTasks} Unit</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-cyan-100 text-cyan-700 rounded-xl">
                <Wrench className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Active Task Pending</span>
                <div className="text-2xl font-extrabold text-cyan-800">{techReport.summary.totalActiveTasks} Unit</div>
              </div>
            </div>
          </div>

          {/* Technician Cards List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-base text-slate-800">Status & Distribusi Task Teknisi</h3>
                <p className="text-xs text-slate-500">Rincian beban kerja, task pending, sedang dikerjakan, dan tingkat penyelesaian per teknisi.</p>
              </div>
            </div>

            {techLoading ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs font-semibold">Memuat status task per teknisi...</p>
              </div>
            ) : techReport.technicians.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Users className="w-10 h-10 mx-auto text-slate-300" />
                <p className="font-semibold text-slate-600">Belum ada data teknisi ditemukan.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {techReport.technicians.map(t => (
                  <div key={t.technician_id} className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-4">
                    {/* Header Info */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-bold flex items-center justify-center text-sm shadow-md">
                          🛠️
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-bold text-sm text-slate-800">{t.full_name}</h4>
                            <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded">
                              {t.employee_code}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{t.skill_level}</p>
                        </div>
                      </div>

                      {/* Workload Badge */}
                      <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase border ${getWorkloadBadge(t.workloadStatus)}`}>
                        {t.workloadStatus === 'Free' ? '🟢 Beban Ringan' : t.workloadStatus === 'Optimal' ? '🔵 Beban Optimal' : '🔴 Beban Tinggi'}
                      </span>
                    </div>

                    {/* Branch Badge */}
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-slate-500">Cabang Penempatan:</span>
                      {t.branch ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg bg-orange-100 border border-orange-200 text-orange-900 text-[11px] font-bold">
                          <MapPin className="w-3 h-3 text-orange-500" />
                          <span>[{t.branch.code}] {t.branch.name}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Seluruh Cabang (Global)</span>
                      )}
                    </div>

                    {/* Task Breakdown Counters */}
                    <div className="grid grid-cols-4 gap-2 text-center pt-2">
                      <div className="bg-amber-50 p-2 rounded-xl border border-amber-200/70">
                        <div className="text-[10px] font-bold text-amber-700 uppercase">Pending</div>
                        <div className="text-lg font-extrabold text-amber-900">{t.pendingCount}</div>
                      </div>

                      <div className="bg-cyan-50 p-2 rounded-xl border border-cyan-200/70">
                        <div className="text-[10px] font-bold text-cyan-700 uppercase">In Repair</div>
                        <div className="text-lg font-extrabold text-cyan-900">{t.inProgressCount}</div>
                      </div>

                      <div className="bg-purple-50 p-2 rounded-xl border border-purple-200/70">
                        <div className="text-[10px] font-bold text-purple-700 uppercase">In QC</div>
                        <div className="text-lg font-extrabold text-purple-900">{t.qcCount}</div>
                      </div>

                      <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200/70">
                        <div className="text-[10px] font-bold text-emerald-700 uppercase">Done</div>
                        <div className="text-lg font-extrabold text-emerald-900">{t.doneCount}</div>
                      </div>
                    </div>

                    {/* Completion Progress Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-600">Completion Rate:</span>
                        <span className="text-emerald-700 font-extrabold">{t.completionRate}% ({t.doneCount}/{t.totalTasks} Done)</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                          style={{ width: `${t.completionRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Done Tasks & Status Devices (Sudah vs Belum Dikerjakan) */}
      {activeTab === 'devices' && (
        <div className="space-y-6">
          {/* Top Analytics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-cyan-100 text-cyan-700 rounded-xl">
                <Laptop className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Perangkat Service</span>
                <div className="text-xl font-extrabold text-slate-800">{deviceReport.summary.totalDevices} Unit</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Sudah Dikerjakan (Done)</span>
                <div className="text-xl font-extrabold text-emerald-700">
                  {deviceReport.summary.doneCount} Unit ({deviceReport.summary.donePercentage}%)
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
                <Hourglass className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Belum Dikerjakan / Proses</span>
                <div className="text-xl font-extrabold text-amber-700">
                  {deviceReport.summary.totalBelumDikerjakan} Unit ({deviceReport.summary.belumDikerjakanPercentage}%)
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
                <Wrench className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sedang Dikerjakan</span>
                <div className="text-xl font-extrabold text-blue-800">{deviceReport.summary.inProgressCount} Unit</div>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
            {/* Toolbar & Filters */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4">
              {/* Status Filter Tabs */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600 w-full md:w-auto">
                <button
                  onClick={() => setDeviceStatusFilter('all')}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    deviceStatusFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Semua Perangkat ({deviceReport.summary.totalDevices})
                </button>
                <button
                  onClick={() => setDeviceStatusFilter('done')}
                  className={`px-4 py-2 rounded-lg transition-all flex items-center space-x-1 ${
                    deviceStatusFilter === 'done' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>✅ Sudah Dikerjakan ({deviceReport.summary.doneCount})</span>
                </button>
                <button
                  onClick={() => setDeviceStatusFilter('pending')}
                  className={`px-4 py-2 rounded-lg transition-all flex items-center space-x-1 ${
                    deviceStatusFilter === 'pending' ? 'bg-amber-600 text-white shadow-sm' : 'text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  <Hourglass className="w-3.5 h-3.5" />
                  <span>⏳ Belum Dikerjakan ({deviceReport.summary.totalBelumDikerjakan})</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari Service ID, Brand, Serial Number..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Table */}
            {deviceLoading ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs font-semibold">Memuat rekapitulasi pengerjaan perangkat...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Laptop className="w-10 h-10 mx-auto text-slate-300" />
                <p className="font-semibold text-slate-600">Tidak ada perangkat service ditemukan untuk filter ini.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                      <th className="py-3.5 px-4">Service ID</th>
                      <th className="py-3.5 px-4">Cabang</th>
                      <th className="py-3.5 px-4">Perangkat & Brand</th>
                      <th className="py-3.5 px-4">Customer</th>
                      <th className="py-3.5 px-4">Teknisi Penanggung Jawab</th>
                      <th className="py-3.5 px-4">Status Pengerjaan</th>
                      <th className="py-3.5 px-4">Terakhir Diperbarui</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {item.service_id}
                        </td>
                        <td className="py-3.5 px-4">
                          {item.branch ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-900 text-[11px] font-bold">
                              <MapPin className="w-3 h-3 text-orange-500" />
                              <span>[{item.branch.code}] {item.branch.name}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800">{item.brand_model}</div>
                          <div className="text-[10px] font-mono text-slate-400">SN: {item.serial_number || '-'}</div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          {item.customer_name}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          🛠️ {item.technician_name}
                        </td>
                        <td className="py-3.5 px-4">
                          {getDeviceStatusBadge(item.status, item.is_done)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                          {new Date(item.updated_at).toLocaleString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
