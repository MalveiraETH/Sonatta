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
  Eye
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
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    
    if (currentUser?.user_role !== 'admin') {
      toast.error('Apenas administradores podem excluir registros');
      return;
    }

    try {
      await base44.entities.Client.delete(client.id);
      toast.success('Cliente excluído');
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
        </div>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Telefone</TableHead>
                <TableHead className="hidden lg:table-cell">E-mail</TableHead>
                <TableHead className="hidden lg:table-cell">Responsável</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length > 0 ? (
                filteredClients.map((client) => (
                  <TableRow key={client.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-800">{client.full_name}</p>
                        <p className="text-sm text-slate-500 md:hidden">{client.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{client.phone}</TableCell>
                    <TableCell className="hidden lg:table-cell">{client.email || '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {client.responsible_professional || '-'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={client.status} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(client)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => sendWhatsApp(client)}>
                            <MessageCircle className="h-4 w-4 mr-2" />
                            WhatsApp
                          </DropdownMenuItem>
                          <Link to={`${createPageUrl('ClientDetail')}?id=${client.id}`}>
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                          </Link>
                          {currentUser?.user_role === 'admin' && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(client)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Nenhum cliente encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <ClientForm
        open={formOpen}
        onOpenChange={setFormOpen}
        client={selectedClient}
        onSuccess={loadData}
      />
    </div>
  );
}