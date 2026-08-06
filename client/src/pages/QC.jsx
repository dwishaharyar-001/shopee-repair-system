import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  History, 
  FileText,
  TrendingUp,
  Laptop
} from 'lucide-react';
import { qcService } from '../services/qcService';
import QCCheckpoint1Modal from '../components/QCCheckpoint1Modal';
import QCCheckpoint2Modal from '../components/QCCheckpoint2Modal';

const QC = () => {
  const [activeTab, setActiveTab] = useState('qc1'); // 'qc1', 'qc2', 'history'
  const [pendingOrders, setPendingOrders] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [metrics, setMetrics] = useState({
    qc1PassRate: '100.0',
    qc2PassRate: '100.0',
    overallPassRate: '100.0',
    totalQC1: 0,
    passedQC1: 0,
    totalQC2: 0,
    passedQC2: 0,
    totalRejected: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  // Modals state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isQC1Open, setIsQC1Open] = useState(false);
  const [isQC2Open, setIsQC2Open] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const metricsRes = await qcService.getQCMetrics();
      if (metricsRes.success) {
        setMetrics(metricsRes.data);
      }

      if (activeTab === 'history') {
        const historyRes = await qcService.getQCHistory();
        if (historyRes.success) setHistoryLogs(historyRes.data);
      } else {
        const queueRes = await qcService.getQCPendingQueue(activeTab);
        if (queueRes.success) setPendingOrders(queueRes.data);
      }
    } catch (err) {
      console.error('Fetch QC data error:', err);
    } finally {
      setIsLoading(false);
    }
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

      {/* Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            QC Management & Pass Rate Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit Checkpoint 1 (Arisa Hardware) & Checkpoint 2 (Shopee Release Verification)
          </p>
        </div>

        <button
          onClick={fetchData}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Data QC</span>
        </button>
      </div>

      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* QC1 Pass Rate */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">QC1 Arisa Pass Rate</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{metrics.qc1PassRate}%</div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            {metrics.passedQC1} / {metrics.totalQC1} Unit Lulus
          </div>
        </div>

        {/* QC2 Pass Rate */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <span className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider">QC2 Shopee Pass Rate</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{metrics.qc2PassRate}%</div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            {metrics.passedQC2} / {metrics.totalQC2} Unit Lulus
          </div>
        </div>

        {/* Overall Pass Rate */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Overall Pass Rate</span>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">{metrics.overallPassRate}%</div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            {metrics.overallPassed} / {metrics.overallTotal} Total Audit
          </div>
        </div>

        {/* Rejected Units */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <span className="text-[11px] font-semibold text-red-600 uppercase tracking-wider">Unit Rejected (Rework)</span>
          <div className="text-2xl font-extrabold text-red-600 mt-1">{metrics.totalRejected}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            Masuk Antrean Rework 48h
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 flex space-x-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('qc1')}
          className={`flex-1 py-2.5 px-4 rounded-xl transition-all flex items-center justify-center space-x-2 ${
            activeTab === 'qc1'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20 font-bold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Antrean QC1 Arisa (Hardware)</span>
        </button>

        <button
          onClick={() => setActiveTab('qc2')}
          className={`flex-1 py-2.5 px-4 rounded-xl transition-all flex items-center justify-center space-x-2 ${
            activeTab === 'qc2'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20 font-bold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Antrean QC2 Shopee (Release)</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2.5 px-4 rounded-xl transition-all flex items-center justify-center space-x-2 ${
            activeTab === 'history'
              ? 'bg-slate-900 text-white shadow-md font-bold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Riwayat Audit Log QC</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs">Memuat data pengujian QC...</p>
          </div>
        ) : activeTab === 'history' ? (
          /* History Audit Table */
          historyLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <History className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-semibold text-slate-600">Belum ada riwayat audit QC terdaftar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                    <th className="py-3 px-4">Kode QC & SvcID</th>
                    <th className="py-3 px-4">Tipe Checkpoint</th>
                    <th className="py-3 px-4">Brand & Model Perangkat</th>
                    <th className="py-3 px-4">Inspector QA</th>
                    <th className="py-3 px-4">Hasil Overall</th>
                    <th className="py-3 px-4">Tanggal Release QC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <div>{log.qc_code}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{log.serviceOrder?.service_id}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          log.checkpoint_type === 'Checkpoint 1' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}>
                          {log.checkpoint_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{log.serviceOrder?.device?.brand} {log.serviceOrder?.device?.model}</div>
                        <div className="text-[10px] font-mono text-slate-400">SN: {log.serviceOrder?.device?.serial_number}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {log.inspector?.full_name} ({log.inspector?.role})
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          log.overall_result === 'Passed' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-red-100 text-red-800 border-red-300'
                        }`}>
                          {log.overall_result}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                        {new Date(log.qc_date).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Pending Queue Tables (QC1 / QC2) */
          pendingOrders.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
              <p className="font-semibold text-slate-600">Tidak ada unit di antrean {activeTab.toUpperCase()} saat ini.</p>
              <p className="text-xs">Semua perbaikan telah selesai diperiksa.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                    <th className="py-3 px-4">ServiceID & DeviceID</th>
                    <th className="py-3 px-4">Serial Number</th>
                    <th className="py-3 px-4">Brand & Model</th>
                    <th className="py-3 px-4">Teknisi Repair</th>
                    <th className="py-3 px-4">Status Saat Ini</th>
                    <th className="py-3 px-4 text-center">Aksi Audit QC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingOrders.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <div>{row.service_id}</div>
                        <div className="text-[10px] text-cyan-600 font-normal">{row.device?.device_id}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {row.device?.serial_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{row.device?.brand} {row.device?.model}</div>
                        <div className="text-[11px] text-slate-400">{row.customer?.name}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-emerald-700">
                        {row.assignedTechnician?.user?.full_name || 'Unassigned'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-amber-50 text-amber-700 border-amber-200">
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {activeTab === 'qc1' ? (
                          <button
                            onClick={async () => {
                              setSelectedOrder(row);
                              setIsQC1Open(true);
                              try { await api.post(`/qc/checkpoint1/start/${row.id}`); } catch (e) {}
                            }}
                            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-500/20 flex items-center space-x-1.5 mx-auto"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Uji QC1 Arisa</span>
                          </button>
                        ) : (
                          <button
                            onClick={async () => {
                              setSelectedOrder(row);
                              setIsQC2Open(true);
                              try { await api.post(`/qc/checkpoint2/start/${row.id}`); } catch (e) {}
                            }}
                            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-600/20 flex items-center space-x-1.5 mx-auto"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>Uji QC2 Shopee</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* QC Modals */}
      <QCCheckpoint1Modal
        isOpen={isQC1Open}
        onClose={() => {
          setIsQC1Open(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        onSuccess={(msg) => {
          showToast(msg);
          fetchData();
        }}
      />

      <QCCheckpoint2Modal
        isOpen={isQC2Open}
        onClose={() => {
          setIsQC2Open(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        onSuccess={(msg) => {
          showToast(msg);
          fetchData();
        }}
      />
    </div>
  );
};

export default QC;
