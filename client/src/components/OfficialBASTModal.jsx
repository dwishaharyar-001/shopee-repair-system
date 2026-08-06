import React, { useState, useEffect } from 'react';
import { X, Printer, FileText, Calendar, Filter, CheckCircle2, User, RefreshCw } from 'lucide-react';
import api from '../services/api';

const OfficialBASTModal = ({ isOpen, onClose }) => {
  // 1: Shopee -> Arisa (Intake Daily), 2: Arisa -> Shopee (Return Weekly), 3: Used Parts (Weekly)
  const [bastType, setBastType] = useState('1'); 
  const [bastNo, setBastNo] = useState(`BAST/SHP-ARS/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/001`);
  
  // Date Filters
  const [intakeDate, setIntakeDate] = useState(new Date().toISOString().slice(0, 10));
  
  // Weekly Range Defaults (Last 7 days)
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  
  // User Dropdowns & Signatures
  const [allUsers, setAllUsers] = useState([]);
  const [firstPartyPicId, setFirstPartyPicId] = useState('');
  const [firstPartyTitle, setFirstPartyTitle] = useState('');
  const [firstPartyLocation, setFirstPartyLocation] = useState('Shopee Warehouse / Workshop Central');

  const [secondPartyPicId, setSecondPartyPicId] = useState('');
  const [secondPartyTitle, setSecondPartyTitle] = useState('');
  const [secondPartyLocation, setSecondPartyLocation] = useState('Arisa Computer Service Center');

  // Report Data
  const [reportItems, setReportItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchReportData();
    }
  }, [isOpen, bastType, intakeDate, startDate, endDate]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/menu/users');
      if (res.data && res.data.success) {
        setAllUsers(res.data.data);
      }
    } catch (err) {
      console.error('Fetch users error:', err);
    }
  };

  // Filter PIC options based on role and BAST type
  const picShopeeUsers = allUsers.filter(u => 
    u.role === 'QA_Liaison' || u.qc_affiliation === 'Shopee' || u.role === 'Admin'
  );

  const picArisaUsers = allUsers.filter(u => 
    u.role === 'Coordinator' || (u.role === 'QA_Liaison' && u.qc_affiliation === 'Arisa') || u.role === 'Admin'
  );

  // Set default PIC selections when bastType or users list changes
  useEffect(() => {
    if (bastType === '1') {
      // Shopee -> Arisa: First Party = Shopee, Second Party = Arisa
      if (picShopeeUsers.length > 0 && !firstPartyPicId) {
        setFirstPartyPicId(picShopeeUsers[0].id);
        setFirstPartyTitle('Asset PIC - Shopee');
      }
      if (picArisaUsers.length > 0 && !secondPartyPicId) {
        setSecondPartyPicId(picArisaUsers[0].id);
        setSecondPartyTitle('Arisa Computer Team');
      }
    } else {
      // Arisa -> Shopee / Used Parts: First Party = Arisa, Second Party = Shopee
      if (picArisaUsers.length > 0) {
        setFirstPartyPicId(picArisaUsers[0].id);
        setFirstPartyTitle('Arisa Computer Team');
      }
      if (picShopeeUsers.length > 0) {
        setSecondPartyPicId(picShopeeUsers[0].id);
        setSecondPartyTitle('Asset PIC - Shopee');
      }
    }
  }, [bastType, allUsers]);

  const fetchReportData = async () => {
    setIsLoading(true);
    setError('');
    try {
      let endpoint = '';
      let params = {};

      if (bastType === '1') {
        endpoint = '/reports/bast-report/intake-daily';
        params = { date: intakeDate };
      } else if (bastType === '2') {
        endpoint = '/reports/bast-report/completed-weekly';
        params = { startDate, endDate };
      } else if (bastType === '3') {
        endpoint = '/reports/bast-report/used-parts-weekly';
        params = { startDate, endDate };
      }

      const res = await api.get(endpoint, { params });
      if (res.data && res.data.success) {
        setReportItems(res.data.data.items || []);
      }
    } catch (err) {
      console.error('Fetch BAST report error:', err);
      setError('Gagal memuat data laporan BAST.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  // Find PIC objects for signatures
  const firstPartyUser = allUsers.find(u => String(u.id) === String(firstPartyPicId));
  const secondPartyUser = allUsers.find(u => String(u.id) === String(secondPartyPicId));

  const firstPartySignature = firstPartyUser?.signature_url || null;
  const secondPartySignature = secondPartyUser?.signature_url || null;

  // Date formatted strings
  const targetDateObj = bastType === '1' ? new Date(intakeDate) : new Date(endDate);
  const dateDay = targetDateObj.toLocaleDateString('id-ID', { weekday: 'long' });
  const dateNum = targetDateObj.getDate();
  const monthName = targetDateObj.toLocaleDateString('id-ID', { month: 'long' });
  const yearNum = targetDateObj.getFullYear();

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 print:shadow-none print:border-none print:w-full print:max-w-none print:my-0">
        
        {/* Top Control Panel Header (Hidden during printing) */}
        <div className="bg-slate-900 text-white p-6 space-y-4 print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-orange-500 rounded-xl text-white shadow-md">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Dokumen Resmi BAST Handover Certificate</h3>
                <p className="text-xs text-slate-400">Generate Dokumen BAST Akumulasi Harian / Pekanan dengan Sign-off TTD Digital</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handlePrint}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-2"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / Download PDF BAST</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tab 1, 2, 3 Selector */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-slate-800 p-1.5 rounded-xl text-xs font-bold">
            <button
              onClick={() => setBastType('1')}
              className={`py-2 px-3 rounded-lg transition-all text-left flex items-center space-x-2 ${
                bastType === '1' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>📋 1. Intake Harian (Shopee ➔ Arisa)</span>
            </button>

            <button
              onClick={() => setBastType('2')}
              className={`py-2 px-3 rounded-lg transition-all text-left flex items-center space-x-2 ${
                bastType === '2' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🔄 2. Pengembalian Unit Pekanan (Arisa ➔ Shopee)</span>
            </button>

            <button
              onClick={() => setBastType('3')}
              className={`py-2 px-3 rounded-lg transition-all text-left flex items-center space-x-2 ${
                bastType === '3' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🛠️ 3. Used Spare Parts Pekanan (Part Rusak)</span>
            </button>
          </div>

          {/* Form Control Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-800/60 p-3.5 rounded-xl border border-slate-700 text-xs">
            {/* BAST Number */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Nomor BAST:</label>
              <input
                type="text"
                value={bastNo}
                onChange={(e) => setBastNo(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:ring-1 focus:ring-orange-500"
              />
            </div>

            {/* Date Filters */}
            {bastType === '1' ? (
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Tanggal Intake (Harian):</label>
                <input
                  type="date"
                  value={intakeDate}
                  onChange={(e) => setIntakeDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-1 focus:ring-orange-500"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Tanggal Mulai (Start Date):</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Tanggal Akhir (End Date):</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </>
            )}

            {/* PIC Selectors */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                {bastType === '1' ? 'FIRST PARTY (QC Shopee):' : 'FIRST PARTY (Coordinator/QC Arisa):'}
              </label>
              <select
                value={firstPartyPicId}
                onChange={(e) => setFirstPartyPicId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-1 focus:ring-orange-500"
              >
                <option value="">-- Pilih PIC First Party --</option>
                {(bastType === '1' ? picShopeeUsers : picArisaUsers).map(u => (
                  <option key={u.id} value={u.id}>
                    👤 {u.full_name} ({u.role}{u.qc_affiliation ? ` - ${u.qc_affiliation}` : ''})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                {bastType === '1' ? 'SECOND PARTY (Arisa Team):' : 'SECOND PARTY (QC Shopee):'}
              </label>
              <select
                value={secondPartyPicId}
                onChange={(e) => setSecondPartyPicId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-1 focus:ring-orange-500"
              >
                <option value="">-- Pilih PIC Second Party --</option>
                {(bastType === '1' ? picArisaUsers : picShopeeUsers).map(u => (
                  <option key={u.id} value={u.id}>
                    👤 {u.full_name} ({u.role}{u.qc_affiliation ? ` - ${u.qc_affiliation}` : ''})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Printable Official PDF Sheet Container */}
        <div className="p-8 sm:p-12 space-y-6 text-slate-900 font-sans print:p-6 print:text-black">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-semibold">Memuat data dokumen BAST...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs text-center">
              {error}
            </div>
          ) : (
            <>
              {/* Header Company & Certificate Title */}
              <div className="text-center space-y-1 pb-4 border-b-2 border-slate-900">
                <h2 className="text-xl font-bold tracking-tight uppercase text-blue-900">ARISA COMPUTER</h2>
                <p className="text-xs text-slate-500 italic">Laptop Repair Service Partner</p>
                <h1 className="text-lg font-black uppercase text-slate-900 pt-2 tracking-wide">
                  HANDOVER CERTIFICATE (BAST)
                </h1>
                <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider">
                  {bastType === '1' 
                    ? 'UNIT HANDOVER FOR REPAIR WORK (SHOPEE → ARISA COMPUTER)' 
                    : bastType === '2' 
                    ? 'UNIT RETURN HANDOVER (ARISA COMPUTER → SHOPEE)' 
                    : 'HANDOVER OF USED SPARE PARTS'}
                </h3>
                <p className="text-xs font-mono font-bold text-slate-800 pt-1">
                  BAST No.: <span className="border-b border-slate-800 px-3">{bastNo}</span>
                </p>
              </div>

              {/* Statement Description */}
              <p className="text-xs leading-relaxed text-slate-800">
                On this day, <span className="font-semibold underline">{dateDay}</span> date <span className="font-semibold underline">{dateNum}</span> month <span className="font-semibold underline">{monthName}</span> year <span className="font-semibold underline">{yearNum}</span>, the undersigned parties have carried out the handover of {bastType === '3' ? 'used/old spare parts resulting from component replacement during laptop unit repair' : 'laptop units'} {bastType === '1' ? 'from Shopee to Arisa Computer, to be worked on at the Shopee workshop' : 'from Arisa Computer to Shopee'}, with the following details:
              </p>

              {/* FIRST PARTY & SECOND PARTY DETAILS */}
              <div className="space-y-4 text-xs">
                {/* FIRST PARTY */}
                <div className="space-y-1">
                  <h4 className="font-bold uppercase tracking-wider text-slate-900">FIRST PARTY (Handing Over)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pl-4">
                    <div>
                      <span className="font-semibold text-slate-600 block">Name :</span>
                      <span className="font-bold text-slate-900">{firstPartyUser?.full_name || '___________________________'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-600 block">
                        {bastType === '1' ? 'Position / Asset PIC :' : 'Position / Arisa Computer Team :'}
                      </span>
                      <span className="font-bold text-slate-900">{firstPartyTitle || (bastType === '1' ? 'Asset PIC - Shopee' : 'Arisa Computer Team')}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-600 block">
                        {bastType === '1' ? 'Shopee Location :' : 'Work Location :'}
                      </span>
                      <span className="font-bold text-slate-900">{firstPartyLocation}</span>
                    </div>
                  </div>
                </div>

                {/* SECOND PARTY */}
                <div className="space-y-1">
                  <h4 className="font-bold uppercase tracking-wider text-slate-900">SECOND PARTY (Receiving)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pl-4">
                    <div>
                      <span className="font-semibold text-slate-600 block">Name :</span>
                      <span className="font-bold text-slate-900">{secondPartyUser?.full_name || '___________________________'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-600 block">
                        {bastType === '1' ? 'Position / Arisa Computer Team :' : 'Position / Asset PIC :'}
                      </span>
                      <span className="font-bold text-slate-900">{secondPartyTitle || (bastType === '1' ? 'Arisa Computer Team' : 'Asset PIC - Shopee')}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-600 block">
                        {bastType === '1' ? 'Work Location :' : 'Shopee Location :'}
                      </span>
                      <span className="font-bold text-slate-900">{secondPartyLocation}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* TABLE DATA DETAILS */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  {bastType === '1' ? 'Unit Details Handed Over' : bastType === '2' ? 'Returned Unit Details' : 'Used Spare Parts Details'}
                  {bastType !== '1' && <span className="font-normal text-slate-500 font-mono text-[11px] lowercase"> (periode: {startDate} s/d {endDate})</span>}
                </h4>

                <table className="w-full text-left text-xs border-collapse border border-slate-300 print:border-black">
                  <thead>
                    <tr className="bg-slate-800 text-white font-bold uppercase print:bg-slate-200 print:text-black">
                      <th className="py-2 px-3 border border-slate-300 text-center w-12">No</th>
                      {bastType === '1' ? (
                        <>
                          <th className="py-2 px-3 border border-slate-300">Asset ID</th>
                          <th className="py-2 px-3 border border-slate-300">Asset Tag</th>
                          <th className="py-2 px-3 border border-slate-300">Brand & Model</th>
                          <th className="py-2 px-3 border border-slate-300">Initial Physical Condition</th>
                          <th className="py-2 px-3 border border-slate-300">Accessories (Charger/Bag/etc.)</th>
                        </>
                      ) : bastType === '2' ? (
                        <>
                          <th className="py-2 px-3 border border-slate-300">Asset ID</th>
                          <th className="py-2 px-3 border border-slate-300">Service Order ID</th>
                          <th className="py-2 px-3 border border-slate-300">Repair Type</th>
                          <th className="py-2 px-3 border border-slate-300">Final Status</th>
                          <th className="py-2 px-3 border border-slate-300 text-center">QC Result</th>
                        </>
                      ) : (
                        <>
                          <th className="py-2 px-3 border border-slate-300">Asset ID</th>
                          <th className="py-2 px-3 border border-slate-300">Spare Part Name</th>
                          <th className="py-2 px-3 border border-slate-300 text-center">Quantity</th>
                          <th className="py-2 px-3 border border-slate-300">Condition</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 print:divide-slate-400">
                    {reportItems.length > 0 ? (
                      reportItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2 px-3 border border-slate-300 text-center font-mono">{idx + 1}</td>
                          {bastType === '1' ? (
                            <>
                              <td className="py-2 px-3 border border-slate-300 font-mono font-bold text-blue-900">{item.asset_id}</td>
                              <td className="py-2 px-3 border border-slate-300 font-mono">{item.asset_tag}</td>
                              <td className="py-2 px-3 border border-slate-300 font-semibold">{item.brand_model}</td>
                              <td className="py-2 px-3 border border-slate-300 text-slate-700">{item.initial_physical_condition}</td>
                              <td className="py-2 px-3 border border-slate-300 text-slate-700">{item.accessories}</td>
                            </>
                          ) : bastType === '2' ? (
                            <>
                              <td className="py-2 px-3 border border-slate-300 font-mono font-bold text-blue-900">{item.asset_id}</td>
                              <td className="py-2 px-3 border border-slate-300 font-mono text-orange-700 font-bold">{item.service_id}</td>
                              <td className="py-2 px-3 border border-slate-300">{item.repair_type}</td>
                              <td className="py-2 px-3 border border-slate-300 font-semibold text-emerald-800">{item.final_status}</td>
                              <td className="py-2 px-3 border border-slate-300 text-center font-bold text-emerald-700">{item.qc_result}</td>
                            </>
                          ) : (
                            <>
                              <td className="py-2 px-3 border border-slate-300 font-mono font-bold text-blue-900">{item.asset_id}</td>
                              <td className="py-2 px-3 border border-slate-300 font-semibold text-slate-800">{item.spare_part_name}</td>
                              <td className="py-2 px-3 border border-slate-300 text-center font-mono font-bold">{item.quantity}</td>
                              <td className="py-2 px-3 border border-slate-300 text-rose-800 font-medium">{item.condition}</td>
                            </>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={bastType === '1' ? "6" : bastType === '2' ? "6" : "5"} className="py-4 px-3 text-center text-slate-400 italic border border-slate-300">
                          Tidak ada data {bastType === '1' ? 'intake harian' : bastType === '2' ? 'pengembalian unit' : 'spare part rusak'} terdaftar pada filter ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Notes / Additional Remarks Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1 text-[11px] text-slate-700 print:bg-white print:border-slate-300">
                <span className="font-bold text-slate-900 block mb-1">Notes / Additional Remarks:</span>
                {bastType === '1' ? (
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Physical condition & completeness have been jointly verified before the unit is handed over for work at the Shopee workshop.</li>
                    <li>Detailed condition of each component (per unit) is recorded in the Attachment - Unit Physical Condition Checklist, 'Condition Upon Receipt' section.</li>
                    <li>This document serves as official evidence that responsibility for the unit's repair has transferred to Arisa Computer.</li>
                  </ul>
                ) : bastType === '2' ? (
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Final Status options: Repaired / No Repair Needed / Cannot Be Repaired (Write-off).</li>
                    <li>The unit has passed Quality Control (QC) and its physical condition & completeness have been re-verified before being handed over.</li>
                    <li>Detailed condition of each component (per unit) is recorded in the Attachment - Unit Physical Condition Checklist, 'Condition Upon Return' section.</li>
                    <li>Before/after photo documentation and detailed reports are attached separately per the Asset List.</li>
                  </ul>
                ) : (
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>The used spare parts handed over are the result of component replacement during repair and are not used/retained by Arisa Computer.</li>
                    <li>The quantity and type of spare parts have been verified against the Asset List prior to handover.</li>
                  </ul>
                )}
              </div>

              {/* Good Faith Statement & SIGN-OFF BOXES WITH DIGITAL SIGNATURES */}
              <div className="pt-2 space-y-4 text-xs">
                <p className="text-[11px] text-slate-700 italic">
                  This Handover Certificate is made in good faith and signed by both parties without coercion from any party, to be used as appropriate.
                </p>

                <div className="grid grid-cols-2 gap-8 border border-slate-300 rounded-xl overflow-hidden print:border-black">
                  {/* FIRST PARTY SIGN BOX */}
                  <div className="p-4 text-center space-y-2 border-r border-slate-300 print:border-black flex flex-col justify-between h-44">
                    <div>
                      <h5 className="font-bold uppercase tracking-wider text-slate-900">FIRST PARTY</h5>
                      <p className="text-[11px] text-slate-500 italic font-serif">
                        {bastType === '1' ? 'Asset PIC - Shopee' : 'Arisa Computer Team'}
                      </p>
                    </div>

                    {/* DIGITAL SIGNATURE IMAGE RENDER */}
                    <div className="h-16 flex items-center justify-center px-4">
                      {firstPartySignature ? (
                        <img
                          src={firstPartySignature}
                          alt="Tanda Tangan First Party"
                          className="max-h-14 max-w-full object-contain mx-auto"
                        />
                      ) : (
                        <span className="text-[10px] text-slate-400 italic border border-dashed border-slate-300 rounded px-3 py-1">
                          (Belum Ada Tanda Tangan)
                        </span>
                      )}
                    </div>

                    <div>
                      <p className="font-mono text-slate-900 font-bold">
                        ( <span className="underline px-2">{firstPartyUser?.full_name || 'Name & Signature'}</span> )
                      </p>
                      <span className="text-[10px] text-slate-500 font-mono">Name & Signature</span>
                    </div>
                  </div>

                  {/* SECOND PARTY SIGN BOX */}
                  <div className="p-4 text-center space-y-2 flex flex-col justify-between h-44">
                    <div>
                      <h5 className="font-bold uppercase tracking-wider text-slate-900">SECOND PARTY</h5>
                      <p className="text-[11px] text-slate-500 italic font-serif">
                        {bastType === '1' ? 'Arisa Computer Team' : 'Asset PIC - Shopee'}
                      </p>
                    </div>

                    {/* DIGITAL SIGNATURE IMAGE RENDER */}
                    <div className="h-16 flex items-center justify-center px-4">
                      {secondPartySignature ? (
                        <img
                          src={secondPartySignature}
                          alt="Tanda Tangan Second Party"
                          className="max-h-14 max-w-full object-contain mx-auto"
                        />
                      ) : (
                        <span className="text-[10px] text-slate-400 italic border border-dashed border-slate-300 rounded px-3 py-1">
                          (Belum Ada Tanda Tangan)
                        </span>
                      )}
                    </div>

                    <div>
                      <p className="font-mono text-slate-900 font-bold">
                        ( <span className="underline px-2">{secondPartyUser?.full_name || 'Name & Signature'}</span> )
                      </p>
                      <span className="text-[10px] text-slate-500 font-mono">Name & Signature</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer (Hidden when printing) */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center text-xs print:hidden">
          <span className="text-slate-500">
            ℹ️ Gunakan tombol <strong>Cetak / Download PDF BAST</strong> untuk mencetak dokumen dalam format PDF.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Tutup Pratinjau
          </button>
        </div>
      </div>
    </div>
  );
};

export default OfficialBASTModal;
