import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
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
import QuoteForm from '@/components/quotes/QuoteForm';
import SaleForm from '@/components/sales/SaleForm';
import {
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  MessageCircle,
  Mail,
  ShoppingCart,
  Eye,
  FileText,
  Send
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Quotes() {
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState([]);
  const [filteredQuotes, setFilteredQuotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [saleFormOpen, setSaleFormOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterQuotes();
  }, [quotes, searchTerm, statusFilter]);

  const loadData = async () => {
    try {
      const [quotesData, user] = await Promise.all([
        base44.entities.Quote.list('-created_date'),
        base44.auth.me()
      ]);
      setQuotes(quotesData);
      setCurrentUser(user);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterQuotes = () => {
    let filtered = [...quotes];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(q =>
        q.client_name?.toLowerCase().includes(term) ||
        q.quote_number?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(q => q.status === statusFilter);
    }

    setFilteredQuotes(filtered);
  };

  const handleEdit = (quote) => {
    setSelectedQuote(quote);
    setFormOpen(true);
  };

  const handleConvertToSale = (quote) => {
    setSelectedQuote(quote);
    setSaleFormOpen(true);
  };

  const handleDelete = async (quote) => {
    if (currentUser?.role !== 'admin') {
      toast.error('Apenas administradores podem excluir orçamentos');
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir o orçamento "${quote.quote_number}"?`)) return;

    try {
      await base44.entities.Quote.delete(quote.id);
      toast.success('Orçamento excluído com sucesso');
      await loadData();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error(`Erro ao excluir orçamento: ${error.message || 'Tente novamente'}`);
    }
  };

  const handleStatusChange = async (quote, newStatus) => {
    try {
      await base44.entities.Quote.update(quote.id, { status: newStatus });
      toast.success('Status atualizado');
      loadData();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const sendWhatsApp = async (quote) => {
    if (!quote.client_phone) {
      toast.error('Cliente não possui telefone cadastrado');
      return;
    }

    try {
      // Buscar produtos para incluir detalhes
      const products = await base44.entities.Product.list();
      
      const phone = quote.client_phone.replace(/\D/g, '');
      
      // Montar lista de produtos com detalhes
      let productDetails = '\n*📦 PRODUTOS INCLUSOS:*\n';
      quote.items?.forEach(item => {
        const product = products.find(p => p.id === item.product_id);
        productDetails += `\n✓ ${item.product_name}`;
        if (product?.brand || product?.model) {
          productDetails += ` - ${product.brand || ''} ${product.model || ''}`;
        }
        if (item.quantity > 1) {
          productDetails += ` (${item.quantity} unid.)`;
        }
        productDetails += `\n   Valor: ${formatCurrency(item.unit_price)}`;
      });

      // Montar formas de pagamento
      let paymentInfo = '\n\n💳 *CONDIÇÕES DE PAGAMENTO:*\n';
      if (quote.payment_details && quote.payment_details.length > 0) {
        quote.payment_details.forEach(payment => {
          const methodLabel = {
            dinheiro: 'Dinheiro',
            pix: 'PIX à Vista',
            pix_parcelado: 'PIX Parcelado',
            cartao_credito: 'Cartão de Crédito',
            cartao_debito: 'Cartão de Débito',
            boleto: 'Boleto',
            transferencia: 'Transferência'
          }[payment.method] || payment.method;
          
          paymentInfo += `• ${methodLabel}: ${formatCurrency(payment.amount)}`;
          if (payment.installments > 1) {
            paymentInfo += ` (${payment.installments}x de ${formatCurrency(payment.amount / payment.installments)})`;
          }
          paymentInfo += '\n';
        });
      } else if (quote.installments > 1) {
        paymentInfo += `• ${quote.installments}x de ${formatCurrency(quote.total / quote.installments)}\n`;
      } else {
        paymentInfo += `• À vista: ${formatCurrency(quote.total)}\n`;
      }

      // Calcular desconto
      let discountInfo = '';
      if (quote.discount > 0) {
        const discountPercent = ((quote.discount / quote.subtotal) * 100).toFixed(1);
        discountInfo = `\n💰 *DESCONTO ESPECIAL:* ${discountPercent}% (economia de ${formatCurrency(quote.discount)}!)`;
      }

      // Garantia
      const warrantyInfo = '\n\n🛡️ *GARANTIA:* 2 a 4 anos (conforme fabricante)';

      const message = encodeURIComponent(
        `Olá ${quote.client_name}! 👋\n\n` +
        `Preparamos um orçamento especial para você:\n\n` +
        `*📋 ORÇAMENTO Nº ${quote.quote_number}*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        productDetails +
        `\n━━━━━━━━━━━━━━━━━━━━\n` +
        `\n*SUBTOTAL:* ${formatCurrency(quote.subtotal)}` +
        discountInfo +
        `\n\n*✨ VALOR TOTAL: ${formatCurrency(quote.total)}*` +
        paymentInfo +
        warrantyInfo +
        `\n\n⏰ *Validade:* ${quote.validity_days} dias` +
        `\n\n${quote.notes ? `📝 *Observações:*\n${quote.notes}\n\n` : ''}` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `\n🎯 *Aproveite esta oportunidade!*\n` +
        `Entre em contato para tirar dúvidas ou fechar negócio.\n\n` +
        `*Sonatta Soluções Auditivas* 🦻\n` +
        `_Sua melhor escolha em aparelhos auditivos_`
      );
      
      window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      toast.error('Erro ao preparar mensagem');
    }
  };

  const sendEmail = async (quote) => {
    if (!quote.client_email) {
      toast.error('Cliente não possui e-mail cadastrado');
      return;
    }

    try {
      await base44.integrations.Core.SendEmail({
        to: quote.client_email,
        subject: `Orçamento ${quote.quote_number} - Sonatta Soluções Auditivas`,
        body: `
          <h2>Olá ${quote.client_name}!</h2>
          <p>Segue seu orçamento:</p>
          <p><strong>Nº:</strong> ${quote.quote_number}</p>
          <p><strong>Valor Total:</strong> ${formatCurrency(quote.total)}</p>
          ${quote.installments > 1 ? `<p><strong>Parcelamento:</strong> ${quote.installments}x de ${formatCurrency(quote.installment_value)}</p>` : ''}
          <p><strong>Validade:</strong> ${quote.validity_days} dias</p>
          <br>
          <p>Atenciosamente,</p>
          <p><strong>Sonatta Soluções Auditivas</strong></p>
        `
      });
      toast.success('E-mail enviado com sucesso!');
      handleStatusChange(quote, 'enviado');
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
        title="Orçamentos"
        description={`${quotes.length} orçamentos registrados`}
        action={() => {
          setSelectedQuote(null);
          setFormOpen(true);
        }}
        actionLabel="Novo Orçamento"
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
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="enviado">Enviado</SelectItem>
              <SelectItem value="aprovado">Aprovado</SelectItem>
              <SelectItem value="recusado">Recusado</SelectItem>
              <SelectItem value="convertido">Convertido</SelectItem>
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
                <TableHead>Orçamento</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Itens</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuotes.length > 0 ? (
                filteredQuotes.map((quote) => (
                  <TableRow key={quote.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-800">{quote.quote_number}</p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(quote.created_date), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{quote.client_name}</p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {quote.items?.length || 0} item(s)
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="font-semibold text-[#1e3a5f]">{formatCurrency(quote.total)}</p>
                      {quote.payment_details && quote.payment_details.length > 0 && (
                        <p className="text-xs text-slate-500">
                          {quote.payment_details.length} forma(s)
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={quote.status} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem onClick={() => handleEdit(quote)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => sendWhatsApp(quote)}
                            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 font-medium"
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Enviar WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => sendEmail(quote)}>
                            <Mail className="h-4 w-4 mr-2" />
                            Enviar E-mail
                          </DropdownMenuItem>
                          {quote.status !== 'convertido' && (
                            <DropdownMenuItem onClick={() => handleConvertToSale(quote)}>
                              <ShoppingCart className="h-4 w-4 mr-2 text-emerald-600" />
                              Converter em Venda
                            </DropdownMenuItem>
                          )}
                          {currentUser?.role === 'admin' && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(quote)}
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
                    Nenhum orçamento encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <QuoteForm
        open={formOpen}
        onOpenChange={setFormOpen}
        quote={selectedQuote}
        onSuccess={loadData}
      />

      <SaleForm
        open={saleFormOpen}
        onOpenChange={setSaleFormOpen}
        quote={selectedQuote}
        onSuccess={loadData}
      />
    </div>
  );
}