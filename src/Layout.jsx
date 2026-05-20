import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  DollarSign,
  Shield,
  Wrench
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
import { usePermissions } from '@/lib/usePermissions';

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
  { name: 'Consertos', page: 'DeviceRepairs', icon: Wrench },
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

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const { canAccessPage } = usePermissions(user);
  const location = useLocation();

  // Determina a página ativa pela URL
  const activePageFromUrl = location.pathname.replace(/^\//, '') || 'Clients';

  const allowedMenuItems = menuItems.filter(item => canAccessPage(item.page));

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    // Pull-to-refresh desabilitado
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (e) {
      console.log('User not logged in');
    }
  };

  const SidebarContent = ({ mobile = false }) => (
    <aside className={cn(
      "bg-[#6B3FA0] flex flex-col",
      mobile
        ? cn(
            "fixed top-0 left-0 h-full w-64 z-40 transform transition-transform duration-300 ease-in-out overflow-y-auto lg:hidden",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )
        : "hidden lg:flex fixed top-0 left-0 h-full w-64 z-40 overflow-hidden"
    )}>
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
        {allowedMenuItems.map((item) => {
          const isActive = activePageFromUrl.toLowerCase() === item.page.toLowerCase()
            || (activePageFromUrl === '' && item.page === 'Clients')
            || currentPageName === item.page;
          const Icon = item.icon;
          return (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                isActive
                  ? "bg-[#A4D233] text-slate-900 shadow-lg shadow-[#A4D233]/30 font-semibold"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium text-base flex-1">{item.name}</span>
            </Link>
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
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <AppVersionMonitor />



      <style>{`
        :root {
          --primary: #6B3FA0;
          --primary-light: #834CB8;
          --accent: #A4D233;
          --accent-light: #B8E047;
        }
        @media (max-width: 768px) {
          .mobile-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
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
      <SidebarContent mobile />

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Desktop Sidebar */}
      <SidebarContent />

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0 bg-slate-50">
        <div className="p-4 lg:p-8">
          {canAccessPage(currentPageName) ? children : (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
              <Shield className="h-10 w-10 text-slate-300" />
              <p className="text-base font-medium">Acesso não autorizado</p>
              <p className="text-sm text-center">Você não tem permissão para acessar esta página.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}