import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Card
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreVertical, Edit, Trash2, Search, X, Wrench } from 'lucide-react';
import { toast } from 'sonner';

const categoryLabels = {
  manutencao: 'Manutenção',
  partes_e_pecas: 'Partes e Peças'
};

export default function ServicesTab() {
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'manutencao',
    description: '',
    price: '',
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterServices();
  }, [services, searchTerm, categoryFilter]);

  const loadData = async () => {
    try {
      const [servicesData, user] = await Promise.all([
        base44.entities.Service.list('-created_date'),
        base44.auth.me()
      ]);
      setServices(servicesData);
      setCurrentUser(user);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterServices = () => {
    let filtered = [...services];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.name?.toLowerCase().includes(term) ||
        s.description?.toLowerCase().includes(term)
      );
    }
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(s => s.category === categoryFilter);
    }
    setFilteredServices(filtered);
  };

  const openNew = () => {
    setSelectedService(null);
    setFormData({ name: '', category: 'manutencao', description: '', price: '', is_active: true });
    setFormOpen(true);
  };

  const openEdit = (service) => {
    setSelectedService(service);
    setFormData({
      name: service.name || '',
      category: service.category || 'manutencao',
      description: service.description || '',
      price: service.price || '',
      is_active: service.is_active !== false
    });
    setFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.category || !formData.price) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    try {
      const data = { ...formData, price: Number(formData.price) };
      if (selectedService) {
        await base44.entities.Service.update(selectedService.id, data);
        toast.success('Serviço atualizado!');
      } else {
        await base44.entities.Service.create(data);
        toast.success('Serviço criado!');
      }
      setFormOpen(false);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar serviço');
    }
  };

  const handleDelete = async () => {
    try {
      await base44.entities.Service.delete(deleteTarget.id);
      toast.success('Serviço excluído');
      setDeleteOpen(false);
      setDeleteTarget(null);
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir serviço');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#6B3FA0]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <p className="text-sm text-slate-600">Serviços de manutenção e partes/peças</p>
        {currentUser?.role === 'admin' && (
          <Button onClick={openNew} className="bg-[#6B3FA0] hover:bg-[#834CB8] w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Novo Serviço
          </Button>
        )}
      </div>

      {/* Filtros */}
      <Card className="p-4 hidden lg:block">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label className="text-sm mb-2">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
              {searchTerm && (
                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchTerm('')}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <div className="w-48">
            <Label className="text-sm mb-2">Categoria</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={() => { setSearchTerm(''); setCategoryFilter('all'); }}>Limpar</Button>
        </div>
      </Card>

      {/* Mobile filtros */}
      <div className="lg:hidden space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Categorias</SelectItem>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela Desktop */}
      <Card className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Serviço</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead>Status</TableHead>
              {currentUser?.role === 'admin' && <TableHead className="text-center">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredServices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={currentUser?.role === 'admin' ? 6 : 5} className="text-center py-12 text-slate-500">
                  <Wrench className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  Nenhum serviço cadastrado
                </TableCell>
              </TableRow>
            ) : (
              filteredServices.map(service => (
                <TableRow key={service.id} className="hover:bg-slate-50">
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell>
                    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      {categoryLabels[service.category]}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600 max-w-xs truncate">{service.description || '-'}</TableCell>
                  <TableCell className="text-right font-semibold text-emerald-700">{formatCurrency(service.price)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                      service.is_active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {service.is_active !== false ? 'Ativo' : 'Inativo'}
                    </span>
                  </TableCell>
                  {currentUser?.role === 'admin' && (
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(service)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setDeleteTarget(service); setDeleteOpen(true); }} className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Cards Mobile */}
      <div className="lg:hidden space-y-3">
        {filteredServices.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            <Wrench className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            Nenhum serviço cadastrado
          </Card>
        ) : (
          filteredServices.map(service => (
            <Card key={service.id} className="p-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{service.name}</p>
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 mt-1">
                      {categoryLabels[service.category]}
                    </span>
                  </div>
                  {currentUser?.role === 'admin' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(service)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setDeleteTarget(service); setDeleteOpen(true); }} className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                {service.description && (
                  <p className="text-sm text-slate-600">{service.description}</p>
                )}
                <p className="font-semibold text-emerald-700">{formatCurrency(service.price)}</p>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedService ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Manutenção preventiva"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o serviço..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Preço (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="is_active" className="cursor-pointer">Serviço ativo</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-[#6B3FA0] hover:bg-[#834CB8]">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Tem certeza que deseja excluir o serviço <strong>{deleteTarget?.name}</strong>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}