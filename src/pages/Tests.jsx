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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import TestForm from '@/components/tests/TestForm';
import { syncTestAppointments } from '@/components/tests/syncTestAppointments';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2, 
  CheckCircle, 
  Clock, 
  X, 
  Plus, 
  Activity,
  AlertCircle,
  ClockIcon,
  MessageCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatLocalDate } from '@/components/utils/dateHelpers';

export default function Tests() {
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState([]);
  const [filteredTests, setFilteredTests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [extendMode, setExtendMode] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterTests();
  }, [tests, searchTerm, statusFilter]);

  const loadData = async () => {
    try {
      const [testsData, user] = await Promise.all([
        base44.entities.Test.list('-created_date'),
        base44.auth.me()
      ]);
      
      // Atualizar status automático para teste pendente
      const today = new Date();
      const updatedTests = testsData.map(test => {
        // Só muda para pendente se tiver data final e já passou, e não for agendado/finalizado
        if (
          (test.status === 'em_teste' || test.status === 'teste_estendido') &&
          test.end_date &&
          new Date(test.end_date) < today
        ) {
          return { ...test, status: 'teste_pendente' };
        }
        return test;
      });

      setTests(updatedTests);
      setCurrentUser(user);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterTests = () => {
    let filtered = [...tests];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.client_name?.toLowerCase().includes(term) ||
        t.test_number?.toLowerCase().includes(term) ||
        t.professional_name?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    setFilteredTests(filtered);
  };

  const handleFinalize = async (test) => {
    try {
      const updated = { ...test, status: 'teste_finalizado' };
      await base44.entities.Test.update(test.id, { status: 'teste_finalizado' });
      await syncTestAppointments(test.id, updated);
      toast.success('Teste finalizado');
      loadData();
    } catch (error) {
      toast.error('Erro ao finalizar teste');
    }
  };

  const handleExtend = (test) => {
    setSelectedTest(test);
    setExtendMode(true);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    try {
      await base44.entities.Test.delete(selectedTest.id);
      toast.success('Teste excluído');
      setDeleteOpen(false);
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir teste');
    }
  };

  const buildWhatsAppMessage = (test, templateText) => {
    const formatDate = (dateStr) => {
      if (!dateStr) return '-';
      const parts = dateStr.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };
    const devicesList = (test.devices || [])
      .map(d => `• ${d.product_name}${d.serial_number ? ` (NS: ${d.serial_number})` : ''}`)
      .join('\n') || '- Nenhum aparelho';
    const startTime = test.start_time ? ` às ${test.start_time}` : '';
    const endTime = test.end_time ? ` às ${test.end_time}` : '';
    return templateText
      .replace(/{{client_name}}/g, test.client_name || '')
      .replace(/{{start_date}}/g, formatDate(test.start_date))
      .replace(/{{start_time}}/g, startTime)
      .replace(/{{end_date}}/g, formatDate(test.end_date))
      .replace(/{{end_time}}/g, endTime)
      .replace(/{{devices_list}}/g, devicesList);
  };

  const openWhatsApp = async (test, status) => {
    try {
      const [userData, clients] = await Promise.all([
        base44.auth.me(),
        base44.entities.Client.filter({ id: test.client_id })
      ]);
      const saved = userData.whatsapp_test_templates || {};
      const { TEST_TEMPLATES_DEFAULTS } = await import('@/components/settings/WhatsAppTestTemplate');
      const targetStatus = status || test.status;
      const templateText = saved[targetStatus] || TEST_TEMPLATES_DEFAULTS[targetStatus] || '';
      const message = buildWhatsAppMessage(test, templateText);
      const client = clients[0];
      const phone = (client?.phone || '').replace(/\D/g, '');
      const phoneFormatted = phone.startsWith('55') ? phone : `55${phone}`;
      const url = `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    } catch (error) {
      toast.error('Erro ao gerar mensagem');
    }
  };

  const sendWhatsApp = (test) => openWhatsApp(test, test.status);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  const stats = {
    total: tests.length,
    agendado: tests.filter(t => t.status === 'teste_agendado').length,
    emTeste: tests.filter(t => t.status === 'em_teste').length,
    estendido: tests.filter(t => t.status === 'teste_estendido').length,
    finalizado: tests.filter(t => t.status === 'teste_finalizado').length,
    pendente: tests.filter(t => t.status === 'teste_pendente').length
  };

  const FiltersContent = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm">Status</Label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="teste_agendado">Teste Agendado</SelectItem>
            <SelectItem value="em_teste">Em Teste</SelectItem>
            <SelectItem value="teste_estendido">Teste Estendido</SelectItem>
            <SelectItem value="teste_finalizado">Teste Finalizado</SelectItem>
            <SelectItem value="teste_pendente">Teste Pendente</SelectItem>
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
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Testes</h1>
          <p className="text-sm text-slate-500 mt-1">{tests.length} testes registrados</p>
        </div>
        <Button onClick={() => { setSelectedTest(null); setExtendMode(false); setFormOpen(true); }} className="bg-[#6B3FA0] hover:bg-[#834CB8] w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Novo Teste
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card 
          className="p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]" 
          onClick={() => setStatusFilter('em_teste')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-1">Em Teste</p>
              <p className="text-lg sm:text-2xl font-bold text-blue-600">{stats.emTeste}</p>
            </div>
            <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 opacity-60" />
          </div>
        </Card>

        <Card 
          className="p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]" 
          onClick={() => setStatusFilter('teste_estendido')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-1">Estendido</p>
              <p className="text-lg sm:text-2xl font-bold text-amber-600">{stats.estendido}</p>
            </div>
            <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500 opacity-60" />
          </div>
        </Card>

        <Card 
          className="p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]" 
          onClick={() => setStatusFilter('teste_finalizado')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-1">Finalizado</p>
              <p className="text-lg sm:text-2xl font-bold text-emerald-600">{stats.finalizado}</p>
            </div>
            <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500 opacity-60" />
          </div>
        </Card>

        <Card 
          className="p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]" 
          onClick={() => setStatusFilter('teste_pendente')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-1">Pendente</p>
              <p className="text-lg sm:text-2xl font-bold text-red-600">{stats.pendente}</p>
            </div>
            <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-500 opacity-60" />
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
                placeholder="Buscar por cliente, número ou profissional..."
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
                <SelectItem value="teste_agendado">Teste Agendado</SelectItem>
                <SelectItem value="em_teste">Em Teste</SelectItem>
                <SelectItem value="teste_estendido">Teste Estendido</SelectItem>
                <SelectItem value="teste_finalizado">Teste Finalizado</SelectItem>
                <SelectItem value="teste_pendente">Teste Pendente</SelectItem>
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
              <FiltersContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Table - Desktop */}
      <Card className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Nº Teste</TableHead>
              <TableHead>Data Início</TableHead>
              <TableHead>Data Término</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-center">Aparelhos</TableHead>
              <TableHead>Profissional</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                  Nenhum teste encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredTests.map(test => (
                <TableRow key={test.id} className="hover:bg-slate-50">
                  <TableCell className="font-medium">{test.test_number}</TableCell>
                  <TableCell>{formatLocalDate(test.start_date)}</TableCell>
                  <TableCell>{formatLocalDate(test.end_date)}</TableCell>
                  <TableCell>{test.client_name}</TableCell>
                  <TableCell className="text-center">{test.devices?.length || 0}</TableCell>
                  <TableCell className="text-sm">{test.professional_name || '-'}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      test.status === 'teste_agendado' ? 'bg-purple-100 text-purple-700' :
                      test.status === 'em_teste' ? 'bg-blue-100 text-blue-700' :
                      test.status === 'teste_estendido' ? 'bg-amber-100 text-amber-700' :
                      test.status === 'teste_finalizado' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {test.status === 'teste_agendado' ? 'Agendado' :
                       test.status === 'em_teste' ? 'Em Teste' :
                       test.status === 'teste_estendido' ? 'Estendido' :
                       test.status === 'teste_finalizado' ? 'Finalizado' : 'Pendente'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelectedTest(test); setDetailOpen(true); }}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setSelectedTest(test); setExtendMode(false); setFormOpen(true); }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => sendWhatsApp(test)} className="text-green-600">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Enviar WhatsApp
                        </DropdownMenuItem>
                        {test.status !== 'teste_finalizado' && (
                          <>
                            <DropdownMenuItem onClick={() => handleFinalize(test)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Finalizar Teste
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExtend(test)}>
                              <ClockIcon className="h-4 w-4 mr-2" />
                              Estender Teste
                            </DropdownMenuItem>
                          </>
                        )}
                        {currentUser?.role === 'admin' && (
                          <DropdownMenuItem onClick={() => { setSelectedTest(test); setDeleteOpen(true); }} className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Cards - Mobile */}
      <div className="lg:hidden space-y-3">
        {filteredTests.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            Nenhum teste encontrado
          </Card>
        ) : (
          filteredTests.map(test => (
            <Card key={test.id} className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-900">{test.test_number}</span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        test.status === 'teste_agendado' ? 'bg-purple-100 text-purple-700' :
                        test.status === 'em_teste' ? 'bg-blue-100 text-blue-700' :
                        test.status === 'teste_estendido' ? 'bg-amber-100 text-amber-700' :
                        test.status === 'teste_finalizado' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {test.status === 'teste_agendado' ? 'Agendado' :
                         test.status === 'em_teste' ? 'Em Teste' :
                         test.status === 'teste_estendido' ? 'Estendido' :
                         test.status === 'teste_finalizado' ? 'Finalizado' : 'Pendente'}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600">
                      {test.client_name} • {test.devices?.length || 0} aparelhos
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setSelectedTest(test); setDetailOpen(true); }}>
                        <Eye className="h-4 w-4 mr-2" />
                        Detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSelectedTest(test); setExtendMode(false); setFormOpen(true); }}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => sendWhatsApp(test)} className="text-green-600">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Enviar WhatsApp
                      </DropdownMenuItem>
                      {test.status !== 'teste_finalizado' && (
                        <>
                          <DropdownMenuItem onClick={() => handleFinalize(test)}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Finalizar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExtend(test)}>
                            <ClockIcon className="h-4 w-4 mr-2" />
                            Estender
                          </DropdownMenuItem>
                        </>
                      )}
                      {currentUser?.role === 'admin' && (
                        <DropdownMenuItem onClick={() => { setSelectedTest(test); setDeleteOpen(true); }} className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="text-xs text-slate-500">
                  {formatLocalDate(test.start_date)} - {formatLocalDate(test.end_date)}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Teste {selectedTest?.test_number}</DialogTitle>
          </DialogHeader>
          {selectedTest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Cliente:</span>
                  <p className="font-medium">{selectedTest.client_name}</p>
                </div>
                <div>
                  <span className="text-slate-500">Status:</span>
                  <p className="font-medium">
                    {selectedTest.status === 'em_teste' ? 'Em Teste' :
                     selectedTest.status === 'teste_estendido' ? 'Estendido' :
                     selectedTest.status === 'teste_finalizado' ? 'Finalizado' : 'Pendente'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Data Início:</span>
                  <p className="font-medium">{formatLocalDate(selectedTest.start_date)}</p>
                </div>
                <div>
                  <span className="text-slate-500">Data Final:</span>
                  <p className="font-medium">{formatLocalDate(selectedTest.end_date)}</p>
                </div>
                <div>
                  <span className="text-slate-500">Profissional:</span>
                  <p className="font-medium">{selectedTest.professional_name || '-'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Indicação:</span>
                  <p className="font-medium">{selectedTest.referral_professional_name || '-'}</p>
                </div>
              </div>
              {selectedTest.devices && selectedTest.devices.length > 0 && (
                <div>
                  <span className="text-slate-500 text-sm">Aparelhos:</span>
                  <div className="mt-2 space-y-2">
                    {selectedTest.devices.map((device, idx) => (
                      <div key={idx} className="bg-slate-50 p-3 rounded">
                        <p className="font-medium">{device.product_name}</p>
                        <p className="text-xs text-slate-600">NS: {device.serial_number}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedTest.notes && (
                <div>
                  <span className="text-slate-500 text-sm">Observações:</span>
                  <p className="mt-1 text-sm">{selectedTest.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Tem certeza que deseja excluir este teste? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Form */}
      <TestForm 
        open={formOpen} 
        onClose={() => { setFormOpen(false); setExtendMode(false); setSelectedTest(null); }} 
        test={selectedTest}
        onSuccess={loadData}
        extendMode={extendMode}
      />
    </div>
  );
}