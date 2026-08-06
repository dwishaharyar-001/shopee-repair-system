import React, { useState } from 'react';
import { X, Laptop, Wrench, Shield, CheckCircle2, Clock, Calendar, User, FileText } from 'lucide-react';
import { deviceService } from '../services/deviceService';

const DeviceDetailModal = ({ isOpen, onClose, order, onUpdateSuccess }) => {
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isOpen || !order) return null;

  const statuses = ['Intake', 'In Repair', 'QC1 Pending', 'Rework', 'QC2 Pending', 'Released'];

  const getStatusIndex = (currentStatus) => {
    return statuses.indexOf(currentStatus);
  };

  const handleStatusChange = async (newStatus) => {
    setIsUpdating(true);
    try {
      const res = await deviceService.updateServiceOrder(order.id, { status: newStatus });
      if (res.success) {
        onUpdateSuccess(res.message);
      }
    } catch (err) {
      console.error('Update status error:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const currentIdx = getStatusIndex(order.status);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs text-orange-400 font-bold bg-orange-400/10 px-2 py-0.5 rounded border border-orange-400/20">
                {order.service_id}
              </span>
              <span className="font-mono text-xs text-cyan-400 font-bold bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20">
                {order.device?.device_id}
              </span>
            </div>
            <h3 className="font-bold text-lg text-slate-100 mt-1">
              {order.device?.brand} {order.device?.model}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Status Timeline */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Linimasa Lifecycle Perbaikan
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              {statuses.map((st, idx) => {
                const isPassed = idx <= currentIdx;
                const isCurrent = idx === currentIdx;
                return (
                  <button
                    key={st}
                    disabled={isUpdating}
                    onClick={() => handleStatusChange(st)}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      isCurrent
                        ? 'bg-orange-500 text-white border-orange-500 font-bold shadow-md shadow-orange-500/20 ring-2 ring-orange-200'
                        : isPassed
                        ? 'bg-slate-100 text-slate-700 border-slate-300 font-medium hover:bg-slate-200'
                        : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-wider">{`Step ${idx + 1}`}</div>
                    <div className="text-xs mt-0.5 font-semibold truncate">{st}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
            {/* Asset Info */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                <Laptop className="w-4 h-4 text-cyan-600" />
                <span>Informasi Master Device</span>
              </h5>
              <div className="text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nomor Seri:</span>
                  <span className="font-mono font-bold text-slate-800">{order.device?.serial_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kategori Asset:</span>
                  <span className="font-semibold text-slate-800">{order.device?.asset_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pemilik Asset (Customer):</span>
                  <span className="font-bold text-slate-900">{order.customer?.name}</span>
                </div>
              </div>
            </div>

            {/* Service & Tech Info */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-orange-500" />
                <span>Informasi Penugasan & Tiket</span>
              </h5>
              <div className="text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Tanggal Intake:</span>
                  <span className="font-mono text-slate-700">
                    {new Date(order.intake_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Teknisi Penanggung Jawab:</span>
                  <span className="font-semibold text-emerald-700">
                    {order.assignedTechnician?.user?.full_name || 'Belum Ditugaskan'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Penerima Intake:</span>
                  <span className="text-slate-700">{order.receivedBy?.full_name || 'System Admin'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Fault Description Box */}
          <div className="space-y-2">
            <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-500" />
              <span>Deskripsi Kerusakan / Fault Log</span>
            </h5>
            <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs text-amber-900 leading-relaxed font-medium">
              {order.fault_description}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeviceDetailModal;
