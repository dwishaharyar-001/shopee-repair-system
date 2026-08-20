import React, { useState, useEffect } from 'react';
import { 
  Laptop, 
  Wrench, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  PackageCheck, 
  Clock, 
  Users,
  ArrowUpRight,
  RefreshCw,
  Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import DeviceIntakeModal from '../components/DeviceIntakeModal';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalDevices: 0,
    activeInRepair: 0,
    qcPassRate: '0.0%',
    releasedOrders: 0,
    totalOrders: 0,
    recentOrders: [],
    reworkOrder: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/devices/dashboard-stats');
      if (res.data && res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Fetch dashboard stats error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'In Repair':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'QC1 Pending':
      case 'QC2 Pending':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Rework':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'Released':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Real KPI cards from Database
  const kpiCards = [
    {
      title: 'Total Assets Inventory',
      value: stats.totalDevices.toLocaleString('id-ID'),
      subtext: 'Terdaftar di Master Device',
      change: `${stats.totalDevices} Unit Database`,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-500',
      badgeBg: 'bg-emerald-50 border-emerald-200',
      icon: Laptop,
    },
    {
      title: 'Perangkat Dalam Perbaikan',
      value: stats.activeInRepair.toLocaleString('id-ID'),
      subtext: 'Antrean Repair & QC Aktif',
      change: stats.activeInRepair > 0 ? 'Sedang Diproses' : 'Antrean Kosong',
      color: 'bg-cyan-500',
      textColor: 'text-cyan-500',
      badgeBg: 'bg-cyan-50 border-cyan-200',
      icon: Wrench,
    },
    {
      title: 'Tingkat Kelulusan QC (Pass)',
      value: stats.qcPassRate,
      subtext: 'Akumulasi Audit Log QC',
      change: 'Real Database Metric',
      color: 'bg-rose-500',
      textColor: 'text-rose-500',
      badgeBg: 'bg-rose-50 border-rose-200',
      icon: CheckCircle2,
    },
    {
      title: 'Progress Selesai (Released)',
      value: `${stats.releasedOrders} / ${stats.totalOrders}`,
      subtext: 'Order Service Rilis',
      change: stats.totalOrders > 0 ? `${Math.round((stats.releasedOrders / stats.totalOrders) * 100)}% Selesai` : '0% Selesai',
      color: 'bg-amber-500',
      textColor: 'text-amber-500',
      badgeBg: 'bg-amber-50 border-amber-200',
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Halo, {user?.full_name || 'User'}! 👋
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Selamat datang di Dashboard **Shopee Asset Repair System**. Anda masuk sebagai <span className="font-semibold text-slate-700">{user?.role}</span>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchDashboardStats()}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
            title="Refresh Real Stats"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsIntakeOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-orange-500/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Intake Perangkat Baru</span>
          </button>
        </div>
      </div>

      {/* Top 4 Real Color-Coded KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {card.title}
                </span>
                <div className={`w-10 h-10 rounded-xl ${card.color} text-white flex items-center justify-center shadow-lg shadow-slate-200`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {isLoading ? <span className="text-slate-300 text-base font-normal">Memuat...</span> : card.value}
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs">
                <span className="text-slate-400 font-medium">{card.subtext}</span>
                <span className={`font-semibold ${card.textColor}`}>{card.change}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Section: Recent Queue Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold text-slate-800 text-base">Antrean Perbaikan Terbaru</h2>
            <p className="text-xs text-slate-400">Monitoring status pengerjaan perangkat riil dari database</p>
          </div>
          <a href="/repairs" className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 flex items-center gap-1">
            <span>Lihat Semua Queue</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <span>Memuat antrean terbaru...</span>
          </div>
        ) : stats.recentOrders.length === 0 ? (
          <div className="p-10 text-center text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-xl">
            <Laptop className="w-8 h-8 mx-auto text-slate-300" />
            <p className="font-semibold text-slate-600 text-xs">Belum ada antrean perbaikan di database.</p>
            <p className="text-[11px] text-slate-400">Gunakan tombol 'Intake Perangkat Baru' untuk mendaftarkan perangkat pertama.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                  <th className="py-3 px-2">Service ID</th>
                  <th className="py-3 px-2">Brand & Model</th>
                  <th className="py-3 px-2">Teknisi</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2 text-right">Tanggal Intake</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recentOrders.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-2 font-semibold text-slate-800">
                      <div>{row.service_id}</div>
                      <div className="text-[10px] font-mono text-slate-400 font-normal">SN: {row.device?.serial_number || '-'}</div>
                    </td>
                    <td className="py-3 px-2 text-slate-700 font-medium">
                      {row.device ? `${row.device.brand} ${row.device.model}` : '-'}
                    </td>
                    <td className="py-3 px-2 font-medium text-emerald-700">
                      {row.assignedTechnician?.user?.full_name || 'Unassigned'}
                    </td>
                    <td className="py-3 px-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right text-slate-400 font-mono text-[11px]">
                      {new Date(row.intake_date || row.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Device Intake Modal */}
      <DeviceIntakeModal
        isOpen={isIntakeOpen}
        onClose={() => setIsIntakeOpen(false)}
        onSuccess={() => fetchDashboardStats()}
      />
    </div>
  );
};

export default Dashboard;
