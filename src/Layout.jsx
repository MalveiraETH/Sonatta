import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Package,
  FileText,
  ShoppingCart,
  FileSignature,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Bell,
  Ear,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import AppVersionMonitor from '@/components/utils/AppVersionMonitor';
import { useTabs } from '@/lib/TabsContext';
import { PAGES } from './pages.config';

const menuItems = [
  { name: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard },
  { name: 'Clientes', page: 'Clients', icon: Users },
  { name: 'Agendamentos', page: 'Appointments', icon: Calendar },
  { name: 'Teste', page: 'Tests', icon: Ear },
  { name: 'Profissionais', page: 'Professionals', icon: Users },
  { name: 'Estoque', page: 'Inventory', icon: Package },
  { name: 'Orçamentos', page: 'Quotes', icon: FileText },
  { name: 'Vendas', page: 'Sales', icon: ShoppingCart },
  { name: 'Contratos', page: 'Contracts', icon: FileSignature },
  { name: 'Financeiro', page: 'Financeiro', icon: DollarSign },
  { name: 'Cadastros', page: 'Registrations', icon: FileText },
  { name: 'Relatórios', page: 'Reports', icon: FileText },
  { name: 'Configurações', page: 'Settings', icon: Bell },
];

const userRoleLabels = {
  admin: 'Administrador',
  fonoaudiologo: 'Fonoaudiólogo(a)',
  comercial: 'Consultor Comercial',
  recepcao: 'Recepção'
};

