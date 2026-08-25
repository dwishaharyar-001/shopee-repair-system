import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Play, 
  Square, 
  Package, 
  Send, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  RefreshCw,
  UserCheck,
  FileText,
  Stethoscope,
  CheckSquare,
  Square as CheckboxEmpty,
  CheckCircle,
  Save,
  Trash2,
  Lock,
  Tag,
  Calculator,
  AlertOctagon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { repairService } from '../services/repairService';
import { diagnosticService } from '../services/diagnosticService';
import RequestPartModal from '../components/RequestPartModal';
import BrokenPartModal from '../components/BrokenPartModal';
import api from '../services/api';

const REPAIR_CATEGORIES = [
  'Physical Condition (Casing dan Engsel)',
  'Display (Layar dan Touchscreen)',
  'Storage & Power (Baterai dan HDD/SSD)',
  'Input Device (Keyboard dan Touchpad)',
  'Connectivity Port (Port USB, Port Jack Audio, Port HDMI, Port Charger)',
  'Audio Visual (Speaker, Microphone, dan Kamera)',
  'Wireless Connectivity (Bluetooth dan WiFi)'
];

const Repairs = () => {
  const { user } = useAuth();
  const isHidePrices = user?.role === 'Technician' || user?.role === 'QA_Liaison';

  const [queue, setQueue] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrderForPart, setSelectedOrderForPart] = useState(null);
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);

  // Broken Part State
  const [selectedOrderForBrokenPart, setSelectedOrderForBrokenPart] = useState(null);
  const [isBrokenPartModalOpen, setIsBrokenPartModalOpen] = useState(false);

  const [toastMessage, setToastMessage] = useState('');
  const [nowTime, setNowTime] = useState(Date.now());
  const [branchPricesMap, setBranchPricesMap] = useState({});
  
  // State for diagnostics, categories, action notes & fault description per order ID
  const [faultDescriptions, setFaultDescriptions] = useState({});
  const [actionNotes, setActionNotes] = useState({});
  const [diagnosticsOutcome, setDiagnosticsOutcome] = useState({});
  const [selectedCategories, setSelectedCategories] = useState({});

  const [savingFault, setSavingFault] = useState({});
  const [savingAction, setSavingAction] = useState({});
  const [savingDiagnostics, setSavingDiagnostics] = useState({});
  const [savingCategory, setSavingCategory] = useState({});

  useEffect(() => {
    fetchQueue();
    fetchBranchPrices();
  }, []);

  // Live Timer Tick Interval
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchBranchPrices = async () => {
    try {
      const res = await api.get('/branches/repair-prices');
      if (res.data && res.data.success) {
        const map = {};
        res.data.data.forEach(p => {
          map[`${p.branch_id}:${p.category_name}`] = parseFloat(p.price) || 0;
        });
        setBranchPricesMap(map);
      }
    } catch (err) {
      console.error('Fetch repair prices error:', err);
    }
  };

  const getCategoryPrice = (branchId, catName) => {
    if (!branchId) return 0;
    return branchPricesMap[`${branchId}:${catName}`] || 0;
  };

  // Rule: Taken ONLY the maximum price among selected categories (NOT accumulated)
  const calculateMaxLaborFee = (branchId, categoriesList = []) => {
    if (!categoriesList || categoriesList.length === 0) return 0;
    const prices = categoriesList.map(cat => getCategoryPrice(branchId, cat));
    return Math.max(...prices);
  };

  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      const res = await repairService.getWorkQueue();
      if (res.success) {
        setQueue(res.data);

        // Pre-populate forms from active log and order
        const initialFault = {};
        const initialNotes = {};
        const initialOutcome = {};
        const initialCat = {};

        res.data.forEach(item => {
          initialFault[item.id] = item.fault_description || '';

          const sortedLogs = item.repairLogs && item.repairLogs.length > 0 
            ? [...item.repairLogs].sort((a, b) => b.id - a.id) 
            : [];
          const activeLog = sortedLogs.length > 0 ? sortedLogs[0] : null;
          if (activeLog) {
            initialNotes[item.id] = activeLog.action_taken || '';
            initialOutcome[item.id] = activeLog.diagnostics_outcome || '';
            
            let cats = [];
            if (activeLog.repair_categories) {
              try {
                cats = typeof activeLog.repair_categories === 'string' ? JSON.parse(activeLog.repair_categories) : activeLog.repair_categories;
              } catch (e) {
                cats = [activeLog.repair_categories];
              }
            }
            initialCat[item.id] = Array.isArray(cats) ? cats : [];
          }
        });

        // PRESERVE user draft entries if user has typed something locally!
        setFaultDescriptions(prev => {
          const next = { ...initialFault };
          Object.keys(prev).forEach(id => {
            if (prev[id] !== undefined && prev[id] !== '') next[id] = prev[id];
          });
          return next;
        });

        setActionNotes(prev => {
          const next = { ...initialNotes };
          Object.keys(prev).forEach(id => {
            if (prev[id] !== undefined && prev[id] !== '') next[id] = prev[id];
          });
          return next;
        });

        setDiagnosticsOutcome(prev => {
          const next = { ...initialOutcome };
          Object.keys(prev).forEach(id => {
            if (prev[id] !== undefined && prev[id] !== '') next[id] = prev[id];
          });
          return next;
        });

        setSelectedCategories(prev => {
          const next = { ...initialCat };
          Object.keys(prev).forEach(id => {
            if (prev[id] !== undefined && prev[id].length > 0) next[id] = prev[id];
          });
          return next;
        });
      }
    } catch (err) {
      console.error('Fetch work queue error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getLiveDurationDisplay = (log) => {
    if (!log) return '0m 0s';
    
    let totalSecs = log.duration_seconds !== undefined && log.duration_seconds !== null
      ? log.duration_seconds
      : ((log.duration_minutes || 0) * 60);

    if (log.repair_status === 'In Progress' && log.start_time) {
      const startMs = new Date(log.start_time).getTime();
      const elapsedMs = Math.max(0, nowTime - startMs);
      totalSecs += Math.floor(elapsedMs / 1000);
    }

    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}m ${s}s`;
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const [submittingDiagnostic, setSubmittingDiagnostic] = useState({});

  const handleCategoryToggle = (orderId, catName, canEdit = true) => {
    if (!canEdit) {
      showToast('⚠️ Kategori perbaikan terkunci (Menunggu persetujuan QC SEA).');
      return;
    }
    setSelectedCategories(prev => {
      const currentList = prev[orderId] || [];
      if (currentList.includes(catName)) {
        return { ...prev, [orderId]: currentList.filter(c => c !== catName) };
      } else {
        return { ...prev, [orderId]: [...currentList, catName] };
      }
    });
  };

  const handleSubmitDiagnosticPlan = async (orderId) => {
    setSubmittingDiagnostic(prev => ({ ...prev, [orderId]: true }));
    try {
      const fault = faultDescriptions[orderId] || '';
      const outcome = diagnosticsOutcome[orderId] || '';
      const categories = selectedCategories[orderId] || [];

      const activeOrder = queue.find(q => q.id === orderId);
      const plannedParts = (activeOrder?.diagnosticPlanItems || activeOrder?.consumedParts || []).map(item => ({
        part_id: item.part_id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        category_name: item.category_name
      }));

      const res = await diagnosticService.submitDiagnosticPlan(orderId, {
        fault_description: fault,
        diagnostics_outcome: outcome,
        selected_categories: categories,
        planned_parts: plannedParts
      });

      if (res && res.success) {
        showToast(res.message);
        fetchQueue();
      } else {
        showToast(res?.message || 'Gagal mengirim Rencana Diagnosa ke QC SEA.');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal mengirim Rencana Diagnosa ke QC SEA.');
    } finally {
      setSubmittingDiagnostic(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // 1. Save Fault Description (Keluhan Kerusakan)
  const handleSaveFaultDescription = async (orderId) => {
    setSavingFault(prev => ({ ...prev, [orderId]: true }));
    try {
      const fault = faultDescriptions[orderId] || '';
      const res = await repairService.saveDiagnostics(orderId, {
        fault_description: fault
      });
      if (res.success) {
        showToast('Deskripsi keluhan kerusakan berhasil disimpan!');
      }
    } catch (err) {
      showToast('Gagal menyimpan keluhan kerusakan.');
    } finally {
      setSavingFault(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // 2. Save Action Taken (Tindakan Perbaikan)
  const handleSaveActionTaken = async (orderId, isTimerRunning) => {
    if (!isTimerRunning) {
      showToast('⚠️ Klik "Mulai Perbaikan" terlebih dahulu untuk menyimpan catatan tindakan.');
      return;
    }
    setSavingAction(prev => ({ ...prev, [orderId]: true }));
    try {
      const note = actionNotes[orderId] || '';
      const res = await repairService.saveDiagnostics(orderId, {
        action_taken: note
      });
      if (res.success) {
        showToast('Catatan tindakan perbaikan berhasil disimpan!');
      }
    } catch (err) {
      showToast('Gagal menyimpan catatan tindakan.');
    } finally {
      setSavingAction(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // 3. Save Diagnostics Outcome
  const handleSaveDiagnosticsOnly = async (orderId, isTimerRunning) => {
    if (!isTimerRunning) {
      showToast('⚠️ Klik "Mulai Perbaikan" terlebih dahulu untuk menyimpan diagnostik.');
      return;
    }
    setSavingDiagnostics(prev => ({ ...prev, [orderId]: true }));
    try {
      const outcome = diagnosticsOutcome[orderId] || '';
      const res = await repairService.saveDiagnostics(orderId, {
        diagnostics_outcome: outcome
      });

      if (res.success) {
        showToast('Hasil outcome diagnostik berhasil disimpan!');
      }
    } catch (err) {
      showToast('Gagal menyimpan hasil diagnostik.');
    } finally {
      setSavingDiagnostics(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // 4. Save Kategori Perbaikan
  const handleSaveCategoriesOnly = async (orderId, isTimerRunning) => {
    if (!isTimerRunning) {
      showToast('⚠️ Klik "Mulai Perbaikan" terlebih dahulu untuk menyimpan kategori perbaikan.');
      return;
    }
    setSavingCategory(prev => ({ ...prev, [orderId]: true }));
    try {
      const categories = selectedCategories[orderId] || [];
      const res = await repairService.saveDiagnostics(orderId, {
        repair_categories: categories
      });
      if (res.success) {
        showToast('Kategori perbaikan berhasil disimpan!');
      }
    } catch (err) {
      showToast('Gagal menyimpan kategori perbaikan.');
    } finally {
      setSavingCategory(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // Auto-save all draft values for an order before key actions
  const autoSaveDraftValues = async (orderId) => {
    try {
      await repairService.saveDiagnostics(orderId, {
        fault_description: faultDescriptions[orderId] || '',
        action_taken: actionNotes[orderId] || '',
        diagnostics_outcome: diagnosticsOutcome[orderId] || '',
        repair_categories: selectedCategories[orderId] || []
      });
    } catch (e) {
      console.warn('Auto save draft warning:', e);
    }
  };

  const handleRemovePart = async (orderId, partConsumedId, partName, isTimerRunning) => {
    if (!isTimerRunning) {
      showToast('⚠️ Klik "Mulai Perbaikan" terlebih dahulu untuk mengurangi spare part.');
      return;
    }
    if (!window.confirm(`Apakah Anda yakin ingin mengurangi / menghapus spare part '${partName}'? Stok akan dikembalikan ke inventaris.`)) {
      return;
    }
    try {
      await autoSaveDraftValues(orderId);
      const res = await repairService.removePartConsumed(orderId, partConsumedId);
      if (res.success) {
        showToast(res.message);
        fetchQueue();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal mengurangi spare part.');
    }
  };

  const handleRemoveBrokenPart = async (orderId, brokenPartId, categoryName, isTimerRunning) => {
    if (!isTimerRunning) {
      showToast('⚠️ Klik "Mulai Perbaikan" terlebih dahulu untuk mengelola catatan spare part rusak.');
      return;
    }
    if (!window.confirm(`Apakah Anda yakin ingin menghapus catatan spare part rusak '${categoryName}'?`)) {
      return;
    }
    try {
      await autoSaveDraftValues(orderId);
      const res = await repairService.removeBrokenPart(brokenPartId);
      if (res.success) {
        showToast(res.message);
        fetchQueue();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menghapus catatan spare part rusak.');
    }
  };

  const handleStartTimer = async (orderId) => {
    try {
      await autoSaveDraftValues(orderId);
      const res = await repairService.startTimer(orderId);
      if (res.success) {
        showToast(res.message);
        fetchQueue();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal memulai timer.');
    }
  };

  const handleStopTimer = async (orderId) => {
    const note = actionNotes[orderId] || 'Pemberhentian timer sementara / perbaikan dalam proses.';
    const outcome = diagnosticsOutcome[orderId] || '';
    const categories = selectedCategories[orderId] || [];

    try {
      const res = await repairService.stopTimer(orderId, {
        action_taken: note,
        diagnostics_outcome: outcome,
        repair_categories: categories
      });
      if (res.success) {
        showToast(res.message);
        fetchQueue();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menghentikan timer.');
    }
  };

  const handleSubmitQC1 = async (orderId) => {
    const note = actionNotes[orderId] || 'Perbaikan hardware dan testing fungsional selesai.';
    const outcome = diagnosticsOutcome[orderId] || '';
    const categories = selectedCategories[orderId] || [];

    try {
      // First save diagnostics
      await repairService.saveDiagnostics(orderId, {
        fault_description: faultDescriptions[orderId] || '',
        diagnostics_outcome: outcome,
        repair_categories: categories,
        action_taken: note
      });

      const res = await repairService.submitToQC1(orderId, note);
      if (res.success) {
        showToast(res.message);
        fetchQueue();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal submit ke QC1.');
    }
  };

  const calculateTotalCost = (consumedParts = []) => {
    return consumedParts.reduce((acc, curr) => acc + (parseFloat(curr.total_cost) || 0), 0);
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

      {/* Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Technician Work Queue & Timer
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan Waktu Perbaikan, Diagnostik General, Kategori Perbaikan{!isHidePrices ? ' (Tarif Max Cabang)' : ''}, dan Konsumsi Spare Part
          </p>
        </div>

        <button
          onClick={() => {
            fetchQueue();
            fetchBranchPrices();
          }}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Work Queue</span>
        </button>
      </div>

      {/* Queue Items List */}
      {isLoading ? (
        <div className="bg-white rounded-2xl p-12 text-center text-slate-400 space-y-3 border border-slate-200">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold">Memuat antrean kerja teknisi...</p>
        </div>
      ) : queue.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-slate-400 space-y-2 border border-slate-200">
          <Wrench className="w-10 h-10 mx-auto text-slate-300" />
          <p className="font-semibold text-slate-600">Tidak ada unit di antrean perbaikan saat ini.</p>
          <p className="text-xs">Semua perangkat dalam status siap atau sudah berada di tahap QC.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {queue.map((item) => {
            const sortedLogs = item.repairLogs && item.repairLogs.length > 0 
              ? [...item.repairLogs].sort((a, b) => b.id - a.id) 
              : [];
            const activeLog = sortedLogs.length > 0 ? sortedLogs[0] : null;
            const isTimerRunning = activeLog && activeLog.repair_status === 'In Progress';
            const isRework = item.status === 'Rework';
            const currentCatList = selectedCategories[item.id] || [];

            // CALCULATION FORMULA:
            // Total = General Diagnostics Fee + Max Category Price (not accumulated) + Spare Parts Cost
            const diagnosticsFee = getCategoryPrice(item.branch_id, 'General Diagnostics Fee') || 50000;
            const maxCategoryLaborFee = calculateMaxLaborFee(item.branch_id, currentCatList);
            const sparePartsTotal = calculateTotalCost(item.consumedParts);
            const grandTotal = diagnosticsFee + maxCategoryLaborFee + sparePartsTotal;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border transition-all shadow-sm ${
                  isRework ? 'border-red-300 ring-1 ring-red-200' : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                {/* SLA Warning Banner if Rework */}
                {isRework && (
                  <div className="bg-red-500 text-white px-6 py-2 rounded-t-2xl flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 animate-pulse" />
                      <span>PERINGATAN REWORK SLA: Target Penyelesaian Max 48 Jam!</span>
                    </div>
                    <span className="font-mono text-xs bg-red-700 px-2 py-0.5 rounded">
                      SLA Deadline: {activeLog?.rework_sla_deadline ? new Date(activeLog.rework_sla_deadline).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '48 Hours Limit'}
                    </span>
                  </div>
                )}

                <div className="p-6 space-y-6">
                  {/* QC Audit & Rework Notes Banner for Technicians */}
                  {(isRework || (item.qcCheckpoints && item.qcCheckpoints.length > 0)) && (
                    <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                        <span className="flex items-center space-x-1.5">
                          <AlertOctagon className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>Catatan Audit QC ({item.qcCheckpoints && item.qcCheckpoints.length > 0 ? item.qcCheckpoints[item.qcCheckpoints.length - 1].checkpoint_type : 'QC Inspection'}):</span>
                        </span>
                        {item.qcCheckpoints && item.qcCheckpoints.length > 0 && (
                          <span className="font-mono text-[10px] bg-amber-200 px-2 py-0.5 rounded text-amber-900 font-extrabold">
                            Inspector: {item.qcCheckpoints[item.qcCheckpoints.length - 1].inspector?.full_name || 'QC Team'} ({item.qcCheckpoints[item.qcCheckpoints.length - 1].overall_result})
                          </span>
                        )}
                      </div>

                      {item.qcCheckpoints && item.qcCheckpoints.length > 0 && item.qcCheckpoints[item.qcCheckpoints.length - 1].failure_reason && (
                        <div className="text-xs text-amber-950 font-medium">
                          <strong className="text-amber-900">Penyebab Gagal Audit QC:</strong> {item.qcCheckpoints[item.qcCheckpoints.length - 1].failure_reason}
                        </div>
                      )}

                      {item.qcCheckpoints && item.qcCheckpoints.length > 0 && item.qcCheckpoints[item.qcCheckpoints.length - 1].rework_notes && (
                        <div className="text-xs text-slate-800 bg-white p-3 rounded-xl border border-amber-300 font-mono font-semibold">
                          <strong className="text-rose-700 block mb-0.5">⚠️ Catatan Rework & Instruksi Perbaikan:</strong>
                          {item.qcCheckpoints[item.qcCheckpoints.length - 1].rework_notes}
                        </div>
                      )}

                      {/* Fallback to order.notes if notes contain QC comments */}
                      {(!item.qcCheckpoints || item.qcCheckpoints.length === 0) && item.notes && (
                        <div className="text-xs text-slate-800 bg-white p-3 rounded-xl border border-amber-300 font-mono font-semibold">
                          <strong className="text-rose-700 block mb-0.5">⚠️ Catatan Rework / Audit QC:</strong>
                          {item.notes}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Top Bar Info */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="font-mono text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full">
                          {item.service_id}
                        </span>
                        <span className="font-mono text-xs font-bold text-cyan-600 bg-cyan-50 border border-cyan-200 px-2.5 py-0.5 rounded-full">
                          {item.device?.device_id}
                        </span>
                        <span className="text-xs font-semibold text-slate-600">
                          {item.customer?.name}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-1">
                        {item.device?.brand} {item.device?.model}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-400 font-mono mt-0.5">
                        SN: {item.device?.serial_number} | Asset: {item.device?.asset_type}
                      </p>

                      {/* Phase Status Badge */}
                      <div className="mt-2 flex items-center space-x-2">
                        {item.status === 'Diagnostic_Pending_Approval' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                            <span>Phase 1: Menunggu Approval Budget QC SEA</span>
                          </span>
                        ) : item.status === 'Diagnostic_Revision' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300 flex items-center space-x-1">
                            <RefreshCw className="w-3 h-3 text-purple-600" />
                            <span>Phase 1: QC SEA Meminta Revisi Diagnosa</span>
                          </span>
                        ) : item.status === 'Harvested' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center space-x-1">
                            <AlertOctagon className="w-3 h-3 text-rose-600" />
                            <span>Perbaikan Ditolak (Kanibalisasi / Harvested)</span>
                          </span>
                        ) : item.status === 'In Repair' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Phase 2: Service Perbaikan (Budget Approved)</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 flex items-center space-x-1">
                            <Stethoscope className="w-3 h-3 text-blue-600" />
                            <span>Phase 1: Diagnostics & Rencana Perbaikan</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Timer Control Box */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                      <div className="bg-slate-900 text-white px-3 sm:px-4 py-2 rounded-xl text-center font-mono shadow-inner flex-1 sm:min-w-36">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">Durasi Kerja</div>
                        <div className={`text-sm sm:text-base font-bold flex items-center justify-center gap-1.5 ${
                          isTimerRunning ? 'text-emerald-400 animate-pulse' : 'text-slate-400'
                        }`}>
                          <Clock className="w-3.5 h-3.5" />
                          <span>{getLiveDurationDisplay(activeLog)}</span>
                        </div>
                      </div>

                      {item.status === 'In Repair' && (
                        isTimerRunning ? (
                          <button
                            type="button"
                            onClick={() => handleStopTimer(item.id)}
                            className="w-full sm:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center justify-center space-x-1.5 active:scale-95"
                          >
                            <Square className="w-4 h-4 fill-white" />
                            <span>Stop / Pause Service</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleStartTimer(item.id)}
                            className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center justify-center space-x-1.5 active:scale-95"
                          >
                            <Play className="w-4 h-4 fill-white" />
                            <span>Mulai Service</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Pending Approval Notice Banner */}
                  {item.status === 'Diagnostic_Pending_Approval' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs space-y-1 text-amber-900">
                      <div className="font-bold flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                        <span>Rencana Perbaikan & Anggaran Biaya telah dikirim ke QC SEA.</span>
                      </div>
                      <p className="text-[11px] text-amber-800">
                        Pekerjaan fisik Phase Service saat ini terkunci hingga tim QC SEA memberikan persetujuan Rencana Anggaran Biaya.
                      </p>
                    </div>
                  )}

                  {/* Revision Requested Notice Banner */}
                  {item.status === 'Diagnostic_Revision' && (
                    <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-xs space-y-1 text-purple-900">
                      <div className="font-bold flex items-center space-x-2">
                        <RefreshCw className="w-4 h-4 text-purple-600" />
                        <span>QC SEA Meminta Revisi Rencana Perbaikan & Budget.</span>
                      </div>
                      <p className="text-[11px] text-purple-800 bg-white p-2.5 rounded-xl border border-purple-200">
                        {item.notes || 'Harap periksa kembali hasil diagnosa dan kebutuhan sparepart.'}
                      </p>
                    </div>
                  )}

                  {/* Harvested Notice Banner */}
                  {item.status === 'Harvested' && (
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs space-y-1 text-rose-900">
                      <div className="font-bold flex items-center space-x-2">
                        <AlertOctagon className="w-4 h-4 text-rose-600" />
                        <span>Device Ditolak Perbaikan & Dipindahkan ke Kanibalisasi (Harvested).</span>
                      </div>
                      <p className="text-[11px] text-rose-800">
                        Alasan: {item.harvest_reason || 'Kebutuhan sparepart/biaya tidak disetujui oleh QC SEA.'}
                      </p>
                    </div>
                  )}

                  {/* Timer Paused Lock Notice Banner */}
                  {!isTimerRunning && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs flex items-center justify-between text-amber-900">
                      <div className="flex items-center space-x-2">
                        <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>
                          <strong>Sesi Perbaikan Non-Aktif / Paused.</strong> Seluruh kontrol, pengisian diagnostik, kategori, & spare part terkunci.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStartTimer(item.id)}
                        className="text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-3 py-1 rounded-lg transition-colors flex items-center space-x-1"
                      >
                        <Play className="w-3 h-3 fill-emerald-800" />
                        <span>Klik Mulai Perbaikan</span>
                      </button>
                    </div>
                  )}

                  {/* Fault Info & Action Taken Notes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Fault Info */}
                    <div className="bg-amber-50/60 border border-amber-200/80 p-4 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase text-amber-800 tracking-wider block">
                          Keluhan Kerusakan (Initial Fault):
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSaveFaultDescription(item.id)}
                          disabled={savingFault[item.id]}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition-colors flex items-center space-x-1 shadow-xs disabled:opacity-40"
                        >
                          <Save className="w-3 h-3" />
                          <span>{savingFault[item.id] ? 'Simpan...' : 'Simpan Keluhan'}</span>
                        </button>
                      </div>
                      <textarea
                        rows="2"
                        value={faultDescriptions[item.id] !== undefined ? faultDescriptions[item.id] : (item.fault_description || '')}
                        onChange={(e) => setFaultDescriptions({ ...faultDescriptions, [item.id]: e.target.value })}
                        placeholder="Tuliskan keluhan / kendala awal perangkat..."
                        className="w-full bg-white border border-amber-200 rounded-xl px-3 py-1.5 text-xs text-amber-900 focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
                      ></textarea>
                    </div>

                    {/* Action Taken Input */}
                    <div className="space-y-1 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-800">
                          Catatan Tindakan Perbaikan (Action Taken):
                        </label>
                        <button
                          type="button"
                          onClick={() => handleSaveActionTaken(item.id, isTimerRunning)}
                          disabled={!isTimerRunning || savingAction[item.id]}
                          className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-[10px] font-bold transition-colors flex items-center space-x-1 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Save className="w-3 h-3" />
                          <span>{savingAction[item.id] ? 'Simpan...' : 'Simpan Tindakan'}</span>
                        </button>
                      </div>
                      <textarea
                        rows="2"
                        disabled={!isTimerRunning}
                        value={actionNotes[item.id] || ''}
                        onChange={(e) => setActionNotes({ ...actionNotes, [item.id]: e.target.value })}
                        placeholder={isTimerRunning ? "Tuliskan langkah tindakan perbaikan atau penggantian yang dilakukan..." : "Klik 'Mulai Perbaikan' untuk mengisi catatan..."}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                      ></textarea>
                    </div>
                  </div>

                  {/* SECTION 1: General Diagnostics & Outcome */}
                  <div className={`border p-4 rounded-2xl space-y-3 transition-all ${
                    isTimerRunning ? 'bg-indigo-50/70 border-indigo-200/80' : 'bg-slate-100/70 border-slate-200 opacity-75'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Stethoscope className={`w-4 h-4 ${isTimerRunning ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span className={`text-xs font-bold uppercase tracking-wider ${isTimerRunning ? 'text-indigo-900' : 'text-slate-600'}`}>
                          General Diagnostics{!isHidePrices ? ` (Tarif: Rp ${diagnosticsFee.toLocaleString('id-ID')})` : ''}
                        </span>
                        {!isTimerRunning && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSaveDiagnosticsOnly(item.id, isTimerRunning)}
                        disabled={!isTimerRunning || savingDiagnostics[item.id]}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-semibold transition-colors flex items-center space-x-1 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{savingDiagnostics[item.id] ? 'Menyimpan...' : 'Simpan Diagnostik'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: General Diagnostics Info */}
                      <div className="bg-white p-3.5 rounded-xl border border-indigo-100 space-y-1 text-xs">
                        <span className="font-bold text-indigo-900 block">Pemeriksaan Awal (General Check):</span>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          Pemeriksaan fungsional motherboard, kondisi power delivery, tegangan charging, dan kestabilan sistem perangkat.
                        </p>
                      </div>

                      {/* Right: Textbox Outcome */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-indigo-900 flex items-center justify-between">
                          <span>Hasil Outcome Diagnostik:</span>
                          {!isTimerRunning && <span className="text-[10px] text-amber-700 font-normal">🔒 Terkunci (Timer Off)</span>}
                        </label>
                        <textarea
                          rows="2"
                          disabled={!isTimerRunning}
                          value={diagnosticsOutcome[item.id] || ''}
                          onChange={(e) => setDiagnosticsOutcome({ ...diagnosticsOutcome, [item.id]: e.target.value })}
                          placeholder={isTimerRunning ? "Tuliskan hasil temuan diagnostik (misal: Motherboard normal, IC Power short)..." : "Klik 'Mulai Perbaikan' untuk mengisi outcome diagnostik..."}
                          className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                        ></textarea>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: Kategori Perbaikan (Checkbox + Branch Pricing) */}
                  <div className={`p-4 rounded-2xl border space-y-3 transition-all ${
                    isTimerRunning ? 'bg-slate-50 border-slate-200' : 'bg-slate-100/70 border-slate-200 opacity-75'
                  }`}>
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                      <div className="flex items-center space-x-2">
                        <CheckSquare className={`w-4 h-4 ${isTimerRunning ? 'text-cyan-600' : 'text-slate-400'}`} />
                        <span className={`text-xs font-bold uppercase tracking-wider ${isTimerRunning ? 'text-slate-800' : 'text-slate-600'}`}>
                          Kategori Perbaikan (Pilih Kategori Komponen):
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {!isTimerRunning && (
                          <span className="text-[11px] font-semibold text-amber-700 flex items-center space-x-1 mr-2">
                            <Lock className="w-3 h-3" />
                            <span>Pilihan Terkunci</span>
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSaveCategoriesOnly(item.id, isTimerRunning)}
                          disabled={!isTimerRunning || savingCategory[item.id]}
                          className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-[11px] font-semibold transition-colors flex items-center space-x-1 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{savingCategory[item.id] ? 'Menyimpan...' : 'Simpan Kategori'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1 text-xs">
                      {REPAIR_CATEGORIES.map((cat, idx) => {
                        const isChecked = currentCatList.includes(cat);
                        const price = getCategoryPrice(item.branch_id, cat);

                        return (
                          <label
                            key={cat}
                            onClick={() => handleCategoryToggle(item.id, cat, isTimerRunning)}
                            className={`p-2.5 rounded-xl border flex items-center space-x-2.5 select-none transition-all ${
                              !isTimerRunning 
                                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-75' 
                                : isChecked 
                                  ? 'bg-cyan-50 border-cyan-400 text-cyan-900 font-bold shadow-xs cursor-pointer' 
                                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 cursor-pointer'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={!isTimerRunning}
                              readOnly
                              className="rounded text-cyan-600 focus:ring-cyan-500 w-4 h-4 disabled:opacity-50 flex-shrink-0"
                            />
                            <div className="text-[11px] leading-tight flex-1">
                              <div><span className="font-mono text-cyan-700 font-bold">{idx + 1}.</span> {cat}</div>
                              {!isHidePrices && (
                                <div className="font-mono text-[10px] text-cyan-800 font-semibold mt-0.5">
                                  Tarif: Rp {price.toLocaleString('id-ID')}
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    {!isHidePrices && (
                      <div className="flex justify-between items-center pt-2.5 border-t border-slate-200 text-xs font-bold bg-cyan-50/50 p-2.5 rounded-xl border border-cyan-100">
                        <div className="space-y-0.5">
                          <span className="text-slate-800 flex items-center space-x-1.5 font-bold">
                            <Tag className="w-3.5 h-3.5 text-cyan-600" />
                            <span>Biaya Kategori Perbaikan ({currentCatList.length} Dicentang):</span>
                          </span>
                          <p className="text-[10px] text-slate-500 font-normal italic">
                            (Diambil dari nilai tertinggi di antara kategori yang dipilih, bukan akumulasi)
                          </p>
                        </div>
                        <span className="text-cyan-700 font-mono text-sm font-extrabold">
                          Rp {maxCategoryLaborFee.toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* SECTION 3: Consumed Spare Parts Section */}
                  <div className={`p-4 rounded-2xl border space-y-3 transition-all ${
                    isTimerRunning ? 'bg-slate-50 border-slate-200' : 'bg-slate-100/70 border-slate-200 opacity-75'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Package className={`w-4 h-4 ${isTimerRunning ? 'text-cyan-600' : 'text-slate-400'}`} />
                        <span className={`text-xs font-bold uppercase tracking-wider ${isTimerRunning ? 'text-slate-800' : 'text-slate-600'}`}>
                          Spare Part Digunakan ({item.consumedParts?.length || 0})
                        </span>
                        {!isTimerRunning && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                      </div>

                      <button
                        onClick={() => {
                          if (!isTimerRunning) {
                            showToast('⚠️ Klik "Mulai Perbaikan" terlebih dahulu untuk menambah spare part.');
                            return;
                          }
                          setSelectedOrderForPart(item);
                          setIsPartModalOpen(true);
                        }}
                        disabled={!isTimerRunning}
                        className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-[11px] font-bold transition-colors flex items-center space-x-1.5 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>+ Request Spare Part</span>
                      </button>
                    </div>

                    {item.consumedParts && item.consumedParts.length > 0 ? (
                      <div className="space-y-1.5 text-xs">
                        {item.consumedParts.map((cp) => (
                          <div key={cp.id} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-200">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-slate-500 text-[10px]">[{cp.part?.part_number}]</span>
                              <span className="font-semibold text-slate-800">{cp.part?.name}</span>
                              <span className="text-slate-400 font-mono text-[11px]">x{cp.quantity}</span>
                            </div>
                            <div className="flex items-center space-x-3">
                              {!isHidePrices && (
                                <span className="font-mono font-bold text-slate-800">
                                  Rp {parseInt(cp.total_cost).toLocaleString('id-ID')}
                                </span>
                              )}
                              <button
                                type="button"
                                disabled={!isTimerRunning}
                                onClick={() => handleRemovePart(item.id, cp.id, cp.part?.name || 'Part', isTimerRunning)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title={isTimerRunning ? "Kurangi / Hapus Spare Part ini" : "Klik 'Mulai Perbaikan' untuk mengurangi part"}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {!isHidePrices && (
                          <div className="flex justify-between items-center pt-2 text-xs font-bold border-t border-slate-200">
                            <span className="text-slate-600">Total Biaya Spare Part:</span>
                            <span className="text-cyan-700 font-mono">Rp {sparePartsTotal.toLocaleString('id-ID')}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">Belum ada spare part yang dikonsumsi untuk unit ini.</p>
                    )}
                  </div>

                  {/* SECTION 4: Broken / Defective Spare Parts Section */}
                  <div className={`p-4 rounded-2xl border space-y-3 transition-all ${
                    isTimerRunning ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-100/70 border-slate-200 opacity-75'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertOctagon className={`w-4 h-4 ${isTimerRunning ? 'text-rose-600' : 'text-slate-400'}`} />
                        <span className={`text-xs font-bold uppercase tracking-wider ${isTimerRunning ? 'text-rose-950' : 'text-slate-600'}`}>
                          Pencatatan Spare Part Rusak ({item.brokenParts?.length || 0}) — Terhubung Asset ID: #{item.device?.device_id || '-'}
                        </span>
                        {!isTimerRunning && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                      </div>

                      <button
                        onClick={() => {
                          if (!isTimerRunning) {
                            showToast('⚠️ Klik "Mulai Perbaikan" terlebih dahulu untuk mencatat spare part rusak.');
                            return;
                          }
                          setSelectedOrderForBrokenPart(item);
                          setIsBrokenPartModalOpen(true);
                        }}
                        disabled={!isTimerRunning}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[11px] font-bold transition-colors flex items-center space-x-1.5 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <AlertOctagon className="w-3.5 h-3.5" />
                        <span>+ Catat Spare Part Rusak</span>
                      </button>
                    </div>

                    {item.brokenParts && item.brokenParts.length > 0 ? (
                      <div className="space-y-2 text-xs">
                        {item.brokenParts.map((bp) => (
                          <div key={bp.id} className="bg-white p-3 rounded-xl border border-rose-200 shadow-xs space-y-1">
                            <div className="flex justify-between items-start">
                              <div className="space-y-0.5">
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-rose-900 bg-rose-100 px-2 py-0.5 rounded text-[11px]">
                                    {bp.category_name}
                                  </span>
                                  {bp.serial_number && (
                                    <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                      SN: {bp.serial_number}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    Asset ID: #{item.device?.device_id || '-'}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-800 font-medium mt-1">
                                  <strong className="text-rose-800">Alasan Rusak:</strong> {bp.damage_reason}
                                </p>
                              </div>

                              <button
                                type="button"
                                disabled={!isTimerRunning}
                                onClick={() => handleRemoveBrokenPart(item.id, bp.id, bp.category_name, isTimerRunning)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed ml-2 flex-shrink-0"
                                title={isTimerRunning ? "Hapus Catatan Spare Part Rusak ini" : "Klik 'Mulai Perbaikan' untuk menghapus"}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">Belum ada pencatatan spare part rusak untuk unit asset ini.</p>
                    )}
                  </div>

                  {/* Summary Grand Total Formula Breakdown & Submit to QC1 */}
                  <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {!isHidePrices ? (
                      <div className="bg-slate-900 text-white p-3.5 rounded-2xl space-y-1.5 font-mono shadow-inner border border-slate-800">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider space-x-4">
                          <span className="flex items-center space-x-1">
                            <Calculator className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Rincian Formula Total Biaya:</span>
                          </span>
                          <span className="text-slate-500 font-normal">Diag + Max(Kategori) + Spare Parts</span>
                        </div>
                        <div className="text-xs text-slate-300 flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800">
                          <span>Diag: <strong className="text-white">Rp {diagnosticsFee.toLocaleString('id-ID')}</strong></span>
                          <span>+</span>
                          <span>Max Kat: <strong className="text-cyan-300">Rp {maxCategoryLaborFee.toLocaleString('id-ID')}</strong></span>
                          <span>+</span>
                          <span>Spare Part: <strong className="text-emerald-300">Rp {sparePartsTotal.toLocaleString('id-ID')}</strong></span>
                          <span>=</span>
                          <span className="text-base font-extrabold text-amber-400 bg-slate-800 px-2.5 py-0.5 rounded-lg border border-amber-400/30">
                            Rp {grandTotal.toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>Pastikan hasil diagnostik, tindakan perbaikan, dan spare part telah terisi sebelum submit.</span>
                      </div>
                    )}

                    {item.status === 'In Repair' ? (
                      <button
                        type="button"
                        disabled={!isTimerRunning}
                        onClick={() => {
                          if (!isTimerRunning) {
                            showToast('⚠️ Klik "Mulai Service" terlebih dahulu untuk menyelesaikan perbaikan.');
                            return;
                          }
                          handleSubmitQC1(item.id);
                        }}
                        className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                        title={!isTimerRunning ? "Klik 'Mulai Service' terlebih dahulu untuk menyelesikan perbaikan" : "Selesai Perbaikan & Submit ke QC1 Arisa"}
                      >
                        <Send className="w-4 h-4" />
                        <span>Selesai Perbaikan & Submit ke QC1 Arisa</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={item.status === 'Diagnostic_Pending_Approval' || item.status === 'Harvested' || submittingDiagnostic[item.id]}
                        onClick={() => handleSubmitDiagnosticPlan(item.id)}
                        className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-600/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                      >
                        <Send className="w-4 h-4" />
                        <span>
                          {submittingDiagnostic[item.id]
                            ? 'Mengirim Proposal...'
                            : item.status === 'Diagnostic_Pending_Approval'
                            ? 'Menunggu Approval QC SEA'
                            : item.status === 'Harvested'
                            ? 'Kanibalisasi (Terkunci)'
                            : 'Kirim Rencana Perbaikan & Budget ke QC SEA'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Request Part */}
      <RequestPartModal
        isOpen={isPartModalOpen}
        onClose={() => {
          setIsPartModalOpen(false);
          setSelectedOrderForPart(null);
        }}
        order={selectedOrderForPart}
        onSuccess={(msg) => {
          showToast(msg);
          fetchQueue();
        }}
      />

      {/* Modal Broken Part */}
      <BrokenPartModal
        isOpen={isBrokenPartModalOpen}
        onClose={() => {
          setIsBrokenPartModalOpen(false);
          setSelectedOrderForBrokenPart(null);
        }}
        order={selectedOrderForBrokenPart}
        onSuccess={(msg) => {
          showToast(msg);
          fetchQueue();
        }}
      />
    </div>
  );
};

export default Repairs;
