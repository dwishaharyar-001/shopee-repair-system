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
  Laptop,
  ArrowRight,
  FileCheck,
  Calculator
} from 'lucide-react';
import { qcService } from '../services/qcService';
import { bastService } from '../services/bastService';
import { diagnosticService } from '../services/diagnosticService';
import api from '../services/api';
import QCCheckpoint1Modal from '../components/QCCheckpoint1Modal';
import QCCheckpoint2Modal from '../components/QCCheckpoint2Modal';
import SEABastVerificationModal from '../components/SEABastVerificationModal';
import SEABudgetApprovalModal from '../components/SEABudgetApprovalModal';

const QC = () => {
  const [activeTab, setActiveTab] = useState('sea_bast'); // 'sea_bast', 'qc1', 'qc2', 'history'
  const [pendingBasts, setPendingBasts] = useState([]);
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
  const [selectedBastId, setSelectedBastId] = useState(null);
  const [isSeaBastModalOpen, setIsSeaBastModalOpen] = useState(false);
  const [pendingBudgetOrders, setPendingBudgetOrders] = useState([]);
  const [selectedBudgetOrder, setSelectedBudgetOrder] = useState(null);
  const [isSeaBudgetModalOpen, setIsSeaBudgetModalOpen] = useState(false);

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

      if (activeTab === 'sea_bast') {
        const bastRes = await bastService.getPendingSeaBasts();
        if (bastRes.success) setPendingBasts(bastRes.data);
      } else if (activeTab === 'sea_budget') {
        const budgetRes = await diagnosticService.getPendingDiagnosticApprovals();
        if (budgetRes.success) setPendingBudgetOrders(budgetRes.data);
      } else if (activeTab === 'history') {
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
    <div className="space-y-4 sm:space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 text-xs flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">
            QC Management & Pass Rate Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit Checkpoint 1 (Arisa Hardware) & Checkpoint 2 (Shopee Release Verification)
          </p>
        </div>

        <button
          onClick={fetchData}
          className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 active:scale-95"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Data QC</span>
        </button>
      </div>

      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* QC1 Pass Rate */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-bold text-amber-600 uppercase tracking-wider block truncate">QC1 Arisa Pass Rate</span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">{metrics.qc1PassRate}%</div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 font-medium truncate">
            {metrics.passedQC1} / {metrics.totalQC1} Unit Lulus
          </div>
        </div>

        {/* QC2 Pass Rate */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-bold text-purple-600 uppercase tracking-wider block truncate">QC2 Final Pass Rate</span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">{metrics.qc2PassRate}%</div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 font-medium truncate">
            {metrics.passedQC2} / {metrics.totalQC2} Unit Lulus
          </div>
        </div>

        {/* Overall Pass Rate */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 uppercase tracking-wider block truncate">Overall Pass Rate</span>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-1">{metrics.overallPassRate}%</div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 font-medium truncate">
            {metrics.overallPassed || 0} / {metrics.overallTotal || 0} Total Audit
          </div>
        </div>

        {/* Rejected Units */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-bold text-red-600 uppercase tracking-wider block truncate">Unit Rejected (Rework)</span>
          <div className="text-xl sm:text-2xl font-extrabold text-red-600 mt-1">{metrics.totalRejected}</div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 font-medium truncate">
            Masuk Antrean Rework 48h
          </div>
        </div>
      </div>

      {/* Tabs Bar (Mobile friendly stack/wrap) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-1.5 flex flex-col sm:flex-row gap-1.5 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('sea_bast')}
          className={`flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center space-x-2 text-center ${
            activeTab === 'sea_bast'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/20 font-bold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileCheck className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">Verifikasi BAST Intake (QC Client)</span>
        </button>

        <button
          onClick={() => setActiveTab('sea_budget')}
          className={`flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center space-x-2 text-center ${
            activeTab === 'sea_budget'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20 font-bold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calculator className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">Approval Budget & Rencana (QC Client)</span>
        </button>

        <button
          onClick={() => setActiveTab('qc1')}
          className={`flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center space-x-2 text-center ${
            activeTab === 'qc1'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20 font-bold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">Antrean QC1 Arisa (Hardware)</span>
        </button>

        <button
          onClick={() => setActiveTab('qc2')}
          className={`flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center space-x-2 text-center ${
            activeTab === 'qc2'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20 font-bold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Award className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">Antrean QC2 Final Release</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center space-x-2 text-center ${
            activeTab === 'history'
              ? 'bg-slate-900 text-white shadow-md font-bold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">Riwayat Audit Log QC</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs">Memuat data pengujian QC...</p>
          </div>
        ) : activeTab === 'sea_bast' ? (
          /* Task Item Queue: SEA BAST Verification Table & Cards */
          pendingBasts.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
              <p className="font-semibold text-slate-600 text-sm">Belum ada dokumen BAST intake harian yang terdaftar saat ini.</p>
              <p className="text-xs">Dokumen BAST intake harian yang dikirim oleh Coordinator Arisa akan otomatis terdaftar di sini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                    <th className="py-3 px-4">Nomor BAST</th>
                    <th className="py-3 px-4">Tanggal Intake</th>
                    <th className="py-3 px-4">Jumlah Perangkat</th>
                    <th className="py-3 px-4">First Party (Coordinator)</th>
                    <th className="py-3 px-4">Status Dokumen BAST</th>
                    <th className="py-3 px-4 text-center">Aksi Verifikasi / Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingBasts.map((bast) => {
                    const isPending = bast.status === 'Submitted_to_SEA';
                    const isApproved = bast.status === 'Approved_SEA';
                    const isRevision = bast.status === 'Revision_Requested';

                    return (
                      <tr key={bast.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {bast.bast_number}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {bast.intake_date || new Date(bast.created_at).toLocaleDateString('id-ID')}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-blue-900 font-mono">
                          {bast.items?.length || 0} Unit Perangkat
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          {bast.firstPartyUser?.full_name || 'Coordinator Arisa'}
                        </td>
                        <td className="py-3.5 px-4">
                          {isPending ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-amber-50 text-amber-800 border-amber-300 inline-flex items-center space-x-1">
                              <span>⏳ Menunggu Verifikasi QC Client</span>
                            </span>
                          ) : isApproved ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-800 border-emerald-300 inline-flex items-center space-x-1">
                              <span>✅ Terverifikasi (Approved)</span>
                            </span>
                          ) : isRevision ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-rose-50 text-rose-800 border-rose-300 inline-flex items-center space-x-1">
                              <span>⚠️ Minta Revisi BAST</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-slate-100 text-slate-700 border-slate-300">
                              {bast.status}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isPending ? (
                            <button
                              onClick={() => {
                                setSelectedBastId(bast.id);
                                setIsSeaBastModalOpen(true);
                              }}
                              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-600/20 flex items-center space-x-1.5 mx-auto"
                            >
                              <ShieldCheck className="w-4 h-4" />
                              <span>Verifikasi BAST Per Item</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedBastId(bast.id);
                                setIsSeaBastModalOpen(true);
                              }}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 mx-auto ${
                                isApproved
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                  : 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
                              }`}
                            >
                              {isApproved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                              <span>{isApproved ? 'Lihat Detail (Approved)' : 'Lihat Catatan Revisi'}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === 'sea_budget' ? (
          /* Task Item Queue: SEA Diagnostic Budget Approval Table */
          pendingBudgetOrders.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
              <p className="font-semibold text-slate-600 text-sm">Tidak ada antrean Rencana Anggaran Biaya (RAB) yang memerlukan approval QC SEA saat ini.</p>
              <p className="text-xs">Semua Rencana Perbaikan Diagnosa dari Teknisi telah diproses.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                    <th className="py-3 px-4">ServiceID & Perangkat</th>
                    <th className="py-3 px-4">Cabang</th>
                    <th className="py-3 px-4">Teknisi Diagnosa</th>
                    <th className="py-3 px-4 text-right">Biaya Sparepart</th>
                    <th className="py-3 px-4 text-right">Biaya Service</th>
                    <th className="py-3 px-4 text-right">Total Budget</th>
                    <th className="py-3 px-4 text-center">Aksi Review Budget</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingBudgetOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-semibold">
                        <div className="text-slate-900 font-mono text-xs font-bold">
                          {order.service_id}
                        </div>
                        <div className="text-[11px] text-slate-600 font-medium">
                          {order.device?.brand} {order.device?.model}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{order.device?.serial_number}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {order.branch?.name || '-'}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-emerald-700">
                        {order.assignedTechnician?.user?.full_name || 'Teknisi Arisa'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-800">
                        Rp {parseFloat(order.estimated_part_cost || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-cyan-800">
                        Rp {parseFloat(order.estimated_service_cost || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-purple-900">
                        Rp {parseFloat(order.total_estimated_cost || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedBudgetOrder(order);
                            setIsSeaBudgetModalOpen(true);
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center space-x-1.5 mx-auto"
                        >
                          <Calculator className="w-4 h-4" />
                          <span>Review Budget & Approval</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === 'history' ? (
          /* History Audit Table & Mobile Cards */
          historyLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <History className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-semibold text-slate-600 text-sm">Belum ada riwayat audit QC terdaftar.</p>
            </div>
          ) : (
            <>
              {/* Mobile View: Cards */}
              <div className="block md:hidden divide-y divide-slate-100 p-3 space-y-3">
                {historyLogs.map((log) => (
                  <div key={log.id} className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-900">{log.qc_code}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        log.checkpoint_type === 'Checkpoint 1' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-purple-50 text-purple-700 border-purple-200'
                      }`}>
                        {log.checkpoint_type}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-800">
                      {log.serviceOrder?.device?.brand} {log.serviceOrder?.device?.model}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>SN: {log.serviceOrder?.device?.serial_number}</span>
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${
                        log.overall_result === 'Passed' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-red-100 text-red-800 border-red-300'
                      }`}>
                        {log.overall_result}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200 flex justify-between">
                      <span>Inspector: {log.inspector?.full_name}</span>
                      <span>{new Date(log.qc_date).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden md:block overflow-x-auto">
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
            </>
          )
        ) : (
          /* Pending Queue Tables & Mobile Cards */
          pendingOrders.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
              <p className="font-semibold text-slate-600 text-sm">Tidak ada unit di antrean {activeTab.toUpperCase()} saat ini.</p>
              <p className="text-xs">Semua perbaikan telah selesai diperiksa.</p>
            </div>
          ) : (
            <>
              {/* Mobile View: Cards */}
              <div className="block md:hidden divide-y divide-slate-100 p-3 space-y-3">
                {pendingOrders.map((row) => (
                  <div key={row.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                        {row.service_id}
                      </span>
                      <span className="font-mono text-xs font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                        {row.device?.device_id}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{row.device?.brand} {row.device?.model}</h4>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">SN: {row.device?.serial_number}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Klien: {row.customer?.name}</p>
                      <p className="text-xs text-emerald-700 font-semibold mt-0.5">Teknisi: {row.assignedTechnician?.user?.full_name || 'Unassigned'}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-200">
                      {activeTab === 'qc1' ? (
                        <button
                          type="button"
                          onClick={async () => {
                            setSelectedOrder(row);
                            setIsQC1Open(true);
                            try { await api.post(`/qc/checkpoint1/start/${row.id}`); } catch (e) {}
                          }}
                          className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-500/20 flex items-center justify-center space-x-2"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>Mulai Uji QC1 Arisa</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={async () => {
                            setSelectedOrder(row);
                            setIsQC2Open(true);
                            try { await api.post(`/qc/checkpoint2/start/${row.id}`); } catch (e) {}
                          }}
                          className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-600/20 flex items-center justify-center space-x-2"
                        >
                          <Award className="w-4 h-4" />
                          <span>Mulai Uji QC2 Final</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden md:block overflow-x-auto">
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
                              <span>Uji QC2 Final</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
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

      <SEABastVerificationModal
        isOpen={isSeaBastModalOpen}
        onClose={() => {
          setIsSeaBastModalOpen(false);
          setSelectedBastId(null);
        }}
        bastId={selectedBastId}
        onSuccess={(msg) => {
          showToast(msg);
          fetchData();
        }}
      />

      <SEABudgetApprovalModal
        isOpen={isSeaBudgetModalOpen}
        onClose={() => {
          setIsSeaBudgetModalOpen(false);
          setSelectedBudgetOrder(null);
        }}
        order={selectedBudgetOrder}
        onSuccess={(msg) => {
          showToast(msg);
          fetchData();
        }}
      />
    </div>
  );
};

export default QC;
