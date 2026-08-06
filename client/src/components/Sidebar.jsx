import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Laptop, 
  Wrench, 
  CheckCircle2, 
  Package, 
  BarChart3, 
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { user, permissions } = useAuth();

  const navItems = [
    { key: 'dashboard', name: 'Dashboard', path: '/', icon: LayoutDashboard, defaultRoles: ['Admin', 'Coordinator', 'QA_Liaison', 'Technician'] },
    { key: 'devices', name: 'Devices Intake', path: '/devices', icon: Laptop, defaultRoles: ['Admin', 'Coordinator', 'QA_Liaison', 'Technician'] },
    { key: 'repairs', name: 'Repair Queue', path: '/repairs', icon: Wrench, defaultRoles: ['Admin', 'Coordinator', 'Technician'] },
    { key: 'qc', name: 'QC Checkpoints', path: '/qc', icon: CheckCircle2, defaultRoles: ['Admin', 'Coordinator', 'QA_Liaison', 'Technician'] },
    { key: 'parts', name: 'Parts Inventory', path: '/parts', icon: Package, defaultRoles: ['Admin', 'Coordinator', 'Technician'] },
    { key: 'reports', name: 'KPI Reports', path: '/reports', icon: BarChart3, defaultRoles: ['Admin', 'Coordinator', 'QA_Liaison'] },
    { key: 'admin', name: 'Admin & Users', path: '/admin', icon: Users, defaultRoles: ['Admin', 'Coordinator'] },
  ];

  // Filter based on dynamic permissions from backend. Fallback to defaultRoles if permissions empty before fetch
  const filteredNav = navItems.filter(item => {
    if (!user) return false;
    if (permissions && permissions.length > 0) {
      return permissions.includes(item.key);
    }
    return item.defaultRoles.includes(user.role);
  });

  return (
    <aside className="w-64 bg-[#1e222d] text-slate-300 min-h-screen flex flex-col flex-shrink-0 shadow-xl select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center font-bold text-white shadow-lg shadow-orange-500/30">
            S
          </div>
          <div>
            <h1 className="font-bold text-slate-100 text-sm tracking-wide leading-none">
              SHOPEE REPAIR
            </h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase mt-1">
              Asset Repair System
            </p>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Main Menu
        </div>

        {filteredNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Footer / System Status */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/40">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>VPS System Online</span>
          </span>
          <span className="font-mono text-[10px] text-slate-500">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
