import React from 'react';
import { Search, Bell, LogOut, Shield, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const HeaderNav = () => {
  const { user, logout } = useAuth();

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'Admin':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Coordinator':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'QA_Liaison':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Technician':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      {/* Search Input */}
      <div className="relative w-72">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Cari Serial Number, Asset, atau Tiket..."
          className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all text-slate-700 placeholder-slate-400"
        />
      </div>

      {/* User Actions */}
      <div className="flex items-center space-x-4">
        {/* Notifications Icon */}
        <button 
          title="Notifikasi Notifikasi"
          className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full ring-2 ring-white"></span>
        </button>

        <div className="h-6 w-[1px] bg-slate-200"></div>

        {/* User Profile Card */}
        {user && (
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shadow-sm ring-2 ring-slate-100">
              {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            
            <div className="hidden sm:block text-left">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-xs text-slate-800 leading-tight">
                  {user.full_name}
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${getRoleBadgeColor(user.role)}`}>
                  {user.role}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 block leading-tight">
                @{user.username}
              </span>
            </div>

            {/* Logout Button */}
            <button
              onClick={logout}
              title="Logout"
              className="ml-2 flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default HeaderNav;
