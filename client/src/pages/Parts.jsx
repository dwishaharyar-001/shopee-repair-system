import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  DollarSign, 
  Layers,
  History,
  TrendingUp,
  SlidersHorizontal,
  MapPin
} from 'lucide-react';
import { inventoryService } from '../services/inventoryService';
import api from '../services/api';
import AddPartModal from '../components/AddPartModal';
import HarvestPartModal from '../components/HarvestPartModal';

const Parts = () => {
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'harvest'
  const [parts, setParts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [harvestLogs, setHarvestLogs] = useState([]);
  const [metrics, setMetrics] = useState({
    totalSKU: 0,
    totalValuation: 0,
    lowStockCount: 0,
    totalHarvestedCount: 0,
    totalConsumedCount: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isHarvestOpen, setIsHarvestOpen] = useState(false);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchData();
  }, [activeTab, selectedCategory, selectedBranch, onlyLowStock]);

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

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const metricsParams = selectedBranch ? { branch_id: selectedBranch } : {};
      const metricsRes = await inventoryService.getInventoryMetrics(metricsParams);
      if (metricsRes.success) setMetrics(metricsRes.data);

      if (activeTab === 'harvest') {
        const harvestRes = await inventoryService.getHarvestLogs();
        if (harvestRes.success) setHarvestLogs(harvestRes.data);
      } else {
        const params = {};
        if (selectedCategory) params.category = selectedCategory;
        if (selectedBranch) params.branch_id = selectedBranch;
        if (onlyLowStock) params.low_stock = 'true';
        if (search) params.search = search;

        const partsRes = await inventoryService.getInventoryParts(params);
        if (partsRes.success) setParts(partsRes.data);
      }
    } catch (err) {
      console.error('Fetch inventory data error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 text-xs flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Parts Inventory & Harvesting Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-Time Stock Levels Per Cabang, Reorder Triggers, Cost Tracking, dan Pemanenan Part Kanibal
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsHarvestOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            <span>♻️ Panen Part (Harvest)</span>
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Part Baru</span>
          </button>
        </div>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-cyan-100 text-cyan-700 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Katalog SKU</span>
            <div className="text-xl font-extrabold text-slate-800">{metrics.totalSKU} Part</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Valuasi Stok Inventaris</span>
            <div className="text-lg font-extrabold text-emerald-700">
              Rp {parseInt(metrics.totalValuation || 0).toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-red-100 text-red-700 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-red-500 uppercase">Stok Kritis (Low Stock)</span>
            <div className="text-xl font-extrabold text-red-600">{metrics.lowStockCount} SKU</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-purple-100 text-purple-700 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Part Terpakai</span>
            <div className="text-xl font-extrabold text-purple-700">{metrics.totalConsumedCount} Unit</div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 text-xs font-semibold text-slate-500 space-x-6">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 transition-colors flex items-center space-x-2 border-b-2 ${
            activeTab === 'inventory'
              ? 'border-cyan-600 text-cyan-600 font-bold'
              : 'border-transparent hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Katalog Stok Inventaris</span>
        </button>

        <button
          onClick={() => setActiveTab('harvest')}
          className={`pb-3 transition-colors flex items-center space-x-2 border-b-2 ${
            activeTab === 'harvest'
              ? 'border-cyan-600 text-cyan-600 font-bold'
              : 'border-transparent hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Log Hasil Pemanenan Kanibal ({metrics.totalHarvestedCount})</span>
        </button>
      </div>

      {/* Tab 1: Inventory Table */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari Part Number, Nama, Kategori..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              />
            </form>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto text-xs">
              {/* Branch Filter */}
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 font-bold text-orange-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                <option value="">🏢 Semua Lokasi Cabang</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>📍 [{b.code}] {b.name}</option>
                ))}
              </select>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              >
                <option value="">Semua Kategori</option>
                <option value="Memory">Memory (RAM)</option>
                <option value="Storage">Storage</option>
                <option value="Display">Display & LCD</option>
                <option value="Keyboard">Keyboard</option>
                <option value="Battery">Battery</option>
                <option value="Thermal">Thermal</option>
                <option value="Power">Power</option>
              </select>

              <label className="flex items-center space-x-2 cursor-pointer bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-700 font-semibold select-none">
                <input
                  type="checkbox"
                  checked={onlyLowStock}
                  onChange={(e) => setOnlyLowStock(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500"
                />
                <span className="text-red-600 font-bold">⚠️ Reorder Trigger Only</span>
              </label>

              <button
                onClick={fetchData}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Parts Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs">Memuat katalog stok inventaris...</p>
              </div>
            ) : parts.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Package className="w-10 h-10 mx-auto text-slate-300" />
                <p className="font-semibold text-slate-600">Tidak ada data spare part ditemukan.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                      <th className="py-3 px-4">Nomor Part & SKU</th>
                      <th className="py-3 px-4">Cabang</th>
                      <th className="py-3 px-4">Nama Spare Part</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4">Stok Saat Ini</th>
                      <th className="py-3 px-4">Min Trigger</th>
                      <th className="py-3 px-4">Harga Satuan (Rp)</th>
                      <th className="py-3 px-4">Status Reorder</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parts.map((item) => {
                      const isLow = item.stock_quantity <= item.min_stock_trigger;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            {item.part_number}
                          </td>
                          <td className="py-3.5 px-4">
                            {item.branch ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-800 text-[10px] font-bold">
                                <MapPin className="w-3 h-3 text-orange-500" />
                                <span>[{item.branch.code}] {item.branch.name}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {item.name}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-600">
                              {item.category}
                            </span>
                          </td>
                          <td className={`py-3.5 px-4 font-extrabold text-sm ${isLow ? 'text-red-600' : 'text-slate-900'}`}>
                            {item.stock_quantity} Unit
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-500 font-semibold">
                            {item.min_stock_trigger}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                            Rp {parseInt(item.unit_cost).toLocaleString('id-ID')}
                          </td>
                          <td className="py-3.5 px-4">
                            {isLow ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 flex items-center space-x-1 w-fit">
                                <AlertTriangle className="w-3 h-3 text-red-500" />
                                <span>Stok Kritis! Reorder</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 w-fit">
                                Stok Aman
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Harvest Logs Table */}
      {activeTab === 'harvest' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs">Memuat log audit pemananen...</p>
            </div>
          ) : harvestLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <History className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-semibold text-slate-600">Belum ada riwayat pemananen part kanibal.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                    <th className="py-3 px-4">Kode Panen</th>
                    <th className="py-3 px-4">Unit Perangkat Sumber</th>
                    <th className="py-3 px-4">Part Dipanen</th>
                    <th className="py-3 px-4">Kuantitas</th>
                    <th className="py-3 px-4">Kondisi Hasil Panen</th>
                    <th className="py-3 px-4">Teknisi Pemanen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {harvestLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {log.harvest_code}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-cyan-600 font-semibold">
                        {log.sourceDevice?.device_id} ({log.sourceDevice?.brand} {log.sourceDevice?.model})
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {log.part?.name} ({log.part?.part_number})
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-emerald-700 text-sm">
                        +{log.quantity} Unit
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[10px] font-bold">
                          {log.condition}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {log.harvestedBy?.full_name || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AddPartModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={(msg) => {
          showToast(msg);
          fetchData();
        }}
      />

      <HarvestPartModal
        isOpen={isHarvestOpen}
        onClose={() => setIsHarvestOpen(false)}
        onSuccess={(msg) => {
          showToast(msg);
          fetchData();
        }}
      />
    </div>
  );
};

export default Parts;
