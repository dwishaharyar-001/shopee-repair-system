import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Shield, 
  Users, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  SlidersHorizontal,
  UserCheck,
  UserX,
  Lock,
  MapPin,
  Plus,
  Edit2,
  X,
  Globe,
  Trash2,
  UserPlus,
  Key,
  DollarSign,
  Tag
} from 'lucide-react';

const Admin = () => {
  const { user: currentUser, refreshPermissions } = useAuth();
  const isAdminUser = currentUser?.role === 'Admin';
  const [activeTab, setActiveTab] = useState('menu_permissions');

  // Matrix State
  const [roles, setRoles] = useState(['Admin', 'Coordinator', 'QA_Liaison', 'Technician']);
  const [menus, setMenus] = useState([
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'devices', label: 'Devices Intake' },
    { key: 'repairs', label: 'Repair Queue' },
    { key: 'qc', label: 'QC Checkpoints' },
    { key: 'parts', label: 'Parts Inventory' },
    { key: 'reports', label: 'KPI Reports' },
    { key: 'admin', label: 'Admin & Users' }
  ]);
  
  const [matrix, setMatrix] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Users State
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserForBranch, setSelectedUserForBranch] = useState(null);
  const [isUserBranchModalOpen, setIsUserBranchModalOpen] = useState(false);
  const [selectedBranchIdForUser, setSelectedBranchIdForUser] = useState('');
  const [userBranchSubmitting, setUserBranchSubmitting] = useState(false);

  // Add / Edit User Modals
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    role: 'Technician',
    branch_id: '',
    skill_level: 'Hardware Specialist',
    qc_affiliation: 'Arisa',
    signature_url: '',
    is_active: true
  });
  const [userFormError, setUserFormError] = useState('');
  const [userSubmitting, setUserSubmitting] = useState(false);

  // Branches State
  const [branches, setBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchForm, setBranchForm] = useState({ name: '', code: '', address: '' });
  const [branchSubmitting, setBranchSubmitting] = useState(false);
  const [branchError, setBranchError] = useState('');

  // Branch Category Repair Prices State
  const [selectedPriceBranchId, setSelectedPriceBranchId] = useState('');
  const [priceInputs, setPriceInputs] = useState({});
  const [pricesLoading, setPricesLoading] = useState(false);
  const [pricesSaving, setPricesSaving] = useState(false);

  // Role Badge Helper
  const getRoleBadge = (role) => {
    switch (role) {
      case 'Admin':
        return 'bg-purple-100 text-purple-700 border-purple-200 font-bold';
      case 'Coordinator':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'QA_Liaison':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Technician':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // 1. Fetch Permissions
  const fetchPermissionsMatrix = async () => {
    setLoading(true);
    try {
      const res = await api.get('/menu/permissions');
      if (res.data && res.data.success) {
        const { roles: apiRoles, menus: apiMenus, permissions } = res.data.data;
        if (apiRoles) setRoles(apiRoles);
        if (apiMenus) setMenus(apiMenus);

        const newMatrix = {};
        permissions.forEach(item => {
          newMatrix[`${item.role}:${item.menu_key}`] = item.role === 'Admin' ? true : item.is_allowed;
        });
        setMatrix(newMatrix);
      }
    } catch (err) {
      console.error('Gagal mengambil data konfigurasi menu:', err);
      showNotification('error', 'Gagal memuat konfigurasi hak akses menu.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Users
  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await api.get('/menu/users');
      if (res.data && res.data.success) {
        setUsers(res.data.data);
      }
    } catch (err) {
      console.error('Gagal mengambil data pengguna:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  // 3. Fetch Branches
  const fetchBranches = async () => {
    setBranchesLoading(true);
    try {
      const res = await api.get('/branches/admin');
      if (res.data && res.data.success) {
        setBranches(res.data.data);
        if (res.data.data.length > 0 && !selectedPriceBranchId) {
          setSelectedPriceBranchId(String(res.data.data[0].id));
        }
      }
    } catch (err) {
      console.error('Gagal mengambil data cabang:', err);
    } finally {
      setBranchesLoading(false);
    }
  };

  // 4. Fetch Branch Repair Prices
  const fetchBranchPrices = async (branchId) => {
    if (!branchId) return;
    setPricesLoading(true);
    try {
      const res = await api.get('/branches/repair-prices', { params: { branch_id: branchId } });
      if (res.data && res.data.success) {
        const inputs = {};
        res.data.data.forEach(item => {
          inputs[item.category_name] = item.price;
        });
        setPriceInputs(inputs);
      }
    } catch (err) {
      console.error('Fetch branch prices error:', err);
    } finally {
      setPricesLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPriceBranchId) {
      fetchBranchPrices(selectedPriceBranchId);
    }
  }, [selectedPriceBranchId]);

  const handleSaveBranchPrices = async (e) => {
    e.preventDefault();
    if (!selectedPriceBranchId) return;

    setPricesSaving(true);
    try {
      const pricesArray = Object.keys(priceInputs).map(catName => ({
        category_name: catName,
        price: parseFloat(priceInputs[catName]) || 0
      }));

      const res = await api.put(`/branches/${selectedPriceBranchId}/repair-prices`, { prices: pricesArray });
      if (res.data && res.data.success) {
        showNotification('success', res.data.message);
        fetchBranchPrices(selectedPriceBranchId);
      }
    } catch (err) {
      showNotification('error', 'Gagal memperbarui harga perbaikan cabang.');
    } finally {
      setPricesSaving(false);
    }
  };

  useEffect(() => {
    fetchPermissionsMatrix();
    fetchUsers();
    fetchBranches();
  }, []);

  const handleToggleMatrix = (role, menuKey) => {
    if (role === 'Admin') return; // Admin always has full access
    const key = `${role}:${menuKey}`;
    setMatrix(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSavePermissions = async () => {
    setSaving(true);
    try {
      const permissionsArray = [];
      roles.forEach(role => {
        menus.forEach(menu => {
          const key = `${role}:${menu.key}`;
          permissionsArray.push({
            role,
            menu_key: menu.key,
            is_allowed: role === 'Admin' ? true : Boolean(matrix[key])
          });
        });
      });

      const res = await api.put('/menu/permissions', { permissions: permissionsArray });
      if (res.data && res.data.success) {
        showNotification('success', 'Konfigurasi hak akses menu berhasil diperbarui!');
        await refreshPermissions();
      } else {
        showNotification('error', res.data?.message || 'Gagal menyimpan perubahan.');
      }
    } catch (err) {
      console.error('Gagal menyimpan permissions:', err);
      showNotification('error', 'Terjadi kesalahan saat menyimpan hak akses.');
    } finally {
      setSaving(false);
    }
  };

  // User Add / Edit / Delete Handlers
  const handleOpenAddUser = () => {
    setUserForm({
      username: '',
      password: '',
      full_name: '',
      email: '',
      role: 'Technician',
      branch_id: '',
      skill_level: 'Hardware Specialist',
      qc_affiliation: 'Arisa',
      signature_url: '',
      is_active: true
    });
    setUserFormError('');
    setIsAddUserOpen(true);
  };

  const handleOpenEditUser = (u) => {
    setEditingUser(u);
    setUserForm({
      username: u.username,
      password: '',
      full_name: u.full_name,
      email: u.email || '',
      role: u.role,
      branch_id: u.branch_id ? String(u.branch_id) : '',
      skill_level: u.technicianProfile?.skill_level || 'Hardware Specialist',
      qc_affiliation: u.qc_affiliation || 'Arisa',
      signature_url: u.signature_url || '',
      is_active: u.is_active
    });
    setUserFormError('');
    setIsEditUserOpen(true);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setUserFormError('');

    if (!userForm.username || !userForm.password || !userForm.full_name || !userForm.role) {
      setUserFormError('Username, Password, Nama Lengkap, dan Role wajib diisi.');
      return;
    }

    setUserSubmitting(true);
    try {
      const res = await api.post('/menu/users', userForm);
      if (res.data && res.data.success) {
        showNotification('success', res.data.message);
        setIsAddUserOpen(false);
        fetchUsers();
      }
    } catch (err) {
      setUserFormError(err.response?.data?.message || 'Gagal mendaftarkan user baru.');
    } finally {
      setUserSubmitting(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setUserFormError('');

    if (!editingUser) return;
    if (!userForm.full_name || !userForm.role) {
      setUserFormError('Nama Lengkap dan Role wajib diisi.');
      return;
    }

    setUserSubmitting(true);
    try {
      const res = await api.put(`/menu/users/${editingUser.id}`, userForm);
      if (res.data && res.data.success) {
        showNotification('success', res.data.message);
        setIsEditUserOpen(false);
        fetchUsers();
      }
    } catch (err) {
      setUserFormError(err.response?.data?.message || 'Gagal memperbarui data user.');
    } finally {
      setUserSubmitting(false);
    }
  };

  const handleToggleUserStatus = async (u) => {
    if (u.role === 'Admin') {
      showNotification('error', 'Akun Admin dilindungi dan tidak dapat dinonaktifkan.');
      return;
    }

    try {
      const res = await api.delete(`/menu/users/${u.id}`);
      if (res.data && res.data.success) {
        showNotification('success', res.data.message);
        fetchUsers();
      }
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Gagal mengubah status pengguna.');
    }
  };

  const handleRequestDeleteUser = async (u) => {
    if (u.role === 'Admin') {
      showNotification('error', 'Akun Admin dilindungi dan tidak dapat dihapus.');
      return;
    }
    if (!window.confirm(`Apakah Anda yakin ingin mengajukan penghapusan user '${u.full_name}' (@${u.username})? Status akan menjadi Pending Delete.`)) {
      return;
    }

    try {
      const res = await api.delete(`/menu/users/${u.id}/request-delete`);
      if (res.data && res.data.success) {
        showNotification('success', res.data.message);
        fetchUsers();
      }
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Gagal mengajukan hapus user.');
    }
  };

  const handleApproveDeleteUser = async (u) => {
    if (!window.confirm(`SETUJUI HAPUS USER: Akun '${u.full_name}' (@${u.username}) akan dihapus PERMANEN dari sistem. Lanjutkan?`)) {
      return;
    }

    try {
      const res = await api.post(`/menu/users/${u.id}/approve-delete`);
      if (res.data && res.data.success) {
        showNotification('success', res.data.message);
        fetchUsers();
      }
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Gagal menyetujui penghapusan user.');
    }
  };

  const handleRejectDeleteUser = async (u) => {
    try {
      const res = await api.post(`/menu/users/${u.id}/reject-delete`);
      if (res.data && res.data.success) {
        showNotification('success', res.data.message);
        fetchUsers();
      }
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Gagal menolak pengajuan hapus user.');
    }
  };

  // Branch Handlers
  const handleOpenAddBranch = () => {
    setEditingBranch(null);
    setBranchForm({ name: '', code: '', address: '' });
    setBranchError('');
    setIsBranchModalOpen(true);
  };

  const handleOpenEditBranch = (b) => {
    setEditingBranch(b);
    setBranchForm({ name: b.name, code: b.code, address: b.address || '' });
    setBranchError('');
    setIsBranchModalOpen(true);
  };

  const handleSaveBranch = async (e) => {
    e.preventDefault();
    setBranchError('');

    if (!branchForm.name || !branchForm.code) {
      setBranchError('Nama cabang dan Kode cabang (3 huruf) wajib diisi!');
      return;
    }

    setBranchSubmitting(true);
    try {
      if (editingBranch) {
        const res = await api.put(`/branches/${editingBranch.id}`, branchForm);
        if (res.data && res.data.success) {
          showNotification('success', res.data.message);
          setIsBranchModalOpen(false);
          fetchBranches();
        }
      } else {
        const res = await api.post('/branches', branchForm);
        if (res.data && res.data.success) {
          showNotification('success', res.data.message);
          setIsBranchModalOpen(false);
          fetchBranches();
        }
      }
    } catch (err) {
      setBranchError(err.response?.data?.message || 'Gagal memproses data cabang.');
    } finally {
      setBranchSubmitting(false);
    }
  };

  const handleToggleBranchActive = async (branchId) => {
    try {
      const res = await api.delete(`/branches/${branchId}`);
      if (res.data && res.data.success) {
        showNotification('success', res.data.message);
        fetchBranches();
      }
    } catch (err) {
      showNotification('error', 'Gagal mengubah status cabang.');
    }
  };

  // User Branch Assignment Handlers
  const handleOpenUserBranchModal = (u) => {
    setSelectedUserForBranch(u);
    setSelectedBranchIdForUser(u.branch_id ? String(u.branch_id) : '');
    setIsUserBranchModalOpen(true);
  };

  const handleSaveUserBranch = async (e) => {
    e.preventDefault();
    if (!selectedUserForBranch) return;

    setUserBranchSubmitting(true);
    try {
      const res = await api.put(`/menu/users/${selectedUserForBranch.id}/branch`, {
        branch_id: selectedUserForBranch.role === 'Admin' ? null : (selectedBranchIdForUser ? parseInt(selectedBranchIdForUser) : null)
      });

      if (res.data && res.data.success) {
        showNotification('success', res.data.message);
        setIsUserBranchModalOpen(false);
        fetchUsers();
      }
    } catch (err) {
      showNotification('error', 'Gagal memperbarui penempatan cabang pengguna.');
    } finally {
      setUserBranchSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-700/50">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30 flex-shrink-0">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Konfigurasi Master & Admin Aplikasi</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Atur hak akses menu dinamis, kelola pengguna (Tambah/Edit/Hapus), dan atur lokasi cabang service.
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60 self-stretch md:self-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('menu_permissions')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'menu_permissions'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Matriks Menu</span>
          </button>
          <button
            onClick={() => setActiveTab('branches')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'branches'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Master Cabang ({branches.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'users'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Daftar Pengguna ({users.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('repair_prices')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'repair_prices'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>💰 Tarif Harga Per Cabang</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className={`p-4 rounded-xl flex items-center justify-between shadow-md border animate-fade-in ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center space-x-3">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600" />
            )}
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Tab 1: Menu Permissions Matrix */}
      {activeTab === 'menu_permissions' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Matriks Hak Akses Fitur Menu</h2>
              <p className="text-slate-500 text-xs mt-0.5">
                Aktifkan atau nonaktifkan visibilitas menu per role. Role Admin Aplikasi memiliki hak penuh ke seluruh fitur aplikasi.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={fetchPermissionsMatrix}
                disabled={loading || saving}
                className="flex items-center space-x-2 px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Reset</span>
              </button>

              <button
                onClick={handleSavePermissions}
                disabled={loading || saving}
                className="flex items-center space-x-2 px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm font-medium">Memuat konfigurasi matriks hak akses...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-4 px-6 min-w-[220px]">Menu Fitur</th>
                    {roles.map(role => (
                      <th key={role} className="py-4 px-6 text-center min-w-[140px]">
                        <span className={`inline-block px-3 py-1 rounded-full border text-xs font-semibold ${getRoleBadge(role)}`}>
                          {role} {role === 'Admin' ? '🔒' : ''}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {menus.map(menu => (
                    <tr key={menu.key} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6 font-semibold text-slate-800 flex items-center space-x-3">
                        <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                        <span>{menu.label}</span>
                        <span className="text-[10px] font-mono text-slate-400 font-normal">({menu.key})</span>
                      </td>

                      {roles.map(role => {
                        const matrixKey = `${role}:${menu.key}`;
                        const isAdminRole = role === 'Admin';
                        const isChecked = isAdminRole ? true : Boolean(matrix[matrixKey]);
                        return (
                          <td key={role} className="py-4 px-6 text-center">
                            <label className={`inline-flex items-center ${isAdminRole ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'} select-none`}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isAdminRole}
                                onChange={() => handleToggleMatrix(role, menu.key)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-700 relative"></div>
                            </label>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-purple-600" />
              <span>Role Admin Aplikasi memiliki hak penuh permanen ke seluruh menu dan tidak dapat dikunci.</span>
            </span>
            <span className="font-semibold text-slate-600">Total Role: {roles.length} | Total Menu: {menus.length}</span>
          </div>
        </div>
      )}

      {/* Tab 2: Master Branch Locations */}
      {activeTab === 'branches' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Master Konfigurasi Lokasi Cabang</h2>
              <p className="text-slate-500 text-xs mt-0.5">
                Kelola lokasi cabang service dan tentukan 3 huruf kode unik sebagai prefix penomoran Service ID.
              </p>
            </div>

            <button
              onClick={handleOpenAddBranch}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Cabang Baru</span>
            </button>
          </div>

          {branchesLoading ? (
            <div className="p-12 text-center text-slate-400">
              <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm font-medium">Memuat data cabang...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-6">ID</th>
                    <th className="py-3.5 px-6">Nama Cabang</th>
                    <th className="py-3.5 px-6">Kode Service ID (Prefix)</th>
                    <th className="py-3.5 px-6">Alamat Cabang</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {branches.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-6 font-mono text-xs text-slate-400">#{b.id}</td>
                      <td className="py-3.5 px-6 font-semibold text-slate-800 flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0" />
                        <span>{b.name}</span>
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="inline-block px-3 py-1 bg-orange-100 border border-orange-300 text-orange-900 rounded-lg font-mono font-bold text-xs">
                          {b.code} (e.g. {b.code}-2026-0001)
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-slate-600 text-xs max-w-xs truncate">
                        {b.address || '-'}
                      </td>
                      <td className="py-3.5 px-6">
                        <label className="inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={b.is_active}
                            onChange={() => handleToggleBranchActive(b.id)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 relative"></div>
                          <span className="ml-2 text-xs font-semibold text-slate-600">
                            {b.is_active ? 'Aktif' : 'Non-aktif'}
                          </span>
                        </label>
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <button
                          onClick={() => handleOpenEditBranch(b)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors inline-flex items-center space-x-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Users Management */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Manajemen Pengguna & Penempatan Cabang</h2>
              <p className="text-slate-500 text-xs mt-0.5">
                Tambah pengguna baru, edit profil/role, dan atur penempatan cabang staf.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={fetchUsers}
                disabled={usersLoading}
                className="flex items-center space-x-2 px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${usersLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              <button
                onClick={handleOpenAddUser}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-cyan-600/20 transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Tambah User Baru</span>
              </button>
            </div>
          </div>

          {usersLoading ? (
            <div className="p-12 text-center text-slate-400">
              <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm font-medium">Memuat data pengguna...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-6">ID</th>
                    <th className="py-3.5 px-6">Nama Lengkap</th>
                    <th className="py-3.5 px-6">Username</th>
                    <th className="py-3.5 px-6">Role</th>
                    <th className="py-3.5 px-6">Cabang Penempatan</th>
                    <th className="py-3.5 px-6">Status Akun</th>
                    <th className="py-3.5 px-6 text-center">Aksi Manajemen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {users.map(u => {
                    const isAdmin = u.role === 'Admin';
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-6 font-mono text-xs text-slate-400">#{u.id}</td>
                        <td className="py-3.5 px-6 font-semibold text-slate-800">
                          {u.full_name}
                          {u.email && <div className="text-[10px] text-slate-400 font-normal">{u.email}</div>}
                        </td>
                        <td className="py-3.5 px-6 text-slate-600 font-mono text-xs">@{u.username}</td>
                        <td className="py-3.5 px-6">
                          <span className={`inline-block px-3 py-0.5 rounded-full border text-xs font-semibold ${getRoleBadge(u.role)}`}>
                            {u.role} {u.role === 'QA_Liaison' ? `(${u.qc_affiliation || 'Arisa'})` : ''}
                          </span>
                        </td>
                        <td className="py-3.5 px-6">
                          {isAdmin ? (
                            <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg bg-purple-100 border border-purple-300 text-purple-900 text-xs font-bold shadow-xs">
                              <Globe className="w-3.5 h-3.5 text-purple-600" />
                              <span>🏢 Seluruh Cabang (Hak Akses Global)</span>
                            </span>
                          ) : u.branch ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-orange-50 border border-orange-200 text-orange-900 text-xs font-bold">
                              <MapPin className="w-3.5 h-3.5 text-orange-500" />
                              <span>[{u.branch.code}] {u.branch.name}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Semua Cabang / Global</span>
                          )}
                        </td>
                        <td className="py-3.5 px-6">
                          {isAdmin ? (
                            <span className="inline-flex items-center space-x-1.5 text-xs text-purple-700 font-bold bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200">
                              <Shield className="w-4 h-4 text-purple-600" />
                              <span>Aktif (Hak Penuh Admin)</span>
                            </span>
                          ) : u.delete_status === 'pending_delete' ? (
                            <span className="inline-flex items-center space-x-1.5 text-xs text-amber-800 font-extrabold bg-amber-100 px-2.5 py-1 rounded-md border border-amber-300 animate-pulse">
                              <AlertCircle className="w-4 h-4 text-amber-600" />
                              <span>⚠️ Pending Delete (Menunggu Approval)</span>
                            </span>
                          ) : u.is_active ? (
                            <span className="inline-flex items-center space-x-1.5 text-xs text-emerald-600 font-medium">
                              <UserCheck className="w-4 h-4" />
                              <span>Aktif</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1.5 text-xs text-rose-500 font-medium">
                              <UserX className="w-4 h-4" />
                              <span>Non-aktif</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleOpenEditUser(u)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors inline-flex items-center space-x-1"
                              title="Edit Profil / Role / Password"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>

                            {!isAdmin && (
                              <button
                                onClick={() => handleToggleUserStatus(u)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors inline-flex items-center space-x-1 ${
                                  u.is_active 
                                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200' 
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                                }`}
                                title={u.is_active ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                              >
                                {u.is_active ? <UserX className="w-3.5 h-3.5 text-rose-600" /> : <UserCheck className="w-3.5 h-3.5 text-emerald-600" />}
                                <span>{u.is_active ? 'Non-aktifkan' : 'Aktifkan'}</span>
                              </button>
                            )}

                            {/* Tombol Hapus User / Request Delete (Coordinator & Admin) */}
                            {!isAdmin && u.delete_status !== 'pending_delete' && (
                              <button
                                onClick={() => handleRequestDeleteUser(u)}
                                className="px-2.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 rounded-lg text-xs font-bold transition-all inline-flex items-center space-x-1"
                                title="Hapus User (Pengajuan Pending Delete oleh Coordinator)"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                <span>Hapus User</span>
                              </button>
                            )}

                            {/* Approval Hapus khusus System Administrator (Admin) */}
                            {isAdminUser && u.delete_status === 'pending_delete' && (
                              <div className="flex items-center space-x-1.5">
                                <button
                                  onClick={() => handleApproveDeleteUser(u)}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs inline-flex items-center space-x-1"
                                  title="Setujui Hapus User Permanen"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Approve Hapus</span>
                                </button>

                                <button
                                  onClick={() => handleRejectDeleteUser(u)}
                                  className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-all inline-flex items-center space-x-1"
                                  title="Tolak Pengajuan Hapus"
                                >
                                  <X className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Tolak</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Branch Repair Category Pricing */}
      {activeTab === 'repair_prices' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden space-y-6 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
                <Tag className="w-5 h-5 text-cyan-600" />
                <span>Setting Tarif Harga Perbaikan Per Cabang</span>
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">
                Konfigurasi tarif harga per perbaikan kategori untuk masing-masing lokasi cabang service.
              </p>
            </div>

            {/* Branch Selector */}
            <div className="flex items-center space-x-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
              <label className="text-xs font-bold text-slate-700 whitespace-nowrap flex items-center space-x-1.5">
                <MapPin className="w-4 h-4 text-orange-500" />
                <span>Pilih Lokasi Cabang:</span>
              </label>
              <select
                value={selectedPriceBranchId}
                onChange={(e) => setSelectedPriceBranchId(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    📍 [{b.code}] {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <form onSubmit={handleSaveBranchPrices} className="space-y-6">
            {pricesLoading ? (
              <div className="p-12 text-center text-slate-400">
                <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-sm font-medium">Memuat data tarif cabang...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(priceInputs).map((catName, idx) => (
                  <div key={catName} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-800 flex items-center justify-center font-mono text-[11px]">
                          {idx + 1}
                        </span>
                        <span>{catName}</span>
                      </label>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                      <input
                        type="number"
                        min="0"
                        step="5000"
                        value={priceInputs[catName] !== undefined ? priceInputs[catName] : ''}
                        onChange={(e) => setPriceInputs({ ...priceInputs, [catName]: e.target.value })}
                        placeholder="Contoh: 150000"
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 italic">
                💡 Penyesuaian harga di atas akan otomatis digunakan untuk kalkulasi subtotal tarif jasa di cabang bersangkutan.
              </p>
              <button
                type="submit"
                disabled={pricesSaving || pricesLoading}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-cyan-600/20 disabled:opacity-50 flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{pricesSaving ? 'Menyimpan Tarif...' : 'Simpan Tarif Harga Cabang Ini'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 1: Add User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-sm">Tambah Pengguna (User Baru)</h3>
              </div>
              <button onClick={() => setIsAddUserOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {userFormError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span>{userFormError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Username */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={userForm.username}
                    onChange={(e) => setUserForm(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Contoh: tech9"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Minimal 6 karakter"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Full Name */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={userForm.full_name}
                    onChange={(e) => setUserForm(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Contoh: Rahmat Hidayat"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Email */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Alamat Email (Opsional)
                  </label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="rahmat@shopee-repair.local"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Role Hak Akses <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  >
                    <option value="Technician">Technician</option>
                    <option value="Coordinator">Coordinator</option>
                    <option value="QA_Liaison">QA Liaison</option>
                    <option value="Admin">Admin Aplikasi</option>
                  </select>
                </div>

                {/* QC Affiliation (if role is QA_Liaison) */}
                {userForm.role === 'QA_Liaison' && (
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Afiliasi Pihak QC Inspector <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={userForm.qc_affiliation}
                      onChange={(e) => setUserForm(prev => ({ ...prev, qc_affiliation: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    >
                      <option value="Arisa">🏢 QC Pihak Arisa (QC1 - Hardware Verification)</option>
                      <option value="Shopee">🛍️ QC Pihak Shopee (QC2 - Final Handover Release)</option>
                    </select>
                  </div>
                )}

                {/* Branch Placement */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Cabang Bertugas
                  </label>
                  <select
                    value={userForm.branch_id}
                    disabled={userForm.role === 'Admin'}
                    onChange={(e) => setUserForm(prev => ({ ...prev, branch_id: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-cyan-500 focus:outline-none disabled:opacity-50"
                  >
                    <option value="">🏢 Seluruh Cabang (Hak Akses Global)</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        📍 [{b.code}] {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Technician Skill Level (if role is Technician) */}
                {userForm.role === 'Technician' && (
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Spesialisasi Keterampilan Teknisi
                    </label>
                    <input
                      type="text"
                      value={userForm.skill_level}
                      onChange={(e) => setUserForm(prev => ({ ...prev, skill_level: e.target.value }))}
                      placeholder="Contoh: Display & Hinges Specialist"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    />
                  </div>
                )}

                {/* Embedded Signature Upload Section */}
                {(userForm.role === 'Coordinator' || userForm.role === 'QA_Liaison' || userForm.role === 'Admin') && (
                  <div className="sm:col-span-2 space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>✍️ Tanda Tangan Digital Pengguna ({userForm.role})</span>
                      {userForm.signature_url && (
                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          TTD Terpasang ✅
                        </span>
                      )}
                    </label>

                    {userForm.signature_url ? (
                      <div className="bg-white border border-slate-300 rounded-lg p-2 flex items-center justify-between h-20">
                        <img
                          src={userForm.signature_url}
                          alt="Tanda Tangan User"
                          className="max-h-16 max-w-[200px] object-contain mx-auto"
                        />
                        <button
                          type="button"
                          onClick={() => setUserForm(prev => ({ ...prev, signature_url: '' }))}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold border border-red-200 flex items-center space-x-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    ) : (
                      <div>
                        <label className="block w-full border border-dashed border-slate-300 hover:border-cyan-500 rounded-lg p-3 text-center cursor-pointer bg-white hover:bg-cyan-50/40 transition-colors">
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/webp, image/svg+xml"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (!file) return;
                              if (!file.type.startsWith('image/')) {
                                alert('Harap pilih file gambar (PNG, JPG, WEBP).');
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                setUserForm(prev => ({ ...prev, signature_url: event.target.result }));
                              };
                              reader.readAsDataURL(file);
                            }}
                            className="hidden"
                          />
                          <span className="text-xs font-bold text-cyan-700 block">📁 Klik untuk Upload Gambar TTD (PNG/JPG)</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Format PNG transparan disarankan (Max 2MB)</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={userSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-cyan-600/20 disabled:opacity-50"
                >
                  {userSubmitting ? 'Memproses...' : 'Daftarkan User Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit User Modal */}
      {isEditUserOpen && editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">Edit Profil Pengguna (@{editingUser.username})</h3>
              </div>
              <button onClick={() => setIsEditUserOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              {userFormError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span>{userFormError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Username (Readonly) */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={userForm.username}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 text-slate-500 rounded-lg px-3 py-2 text-xs font-mono select-none cursor-not-allowed"
                  />
                </div>

                {/* Reset Password (Optional) */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                    <Key className="w-3 h-3 text-amber-500" />
                    <span>Reset Password (Opsional)</span>
                  </label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Isi jika ingin ubah password"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>

                {/* Full Name */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={userForm.full_name}
                    onChange={(e) => setUserForm(prev => ({ ...prev, full_name: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Email */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Alamat Email
                  </label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Role Hak Akses <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  >
                    <option value="Technician">Technician</option>
                    <option value="Coordinator">Coordinator</option>
                    <option value="QA_Liaison">QA Liaison</option>
                    <option value="Admin">Admin Aplikasi</option>
                  </select>
                </div>

                {/* QC Affiliation (if role is QA_Liaison) */}
                {userForm.role === 'QA_Liaison' && (
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Afiliasi Pihak QC Inspector <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={userForm.qc_affiliation}
                      onChange={(e) => setUserForm(prev => ({ ...prev, qc_affiliation: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    >
                      <option value="Arisa">🏢 QC Pihak Arisa (QC1 - Hardware Verification)</option>
                      <option value="Shopee">🛍️ QC Pihak Shopee (QC2 - Final Handover Release)</option>
                    </select>
                  </div>
                )}

                {/* Branch Placement */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Cabang Bertugas
                  </label>
                  <select
                    value={userForm.branch_id}
                    disabled={userForm.role === 'Admin'}
                    onChange={(e) => setUserForm(prev => ({ ...prev, branch_id: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-cyan-500 focus:outline-none disabled:opacity-50"
                  >
                    <option value="">🏢 Seluruh Cabang (Hak Akses Global)</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        📍 [{b.code}] {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Account Active Status */}
                {editingUser.role !== 'Admin' && (
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Status Keaktifan Akun
                    </label>
                    <select
                      value={userForm.is_active ? 'active' : 'inactive'}
                      onChange={(e) => setUserForm(prev => ({ ...prev, is_active: e.target.value === 'active' }))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    >
                      <option value="active">🟢 Akun Aktif (Dapat Login)</option>
                      <option value="inactive">🔴 Akun Non-aktif (Blokir Login)</option>
                    </select>
                  </div>
                )}

                {/* Embedded Signature Upload Section */}
                {(userForm.role === 'Coordinator' || userForm.role === 'QA_Liaison' || userForm.role === 'Admin') && (
                  <div className="sm:col-span-2 space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>✍️ Tanda Tangan Digital Pengguna ({userForm.role})</span>
                      {userForm.signature_url && (
                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          TTD Terpasang ✅
                        </span>
                      )}
                    </label>

                    {userForm.signature_url ? (
                      <div className="bg-white border border-slate-300 rounded-lg p-2 flex items-center justify-between h-20">
                        <img
                          src={userForm.signature_url}
                          alt="Tanda Tangan User"
                          className="max-h-16 max-w-[200px] object-contain mx-auto"
                        />
                        <button
                          type="button"
                          onClick={() => setUserForm(prev => ({ ...prev, signature_url: '' }))}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold border border-red-200 flex items-center space-x-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    ) : (
                      <div>
                        <label className="block w-full border border-dashed border-slate-300 hover:border-cyan-500 rounded-lg p-3 text-center cursor-pointer bg-white hover:bg-cyan-50/40 transition-colors">
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/webp, image/svg+xml"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (!file) return;
                              if (!file.type.startsWith('image/')) {
                                alert('Harap pilih file gambar (PNG, JPG, WEBP).');
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                setUserForm(prev => ({ ...prev, signature_url: event.target.result }));
                              };
                              reader.readAsDataURL(file);
                            }}
                            className="hidden"
                          />
                          <span className="text-xs font-bold text-cyan-700 block">📁 Klik untuk Upload Gambar TTD (PNG/JPG)</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Format PNG transparan disarankan (Max 2MB)</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEditUserOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={userSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-semibold rounded-xl shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {userSubmitting ? 'Simpan...' : 'Simpan Perubahan User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Branch Modal (Add / Edit) */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-sm">
                  {editingBranch ? 'Edit Lokasi Cabang' : 'Tambah Lokasi Cabang Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsBranchModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="p-6 space-y-4">
              {branchError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span>{branchError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lokasi Cabang <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={branchForm.name}
                  onChange={(e) => setBranchForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Contoh: Medan Hub"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kode 3 Huruf Cabang (Prefix Service ID) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={branchForm.code}
                  onChange={(e) => setBranchForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="Contoh: MDN"
                  maxLength={10}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Kode ini digunakan sebagai 3 huruf diawal nomor tiket (misal: MDN-2026-0001).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat Lengkap Cabang
                </label>
                <textarea
                  rows="3"
                  value={branchForm.address}
                  onChange={(e) => setBranchForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Contoh: Jl. Gatot Subroto No. 45, Medan..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={branchSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-semibold rounded-xl shadow-md shadow-orange-500/20 disabled:opacity-50"
                >
                  {branchSubmitting ? 'Memproses...' : 'Simpan Cabang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Branch Assignment Modal */}
      {isUserBranchModalOpen && selectedUserForBranch && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-sm">Penempatan Lokasi Cabang Pengguna</h3>
              </div>
              <button
                onClick={() => setIsUserBranchModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserBranch} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="font-bold text-slate-800">{selectedUserForBranch.full_name}</div>
                <div className="text-slate-500">Username: @{selectedUserForBranch.username} | Role: {selectedUserForBranch.role}</div>
              </div>

              {selectedUserForBranch.role === 'Admin' ? (
                <div className="p-4 bg-purple-50 border border-purple-200 text-purple-900 text-xs rounded-xl flex items-start space-x-3">
                  <Globe className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Hak Akses Global Seluruh Cabang</span>
                    <span className="text-purple-700">
                      User dengan Role Admin Aplikasi secara otomatis memiliki hak akses penuh ke seluruh lokasi cabang dan tidak dapat dibatasi ke cabang tunggal.
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pilih Lokasi Cabang Bertugas
                  </label>
                  <select
                    value={selectedBranchIdForUser}
                    onChange={(e) => setSelectedBranchIdForUser(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value="">🏢 Seluruh Cabang (Hak Akses Global)</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        📍 [{b.code}] {b.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Staf yang ditempatkan di cabang tertentu hanya dapat mengelola dan ditugaskan pada order cabang tersebut.
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsUserBranchModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={userBranchSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-cyan-600/20 disabled:opacity-50"
                >
                  {userBranchSubmitting ? 'Simpan...' : 'Simpan Penempatan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
