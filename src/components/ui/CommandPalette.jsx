import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import {
  LayoutDashboard, Users, Calendar, Package, FileText,
  ShoppingCart, FileSignature, Ear, DollarSign, Wrench,
  Bot, Layers, Bell, Search, ArrowRight, User
} from 'lucide-react';

const pages = [
  { name: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard },
  { name: 'Clientes', page: 'Clients', icon: Users },
  { name: 'Agendamentos', page: 'Appointments', icon: Calendar },
  { name: 'Teste', page: 'Tests', icon: Ear },
  { name: 'Estoque', page: 'Inventory', icon: Package },
  { name: 'Orçamentos', page: 'Quotes', icon: FileText },
  { name: 'Vendas', page: 'Sales', icon: ShoppingCart },
  { name: 'Contratos', page: 'Contracts', icon: FileSignature },
  { name: 'Consertos', page: 'DeviceRepairs', icon: Wrench },
  { name: 'Moldes & Tampões', page: 'MoldOrders', icon: Layers },
  { name: 'Assistente IA', page: 'AssistenteSonatta', icon: Bot },
  { name: 'Financeiro', page: 'Financeiro', icon: DollarSign },
  { name: 'Configurações', page: 'Settings', icon: Bell },
];

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (!query || query.length < 2) { setClients([]); return; }
    const timer = setTimeout(async () => {
      setLoadingClients(true);
      try {
        const results = await base44.entities.Client.list('-created_date', 500);
        const term = query.toLowerCase();
        setClients(
          results
            .filter(c =>
              c.full_name?.toLowerCase().includes(term) ||
              c.phone?.includes(term) ||
              c.cpf?.includes(term)
            )
            .slice(0, 5)
        );
      } finally {
        setLoadingClients(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const filteredPages = pages.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  const allItems = [
    ...clients.map(c => ({ type: 'client', label: c.full_name, sub: c.phone, id: c.id })),
    ...filteredPages.map(p => ({ type: 'page', label: p.name, page: p.page, icon: p.icon })),
  ];

  const handleSelect = useCallback((item) => {
    if (item.type === 'client') {
      navigate(`/ClientDetail?id=${item.id}`);
    } else {
      navigate(createPageUrl(item.page));
    }
    onClose();
  }, [navigate, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, allItems.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && allItems[selectedIndex]) { handleSelect(allItems[selectedIndex]); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, allItems, selectedIndex, handleSelect, onClose]);

  useEffect(() => { setSelectedIndex(0); }, [query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-slate-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <Search className="h-5 w-5 text-slate-400 flex-shrink-0" />
          <input
            autoFocus
            className="flex-1 text-base outline-none bg-transparent text-slate-900 placeholder:text-slate-400"
            placeholder="Buscar clientes, páginas..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs text-slate-400 bg-slate-100 rounded border border-slate-200">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {allItems.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-8">
              {query.length < 2 ? 'Digite para buscar...' : 'Nenhum resultado encontrado'}
            </p>
          )}

          {clients.length > 0 && (
            <div>
              <p className="px-4 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">Clientes</p>
              {clients.map((item, idx) => {
                const globalIdx = idx;
                return (
                  <button
                    key={item.id}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${selectedIndex === globalIdx ? 'bg-[#6B3FA0]/10' : 'hover:bg-slate-50'}`}
                    onClick={() => handleSelect({ type: 'client', id: item.id })}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                  >
                    <div className="w-8 h-8 rounded-full bg-[#6B3FA0]/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-[#6B3FA0]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{item.full_name}</p>
                      <p className="text-xs text-slate-500 truncate">{item.phone || 'Sem telefone'}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300" />
                  </button>
                );
              })}
            </div>
          )}

          {filteredPages.length > 0 && (
            <div>
              {clients.length > 0 && <div className="my-1 border-t border-slate-100" />}
              <p className="px-4 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">Páginas</p>
              {filteredPages.map((item, idx) => {
                const globalIdx = clients.length + idx;
                const Icon = item.icon;
                return (
                  <button
                    key={item.page}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${selectedIndex === globalIdx ? 'bg-[#6B3FA0]/10' : 'hover:bg-slate-50'}`}
                    onClick={() => handleSelect({ type: 'page', page: item.page })}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-4 w-4 text-slate-500" />
                    </div>
                    <span className="flex-1 text-sm font-medium text-slate-900">{item.name}</span>
                    <ArrowRight className="h-4 w-4 text-slate-300" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-400">
          <span><kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">↑↓</kbd> navegar</span>
          <span><kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Enter</kbd> selecionar</span>
          <span><kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Esc</kbd> fechar</span>
        </div>
      </div>
    </div>
  );
}