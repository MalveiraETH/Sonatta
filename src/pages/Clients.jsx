import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import ClientForm from '@/components/clients/ClientForm';
import {
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  MessageCircle,
  Calendar,
  FileText,
  Eye,
  Grid3x3,
  List
} from 'lucide-react';
import { toast } from 'sonner';

export default function Clients() {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterClients();
  }, [clients, searchTerm, statusFilter]);

  const loadData = async () => {
    try {
      const [clientsData, user] = await Promise.all([
        base44.entities.Client.list('-created_date'),
        base44.auth.me()
      ]);
      setClients(clientsData);
      setCurrentUser(user);
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

  const handleEdit = (client) => {
    setSelectedClient(client);
    setFormOpen(true);
  };

  const handleDelete = async (client) => {
    if (!confirm('Tem certeza que deseja excluir este cliente? Todos os agendamentos deste cliente também serão excluídos.')) return;
    
    if (currentUser?.user_role !== 'admin') {
      toast.error('Apenas administradores podem excluir registros');
      return;
    }

    try {
      // Excluir agendamentos do cliente
      const appointments = await base44.entities.Appointment.filter({ client_id: client.id });
      for (const appointment of appointments) {
        await base44.entities.Appointment.delete(appointment.id);
      }
      
      // Excluir cliente
      await base44.entities.Client.delete(client.id);
      toast.success('Cliente e seus agendamentos excluídos');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir cliente');
    }
  };

  const sendWhatsApp = (client) => {
    if (!client.phone) {
      toast.error('Cliente não possui telefone cadastrado');
      return;
    }
    const phone = client.phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${phone}`, '_blank');
  };

  const statusLabels = {
    lead: 'Lead',
    em_teste: 'Em Teste',
    cliente_ativo: 'Cliente Ativo',
    pos_venda: 'Pós-Venda'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description={`${clients.length} clientes cadastrados`}
        action={() => {
          setSelectedClient(null);
          setFormOpen(true);
        }}
        actionLabel="Novo Cliente"
      />

      {/* Filters */}
      <Card className="p-4 border-0 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por nome, CPF, telefone ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'cards' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('cards')}
              className={viewMode === 'cards' ? 'bg-[#6B3FA0] hover:bg-[#834CB8]' : ''}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('table')}
              className={viewMode === 'table' ? 'bg-[#6B3FA0] hover:bg-[#834CB8]' : ''}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Cards Grid */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.length > 0 ? (
            filteredClients.map((client) => (
              <Card key={client.id} className="border-0 shadow-sm hover:shadow-md transition-shadow p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800 text-lg">{client.full_name}</h3>
                      {client.cpf && <p className="text-xs text-slate-400">CPF: {client.cpf}</p>}
                    </div>
                    <StatusBadge status={client.status} />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleEdit(client)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Link to={`${createPageUrl('ClientDetail')}?id=${client.id}`} className="flex-1">
                      <Button variant="default" size="sm" className="w-full bg-[#6B3FA0] hover:bg-[#834CB8]">
                        <Eye className="h-4 w-4 mr-1" />
                        Detalhes
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-slate-500">Nenhum cliente encontrado</p>
            </div>
          )}
        </div>
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">CPF</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.length > 0 ? (
                  filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{client.full_name}</p>
                          <p className="text-xs text-slate-500 md:hidden">{client.cpf}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{client.cpf || '-'}</TableCell>
                      <TableCell>
                        <StatusBadge status={client.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(client)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Link to={`${createPageUrl('ClientDetail')}?id=${client.id}`}>
                            <Button variant="default" size="sm" className="bg-[#6B3FA0] hover:bg-[#834CB8]">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-slate-500">
                      Nenhum cliente encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <ClientForm
        open={formOpen}
        onOpenChange={setFormOpen}
        client={selectedClient}
        onSuccess={loadData}
      />
    </div>
  );
}