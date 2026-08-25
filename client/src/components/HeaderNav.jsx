import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Bell, 
  LogOut, 
  Menu, 
  PanelLeftClose, 
  PanelLeftOpen, 
  User as UserIcon, 
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLayout } from '../context/LayoutContext';
import SignatureModal from './SignatureModal';

const HeaderNav = () => {
  const { user, logout } = useAuth();
  const { toggleSidebar, isCollapsed } = useLayout();
  const [isSigModalOpen, setIsSigModalOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const navigate = useNavigate();

  const handleGlobalSearchSubmit = (e) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      navigate(`/devices?search=${encodeURIComponent(globalSearch.trim())}`);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'Admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Coordinator':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'QA_Liaison':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Technician':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200/90 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs select-none">
        {/* Left: Sidebar Toggle Hamburger + Title/Search */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Hamburger / Collapse Button */}
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center justify-center border border-slate-200"
            title="Buka / Tutup Sidebar"
            aria-label="Toggle Sidebar"
          >
            <Menu className="w-5 h-5 text-slate-700" />
          </button>

          {/* Mobile Brand Title or Desktop Search */}
          <div className="flex items-center space-x-2">
            <span className="lg:hidden font-bold text-xs sm:text-sm text-slate-800 tracking-tight">
              Shopee Repair
            </span>
            <form onSubmit={handleGlobalSearchSubmit} className="hidden md:flex items-center space-x-1.5 relative w-64 lg:w-96">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder="Cari Serial Number, Asset ID, atau Tiket..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-700 placeholder-slate-400 font-medium"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1 flex-shrink-0 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Cari</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right: User Actions & Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* User Profile Info */}
          {user && (
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white flex items-center justify-center font-bold text-xs shadow-xs ring-1 ring-slate-200">
                {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
              </div>
              
              <div className="hidden sm:block text-left">
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-xs text-slate-800 leading-tight truncate max-w-[120px] lg:max-w-[160px]">
                    {user.full_name}
                  </span>
                  <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-full border ${getRoleBadgeColor(user.role)}`}>
                    {user.role}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono block leading-tight truncate">
                  @{user.username} {user.branch ? `• ${user.branch.name}` : ''}
                </span>
              </div>

              {/* Mobile Role Badge Only */}
              <div className="sm:hidden">
                <span className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded-md border ${getRoleBadgeColor(user.role)}`}>
                  {user.role === 'QA_Liaison' ? 'QC' : user.role === 'Technician' ? 'Tech' : user.role}
                </span>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                title="Logout dari Sistem"
                className="flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors border border-rose-100 shadow-2xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Signature Modal */}
      <SignatureModal
        isOpen={isSigModalOpen}
        onClose={() => setIsSigModalOpen(false)}
      />
    </>
  );
};

export default HeaderNav;
