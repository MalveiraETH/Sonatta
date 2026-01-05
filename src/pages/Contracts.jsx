import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  Search,
  MoreHorizontal,
  Eye,
  Trash2,
  MessageCircle,
  Mail,
  FileText,
  CheckCircle,
  Archive,
  Download,
  Printer
} from 'lucide-react';
import ContractPDFGenerator from '@/components/contracts/ContractPDFGenerator';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Contracts() {
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState([]);
  const [filteredContracts, setFilteredContracts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedContract, setSelectedContract] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

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

  const handleView = (contract) => {
    setSelectedContract(contract);
    setDetailOpen(true);
  };

  const handleDelete = async (contract) => {
    if (!confirm('Tem certeza que deseja excluir este contrato?')) return;

    if (currentUser?.user_role !== 'admin') {
      toast.error('Apenas administradores podem excluir contratos');
      return;
    }

    try {
      await base44.entities.Contract.delete(contract.id);
      toast.success('Contrato excluído');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir contrato');
    }
  };

  const handleStatusChange = async (contract, newStatus) => {
    try {
      const updateData = { status: newStatus };
      if (newStatus === 'assinado') {
        updateData.signature_date = format(new Date(), 'yyyy-MM-dd');
      }
      await base44.entities.Contract.update(contract.id, updateData);
      toast.success('Status atualizado');
      loadData();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const sendWhatsApp = (contract) => {
    if (!contract.client_phone) {
      toast.error('Cliente não possui telefone cadastrado');
      return;
    }
    const phone = contract.client_phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Olá ${contract.client_name}!\n\nSeu contrato está disponível:\n\n*Nº ${contract.contract_number}*\nValor: ${formatCurrency(contract.total_value)}\n\nPor favor, entre em contato para assinatura.\n\n*Sonatta Soluções Auditivas*`
    );
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
    handleStatusChange(contract, 'enviado');
  };

  const sendEmail = async (contract) => {
    if (!contract.client_email) {
      toast.error('Cliente não possui e-mail cadastrado');
      return;
    }

    try {
      await base44.integrations.Core.SendEmail({
        to: contract.client_email,
        subject: `Contrato ${contract.contract_number} - Sonatta Soluções Auditivas`,
        body: `
          <h2>Olá ${contract.client_name}!</h2>
          <p>Seu contrato está disponível para assinatura.</p>
          <p><strong>Nº Contrato:</strong> ${contract.contract_number}</p>
          <p><strong>Valor Total:</strong> ${formatCurrency(contract.total_value)}</p>
          <p><strong>Garantia:</strong> ${contract.warranty_period}</p>
          <br>
          <p>Por favor, entre em contato para assinar o contrato.</p>
          <br>
          <p>Atenciosamente,</p>
          <p><strong>Sonatta Soluções Auditivas</strong></p>
        `
      });
      toast.success('E-mail enviado com sucesso!');
      handleStatusChange(contract, 'enviado');
    } catch (error) {
      toast.error('Erro ao enviar e-mail');
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contratos"
        description={`${contracts.length} contratos registrados`}
      />

      {/* Filters */}
      <Card className="p-4 border-0 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por cliente ou número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Status" />
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
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Contrato</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Garantia</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContracts.length > 0 ? (
                filteredContracts.map((contract) => (
                  <TableRow key={contract.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-800">{contract.contract_number}</p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(contract.created_date), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{contract.client_name}</p>
                        <p className="text-xs text-slate-500">{contract.client_cpf}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {contract.warranty_period}
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="font-semibold text-[#1e3a5f]">
                        {formatCurrency(contract.total_value)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={contract.status} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(contract)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => sendWhatsApp(contract)}>
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Enviar WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => sendEmail(contract)}>
                            <Mail className="h-4 w-4 mr-2" />
                            Enviar E-mail
                          </DropdownMenuItem>
                          {contract.status !== 'assinado' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(contract, 'assinado')}>
                              <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" />
                              Marcar como Assinado
                            </DropdownMenuItem>
                          )}
                          {contract.status === 'assinado' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(contract, 'arquivado')}>
                              <Archive className="h-4 w-4 mr-2" />
                              Arquivar
                            </DropdownMenuItem>
                          )}
                          {currentUser?.user_role === 'admin' && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(contract)}
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
                    Nenhum contrato encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Contract Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Contrato {selectedContract?.contract_number}
            </DialogTitle>
          </DialogHeader>

          {selectedContract && (
            <div className="space-y-6 pt-4">
              {/* Client Info */}
              <Card className="p-4 bg-slate-50">
                <h3 className="font-semibold text-slate-800 mb-3">Dados do Cliente</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Nome:</span>
                    <p className="font-medium">{selectedContract.client_name}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">CPF:</span>
                    <p className="font-medium">{selectedContract.client_cpf || '-'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Telefone:</span>
                    <p className="font-medium">{selectedContract.client_phone || '-'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">E-mail:</span>
                    <p className="font-medium">{selectedContract.client_email || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500">Endereço:</span>
                    <p className="font-medium">{selectedContract.client_address || '-'}</p>
                  </div>
                </div>
              </Card>

              {/* Products */}
              <Card className="p-4">
                <h3 className="font-semibold text-slate-800 mb-3">Produtos</h3>
                <div className="space-y-2">
                  {selectedContract.products?.map((product, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium">{product.product_name}</p>
                        {product.serial_number && (
                          <p className="text-xs text-slate-500">Série: {product.serial_number}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(product.unit_price)}</p>
                        <p className="text-xs text-slate-500">Qtd: {product.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Contract Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-slate-500">Valor Total:</span>
                  <p className="text-xl font-bold text-[#1e3a5f]">
                    {formatCurrency(selectedContract.total_value)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-slate-500">Garantia:</span>
                  <p className="font-semibold">{selectedContract.warranty_period}</p>
                </div>
                <div>
                  <span className="text-sm text-slate-500">Condições de Pagamento:</span>
                  <p className="font-medium">{selectedContract.payment_conditions || '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-slate-500">Status:</span>
                  <div className="mt-1">
                    <StatusBadge status={selectedContract.status} />
                  </div>
                </div>
                {selectedContract.signature_date && (
                  <div>
                    <span className="text-sm text-slate-500">Data de Assinatura:</span>
                    <p className="font-medium">
                      {format(new Date(selectedContract.signature_date), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                )}
              </div>

              {selectedContract.notes && (
                <div>
                  <span className="text-sm text-slate-500">Observações:</span>
                  <p className="text-sm mt-1">{selectedContract.notes}</p>
                </div>
              )}

              {selectedContract.contract_text && (
                <Card className="p-4 bg-slate-50">
                  <h3 className="font-semibold text-slate-800 mb-3">Contrato</h3>
                  <div className="text-sm whitespace-pre-wrap max-h-96 overflow-y-auto border border-slate-200 rounded p-4 bg-white">
                    {selectedContract.contract_text}
                  </div>
                </Card>
              )}

              <div className="flex flex-wrap justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setDetailOpen(false)}>
                  Fechar
                </Button>
                {selectedContract.contract_text && (
                  <ContractPDFGenerator 
                    contract={selectedContract}
                    contractText={selectedContract.contract_text}
                  />
                )}
                <Button
                  onClick={() => sendWhatsApp(selectedContract)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Enviar WhatsApp
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}