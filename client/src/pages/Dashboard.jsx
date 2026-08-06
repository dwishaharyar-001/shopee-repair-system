import React from 'react';
import { 
  Laptop, 
  Wrench, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  PackageCheck, 
  Clock, 
  Users,
  ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();

  // Mock KPI data reflecting specification targets (4,449 total assets, milestone stages)
  const kpiCards = [
    {
      title: 'Total Assets Inventory',
      value: '4,449',
      subtext: 'Target Unit Proyek Shopee',
      change: '+100%',
      color: 'bg-emerald-500',
      textColor: 'text-emerald-500',
      badgeBg: 'bg-emerald-50 border-emerald-200',
      icon: Laptop,
    },
    {
      title: 'Perangkat Dalam Perbaikan',
      value: '142',
      subtext: 'Aktif di antrean teknisi',
      change: '10 Teknisi Aktif',
      color: 'bg-cyan-500',
      textColor: 'text-cyan-500',
      badgeBg: 'bg-cyan-50 border-cyan-200',
      icon: Wrench,
    },
    {
      title: 'Tingkat Kelulusan QC (Pass)',
      value: '96.8%',
      subtext: 'QC1 Arisa & QC2 Shopee',
      change: '+2.4% minggu ini',
      color: 'bg-rose-500',
      textColor: 'text-rose-500',
      badgeBg: 'bg-rose-50 border-rose-200',
      icon: CheckCircle2,
    },
    {
      title: 'Milestone Progress',
      value: '716 / 1,689',
      subtext: 'Fase 1 (716) Selesai',
      change: '42.4% Keseluruhan',
      color: 'bg-amber-500',
      textColor: 'text-amber-500',
      badgeBg: 'bg-amber-50 border-amber-200',
      icon: TrendingUp,
    },
  ];

  const recentQueue = [
    { id: 'DEV-8821', serial: 'SN-LAP-2026-001', type: 'Tipe A (Laptop High)', status: 'In Repair', tech: 'Ahmad Fauzi', time: '10m lalu' },
    { id: 'DEV-8822', serial: 'SN-LAP-2026-002', type: 'Tipe B (Desktop Workstation)', status: 'QC1 Pending', tech: 'Deni Kurniawan', time: '25m lalu' },
    { id: 'DEV-8823', serial: 'SN-LAP-2026-003', type: 'Tipe C (Monitor & Peripheral)', status: 'Rework (SLA)', tech: 'Fajar Nugraha', time: '40m lalu' },
    { id: 'DEV-8824', serial: 'SN-LAP-2026-004', type: 'Tipe A (Laptop High)', status: 'QC2 Passed', tech: 'Gilang Ramadhan', time: '1j lalu' },
    { id: 'DEV-8825', serial: 'SN-LAP-2026-005', type: 'Tipe D (Storage & NAS)', status: 'Released', tech: 'Hadi Wijaya', time: '2j lalu' },
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'In Repair':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'QC1 Pending':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Rework (SLA)':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'QC2 Passed':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Released':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

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
          <button className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-orange-500/20 transition-all flex items-center gap-1.5">
            <Laptop className="w-4 h-4" />
            <span>Intake Perangkat Baru</span>
          </button>
        </div>
      </div>

      {/* Top 4 Color-Coded KPI Cards (Referencing Attached UI Design) */}
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
                {card.value}
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs">
                <span className="text-slate-400 font-medium">{card.subtext}</span>
                <span className={`font-semibold ${card.textColor}`}>{card.change}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid Section: Recent Queue & Quick Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Antrean Perbaikan Perangkat (Table View) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-slate-800 text-base">Antrean Perbaikan Terbaru</h2>
              <p className="text-xs text-slate-400">Monitoring status pengerjaan perangkat per teknisi</p>
            </div>
            <a href="/repairs" className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 flex items-center gap-1">
              <span>Lihat Semua Queue</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                  <th className="py-3 px-2">ID & Serial</th>
                  <th className="py-3 px-2">Tipe Asset</th>
                  <th className="py-3 px-2">Teknisi</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2 text-right">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentQueue.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-2 font-semibold text-slate-800">
                      <div>{row.id}</div>
                      <div className="text-[10px] font-mono text-slate-400 font-normal">{row.serial}</div>
                    </td>
                    <td className="py-3 px-2 text-slate-600">{row.type}</td>
                    <td className="py-3 px-2 font-medium text-slate-700">{row.tech}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right text-slate-400 font-mono text-[11px]">
                      {row.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel Notifikasi & SLA Warning */}
        <div className="space-y-6">
          {/* SLA Warning Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2.5 bg-red-500/20 text-red-400 rounded-xl border border-red-500/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-100">Rework SLA Timer</h3>
                <p className="text-[11px] text-slate-400">Batas maksimal perbaikan ulang: 48 Jam</p>
              </div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-300">Unit DEV-8823</span>
                <span className="text-red-400 font-mono font-bold">Sisa: 14 Jam 22 Min</span>
              </div>
              <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                <div className="bg-red-500 h-full w-[70%] rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Quick System Info Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">Status Server VPS</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Node.js Express API</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Port 3000
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500">PostgreSQL Database</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Port 5432
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-500">Email Service</span>
                <span className="text-cyan-600 font-bold">Nodemailer / SendGrid</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