// Componente interno que usa o contexto de abas (desktop)
function DesktopTabsContent({ user }) {
  const { tabs, activeTab, openTab, closeTab, activateTab } = useTabs();

  const handleMenuClick = (page, name) => {
    const exists = tabs.find(t => t.page === page);
    if (exists) {
      activateTab(page);
    } else {
      openTab(page, name);
    }
  };

  return (
    <>
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex fixed top-0 left-0 h-full w-64 bg-[#6B3FA0] z-40 flex-col overflow-hidden">
        {/* Logo */}
        <div className="h-24 flex items-center justify-center border-b border-white/10 px-4 flex-shrink-0">
          <div className="flex flex-col items-center gap-2">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694e93aa7609bf14847de917/6be15c70b_IMG_5204.png"
              alt="Sonatta"
              className="w-16 h-16 object-contain"
            />
            <div className="text-center">
              <h1 className="text-white font-bold text-xl tracking-wide">SONATTA</h1>
              <p className="text-white/60 text-xs">Soluções Auditivas</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto pb-4">
          {menuItems.map((item) => {
            const isActive = activeTab === item.page;
            const isOpen = tabs.some(t => t.page === item.page);
            const Icon = item.icon;
            return (
              <button
                key={item.page}
                onClick={() => handleMenuClick(item.page, item.name)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left",
                  isActive
                    ? "bg-[#A4D233] text-slate-900 shadow-lg shadow-[#A4D233]/30 font-semibold"
                    : isOpen
                    ? "bg-white/15 text-white font-medium"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium text-base flex-1">{item.name}</span>
                {isOpen && !isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A4D233] flex-shrink-0" />
                )}
              </button>
            );
          })}
        </nav>

        {/* User Info */}
        {user && (
          <div className="p-4 border-t border-white/10 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold">
                  {user.full_name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{user.full_name}</p>
                <p className="text-white/50 text-xs truncate">
                  {userRoleLabels[user.role] || 'Usuário'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => base44.auth.logout()}
                className="text-white/50 hover:text-white hover:bg-white/10"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </aside>

      {/* Main area desktop com abas */}
      <div className="hidden lg:flex lg:ml-64 flex-col h-screen bg-slate-50">
        {/* Tab bar */}
        <div className="flex items-end bg-[#6B3FA0] px-2 pt-2 gap-0.5 flex-shrink-0 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = tab.page === activeTab;
            const menuItem = menuItems.find(m => m.page === tab.page);
            const Icon = menuItem?.icon;
            return (
              <div
                key={tab.page}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-t-lg cursor-pointer transition-all duration-150 flex-shrink-0 group",
                  isActive
                    ? "bg-slate-50 text-slate-800"
                    : "bg-[#5a3388] text-white/70 hover:bg-[#7a4ab5] hover:text-white"
                )}
                onClick={() => activateTab(tab.page)}
              >
                {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                <span className="text-sm font-medium whitespace-nowrap">{tab.name}</span>
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); closeTab(tab.page); }}
                    className={cn(
                      "ml-1 rounded-full p-0.5 transition-colors",
                      isActive
                        ? "hover:bg-slate-200 text-slate-400 hover:text-slate-700"
                        : "hover:bg-white/20 text-white/40 hover:text-white"
                    )}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {tabs.map((tab) => {
            const PageComponent = PAGES[tab.page];
            if (!PageComponent) return null;
            return (
              <div
                key={tab.page}
                className={tab.page === activeTab ? 'block' : 'hidden'}
              >
                <div className="p-8">
                  <PageComponent />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    const handleTouchStart = (e) => setStartY(e.touches[0].clientY);
    const handleTouchMove = (e) => {
      const currentY = e.touches[0].clientY;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      if (scrollTop === 0 && currentY > startY && !isRefreshing) {
        const distance = Math.min(currentY - startY, 120);
        setPullDistance(distance);
        if (distance >= 120) {
          setIsRefreshing(true);
          setPullDistance(0);
          setTimeout(() => window.location.reload(), 300);
        }
      }
    };
    const handleTouchEnd = () => { if (!isRefreshing) setPullDistance(0); };

    if (window.innerWidth < 768) {
      document.addEventListener('touchstart', handleTouchStart);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [startY, isRefreshing]);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (e) {
      console.log('User not logged in');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AppVersionMonitor />

      {/* Pull to refresh indicator (mobile) */}
      {(pullDistance > 10 || isRefreshing) && (
        <div
          className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center bg-[#6B3FA0] transition-all duration-200 lg:hidden"
          style={{ height: isRefreshing ? 56 : Math.max(pullDistance * 0.5, 0) }}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-5 h-5 border-2 border-white/40 border-t-white rounded-full ${
                isRefreshing || pullDistance >= 120 ? 'animate-spin' : ''
              }`}
              style={!isRefreshing ? { transform: `rotate(${(pullDistance / 120) * 360}deg)` } : {}}
            />
            {isRefreshing ? (
              <span className="text-white text-xs font-medium">Atualizando...</span>
            ) : pullDistance >= 100 ? (
              <span className="text-white text-xs font-medium">Solte para atualizar</span>
            ) : (
              <span className="text-white text-xs font-medium">Puxe para atualizar</span>
            )}
          </div>
        </div>
      )}

      <style>{`
        :root {
          --primary: #6B3FA0;
          --primary-light: #834CB8;
          --accent: #A4D233;
          --accent-light: #B8E047;
        }
        @media (max-width: 768px) {
          .mobile-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          button, a { min-height: 44px; min-width: 44px; }
          body { overflow-x: hidden; }
          input, select, textarea { font-size: 16px !important; }
        }
      `}</style>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50 flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-[#6B3FA0] hover:bg-[#6B3FA0]/10"
          >
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
          <div className="flex items-center gap-2">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694e93aa7609bf14847de917/6be15c70b_IMG_5204.png"
              alt="Sonatta"
              className="w-10 h-10 object-contain"
            />
            <span className="text-[#6B3FA0] font-semibold">Sonatta</span>
          </div>
        </div>
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="text-[#6B3FA0] hover:bg-[#6B3FA0]/10">
                <span className="text-sm">{user.full_name?.split(' ')[0]}</span>
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => base44.auth.logout()}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {/* Mobile Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 bg-[#6B3FA0] z-40 transform transition-transform duration-300 ease-in-out overflow-y-auto lg:hidden",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-24 flex items-center justify-center border-b border-white/10 px-4">
          <div className="flex flex-col items-center gap-2">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694e93aa7609bf14847de917/6be15c70b_IMG_5204.png"
              alt="Sonatta"
              className="w-16 h-16 object-contain"
            />
            <div className="text-center">
              <h1 className="text-white font-bold text-xl tracking-wide">SONATTA</h1>
              <p className="text-white/60 text-xs">Soluções Auditivas</p>
            </div>
          </div>
        </div>
        <nav className="p-4 space-y-1 pb-24 overflow-y-auto max-h-[calc(100vh-13rem)]">
          {menuItems.map((item) => {
            const isActive = currentPageName === item.page;
            const Icon = item.icon;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-[#A4D233] text-slate-900 shadow-lg shadow-[#A4D233]/30 font-semibold"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        {user && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-white font-semibold">{user.full_name?.charAt(0) || 'U'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{user.full_name}</p>
                <p className="text-white/50 text-xs truncate">{userRoleLabels[user.role] || 'Usuário'}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => base44.auth.logout()} className="text-white/50 hover:text-white hover:bg-white/10">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Mobile Main Content */}
      <main className="lg:hidden min-h-screen pt-16 bg-slate-50">
        <div className="p-3 sm:p-4">{children}</div>
      </main>

      {/* Desktop: sistema de abas */}
      <DesktopTabsContent user={user} />
    </div>
  );
}