import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
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
import { Search, Filter, Mail, CheckCircle, X, FileText } from 'lucide-react';
import ContractPDFGenerator from '@/components/contracts/ContractPDFGenerator';
import CarnePDFGenerator from '@/components/contracts/CarnePDFGenerator';
import ContractActionsMenu from '@/components/contracts/ContractActionsMenu';
import { buildContractPdf } from '@/lib/contractPdf';
import { buildCarnePdf } from '@/lib/carnePdf';
import { openWhatsApp } from '@/utils/whatsapp';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatLocalDate } from '@/components/utils/dateHelpers';

export default function Contracts() {
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState([]);
  const [filteredContracts, setFilteredContracts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedContract, setSelectedContract] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterContracts();
  }, [contracts, searchTerm, statusFilter]);

  const loadData = async () => {
    try {
      const [contractsData, user] = await Promise.all([
        base44.entities.Contract.list('-created_date'),
        base44.auth.me()
      ]);
      setContracts(contractsData);
      setCurrentUser(user);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterContracts = () => {
    let filtered = [...contracts];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.client_name?.toLowerCase().includes(term) ||
        c.contract_number?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    setFilteredContracts(filtered);
  };

  const openDetail = async (contract) => {
    setSelectedContract(contract);
    setSelectedSale(null);
    setDetailOpen(true);
    if (contract.sale_id) {
      try {
        const sale = await base44.entities.Sale.get(contract.sale_id);
        setSelectedSale(sale);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // O status "enviado" registra que o documento foi compartilhado com o cliente.
  const markAsSent = async (contract) => {
    if (contract.status !== 'gerado') return;
    try {
      await base44.entities.Contract.update(contract.id, { status: 'enviado' });
      loadData();
    } catch (e) {
      console.warn('Não foi possível atualizar o status do contrato:', e.message);
    }
  };

  // Sempre busca o telefone atual do cliente (evita número desatualizado)
  const clientPhoneOf = async (contract) => {
    try {
      const client = await base44.entities.Client.get(contract.client_id);
      return (client?.phone || contract.client_phone || '').replace(/\D/g, '');
    } catch (e) {
      return (contract.client_phone || '').replace(/\D/g, '');
    }
  };

  // Baixa o PDF e abre a conversa do WhatsApp para o arquivo ser anexado.
  const sendCarne = async (contract) => {
    if (sending) return;
    if (!contract.sale_id) {
      toast.error('Este contrato não está vinculado a uma venda');
      return;
    }
    setSending(true);
    try {
      const phone = await clientPhoneOf(contract);
      if (!phone) {
        toast.error('Cliente não possui telefone cadastrado');
        return;
      }
      const sale = await base44.entities.Sale.get(contract.sale_id);
      const { doc, fileName, estimated } = await buildCarnePdf({ contract, sale });
      doc.save(fileName);
      if (estimated) {
        toast.warning('Parcelas estimadas: não há parcelas registradas em Contas a Receber para esta venda.');
      }
      const message = `Olá ${contract.client_name}!\n\nSegue o carnê de pagamento referente ao contrato ${contract.contract_number}.\n\n*Sonatta Soluções Auditivas*`;
      openWhatsApp(`55${phone}`, message);
      toast.success('PDF baixado. Anexe o arquivo na conversa do WhatsApp.');
      await markAsSent(contract);
    } catch (error) {
      console.error(error);
      toast.error(error?.message || 'Erro ao enviar o carnê');
    } finally {
      setSending(false);
    }
  };

  // Baixa o PDF do contrato e abre a conversa do WhatsApp para anexá-lo.
  const sendContrato = async (contract) => {
    if (sending) return;
    setSending(true);
    try {
      const phone = await clientPhoneOf(contract);
      if (!phone) {
        toast.error('Cliente não possui telefone cadastrado');
        return;
      }
      const { doc, fileName } = await buildContractPdf({
        contract,
        contractText: contract.contract_text || ''
      });
      doc.save(fileName);
      const message = `Olá ${contract.client_name}!\n\nSegue o contrato referente à sua compra.\n\nContrato nº ${contract.contract_number}\nValor total: ${formatCurrency(contract.total_value)}\n\n*Sonatta Soluções Auditivas*`;
      openWhatsApp(`55${phone}`, message);
      toast.success('PDF baixado. Anexe o arquivo na conversa do WhatsApp.');
      await markAsSent(contract);
    } catch (error) {
      console.error(error);
      toast.error(error?.message || 'Erro ao enviar o contrato');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    try {
      await base44.entities.Contract.delete(selectedContract.id);
      toast.success('Contrato excluído');
      setDeleteOpen(false);
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir contrato');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  const stats = {
    total: contracts.length,
    gerado: contracts.filter(c => c.status === 'gerado').length,
    enviado: contracts.filter(c => c.status === 'enviado').length,
    assinado: contracts.filter(c => c.status === 'assinado').length
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
            <SelectItem value="gerado">Gerado</SelectItem>
            <SelectItem value="enviado">Enviado</SelectItem>
            <SelectItem value="assinado">Assinado</SelectItem>
            <SelectItem value="arquivado">Arquivado</SelectItem>
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
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Contratos</h1>
          <p className="text-sm text-slate-500 mt-1">{contracts.length} contratos registrados</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card 
          className="p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]" 
          onClick={() => setStatusFilter('all')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-1">Total</p>
              <p className="text-lg sm:text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-slate-500 opacity-60" />
          </div>
        </Card>

        <Card 
          className="p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]" 
          onClick={() => setStatusFilter('gerado')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-1">Gerados</p>
              <p className="text-lg sm:text-2xl font-bold text-blue-600">{stats.gerado}</p>
            </div>
            <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 opacity-60" />
          </div>
        </Card>

        <Card 
          className="p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]" 
          onClick={() => setStatusFilter('enviado')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-1">Enviados</p>
              <p className="text-lg sm:text-2xl font-bold text-amber-600">{stats.enviado}</p>
            </div>
            <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500 opacity-60" />
          </div>
        </Card>

        <Card 
          className="p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]" 
          onClick={() => setStatusFilter('assinado')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-1">Assinados</p>
              <p className="text-lg sm:text-2xl font-bold text-emerald-600">{stats.assinado}</p>
            </div>
            <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500 opacity-60" />
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
                placeholder="Buscar por cliente ou número..."
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
                <SelectItem value="gerado">Gerado</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="assinado">Assinado</SelectItem>
                <SelectItem value="arquivado">Arquivado</SelectItem>
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
              <TableHead>Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Garantia</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContracts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                  Nenhum contrato encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredContracts.map(contract => (
                <TableRow key={contract.id} className="hover:bg-slate-50">
                  <TableCell className="font-medium">{contract.contract_number}</TableCell>
                  <TableCell>{contract.client_name}</TableCell>
                  <TableCell>{formatLocalDate(contract.created_date)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(contract.total_value)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      contract.status === 'assinado' ? 'bg-emerald-100 text-emerald-700' :
                      contract.status === 'enviado' ? 'bg-blue-100 text-blue-700' :
                      contract.status === 'arquivado' ? 'bg-slate-100 text-slate-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {contract.status === 'gerado' ? 'Gerado' : 
                       contract.status === 'enviado' ? 'Enviado' :
                       contract.status === 'assinado' ? 'Assinado' : 'Arquivado'}
                    </span>
                  </TableCell>
                  <TableCell>{contract.warranty_period}</TableCell>
                  <TableCell className="text-center">
                    <ContractActionsMenu
                      contract={contract}
                      canDelete={currentUser?.role === 'admin'}
                      busy={sending}
                      onView={openDetail}
                      onSendCarne={sendCarne}
                      onSendContrato={sendContrato}
                      onDelete={(c) => { setSelectedContract(c); setDeleteOpen(true); }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Cards - Mobile */}
      <div className="lg:hidden space-y-3">
        {filteredContracts.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            Nenhum contrato encontrado
          </Card>
        ) : (
          filteredContracts.map(contract => (
            <Card key={contract.id} className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-900">{contract.contract_number}</span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        contract.status === 'assinado' ? 'bg-emerald-100 text-emerald-700' :
                        contract.status === 'enviado' ? 'bg-blue-100 text-blue-700' :
                        contract.status === 'arquivado' ? 'bg-slate-100 text-slate-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {contract.status === 'gerado' ? 'Gerado' : 
                         contract.status === 'enviado' ? 'Enviado' :
                         contract.status === 'assinado' ? 'Assinado' : 'Arquivado'}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600">
                      {contract.client_name} • {formatLocalDate(contract.created_date)}
                    </div>
                  </div>
                  <ContractActionsMenu
                    contract={contract}
                    canDelete={currentUser?.role === 'admin'}
                    busy={sending}
                    onView={openDetail}
                    onSendCarne={sendCarne}
                    onSendContrato={sendContrato}
                    onDelete={(c) => { setSelectedContract(c); setDeleteOpen(true); }}
                  />
                </div>
                <div className="text-2xl font-bold text-slate-900">{formatCurrency(contract.total_value)}</div>
                <div className="text-xs text-slate-500">Garantia: {contract.warranty_period}</div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg pr-6 break-words">
              Contrato {selectedContract?.contract_number}
            </DialogTitle>
          </DialogHeader>
          {selectedContract && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Cliente:</span>
                  <p className="font-medium break-words">{selectedContract.client_name}</p>
                </div>
                <div>
                  <span className="text-slate-500">Valor:</span>
                  <p className="font-medium text-lg">{formatCurrency(selectedContract.total_value)}</p>
                </div>
              </div>
              {selectedContract.contract_text && selectedContract.contract_text !== 'Template não configurado' && (
                <div className="bg-slate-50 p-3 sm:p-4 rounded max-h-60 overflow-y-auto text-sm">
                  {selectedContract.contract_text.includes('<') 
                    ? <div dangerouslySetInnerHTML={{ __html: selectedContract.contract_text }} className="prose prose-sm max-w-none break-words" />
                    : <pre className="text-xs whitespace-pre-wrap break-words overflow-hidden">{selectedContract.contract_text}</pre>
                  }
                </div>
              )}
              {/* Botões de exportação */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t">
                <ContractPDFGenerator
                  contract={selectedContract}
                  contractText={selectedContract.contract_text || ''}
                />
                {selectedSale?.payment_details?.some(p => p.method === 'pix_parcelado') && (
                  <CarnePDFGenerator contract={selectedContract} sale={selectedSale} />
                )}
              </div>
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
            Tem certeza que deseja excluir este contrato? Esta ação não pode ser desfeita.
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