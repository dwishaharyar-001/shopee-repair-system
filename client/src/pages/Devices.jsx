import React, { useState, useEffect } from 'react';
import { 
  Laptop, 
  Search, 
  Filter, 
  Plus, 
  Wrench, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  RefreshCw, 
  Eye, 
  Edit,
  MapPin,
  Users
} from 'lucide-react';
import { deviceService } from '../services/deviceService';
import api from '../services/api';
import DeviceIntakeModal from '../components/DeviceIntakeModal';
import DeviceDetailModal from '../components/DeviceDetailModal';
import EditDeviceModal from '../components/EditDeviceModal';
import CustomerModal from '../components/CustomerModal';

const Devices = () => {
  const [orders, setOrders] = useState([]);
  const [branches, setBranches] = useState([]);
  const [stats, setStats] = useState({ totalCount: 0, intakeCount: 0, inRepairCount: 0, qcPendingCount: 0, releasedCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  // Filters state
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedAssetType, setSelectedAssetType] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');

  // Modals state
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedOrderToEdit, setSelectedOrderToEdit] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [selectedStatus, selectedAssetType, selectedBranch]);

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

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (selectedStatus) params.status = selectedStatus;
      if (selectedAssetType) params.asset_type = selectedAssetType;
      if (selectedBranch) params.branch_id = selectedBranch;
      if (search) params.search = search;

      const res = await deviceService.getServiceOrders(params);
      if (res.success) {
        setOrders(res.data);
        setStats(res.stats);
      }
    } catch (err) {
      console.error('Fetch orders error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchOrders();
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Intake':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'In Repair':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'QC1 Pending':
      case 'QC2 Pending':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Rework':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'Released':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 text-xs flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">
            Device Management & Service Orders
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen Master DeviceID, Tiket ServiceID Per Cabang, dan Edit Informasi Perangkat
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsCustomerModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl shadow-sm border border-slate-700 transition-all flex items-center justify-center space-x-2"
          >
            <Users className="w-4 h-4 text-cyan-400" />
            <span>👥 Kelola Customer / Klien</span>
          </button>

          <button
            onClick={() => setIsIntakeOpen(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center justify-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Intake Perangkat Baru</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase">Total Order</span>
          <div className="text-lg sm:text-xl font-extrabold text-slate-800 mt-1">{stats.totalCount}</div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-semibold text-amber-500 uppercase">Intake</span>
          <div className="text-lg sm:text-xl font-extrabold text-amber-600 mt-1">{stats.intakeCount}</div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-semibold text-blue-500 uppercase">In Repair</span>
          <div className="text-lg sm:text-xl font-extrabold text-blue-600 mt-1">{stats.inRepairCount}</div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-semibold text-purple-500 uppercase">QC Pending</span>
          <div className="text-lg sm:text-xl font-extrabold text-purple-600 mt-1">{stats.qcPendingCount}</div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-500 uppercase">Released</span>
          <div className="text-lg sm:text-xl font-extrabold text-emerald-600 mt-1">{stats.releasedCount}</div>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari ServiceID, DeviceID, SN, Brand..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
          {/* Branch Location Filter */}
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 text-xs font-bold text-orange-900 focus:ring-2 focus:ring-orange-500 focus:outline-none flex-1 sm:flex-initial"
          >
            <option value="">🏢 Semua Cabang</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>📍 [{b.code}] {b.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-cyan-500 focus:outline-none flex-1 sm:flex-initial"
          >
            <option value="">Semua Status</option>
            <option value="Intake">Intake</option>
            <option value="In Repair">In Repair</option>
            <option value="QC1 Pending">QC1 Pending</option>
            <option value="Rework">Rework</option>
            <option value="QC2 Pending">QC2 Pending</option>
            <option value="Released">Released</option>
          </select>

          {/* Asset Type Filter */}
          <select
            value={selectedAssetType}
            onChange={(e) => setSelectedAssetType(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-cyan-500 focus:outline-none flex-1 sm:flex-initial"
          >
            <option value="">Semua Tipe Aset</option>
            <option value="Type A">Type A - Laptop</option>
            <option value="Type B">Type B - Desktop</option>
            <option value="Type C">Type C - Display</option>
            <option value="Type D">Type D - Storage</option>
            <option value="Type E">Type E - Networking</option>
          </select>

          <button
            onClick={fetchOrders}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area: Responsive Mobile Cards & Desktop Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs">Memuat data inventaris perangkat...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Laptop className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-semibold text-slate-600 text-sm">Tidak ada data order service ditemukan.</p>
            <p className="text-xs">Cobalah mengubah kriteria filter cabang/status atau tambahkan intake perangkat baru.</p>
          </div>
        ) : (
          <>
            {/* Mobile View: Interactive Cards for 6-inch smartphones */}
            <div className="block md:hidden divide-y divide-slate-100 p-3 space-y-3">
              {orders.map((row) => (
                <div key={row.id} className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 font-mono text-xs font-bold">
                      <span className="text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">
                        [{row.branch?.code || 'SVC'}] {row.service_id}
                      </span>
                      <span className="text-cyan-600 bg-cyan-50 border border-cyan-200 px-1.5 py-0.5 rounded text-[11px]">
                        {row.device?.device_id}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(row.status)}`}>
                      {row.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{row.device?.brand} {row.device?.model}</h4>
                    <p className="text-[11px] font-mono text-slate-500 mt-0.5">SN: {row.device?.serial_number}</p>
                    <p className="text-xs text-slate-600 mt-0.5">Customer: <strong className="text-slate-800">{row.customer?.name}</strong></p>
                    <p className="text-xs text-emerald-700 font-semibold mt-0.5">Teknisi: {row.assignedTechnician?.user?.full_name || 'Unassigned'}</p>
                  </div>

                  {/* Mobile Action Buttons */}
                  <div className="pt-2 border-t border-slate-200 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedOrderToEdit(row);
                        setIsEditOpen(true);
                      }}
                      className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center space-x-1.5"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit Device</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedOrder(row);
                        setIsDetailOpen(true);
                      }}
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-900 active:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center space-x-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Detail</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Full Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                    <th className="py-3 px-4">ServiceID & DeviceID</th>
                    <th className="py-3 px-4">Cabang</th>
                    <th className="py-3 px-4">Serial Number</th>
                    <th className="py-3 px-4">Brand & Model</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Teknisi</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-semibold">
                        <div className="text-slate-900 font-mono text-xs font-bold flex items-center space-x-1.5">
                          <span className="text-orange-600">[{row.branch?.code || 'SVC'}]</span>
                          <span>{row.service_id}</span>
                        </div>
                        <div className="text-[10px] text-cyan-600 font-mono">{row.device?.device_id}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {row.branch ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-800 text-[10px] font-bold">
                            <MapPin className="w-3 h-3 text-orange-500" />
                            <span>{row.branch.name} ({row.branch.code})</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {row.device?.serial_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{row.device?.brand}</div>
                        <div className="text-[11px] text-slate-500">{row.device?.model}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {row.customer?.name}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-emerald-700">
                        {row.assignedTechnician?.user?.full_name || '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => {
                              setSelectedOrderToEdit(row);
                              setIsEditOpen(true);
                            }}
                            className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[11px] font-semibold transition-colors flex items-center space-x-1"
                            title="Edit Informasi Device & Intake"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedOrder(row);
                              setIsDetailOpen(true);
                            }}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors flex items-center space-x-1"
                            title="Lihat Detail & Linimasa"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Detail</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <DeviceIntakeModal
        isOpen={isIntakeOpen}
        onClose={() => setIsIntakeOpen(false)}
        onSuccess={(msg) => {
          showToast(msg);
          fetchOrders();
        }}
      />

      <EditDeviceModal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedOrderToEdit(null);
        }}
        order={selectedOrderToEdit}
        onSuccess={(msg) => {
          showToast(msg);
          fetchOrders();
        }}
      />

      <DeviceDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        onUpdateSuccess={(msg) => {
          showToast(msg);
          setIsDetailOpen(false);
          fetchOrders();
        }}
      />

      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
      />
    </div>
  );
};

export default Devices;
