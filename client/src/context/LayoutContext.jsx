import React, { createContext, useContext, useState, useEffect } from 'react';

const LayoutContext = createContext();

export const LayoutProvider = ({ children }) => {
  // Desktop collapsed state (persisted in localStorage)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('arisa_sidebar_collapsed') || localStorage.getItem('shopee_sidebar_collapsed');
    return saved === 'true';
  });

  // Mobile drawer state (open / closed)
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('arisa_sidebar_collapsed', isCollapsed);
  }, [isCollapsed]);

  // Close mobile sidebar on window resize if switching to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setIsMobileOpen(prev => !prev);
    } else {
      setIsCollapsed(prev => !prev);
    }
  };

  const closeMobileSidebar = () => {
    setIsMobileOpen(false);
  };

  return (
    <LayoutContext.Provider
      value={{
        isCollapsed,
        setIsCollapsed,
        isMobileOpen,
        setIsMobileOpen,
        toggleSidebar,
        closeMobileSidebar
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayout = () => useContext(LayoutContext);
