import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Laptop, 
  Wrench, 
  CheckCircle2, 
  Package, 
  BarChart3, 
  Users, 
  FileText, 
  Printer, 
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLayout } from '../context/LayoutContext';

const Sidebar = () => {
  const { user, permissions } = useAuth();
  const { isCollapsed, setIsCollapsed, isMobileOpen, closeMobileSidebar, toggleSidebar } = useLayout();
  const location = useLocation();

  const navItems = [
    { key: 'dashboard', name: 'Dashboard', path: '/', icon: LayoutDashboard, defaultRoles: ['Admin', 'Coordinator', 'QA_Liaison', 'Technician'] },
    { key: 'devices', name: 'Devices Intake', path: '/devices', icon: Laptop, defaultRoles: ['Admin', 'Coordinator', 'QA_Liaison', 'Technician'] },
    { key: 'repairs', name: 'Repair Queue', path: '/repairs', icon: Wrench, defaultRoles: ['Admin', 'Coordinator', 'Technician'] },
    { key: 'qc', name: 'QC Checkpoints', path: '/qc', icon: CheckCircle2, defaultRoles: ['Admin', 'Coordinator', 'QA_Liaison', 'Technician'] },
    { key: 'parts', name: 'Parts Inventory', path: '/parts', icon: Package, defaultRoles: ['Admin', 'Coordinator', 'Technician'] },
    { key: 'reports', name: 'KPI Reports & BAST', path: '/reports', icon: FileText, defaultRoles: ['Admin', 'Coordinator', 'QA_Liaison'] },
    { key: 'admin', name: 'Admin & Users', path: '/admin', icon: Users, defaultRoles: ['Admin', 'Coordinator'] },
  ];

  // Filter based on dynamic permissions from backend
  const filteredNav = navItems.filter(item => {
    if (!user) return false;
    if (permissions && permissions.length > 0) {
      return permissions.includes(item.key) || permissions.includes('reports');
    }
    return item.defaultRoles.includes(user.role);
  });

  const isReportsActive = location.pathname.startsWith('/reports') || location.pathname.startsWith('/bast-documents');

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          onClick={closeMobileSidebar}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Aside */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 bg-[#1a1e29] text-slate-300 flex flex-col flex-shrink-0 shadow-2xl select-none transition-all duration-300 ease-in-out ${
          // Mobile responsive slide-in
          isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
        } ${
          // Desktop collapsed width vs expanded width
          isCollapsed ? 'lg:w-20' : 'lg:w-64'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/90 bg-[#161a23]">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-yellow-400 flex items-center justify-center font-extrabold text-white shadow-lg shadow-orange-500/25 flex-shrink-0 ring-2 ring-orange-500/20">
              S
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="transition-opacity duration-200 truncate">
                <h1 className="font-extrabold text-slate-100 text-sm tracking-wide leading-none flex items-center gap-1.5">
                  <span>SHOPEE REPAIR</span>
                </h1>
                <p className="text-[10px] text-orange-400/90 font-semibold tracking-wider uppercase mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
                  <span>Asset Service</span>
                </p>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={closeMobileSidebar}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Desktop Collapse Toggle (Inside Header) */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            title={isCollapsed ? "Perluas Sidebar" : "Perkecil Sidebar"}
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4 text-orange-400" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 py-4 px-2.5 space-y-1.5 overflow-y-auto custom-scrollbar">
          {(!isCollapsed || isMobileOpen) && (
            <div className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
              <span>Main Menu</span>
              <span className="text-[9px] text-slate-600 font-mono">ROLE: {user?.role || 'Guest'}</span>
            </div>
          )}

          {filteredNav.map((item) => {
            const Icon = item.icon;
            const isItemActive = location.pathname === item.path || (item.key === 'reports' && isReportsActive);

            return (
              <React.Fragment key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={closeMobileSidebar}
                  title={isCollapsed && !isMobileOpen ? item.name : undefined}
                  className={() =>
                    `flex items-center ${
                      isCollapsed && !isMobileOpen ? 'justify-center px-0' : 'justify-between px-3'
                    } py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group relative ${
                      isItemActive
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20 font-bold'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                    }`
                  }
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${
                      isItemActive ? 'scale-110' : 'group-hover:scale-105'
                    }`} />
                    {(!isCollapsed || isMobileOpen) && (
                      <span className="truncate">{item.name}</span>
                    )}
                  </div>

                  {(!isCollapsed || isMobileOpen) && item.key === 'reports' && (
                    <ChevronRight className={`w-4 h-4 transition-transform duration-200 flex-shrink-0 ${
                      isReportsActive ? 'rotate-90 text-white' : 'text-slate-500'
                    }`} />
                  )}

                  {/* Tooltip on Desktop Collapsed */}
                  {isCollapsed && !isMobileOpen && (
                    <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs rounded-md shadow-xl border border-slate-700 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                      {item.name}
                    </div>
                  )}
                </NavLink>

                {/* Submenu "Dokumen BAST Handover" only appears when "KPI Reports & BAST" is active/clicked */}
                {item.key === 'reports' && isReportsActive && (!isCollapsed || isMobileOpen) && (
                  <div className="pl-6 pr-1 py-1 space-y-1 border-l-2 border-orange-500/40 ml-4 my-1">
                    <NavLink
                      to="/bast-documents"
                      onClick={closeMobileSidebar}
                      className={({ isActive }) =>
                        `flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                          location.pathname === '/bast-documents'
                            ? 'bg-orange-500/20 text-orange-300 font-bold border border-orange-500/40 shadow-xs'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                        }`
                      }
                    >
                      <Printer className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                      <span className="truncate">Dokumen BAST Handover</span>
                    </NavLink>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Footer Toggle Button & Info */}
        <div className="p-3 border-t border-slate-800/80 bg-[#161a23]">
          {/* Quick Collapse / Expand button */}
          <button
            type="button"
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center space-x-2 p-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all border border-slate-800"
          >
            {isCollapsed && !isMobileOpen ? (
              <ChevronRight className="w-4 h-4 text-orange-400" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="text-[11px]">Sembunyikan Sidebar</span>
              </>
            )}
          </button>

          {(!isCollapsed || isMobileOpen) && (
            <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500 px-1 font-mono">
              <span className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block"></span>
                <span>Online Cloud</span>
              </span>
              <span>v1.2.0</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
