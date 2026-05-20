import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardHeader } from '@/components/ui/card';
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
import { logDeletion, logWhatsApp } from '@/components/utils/auditLogger';
import { openWhatsApp } from '@/utils/whatsapp';
import QuotePDFButton from '@/components/quotes/QuotePDFButton';

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

  const handleConvertToSale = async (quote) => {
    await handleStatusChange(quote, 'convertido');
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
      // Liberar produtos reservados
      if (quote.items) {
        for (const item of quote.items) {
          if (item.product_id) {
            const product = await base44.entities.Product.list();
            const prod = product.find(p => p.id === item.product_id);
            if (prod && prod.status === 'reservado') {
              await base44.entities.Product.update(item.product_id, { status: 'disponivel' });
            }
          }
        }
      }
      
      await base44.entities.Quote.delete(quote.id);
      await logDeletion('Orçamento', `${quote.quote_number} - ${quote.client_name}`, quote.id);
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

  const getWhatsAppLink = async (quote) => {
    if (!quote.client_phone) return null;
    
    const phone = quote.client_phone.replace(/\D/g, '');
    
    // Montar lista de produtos
    let productList = '';
    quote.items?.forEach(item => {
      productList += `- ${item.product_name}`;
      if (item.quantity > 1) {
        productList += ` - ${item.quantity} unidade(s)`;
      }
      productList += '\n';
    });

    // Calcular valores e obter configurações
    const user = await base44.auth.me();
    const discountPercent = quote.discount && quote.subtotal ? ((quote.discount / quote.subtotal) * 100).toFixed(2) : 0;
    const discountValue = quote.discount || 0;
    const installmentValue = quote.subtotal / 18;
    const warrantyText = '2 a 4 anos (conforme fabricante)';
    
    // Carregar template personalizado
    let template = `👋 Olá, {{client_name}}!
Temos uma ótima notícia para você: seu orçamento personalizado para redescobrir os sons do mundo está prontinho! ✨

*Orçamento Nº: {{quote_number}}*

*O que preparamos para você:*
{{product_list}}

*Investimento total para sua nova experiência auditiva: {{subtotal}}*

*Pensamos nas melhores formas para você realizar esse investimento na sua saúde:*
* Parcelamento Super Facilitado:* Leve seus aparelhos em até *18X SEM JUROS no cartão!* São parcelas pequenas de apenas *{{installment_value}}* que cabem no seu bolso.
* Descontão à Vista:* Prefere pagar em dinheiro ou Pix? Aproveite um *desconto especial de {{discount_percent}}%*! Valor à vista: *{{total}}*

*Sua tranquilidade é nossa prioridade:*
Todos os aparelhos vêm com *{{warranty}}* de garantia, garantindo sua segurança e nosso suporte total.

*Importante:* Esta proposta é válida por 30 dias. Não perca a chance de redescobrir os sons do mundo!

Ficou com alguma dúvida ou quer bater um papo? É só responder essa mensagem, estamos aqui para você! 😊

Com carinho,
Equipe Sonatta Soluções Auditivas
{{contact_phone}}`;
    
    let contactPhone = '(48) 99999-9999';

    try {
      if (user.whatsapp_quote_template) {
        template = user.whatsapp_quote_template;
      }
      if (user.contact_phone) {
        contactPhone = user.contact_phone;
      }
    } catch (error) {
      console.log('Usando template padrão');
    }

    // Substituir variáveis
    const message = template
      .replace(/{{client_name}}/g, quote.client_name)
      .replace(/{{quote_number}}/g, quote.quote_number)
      .replace(/{{product_list}}/g, productList)
      .replace(/{{subtotal}}/g, formatCurrency(quote.subtotal))
      .replace(/{{total}}/g, formatCurrency(quote.total))
      .replace(/{{discount_percent}}/g, discountPercent)
      .replace(/{{discount_value}}/g, formatCurrency(discountValue))
      .replace(/{{installment_value}}/g, formatCurrency(installmentValue))
      .replace(/{{warranty}}/g, warrantyText)
      .replace(/{{contact_phone}}/g, contactPhone);
    
    return { phone, message };
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
              <SelectItem value="criado">Criado</SelectItem>
              <SelectItem value="enviado">Enviado</SelectItem>
              <SelectItem value="convertido">Convertido</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Cards Grid */}
      {filteredQuotes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuotes.map((quote) => (
            <Card key={quote.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-lg text-slate-800">{quote.quote_number || '-'}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {format(new Date(quote.created_date), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <StatusBadge status={quote.status} />
                </div>
              </CardHeader>
              <div className="px-6 pb-6 space-y-4">
                {/* Client Info */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-900">{quote.client_name}</p>
                  <p className="text-xs text-slate-500">{quote.client_phone}</p>
                </div>

                {/* Items & Value */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">Itens</p>
                    <p className="text-sm font-medium">{quote.items?.length || 0} item(s)</p>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">Total Sem Desconto</p>
                    <p className="text-sm font-semibold text-slate-700">{formatCurrency(quote.subtotal)}</p>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 bg-[#6B3FA0]/5 rounded-lg border border-[#6B3FA0]/20">
                    <p className="text-xs font-medium text-[#6B3FA0]">Total com Desconto</p>
                    <p className="text-lg font-bold text-[#6B3FA0]">{formatCurrency(quote.total)}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <QuotePDFButton quote={quote} onStatusChange={handleStatusChange} />
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
                    size="sm"
                    onClick={async () => {
                      if (!quote.client_phone) {
                        toast.error('Cliente não possui telefone cadastrado');
                        return;
                      }
                      const result = await getWhatsAppLink(quote);
                      if (result) {
                        await handleStatusChange(quote, 'enviado');
                        await logWhatsApp('Orçamento', `Enviado para ${quote.client_name} - ${quote.quote_number}`, quote.id);
                        openWhatsApp(`55${result.phone}`, result.message);
                      }
                    }}
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    WhatsApp
                  </Button>
                  {quote.status !== 'convertido' && (
                    <Button
                      onClick={() => handleConvertToSale(quote)}
                      className="flex-1 bg-[#6B3FA0] hover:bg-[#834CB8] text-white"
                      size="sm"
                    >
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      Vender
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(quote)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
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
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <div className="text-center py-12 text-slate-500">
            Nenhum orçamento encontrado
          </div>
        </Card>
      )}

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