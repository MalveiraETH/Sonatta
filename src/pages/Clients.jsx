import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import ClientForm from '@/components/clients/ClientForm';
import { Search, MoreVertical, Edit, Eye, MessageCircle, Plus, Filter, X, Users } from 'lucide-react';
import { openWhatsApp } from '@/utils/whatsapp';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

function FiltersContent({ statusFilter, setStatusFilter, statusLabels, clearFilters, setFilterOpen }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm">Status</Label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(statusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={clearFilters} className="flex-1">
          Limpar
        </Button>
        <Button onClick={() => setFilterOpen(false)} className="flex-1 bg-[#6B3FA0] hover:bg-[#834CB8]">
          Aplicar
        </Button>
      </div>
    </div>
  );
}

export default function Clients() {
  const navigate = useNavigate();

  const navigateToClient = (client) => {
    navigate(`/ClientDetail?id=${client.id}`);
  };
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterClients();
  }, [clients, searchTerm, statusFilter]);

  const loadData = async () => {
    try {
      const clientsData = await base44.entities.Client.list('-created_date');
      setClients(clientsData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterClients = () => {
    let filtered = [...clients];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.full_name?.toLowerCase().includes(term) ||
        c.cpf?.includes(term) ||
        c.phone?.includes(term) ||
        c.email?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    setFilteredClients(filtered);
  };

  const sendWhatsApp = (client) => {
    if (!client.phone) {
      toast.error('Cliente não possui telefone cadastrado');
      return;
    }
    const phone = client.phone.replace(/\D/g, '');
    openWhatsApp(`55${phone}`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  const statusLabels = {
    lead: 'Lead',
    teste_agendado: 'Teste Agendado',
    em_teste: 'Em Teste',
    teste_estendido: 'Teste Estendido',
    teste_finalizado: 'Teste Finalizado',
    teste_pendente: 'Teste Pendente',
    cliente_ativo: 'Cliente Ativo',
    pos_venda: 'Pós-Venda'
  };

  const stats = {
    total: clients.length,
    leads: clients.filter(c => c.status === 'lead').length,
    agendado: clients.filter(c => c.status === 'teste_agendado').length,
    emTeste: clients.filter(c => c.status === 'em_teste').length,
    estendido: clients.filter(c => c.status === 'teste_estendido').length,
    finalizado: clients.filter(c => c.status === 'teste_finalizado').length,
    pendente: clients.filter(c => c.status === 'teste_pendente').length,
    ativos: clients.filter(c => c.status === 'cliente_ativo').length
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6B3FA0]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-500 mt-1">{clients.length} clientes cadastrados</p>
        </div>
        <Button onClick={() => { setSelectedClient(null); setFormOpen(true); }} className="bg-[#6B3FA0] hover:bg-[#834CB8] w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card 
          className="p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]" 
          onClick={() => setStatusFilter('all')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-1">Total</p>
              <p className="text-lg sm:text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <Users className="h-5 w-5 sm:h-6 sm:w-6 text-slate-500 opacity-60" />
          </div>
        </Card>

        <Card 
          className="p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]" 
          onClick={() => setStatusFilter('lead')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-1">Leads</p>
              <p className="text-lg sm:text-2xl font-bold text-amber-600">{stats.leads}</p>
            </div>
            <Users className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500 opacity-60" />
          </div>
        </Card>

        <Card 
          className="p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]" 
          onClick={() => setStatusFilter('em_teste')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-1">Em Teste</p>
              <p className="text-lg sm:text-2xl font-bold text-blue-600">{stats.emTeste}</p>
            </div>
            <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 opacity-60" />
          </div>
        </Card>

        <Card 
          className="p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]" 
          onClick={() => setStatusFilter('teste_finalizado')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-1">Finalizado</p>
              <p className="text-lg sm:text-2xl font-bold text-purple-600">{stats.finalizado}</p>
            </div>
            <Users className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500 opacity-60" />
          </div>
        </Card>

        <Card 
          className="p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]" 
          onClick={() => setStatusFilter('cliente_ativo')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-1">Clientes Ativos</p>
              <p className="text-lg sm:text-2xl font-bold text-emerald-600">{stats.ativos}</p>
            </div>
            <Users className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500 opacity-60" />
          </div>
        </Card>
      </div>

      {/* Filters - Desktop */}
      <Card className="p-4 hidden lg:block">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label className="text-sm mb-2">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome, CPF, telefone ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="w-48">
            <Label className="text-sm mb-2">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" onClick={clearFilters}>
            Limpar
          </Button>
        </div>
      </Card>

      {/* Filters - Mobile */}
      <div className="lg:hidden space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
              {statusFilter !== 'all' && (
                <span className="ml-2 bg-[#6B3FA0] text-white text-xs px-2 py-0.5 rounded-full">
                  Ativos
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh]">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FiltersContent statusFilter={statusFilter} setStatusFilter={setStatusFilter} statusLabels={statusLabels} clearFilters={clearFilters} setFilterOpen={setFilterOpen} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Table - Desktop */}
      <Card className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-slate-500">
                  Nenhum cliente encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map(client => (
                <TableRow 
                  key={client.id} 
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => navigateToClient(client)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{client.full_name}</p>
                      <p className="text-xs text-slate-500">{client.cpf || '-'}</p>
                    </div>
                  </TableCell>
                  <TableCell>{client.phone || '-'}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      client.status === 'cliente_ativo' ? 'bg-emerald-100 text-emerald-700' :
                      client.status === 'teste_agendado' ? 'bg-purple-100 text-purple-700' :
                      client.status === 'em_teste' ? 'bg-blue-100 text-blue-700' :
                      client.status === 'teste_estendido' ? 'bg-amber-100 text-amber-700' :
                      client.status === 'teste_finalizado' ? 'bg-teal-100 text-teal-700' :
                      client.status === 'teste_pendente' ? 'bg-red-100 text-red-700' :
                      client.status === 'lead' ? 'bg-slate-100 text-slate-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {statusLabels[client.status] || client.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    {client.phone && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          sendWhatsApp(client);
                        }}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Cards - Mobile */}
      <div className="lg:hidden space-y-3">
        {filteredClients.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            Nenhum cliente encontrado
          </Card>
        ) : (
          filteredClients.map(client => (
            <Card 
              key={client.id} 
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigateToClient(client)}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-900">{client.full_name}</span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        client.status === 'cliente_ativo' ? 'bg-emerald-100 text-emerald-700' :
                        client.status === 'teste_agendado' ? 'bg-purple-100 text-purple-700' :
                        client.status === 'em_teste' ? 'bg-blue-100 text-blue-700' :
                        client.status === 'teste_estendido' ? 'bg-amber-100 text-amber-700' :
                        client.status === 'teste_finalizado' ? 'bg-teal-100 text-teal-700' :
                        client.status === 'teste_pendente' ? 'bg-red-100 text-red-700' :
                        client.status === 'lead' ? 'bg-slate-100 text-slate-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {statusLabels[client.status] || client.status}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600">
                      {client.phone || 'Sem telefone'}
                    </div>
                  </div>
                  {client.phone && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        sendWhatsApp(client);
                      }}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <ClientForm
        open={formOpen}
        onOpenChange={setFormOpen}
        client={selectedClient}
        onSuccess={loadData}
      />
    </div>
  );
}